<?php

namespace App\Console\Commands;

use App\Services\Tock\TockBrowser;
use App\Services\Tock\TockExperienceRepository;
use App\Services\Tock\TockSnapshot;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Throwable;

class RefreshTockExperiences extends Command
{
    protected $signature = 'tock:refresh';

    protected $description = 'Refresh durable Tock data with HTTP first and a six-hour browser fallback cooldown';

    public function handle(TockExperienceRepository $repository, TockSnapshot $store, TockBrowser $browser): int
    {
        $store->ensureDirectory();
        $lock = fopen($store->path('refresh.lock'), 'c');
        if ($lock === false) {
            $this->error('Cannot open refresh lock.');

            return self::FAILURE;
        }
        if (! flock($lock, LOCK_EX | LOCK_NB)) {
            fclose($lock);
            $this->info('Another refresh is running; skipped.');

            return self::SUCCESS;
        }
        $state = [];
        try {
            $state = $store->read('state.json');
            $state['last_attempt_at'] = now()->timestamp;
            $items = $repository->fetch(requireComplete: true);
            $source = 'php';
            $outcome = 'http_ok';
            if (! TockSnapshot::valid($items)) {
                $outcome = 'http_failed_browser_disabled';
                if (config('tock.browser_enabled')) {
                    $outcome = 'browser_cooldown';
                    if (now()->timestamp - (int) ($state['last_browser_attempt_at'] ?? 0) >= config('tock.browser_cooldown_seconds')) {
                        $state['last_browser_attempt_at'] = now()->timestamp;
                        $state['outcome'] = 'browser_started';
                        $store->write('state.json', $state);
                        $result = $browser->collect();
                        $items = ($result['status'] ?? null) === 'ok' ? ($result['experiences'] ?? []) : [];
                        $outcome = ($result['status'] ?? 'browser_failed') === 'ok' && TockSnapshot::valid($items)
                            ? 'browser_ok' : 'browser_failed';
                        $source = 'browser';
                    }
                }
            }
            if (TockSnapshot::valid($items)) {
                $store->write('snapshot.json', [
                    'schema' => 1, 'fetched_at' => now()->timestamp,
                    'source' => $source, 'experiences' => $items,
                ]);
            }
            $state['outcome'] = $outcome;
            $store->write('state.json', $state);
            Log::info('Tock refresh completed.', ['outcome' => $outcome]);
            $this->info($outcome);

            return in_array($outcome, ['http_ok', 'browser_ok', 'browser_cooldown'], true)
                ? self::SUCCESS : self::FAILURE;
        } catch (Throwable $exception) {
            // Do not rewrite unreadable state: doing so could erase cooldown history.
            if ($state !== []) {
                $state['outcome'] = 'refresh_error';
                try {
                    $store->write('state.json', $state);
                } catch (Throwable) {
                    // Keep the original failure visible even if the disk is unavailable.
                }
            }
            Log::warning('Tock refresh failed; last-good snapshot retained.', ['exception' => $exception::class]);
            $this->error('Refresh failed; last-good snapshot retained. Check the application log.');

            return self::FAILURE;
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }
}
