<?php
/** Mot de passe (choisi à la première visite avec le code d'installation) et cookie de session signé. */

const SESSION_COOKIE = 'vp_session';
const SESSION_TTL = 30 * 24 * 3600;

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
    if (PHP_SAPI === 'cli' || empty($_SERVER['HTTP_HOST'])) {
        return rtrim((string) (db_read()['publicUrl'] ?? ''), '/');
    }
    return (is_https() ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'] . base_path();
}

function remember_public_url(): void
{
    if (PHP_SAPI === 'cli' || empty($_SERVER['HTTP_HOST'])) return;
    $url = public_url();
    $d = db_read();
    if (($d['publicUrl'] ?? null) !== $url) {
        db_update(function (array &$d) use ($url) {
            $d['publicUrl'] = $url;
        });
    }
}

/** Première connexion, ou réinitialisation demandée via le fichier data/reset-password. */
function setup_required(array $d): bool
{
    return empty($d['auth']['passwordHash']) || is_file(VP_DATA_DIR . '/reset-password');
}

function session_key(array $d): string
{
    return hash('sha256', $d['secret'] . '|' . ($d['auth']['passwordHash'] ?? ''), true);
}

function create_session_cookie(array $d): void
{
    $exp = time() + SESSION_TTL;
    $sig = rtrim(strtr(base64_encode(hash_hmac('sha256', (string) $exp, session_key($d), true)), '+/', '-_'), '=');
    setcookie(SESSION_COOKIE, $exp . '.' . $sig, [
        'expires' => $exp,
        'path' => base_path() ?: '/',
        'secure' => is_https(),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

function clear_session_cookie(): void
{
    setcookie(SESSION_COOKIE, '', ['expires' => time() - 3600, 'path' => base_path() ?: '/', 'secure' => is_https(), 'httponly' => true, 'samesite' => 'Lax']);
}

function is_authenticated(?array $d = null): bool
{
    $d ??= db_read();
    if (setup_required($d)) return false;
    $token = $_COOKIE[SESSION_COOKIE] ?? '';
    $parts = explode('.', $token);
    if (count($parts) !== 2 || !ctype_digit($parts[0]) || (int) $parts[0] < time()) return false;
    $expected = rtrim(strtr(base64_encode(hash_hmac('sha256', $parts[0], session_key($d), true)), '+/', '-_'), '=');
    return hash_equals($expected, $parts[1]);
}

function require_auth(): void
{
    if (!is_authenticated()) throw new HttpError('Non authentifié', 401);
}

function session_info(): array
{
    $d = db_read();
    $setup = setup_required($d);
    return ['authenticated' => !$setup && is_authenticated($d), 'passwordRequired' => true, 'setupRequired' => $setup];
}

function session_login(array $body): array
{
    $d = db_read();
    $password = (string) ($body['password'] ?? '');
    if (setup_required($d)) {
        $code = (string) vp_config('setup_code', '');
        $given = strtoupper(trim((string) ($body['setupCode'] ?? '')));
        if ($code === '' || !hash_equals(strtoupper($code), $given)) {
            sleep(1);
            throw new HttpError('Code d\'installation incorrect (voir LISEZ-MOI.txt).', 401);
        }
        if (mb_strlen($password) < 8) throw new HttpError('Choisissez un mot de passe d\'au moins 8 caractères.', 422);
        $d = db_update(function (array &$d) use ($password) {
            $d['auth']['passwordHash'] = password_hash($password, PASSWORD_DEFAULT);
            return $d;
        });
        @unlink(VP_DATA_DIR . '/reset-password');
        create_session_cookie($d);
        return ['ok' => true];
    }
    if (!password_verify($password, $d['auth']['passwordHash'])) {
        sleep(1);
        throw new HttpError('Mot de passe incorrect.', 401);
    }
    create_session_cookie($d);
    return ['ok' => true];
}

function session_change_password(array $body): array
{
    require_auth();
    $d = db_read();
    if (!password_verify((string) ($body['current'] ?? ''), $d['auth']['passwordHash'])) {
        sleep(1);
        throw new HttpError('Mot de passe actuel incorrect.', 401);
    }
    $password = (string) ($body['password'] ?? '');
    if (mb_strlen($password) < 8) throw new HttpError('Le nouveau mot de passe doit contenir au moins 8 caractères.', 422);
    $d = db_update(function (array &$d) use ($password) {
        $d['auth']['passwordHash'] = password_hash($password, PASSWORD_DEFAULT);
        return $d;
    });
    create_session_cookie($d);
    return ['ok' => true];
}
