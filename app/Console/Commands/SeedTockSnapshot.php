<?php

namespace App\Console\Commands;

use App\Services\Tock\TockSnapshot;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

class SeedTockSnapshot extends Command
{
    protected $signature = 'tock:seed {--file= : JSON backup of the previous last-good experience array}';

    protected $description = 'Preserve existing last-good Tock data without making an external request';

    public function handle(TockSnapshot $store): int
    {
        $store->ensureDirectory();
        $lock = fopen($store->path('refresh.lock'), 'c');
        if ($lock === false) {
            $this->error('Cannot open refresh lock.');

            return self::FAILURE;
        }
        try {
            if (! flock($lock, LOCK_EX | LOCK_NB)) {
                $this->error('Refresh in progress; try again later.');

                return self::FAILURE;
            }
            if ($store->experiences() !== []) {
                $this->info('A valid snapshot already exists; left unchanged.');

                return self::SUCCESS;
            }
            $file = $this->option('file');
            $items = $file
                ? (is_readable($file) ? json_decode(file_get_contents($file), true) : null)
                : Cache::get('tock.lecuvier.experiences.last-good.v2');
            if (! TockSnapshot::valid($items)) {
                $this->error('No valid saved experiences found. Snapshot not changed.');

                return self::FAILURE;
            }
            // Old cache contains no retrieval timestamp; do not label it as fresh.
            $store->write('snapshot.json', ['schema' => 1, 'fetched_at' => null,
                'source' => 'legacy', 'experiences' => $items]);
            $this->info('Preserved last-good data; original retrieval time is unknown.');

            return self::SUCCESS;
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }
}
