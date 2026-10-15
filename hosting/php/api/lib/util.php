<?php

final class HttpError extends Exception
{
    public int $status;
    public array $extra;

    public function __construct(string $message, int $status = 400, array $extra = [])
    {
        parent::__construct($message);
        $this->status = $status;
        $this->extra = $extra;
    }
}

function now_ms(): int
{
    return (int) floor(microtime(true) * 1000);
}

function uuid4(): string
{
    $b = random_bytes(16);
    $b[6] = chr((ord($b[6]) & 0x0f) | 0x40);
    $b[8] = chr((ord($b[8]) & 0x3f) | 0x80);
    $h = bin2hex($b);
    return substr($h, 0, 8) . '-' . substr($h, 8, 4) . '-' . substr($h, 12, 4) . '-' . substr($h, 16, 4) . '-' . substr($h, 20);
}

function is_uuid($v): bool
{
    return is_string($v) && preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $v) === 1;
}

function json_out($data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION);
}

function request_json(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === '' || $raw === false) return [];
    $data = json_decode($raw, true);
    if (!is_array($data)) throw new HttpError('Corps de requête JSON invalide.', 400);
    return $data;
}

function str_limit($v, int $max, string $default = ''): string
{
    if (!is_string($v) && !is_numeric($v)) return $default;
    $s = (string) $v;
    return mb_substr($s, 0, $max);
}

function bool_val($v, bool $default = false): bool
{
    return is_bool($v) ? $v : $default;
}

function num_val($v, float $min, float $max, float $default = 0)
{
    if (!is_numeric($v)) return $default;
    $n = $v + 0;
    return max($min, min($max, $n));
}

function string_list($v, int $maxItems, int $maxLen): array
{
    if (!is_array($v)) return [];
    $out = [];
    foreach ($v as $item) {
        if (!is_string($item)) continue;
        $item = trim($item);
        if ($item === '') continue;
        $out[] = mb_substr($item, 0, $maxLen);
        if (count($out) >= $maxItems) break;
    }
    return $out;
}

/** Date locale AAAA-MM-JJ. */
function iso_day($ms = null): string
{
    $ts = $ms === null ? time() : (int) floor($ms / 1000);
    return date('Y-m-d', $ts);
}

function add_days(string $day, int $n): string
{
    return date('Y-m-d', strtotime($day . ' ' . ($n >= 0 ? '+' : '') . $n . ' day'));
}

function days_between(string $from, string $to): array
{
    $out = [];
    for ($d = $from; $d <= $to; $d = add_days($d, 1)) $out[] = $d;
    return $out;
}

function last_months(string $endDay, int $count): array
{
    $y = (int) substr($endDay, 0, 4);
    $m = (int) substr($endDay, 5, 2);
    $out = [];
    for ($i = $count - 1; $i >= 0; $i--) {
        $ts = mktime(0, 0, 0, $m - $i, 1, $y);
        $out[] = date('Y-m', $ts);
    }
    return $out;
}

function day_ms(string $day): int
{
    return strtotime($day . ' 00:00:00') * 1000;
}

/** Valeur de php.ini convertie en octets (ex. « 64M »). */
function ini_bytes(string $key): int
{
    $v = trim((string) ini_get($key));
    if ($v === '') return 0;
    $unit = strtolower(substr($v, -1));
    $n = (float) $v;
    return (int) match ($unit) {
        'g' => $n * 1024 ** 3,
        'm' => $n * 1024 ** 2,
        'k' => $n * 1024,
        default => $n,
    };
}

/**
 * Termine la réponse HTTP puis continue le traitement en arrière-plan
 * (PHP-FPM, LiteSpeed, ou repli « Connection: close »).
 */
/** Appelle une fonction PHP seulement si l'hébergeur ne l'a pas désactivée. */
function safe_call(string $fn, ...$args)
{
    return function_exists($fn) ? @$fn(...$args) : null;
}

function finish_request(): void
{
    safe_call('ignore_user_abort', true);
    if (function_exists('fastcgi_finish_request')) {
        fastcgi_finish_request();
        return;
    }
    if (function_exists('litespeed_finish_request')) {
        litespeed_finish_request();
        return;
    }
    $out = '';
    while (ob_get_level() > 0) $out .= ob_get_clean();
    header('Connection: close');
    header('Content-Length: ' . strlen($out));
    echo $out;
    safe_call('flush');
}

function vp_rand_float(): float
{
    return random_int(0, PHP_INT_MAX) / PHP_INT_MAX;
}
