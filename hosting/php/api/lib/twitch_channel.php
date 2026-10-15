<?php
/**
 * Chaîne Twitch d'un espace : abonnés, abonnements payants et bits, pour estimer les revenus Twitch.
 * Connexion distincte de la connexion à l'application (autorisations de lecture supplémentaires).
 */

const TWITCH_CHANNEL_SCOPES = 'moderator:read:followers channel:read:subscriptions bits:read';

function twitch_channel_auth_url(string $state): string
{
    $t = twitch_app(app_read());
    return TWITCH_AUTH . '/authorize?' . http_build_query([
        'response_type' => 'code',
        'client_id' => $t['clientId'],
        'redirect_uri' => redirect_uri(),
        'scope' => TWITCH_CHANNEL_SCOPES,
        'state' => $state,
        'force_verify' => 'true',
    ]);
}

function twitch_token_request(array $params): array
{
    $t = twitch_app(app_read());
    [$status, , $body] = http_request('POST', TWITCH_AUTH . '/token', [], $params + ['client_id' => $t['clientId'], 'client_secret' => $t['clientSecret']]);
    if ($status !== 200 || empty($body['access_token'])) throw new PlatformError('Twitch : ' . ($body['message'] ?? 'autorisation refusée') . '.', $body, $status);
    return $body;
}

/** Retour de Twitch : enregistre la chaîne dans l'espace courant. */
function twitch_channel_exchange(string $code): void
{
    $token = twitch_token_request(['code' => $code, 'grant_type' => 'authorization_code', 'redirect_uri' => redirect_uri()]);
    $t = twitch_app(app_read());
    [$status, , $me] = http_request('GET', TWITCH_API . '/users', ['Authorization' => 'Bearer ' . $token['access_token'], 'Client-Id' => $t['clientId']]);
    $u = $me['data'][0] ?? null;
    if ($status !== 200 || !$u) throw new PlatformError('Impossible de lire votre chaîne Twitch.');
    $account = [
        'id' => (string) $u['id'],
        'login' => (string) $u['login'],
        'displayName' => (string) ($u['display_name'] ?: $u['login']),
        'avatarUrl' => $u['profile_image_url'] ?? null,
        'broadcasterType' => (string) ($u['broadcaster_type'] ?? ''),
        'accessToken' => $token['access_token'],
        'refreshToken' => $token['refresh_token'] ?? null,
        'expiresAt' => now_ms() + ((int) ($token['expires_in'] ?? 3600)) * 1000,
        'scopes' => $token['scope'] ?? [],
    ];
    db_update(function (array &$d) use ($account) {
        $d['twitch'] = ['account' => $account, 'snapshots' => [], 'bits' => [], 'error' => null, 'updatedAt' => null];
    });
    try {
        twitch_channel_sync();
    } catch (Throwable $e) {
        error_log('[' . VP_APP_NAME . '] Twitch : ' . $e->getMessage());
    }
}

function twitch_channel_connect_demo(): void
{
    db_update(function (array &$d) {
        $d['twitch'] = ['account' => ['id' => 'demo', 'login' => 'lea_creations', 'displayName' => 'Léa Créations', 'avatarUrl' => null, 'broadcasterType' => 'affiliate', 'demo' => true], 'snapshots' => [], 'bits' => [], 'error' => null, 'updatedAt' => now_ms()];
    });
}

function twitch_channel_disconnect(): void
{
    $a = db_read()['twitch']['account'] ?? null;
    if ($a && empty($a['demo']) && !empty($a['accessToken'])) {
        $t = twitch_app(app_read());
        http_request('POST', TWITCH_AUTH . '/revoke', [], ['client_id' => $t['clientId'], 'token' => $a['accessToken']], ['timeout' => 10]);
    }
    db_update(function (array &$d) {
        $d['twitch'] = ['account' => null, 'snapshots' => [], 'bits' => [], 'error' => null, 'updatedAt' => null];
    });
}

/** Jeton valide (renouvelé s'il expire dans les 5 minutes). */
function twitch_channel_token(): string
{
    $a = db_read()['twitch']['account'];
    if (($a['expiresAt'] ?? 0) > now_ms() + 300000) return $a['accessToken'];
    if (empty($a['refreshToken'])) throw new PlatformError('Session Twitch expirée : reconnectez la chaîne.');
    $token = twitch_token_request(['grant_type' => 'refresh_token', 'refresh_token' => $a['refreshToken']]);
    db_update(function (array &$d) use ($token) {
        $d['twitch']['account']['accessToken'] = $token['access_token'];
        $d['twitch']['account']['refreshToken'] = $token['refresh_token'] ?? $d['twitch']['account']['refreshToken'];
        $d['twitch']['account']['expiresAt'] = now_ms() + ((int) ($token['expires_in'] ?? 3600)) * 1000;
    });
    return $token['access_token'];
}

function twitch_helix(string $path, string $token): array
{
    $t = twitch_app(app_read());
    [$status, , $body] = http_request('GET', TWITCH_API . $path, ['Authorization' => 'Bearer ' . $token, 'Client-Id' => $t['clientId']]);
    return [$status, is_array($body) ? $body : []];
}

/** Relevé du jour : abonnés, abonnements payants (par niveau) et bits du mois. */
function twitch_channel_sync(): void
{
    $d = db_read();
    $a = $d['twitch']['account'] ?? null;
    if (!$a || !empty($a['demo'])) return;
    try {
        $token = twitch_channel_token();
        $id = rawurlencode($a['id']);
        $snap = ['date' => iso_day(), 'followers' => null, 'subs' => null];
        $notes = [];

        [$st, $f] = twitch_helix("/channels/followers?broadcaster_id=$id&first=1", $token);
        if ($st === 200) $snap['followers'] = (int) ($f['total'] ?? 0);

        // Abonnements : réservés aux chaînes Affiliées ou Partenaires.
        $tiers = ['1000' => 0, '2000' => 0, '3000' => 0];
        $cursor = null;
        $total = null;
        $points = null;
        for ($page = 0; $page < 20; $page++) {
            [$st, $s] = twitch_helix("/subscriptions?broadcaster_id=$id&first=100" . ($cursor ? '&after=' . rawurlencode($cursor) : ''), $token);
            if ($st !== 200) {
                $notes[] = $st === 400 || $st === 403 ? 'abonnements indisponibles (chaîne non Affiliée)' : "abonnements indisponibles ($st)";
                break;
            }
            $total ??= (int) ($s['total'] ?? 0);
            $points ??= (int) ($s['points'] ?? 0);
            foreach ($s['data'] ?? [] as $sub) {
                if ((string) ($sub['user_id'] ?? '') === (string) $a['id']) continue; // l'abonnement offert au créateur lui-même
                $tier = (string) ($sub['tier'] ?? '1000');
                if (isset($tiers[$tier])) $tiers[$tier]++;
            }
            $cursor = $s['pagination']['cursor'] ?? null;
            if (!$cursor) break;
        }
        if ($total !== null) $snap['subs'] = ['total' => $total, 'tier1' => $tiers['1000'], 'tier2' => $tiers['2000'], 'tier3' => $tiers['3000'], 'points' => $points];

        // Bits du mois : somme du classement mensuel (100 premiers donateurs).
        $month = substr(iso_day(), 0, 7);
        $bits = null;
        [$st, $b] = twitch_helix('/bits/leaderboard?count=100&period=month&started_at=' . rawurlencode(gmdate('Y-m-01\T00:00:00\Z')), $token);
        if ($st === 200) $bits = array_sum(array_map(fn($x) => (int) ($x['score'] ?? 0), $b['data'] ?? []));
        else $notes[] = "bits indisponibles ($st)";

        db_update(function (array &$d) use ($snap, $bits, $month, $notes) {
            $d['twitch']['snapshots'] = array_values(array_filter($d['twitch']['snapshots'], fn($s) => $s['date'] !== $snap['date']));
            $d['twitch']['snapshots'][] = $snap;
            $d['twitch']['snapshots'] = array_slice($d['twitch']['snapshots'], -800);
            if ($bits !== null) $d['twitch']['bits'][$month] = $bits;
            $d['twitch']['error'] = $notes ? 'Twitch : ' . implode(', ', $notes) . '.' : null;
            $d['twitch']['updatedAt'] = now_ms();
        });
    } catch (PlatformError $e) {
        $msg = $e->getMessage();
        db_update(function (array &$d) use ($msg) { $d['twitch']['error'] = $msg; });
    }
}

/** Données de démonstration : chaîne Affiliée qui grandit sur 24 mois. */
function twitch_demo_data(): array
{
    $snapshots = [];
    $bits = [];
    foreach (last_months(iso_day(), 24) as $i => $month) {
        $growth = 1 + $i / 24;
        $rng = new DemoRng(demo_hash("twitch:$month"));
        $date = $month === substr(iso_day(), 0, 7) ? iso_day() : $month . '-28';
        $t1 = (int) round(90 * $growth + $rng->next() * 25);
        $snapshots[] = ['date' => $date, 'followers' => (int) round(5200 * $growth), 'subs' => ['total' => $t1 + 14, 'tier1' => $t1, 'tier2' => 10, 'tier3' => 4, 'points' => $t1 + 20 + 24]];
        $bits[$month] = (int) round((6000 + $rng->next() * 9000) * $growth);
    }
    return ['snapshots' => $snapshots, 'bits' => $bits];
}

function twitch_channel_data(array $d): array
{
    $a = $d['twitch']['account'] ?? null;
    if ($a && !empty($a['demo'])) return twitch_demo_data();
    return ['snapshots' => $d['twitch']['snapshots'] ?? [], 'bits' => $d['twitch']['bits'] ?? []];
}

function twitch_sub_revenue(?array $subs, array $est): float
{
    if (!$subs) return 0.0;
    return ($subs['tier1'] + 2 * $subs['tier2'] + 5 * $subs['tier3']) * (float) $est['twitchSubValue'];
}

/** Revenus Twitch estimés, par mois : abonnements (dernier relevé du mois) et bits. */
function twitch_estimate_entries(array $d, array $est, bool $demo): array
{
    if (empty($d['twitch']['account']) || !$est['enabled']) return [];
    $data = twitch_channel_data($d);
    $lastByMonth = [];
    foreach ($data['snapshots'] as $s) {
        $m = substr($s['date'], 0, 7);
        if (!isset($lastByMonth[$m]) || $s['date'] >= $lastByMonth[$m]['date']) $lastByMonth[$m] = $s;
    }
    $out = [];
    foreach ($lastByMonth as $month => $s) {
        $amount = round(twitch_sub_revenue($s['subs'] ?? null, $est), 2);
        if ($amount >= 0.01) {
            $out[] = ['id' => "est-twitch-subs-$month", 'kind' => 'income', 'date' => $s['date'], 'amount' => $amount, 'category' => 'subscriptions', 'platform' => 'twitch',
                'label' => 'Abonnements Twitch (estimé)', 'note' => $s['subs']['tier1'] . ' niv. 1, ' . $s['subs']['tier2'] . ' niv. 2, ' . $s['subs']['tier3'] . ' niv. 3',
                'status' => 'pending', 'auto' => true, 'estimated' => true, 'demo' => $demo, 'createdAt' => 0];
        }
    }
    foreach ($data['bits'] as $month => $bits) {
        $amount = round($bits * (float) $est['twitchBitValue'], 2);
        if ($amount < 0.01) continue;
        $date = isset($lastByMonth[$month]) ? $lastByMonth[$month]['date'] : min(iso_day(), $month . '-28');
        $out[] = ['id' => "est-twitch-bits-$month", 'kind' => 'income', 'date' => $date, 'amount' => $amount, 'category' => 'tips', 'platform' => 'twitch',
            'label' => 'Bits Twitch (estimé)', 'note' => number_format($bits, 0, ',', ' ') . ' bits', 'status' => 'pending', 'auto' => true, 'estimated' => true, 'demo' => $demo, 'createdAt' => 0];
    }
    return $out;
}

/** Informations affichées dans « Comptes ». */
function twitch_channel_info(): array
{
    $d = db_read();
    $a = $d['twitch']['account'] ?? null;
    if (!$a) return ['connected' => false];
    $data = twitch_channel_data($d);
    $snaps = $data['snapshots'];
    usort($snaps, fn($x, $y) => strcmp($x['date'], $y['date']));
    $last = $snaps ? end($snaps) : null;
    $est = revenue_estimates_settings($d['settings']);
    $bits = $data['bits'][substr(iso_day(), 0, 7)] ?? null;
    return [
        'connected' => true,
        'demo' => !empty($a['demo']),
        'login' => $a['login'],
        'displayName' => $a['displayName'],
        'avatarUrl' => $a['avatarUrl'] ?? null,
        'followers' => $last['followers'] ?? null,
        'subscriptions' => $last['subs'] ?? null,
        'bitsThisMonth' => $bits,
        'monthlyEstimate' => $last || $bits !== null ? round(twitch_sub_revenue($last['subs'] ?? null, $est) + ($bits ?? 0) * (float) $est['twitchBitValue'], 2) : null,
        'updatedAt' => !empty($a['demo']) ? now_ms() : ($d['twitch']['updatedAt'] ?? null),
        'error' => $d['twitch']['error'] ?? null,
    ];
}
