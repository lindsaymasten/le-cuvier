<?php

namespace App\Services;

use Illuminate\Support\Str;
use Statamic\Contracts\Entries\Entry as EntryContract;
use Statamic\Facades\Entry;
use Statamic\Facades\Site;
use Statamic\Fields\Field;
use Statamic\Fields\Fields;

class SiteSearchPages
{
    public function all(): array
    {
        // Use current CMS content, so edits require no separate search-index job.
        return Entry::query()->where('site', Site::current()->handle())->where('published', true)->get()
            ->filter(fn ($entry) => $this->isSearchable($entry))
            ->map(function ($entry) {
                $text = $this->text($entry->blueprint()->fields()->setParent($entry)->except('title'), $entry->values()->all());

                return [
                    'id' => $entry->id(),
                    'title' => $entry->value('title'),
                    'url' => $entry->url(),
                    'text' => $text,
                    'excerpt' => Str::limit($text, 220),
                ];
            })->values()->all();
    }

    public function isSearchable(EntryContract $entry): bool
    {
        return $entry->status() === 'published'
            && ! $entry->private()
            && ! $entry->getProtectionScheme()
            && ! config('statamic.protect.default')
            && ! $entry->value('seo_noindex')
            && ! $entry->value('hidden')
            && ! $entry->isRedirect()
            && $entry->url()
            && ! in_array($entry->url(), ['/search', '/search/results']);
    }

    public function text(Fields $fields, array $values): string
    {
        $parts = [];
        foreach ($fields->all() as $field) {
            $handle = $field->handle();
            // SEO/configuration strings are not editorial page content.
            if (preg_match('/^(seo_|sitemap_|slug$|template$|layout$)/', $handle)
                || ($values['show_'.$handle] ?? true) === false) {
                continue;
            }

            $parts[] = $this->fieldText($field, $values[$handle] ?? null);
        }

        return trim(preg_replace('/\s+/u', ' ', implode(' ', $parts)) ?? '');
    }

    private function fieldText(Field $field, mixed $value): string
    {
        if ($value === null) {
            return '';
        }

        $type = $field->type();
        if (in_array($type, ['text', 'textarea', 'markdown'])) {
            $html = $type === 'markdown' ? Str::markdown((string) $value) : (string) $value;

            return html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        }

        if (! is_array($value)) {
            return '';
        }

        if ($type === 'bard') {
            return $this->bardText($value, $field);
        }

        if ($type === 'replicator') {
            return implode(' ', array_map(function ($row) use ($field) {
                if (! is_array($row) || ($row['enabled'] ?? true) === false || ! isset($row['type'])) {
                    return '';
                }

                return $this->text($field->fieldtype()->fields($row['type']), $row);
            }, $value));
        }

        if (in_array($type, ['group', 'grid'])) {
            $nested = new Fields($field->config()['fields'] ?? [], $field->parent(), $field);
            $rows = $type === 'group' ? [$value] : $value;

            return implode(' ', array_map(fn ($row) => is_array($row) ? $this->text($nested, $row) : '', $rows));
        }

        if ($type === 'list') {
            return implode(' ', array_filter($value, 'is_string'));
        }

        if ($type === 'table') {
            return collect($value)->flatMap(fn ($row) => $row['cells'] ?? [])
                ->map(fn ($cell) => html_entity_decode(strip_tags((string) $cell), ENT_QUOTES | ENT_HTML5, 'UTF-8'))->implode(' ');
        }

        // Assets, IDs, relationships, code embeds, toggles, and controls do not
        // contribute text. Their linked public entries are indexed separately.
        return '';
    }

    private function bardText(array $nodes, Field $field): string
    {
        $parts = [];
        foreach ($nodes as $node) {
            if (! is_array($node)) {
                continue;
            }
            if (($node['type'] ?? null) === 'text') {
                $parts[] = $node['text'] ?? '';
            } elseif (($node['type'] ?? null) === 'set') {
                $row = $node['attrs']['values'] ?? [];
                if (($row['enabled'] ?? true) !== false && isset($row['type'])) {
                    $parts[] = $this->text($field->fieldtype()->fields($row['type']), $row);
                }
            } elseif (isset($node['content'])) {
                $parts[] = $this->bardText($node['content'], $field);
            }
        }

        return implode(' ', $parts);
    }
}
