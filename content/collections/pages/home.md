---
id: home
blueprint: pages
title: Home
template: default
updated_by: 0f3f0ebe-13b9-4eae-8a6e-bf5d75118f50
updated_at: 1768553525
blocks:
  -
    id: memat9au
    type: product_cards
    enabled: true
    c7_collection_slug: home
    audience: all
  -
    id: mj0wb3sv
    article:
      -
        type: paragraph
        content:
          -
            type: text
            text: 'Le Cuvier is indeed a very small winery with current annual production of just under 4,000 cases. Our maximum allowable size by virtue of the wisdom of County Regulations is just 5,000 cases. That means that even as we grow to full capacity, we are going to remain committed to our Elliptical Members '
          -
            type: text
            marks:
              -
                type: italic
            text: '&'
          -
            type: text
            text: ' the kind, curious souls who deign to visit our tasting room.'
      -
        type: set
        attrs:
          id: mj0xjcd6
          values:
            type: aside
            aside: 'Most wineries barrel or tank age their wines for a year or less on average before going to bottle. This quick & early bottling makes it relatively easy to respond to the vagaries of supply & demand. Need more wine? Just bottle it! Have too much inventory? Why, just make a deal with a big chain store. At worst, wineries with “normal” aging programs can quickly produce & bottle more wine within a year of the next harvest.'
      -
        type: paragraph
        content:
          -
            type: text
            text: 'Unfortunately, one of the consistently troublesome things we do at Le Cuvier is insist on an extraordinarily long 3-year minimum barrel aging of Le Cuvier wines. Many of our wines are barrel aged longer—much longer— '
          -
            type: text
            marks:
              -
                type: italic
            text: '&'
          -
            type: text
            text: ' the unusual character we gain via this process cannot be rushed without loss of that je ne sais quoi that makes our wines unique. The consequence of this long, long time in barrel is that it renders accurate planning a delusional process at best.'
      -
        type: paragraph
        content:
          -
            type: text
            text: 'And, oh yes, another bit of stupidity is that for each additional year we stay in barrel we lose about 8% of our wine to evaporation—meaning that by the time we slide the wine into bottles, we’ve lost roughly a quarter of it in the form of the proverbial “angels’ share”—fumes to be enjoyed by those besotted winged beings that can be heard giggling in the darkened corners of our barrel room.'
      -
        type: paragraph
        content:
          -
            type: text
            text: 'To summarize the point a bit more briefly; Le Cuvier wines can be mercurial in their availability, as impossible to predict as the weather '
          -
            type: text
            marks:
              -
                type: italic
            text: '(meaning not entirely unfathomable, but not quite reliably able to be ascertained).'
          -
            type: text
            text: ' To enjoy them is to accept this quirk of fate, as their limitations are a side effect of their exceptional character.'
    type: article
    enabled: true
  -
    id: mjd8zaz0
    cta_label: 'View Club Options'
    cta_url: /club
    type: wine_club_signup
    enabled: true
    clubs:
      -
        id: mjdaqtw3
        club_slug: mixed-will-call
        join_text: 'Join Club'
        edit_text: 'Edit Club Membership'
        description:
          -
            type: paragraph
            content:
              -
                type: text
                text: 'This is the club description for the Mixed Club. It can be somewhat long or very short. It should definitely say what the club includes.'
        bottle_count: 12
        fulfillment: false
        frequency_value: 6
        frequency_unit: month
        club_name: 'Mixed | Will Call'
      -
        id: mk7e46ay
        club_slug: mixed-club
        join_text: 'Join Club'
        edit_text: 'Edit Club Membership'
        description:
          -
            type: paragraph
            content:
              -
                type: text
                text: 'This is the club description for the Mixed Club. It can be somewhat long or very short. It should definitely say what the club includes.'
        bottle_count: 6
        fulfillment: true
        frequency_value: 2
        frequency_unit: year
        club_name: 'Mixed Shipping'
      -
        id: mjdaszyq
        club_slug: reds-only-club
        join_text: 'Join Club'
        edit_text: 'Edit Club Membership'
        description:
          -
            type: paragraph
            content:
              -
                type: text
                text: 'This is the club description for the Reds Only Club. It can be somewhat long or very short. It should definitely say what the club includes.'
        bottle_count: 12
        fulfillment: false
        frequency_value: 2
        frequency_unit: year
        club_name: 'Reds Only'
      -
        id: mk7e50y1
        club_slug: reds-will-call
        join_text: 'Join Club'
        edit_text: 'Edit Club Membership'
        description:
          -
            type: paragraph
            content:
              -
                type: text
                text: 'This is the club description for the Reds Only Club. It can be somewhat long or very short. It should definitely say what the club includes.'
        bottle_count: 12
        fulfillment: false
        frequency_value: 2
        frequency_unit: year
        club_name: 'Reds Only'
    heading: 'Club Signup Heading'
    intro: 'Intro text, lorem ipsum doler san init compset. Thereafter, we’ll blend you a bottle of perfume for each season, delivered on the solstice.'
  -
    id: mk61eofl
    heading: 'Upcoming Events'
    limit: 5
    show_past: true
    type: events_listing
    enabled: true
    intro: "Here's an intro text for events at Le Cuvier Winery in Paso Robles, California. These events are very good and fancy, etc. And this text is their important introduction."
  -
    id: mjx1b8a5
    title: 'Wine & Food Pairing'
    subtitle: 'Tasting Experience'
    statement: 'Wines of distinction and fervor fermented only with wild yeast and aged exclusively in neutral oak barrels from Paso Robles’ best westside, dry-farmed vineyards.'
    pairings:
      -
        id: mjx1baq5
        wine: '2022 Grenache'
        description: '…a rustic Italian villa, perched high above the azure glistening sea, it is neither imposing nor dramatic, yet irresistible, its magnetic allure beaming with mystery.'
        food: 'chicken gyro'
        food_details: 'marinated chicken, tzatziki, feta, dill on lavash'
      -
        id: mjxdlxi4
        wine: '2023 Zinfandel'
        description: '…a rustic Italian villa, perched high above the azure glistening sea, it is neither imposing nor dramatic, yet irresistible, its magnetic allure beaming with mystery.'
        food: 'chicken gyro'
        food_details: 'marinated chicken, tzatziki, feta, dill on lavash'
      -
        id: mjxdlzwn
        wine: '2021 Grenache'
        description: '…a rustic Italian villa, perched high above the azure glistening sea, it is neither imposing nor dramatic, yet irresistible, its magnetic allure beaming with mystery.'
        food: 'chicken gyro'
        food_details: 'marinated chicken, tzatziki, feta, dill on lavash'
      -
        id: mjxdlwc0
        wine: '2021 Chrysos'
        description: '…a rustic Italian villa, perched high above the azure glistening sea, it is neither imposing nor dramatic, yet irresistible, its magnetic allure beaming with mystery.'
        food: 'chicken gyro'
        food_details: 'marinated chicken, tzatziki, feta, dill on lavash'
      -
        id: mjxdlyi7
        wine: '2021 Grenache'
        description: '…a rustic Italian villa, perched high above the azure glistening sea, it is neither imposing nor dramatic, yet irresistible, its magnetic allure beaming with mystery.'
        food: 'chicken gyro'
        food_details: 'marinated chicken, tzatziki, feta, dill on lavash'
    type: menu
    enabled: true
  -
    id: mhemungq
    cards:
      -
        id: 65Llqbdm
        members_only: false
        title: 'Testing 123'
        subtitle: 'optional subtitle test test'
        body: 'Optional body text that is longer for testing. Optional body text that is longer for testing. Optional body text that is longer for testing.'
        link_type: internal
        link_entry: 200a3990-53bd-444b-aa9a-9833d694d804
        bg_type: image
        bg_image: 1y6a6729.jpeg
        heading: 'First Title'
        featured: false
      -
        id: mhemv4wv
        members_only: false
        title: 'members only test'
        subtitle: Subtitle
        body: 'Optional body text that is longer for testing. Optional body text that is longer for testing. Optional body text that is longer for testing. Optional body text that is longer for testing.'
        link_type: none
        bg_type: color
        heading: 'Second Title'
        featured: true
      -
        id: mhzcivw8
        members_only: false
        heading: 'Test test Test'
        subtitle: kjwebfkiu
        body: erajhi43yug8i
        link_type: none
        bg_type: image
        bg_image: 1y6a6940.jpg
        featured: false
      -
        id: mhzcixdv
        members_only: false
        heading: rflkejoit34
        subtitle: dsfmrwliuh
        body: reglemliuhr3i8
        link_type: none
        bg_type: image
        bg_image: _eee0245.jpg
        featured: false
    type: promo_cards
    enabled: true
  -
    id: mjxdpi4r
    title: 'Made up recipe'
    description: description
    servings: 4-6
    prep_time: '15'
    cook_time: '25'
    image: images/clayweb1.jpg
    caption: Caption
    ingredients: |-
      ingredient
      **ingredient**
      ingredient
    instructions: Instructions
    notes: 'Notes go here.'
    type: recipe
    enabled: false
  -
    id: mj6ya4s6
    title: Recipes
    text: 'Recipes text intro'
    query: latest
    limit: 3
    type: recipes_listing
    enabled: false
  -
    id: mjxe0neh
    title: Team
    query: ordered
    limit: 6
    type: team
    enabled: false
seo_noindex: false
seo_nofollow: false
seo_canonical_type: entry
sitemap_change_frequency: weekly
sitemap_priority: 0.5
seo_title: 'Le Cuvier Winery'
seo_description: 'Description goes here.'
---
