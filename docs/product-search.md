# Le Cuvier sitewide search

The header icon opens a responsive, full-screen native dialog. Its catalog document
loads only when search opens and is discarded on close. No new Commerce7 API access,
credentials, dependencies, or product synchronization are needed.

## Sources and destinations

- **Commerce7:** `available-wines`, `home`, `wine-search-results`,
  `event-tasting-experiences`, `bundles`, and `limited`. Each uses the existing
  Product Cards template. Original cards are filtered in place, with duplicates
  removed by product URL. Search actions lead to `/product/{slug}`; existing
  product-detail templates and Commerce7 handle purchasing there.
- **Statamic:** current public entries with a page URL. Blueprint-defined headings,
  rich text, enabled blocks, groups, grids, lists and tables contribute text.
  Draft, private, protected, hidden and no-index entries are excluded, along with
  the search pages themselves. Results link to the relevant existing page.
- **Tock:** the same cached public experience data used by the Wine Tasting page.
  Titles, full descriptions, schedules and visitor details are searchable. Results
  lead to `/wine-tasting#tock-experience-{id}`, where the existing booking UI lives.

Statamic **Globals → Search → Search sources** accepts one Commerce7 collection
URL slug per list item. If blank, the six sources above are used. Each collection must be
website-available and use Product Cards without pagination or a product count cap.
Content globals remain managed through the Control Panel. No C7 template changes
are required for the current cards.

## Curating the opening view

In **Globals → Search → Opening view**, Winery Admin users can choose an **Opening
view**: all searchable content (the existing default), featured sections, or search
input only. The existing Winery Admin role already has permission to edit this
global; no account or role changes are required.

With **Featured sections**, add and drag sections into order. Each has a heading
and a maximum item count (1–24, default 4):

- **Commerce7 collection:** select a named collection or type another exact slug.
  Products follow C7's collection order and current visitor visibility. Extra
  featured collections are added to the search sources while this mode is active.
- **Individual products:** paste LC product-page URLs or `/product/{slug}` paths
  into the reorderable rows. Each product must be present in a search source
  collection. Missing or unavailable products are omitted; no product API fetch
  or manually maintained product information is introduced.
- **Site pages:** choose and reorder entries with the native page picker. The
  usual public/search eligibility rules still apply.

Duplicates appear once, in the first matching section. Empty sections are hidden;
if no selected items are available, the modal invites visitors to start typing.
Clearing a query restores this opening view. Typed queries still search the whole
corpus, including products and pages that were not featured. Curation is preserved
when switching opening modes. Existing CMS content is not seeded or changed.

Product results use only the image, vintage, and linked wine name from the current
Product Cards markup. Search-specific CSS presents them as compact cards; blend,
price, and purchase controls remain hidden in search. The image and wine name open
the existing product page, where C7 retains purchasing. Featured cards use the same
elements as navigation-only copies outside C7's managed source DOM. Copies are rebuilt with the index and cleared on account
changes; they are never stored or included again in the search index.

## Implementation

`/_search/catalog` initializes C7 V2 normally in a same-origin iframe. It fetches
`/_search/pages` and `/_search/experiences` independently, so a slow external source
does not block other results. All three routes are unlisted and carry noindex,
private/no-store, and Statamic-uncacheable headers. They are outside the CMS tree
and sitemap. This is search indexing control, not access control.

Search uses the LC-owned `.product-card`, `.product-card-title`,
`.product-card-vintage`, `.product-info`, `[data-search-item]`, `[data-search-link]`
and `[data-search-text]` hooks. Accents, capitalization and punctuation are normalized;
every query term must match. No raw HTML is built from query strings.

A scoped MutationObserver rebuilds the index after C7 or source changes. All C7
collections must finish before products enter the index. Errors identify any omitted
source instead of silently claiming complete results. Account changes and reopening
search discard previous member product DOM. C7 still controls visitor visibility.
The existing Bedrock search form/results page now opens this unified search.

CMS page text is read directly from Statamic's content repository on search open;
no manual index rebuild is needed. Template-only strings and external embeds are
not CMS editorial fields. Tock keeps its existing five-minute/last-good cache policy.
No C7 product data is persisted by this feature.

## Checks

- `node --test tests/product-search.test.mjs`
- `php artisan test --filter='ProductSearchPageTest|SiteSearchPagesTest|SearchCatalogSettingsTest'`
- `npm run build -- --outDir .search-build` (keeps `public/build` untouched)

Browser checks cover desktop and 320/390px layouts, preserved profile/cart positions,
keyboard focus and Escape, clearing/reopening, product URL navigation, general page
body-text searches, and experience descriptions linking to Wine Tasting.
Authenticated member transitions require an authenticated test session; the public
preview uses C7's guest visibility. No purchase or reservation is submitted in QA.
