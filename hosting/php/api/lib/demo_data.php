<?php
/** Données de démonstration déterministes (recalculées pour rester alignées sur la date du jour). */

final class DemoRng
{
    private int $s;

    public function __construct(int $seed)
    {
        $this->s = ($seed & 0xFFFFFFFF) ?: 0x9E3779B9;
    }

    public function next(): float
    {
        $x = $this->s;
        $x ^= ($x << 13) & 0xFFFFFFFF;
        $x ^= $x >> 17;
        $x ^= ($x << 5) & 0xFFFFFFFF;
        $this->s = $x & 0xFFFFFFFF;
        return $this->s / 4294967296;
    }
}

function demo_hash(string $s): int
{
    return (int) hexdec(substr(sha1($s), 0, 8));
}

const DEMO_PROFILE = [
    'tiktok' => ['followers' => 14000, 'growth' => 62, 'views' => 21000, 'rpm' => 0, 'likes' => 0.085],
    'youtube' => ['followers' => 3500, 'growth' => 13, 'views' => 4200, 'rpm' => 2.4, 'likes' => 0.04],
    'instagram' => ['followers' => 7000, 'growth' => 30, 'views' => 7600, 'rpm' => 0, 'likes' => 0.06],
];

function demo_series(): array
{
    static $cache = null;
    if ($cache) return $cache;
    $days = 800;
    $today = iso_day();
    $start = add_days($today, -$days + 1);
    $snapshots = [];
    $daily = [];
    foreach (DEMO_PROFILE as $platform => $p) {
        $rng = new DemoRng(demo_hash($platform));
        $followers = $p['followers'];
        $totalViews = $p['views'] * 400;
        $totalLikes = (int) round($totalViews * $p['likes']);
        $videos = $platform === 'youtube' ? 84 : ($platform === 'tiktok' ? 212 : 160);
        $viral = 0;
        $ts = strtotime($start);
        for ($i = 0; $i < $days; $i++) {
            $date = date('Y-m-d', strtotime("+$i day", $ts));
            $wd = (int) date('w', strtotime($date));
            $weekend = ($wd === 0 || $wd === 6) ? 1.18 : 1;
            if ($rng->next() < 0.025) $viral = 2 + $rng->next() * ($platform === 'tiktok' ? 9 : 4);
            $trend = 1 + $i / $days;
            $views = (int) round($p['views'] * $trend * $weekend * (0.75 + $rng->next() * 0.5) * (1 + $viral));
            $gained = (int) round($p['growth'] * $trend * (0.6 + $rng->next() * 0.8) * (1 + $viral * 0.8) - $rng->next() * $p['growth'] * 0.25);
            $viral *= 0.62;
            if ($viral < 0.05) $viral = 0;
            $followers += $gained;
            $totalViews += $views;
            $totalLikes += (int) round($views * $p['likes'] * (0.8 + $rng->next() * 0.4));
            if ($rng->next() < ($platform === 'youtube' ? 0.12 : 0.4)) $videos++;
            $snapshots[] = ['platform' => $platform, 'date' => $date, 'followers' => $followers, 'totalViews' => $totalViews, 'totalLikes' => $totalLikes, 'videoCount' => $videos, 'demo' => true];
            $row = ['platform' => $platform, 'date' => $date, 'views' => $views, 'followersGained' => $gained, 'demo' => true];
            if ($platform === 'youtube') $row['watchMinutes'] = (int) round($views * (1.6 + $rng->next()));
            if ($p['rpm']) $row['revenue'] = round($views / 1000 * $p['rpm'] * (0.8 + $rng->next() * 0.4), 2);
            $daily[] = $row;
        }
    }
    return $cache = ['snapshots' => $snapshots, 'daily' => $daily];
}

function demo_post_metrics(string $postId, string $platform, int $publishedAt): array
{
    $rng = new DemoRng(demo_hash("$postId:$platform"));
    $hours = max(0, (now_ms() - $publishedAt) / 3600000);
    $potential = ['tiktok' => 42000, 'youtube' => 9000, 'instagram' => 16000][$platform] * (0.3 + $rng->next() * 2.2);
    $curve = 1 - exp(-$hours / 30);
    $views = (int) round($potential * $curve + min($hours, 1) * 40 * $rng->next());
    return [
        'views' => $views,
        'likes' => (int) round($views * (0.04 + $rng->next() * 0.07)),
        'comments' => (int) round($views * (0.002 + $rng->next() * 0.006)),
        'shares' => (int) round($views * (0.002 + $rng->next() * 0.01)),
        'saves' => (int) round($views * (0.003 + $rng->next() * 0.012)),
        'updatedAt' => now_ms(),
    ];
}

const DEMO_TOP_POSTS = [
    ['Ma routine du matin en 30 secondes ☀️', 3, ['tiktok', 'instagram', 'youtube']],
    ['3 erreurs que tout le monde fait en montage', 9, ['tiktok', 'youtube']],
    ['J\'ai testé le setup à 100 € vs 1000 €', 16, ['youtube', 'instagram']],
    ['Behind the scenes : tournage d\'une pub', 22, ['tiktok', 'instagram']],
    ['Comment j\'ai atteint 10 000 abonnés', 41, ['youtube', 'tiktok', 'instagram']],
    ['La lumière parfaite avec une seule lampe', 63, ['instagram', 'tiktok']],
];

function demo_revenue_entries(): array
{
    $rng = new DemoRng(424242);
    $today = iso_day();
    $entries = [];
    $now = now_ms();
    $push = function (array $e) use (&$entries, $now) {
        $entries[] = $e + ['id' => uuid4(), 'createdAt' => $now, 'demo' => true];
    };
    $brands = ['Nike', 'Samsung', 'Hello Bank!', 'Sephora', 'NordVPN', 'Decathlon', 'Fnac', 'Canva', 'HelloFresh'];
    $y = (int) substr($today, 0, 4);
    $mo = (int) substr($today, 5, 2);
    for ($m = 23; $m >= 0; $m--) {
        $monthTs = mktime(0, 0, 0, $mo - $m, 1, $y);
        $day = function (int $n) use ($monthTs, $today) {
            $d = date('Y-m-d', mktime(0, 0, 0, (int) date('n', $monthTs), min($n, 28), (int) date('Y', $monthTs)));
            return $d > $today ? $today : $d;
        };
        $growth = 0.55 + (23 - $m) * 0.045;
        $deals = $rng->next() < 0.35 ? 2 : 1;
        for ($k = 0; $k < $deals; $k++) {
            $brand = $brands[(int) floor($rng->next() * count($brands))];
            $push(['kind' => 'income', 'date' => $day(5 + (int) floor($rng->next() * 20)), 'amount' => round((350 + $rng->next() * 1500) * $growth / 10) * 10,
                'category' => 'sponsorship', 'platform' => ['tiktok', 'instagram', 'youtube'][(int) floor($rng->next() * 3)],
                'label' => "Partenariat $brand", 'partner' => $brand, 'status' => $m === 0 && $k === 0 ? 'pending' : 'received']);
        }
        $push(['kind' => 'income', 'date' => $day(12), 'amount' => round((90 + $rng->next() * 260) * $growth), 'category' => 'creator_fund', 'platform' => 'tiktok', 'label' => 'TikTok Creator Rewards', 'status' => $m === 0 ? 'pending' : 'received']);
        $push(['kind' => 'income', 'date' => $day(18), 'amount' => round((40 + $rng->next() * 180) * $growth), 'category' => 'affiliate', 'platform' => 'instagram', 'label' => 'Commissions d\'affiliation Amazon', 'status' => 'received']);
        if ($rng->next() < 0.4) $push(['kind' => 'income', 'date' => $day(22), 'amount' => round(120 + $rng->next() * 450), 'category' => 'merch', 'platform' => 'other', 'label' => 'Ventes boutique (sweats & presets)', 'status' => 'received']);
        if ($rng->next() < 0.5) $push(['kind' => 'income', 'date' => $day(26), 'amount' => round(15 + $rng->next() * 60), 'category' => 'tips', 'platform' => 'youtube', 'label' => 'Super Thanks & dons', 'status' => 'received']);
        $push(['kind' => 'expense', 'date' => $day(2), 'amount' => 11.99, 'category' => 'software', 'label' => 'CapCut Pro', 'status' => 'received']);
        $push(['kind' => 'expense', 'date' => $day(3), 'amount' => 14.99, 'category' => 'software', 'label' => 'Epidemic Sound', 'status' => 'received']);
        if ($rng->next() < 0.25) {
            $i = (int) floor($rng->next() * 3);
            $push(['kind' => 'expense', 'date' => $day(15), 'amount' => round(80 + $rng->next() * 600), 'category' => ['equipment', 'freelance', 'travel'][$i],
                'label' => ['Micro sans fil', 'Monteur freelance', 'Déplacement tournage'][$i], 'status' => 'received']);
        }
    }
    return $entries;
}
