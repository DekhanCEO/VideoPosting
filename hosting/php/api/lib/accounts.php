<?php

function list_accounts(?array $d = null): array
{
    $d ??= db_read();
    $demo = (bool) $d['settings']['demoMode'];
    return array_values(array_filter($d['accounts'], fn($a) => (bool) ($a['demo'] ?? false) === $demo));
}

function get_account(string $platform): ?array
{
    foreach (list_accounts() as $a) if ($a['platform'] === $platform) return $a;
    return null;
}

function public_account(array $a): array
{
    $now = now_ms();
    $expired = !empty($a['expiresAt']) && $a['expiresAt'] < $now && empty($a['refreshToken']) && $a['platform'] !== 'instagram';
    $refreshExpired = !empty($a['refreshExpiresAt']) && $a['refreshExpiresAt'] < $now;
    $igExpired = $a['platform'] === 'instagram' && !empty($a['expiresAt']) && $a['expiresAt'] < $now;
    $meta = $a['meta'] ?? [];
    return [
        'platform' => $a['platform'],
        'name' => $a['name'],
        'username' => $a['username'] ?? null,
        'avatarUrl' => $a['avatarUrl'] ?? null,
        'expiresAt' => $a['expiresAt'] ?? null,
        'connectedAt' => $a['connectedAt'],
        'demo' => (bool) ($a['demo'] ?? false),
        'needsReconnect' => empty($a['demo']) && ($expired || $refreshExpired || $igExpired || !empty($meta['needsReconnect'])),
        'meta' => isset($meta['loginType']) ? ['loginType' => $meta['loginType'], 'pageName' => $meta['pageName'] ?? null] : null,
    ];
}

function save_account(array $account): void
{
    db_update(function (array &$d) use ($account) {
        $demo = (bool) ($account['demo'] ?? false);
        $d['accounts'] = array_values(array_filter($d['accounts'], fn($a) => !($a['platform'] === $account['platform'] && (bool) ($a['demo'] ?? false) === $demo)));
        $d['accounts'][] = $account;
    });
}

function patch_account(string $platform, bool $demo, array $patch): void
{
    db_update(function (array &$d) use ($platform, $demo, $patch) {
        foreach ($d['accounts'] as &$a) {
            if ($a['platform'] === $platform && (bool) ($a['demo'] ?? false) === $demo) $a = array_replace($a, $patch);
        }
    });
}

function remove_account(string $platform): void
{
    db_update(function (array &$d) use ($platform) {
        $demo = (bool) $d['settings']['demoMode'];
        $d['accounts'] = array_values(array_filter($d['accounts'], fn($a) => !($a['platform'] === $platform && (bool) ($a['demo'] ?? false) === $demo)));
    });
}

/** Compte connecté avec un jeton valide (renouvelé si besoin). */
function usable_account(string $platform, int $minValidityMs = 600000): array
{
    $a = get_account($platform);
    if (!$a) throw new PlatformError('Aucun compte ' . PLATFORM_NAMES[$platform] . ' connecté : connectez-le dans « Comptes ».');
    if (!empty($a['demo'])) return $a;
    $now = now_ms();
    if (empty($a['expiresAt']) || $a['expiresAt'] - $now >= $minValidityMs) return $a;
    // Le jeton Instagram longue durée ne peut être renouvelé qu'après 24 h.
    if ($platform === 'instagram' && $now - $a['connectedAt'] < 86400000 && $a['expiresAt'] > $now) return $a;
    try {
        $patch = match ($platform) {
            'youtube' => youtube_refresh($a, credentials('youtube')),
            'tiktok' => tiktok_refresh($a, credentials('tiktok')),
            'instagram' => instagram_refresh($a, credentials('instagram')),
        };
        $patch['meta'] = array_replace($a['meta'] ?? [], ['needsReconnect' => false]);
        patch_account($platform, false, $patch);
        return array_replace($a, $patch);
    } catch (Throwable $e) {
        patch_account($platform, false, ['meta' => array_replace($a['meta'] ?? [], ['needsReconnect' => true])]);
        throw $e instanceof PlatformError ? $e : new PlatformError('Session expirée : reconnectez votre compte ' . PLATFORM_NAMES[$platform] . '.');
    }
}

function refresh_expiring_tokens(): void
{
    foreach (list_accounts() as $a) {
        if (!empty($a['demo']) || empty($a['expiresAt'])) continue;
        $margin = $a['platform'] === 'instagram' ? 10 * 86400000 : 1800000;
        if ($a['expiresAt'] - now_ms() < $margin) {
            try {
                usable_account($a['platform'], $margin);
            } catch (Throwable $e) {
                // signalé dans l'interface via needsReconnect
            }
        }
    }
}

function demo_account(string $platform): array
{
    return [
        'platform' => $platform,
        'externalId' => 'demo-' . $platform,
        'name' => 'Léa Créations',
        'username' => $platform === 'youtube' ? '@leacreations' : 'lea.creations',
        'accessToken' => 'demo',
        'expiresAt' => now_ms() + 365 * 86400000,
        'demo' => true,
        'connectedAt' => now_ms(),
    ];
}
