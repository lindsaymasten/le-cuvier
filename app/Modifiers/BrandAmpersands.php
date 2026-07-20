<?php

namespace App\Modifiers;

use Statamic\Modifiers\Modifier;

class BrandAmpersands extends Modifier
{
    /**
     * Escape public text and render ampersands in Le Cuvier's italic face.
     */
    public function index($value): string
    {
        return str_replace(
            '&amp;',
            '<span class="brand-serif-italic">&amp;</span>',
            e((string) $value)
        );
    }
}
