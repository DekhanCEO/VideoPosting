<?php

const YT_SCOPES = [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/yt-analytics.readonly',
    'https://www.googleapis.com/auth/yt-analytics-monetary.readonly',
];
const YT_API = 'https://www.googleapis.com/youtube/v3';
const YT_UPLOAD = 'https://www.googleapis.com/upload/youtube/v3';
const YT_CHUNK = 32 * 256 * 1024; // 8 Mio, multiple de 256 Kio

function google_message($body, string $fallback): string
{
    if (!is_array($body)) return $fallback;
    if (isset($body['error']) && is_string($body['error'])) return $body['error_description'] ?? $body['error'];
    $reason = $body['error']['errors'][0]['reason'] ?? null;
    $map = [
        'quotaExceeded' => 'Quota de l\'API YouTube épuisé pour aujourd\'hui (un envoi consomme 1 600 unités sur 10 000). Réessayez demain ou demandez une augmentation de quota.',
        'uploadLimitExceeded' => 'Limite d\'envois quotidienne de la chaîne YouTube atteinte.',
        'youtubeSignupRequired' => 'Ce compte Google n\'a pas de chaîne YouTube. Créez-en une sur youtube.com puis reconnectez-vous.',
        'invalidTitle' => 'Titre refusé par YouTube (vide, trop long ou caractères interdits).',
        'invalidDescription' => 'Description refusée par YouTube.',
        'invalidTags' => 'Tags refusés par YouTube.',
        'forbidden' => 'Autorisations YouTube insuffisantes : reconnectez le compte.',
        'insufficientPermissions' => 'Autorisations YouTube insuffisantes : reconnectez le compte.',
    ];
    return $map[$reason] ?? ($body['error']['message'] ?? $fallback);
}

function google_call(string $method, string $url, array $headers, $body, string $fallback): array
{
    [$status, , $data] = http_request($method, $url, $headers, $body);
    if ($status < 200 || $status >= 300) throw new PlatformError(google_message($data, $fallback), $data, $status);
    return is_array($data) ? $data : [];
}

function youtube_auth_url(string $state, array $c): string
{
    return 'https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query([
        'client_id' => $c['clientId'], 'redirect_uri' => redirect_uri(), 'response_type' => 'code',
        'scope' => implode(' ', YT_SCOPES), 'access_type' => 'offline', 'prompt' => 'consent',
        'include_granted_scopes' => 'true', 'state' => $state,
    ]);
}

function youtube_exchange(string $code, array $c): array
{
    $t = google_call('POST', 'https://oauth2.googleapis.com/token', [], [
        'code' => $code, 'client_id' => $c['clientId'], 'client_secret' => $c['clientSecret'],
        'redirect_uri' => redirect_uri(), 'grant_type' => 'authorization_code',
    ], 'Échec de l\'échange du code Google.');
    $ch = google_call('GET', YT_API . '/channels?part=snippet&mine=true', ['Authorization' => 'Bearer ' . $t['access_token']], null, 'Impossible de lire la chaîne YouTube.');
    $channel = $ch['items'][0] ?? null;
    if (!$channel) throw new PlatformError('Ce compte Google n\'a pas de chaîne YouTube. Créez-en une sur youtube.com puis réessayez.');
    $th = $channel['snippet']['thumbnails'] ?? [];
    return [
        'platform' => 'youtube',
        'externalId' => $channel['id'],
        'name' => $channel['snippet']['title'],
        'username' => $channel['snippet']['customUrl'] ?? null,
        'avatarUrl' => $th['high']['url'] ?? $th['medium']['url'] ?? $th['default']['url'] ?? null,
        'accessToken' => $t['access_token'],
        'refreshToken' => $t['refresh_token'] ?? null,
        'expiresAt' => now_ms() + ((int) ($t['expires_in'] ?? 3600)) * 1000,
        'scopes' => isset($t['scope']) ? explode(' ', $t['scope']) : [],
    ];
}

function youtube_refresh(array $a, array $c): array
{
    if (empty($a['refreshToken'])) throw new PlatformError('Session YouTube expirée : reconnectez le compte.');
    $t = google_call('POST', 'https://oauth2.googleapis.com/token', [], [
        'client_id' => $c['clientId'], 'client_secret' => $c['clientSecret'],
        'refresh_token' => $a['refreshToken'], 'grant_type' => 'refresh_token',
    ], 'Session YouTube expirée : reconnectez le compte.');
    return ['accessToken' => $t['access_token'], 'expiresAt' => now_ms() + ((int) ($t['expires_in'] ?? 3600)) * 1000];
}

function youtube_range_offset(array $headers): int
{
    $range = $headers['range'] ?? null;
    return $range ? ((int) explode('-', $range)[1]) + 1 : 0;
}

/**
 * Une étape de publication. $ctx : post, media, file, account, options, job.
 * Retourne ['job' => …, 'progress' => …, 'step' => …] ou ['done' => ['externalId','url']].
 */
function youtube_step(array $ctx): array
{
    $job = $ctx['job'];
    $media = $ctx['media'];
    $auth = ['Authorization' => 'Bearer ' . $ctx['account']['accessToken']];
    $o = $ctx['options'];

    switch ($job['state']) {
        case 'start':
            $meta = [
                'snippet' => array_filter([
                    'title' => trim($o['title']),
                    'description' => youtube_description($o),
                    'tags' => $o['tags'] ?: null,
                    'categoryId' => $o['categoryId'],
                    'defaultLanguage' => $o['defaultLanguage'] ?: null,
                    'defaultAudioLanguage' => $o['defaultLanguage'] ?: null,
                ], fn($v) => $v !== null),
                'status' => [
                    'privacyStatus' => $o['privacy'],
                    'selfDeclaredMadeForKids' => (bool) $o['madeForKids'],
                    'embeddable' => (bool) $o['embeddable'],
                    'license' => $o['license'],
                    'containsSyntheticMedia' => (bool) $o['containsSyntheticMedia'],
                ],
            ];
            [$status, $headers, $body] = http_request('POST', YT_UPLOAD . '/videos?uploadType=resumable&part=snippet,status&notifySubscribers=' . ($o['notifySubscribers'] ? 'true' : 'false'), $auth + [
                'Content-Type' => 'application/json; charset=UTF-8',
                'X-Upload-Content-Length' => (string) $media['size'],
                'X-Upload-Content-Type' => $media['mimeType'],
            ], json_encode($meta, JSON_UNESCAPED_UNICODE));
            if ($status < 200 || $status >= 300) throw new PlatformError(google_message($body, 'YouTube a refusé l\'initialisation de l\'envoi.'), $body, $status);
            if (empty($headers['location'])) throw new PlatformError('YouTube n\'a pas renvoyé d\'URL d\'envoi.');
            return ['job' => ['state' => 'upload', 'url' => $headers['location'], 'offset' => 0, 'failures' => 0], 'progress' => 5, 'step' => 'Envoi de la vidéo vers YouTube', 'log' => 'Session d\'envoi YouTube ouverte'];

        case 'upload':
        case 'resume':
            $offset = (int) $job['offset'];
            if ($job['state'] === 'resume') {
                [$status, $headers, $body] = http_request('PUT', $job['url'], $auth + ['Content-Length' => '0', 'Content-Range' => 'bytes */' . $media['size']], '');
            } else {
                $len = min(YT_CHUNK, $media['size'] - $offset);
                [$status, $headers, $body] = http_request('PUT', $job['url'], $auth + ['Content-Range' => 'bytes ' . $offset . '-' . ($offset + $len - 1) . '/' . $media['size']], null, ['file' => [$ctx['file'], $offset, $len], 'timeout' => 300]);
            }
            if ($status === 200 || $status === 201) {
                $id = $body['id'] ?? null;
                if (!$id) throw new PlatformError('Réponse YouTube inattendue.', $body);
                $next = !empty($ctx['thumbnail']) ? 'thumb' : 'finish';
                return ['job' => ['state' => $next, 'videoId' => $id], 'progress' => 92, 'step' => 'Finalisation sur YouTube', 'log' => "Vidéo envoyée (id $id)"];
            }
            if ($status === 308) {
                $offset = youtube_range_offset($headers);
                return ['job' => array_replace($job, ['state' => 'upload', 'offset' => $offset, 'failures' => 0]), 'progress' => 5 + (int) round($offset / $media['size'] * 85), 'step' => 'Envoi de la vidéo vers YouTube'];
            }
            if ($status === 0 || $status >= 500) {
                $failures = ($job['failures'] ?? 0) + 1;
                if ($failures > 5) throw new PlatformError('Envoi YouTube interrompu après plusieurs tentatives.');
                return ['job' => array_replace($job, ['state' => 'resume', 'failures' => $failures]), 'delay' => 2 ** $failures, 'log' => "Erreur réseau / serveur ($status), nouvelle tentative…", 'level' => 'warn'];
            }
            throw new PlatformError(google_message($body, "Envoi YouTube refusé ($status)."), $body, $status);

        case 'thumb':
            $thumb = $ctx['thumbnail'];
            $log = 'Miniature personnalisée appliquée';
            $level = 'info';
            try {
                google_call('POST', YT_UPLOAD . '/thumbnails/set?videoId=' . $job['videoId'] . '&uploadType=media', $auth + ['Content-Type' => $thumb['mimeType']], file_get_contents($thumb['file']), 'Miniature refusée');
            } catch (PlatformError $e) {
                $log = 'Miniature non appliquée : ' . $e->getMessage() . ' (la chaîne doit être validée pour les miniatures personnalisées).';
                $level = 'warn';
            }
            return ['job' => ['state' => 'finish', 'videoId' => $job['videoId']], 'progress' => 97, 'step' => 'Finalisation sur YouTube', 'log' => $log, 'level' => $level];

        case 'finish':
            $short = youtube_is_short($o['format'] ?? 'auto', $media);
            $id = $job['videoId'];
            return ['done' => ['externalId' => $id, 'url' => $short ? "https://www.youtube.com/shorts/$id" : "https://www.youtube.com/watch?v=$id"]];
    }
    throw new PlatformError('État de publication inconnu.');
}

function youtube_stats(array $a, array $externalIds, int $days): array
{
    $auth = ['Authorization' => 'Bearer ' . $a['accessToken']];
    $result = ['posts' => [], 'daily' => [], 'warnings' => []];
    $ch = google_call('GET', YT_API . '/channels?part=statistics&mine=true', $auth, null, 'Impossible de lire les statistiques de la chaîne.');
    if ($s = $ch['items'][0]['statistics'] ?? null) {
        $result['snapshot'] = ['followers' => (int) ($s['subscriberCount'] ?? 0), 'totalViews' => (int) ($s['viewCount'] ?? 0), 'videoCount' => (int) ($s['videoCount'] ?? 0)];
    }
    foreach (array_chunk($externalIds, 50) as $ids) {
        $v = google_call('GET', YT_API . '/videos?part=statistics&id=' . implode(',', $ids), $auth, null, 'Impossible de lire les statistiques des vidéos.');
        foreach ($v['items'] ?? [] as $item) {
            $st = $item['statistics'];
            $result['posts'][$item['id']] = ['views' => (int) ($st['viewCount'] ?? 0), 'likes' => (int) ($st['likeCount'] ?? 0), 'comments' => (int) ($st['commentCount'] ?? 0), 'shares' => 0];
        }
    }
    $reports = 'https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE';
    // Partages et abonnés gagnés par vidéo (absents de l'API Data, fournis par YouTube Analytics).
    foreach (array_chunk($externalIds, 200) as $ids) {
        try {
            $r = google_call('GET', $reports . '&startDate=2010-01-01&endDate=' . iso_day() . '&dimensions=video&metrics=shares,subscribersGained&filters=video==' . implode(',', $ids) . '&sort=-shares&maxResults=200', $auth, null, 'Partages indisponibles');
            foreach ($r['rows'] ?? [] as $row) {
                $id = (string) $row[0];
                if (isset($result['posts'][$id])) {
                    $result['posts'][$id]['shares'] = (int) $row[1];
                    $result['posts'][$id]['followersGained'] = (int) $row[2];
                }
            }
        } catch (PlatformError $e) {
            $result['warnings'][] = 'Partages YouTube : ' . $e->getMessage();
        }
    }
    // Audience : genre et âge (pourcentage des spectateurs connectés), pays (vues) sur la période.
    $period = $reports . '&startDate=' . iso_day(now_ms() - $days * 86400000) . '&endDate=' . iso_day();
    try {
        $r = google_call('GET', $period . '&dimensions=ageGroup,gender&metrics=viewerPercentage&sort=gender,ageGroup', $auth, null, 'Données démographiques indisponibles');
        $groups = ['age13-17' => '13-17', 'age18-24' => '18-24', 'age25-34' => '25-34', 'age35-44' => '35-44', 'age45-54' => '45-54', 'age55-64' => '55-64', 'age65-' => '65+'];
        $gender = ['female' => 0.0, 'male' => 0.0, 'other' => 0.0];
        $ages = [];
        foreach ($r['rows'] ?? [] as [$group, $g, $pct]) {
            $share = (float) $pct / 100;
            if (isset($groups[$group])) $ages[$groups[$group]] = ($ages[$groups[$group]] ?? 0) + $share;
            $gender[$g === 'female' ? 'female' : ($g === 'male' ? 'male' : 'other')] += $share;
        }
        $geo = google_call('GET', $period . '&dimensions=country&metrics=views&sort=-views', $auth, null, 'Pays indisponibles');
        $countries = [];
        foreach ($geo['rows'] ?? [] as $row) $countries[strtoupper((string) $row[0])] = (float) $row[1];
        $g = audience_shares($gender);
        $result['audience'] = array_filter([
            'basis' => 'viewers',
            'gender' => $g ? ['female' => $g['female'] ?? 0, 'male' => $g['male'] ?? 0, 'other' => $g['other'] ?? 0] : null,
            'ages' => audience_shares($ages) ?: null,
            'countries' => $countries ? audience_list(audience_shares($countries), 30, 'code') : null,
        ], fn($v) => $v !== null);
    } catch (PlatformError $e) {
        $result['warnings'][] = 'Audience YouTube : ' . $e->getMessage();
    }
    $base = $period . '&dimensions=day&sort=day';
    $byDate = [];
    try {
        $r = google_call('GET', $base . '&metrics=views,estimatedMinutesWatched,subscribersGained,subscribersLost', $auth, null, 'YouTube Analytics indisponible');
        foreach ($r['rows'] ?? [] as $row) {
            $byDate[$row[0]] = ['date' => $row[0], 'views' => (int) $row[1], 'watchMinutes' => (int) $row[2], 'followersGained' => (int) $row[3] - (int) $row[4]];
        }
    } catch (PlatformError $e) {
        $result['warnings'][] = 'YouTube Analytics : ' . $e->getMessage();
    }
    try {
        $currency = db_read()['settings']['currency'] ?? 'EUR';
        $r = google_call('GET', $base . '&metrics=estimatedRevenue&currency=' . $currency, $auth, null, 'Revenus indisponibles');
        foreach ($r['rows'] ?? [] as $row) {
            $byDate[$row[0]] = array_replace($byDate[$row[0]] ?? ['date' => $row[0]], ['revenue' => (float) $row[1]]);
        }
        $result['revenueAvailable'] = true;
    } catch (PlatformError $e) {
        $result['revenueAvailable'] = false;
    }
    $result['daily'] = array_values($byDate);
    return $result;
}

/** Short : choisi explicitement, sinon vidéo verticale (ou carrée) de 3 minutes maximum. */
function youtube_is_short(string $format, array $media): bool
{
    if ($format === 'short') return true;
    if ($format === 'long') return false;
    return !empty($media['duration']) && !empty($media['width']) && $media['duration'] <= 180 && ($media['height'] ?? 0) >= $media['width'];
}

/** Short demandé explicitement : #Shorts aide YouTube à le classer comme tel. */
function youtube_description(array $o): string
{
    $d = (string) $o['description'];
    if (($o['format'] ?? 'auto') === 'short' && !preg_match('/#shorts\b/i', $o['title'] . ' ' . $d)) $d .= ($d !== '' ? "\n\n" : '') . '#Shorts';
    return $d;
}
