<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ProductController extends Controller
{
    public function show(Request $request, string $handle): Response
    {
        // Normalize slug (optional)
        $handle = strtolower($handle);

        // Render the widget container page through Statamic’s layout
        $html = (new \Statamic\View\View)
            ->template('product')  // resources/views/product.antlers.html
            ->layout('layout')     // resources/views/layout.antlers.html
            ->with([
                'handle' => $handle,
            ])
            ->render();

        return response($html);
    }
}
