<?php

// Use only the pure parser. Do not boot Laravel or access its cache.
require dirname(__DIR__, 2).'/app/Services/Tock/TockExperienceRepository.php';

try {
    echo json_encode(
        (new App\Services\Tock\TockExperienceRepository)->parse(stream_get_contents(STDIN)),
        JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE
    );
} catch (Throwable $exception) {
    fwrite(STDERR, $exception->getMessage().PHP_EOL);
    exit(1);
}
