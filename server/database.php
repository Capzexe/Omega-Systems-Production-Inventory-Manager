<?php
declare(strict_types=1);

function connect_database(array $config): mysqli
{
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
    $db = new mysqli($config['db_host'], $config['db_user'], $config['db_password'], $config['db_name'], (int) ($config['db_port'] ?? 3306));
    $db->set_charset('utf8mb4');
    return $db;
}

function query(mysqli $db, string $sql, array $params = []): mysqli_stmt
{
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    return $stmt;
}

function rows(mysqli $db, string $sql, array $params = []): array
{
    return query($db, $sql, $params)->get_result()->fetch_all(MYSQLI_ASSOC);
}

function current_actor(mysqli $db): ?array
{
    if (!isset($_SESSION['account_id'])) return null;
    $found = rows($db, 'SELECT p.id, p.full_name, p.role, p.avatar_url, a.auth_version, a.login AS account_login FROM omega_accounts a JOIN profiles p ON p.id = a.profile_id WHERE a.profile_id = ? AND a.disabled = 0', [$_SESSION['account_id']]);
    if (!$found || (int) $found[0]['auth_version'] !== ($_SESSION['auth_version'] ?? -1)) {
        unset($_SESSION['account_id'], $_SESSION['auth_version']);
        return null;
    }
    $actor = $found[0];
    // This login is intentionally advertised on the sign-in page. Its write
    // restriction is recomputed from the database for every authenticated request.
    $actor['read_only'] = strtolower($actor['account_login']) === 'user';
    unset($actor['auth_version'], $actor['account_login']);
    return $actor;
}

function audit_log(mysqli $db, string $itemId, string $actorId, string $action, array $details): void
{
    query($db, 'INSERT INTO activity_logs (id, item_id, user_id, action, details) VALUES (?, ?, ?, ?, ?)', [uuid(), $itemId, $actorId, $action, json_encode($details, JSON_THROW_ON_ERROR)]);
}

function require_record(mysqli $db, string $table, string $id): array
{
    // Table names come only from this fixed allowlist, never directly from input.
    if (!in_array($table, ['categories', 'productions', 'profiles', 'inventory_items'], true)) throw new LogicException('Invalid table.');
    $found = rows($db, "SELECT * FROM $table WHERE id = ?", [$id]);
    if (!$found) throw new ApiError(404, 'The requested record does not exist.');
    return $found[0];
}

function inventory_rows(mysqli $db): array
{
    $items = rows($db, 'SELECT i.*, c.name AS c_name, c.icon AS c_icon, p.full_name AS p_name, p.role AS p_role, p.avatar_url AS p_avatar, pr.name AS pr_name, pr.location AS pr_location, pr.status AS pr_status FROM inventory_items i LEFT JOIN categories c ON i.category_id = c.id LEFT JOIN profiles p ON i.assigned_to_id = p.id LEFT JOIN productions pr ON i.current_production_id = pr.id ORDER BY i.created_at DESC LIMIT 2000');
    foreach ($items as &$item) {
        if ($item['category_id']) $item['category'] = ['id' => $item['category_id'], 'name' => $item['c_name'], 'icon' => $item['c_icon']];
        if ($item['assigned_to_id']) $item['assigned_to'] = ['id' => $item['assigned_to_id'], 'full_name' => $item['p_name'], 'role' => $item['p_role'], 'avatar_url' => $item['p_avatar']];
        if ($item['current_production_id']) $item['production'] = ['id' => $item['current_production_id'], 'name' => $item['pr_name'], 'location' => $item['pr_location'], 'status' => $item['pr_status']];
        foreach (['c_name', 'c_icon', 'p_name', 'p_role', 'p_avatar', 'pr_name', 'pr_location', 'pr_status'] as $key) unset($item[$key]);
    }
    return $items;
}

function activity_rows(mysqli $db): array
{
    $logs = rows($db, 'SELECT l.*, i.name AS item_name, i.model AS item_model, p.full_name AS p_name, p.role AS p_role, p.avatar_url AS p_avatar FROM activity_logs l LEFT JOIN inventory_items i ON l.item_id = i.id LEFT JOIN profiles p ON l.user_id = p.id ORDER BY l.created_at DESC LIMIT 1000');
    foreach ($logs as &$log) {
        $log['details'] = json_decode($log['details'] ?? '{}', true);
        if ($log['item_id']) $log['item'] = ['id' => $log['item_id'], 'name' => $log['item_name'], 'model' => $log['item_model']];
        if ($log['user_id']) $log['user'] = ['id' => $log['user_id'], 'full_name' => $log['p_name'], 'role' => $log['p_role'], 'avatar_url' => $log['p_avatar']];
        foreach (['item_name', 'item_model', 'p_name', 'p_role', 'p_avatar'] as $key) unset($log[$key]);
    }
    return $logs;
}
