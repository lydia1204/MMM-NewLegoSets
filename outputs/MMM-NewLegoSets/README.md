# MMM-NewLegoSets 2.0

A deeply configurable MagicMirror module for newly listed LEGO sets. It displays current LEGO.com product images, prices, piece counts, availability, and optional release and announcement dates.

Version 2 is a complete overhaul: 10 display arrangements, 11 themes, 23 transitions, timed or continuous cycling, independent polling and slideshow controls, one-to-ten visible products, per-field styling, persistent cache fallback, responsive sizing, and optional Brickset date enrichment.

## Contents

- [Highlights](#highlights)
- [Install](#install)
- [Quick start](#quick-start)
- [Polling versus cycling](#polling-versus-cycling)
- [Layouts](#layouts)
- [Themes](#themes)
- [Animations](#animations)
- [Complete configuration](#complete-configuration)
- [Field configuration](#field-configuration)
- [Dates](#dates)
- [Examples](#examples)
- [Performance and accessibility](#performance-and-accessibility)
- [Cache and failures](#cache-and-failures)
- [Upgrade from version 1](#upgrade-from-version-1)
- [Validation](#validation)
- [Troubleshooting](#troubleshooting)

## Highlights

- Shows **1 to 10 products** simultaneously.
- Single-product mode cycles through the complete product pool.
- Polling LEGO.com and changing slides use separate intervals.
- Hero, carousel, and filmstrip can continuously auto-scroll at a configurable pixel speed and direction.
- Parses both the current LEGO.com `ProductListingPage` structure and the previous Apollo listing structure.
- Uses a last-known-good cache and clearly labels cached data.
- Includes auto, hero, list, grid, compact, split, carousel, filmstrip, masonry, and table arrangements.
- Includes mirror, LEGO, tuxedo, Pride, Progress Pride, trans, bisexual, lesbian, nonbinary, pansexual, and custom themes.
- Includes fade, slide, zoom, flip, rotate, roll, bounce, swing, blur, wipe, shutter, elastic, LEGO particle, and full clipped brick-wall transitions.
- Indicators support dots, rings, squares, diamonds, triangles, stars, hearts, hexagons, bars, and numbers.
- Every image and text field can be shown, hidden, reordered, relabeled, recolored, resized, and restyled.
- Supports custom WOFF2 fonts and seven text effects.
- Honors `prefers-reduced-motion` by default.
- Has no npm runtime dependencies.

## Install

Requirements: MagicMirror 2.1.0 or newer and network access to LEGO.com. A Brickset API v3 key is optional.

Place the module at:

```text
MagicMirror/modules/MMM-NewLegoSets
```

No `npm install` is required. Add this to `MagicMirror/config/config.js`, then restart MagicMirror:

```js
{
  module: "MMM-NewLegoSets",
  position: "top_right",
  config: {
    productCount: 1,
    layout: "hero",
    theme: "lego"
  }
}
```

The module is unofficial and is not affiliated with or endorsed by the LEGO Group or Brickset.

## Quick start

One set at a time, a new slide every 15 seconds, and fresh LEGO.com data every four hours:

```js
{
  module: "MMM-NewLegoSets",
  position: "top_right",
  config: {
    productCount: 1,
    layout: "hero",
    theme: "trans",
    data: {
      poolSize: 10,
      pollInterval: 4 * 60 * 60 * 1000
    },
    cycle: {
      enabled: true,
      interval: 15 * 1000
    },
    animation: {
      name: "legoBreakBuild",
      duration: 1100
    }
  }
}
```

All time values are in **milliseconds**.

## Polling versus cycling

| Clock | Setting | Default | Purpose |
| --- | --- | ---: | --- |
| Data polling | `data.pollInterval` | 6 hours | Downloads a fresh product list. |
| Timed slide cycling | `cycle.interval` | 12 seconds | Changes which cached set or group is visible in `transition` mode. |
| Continuous scrolling | `cycle.scrollSpeed` | 60 px/s | Moves hero, carousel, or filmstrip continuously in `scroll` mode. |

With `productCount: 1` and `data.poolSize: 10`, ten sets are held in memory and one is shown. In `transition` mode the slide advances on `cycle.interval`. In `scroll` mode the next rendered group moves in immediately at `cycle.scrollSpeed`; `cycle.interval` and `animation.name` are not used. Neither mode downloads during a cycle. LEGO.com is contacted only on `data.pollInterval` or a retry.

## Layouts

Set `layout` to one of these classic product-display arrangements:

| Value | Arrangement | Best use |
| --- | --- | --- |
| `auto` | Hero for 1, list for 2-3, grid for 4-10 | General use and easy scaling. |
| `hero` | Large image/details presentation | One featured set or a wide region. |
| `list` | Stacked image-and-details rows | Narrow columns and 2-6 products. |
| `grid` | Uniform card grid | Galleries and 4-10 products. |
| `compact` | Dense small-thumbnail rows | Small regions or many facts. |
| `split` | Image-led wide cards | Large landscape regions. |
| `carousel` | Main product and wrapping thumbnail rail | A hero plus complete previews without a clipped tail. |
| `filmstrip` | Equal-width horizontal card sequence | Wide, shallow regions where every selected product must remain visible. |
| `masonry` | Flowing multi-column cards | Varied metadata lengths. |
| `table` | Dense aligned rows | Maximum scan speed. |

All arrangements use theme variables and container-responsive rules. `layoutSettings.columns` affects grid and masonry.

## Themes

| Value | Appearance |
| --- | --- |
| `mirror` | Restrained black glass and white type. |
| `lego` | LEGO-inspired red/yellow with brick corners. |
| `tuxedo` | Black, white, silver, and bow-tie accent. |
| `pride` | Rainbow accent and background treatment. |
| `progress` | Progress Pride-inspired colors and chevron. |
| `trans` | Light blue, pink, and white. |
| `bisexual` | Pink, purple, and blue. |
| `lesbian` | Orange, white, and pink. |
| `nonbinary` | Yellow, white, purple, and black. |
| `pansexual` | Pink, yellow, and cyan. |
| `custom` | Values from `customTheme`. |

`showThemeDecorations: false` keeps a preset's colors but removes its corner decoration.

```js
customTheme: {
  background: "rgba(4, 10, 18, 0.94)",
  surface: "rgba(255, 255, 255, 0.10)",
  text: "#ffffff",
  muted: "#c8d1dc",
  accent: "#00e5ff",
  accent2: "#ff3d81",
  border: "rgba(255, 255, 255, 0.30)",
  shadow: "rgba(0, 0, 0, 0.55)",
  gradient: "linear-gradient(135deg, rgba(0,229,255,.14), rgba(255,61,129,.12))",
  decoration: "none"
}
```

Custom `decoration` accepts `none`, `bricks`, `tuxedo`, `rainbow`, or `progress`.

## Animations

`animation.name` accepts:

```text
none, fade, crossfade,
slideLeft, slideRight, slideUp, slideDown,
zoomIn, zoomOut, flipX, flipY,
rotate, roll, bounce, swing, blur, wipe, shutter, elastic,
legoBuild, legoBreakBuild, brickWallRebuild, random
```

`legoBreakBuild` adds independent LEGO-like particles while the content changes. `brickWallRebuild` is the literal full-module effect: it clips the rendered header, image, text, indicators, footer, and decorations into a configurable wall; the wall falls below the module boundary; the incoming module descends from above as the same clipped wall; then the slices are removed to reveal one solid module. `random` selects from `animation.randomPool` each cycle.

```js
animation: {
  name: "random",
  duration: 900,
  easing: "cubic-bezier(0.22, 1, 0.36, 1)",
  stagger: 14,
  particleCount: 48,
  brickSize: 9,
  wallColumns: 6,
  wallRows: 5,
  respectReducedMotion: true,
  randomPool: ["fade", "slideLeft", "flipY", "wipe", "legoBreakBuild"]
}
```

## Complete configuration

### Top level

| Setting | Type | Default | Purpose |
| --- | --- | --- | --- |
| `title` | string | `"New LEGO Sets"` | Header title. Empty hides the text. |
| `subtitle` | string | `"Recently released"` | Header subtitle. Empty hides it. |
| `layout` | string | `"auto"` | Arrangement from the layout table. |
| `productCount` | number | `1` | Products visible at once, clamped 1-10. |
| `theme` | string | `"lego"` | Theme preset name. |
| `showThemeDecorations` | boolean | `true` | Enables corner artwork. |
| `customTheme` | object | preset object | Colors for `theme: "custom"`. |
| `dateFormat` | object | year/month/day | Options for `Intl.DateTimeFormat`. |
| `debug` | boolean | `false` | Logs config warnings in the browser console. |

### `data`

| Setting | Default | Purpose |
| --- | --- | --- |
| `locale` | `"en-us"` | LEGO storefront and number/date locale. |
| `countryCode` | `"US"` | Store country and Brickset region. |
| `sourceUrl` | LEGO new-products URL | `{locale}` is replaced automatically. |
| `pageCount` | `2` | Listing pages attempted, clamped 1-8. |
| `poolSize` | `10` | Sets kept for cycling, at least `productCount`, maximum 50. |
| `includeComingSoon` | `false` | Includes coming-soon products. |
| `includePreorders` | `false` | Includes preorder products. |
| `pollInterval` | `21600000` | Successful refresh interval; minimum 60 seconds. |
| `retryInterval` | `600000` | Failure retry delay; minimum 30 seconds. |
| `requestTimeout` | `20000` | Per-request timeout, 1-120 seconds. |
| `userAgent` | module identifier | HTTP User-Agent. |
| `cacheEnabled` | `true` | Reads/writes last-known-good data. |
| `cacheMaxAge` | `604800000` | Preferred cache age. Older cache may still rescue a failure and is labeled. |
| `bricksetApiKey` | `""` | Optional Brickset API v3 key. |
| `metadataOverrides` | `{}` | Per-set corrections and announcement dates. |
| `sortBy` | `"source"` | `source`, `releaseDate`, `announcedDate`, `price`, `pieceCount`, `setNumber`, or `name`. |
| `sortDirection` | `"desc"` | `asc` or `desc`; source order stays as listed. |

### `cycle`

| Setting | Default | Purpose |
| --- | --- | --- |
| `enabled` | `true` | Enables slide changes. |
| `mode` | `"transition"` | `transition` for interval-based effects or `scroll` for continuous motion. |
| `interval` | `12000` | Time between changes in `transition` mode; minimum 2 seconds. |
| `scrollSpeed` | `60` | Continuous speed in CSS pixels per second, clamped 10-500. |
| `scrollDirection` | `"left"` | `left`, `right`, `up`, or `down`. |
| `step` | `1` | Positions advanced per cycle, 1-10. |
| `loop` | `true` | Wraps the final set to the first. |
| `shuffle` | `false` | Shuffles each freshly fetched pool. |
| `pauseWhenHidden` | `true` | Compatibility flag; MagicMirror suspend/resume always pauses timers. |
| `pauseOnHover` | `false` | Pauses while a pointer is over the module. |
| `showIndicators` | `true` | Shows position indicators. |
| `indicatorStyle` | `"dots"` | `dots`, `rings`, `squares`, `diamonds`, `triangles`, `stars`, `hearts`, `hexagons`, `bars`, `numbers`, or `none`. |

Continuous scrolling is supported by `hero`, `carousel`, and `filmstrip`. Other layouts deliberately fall back to timed transitions so dense tables, masonry columns, and grids are not pushed through an unsuitable viewport. With reduced motion enabled at OS level and `respectReducedMotion: true`, scrolling also falls back to the timed, motion-free cycle.

### `animation`

| Setting | Default | Purpose |
| --- | --- | --- |
| `name` | `"legoBreakBuild"` | Transition from the animation list. |
| `duration` | `1100` | Transition duration, 0-10000 ms. |
| `easing` | cubic-bezier | Valid CSS timing function. |
| `stagger` | `18` | Brick delay, 0-250 ms. |
| `particleCount` | `36` | LEGO brick count, 6-120. |
| `brickSize` | `10` | Base brick size, 4-32 px. |
| `wallColumns` | `6` | Horizontal slices in `brickWallRebuild`, clamped 2-12. |
| `wallRows` | `5` | Vertical slices in `brickWallRebuild`, clamped 2-12. |
| `respectReducedMotion` | `true` | Disables motion when the OS requests it. |
| `randomPool` | six effects | Candidates for `random`. |

### `layoutSettings`

| Setting | Default | Purpose |
| --- | --- | --- |
| `columns` | `2` | Grid/masonry columns, 1-10. |
| `gap` | `12` | Card gap in pixels. |
| `cardMinWidth` | `170` | Minimum grid-card width. |
| `moduleWidth` | `"auto"` | CSS width; numbers become pixels. |
| `moduleMaxWidth` | `760` | Maximum module width in pixels. |
| `moduleHeight` | `"auto"` | CSS height; numbers become pixels. |
| `padding` | `12` | Outer padding. |
| `cardPadding` | `10` | Inner card padding. |
| `borderRadius` | `8` | Outer corner radius, 0-40. |
| `cardBorderRadius` | `6` | Card corner radius, 0-40. |
| `imagePosition` | `"left"` | `left`, `right`, `top`, or `bottom`. Gallery layouts may keep images above details. |
| `alignItems` | `"center"` | `start`, `center`, `end`, or `stretch`. |
| `showSeparators` | `true` | Divider style in list/compact. |
| `showHeader` | `true` | Shows title area. |
| `showFooter` | `true` | Shows footer. |
| `showCounter` | `true` | Shows index/range. |
| `showUpdatedTime` | `true` | Shows data timestamp. |
| `showSource` | `false` | Shows source name. |

### `typography`

| Setting | Default | Purpose |
| --- | --- | --- |
| `fontFamily` | Roboto/Arial | Base CSS font stack. |
| `customFontName` | `""` | Name assigned to a custom font. |
| `customFontUrl` | `""` | Local or HTTPS WOFF2 URL. |
| `baseFontSize` | `16` | Base size, 8-72 px. |
| `textAlign` | `"left"` | `left`, `center`, or `right`. |
| `textEffect` | `"none"` | Header/default text effect. |
| `antialias` | `true` | Normal font antialiasing. |

```js
typography: {
  customFontName: "MyMirrorFont",
  customFontUrl: "/modules/MMM-NewLegoSets/fonts/my-font.woff2",
  fontFamily: "Roboto, Arial, sans-serif",
  baseFontSize: 18,
  textEffect: "shadow"
}
```

Only load fonts you are licensed to use. Local WOFF2 files avoid third-party requests.

## Field configuration

`fields` contains `image`, `name`, `price`, `pieceCount`, `setNumber`, `releaseDate`, `announcedDate`, `availability`, `ageRange`, and `pricePerPiece`.

### Image

| Key | Default | Purpose |
| --- | --- | --- |
| `show` | `true` | Shows the image. |
| `order` | `10` | Retained for consistent configuration. |
| `width` / `height` | `180` / `180` | Preferred image-box size. |
| `minWidth` / `maxWidth` | `64` / `360` | Responsive width limits. |
| `aspectRatio` | `"1 / 1"` | CSS aspect ratio. |
| `fit` | `"contain"` | `contain`, `cover`, `fill`, or `scale-down`. |
| `position` | `"center"` | `center`, `top`, `right`, `bottom`, or `left`. |
| `opacity` | `1` | Transparency from 0 to 1. |
| `background` | `"#ffffff"` | Image-box background. |
| `borderRadius` | `6` | Image radius. |
| `filter` | `"none"` | Any valid CSS filter. |
| `showPlaceholder` | `true` | Shows a placeholder if no image exists. |

### Text fields

Every text field supports:

| Key | Purpose |
| --- | --- |
| `show` | Show or hide it. |
| `order` | Lower values appear first. |
| `label` | Text before the value. Empty removes it. |
| `prefix` / `suffix` | Text directly attached to the value. |
| `missingText` | Fallback text. Empty hides missing values. |
| `fontFamily`, `fontSize`, `fontWeight`, `fontStyle` | Field-specific font controls. |
| `letterSpacing`, `lineHeight` | Spacing and line-height. |
| `textTransform` | `none`, `uppercase`, `lowercase`, or `capitalize`. |
| `textAlign` | `inherit`, `left`, `center`, or `right`. |
| `color`, `opacity` | Field color and transparency. |
| `effect` | `none`, `shadow`, `outline`, `glow`, `neon`, `gradient`, or `letterpress`. |
| `lineClamp` | Maximum lines, 1-12. |

```js
fields: {
  image: { opacity: 0.82, width: 220, height: 180, fit: "contain" },
  name: { show: true, order: 20, fontSize: "1.25rem", fontWeight: 800, effect: "outline", lineClamp: 3 },
  price: { show: true, order: 30, prefix: "Price ", effect: "glow" },
  pieceCount: { show: true, label: "Pieces" },
  setNumber: { show: true, label: "Set" },
  releaseDate: { show: true, label: "Released", missingText: "Date unavailable" },
  announcedDate: { show: true, label: "Announced", missingText: "Not supplied" },
  availability: { show: false }
}
```

## Dates

Dates are conservative and truthful:

- LEGO availability text is accepted only when it explicitly says available, releases, or launches on/from a date.
- Shipping/backorder estimates such as “will ship by” are **not** release dates.
- Brickset can supply regional `dateFirstAvailable` or `launchDate` values.
- LEGO's listing has no dependable announcement-date field. `announcedDate` remains blank unless configured in `metadataOverrides`.
- Cache discovery time is stored but never mislabeled as announcement time.

```js
data: {
  bricksetApiKey: "YOUR_BRICKSET_API_KEY",
  countryCode: "US",
  metadataOverrides: {
    "11512": {
      releaseDate: "2026-08-01",
      announcedDate: "2026-06-10"
    },
    "11381-1": { announcedDate: "2026-07-15" }
  }
}
```

Allowed override keys: `name`, `url`, `image`, `price`, `priceCents`, `currencyCode`, `pieceCount`, `ageRange`, `availability`, `releaseDate`, and `announcedDate`.

## Examples

### Continuous filmstrip with star indicators

```js
config: {
  layout: "filmstrip",
  productCount: 5,
  data: { poolSize: 20 },
  cycle: {
    mode: "scroll",
    scrollSpeed: 70,
    scrollDirection: "left",
    indicatorStyle: "stars"
  }
}
```

### Full brick-wall fall and rebuild

```js
config: {
  layout: "hero",
  productCount: 1,
  cycle: { mode: "transition", interval: 15000 },
  animation: {
    name: "brickWallRebuild",
    duration: 1000,
    stagger: 18,
    wallColumns: 6,
    wallRows: 5
  }
}
```

### Ten-product Progress Pride grid

```js
config: {
  layout: "grid",
  productCount: 10,
  theme: "progress",
  data: { poolSize: 20, pollInterval: 8 * 60 * 60 * 1000 },
  cycle: { interval: 30 * 1000, step: 10, indicatorStyle: "bars" },
  layoutSettings: { columns: 2, moduleMaxWidth: 900 },
  fields: {
    image: { width: 150, height: 140 },
    announcedDate: { show: false },
    availability: { show: false }
  }
}
```

### Tuxedo table

```js
config: {
  layout: "table",
  productCount: 8,
  theme: "tuxedo",
  animation: { name: "wipe", duration: 700 },
  typography: { baseFontSize: 14 },
  fields: {
    releaseDate: { show: false },
    announcedDate: { show: false },
    availability: { show: false },
    ageRange: { show: false }
  }
}
```

## Performance and accessibility

- Keep `respectReducedMotion: true` unless the display's needs are known.
- Raspberry Pi-class mirrors may prefer `fade`, duration under 800 ms, and 12-24 brick particles.
- High particle counts, blur, and large shadows increase GPU work.
- `brickWallRebuild` clones the rendered module once per wall cell. Use a 4x3 or 5x4 wall on lower-powered Raspberry Pi hardware; 6x5 is the visual default.
- Auto-scroll uses compositor-friendly transforms. Lower `scrollSpeed` means longer continuous motion, not lower rendering cost per frame.
- Polling every few hours is sufficient for releases and friendlier to LEGO.com. The minimum is one minute.
- Use `poolSize` for slideshow depth; increase `pageCount` only when needed to fill it.
- Images after the first two use lazy loading.
- Polling and cycling stop when MagicMirror suspends the module.

## Cache and failures

When enabled, the Node helper stores `.cache/sets-v2.json` inside the module:

1. A successful fetch writes the newest product pool.
2. A later failure uses the last-known-good pool.
3. Cached output receives a visible `Cached` badge.
4. The footer can retain the fetch error without erasing products.
5. Failures retry on `retryInterval`; success resumes `pollInterval`.

The cache contains public product metadata only. Delete `.cache` while MagicMirror is stopped to force a clean fetch.

## Upgrade from version 1

Version 2 migrates older keys automatically:

| Version 1 | Version 2 |
| --- | --- |
| `locale`, `countryCode`, `sourceUrl`, `pageCount` | Same names under `data` |
| `maxItems` | `productCount` and `data.poolSize` |
| `updateInterval` | `data.pollInterval` |
| `retryDelay` | `data.retryInterval` |
| `columns` | `layoutSettings.columns` |
| `imageSize` | `fields.image.width` and `height` |
| `showSetNumber` | `fields.setNumber.show` |
| `showAvailability` | `fields.availability.show` |
| `showAge` | `fields.ageRange.show` |
| `showPricePerPiece` | `fields.pricePerPiece.show` |

Migration prevents an immediate break, but the nested v2 structure is recommended.

## Validation

Offline syntax/config validation:

```bash
cd ~/MagicMirror/modules/MMM-NewLegoSets
npm run validate
```

Also validate today's LEGO.com payload:

```bash
npm run validate:live
```

The v2 release was browser-validated across all 10 layouts at desktop and 420 px widths, all 11 themes, product counts 1-10, all 23 animation choices, actual single-product advancement, missing fields, and both current/legacy LEGO payloads. Continuous hero/carousel/filmstrip motion was measured in all four directions, including an exact 449 px at 240 px/s timing check. The clipped 6x5 brick wall was inspected during fall, rebuild, and final solid phases. Every indicator variant was checked for its glyph, active state, count, and overflow behavior.

## Troubleshooting

### Cannot find listing data

Run `npm run validate:live` and inspect MagicMirror's terminal. LEGO.com may have changed its payload.

### Images are blank

Confirm the mirror can reach `https://www.lego.com/cdn/` and test without DNS filtering. Images come directly from LEGO's listing cache; URLs are not guessed.

### Dates are blank

Blank is expected without trustworthy source data. Add a Brickset key or `metadataOverrides`.

### Only one set appears or sets never change

Increase `productCount` to show several at once. For a one-set slideshow, use `productCount: 1`, `poolSize` above 1, `cycle.enabled: true`, and configure `cycle.interval` rather than `pollInterval`.

### Too many dots

Each symbol represents a valid cycle start. Increase `cycle.step`, choose a more compact shape such as dots or bars, or hide indicators.

### Motion is disabled

The OS may request reduced motion. This is honored by default.

### Narrow layout overflows

Use `auto`, fewer columns, a smaller `cardMinWidth`, or compact/table. An explicitly large `moduleWidth` can exceed a MagicMirror region.

### Custom font does not load

Confirm it is WOFF2 and reachable. Local URLs normally begin `/modules/MMM-NewLegoSets/`.

### Brickset warning

Check the key and connectivity. Brickset failure never blocks LEGO.com products; it only leaves enrichment blank.

## Technical notes and references

The module follows MagicMirror's documented lifecycle: `Module.register`, declared scripts/styles, `getDom`, a Node helper for server-side requests, socket notifications, and suspend/resume timer handling. Common product-gallery families and community MagicMirror carousel patterns informed the layouts and independent cycle clock. Reduced-motion and particle controls reflect community reports that CSS animation can be costly on Raspberry Pi hardware.

- [MagicMirror core module documentation](https://docs.magicmirror.builders/module-development/core-module-file.html)
- [MagicMirror animation documentation](https://docs.magicmirror.builders/modules/animate.html)
- [MagicMirror rendering documentation](https://docs.magicmirror.builders/module-development/rendering.html)
- [Brickset API v3 documentation](https://brickset.com/article/52664/api-version-3-documentation)
- [MMM-Carousel community module](https://github.com/barnabycolby/MMM-Carousel)
- [MagicMirror forum CSS animation discussion](https://forum.magicmirror.builders/topic/11712/mmm-cssbackgrounds-animated-css-backgrounds)

## License and trademarks

This project is marked `UNLICENSED`. LEGO and its product names are trademarks of the LEGO Group. LGBTQ+ theme names identify color presets and do not claim ownership of the flags or communities they represent.
