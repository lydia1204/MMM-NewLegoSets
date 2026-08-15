from __future__ import annotations

import io
import os
import urllib.request
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    Image,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "outputs" / "MMM-NewLegoSets" / "docs" / "MMM-NewLegoSets-User-Guide.pdf"

INK = colors.HexColor("#101820")
PAPER = colors.HexColor("#F7FAFC")
LEGO_RED = colors.HexColor("#E3000B")
LEGO_YELLOW = colors.HexColor("#FFD500")
BLUE = colors.HexColor("#0057B8")
TRANS_BLUE = colors.HexColor("#5BCEFA")
TRANS_PINK = colors.HexColor("#F5A9B8")
PURPLE = colors.HexColor("#7A3DB8")


styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="CoverTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=32, leading=34, textColor=colors.white, alignment=TA_LEFT, spaceAfter=14))
styles.add(ParagraphStyle(name="CoverSub", parent=styles["BodyText"], fontName="Helvetica", fontSize=13, leading=18, textColor=colors.white, spaceAfter=10))
styles.add(ParagraphStyle(name="H1x", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=23, leading=27, textColor=INK, spaceAfter=12))
styles.add(ParagraphStyle(name="H2x", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=15, leading=18, textColor=BLUE, spaceBefore=8, spaceAfter=7))
styles.add(ParagraphStyle(name="Bodyx", parent=styles["BodyText"], fontName="Helvetica", fontSize=9.3, leading=13, textColor=INK, spaceAfter=7))
styles.add(ParagraphStyle(name="Smallx", parent=styles["BodyText"], fontName="Helvetica", fontSize=7.6, leading=10, textColor=INK))
styles.add(ParagraphStyle(name="Whites", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=8.5, leading=11, textColor=colors.white))
styles.add(ParagraphStyle(name="Codex", parent=styles["Code"], fontName="Courier", fontSize=7.2, leading=9.5, textColor=INK, backColor=colors.HexColor("#EDF2F7"), borderPadding=8, spaceAfter=8))
styles.add(ParagraphStyle(name="Callout", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=9.2, leading=13, textColor=INK, backColor=colors.HexColor("#FFF4B8"), borderColor=LEGO_YELLOW, borderWidth=1, borderPadding=8, spaceAfter=9))


def p(text: str, style: str = "Bodyx") -> Paragraph:
    return Paragraph(text, styles[style])


def code(text: str) -> Paragraph:
    escaped = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br/>").replace(" ", "&nbsp;")
    return Paragraph(escaped, styles["Codex"])


def table(rows, widths, header=True, font_size=7.3):
    result = Table(rows, colWidths=widths, repeatRows=1 if header else 0, hAlign="LEFT")
    commands = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), font_size),
        ("LEADING", (0, 0), (-1, -1), font_size + 2.5),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#CBD5E0")),
        ("ROWBACKGROUNDS", (0, 1 if header else 0), (-1, -1), [colors.white, colors.HexColor("#F1F5F9")]),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]
    if header:
        commands += [("BACKGROUND", (0, 0), (-1, 0), INK), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white), ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold")]
    result.setStyle(TableStyle(commands))
    return result


def page_header_footer(canvas, doc):
    canvas.saveState()
    width, height = letter
    canvas.setFillColor(INK)
    canvas.rect(0, height - 0.30 * inch, width, 0.30 * inch, fill=1, stroke=0)
    canvas.setFillColor(LEGO_YELLOW)
    canvas.rect(0, height - 0.34 * inch, width, 0.04 * inch, fill=1, stroke=0)
    canvas.setFont("Helvetica-Bold", 7.5)
    canvas.setFillColor(INK)
    canvas.drawString(0.55 * inch, 0.33 * inch, "MMM-NewLegoSets 2.0 User Guide")
    canvas.drawRightString(width - 0.55 * inch, 0.33 * inch, f"Page {doc.page}")
    canvas.restoreState()


def colored_cards(items, columns=2):
    cells = []
    for title, body, color in items:
        cell = Table([[p(title, "Whites")], [p(body, "Smallx")]], colWidths=[3.05 * inch])
        cell.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), color),
            ("BACKGROUND", (0, 1), (-1, 1), colors.white),
            ("BOX", (0, 0), (-1, -1), 0.8, color),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        cells.append(cell)
    rows = [cells[index:index + columns] for index in range(0, len(cells), columns)]
    if rows and len(rows[-1]) < columns:
        rows[-1] += [""] * (columns - len(rows[-1]))
    grid = Table(rows, colWidths=[3.2 * inch] * columns, hAlign="LEFT")
    grid.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 8), ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
    return grid


def product_image():
    url = "https://www.lego.com/cdn/cs/set/assets/blt621a9fb4f7d5deba/bltc8cac287dd2bee85-11512_Prod_en-gb.png?fit=bounds&format=jpg&quality=85&width=620&height=620&dpr=1"
    try:
        request = urllib.request.Request(url, headers={"User-Agent": "MMM-NewLegoSets-Guide/2.0"})
        with urllib.request.urlopen(request, timeout=20) as response:
            return Image(io.BytesIO(response.read()), width=2.75 * inch, height=2.75 * inch)
    except Exception:
        fallback = Table([[p("LEGO product image", "Whites")]], colWidths=[2.75 * inch], rowHeights=[2.75 * inch])
        fallback.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), LEGO_RED), ("ALIGN", (0, 0), (-1, -1), "CENTER"), ("VALIGN", (0, 0), (-1, -1), "MIDDLE")]))
        return fallback


def build_story():
    story = []
    cover_copy = Table([
        [p("MMM-NewLegoSets", "CoverTitle")],
        [p("THE COMPLETE 2.0 USER GUIDE", "CoverSub")],
        [p("New LEGO sets. Your layout. Your colors. Your motion.", "CoverSub")],
        [p("10 layouts  |  11 themes  |  23 animations  |  11 indicator styles", "CoverSub")],
    ], colWidths=[3.5 * inch])
    cover_copy.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), INK), ("LEFTPADDING", (0, 0), (-1, -1), 18), ("RIGHTPADDING", (0, 0), (-1, -1), 18), ("TOPPADDING", (0, 0), (-1, -1), 10), ("BOTTOMPADDING", (0, 0), (-1, -1), 10)]))
    story += [Spacer(1, 0.35 * inch), Table([[cover_copy, product_image()]], colWidths=[3.55 * inch, 2.8 * inch], style=[("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("BACKGROUND", (0, 0), (-1, -1), INK), ("BOX", (0, 0), (-1, -1), 4, LEGO_YELLOW)]), Spacer(1, 0.28 * inch)]
    story.append(colored_cards([
        ("SEPARATE CLOCKS", "Poll LEGO.com every few hours while slides move every few seconds.", BLUE),
        ("HONEST DATES", "Shipping estimates are never mislabeled as product release dates.", LEGO_RED),
        ("MIRROR READY", "Responsive container layouts and reduced-motion support are built in.", PURPLE),
        ("CACHE RESCUE", "A failed request keeps the last good product list visible and labeled.", colors.HexColor("#087F5B")),
    ]))
    story += [Spacer(1, 0.25 * inch), p("Version 2.0 | August 2026", "H2x"), p("This manual accompanies the exhaustive README in the module folder. It focuses on setup, visual choices, common recipes, and quick reference.", "Bodyx"), PageBreak()]

    story += [p("1. Install and start", "H1x"), p("Place the folder at <b>MagicMirror/modules/MMM-NewLegoSets</b>. There are no npm runtime dependencies. Add a module entry to MagicMirror's config and restart MagicMirror."), code('{\n  module: "MMM-NewLegoSets",\n  position: "top_right",\n  config: {\n    productCount: 1,\n    layout: "hero",\n    theme: "lego"\n  }\n}')]
    story += [p("What the first run does", "H2x"), colored_cards([
        ("1. FETCH", "The Node helper requests LEGO.com's new-products listing.", BLUE),
        ("2. NORMALIZE", "Product image, price, pieces, number, and availability are normalized.", PURPLE),
        ("3. CACHE", "A successful pool is stored as last-known-good data.", colors.HexColor("#087F5B")),
        ("4. CYCLE", "The browser displays 1-10 products and advances independently.", LEGO_RED),
    ])]
    story += [Spacer(1, 8), p("The independent clocks", "H2x"), table([["Setting", "Default", "Meaning"], ["data.pollInterval", "6 hours", "Download a fresh list from LEGO.com."], ["cycle.interval", "12 seconds", "Change the visible group in transition mode."], ["cycle.scrollSpeed", "60 px/s", "Move continuously in scroll mode without downloading."]], [1.8 * inch, 1.1 * inch, 3.5 * inch]), p("Use milliseconds for polling and timed transitions. Scroll speed is measured in CSS pixels per second.", "Callout"), PageBreak()]

    story += [p("2. Choose a layout", "H1x"), p("The arrangements cover familiar product-display patterns. Auto is the safest starting point; it selects hero, list, or grid based on product count.")]
    layout_items = [
        ("AUTO", "Hero for 1, list for 2-3, grid for 4-10.", INK), ("HERO", "One large image/details presentation.", LEGO_RED),
        ("LIST", "Stacked image-and-details rows.", BLUE), ("GRID", "Uniform multi-column product cards.", PURPLE),
        ("COMPACT", "Dense thumbnail rows for small regions.", colors.HexColor("#087F5B")), ("SPLIT", "Wide image-led cards.", colors.HexColor("#C2410C")),
        ("CAROUSEL", "Main product plus preview rail.", TRANS_BLUE), ("FILMSTRIP", "One horizontal sequence.", TRANS_PINK),
        ("MASONRY", "Flowing columns for varied metadata.", colors.HexColor("#9D174D")), ("TABLE", "Aligned, dense, highly scannable rows.", colors.HexColor("#374151")),
    ]
    story += [colored_cards(layout_items), Spacer(1, 8), p("Sizing controls", "H2x"), table([["Setting", "Use"], ["productCount", "Visible products, 1 through 10."], ["layoutSettings.columns", "Grid and masonry columns, 1 through 10."], ["moduleWidth / moduleMaxWidth", "Region width and maximum pixel width."], ["cardMinWidth", "Minimum grid-card width before space becomes tight."], ["gap / padding / cardPadding", "Density and breathing room."], ["imagePosition / alignItems", "Card composition and vertical alignment."]], [2.3 * inch, 4.1 * inch]), PageBreak()]

    story += [p("3. Choose a theme", "H1x"), p("Every layout consumes the same theme variables, so switching a theme changes cards, text, accents, borders, background, and decorations together.")]
    theme_rows = [["Theme", "Palette", "Decoration"]]
    themes = [
        ("mirror", "Black / white", "None"), ("lego", "Red / yellow / blue", "Corner bricks"), ("tuxedo", "Black / silver / white", "Bow tie"),
        ("pride", "Rainbow", "Rainbow bars"), ("progress", "Progress Pride colors", "Chevron"), ("trans", "Blue / pink / white", "Flag bars"),
        ("bisexual", "Pink / purple / blue", "Flag bars"), ("lesbian", "Orange / white / pink", "Flag bars"),
        ("nonbinary", "Yellow / white / purple / black", "Flag bars"), ("pansexual", "Pink / yellow / cyan", "Flag bars"), ("custom", "Your values", "Selectable"),
    ]
    theme_rows += themes
    story += [table(theme_rows, [1.25 * inch, 2.55 * inch, 2.6 * inch]), Spacer(1, 10)]
    swatches = Table([["LEGO", "TRANS", "PRIDE", "TUXEDO"], ["", "", "", ""]], colWidths=[1.55 * inch] * 4, rowHeights=[0.25 * inch, 0.55 * inch])
    swatches.setStyle(TableStyle([("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"), ("FONTSIZE", (0, 0), (-1, 0), 8), ("ALIGN", (0, 0), (-1, 0), "CENTER"), ("BACKGROUND", (0, 1), (0, 1), LEGO_YELLOW), ("BACKGROUND", (1, 1), (1, 1), TRANS_PINK), ("BACKGROUND", (2, 1), (2, 1), colors.HexColor("#7A3DB8")), ("BACKGROUND", (3, 1), (3, 1), colors.HexColor("#111111")), ("BOX", (0, 1), (-1, 1), 0.5, colors.HexColor("#CBD5E0"))]))
    story += [swatches, Spacer(1, 10), p("Set <b>showThemeDecorations: false</b> to keep a preset's palette and remove its corner artwork. Use <b>theme: \"custom\"</b> to control background, surface, text, muted, accent, accent2, border, shadow, gradient, and decoration.", "Callout"), PageBreak()]

    story += [p("4. Motion and LEGO build", "H1x"), p("Twenty-three choices cover restrained fades through a literal full-module brick wall. The module honors the operating system's reduced-motion preference by default.")]
    animation_groups = [
        ("SUBTLE", "none, fade, crossfade, blur", INK), ("DIRECTIONAL", "slideLeft, slideRight, slideUp, slideDown", BLUE),
        ("DEPTH", "zoomIn, zoomOut, flipX, flipY", PURPLE), ("PLAYFUL", "rotate, roll, bounce, swing, elastic", colors.HexColor("#C2410C")),
        ("REVEALS", "wipe, shutter", colors.HexColor("#087F5B")), ("BRICKS", "legoBuild, legoBreakBuild, brickWallRebuild, random", LEGO_RED),
    ]
    story += [colored_cards(animation_groups), Spacer(1, 8), code('animation: {\n  name: "brickWallRebuild",\n  duration: 1000,\n  easing: "cubic-bezier(0.22, 1, 0.36, 1)",\n  stagger: 18,\n  particleCount: 36,\n  brickSize: 10,\n  wallColumns: 6,\n  wallRows: 5,\n  respectReducedMotion: true\n}')]
    story += [p("The full brick wall", "H2x"), p("brickWallRebuild clips the complete rendered module - header, image, text, indicators, footer, and decorations - into a wall. The outgoing wall falls below the module; the incoming wall descends from above and resolves into one solid module.")]
    story += [p("Performance recipe", "H2x"), p("For Raspberry Pi-class mirrors, start with fade, 600-800 ms, and 12-24 particles. For brickWallRebuild, try a 4 x 3 or 5 x 4 wall before the 6 x 5 default. High slice counts, blur, and large shadows increase GPU work."), PageBreak()]

    story += [p("5. Data, cycling, and caching", "H1x")]
    story += [table([["Data key", "Default", "Explanation"], ["locale / countryCode", "en-us / US", "Storefront, formatting, and Brickset region."], ["pageCount", "2", "Listing pages attempted, 1-8."], ["poolSize", "10", "Products kept for cycling, maximum 50."], ["includeComingSoon", "false", "Include coming-soon status."], ["includePreorders", "false", "Include preorder status."], ["pollInterval", "6 hours", "Successful refresh clock."], ["retryInterval", "10 minutes", "Failure retry clock."], ["requestTimeout", "20 seconds", "Network timeout per request."], ["cacheEnabled", "true", "Persist the last good pool."], ["cacheMaxAge", "7 days", "Preferred freshness window."], ["sortBy / direction", "source / desc", "Source, dates, price, pieces, number, or name."]], [1.75 * inch, 1.1 * inch, 3.55 * inch], font_size=7.1)]
    story += [Spacer(1, 9), table([["Cycle key", "Default", "Explanation"], ["enabled", "true", "Automatic slide movement."], ["mode", "transition", "Timed effects or continuous scroll."], ["interval", "12 seconds", "Delay between transition-mode changes."], ["scrollSpeed", "60 px/s", "Continuous speed, 10-500."], ["scrollDirection", "left", "Left, right, up, or down."], ["step", "1", "Positions advanced each cycle."], ["loop", "true", "Wrap at the end."], ["shuffle", "false", "Shuffle each fresh pool."], ["indicatorStyle", "dots", "Dots, rings, shapes, bars, numbers, or none."]], [1.75 * inch, 1.1 * inch, 3.55 * inch], font_size=6.9)]
    story += [Spacer(1, 7), p("Auto-scroll support", "H2x"), p("Scroll mode is available for hero, carousel, and filmstrip. Other layouts use timed transitions. animation.name and cycle.interval are ignored while continuous scrolling is active.")]
    story += [Spacer(1, 9), p("Single-product slideshow", "H2x"), code('productCount: 1,\ndata: { poolSize: 10, pollInterval: 6 * 60 * 60 * 1000 },\ncycle: { enabled: true, interval: 12 * 1000, step: 1 }'), PageBreak()]

    story += [p("6. Configure every field", "H1x"), p("Available fields: image, name, price, pieceCount, setNumber, releaseDate, announcedDate, availability, ageRange, and pricePerPiece.")]
    story += [p("Image controls", "H2x"), table([["Key", "Meaning"], ["show", "Show or hide the product image."], ["width / height", "Preferred box size, default 180 x 180 px."], ["minWidth / maxWidth", "Responsive limits."], ["aspectRatio", "CSS aspect ratio, default 1 / 1."], ["fit / position", "Contain, cover, fill, scale-down and alignment."], ["opacity", "0 is transparent; 1 is opaque."], ["background / borderRadius", "Image stage appearance."], ["filter", "Any valid CSS filter."], ["showPlaceholder", "LEGO-colored fallback if an image is absent."]], [1.8 * inch, 4.6 * inch])]
    story += [Spacer(1, 8), p("Text controls", "H2x"), table([["Keys", "Meaning"], ["show, order", "Visibility and ordering."], ["label, prefix, suffix", "Value wording."], ["missingText", "Fallback; empty hides unavailable data."], ["fontFamily, fontSize, fontWeight, fontStyle", "Field-specific typography."], ["letterSpacing, lineHeight, lineClamp", "Text density and truncation."], ["textTransform, textAlign", "Case and alignment."], ["color, opacity", "Field color/transparency."], ["effect", "none, shadow, outline, glow, neon, gradient, or letterpress."]], [2.55 * inch, 3.85 * inch]), PageBreak()]

    story += [p("7. Dates without guesswork", "H1x"), p("The module deliberately preserves unknowns. This prevents plausible-looking but false product history.")]
    story += [colored_cards([
        ("LEGO LISTING", "Explicit available/release/launch dates may be used.", BLUE),
        ("NOT A RELEASE DATE", "Will ship by and backorder estimates are ignored as release dates.", LEGO_RED),
        ("BRICKSET", "Optional regional dateFirstAvailable or launchDate enrichment.", PURPLE),
        ("ANNOUNCEMENTS", "Supply manually; LEGO's listing has no dependable announcement field.", colors.HexColor("#087F5B")),
    ])]
    story += [Spacer(1, 8), code('data: {\n  bricksetApiKey: "YOUR_KEY",\n  countryCode: "US",\n  metadataOverrides: {\n    "11512": {\n      releaseDate: "2026-08-01",\n      announcedDate: "2026-06-10"\n    }\n  }\n}')]
    story += [p("Cache discovery time is stored internally but is never displayed as an announcement date. Missing date fields stay hidden unless their field's <b>missingText</b> is configured.", "Callout"), PageBreak()]

    story += [p("8. Ready-made recipes", "H1x")]
    story += [p("Ten-product Progress Pride grid", "H2x"), code('layout: "grid",\nproductCount: 10,\ntheme: "progress",\ndata: { poolSize: 20 },\ncycle: { interval: 30000, step: 10, indicatorStyle: "bars" },\nlayoutSettings: { columns: 2, moduleMaxWidth: 900 }')]
    story += [p("Tuxedo information table", "H2x"), code('layout: "table",\nproductCount: 8,\ntheme: "tuxedo",\nanimation: { name: "wipe", duration: 700 },\ntypography: { baseFontSize: 14 },\nfields: {\n  releaseDate: { show: false },\n  announcedDate: { show: false },\n  availability: { show: false }\n}')]
    story += [p("Transparent images, no motion", "H2x"), code('layout: "list",\nproductCount: 4,\ntheme: "mirror",\ncycle: { enabled: false },\nanimation: { name: "none" },\nfields: { image: { opacity: 0.55, filter: "saturate(.8)" } }')]
    story += [p("Continuous star filmstrip", "H2x"), code('layout: "filmstrip",\nproductCount: 5,\ncycle: {\n  mode: "scroll",\n  scrollSpeed: 70,\n  scrollDirection: "left",\n  indicatorStyle: "stars"\n}')]
    story += [p("Full wall fall and rebuild", "H2x"), code('layout: "hero",\nproductCount: 1,\ncycle: { mode: "transition", interval: 15000 },\nanimation: {\n  name: "brickWallRebuild",\n  duration: 1000,\n  stagger: 18,\n  wallColumns: 6,\n  wallRows: 5\n}'), PageBreak()]

    story += [p("9. Validation and troubleshooting", "H1x"), p("Run the offline validator after every config edit. Run live validation after updates or when LEGO.com output looks wrong.")]
    story += [code('cd ~/MagicMirror/modules/MMM-NewLegoSets\nnpm run validate\nnpm run validate:live')]
    story += [table([["Symptom", "Check"], ["Only one set", "Raise productCount to show more; or keep 1 and ensure poolSize > 1 for cycling."], ["Sets never change", "cycle.enabled, mode, interval/speed, and poolSize larger than productCount."], ["Images blank", "Access to www.lego.com/cdn and DNS filtering."], ["Dates blank", "Expected without trustworthy data; use Brickset or overrides."], ["Motion missing", "The operating system may request reduced motion."], ["Too many symbols", "Raise cycle.step, switch to dots/bars, or hide indicators."], ["Scroll will not start", "Use hero, carousel, or filmstrip and keep cycling enabled."], ["Narrow overflow", "Use auto/compact/table, fewer columns, or smaller cardMinWidth."], ["Custom font missing", "Use a reachable WOFF2 path, preferably local."], ["Brickset warning", "Check key/connectivity; products still render without enrichment."], ["Listing parser error", "Run validate:live and inspect MagicMirror's terminal."]], [1.75 * inch, 4.65 * inch], font_size=7.0)]
    story += [Spacer(1, 10), p("Validated release matrix", "H2x"), p("10 layouts at desktop and narrow widths; all 11 themes; product counts 1-10; all 23 animations; all 11 indicators; four-direction auto-scroll timing; 6 x 5 wall fall, rebuild, and solid phases; live 10-product fetch; syntax and boundary validation.", "Callout"), PageBreak()]

    story += [p("10. Quick reference", "H1x"), p("Top-level defaults", "H2x"), table([["Key", "Default"], ["title / subtitle", "New LEGO Sets / Recently released"], ["layout / productCount", "auto / 1"], ["theme / decorations", "lego / true"], ["dateFormat", "year numeric, month short, day numeric"], ["debug", "false"]], [3.2 * inch, 3.2 * inch])]
    story += [Spacer(1, 8), p("Layout defaults", "H2x"), table([["Key", "Default"], ["columns / gap", "2 / 12"], ["cardMinWidth", "170"], ["moduleWidth / maxWidth", "auto / 760"], ["padding / cardPadding", "12 / 10"], ["borderRadius / cardBorderRadius", "8 / 6"], ["imagePosition / alignItems", "left / center"], ["header / footer / counter / updated", "all true"], ["source", "false"]], [3.2 * inch, 3.2 * inch])]
    story += [Spacer(1, 8), p("Typography defaults", "H2x"), table([["Key", "Default"], ["fontFamily", "Roboto, Arial, sans-serif"], ["customFontName / Url", "empty"], ["baseFontSize / align", "16 / left"], ["textEffect / antialias", "none / true"]], [3.2 * inch, 3.2 * inch]), PageBreak()]

    story += [p("Keep building", "H1x"), p("The module is designed to be changed. Start with product count, layout, and theme. Then tune cycle timing and animation. Finally, adjust fields and typography once the information density feels right on the physical mirror.")]
    story += [Spacer(1, 12), colored_cards([
        ("START SIMPLE", "auto + one product + your preferred theme", BLUE),
        ("CHOOSE MOTION", "cycle.mode selects timed transitions or continuous scroll", PURPLE),
        ("PRESERVE UNKNOWNS", "Blank dates are better than invented history", colors.HexColor("#087F5B")),
        ("VALIDATE", "Run both validators before relying on an upgrade", LEGO_RED),
    ])]
    story += [Spacer(1, 18), p("Documentation and community references", "H2x"), p("MagicMirror core module, rendering, and animation documentation; Brickset API v3 documentation; MMM-Carousel; and MagicMirror community discussion of CSS animation performance. Full links are in README.md.")]
    story += [Spacer(1, 18), p("MMM-NewLegoSets is unofficial and is not affiliated with or endorsed by the LEGO Group or Brickset. LEGO and product names are trademarks of the LEGO Group. LGBTQ+ theme names identify color presets and do not claim ownership of flags or communities.", "Smallx")]
    return story


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    document = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=letter,
        rightMargin=0.55 * inch,
        leftMargin=0.55 * inch,
        topMargin=0.55 * inch,
        bottomMargin=0.55 * inch,
        title="MMM-NewLegoSets 2.0 User Guide",
        author="MMM-NewLegoSets project",
        subject="Installation, themes, layouts, animations, configuration, and validation",
    )
    document.build(build_story(), onFirstPage=page_header_footer, onLaterPages=page_header_footer)
    print(OUTPUT)


if __name__ == "__main__":
    main()
