<?php
declare(strict_types=1);
// CLI only. Password is read from stdin, never command-line arguments or HTTP.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$helpers = is_file(__DIR__ . '/../server/security.php') ? __DIR__ . '/../server' : dirname(__DIR__) . '/public_html/_server';
require $helpers . '/security.php';
require $helpers . '/database.php';
if ($argc !== 4) exit("Usage: php tools/manage-user.php /absolute/private/config.php profile-id|--create-crew login < password-file\n");
$db = null;
try {
    $config = require $argv[1];
    $createCrew = $argv[2] === '--create-crew';
    $input = validate_fields(['profile' => $createCrew ? uuid() : $argv[2], 'login' => strtolower($argv[3])], ['profile' => ['required' => true, 'id' => true, 'max' => 36], 'login' => ['required' => true, 'max' => 100]]);
    if ($createCrew && !preg_match('/\A[a-z0-9][a-z0-9._-]{2,63}\z/D', $input['login'])) throw new RuntimeException('New usernames must be 3–64 characters: letters, numbers, dots, underscores or hyphens.');
    $password = rtrim(stream_get_contents(STDIN, 1024), "\r\n");
    if (strlen($password) < 14 || strlen($password) > 72 || str_contains($password, "\0")) throw new RuntimeException('Password must be 14–72 bytes and contain no null bytes.');
    $db = connect_database($config);
    $db->begin_transaction();
    if ($createCrew) {
        // This path can create crew accounts only; role is never accepted as input.
        query($db, "INSERT INTO profiles (id, full_name, role) VALUES (?, ?, 'crew')", [$input['profile'], $input['login']]);
    } else {
        $profile = rows($db, 'SELECT id FROM profiles WHERE id = ? FOR UPDATE', [$input['profile']]);
        if (!$profile) throw new RuntimeException('Profile does not exist.');
    }
    $existing = rows($db, 'SELECT profile_id FROM omega_accounts WHERE login = ?', [$input['login']]);
    if ($existing && $existing[0]['profile_id'] !== $input['profile']) throw new RuntimeException('Login is already assigned to another profile.');
    $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    $account = rows($db, 'SELECT profile_id FROM omega_accounts WHERE profile_id = ? FOR UPDATE', [$input['profile']]);
    if ($account) {
        query($db, 'UPDATE omega_accounts SET login = ?, password_hash = ?, auth_version = auth_version + 1, disabled = 0 WHERE profile_id = ?', [$input['login'], $hash, $input['profile']]);
    } else {
        query($db, 'INSERT INTO omega_accounts (profile_id, login, password_hash) VALUES (?, ?, ?)', [$input['profile'], $input['login'], $hash]);
    }
    $db->commit();
    echo $createCrew ? "Crew account created.\n" : "Account saved; previous sessions for that account are invalidated.\n";
} catch (Throwable $e) {
    if ($db instanceof mysqli) $db->rollback();
    $message = $e instanceof mysqli_sql_exception ? 'Database operation failed (code ' . $e->getCode() . ').' : $e->getMessage();
    fwrite(STDERR, "Account update failed: " . $message . "\n");
    exit(1);
}
