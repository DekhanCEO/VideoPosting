<?php
/**
 * Stockage : un fichier JSON protégé (préfixe PHP « exit » : illisible depuis le navigateur),
 * écrit de façon atomique sous verrou exclusif (plusieurs requêtes PHP peuvent tourner en parallèle).
 */

const DB_GUARD = "<?php exit; ?>\n";

function db_file(): string
{
    return VP_DATA_DIR . '/db.php';
}

function ensure_data_dir(): void
{
    if (!is_dir(VP_DATA_DIR) && !@mkdir(VP_DATA_DIR, 0755, true)) {
        throw new HttpError('Impossible de créer le dossier « data » : vérifiez les droits d\'écriture du dossier posting.', 500);
    }
    if (!is_dir(VP_MEDIA_DIR)) @mkdir(VP_MEDIA_DIR, 0755, true);
    foreach ([VP_DATA_DIR, VP_MEDIA_DIR] as $dir) {
        if (!is_file($dir . '/.htaccess')) @file_put_contents($dir . '/.htaccess', "Require all denied\n<IfModule !mod_authz_core.c>\nDeny from all\n</IfModule>\n");
        if (!is_file($dir . '/index.html')) @file_put_contents($dir . '/index.html', '');
    }
}

function default_settings(): array
{
    return [
        'demoMode' => true,
        'credentials' => [
            'youtube' => ['clientId' => '', 'clientSecret' => ''],
            'tiktok' => ['clientKey' => '', 'clientSecret' => ''],
            'instagram' => ['appId' => '', 'appSecret' => '', 'loginType' => 'instagram', 'graphVersion' => 'v24.0'],
        ],
        'hashtagGroups' => [
            ['id' => uuid4(), 'name' => 'Viral', 'tags' => ['fyp', 'pourtoi', 'viral', 'trending']],
            ['id' => uuid4(), 'name' => 'Créateur', 'tags' => ['contentcreator', 'creator', 'behindthescenes']],
        ],
        'currency' => 'EUR',
        'monthlyRevenueGoal' => 2000,
        'defaults' => [
            'youtubeCategoryId' => '22',
            'youtubePrivacy' => 'public',
            'youtubeLanguage' => 'fr',
            'tiktokAllowComments' => true,
            'tiktokAllowDuet' => true,
            'tiktokAllowStitch' => true,
            'instagramShareToFeed' => true,
        ],
    ];
}

function empty_db(): array
{
    return [
        'version' => 1,
        'secret' => bin2hex(random_bytes(32)),
        'cronSecret' => bin2hex(random_bytes(16)),
        'auth' => ['passwordHash' => null],
        'publicUrl' => null,
        'settings' => default_settings(),
        'accounts' => [],
        'posts' => [],
        'media' => [],
        'analytics' => ['snapshots' => [], 'daily' => [], 'sync' => []],
        'revenues' => [],
        'demoRevenueSeeded' => false,
        'jobs' => ['lastTokenRefresh' => 0, 'lastStatsSync' => 0],
    ];
}

function db_migrate(array $d): array
{
    $base = empty_db();
    foreach ($base as $k => $v) if (!array_key_exists($k, $d)) $d[$k] = $v;
    $d['settings'] = array_replace_recursive($base['settings'], $d['settings'] ?? []);
    if (isset($d['settings']['hashtagGroups']) && is_array($d['settings']['hashtagGroups'])) {
        $d['settings']['hashtagGroups'] = array_values($d['settings']['hashtagGroups']);
    }
    return $d;
}

function db_parse(string $raw): array
{
    if (str_starts_with($raw, DB_GUARD)) $raw = substr($raw, strlen(DB_GUARD));
    $d = json_decode($raw, true);
    if (!is_array($d)) throw new HttpError('Base de données illisible (data/db.php).', 500);
    return db_migrate($d);
}

function db_write_file(array $d): void
{
    $tmp = db_file() . '.' . bin2hex(random_bytes(4)) . '.tmp';
    $json = json_encode($d, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION);
    if ($json === false || file_put_contents($tmp, DB_GUARD . $json, LOCK_EX) === false) {
        throw new HttpError('Écriture impossible dans le dossier data (espace disque ou droits).', 500);
    }
    rename($tmp, db_file());
}

/** Lecture seule (copie). */
function db_read(): array
{
    ensure_data_dir();
    if (!is_file(db_file())) {
        return db_update(fn(array &$d) => $d);
    }
    $raw = @file_get_contents(db_file());
    if ($raw === false || $raw === '') return db_update(fn(array &$d) => $d);
    return db_parse($raw);
}

/**
 * Modification sous verrou : $fn reçoit la base par référence.
 * Retourne la valeur renvoyée par $fn.
 */
function db_update(callable $fn)
{
    ensure_data_dir();
    $lock = fopen(VP_DATA_DIR . '/db.lock', 'c');
    flock($lock, LOCK_EX);
    try {
        $d = is_file(db_file()) && filesize(db_file()) > 0 ? db_parse(file_get_contents(db_file())) : empty_db();
        $result = $fn($d);
        db_write_file($d);
        return $result;
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}

function find_index(array $list, callable $pred): int
{
    foreach ($list as $i => $item) if ($pred($item)) return $i;
    return -1;
}

function get_post(string $id): ?array
{
    foreach (db_read()['posts'] as $p) if ($p['id'] === $id) return $p;
    return null;
}

function get_media(string $id): ?array
{
    foreach (db_read()['media'] as $m) if ($m['id'] === $id) return $m;
    return null;
}
