<?php
/**
 * Annonces Discord : quand une publication est en ligne, ses liens sont envoyés dans un salon via un webhook.
 * Même comportement que src/lib/discord.ts et src/lib/server/discord.ts (version Node.js).
 */

const DISCORD_WEBHOOK_RE = '#^https://(?:(?:ptb|canary)\.)?discord(?:app)?\.com/api(?:/v\d+)?/webhooks/(\d{5,25})/([\w-]{20,120})/?$#';
const DISCORD_DEFAULT_MESSAGE = "🎬 **{titre}** est en ligne !\n{liens}";
const DISCORD_EMOJI = ['tiktok' => '🎵', 'youtube' => '▶️', 'instagram' => '📸'];
const DISCORD_COLORS = ['tiktok' => 0x25F4EE, 'youtube' => 0xFF0033, 'instagram' => 0xE1306C];
const DISCORD_MAX_HOOKS = 20;

/** Seules les adresses de webhook Discord sont acceptées (aucune requête vers un autre serveur). */
function is_discord_webhook_url($url): bool
{
    return is_string($url) && preg_match(DISCORD_WEBHOOK_RE, trim($url)) === 1;
}

function discord_url_hint(string $url): string
{
    if (!preg_match(DISCORD_WEBHOOK_RE, trim($url), $m)) return 'Adresse invalide';
    return 'discord.com/api/webhooks/' . substr($m[1], 0, 4) . '…' . substr($m[1], -4) . '/••••••';
}

function discord_truncate(string $text, int $max): string
{
    return mb_strlen($text) <= $max ? $text : mb_substr($text, 0, $max - 1) . '…';
}

function discord_join_names(array $names): string
{
    if (count($names) <= 1) return $names[0] ?? '';
    return implode(', ', array_slice($names, 0, -1)) . ' et ' . $names[count($names) - 1];
}

/** $ctx : title, description, kind, links [[platform, url]], thumbnailUrl?, timestamp? */
function discord_render_template(string $template, array $ctx, string $style): string
{
    // En style « carte », les liens du texte sont entre chevrons : Discord n'ajoute pas d'aperçu en double.
    $wrap = fn(string $url) => $style === 'card' ? "<$url>" : $url;
    $lines = array_map(fn($l) => DISCORD_EMOJI[$l['platform']] . ' ' . PLATFORM_NAMES[$l['platform']] . ' : ' . $wrap($l['url']), $ctx['links']);
    $vars = [
        '{titre}' => $ctx['title'] !== '' ? $ctx['title'] : 'Nouvelle publication',
        '{description}' => $ctx['description'],
        '{liens}' => implode("\n", $lines),
        '{plateformes}' => discord_join_names(array_map(fn($l) => PLATFORM_NAMES[$l['platform']], $ctx['links'])),
        '{lien}' => $ctx['links'] ? $wrap($ctx['links'][0]['url']) : '',
        '{type}' => $ctx['kind'] === 'photo' ? 'photos' : 'vidéo',
    ];
    return trim(preg_replace_callback('/\{(titre|description|liens|plateformes|lien|type)\}/', fn($m) => $vars[$m[0]], $template));
}

/** Corps de la requête envoyée au webhook Discord. */
function discord_payload(array $hook, array $ctx): array
{
    $mention = match ($hook['mention']) {
        'everyone' => '@everyone ',
        'here' => '@here ',
        'role' => !empty($hook['roleId']) ? '<@&' . $hook['roleId'] . '> ' : '',
        default => '',
    };
    $template = trim($hook['message'] ?? '') !== '' ? $hook['message'] : DISCORD_DEFAULT_MESSAGE;
    $allowed = in_array($hook['mention'], ['everyone', 'here'], true) ? ['parse' => ['everyone']]
        : ($hook['mention'] === 'role' && !empty($hook['roleId']) ? ['parse' => [], 'roles' => [$hook['roleId']]] : ['parse' => []]);
    $payload = [
        'username' => trim($hook['username'] ?? '') !== '' ? trim($hook['username']) : VP_APP_NAME,
        'content' => discord_truncate($mention . discord_render_template($template, $ctx, $hook['style']), 2000),
        'allowed_mentions' => $allowed,
    ];
    if ($hook['style'] === 'card' && $ctx['links']) {
        $single = count($ctx['links']) === 1 ? $ctx['links'][0]['platform'] : null;
        $embed = [
            'title' => discord_truncate($ctx['title'] !== '' ? $ctx['title'] : 'Nouvelle publication', 256),
            'url' => $ctx['links'][0]['url'],
            'color' => $single ? DISCORD_COLORS[$single] : 0x7C3AED,
            'fields' => array_map(fn($l) => [
                'name' => DISCORD_EMOJI[$l['platform']] . ' ' . PLATFORM_NAMES[$l['platform']],
                'value' => '[' . ($ctx['kind'] === 'photo' ? 'Voir les photos' : 'Regarder') . '](' . $l['url'] . ')',
                'inline' => true,
            ], $ctx['links']),
            'footer' => ['text' => 'Publié avec ' . VP_APP_NAME],
        ];
        if ($ctx['description'] !== '') $embed['description'] = discord_truncate($ctx['description'], 350);
        if (!empty($ctx['thumbnailUrl'])) $embed['thumbnail'] = ['url' => $ctx['thumbnailUrl']];
        if (!empty($ctx['timestamp'])) $embed['timestamp'] = $ctx['timestamp'];
        $payload['embeds'] = [$embed];
    }
    return $payload;
}

// Webhooks enregistrés (propres à chaque espace) -------------------------------------------------

function discord_hooks(): array
{
    return array_values(db_read()['settings']['discord']['webhooks'] ?? []);
}

/** Version envoyée au navigateur : l'adresse est masquée (elle permet de publier dans le salon). */
function public_discord_webhook(array $h): array
{
    $url = $h['url'];
    unset($h['url']);
    $h['urlHint'] = discord_url_hint($url);
    return $h;
}

function list_discord_webhooks(): array
{
    return array_map('public_discord_webhook', discord_hooks());
}

function sanitize_discord_webhook(array $in): array
{
    $name = trim(str_limit($in['name'] ?? '', 80));
    if ($name === '') throw new HttpError('Donnez un nom à ce webhook.', 422);
    $platforms = array_values(array_unique(array_filter((array) ($in['platforms'] ?? []), 'is_platform')));
    if (!$platforms) throw new HttpError('Choisissez au moins une plateforme.', 422);
    $mention = in_array($in['mention'] ?? '', ['none', 'everyone', 'here', 'role'], true) ? $in['mention'] : 'none';
    $roleId = is_string($in['roleId'] ?? null) && preg_match('/^\d{5,25}$/', $in['roleId']) ? $in['roleId'] : null;
    if ($mention === 'role' && !$roleId) throw new HttpError('Identifiant de rôle Discord invalide (chiffres uniquement).', 422);
    $h = [
        'name' => $name,
        'platforms' => $platforms,
        'timing' => ($in['timing'] ?? '') === 'grouped' ? 'grouped' : 'each',
        'style' => ($in['style'] ?? '') === 'card' ? 'card' : 'links',
        'message' => str_limit($in['message'] ?? '', 1500),
        'mention' => $mention,
        'enabled' => bool_val($in['enabled'] ?? null, true),
    ];
    if ($mention === 'role') $h['roleId'] = $roleId;
    $username = trim(str_limit($in['username'] ?? '', 80));
    if ($username !== '') $h['username'] = $username;
    return $h;
}

function create_discord_webhook(array $in): array
{
    $url = trim((string) ($in['url'] ?? ''));
    if (!is_discord_webhook_url($url)) throw new HttpError('Adresse de webhook Discord invalide (Paramètres du salon → Intégrations → Webhooks → Copier l\'URL).', 422);
    $clean = sanitize_discord_webhook($in);
    $hook = db_update(function (array &$d) use ($clean, $url) {
        $list = $d['settings']['discord']['webhooks'] ?? [];
        if (count($list) >= DISCORD_MAX_HOOKS) throw new HttpError(DISCORD_MAX_HOOKS . ' webhooks maximum.', 422);
        $hook = ['id' => uuid4(), 'url' => $url, 'createdAt' => now_ms()] + $clean;
        $list[] = $hook;
        $d['settings']['discord'] = ['webhooks' => array_values($list)];
        return $hook;
    });
    return public_discord_webhook($hook);
}

function update_discord_webhook(string $id, array $in): array
{
    $url = trim((string) ($in['url'] ?? ''));
    if ($url !== '' && !is_discord_webhook_url($url)) throw new HttpError('Adresse de webhook Discord invalide.', 422);
    $clean = sanitize_discord_webhook($in);
    $hook = db_update(function (array &$d) use ($id, $clean, $url) {
        foreach ($d['settings']['discord']['webhooks'] ?? [] as $i => $h) {
            if ($h['id'] !== $id) continue;
            $next = ['id' => $h['id'], 'url' => $url !== '' ? $url : $h['url'], 'createdAt' => $h['createdAt']] + $clean;
            if (isset($h['lastResult'])) $next['lastResult'] = $h['lastResult'];
            $d['settings']['discord']['webhooks'][$i] = $next;
            return $next;
        }
        return null;
    });
    if (!$hook) throw new HttpError('Webhook introuvable.', 404);
    return public_discord_webhook($hook);
}

function delete_discord_webhook(string $id): void
{
    db_update(function (array &$d) use ($id) {
        if (!isset($d['settings']['discord']['webhooks'])) return;
        $d['settings']['discord']['webhooks'] = array_values(array_filter($d['settings']['discord']['webhooks'], fn($h) => $h['id'] !== $id));
    });
}

/** Envoie un message au webhook (une nouvelle tentative si Discord demande de patienter). */
function discord_send(string $url, array $payload): void
{
    $body = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    for ($attempt = 0; $attempt < 2; $attempt++) {
        [$status, , $res] = http_request('POST', rtrim($url, '/') . '?wait=true', ['Content-Type' => 'application/json'], $body, ['timeout' => 15]);
        if ($status >= 200 && $status < 300) return;
        if ($status === 429 && $attempt === 0) {
            usleep((int) (min(5, max(0.2, (float) ($res['retry_after'] ?? 1))) * 1000000));
            continue;
        }
        if ($status === 0) throw new PlatformError($res['error']['message'] ?? 'Discord est injoignable.');
        if ($status === 401 || $status === 404) throw new PlatformError('Webhook Discord invalide ou supprimé.');
        $detail = is_array($res) && !empty($res['message']) ? ' : ' . $res['message'] : '';
        throw new PlatformError("Discord a refusé le message ($status$detail).");
    }
}

function discord_set_result(string $id, bool $ok, ?string $error = null): void
{
    db_update(function (array &$d) use ($id, $ok, $error) {
        foreach ($d['settings']['discord']['webhooks'] ?? [] as $i => $h) {
            if ($h['id'] !== $id) continue;
            $d['settings']['discord']['webhooks'][$i]['lastResult'] = array_filter(['at' => now_ms(), 'ok' => $ok, 'error' => $error], fn($v) => $v !== null);
        }
    });
}

/** Message de test : liens d'exemple vers les plateformes choisies. */
function test_discord_webhook(string $id): void
{
    $hook = null;
    foreach (discord_hooks() as $h) if ($h['id'] === $id) $hook = $h;
    if (!$hook) throw new HttpError('Webhook introuvable.', 404);
    $examples = ['tiktok' => 'https://www.tiktok.com/', 'youtube' => 'https://www.youtube.com/', 'instagram' => 'https://www.instagram.com/'];
    $payload = discord_payload($hook, [
        'title' => 'Message de test ' . VP_APP_NAME,
        'description' => 'Si vous lisez ceci, les annonces de vos publications arriveront dans ce salon.',
        'kind' => 'video',
        'links' => array_map(fn($p) => ['platform' => $p, 'url' => $examples[$p]], $hook['platforms']),
        'timestamp' => gmdate('Y-m-d\TH:i:s.v\Z'),
    ]);
    try {
        discord_send($hook['url'], $payload);
        discord_set_result($id, true);
    } catch (PlatformError $e) {
        discord_set_result($id, false, $e->getMessage());
        throw new HttpError($e->getMessage(), 502);
    }
}

/** Ajoute une ligne au journal des plateformes annoncées (même une fois la publication terminée). */
function discord_log(string $postId, array $platforms, string $level, string $message): void
{
    db_update(function (array &$d) use ($postId, $platforms, $level, $message) {
        foreach ($d['posts'] as &$p) {
            if ($p['id'] !== $postId) continue;
            foreach ($platforms as $pl) {
                if (!isset($p['publications'][$pl])) continue;
                $p['publications'][$pl]['logs'][] = ['at' => now_ms(), 'level' => $level, 'message' => $message];
                $p['publications'][$pl]['logs'] = array_slice($p['publications'][$pl]['logs'], -MAX_LOGS);
            }
        }
    });
}

function discord_thumbnail(array $post): ?string
{
    $yt = $post['publications']['youtube'] ?? null;
    if ($yt && $yt['status'] === 'published' && !empty($yt['externalId']) && empty($yt['demo'])) return 'https://i.ytimg.com/vi/' . rawurlencode($yt['externalId']) . '/hqdefault.jpg';
    $id = ($post['kind'] ?? 'video') === 'photo' ? ($post['imageIds'][0] ?? null) : (!empty($post['mediaId']) ? (get_media($post['mediaId'])['posterId'] ?? null) : null);
    if (!$id) return null;
    $url = signed_media_url($id, 30 * 86400);
    return str_starts_with($url, 'https://') && !preg_match('#^https://(localhost|127\.|10\.|192\.168\.)#', $url) ? $url : null;
}

/**
 * Après chaque fin de publication sur une plateforme : annonce les liens en ligne aux webhooks concernés.
 * « each » : la plateforme qui vient d'être publiée · « grouped » : tous les liens, une fois la publication terminée.
 */
function discord_notify(string $postId, ?string $platform): void
{
    $post = get_post($postId);
    if (!$post) return;
    $selected = array_key_exists('discordWebhookIds', $post) && is_array($post['discordWebhookIds']) ? $post['discordWebhookIds'] : null;
    $targets = array_filter(discord_hooks(), fn($h) => !empty($h['enabled']) && ($selected === null || in_array($h['id'], $selected, true)));
    if (!$targets) return;
    $finished = !worker_is_active($post);

    foreach ($targets as $hook) {
        // Sélection et réservation atomiques : deux fins de publication simultanées n'envoient pas deux fois.
        $toSend = db_update(function (array &$d) use ($postId, $platform, $hook, $finished) {
            foreach ($d['posts'] as &$p) {
                if ($p['id'] !== $postId) continue;
                $sent = $p['discord']['sent'][$hook['id']] ?? [];
                $ready = array_values(array_filter($p['platforms'], function ($pl) use ($p, $hook, $sent) {
                    $pub = $p['publications'][$pl] ?? null;
                    return in_array($pl, $hook['platforms'], true) && $pub && $pub['status'] === 'published'
                        && !empty($pub['url']) && empty($pub['demo']) && !in_array($pl, $sent, true);
                }));
                $list = $hook['timing'] === 'each' ? array_values(array_filter($ready, fn($pl) => $pl === $platform)) : ($finished ? $ready : []);
                if ($list) $p['discord']['sent'][$hook['id']] = array_values(array_merge($sent, $list));
                return $list;
            }
            return [];
        });
        if (!$toSend) continue;

        $fresh = get_post($postId);
        $ctx = [
            'title' => (string) (trim($fresh['common']['title'] ?? '') !== '' ? $fresh['common']['title'] : ($fresh['options']['youtube']['title'] ?? '')),
            'description' => (string) ($fresh['common']['description'] ?? ''),
            'kind' => ($fresh['kind'] ?? 'video') === 'photo' ? 'photo' : 'video',
            'links' => array_map(fn($pl) => ['platform' => $pl, 'url' => $fresh['publications'][$pl]['url']], $toSend),
            'thumbnailUrl' => $hook['style'] === 'card' ? discord_thumbnail($fresh) : null,
            'timestamp' => gmdate('Y-m-d\TH:i:s.v\Z'),
        ];
        try {
            discord_send($hook['url'], discord_payload($hook, $ctx));
            discord_set_result($hook['id'], true);
            discord_log($postId, $toSend, 'info', 'Annonce Discord envoyée dans « ' . $hook['name'] . ' »');
        } catch (Throwable $e) {
            $message = $e instanceof PlatformError ? $e->getMessage() : 'Erreur inattendue : ' . $e->getMessage();
            discord_set_result($hook['id'], false, $message);
            discord_log($postId, $toSend, 'warn', 'Discord (« ' . $hook['name'] . ' ») : ' . $message);
            // Échec : la plateforme pourra être annoncée lors d'une prochaine tentative.
            db_update(function (array &$d) use ($postId, $hook, $toSend) {
                foreach ($d['posts'] as &$p) {
                    if ($p['id'] !== $postId || !isset($p['discord']['sent'][$hook['id']])) continue;
                    $p['discord']['sent'][$hook['id']] = array_values(array_diff($p['discord']['sent'][$hook['id']], $toSend));
                }
            });
        }
    }
}

/** Les annonces ne doivent jamais faire échouer une publication. */
function discord_notify_safe(string $postId, ?string $platform): void
{
    try {
        discord_notify($postId, $platform);
    } catch (Throwable $e) {
        error_log('[' . VP_APP_NAME . '] discord ' . $e->getMessage());
    }
}
