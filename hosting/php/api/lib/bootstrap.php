<?php
/**
 * VideoPosting — version hébergement mutualisé (PHP 8.1+).
 * Même API JSON que la version Node.js : l'interface (export statique) est identique.
 */

if (PHP_VERSION_ID < 80100) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'VideoPosting nécessite PHP 8.1 ou plus récent (version actuelle : ' . PHP_VERSION . '). Changez la version PHP dans votre espace client.']);
    exit;
}

if (!function_exists('curl_init')) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'L\'extension PHP « curl » est requise : activez-la dans votre espace client.']);
    exit;
}

error_reporting(E_ALL);
ini_set('display_errors', '0');
date_default_timezone_set(@date_default_timezone_get() ?: 'Europe/Paris');

define('VP_ROOT', dirname(__DIR__, 2));          // dossier « posting »
define('VP_API_DIR', dirname(__DIR__));
define('VP_DATA_DIR', VP_ROOT . '/data');
define('VP_MEDIA_DIR', VP_DATA_DIR . '/media');

$configFile = VP_API_DIR . '/config.php';
$GLOBALS['VP_CONFIG'] = is_file($configFile) ? (require $configFile) : [];

function vp_config(string $key, $default = null)
{
    return $GLOBALS['VP_CONFIG'][$key] ?? $default;
}

require __DIR__ . '/util.php';
require __DIR__ . '/env.php';
require __DIR__ . '/http.php';
require __DIR__ . '/store.php';
require __DIR__ . '/auth.php';
require __DIR__ . '/captions.php';
require __DIR__ . '/settings.php';
require __DIR__ . '/accounts.php';
require __DIR__ . '/media.php';
require __DIR__ . '/platforms/youtube.php';
require __DIR__ . '/platforms/tiktok.php';
require __DIR__ . '/platforms/instagram.php';
require __DIR__ . '/platforms/demo.php';
require __DIR__ . '/posts.php';
require __DIR__ . '/worker.php';
require __DIR__ . '/demo_data.php';
require __DIR__ . '/revenue.php';
require __DIR__ . '/audience.php';
require __DIR__ . '/analytics.php';
require __DIR__ . '/dashboard.php';
