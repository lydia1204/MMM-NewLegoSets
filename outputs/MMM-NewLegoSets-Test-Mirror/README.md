# MMM-NewLegoSets Test Mirror

This is a local, editable mirror canvas that runs the real `MMM-NewLegoSets` browser module and stylesheet. It is not a screenshot or a separate imitation UI.

## Start

Keep this folder next to `MMM-NewLegoSets`, then run:

```bash
cd MMM-NewLegoSets-Test-Mirror
npm start
```

Open [http://127.0.0.1:4174](http://127.0.0.1:4174).

Choose another port when necessary:

```bash
PORT=4180 npm start
```

## What can be tested

- Live LEGO.com products or the built-in fallback pool.
- Portrait, landscape, compact, desktop, and custom mirror sizes.
- Nine standard MagicMirror-style positions.
- Every registered layout, theme, animation, and text effect.
- One through ten visible products.
- Timed transitions or continuous hero/carousel/filmstrip scrolling with configurable pixel speed and direction.
- All indicator shapes; the quick selector displays the actual symbol instead of its internal setting name.
- The full clipped brick-wall fall/rebuild transition, including its final solid state.
- Module width, columns, font size, image transparency, image fitting, and field visibility.
- Automatic cycling, pause/play, forced refresh, and manual next-set transitions.
- The complete normalized configuration through the JSON editor.

The Diagnostics tab reports visible item count, loaded products, broken images, root overflow, nested carousel/filmstrip clipping, canvas bounds, data parser, current index, cycle mode/speed, and the next polling time. In auto-scroll mode it counts the current group only; the offscreen pre-rendered group is intentionally excluded.

## JSON workflow

Quick and Fields controls always update the JSON editor. The editor contains the complete normalized configuration, including default values.

Applied settings are also retained in browser storage, so refreshing after a source-code edit restores the current test configuration. **Reset** returns it to the lab defaults.

1. Edit the JSON.
2. Select **Apply JSON**.
3. Review validation warnings and visual diagnostics.
4. Select **Download** to export the tested configuration.

The downloaded file is plain JSON. Move the object into the `config` property of the module entry in MagicMirror's `config/config.js`.

## Data behavior

The local server proxies LEGO.com through the production `lego-store.js` parser. Responses are cached in memory for 60 seconds unless **Refresh data** is selected. A failed refresh retains the existing product pool and reports the failure in the status bar.

No configuration or product data is uploaded by the test mirror.

## Editing source while it runs

The server intentionally serves module and lab files with `Cache-Control: no-store`. Edit either sibling folder, then refresh the browser to load the new source. The browser-stored test configuration survives that refresh.

The server itself only needs restarting after changing `server.js`.
