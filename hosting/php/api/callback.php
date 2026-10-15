<?php
/**
 * Adresse de retour OAuth unique : https://votre-site/posting/api/callback.php
 *  - connexion à VideoPosting avec Twitch (state « login.… ») ;
 *  - connexion des comptes TikTok, YouTube et Instagram d'un espace (state « <plateforme>.… »).
 */

require __DIR__ . '/lib/bootstrap.php';

$base = public_url();
$state = (string) ($_GET['state'] ?? '');
$kind = explode('.', $state)[0];
$clearState = fn() => setcookie('vp_oauth', '', cookie_options(time() - 3600));
$go = function (string $path) use ($base, $clearState) {
    $clearState();
    header('Location: ' . $base . $path, true, 302);
    exit;
};

$cookie = (string) ($_COOKIE['vp_oauth'] ?? '');
$stateOk = $state !== '' && $cookie !== '' && hash_equals($cookie, $state);
$error = $_GET['error_description'] ?? $_GET['error'] ?? null;
$code = (string) ($_GET['code'] ?? '');

// 1. Connexion avec Twitch ---------------------------------------------------
if ($kind === 'login') {
    if ($error) $go('/login/?error=' . rawurlencode($error === 'access_denied' ? 'Connexion Twitch annulée.' : (string) $error));
    if (!$stateOk || $code === '') $go('/login/?error=' . rawurlencode('Session de connexion expirée, veuillez réessayer.'));
    try {
        $go(twitch_callback($code));
    } catch (Throwable $e) {
        error_log('[VideoPosting] Twitch : ' . $e->getMessage());
        $go('/login/?error=' . rawurlencode($e->getMessage()));
    }
}

// 2. Connexion d'un compte de publication -------------------------------------
$platform = $kind;
$back = fn(string $query) => $go("/accounts/?$query");
if (!is_platform($platform)) $back('error=' . rawurlencode('Retour de connexion invalide.'));
try {
    require_auth();
} catch (HttpError $e) {
    $go('/login/');
}
if ($error) $back("platform=$platform&error=" . rawurlencode($error === 'access_denied' ? 'Autorisation refusée.' : (string) $error));
if (!$stateOk || $code === '') $back("platform=$platform&error=" . rawurlencode('Session de connexion expirée, veuillez réessayer.'));

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
