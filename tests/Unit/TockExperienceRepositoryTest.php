<?php

namespace Tests\Unit;

use App\Services\Tock\TockExperienceRepository;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Statamic\Facades\Antlers;
use Statamic\Facades\YAML;
use Tests\TestCase;

class TockExperienceRepositoryTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        TockExperienceRepository::clearCache();
    }

    public function test_it_extracts_the_public_experience_content(): void
    {
        $experiences = (new TockExperienceRepository)->parse($this->fixture());

        $this->assertCount(3, $experiences);
        $this->assertSame('184594', $experiences[0]['id']);
        $this->assertSame('The “Original” Wine & Food Pairing', $experiences[0]['title']);
        $this->assertSame('FRIDAY—MONDAY', $experiences[0]['schedule']);
        $this->assertNull($experiences[0]['schedule_note']);
        $this->assertSame(
            ['Our traditional tasting flight of five wines from our current season each paired with a food bite, crafted by our chef, plated and ready to enjoy once you are seated.'],
            $experiences[0]['description']
        );
        $this->assertSame(['$10 | members', '$45 | non-members to be paid on-site'], $experiences[0]['prices']);
        $this->assertSame([2, 3, 4, 5, 6], $experiences[0]['party_sizes']);
        $this->assertSame('2–6 guests', $experiences[0]['party_size_label']);
        $this->assertSame(
            'https://www.exploretock.com/lecuvierwinery/experience/184594/the-original-wine-food-pairing',
            $experiences[0]['booking_url']
        );
        $this->assertSame('FRIDAY—SUNDAY', $experiences[1]['schedule']);
        $this->assertSame(
            'unavailable during the month of March—please see other experiences',
            $experiences[1]['schedule_note']
        );
        $this->assertSame('Entrée & Flight Experience', $experiences[1]['title']);
        $this->assertSame('353861', $experiences[2]['id']);
        $this->assertSame('Wine, Cheese & Charcuterie', $experiences[2]['title']);
    }

    public function test_it_extracts_experiences_from_the_embedded_public_page_state(): void
    {
        $experiences = (new TockExperienceRepository)->parse($this->reduxFixture());

        $this->assertCount(1, $experiences);
        $this->assertSame('353861', $experiences[0]['id']);
        $this->assertSame('Wine, Cheese & Charcuterie', $experiences[0]['title']);
        $this->assertSame('THURSDAYS ONLY', $experiences[0]['schedule']);
        $this->assertNull($experiences[0]['schedule_note']);
        $this->assertSame(
            ['Enjoy our current selection of wines with chef paired locally sourced cheeses and salami.'],
            $experiences[0]['description']
        );
        $this->assertSame(['$10 | members', '$45 | non-members to be paid on-site'], $experiences[0]['prices']);
        $this->assertSame([2, 3, 4, 5, 6], $experiences[0]['party_sizes']);
        $this->assertSame('2–6 guests', $experiences[0]['party_size_label']);
    }

    public function test_it_uses_the_public_page_fallback_when_tock_blocks_the_direct_request(): void
    {
        Http::fake(fn ($request) => str_contains($request->url(), 'r.jina.ai')
            ? Http::response($this->reduxFixture())
            : Http::response('Just a moment...', 403));

        $experiences = (new TockExperienceRepository)->all();

        $this->assertCount(1, $experiences);
        Http::assertSentCount(2);
        Http::assertSent(fn ($request) => str_contains($request->url(), 'r.jina.ai')
            && $request->hasHeader('X-No-Cache', 'true')
            && $request->hasHeader('X-Return-Format', 'html'));
    }

    public function test_it_serves_the_last_good_copy_when_both_public_pages_are_unavailable(): void
    {
        Http::fake([
            TockExperienceRepository::TOCK_WIDGET_URL => Http::response($this->fixture()),
        ]);

        $repository = new TockExperienceRepository;
        $expected = $repository->all();

        Cache::forget('tock.lecuvier.experiences.v2');
        Http::fake(fn () => Http::response('Unavailable', 503));

        $this->assertSame($expected, $repository->all());
    }

    public function test_the_statamic_block_renders_modal_ready_experiences(): void
    {
        Http::fake([
            TockExperienceRepository::TOCK_WIDGET_URL => Http::response($this->fixture()),
        ]);

        $template = str_replace(
            ['{{ nocache }}', '{{ /nocache }}'],
            '',
            file_get_contents(resource_path('views/blocks/tock.antlers.html'))
        );

        $output = (string) Antlers::parse(
            $template,
            [
                'id' => 'block-one',
                'introductory_content' => [
                    'show_subheading' => true,
                    'subheading' => 'Visit Le Cuvier',
                    'show_heading' => true,
                    'heading' => 'Tasting Reservations',
                    'show_introduction' => true,
                    'introduction' => 'Choose your tasting experience.',
                ],
                'button_label' => 'Reserve',
            ]
        );

        $this->assertStringContainsString('Visit Le Cuvier', $output);
        $this->assertStringContainsString('Tasting Reservations', $output);
        $this->assertStringContainsString('Choose your tasting experience.', $output);
        $this->assertStringContainsString('The “Original” Wine <span class="brand-serif-italic">&amp;</span> Food Pairing', $output);
        $this->assertStringContainsString('Entrée <span class="brand-serif-italic">&amp;</span> Flight Experience', $output);
        $this->assertStringContainsString('<span class="tock-experience__schedule-label">available</span>', $output);
        $this->assertStringContainsString('<em class="tock-experience__schedule-note">unavailable during the month of March—please see other experiences</em>', $output);
        $this->assertStringContainsString('data-tock-experience="184594"', $output);
        $this->assertStringContainsString('data-tock-experience="191491"', $output);
        $this->assertStringContainsString('data-tock-experience="353861"', $output);
        $this->assertStringContainsString(
            '<span class="sr-only"> The “Original” Wine <span class="brand-serif-italic">&amp;</span> Food Pairing</span>',
            $output
        );
        $this->assertStringContainsString(
            '<article class="tock-experience tock-experience--tilted" aria-labelledby="tock-experience-191491">',
            $output
        );
        $this->assertSame(1, substr_count($output, 'tock-experience--tilted'));
        $this->assertStringContainsString('2–6 guests', $output);
        $this->assertStringNotContainsString('temporarily unavailable', $output);

        $outputWithDisabledIntroductoryContent = (string) Antlers::parse(
            $template,
            [
                'id' => 'block-with-disabled-heading',
                'introductory_content' => [
                    'show_subheading' => false,
                    'subheading' => 'Visit Le Cuvier',
                    'show_heading' => false,
                    'heading' => 'Tasting Reservations',
                    'show_introduction' => false,
                    'introduction' => 'Choose your tasting experience.',
                ],
                'button_label' => 'Reserve',
            ]
        );

        $this->assertStringNotContainsString('class="tock-block__header"', $outputWithDisabledIntroductoryContent);
        $this->assertStringNotContainsString('Visit Le Cuvier', $outputWithDisabledIntroductoryContent);
        $this->assertStringNotContainsString('Tasting Reservations', $outputWithDisabledIntroductoryContent);
        $this->assertStringNotContainsString('Choose your tasting experience.', $outputWithDisabledIntroductoryContent);
        $this->assertStringContainsString('aria-labelledby="tock-heading-block-with-disabled-heading"', $outputWithDisabledIntroductoryContent);
        $this->assertStringContainsString(
            '<h2 id="tock-heading-block-with-disabled-heading" class="sr-only">Tasting reservations</h2>',
            $outputWithDisabledIntroductoryContent
        );

        $outputWithoutIntroductoryContent = (string) Antlers::parse(
            $template,
            [
                'id' => 'block-without-heading',
                'button_label' => 'Reserve',
            ]
        );

        $this->assertStringNotContainsString('class="tock-block__header"', $outputWithoutIntroductoryContent);
        $this->assertStringContainsString('aria-labelledby="tock-heading-block-without-heading"', $outputWithoutIntroductoryContent);
        $this->assertStringContainsString(
            '<h2 id="tock-heading-block-without-heading" class="sr-only">Tasting reservations</h2>',
            $outputWithoutIntroductoryContent
        );
    }

    public function test_the_introductory_fields_are_off_by_default_and_revealed_by_toggles(): void
    {
        $fieldset = YAML::parse(file_get_contents(resource_path('fieldsets/tock.yaml')));
        $fields = collect($fieldset['fields'][0]['field']['fields'])->keyBy('handle');

        foreach (['show_subheading', 'show_heading', 'show_introduction'] as $toggle) {
            $this->assertFalse($fields[$toggle]['field']['default']);
        }

        $this->assertArrayNotHasKey('default', $fields['subheading']['field']);
        $this->assertArrayNotHasKey('default', $fields['heading']['field']);
        $this->assertSame(['show_subheading' => 'equals true'], $fields['subheading']['field']['if']);
        $this->assertSame(['show_heading' => 'equals true'], $fields['heading']['field']['if']);
        $this->assertSame(['show_introduction' => 'equals true'], $fields['introduction']['config']['if']);
    }

    private function fixture(): string
    {
        return file_get_contents(base_path('tests/Fixtures/tock-widget.html'));
    }

    private function reduxFixture(): string
    {
        return file_get_contents(base_path('tests/Fixtures/tock-redux.html'));
    }
}
