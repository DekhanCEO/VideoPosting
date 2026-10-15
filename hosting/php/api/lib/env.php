<?php
/**
 * Fichier .env : identifiants Twitch, YouTube, TikTok et Instagram rangés HORS du dossier public du site.
 *
 * Emplacements recherchés, dans l'ordre :
 *   1. chemin indiqué par la variable d'environnement VIDEOPOSTING_ENV ou par 'env_file' dans api/config.php ;
 *   2. les dossiers parents de « posting » (jusqu'à 4 niveaux) : .env.videoposting, videoposting.env, .env ;
 *   3. posting/data/.env (dossier protégé, si l'hébergement ne donne pas accès au-dessus du dossier public).
 * Les valeurs du .env sont prioritaires sur celles saisies dans l'application.
 */

function vp_env_candidates(): array
{
    $list = [];
    foreach ([getenv('VIDEOPOSTING_ENV') ?: null, vp_config('env_file')] as $f) if (is_string($f) && $f !== '') $list[] = $f;
    $dir = dirname(VP_ROOT);
    for ($i = 0; $i < 4 && $dir !== '' && $dir !== dirname($dir); $i++) {
        foreach (['.env.videoposting', 'videoposting.env', '.env'] as $name) $list[] = $dir . '/' . $name;
        $dir = dirname($dir);
    }
    $list[] = VP_DATA_DIR . '/.env';
    return $list;
}

/** Lit un fichier .env (KEY=valeur, commentaires #, guillemets facultatifs, « export » toléré). */
function vp_parse_env(string $raw): array
{
    $vars = [];
    foreach (preg_split('/\r\n|\r|\n/', $raw) as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#') continue;
        if (str_starts_with($line, 'export ')) $line = trim(substr($line, 7));
        $eq = strpos($line, '=');
        if ($eq === false) continue;
        $key = trim(substr($line, 0, $eq));
        $value = trim(substr($line, $eq + 1));
        if (!preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/', $key)) continue;
        if ($value !== '' && ($value[0] === '"' || $value[0] === "'")) {
            $quote = $value[0];
            $end = strpos($value, $quote, 1);
            $value = $end === false ? substr($value, 1) : substr($value, 1, $end - 1);
            if ($quote === '"') $value = str_replace(['\\n', '\\"'], ["\n", '"'], $value);
        } else {
            $value = trim(preg_replace('/\s+#.*$/', '', $value));
        }
        $vars[$key] = $value;
    }
    return $vars;
}

/** Fichier .env chargé : ['file' => chemin|null, 'vars' => [...]]. */
function vp_env_state(): array
{
    static $state = null;
    if ($state !== null) return $state;
    $state = ['file' => null, 'vars' => []];
    foreach (vp_env_candidates() as $file) {
        // open_basedir peut interdire certains dossiers parents : on ignore silencieusement.
        if (!@is_file($file) || !@is_readable($file)) continue;
        $raw = @file_get_contents($file);
        if ($raw === false) continue;
        $state = ['file' => $file, 'vars' => vp_parse_env($raw)];
        break;
    }
    return $state;
}

function vp_env(string $key): ?string
{
    $v = vp_env_state()['vars'][$key] ?? null;
    return $v === null || trim($v) === '' ? null : trim($v);
}

/** Le .env trouvé est-il dans le dossier public du site (donc potentiellement lisible depuis le web) ? */
function vp_env_is_public(): bool
{
    $file = vp_env_state()['file'];
    if (!$file) return false;
    $real = @realpath($file) ?: $file;
    if (str_starts_with($real, (@realpath(VP_DATA_DIR) ?: VP_DATA_DIR) . DIRECTORY_SEPARATOR)) return false; // dossier protégé
    $root = (string) ($_SERVER['DOCUMENT_ROOT'] ?? '');
    $root = $root !== '' ? (@realpath($root) ?: $root) : dirname(VP_ROOT);
    return str_starts_with($real, rtrim($root, '/\\') . DIRECTORY_SEPARATOR);
}

/** Informations affichées à l'administrateur (jamais les valeurs). */
function vp_env_info(): array
{
    $state = vp_env_state();
    $keys = ['TWITCH_CLIENT_ID', 'TWITCH_CLIENT_SECRET', 'YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET', 'INSTAGRAM_APP_ID', 'INSTAGRAM_APP_SECRET'];
    return [
        'found' => $state['file'] !== null,
        'location' => $state['file'] ? (str_starts_with($state['file'], VP_DATA_DIR) ? 'data' : 'outside') : null,
        'public' => vp_env_is_public(),
        'keys' => array_values(array_filter($keys, fn($k) => vp_env($k) !== null)),
    ];
}
