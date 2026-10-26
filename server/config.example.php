<?php
// Copy to ../omega-private/config.php OUTSIDE the web document root. chmod 600.
// Rotate all credentials previously committed to this repository.
return [
    'environment' => 'production', // 'local' only with a loopback origin.
    'origin' => 'https://ghostwhite-sardine-651089.hostingersite.com',
    'db_host' => 'localhost',
    'db_name' => 'REPLACE_WITH_DATABASE_NAME',
    'db_user' => 'REPLACE_WITH_DATABASE_USER',
    'db_password' => 'REPLACE_WITH_ROTATED_PASSWORD',
    'private_dir' => __DIR__,
    'gemini_api_key' => '', // Optional; never exposed to the frontend.
];
