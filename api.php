<?php
/**
 * CineFlow / Omega MySQL API Connection script
 * Place this file inside your public_html folder along with the contents of the 'dist' folder.
 * Customize database credentials below or in your Hostinger configuration.
 */

// -----------------------------------------------------------------------------
// 1. CONFIGURATION (Please update with your MySQL credentials)
// -----------------------------------------------------------------------------
$db_host = "localhost";                     // Usually 'localhost' on Hostinger Web Hosting
$db_user = "u522832521_OmegaSystem";        // Hostinger MySQL Username
$db_pass = "j/4&rE=fG5";   // Hostinger MySQL Password
$db_name = "u522832521_OmegaSystem";       // Hostinger MySQL Database Name

// -----------------------------------------------------------------------------
// 2. CORS & HEADERS SETUP
// -----------------------------------------------------------------------------
// Enable CORS so the React client can query the PHP server securely from development
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight OPTIONS requests immediately
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// -----------------------------------------------------------------------------
// 3. DATABASE CONNECTION
// -----------------------------------------------------------------------------
// Disable strict exception reporting in PHP 8.1+ to handle errors gracefully
mysqli_report(MYSQLI_REPORT_OFF);

// Suppress warning output so it doesn't corrupt the JSON response stream
$conn = @new mysqli($db_host, $db_user, $db_pass, $db_name);

// Handle connection failures gracefully
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode([
        "error" => "Database connection failed! Verify credentials in 'api.php'.",
        "details" => $conn->connect_error
    ]);
    exit();
}

// Ensure database returns data in UTF-8
$conn->set_charset("utf8mb4");

// Helper function to safely execute queries and give helper instructions on error
function safe_query($conn, $sql) {
    $result = $conn->query($sql);
    if (!$result) {
        http_response_code(500);
        echo json_encode([
            "error" => "Database query failed! This usually means your database tables are not setup. Please import the 'db_setup.sql' file into your database via phpMyAdmin.",
            "details" => $conn->error,
            "query" => $sql
        ]);
        exit();
    }
    return $result;
}

// -----------------------------------------------------------------------------
// 4. UTILITY FUNCTIONS
// -----------------------------------------------------------------------------
function generate_uuid() {
    return sprintf(
        '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

function get_post_data() {
    $raw_input = file_get_contents('php://input');
    return json_decode($raw_input, true);
}

// -----------------------------------------------------------------------------
// 5. API ROUTER & CONTROLLER
// -----------------------------------------------------------------------------
$action = isset($_GET['action']) ? $_GET['action'] : '';

switch ($action) {

    // ==========================================
    // GET: Fetch Categories
    // ==========================================
    case 'categories':
        $result = safe_query($conn, "SELECT * FROM categories");
        $categories = [];
        if ($result) {
            while ($row = $result->fetch_assoc()) {
                $categories[] = $row;
            }
        }
        echo json_encode($categories);
        break;

    // ==========================================
    // GET: Fetch Profiles
    // ==========================================
    case 'profiles':
        $result = safe_query($conn, "SELECT * FROM profiles");
        $profiles = [];
        if ($result) {
            while ($row = $result->fetch_assoc()) {
                $profiles[] = $row;
            }
        }
        echo json_encode($profiles);
        break;

    // ==========================================
    // GET: Fetch Single User (simulates active logged in user)
    // ==========================================
    case 'me':
        $result = safe_query($conn, "SELECT * FROM profiles WHERE role='admin' LIMIT 1");
        if ($result && $result->num_rows > 0) {
            echo json_encode($result->fetch_assoc());
        } else {
            // Rollback fallback
            echo json_encode([
                "id" => "u1",
                "full_name" => "Alex Rivera",
                "role" => "admin",
                "avatar_url" => "https://picsum.photos/seed/alex/100/100"
            ]);
        }
        break;

    // ==========================================
    // GET: Fetch Productions
    // ==========================================
    case 'productions':
        $result = safe_query($conn, "SELECT * FROM productions");
        $productions = [];
        if ($result) {
            while ($row = $result->fetch_assoc()) {
                $productions[] = $row;
            }
        }
        echo json_encode($productions);
        break;

    // ==========================================
    // GET: Fetch Inventory Items
    // ==========================================
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
        
        if ($result) {
            while ($row = $result->fetch_assoc()) {
                // Map flat joins to nested object structure required by CineFlow React app
                $item = [
                    "id" => $row['id'],
                    "name" => $row['name'],
                    "model" => $row['model'],
                    "serial_number" => $row['serial_number'],
                    "category_id" => $row['category_id'],
                    "status" => $row['status'],
                    "current_production_id" => $row['current_production_id'],
                    "assigned_to_id" => $row['assigned_to_id'],
                    "description" => $row['description'],
                    "image_url" => $row['image_url'],
                    "last_serviced_at" => $row['last_serviced_at'],
                    "created_at" => $row['created_at'],
                ];
                
                if ($row['category_id']) {
                    $item['category'] = [
                        "id" => $row['category_id'],
                        "name" => $row['c_name'],
                        "icon" => $row['c_icon']
                    ];
                }
                
                if ($row['assigned_to_id']) {
                    $item['assigned_to'] = [
                        "id" => $row['assigned_to_id'],
                        "full_name" => $row['p_name'],
                        "role" => $row['p_role'],
                        "avatar_url" => $row['p_avatar']
                    ];
                }
                
                if ($row['current_production_id']) {
                    $item['production'] = [
                        "id" => $row['current_production_id'],
                        "name" => $row['pr_name'],
                        "location" => $row['pr_location'],
                        "status" => $row['pr_status']
                    ];
                }
                
                $items[] = $item;
            }
        }
        echo json_encode($items);
        break;

    // ==========================================
    // GET: Fetch Activity Logs
    // ==========================================
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
        
        if ($result) {
            while ($row = $result->fetch_assoc()) {
                $log = [
                    "id" => $row['id'],
                    "item_id" => $row['item_id'],
                    "user_id" => $row['user_id'],
                    "action" => $row['action'],
                    "details" => json_decode($row['details'], true),
                    "created_at" => $row['created_at'],
                ];
                
                if ($row['item_id']) {
                    $log['item'] = [
                        "id" => $row['item_id'],
                        "name" => $row['item_name'],
                        "model" => $row['item_model']
                    ];
                }
                
                if ($row['user_id']) {
                    $log['user'] = [
                        "id" => $row['user_id'],
                        "full_name" => $row['p_name'],
                        "role" => $row['p_role'],
                        "avatar_url" => $row['p_avatar']
                    ];
                }
                
                $logs[] = $log;
            }
        }
        echo json_encode($logs);
        break;

    // ==========================================
    // POST: Create Equipment
    // ==========================================
    case 'create_item':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(["error" => "Method not allowed"]);
            break;
        }
        
        $data = get_post_data();
        if (!$data || empty($data['name']) || empty($data['category_id'])) {
            http_response_code(400);
            echo json_encode(["error" => "Required parameters missing."]);
            break;
        }

        $id = generate_uuid();
        $name = $conn->real_escape_string($data['name']);
        $model = isset($data['model']) ? $conn->real_escape_string($data['model']) : '';
        $serial = isset($data['serial_number']) ? $conn->real_escape_string($data['serial_number']) : '';
        $cat_id = $conn->real_escape_string($data['category_id']);
        $status = isset($data['status']) ? $conn->real_escape_string($data['status']) : 'available';
        
        // Prevent duplicate serial key crash
        if (!empty($serial)) {
            $check = safe_query($conn, "SELECT id FROM inventory_items WHERE serial_number = '$serial'");
            if ($check && $check->num_rows > 0) {
                http_response_code(400);
                echo json_encode(["error" => "Serial number '$serial' is already in use by another piece of equipment."]);
                break;
            }
        }

        $serial_val = !empty($serial) ? "'$serial'" : "NULL";

        $sql = "INSERT INTO inventory_items (id, name, model, serial_number, category_id, status) 
                VALUES ('$id', '$name', '$model', $serial_val, '$cat_id', '$status')";
        
        if (safe_query($conn, $sql)) {
            // Write to Activity Logs
            $log_id = generate_uuid();
            $u_id = 'u1'; // Default Admin Agent
            $action_text = "Add Equipment";
            $details_json = json_encode(["model" => $model]);
            
            safe_query($conn, "INSERT INTO activity_logs (id, item_id, user_id, action, details) 
                          VALUES ('$log_id', '$id', '$u_id', '$action_text', '$details_json')");
            
            echo json_encode(["success" => true, "id" => $id]);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "SQL Statement execution failed", "details" => $conn->error]);
        }
        break;

    // ==========================================
    // POST: Updates status of item (e.g. maintenance)
    // ==========================================
    case 'change_status':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(["error" => "Method not allowed"]);
            break;
        }
        
        $data = get_post_data();
        if (!$data || empty($data['id']) || empty($data['status'])) {
            http_response_code(400);
            echo json_encode(["error" => "Item ID and Status fields required."]);
            break;
        }
        
        $item_id = $conn->real_escape_string($data['id']);
        $status = $conn->real_escape_string($data['status']);
        
        // Get previous status for logs
        $prev_status = 'unknown';
        $item_check = $conn->query("SELECT status FROM inventory_items WHERE id = '$item_id'");
        if ($item_check && $row = $item_check->fetch_assoc()) {
            $prev_status = $row['status'];
        }
        
        $action_label = "Status Update";
        if ($status === 'maintenance') {
            $action_label = "Send to Maintenance";
        } else if ($status === 'available') {
            $action_label = "Refurbish / Complete Maintenance";
        }
        
        // Perform status update & clear assignments if sent to maintenance or lost
        $clear_fields = ($status === 'maintenance' || $status === 'lost') 
            ? ", assigned_to_id = NULL, current_production_id = NULL" 
            : "";
            
        $sql = "UPDATE inventory_items SET status = '$status' $clear_fields WHERE id = '$item_id'";
        
        if ($conn->query($sql)) {
            // Write System Activity log
            $log_id = generate_uuid();
            $details_payload = json_encode(["previous_status" => $prev_status, "new_status" => $status]);
            
            $conn->query("INSERT INTO activity_logs (id, item_id, user_id, action, details) 
                          VALUES ('$log_id', '$item_id', 'u1', '$action_label', '$details_payload')");
            
            echo json_encode(["success" => true]);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "SQL Statement failed", "details" => $conn->error]);
        }
        break;

    // ==========================================
    // POST: Check out Equipment to a production & user
    // ==========================================
    case 'checkout':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(["error" => "Method not allowed"]);
            break;
        }
        
        $data = get_post_data();
        if (!$data || empty($data['itemId']) || empty($data['userId']) || empty($data['prodId'])) {
            http_response_code(400);
            echo json_encode(["error" => "Missing fields (itemId, userId, prodId)"]);
            break;
        }
        
        $item_id = $conn->real_escape_string($data['itemId']);
        $user_id = $conn->real_escape_string($data['userId']);
        $production_id = $conn->real_escape_string($data['prodId']);
        
        // Fetch production name for logging
        $prod_name = "Assigned Production";
        $prod_check = $conn->query("SELECT name FROM productions WHERE id = '$production_id'");
        if ($prod_check && $p_row = $prod_check->fetch_assoc()) {
            $prod_name = $p_row['name'];
        }
        
        // Ensure item is available
        $item_check = $conn->query("SELECT status FROM inventory_items WHERE id = '$item_id'");
        if ($item_check && $item_row = $item_check->fetch_assoc()) {
            if ($item_row['status'] !== 'available') {
                http_response_code(400);
                echo json_encode(["error" => "Equipment asset is not currently available for checkout."]);
                break;
            }
        }
        
        $sql = "UPDATE inventory_items 
                SET status = 'checked_out', assigned_to_id = '$user_id', current_production_id = '$production_id' 
                WHERE id = '$item_id'";
                
        if ($conn->query($sql)) {
            // Write action log
            $log_id = generate_uuid();
            $details_payload = json_encode(["production" => $prod_name]);
            
            $conn->query("INSERT INTO activity_logs (id, item_id, user_id, action, details) 
                          VALUES ('$log_id', '$item_id', '$user_id', 'Checkout', '$details_payload')");
            
            echo json_encode(["success" => true]);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "SQL Statement execution failed", "details" => $conn->error]);
        }
        break;

    // ==========================================
    // POST: Check in / Return Equipment
    // ==========================================
    case 'return':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(["error" => "Method not allowed"]);
            break;
        }
        
        $data = get_post_data();
        if (!$data || empty($data['itemId'])) {
            http_response_code(400);
            echo json_encode(["error" => "Item ID is required"]);
            break;
        }
        
        $item_id = $conn->real_escape_string($data['itemId']);
        
        // Fetch item details to populate logs
        $item_check = $conn->query("SELECT * FROM inventory_items WHERE id = '$item_id'");
        if (!$item_check || $item_check->num_rows === 0) {
            http_response_code(404);
            echo json_encode(["error" => "Item not found"]);
            break;
        }
        
        $item = $item_check->fetch_assoc();
        $user_id = $item['assigned_to_id'] ? $item['assigned_to_id'] : 'u2';
        $production_id = $item['current_production_id'];
        
        // Get production name for logs
        $prod_name = null;
        if ($production_id) {
            $p_check = $conn->query("SELECT name FROM productions WHERE id = '$production_id'");
            if ($p_check && $p_row = $p_check->fetch_assoc()) {
                $prod_name = $p_row['name'];
            }
        }
        
        // Reset item fields
        $sql = "UPDATE inventory_items 
                SET status = 'available', assigned_to_id = NULL, current_production_id = NULL 
                WHERE id = '$item_id'";
                
        if ($conn->query($sql)) {
            // Write return logs
            $log_id = generate_uuid();
            $details_payload = json_encode(["production" => $prod_name]);
            
            $conn->query("INSERT INTO activity_logs (id, item_id, user_id, action, details) 
                          VALUES ('$log_id', '$item_id', '$user_id', 'Return', '$details_payload')");
            
            echo json_encode(["success" => true]);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "Database table update failed", "details" => $conn->error]);
        }
        break;

    // ==========================================
    // DEFAULT ROUTE / ERROR
    // ==========================================
    default:
        http_response_code(404);
        echo json_encode([
            "status" => "online", 
            "message" => "CineFlow API Core active.",
            "database_connection" => "OK",
            "usage" => "Append action parameter like ?action=items"
        ]);
        break;
}

$conn->close();
?>
