<?php

namespace Tests\Feature;

use App\Services\Tock\TockBrowser;
use App\Services\Tock\TockExperienceRepository;
use App\Services\Tock\TockSnapshot;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class TockRefreshTest extends TestCase
{
    private string $runtime;

    protected function setUp(): void
    {
        parent::setUp();
        $this->runtime = sys_get_temp_dir().'/tock-test-'.bin2hex(random_bytes(8));
        config(['tock.runtime_path' => $this->runtime, 'tock.browser_enabled' => true,
            'tock.snapshot_reads' => true, 'cache.default' => 'array']);
        Http::preventStrayRequests();
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->runtime);
        parent::tearDown();
    }

    private function items(): array
    {
        return (new TockExperienceRepository)->parse(file_get_contents(base_path('tests/Fixtures/tock-widget.html')));
    }

    public function test_http_success_never_starts_browser(): void
    {
        Http::fake(['*' => Http::response(file_get_contents(base_path('tests/Fixtures/tock-widget.html')))]);
        $this->mock(TockBrowser::class)->shouldNotReceive('collect');
        $this->artisan('tock:refresh')->assertSuccessful();
        $this->assertSame($this->items(), app(TockSnapshot::class)->experiences());
        Http::assertSentCount(1);
    }

    public function test_failed_browser_attempts_are_limited_to_six_hours_and_keep_snapshot(): void
    {
        Http::fake(['*' => Http::response('Just a moment...', 403)]);
        $store = app(TockSnapshot::class);
        $store->write('snapshot.json', ['schema' => 1, 'fetched_at' => now()->timestamp,
            'experiences' => $this->items()]);
        $this->mock(TockBrowser::class)->shouldReceive('collect')->twice()->andReturn(['status' => 'challenge']);
        $this->artisan('tock:refresh')->assertFailed();
        $firstAttempt = $store->read('state.json')['last_browser_attempt_at'];
        Cache::flush();
        $this->travel(359)->minutes();
        $this->artisan('tock:refresh')->assertSuccessful();
        $this->assertSame($firstAttempt, $store->read('state.json')['last_browser_attempt_at']);
        $this->assertSame($this->items(), $store->experiences());
        $this->travel(1)->minutes();
        $this->artisan('tock:refresh')->assertFailed();
    }

    public function test_browser_success_publishes_snapshot_and_request_reads_do_no_network_io(): void
    {
        Http::fake(['*' => Http::response('Unavailable', 503)]);
        $this->mock(TockBrowser::class)->shouldReceive('collect')->once()
            ->andReturn(['status' => 'ok', 'experiences' => $this->items()]);
        $this->artisan('tock:refresh')->assertSuccessful();
        Http::assertSentCount(2);
        Cache::flush();
        $this->assertSame($this->items(), (new TockExperienceRepository)->all());
        Http::assertSentCount(2);
        $this->get('/_search/experiences')->assertSuccessful()->assertSee('Wine, Cheese');
        Http::assertSentCount(2);
    }

    public function test_disabled_browser_and_missing_snapshot_do_not_launch_processes(): void
    {
        config(['tock.browser_enabled' => false]);
        $this->mock(TockBrowser::class)->shouldNotReceive('collect');
        $this->assertSame([], (new TockExperienceRepository)->all());
        Http::assertNothingSent();
        Http::fake(['*' => Http::response('Unavailable', 503)]);
        $this->artisan('tock:refresh')->assertFailed();
    }

    public function test_refresh_lock_prevents_parallel_fetches(): void
    {
        $store = app(TockSnapshot::class);
        $store->ensureDirectory();
        $lock = fopen($store->path('refresh.lock'), 'c');
        flock($lock, LOCK_EX);
        try {
            $this->mock(TockBrowser::class)->shouldNotReceive('collect');
            $this->artisan('tock:refresh')->assertSuccessful();
            Http::assertNothingSent();
        } finally {
            fclose($lock);
        }
    }

    public function test_corrupt_cooldown_state_blocks_browser_and_is_not_overwritten(): void
    {
        $store = app(TockSnapshot::class);
        $store->ensureDirectory();
        file_put_contents($store->path('state.json'), 'broken');
        $this->mock(TockBrowser::class)->shouldNotReceive('collect');
        $this->artisan('tock:refresh')->assertFailed();
        $this->assertSame('broken', file_get_contents($store->path('state.json')));
    }

    public function test_snapshot_rejects_external_booking_links_and_duplicate_ids(): void
    {
        $items = $this->items();
        $items[0]['booking_url'] = 'https://example.com/';
        $this->assertFalse(TockSnapshot::valid($items));
        $items = $this->items();
        $items[] = $items[0];
        $this->assertFalse(TockSnapshot::valid($items));
    }

    public function test_seed_preserves_cache_without_fetching_and_does_not_claim_freshness(): void
    {
        Cache::forever('tock.lecuvier.experiences.last-good.v2', $this->items());
        $this->artisan('tock:seed')->assertSuccessful();
        Cache::flush();
        $this->assertSame($this->items(), app(TockSnapshot::class)->experiences());
        $this->assertNull(app(TockSnapshot::class)->read()['fetched_at']);
        Http::assertNothingSent();
    }
}
