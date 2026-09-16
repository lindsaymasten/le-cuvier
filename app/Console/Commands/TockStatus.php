<?php

namespace App\Console\Commands;

use App\Services\Tock\TockSnapshot;
use Illuminate\Console\Command;

class TockStatus extends Command
{
    protected $signature = 'tock:status';

    protected $description = 'Show Tock snapshot freshness and refresh state without fetching anything';

    public function handle(TockSnapshot $store): int
    {
        $snapshot = $store->read();
        $this->line(json_encode([
            'snapshot_reads' => config('tock.snapshot_reads'),
            'browser_enabled' => config('tock.browser_enabled'),
            'valid_snapshot' => $store->experiences() !== [],
            'count' => count($store->experiences()),
            'age_seconds' => isset($snapshot['fetched_at']) ? now()->timestamp - $snapshot['fetched_at'] : null,
            'source' => $snapshot['source'] ?? null,
            'state' => $store->read('state.json'),
        ], JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR));

        return self::SUCCESS;
    }
}
