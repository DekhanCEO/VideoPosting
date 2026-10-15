<?php

const INCOME_CATEGORIES = ['sponsorship', 'ads', 'creator_fund', 'affiliate', 'merch', 'subscriptions', 'tips', 'other_income'];
const EXPENSE_CATEGORIES = ['equipment', 'software', 'freelance', 'ads_spend', 'travel', 'other_expense'];

function sanitize_revenue(array $in): array
{
    $kind = ($in['kind'] ?? '') === 'expense' ? 'expense' : 'income';
    $category = (string) ($in['category'] ?? '');
    $allowed = $kind === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    if (!in_array($category, $allowed, true)) throw new HttpError('Catégorie incompatible avec le type d\'écriture.', 422);
    $date = (string) ($in['date'] ?? '');
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) throw new HttpError('Date invalide.', 422);
    $amount = $in['amount'] ?? null;
    if (!is_numeric($amount) || $amount <= 0 || $amount > 10000000) throw new HttpError('Montant invalide.', 422);
    $label = trim(str_limit($in['label'] ?? '', 120));
    if ($label === '') throw new HttpError('Le libellé est obligatoire.', 422);
    $platform = $in['platform'] ?? null;
    return array_filter([
        'kind' => $kind,
        'date' => $date,
        'amount' => round($amount + 0, 2),
        'category' => $category,
        'platform' => (is_platform($platform) || $platform === 'twitch' || $platform === 'other') ? $platform : null,
        'label' => $label,
        'partner' => isset($in['partner']) ? trim(str_limit($in['partner'], 120)) : null,
        'postId' => is_uuid($in['postId'] ?? null) ? $in['postId'] : null,
        'status' => ($in['status'] ?? '') === 'pending' ? 'pending' : 'received',
        'note' => isset($in['note']) ? str_limit($in['note'], 1000) : null,
    ], fn($v) => $v !== null && $v !== '');
}

function ensure_demo_revenue(): void
{
    $d = db_read();
    if (!$d['settings']['demoMode'] || !empty($d['demoRevenueSeeded'])) return;
    db_update(function (array &$d) {
        if (!empty($d['demoRevenueSeeded'])) return;
        array_push($d['revenues'], ...demo_revenue_entries());
        $d['demoRevenueSeeded'] = true;
    });
}

function manual_revenues(): array
{
    ensure_demo_revenue();
    $d = db_read();
    $demo = (bool) $d['settings']['demoMode'];
    return array_values(array_filter($d['revenues'], fn($r) => (bool) ($r['demo'] ?? false) === $demo));
}

/** Revenus publicitaires YouTube estimés (YouTube Analytics), regroupés par mois. */
function youtube_ads_entries(): array
{
    $d = db_read();
    $demo = (bool) $d['settings']['demoMode'];
    $daily = $demo ? demo_series()['daily'] : array_filter($d['analytics']['daily'], fn($m) => empty($m['demo']));
    $byMonth = [];
    foreach ($daily as $m) {
        if ($m['platform'] !== 'youtube' || empty($m['revenue'])) continue;
        $k = substr($m['date'], 0, 7);
        $byMonth[$k] ??= ['amount' => 0, 'last' => $m['date']];
        $byMonth[$k]['amount'] += $m['revenue'];
        if ($m['date'] > $byMonth[$k]['last']) $byMonth[$k]['last'] = $m['date'];
    }
    $out = [];
    foreach ($byMonth as $month => $v) {
        $out[] = ['id' => "yt-ads-$month", 'kind' => 'income', 'date' => $v['last'], 'amount' => round($v['amount'], 2), 'category' => 'ads',
            'platform' => 'youtube', 'label' => 'Revenus publicitaires YouTube (estimés)', 'status' => 'received', 'auto' => true, 'demo' => $demo, 'createdAt' => 0];
    }
    return $out;
}

/** Vues par jour : métriques quotidiennes si disponibles, sinon écart entre deux relevés consécutifs. */
function daily_views(array $snapshots, array $daily, string $platform): array
{
    $out = [];
    $list = array_values(array_filter($snapshots, fn($s) => $s['platform'] === $platform && isset($s['totalViews'])));
    usort($list, fn($a, $b) => strcmp($a['date'], $b['date']));
    for ($i = 1; $i < count($list); $i++) $out[$list[$i]['date']] = max(0, (int) $list[$i]['totalViews'] - (int) $list[$i - 1]['totalViews']);
    foreach ($daily as $m) if ($m['platform'] === $platform && isset($m['views'])) $out[$m['date']] = (int) $m['views'];
    return $out;
}

/** Estimations : TikTok / Instagram (vues du mois × RPM) et Twitch (abonnements, bits). */
function estimated_entries(): array
{
    $d = db_read();
    $demo = (bool) $d['settings']['demoMode'];
    $est = revenue_estimates_settings($d['settings']);
    if (!$est['enabled']) return [];
    $data = $demo ? demo_series() : [
        'snapshots' => array_values(array_filter($d['analytics']['snapshots'], fn($s) => empty($s['demo']))),
        'daily' => array_values(array_filter($d['analytics']['daily'], fn($m) => empty($m['demo']))),
    ];
    $today = iso_day();
    $out = [];
    foreach (['tiktok' => ['tiktokRpm', 'Programme créateurs TikTok'], 'instagram' => ['instagramRpm', 'Bonus et programmes Instagram']] as $p => [$key, $label]) {
        $rpm = (float) $est[$key];
        if ($rpm <= 0) continue;
        $byMonth = [];
        foreach (daily_views($data['snapshots'], $data['daily'], $p) as $date => $views) {
            if ($date > $today) continue;
            $m = substr($date, 0, 7);
            $byMonth[$m] ??= ['views' => 0, 'last' => $date];
            $byMonth[$m]['views'] += $views;
            if ($date > $byMonth[$m]['last']) $byMonth[$m]['last'] = $date;
        }
        foreach ($byMonth as $month => $v) {
            $amount = round($v['views'] / 1000 * $rpm, 2);
            if ($amount < 0.01) continue;
            $out[] = ['id' => "est-$p-$month", 'kind' => 'income', 'date' => $v['last'], 'amount' => $amount, 'category' => 'creator_fund', 'platform' => $p,
                'label' => "$label (estimé)", 'note' => number_format($v['views'], 0, ',', ' ') . ' vues × ' . number_format($rpm, 2, ',', ' ') . ' pour 1 000 vues',
                'status' => 'pending', 'auto' => true, 'estimated' => true, 'demo' => $demo, 'createdAt' => 0];
        }
    }
    return array_merge($out, twitch_estimate_entries($d, $est, $demo));
}

function all_revenues(): array
{
    $all = array_merge(manual_revenues(), youtube_ads_entries(), estimated_entries());
    usort($all, fn($a, $b) => strcmp($b['date'], $a['date']) ?: (($b['createdAt'] ?? 0) <=> ($a['createdAt'] ?? 0)));
    return $all;
}

function sum_amounts(array $list): float
{
    return round(array_sum(array_column($list, 'amount')), 2);
}

function income_between(string $from, string $to): float
{
    return sum_amounts(array_filter(all_revenues(), fn($e) => $e['kind'] === 'income' && $e['date'] >= $from && $e['date'] <= $to));
}

function revenue_summary(?string $from, ?string $to): array
{
    $s = db_read()['settings'];
    $to ??= iso_day();
    $from ??= add_days($to, -364);
    $span = (int) round((strtotime($to) - strtotime($from)) / 86400) + 1;
    $prevTo = add_days($from, -1);
    $prevFrom = add_days($prevTo, -($span - 1));
    $all = all_revenues();
    $inRange = array_values(array_filter($all, fn($e) => $e['date'] >= $from && $e['date'] <= $to));
    $income = array_values(array_filter($inRange, fn($e) => $e['kind'] === 'income'));
    $expenses = array_values(array_filter($inRange, fn($e) => $e['kind'] === 'expense'));
    $currentMonth = substr(iso_day(), 0, 7);

    $byMonth = [];
    foreach (last_months($to, 12) as $month) {
        $inc = [];
        $exp = 0;
        foreach ($all as $e) {
            if (substr($e['date'], 0, 7) !== $month) continue;
            if ($e['kind'] === 'income') $inc[$e['category']] = round(($inc[$e['category']] ?? 0) + $e['amount'], 2);
            else $exp += $e['amount'];
        }
        $byMonth[] = ['month' => $month, 'income' => $inc ?: new stdClass(), 'expenses' => round($exp, 2)];
    }
    $cat = [];
    $plat = [];
    foreach ($income as $e) {
        $cat[$e['category']] = ($cat[$e['category']] ?? 0) + $e['amount'];
        $p = $e['platform'] ?? 'other';
        $plat[$p] = ($plat[$p] ?? 0) + $e['amount'];
    }
    arsort($cat);
    arsort($plat);
    $sumIncome = sum_amounts($income);
    $sumExp = sum_amounts($expenses);
    return [
        'currency' => $s['currency'],
        'monthlyGoal' => $s['monthlyRevenueGoal'],
        'from' => $from,
        'to' => $to,
        'totals' => [
            'income' => $sumIncome,
            'expenses' => $sumExp,
            'net' => round($sumIncome - $sumExp, 2),
            'pending' => sum_amounts(array_filter($income, fn($e) => $e['status'] === 'pending')),
            'incomePrevious' => sum_amounts(array_filter($all, fn($e) => $e['kind'] === 'income' && $e['date'] >= $prevFrom && $e['date'] <= $prevTo)),
            'thisMonth' => sum_amounts(array_filter($all, fn($e) => $e['kind'] === 'income' && substr($e['date'], 0, 7) === $currentMonth)),
        ],
        'byMonth' => $byMonth,
        'byCategory' => array_map(fn($k, $v) => ['category' => $k, 'amount' => round($v, 2)], array_keys($cat), $cat),
        'byPlatform' => array_map(fn($k, $v) => ['platform' => $k, 'amount' => round($v, 2)], array_keys($plat), $plat),
        'entries' => $inRange,
        'youtubeAdsIncluded' => (bool) array_filter($inRange, fn($e) => !empty($e['auto']) && empty($e['estimated'])),
        'estimatedIncome' => sum_amounts(array_filter($income, fn($e) => !empty($e['estimated']))),
    ];
}

function create_revenue(array $in): array
{
    $entry = sanitize_revenue($in) + ['id' => uuid4(), 'demo' => (bool) db_read()['settings']['demoMode'], 'createdAt' => now_ms()];
    db_update(function (array &$d) use ($entry) { $d['revenues'][] = $entry; });
    return $entry;
}

function update_revenue(string $id, array $in): array
{
    $clean = sanitize_revenue($in);
    $r = db_update(function (array &$d) use ($id, $clean) {
        foreach ($d['revenues'] as &$e) {
            if ($e['id'] !== $id) continue;
            $e = array_merge(['id' => $e['id'], 'demo' => $e['demo'] ?? false, 'createdAt' => $e['createdAt']], $clean);
            return $e;
        }
        return null;
    });
    if (!$r) throw new HttpError('Écriture introuvable.', 404);
    return $r;
}

function delete_revenue(string $id): void
{
    db_update(function (array &$d) use ($id) {
        $d['revenues'] = array_values(array_filter($d['revenues'], fn($e) => $e['id'] !== $id));
    });
}

function revenue_csv(array $entries): string
{
    $labels = ['income' => 'Revenu', 'expense' => 'Dépense', 'received' => 'Reçu', 'pending' => 'En attente'];
    $esc = fn($v) => preg_match('/[;"\n]/', (string) $v) ? '"' . str_replace('"', '""', (string) $v) . '"' : (string) $v;
    $rows = [implode(';', ['Date', 'Type', 'Libellé', 'Catégorie', 'Plateforme', 'Partenaire', 'Montant', 'Statut', 'Note'])];
    foreach ($entries as $e) {
        $amount = number_format($e['kind'] === 'expense' ? -$e['amount'] : $e['amount'], 2, ',', '');
        $rows[] = implode(';', array_map($esc, [$e['date'], $labels[$e['kind']], $e['label'], $e['category'], $e['platform'] ?? '', $e['partner'] ?? '', $amount, $labels[$e['status']], $e['note'] ?? '']));
    }
    return "\u{FEFF}" . implode("\n", $rows);
}
