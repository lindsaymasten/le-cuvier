<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\NewsletterController;

// Route to individual product/wine pages; template: resources/views/product.antlers.html
Route::statamic('/product/{handle}', 'product');

// Route for handling newsletter subscriptions.
Route::post('/newsletter', NewsletterController::class)->name('newsletter');

// The Sitemap route to the sitemap.xml
Route::statamic('/sitemap.xml', 'sitemap/sitemap', [
    'layout' => null,
    'content_type' => 'application/xml',
]);
