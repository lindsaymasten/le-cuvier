<?php

namespace App\Http\Controllers;

use App\Services\SearchCatalogSettings;
use App\Services\SiteSearchPages;
use Illuminate\Http\Response;
use Statamic\View\View;

class ProductSearchController extends Controller
{
    public function catalog(SearchCatalogSettings $settings): Response
    {
        // A separate document lets Commerce7 initialize normally, on demand.
        // It is deliberately outside the CMS page tree and sitemap.
        return $this->render('search/catalog', $settings->viewData());
    }

    public function experiences(): Response
    {
        // Reuse the Wine Tasting page's public Tock integration and cache.
        return $this->render('search/experiences');
    }

    public function pages(SiteSearchPages $pages): Response
    {
        return $this->render('search/pages', ['pages' => $pages->all()]);
    }

    private function render(string $template, array $data = []): Response
    {
        $html = (new View)
            ->template($template)
            ->layout(null)
            ->with($data)
            ->render();

        return response($html)
            ->header('X-Robots-Tag', 'noindex, nofollow')
            ->header('X-Statamic-Uncacheable', 'true')
            ->header('Cache-Control', 'private, no-store')
            ->header('X-Frame-Options', 'SAMEORIGIN');
    }
}
