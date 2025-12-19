<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\NewsletterController;
use App\Http\Controllers\ProductController;

// Route to individual product/wine pages; template: resources/views/product.antlers.html
Route::get('/product/{handle}', [ProductController::class, 'show'])->name('product.show');

// Routes for product purchase
Route::statamic('/cart', 'cart');
Route::statamic('/club', 'club');
Route::statamic('/checkout/{any?}', 'checkout')->where('any', '.*');

// Route for member login
Route::statamic('/profile/{any?}', 'profile')->where('any', '.*');

// Route for handling newsletter subscriptions.
Route::post('/newsletter', NewsletterController::class)->name('newsletter');

// The Sitemap route to the sitemap.xml
Route::statamic('/sitemap.xml', 'sitemap/sitemap', [
    'layout' => null,
    'content_type' => 'application/xml',
]);
