<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\NewsletterController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProductSearchController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

// Route to individual product/wine pages; template: resources/views/product.antlers.html
Route::get('/product/{handle}', [ProductController::class, 'show'])->name('product.show');

Route::get('/_search/catalog', [ProductSearchController::class, 'catalog'])->name('product-search.catalog');
Route::get('/_search/experiences', [ProductSearchController::class, 'experiences'])->name('product-search.experiences');
Route::get('/_search/pages', [ProductSearchController::class, 'pages'])->name('product-search.pages');

// Routes for product purchase
Route::statamic('/cart', 'cart');
Route::statamic('/club', 'club');
Route::statamic('/checkout/{any?}', 'checkout')->where('any', '.*');

// Route for member login
Route::statamic('/profile/{any?}', 'profile')->where('any', '.*');

// Local-only block previews keep CMS-managed page content untouched while
// movable blocks are tested outside their production page context.
if (app()->environment('local')) {
    Route::statamic('/_preview/wine-club-block', 'previews/wine-club-block');
    Route::statamic('/_preview/member-product-cards', 'previews/member-product-cards');
}

// Route for handling newsletter subscriptions.
Route::post('/newsletter', NewsletterController::class)->name('newsletter');

// Host-locked image proxy for liquidGL/html2canvas snapshots. Commerce7 product
// images are rendered from a separate origin, so canvas snapshots cannot use
// their pixels directly unless they are fetched through the same site origin.
Route::get('/liquid-glass-image-proxy', function (Request $request) {
    $url = $request->query('url');

    if (! is_string($url)) {
        abort(400);
    }

    $parts = parse_url($url);

    if (
        ($parts['scheme'] ?? null) !== 'https' ||
        ($parts['host'] ?? null) !== 'images.commerce7.com' ||
        ! str_starts_with($parts['path'] ?? '', '/le-cuvier-winery/images/')
    ) {
        abort(403);
    }

    $image = Http::timeout(6)->get($url);

    abort_unless($image->successful(), 404);

    return response($image->body(), 200)
        ->header('Content-Type', $image->header('Content-Type', 'image/jpeg'))
        ->header('Cache-Control', 'public, max-age=86400');
})->name('liquid-glass.image-proxy');

// The Sitemap route to the sitemap.xml
Route::statamic('/sitemap.xml', 'sitemap/sitemap', [
    'layout' => null,
    'content_type' => 'application/xml',
]);
