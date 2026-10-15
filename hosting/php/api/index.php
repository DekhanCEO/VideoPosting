<?php
/**
 * Point d'entrée de l'API : /posting/api/index.php?r=/posts/123
 * (le routage par paramètre fonctionne sans réécriture d'URL, sur tous les hébergements).
 */

ob_start();
require __DIR__ . '/lib/bootstrap.php';

$route = '/' . trim((string) ($_GET['r'] ?? ''), '/');
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
if ($method === 'POST' && !empty($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'])) {
    $override = strtoupper($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE']);
    if (in_array($override, ['PUT', 'DELETE', 'PATCH'], true)) $method = $override;
}
$isGet = $method === 'GET' || $method === 'HEAD';
$kick = true;

function route_match(string $pattern, string $route, ?array &$params): bool
{
    $regex = '#^' . preg_replace('#\{(\w+)\}#', '(?P<$1>[^/]+)', $pattern) . '$#';
    if (!preg_match($regex, $route, $m)) return false;
    $params = array_filter($m, 'is_string', ARRAY_FILTER_USE_KEY);
    return true;
}

function redirect_to(string $url): void
{
    header('Location: ' . $url, true, 302);
}

try {
    $p = [];
    // Routes publiques -----------------------------------------------------------
    if ($route === '/session') {
        $kick = false;
        if ($isGet) json_out(session_info());
        elseif ($method === 'DELETE') { clear_session_cookie(); json_out(['ok' => true]); }
        else throw new HttpError('Méthode non autorisée', 405);
    } elseif ($route === '/session/setup' && $method === 'POST') {
        $kick = false;
        json_out(session_setup(request_json()));
    } elseif ($route === '/auth/twitch/login' && $isGet) {
        $kick = false;
        $app = app_read();
        redirect_to(twitch_configured($app) ? twitch_login_url() : public_url() . '/login/');
    } elseif (route_match('/media/{id}/public', $route, $p) && $isGet) {
        $kick = false;
        $space = (string) ($_GET['u'] ?? '');
        if (!preg_match('/^[A-Za-z0-9_-]{1,64}$/', $space) || !verify_media_signature($space, $p['id'], $_GET['exp'] ?? null, $_GET['sig'] ?? null)) throw new HttpError('Lien expiré ou invalide', 403);
        use_space($space);
        $m = get_media($p['id']);
        if (!$m || $m['status'] !== 'ready') throw new HttpError('Introuvable', 404);
        stream_media($m);
    } elseif ($route === '/cron') {
        $secret = (string) ($_GET['secret'] ?? '');
        if ($secret === '' || !hash_equals(cron_secret(), $secret)) throw new HttpError('Non autorisé', 401);
        $spaces = spaces_with_work();
        json_out(['ok' => true, 'pending' => count($spaces)]);
        finish_request();
        $t0 = microtime(true);
        worker_run(40, $spaces);
        run_periodic_jobs_all(max(10, 50 - (microtime(true) - $t0)));
        exit;
    } else {
        // Routes réservées aux utilisateurs connectés (chacun dans son espace) ---
        $user = require_auth();
        remember_public_url();

        if ($route === '/settings') {
            if ($isGet) json_out(public_settings($user));
            elseif ($method === 'PUT') { apply_settings_patch(request_json(), $user); json_out(public_settings($user)); }
            else throw new HttpError('Méthode non autorisée', 405);
        } elseif ($route === '/admin' && $isGet) {
            require_admin();
            json_out(admin_overview());
        } elseif ($route === '/admin/access' && $method === 'PUT') {
            require_admin();
            json_out(admin_set_access(request_json()));
        } elseif ($route === '/admin/twitch' && $method === 'PUT') {
            require_admin();
            json_out(admin_set_twitch(request_json()));
        } elseif (route_match('/admin/users/{id}', $route, $p)) {
            $me = require_admin();
            if ($method === 'DELETE') json_out(admin_remove_user($p['id'], $me));
            elseif ($method === 'PUT') json_out(admin_set_role($p['id'], (string) (request_json()['role'] ?? ''), $me));
            else throw new HttpError('Méthode non autorisée', 405);
        } elseif ($route === '/accounts' && $isGet) {
            json_out(array_map('public_account', list_accounts()));
        } elseif (route_match('/accounts/{platform}', $route, $p) && $method === 'DELETE') {
            if (!is_platform($p['platform'])) throw new HttpError('Plateforme inconnue.', 404);
            remove_account($p['platform']);
            json_out(['ok' => true]);
        } elseif ($route === '/auth/twitch-channel/connect' && $isGet) {
            $kick = false;
            $base = public_url();
            if (db_read()['settings']['demoMode']) {
                twitch_channel_connect_demo();
                redirect_to("$base/accounts/?connected=twitch");
            } elseif (!twitch_configured(app_read())) {
                redirect_to("$base/accounts/?platform=twitch&error=" . rawurlencode('Application Twitch non configurée.'));
            } else {
                $state = 'twitchch.' . bin2hex(random_bytes(16));
                setcookie('vp_oauth', $state, cookie_options(time() + 600));
                redirect_to(twitch_channel_auth_url($state));
            }
        } elseif (route_match('/auth/{platform}/connect', $route, $p) && $isGet) {
            $kick = false;
            $platform = $p['platform'];
            $base = public_url();
            if (!is_platform($platform)) { redirect_to("$base/accounts/"); exit; }
            if (db_read()['settings']['demoMode']) {
                save_account(demo_account($platform));
                redirect_to("$base/accounts/?connected=$platform");
            } else {
                $c = credentials($platform);
                if (!$c['configured']) {
                    redirect_to("$base/settings/?missing=$platform#$platform");
                } else {
                    $state = $platform . '.' . bin2hex(random_bytes(16));
                    setcookie('vp_oauth', $state, ['expires' => time() + 600, 'path' => base_path() ?: '/', 'secure' => is_https(), 'httponly' => true, 'samesite' => 'Lax']);
                    redirect_to(match ($platform) {
                        'youtube' => youtube_auth_url($state, $c),
                        'tiktok' => tiktok_auth_url($state, $c),
                        'instagram' => instagram_auth_url($state, $c),
                    });
                }
            }
        } elseif ($route === '/platforms/tiktok/creator-info' && $isGet) {
            $a = get_account('tiktok');
            if (!$a) throw new HttpError('Aucun compte TikTok connecté.', 404);
            if (!empty($a['demo'])) json_out(demo_creator_info());
            else {
                try {
                    json_out(tiktok_creator_info(usable_account('tiktok')));
                } catch (PlatformError $e) {
                    throw new HttpError($e->getMessage(), 502);
                }
            }
        } elseif ($route === '/media' && $method === 'POST') {
            json_out(create_media(request_json()) + ['chunkSize' => chunk_size()], 201);
        } elseif (route_match('/media/{id}/chunk', $route, $p) && $method === 'POST') {
            $kick = false;
            $offset = (int) ($_GET['offset'] ?? -1);
            if ($offset < 0) throw new HttpError('Position invalide.', 400);
            json_out(write_chunk($p['id'], $offset));
        } elseif (route_match('/media/{id}/complete', $route, $p) && $method === 'POST') {
            json_out(complete_media($p['id'], request_json()));
        } elseif (route_match('/media/{id}/file', $route, $p) && $isGet) {
            $kick = false;
            $m = get_media($p['id']);
            if (!$m) throw new HttpError('Introuvable', 404);
            stream_media($m);
        } elseif (route_match('/media/{id}', $route, $p)) {
            if ($isGet) {
                $m = get_media($p['id']);
                if (!$m) throw new HttpError('Média introuvable.', 404);
                json_out($m);
            } elseif ($method === 'DELETE') {
                delete_media_if_unused($p['id']);
                json_out(['ok' => true]);
            } else throw new HttpError('Méthode non autorisée', 405);
        } elseif ($route === '/posts') {
            if ($isGet) json_out(array_map('with_media', list_posts()));
            elseif ($method === 'POST') json_out(save_post(null, request_json()));
            else throw new HttpError('Méthode non autorisée', 405);
        } elseif (route_match('/posts/{id}/publish', $route, $p) && $method === 'POST') {
            if (!get_post($p['id'])) throw new HttpError('Publication introuvable.', 404);
            $body = request_json();
            $only = isset($body['platforms']) && is_array($body['platforms']) ? array_values(array_filter($body['platforms'], 'is_platform')) : null;
            start_publishing($p['id'], $only);
            json_out(with_media(get_post($p['id'])));
        } elseif (route_match('/posts/{id}/cancel', $route, $p) && $method === 'POST') {
            $post = get_post($p['id']);
            if (!$post) throw new HttpError('Publication introuvable.', 404);
            $body = request_json();
            if ($post['status'] === 'scheduled') {
                db_update(function (array &$d) use ($p) {
                    foreach ($d['posts'] as &$x) if ($x['id'] === $p['id']) { $x['status'] = 'draft'; $x['updatedAt'] = now_ms(); }
                });
            } elseif (!cancel_publication($p['id'], is_platform($body['platform'] ?? null) ? $body['platform'] : null)) {
                throw new HttpError('Rien à annuler pour cette publication.', 409);
            } else {
                // Les autres plateformes sont peut-être en ligne : annonce groupée sur Discord.
                discord_notify_safe($p['id'], null);
            }
            json_out(with_media(get_post($p['id'])));
        } elseif (route_match('/posts/{id}/duplicate', $route, $p) && $method === 'POST') {
            json_out(duplicate_post($p['id']));
        } elseif (route_match('/posts/{id}', $route, $p)) {
            if ($isGet) {
                $post = get_post($p['id']);
                if (!$post) throw new HttpError('Publication introuvable.', 404);
                json_out(with_media($post));
            } elseif ($method === 'PUT') {
                json_out(save_post($p['id'], request_json()));
            } elseif ($method === 'DELETE') {
                cancel_publication($p['id'], null);
                delete_post($p['id']);
                json_out(['ok' => true]);
            } else throw new HttpError('Méthode non autorisée', 405);
        } elseif ($route === '/analytics' && $isGet) {
            $range = (int) ($_GET['range'] ?? 28);
            json_out(analytics_summary(in_array($range, [7, 28, 90, 365], true) ? $range : 28));
        } elseif ($route === '/twitch-channel') {
            if ($isGet) json_out(twitch_channel_info());
            elseif ($method === 'DELETE') { twitch_channel_disconnect(); json_out(['ok' => true]); }
            elseif ($method === 'POST') { twitch_channel_sync(); json_out(twitch_channel_info()); }
            else throw new HttpError('Méthode non autorisée', 405);
        } elseif (route_match('/analytics/audience/{platform}', $route, $p)) {
            if (!is_platform($p['platform'])) throw new HttpError('Plateforme inconnue.', 404);
            if ($method === 'PUT') json_out(save_manual_audience($p['platform'], request_json()));
            elseif ($method === 'DELETE') { clear_audience($p['platform']); json_out(['ok' => true]); }
            else throw new HttpError('Méthode non autorisée', 405);
        } elseif ($route === '/analytics/sync' && $method === 'POST') {
            json_out(['reports' => sync_analytics()]);
        } elseif ($route === '/revenue/export' && $isGet) {
            $kick = false;
            $from = preg_match('/^\d{4}-\d{2}-\d{2}$/', $_GET['from'] ?? '') ? $_GET['from'] : null;
            $to = preg_match('/^\d{4}-\d{2}-\d{2}$/', $_GET['to'] ?? '') ? $_GET['to'] : null;
            $summary = revenue_summary($from, $to);
            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename="revenus_' . $summary['from'] . '_' . $summary['to'] . '.csv"');
            echo revenue_csv($summary['entries']);
        } elseif ($route === '/revenue') {
            if ($isGet) {
                $from = preg_match('/^\d{4}-\d{2}-\d{2}$/', $_GET['from'] ?? '') ? $_GET['from'] : null;
                $to = preg_match('/^\d{4}-\d{2}-\d{2}$/', $_GET['to'] ?? '') ? $_GET['to'] : null;
                json_out(revenue_summary($from, $to));
            } elseif ($method === 'POST') json_out(create_revenue(request_json()), 201);
            else throw new HttpError('Méthode non autorisée', 405);
        } elseif (route_match('/revenue/{id}', $route, $p)) {
            if ($method === 'PUT') json_out(update_revenue($p['id'], request_json()));
            elseif ($method === 'DELETE') { delete_revenue($p['id']); json_out(['ok' => true]); }
            else throw new HttpError('Méthode non autorisée', 405);
        } elseif ($route === '/discord/webhooks') {
            if ($isGet) json_out(list_discord_webhooks());
            elseif ($method === 'POST') json_out(create_discord_webhook(request_json()), 201);
            else throw new HttpError('Méthode non autorisée', 405);
        } elseif (route_match('/discord/webhooks/{id}/test', $route, $p) && $method === 'POST') {
            $kick = false;
            test_discord_webhook($p['id']);
            json_out(['ok' => true]);
        } elseif (route_match('/discord/webhooks/{id}', $route, $p)) {
            if ($method === 'PUT') json_out(update_discord_webhook($p['id'], request_json()));
            elseif ($method === 'DELETE') { delete_discord_webhook($p['id']); json_out(['ok' => true]); }
            else throw new HttpError('Méthode non autorisée', 405);
        } elseif ($route === '/dashboard' && $isGet) {
            json_out(dashboard_data());
        } else {
            throw new HttpError('Route inconnue : ' . $route, 404);
        }
    }
} catch (HttpError $e) {
    $kick = false;
    json_out(['error' => $e->getMessage()] + $e->extra, $e->status);
} catch (PlatformError $e) {
    $kick = false;
    json_out(['error' => $e->getMessage()], 502);
} catch (Throwable $e) {
    $kick = false;
    error_log('[VideoPosting] ' . $e);
    json_out(['error' => 'Erreur serveur : ' . $e->getMessage()], 500);
}

// Après la réponse : on fait avancer les publications en cours (sans faire attendre le navigateur).
if ($kick && !empty($GLOBALS['VP_SPACE']) && (!empty($GLOBALS['VP_KICK']) || has_pending_work())) {
    finish_request();
    worker_run(25, [$GLOBALS['VP_SPACE']]);
}
