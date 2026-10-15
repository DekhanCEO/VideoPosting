<?php

const TT_API = 'https://open.tiktokapis.com/v2';
const TT_SCOPES = 'user.info.basic,user.info.profile,user.info.stats,video.list,video.publish,video.upload';
const TT_ERRORS = [
    'spam_risk_too_many_posts' => 'Limite quotidienne de publications TikTok atteinte pour ce compte.',
    'spam_risk_too_many_pending_share' => 'Trop de vidéos en attente dans la boîte de réception TikTok.',
    'spam_risk_user_banned_from_posting' => 'Ce compte TikTok n\'est temporairement pas autorisé à publier.',
    'reached_active_user_cap' => 'Quota quotidien de l\'application TikTok atteint.',
    'unaudited_client_can_only_post_to_private_accounts' => 'Application TikTok pas encore auditée : TikTok n\'accepte que les publications privées (« Moi uniquement », avec un compte TikTok en privé). Demandez l\'audit Direct Post dans TikTok for Developers pour publier en public (voir Paramètres → API TikTok).',
    'privacy_level_option_mismatch' => 'Ce niveau de confidentialité n\'est pas disponible pour ce compte TikTok.',
    'access_token_invalid' => 'Session TikTok expirée : reconnectez le compte.',
    'scope_not_authorized' => 'Autorisation TikTok manquante : reconnectez le compte en acceptant toutes les permissions.',
    'scope_permission_missed' => 'Autorisation TikTok manquante : reconnectez le compte en acceptant toutes les permissions.',
    'rate_limit_exceeded' => 'Trop de requêtes vers TikTok, réessayez dans une minute.',
    'file_format_check_failed' => 'Format de vidéo refusé par TikTok.',
    'duration_check_failed' => 'Durée de vidéo refusée par TikTok.',
    'frame_rate_check_failed' => 'Fréquence d\'images refusée par TikTok.',
    'picture_size_check_failed' => 'Résolution refusée par TikTok (minimum 360 px).',
    'video_pull_failed' => 'TikTok n\'a pas pu récupérer la vidéo.',
    'publish_cancelled' => 'Publication annulée côté TikTok.',
    'auth_removed' => 'L\'accès de l\'application a été révoqué dans TikTok : reconnectez le compte.',
];

function tiktok_api(string $path, array $account, $body = null): array
{
    [$status, , $data] = http_request($body === null ? 'GET' : 'POST', TT_API . $path, [
        'Authorization' => 'Bearer ' . $account['accessToken'],
        'Content-Type' => 'application/json; charset=UTF-8',
    ], $body === null ? null : json_encode($body ?: new stdClass, JSON_UNESCAPED_UNICODE));
    $code = is_array($data) ? ($data['error']['code'] ?? null) : null;
    if ($status < 200 || $status >= 300 || ($code && $code !== 'ok')) {
        $msg = ($code && isset(TT_ERRORS[$code])) ? TT_ERRORS[$code] : (is_array($data) ? ($data['error']['message'] ?? null) : null);
        throw new PlatformError($msg ?: "Erreur TikTok ($status)", $data, $status);
    }
    return is_array($data) ? ($data['data'] ?? []) : [];
}

function tiktok_token(array $params): array
{
    [$status, , $data] = http_request('POST', TT_API . '/oauth/token/', ['Content-Type' => 'application/x-www-form-urlencoded', 'Cache-Control' => 'no-cache'], $params);
    if ($status < 200 || $status >= 300 || empty($data['access_token'])) {
        throw new PlatformError((is_array($data) ? ($data['error_description'] ?? $data['error'] ?? null) : null) ?: 'Échec de l\'authentification TikTok.', $data, $status);
    }
    return $data;
}

function tiktok_creator_info(array $account): array
{
    $d = tiktok_api('/post/publish/creator_info/query/', $account, []);
    return [
        'creatorAvatarUrl' => $d['creator_avatar_url'] ?? null,
        'creatorUsername' => $d['creator_username'] ?? null,
        'creatorNickname' => $d['creator_nickname'] ?? null,
        'privacyLevelOptions' => $d['privacy_level_options'] ?? [],
        'commentDisabled' => (bool) ($d['comment_disabled'] ?? false),
        'duetDisabled' => (bool) ($d['duet_disabled'] ?? false),
        'stitchDisabled' => (bool) ($d['stitch_disabled'] ?? false),
        'maxVideoPostDurationSec' => (int) ($d['max_video_post_duration_sec'] ?? 600),
    ];
}

function demo_creator_info(): array
{
    return [
        'creatorNickname' => 'Léa Créations', 'creatorUsername' => 'lea.creations',
        'privacyLevelOptions' => ['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'FOLLOWER_OF_CREATOR', 'SELF_ONLY'],
        'commentDisabled' => false, 'duetDisabled' => false, 'stitchDisabled' => false, 'maxVideoPostDurationSec' => 600,
    ];
}

function tiktok_auth_url(string $state, array $c): string
{
    return 'https://www.tiktok.com/v2/auth/authorize/?' . http_build_query([
        'client_key' => $c['clientId'], 'scope' => TT_SCOPES, 'response_type' => 'code',
        'redirect_uri' => redirect_uri(), 'state' => $state,
    ]);
}

function tiktok_exchange(string $code, array $c): array
{
    $t = tiktok_token(['client_key' => $c['clientId'], 'client_secret' => $c['clientSecret'], 'code' => $code, 'grant_type' => 'authorization_code', 'redirect_uri' => redirect_uri()]);
    $scopes = isset($t['scope']) ? explode(',', $t['scope']) : [];
    $account = [
        'platform' => 'tiktok',
        'externalId' => $t['open_id'] ?? '',
        'name' => 'Compte TikTok',
        'accessToken' => $t['access_token'],
        'refreshToken' => $t['refresh_token'] ?? null,
        'expiresAt' => now_ms() + ((int) ($t['expires_in'] ?? 86400)) * 1000,
        'refreshExpiresAt' => isset($t['refresh_expires_in']) ? now_ms() + $t['refresh_expires_in'] * 1000 : null,
        'scopes' => $scopes,
    ];
    try {
        $info = tiktok_api('/user/info/?fields=open_id,avatar_url,display_name' . (in_array('user.info.profile', $scopes, true) ? ',username' : ''), $account);
        if (!empty($info['user']['display_name'])) $account['name'] = $info['user']['display_name'];
        $account['avatarUrl'] = $info['user']['avatar_url'] ?? null;
        $account['username'] = $info['user']['username'] ?? null;
    } catch (Throwable $e) {
    }
    if (empty($account['username'])) {
        try {
            $ci = tiktok_creator_info($account);
            $account['username'] = $ci['creatorUsername'];
            $account['avatarUrl'] ??= $ci['creatorAvatarUrl'];
            if ($ci['creatorNickname']) $account['name'] = $ci['creatorNickname'];
        } catch (Throwable $e) {
        }
    }
    return $account;
}

function tiktok_refresh(array $a, array $c): array
{
    if (empty($a['refreshToken'])) throw new PlatformError('Session TikTok expirée : reconnectez le compte.');
    $t = tiktok_token(['client_key' => $c['clientId'], 'client_secret' => $c['clientSecret'], 'grant_type' => 'refresh_token', 'refresh_token' => $a['refreshToken']]);
    return [
        'accessToken' => $t['access_token'],
        'refreshToken' => $t['refresh_token'] ?? $a['refreshToken'],
        'expiresAt' => now_ms() + ((int) ($t['expires_in'] ?? 86400)) * 1000,
        'refreshExpiresAt' => isset($t['refresh_expires_in']) ? now_ms() + $t['refresh_expires_in'] * 1000 : ($a['refreshExpiresAt'] ?? null),
    ];
}

/** Découpage imposé par TikTok : morceaux de 5 à 64 Mo, le dernier absorbe le reste. */
function tiktok_chunks(int $size): array
{
    $min = 5 * 1024 * 1024;
    if ($size <= $min) return ['chunkSize' => $size, 'count' => 1, 'ranges' => [[0, $size - 1]]];
    $chunk = min(10 * 1024 * 1024, $size);
    $count = max(1, intdiv($size, $chunk));
    $ranges = [];
    for ($i = 0; $i < $count; $i++) {
        $start = $i * $chunk;
        $ranges[] = [$start, $i === $count - 1 ? $size - 1 : $start + $chunk - 1];
    }
    return ['chunkSize' => $chunk, 'count' => $count, 'ranges' => $ranges];
}

function tiktok_step(array $ctx): array
{
    $job = $ctx['job'];
    $media = $ctx['media'];
    $account = $ctx['account'];
    $o = $ctx['options'];
    $direct = $o['mode'] === 'direct';

    switch ($job['state']) {
        case 'start':
            $creator = tiktok_creator_info($account);
            if (($ctx['kind'] ?? 'video') === 'photo') return tiktok_photo_start($ctx, $creator);
            if (!empty($media['duration']) && $media['duration'] > $creator['maxVideoPostDurationSec']) {
                throw new PlatformError('Vidéo trop longue pour ce compte TikTok (max ' . $creator['maxVideoPostDurationSec'] . ' s).');
            }
            if ($direct && (!$o['privacyLevel'] || !in_array($o['privacyLevel'], $creator['privacyLevelOptions'], true))) {
                throw new PlatformError('Le niveau de confidentialité choisi n\'est pas disponible pour ce compte TikTok.');
            }
            $plan = tiktok_chunks((int) $media['size']);
            $source = ['source' => 'FILE_UPLOAD', 'video_size' => (int) $media['size'], 'chunk_size' => $plan['chunkSize'], 'total_chunk_count' => $plan['count']];
            if ($direct) {
                $init = tiktok_api('/post/publish/video/init/', $account, [
                    'post_info' => [
                        'title' => $o['caption'],
                        'privacy_level' => $o['privacyLevel'],
                        'disable_comment' => $creator['commentDisabled'] || !$o['allowComments'],
                        'disable_duet' => $creator['duetDisabled'] || !$o['allowDuet'],
                        'disable_stitch' => $creator['stitchDisabled'] || !$o['allowStitch'],
                        'video_cover_timestamp_ms' => max(0, (int) round($o['coverTimestampMs'])),
                        'brand_content_toggle' => $o['commercialContent'] && $o['brandedContent'],
                        'brand_organic_toggle' => $o['commercialContent'] && $o['yourBrand'],
                        'is_aigc' => (bool) $o['isAigc'],
                    ],
                    'source_info' => $source,
                ]);
            } else {
                $init = tiktok_api('/post/publish/inbox/video/init/', $account, ['source_info' => $source]);
            }
            return ['job' => ['state' => 'upload', 'publishId' => $init['publish_id'], 'uploadUrl' => $init['upload_url'], 'ranges' => $plan['ranges'], 'index' => 0, 'failures' => 0], 'progress' => 5, 'step' => 'Envoi vers TikTok', 'log' => 'Publication TikTok initialisée (' . $init['publish_id'] . ')'];

        case 'upload':
            $ranges = $job['ranges'];
            $i = (int) $job['index'];
            [$start, $end] = $ranges[$i];
            $mime = $media['mimeType'] === 'video/x-m4v' ? 'video/mp4' : $media['mimeType'];
            [$status, , $body] = http_request('PUT', $job['uploadUrl'], [
                'Content-Type' => $mime,
                'Content-Range' => "bytes $start-$end/" . $media['size'],
            ], null, ['file' => [$ctx['file'], $start, $end - $start + 1], 'timeout' => 300]);
            if ($status === 403) throw new PlatformError('L\'URL d\'envoi TikTok a expiré (plus d\'une heure). Relancez la publication.');
            if ($status !== 200 && $status !== 201 && $status !== 206) {
                $failures = ($job['failures'] ?? 0) + 1;
                if ($failures > 3 || ($status >= 400 && $status < 500)) throw new PlatformError('Envoi du morceau ' . ($i + 1) . '/' . count($ranges) . " refusé par TikTok ($status).", $body, $status);
                return ['job' => array_replace($job, ['failures' => $failures]), 'delay' => 2 * $failures, 'log' => "Erreur d'envoi ($status), nouvelle tentative…", 'level' => 'warn'];
            }
            $i++;
            $progress = 5 + (int) round($i / count($ranges) * 80);
            if ($i >= count($ranges)) {
                return ['job' => ['state' => 'status', 'publishId' => $job['publishId'], 'startedAt' => now_ms()], 'progress' => 86, 'step' => 'TikTok traite la vidéo', 'delay' => 3];
            }
            return ['job' => array_replace($job, ['index' => $i, 'failures' => 0]), 'progress' => $progress, 'step' => 'Envoi vers TikTok (' . $i . '/' . count($ranges) . ')'];

        case 'status':
            $s = tiktok_api('/post/publish/status/fetch/', $account, ['publish_id' => $job['publishId']]);
            $username = $account['username'] ?? null;
            if (($s['status'] ?? '') === 'FAILED') {
                $reason = $s['fail_reason'] ?? '';
                throw new PlatformError(TT_ERRORS[$reason] ?? ('TikTok a refusé ' . (!empty($job['photo']) ? 'les photos' : 'la vidéo') . ' (' . ($reason ?: 'raison inconnue') . ').'), $s);
            }
            if (($s['status'] ?? '') === 'SEND_TO_USER_INBOX') {
                return ['done' => ['externalId' => $job['publishId'], 'url' => $username ? "https://www.tiktok.com/@$username" : null], 'log' => 'Vidéo envoyée dans la boîte de réception TikTok : ouvrez l\'application pour finaliser.'];
            }
            if (($s['status'] ?? '') === 'PUBLISH_COMPLETE') {
                $postId = $s['publicaly_available_post_id'][0] ?? null;
                $type = !empty($job['photo']) ? 'photo' : 'video';
                if ($postId && $username) return ['done' => ['externalId' => (string) $postId, 'url' => "https://www.tiktok.com/@$username/$type/$postId"]];
                return ['done' => ['externalId' => $postId ? (string) $postId : $job['publishId'], 'url' => $username ? "https://www.tiktok.com/@$username" : null]];
            }
            $elapsed = now_ms() - $job['startedAt'];
            if ($elapsed > 30 * 60000) throw new PlatformError('TikTok met trop de temps à traiter la vidéo. Vérifiez votre profil TikTok.');
            return ['job' => $job, 'progress' => min(98, 86 + (int) round($elapsed / 15000)), 'step' => !empty($job['photo']) ? 'TikTok traite les photos' : 'TikTok traite la vidéo', 'delay' => 4];
    }
    throw new PlatformError('État de publication inconnu.');
}

function tiktok_stats(array $a, array $externalIds): array
{
    $result = ['posts' => [], 'warnings' => []];
    $info = tiktok_api('/user/info/?fields=follower_count,likes_count,video_count', $a);
    if (!empty($info['user'])) {
        $result['snapshot'] = ['followers' => (int) ($info['user']['follower_count'] ?? 0), 'totalLikes' => (int) ($info['user']['likes_count'] ?? 0), 'videoCount' => (int) ($info['user']['video_count'] ?? 0)];
    }
    $ids = array_values(array_filter($externalIds, fn($id) => ctype_digit((string) $id)));
    foreach (array_chunk($ids, 20) as $chunk) {
        try {
            $data = tiktok_api('/video/query/?fields=id,view_count,like_count,comment_count,share_count', $a, ['filters' => ['video_ids' => $chunk]]);
            foreach ($data['videos'] ?? [] as $v) {
                $result['posts'][(string) $v['id']] = ['views' => (int) ($v['view_count'] ?? 0), 'likes' => (int) ($v['like_count'] ?? 0), 'comments' => (int) ($v['comment_count'] ?? 0), 'shares' => (int) ($v['share_count'] ?? 0)];
            }
        } catch (PlatformError $e) {
            $result['warnings'][] = 'Vidéos TikTok : ' . $e->getMessage();
            break;
        }
    }
    return $result;
}

/** Publication photo (1 à 35 images) : TikTok télécharge les images depuis l'hébergement (domaine vérifié). */
function tiktok_photo_start(array $ctx, array $creator): array
{
    $o = $ctx['options'];
    $direct = $o['mode'] === 'direct';
    if ($direct && (!$o['privacyLevel'] || !in_array($o['privacyLevel'], $creator['privacyLevelOptions'], true))) {
        throw new PlatformError('Le niveau de confidentialité choisi n\'est pas disponible pour ce compte TikTok.');
    }
    $urls = [];
    foreach ($ctx['images'] as $img) {
        $url = signed_media_url($img['id']);
        if (!str_starts_with($url, 'https://') && !vp_config('api_mock_base')) throw new PlatformError('TikTok exige une adresse HTTPS : activez le certificat SSL de votre hébergement.');
        $urls[] = $url;
    }
    // Titre court (90 caractères) + description : la légende sans le titre lorsqu'elle est synchronisée.
    $common = $ctx['post']['common'];
    $description = !empty($o['sync']['caption']) ? build_youtube_description($common) : $o['caption'];
    $info = ['title' => mb_substr(trim($common['title']), 0, 90), 'description' => mb_substr($description, 0, 4000)];
    if ($direct) {
        $info += [
            'privacy_level' => $o['privacyLevel'],
            'disable_comment' => $creator['commentDisabled'] || !$o['allowComments'],
            'auto_add_music' => (bool) ($o['autoAddMusic'] ?? true),
            'brand_content_toggle' => $o['commercialContent'] && $o['brandedContent'],
            'brand_organic_toggle' => $o['commercialContent'] && $o['yourBrand'],
        ];
    }
    $init = tiktok_api('/post/publish/content/init/', $ctx['account'], [
        'post_info' => $info,
        'source_info' => ['source' => 'PULL_FROM_URL', 'photo_cover_index' => 0, 'photo_images' => $urls],
        'post_mode' => $direct ? 'DIRECT_POST' : 'MEDIA_UPLOAD',
        'media_type' => 'PHOTO',
    ]);
    return ['job' => ['state' => 'status', 'publishId' => $init['publish_id'], 'startedAt' => now_ms(), 'photo' => true], 'progress' => 60, 'step' => 'TikTok récupère les photos', 'delay' => 3, 'log' => 'Publication photo TikTok initialisée (' . $init['publish_id'] . ', ' . count($urls) . ' photos)'];
}
