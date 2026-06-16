<?php
/**
 * Omega Systems MySQL API
 * Security: API key auth, prepared statements, restricted CORS, safe UUID
 */

// -----------------------------------------------------------------------------
// 1. CONFIGURATION
// -----------------------------------------------------------------------------
$db_host = "localhost";
$db_user = "u522832521_cineflow_user";
$db_pass = "CidoSula2233!";
$db_name = "u522832521_cineflow_db";

// API Key – must match VITE_API_KEY in your frontend .env / GitHub secret.
define('API_KEY', 'b5pLzsK6VA8zNnKWOsXUNeYdjUsfHJ6aXb34d18HQX0=');

// -----------------------------------------------------------------------------
// 2. CORS – restrict to your production domain + localhost dev
// -----------------------------------------------------------------------------
$allowed_origins = [
    'https://ghostwhite-sardine-651089.hostingersite.com',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$cors_origin = in_array($origin, $allowed_origins)
    ? $origin
    : 'https://ghostwhite-sardine-651089.hostingersite.com';

header("Access-Control-Allow-Origin: $cors_origin");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Api-Key");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// -----------------------------------------------------------------------------
// 3. API KEY AUTHENTICATION
// -----------------------------------------------------------------------------
$provided_key = $_SERVER['HTTP_X_API_KEY'] ?? '';
if (!hash_equals(API_KEY, $provided_key)) {
    http_response_code(401);
    echo json_encode(["error" => "Unauthorized"]);
    exit();
}

// -----------------------------------------------------------------------------
// 4. DATABASE CONNECTION
// -----------------------------------------------------------------------------
mysqli_report(MYSQLI_REPORT_OFF);
$conn = @new mysqli($db_host, $db_user, $db_pass, $db_name);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["error" => "Database connection failed. Check server configuration."]);
    exit();
}
$conn->set_charset("utf8mb4");

// -----------------------------------------------------------------------------
// 5. HELPERS
// -----------------------------------------------------------------------------
function generate_uuid(): string {
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

function get_post_data(): ?array {
    return json_decode(file_get_contents('php://input'), true);
}

function safe_query($conn, string $sql) {
    $result = $conn->query($sql);
    if (!$result) {
        http_response_code(500);
        echo json_encode(["error" => "Database query failed. Ensure tables are set up via phpMyAdmin."]);
        exit();
    }
    return $result;
}

$VALID_STATUSES = ['available', 'checked_out', 'maintenance', 'lost'];

// -----------------------------------------------------------------------------
// 6. API ROUTER
// -----------------------------------------------------------------------------
$action = $_GET['action'] ?? '';

switch ($action) {

    case 'categories':
        $result = safe_query($conn, "SELECT * FROM categories");
        $rows = [];
        while ($row = $result->fetch_assoc()) $rows[] = $row;
        echo json_encode($rows);
        break;

    case 'profiles':
        $result = safe_query($conn, "SELECT * FROM profiles");
        $rows = [];
        while ($row = $result->fetch_assoc()) $rows[] = $row;
        echo json_encode($rows);
        break;

    case 'me':
        $result = safe_query($conn, "SELECT * FROM profiles WHERE role='admin' LIMIT 1");
        echo json_encode($result->num_rows > 0
            ? $result->fetch_assoc()
            : ["id"=>"u1","full_name"=>"Alex Rivera","role"=>"admin","avatar_url"=>"https://picsum.photos/seed/alex/100/100"]);
        break;

    case 'productions':
        $result = safe_query($conn, "SELECT * FROM productions");
        $rows = [];
        while ($row = $result->fetch_assoc()) $rows[] = $row;
        echo json_encode($rows);
        break;

    case 'items':
        $sql = "SELECT i.*,
                       c.name AS c_name, c.icon AS c_icon,
                       p.full_name AS p_name, p.role AS p_role, p.avatar_url AS p_avatar,
                       pr.name AS pr_name, pr.location AS pr_location, pr.status AS pr_status
                FROM inventory_items i
                LEFT JOIN categories c ON i.category_id = c.id
                LEFT JOIN profiles p ON i.assigned_to_id = p.id
                LEFT JOIN productions pr ON i.current_production_id = pr.id
                ORDER BY i.created_at DESC";
        $result = safe_query($conn, $sql);
        $items = [];
        while ($row = $result->fetch_assoc()) {
            $item = [
                "id" => $row['id'], "name" => $row['name'], "model" => $row['model'],
                "serial_number" => $row['serial_number'], "category_id" => $row['category_id'],
                "status" => $row['status'], "current_production_id" => $row['current_production_id'],
                "assigned_to_id" => $row['assigned_to_id'], "description" => $row['description'],
                "image_url" => $row['image_url'], "last_serviced_at" => $row['last_serviced_at'],
                "created_at" => $row['created_at'],
            ];
            if ($row['category_id'])
                $item['category'] = ["id"=>$row['category_id'],"name"=>$row['c_name'],"icon"=>$row['c_icon']];
            if ($row['assigned_to_id'])
                $item['assigned_to'] = ["id"=>$row['assigned_to_id'],"full_name"=>$row['p_name'],"role"=>$row['p_role'],"avatar_url"=>$row['p_avatar']];
            if ($row['current_production_id'])
                $item['production'] = ["id"=>$row['current_production_id'],"name"=>$row['pr_name'],"location"=>$row['pr_location'],"status"=>$row['pr_status']];
            $items[] = $item;
        }
        echo json_encode($items);
        break;

    case 'logs':
        $sql = "SELECT l.*,
                       i.name AS item_name, i.model AS item_model,
                       p.full_name AS p_name, p.role AS p_role, p.avatar_url AS p_avatar
                FROM activity_logs l
                LEFT JOIN inventory_items i ON l.item_id = i.id
                LEFT JOIN profiles p ON l.user_id = p.id
                ORDER BY l.created_at DESC";
        $result = safe_query($conn, $sql);
        $logs = [];
        while ($row = $result->fetch_assoc()) {
            $log = [
                "id"=>$row['id'],"item_id"=>$row['item_id'],"user_id"=>$row['user_id'],
                "action"=>$row['action'],"details"=>json_decode($row['details'],true),
                "created_at"=>$row['created_at'],
            ];
            if ($row['item_id'])
                $log['item'] = ["id"=>$row['item_id'],"name"=>$row['item_name'],"model"=>$row['item_model']];
            if ($row['user_id'])
                $log['user'] = ["id"=>$row['user_id'],"full_name"=>$row['p_name'],"role"=>$row['p_role'],"avatar_url"=>$row['p_avatar']];
            $logs[] = $log;
        }
        echo json_encode($logs);
        break;

    // ==========================================
    // POST: Create Equipment
    // ==========================================
    case 'create_item':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(["error"=>"Method not allowed"]); break; }
        $data = get_post_data();
        if (!$data || empty($data['name']) || empty($data['category_id'])) {
            http_response_code(400); echo json_encode(["error"=>"Required parameters missing."]); break;
        }
        $id     = generate_uuid();
        $name   = trim($data['name']);
        $model  = isset($data['model']) ? trim($data['model']) : '';
        $serial = isset($data['serial_number']) ? trim($data['serial_number']) : '';
        $cat_id = trim($data['category_id']);
        $status = (isset($data['status']) && in_array($data['status'], $VALID_STATUSES)) ? $data['status'] : 'available';

        if (!empty($serial)) {
            $stmt = $conn->prepare("SELECT id FROM inventory_items WHERE serial_number = ?");
            $stmt->bind_param("s", $serial);
            $stmt->execute();
            $stmt->store_result();
            if ($stmt->num_rows > 0) {
                $stmt->close();
                http_response_code(400);
                echo json_encode(["error" => "Serial number '$serial' is already in use."]);
                break;
            }
            $stmt->close();
        }

        $serial_val = !empty($serial) ? $serial : null;
        $stmt = $conn->prepare("INSERT INTO inventory_items (id, name, model, serial_number, category_id, status) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("ssssss", $id, $name, $model, $serial_val, $cat_id, $status);
        if ($stmt->execute()) {
            $stmt->close();
            $log_id = generate_uuid(); $u_id = 'u1'; $action_text = "Add Equipment";
            $details_json = json_encode(["model" => $model]);
            $log_stmt = $conn->prepare("INSERT INTO activity_logs (id, item_id, user_id, action, details) VALUES (?, ?, ?, ?, ?)");
            $log_stmt->bind_param("sssss", $log_id, $id, $u_id, $action_text, $details_json);
            $log_stmt->execute(); $log_stmt->close();
            echo json_encode(["success" => true, "id" => $id]);
        } else {
            $stmt->close();
            http_response_code(500);
            echo json_encode(["error" => "Failed to create equipment."]);
        }
        break;

    // ==========================================
    // POST: Update item status
    // ==========================================
    case 'change_status':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(["error"=>"Method not allowed"]); break; }
        $data = get_post_data();
        if (!$data || empty($data['id']) || empty($data['status'])) {
            http_response_code(400); echo json_encode(["error"=>"Item ID and Status required."]); break;
        }
        $item_id = trim($data['id']);
        $status  = trim($data['status']);
        if (!in_array($status, $VALID_STATUSES)) {
            http_response_code(400); echo json_encode(["error"=>"Invalid status value."]); break;
        }

        $prev_status = 'unknown';
        $stmt = $conn->prepare("SELECT status FROM inventory_items WHERE id = ?");
        $stmt->bind_param("s", $item_id); $stmt->execute();
        $result = $stmt->get_result();
        if ($row = $result->fetch_assoc()) $prev_status = $row['status'];
        $stmt->close();

        $action_label = "Status Update";
        if ($status === 'maintenance') $action_label = "Send to Maintenance";
        elseif ($status === 'available') $action_label = "Refurbish / Complete Maintenance";

        if ($status === 'maintenance' || $status === 'lost') {
            $stmt = $conn->prepare("UPDATE inventory_items SET status = ?, assigned_to_id = NULL, current_production_id = NULL WHERE id = ?");
            $stmt->bind_param("ss", $status, $item_id);
        } else {
            $stmt = $conn->prepare("UPDATE inventory_items SET status = ? WHERE id = ?");
            $stmt->bind_param("ss", $status, $item_id);
        }
        if ($stmt->execute()) {
            $stmt->close();
            $log_id = generate_uuid(); $u_id = 'u1';
            $details_payload = json_encode(["previous_status" => $prev_status, "new_status" => $status]);
            $log_stmt = $conn->prepare("INSERT INTO activity_logs (id, item_id, user_id, action, details) VALUES (?, ?, ?, ?, ?)");
            $log_stmt->bind_param("sssss", $log_id, $item_id, $u_id, $action_label, $details_payload);
            $log_stmt->execute(); $log_stmt->close();
            echo json_encode(["success" => true]);
        } else {
            $stmt->close();
            http_response_code(500);
            echo json_encode(["error" => "Status update failed."]);
        }
        break;

    // ==========================================
    // POST: Checkout equipment
    // ==========================================
    case 'checkout':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(["error"=>"Method not allowed"]); break; }
        $data = get_post_data();
        if (!$data || empty($data['itemId']) || empty($data['userId']) || empty($data['prodId'])) {
            http_response_code(400); echo json_encode(["error"=>"Missing fields (itemId, userId, prodId)"]); break;
        }
        $item_id = trim($data['itemId']); $user_id = trim($data['userId']); $production_id = trim($data['prodId']);

        $prod_name = "Assigned Production";
        $stmt = $conn->prepare("SELECT name FROM productions WHERE id = ?");
        $stmt->bind_param("s", $production_id); $stmt->execute();
        $result = $stmt->get_result();
        if ($row = $result->fetch_assoc()) $prod_name = $row['name'];
        $stmt->close();

        $stmt = $conn->prepare("SELECT status FROM inventory_items WHERE id = ?");
        $stmt->bind_param("s", $item_id); $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        $stmt->close();
        if (!$row || $row['status'] !== 'available') {
            http_response_code(400);
            echo json_encode(["error" => "Equipment is not available for checkout."]);
            break;
        }

        $stmt = $conn->prepare("UPDATE inventory_items SET status = 'checked_out', assigned_to_id = ?, current_production_id = ? WHERE id = ?");
        $stmt->bind_param("sss", $user_id, $production_id, $item_id);
        if ($stmt->execute()) {
            $stmt->close();
            $log_id = generate_uuid();
            $details_payload = json_encode(["production" => $prod_name]);
            $log_stmt = $conn->prepare("INSERT INTO activity_logs (id, item_id, user_id, action, details) VALUES (?, ?, ?, 'Checkout', ?)");
            $log_stmt->bind_param("ssss", $log_id, $item_id, $user_id, $details_payload);
            $log_stmt->execute(); $log_stmt->close();
            echo json_encode(["success" => true]);
        } else {
            $stmt->close();
            http_response_code(500);
            echo json_encode(["error" => "Checkout failed."]);
        }
        break;

    // ==========================================
    // POST: Return equipment
    // ==========================================
    case 'return':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(["error"=>"Method not allowed"]); break; }
        $data = get_post_data();
        if (!$data || empty($data['itemId'])) {
            http_response_code(400); echo json_encode(["error"=>"Item ID required."]); break;
        }
        $item_id = trim($data['itemId']);

        $stmt = $conn->prepare("SELECT assigned_to_id, current_production_id FROM inventory_items WHERE id = ?");
        $stmt->bind_param("s", $item_id); $stmt->execute();
        $result = $stmt->get_result();
        if ($result->num_rows === 0) {
            $stmt->close(); http_response_code(404); echo json_encode(["error" => "Item not found."]); break;
        }
        $item = $result->fetch_assoc(); $stmt->close();
        $user_id = $item['assigned_to_id'] ?: 'u2';
        $production_id = $item['current_production_id'];

        $prod_name = null;
        if ($production_id) {
            $stmt = $conn->prepare("SELECT name FROM productions WHERE id = ?");
            $stmt->bind_param("s", $production_id); $stmt->execute();
            $result = $stmt->get_result();
            if ($row = $result->fetch_assoc()) $prod_name = $row['name'];
            $stmt->close();
        }

        $stmt = $conn->prepare("UPDATE inventory_items SET status = 'available', assigned_to_id = NULL, current_production_id = NULL WHERE id = ?");
        $stmt->bind_param("s", $item_id);
        if ($stmt->execute()) {
            $stmt->close();
            $log_id = generate_uuid();
            $details_payload = json_encode(["production" => $prod_name]);
            $log_stmt = $conn->prepare("INSERT INTO activity_logs (id, item_id, user_id, action, details) VALUES (?, ?, ?, 'Return', ?)");
            $log_stmt->bind_param("ssss", $log_id, $item_id, $user_id, $details_payload);
            $log_stmt->execute(); $log_stmt->close();
            echo json_encode(["success" => true]);
        } else {
            $stmt->close();
            http_response_code(500);
            echo json_encode(["error" => "Return failed."]);
        }
        break;

    default:
        http_response_code(404);
        echo json_encode(["status" => "online", "message" => "Omega Systems API active.", "usage" => "Append ?action=items"]);
        break;
}

$conn->close();
?>