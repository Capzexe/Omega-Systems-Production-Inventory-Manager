<?php
// Destructive only inside an explicitly named, dedicated test database.
declare(strict_types=1);
if (PHP_SAPI !== 'cli' || getenv('OMEGA_TEST_DATABASE') !== 'omega_security_test') exit(1);
require __DIR__ . '/../server/security.php';
require __DIR__ . '/../server/database.php';
$db = new mysqli('127.0.0.1', 'root', '', '', 3308);
$db->query('CREATE DATABASE IF NOT EXISTS omega_security_test');
$db->select_db('omega_security_test');
$db->query('DROP TABLE IF EXISTS omega_accounts');
$db->multi_query(file_get_contents(__DIR__ . '/../db_setup.sql'));
do { if ($result = $db->store_result()) $result->free(); } while ($db->more_results() && $db->next_result());
$db->query(file_get_contents(__DIR__ . '/../database/migrations/001_security.sql'));
foreach (['u1' => 'admin', 'u2' => 'crew'] as $id => $login) query($db, 'INSERT INTO omega_accounts (profile_id, login, password_hash) VALUES (?, ?, ?)', [$id, $login, password_hash('Test-only-password-123!', PASSWORD_BCRYPT, ['cost' => 12])]);
$private = realpath(__DIR__ . '/../.local-deploy');
file_put_contents($private . '/test-config.php', '<?php return ' . var_export(['environment' => 'local', 'origin' => 'http://127.0.0.1:8080', 'db_host' => '127.0.0.1', 'db_port' => 3308, 'db_name' => 'omega_security_test', 'db_user' => 'root', 'db_password' => 'test-unused', 'private_dir' => $private], true) . ';');
// Local isolated test root has no password; use an explicit app user instead.
$db->query("CREATE USER IF NOT EXISTS 'omega_test'@'%' IDENTIFIED BY 'Test-database-password-123!'");
$db->query("GRANT SELECT, INSERT, UPDATE, DELETE ON omega_security_test.* TO 'omega_test'@'%'");
$config = require $private . '/test-config.php';
$config['db_user'] = 'omega_test'; $config['db_password'] = 'Test-database-password-123!';
$config['private_dir'] = $private . '/test-runtime-' . bin2hex(random_bytes(4));
mkdir($config['private_dir'], 0700);
file_put_contents($private . '/test-config.php', '<?php return ' . var_export($config, true) . ';');
echo "Isolated test database provisioned.\n";
