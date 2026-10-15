<?php
/**
 * Stockage : fichiers JSON protégés (préfixe PHP « exit » : illisibles depuis le navigateur),
 * écrits de façon atomique sous verrou exclusif (plusieurs requêtes PHP peuvent tourner en parallèle).
 *
 *   data/app.php                 configuration commune : sécurité, application Twitch, applications
 *                                développeur des plateformes, règles d'accès, liste des utilisateurs
 *   data/spaces/<id>/db.php      espace d'un utilisateur : comptes connectés, publications, statistiques…
 *   data/spaces/<id>/media/      vidéos et images de cet espace
 */

const DB_GUARD = "<?php exit; ?>\n";

$GLOBALS['VP_SPACE'] = null;

/** Sélectionne l'espace sur lequel portent les lectures/écritures (utilisateur connecté, ou worker). */
function use_space(?string $id): void
{
    if ($id !== null && !preg_match('/^[A-Za-z0-9_-]{1,64}$/', $id)) throw new HttpError('Espace invalide.', 400);
    $GLOBALS['VP_SPACE'] = $id;
}

function current_space(): string
{
    $s = $GLOBALS['VP_SPACE'] ?? null;
    if (!$s) throw new HttpError('Non authentifié', 401);
    return $s;
}

function space_dir(?string $id = null): string
{
    return VP_DATA_DIR . '/spaces/' . ($id ?? current_space());
}

function media_dir(): string
{
    return space_dir() . '/media';
}

function db_file(): string
{
    return space_dir() . '/db.php';
}

function app_file(): string
{
    return VP_DATA_DIR . '/app.php';
}

function protect_dir(string $dir): void
{
    if (!is_file($dir . '/.htaccess')) @file_put_contents($dir . '/.htaccess', "Require all denied\n<IfModule !mod_authz_core.c>\nDeny from all\n</IfModule>\n");
    if (!is_file($dir . '/index.html')) @file_put_contents($dir . '/index.html', '');
}

function ensure_data_dir(): void
{
    foreach ([VP_DATA_DIR, VP_DATA_DIR . '/spaces'] as $dir) {
        if (!is_dir($dir) && !@mkdir($dir, 0755, true)) {
            throw new HttpError('Impossible de créer le dossier « data » : vérifiez les droits d\'écriture du dossier posting.', 500);
        }
        protect_dir($dir);
    }
}

function ensure_space_dir(?string $id = null): void
{
    ensure_data_dir();
    foreach ([space_dir($id), space_dir($id) . '/media'] as $dir) {
        if (!is_dir($dir)) @mkdir($dir, 0755, true);
        protect_dir($dir);
    }
}

/* ------------------------------------------------------------------ */
/* Valeurs par défaut                                                  */
/* ------------------------------------------------------------------ */

function default_credentials(): array
{
    return [
        'youtube' => ['clientId' => '', 'clientSecret' => ''],
        'tiktok' => ['clientKey' => '', 'clientSecret' => ''],
        'instagram' => ['appId' => '', 'appSecret' => '', 'loginType' => 'instagram', 'graphVersion' => 'v24.0'],
    ];
}

function empty_app(): array
{
    return [
        'version' => 2,
        'secret' => bin2hex(random_bytes(32)),
        'cronSecret' => bin2hex(random_bytes(16)),
        'publicUrl' => null,
        'twitch' => ['clientId' => '', 'clientSecret' => ''],
        'credentials' => default_credentials(),
        // owner : administrateurs uniquement · invite : + pseudos Twitch autorisés · open : tout compte Twitch
        'access' => ['mode' => 'owner', 'allowed' => []],
        'users' => [],
        // Éditeur et contact affichés sur les pages légales publiques (conditions, confidentialité).
        'legal' => ['serviceName' => 'VideoPosting', 'editor' => '', 'email' => ''],
    ];
}

function default_settings(): array
{
    return [
        'demoMode' => true,
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
        // Estimation des revenus non communiqués par les API (voir revenue.php).
        'revenueEstimates' => ['enabled' => true, 'tiktokRpm' => 0.5, 'instagramRpm' => 0, 'twitchSubValue' => 2.5, 'twitchBitValue' => 0.01],
    ];
}

function empty_db(): array
{
    return [
        'version' => 2,
        'settings' => default_settings(),
        'accounts' => [],
        'posts' => [],
        'media' => [],
        'analytics' => ['snapshots' => [], 'daily' => [], 'sync' => [], 'audience' => []],
        'revenues' => [],
        'demoRevenueSeeded' => false,
        'jobs' => ['lastTokenRefresh' => 0, 'lastStatsSync' => 0],
        // Chaîne Twitch connectée : compte, relevés quotidiens (abonnés, abonnements), bits par mois.
        'twitch' => ['account' => null, 'snapshots' => [], 'bits' => [], 'error' => null, 'updatedAt' => null],
    ];
}

function db_migrate(array $d): array
{
    $base = empty_db();
    foreach ($base as $k => $v) if (!array_key_exists($k, $d)) $d[$k] = $v;
    $d['settings'] = array_replace_recursive($base['settings'], $d['settings'] ?? []);
    $d['settings']['hashtagGroups'] = array_values($d['settings']['hashtagGroups'] ?? []);
    $d['analytics'] = array_replace($base['analytics'], is_array($d['analytics'] ?? null) ? $d['analytics'] : []);
    $d['twitch'] = array_replace($base['twitch'], is_array($d['twitch'] ?? null) ? $d['twitch'] : []);
    unset($d['settings']['credentials']);
    return $d;
}

function app_migrate(array $a): array
{
    $base = empty_app();
    foreach ($base as $k => $v) if (!array_key_exists($k, $a)) $a[$k] = $v;
    $a['credentials'] = array_replace_recursive($base['credentials'], $a['credentials'] ?? []);
    $a['access'] = array_replace($base['access'], $a['access'] ?? []);
    $a['users'] = array_values($a['users'] ?? []);
    return $a;
}

/* ------------------------------------------------------------------ */
/* Lecture / écriture                                                  */
/* ------------------------------------------------------------------ */

function json_parse_file(string $raw, string $label): array
{
    if (str_starts_with($raw, DB_GUARD)) $raw = substr($raw, strlen(DB_GUARD));
    $d = json_decode($raw, true);
    if (!is_array($d)) throw new HttpError("Fichier de données illisible ($label).", 500);
    return $d;
}

function json_write_file(string $file, array $d): void
{
    $tmp = $file . '.' . bin2hex(random_bytes(4)) . '.tmp';
    $json = json_encode($d, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION);
    if ($json === false || file_put_contents($tmp, DB_GUARD . $json, LOCK_EX) === false) {
        throw new HttpError('Écriture impossible dans le dossier data (espace disque ou droits).', 500);
    }
    rename($tmp, $file);
}

function locked_update(string $file, string $lockFile, callable $empty, callable $migrate, callable $fn)
{
    $lock = fopen($lockFile, 'c');
    flock($lock, LOCK_EX);
    try {
        clearstatcache(true, $file);
        $d = is_file($file) && filesize($file) > 0 ? $migrate(json_parse_file(file_get_contents($file), basename($file))) : $empty();
        $result = $fn($d);
        json_write_file($file, $d);
        return $result;
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}

function app_read(): array
{
    ensure_data_dir();
    clearstatcache(true, app_file());
    $raw = is_file(app_file()) ? @file_get_contents(app_file()) : '';
    if (!$raw) return app_update(fn(array &$a) => $a);
    return app_migrate(json_parse_file($raw, 'app.php'));
}

function app_update(callable $fn)
{
    ensure_data_dir();
    return locked_update(app_file(), VP_DATA_DIR . '/app.lock', 'empty_app', 'app_migrate', $fn);
}

/** Lecture de l'espace courant (copie). */
function db_read(): array
{
    ensure_space_dir();
    clearstatcache(true, db_file());
    $raw = is_file(db_file()) ? @file_get_contents(db_file()) : '';
    if (!$raw) return db_update(fn(array &$d) => $d);
    return db_migrate(json_parse_file($raw, 'db.php'));
}

/** Modification de l'espace courant sous verrou : $fn reçoit la base par référence. */
function db_update(callable $fn)
{
    ensure_space_dir();
    return locked_update(db_file(), space_dir() . '/db.lock', 'empty_db', 'db_migrate', $fn);
}

/** Identifiants des espaces existants (un par utilisateur). */
function all_space_ids(): array
{
    return array_values(array_map(fn($u) => (string) $u['id'], app_read()['users']));
}

/** Importe les données de l'ancienne version mono-utilisateur dans un espace. */
function migrate_legacy_into_space(string $spaceId): void
{
    $legacy = VP_DATA_DIR . '/db.php';
    if (!is_file($legacy)) return;
    $old = json_parse_file(file_get_contents($legacy), 'db.php');
    ensure_space_dir($spaceId);
    $previous = $GLOBALS['VP_SPACE'] ?? null;
    use_space($spaceId);
    try {
        db_update(function (array &$d) use ($old) {
            foreach (['accounts', 'posts', 'media', 'analytics', 'revenues', 'demoRevenueSeeded'] as $k) {
                if (array_key_exists($k, $old)) $d[$k] = $old[$k];
            }
            if (isset($old['settings'])) {
                $settings = $old['settings'];
                unset($settings['credentials']);
                $d['settings'] = array_replace_recursive($d['settings'], $settings);
            }
        });
        if (is_dir(VP_DATA_DIR . '/media')) {
            foreach (glob(VP_DATA_DIR . '/media/*') ?: [] as $file) {
                $name = basename($file);
                if ($name === '.htaccess' || $name === 'index.html') continue;
                @rename($file, media_dir() . '/' . $name);
            }
        }
    } finally {
        use_space($previous);
    }
    if (!empty($old['settings']['credentials'])) {
        app_update(function (array &$a) use ($old) {
            foreach ($old['settings']['credentials'] as $platform => $c) {
                $current = $a['credentials'][$platform] ?? [];
                $empty = !array_filter($current, fn($v, $k) => $k !== 'loginType' && $k !== 'graphVersion' && $v !== '', ARRAY_FILTER_USE_BOTH);
                if ($empty) $a['credentials'][$platform] = array_replace($current, $c);
            }
        });
    }
    @rename($legacy, VP_DATA_DIR . '/db.ancienne-version.php');
}

/* ------------------------------------------------------------------ */
/* Raccourcis                                                          */
/* ------------------------------------------------------------------ */

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

/** Supprime un dossier et son contenu. */
function remove_dir(string $dir): void
{
    if (!is_dir($dir)) return;
    $items = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::CHILD_FIRST);
    foreach ($items as $item) $item->isDir() ? @rmdir($item->getPathname()) : @unlink($item->getPathname());
    @rmdir($dir);
}
