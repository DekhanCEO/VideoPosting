<?php

function dashboard_data(): array
{
    $d = db_read();
    $s = $d['settings'];
    $posts = list_posts();
    $monthStart = mktime(0, 0, 0, (int) date('n'), 1) * 1000;
    $lastStart = date('Y-m-d', mktime(0, 0, 0, (int) date('n') - 1, 1));
    $lastEnd = date('Y-m-d', mktime(0, 0, 0, (int) date('n'), 0));
    $count = fn($st) => count(array_filter($posts, fn($p) => $p['status'] === $st));

    $finished = [];
    foreach ($posts as $p) foreach ($p['publications'] ?? [] as $pub) if (in_array($pub['status'], ['published', 'failed'], true)) $finished[] = $pub['status'];

    $analytics = analytics_summary(28);
    $revenue = revenue_summary(null, null);
    $last = revenue_summary($lastStart, $lastEnd);
    $upcoming = array_values(array_filter($posts, fn($p) => $p['status'] === 'scheduled'));
    usort($upcoming, fn($a, $b) => ($a['scheduledAt'] ?? 0) <=> ($b['scheduledAt'] ?? 0));
    $recent = array_values(array_filter($posts, fn($p) => !in_array($p['status'], ['draft', 'scheduled'], true)));
    usort($recent, fn($a, $b) => ($b['publishedAt'] ?? $b['updatedAt']) <=> ($a['publishedAt'] ?? $a['updatedAt']));
    $prev = $analytics['kpis']['followers']['previous'];

    return [
        'demo' => (bool) $s['demoMode'],
        'counts' => [
            'drafts' => $count('draft'),
            'scheduled' => $count('scheduled'),
            'publishing' => $count('publishing'),
            'published' => $count('published') + $count('partial'),
            'failed' => $count('failed'),
            'thisMonth' => count(array_filter($posts, fn($p) => ($p['publishedAt'] ?? 0) >= $monthStart)),
        ],
        'upcoming' => array_map('with_media', array_slice($upcoming, 0, 5)),
        'recent' => array_map('with_media', array_slice($recent, 0, 6)),
        'accounts' => array_map('public_account', list_accounts($d)),
        'audience' => [
            'total' => $analytics['kpis']['followers']['value'],
            'delta' => $prev === null ? null : $analytics['kpis']['followers']['value'] - $prev,
            'series' => array_map(fn($pt) => ['date' => $pt['date'], 'value' => ($pt['tiktok'] ?? 0) + ($pt['youtube'] ?? 0) + ($pt['instagram'] ?? 0)], $analytics['followersSeries']),
        ],
        'revenue' => ['thisMonth' => $revenue['totals']['thisMonth'], 'goal' => $s['monthlyRevenueGoal'], 'currency' => $s['currency'], 'lastMonth' => $last['totals']['income']],
        'successRate' => $finished ? count(array_filter($finished, fn($x) => $x === 'published')) / count($finished) : null,
    ];
}
