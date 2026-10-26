<?php
declare(strict_types=1);
require __DIR__ . '/../server/security.php';
$count = 0;
function check(bool $condition, string $name): void {
    global $count;
    if (!$condition) throw new RuntimeException($name);
    $count++;
}
function rejects(callable $operation, int $status, string $name): void {
    try { $operation(); } catch (ApiError $e) { check($e->status === $status, $name); return; }
    throw new RuntimeException('Expected rejection: ' . $name);
}
$rules = ['id' => ['required' => true, 'id' => true, 'max' => 36], 'name' => ['required' => true, 'max' => 100]];
check(validate_fields(['id' => 'i1', 'name' => ' Camera '], $rules)['name'] === 'Camera', 'trim bounded strings');
rejects(fn() => validate_fields(['id' => 'i1', 'name' => 'camera', 'role' => 'admin'], $rules), 422, 'mass assignment rejected');
rejects(fn() => validate_fields(['id' => ['i1'], 'name' => 'camera'], $rules), 422, 'nested ID rejected');
rejects(fn() => validate_fields(['id' => 'i1', 'name' => ['nested' => 'value']], $rules), 422, 'nested string rejected');
rejects(fn() => validate_fields(['id' => "i1' OR 1=1 --", 'name' => 'camera'], $rules), 422, 'SQL-like identifier rejected');
rejects(fn() => validate_fields(['id' => 'i1', 'name' => str_repeat('x', 101)], $rules), 422, 'oversized string rejected');
rejects(fn() => validate_fields(['id' => 'i1', 'name' => '  '], $rules), 422, 'empty trimmed string rejected');
rejects(fn() => parse_json_object('{bad'), 400, 'malformed JSON rejected');
rejects(fn() => parse_json_object('[]'), 422, 'JSON list rejected');
rejects(fn() => parse_json_object('null'), 422, 'JSON null rejected');
rejects(fn() => parse_json_object(str_repeat('x', 16385)), 413, 'body length bounded');
check(parse_json_object('{}') === [], 'empty object supported for logout');
$crew = ['id' => 'u2', 'role' => 'crew'];
$admin = ['id' => 'u1', 'role' => 'admin'];
rejects(fn() => authorize($crew, 'create_item'), 403, 'crew cannot create');
rejects(fn() => authorize($crew, 'change_status'), 403, 'crew cannot change status');
rejects(fn() => authorize($crew, 'checkout', null, 'u1'), 403, 'crew cannot impersonate checkout assignee');
rejects(fn() => authorize($crew, 'return', ['assigned_to_id' => 'u1']), 403, 'crew cannot return another user equipment');
authorize($crew, 'checkout', null, 'u2');
authorize($crew, 'return', ['assigned_to_id' => 'u2']);
authorize($admin, 'return', ['assigned_to_id' => 'u2']);
check(true, 'authorized transitions allowed');
$_SESSION = ['csrf' => str_repeat('a', 64)];
require_csrf(str_repeat('a', 64));
rejects(fn() => require_csrf(''), 419, 'missing CSRF rejected');
rejects(fn() => require_csrf(str_repeat('b', 64)), 419, 'wrong CSRF rejected');
check(path_is_inside('/srv/public_html/.env', '/srv/public_html'), 'webroot secrets rejected');
check(!path_is_inside('/srv/public_html-private/config.php', '/srv/public_html'), 'sibling private storage permitted');
check(path_is_inside('/srv/public_html', '/srv/public_html'), 'webroot itself rejected');
check((bool) preg_match('/^[a-f0-9-]{36}$/', uuid()), 'cryptographic UUID format');
$dir = sys_get_temp_dir() . '/omega-test-' . bin2hex(random_bytes(6));
mkdir($dir, 0700);
try {
    rate_limit($dir, 'fixed-client', 2, 60);
    rate_limit($dir, 'fixed-client', 2, 60);
    rejects(fn() => rate_limit($dir, 'fixed-client', 2, 60), 429, 'persistent rate limit enforced');
    rate_limit($dir, 'other-client', 2, 60);
    check(true, 'rate buckets independent');
} finally {
    foreach (glob($dir . '/rate-limits/*.json') as $file) unlink($file);
    rmdir($dir . '/rate-limits'); rmdir($dir);
}
echo "$count security assertions passed.\n";
