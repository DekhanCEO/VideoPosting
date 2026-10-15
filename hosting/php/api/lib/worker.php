<?php
/**
 * Moteur de publication pas à pas.
 * Un hébergement mutualisé limite la durée des scripts : chaque publication est découpée en étapes courtes
 * (un morceau de vidéo, une vérification de statut…) enregistrées dans la base. Le « worker » exécute les étapes
 * après les réponses HTTP (visites de l'interface) et lors des appels cron.
 */

const ACTIVE_STATUSES = ['pending', 'uploading', 'processing'];
const MAX_LOGS = 60;

function worker_is_active(array $post): bool
{
    foreach ($post['publications'] ?? [] as $pub) if (in_array($pub['status'], ACTIVE_STATUSES, true)) return true;
    return false;
}

function compute_post_status(array $post): string
{
    $pubs = [];
    foreach ($post['platforms'] as $p) if (isset($post['publications'][$p])) $pubs[] = $post['publications'][$p];
    if (!$pubs) return $post['status'];
    foreach ($pubs as $pub) if (in_array($pub['status'], ACTIVE_STATUSES, true)) return 'publishing';
    $published = count(array_filter($pubs, fn($p) => $p['status'] === 'published'));
    if ($published === count($pubs)) return 'published';
    if ($published > 0) return 'partial';
    if (count(array_filter($pubs, fn($p) => $p['status'] === 'canceled')) === count($pubs)) return 'draft';
    return 'failed';
}

function refresh_post_status(array &$post): void
{
    $status = compute_post_status($post);
    if ($status !== $post['status']) {
        $post['status'] = $status;
        if (in_array($status, ['published', 'partial'], true) && empty($post['publishedAt'])) $post['publishedAt'] = now_ms();
    }
}

function start_publishing(string $postId, ?array $only = null): void
{
    $post = get_post($postId);
    if (!$post) throw new HttpError('Publication introuvable.', 404);
    if (empty($post['mediaId'])) throw new HttpError('Aucune vidéo associée à cette publication.', 422);
    db_update(function (array &$d) use ($postId, $only) {
        foreach ($d['posts'] as &$p) {
            if ($p['id'] !== $postId) continue;
            $targets = array_filter($only ?? $p['platforms'], fn($pl) => in_array($pl, $p['platforms'], true)
                && !in_array($p['publications'][$pl]['status'] ?? '', array_merge(ACTIVE_STATUSES, ['published']), true));
            foreach ($targets as $pl) {
                $prev = $p['publications'][$pl] ?? null;
                $attempt = ($prev['attempt'] ?? 0) + 1;
                $logs = $prev['logs'] ?? [];
                $logs[] = ['at' => now_ms(), 'level' => 'info', 'message' => "Tentative n°$attempt"];
                $p['publications'][$pl] = [
                    'platform' => $pl, 'status' => 'pending', 'progress' => 0, 'step' => 'En attente',
                    'attempt' => $attempt, 'logs' => array_slice($logs, -MAX_LOGS),
                    'job' => ['state' => 'start', 'nextAt' => 0],
                ];
            }
            if ($targets) $p['status'] = 'publishing';
            refresh_post_status($p);
            $p['updatedAt'] = now_ms();
        }
    });
    $GLOBALS['VP_KICK'] = true;
}

function cancel_publication(string $postId, ?string $platform): bool
{
    return db_update(function (array &$d) use ($postId, $platform) {
        $done = false;
        foreach ($d['posts'] as &$p) {
            if ($p['id'] !== $postId) continue;
            foreach ($p['publications'] as $pl => &$pub) {
                if (($platform && $pl !== $platform) || !in_array($pub['status'], ACTIVE_STATUSES, true)) continue;
                $pub['status'] = 'canceled';
                $pub['step'] = 'Annulée';
                $pub['error'] = 'Publication annulée.';
                $pub['finishedAt'] = now_ms();
                $pub['logs'][] = ['at' => now_ms(), 'level' => 'warn', 'message' => 'Publication annulée.'];
                unset($pub['job']);
                $done = true;
            }
            refresh_post_status($p);
        }
        return $done;
    });
}

/** Publie les posts programmés dont l'heure est arrivée. */
function run_due_posts(): void
{
    $now = now_ms();
    foreach (db_read()['posts'] as $p) {
        if ($p['status'] === 'scheduled' && !empty($p['scheduledAt']) && $p['scheduledAt'] <= $now) {
            try {
                start_publishing($p['id']);
            } catch (Throwable $e) {
                db_update(function (array &$d) use ($p) {
                    foreach ($d['posts'] as &$x) if ($x['id'] === $p['id']) $x['status'] = 'failed';
                });
            }
        }
    }
}

function has_pending_work(?array $d = null): bool
{
    $d ??= db_read();
    $now = now_ms();
    foreach ($d['posts'] as $p) {
        if ($p['status'] === 'scheduled' && !empty($p['scheduledAt']) && $p['scheduledAt'] <= $now) return true;
        if (worker_is_active($p)) return true;
    }
    return false;
}

/** Choisit la prochaine étape à exécuter (la plus anciennement servie, pour alterner entre plateformes). */
function next_task(): array
{
    $now = now_ms();
    $best = null;
    $soonest = null;
    foreach (db_read()['posts'] as $p) {
        foreach ($p['publications'] ?? [] as $pl => $pub) {
            if (!in_array($pub['status'], ACTIVE_STATUSES, true) || empty($pub['job'])) continue;
            $at = (int) ($pub['job']['nextAt'] ?? 0);
            if ($at > $now) {
                $soonest = $soonest === null ? $at : min($soonest, $at);
                continue;
            }
            $last = (int) ($pub['job']['lastRun'] ?? 0);
            if (!$best || $last < $best[2]) $best = [$p['id'], $pl, $last];
        }
    }
    return [$best, $soonest];
}

function patch_pub(string $postId, string $platform, callable $fn): void
{
    db_update(function (array &$d) use ($postId, $platform, $fn) {
        foreach ($d['posts'] as &$p) {
            if ($p['id'] !== $postId || !isset($p['publications'][$platform])) continue;
            $pub = &$p['publications'][$platform];
            if (!in_array($pub['status'], ACTIVE_STATUSES, true)) return; // annulée entre-temps
            $fn($pub, $p);
            if (count($pub['logs'] ?? []) > MAX_LOGS) $pub['logs'] = array_slice($pub['logs'], -MAX_LOGS);
            refresh_post_status($p);
            $p['updatedAt'] = now_ms();
        }
    });
}

function run_step(string $postId, string $platform): void
{
    $post = get_post($postId);
    if (!$post) return;
    $pub = $post['publications'][$platform] ?? null;
    if (!$pub || !in_array($pub['status'], ACTIVE_STATUSES, true)) return;
    $job = $pub['job'];
    patch_pub($postId, $platform, function (&$pub) {
        $pub['job']['lastRun'] = now_ms();
    });

    $name = PLATFORM_NAMES[$platform];
    try {
        $media = !empty($post['mediaId']) ? get_media($post['mediaId']) : null;
        if (!$media || $media['status'] !== 'ready') throw new PlatformError('La vidéo n\'est pas disponible.');
        $account = usable_account($platform);
        $options = resolve_options($post['common'], $post['options'])[$platform];
        $thumbId = $platform === 'youtube' ? ($post['options']['youtube']['thumbnailId'] ?? null) : null;
        $thumb = $thumbId ? get_media($thumbId) : null;
        $ctx = [
            'post' => $post, 'platform' => $platform, 'media' => $media, 'file' => media_path($media),
            'account' => $account, 'options' => $options, 'job' => $job,
            'thumbnail' => $thumb ? ['file' => media_path($thumb), 'mimeType' => $thumb['mimeType']] : null,
        ];
        if ($job['state'] === 'start') {
            patch_pub($postId, $platform, function (&$pub) use ($account, $name) {
                $pub['status'] = 'uploading';
                $pub['startedAt'] = $pub['startedAt'] ?? now_ms();
                $pub['demo'] = !empty($account['demo']);
                $pub['step'] = "Connexion à $name";
                unset($pub['error']);
                $pub['logs'][] = ['at' => now_ms(), 'level' => 'info', 'message' => "Publication sur $name" . (!empty($account['username']) ? ' (' . $account['username'] . ')' : '')];
            });
        }
        $r = !empty($account['demo']) ? demo_step($ctx) : match ($platform) {
            'youtube' => youtube_step($ctx),
            'tiktok' => tiktok_step($ctx),
            'instagram' => instagram_step($ctx),
        };
        patch_pub($postId, $platform, function (&$pub) use ($r, $name) {
            if (!empty($r['log'])) $pub['logs'][] = ['at' => now_ms(), 'level' => $r['level'] ?? 'info', 'message' => $r['log']];
            if (isset($r['done'])) {
                $pub['status'] = 'published';
                $pub['progress'] = 100;
                $pub['step'] = 'Publiée';
                $pub['externalId'] = $r['done']['externalId'] ?? null;
                $pub['url'] = $r['done']['url'] ?? null;
                $pub['finishedAt'] = now_ms();
                $pub['logs'][] = ['at' => now_ms(), 'level' => 'info', 'message' => "Publiée sur $name"];
                unset($pub['job']);
                return;
            }
            $pub['job'] = array_replace($r['job'], ['nextAt' => now_ms() + (int) (($r['delay'] ?? 0) * 1000), 'lastRun' => now_ms()]);
            if (isset($r['progress'])) {
                $pub['progress'] = max(0, min(99, (int) $r['progress']));
                $pub['status'] = $pub['progress'] >= 86 ? 'processing' : 'uploading';
            }
            if (isset($r['step'])) $pub['step'] = $r['step'];
        });
    } catch (Throwable $e) {
        $message = $e instanceof PlatformError ? $e->getMessage() : 'Erreur inattendue : ' . $e->getMessage();
        if (!$e instanceof PlatformError) error_log('[VideoPosting] ' . $e);
        patch_pub($postId, $platform, function (&$pub) use ($message) {
            $pub['status'] = 'failed';
            $pub['error'] = $message;
            $pub['step'] = 'Échec';
            $pub['finishedAt'] = now_ms();
            $pub['logs'][] = ['at' => now_ms(), 'level' => 'error', 'message' => $message];
            unset($pub['job']);
        });
    }
}

/** Exécute les étapes en attente pendant $budget secondes au maximum (un seul worker à la fois). */
function worker_run(float $budget): void
{
    ensure_data_dir();
    $lock = fopen(VP_DATA_DIR . '/worker.lock', 'c');
    if (!flock($lock, LOCK_EX | LOCK_NB)) {
        fclose($lock);
        return;
    }
    safe_call('set_time_limit', (int) $budget + 120);
    $deadline = microtime(true) + $budget;
    try {
        run_due_posts();
        while (microtime(true) < $deadline) {
            [$task, $soonest] = next_task();
            if ($task) {
                run_step($task[0], $task[1]);
                continue;
            }
            if ($soonest === null) break;
            $waitMs = $soonest - now_ms();
            if (microtime(true) + $waitMs / 1000 > $deadline) break;
            usleep(max(50, min($waitMs, 1000)) * 1000);
        }
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}

/** Tâches de fond périodiques (cron) : renouvellement des jetons et synchronisation des statistiques. */
function periodic_jobs(): void
{
    $d = db_read();
    $now = now_ms();
    if ($now - ($d['jobs']['lastTokenRefresh'] ?? 0) > 3600000) {
        db_update(function (array &$d) use ($now) { $d['jobs']['lastTokenRefresh'] = $now; });
        refresh_expiring_tokens();
    }
    if ($now - ($d['jobs']['lastStatsSync'] ?? 0) > 6 * 3600000) {
        db_update(function (array &$d) use ($now) { $d['jobs']['lastStatsSync'] = $now; });
        try {
            sync_analytics();
        } catch (Throwable $e) {
            error_log('[VideoPosting] sync ' . $e->getMessage());
        }
    }
}
