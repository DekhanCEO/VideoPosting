<?php
/** Audience (genre, âge, pays) : parts exprimées en fractions (0 → 1). */

const AGE_BUCKETS = ['13-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'];

/** Valeurs positives → fractions dont la somme vaut 1, de la plus grande à la plus petite. */
function audience_shares(array $values): array
{
    $values = array_filter(array_map('floatval', $values), fn($v) => $v > 0 && is_finite($v));
    $total = array_sum($values);
    if ($total <= 0) return [];
    $out = array_map(fn($v) => $v / $total, $values);
    arsort($out);
    return $out;
}

/** [clé => part] → [[$keyName => clé, 'share' => part], …] limité aux premières entrées. */
function audience_list(array $shares, int $limit, string $keyName): array
{
    $list = [];
    foreach (array_slice($shares, 0, $limit, true) as $k => $v) {
        $list[] = [$keyName => $keyName === 'name' ? explode(',', (string) $k)[0] : strtoupper((string) $k), 'share' => $v];
    }
    return $list;
}

/** Audience saisie à la main (TikTok ne la fournit pas par API) : pourcentages 0 → 100. */
function sanitize_manual_audience(string $platform, array $b): array
{
    $pct = fn($v) => is_numeric($v) ? max(0.0, min(100.0, (float) $v)) : 0.0;
    $gender = isset($b['gender']) && is_array($b['gender'])
        ? audience_shares(['female' => $pct($b['gender']['female'] ?? 0), 'male' => $pct($b['gender']['male'] ?? 0), 'other' => $pct($b['gender']['other'] ?? 0)])
        : [];
    $ages = [];
    if (isset($b['ages']) && is_array($b['ages'])) {
        foreach (AGE_BUCKETS as $k) $ages[$k] = $pct($b['ages'][$k] ?? 0);
        $ages = audience_shares($ages);
        // Ordre des tranches conservé.
        $ages = array_intersect_key(array_merge(array_flip(AGE_BUCKETS), $ages), $ages);
    }
    $countries = [];
    foreach (array_slice(is_array($b['countries'] ?? null) ? $b['countries'] : [], 0, 30) as $c) {
        $code = strtoupper(trim((string) ($c['code'] ?? '')));
        $share = $pct($c['share'] ?? 0) / 100;
        if (preg_match('/^[A-Z]{2}$/', $code) && $share > 0 && !isset($countries[$code])) $countries[$code] = $share;
    }
    $total = array_sum($countries);
    if ($total > 1) $countries = array_map(fn($v) => $v / $total, $countries);
    arsort($countries);
    if (!$gender && !$ages && !$countries) throw new HttpError('Renseignez au moins le genre, l\'âge ou un pays.', 422);
    return array_filter([
        'platform' => $platform,
        'source' => 'manual',
        'basis' => 'followers',
        'updatedAt' => now_ms(),
        'gender' => $gender ? ['female' => $gender['female'] ?? 0, 'male' => $gender['male'] ?? 0, 'other' => $gender['other'] ?? 0] : null,
        'ages' => $ages ?: null,
        'countries' => $countries ? audience_list($countries, 30, 'code') : null,
    ], fn($v) => $v !== null);
}

function save_manual_audience(string $platform, array $body): array
{
    $audience = sanitize_manual_audience($platform, $body);
    db_update(function (array &$d) use ($platform, $audience) { $d['analytics']['audience'][$platform] = $audience; });
    return $audience;
}

function clear_audience(string $platform): void
{
    db_update(function (array &$d) use ($platform) { unset($d['analytics']['audience'][$platform]); });
}

/** Mode démo : audience simulée, sauf pour une plateforme dont l'audience a été saisie à la main. */
function demo_audience(array $saved, array $connected): array
{
    $out = [];
    foreach (PLATFORM_IDS as $p) {
        if (($saved[$p]['source'] ?? '') === 'manual') $out[$p] = $saved[$p];
        elseif (isset($connected[$p]) || !$connected) $out[$p] = ['platform' => $p, 'source' => 'demo', 'updatedAt' => now_ms()] + DEMO_AUDIENCE[$p];
    }
    return $out;
}
