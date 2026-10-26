<?php
declare(strict_types=1);
// CLI only. Password is read from stdin, never command-line arguments or HTTP.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$helpers = is_file(__DIR__ . '/../server/security.php') ? __DIR__ . '/../server' : dirname(__DIR__) . '/public_html/_server';
require $helpers . '/security.php';
require $helpers . '/database.php';
if ($argc !== 4) exit("Usage: php tools/manage-user.php /absolute/private/config.php profile-id login < password-file\n");
try {
    $config = require $argv[1];
    $input = validate_fields(['profile' => $argv[2], 'login' => strtolower($argv[3])], ['profile' => ['required' => true, 'id' => true, 'max' => 36], 'login' => ['required' => true, 'max' => 100]]);
    $password = rtrim(stream_get_contents(STDIN, 1024), "\r\n");
    if (strlen($password) < 14 || strlen($password) > 72) throw new RuntimeException('Password must be 14–72 bytes.');
    $db = connect_database($config);
    require_record($db, 'profiles', $input['profile']);
    $existing = rows($db, 'SELECT profile_id FROM omega_accounts WHERE login = ?', [$input['login']]);
    if ($existing && $existing[0]['profile_id'] !== $input['profile']) throw new RuntimeException('Login is already assigned to another profile.');
    query($db, 'INSERT INTO omega_accounts (profile_id, login, password_hash) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE login = VALUES(login), password_hash = VALUES(password_hash), auth_version = auth_version + 1, disabled = 0', [$input['profile'], $input['login'], password_hash($password, PASSWORD_BCRYPT, ['cost' => 12])]);
    echo "Account saved; previous sessions for that account are invalidated.\n";
} catch (Throwable $e) { fwrite(STDERR, "Account update failed: " . $e->getMessage() . "\n"); exit(1); }
