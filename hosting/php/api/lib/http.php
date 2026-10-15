<?php

/** Erreur renvoyée par une plateforme, avec un message lisible pour l'utilisateur. */
final class PlatformError extends Exception
{
    public $details;
    public int $status;

    public function __construct(string $message, $details = null, int $status = 0)
    {
        parent::__construct($message);
        $this->details = $details;
        $this->status = $status;
    }
}

/** Pour les tests : redirige les appels vers un serveur simulé (config « api_mock_base »). */
function vp_url(string $url): string
{
    $mock = vp_config('api_mock_base');
    if ($mock && preg_match('#^https://([^/]+)(/.*)?$#', $url, $m)) {
        return rtrim($mock, '/') . '/' . $m[1] . ($m[2] ?? '/');
    }
    return $url;
}

/**
 * Requête HTTP via cURL.
 * $body : chaîne, tableau (encodé en formulaire) ou null.
 * $opts['file'] = [chemin, début, longueur] pour envoyer une portion de fichier sans la charger en mémoire.
 * Retourne [statut, en-têtes (minuscules), corps décodé (JSON si possible)].
 */
function http_request(string $method, string $url, array $headers = [], $body = null, array $opts = []): array
{
    $ch = curl_init(vp_url($url));
    $respHeaders = [];
    $h = [];
    foreach ($headers as $k => $v) $h[] = $k . ': ' . $v;

    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_CONNECTTIMEOUT => 20,
        CURLOPT_TIMEOUT => $opts['timeout'] ?? 120,
        CURLOPT_USERAGENT => preg_replace('/[^A-Za-z0-9._-]/', '', VP_APP_NAME) . '/1.0',
        CURLOPT_HEADERFUNCTION => function ($ch, $line) use (&$respHeaders) {
            $parts = explode(':', $line, 2);
            if (count($parts) === 2) $respHeaders[strtolower(trim($parts[0]))] = trim($parts[1]);
            return strlen($line);
        },
    ]);

    $fh = null;
    if (isset($opts['file'])) {
        [$path, $start, $length] = $opts['file'];
        $fh = fopen($path, 'rb');
        if (!$fh) throw new PlatformError('Fichier vidéo introuvable sur le serveur.');
        fseek($fh, $start);
        $remaining = $length;
        curl_setopt($ch, CURLOPT_UPLOAD, true);
        curl_setopt($ch, CURLOPT_INFILESIZE, $length);
        curl_setopt($ch, CURLOPT_READFUNCTION, function ($ch, $stream, $size) use ($fh, &$remaining) {
            if ($remaining <= 0) return '';
            $data = fread($fh, min($size, $remaining));
            $remaining -= strlen($data);
            return $data === false ? '' : $data;
        });
        $h[] = 'Content-Length: ' . $length;
        $h[] = 'Expect:';
    } elseif (is_array($body)) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query(array_filter($body, fn($v) => $v !== null && $v !== '')));
    } elseif (is_string($body)) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        $h[] = 'Expect:';
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $h);

    $raw = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    if ($fh) fclose($fh);

    if ($raw === false) {
        return [0, [], ['error' => ['message' => 'Erreur réseau : ' . $error]]];
    }
    // Les identifiants 64 bits (TikTok) restent exacts ; au-delà, ils deviennent des chaînes.
    $decoded = json_decode($raw, true, 512, JSON_BIGINT_AS_STRING);
    return [$status, $respHeaders, $decoded === null && $raw !== 'null' ? $raw : $decoded];
}
