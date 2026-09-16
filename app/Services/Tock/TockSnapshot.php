<?php

namespace App\Services\Tock;

use RuntimeException;

class TockSnapshot
{
    public function path(string $file): string
    {
        return rtrim(config('tock.runtime_path'), '/').'/'.$file;
    }

    public function read(string $file = 'snapshot.json'): array
    {
        $path = $this->path($file);
        if (! is_file($path)) {
            return [];
        }

        $data = json_decode((string) file_get_contents($path), true);
        if ($file === 'state.json' && (! is_array($data) || json_last_error() !== JSON_ERROR_NONE)) {
            throw new RuntimeException('Tock refresh state is corrupt; refusing to bypass browser cooldown.');
        }

        return is_array($data) ? $data : [];
    }

    public function experiences(): array
    {
        $snapshot = $this->read();

        return ($snapshot['schema'] ?? null) === 1 && self::valid($snapshot['experiences'] ?? null)
            ? $snapshot['experiences'] : [];
    }

    public static function valid(mixed $items): bool
    {
        if (! is_array($items) || ! array_is_list($items) || $items === []) {
            return false;
        }
        $ids = [];
        foreach ($items as $item) {
            if (! is_array($item) || ! is_string($item['id'] ?? null)
                || ! ctype_digit($item['id']) || isset($ids[$item['id']])
                || ! is_string($item['title'] ?? null) || trim($item['title']) === '') {
                return false;
            }
            $ids[$item['id']] = true;
            foreach (['description', 'prices', 'party_sizes'] as $field) {
                if (! isset($item[$field]) || ! is_array($item[$field]) || ! array_is_list($item[$field])) {
                    return false;
                }
            }
            if ($item['description'] === []) {
                return false;
            }
            foreach (array_merge($item['description'], $item['prices']) as $text) {
                if (! is_string($text) || trim($text) === '') {
                    return false;
                }
            }
            foreach ($item['party_sizes'] as $size) {
                if (! is_int($size) || $size < 1) {
                    return false;
                }
            }
            foreach (['schedule', 'schedule_note'] as $field) {
                if (! array_key_exists($field, $item) || (! is_null($item[$field]) && ! is_string($item[$field]))) {
                    return false;
                }
            }
            if (! is_string($item['party_size_label'] ?? null) || ! is_string($item['booking_url'] ?? null)
                || ! preg_match('~^https://www\.exploretock\.com/lecuvierwinery/experience/'.preg_quote($item['id'], '~').'(?:/[^\s?#]*)?$~D', $item['booking_url'])) {
                return false;
            }
        }

        return true;
    }

    public function write(string $file, array $data): void
    {
        $this->ensureDirectory();
        $temporary = tempnam(dirname($this->path($file)), '.tock-');
        if ($temporary === false) {
            throw new RuntimeException('Cannot create Tock snapshot temporary file.');
        }
        try {
            chmod($temporary, 0600);
            if (file_put_contents($temporary, json_encode($data, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE)) === false
                || ! rename($temporary, $this->path($file))) {
                throw new RuntimeException('Cannot publish Tock snapshot.');
            }
        } finally {
            if (is_file($temporary)) {
                unlink($temporary);
            }
        }
    }

    public function ensureDirectory(): void
    {
        $directory = dirname($this->path('snapshot.json'));
        if (! is_dir($directory) && ! mkdir($directory, 0700, true) && ! is_dir($directory)) {
            throw new RuntimeException('Cannot create Tock runtime directory.');
        }
    }
}
