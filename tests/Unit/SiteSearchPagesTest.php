<?php

namespace Tests\Unit;

use App\Services\SiteSearchPages;
use Mockery;
use Statamic\Entries\Entry;
use Statamic\Fields\Fields;
use Tests\TestCase;

class SiteSearchPagesTest extends TestCase
{
    public function test_non_public_and_noindex_pages_are_excluded(): void
    {
        config(['statamic.protect.default' => null]);
        $service = new SiteSearchPages;
        foreach ([[], ['status' => 'draft'], ['private' => true], ['protect' => 'members'], ['seo_noindex' => true], ['hidden' => true], ['url' => '/search/results']] as $overrides) {
            $data = array_merge(['status' => 'published', 'private' => false, 'protect' => null, 'seo_noindex' => false, 'hidden' => false, 'url' => '/winemaking'], $overrides);
            $entry = Mockery::mock(Entry::class);
            $entry->shouldReceive('status')->andReturn($data['status']);
            $entry->shouldReceive('private')->andReturn($data['private']);
            $entry->shouldReceive('getProtectionScheme')->andReturn($data['protect']);
            $entry->shouldReceive('value')->with('seo_noindex')->andReturn($data['seo_noindex']);
            $entry->shouldReceive('value')->with('hidden')->andReturn($data['hidden']);
            $entry->shouldReceive('isRedirect')->andReturn(false);
            $entry->shouldReceive('url')->andReturn($data['url']);
            $this->assertSame($overrides === [], $service->isSearchable($entry));
        }
    }

    public function test_rich_text_and_enabled_blocks_are_searchable_without_metadata(): void
    {
        $fields = new Fields([
            ['handle' => 'title', 'field' => ['type' => 'text']],
            ['handle' => 'seo_description', 'field' => ['type' => 'textarea']],
            ['handle' => 'image', 'field' => ['type' => 'assets']],
            ['handle' => 'blocks', 'field' => ['type' => 'replicator', 'sets' => [
                'main' => ['sets' => ['article' => ['fields' => [
                    ['handle' => 'body', 'field' => ['type' => 'bard']],
                ]]]],
            ]]],
        ]);
        $paragraph = fn ($text) => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => $text]]]];
        $text = (new SiteSearchPages)->text($fields, [
            'title' => 'Winemaking',
            'seo_description' => 'SEO-only keywords',
            'image' => 'internal-file-name.jpg',
            'blocks' => [
                ['type' => 'article', 'body' => $paragraph('Calcareous soils and natural fermentation.')],
                ['type' => 'article', 'enabled' => false, 'body' => $paragraph('Unpublished block copy.')],
            ],
        ]);

        $this->assertSame('Winemaking Calcareous soils and natural fermentation.', $text);
    }

    public function test_group_text_respects_disabled_optional_headings(): void
    {
        $fields = new Fields([
            ['handle' => 'intro', 'field' => ['type' => 'group', 'fields' => [
                ['handle' => 'heading', 'field' => ['type' => 'text']],
                ['handle' => 'description', 'field' => ['type' => 'textarea']],
            ]]],
        ]);

        $text = (new SiteSearchPages)->text($fields, ['intro' => [
            'show_heading' => false,
            'heading' => 'Hidden headline',
            'description' => 'Wine &amp; food pairings.',
        ]]);

        $this->assertSame('Wine & food pairings.', $text);
    }
}
