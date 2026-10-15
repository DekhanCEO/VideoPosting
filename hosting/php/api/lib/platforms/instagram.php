<?php
/**
 * Instagram : connexion Instagram (graph.instagram.com) ou Facebook Login (graph.facebook.com).
 * Sur l'hébergement, Instagram télécharge la vidéo via une URL publique signée (pas d'envoi direct nécessaire).
 */

const IG_SCOPES = 'instagram_business_basic,instagram_business_content_publish,instagram_business_manage_insights';
const FB_SCOPES = 'instagram_basic,instagram_content_publish,instagram_manage_insights,pages_show_list,pages_read_engagement,business_management';

function graph_message($body, string $fallback): string
{
    if (!is_array($body)) return $fallback;
    $e = $body['error'] ?? null;
    if (!is_array($e)) return $body['error_message'] ?? $fallback;
    $code = $e['code'] ?? null;
    if ($code === 190) return 'Session Instagram expirée : reconnectez le compte.';
    if (in_array($code, [4, 17, 32], true)) return 'Limite de requêtes Instagram atteinte, réessayez plus tard.';
    if ($code === 9 && ($e['error_subcode'] ?? null) === 2207042) return 'Limite de 100 publications par 24 h atteinte sur Instagram.';
    return $e['error_user_msg'] ?? $e['message'] ?? $fallback;
}

function graph_call(string $method, string $url, $body, string $fallback): array
{
    [$status, , $data] = http_request($method, $url, [], $body);
    if ($status < 200 || $status >= 300 || (is_array($data) && isset($data['error']))) {
        throw new PlatformError(graph_message($data, $fallback), $data, $status);
    }
    return is_array($data) ? $data : [];
}

function ig_base(array $a, ?array $c = null): string
{
    $host = ($a['meta']['loginType'] ?? 'instagram') === 'facebook' ? 'https://graph.facebook.com' : 'https://graph.instagram.com';
    $version = $c['graphVersion'] ?? ($a['meta']['graphVersion'] ?? 'v24.0');
    return $host . '/' . $version;
}

function ig_user(array $a): string
{
    return (string) ($a['meta']['igUserId'] ?? $a['externalId']);
}

function instagram_auth_url(string $state, array $c): string
{
    if ($c['loginType'] === 'facebook') {
        return 'https://www.facebook.com/' . $c['graphVersion'] . '/dialog/oauth?' . http_build_query([
            'client_id' => $c['clientId'], 'redirect_uri' => redirect_uri(), 'state' => $state, 'response_type' => 'code', 'scope' => FB_SCOPES,
        ]);
    }
    return 'https://www.instagram.com/oauth/authorize?' . http_build_query([
        'client_id' => $c['clientId'], 'redirect_uri' => redirect_uri(), 'response_type' => 'code', 'scope' => IG_SCOPES, 'state' => $state,
    ]);
}

function instagram_exchange(string $code, array $c): array
{
    $v = $c['graphVersion'];
    $code = preg_replace('/#_$/', '', $code);
    if ($c['loginType'] === 'facebook') {
        $short = graph_call('GET', "https://graph.facebook.com/$v/oauth/access_token?" . http_build_query([
            'client_id' => $c['clientId'], 'client_secret' => $c['clientSecret'], 'redirect_uri' => redirect_uri(), 'code' => $code,
        ]), null, 'Échec de l\'authentification Facebook.');
        $long = graph_call('GET', "https://graph.facebook.com/$v/oauth/access_token?" . http_build_query([
            'grant_type' => 'fb_exchange_token', 'client_id' => $c['clientId'], 'client_secret' => $c['clientSecret'], 'fb_exchange_token' => $short['access_token'],
        ]), null, 'Impossible d\'obtenir un jeton longue durée.');
        $pages = graph_call('GET', "https://graph.facebook.com/$v/me/accounts?fields=" . rawurlencode('id,name,instagram_business_account{id,username,name,profile_picture_url}') . '&access_token=' . rawurlencode($long['access_token']), null, 'Impossible de lister vos Pages Facebook.');
        $page = null;
        foreach ($pages['data'] ?? [] as $p) if (!empty($p['instagram_business_account'])) { $page = $p; break; }
        if (!$page) throw new PlatformError('Aucun compte Instagram professionnel n\'est lié à vos Pages Facebook. Liez votre compte Instagram (Business ou Créateur) à une Page puis réessayez.');
        $ig = $page['instagram_business_account'];
        return [
            'platform' => 'instagram', 'externalId' => $ig['id'],
            'name' => $ig['name'] ?? $ig['username'] ?? $page['name'], 'username' => $ig['username'] ?? null, 'avatarUrl' => $ig['profile_picture_url'] ?? null,
            'accessToken' => $long['access_token'],
            'expiresAt' => now_ms() + ((int) ($long['expires_in'] ?? 60 * 86400)) * 1000,
            'meta' => ['loginType' => 'facebook', 'igUserId' => $ig['id'], 'pageId' => $page['id'], 'pageName' => $page['name'], 'graphVersion' => $v],
        ];
    }
    $short = graph_call('POST', 'https://api.instagram.com/oauth/access_token', [
        'client_id' => $c['clientId'], 'client_secret' => $c['clientSecret'], 'grant_type' => 'authorization_code', 'redirect_uri' => redirect_uri(), 'code' => $code,
    ], 'Échec de l\'authentification Instagram.');
    $token = $short['access_token'] ?? ($short['data'][0]['access_token'] ?? null);
    if (!$token) throw new PlatformError('Instagram n\'a pas renvoyé de jeton d\'accès.');
    $long = graph_call('GET', 'https://graph.instagram.com/access_token?' . http_build_query([
        'grant_type' => 'ig_exchange_token', 'client_secret' => $c['clientSecret'], 'access_token' => $token,
    ]), null, 'Impossible d\'obtenir un jeton Instagram longue durée.');
    $me = graph_call('GET', "https://graph.instagram.com/$v/me?fields=id,user_id,username,name,profile_picture_url,account_type&access_token=" . rawurlencode($long['access_token']), null, 'Impossible de lire le profil Instagram.');
    $userId = (string) ($me['user_id'] ?? $me['id']);
    return [
        'platform' => 'instagram', 'externalId' => $userId,
        'name' => $me['name'] ?? $me['username'] ?? 'Compte Instagram', 'username' => $me['username'] ?? null, 'avatarUrl' => $me['profile_picture_url'] ?? null,
        'accessToken' => $long['access_token'],
        'expiresAt' => now_ms() + ((int) $long['expires_in']) * 1000,
        'meta' => ['loginType' => 'instagram', 'igUserId' => $userId, 'accountType' => $me['account_type'] ?? null, 'graphVersion' => $v],
    ];
}

function instagram_refresh(array $a, array $c): array
{
    if (($a['meta']['loginType'] ?? '') === 'facebook') throw new PlatformError('Session Instagram (via Facebook) expirée : reconnectez le compte.');
    $r = graph_call('GET', 'https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=' . rawurlencode($a['accessToken']), null, 'Session Instagram expirée : reconnectez le compte.');
    return ['accessToken' => $r['access_token'], 'expiresAt' => now_ms() + ((int) $r['expires_in']) * 1000];
}

function ig_container_error(?string $status): string
{
    $s = (string) $status;
    if (str_contains($s, '2207026')) return 'Format vidéo non pris en charge par Instagram (codec, durée ou ratio).';
    if (str_contains($s, '2207076') || str_contains($s, '2207077')) return 'Instagram n\'a pas pu télécharger la vidéo depuis l\'hébergement (vérifiez que le site est accessible en HTTPS).';
    if (str_contains($s, '2207003')) return 'Le téléchargement de la vidéo par Instagram a expiré.';
    if (str_contains($s, '2207004')) return 'Vidéo trop volumineuse pour Instagram.';
    if (str_contains($s, '2207050')) return 'Le compte Instagram est restreint ou inactif.';
    return 'Instagram a refusé la vidéo' . ($s ? " ($s)" : '') . '.';
}

function instagram_step(array $ctx): array
{
    $job = $ctx['job'];
    $a = $ctx['account'];
    $o = $ctx['options'];
    $base = ig_base($a, credentials('instagram'));
    $token = $a['accessToken'];

    $photo = ($ctx['kind'] ?? 'video') === 'photo';
    $shared = fn() => [
        'caption' => $o['caption'],
        'collaborators' => $o['collaborators'] ? json_encode(array_map(fn($c) => ltrim($c, '@'), $o['collaborators'])) : null,
        'location_id' => $o['locationId'] ?: null,
        'access_token' => $token,
    ];
    $imageUrl = function (array $img): string {
        $url = signed_media_url($img['id']);
        if (!str_starts_with($url, 'https://') && !vp_config('api_mock_base')) throw new PlatformError('Instagram exige que l\'application soit accessible en HTTPS : activez le certificat SSL de votre hébergement.');
        return $url;
    };

    switch ($job['state']) {
        case 'start':
            if ($photo && count($ctx['images']) === 1) {
                $c = graph_call('POST', $base . '/' . ig_user($a) . '/media', ['image_url' => $imageUrl($ctx['images'][0])] + $shared(), 'Instagram a refusé la photo.');
                return ['job' => ['state' => 'status', 'containerId' => $c['id'], 'startedAt' => now_ms()], 'progress' => 60, 'step' => 'Instagram traite la photo', 'delay' => 2, 'log' => 'Conteneur Instagram créé (' . $c['id'] . ')'];
            }
            if ($photo) {
                return ['job' => ['state' => 'children', 'index' => 0, 'children' => []], 'progress' => 5, 'step' => 'Envoi des photos à Instagram'];
            }
            $url = signed_media_url($ctx['media']['id']);
            if (!str_starts_with($url, 'https://') && !vp_config('api_mock_base')) throw new PlatformError('Instagram exige que l\'application soit accessible en HTTPS : activez le certificat SSL de votre hébergement.');
            $c = graph_call('POST', $base . '/' . ig_user($a) . '/media', [
                'media_type' => 'REELS',
                'video_url' => $url,
                'caption' => $o['caption'],
                'share_to_feed' => $o['shareToFeed'] ? 'true' : 'false',
                'thumb_offset' => max(0, (int) round($o['thumbOffsetMs'])),
                'collaborators' => $o['collaborators'] ? json_encode(array_map(fn($c) => ltrim($c, '@'), $o['collaborators'])) : null,
                'audio_name' => $o['audioName'] ?: null,
                'location_id' => $o['locationId'] ?: null,
                'access_token' => $token,
            ], 'Instagram a refusé la création du Reel.');
            return ['job' => ['state' => 'status', 'containerId' => $c['id'], 'startedAt' => now_ms()], 'progress' => 10, 'step' => 'Instagram récupère la vidéo', 'delay' => 5, 'log' => 'Conteneur Instagram créé (' . $c['id'] . ')'];

        case 'children':
            // Carrousel : une photo par étape (courtes requêtes, compatibles avec les limites de l'hébergement).
            $i = (int) $job['index'];
            $images = $ctx['images'];
            $child = graph_call('POST', $base . '/' . ig_user($a) . '/media', ['image_url' => $imageUrl($images[$i]), 'is_carousel_item' => 'true', 'access_token' => $token], 'Instagram a refusé la photo ' . ($i + 1) . '.');
            $children = array_merge($job['children'], [$child['id']]);
            if ($i + 1 < count($images)) {
                return ['job' => ['state' => 'children', 'index' => $i + 1, 'children' => $children], 'progress' => 5 + (int) round(($i + 1) / count($images) * 60), 'step' => 'Envoi des photos à Instagram (' . ($i + 1) . '/' . count($images) . ')'];
            }
            $c = graph_call('POST', $base . '/' . ig_user($a) . '/media', ['media_type' => 'CAROUSEL', 'children' => implode(',', $children)] + $shared(), 'Instagram a refusé le carrousel.');
            return ['job' => ['state' => 'status', 'containerId' => $c['id'], 'startedAt' => now_ms()], 'progress' => 75, 'step' => 'Instagram prépare le carrousel', 'delay' => 2, 'log' => 'Carrousel Instagram créé (' . $c['id'] . ', ' . count($children) . ' photos)'];

        case 'status':
            $s = graph_call('GET', $base . '/' . $job['containerId'] . '?fields=status_code,status&access_token=' . rawurlencode($token), null, 'Impossible de suivre le traitement Instagram.');
            $code = $s['status_code'] ?? '';
            if ($code === 'FINISHED') return ['job' => ['state' => 'publish', 'containerId' => $job['containerId'], 'attempts' => 0], 'progress' => 94, 'step' => $photo ? 'Mise en ligne de la publication' : 'Publication du Reel'];
            if ($code === 'ERROR') throw new PlatformError(ig_container_error($s['status'] ?? null), $s);
            if ($code === 'EXPIRED') throw new PlatformError('Le conteneur Instagram a expiré (24 h). Relancez la publication.');
            $elapsed = now_ms() - $job['startedAt'];
            if ($elapsed > 20 * 60000) throw new PlatformError('Instagram met trop de temps à traiter le média.');
            return ['job' => $job, 'progress' => min(92, ($photo ? 76 : 12) + (int) round($elapsed / 10000)), 'step' => $photo ? 'Instagram traite les photos' : 'Instagram traite la vidéo', 'delay' => $photo ? 2 : 5];

        case 'publish':
            try {
                $p = graph_call('POST', $base . '/' . ig_user($a) . '/media_publish', ['creation_id' => $job['containerId'], 'access_token' => $token], 'Instagram a refusé la publication.');
            } catch (PlatformError $e) {
                $attempts = ($job['attempts'] ?? 0) + 1;
                if ($attempts >= 5) throw $e;
                return ['job' => array_replace($job, ['attempts' => $attempts]), 'delay' => 5, 'log' => 'Publication pas encore possible, nouvelle tentative… (' . $e->getMessage() . ')', 'level' => 'warn'];
            }
            $url = null;
            try {
                $info = graph_call('GET', $base . '/' . $p['id'] . '?fields=permalink&access_token=' . rawurlencode($token), null, '');
                $url = $info['permalink'] ?? null;
            } catch (PlatformError $e) {
                $url = !empty($a['username']) ? 'https://www.instagram.com/' . $a['username'] . ($photo ? '/' : '/reels/') : null;
            }
            return ['done' => ['externalId' => $p['id'], 'url' => $url]];
    }
    throw new PlatformError('État de publication inconnu.');
}

function instagram_stats(array $a, array $externalIds): array
{
    $base = ig_base($a, credentials('instagram'));
    $token = rawurlencode($a['accessToken']);
    $result = ['posts' => [], 'warnings' => []];
    $me = graph_call('GET', $base . '/' . ig_user($a) . "?fields=followers_count,media_count&access_token=$token", null, 'Impossible de lire les statistiques Instagram.');
    $result['snapshot'] = ['followers' => (int) ($me['followers_count'] ?? 0), 'videoCount' => (int) ($me['media_count'] ?? 0)];
    foreach ($externalIds as $id) {
        try {
            $ins = graph_call('GET', "$base/$id/insights?metric=views,reach,likes,comments,shares,saved&access_token=$token", null, 'Insights indisponibles');
            $get = function ($name) use ($ins) {
                foreach ($ins['data'] ?? [] as $m) if ($m['name'] === $name) return (int) ($m['total_value']['value'] ?? $m['values'][0]['value'] ?? 0);
                return 0;
            };
            $result['posts'][$id] = array_filter(['views' => $get('views'), 'likes' => $get('likes'), 'comments' => $get('comments'), 'shares' => $get('shares'), 'saves' => $get('saved'), 'reach' => $get('reach') ?: null], fn($v) => $v !== null);
        } catch (PlatformError $e) {
            try {
                $m = graph_call('GET', "$base/$id?fields=like_count,comments_count&access_token=$token", null, '');
                $result['posts'][$id] = ['views' => 0, 'likes' => (int) ($m['like_count'] ?? 0), 'comments' => (int) ($m['comments_count'] ?? 0), 'shares' => 0];
            } catch (PlatformError $e2) {
                $result['warnings'][] = "Reel $id : " . $e2->getMessage();
            }
        }
    }
    // Audience des abonnés (comptes professionnels d'au moins 100 abonnés).
    try {
        $breakdown = function (string $dim) use ($base, $a, $token): array {
            $r = graph_call('GET', "$base/" . ig_user($a) . "/insights?metric=follower_demographics&period=lifetime&metric_type=total_value&breakdown=$dim&access_token=$token", null, 'Audience Instagram indisponible (compte professionnel d\'au moins 100 abonnés requis)');
            $rows = [];
            foreach ($r['data'][0]['total_value']['breakdowns'][0]['results'] ?? [] as $x) $rows[(string) ($x['dimension_values'][0] ?? '')] = (float) ($x['value'] ?? 0);
            return audience_shares($rows);
        };
        $age = $breakdown('age');
        $gender = $breakdown('gender');
        $country = $breakdown('country');
        $city = $breakdown('city');
        $result['audience'] = array_filter([
            'basis' => 'followers',
            'gender' => $gender ? ['female' => $gender['F'] ?? 0, 'male' => $gender['M'] ?? 0, 'other' => $gender['U'] ?? 0] : null,
            'ages' => $age ? array_intersect_key($age, array_flip(AGE_BUCKETS)) ?: null : null,
            'countries' => $country ? audience_list($country, 30, 'code') : null,
            'cities' => $city ? audience_list($city, 10, 'name') : null,
        ], fn($v) => $v !== null);
    } catch (PlatformError $e) {
        $result['warnings'][] = 'Audience Instagram : ' . $e->getMessage();
    }
    return $result;
}
