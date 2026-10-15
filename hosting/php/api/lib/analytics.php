<?php

/** Métriques d'une vidéo : synchronisées, ou simulées en mode démo. */
function metrics_for(array $post, string $platform): ?array
{
    $pub = $post['publications'][$platform] ?? null;
    if (!$pub || $pub['status'] !== 'published') return null;
    if (!empty($pub['metrics'])) return $pub['metrics'];
    if (!empty($pub['demo'])) return demo_post_metrics($post['id'], $platform, (int) ($pub['finishedAt'] ?? $post['publishedAt'] ?? $post['updatedAt']));
    return null;
}

function sync_analytics(): array
{
    $d = db_read();
    $reports = [];
    $today = iso_day();
    foreach (list_accounts($d) as $account) {
        $platform = $account['platform'];
        if ($d['settings']['demoMode'] || !empty($account['demo'])) {
            db_update(function (array &$d) use ($platform) { $d['analytics']['sync'][$platform] = ['at' => now_ms(), 'revenueAvailable' => $platform === 'youtube']; });
            $reports[] = ['platform' => $platform, 'ok' => true];
            continue;
        }
        try {
            $a = usable_account($platform);
            $ids = [];
            foreach (db_read()['posts'] as $p) {
                $pub = $p['publications'][$platform] ?? null;
                if ($pub && $pub['status'] === 'published' && !empty($pub['externalId']) && empty($pub['demo'])) $ids[] = (string) $pub['externalId'];
            }
            $stats = match ($platform) {
                'youtube' => youtube_stats($a, $ids, 90),
                'tiktok' => tiktok_stats($a, $ids),
                'instagram' => instagram_stats($a, $ids),
            };
            db_update(function (array &$d) use ($platform, $stats, $today) {
                $postViews = 0;
                foreach ($d['posts'] as $i => $p) {
                    $pub = $p['publications'][$platform] ?? null;
                    if (!$pub || empty($pub['externalId']) || !empty($pub['demo'])) continue;
                    $m = $stats['posts'][(string) $pub['externalId']] ?? null;
                    if ($m) {
                        $d['posts'][$i]['publications'][$platform]['metrics'] = $m + ['updatedAt' => now_ms()];
                        $postViews += $m['views'];
                    }
                }
                if (!empty($stats['snapshot'])) {
                    $snap = ['platform' => $platform, 'date' => $today] + $stats['snapshot'];
                    $snap['totalViews'] ??= $postViews;
                    $d['analytics']['snapshots'] = array_values(array_filter($d['analytics']['snapshots'], fn($s) => !($s['platform'] === $platform && $s['date'] === $today && empty($s['demo']))));
                    $d['analytics']['snapshots'][] = $snap;
                }
                foreach ($stats['daily'] ?? [] as $metric) {
                    $found = false;
                    foreach ($d['analytics']['daily'] as &$m) {
                        if ($m['platform'] === $platform && $m['date'] === $metric['date'] && empty($m['demo'])) { $m = array_replace($m, $metric); $found = true; break; }
                    }
                    unset($m);
                    if (!$found) $d['analytics']['daily'][] = ['platform' => $platform] + $metric;
                }
                // Audience fournie par l'API : remplace la précédente (y compris une saisie manuelle).
                $aud = $stats['audience'] ?? [];
                if (!empty($aud['gender']) || !empty($aud['ages']) || !empty($aud['countries'])) {
                    $d['analytics']['audience'][$platform] = ['platform' => $platform, 'source' => 'api', 'updatedAt' => now_ms()] + $aud;
                }
                $d['analytics']['sync'][$platform] = array_filter([
                    'at' => now_ms(),
                    'revenueAvailable' => $stats['revenueAvailable'] ?? null,
                    'error' => !empty($stats['warnings']) ? implode(' · ', $stats['warnings']) : null,
                ], fn($v) => $v !== null);
            });
            $reports[] = ['platform' => $platform, 'ok' => true, 'warnings' => $stats['warnings'] ?? []];
        } catch (Throwable $e) {
            $msg = $e->getMessage();
            db_update(function (array &$d) use ($platform, $msg) { $d['analytics']['sync'][$platform] = array_replace($d['analytics']['sync'][$platform] ?? [], ['error' => $msg]); });
            $reports[] = ['platform' => $platform, 'ok' => false, 'error' => $msg];
        }
    }
    return $reports;
}

function value_at(array $list, string $date, string $field): ?int
{
    $found = null;
    foreach ($list as $s) {
        if ($s['date'] > $date) break;
        if (isset($s[$field])) $found = (int) $s[$field];
    }
    return $found;
}

function analytics_summary(int $range): array
{
    $d = db_read();
    $demo = (bool) $d['settings']['demoMode'];
    if ($demo) {
        $data = demo_series();
    } else {
        $data = [
            'snapshots' => array_values(array_filter($d['analytics']['snapshots'], fn($s) => empty($s['demo']))),
            'daily' => array_values(array_filter($d['analytics']['daily'], fn($m) => empty($m['demo']))),
        ];
    }
    $today = iso_day();
    $from = add_days($today, -($range - 1));
    $prevTo = add_days($from, -1);
    $prevFrom = add_days($prevTo, -($range - 1));
    $days = days_between($from, $today);

    $snaps = [];
    $dailyBy = [];
    foreach (PLATFORM_IDS as $p) {
        $list = array_values(array_filter($data['snapshots'], fn($s) => $s['platform'] === $p));
        usort($list, fn($a, $b) => strcmp($a['date'], $b['date']));
        $snaps[$p] = $list;
        $dailyBy[$p] = [];
        foreach ($data['daily'] as $m) if ($m['platform'] === $p) $dailyBy[$p][$m['date']] = $m;
    }
    $snapByDate = [];
    foreach ($snaps as $p => $list) foreach ($list as $s) $snapByDate[$p][$s['date']] = $s;

    $viewsOn = function (string $p, string $date) use ($dailyBy, $snaps, $snapByDate): ?int {
        if (isset($dailyBy[$p][$date]['views'])) return (int) $dailyBy[$p][$date]['views'];
        $cur = $snapByDate[$p][$date]['totalViews'] ?? null;
        $prev = value_at($snaps[$p], add_days($date, -1), 'totalViews');
        if ($cur === null || $prev === null) return null;
        return max(0, (int) $cur - $prev);
    };

    $bucket = $range === 365 ? 7 : 1;
    $followersSeries = [];
    $viewsSeries = [];
    for ($i = 0; $i < count($days); $i += $bucket) {
        $slice = array_slice($days, $i, $bucket);
        $last = end($slice);
        $fp = ['date' => $last];
        $vp = ['date' => $slice[0]];
        foreach (PLATFORM_IDS as $p) {
            $f = value_at($snaps[$p], $last, 'followers');
            if ($f !== null) $fp[$p] = $f;
            $total = null;
            foreach ($slice as $day) {
                $v = $viewsOn($p, $day);
                if ($v !== null) $total = ($total ?? 0) + $v;
            }
            if ($total !== null) $vp[$p] = $total;
        }
        $followersSeries[] = $fp;
        $viewsSeries[] = $vp;
    }

    $sumViews = function (string $a, string $b) use ($viewsOn): int {
        $n = 0;
        foreach (PLATFORM_IDS as $p) foreach (days_between($a, $b) as $day) $n += $viewsOn($p, $day) ?? 0;
        return $n;
    };

    $connected = [];
    foreach (list_accounts($d) as $a) $connected[$a['platform']] = $a;
    $platforms = [];
    foreach (PLATFORM_IDS as $p) {
        $list = $snaps[$p];
        $latest = $list ? end($list) : null;
        $start = value_at($list, $prevTo, 'followers');
        $views = null;
        foreach ($days as $day) {
            $v = $viewsOn($p, $day);
            if ($v !== null) $views = ($views ?? 0) + $v;
        }
        $platforms[] = [
            'platform' => $p,
            'connected' => isset($connected[$p]),
            'accountName' => $connected[$p]['name'] ?? null,
            'followers' => $latest['followers'] ?? null,
            'followersDelta' => $latest && $start !== null ? $latest['followers'] - $start : null,
            'views' => $views,
            'likes' => $latest['totalLikes'] ?? null,
            'videoCount' => $latest['videoCount'] ?? null,
            'sync' => $d['analytics']['sync'][$p] ?? new stdClass(),
        ];
    }

    $followersNow = array_sum(array_map(fn($p) => $p['followers'] ?? 0, $platforms));
    $followersBefore = 0;
    foreach (PLATFORM_IDS as $p) $followersBefore += value_at($snaps[$p], $prevTo, 'followers') ?? 0;

    $posters = [];
    foreach ($d['media'] as $m) $posters[$m['id']] = $m['posterId'] ?? null;
    $top = [];
    $previousTotals = [];
    $engNow = 0;
    $engPrev = 0;
    $viewsOfPosts = 0;
    foreach ($d['posts'] as $post) {
        if (!in_array($post['status'], ['published', 'partial'], true)) continue;
        $day = iso_day($post['publishedAt'] ?? $post['updatedAt']);
        $entry = ['postId' => $post['id'], 'title' => $post['common']['title'] ?: ($post['options']['youtube']['title'] ?: 'Sans titre'),
            'publishedAt' => $post['publishedAt'] ?? null, 'totalViews' => 0, 'totalEngagement' => 0, 'platforms' => [],
            'posterId' => $posters[$post['mediaId'] ?? ''] ?? null];
        foreach ($post['platforms'] as $p) {
            $m = metrics_for($post, $p);
            if (!$m) continue;
            $entry['platforms'][$p] = $m + ['url' => $post['publications'][$p]['url'] ?? null];
            $entry['totalViews'] += $m['views'];
            $entry['totalEngagement'] += $m['likes'] + $m['comments'] + $m['shares'] + ($m['saves'] ?? 0);
        }
        if ($day >= $from) {
            $engNow += $entry['totalEngagement'];
            $viewsOfPosts += $entry['totalViews'];
            $top[] = $entry;
        } elseif ($day >= $prevFrom) {
            $engPrev += $entry['totalEngagement'];
            foreach ($entry['platforms'] as $p => $m) {
                $t = $previousTotals[$p] ?? ['videos' => 0, 'views' => 0, 'likes' => 0, 'comments' => 0, 'shares' => 0, 'saves' => 0];
                $t['videos']++;
                foreach (['views', 'likes', 'comments', 'shares', 'saves'] as $k) $t[$k] += (int) ($m[$k] ?? 0);
                $previousTotals[$p] = $t;
            }
        }
    }
    if ($demo && count($top) < 3) {
        foreach (DEMO_TOP_POSTS as $i => [$title, $daysAgo, $plats]) {
            if ($daysAgo >= $range * 2) continue;
            if ($daysAgo >= $range) {
                // Période précédente : sert à l'évolution du taux d'influence.
                foreach ($plats as $p) {
                    $m = demo_post_metrics("sample-$i", $p, now_ms() - ($daysAgo + 5) * 86400000);
                    $t = $previousTotals[$p] ?? ['videos' => 0, 'views' => 0, 'likes' => 0, 'comments' => 0, 'shares' => 0, 'saves' => 0];
                    $t['videos']++;
                    foreach (['views', 'likes', 'comments', 'shares', 'saves'] as $k) $t[$k] += (int) ($m[$k] ?? 0);
                    $previousTotals[$p] = $t;
                }
                continue;
            }
            $publishedAt = now_ms() - $daysAgo * 86400000;
            $entry = ['postId' => "demo-$i", 'title' => $title, 'publishedAt' => $publishedAt, 'totalViews' => 0, 'totalEngagement' => 0, 'platforms' => []];
            foreach ($plats as $p) {
                $m = demo_post_metrics("sample-$i", $p, $publishedAt - 5 * 86400000);
                $entry['platforms'][$p] = $m;
                $entry['totalViews'] += $m['views'];
                $entry['totalEngagement'] += $m['likes'] + $m['comments'] + $m['shares'] + ($m['saves'] ?? 0);
            }
            $engNow += $entry['totalEngagement'];
            $viewsOfPosts += $entry['totalViews'];
            $top[] = $entry;
        }
    }
    usort($top, fn($a, $b) => $b['totalViews'] <=> $a['totalViews']);
    foreach ($top as &$t) if (!$t['platforms']) $t['platforms'] = new stdClass();
    unset($t);

    $hasPrev = (bool) array_filter($data['snapshots'], fn($s) => $s['date'] <= $prevTo);
    return [
        'range' => $range,
        'demo' => $demo,
        'kpis' => [
            'followers' => ['value' => $followersNow, 'previous' => $hasPrev ? $followersBefore : null],
            'views' => ['value' => $sumViews($from, $today), 'previous' => $hasPrev ? $sumViews($prevFrom, $prevTo) : null],
            'engagement' => ['value' => $engNow, 'previous' => $engPrev ?: null],
            'revenue' => ['value' => income_between($from, $today), 'previous' => income_between($prevFrom, $prevTo)],
        ],
        'platforms' => $platforms,
        'followersSeries' => $followersSeries,
        'viewsSeries' => $viewsSeries,
        'topPosts' => array_slice($top, 0, 100),
        'engagementRate' => $viewsOfPosts > 0 ? $engNow / $viewsOfPosts : null,
        'previousTotals' => $previousTotals ?: new stdClass(),
        'audience' => ($demo ? demo_audience($d['analytics']['audience'], $connected) : $d['analytics']['audience']) ?: new stdClass(),
    ];
}
