<?php

namespace App\Services\Tock;

use DOMDocument;
use DOMElement;
use DOMXPath;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use JsonException;
use Throwable;

class TockExperienceRepository
{
    public const TOCK_WIDGET_URL = 'https://www.exploretock.com/lecuvierwinery/widget/experiences';

    public const RENDERED_WIDGET_URL = 'https://r.jina.ai/https://www.exploretock.com/lecuvierwinery/widget/experiences';

    private const CACHE_KEY = 'tock.lecuvier.experiences.v2';

    private const LAST_GOOD_CACHE_KEY = 'tock.lecuvier.experiences.last-good.v2';

    private const CACHE_SECONDS = 300;

    /**
     * Return the current public Tock experiences, cached for five minutes.
     *
     * @return array<int, array<string, mixed>>
     */
    public function all(): array
    {
        if (Cache::has(self::CACHE_KEY)) {
            return Cache::get(self::CACHE_KEY, []);
        }

        $experiences = $this->fetch();

        if ($experiences !== []) {
            Cache::put(self::CACHE_KEY, $experiences, self::CACHE_SECONDS);
            Cache::forever(self::LAST_GOOD_CACHE_KEY, $experiences);

            return $experiences;
        }

        $lastGood = Cache::get(self::LAST_GOOD_CACHE_KEY, []);

        // Briefly cache a failed refresh so a Tock outage cannot cause a request stampede.
        Cache::put(self::CACHE_KEY, $lastGood, 60);

        return $lastGood;
    }

    public static function clearCache(): void
    {
        Cache::forget(self::CACHE_KEY);
        Cache::forget(self::LAST_GOOD_CACHE_KEY);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function parse(string $html): array
    {
        if ($html === '') {
            return [];
        }

        $experiences = [];

        // Tock may render only the first cards while retaining the complete
        // reservation list in page state. Merge both sources by public ID.
        foreach (array_merge($this->parseRenderedCards($html), $this->parseEmbeddedState($html)) as $experience) {
            $experiences[$experience['id']] = $experience;
        }

        return array_values($experiences);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function parseRenderedCards(string $html): array
    {
        if (! str_contains($html, 'offering-link_')) {
            return [];
        }

        $previous = libxml_use_internal_errors(true);
        $document = new DOMDocument;
        $loaded = $document->loadHTML(
            '<?xml encoding="UTF-8">'.$html,
            LIBXML_COMPACT | LIBXML_NONET | LIBXML_NOERROR | LIBXML_NOWARNING
        );
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        if (! $loaded) {
            return [];
        }

        $xpath = new DOMXPath($document);
        $links = $xpath->query("//a[starts-with(@data-testid, 'offering-link_')]");

        if ($links === false) {
            return [];
        }

        $experiences = [];

        foreach ($links as $link) {
            if (! $link instanceof DOMElement) {
                continue;
            }

            $experience = $this->parseExperience($xpath, $link);

            if ($experience !== null) {
                $experiences[] = $experience;
            }
        }

        return $experiences;
    }

    /**
     * Read the valid experience array from Tock's public page state without
     * evaluating the surrounding JavaScript object.
     *
     * @return array<int, array<string, mixed>>
     */
    private function parseEmbeddedState(string $html): array
    {
        if (! preg_match(
            '/"offerings"\s*:\s*\{\s*"experience"\s*:\s*/u',
            $html,
            $match,
            PREG_OFFSET_CAPTURE
        )) {
            return [];
        }

        $arrayStart = $match[0][1] + strlen($match[0][0]);
        $json = $this->extractJsonArray($html, $arrayStart);

        if ($json === null) {
            return [];
        }

        try {
            $offerings = json_decode(
                $this->normalizeJavascriptValues($json),
                true,
                flags: JSON_THROW_ON_ERROR
            );
        } catch (JsonException) {
            return [];
        }

        $experiences = [];

        foreach ($offerings as $offering) {
            if (! is_array($offering)) {
                continue;
            }

            $id = (string) ($offering['id'] ?? '');
            $title = $this->smartQuotes(trim((string) ($offering['name'] ?? '')));
            $slug = trim((string) ($offering['slug'] ?? ''));

            if ($id === '' || $title === '') {
                continue;
            }

            [$description, $prices, $schedule, $scheduleNote] = $this->separateDescription(
                (string) ($offering['description'] ?? '')
            );
            [$partySizes, $partySizeLabel] = $this->partySizeDetails(
                is_array($offering['partySize'] ?? null) ? $offering['partySize'] : []
            );

            $experiences[] = [
                'id' => $id,
                'title' => $title,
                'schedule' => $schedule,
                'schedule_note' => $scheduleNote,
                'description' => $description,
                'prices' => $prices,
                'party_sizes' => $partySizes,
                'party_size_label' => $partySizeLabel,
                'booking_url' => 'https://www.exploretock.com/lecuvierwinery/experience/'.$id.($slug !== '' ? '/'.$slug : ''),
            ];
        }

        return $experiences;
    }

    private function extractJsonArray(string $source, int $offset): ?string
    {
        $length = strlen($source);

        while ($offset < $length && ctype_space($source[$offset])) {
            $offset++;
        }

        if ($offset >= $length || $source[$offset] !== '[') {
            return null;
        }

        $depth = 0;
        $inString = false;
        $escaped = false;

        for ($index = $offset; $index < $length; $index++) {
            $character = $source[$index];

            if ($inString) {
                if ($escaped) {
                    $escaped = false;
                } elseif ($character === '\\') {
                    $escaped = true;
                } elseif ($character === '"') {
                    $inString = false;
                }

                continue;
            }

            if ($character === '"') {
                $inString = true;
            } elseif ($character === '[') {
                $depth++;
            } elseif ($character === ']' && --$depth === 0) {
                return substr($source, $offset, $index - $offset + 1);
            }
        }

        return null;
    }

    /**
     * Tock's page state occasionally contains JavaScript `undefined` values.
     * Replace only standalone values outside strings so the experience array
     * remains safe to decode as data rather than evaluated as JavaScript.
     */
    private function normalizeJavascriptValues(string $source): string
    {
        $normalized = '';
        $length = strlen($source);
        $inString = false;
        $escaped = false;

        for ($index = 0; $index < $length; $index++) {
            $character = $source[$index];

            if ($inString) {
                $normalized .= $character;

                if ($escaped) {
                    $escaped = false;
                } elseif ($character === '\\') {
                    $escaped = true;
                } elseif ($character === '"') {
                    $inString = false;
                }

                continue;
            }

            if ($character === '"') {
                $inString = true;
                $normalized .= $character;

                continue;
            }

            if (
                substr_compare($source, 'undefined', $index, 9) === 0
                && ($index === 0 || ! preg_match('/[A-Za-z0-9_$]/', $source[$index - 1]))
                && ($index + 9 >= $length || ! preg_match('/[A-Za-z0-9_$]/', $source[$index + 9]))
            ) {
                $normalized .= 'null';
                $index += 8;

                continue;
            }

            $normalized .= $character;
        }

        return $normalized;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function fetch(): array
    {
        $sources = [
            [self::TOCK_WIDGET_URL, []],
            [self::RENDERED_WIDGET_URL, [
                'X-No-Cache' => 'true',
                'X-Return-Format' => 'html',
            ]],
        ];

        foreach ($sources as [$url, $headers]) {
            try {
                $response = $this->request($headers)->get($url)->throw();
                $experiences = $this->parse($response->body());

                if ($experiences !== []) {
                    return $experiences;
                }
            } catch (Throwable $exception) {
                Log::notice('Unable to refresh Le Cuvier Tock experiences from a public page.', [
                    'source' => parse_url($url, PHP_URL_HOST),
                    'exception' => $exception::class,
                ]);
            }
        }

        return [];
    }

    /**
     * @param  array<string, string>  $headers
     */
    private function request(array $headers): PendingRequest
    {
        return Http::accept('text/html,application/xhtml+xml')
            ->withHeaders($headers)
            ->withUserAgent('Le Cuvier Winery website (https://lcwine.com)')
            ->connectTimeout(5)
            ->timeout(15);
    }

    /**
     * @return array<string, mixed>|null
     */
    private function parseExperience(DOMXPath $xpath, DOMElement $link): ?array
    {
        $rawTitle = trim($link->textContent);
        $title = $this->smartQuotes($rawTitle);
        $href = trim($link->getAttribute('href'));

        if ($title === '' || ! preg_match('~/experience/(\d+)/~', $href, $idMatch)) {
            return null;
        }

        $label = $this->descriptionFromLabel($link->getAttribute('aria-label'), $rawTitle);
        [$description, $prices, $schedule, $scheduleNote] = $this->separateDescription($label);
        [$partySizes, $partySizeLabel] = $this->partySizes($xpath, $link);

        return [
            'id' => $idMatch[1],
            'title' => $title,
            'schedule' => $schedule,
            'schedule_note' => $scheduleNote,
            'description' => $description,
            'prices' => $prices,
            'party_sizes' => $partySizes,
            'party_size_label' => $partySizeLabel,
            'booking_url' => $this->bookingUrl($href),
        ];
    }

    private function descriptionFromLabel(string $label, string $title): string
    {
        $label = str_replace(["\r\n", "\r", "\u{00A0}"], ["\n", "\n", ' '], trim($label));
        $label = preg_replace('/\s*\(opens a dialog\)\s*$/u', '', $label) ?? $label;
        $prefix = "Book now {$title},";

        if (str_starts_with($label, $prefix)) {
            $label = substr($label, strlen($prefix));
        }

        return trim($label);
    }

    /**
     * @return array{0: array<int, string>, 1: array<int, string>, 2: string|null, 3: string|null}
     */
    private function separateDescription(string $description): array
    {
        $descriptionLines = [];
        $prices = [];

        foreach (preg_split('/\R/u', $description) ?: [] as $line) {
            $line = trim($line);

            if (preg_match('/^(?:from\s+)?[$€£]\s*\d/iu', $line)) {
                $prices[] = preg_replace('/\s*\|\s*/u', ' | ', $line) ?? $line;

                continue;
            }

            $descriptionLines[] = $line;
        }

        $schedule = null;
        $scheduleNote = null;

        if (isset($descriptionLines[0]) && $this->isScheduleLine($descriptionLines[0])) {
            [$schedule, $scheduleNote] = $this->scheduleParts(array_shift($descriptionLines));
        }

        $description = trim(implode("\n", $descriptionLines));
        $paragraphs = preg_split('/\n{2,}/u', $description) ?: [];
        $paragraphs = array_values(array_filter(array_map(
            fn (string $paragraph): string => $this->smartQuotes(
                preg_replace('/\s*\n\s*/u', ' ', trim($paragraph)) ?? trim($paragraph)
            ),
            $paragraphs
        )));

        $prices = array_map($this->smartQuotes(...), array_values(array_unique($prices)));

        return [$paragraphs, $prices, $schedule, $scheduleNote];
    }

    /**
     * @return array{0: string, 1: string|null}
     */
    private function scheduleParts(string $schedule): array
    {
        if (! preg_match('/^(.*?)\s*\((.*?)\)\s*$/u', $schedule, $matches)) {
            return [$this->smartQuotes(trim($schedule)), null];
        }

        $note = preg_replace('/^\*+\s*/u', '', trim($matches[2])) ?? trim($matches[2]);

        return [
            $this->smartQuotes(trim($matches[1])),
            $this->smartQuotes($note),
        ];
    }

    private function isScheduleLine(string $line): bool
    {
        return (bool) preg_match(
            '/^(?:MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)(?:S)?\b/u',
            $line
        );
    }

    private function smartQuotes(string $text): string
    {
        $text = preg_replace('/(\p{L})\s+[-–—]\s+(?=\p{L})/u', '$1—', $text) ?? $text;
        $text = preg_replace('/(^|[\s([{—–-])"(?=\S)/u', '$1“', $text) ?? $text;
        $text = str_replace('"', '”', $text);
        $text = preg_replace("/(?<=[\\p{L}\\p{N}])'(?=[\\p{L}\\p{N}])/u", '’', $text) ?? $text;
        $text = preg_replace("/(^|[\\s([{—–-])'(?=\\S)/u", '$1‘', $text) ?? $text;

        return str_replace("'", '’', $text);
    }

    /**
     * @return array{0: array<int, int>, 1: string}
     */
    private function partySizes(DOMXPath $xpath, DOMElement $link): array
    {
        $section = $xpath->query('ancestor::section[1]', $link)?->item(0);
        $partyText = $section instanceof DOMElement
            ? trim($xpath->query(".//*[@data-testid='offering-details']", $section)?->item(0)?->textContent ?? '')
            : '';

        $partyText = preg_replace('/\s+/u', ' ', str_replace("\u{00A0}", ' ', $partyText)) ?? $partyText;

        if (preg_match('/parties? of (\d+) to (\d+)/i', $partyText, $matches)) {
            $minimum = (int) $matches[1];
            $maximum = (int) $matches[2];

            return $this->partySizeDetails(range($minimum, $maximum));
        }

        if (preg_match('/parties? of (\d+)/i', $partyText, $matches)) {
            return $this->partySizeDetails([(int) $matches[1]]);
        }

        return [[], $partyText];
    }

    /**
     * @param  array<int, mixed>  $sizes
     * @return array{0: array<int, int>, 1: string}
     */
    private function partySizeDetails(array $sizes): array
    {
        $sizes = array_values(array_unique(array_filter(
            array_map('intval', $sizes),
            fn (int $size): bool => $size > 0
        )));
        sort($sizes);

        if ($sizes === []) {
            return [[], ''];
        }

        if (count($sizes) === 1) {
            return [$sizes, $sizes[0].' guests'];
        }

        $minimum = min($sizes);
        $maximum = max($sizes);

        if ($sizes === range($minimum, $maximum)) {
            return [$sizes, "{$minimum}–{$maximum} guests"];
        }

        $last = array_pop($sizes);
        $label = count($sizes) === 1
            ? $sizes[0]." and {$last} guests"
            : implode(', ', $sizes).", and {$last} guests";
        $sizes[] = $last;

        return [$sizes, $label];
    }

    private function bookingUrl(string $href): string
    {
        $url = str_starts_with($href, 'http')
            ? $href
            : 'https://www.exploretock.com/'.ltrim($href, '/');

        return str_replace('/widget/experience/', '/experience/', $url);
    }
}
