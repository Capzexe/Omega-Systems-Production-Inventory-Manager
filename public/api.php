<?php
/** Omega Systems same-origin API. PHP 8.2+, mysqli/mysqlnd, cURL. */
declare(strict_types=1);
ini_set('display_errors', '0');
ini_set('log_errors', '1');
require is_file(__DIR__ . '/_server/security.php') ? __DIR__ . '/_server/security.php' : __DIR__ . '/../server/security.php';
require is_file(__DIR__ . '/_server/database.php') ? __DIR__ . '/_server/database.php' : __DIR__ . '/../server/database.php';
security_headers();
$db = null;
try {
    $config = load_config();
    enforce_transport($config);
    $action = $_GET['action'] ?? '';
    $methods = ['session' => 'GET', 'login' => 'POST', 'logout' => 'POST', 'me' => 'GET', 'items' => 'GET', 'categories' => 'GET', 'productions' => 'GET', 'profiles' => 'GET', 'logs' => 'GET', 'create_item' => 'POST', 'change_status' => 'POST', 'checkout' => 'POST', 'return' => 'POST', 'advice' => 'POST'];
    if (!is_string($action) || !isset($methods[$action])) throw new ApiError(404, 'Endpoint not found.');
    if ($_SERVER['REQUEST_METHOD'] !== $methods[$action]) {
        header('Allow: ' . $methods[$action]);
        throw new ApiError(405, 'Method not allowed.');
    }
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    rate_limit($config['private_dir'], 'requests:' . $ip, 180, 60);
    if ($action === 'login') rate_limit($config['private_dir'], 'login:' . $ip, 10, 900);
    start_secure_session($config);
    if ($methods[$action] === 'POST') require_csrf($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    $db = connect_database($config);
    $actor = current_actor($db);
    if ($action === 'session') respond(['user' => $actor, 'csrfToken' => $_SESSION['csrf']]);
    $data = $methods[$action] === 'POST' ? request_data() : [];
    if ($action === 'login') {
        $input = validate_fields($data, ['login' => ['required' => true, 'max' => 100], 'password' => ['required' => true, 'max' => 72]]);
        $account = rows($db, 'SELECT profile_id, password_hash, auth_version, disabled FROM omega_accounts WHERE login = ?', [strtolower($input['login'])])[0] ?? null;
        if ($account) rate_limit($config['private_dir'], 'account-login:' . $account['profile_id'], 20, 900);
        // A valid dummy hash keeps unknown-login password checks expensive as well.
        $hash = $account['password_hash'] ?? '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.';
        $valid = password_verify($input['password'], $hash);
        if (!$account || !$valid || (int) $account['disabled'] !== 0) throw new ApiError(401, 'Invalid sign-in details.');
        if (password_needs_rehash($hash, PASSWORD_BCRYPT, ['cost' => 12])) query($db, 'UPDATE omega_accounts SET password_hash = ? WHERE profile_id = ?', [password_hash($input['password'], PASSWORD_BCRYPT, ['cost' => 12]), $account['profile_id']]);
        session_regenerate_id(true);
        $_SESSION = ['account_id' => $account['profile_id'], 'auth_version' => (int) $account['auth_version'], 'signed_in_at' => time(), 'last_seen' => time(), 'csrf' => bin2hex(random_bytes(32))];
        respond(['user' => current_actor($db), 'csrfToken' => $_SESSION['csrf']]);
    }
    if (!$actor) throw new ApiError(401, 'Sign in to continue.');
    authorize($actor, $action);
    if ($methods[$action] === 'POST') rate_limit($config['private_dir'], 'writes:' . $actor['id'], 60, 60);
    if ($action === 'logout') {
        validate_fields($data, []);
        $_SESSION = [];
        setcookie(session_name(), '', ['expires' => time() - 3600, 'path' => '/', 'secure' => ($config['environment'] ?? 'production') !== 'local', 'httponly' => true, 'samesite' => 'Lax']);
        session_destroy();
        respond(['success' => true]);
    }
    if ($action === 'me') respond($actor);
    if ($action === 'items') respond(inventory_rows($db));
    if ($action === 'logs') respond(activity_rows($db));
    if ($action === 'categories') respond(rows($db, 'SELECT id, name, icon FROM categories ORDER BY name'));
    if ($action === 'productions') respond(rows($db, 'SELECT id, name, location, start_date, end_date, status FROM productions ORDER BY start_date DESC'));
    if ($action === 'profiles') respond(rows($db, 'SELECT id, full_name, role, avatar_url FROM profiles ORDER BY full_name'));
    if ($action === 'advice') {
        rate_limit($config['private_dir'], 'advice:' . $actor['id'], 10, 3600);
        $input = validate_fields($data, ['prompt' => ['required' => true, 'max' => 2000]]);
        if (empty($config['gemini_api_key']) || !function_exists('curl_init')) throw new ApiError(503, 'AI advice is not configured.');
        $curl = curl_init('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent');
        $body = '';
        curl_setopt_array($curl, [CURLOPT_POST => true, CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'x-goog-api-key: ' . $config['gemini_api_key']], CURLOPT_POSTFIELDS => json_encode(['contents' => [['parts' => [['text' => 'Suggest a concise professional filming equipment list for this scene: ' . $input['prompt']]]]], 'generationConfig' => ['maxOutputTokens' => 1000]], JSON_THROW_ON_ERROR), CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_TIMEOUT => 30, CURLOPT_FOLLOWLOCATION => false, CURLOPT_PROTOCOLS => CURLPROTO_HTTPS, CURLOPT_WRITEFUNCTION => static function ($curl, string $chunk) use (&$body): int { if (strlen($body) + strlen($chunk) > 65536) return 0; $body .= $chunk; return strlen($chunk); }]);
        $ok = curl_exec($curl);
        $status = curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        curl_close($curl);
        if ($ok === false || $status !== 200) throw new ApiError(502, 'AI provider is temporarily unavailable.');
        $result = json_decode($body, true, 32, JSON_THROW_ON_ERROR);
        $text = $result['candidates'][0]['content']['parts'][0]['text'] ?? null;
        if (!is_string($text)) throw new ApiError(502, 'AI provider returned no advice.');
        respond(['text' => $text]);
    }
    $idRule = ['required' => true, 'max' => 36, 'id' => true];
    if ($action === 'create_item') {
        $input = validate_fields($data, ['name' => ['required' => true, 'max' => 100], 'model' => ['max' => 100], 'serial_number' => ['max' => 100], 'category_id' => $idRule, 'status' => ['required' => true, 'values' => ['available', 'maintenance', 'lost']]]);
        require_record($db, 'categories', $input['category_id']);
        $id = uuid();
        $db->begin_transaction();
        query($db, 'INSERT INTO inventory_items (id, name, model, serial_number, category_id, status) VALUES (?, ?, ?, ?, ?, ?)', [$id, $input['name'], $input['model'], $input['serial_number'] ?: null, $input['category_id'], $input['status']]);
        audit_log($db, $id, $actor['id'], 'Add Equipment', ['model' => $input['model']]);
        $db->commit();
        respond(['success' => true, 'id' => $id], 201);
    }
    $rules = match ($action) {
        'checkout' => ['itemId' => $idRule, 'userId' => $idRule, 'prodId' => $idRule],
        'return' => ['itemId' => $idRule],
        'change_status' => ['id' => $idRule, 'status' => ['required' => true, 'values' => ['available', 'maintenance', 'lost']]],
    };
    $input = validate_fields($data, $rules);
    $itemId = $input['itemId'] ?? $input['id'];
    $db->begin_transaction();
    $item = rows($db, 'SELECT * FROM inventory_items WHERE id = ? FOR UPDATE', [$itemId])[0] ?? null;
    if (!$item) throw new ApiError(404, 'Equipment not found.');
    authorize($actor, $action, $item, $input['userId'] ?? null);
    if ($action === 'checkout') {
        if ($item['status'] !== 'available') throw new ApiError(409, 'Equipment is not available for checkout.');
        require_record($db, 'profiles', $input['userId']);
        $production = require_record($db, 'productions', $input['prodId']);
        if (!in_array($production['status'], ['pre-production', 'production'], true)) throw new ApiError(409, 'Production is not accepting equipment.');
        query($db, "UPDATE inventory_items SET status = 'checked_out', assigned_to_id = ?, current_production_id = ? WHERE id = ?", [$input['userId'], $input['prodId'], $itemId]);
        audit_log($db, $itemId, $actor['id'], 'Checkout', ['production' => $production['name'], 'assigned_to_id' => $input['userId']]);
    } elseif ($action === 'return') {
        if ($item['status'] !== 'checked_out') throw new ApiError(409, 'Only checked-out equipment can be returned.');
        query($db, "UPDATE inventory_items SET status = 'available', assigned_to_id = NULL, current_production_id = NULL WHERE id = ?", [$itemId]);
        audit_log($db, $itemId, $actor['id'], 'Return', ['production_id' => $item['current_production_id'], 'previous_assignee' => $item['assigned_to_id']]);
    } else {
        // Checkout/return must pass through their own authorized transitions.
        if ($item['status'] === 'checked_out') throw new ApiError(409, 'Return checked-out equipment before changing its status.');
        query($db, 'UPDATE inventory_items SET status = ?, assigned_to_id = NULL, current_production_id = NULL WHERE id = ?', [$input['status'], $itemId]);
        audit_log($db, $itemId, $actor['id'], 'Status Update', ['previous_status' => $item['status'], 'new_status' => $input['status']]);
    }
    $db->commit();
    respond(['success' => true]);
} catch (ApiError $e) {
    if ($db instanceof mysqli) $db->rollback();
    respond(['error' => $e->getMessage()], $e->status);
} catch (Throwable $e) {
    if ($db instanceof mysqli) $db->rollback();
    if ($e instanceof mysqli_sql_exception && $e->getCode() === 1062) respond(['error' => 'A record with that unique value already exists.'], 409);
    $reference = bin2hex(random_bytes(6));
    error_log('Omega API [' . $reference . '] ' . get_class($e) . ' code=' . $e->getCode());
    respond(['error' => 'The request could not be completed.', 'reference' => $reference], 500);
}
