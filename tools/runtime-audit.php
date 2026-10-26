<?php
declare(strict_types=1);
// CLI only; install in omega-private. A one-use token protects the transient probe.
if (PHP_SAPI !== 'cli' || basename(__DIR__) !== 'omega-private') exit(1);
$root = dirname(__DIR__) . '/public_html';
$name = 'runtime-check-' . bin2hex(random_bytes(16)) . '.php';
$token = bin2hex(random_bytes(32));
$code = '<?php declare(strict_types=1); if(!hash_equals(' . var_export($token, true) . ',$_SERVER["HTTP_X_OMEGA_CHECK"]??"")){http_response_code(404);exit;} header("Content-Type: application/json"); header("Cache-Control: no-store"); $disabled=array_map("trim",explode(",",ini_get("disable_functions"))); echo json_encode(["php_version"=>PHP_VERSION,"display_errors_off"=>!filter_var(ini_get("display_errors"),FILTER_VALIDATE_BOOLEAN),"expose_php_off"=>!filter_var(ini_get("expose_php"),FILTER_VALIDATE_BOOLEAN),"uploads_disabled"=>!filter_var(ini_get("file_uploads"),FILTER_VALIDATE_BOOLEAN),"url_include_disabled"=>!filter_var(ini_get("allow_url_include"),FILTER_VALIDATE_BOOLEAN),"url_fopen_disabled"=>!filter_var(ini_get("allow_url_fopen"),FILTER_VALIDATE_BOOLEAN),"open_basedir_restricted"=>str_contains(ini_get("open_basedir"),"omega-private"),"dangerous_functions_disabled"=>count(array_diff(["exec","system","shell_exec","passthru","popen","proc_open"],$disabled))===0]);';
try {
    file_put_contents($root . '/' . $name, $code);
    chmod($root . '/' . $name, 0600);
    $curl = curl_init('https://ghostwhite-sardine-651089.hostingersite.com/' . $name);
    curl_setopt_array($curl, [CURLOPT_RETURNTRANSFER => true, CURLOPT_HTTPHEADER => ['X-Omega-Check: ' . $token], CURLOPT_TIMEOUT => 15]);
    $body = curl_exec($curl);
    $status = curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    curl_close($curl);
    if ($status !== 200) throw new RuntimeException('Runtime inspection failed.');
    echo json_encode(json_decode($body, true, 8, JSON_THROW_ON_ERROR)), "\n";
} finally {
    if (is_file($root . '/' . $name)) unlink($root . '/' . $name);
}
