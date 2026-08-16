(function (root, factory) {
	const api = factory();
	if (typeof module === "object" && module.exports) {
		module.exports = api;
	} else {
		root.MMMNewLegoConfig = api;
	}
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
	"use strict";

	const LAYOUTS = ["auto", "hero", "list", "grid", "compact", "split", "carousel", "filmstrip", "masonry", "table"];
	const THEMES = ["mirror", "lego", "tuxedo", "pride", "progress", "trans", "bisexual", "lesbian", "nonbinary", "pansexual", "custom"];
	const ANIMATIONS = [
		"none", "fade", "crossfade", "slideLeft", "slideRight", "slideUp", "slideDown",
		"zoomIn", "zoomOut", "flipX", "flipY", "rotate", "roll", "bounce", "swing",
		"blur", "wipe", "shutter", "elastic", "legoBuild", "legoBreakBuild", "brickWallRebuild", "random",
	];
	const TEXT_EFFECTS = ["none", "shadow", "outline", "glow", "neon", "gradient", "letterpress"];
	const SORT_OPTIONS = ["recent", "source", "releaseDate", "announcedDate", "discoveredDate", "price", "pieceCount", "setNumber", "name"];
	const UNKNOWN_DATE_POLICIES = ["firstSeen", "include", "exclude"];
	const CYCLE_MODES = ["transition", "scroll"];
	const SCROLL_DIRECTIONS = ["left", "right", "up", "down"];
	const INDICATOR_STYLES = ["dots", "rings", "squares", "diamonds", "triangles", "stars", "hearts", "hexagons", "bars", "numbers", "none"];

	function textField(show, order, label, fontSize, fontWeight, effect) {
		return {
			show,
			order,
			label,
			prefix: "",
			suffix: "",
			missingText: "",
			fontFamily: "inherit",
			fontSize,
			fontWeight,
			fontStyle: "normal",
			letterSpacing: "0",
			lineHeight: 1.2,
			textTransform: "none",
			textAlign: "inherit",
			color: "",
			opacity: 1,
			effect,
			lineClamp: 2,
		};
	}

	const DEFAULTS = {
		title: "New LEGO Sets",
		subtitle: "Recently released",
		layout: "auto",
		productCount: 1,
		theme: "lego",
		showThemeDecorations: true,
		customTheme: {
			brickColors: ["#ffd500", "#e3000b", "#0057b8", "#ffffff"],
			background: "rgba(0, 0, 0, 0.82)",
			surface: "rgba(255, 255, 255, 0.08)",
			text: "#ffffff",
			muted: "#c9c9c9",
			accent: "#ffd500",
			accent2: "#e3000b",
			border: "rgba(255, 255, 255, 0.18)",
			shadow: "rgba(0, 0, 0, 0.45)",
			gradient: "none",
			decoration: "none",
		},
		data: {
			locale: "en-us",
			countryCode: "US",
			sourceUrl: "https://www.lego.com/{locale}/categories/new-sets-and-products",
			pageCount: 2,
			poolSize: 10,
			includeComingSoon: true,
			includePreorders: true,
			recentOnly: true,
			recentDays: 31,
			unknownDatePolicy: "firstSeen",
			newsroomAnnouncements: true,
			newsroomPageLimit: 30,
			pollInterval: 6 * 60 * 60 * 1000,
			retryInterval: 10 * 60 * 1000,
			requestTimeout: 20000,
			userAgent: "MMM-NewLegoSets/2.1 MagicMirror",
			cacheEnabled: true,
			cacheMaxAge: 7 * 24 * 60 * 60 * 1000,
			bricksetApiKey: "",
			metadataOverrides: {},
			sortBy: "recent",
			sortDirection: "desc",
		},
		cycle: {
			enabled: true,
			mode: "transition",
			interval: 12000,
			scrollSpeed: 60,
			scrollDirection: "left",
			step: "page",
			loop: true,
			shuffle: false,
			pauseWhenHidden: true,
			pauseOnHover: false,
			showIndicators: true,
			indicatorStyle: "dots",
		},
		animation: {
			name: "legoBreakBuild",
			duration: 1100,
			easing: "cubic-bezier(0.22, 1, 0.36, 1)",
			stagger: 18,
			particleCount: 36,
			brickSize: 10,
			brickColors: [],
			wallColumns: 6,
			wallRows: 5,
			respectReducedMotion: true,
			randomPool: ["fade", "slideLeft", "zoomIn", "flipY", "wipe", "legoBuild"],
		},
		layoutSettings: {
			columns: 2,
			gap: 12,
			cardMinWidth: 170,
			moduleWidth: "auto",
			moduleMaxWidth: 760,
			moduleHeight: "auto",
			padding: 12,
			cardPadding: 10,
			borderRadius: 8,
			cardBorderRadius: 6,
			imagePosition: "left",
			alignItems: "center",
			showSeparators: true,
			showHeader: true,
			showFooter: true,
			showCounter: true,
			showUpdatedTime: true,
			showSource: false,
		},
		typography: {
			fontFamily: "Roboto, Arial, sans-serif",
			customFontName: "",
			customFontUrl: "",
			baseFontSize: 16,
			textAlign: "left",
			textEffect: "none",
			antialias: true,
		},
		fields: {
			image: {
				show: true,
				order: 10,
				width: 180,
				height: 180,
				minWidth: 64,
				maxWidth: 360,
				aspectRatio: "1 / 1",
				fit: "contain",
				position: "center",
				opacity: 1,
				background: "#ffffff",
				borderRadius: 6,
				filter: "none",
				showPlaceholder: true,
			},
			name: textField(true, 20, "", "1.05rem", 700, "none"),
			price: textField(true, 30, "", "0.92rem", 700, "none"),
			pieceCount: textField(true, 40, "Pieces", "0.78rem", 500, "none"),
			setNumber: textField(true, 50, "Set", "0.74rem", 500, "none"),
			releaseDate: textField(true, 60, "Released", "0.72rem", 500, "none"),
			announcedDate: textField(false, 70, "Announced", "0.72rem", 500, "none"),
			availability: textField(true, 80, "", "0.7rem", 500, "none"),
			ageRange: textField(false, 90, "Age", "0.7rem", 500, "none"),
			pricePerPiece: textField(false, 100, "", "0.7rem", 500, "none"),
		},
		dateFormat: {
			year: "numeric",
			month: "short",
			day: "numeric",
		},
		debug: false,
	};

	function isPlainObject(value) {
		return value !== null && typeof value === "object" && !Array.isArray(value);
	}

	function deepMerge(base, override) {
		const result = Array.isArray(base) ? base.slice() : { ...base };
		if (!isPlainObject(override)) {
			return result;
		}

		Object.keys(override).forEach((key) => {
			const next = override[key];
			if (isPlainObject(next) && isPlainObject(base && base[key])) {
				result[key] = deepMerge(base[key], next);
			} else if (Array.isArray(next)) {
				result[key] = next.slice();
			} else if (next !== undefined) {
				result[key] = next;
			}
		});

		return result;
	}

	function number(value, fallback) {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : fallback;
	}

	function clamp(value, fallback, min, max) {
		return Math.min(Math.max(number(value, fallback), min), max);
	}

	function boolean(value, fallback) {
		if (value === true || value === false) return value;
		if (value === "true") return true;
		if (value === "false") return false;
		return fallback;
	}

	function colorList(value, fallback, warnings, path) {
		if (!Array.isArray(value)) {
			warnings.push(`${path} must be an array of CSS hex colors; using the theme palette`);
			return fallback.slice();
		}
		const colors = value.filter((color) => typeof color === "string" && /^#[0-9a-f]{3,8}$/i.test(color.trim())).map((color) => color.trim());
		if (colors.length !== value.length) warnings.push(`${path} ignored invalid non-hex colors`);
		return colors.slice(0, 16);
	}

	function enumValue(value, allowed, fallback, warnings, path) {
		if (allowed.includes(value)) {
			return value;
		}
		warnings.push(`${path} must be one of: ${allowed.join(", ")}; using ${fallback}`);
		return fallback;
	}

	function applyLegacyConfig(raw) {
		const migrated = deepMerge({}, raw || {});
		migrated.data = migrated.data || {};
		migrated.cycle = migrated.cycle || {};
		migrated.fields = migrated.fields || {};
		migrated.layoutSettings = migrated.layoutSettings || {};

		if (raw && raw.locale !== undefined && migrated.data.locale === undefined) migrated.data.locale = raw.locale;
		if (raw && raw.countryCode !== undefined && migrated.data.countryCode === undefined) migrated.data.countryCode = raw.countryCode;
		if (raw && raw.sourceUrl !== undefined && migrated.data.sourceUrl === undefined) migrated.data.sourceUrl = raw.sourceUrl;
		if (raw && raw.pageCount !== undefined && migrated.data.pageCount === undefined) migrated.data.pageCount = raw.pageCount;
		if (raw && raw.maxItems !== undefined) {
			if (migrated.productCount === undefined) migrated.productCount = Math.min(number(raw.maxItems, 6), 10);
			if (migrated.data.poolSize === undefined) migrated.data.poolSize = Math.max(number(raw.maxItems, 10), 10);
		}
		if (raw && raw.updateInterval !== undefined && migrated.data.pollInterval === undefined) migrated.data.pollInterval = raw.updateInterval;
		if (raw && raw.retryDelay !== undefined && migrated.data.retryInterval === undefined) migrated.data.retryInterval = raw.retryDelay;
		if (raw && raw.columns !== undefined && migrated.layoutSettings.columns === undefined) migrated.layoutSettings.columns = raw.columns;
		if (raw && raw.imageSize !== undefined) {
			migrated.fields.image = migrated.fields.image || {};
			if (migrated.fields.image.width === undefined) migrated.fields.image.width = raw.imageSize;
			if (migrated.fields.image.height === undefined) migrated.fields.image.height = raw.imageSize;
		}
		if (raw && raw.showSetNumber !== undefined) migrated.fields.setNumber = { ...(migrated.fields.setNumber || {}), show: raw.showSetNumber };
		if (raw && raw.showAvailability !== undefined) migrated.fields.availability = { ...(migrated.fields.availability || {}), show: raw.showAvailability };
		if (raw && raw.showAge !== undefined) migrated.fields.ageRange = { ...(migrated.fields.ageRange || {}), show: raw.showAge };
		if (raw && raw.showPricePerPiece !== undefined) migrated.fields.pricePerPiece = { ...(migrated.fields.pricePerPiece || {}), show: raw.showPricePerPiece };

		return migrated;
	}

	function normalize(raw) {
		const warnings = [];
		const config = deepMerge(DEFAULTS, applyLegacyConfig(raw));

		config.layout = enumValue(config.layout, LAYOUTS, DEFAULTS.layout, warnings, "layout");
		config.theme = enumValue(config.theme, THEMES, DEFAULTS.theme, warnings, "theme");
		config.productCount = Math.round(clamp(config.productCount, DEFAULTS.productCount, 1, 10));
		config.data.pageCount = Math.round(clamp(config.data.pageCount, DEFAULTS.data.pageCount, 1, 8));
		config.data.pollInterval = clamp(config.data.pollInterval, DEFAULTS.data.pollInterval, 60000, 7 * 24 * 60 * 60 * 1000);
		config.data.retryInterval = clamp(config.data.retryInterval, DEFAULTS.data.retryInterval, 30000, config.data.pollInterval);
		config.data.requestTimeout = clamp(config.data.requestTimeout, DEFAULTS.data.requestTimeout, 1000, 120000);
		config.data.cacheMaxAge = clamp(config.data.cacheMaxAge, DEFAULTS.data.cacheMaxAge, 60000, 90 * 24 * 60 * 60 * 1000);
		config.data.recentDays = Math.round(clamp(config.data.recentDays, DEFAULTS.data.recentDays, 1, 365));
		config.data.newsroomPageLimit = Math.round(clamp(config.data.newsroomPageLimit, DEFAULTS.data.newsroomPageLimit, 1, 100));
		config.data.unknownDatePolicy = enumValue(config.data.unknownDatePolicy, UNKNOWN_DATE_POLICIES, DEFAULTS.data.unknownDatePolicy, warnings, "data.unknownDatePolicy");
		config.data.sortBy = enumValue(config.data.sortBy, SORT_OPTIONS, DEFAULTS.data.sortBy, warnings, "data.sortBy");
		config.data.sortDirection = enumValue(config.data.sortDirection, ["asc", "desc"], DEFAULTS.data.sortDirection, warnings, "data.sortDirection");

		config.cycle.interval = clamp(config.cycle.interval, DEFAULTS.cycle.interval, 2000, 24 * 60 * 60 * 1000);
		config.cycle.mode = enumValue(config.cycle.mode, CYCLE_MODES, DEFAULTS.cycle.mode, warnings, "cycle.mode");
		config.cycle.scrollSpeed = clamp(config.cycle.scrollSpeed, DEFAULTS.cycle.scrollSpeed, 10, 500);
		config.cycle.scrollDirection = enumValue(config.cycle.scrollDirection, SCROLL_DIRECTIONS, DEFAULTS.cycle.scrollDirection, warnings, "cycle.scrollDirection");
		if (config.cycle.step === "page") {
			config.cycle.step = "page";
		} else if (Number.isFinite(Number(config.cycle.step))) {
			config.cycle.step = Math.round(clamp(config.cycle.step, 1, 1, 10));
		} else {
			warnings.push("cycle.step must be page or a number from 1 to 10; using page");
			config.cycle.step = "page";
		}
		const pagePoolMinimum = boolean(config.cycle.enabled, DEFAULTS.cycle.enabled) && config.cycle.step === "page"
			? Math.min(config.productCount * 2, 50)
			: config.productCount;
		config.data.poolSize = Math.round(clamp(config.data.poolSize, DEFAULTS.data.poolSize, pagePoolMinimum, 50));
		config.cycle.indicatorStyle = enumValue(config.cycle.indicatorStyle, INDICATOR_STYLES, DEFAULTS.cycle.indicatorStyle, warnings, "cycle.indicatorStyle");
		config.animation.name = enumValue(config.animation.name, ANIMATIONS, DEFAULTS.animation.name, warnings, "animation.name");
		config.animation.duration = clamp(config.animation.duration, DEFAULTS.animation.duration, 0, 10000);
		config.animation.stagger = clamp(config.animation.stagger, DEFAULTS.animation.stagger, 0, 250);
		config.animation.particleCount = Math.round(clamp(config.animation.particleCount, DEFAULTS.animation.particleCount, 6, 120));
		config.animation.brickSize = clamp(config.animation.brickSize, DEFAULTS.animation.brickSize, 4, 32);
		config.animation.brickColors = colorList(config.animation.brickColors, DEFAULTS.animation.brickColors, warnings, "animation.brickColors");
		config.animation.wallColumns = Math.round(clamp(config.animation.wallColumns, DEFAULTS.animation.wallColumns, 2, 12));
		config.animation.wallRows = Math.round(clamp(config.animation.wallRows, DEFAULTS.animation.wallRows, 2, 12));
		config.animation.randomPool = (Array.isArray(config.animation.randomPool) ? config.animation.randomPool : DEFAULTS.animation.randomPool)
			.filter((name) => ANIMATIONS.includes(name) && name !== "random" && name !== "none");
		if (!config.animation.randomPool.length) config.animation.randomPool = DEFAULTS.animation.randomPool.slice();

		config.layoutSettings.columns = Math.round(clamp(config.layoutSettings.columns, DEFAULTS.layoutSettings.columns, 1, 10));
		config.layoutSettings.gap = clamp(config.layoutSettings.gap, DEFAULTS.layoutSettings.gap, 0, 80);
		config.layoutSettings.cardMinWidth = clamp(config.layoutSettings.cardMinWidth, DEFAULTS.layoutSettings.cardMinWidth, 80, 600);
		config.layoutSettings.moduleMaxWidth = clamp(config.layoutSettings.moduleMaxWidth, DEFAULTS.layoutSettings.moduleMaxWidth, 160, 3840);
		config.layoutSettings.padding = clamp(config.layoutSettings.padding, DEFAULTS.layoutSettings.padding, 0, 80);
		config.layoutSettings.cardPadding = clamp(config.layoutSettings.cardPadding, DEFAULTS.layoutSettings.cardPadding, 0, 60);
		config.layoutSettings.borderRadius = clamp(config.layoutSettings.borderRadius, DEFAULTS.layoutSettings.borderRadius, 0, 40);
		config.layoutSettings.cardBorderRadius = clamp(config.layoutSettings.cardBorderRadius, DEFAULTS.layoutSettings.cardBorderRadius, 0, 40);
		config.layoutSettings.imagePosition = enumValue(config.layoutSettings.imagePosition, ["left", "right", "top", "bottom"], DEFAULTS.layoutSettings.imagePosition, warnings, "layoutSettings.imagePosition");
		config.layoutSettings.alignItems = enumValue(config.layoutSettings.alignItems, ["start", "center", "end", "stretch"], DEFAULTS.layoutSettings.alignItems, warnings, "layoutSettings.alignItems");

		config.typography.baseFontSize = clamp(config.typography.baseFontSize, DEFAULTS.typography.baseFontSize, 8, 72);
		config.typography.textAlign = enumValue(config.typography.textAlign, ["left", "center", "right"], DEFAULTS.typography.textAlign, warnings, "typography.textAlign");
		config.typography.textEffect = enumValue(config.typography.textEffect, TEXT_EFFECTS, DEFAULTS.typography.textEffect, warnings, "typography.textEffect");

		config.fields.image.opacity = clamp(config.fields.image.opacity, DEFAULTS.fields.image.opacity, 0, 1);
		config.fields.image.width = clamp(config.fields.image.width, DEFAULTS.fields.image.width, 32, 720);
		config.fields.image.height = clamp(config.fields.image.height, DEFAULTS.fields.image.height, 32, 720);
		config.fields.image.minWidth = clamp(config.fields.image.minWidth, DEFAULTS.fields.image.minWidth, 24, 720);
		config.fields.image.maxWidth = clamp(config.fields.image.maxWidth, DEFAULTS.fields.image.maxWidth, config.fields.image.minWidth, 1440);
		config.fields.image.fit = enumValue(config.fields.image.fit, ["contain", "cover", "fill", "scale-down"], DEFAULTS.fields.image.fit, warnings, "fields.image.fit");
		config.fields.image.position = enumValue(config.fields.image.position, ["center", "top", "right", "bottom", "left"], DEFAULTS.fields.image.position, warnings, "fields.image.position");
		config.fields.image.borderRadius = clamp(config.fields.image.borderRadius, DEFAULTS.fields.image.borderRadius, 0, 80);

		config.showThemeDecorations = boolean(config.showThemeDecorations, DEFAULTS.showThemeDecorations);
		["includeComingSoon", "includePreorders", "recentOnly", "newsroomAnnouncements", "cacheEnabled"].forEach((key) => {
			config.data[key] = boolean(config.data[key], DEFAULTS.data[key]);
		});
		["enabled", "loop", "shuffle", "pauseWhenHidden", "pauseOnHover", "showIndicators"].forEach((key) => {
			config.cycle[key] = boolean(config.cycle[key], DEFAULTS.cycle[key]);
		});
		config.animation.respectReducedMotion = boolean(config.animation.respectReducedMotion, DEFAULTS.animation.respectReducedMotion);
		["showSeparators", "showHeader", "showFooter", "showCounter", "showUpdatedTime", "showSource"].forEach((key) => {
			config.layoutSettings[key] = boolean(config.layoutSettings[key], DEFAULTS.layoutSettings[key]);
		});
		config.typography.antialias = boolean(config.typography.antialias, DEFAULTS.typography.antialias);
		config.fields.image.show = boolean(config.fields.image.show, DEFAULTS.fields.image.show);
		config.fields.image.showPlaceholder = boolean(config.fields.image.showPlaceholder, DEFAULTS.fields.image.showPlaceholder);

		Object.keys(config.fields).filter((key) => key !== "image").forEach((key) => {
			const field = config.fields[key];
			field.show = boolean(field.show, DEFAULTS.fields[key].show);
			field.order = clamp(field.order, DEFAULTS.fields[key].order, 0, 1000);
			field.opacity = clamp(field.opacity, DEFAULTS.fields[key].opacity, 0, 1);
			field.lineHeight = clamp(field.lineHeight, DEFAULTS.fields[key].lineHeight, 0.7, 3);
			field.lineClamp = Math.round(clamp(field.lineClamp, DEFAULTS.fields[key].lineClamp, 1, 12));
			field.effect = enumValue(field.effect, TEXT_EFFECTS, DEFAULTS.fields[key].effect, warnings, `fields.${key}.effect`);
			field.textTransform = enumValue(field.textTransform, ["none", "uppercase", "lowercase", "capitalize"], DEFAULTS.fields[key].textTransform, warnings, `fields.${key}.textTransform`);
			field.textAlign = enumValue(field.textAlign, ["inherit", "left", "center", "right"], DEFAULTS.fields[key].textAlign, warnings, `fields.${key}.textAlign`);
		});

		return { config, warnings };
	}

	return {
		ANIMATIONS,
		CYCLE_MODES,
		DEFAULTS,
		INDICATOR_STYLES,
		LAYOUTS,
		SORT_OPTIONS,
		SCROLL_DIRECTIONS,
		TEXT_EFFECTS,
		THEMES,
		UNKNOWN_DATE_POLICIES,
		deepMerge,
		normalize,
	};
}));
