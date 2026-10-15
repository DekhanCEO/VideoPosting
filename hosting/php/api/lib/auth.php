<?php
/**
 * Connexion avec Twitch : chaque compte Twitch autorisé dispose de son propre espace.
 * Le premier compte connecté (avec le code d'installation) devient administrateur et choisit qui peut entrer.
 */

const SESSION_COOKIE = 'vp_session';
const SESSION_TTL = 30 * 24 * 3600;
const TWITCH_AUTH = 'https://id.twitch.tv/oauth2';
const TWITCH_API = 'https://api.twitch.tv/helix';

function base_path(): string
{
    // /posting/api/index.php → /posting
    $script = str_replace('\\', '/', $_SERVER['SCRIPT_NAME'] ?? '/api/index.php');
    $base = rtrim(dirname(dirname($script)), '/');
    return $base === '.' ? '' : $base;
}

function is_https(): bool
{
    if (!empty($_SERVER['HTTPS']) && strtolower((string) $_SERVER['HTTPS']) !== 'off') return true;
    if (strtolower($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https') return true;
    if (($_SERVER['SERVER_PORT'] ?? '') === '443') return true;
    return false;
}

/** URL publique de l'application (mémorisée pour les tâches lancées par cron en ligne de commande). */
function public_url(): string
{
    if ($forced = vp_env('PUBLIC_URL')) return rtrim($forced, '/');
    if (PHP_SAPI === 'cli' || empty($_SERVER['HTTP_HOST'])) {
        return rtrim((string) (app_read()['publicUrl'] ?? ''), '/');
    }
    return (is_https() ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'] . base_path();
}

function remember_public_url(): void
{
    if (PHP_SAPI === 'cli' || empty($_SERVER['HTTP_HOST'])) return;
    $url = public_url();
    if ((app_read()['publicUrl'] ?? null) !== $url) {
        app_update(function (array &$a) use ($url) {
            $a['publicUrl'] = $url;
        });
    }
}

function cookie_options(int $expires): array
{
    return ['expires' => $expires, 'path' => base_path() ?: '/', 'secure' => is_https(), 'httponly' => true, 'samesite' => 'Lax'];
}

function sign_value(string $value): string
{
    return rtrim(strtr(base64_encode(hash_hmac('sha256', $value, app_read()['secret'], true)), '+/', '-_'), '=');
}

/* ------------------------------------------------------------------ */
/* Utilisateurs et règles d'accès                                      */
/* ------------------------------------------------------------------ */

/** Application Twitch : celle du .env si présente, sinon celle enregistrée à l'installation. */
function twitch_app(array $app): array
{
    $id = vp_env('TWITCH_CLIENT_ID');
    $secret = vp_env('TWITCH_CLIENT_SECRET');
    if ($id !== null && $secret !== null) return ['clientId' => $id, 'clientSecret' => $secret, 'fromEnv' => true];
    return ['clientId' => (string) $app['twitch']['clientId'], 'clientSecret' => (string) $app['twitch']['clientSecret'], 'fromEnv' => false];
}

function twitch_configured(array $app): bool
{
    $t = twitch_app($app);
    return $t['clientId'] !== '' && $t['clientSecret'] !== '';
}

function setup_code(): string
{
    return (string) (vp_env('SETUP_CODE') ?? vp_config('setup_code', ''));
}

function has_admin(array $app): bool
{
    foreach ($app['users'] as $u) if ($u['role'] === 'admin') return true;
    return false;
}

/** Première installation, ou réinitialisation demandée via le fichier data/reset-setup. */
function setup_required(?array $app = null): bool
{
    $app ??= app_read();
    return !twitch_configured($app) || !has_admin($app) || is_file(VP_DATA_DIR . '/reset-setup');
}

function find_user(array $app, string $id): ?array
{
    foreach ($app['users'] as $u) if ((string) $u['id'] === $id) return $u;
    return null;
}

function access_allowed(array $app, array $user): bool
{
    if ($user['role'] === 'admin') return true;
    $mode = $app['access']['mode'];
    if ($mode === 'open') return true;
    if ($mode === 'invite') {
        $allowed = array_map('strtolower', $app['access']['allowed']);
        return in_array(strtolower($user['login']), $allowed, true);
    }
    return false;
}

function public_user(array $u): array
{
    return [
        'id' => (string) $u['id'],
        'login' => $u['login'],
        'displayName' => $u['displayName'],
        'avatarUrl' => $u['avatarUrl'] ?? null,
        'role' => $u['role'],
    ];
}

/* ------------------------------------------------------------------ */
/* Session                                                             */
/* ------------------------------------------------------------------ */

function create_session_cookie(string $uid): void
{
    $exp = time() + SESSION_TTL;
    $payload = $uid . '.' . $exp;
    setcookie(SESSION_COOKIE, $payload . '.' . sign_value('session|' . $payload), cookie_options($exp));
}

function clear_session_cookie(): void
{
    setcookie(SESSION_COOKIE, '', cookie_options(time() - 3600));
}

/** Utilisateur connecté (cookie valide, compte toujours présent et autorisé), sinon null. */
function session_user(?array $app = null): ?array
{
    $parts = explode('.', (string) ($_COOKIE[SESSION_COOKIE] ?? ''));
    if (count($parts) !== 3 || !ctype_digit($parts[1]) || (int) $parts[1] < time()) return null;
    if (!hash_equals(sign_value('session|' . $parts[0] . '.' . $parts[1]), $parts[2])) return null;
    $app ??= app_read();
    $user = find_user($app, $parts[0]);
    if (!$user || !access_allowed($app, $user)) return null;
    return $user;
}

function require_auth(): array
{
    $app = app_read();
    if (setup_required($app)) throw new HttpError('Non authentifié', 401);
    $user = session_user($app);
    if (!$user) throw new HttpError('Non authentifié', 401);
    use_space((string) $user['id']);
    return $user;
}

function require_admin(): array
{
    $user = require_auth();
    if ($user['role'] !== 'admin') throw new HttpError('Réservé à l\'administrateur.', 403);
    return $user;
}

function session_info(): array
{
    $app = app_read();
    $setup = setup_required($app);
    $user = $setup ? null : session_user($app);
    return [
        'authenticated' => $user !== null,
        'passwordRequired' => true,
        'setupRequired' => $setup,
        'loginMethod' => 'twitch',
        'twitchConfigured' => twitch_configured($app),
        'twitchFromEnv' => twitch_app($app)['fromEnv'],
        'redirectUri' => redirect_uri(),
        'user' => $user ? public_user($user) : null,
    ];
}

/* ------------------------------------------------------------------ */
/* Twitch                                                              */
/* ------------------------------------------------------------------ */

function twitch_validate_app(string $clientId, string $clientSecret): void
{
    [$status, , $body] = http_request('POST', TWITCH_AUTH . '/token', [], ['client_id' => $clientId, 'client_secret' => $clientSecret, 'grant_type' => 'client_credentials']);
    if ($status !== 200 || empty($body['access_token'])) {
        throw new HttpError('Twitch refuse ces identifiants : vérifiez l\'ID client et le secret de votre application Twitch.', 422);
    }
}

function twitch_login_url(): string
{
    $app = app_read();
    $state = 'login.' . bin2hex(random_bytes(16));
    setcookie('vp_oauth', $state, cookie_options(time() + 600));
    return TWITCH_AUTH . '/authorize?' . http_build_query([
        'response_type' => 'code',
        'client_id' => twitch_app($app)['clientId'],
        'redirect_uri' => redirect_uri(),
        'scope' => 'user:read:email',
        'state' => $state,
    ]);
}

/** Étape 1 de l'installation : code d'installation + application Twitch. Renvoie l'adresse de connexion Twitch. */
function session_setup(array $body): array
{
    if (!setup_required()) throw new HttpError('L\'installation est déjà terminée.', 409);
    $code = setup_code();
    $given = strtoupper(trim((string) ($body['setupCode'] ?? '')));
    if ($code === '' || !hash_equals(strtoupper($code), $given)) {
        sleep(1);
        throw new HttpError('Code d\'installation incorrect (voir LISEZ-MOI.txt).', 401);
    }
    // Application Twitch du .env, ou déjà enregistrée (réinitialisation, connexion annulée…) : champs facultatifs.
    $saved = twitch_app(app_read());
    $clientId = $saved['fromEnv'] ? $saved['clientId'] : (trim((string) ($body['clientId'] ?? '')) ?: $saved['clientId']);
    $clientSecret = $saved['fromEnv'] ? $saved['clientSecret'] : (trim((string) ($body['clientSecret'] ?? '')) ?: $saved['clientSecret']);
    if ($clientId === '' || $clientSecret === '') throw new HttpError('Renseignez l\'ID client et le secret de votre application Twitch.', 422);
    twitch_validate_app($clientId, $clientSecret);
    if (!$saved['fromEnv']) {
        app_update(function (array &$a) use ($clientId, $clientSecret) {
            $a['twitch'] = ['clientId' => $clientId, 'clientSecret' => $clientSecret];
        });
    }
    $exp = time() + 900;
    setcookie('vp_setup', $exp . '.' . sign_value('setup|' . $exp), cookie_options($exp));
    return ['redirect' => twitch_login_url()];
}

function setup_cookie_valid(): bool
{
    $parts = explode('.', (string) ($_COOKIE['vp_setup'] ?? ''));
    return count($parts) === 2 && ctype_digit($parts[0]) && (int) $parts[0] >= time() && hash_equals(sign_value('setup|' . $parts[0]), $parts[1]);
}

/**
 * Retour de Twitch : identifie le compte, crée l'espace si nécessaire, ouvre la session.
 * Renvoie le chemin vers lequel rediriger.
 */
function twitch_callback(string $code): string
{
    $app = app_read();
    $t = twitch_app($app);
    [$status, , $token] = http_request('POST', TWITCH_AUTH . '/token', [], [
        'client_id' => $t['clientId'], 'client_secret' => $t['clientSecret'], 'code' => $code,
        'grant_type' => 'authorization_code', 'redirect_uri' => redirect_uri(),
    ]);
    if ($status !== 200 || empty($token['access_token'])) throw new HttpError('Connexion Twitch impossible : ' . ($token['message'] ?? 'code refusé') . '.', 400);
    [$status, , $me] = http_request('GET', TWITCH_API . '/users', ['Authorization' => 'Bearer ' . $token['access_token'], 'Client-Id' => $t['clientId']]);
    $tw = $me['data'][0] ?? null;
    if ($status !== 200 || !$tw) throw new HttpError('Impossible de lire votre profil Twitch.', 400);
    // Le jeton Twitch ne sert qu'à vous identifier : on le révoque aussitôt.
    http_request('POST', TWITCH_AUTH . '/revoke', [], ['client_id' => $t['clientId'], 'token' => $token['access_token']], ['timeout' => 10]);

    $setup = setup_required($app);
    $setupOk = $setup && setup_cookie_valid();
    $profile = [
        'id' => (string) $tw['id'],
        'login' => (string) $tw['login'],
        'displayName' => (string) ($tw['display_name'] ?: $tw['login']),
        'avatarUrl' => $tw['profile_image_url'] ?? null,
        'email' => $tw['email'] ?? null,
    ];

    $result = app_update(function (array &$a) use ($profile, $setupOk) {
        $now = now_ms();
        $firstAdmin = !has_admin($a);
        $i = find_index($a['users'], fn($u) => (string) $u['id'] === $profile['id']);
        if ($i >= 0) {
            $a['users'][$i] = array_replace($a['users'][$i], $profile, ['lastLoginAt' => $now]);
            if ($setupOk) $a['users'][$i]['role'] = 'admin';
            $user = $a['users'][$i];
            return ['user' => $user, 'allowed' => access_allowed($a, $user), 'created' => false, 'firstAdmin' => false];
        }
        if ($firstAdmin && !$setupOk) return ['allowed' => false, 'reason' => 'setup'];
        $user = $profile + ['role' => $setupOk ? 'admin' : 'member', 'createdAt' => $now, 'lastLoginAt' => $now];
        if (!access_allowed($a, $user)) return ['allowed' => false, 'reason' => 'access'];
        $a['users'][] = $user;
        return ['user' => $user, 'allowed' => true, 'created' => true, 'firstAdmin' => $firstAdmin];
    });

    if (empty($result['allowed'])) {
        $msg = ($result['reason'] ?? '') === 'setup'
            ? 'Terminez d\'abord l\'installation avec le code d\'installation.'
            : 'Votre compte Twitch n\'a pas accès à cet espace. Demandez une invitation à l\'administrateur.';
        return '/login/?error=' . rawurlencode($msg);
    }
    $user = $result['user'];
    ensure_space_dir($user['id']);
    if (!empty($result['firstAdmin'])) migrate_legacy_into_space($user['id']);
    if ($setupOk) {
        @unlink(VP_DATA_DIR . '/reset-setup');
        setcookie('vp_setup', '', cookie_options(time() - 3600));
    }
    create_session_cookie($user['id']);
    return '/';
}

/* ------------------------------------------------------------------ */
/* Administration                                                      */
/* ------------------------------------------------------------------ */

function admin_overview(): array
{
    $app = app_read();
    $previous = $GLOBALS['VP_SPACE'];
    $users = [];
    foreach ($app['users'] as $u) {
        use_space((string) $u['id']);
        $d = is_file(db_file()) ? db_read() : empty_db();
        $users[] = public_user($u) + [
            'createdAt' => $u['createdAt'] ?? null,
            'lastLoginAt' => $u['lastLoginAt'] ?? null,
            'posts' => count($d['posts']),
            'accounts' => count(array_filter($d['accounts'], fn($a) => empty($a['demo']))),
            'storage' => array_sum(array_map(fn($m) => (int) $m['size'], $d['media'])),
        ];
    }
    use_space($previous);
    return [
        'access' => $app['access'],
        'users' => $users,
        'twitch' => ['clientId' => twitch_app($app)['clientId'], 'redirectUri' => redirect_uri(), 'fromEnv' => twitch_app($app)['fromEnv']],
    ];
}

function admin_set_access(array $body): array
{
    $mode = in_array($body['mode'] ?? '', ['owner', 'invite', 'open'], true) ? $body['mode'] : 'owner';
    $allowed = array_values(array_unique(array_map(fn($l) => strtolower(preg_replace('/[^A-Za-z0-9_]/', '', ltrim($l, '@'))), string_list($body['allowed'] ?? [], 500, 40))));
    app_update(function (array &$a) use ($mode, $allowed) {
        $a['access'] = ['mode' => $mode, 'allowed' => array_values(array_filter($allowed))];
    });
    return admin_overview();
}

function admin_remove_user(string $id, array $me): array
{
    if ($id === (string) $me['id']) throw new HttpError('Vous ne pouvez pas supprimer votre propre espace.', 409);
    if (!preg_match('/^[A-Za-z0-9_-]{1,64}$/', $id)) throw new HttpError('Utilisateur inconnu.', 404);
    app_update(function (array &$a) use ($id) {
        $a['users'] = array_values(array_filter($a['users'], fn($u) => (string) $u['id'] !== $id));
    });
    remove_dir(space_dir($id));
    return admin_overview();
}

function admin_set_role(string $id, string $role, array $me): array
{
    if (!in_array($role, ['admin', 'member'], true)) throw new HttpError('Rôle invalide.', 422);
    if ($id === (string) $me['id'] && $role !== 'admin') throw new HttpError('Vous ne pouvez pas retirer vos propres droits d\'administrateur.', 409);
    app_update(function (array &$a) use ($id, $role) {
        foreach ($a['users'] as &$u) if ((string) $u['id'] === $id) $u['role'] = $role;
    });
    return admin_overview();
}

function admin_set_twitch(array $body): array
{
    $app = app_read();
    if (twitch_app($app)['fromEnv']) throw new HttpError('L\'application Twitch est définie dans le fichier .env : modifiez-la là-bas.', 409);
    $clientId = trim((string) ($body['clientId'] ?? $app['twitch']['clientId']));
    $clientSecret = trim((string) ($body['clientSecret'] ?? '')) ?: $app['twitch']['clientSecret'];
    twitch_validate_app($clientId, $clientSecret);
    app_update(function (array &$a) use ($clientId, $clientSecret) {
        $a['twitch'] = ['clientId' => $clientId, 'clientSecret' => $clientSecret];
    });
    return admin_overview();
}
