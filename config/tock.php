<?php

return [
    'snapshot_reads' => env('TOCK_SNAPSHOT_READS', false),
    'browser_enabled' => env('TOCK_BROWSER_ENABLED', false),
    'runtime_path' => env('TOCK_RUNTIME_PATH', storage_path('app/tock-runtime')),
    'python' => env('TOCK_PYTHON', ''),
    'chrome' => env('TOCK_CHROME', ''),
    'xvfb' => env('TOCK_XVFB', '/usr/bin/xvfb-run'),
    'php' => env('TOCK_PHP', PHP_BINARY),
    // Failed attempts consume the same cooldown as successful attempts.
    'browser_cooldown_seconds' => 21600,
];
