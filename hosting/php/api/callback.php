<?php
/**
 * Adresse de retour OAuth unique pour TikTok, YouTube et Instagram :
 * https://votre-site/posting/api/callback.php (la plateforme est indiquée dans « state »).
 */

require __DIR__ . '/lib/bootstrap.php';

$base = public_url();
$back = function (string $query) use ($base) {
    setcookie('vp_oauth', '', ['expires' => time() - 3600, 'path' => base_path() ?: '/', 'secure' => is_https(), 'httponly' => true, 'samesite' => 'Lax']);
    header("Location: $base/accounts/?$query", true, 302);
    exit;
};

$state = (string) ($_GET['state'] ?? '');
$platform = explode('.', $state)[0];
if (!is_platform($platform)) $back('error=' . rawurlencode('Retour de connexion invalide.'));

if (!is_authenticated()) {
    header("Location: $base/login/", true, 302);
    exit;
}

$error = $_GET['error_description'] ?? $_GET['error'] ?? null;
if ($error) $back("platform=$platform&error=" . rawurlencode($error === 'access_denied' ? 'Autorisation refusée.' : (string) $error));

$cookie = (string) ($_COOKIE['vp_oauth'] ?? '');
$code = (string) ($_GET['code'] ?? '');
if ($code === '' || $cookie === '' || !hash_equals($cookie, $state)) {
    $back("platform=$platform&error=" . rawurlencode('Session de connexion expirée, veuillez réessayer.'));
}

try {
    $c = credentials($platform);
    $account = match ($platform) {
        'youtube' => youtube_exchange($code, $c),
        'tiktok' => tiktok_exchange($code, $c),
        'instagram' => instagram_exchange($code, $c),
    };
    save_account($account + ['connectedAt' => now_ms()]);
    $back("connected=$platform");
} catch (Throwable $e) {
    error_log('[VideoPosting] OAuth ' . $platform . ' : ' . $e->getMessage());
    $back("platform=$platform&error=" . rawurlencode($e->getMessage()));
}
