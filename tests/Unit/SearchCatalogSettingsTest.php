<?php

namespace Tests\Unit;

use App\Services\SearchCatalogSettings;
use Statamic\Facades\Blueprint;
use Statamic\Facades\Role;
use Tests\TestCase;

class SearchCatalogSettingsTest extends TestCase
{
    public function test_winery_admin_can_edit_the_standalone_search_global(): void
    {
        $this->assertTrue(Role::find('winery_admin')->hasPermission('edit search globals'));
    }

    public function test_existing_catalog_and_opening_view_are_preserved_until_configured(): void
    {
        $data = (new SearchCatalogSettings)->fromValues([]);

        $this->assertSame(SearchCatalogSettings::DEFAULT_COLLECTIONS, array_column($data['search_collections'], 'slug'));
        $this->assertSame(['mode' => 'all', 'sections' => []], json_decode($data['search_featured_json'], true));
    }

    public function test_featured_collections_extend_the_corpus_and_sections_keep_their_order(): void
    {
        $data = (new SearchCatalogSettings)->fromValues([
            'search_collection_slugs' => ['available-wines', 'home'],
            'search_opening_view' => 'featured',
            'search_featured_sections' => [
                ['kind' => 'products', 'products' => [['product_url' => '/product/rose']], 'limit' => 2],
                ['kind' => 'collection', 'collection_slug' => ' seasonal-picks ', 'limit' => 4],
                ['kind' => 'collection', 'collection_slug' => 'home'],
                ['kind' => 'pages', 'pages' => ['wine-tasting', 'winemaking']],
            ],
        ]);

        $this->assertSame(['available-wines', 'home', 'seasonal-picks'], array_column($data['search_collections'], 'slug'));
        $settings = json_decode($data['search_featured_json'], true);
        $this->assertSame(['products', 'collection', 'collection', 'pages'], array_column($settings['sections'], 'kind'));
        $this->assertSame(['/product/rose'], $settings['sections'][0]['products']);
        $this->assertSame(['wine-tasting', 'winemaking'], $settings['sections'][3]['pages']);
    }

    public function test_disabled_curation_does_not_load_its_extra_collections(): void
    {
        foreach (['all', 'empty'] as $mode) {
            $data = (new SearchCatalogSettings)->fromValues([
                'search_opening_view' => $mode,
                'search_featured_sections' => [['kind' => 'collection', 'collection_slug' => 'seasonal']],
            ]);
            $this->assertSame(SearchCatalogSettings::DEFAULT_COLLECTIONS, array_column($data['search_collections'], 'slug'));
        }
    }

    public function test_control_panel_validation_accepts_section_types_and_rejects_invalid_product_urls(): void
    {
        $values = [
            'search_opening_view' => 'featured',
            'search_featured_sections' => [
                ['kind' => 'collection', 'collection_slug' => 'available-wines', 'limit' => 4],
                ['kind' => 'products', 'products' => [['product_url' => 'https://lcwine.com/product/rose']], 'limit' => 2],
                ['kind' => 'pages', 'pages' => [], 'limit' => 4],
            ],
        ];
        $validator = fn ($data) => Blueprint::find('globals.search')->fields()->addValues($data)->validator()->validator();
        $valid = $validator($values);
        $this->assertFalse($valid->fails(), $valid->errors()->toJson());

        $values['search_featured_sections'][1]['products'][0]['product_url'] = 'https://unrelated.example/product/rose';
        $this->assertTrue($validator($values)->fails());
        $values['search_featured_sections'][1]['products'][0]['product_url'] = '/product/rose';
        $this->assertFalse($validator($values)->fails());
    }
}
