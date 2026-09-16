<?php

namespace App\Services\Tock;

use Symfony\Component\Process\Process;

class TockBrowser
{
    public function collect(): array
    {
        foreach (['python', 'chrome', 'php'] as $key) {
            if (! is_executable(config('tock.'.$key, ''))) {
                return ['status' => 'missing_'.$key];
            }
        }
        $process = new Process([
            config('tock.python'), base_path('tools/tock-nodriver/collect.py'),
            '--chrome', config('tock.chrome'), '--php', config('tock.php'),
            '--profile', app(TockSnapshot::class)->path('profile'),
            '--xvfb', config('tock.xvfb'),
        ]);
        // The Python supervisor owns the shorter deadline and process-group cleanup.
        $process->setTimeout(100);
        $process->run();
        $result = json_decode($process->getOutput(), true);

        return $process->isSuccessful() && is_array($result)
            && ($result['status'] ?? null) === 'ok' && ($result['browserClosed'] ?? false)
            && TockSnapshot::valid($result['experiences'] ?? null)
            ? $result : ['status' => 'browser_failed'];
    }
}
