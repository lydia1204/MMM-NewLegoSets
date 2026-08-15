# MMM-NewLegoSets Workspace

This repository contains the overhauled MagicMirror module and its live local test mirror.

## Projects

- [`outputs/MMM-NewLegoSets`](outputs/MMM-NewLegoSets) - production MagicMirror module, exhaustive configuration README, validator, and PDF user guide.
- [`outputs/MMM-NewLegoSets-Test-Mirror`](outputs/MMM-NewLegoSets-Test-Mirror) - editable true-resolution mirror canvas using the production module and live LEGO.com data.
- [`work/preview`](work/preview) - focused browser validation harness.
- [`work/generate_user_guide.py`](work/generate_user_guide.py) - source for the colorful PDF manual.

## Validate the module

```bash
cd outputs/MMM-NewLegoSets
npm run validate
npm run validate:live
```

## Run the test mirror

```bash
cd outputs/MMM-NewLegoSets-Test-Mirror
npm start
```

Then open [http://127.0.0.1:4174](http://127.0.0.1:4174).

The test mirror provides live and sample data, responsive device presets, MagicMirror-style regions, visual controls, a complete JSON editor, persistent browser settings, manual and automatic cycling, and layout diagnostics.

## Documentation

The module documentation is in [`outputs/MMM-NewLegoSets/README.md`](outputs/MMM-NewLegoSets/README.md). The PDF guide is stored in [`outputs/MMM-NewLegoSets/docs`](outputs/MMM-NewLegoSets/docs).
