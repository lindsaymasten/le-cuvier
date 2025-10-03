<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\View\View;

class ProductController extends Controller
{
    public function show(Request $request, string $handle): View
    {
        // Basic guard: only lowercase slugs
        $handle = strtolower($handle);

        // Cache key per product
        $cacheKey = "c7_product_{$handle}";

        // Fetch (or read cache) from Commerce7 Storefront API
        $product = Cache::remember($cacheKey, now()->addMinutes(10), function () use ($handle) {
            // ⚠️ Replace with your C7 Storefront API endpoint for "product by handle"
            // and required headers (Tenant/public key). Keep secrets server-side.
            // Example shape (pseudo):
            $resp = Http::withHeaders([
                'Tenant' => env('C7_TENANT_ID'),
                // 'X-API-Key' => env('C7_PUBLIC_API_KEY'), // if your endpoint requires it
            ])->get(env('C7_API_BASE').'/storefront/products/handle/'.$handle);

            abort_unless($resp->ok(), 404);

            return $resp->json();
        });

        // Normalize fields we’ll use in the template
        $title   = $product['title']   ?? '';
        $teaser  = $product['teaser']  ?? '';
        $content = $product['content'] ?? '';
        $images  = $product['images']  ?? [];   // expect array of URLs/objects
        $metas   = $product['meta']    ?? [];   // custom fields by code

        // Build a supported “Add to Cart” URL for this product/variant (C7 supports pre-populated cart links)
        // See: “Create a shareable cart/checkout link with a product pre-populated”.
        // Keep this minimal and server-side.
        $primaryVariantSku = $product['variants'][0]['sku'] ?? null;
        $addToCartUrl = $primaryVariantSku
            ? sprintf('%s?addToCart=%s', rtrim(env('C7_STORE_URL'), '/'), urlencode($primaryVariantSku))
            : null;

        return view('product', [
            'handle'       => $handle,
            'title'        => $title,
            'teaser'       => $teaser,
            'content'      => $content,
            'images'       => $images,
            'metas'        => $metas,
            'addToCartUrl' => $addToCartUrl,
            'product'      => $product,
        ]);
    }
}
