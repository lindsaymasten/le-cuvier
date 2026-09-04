<?php

namespace App\Services;

use Statamic\Facades\GlobalSet;

class SearchCatalogSettings
{
    public const DEFAULT_COLLECTIONS = [
        'available-wines', 'home', 'wine-search-results',
        'event-tasting-experiences', 'bundles', 'limited',
    ];

    public function viewData(): array
    {
        $values = GlobalSet::findByHandle('search')?->inCurrentSite()?->values()->all() ?? [];

        return $this->fromValues($values);
    }

    public function fromValues(array $values): array
    {
        $mode = $values['search_opening_view'] ?? 'all';
        $mode = in_array($mode, ['all', 'featured', 'empty'], true) ? $mode : 'all';
        $collections = $this->slugs($values['search_collection_slugs'] ?? []) ?: self::DEFAULT_COLLECTIONS;
        $sections = [];

        foreach (array_slice($values['search_featured_sections'] ?? [], 0, 8) as $row) {
            $kind = $row['kind'] ?? 'collection';
            if (! in_array($kind, ['collection', 'products', 'pages'], true)) {
                continue;
            }

            $slug = $this->slugs([$row['collection_slug'] ?? ''])[0] ?? null;
            // Add selected collections to the corpus; never replace its sources.
            if ($mode === 'featured' && $kind === 'collection' && $slug) {
                $collections[] = $slug;
            }

            $sections[] = [
                'kind' => $kind,
                'heading' => $row['heading'] ?? '',
                'limit' => max(1, min(24, (int) ($row['limit'] ?? 4))),
                'collection' => $kind === 'collection' ? $slug : null,
                'products' => $kind === 'products' ? array_column($row['products'] ?? [], 'product_url') : [],
                'pages' => $kind === 'pages' ? ($row['pages'] ?? []) : [],
            ];
        }

        return [
            'search_collections' => array_map(fn ($slug) => ['slug' => $slug], array_values(array_unique($collections))),
            'search_featured_json' => json_encode(['mode' => $mode, 'sections' => $sections], JSON_THROW_ON_ERROR),
        ];
    }

    private function slugs(array $values): array
    {
        return array_values(array_filter(array_map(fn ($slug) => is_string($slug) ? trim($slug) : '', $values),
            fn ($slug) => preg_match('/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/', $slug)));
    }
}
