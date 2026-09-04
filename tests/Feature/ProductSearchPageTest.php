<?php

namespace Tests\Feature;

use App\Services\SearchCatalogSettings;
use App\Services\Tock\TockExperienceRepository;
use Mockery;
use Tests\TestCase;

class ProductSearchPageTest extends TestCase
{
    public function test_catalog_is_unlisted_and_not_cacheable(): void
    {
        $this->withoutVite();

        $this->get('/_search/catalog')
            ->assertOk()
            ->assertHeader('X-Robots-Tag', 'noindex, nofollow')
            ->assertHeader('X-Statamic-Uncacheable', 'true')
            ->assertHeader('Cache-Control', 'no-store, private')
            ->assertHeader('X-Frame-Options', 'SAMEORIGIN')
            ->assertSee('<meta name="robots" content="noindex, nofollow">', false)
            ->assertDontSee('class="navbar');
    }

    public function test_catalog_remains_uncacheable_with_full_static_caching(): void
    {
        $this->withoutVite();
        config(['statamic.static_caching.strategy' => 'full']);

        $this->get('/_search/catalog?q=syrah')
            ->assertOk()
            ->assertHeader('X-Statamic-Uncacheable', 'true')
            ->assertHeader('Cache-Control', 'no-store, private');
    }

    public function test_experience_text_links_to_the_existing_wine_tasting_page(): void
    {
        $repository = Mockery::mock(TockExperienceRepository::class);
        $repository->shouldReceive('all')->once()->andReturn([
            [
                'id' => '184594',
                'title' => 'Wine & Food Pairing',
                'description' => ['A tasting flight paired with seasonal food.'],
                'schedule' => 'Friday–Monday',
                'schedule_note' => null,
                'party_size_label' => '2–6 guests',
                'prices' => ['$45 per guest'],
            ],
        ]);
        $this->app->instance(TockExperienceRepository::class, $repository);

        $this->get('/_search/experiences')
            ->assertOk()
            ->assertHeader('X-Statamic-Uncacheable', 'true')
            ->assertSee('A tasting flight paired with seasonal food.')
            ->assertSee('href="/wine-tasting#tock-experience-184594"', false)
            ->assertDontSee('/product/');
    }

    public function test_curated_settings_are_safely_rendered_without_replacing_search_sources(): void
    {
        $this->withoutVite();
        $settings = (new SearchCatalogSettings)->fromValues([
            'search_opening_view' => 'featured',
            'search_featured_sections' => [
                ['kind' => 'collection', 'collection_slug' => 'bundles', 'heading' => '"><script>alert(1)</script>'],
                ['kind' => 'pages', 'pages' => ['page-id'], 'heading' => 'Plan a visit'],
            ],
        ]);
        $service = Mockery::mock(SearchCatalogSettings::class);
        $service->shouldReceive('viewData')->once()->andReturn($settings);
        $this->app->instance(SearchCatalogSettings::class, $service);

        $html = $this->get('/_search/catalog')->assertOk()->getContent();
        $dom = new \DOMDocument;
        @$dom->loadHTML($html);
        $xpath = new \DOMXPath($dom);
        $featured = $xpath->query('//*[@data-search-featured]')->item(0);
        $this->assertSame($settings['search_featured_json'], $featured->getAttribute('data-settings'));
        $this->assertStringNotContainsString('<script>alert(1)</script>', $html);
        $this->assertSame(6, $xpath->query('//*[@data-product-search-source]')->length);
    }
}
