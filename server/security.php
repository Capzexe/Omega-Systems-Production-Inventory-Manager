<?php
declare(strict_types=1);

final class ApiError extends RuntimeException
{
    public int $status;
    public function __construct(int $status, string $message)
    {
        parent::__construct($message);
        $this->status = $status;
    }
}

function security_headers(): void
{
    header_remove('X-Powered-By');
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    header('X-Frame-Options: DENY');
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
    if (($_SERVER['HTTPS'] ?? '') === 'on') header('Strict-Transport-Security: max-age=31536000');
}

function respond(mixed $data, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($data, JSON_THROW_ON_ERROR | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function path_is_inside(string $path, string $root): bool
{
    $path = str_replace('\\', '/', $path);
    $root = rtrim(str_replace('\\', '/', $root), '/');
    if (PHP_OS_FAMILY === 'Windows') { $path = strtolower($path); $root = strtolower($root); }
    return $path === $root || str_starts_with($path, $root . '/');
}

function load_config(): array
{
    $file = getenv('OMEGA_CONFIG_FILE') ?: dirname($_SERVER['DOCUMENT_ROOT']) . '/omega-private/config.php';
    $resolved = realpath($file);
    $documentRoot = realpath($_SERVER['DOCUMENT_ROOT']);
    if (!$resolved || !$documentRoot || path_is_inside($resolved, $documentRoot)) {
        throw new ApiError(503, 'Server configuration is unavailable. Contact the administrator.');
    }
    $config = require $resolved;
    foreach (['origin', 'db_host', 'db_name', 'db_user', 'db_password', 'private_dir'] as $key) {
        if (!is_array($config) || !isset($config[$key]) || !is_string($config[$key]) || $config[$key] === '') {
            throw new ApiError(503, 'Server configuration is incomplete.');
        }
    }
    $url = parse_url($config['origin']);
    $local = ($config['environment'] ?? 'production') === 'local';
    if (!$url || !isset($url['host'], $url['scheme']) || isset($url['user']) || isset($url['pass'])
        || rtrim($config['origin'], '/') !== $url['scheme'] . '://' . $url['host'] . (isset($url['port']) ? ':' . $url['port'] : '')
        || (!$local && $url['scheme'] !== 'https')
        || ($local && !in_array($url['host'], ['localhost', '127.0.0.1'], true))) {
        throw new ApiError(503, 'Invalid server origin configuration.');
    }
    $config['origin'] = rtrim($config['origin'], '/');
    $private = realpath($config['private_dir']);
    if (!$private || path_is_inside($private, $documentRoot) || !is_writable($private)) throw new ApiError(503, 'Private storage is unavailable.');
    $config['private_dir'] = $private;
    return $config;
}

function enforce_transport(array $config): void
{
    $local = ($config['environment'] ?? 'production') === 'local';
    // Forwarded headers are deliberately not trusted. Configure HTTPS at the web server.
    if (!$local && ($_SERVER['HTTPS'] ?? '') !== 'on') {
        header('Location: ' . $config['origin'] . '/api.php', true, 308);
        exit;
    }
    if (isset($_SERVER['HTTP_ORIGIN']) && $_SERVER['HTTP_ORIGIN'] !== $config['origin']) throw new ApiError(403, 'Cross-origin requests are not allowed.');
    if (($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '') === 'cross-site') throw new ApiError(403, 'Cross-site requests are not allowed.');
}

function start_secure_session(array $config): void
{
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.use_trans_sid', '0');
    $sessionDir = $config['private_dir'] . '/sessions';
    if (!is_dir($sessionDir) && !mkdir($sessionDir, 0700, true) && !is_dir($sessionDir)) throw new ApiError(503, 'Session storage is unavailable.');
    session_save_path($sessionDir);
    $secure = ($config['environment'] ?? 'production') !== 'local';
    session_name($secure ? '__Host-omega_session' : 'omega_local_session');
    session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => $secure, 'httponly' => true, 'samesite' => 'Lax']);
    if (!session_start()) throw new ApiError(503, 'Session storage is unavailable.');
    $now = time();
    if (isset($_SESSION['account_id']) && ($now - ($_SESSION['last_seen'] ?? 0) > 1800 || $now - ($_SESSION['signed_in_at'] ?? 0) > 28800)) {
        $_SESSION = [];
        session_regenerate_id(true);
    }
    $_SESSION['last_seen'] = $now;
    $_SESSION['csrf'] ??= bin2hex(random_bytes(32));
}

function require_csrf(string $provided): void
{
    if ($provided === '' || !isset($_SESSION['csrf']) || !hash_equals($_SESSION['csrf'], $provided)) throw new ApiError(419, 'Your session token expired. Reload and try again.');
}

function rate_limit(string $directory, string $bucket, int $limit, int $seconds): void
{
    $dir = $directory . '/rate-limits';
    if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) throw new ApiError(503, 'Request limiter unavailable.');
    $file = fopen($dir . '/' . hash('sha256', $bucket) . '.json', 'c+');
    if (!$file || !flock($file, LOCK_EX)) {
        if (is_resource($file)) fclose($file);
        throw new ApiError(503, 'Request limiter unavailable.');
    }
    try {
        $state = json_decode(stream_get_contents($file), true);
        $now = time();
        if (!is_array($state) || ($state['reset'] ?? 0) <= $now) $state = ['count' => 0, 'reset' => $now + $seconds];
        if ($state['count'] >= $limit) {
            header('Retry-After: ' . max(1, $state['reset'] - $now));
            throw new ApiError(429, 'Too many requests. Try again later.');
        }
        $state['count']++;
        rewind($file);
        if (!ftruncate($file, 0) || fwrite($file, json_encode($state, JSON_THROW_ON_ERROR)) === false || !fflush($file)) throw new ApiError(503, 'Request limiter unavailable.');
    } finally { flock($file, LOCK_UN); fclose($file); }
}

function parse_json_object(string $raw): array
{
    if (strlen($raw) > 16384) throw new ApiError(413, 'Request body is too large.');
    try { $object = json_decode($raw, false, 16, JSON_THROW_ON_ERROR); }
    catch (JsonException $e) { throw new ApiError(400, 'Invalid JSON body.'); }
    if (!$object instanceof stdClass) throw new ApiError(422, 'A JSON object is required.');
    return (array) $object;
}

function request_data(): array
{
    if (strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0])) !== 'application/json') throw new ApiError(415, 'Content-Type must be application/json.');
    if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 16384) throw new ApiError(413, 'Request body is too large.');
    return parse_json_object(file_get_contents('php://input', false, null, 0, 16385));
}

function validate_fields(array $data, array $rules): array
{
    if (array_diff(array_keys($data), array_keys($rules))) throw new ApiError(422, 'Unexpected request fields.');
    $clean = [];
    foreach ($rules as $key => $rule) {
        $value = $data[$key] ?? '';
        if (!is_string($value)) throw new ApiError(422, "Invalid field: $key.");
        if ($key !== 'password') $value = trim($value);
        if (($rule['required'] ?? false) && $value === '') throw new ApiError(422, "Required field: $key.");
        if (strlen($value) > ($rule['max'] ?? 100)) throw new ApiError(422, "Field too long: $key.");
        if (isset($rule['values']) && !in_array($value, $rule['values'], true)) throw new ApiError(422, "Invalid value: $key.");
        if (($rule['id'] ?? false) && !preg_match('/\A[A-Za-z0-9_-]{1,36}\z/D', $value)) throw new ApiError(422, "Invalid identifier: $key.");
        $clean[$key] = $value;
    }
    return $clean;
}

function authorize(array $actor, string $action, ?array $item = null, ?string $assignee = null): void
{
    if (($actor['read_only'] ?? false) && !in_array($action, ['me', 'items', 'categories', 'productions', 'profiles', 'logs', 'logout'], true)) {
        throw new ApiError(403, 'Demo access is read-only. Sign in with a team account to make changes.');
    }
    if (!in_array($actor['role'], ['admin', 'crew'], true)) throw new ApiError(403, 'Access denied.');
    if (in_array($action, ['create_item', 'change_status'], true) && $actor['role'] !== 'admin') throw new ApiError(403, 'Administrator access required.');
    if ($action === 'checkout' && $assignee !== null && $actor['role'] !== 'admin' && $assignee !== $actor['id']) throw new ApiError(403, 'You may only check out equipment for yourself.');
    if ($action === 'return' && $item !== null && $actor['role'] !== 'admin' && ($item['assigned_to_id'] ?? null) !== $actor['id']) throw new ApiError(403, 'You may only return your own equipment.');
}

function uuid(): string
{
    $data = random_bytes(16);
    $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
    $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}
