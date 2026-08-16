# MMM-NewLegoSets

MMM-NewLegoSets is a configurable [MagicMirror](https://magicmirror.builders/) module that displays recently released or announced LEGO sets. It includes official product images, prices, piece counts, dates, set numbers, themes, responsive layouts, indicators, timed transitions, and continuous scrolling.

This repository also includes a local visual editor that runs the production module inside a true-size mirror canvas. The editor can change settings, preview layouts and animations, load live data, export configuration, and run an extensive compatibility audit.

## Features

- One to ten products at once, with page-aware cycling and deduplication.
- Ten layouts including hero, grid, carousel, filmstrip, list, table, masonry, spotlight, magazine, and compact.
- Eleven built-in visual themes, including LEGO-inspired and LGBTQ+ color presets.
- Twenty-three transitions plus continuous scrolling for hero, carousel, and filmstrip.
- Configurable image, price, piece count, release date, announced date, set number, availability, age range, and price-per-piece fields.
- Custom fonts, text effects, indicator shapes, brick colors, timing, dimensions, columns, image fit, transparency, and motion controls.
- LEGO.com data with optional Brickset enrichment and explicit metadata overrides.
- Local visual editor, diagnostics, sample data, live-data preview, and automated rendered compatibility checks.

## Repository Layout

| Path | Purpose |
| --- | --- |
| [`outputs/MMM-NewLegoSets`](outputs/MMM-NewLegoSets) | Installable MagicMirror module and complete settings reference. |
| [`outputs/MMM-NewLegoSets-Test-Mirror`](outputs/MMM-NewLegoSets-Test-Mirror) | Local visual editor and test mirror. |
| [`outputs/MMM-NewLegoSets/docs`](outputs/MMM-NewLegoSets/docs) | Illustrated PDF user guide. |
| [`work/preview`](work/preview) | Focused browser validation harness. |

## Install the Module

MagicMirror and Node.js must already be installed. Clone this repository, then copy the module directory into MagicMirror:

```bash
git clone https://github.com/lydia1204/MMM-NewLegoSets.git ~/MMM-NewLegoSets-source
mkdir -p ~/MagicMirror/modules/MMM-NewLegoSets
cp -R ~/MMM-NewLegoSets-source/outputs/MMM-NewLegoSets/. ~/MagicMirror/modules/MMM-NewLegoSets/
```

The module has no third-party npm dependencies, so no `npm install` step is required inside the module directory.

Add it to `~/MagicMirror/config/config.js`:

```javascript
{
  module: "MMM-NewLegoSets",
  position: "middle_center",
  config: {
    layout: "carousel",
    productCount: 2,
    data: {
      poolSize: 20,
      recentDays: 31,
      pollInterval: 6 * 60 * 60 * 1000
    },
    cycle: {
      enabled: true,
      interval: 15 * 1000,
      step: "page"
    }
  }
}
```

Restart MagicMirror after changing its configuration. See the [module README](outputs/MMM-NewLegoSets/README.md) for every setting and complete examples.

To update later:

```bash
cd ~/MMM-NewLegoSets-source
git pull --ff-only
cp -R outputs/MMM-NewLegoSets/. ~/MagicMirror/modules/MMM-NewLegoSets/
```

## Install the Editor

The editor is part of the same clone and has no third-party npm dependencies:

```bash
cd ~/MMM-NewLegoSets-source/outputs/MMM-NewLegoSets-Test-Mirror
npm start
```

Open [http://127.0.0.1:4174](http://127.0.0.1:4174). Use the controls or JSON tab, select **Apply JSON**, and select **Download** to export the tested configuration.

The editor listens only on the local computer by default. To deliberately expose it on a trusted LAN:

```bash
HOST=0.0.0.0 ALLOW_REMOTE=true npm start
```

Remote mode has no built-in authentication. Put it behind an authenticated reverse proxy and firewall before exposing it beyond a trusted network. Do not enter a Brickset API key in a remotely exposed editor.

See the [editor README](outputs/MMM-NewLegoSets-Test-Mirror/README.md) for the complete workflow and diagnostics.

## Validate

Run the offline module and editor checks:

```bash
cd outputs/MMM-NewLegoSets
npm run validate

cd ../MMM-NewLegoSets-Test-Mirror
npm run check
```

An internet connection is required for the live parser check:

```bash
cd ../MMM-NewLegoSets
npm run validate:live
```

The editor's **Run full compatibility audit** command performs the larger rendered layout/theme/settings matrix in a browser.

## Data and Privacy

The production module makes read-only HTTPS requests to official LEGO web properties and, when configured, Brickset. Its remote URL policy restricts requests to `lego.com` and `brickset.com` hosts. Product images remain hosted by their source.

The editor stores its preview configuration in browser storage, but deliberately excludes the Brickset API key. Never commit a real API key to this repository or a MagicMirror configuration you publish.

For vulnerability reporting and the supported security boundary, read [`SECURITY.md`](SECURITY.md).

## License and Trademarks

The source code is available under the [MIT License](LICENSE). LEGO and its product names are trademarks of the LEGO Group. This project is an independent community module and is not sponsored, authorized, or endorsed by the LEGO Group. LGBTQ+ theme names identify color presets and do not claim ownership of the flags or communities they represent.
