(function () {
	"use strict";

	const configApi = window.MMMNewLegoConfig;
	const moduleDefinition = window.moduleDefinition;
	const devicePresets = {
		portrait: { width: 1080, height: 1920 },
		landscape: { width: 1920, height: 1080 },
		compact: { width: 420, height: 900 },
		desktop: { width: 1280, height: 800 },
	};
	const fieldLabels = {
		image: "Set image",
		name: "Set name",
		price: "Price",
		pieceCount: "Piece count",
		setNumber: "Set number",
		releaseDate: "Release date",
		announcedDate: "Announced date",
		availability: "Availability",
		ageRange: "Age range",
		pricePerPiece: "Price per piece",
	};
	const verifiedImage = "https://www.lego.com/cdn/cs/set/assets/blt621a9fb4f7d5deba/bltc8cac287dd2bee85-11512_Prod_en-gb.png?fit=bounds&format=jpg&quality=80&width=320&height=320&dpr=1";
	const sampleNames = [
		"Hanging Golden Pothos", "Jaguar E-Type", "Arcade Pinball Machine", "The Shire", "Italian Riviera",
		"Emerald City Wall Art", "Star Wars Logo", "Krusty Burger", "Mineral Collection", "Japanese Garden",
		"Moon Rover", "Retro Radio", "City Tram", "Botanical Garden", "Space Laboratory",
		"Ocean Explorer", "Museum Gallery", "Mountain Railway", "Classic Camera", "Concert Stage",
	];
	const sampleSets = sampleNames.map((name, index) => ({
		setNumber: String(11512 + index),
		name,
		url: "https://www.lego.com/en-us/categories/new-sets-and-products",
		image: verifiedImage,
		price: `$${(59.99 + index * 18).toFixed(2)}`,
		priceCents: 5999 + index * 1800,
		currencyCode: "USD",
		pieceCount: 372 + index * 241,
		ageRange: index % 2 ? "12+" : "18+",
		availability: index % 3 ? "Available now" : "Backorder",
		releaseDate: `2026-08-${String(index + 1).padStart(2, "0")}T12:00:00.000Z`,
		announcedDate: index % 2 ? null : `2026-07-${String(index + 10).padStart(2, "0")}T12:00:00.000Z`,
		discoveredDate: `2026-08-${String(index + 1).padStart(2, "0")}T12:00:00.000Z`,
	}));

	const initialConfig = {
		layout: "hero",
		productCount: 1,
		theme: "lego",
		data: { poolSize: 10, pollInterval: 6 * 60 * 60 * 1000 },
		cycle: { enabled: true, mode: "transition", interval: 12 * 1000, scrollSpeed: 60, scrollDirection: "left", step: "page" },
		animation: { name: "legoBreakBuild", duration: 1100 },
		layoutSettings: { moduleWidth: "100%", moduleMaxWidth: 760, columns: 2 },
	};
	const storageKey = "MMM-NewLegoSets-Test-Mirror.config.v1";

	function storedConfig() {
		try {
			return JSON.parse(window.localStorage.getItem(storageKey)) || initialConfig;
		} catch (error) {
			return initialConfig;
		}
	}

	let normalized = configApi.normalize(storedConfig());
	let config = normalized.config;
	let warnings = normalized.warnings;
	let sets = sampleSets.slice();
	let cyclePlaying = true;
	let pollTimer = null;
	let dataReloadTimer = null;
	let nextPollAt = null;
	let currentDataMode = "live";
	let dataDetails = { source: "Sample data", fetchedAt: new Date().toISOString(), total: sampleSets.length, parserVersions: [] };
	let canvasDimensions = { ...devicePresets.portrait };
	let mirrorScale = 1;
	let auditRunning = false;

	const elements = {
		canvas: document.getElementById("mirror-canvas"),
		scaler: document.getElementById("mirror-scaler"),
		stage: document.getElementById("preview-stage"),
		region: document.getElementById("module-region"),
		dataStatus: document.getElementById("data-status"),
		configEditor: document.getElementById("config-editor"),
		jsonError: document.getElementById("json-error"),
		warningList: document.getElementById("warning-list"),
		diagnosticList: document.getElementById("diagnostic-list"),
		diagnosticSummary: document.getElementById("diagnostic-summary"),
	};

	const instance = Object.assign(Object.create(moduleDefinition), {
		name: "MMM-NewLegoSets",
		identifier: "live-test-mirror",
		config,
		configWarnings: warnings,
		sets,
		currentIndex: 0,
		loaded: true,
		error: null,
		stale: false,
		lastUpdated: dataDetails.fetchedAt,
		source: dataDetails.source,
		sourceUrl: null,
		total: sets.length,
		fetching: false,
		suspended: false,
		transitioning: false,
		pendingEnterAnimation: null,
		pollTimer: null,
		cycleTimer: null,
		retryTimer: null,
		transitionTimer: null,
		scrollTimer: null,
		domId: "mmm-new-lego-live-test",
		updateDom: function () { renderModule(); },
	});

	function clone(value) {
		return JSON.parse(JSON.stringify(value));
	}

	function setStatus(kind, text) {
		elements.dataStatus.className = `status-pill is-${kind}`;
		elements.dataStatus.textContent = text;
	}

	function syncInstance() {
		instance.config = config;
		instance.configWarnings = warnings;
		instance.sets = sets;
		instance.loaded = true;
		instance.lastUpdated = dataDetails.fetchedAt;
		instance.source = dataDetails.source;
		instance.sourceUrl = dataDetails.sourceUrl || null;
		instance.total = dataDetails.total || sets.length;
		instance.currentIndex = Math.min(instance.currentIndex, Math.max(sets.length - 1, 0));
		instance.suspended = !cyclePlaying;
	}

	function renderModule() {
		syncInstance();
		elements.region.replaceChildren(instance.getDom());
		if (!auditRunning) {
			window.setTimeout(updateDiagnostics, 80);
			window.setTimeout(updateDiagnostics, 600);
		}
	}

	function restartCycle() {
		clearTimeout(instance.cycleTimer);
		clearTimeout(instance.scrollTimer);
		instance.transitioning = false;
		instance.pendingEnterAnimation = null;
		instance.suspended = !cyclePlaying;
		if (cyclePlaying) instance.scheduleCycle();
		updateCycleButton();
	}

	function applyConfig(nextRaw, options = {}) {
		const result = configApi.normalize(nextRaw);
		clearTimeout(instance.cycleTimer);
		clearTimeout(instance.transitionTimer);
		clearTimeout(instance.scrollTimer);
		instance.transitioning = false;
		instance.pendingEnterAnimation = null;
		instance.transitionTimer = null;
		instance.scrollTimer = null;
		config = result.config;
		warnings = result.warnings;
		window.localStorage.setItem(storageKey, JSON.stringify(config));
		instance.config = config;
		instance.configWarnings = warnings;
		if (!options.preserveIndex) instance.currentIndex = 0;
		instance.injectCustomFont();
		renderModule();
		restartCycle();
		syncControls();
		syncEditor();
		applyRegion();
		schedulePoll();
		return result;
	}

	function mutateConfig(mutator, options = {}) {
		const next = clone(config);
		mutator(next);
		applyConfig(next, { preserveIndex: options.preserveIndex !== false });
	}

	function syncEditor() {
		elements.configEditor.value = JSON.stringify(config, null, 2);
		elements.jsonError.textContent = "";
	}

	function optionList(select, values) {
		select.replaceChildren(...values.map((value) => {
			const option = document.createElement("option");
			option.value = value;
			option.textContent = value;
			return option;
		}));
	}

	function buildFieldControls() {
		const container = document.getElementById("field-controls");
		container.replaceChildren(...Object.keys(fieldLabels).map((key) => {
			const label = document.createElement("label");
			label.className = "field-row";
			const checkbox = document.createElement("input");
			checkbox.type = "checkbox";
			checkbox.dataset.field = key;
			checkbox.addEventListener("change", () => mutateConfig((next) => { next.fields[key].show = checkbox.checked; }));
			label.append(checkbox, document.createTextNode(fieldLabels[key]));
			return label;
		}));
	}

	function syncControls() {
		document.getElementById("layout-control").value = config.layout;
		document.getElementById("theme-control").value = config.theme;
		document.getElementById("animation-control").value = config.animation.name;
		document.getElementById("indicator-control").value = config.cycle.indicatorStyle;
		document.getElementById("cycle-mode-control").value = config.cycle.mode;
		document.getElementById("scroll-direction-control").value = config.cycle.scrollDirection;
		document.getElementById("cycle-step-control").value = String(config.cycle.step);
		document.getElementById("sort-control").value = config.data.sortBy;
		document.getElementById("unknown-date-control").value = config.data.unknownDatePolicy;
		document.getElementById("brick-colors-control").value = config.animation.brickColors.join(", ");
		document.getElementById("count-control").value = config.productCount;
		document.getElementById("count-output").value = config.productCount;
		document.getElementById("columns-control").value = config.layoutSettings.columns;
		document.getElementById("columns-output").value = config.layoutSettings.columns;
		document.getElementById("cycle-control").value = config.cycle.interval / 1000;
		document.getElementById("cycle-output").value = `${config.cycle.interval / 1000}s`;
		document.getElementById("scroll-speed-control").value = config.cycle.scrollSpeed;
		document.getElementById("scroll-speed-output").value = `${config.cycle.scrollSpeed}px/s`;
		document.getElementById("duration-control").value = config.animation.duration;
		document.getElementById("duration-output").value = `${config.animation.duration}ms`;
		document.getElementById("width-control").value = config.layoutSettings.moduleMaxWidth;
		document.getElementById("width-output").value = `${config.layoutSettings.moduleMaxWidth}px`;
		document.getElementById("font-size-control").value = config.typography.baseFontSize;
		document.getElementById("font-size-output").value = `${config.typography.baseFontSize}px`;
		document.getElementById("image-opacity-control").value = config.fields.image.opacity;
		document.getElementById("image-opacity-output").value = `${Math.round(config.fields.image.opacity * 100)}%`;
		document.getElementById("recent-days-control").value = config.data.recentDays;
		document.getElementById("recent-days-output").value = `${config.data.recentDays} days`;
		document.getElementById("poll-control").value = String(config.data.pollInterval);
		document.getElementById("decorations-control").checked = config.showThemeDecorations;
		document.getElementById("header-control").checked = config.layoutSettings.showHeader;
		document.getElementById("footer-control").checked = config.layoutSettings.showFooter;
		document.getElementById("indicators-control").checked = config.cycle.showIndicators;
		document.getElementById("reduced-motion-control").checked = config.animation.respectReducedMotion;
		document.getElementById("loop-control").checked = config.cycle.loop;
		document.getElementById("recent-only-control").checked = config.data.recentOnly;
		document.getElementById("coming-soon-control").checked = config.data.includeComingSoon;
		document.getElementById("preorders-control").checked = config.data.includePreorders;
		document.getElementById("newsroom-control").checked = config.data.newsroomAnnouncements;
		document.getElementById("text-effect-control").value = config.typography.textEffect;
		document.getElementById("image-fit-control").value = config.fields.image.fit;
		document.querySelectorAll("[data-field]").forEach((checkbox) => { checkbox.checked = config.fields[checkbox.dataset.field].show; });
	}

	function applyDevice() {
		const preset = document.getElementById("device-preset").value;
		const custom = document.getElementById("custom-dimensions");
		custom.hidden = preset !== "custom";
		if (preset === "custom") {
			canvasDimensions = {
				width: Math.min(Math.max(Number(document.getElementById("custom-width").value) || 1080, 320), 3840),
				height: Math.min(Math.max(Number(document.getElementById("custom-height").value) || 1920, 320), 3840),
			};
		} else {
			canvasDimensions = { ...devicePresets[preset] };
		}
		elements.canvas.style.width = `${canvasDimensions.width}px`;
		elements.canvas.style.height = `${canvasDimensions.height}px`;
		elements.canvas.dataset.device = preset;
		document.getElementById("canvas-size").textContent = `${canvasDimensions.width} x ${canvasDimensions.height}`;
		applyRegion();
		fitCanvas();
	}

	function applyRegion() {
		const regionName = document.getElementById("region-preset").value;
		const region = elements.region;
		const width = canvasDimensions.width;
		const height = canvasDimensions.height;
		const margin = Math.max(18, Math.round(Math.min(width, height) * 0.035));
		const safeWidth = width - margin * 2;
		const compactCanvas = width <= 600;
		const sideWidth = compactCanvas ? safeWidth : Math.max(180, Math.min(520, Math.round(width * 0.44)));
		const centerWidth = compactCanvas ? safeWidth : Math.max(240, Math.min(820, Math.round(width * 0.68)));
		const fullWidth = Math.max(260, Math.min(safeWidth, 980));
		region.removeAttribute("style");
		region.dataset.region = regionName;
		const place = (styles, align) => {
			Object.assign(region.style, styles);
			region.dataset.align = align;
		};
		if (regionName === "top_left") place({ top: `${margin}px`, left: `${margin}px`, width: `${sideWidth}px` }, "left");
		if (regionName === "top_center") place({ top: `${margin}px`, left: "50%", width: `${centerWidth}px`, transform: "translateX(-50%)" }, "center");
		if (regionName === "top_right") place({ top: `${margin}px`, right: `${margin}px`, width: `${sideWidth}px` }, "right");
		if (regionName === "upper_third") place({ top: `${Math.round(height * 0.24)}px`, left: "50%", width: `${fullWidth}px`, transform: "translateX(-50%)" }, "center");
		if (regionName === "middle_center") place({ top: "50%", left: "50%", width: `${fullWidth}px`, transform: "translate(-50%, -50%)" }, "center");
		if (regionName === "lower_third") place({ top: `${Math.round(height * 0.63)}px`, left: "50%", width: `${fullWidth}px`, transform: "translateX(-50%)" }, "center");
		if (regionName === "bottom_left") place({ bottom: `${margin}px`, left: `${margin}px`, width: `${sideWidth}px` }, "left");
		if (regionName === "bottom_center") place({ bottom: `${margin}px`, left: "50%", width: `${centerWidth}px`, transform: "translateX(-50%)" }, "center");
		if (regionName === "bottom_right") place({ right: `${margin}px`, bottom: `${margin}px`, width: `${sideWidth}px` }, "right");
		if (!auditRunning) window.setTimeout(updateDiagnostics, 80);
	}

	function fitCanvas() {
		const availableWidth = Math.max(elements.stage.clientWidth - 36, 100);
		const availableHeight = Math.max(elements.stage.clientHeight - 36, 100);
		mirrorScale = Math.min(availableWidth / canvasDimensions.width, availableHeight / canvasDimensions.height, 1);
		elements.canvas.style.transform = `scale(${mirrorScale})`;
		elements.scaler.style.width = `${Math.round(canvasDimensions.width * mirrorScale)}px`;
		elements.scaler.style.height = `${Math.round(canvasDimensions.height * mirrorScale)}px`;
		document.getElementById("scale-readout").textContent = `Scale ${Math.round(mirrorScale * 100)}%`;
	}

	function liveQuery(force) {
		const params = new URLSearchParams({
			locale: config.data.locale,
			countryCode: config.data.countryCode,
			poolSize: config.data.poolSize,
			pageCount: config.data.pageCount,
			includeComingSoon: config.data.includeComingSoon,
			includePreorders: config.data.includePreorders,
			recentOnly: config.data.recentOnly,
			recentDays: config.data.recentDays,
			unknownDatePolicy: config.data.unknownDatePolicy,
			newsroomAnnouncements: config.data.newsroomAnnouncements,
			newsroomPageLimit: config.data.newsroomPageLimit,
			sortBy: config.data.sortBy,
			sortDirection: config.data.sortDirection,
			force: Boolean(force),
		});
		return `/api/sets?${params.toString()}`;
	}

	async function loadData(force = false) {
		currentDataMode = document.getElementById("data-mode").value;
		if (currentDataMode === "sample") {
			sets = sampleSets.slice(0, config.data.poolSize);
			dataDetails = { source: "Sample fallback", fetchedAt: new Date().toISOString(), total: sets.length, parserVersions: ["sample"] };
			instance.error = null;
			instance.stale = false;
			instance.currentIndex = 0;
			setStatus("sample", `${sets.length} sample products`);
			renderModule();
			restartCycle();
			schedulePoll();
			return;
		}
		setStatus("loading", "Fetching live LEGO data");
		try {
			const response = await fetch(liveQuery(force), { cache: "no-store" });
			const payload = await response.json();
			if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
			if (!Array.isArray(payload.sets) || !payload.sets.length) throw new Error("LEGO.com returned no products");
			sets = payload.sets;
			dataDetails = payload;
			instance.error = null;
			instance.stale = false;
			instance.currentIndex = 0;
			setStatus("live", `${sets.length} live products${payload.labCache ? " (lab cache)" : ""}`);
		} catch (error) {
			instance.error = error.message;
			instance.stale = true;
			setStatus("error", `Live fetch failed; showing ${sets.length} retained products`);
		}
		renderModule();
		restartCycle();
		schedulePoll();
	}

	function schedulePoll() {
		clearTimeout(pollTimer);
		nextPollAt = null;
		if (currentDataMode !== "live") return;
		nextPollAt = Date.now() + config.data.pollInterval;
		pollTimer = setTimeout(() => loadData(false), config.data.pollInterval);
	}

	function scheduleDataReload() {
		clearTimeout(dataReloadTimer);
		dataReloadTimer = setTimeout(() => loadData(false), 300);
	}

	function updateCycleButton() {
		document.getElementById("toggle-cycle").textContent = cyclePlaying ? "Pause" : "Play";
	}

	function toggleCycle() {
		cyclePlaying = !cyclePlaying;
		instance.suspended = !cyclePlaying;
		clearTimeout(instance.cycleTimer);
		clearTimeout(instance.scrollTimer);
		clearTimeout(instance.transitionTimer);
		if (!cyclePlaying) {
			instance.transitioning = false;
			instance.pendingEnterAnimation = null;
			renderModule();
		}
		if (cyclePlaying) instance.scheduleCycle();
		updateCycleButton();
		updateDiagnostics();
	}

	function nextSlide() {
		if (instance.transitioning || sets.length <= config.productCount) return;
		const restorePause = !cyclePlaying;
		instance.suspended = false;
		clearTimeout(instance.cycleTimer);
		instance.advanceCycle();
		if (restorePause) {
			setTimeout(() => {
				instance.suspended = true;
				clearTimeout(instance.cycleTimer);
				updateDiagnostics();
			}, config.animation.duration * 2 + 180);
		}
	}

	function inspectAuditRender(expectedCount) {
		const root = elements.region.querySelector(".mmm-new-lego-sets");
		if (!root) return ["module DOM missing"];
		const scope = root.querySelector(".nl-scroll-slide-current") || root;
		const items = Array.from(scope.querySelectorAll(".nl-card, .nl-table-row")).filter((item) => !item.closest(".nl-wall-layer"));
		const numbers = items.map((item) => item.dataset.setNumber).filter(Boolean);
		const failures = [];
		if (items.length !== expectedCount) failures.push(`expected ${expectedCount} items, found ${items.length}`);
		if (new Set(numbers).size !== numbers.length) failures.push("duplicate set numbers in one view");
		if (root.scrollWidth > root.clientWidth + 1) failures.push(`root overflow ${root.scrollWidth}/${root.clientWidth}`);
		const clipped = Array.from(root.querySelectorAll(".nl-carousel-rail, .nl-items-filmstrip"))
			.some((container) => container.scrollWidth > container.clientWidth + 1 || container.scrollHeight > container.clientHeight + 1);
		if (clipped) failures.push("carousel/filmstrip clipping");
		return failures;
	}

	async function runCompatibilityAudit() {
		const report = document.getElementById("compatibility-report");
		const button = document.getElementById("run-compatibility");
		button.disabled = true;
		report.textContent = "Running normalization and rendered compatibility matrices...";
		const original = {
			config: clone(config),
			sets: sets.slice(),
			device: document.getElementById("device-preset").value,
			region: document.getElementById("region-preset").value,
			cyclePlaying,
		};
		cyclePlaying = false;
		auditRunning = true;
		instance.suspended = true;
		instance.clearTimers();
		const failures = [];
		let normalizedCases = 0;
		let renderedCases = 0;
		try {

		const dimensions = [
			{ name: "layout", values: configApi.LAYOUTS, set: (target, value) => { target.layout = value; } },
			{ name: "theme", values: configApi.THEMES, set: (target, value) => { target.theme = value; } },
			{ name: "animation", values: configApi.ANIMATIONS, set: (target, value) => { target.animation.name = value; } },
			{ name: "products", values: [1, 2, 3, 5, 10], set: (target, value) => { target.productCount = value; target.data.poolSize = 10; } },
			{ name: "columns", values: [1, 2, 5, 10], set: (target, value) => { target.layoutSettings.columns = value; } },
			{ name: "cycleMode", values: configApi.CYCLE_MODES, set: (target, value) => { target.cycle.mode = value; } },
			{ name: "cycleStep", values: ["page", 1, 2, 10], set: (target, value) => { target.cycle.step = value; } },
			{ name: "direction", values: configApi.SCROLL_DIRECTIONS, set: (target, value) => { target.cycle.scrollDirection = value; } },
			{ name: "indicator", values: configApi.INDICATOR_STYLES, set: (target, value) => { target.cycle.indicatorStyle = value; } },
			{ name: "textEffect", values: configApi.TEXT_EFFECTS, set: (target, value) => { target.typography.textEffect = value; } },
			{ name: "imageFit", values: ["contain", "cover", "fill", "scale-down"], set: (target, value) => { target.fields.image.fit = value; } },
			{ name: "imagePosition", values: ["left", "right", "top", "bottom"], set: (target, value) => { target.layoutSettings.imagePosition = value; } },
			{ name: "alignment", values: ["start", "center", "end", "stretch"], set: (target, value) => { target.layoutSettings.alignItems = value; } },
			{ name: "recentDays", values: [1, 31, 365], set: (target, value) => { target.data.recentDays = value; } },
			{ name: "unknownDates", values: configApi.UNKNOWN_DATE_POLICIES, set: (target, value) => { target.data.unknownDatePolicy = value; } },
			{ name: "sort", values: configApi.SORT_OPTIONS, set: (target, value) => { target.data.sortBy = value; } },
			{ name: "brickPalette", values: [[], ["#5bcefa", "#f5a9b8", "#ffffff"], ["#000000"]], set: (target, value) => { target.animation.brickColors = value; } },
		];

		for (let left = 0; left < dimensions.length; left += 1) {
			for (let right = left + 1; right < dimensions.length; right += 1) {
				for (const leftValue of dimensions[left].values) {
					for (const rightValue of dimensions[right].values) {
						const candidate = clone(configApi.DEFAULTS);
						dimensions[left].set(candidate, leftValue);
						dimensions[right].set(candidate, rightValue);
						const result = configApi.normalize(candidate);
						normalizedCases += 1;
						if (result.warnings.length) failures.push(`normalize ${dimensions[left].name}/${dimensions[right].name}: ${result.warnings.join(" | ")}`);
					}
				}
			}
		}

		const renderCases = [];
		for (const device of Object.keys(devicePresets)) {
			for (const layout of configApi.LAYOUTS) {
				for (let count = 1; count <= 10; count += 1) renderCases.push({ device, layout, count });
			}
		}
		for (const layout of configApi.LAYOUTS) {
			for (const theme of configApi.THEMES) renderCases.push({ device: "desktop", layout, count: 5, theme });
			for (const animation of configApi.ANIMATIONS) renderCases.push({ device: "desktop", layout, count: 2, animation });
			for (const indicator of configApi.INDICATOR_STYLES) renderCases.push({ device: "compact", layout, count: 3, indicator });
			for (const imagePosition of ["left", "right", "top", "bottom"]) renderCases.push({ device: "desktop", layout, count: 4, imagePosition });
			for (const columns of [1, 2, 5, 10]) renderCases.push({ device: "landscape", layout, count: 10, columns });
			for (const textEffect of configApi.TEXT_EFFECTS) renderCases.push({ device: "compact", layout, count: 3, textEffect });
			for (const field of Object.keys(fieldLabels)) renderCases.push({ device: "desktop", layout, count: 2, field });
		}
		for (const field of Object.keys(fieldLabels).filter((key) => key !== "image")) {
			for (const fieldEffect of configApi.TEXT_EFFECTS) renderCases.push({ device: "compact", layout: "list", count: 3, field, fieldEffect });
			for (const textTransform of ["none", "uppercase", "lowercase", "capitalize"]) renderCases.push({ device: "desktop", layout: "grid", count: 4, field, textTransform });
			for (const textAlign of ["inherit", "left", "center", "right"]) renderCases.push({ device: "compact", layout: "compact", count: 3, field, textAlign });
		}
		for (const boundary of ["minimum", "maximum"]) renderCases.push({ device: boundary === "minimum" ? "compact" : "desktop", layout: "grid", count: 10, boundary });
		for (const layout of ["hero", "carousel", "filmstrip"]) {
			for (const direction of configApi.SCROLL_DIRECTIONS) renderCases.push({ device: "compact", layout, count: layout === "hero" ? 1 : 4, mode: "scroll", direction });
		}

		for (const testCase of renderCases) {
			const candidate = clone(configApi.DEFAULTS);
			candidate.layout = testCase.layout;
			candidate.productCount = testCase.count;
			candidate.data.poolSize = 10;
			candidate.layoutSettings.moduleWidth = "100%";
			candidate.layoutSettings.moduleMaxWidth = 900;
			if (testCase.theme) candidate.theme = testCase.theme;
			if (testCase.animation) candidate.animation.name = testCase.animation;
			if (testCase.indicator) candidate.cycle.indicatorStyle = testCase.indicator;
			if (testCase.imagePosition) candidate.layoutSettings.imagePosition = testCase.imagePosition;
			if (testCase.columns) candidate.layoutSettings.columns = testCase.columns;
			if (testCase.textEffect) candidate.typography.textEffect = testCase.textEffect;
			if (testCase.field) {
				Object.keys(candidate.fields).forEach((key) => { candidate.fields[key].show = key === testCase.field; });
				if (testCase.fieldEffect) candidate.fields[testCase.field].effect = testCase.fieldEffect;
				if (testCase.textTransform) candidate.fields[testCase.field].textTransform = testCase.textTransform;
				if (testCase.textAlign) candidate.fields[testCase.field].textAlign = testCase.textAlign;
			}
			if (testCase.boundary === "minimum") {
				Object.assign(candidate.layoutSettings, { gap: 0, cardMinWidth: 80, padding: 0, cardPadding: 0, borderRadius: 0, cardBorderRadius: 0 });
				Object.assign(candidate.typography, { baseFontSize: 8 });
				Object.assign(candidate.fields.image, { width: 32, height: 32, minWidth: 24, maxWidth: 24, opacity: 0, borderRadius: 0 });
			}
			if (testCase.boundary === "maximum") {
				Object.assign(candidate.layoutSettings, { gap: 80, cardMinWidth: 600, padding: 80, cardPadding: 60, borderRadius: 40, cardBorderRadius: 40 });
				Object.assign(candidate.typography, { baseFontSize: 72 });
				Object.assign(candidate.fields.image, { width: 720, height: 720, minWidth: 720, maxWidth: 1440, opacity: 1, borderRadius: 80 });
			}
			if (testCase.mode) candidate.cycle.mode = testCase.mode;
			if (testCase.direction) candidate.cycle.scrollDirection = testCase.direction;
			const result = configApi.normalize(candidate);
			instance.config = result.config;
			instance.sets = sampleSets;
			instance.currentIndex = 0;
			document.getElementById("device-preset").value = testCase.device;
			applyDevice();
			elements.region.replaceChildren(instance.getDom());
			const problems = inspectAuditRender(Math.min(testCase.count, sampleSets.length));
			renderedCases += 1;
			if (problems.length) failures.push(`render ${JSON.stringify(testCase)}: ${problems.join(", ")}`);
			if (renderedCases % 40 === 0) {
				report.textContent = `Rendered ${renderedCases}/${renderCases.length} states; ${failures.length} failures so far`;
				await new Promise((resolve) => requestAnimationFrame(resolve));
			}
		}

		for (let count = 1; count <= 10; count += 1) {
			instance.config = configApi.normalize({ productCount: count, data: { poolSize: 20 }, cycle: { step: "page", loop: true } }).config;
			instance.sets = sampleSets;
			instance.currentIndex = 0;
			const current = instance.getDisplaySets().map((set) => instance.setIdentity(set));
			instance.currentIndex = instance.nextCycleIndex();
			const next = instance.getDisplaySets().map((set) => instance.setIdentity(set));
			if (current.some((identity) => next.includes(identity))) failures.push(`page advancement overlaps at productCount ${count}`);
		}
		instance.config = configApi.normalize({ productCount: 4, data: { poolSize: 10 }, cycle: { step: "page", loop: true } }).config;
		instance.sets = [sampleSets[0], sampleSets[0], ...sampleSets.slice(1)];
		for (let index = 0; index < instance.sets.length; index += 1) {
			const visible = instance.getDisplaySetsAt(index).map((set) => instance.setIdentity(set));
			if (new Set(visible).size !== visible.length) failures.push(`defensive display dedupe failed at index ${index}`);
		}

		} catch (error) {
			failures.push(`audit exception: ${error.stack || error.message}`);
		} finally {
			sets = original.sets;
			cyclePlaying = original.cyclePlaying;
			auditRunning = false;
			document.getElementById("device-preset").value = original.device;
			document.getElementById("region-preset").value = original.region;
			applyConfig(original.config, { preserveIndex: false });
			button.disabled = false;
		}
		const result = {
			normalizedCases,
			renderedCases,
			failures,
			passed: failures.length === 0,
			completedAt: new Date().toISOString(),
		};
		window.lastCompatibilityAudit = result;
		report.textContent = result.passed
			? `PASS - ${normalizedCases.toLocaleString()} pairwise normalization states and ${renderedCases.toLocaleString()} rendered states passed.`
			: `FAIL - ${failures.length} issues across ${normalizedCases.toLocaleString()} normalized and ${renderedCases.toLocaleString()} rendered states. First: ${failures.slice(0, 3).join(" | ")}`;
		return result;
	}

	function updateDiagnostics() {
		const root = elements.region.querySelector(".mmm-new-lego-sets");
		const images = root ? Array.from(root.querySelectorAll("img")).filter((image) => !image.closest(".nl-wall-layer")) : [];
		const brokenImages = images.filter((image) => image.complete && image.naturalWidth === 0).length;
		const itemScope = root && root.querySelector(".nl-scroll-slide-current") || root;
		const itemCount = itemScope ? Array.from(itemScope.querySelectorAll(".nl-card, .nl-table-row")).filter((item) => !item.closest(".nl-wall-layer")).length : 0;
		const visibleNumbers = itemScope ? Array.from(itemScope.querySelectorAll("[data-set-number]")).filter((item) => !item.closest(".nl-wall-layer")).map((item) => item.dataset.setNumber) : [];
		const duplicateVisible = visibleNumbers.filter((number, index) => visibleNumbers.indexOf(number) !== index);
		const loadedNumbers = sets.map((set) => String(set.setNumber || "").replace(/-1$/, "")).filter(Boolean);
		const duplicateLoaded = loadedNumbers.filter((number, index) => loadedNumbers.indexOf(number) !== index);
		const wallAnimating = Boolean(root && root.querySelector(":scope > .nl-wall-layer"));
		const rootOverflow = root ? (!wallAnimating && root.scrollWidth > root.clientWidth + 1) : true;
		const clippedLayout = root ? Array.from(root.querySelectorAll(".nl-carousel-rail, .nl-items-filmstrip")).filter((container) => !container.closest(".nl-wall-layer"))
			.some((container) => container.scrollWidth > container.clientWidth + 1 || container.scrollHeight > container.clientHeight + 1) : true;
		const regionRect = elements.region.getBoundingClientRect();
		const canvasRect = elements.canvas.getBoundingClientRect();
		const outOfCanvas = regionRect.left < canvasRect.left - 1 || regionRect.right > canvasRect.right + 1 || regionRect.top < canvasRect.top - 1 || regionRect.bottom > canvasRect.bottom + 1;
		const expected = Math.min(config.productCount, sets.length);
		const problems = [];
		if (!root) problems.push("Module DOM missing");
		if (rootOverflow) problems.push("Internal horizontal overflow");
		if (clippedLayout) problems.push("Carousel or filmstrip content is clipped");
		if (outOfCanvas) problems.push("Region extends outside canvas");
		if (brokenImages) problems.push(`${brokenImages} broken image${brokenImages === 1 ? "" : "s"}`);
		if (itemCount !== expected) problems.push(`Expected ${expected} visible products; found ${itemCount}`);
		if (duplicateVisible.length) problems.push(`Duplicate visible sets: ${[...new Set(duplicateVisible)].join(", ")}`);
		if (duplicateLoaded.length) problems.push(`Duplicate loaded sets: ${[...new Set(duplicateLoaded)].join(", ")}`);
		elements.diagnosticSummary.className = `diagnostic-summary${problems.length ? " has-error" : ""}`;
		elements.diagnosticSummary.textContent = problems.length ? problems.join(" | ") : "PASS - current mirror view has no detected layout or image failures";
		const pollText = nextPollAt ? `${Math.max(Math.ceil((nextPollAt - Date.now()) / 1000), 0)} seconds` : "Paused for sample data";
		const rows = [
			["Canvas", `${canvasDimensions.width} x ${canvasDimensions.height} at ${Math.round(mirrorScale * 100)}%`],
			["Region", `${document.getElementById("region-preset").value} (${Math.round(regionRect.width / mirrorScale)} px)`],
			["Layout / theme", `${config.layout} / ${config.theme}`],
			["Products", `${itemCount} visible / ${sets.length} loaded`],
			["Duplicates", `${duplicateVisible.length} visible / ${duplicateLoaded.length} loaded`],
			["Current index", `${instance.currentIndex + 1} of ${sets.length}`],
			["Cycle", config.cycle.mode === "scroll"
				? `${cyclePlaying ? "Playing" : "Paused"}, ${config.cycle.scrollSpeed}px/s ${config.cycle.scrollDirection}`
				: `${cyclePlaying ? "Playing" : "Paused"}, every ${config.cycle.interval / 1000}s`],
			["Next poll", pollText],
			["Data", `${dataDetails.source || "Unknown"} - ${dataDetails.parserVersions?.join(", ") || "no parser label"}`],
			["Fetched", dataDetails.fetchedAt ? new Date(dataDetails.fetchedAt).toLocaleString() : "Never"],
			["Images", `${images.length} rendered / ${brokenImages} broken`],
			["Root overflow", rootOverflow ? "FAIL" : "Pass"],
			["Layout clipping", clippedLayout ? "FAIL" : "Pass"],
			["Canvas bounds", outOfCanvas ? "FAIL" : "Pass"],
		];
		elements.diagnosticList.replaceChildren(...rows.flatMap(([term, detail]) => {
			const dt = document.createElement("dt");
			const dd = document.createElement("dd");
			dt.textContent = term;
			dd.textContent = detail;
			return [dt, dd];
		}));
		elements.warningList.replaceChildren(...warnings.map((warning) => {
			const item = document.createElement("li");
			item.textContent = warning;
			return item;
		}));
	}

	function updateClock() {
		const now = new Date();
		document.getElementById("mirror-time").textContent = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(now);
		document.getElementById("mirror-date").textContent = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(now);
	}

	function bindSelect(id, callback) {
		document.getElementById(id).addEventListener("change", (event) => callback(event.target.value));
	}

	function bindRange(id, outputId, formatter, callback) {
		const input = document.getElementById(id);
		const output = document.getElementById(outputId);
		input.addEventListener("input", () => {
			output.value = formatter(Number(input.value));
			callback(Number(input.value));
		});
	}

	function bindControls() {
		optionList(document.getElementById("layout-control"), configApi.LAYOUTS);
		optionList(document.getElementById("theme-control"), configApi.THEMES);
		optionList(document.getElementById("animation-control"), configApi.ANIMATIONS);
		optionList(document.getElementById("text-effect-control"), configApi.TEXT_EFFECTS);
		buildFieldControls();

		document.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", () => {
			document.querySelectorAll(".tab").forEach((candidate) => candidate.classList.toggle("is-active", candidate === tab));
			document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.toggle("is-active", panel.id === `tab-${tab.dataset.tab}`));
			if (tab.dataset.tab === "diagnostics") updateDiagnostics();
		}));

		bindSelect("layout-control", (value) => mutateConfig((next) => { next.layout = value; }));
		bindSelect("theme-control", (value) => mutateConfig((next) => { next.theme = value; }));
		bindSelect("animation-control", (value) => mutateConfig((next) => { next.animation.name = value; }));
		bindSelect("indicator-control", (value) => mutateConfig((next) => { next.cycle.indicatorStyle = value; }));
		bindSelect("cycle-mode-control", (value) => mutateConfig((next) => { next.cycle.mode = value; }));
		bindSelect("scroll-direction-control", (value) => mutateConfig((next) => { next.cycle.scrollDirection = value; }));
		bindSelect("cycle-step-control", (value) => mutateConfig((next) => { next.cycle.step = value === "page" ? "page" : Number(value); }));
		bindSelect("sort-control", (value) => { mutateConfig((next) => { next.data.sortBy = value; }); scheduleDataReload(); });
		bindSelect("unknown-date-control", (value) => { mutateConfig((next) => { next.data.unknownDatePolicy = value; }); scheduleDataReload(); });
		bindSelect("poll-control", (value) => mutateConfig((next) => { next.data.pollInterval = Number(value); }));
		bindSelect("text-effect-control", (value) => mutateConfig((next) => { next.typography.textEffect = value; }));
		bindSelect("image-fit-control", (value) => mutateConfig((next) => { next.fields.image.fit = value; }));
		bindSelect("data-mode", () => loadData(false));
		bindSelect("device-preset", applyDevice);
		bindSelect("region-preset", applyRegion);

		bindRange("count-control", "count-output", String, (value) => mutateConfig((next) => { next.productCount = value; }));
		bindRange("columns-control", "columns-output", String, (value) => mutateConfig((next) => { next.layoutSettings.columns = value; }));
		bindRange("cycle-control", "cycle-output", (value) => `${value}s`, (value) => mutateConfig((next) => { next.cycle.interval = value * 1000; }));
		bindRange("scroll-speed-control", "scroll-speed-output", (value) => `${value}px/s`, (value) => mutateConfig((next) => { next.cycle.scrollSpeed = value; }));
		bindRange("duration-control", "duration-output", (value) => `${value}ms`, (value) => mutateConfig((next) => { next.animation.duration = value; }));
		bindRange("width-control", "width-output", (value) => `${value}px`, (value) => mutateConfig((next) => { next.layoutSettings.moduleMaxWidth = value; }));
		bindRange("font-size-control", "font-size-output", (value) => `${value}px`, (value) => mutateConfig((next) => { next.typography.baseFontSize = value; }));
		bindRange("image-opacity-control", "image-opacity-output", (value) => `${Math.round(value * 100)}%`, (value) => mutateConfig((next) => { next.fields.image.opacity = value; }));
		bindRange("recent-days-control", "recent-days-output", (value) => `${value} days`, (value) => { mutateConfig((next) => { next.data.recentDays = value; }); scheduleDataReload(); });

		document.getElementById("brick-colors-control").addEventListener("change", (event) => mutateConfig((next) => {
			next.animation.brickColors = event.target.value.split(",").map((color) => color.trim()).filter(Boolean);
		}));

		const toggleBindings = {
			"decorations-control": (next, checked) => { next.showThemeDecorations = checked; },
			"header-control": (next, checked) => { next.layoutSettings.showHeader = checked; },
			"footer-control": (next, checked) => { next.layoutSettings.showFooter = checked; },
			"indicators-control": (next, checked) => { next.cycle.showIndicators = checked; },
			"reduced-motion-control": (next, checked) => { next.animation.respectReducedMotion = checked; },
			"loop-control": (next, checked) => { next.cycle.loop = checked; },
			"recent-only-control": (next, checked) => { next.data.recentOnly = checked; },
			"coming-soon-control": (next, checked) => { next.data.includeComingSoon = checked; },
			"preorders-control": (next, checked) => { next.data.includePreorders = checked; },
			"newsroom-control": (next, checked) => { next.data.newsroomAnnouncements = checked; },
		};
		Object.keys(toggleBindings).forEach((id) => document.getElementById(id).addEventListener("change", (event) => {
			mutateConfig((next) => toggleBindings[id](next, event.target.checked));
			if (["recent-only-control", "coming-soon-control", "preorders-control", "newsroom-control"].includes(id)) scheduleDataReload();
		}));

		document.getElementById("custom-width").addEventListener("input", applyDevice);
		document.getElementById("custom-height").addEventListener("input", applyDevice);
		document.getElementById("refresh-data").addEventListener("click", () => loadData(true));
		document.getElementById("toggle-cycle").addEventListener("click", toggleCycle);
		document.getElementById("next-slide").addEventListener("click", nextSlide);
		document.getElementById("run-compatibility").addEventListener("click", runCompatibilityAudit);

		document.getElementById("apply-json").addEventListener("click", () => {
			try {
				applyConfig(JSON.parse(elements.configEditor.value));
				elements.jsonError.textContent = "";
			} catch (error) {
				elements.jsonError.textContent = error.message;
			}
		});
		document.getElementById("format-json").addEventListener("click", () => {
			try {
				elements.configEditor.value = JSON.stringify(JSON.parse(elements.configEditor.value), null, 2);
				elements.jsonError.textContent = "";
			} catch (error) {
				elements.jsonError.textContent = error.message;
			}
		});
		document.getElementById("reset-config").addEventListener("click", () => applyConfig(initialConfig));
		document.getElementById("download-config").addEventListener("click", () => {
			const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
			const link = document.createElement("a");
			link.href = URL.createObjectURL(blob);
			link.download = "MMM-NewLegoSets-test-config.json";
			link.click();
			setTimeout(() => URL.revokeObjectURL(link.href), 1000);
		});

		new ResizeObserver(fitCanvas).observe(elements.stage);
		window.addEventListener("resize", fitCanvas);
	}

	function initialize() {
		bindControls();
		applyDevice();
		syncControls();
		syncEditor();
		updateClock();
		setInterval(updateClock, 30 * 1000);
		setInterval(updateDiagnostics, 1000);
		renderModule();
		restartCycle();
		loadData(false);
		window.MMMNewLegoTestMirror = { get config() { return config; }, get sets() { return sets; }, instance, applyConfig, loadData, nextSlide, updateDiagnostics };
	}

	initialize();
}());
