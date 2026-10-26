<?php
declare(strict_types=1);
// CLI provisioning only. Install under the domain's private directory, never public_html.
if (PHP_SAPI !== 'cli' || !in_array($argv[1] ?? '', ['prepare', 'activate'], true)) exit(1);
umask(0077);
$private = __DIR__;
$domain = dirname($private);
if (basename($private) !== 'omega-private' || basename($domain) !== 'ghostwhite-sardine-651089.hostingersite.com') exit('Unexpected installation path.');
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
try {
    if ($argv[1] === 'prepare') {
        if (is_file($private . '/config.php')) exit("Already configured; refusing to overwrite credentials.\n");
        $legacy = file_get_contents($domain . '/public_html/api.php');
        $old = [];
        foreach (['host', 'user', 'pass', 'name'] as $key) {
            if (!preg_match('/\$db_' . $key . '\s*=\s*"([^"\r\n]*)"\s*;/', $legacy, $match)) throw new RuntimeException('Cannot read legacy configuration.');
            $old[$key] = $match[1];
        }
        $db = new mysqli($old['host'], $old['user'], $old['pass'], $old['name']);
        $db->set_charset('utf8mb4');
        $db->query('SELECT id FROM profiles LIMIT 1');
        file_put_contents($private . '/legacy-config.php', '<?php return ' . var_export($old, true) . ';');
        foreach ($old as $value) if (strpbrk($value, "\r\n") !== false) throw new RuntimeException('Invalid legacy configuration.');
        $quote = static fn(string $value): string => '"' . str_replace(['\\', '"'], ['\\\\', '\\"'], $value) . '"';
        file_put_contents($private . '/mysql-backup.cnf', "[client]\nhost=" . $quote($old['host']) . "\nuser=" . $quote($old['user']) . "\npassword=" . $quote($old['pass']) . "\n");
        echo "Legacy database connected. Private backup credentials prepared.\n";
        exit;
    }
    if (is_file($private . '/config.php')) exit("Already configured; refusing repeat rotation.\n");
    if (!is_file($private . '/database-before-security.sql') || filesize($private . '/database-before-security.sql') < 100) throw new RuntimeException('Database backup is missing.');
    $input = json_decode(stream_get_contents(STDIN, 8192), true, 8, JSON_THROW_ON_ERROR);
    if (!is_string($input['password'] ?? null) || strlen($input['password']) < 20 || strlen($input['password']) > 72) throw new RuntimeException('Invalid bootstrap password.');
    $old = require $private . '/legacy-config.php';
    $db = new mysqli($old['host'], $old['user'], $old['pass'], $old['name']);
    $db->set_charset('utf8mb4');
    if (is_file($private . '/config.pending.php')) {
        $config = require $private . '/config.pending.php';
        $account = $db->query("SELECT a.password_hash FROM omega_accounts a JOIN profiles p ON a.profile_id=p.id WHERE a.login='omega-admin' AND a.disabled=0 AND p.role='admin'")->fetch_assoc();
        if (!$account || !password_verify($input['password'], $account['password_hash'])) throw new RuntimeException('Pending administrator verification failed.');
        $password = $config['db_password'];
        if (!preg_match('/\A[a-f0-9]{64}\z/', $password)) throw new RuntimeException('Invalid pending database credential.');
    } else {
        $db->query(file_get_contents($private . '/001_security.sql'));
        $profile = bin2hex(random_bytes(16));
        $db->begin_transaction();
        $stmt = $db->prepare("INSERT INTO profiles (id, full_name, role) VALUES (?, 'Omega Administrator', 'admin')"); $stmt->execute([$profile]);
        $stmt = $db->prepare('INSERT INTO omega_accounts (profile_id, login, password_hash) VALUES (?, ?, ?)');
        $stmt->execute([$profile, 'omega-admin', password_hash($input['password'], PASSWORD_BCRYPT, ['cost' => 12])]);
        $db->commit();
        $password = bin2hex(random_bytes(32));
        $config = ['environment' => 'production', 'origin' => 'https://ghostwhite-sardine-651089.hostingersite.com', 'db_host' => $old['host'], 'db_name' => $old['name'], 'db_user' => $old['user'], 'db_password' => $password, 'private_dir' => $private, 'gemini_api_key' => ''];
        file_put_contents($private . '/config.pending.php', '<?php return ' . var_export($config, true) . ';');
    }
    // Password is cryptographically generated hexadecimal; never derived from request input.
    // MariaDB permits SET PASSWORD for one's own account without CREATE USER.
    $version = $db->query('SELECT VERSION() AS v')->fetch_assoc()['v'];
    $db->query(str_contains($version, 'MariaDB') ? "SET PASSWORD = PASSWORD('$password')" : "ALTER USER CURRENT_USER() IDENTIFIED BY '$password'");
    $check = new mysqli($old['host'], $old['user'], $password, $old['name']);
    $check->query('SELECT 1');
    if (!rename($private . '/config.pending.php', $private . '/config.php')) throw new RuntimeException('Cannot activate private configuration.');
    unlink($private . '/mysql-backup.cnf');
    echo "Database password rotated. Private config and first administrator created.\n";
} catch (Throwable $e) {
    // Do not log connection strings, SQL values or passwords.
    fwrite(STDERR, 'Provisioning failed (' . get_class($e) . ', code ' . $e->getCode() . "). Check private state before retrying.\n");
    exit(1);
}
