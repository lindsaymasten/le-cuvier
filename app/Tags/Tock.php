<?php

namespace App\Tags;

use App\Services\Tock\TockExperienceLayout;
use App\Services\Tock\TockExperienceRepository;
use Statamic\Tags\Tags;

class Tock extends Tags
{
    public function __construct(
        private readonly TockExperienceRepository $experiences,
        private readonly TockExperienceLayout $layout,
    ) {}

    /**
     * The {{ tock }} tag pair.
     */
    public function index(): string|array
    {
        $experiences = $this->layout->apply($this->experiences->all());
        $data = [
            'experiences' => $experiences,
            'has_experiences' => $experiences !== [],
        ];

        return $this->isPair ? $this->parse($data) : $data;
    }
}
