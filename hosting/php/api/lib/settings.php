<?php

const PLATFORM_IDS = ['tiktok', 'youtube', 'instagram'];
const PLATFORM_NAMES = ['tiktok' => 'TikTok', 'youtube' => 'YouTube', 'instagram' => 'Instagram'];

function is_platform($p): bool
{
    return is_string($p) && in_array($p, PLATFORM_IDS, true);
}

function redirect_uri(): string
{
    // Une seule adresse de retour pour les trois plateformes (la plateforme voyage dans « state »).
    return public_url() . '/api/callback.php';
}

/** Variables du .env par plateforme (prioritaires sur les valeurs saisies dans l'application). */
const ENV_KEYS = [
    'youtube' => ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET'],
    'tiktok' => ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET'],
    'instagram' => ['INSTAGRAM_APP_ID', 'INSTAGRAM_APP_SECRET'],
];

function credentials(string $platform): array
{
    $c = app_read()['credentials'];
    $ig = $c['instagram'];
    $id = $platform === 'youtube' ? $c['youtube']['clientId'] : ($platform === 'tiktok' ? $c['tiktok']['clientKey'] : $ig['appId']);
    $secret = $platform === 'youtube' ? $c['youtube']['clientSecret'] : ($platform === 'tiktok' ? $c['tiktok']['clientSecret'] : $ig['appSecret']);
    [$envId, $envSecret] = array_map('vp_env', ENV_KEYS[$platform]);
    $fromEnv = $envId !== null && $envSecret !== null;
    if ($fromEnv) {
        $id = $envId;
        $secret = $envSecret;
    }
    $loginType = in_array(vp_env('INSTAGRAM_LOGIN_TYPE'), ['instagram', 'facebook'], true) ? vp_env('INSTAGRAM_LOGIN_TYPE') : ($ig['loginType'] ?? 'instagram');
    return [
        'clientId' => trim((string) $id),
        'clientSecret' => trim((string) $secret),
        'configured' => trim((string) $id) !== '' && trim((string) $secret) !== '',
        'fromEnv' => $fromEnv,
        'loginType' => $loginType,
        'graphVersion' => vp_env('META_GRAPH_VERSION') ?? ($ig['graphVersion'] ?: 'v24.0'),
    ];
}

function public_settings(?array $user = null): array
{
    $d = db_read();
    $app = app_read();
    $s = $d['settings'];
    $url = public_url();
    $yt = credentials('youtube');
    $tt = credentials('tiktok');
    $ig = credentials('instagram');
    $redirect = redirect_uri();
    $admin = ($user['role'] ?? '') === 'admin';
    return [
        'demoMode' => $s['demoMode'],
        'publicUrl' => $url,
        'publicUrlIsReachable' => str_starts_with($url, 'https://') && !preg_match('#^https://(localhost|127\.|10\.|192\.168\.)#', $url),
        'credentials' => [
            'youtube' => ['clientId' => $admin ? $yt['clientId'] : '', 'hasSecret' => $yt['clientSecret'] !== '', 'fromEnv' => $yt['fromEnv'], 'configured' => $yt['configured']],
            'tiktok' => ['clientKey' => $admin ? $tt['clientId'] : '', 'hasSecret' => $tt['clientSecret'] !== '', 'fromEnv' => $tt['fromEnv'], 'configured' => $tt['configured']],
            'instagram' => [
                'appId' => $admin ? $ig['clientId'] : '', 'hasSecret' => $ig['clientSecret'] !== '', 'fromEnv' => $ig['fromEnv'], 'configured' => $ig['configured'],
                'loginType' => $ig['loginType'], 'graphVersion' => $ig['graphVersion'],
            ],
        ],
        'redirectUris' => ['tiktok' => $redirect, 'youtube' => $redirect, 'instagram' => $redirect],
        'hashtagGroups' => array_values($s['hashtagGroups']),
        'currency' => $s['currency'],
        'monthlyRevenueGoal' => $s['monthlyRevenueGoal'],
        'defaults' => $s['defaults'],
        'revenueEstimates' => revenue_estimates_settings($s),
        'twitchAvailable' => twitch_configured($app),
        'passwordProtected' => true,
        'hosting' => 'php',
        'canManageApps' => $admin,
        'cronUrl' => $admin ? $url . '/api/index.php?r=' . rawurlencode('/cron') . '&secret=' . cron_secret($app) : null,
        'env' => $admin ? vp_env_info() : null,
    ];
}

function apply_settings_patch(array $p, array $user): void
{
    // Applications développeur (YouTube, TikTok, Meta) : communes à tous les espaces, réservées à l'administrateur.
    if (isset($p['credentials']) || isset($p['clearCredentials'])) {
        if ($user['role'] !== 'admin') throw new HttpError('Seul l\'administrateur peut modifier les applications développeur.', 403);
        app_update(function (array &$a) use ($p) {
            $s = &$a;
            if (isset($p['clearCredentials']) && is_platform($p['clearCredentials'])) {
                $c = $p['clearCredentials'];
                if ($c === 'youtube') $s['credentials']['youtube'] = ['clientId' => '', 'clientSecret' => ''];
                if ($c === 'tiktok') $s['credentials']['tiktok'] = ['clientKey' => '', 'clientSecret' => ''];
                if ($c === 'instagram') { $s['credentials']['instagram']['appId'] = ''; $s['credentials']['instagram']['appSecret'] = ''; }
            }
            apply_credentials_patch($s, $p['credentials'] ?? []);
        });
    }
    db_update(function (array &$d) use ($p) {
        $s = &$d['settings'];
        if (isset($p['demoMode']) && is_bool($p['demoMode'])) $s['demoMode'] = $p['demoMode'];
        if (isset($p['hashtagGroups']) && is_array($p['hashtagGroups'])) {
            $groups = [];
            foreach (array_slice($p['hashtagGroups'], 0, 50) as $g) {
                $name = trim(str_limit($g['name'] ?? '', 60));
                if ($name === '') continue;
                $groups[] = ['id' => is_string($g['id'] ?? null) && $g['id'] !== '' ? str_limit($g['id'], 100) : uuid4(), 'name' => $name, 'tags' => string_list($g['tags'] ?? [], 60, 100)];
            }
            $s['hashtagGroups'] = $groups;
        }
        if (isset($p['currency']) && in_array($p['currency'], ['EUR', 'USD', 'GBP', 'CHF', 'CAD', 'MAD', 'XOF'], true)) $s['currency'] = $p['currency'];
        if (isset($p['monthlyRevenueGoal']) && is_numeric($p['monthlyRevenueGoal'])) $s['monthlyRevenueGoal'] = max(0, min(10000000, $p['monthlyRevenueGoal'] + 0));
        if (isset($p['revenueEstimates']) && is_array($p['revenueEstimates'])) {
            $r = $p['revenueEstimates'];
            $cur = revenue_estimates_settings($s);
            if (isset($r['enabled']) && is_bool($r['enabled'])) $cur['enabled'] = $r['enabled'];
            foreach (['tiktokRpm' => 100, 'instagramRpm' => 100, 'twitchSubValue' => 100, 'twitchBitValue' => 1] as $k => $max) {
                if (isset($r[$k]) && is_numeric($r[$k])) $cur[$k] = max(0, min($max, $r[$k] + 0));
            }
            $s['revenueEstimates'] = $cur;
        }
        if (isset($p['defaults']) && is_array($p['defaults'])) {
            $df = $p['defaults'];
            foreach (['youtubeCategoryId', 'youtubeLanguage'] as $k) if (isset($df[$k]) && is_string($df[$k])) $s['defaults'][$k] = str_limit($df[$k], 10);
            if (in_array($df['youtubePrivacy'] ?? '', ['public', 'unlisted', 'private'], true)) $s['defaults']['youtubePrivacy'] = $df['youtubePrivacy'];
            foreach (['tiktokAllowComments', 'tiktokAllowDuet', 'tiktokAllowStitch', 'instagramShareToFeed'] as $k) if (isset($df[$k]) && is_bool($df[$k])) $s['defaults'][$k] = $df[$k];
        }
    });
}

function apply_credentials_patch(array &$s, array $c): void
{
    if (isset($c['youtube'])) {
        if (isset($c['youtube']['clientId'])) $s['credentials']['youtube']['clientId'] = str_limit(trim($c['youtube']['clientId']), 300);
        if (!empty($c['youtube']['clientSecret'])) $s['credentials']['youtube']['clientSecret'] = str_limit(trim($c['youtube']['clientSecret']), 500);
    }
    if (isset($c['tiktok'])) {
        if (isset($c['tiktok']['clientKey'])) $s['credentials']['tiktok']['clientKey'] = str_limit(trim($c['tiktok']['clientKey']), 300);
        if (!empty($c['tiktok']['clientSecret'])) $s['credentials']['tiktok']['clientSecret'] = str_limit(trim($c['tiktok']['clientSecret']), 500);
    }
    if (isset($c['instagram'])) {
        $i = $c['instagram'];
        if (isset($i['appId'])) $s['credentials']['instagram']['appId'] = str_limit(trim($i['appId']), 300);
        if (!empty($i['appSecret'])) $s['credentials']['instagram']['appSecret'] = str_limit(trim($i['appSecret']), 500);
        if (in_array($i['loginType'] ?? '', ['instagram', 'facebook'], true)) $s['credentials']['instagram']['loginType'] = $i['loginType'];
        if (isset($i['graphVersion']) && preg_match('/^v\d+\.\d+$/', $i['graphVersion'])) $s['credentials']['instagram']['graphVersion'] = $i['graphVersion'];
    }
}

function cron_secret(?array $app = null): string
{
    return vp_env('CRON_SECRET') ?? (string) ($app ?? app_read())['cronSecret'];
}

function revenue_estimates_settings(array $s): array
{
    $defaults = ['enabled' => true, 'tiktokRpm' => 0.5, 'instagramRpm' => 0, 'twitchSubValue' => 2.5, 'twitchBitValue' => 0.01];
    return array_replace($defaults, is_array($s['revenueEstimates'] ?? null) ? $s['revenueEstimates'] : []);
}
