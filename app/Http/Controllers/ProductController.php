<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Http\Response;

class ProductController extends Controller
{
    public function show(Request $request, string $handle): Response
    {
        // Normalize slug
        $handle = strtolower($handle);

        // Cache key per product
        $cacheKey = "c7_product_{$handle}";

        // Fetch (or read cache) from Commerce7 Storefront API
        $product = Cache::remember($cacheKey, now()->addMinutes(10), function () use ($handle) {
            $resp = Http::withBasicAuth(env('C7_APP_ID'), env('C7_APP_SECRET'))
                ->withHeaders([
                    'tenant' => env('C7_TENANT_ID'),
                    'Accept' => 'application/json',
                ])
                ->get(
                    rtrim(env('C7_API_BASE'), '/').'/v1/product/for-web',
                    ['productSlug' => $handle] // Example: 2022-grenache
                );

            if (! $resp->ok()) {
                // Log for post-demo debugging; allows view to fall back to C7 widget
                \Log::warning('C7 product fetch failed', [
                    'status' => $resp->status(),
                    'slug'   => $handle,
                    'body'   => $resp->body(),
                ]);
                return null;
            }

            return $resp->json();
        });

        // Normalize fields for the view (guard against null)
        $title   = $product['title']   ?? null;
        $teaser  = $product['teaser']  ?? null;
        $content = $product['content'] ?? null;
        $images  = $product['images']  ?? [];   // array of URLs/objects
        $metas   = $product['meta']    ?? [];   // custom fields by code

        // Pre-populated cart link on your own /cart route (only if we have a product)
        $primaryVariantSku = $product['variants'][0]['sku'] ?? null;
        $addToCartUrl = $primaryVariantSku
            ? url('/cart?addToCart=' . urlencode($primaryVariantSku))
            : null;

        // Render through Statamic’s layout so assets (like C7 JS/CSS) load
        $html = (new \Statamic\View\View)
            ->template('product')   // resources/views/product.antlers.html
            ->layout('layout')      // resources/views/layout.antlers.html
            ->with([
                'handle'       => $handle,
                'title'        => $title,
                'teaser'       => $teaser,
                'content'      => $content,
                'images'       => $images,
                'metas'        => $metas,
                'addToCartUrl' => $addToCartUrl,
                'product'      => $product,
            ])
            ->render();

        return response($html);
    }
}
