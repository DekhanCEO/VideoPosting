<?php
/** Publication simulée (mode démo). Astuce : « #echec » dans un texte simule une erreur. */

function demo_step(array $ctx): array
{
    $job = $ctx['job'];
    $platform = $ctx['platform'];
    $name = PLATFORM_NAMES[$platform];
    if ($job['state'] === 'start') {
        $factor = min(3, max(1, $ctx['media']['size'] / (60 * 1024 * 1024)));
        $upload = (int) ((3500 + random_int(0, 3000)) * $factor);
        return ['job' => ['state' => 'run', 'startedAt' => now_ms(), 'upload' => $upload, 'processing' => 2500 + random_int(0, 1500)], 'progress' => 2, 'step' => "Connexion à $name", 'delay' => 0.5, 'log' => 'Mode démo : aucune donnée n\'est réellement envoyée.'];
    }
    $elapsed = now_ms() - $job['startedAt'];
    $steps = [
        'tiktok' => ['Envoi vers TikTok', 'TikTok traite la vidéo'],
        'youtube' => ['Envoi de la vidéo vers YouTube', 'YouTube finalise la vidéo'],
        'instagram' => ['Envoi de la vidéo vers Instagram', 'Instagram traite la vidéo'],
    ][$platform];
    if (($ctx['kind'] ?? 'video') === 'photo') $steps = ["Envoi des photos vers $name", "$name traite les photos"];
    if ($elapsed < $job['upload']) {
        return ['job' => $job, 'progress' => 5 + (int) round($elapsed / $job['upload'] * 80), 'step' => $steps[0], 'delay' => 0.5];
    }
    if (preg_match('/#echec\b/i', json_encode($ctx['options'], JSON_UNESCAPED_UNICODE))) {
        throw new PlatformError("Erreur simulée (#echec présent dans le texte $name).");
    }
    if ($elapsed < $job['upload'] + $job['processing']) {
        return ['job' => $job, 'progress' => 86 + (int) round(($elapsed - $job['upload']) / $job['processing'] * 12), 'step' => $steps[1], 'delay' => 0.5];
    }
    return ['done' => ['externalId' => 'demo_' . bin2hex(random_bytes(5)), 'url' => null]];
}
