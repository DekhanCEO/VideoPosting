<?php

/** Nettoie les données envoyées par l'interface (types, longueurs, valeurs autorisées). */
function sanitize_post_input(array $in): array
{
    $defaults = default_options(db_read()['settings']['defaults']);
    $o = $in['options'] ?? [];
    $yt = $o['youtube'] ?? [];
    $tt = $o['tiktok'] ?? [];
    $ig = $o['instagram'] ?? [];
    $dy = $defaults['youtube'];
    $dt = $defaults['tiktok'];
    $di = $defaults['instagram'];
    $platforms = array_values(array_unique(array_filter((array) ($in['platforms'] ?? []), 'is_platform')));
    $scheduledAt = isset($in['scheduledAt']) && is_numeric($in['scheduledAt']) && $in['scheduledAt'] > 0 ? (int) $in['scheduledAt'] : null;

    return [
        'mediaId' => is_uuid($in['mediaId'] ?? null) ? $in['mediaId'] : null,
        'common' => [
            'title' => str_limit($in['common']['title'] ?? '', 500),
            'description' => str_limit($in['common']['description'] ?? '', 10000),
            'hashtags' => string_list($in['common']['hashtags'] ?? [], 100, 100),
        ],
        'platforms' => $platforms,
        'options' => [
            'youtube' => [
                'title' => str_limit($yt['title'] ?? '', 500),
                'description' => str_limit($yt['description'] ?? '', 10000),
                'tags' => string_list($yt['tags'] ?? [], 100, 100),
                'sync' => [
                    'title' => bool_val($yt['sync']['title'] ?? null, true),
                    'description' => bool_val($yt['sync']['description'] ?? null, true),
                    'tags' => bool_val($yt['sync']['tags'] ?? null, true),
                ],
                'categoryId' => str_limit($yt['categoryId'] ?? $dy['categoryId'], 4),
                'privacy' => in_array($yt['privacy'] ?? '', ['public', 'unlisted', 'private'], true) ? $yt['privacy'] : $dy['privacy'],
                'madeForKids' => bool_val($yt['madeForKids'] ?? null, false),
                'notifySubscribers' => bool_val($yt['notifySubscribers'] ?? null, true),
                'embeddable' => bool_val($yt['embeddable'] ?? null, true),
                'license' => ($yt['license'] ?? '') === 'creativeCommon' ? 'creativeCommon' : 'youtube',
                'containsSyntheticMedia' => bool_val($yt['containsSyntheticMedia'] ?? null, false),
                'defaultLanguage' => str_limit($yt['defaultLanguage'] ?? $dy['defaultLanguage'], 10),
                'thumbnailId' => is_uuid($yt['thumbnailId'] ?? null) ? $yt['thumbnailId'] : null,
            ],
            'tiktok' => [
                'caption' => str_limit($tt['caption'] ?? '', 5000),
                'sync' => ['caption' => bool_val($tt['sync']['caption'] ?? null, true)],
                'mode' => ($tt['mode'] ?? '') === 'inbox' ? 'inbox' : 'direct',
                'privacyLevel' => in_array($tt['privacyLevel'] ?? '', ['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'FOLLOWER_OF_CREATOR', 'SELF_ONLY'], true) ? $tt['privacyLevel'] : '',
                'allowComments' => bool_val($tt['allowComments'] ?? null, $dt['allowComments']),
                'allowDuet' => bool_val($tt['allowDuet'] ?? null, $dt['allowDuet']),
                'allowStitch' => bool_val($tt['allowStitch'] ?? null, $dt['allowStitch']),
                'coverTimestampMs' => (int) num_val($tt['coverTimestampMs'] ?? 0, 0, 86400000),
                'commercialContent' => bool_val($tt['commercialContent'] ?? null),
                'yourBrand' => bool_val($tt['yourBrand'] ?? null),
                'brandedContent' => bool_val($tt['brandedContent'] ?? null),
                'isAigc' => bool_val($tt['isAigc'] ?? null),
            ],
            'instagram' => [
                'caption' => str_limit($ig['caption'] ?? '', 5000),
                'sync' => ['caption' => bool_val($ig['sync']['caption'] ?? null, true)],
                'shareToFeed' => bool_val($ig['shareToFeed'] ?? null, $di['shareToFeed']),
                'thumbOffsetMs' => (int) num_val($ig['thumbOffsetMs'] ?? 0, 0, 86400000),
                'collaborators' => string_list($ig['collaborators'] ?? [], 10, 60),
                'audioName' => str_limit($ig['audioName'] ?? '', 200),
                'locationId' => preg_replace('/\D/', '', str_limit($ig['locationId'] ?? '', 50)),
            ],
        ],
        'scheduledAt' => $scheduledAt,
    ];
}

/** Vérifications essentielles avant programmation / publication (l'interface fait le contrôle détaillé). */
function validate_for_publish(array $input, bool $schedule): void
{
    if (!$input['mediaId']) throw new HttpError('Ajoutez une vidéo à publier.', 422);
    $media = get_media($input['mediaId']);
    if (!$media) throw new HttpError('La vidéo est introuvable, ajoutez-la à nouveau.', 422);
    if ($media['status'] !== 'ready') throw new HttpError('La vidéo est encore en cours d\'envoi.', 422);
    if (!$input['platforms']) throw new HttpError('Sélectionnez au moins une plateforme.', 422);
    if ($schedule && (!$input['scheduledAt'] || $input['scheduledAt'] < now_ms() - 60000)) throw new HttpError('La date de programmation est déjà passée.', 422);
    $accounts = [];
    foreach (list_accounts() as $a) $accounts[$a['platform']] = public_account($a);
    $opts = resolve_options($input['common'], $input['options']);
    foreach ($input['platforms'] as $p) {
        if (empty($accounts[$p]) || $accounts[$p]['needsReconnect']) throw new HttpError('Connectez votre compte ' . PLATFORM_NAMES[$p] . ' pour publier.', 422);
        if ($p === 'youtube' && trim($opts['youtube']['title']) === '') throw new HttpError('Le titre YouTube est obligatoire.', 422);
        if ($p === 'tiktok' && $opts['tiktok']['mode'] === 'direct' && !$opts['tiktok']['privacyLevel']) throw new HttpError('Choisissez qui peut voir la vidéo TikTok.', 422);
    }
}

function save_post(?string $id, array $body): array
{
    $input = sanitize_post_input($body['input'] ?? []);
    $action = in_array($body['action'] ?? '', ['draft', 'schedule', 'publish'], true) ? $body['action'] : 'draft';
    if ($action === 'schedule' && !$input['scheduledAt']) throw new HttpError('Choisissez une date de programmation.', 422);
    if ($action !== 'draft') validate_for_publish($input, $action === 'schedule');
    if ($action === 'publish') $input['scheduledAt'] = $input['scheduledAt'] ?? null;
    $status = $action === 'draft' ? 'draft' : ($action === 'schedule' ? 'scheduled' : 'publishing');

    $old = $id ? get_post($id) : null;
    if ($id && !$old) throw new HttpError('Publication introuvable.', 404);
    if ($old && $old['status'] === 'publishing' && worker_is_active($old)) throw new HttpError('Publication en cours : modification impossible.', 409);

    $post = db_update(function (array &$d) use ($id, $input, $status) {
        $now = now_ms();
        if ($id) {
            foreach ($d['posts'] as &$p) {
                if ($p['id'] !== $id) continue;
                $p = array_replace($p, $input, ['status' => $status, 'updatedAt' => $now]);
                return $p;
            }
        }
        $p = array_replace($input, ['id' => uuid4(), 'status' => $status, 'publications' => [], 'createdAt' => $now, 'updatedAt' => $now]);
        $d['posts'][] = $p;
        return $p;
    });

    if ($old) {
        if (($old['mediaId'] ?? null) && $old['mediaId'] !== $input['mediaId']) delete_media_if_unused($old['mediaId']);
        $oldThumb = $old['options']['youtube']['thumbnailId'] ?? null;
        if ($oldThumb && $oldThumb !== $input['options']['youtube']['thumbnailId']) delete_media_if_unused($oldThumb);
    }
    if ($action === 'publish') start_publishing($post['id']);
    return with_media(get_post($post['id']));
}

function delete_post(string $id): void
{
    $post = get_post($id);
    if (!$post) return;
    db_update(function (array &$d) use ($id) {
        $d['posts'] = array_values(array_filter($d['posts'], fn($p) => $p['id'] !== $id));
    });
    delete_media_if_unused($post['mediaId'] ?? null);
    delete_media_if_unused($post['options']['youtube']['thumbnailId'] ?? null);
}

function duplicate_post(string $id): array
{
    $post = get_post($id);
    if (!$post) throw new HttpError('Publication introuvable.', 404);
    $copy = db_update(function (array &$d) use ($post) {
        $now = now_ms();
        $p = [
            'id' => uuid4(), 'status' => 'draft', 'mediaId' => $post['mediaId'] ?? null,
            'common' => $post['common'], 'platforms' => $post['platforms'], 'options' => $post['options'],
            'scheduledAt' => null, 'publications' => [], 'createdAt' => $now, 'updatedAt' => $now,
        ];
        $d['posts'][] = $p;
        return $p;
    });
    return with_media($copy);
}

function list_posts(): array
{
    $posts = db_read()['posts'];
    usort($posts, fn($a, $b) => ($b['scheduledAt'] ?? $b['publishedAt'] ?? $b['updatedAt']) <=> ($a['scheduledAt'] ?? $a['publishedAt'] ?? $a['updatedAt']));
    return $posts;
}

/** Publication renvoyée à l'interface : vidéo jointe, métriques, sans l'état interne des tâches. */
function with_media(array $post): array
{
    $post['media'] = !empty($post['mediaId']) ? get_media($post['mediaId']) : null;
    $pubs = [];
    foreach ($post['publications'] ?? [] as $platform => $pub) {
        unset($pub['job']);
        $metrics = metrics_for($post, $platform);
        if ($metrics) $pub['metrics'] = $metrics;
        $pubs[$platform] = $pub;
    }
    $post['publications'] = $pubs ?: new stdClass();
    return $post;
}
