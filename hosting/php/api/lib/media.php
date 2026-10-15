<?php

const ACCEPTED_TYPES = [
    'video/mp4' => ['video', '.mp4', 20 * 1024 ** 3],
    'video/quicktime' => ['video', '.mov', 20 * 1024 ** 3],
    'video/webm' => ['video', '.webm', 20 * 1024 ** 3],
    'video/x-m4v' => ['video', '.m4v', 20 * 1024 ** 3],
    'image/jpeg' => ['image', '.jpg', 10 * 1024 ** 2],
    'image/png' => ['image', '.png', 10 * 1024 ** 2],
    'image/webp' => ['image', '.webp', 10 * 1024 ** 2],
];

function media_path(array $asset): string
{
    return media_dir() . '/' . $asset['id'] . (ACCEPTED_TYPES[$asset['mimeType']][1] ?? '');
}

/** Taille de morceau acceptée par ce serveur (post_max_size est souvent limité sur les mutualisés). */
function chunk_size(): int
{
    $limit = ini_bytes('post_max_size');
    $size = 8 * 1024 * 1024;
    if ($limit > 0) $size = min($size, $limit - 256 * 1024);
    return max(512 * 1024, $size);
}

function create_media(array $in): array
{
    $mime = (string) ($in['mimeType'] ?? '');
    $type = ACCEPTED_TYPES[$mime] ?? null;
    if (!$type) throw new HttpError('Format non pris en charge. Utilisez MP4, MOV ou WebM (ou JPG/PNG pour une image).', 422);
    $size = (int) ($in['size'] ?? 0);
    if ($size <= 0) throw new HttpError('Fichier vide.', 422);
    if ($size > $type[2]) throw new HttpError('Fichier trop volumineux.', 422);
    $free = safe_call('disk_free_space', VP_DATA_DIR);
    if (is_numeric($free) && $free < $size + 50 * 1024 * 1024) throw new HttpError('Espace disque insuffisant sur l\'hébergement.', 507);

    $asset = [
        'id' => uuid4(),
        'kind' => $type[0],
        'fileName' => str_limit($in['fileName'] ?? 'video', 200),
        'mimeType' => $mime,
        'size' => $size,
        'uploadedBytes' => 0,
        'status' => 'uploading',
        'createdAt' => now_ms(),
    ];
    ensure_space_dir();
    file_put_contents(media_path($asset), '');
    db_update(function (array &$d) use ($asset) {
        $d['media'][] = $asset;
    });
    return $asset;
}

/** Écrit un morceau à la position attendue ; les morceaux arrivent dans l'ordre. */
function write_chunk(string $id, int $offset): array
{
    $data = file_get_contents('php://input');
    if ($data === false || $data === '') throw new HttpError('Morceau vide (vérifiez post_max_size).', 400);
    $asset = get_media($id);
    if (!$asset) throw new HttpError('Média introuvable.', 404);
    $fh = fopen(media_path($asset), 'c+');
    flock($fh, LOCK_EX);
    try {
        $asset = get_media($id);
        if ($asset['status'] === 'ready') return ['uploadedBytes' => $asset['uploadedBytes']];
        if ($offset !== (int) $asset['uploadedBytes']) throw new HttpError('Position inattendue.', 409, ['expected' => (int) $asset['uploadedBytes']]);
        if ($offset + strlen($data) > $asset['size']) throw new HttpError('Le morceau dépasse la taille annoncée.', 400);
        fseek($fh, $offset);
        fwrite($fh, $data);
        fflush($fh);
        $uploaded = $offset + strlen($data);
        db_update(function (array &$d) use ($id, $uploaded) {
            foreach ($d['media'] as &$m) if ($m['id'] === $id) $m['uploadedBytes'] = $uploaded;
        });
        return ['uploadedBytes' => $uploaded];
    } finally {
        flock($fh, LOCK_UN);
        fclose($fh);
    }
}

function complete_media(string $id, array $meta): array
{
    $asset = get_media($id);
    if (!$asset) throw new HttpError('Média introuvable.', 404);
    clearstatcache();
    if ((int) $asset['uploadedBytes'] !== (int) $asset['size'] || filesize(media_path($asset)) !== (int) $asset['size']) {
        throw new HttpError('Envoi incomplet.', 409);
    }
    return db_update(function (array &$d) use ($id, $meta) {
        foreach ($d['media'] as &$m) {
            if ($m['id'] !== $id) continue;
            $m['status'] = 'ready';
            if (is_numeric($meta['duration'] ?? null) && $meta['duration'] > 0) $m['duration'] = round($meta['duration'] + 0, 2);
            if (is_numeric($meta['width'] ?? null)) $m['width'] = (int) $meta['width'];
            if (is_numeric($meta['height'] ?? null)) $m['height'] = (int) $meta['height'];
            if (is_uuid($meta['posterId'] ?? null)) $m['posterId'] = $meta['posterId'];
            return $m;
        }
        return null;
    });
}

function delete_media_if_unused(?string $id): void
{
    if (!$id) return;
    $d = db_read();
    foreach ($d['posts'] as $p) {
        if (($p['mediaId'] ?? null) === $id || ($p['options']['youtube']['thumbnailId'] ?? null) === $id || in_array($id, $p['imageIds'] ?? [], true)) return;
    }
    $asset = get_media($id);
    if (!$asset) return;
    @unlink(media_path($asset));
    db_update(function (array &$d) use ($id) {
        $d['media'] = array_values(array_filter($d['media'], fn($m) => $m['id'] !== $id));
    });
    if (!empty($asset['posterId'])) delete_media_if_unused($asset['posterId']);
}

function media_signature(string $space, string $id, int $exp): string
{
    return sign_value("media|$space|$id|$exp");
}

/** URL temporaire et signée : Instagram télécharge la vidéo depuis l'hébergement. */
function signed_media_url(string $id, int $ttl = 21600): string
{
    $exp = time() + $ttl;
    $space = current_space();
    return public_url() . '/api/index.php?r=' . rawurlencode('/media/' . $id . '/public') . '&u=' . $space . '&exp=' . $exp . '&sig=' . media_signature($space, $id, $exp);
}

function verify_media_signature(string $space, string $id, $exp, $sig): bool
{
    if (!is_string($exp) || !ctype_digit($exp) || (int) $exp < time() || !is_string($sig)) return false;
    return hash_equals(media_signature($space, $id, (int) $exp), $sig);
}

/** Diffuse le fichier avec prise en charge des requêtes Range (lecture vidéo, téléchargement par Instagram). */
function stream_media(array $asset): void
{
    $file = media_path($asset);
    if (!is_file($file)) throw new HttpError('Introuvable', 404);
    $size = filesize($file);
    $start = 0;
    $end = $size - 1;
    $status = 200;
    if (isset($_SERVER['HTTP_RANGE']) && preg_match('/bytes=(\d*)-(\d*)/', $_SERVER['HTTP_RANGE'], $m) && $size > 0) {
        if ($m[1] !== '') $start = (int) $m[1];
        if ($m[2] !== '') $end = min((int) $m[2], $size - 1);
        if ($m[1] === '' && $m[2] !== '') { $start = max(0, $size - (int) $m[2]); $end = $size - 1; }
        if ($start > $end || $start >= $size) {
            http_response_code(416);
            header("Content-Range: bytes */$size");
            return;
        }
        $status = 206;
    }
    while (ob_get_level() > 0) ob_end_clean();
    safe_call('set_time_limit', 0);
    http_response_code($status);
    header('Content-Type: ' . $asset['mimeType']);
    header('Accept-Ranges: bytes');
    header('Cache-Control: private, max-age=3600');
    header('Content-Length: ' . ($end - $start + 1));
    if ($status === 206) header("Content-Range: bytes $start-$end/$size");
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'HEAD') return;
    $fh = fopen($file, 'rb');
    fseek($fh, $start);
    $left = $end - $start + 1;
    while ($left > 0 && !feof($fh) && !connection_aborted()) {
        $buf = fread($fh, min(1024 * 1024, $left));
        if ($buf === false) break;
        echo $buf;
        flush();
        $left -= strlen($buf);
    }
    fclose($fh);
}
