"use strict";

const path = require("path");
const { spawnSync } = require("child_process");
const configApi = require("../config");
const store = require("../lego-store");
const themes = require("../themes");

const root = path.resolve(__dirname, "..");
const failures = [];
let pairwiseCases = 0;

function check(condition, message) {
	if (!condition) failures.push(message);
}

function validateSyntax() {
	["MMM-NewLegoSets.js", "config.js", "lego-store.js", "node_helper.js", "themes.js"].forEach((file) => {
		const result = spawnSync(process.execPath, ["--check", path.join(root, file)], { encoding: "utf8" });
		if (result.status !== 0) failures.push(`${file}: ${(result.stderr || result.stdout).trim()}`);
	});
}

function validateConfiguration() {
	configApi.LAYOUTS.forEach((layout) => check(configApi.normalize({ layout }).config.layout === layout, `Layout rejected: ${layout}`));
	configApi.THEMES.forEach((theme) => {
		check(configApi.normalize({ theme }).config.theme === theme, `Theme rejected: ${theme}`);
		check(Boolean(themes.resolve(theme)), `Theme missing: ${theme}`);
	});
	configApi.ANIMATIONS.forEach((name) => check(configApi.normalize({ animation: { name } }).config.animation.name === name, `Animation rejected: ${name}`));
	configApi.CYCLE_MODES.forEach((mode) => check(configApi.normalize({ cycle: { mode } }).config.cycle.mode === mode, `Cycle mode rejected: ${mode}`));
	configApi.SCROLL_DIRECTIONS.forEach((scrollDirection) => check(configApi.normalize({ cycle: { scrollDirection } }).config.cycle.scrollDirection === scrollDirection, `Scroll direction rejected: ${scrollDirection}`));
	configApi.INDICATOR_STYLES.forEach((indicatorStyle) => check(configApi.normalize({ cycle: { indicatorStyle } }).config.cycle.indicatorStyle === indicatorStyle, `Indicator style rejected: ${indicatorStyle}`));
	configApi.THEMES.forEach((theme) => {
		const palette = themes.resolve(theme, configApi.DEFAULTS.customTheme).brickColors;
		check(Array.isArray(palette) && palette.length > 0, `Theme brick palette missing: ${theme}`);
		check(palette.every((color) => /^#[0-9a-f]{3,8}$/i.test(color)), `Theme brick palette contains invalid colors: ${theme}`);
	});
	for (let count = 1; count <= 10; count += 1) {
		const normalized = configApi.normalize({ productCount: count, data: { poolSize: 1 } }).config;
		check(normalized.productCount === count, `Product count rejected: ${count}`);
		check(normalized.data.poolSize >= count * 2, `Page-cycle pool does not cover two product pages at count ${count}`);
	}
	const bounded = configApi.normalize({
		productCount: 99,
		data: { pollInterval: 1 },
		cycle: { interval: 1, scrollSpeed: 999 },
		animation: { wallColumns: 99, wallRows: 1 },
	}).config;
	check(bounded.productCount === 10, "Product count upper bound failed");
	check(bounded.data.pollInterval === 60000, "Poll interval lower bound failed");
	check(bounded.cycle.interval === 2000, "Cycle interval lower bound failed");
	check(bounded.cycle.scrollSpeed === 500, "Scroll speed upper bound failed");
	check(bounded.animation.wallColumns === 12, "Wall column upper bound failed");
	check(bounded.animation.wallRows === 2, "Wall row lower bound failed");
	check(configApi.normalize({}).config.cycle.step === "page", "Default cycle step is not page-sized");
	check(configApi.normalize({ cycle: { step: 2 } }).config.cycle.step === 2, "Numeric cycle step rejected");
	check(configApi.normalize({ cycle: { step: "invalid" } }).config.cycle.step === "page", "Invalid cycle step did not fall back to page");
	check(configApi.normalize({ animation: { brickColors: ["#5bcefa", "bad", "#ffffff"] } }).config.animation.brickColors.join(",") === "#5bcefa,#ffffff", "Brick color validation failed");
	const hostileConfig = JSON.parse('{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}}}');
	const safelyMerged = configApi.deepMerge({}, hostileConfig);
	check({}.polluted === undefined && safelyMerged.polluted === undefined, "Prototype-pollution keys were merged");
	check(store.isAllowedRemoteUrl("https://www.lego.com/en-us/categories/new-sets-and-products"), "Official LEGO URL was rejected");
	check(store.isAllowedRemoteUrl("https://brickset.com/api/v3.asmx/getSets"), "Official Brickset URL was rejected");
	check(!store.isAllowedRemoteUrl("http://www.lego.com/example"), "Plain HTTP data source was accepted");
	check(!store.isAllowedRemoteUrl("https://lego.com.attacker.example/"), "Lookalike data-source hostname was accepted");
	check(!store.isAllowedRemoteUrl("http://127.0.0.1:8080/"), "Loopback data source was accepted");
	check(!store.isAllowedRemoteUrl("https://user:password@www.lego.com/"), "Credential-bearing data source was accepted");
	check(!store.isAllowedRemoteUrl("https://www.lego.com:8443/"), "Nonstandard remote port was accepted");

	const boundaryCases = [
		["data.pageCount", { data: { pageCount: -1 } }, 1], ["data.pageCount", { data: { pageCount: 99 } }, 8],
		["data.poolSize", { productCount: 1, data: { poolSize: -1 } }, 2], ["data.poolSize", { data: { poolSize: 99 } }, 50],
		["data.recentDays", { data: { recentDays: 0 } }, 1], ["data.recentDays", { data: { recentDays: 999 } }, 365],
		["data.newsroomPageLimit", { data: { newsroomPageLimit: 0 } }, 1], ["data.newsroomPageLimit", { data: { newsroomPageLimit: 999 } }, 100],
		["animation.duration", { animation: { duration: -1 } }, 0], ["animation.duration", { animation: { duration: 99999 } }, 10000],
		["animation.stagger", { animation: { stagger: -1 } }, 0], ["animation.stagger", { animation: { stagger: 999 } }, 250],
		["animation.particleCount", { animation: { particleCount: 0 } }, 6], ["animation.particleCount", { animation: { particleCount: 999 } }, 120],
		["animation.brickSize", { animation: { brickSize: 0 } }, 4], ["animation.brickSize", { animation: { brickSize: 99 } }, 32],
		["layoutSettings.gap", { layoutSettings: { gap: -1 } }, 0], ["layoutSettings.gap", { layoutSettings: { gap: 999 } }, 80],
		["layoutSettings.cardMinWidth", { layoutSettings: { cardMinWidth: 0 } }, 80], ["layoutSettings.cardMinWidth", { layoutSettings: { cardMinWidth: 999 } }, 600],
		["typography.baseFontSize", { typography: { baseFontSize: 0 } }, 8], ["typography.baseFontSize", { typography: { baseFontSize: 999 } }, 72],
		["fields.image.opacity", { fields: { image: { opacity: -1 } } }, 0], ["fields.image.opacity", { fields: { image: { opacity: 2 } } }, 1],
		["fields.image.width", { fields: { image: { width: 0 } } }, 32], ["fields.image.width", { fields: { image: { width: 9999 } } }, 720],
	];
	const readPath = (value, dottedPath) => dottedPath.split(".").reduce((current, key) => current[key], value);
	boundaryCases.forEach(([name, input, expected]) => {
		check(readPath(configApi.normalize(input).config, name) === expected, `${name} boundary did not normalize to ${expected}`);
	});
	const booleanPaths = [
		"showThemeDecorations", "data.includeComingSoon", "data.includePreorders", "data.recentOnly", "data.newsroomAnnouncements", "data.cacheEnabled",
		"cycle.enabled", "cycle.loop", "cycle.shuffle", "cycle.pauseWhenHidden", "cycle.pauseOnHover", "cycle.showIndicators",
		"animation.respectReducedMotion", "layoutSettings.showSeparators", "layoutSettings.showHeader", "layoutSettings.showFooter",
		"layoutSettings.showCounter", "layoutSettings.showUpdatedTime", "layoutSettings.showSource", "typography.antialias",
		"fields.image.show", "fields.image.showPlaceholder",
	];
	Object.keys(configApi.DEFAULTS.fields).filter((key) => key !== "image").forEach((key) => booleanPaths.push(`fields.${key}.show`));
	booleanPaths.forEach((name) => {
		const candidate = {};
		const parts = name.split(".");
		let cursor = candidate;
		parts.forEach((part, index) => {
			if (index === parts.length - 1) cursor[part] = "false";
			else cursor = cursor[part] = {};
		});
		check(readPath(configApi.normalize(candidate).config, name) === false, `${name} false normalization failed`);
	});

	const dimensions = [
		{ name: "layout", values: configApi.LAYOUTS, set: (target, value) => { target.layout = value; } },
		{ name: "theme", values: configApi.THEMES, set: (target, value) => { target.theme = value; } },
		{ name: "animation", values: configApi.ANIMATIONS, set: (target, value) => { target.animation.name = value; } },
		{ name: "products", values: [1, 2, 3, 5, 10], set: (target, value) => { target.productCount = value; target.data.poolSize = 10; } },
		{ name: "columns", values: [1, 2, 5, 10], set: (target, value) => { target.layoutSettings.columns = value; } },
		{ name: "mode", values: configApi.CYCLE_MODES, set: (target, value) => { target.cycle.mode = value; } },
		{ name: "step", values: ["page", 1, 2, 10], set: (target, value) => { target.cycle.step = value; } },
		{ name: "direction", values: configApi.SCROLL_DIRECTIONS, set: (target, value) => { target.cycle.scrollDirection = value; } },
		{ name: "indicator", values: configApi.INDICATOR_STYLES, set: (target, value) => { target.cycle.indicatorStyle = value; } },
		{ name: "textEffect", values: configApi.TEXT_EFFECTS, set: (target, value) => { target.typography.textEffect = value; } },
		{ name: "sort", values: configApi.SORT_OPTIONS, set: (target, value) => { target.data.sortBy = value; } },
		{ name: "unknownDate", values: configApi.UNKNOWN_DATE_POLICIES, set: (target, value) => { target.data.unknownDatePolicy = value; } },
		{ name: "recentDays", values: [1, 31, 365], set: (target, value) => { target.data.recentDays = value; } },
		{ name: "imageFit", values: ["contain", "cover", "fill", "scale-down"], set: (target, value) => { target.fields.image.fit = value; } },
		{ name: "imagePosition", values: ["left", "right", "top", "bottom"], set: (target, value) => { target.layoutSettings.imagePosition = value; } },
	];
	for (let left = 0; left < dimensions.length; left += 1) {
		for (let right = left + 1; right < dimensions.length; right += 1) {
			for (const leftValue of dimensions[left].values) {
				for (const rightValue of dimensions[right].values) {
					const candidate = configApi.deepMerge(configApi.DEFAULTS, {});
					dimensions[left].set(candidate, leftValue);
					dimensions[right].set(candidate, rightValue);
					const result = configApi.normalize(candidate);
					pairwiseCases += 1;
					check(result.warnings.length === 0, `Pairwise ${dimensions[left].name}/${dimensions[right].name} warned: ${result.warnings.join(" | ")}`);
				}
			}
		}
	}
}

function loadModuleDefinition() {
	let definition = null;
	const injectedGlobals = {
		Module: { register: (_name, value) => { definition = value; } },
		MMMNewLegoConfig: configApi,
		MMMNewLegoThemes: themes,
		window: { matchMedia: () => ({ matches: false }) },
		requestAnimationFrame: (callback) => callback(),
	};
	Object.assign(global, injectedGlobals);
	const modulePath = require.resolve("../MMM-NewLegoSets.js");
	delete require.cache[modulePath];
	require("../MMM-NewLegoSets.js");
	return definition;
}

function validateCyclingAndDeduplication() {
	const definition = loadModuleDefinition();
	const sets = Array.from({ length: 20 }, (_, index) => ({ setNumber: String(10000 + index), name: `Set ${index}` }));
	for (let count = 1; count <= 10; count += 1) {
		const instance = Object.assign(Object.create(definition), {
			config: configApi.normalize({ productCount: count, data: { poolSize: 20 }, cycle: { step: "page", loop: true } }).config,
			sets,
			currentIndex: 0,
		});
		const current = instance.getDisplaySets().map((set) => instance.setIdentity(set));
		instance.currentIndex = instance.nextCycleIndex();
		const next = instance.getDisplaySets().map((set) => instance.setIdentity(set));
		check(current.every((identity) => !next.includes(identity)), `Page-sized cycle overlaps products at productCount ${count}`);
		check(instance.currentIndex === count, `Page-sized cycle advanced ${instance.currentIndex} instead of ${count}`);
	}
	const instance = Object.assign(Object.create(definition), {
		config: configApi.normalize({ productCount: 4, data: { poolSize: 20 }, cycle: { step: "page", loop: true } }).config,
		sets: [sets[0], { ...sets[0], setNumber: `${sets[0].setNumber}-1` }, ...sets.slice(1)],
		currentIndex: 0,
	});
	for (let index = 0; index < instance.sets.length; index += 1) {
		const visible = instance.getDisplaySetsAt(index).map((set) => instance.setIdentity(set));
		check(new Set(visible).size === visible.length, `Display dedupe failed at index ${index}`);
	}
	instance.config.animation.brickColors = ["#123456", "#abcdef"];
	check(instance.activeBrickColors().join(",") === "#123456,#abcdef", "Brick color override was not used");
	instance.config.animation.brickColors = [];
	instance.config.theme = "trans";
	check(instance.activeBrickColors().join(",") === themes.PRESETS.trans.brickColors.join(","), "Trans theme brick palette was not used");
	const styleValues = {};
	const styleProbe = { setProperty: (name, value) => { styleValues[name] = value; } };
	const wrapperProbe = { style: styleProbe, classList: { add: () => {} } };
	instance.config = configApi.normalize({ layoutSettings: { columns: 10, cardMinWidth: 600, moduleMaxWidth: 760, gap: 12 } }).config;
	instance.applyRootStyles(wrapperProbe, themes.resolve("lego"));
	check(styleValues["--nl-columns"] === "1", `cardMinWidth did not cap effective columns: ${styleValues["--nl-columns"]}`);
}

function validateRecencyAndNewsroomParsing() {
	const now = Date.UTC(2026, 7, 16, 12);
	const day = 24 * 60 * 60 * 1000;
	const iso = (offset) => new Date(now + offset * day).toISOString();
	const sets = [
		{ setNumber: "1", announcedDate: iso(-2), releaseDate: iso(20), discoveredDate: iso(-2), sourceIndex: 0 },
		{ setNumber: "2", announcedDate: null, releaseDate: iso(-1), discoveredDate: iso(-10), sourceIndex: 1 },
		{ setNumber: "3", announcedDate: null, releaseDate: iso(15), discoveredDate: iso(-3), sourceIndex: 2 },
		{ setNumber: "4", announcedDate: iso(-40), releaseDate: iso(10), discoveredDate: iso(-1), sourceIndex: 3 },
		{ setNumber: "5", announcedDate: null, releaseDate: iso(-60), discoveredDate: iso(-1), sourceIndex: 4 },
		{ setNumber: "1-1", announcedDate: iso(-1), releaseDate: null, discoveredDate: iso(-1), sourceIndex: 5 },
	];
	const result = store.finalizeRecentSets(sets, { recentOnly: true, recentDays: 31, unknownDatePolicy: "firstSeen", sortBy: "recent", sortDirection: "desc" }, now);
	check(result.map((set) => set.setNumber).join(",") === "1,2,3", `Recent filtering/order failed: ${result.map((set) => set.setNumber).join(",")}`);
	check(store.deduplicateSets(sets).length === 5, "Canonical set-number dedupe failed");
	const sitemap = '<url><loc>https://www.lego.com/en-us/aboutus/news/2026/july/test</loc><lastmod>2026-07-28T12:00:00Z</lastmod></url>';
	check(store.parseNewsroomEntries(sitemap).length === 1, "Newsroom sitemap parsing failed");
	check(store.publishedDateFromArticle('<meta property="article:published_time" content="2026-07-28T12:17:18.767Z"/>') === "2026-07-28T12:17:18.767Z", "Newsroom publication date parsing failed");
}

async function validateLiveData() {
	const result = await store.fetchRecentSets({ locale: "en-us", countryCode: "US", pageCount: 8, poolSize: 10, requestTimeout: 30000 });
	check(result.sets.length === 10, `Live fetch returned ${result.sets.length} sets instead of 10`);
	result.sets.forEach((set, index) => {
		check(Boolean(set.setNumber), `Live set ${index + 1} has no set number`);
		check(Boolean(set.name), `Live set ${index + 1} has no name`);
		check(Boolean(set.image), `Live set ${index + 1} has no image`);
		check(Boolean(set.price), `Live set ${index + 1} has no price`);
		check(Number.isFinite(set.pieceCount), `Live set ${index + 1} has no piece count`);
	});
	const numbers = result.sets.map((set) => String(set.setNumber).replace(/-1$/, ""));
	check(new Set(numbers).size === numbers.length, "Live fetch contains duplicate set numbers");
	const announced = result.sets.filter((set) => set.announcedDate);
	for (let index = 1; index < announced.length; index += 1) {
		check(new Date(announced[index - 1].announcedDate) >= new Date(announced[index].announcedDate), "Live announcements are not newest-first");
	}
	console.log(`Live LEGO.com parser: ${result.sets.length} unique sets, ${announced.length} exact Newsroom announcements via ${result.parserVersions.join(", ")}`);
}

(async () => {
	validateSyntax();
	validateConfiguration();
	validateCyclingAndDeduplication();
	validateRecencyAndNewsroomParsing();
	if (process.argv.includes("--live")) await validateLiveData();
	if (failures.length) {
		console.error(failures.map((failure) => `FAIL: ${failure}`).join("\n"));
		process.exit(1);
	}
	console.log(`PASS: ${pairwiseCases} pairwise config states, ${configApi.LAYOUTS.length} layouts, ${configApi.THEMES.length} themes, ${configApi.ANIMATIONS.length} animations, ${configApi.INDICATOR_STYLES.length} indicators, product counts 1-10`);
})().catch((error) => {
	console.error(`FAIL: ${error.stack || error.message}`);
	process.exit(1);
});
