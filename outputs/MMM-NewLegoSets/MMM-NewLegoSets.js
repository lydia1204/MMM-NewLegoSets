Module.register("MMM-NewLegoSets", {
	requiresVersion: "2.1.0",
	defaults: {},

	getScripts: function () {
		return ["config.js", "themes.js"];
	},

	getStyles: function () {
		return ["MMM-NewLegoSets.css"];
	},

	start: function () {
		const normalized = MMMNewLegoConfig.normalize(this.config);
		this.config = normalized.config;
		this.configWarnings = normalized.warnings;
		this.sets = [];
		this.currentIndex = 0;
		this.loaded = false;
		this.error = null;
		this.stale = false;
		this.lastUpdated = null;
		this.source = null;
		this.sourceUrl = null;
		this.total = null;
		this.fetching = false;
		this.suspended = false;
		this.transitioning = false;
		this.pendingEnterAnimation = null;
		this.pollTimer = null;
		this.cycleTimer = null;
		this.retryTimer = null;
		this.transitionTimer = null;
		this.domId = `mmm-new-lego-${String(this.identifier).replace(/[^a-zA-Z0-9_-]/g, "-")}`;

		if (this.config.debug && this.configWarnings.length) {
			Log.warn(`${this.name}: ${this.configWarnings.join(" | ")}`);
		}

		this.injectCustomFont();
		this.fetchSets();
	},

	suspend: function () {
		this.suspended = true;
		this.clearTimers();
	},

	resume: function () {
		this.suspended = false;
		this.schedulePoll();
		this.scheduleCycle();
	},

	clearTimers: function () {
		clearTimeout(this.pollTimer);
		clearTimeout(this.cycleTimer);
		clearTimeout(this.retryTimer);
		clearTimeout(this.transitionTimer);
		this.pollTimer = null;
		this.cycleTimer = null;
		this.retryTimer = null;
		this.transitionTimer = null;
	},

	fetchSets: function () {
		if (this.fetching || this.suspended) return;
		this.fetching = true;
		this.sendSocketNotification("MMM_NEW_LEGO_SETS_FETCH", {
			identifier: this.identifier,
			config: this.config,
		});
	},

	schedulePoll: function () {
		clearTimeout(this.pollTimer);
		if (this.suspended) return;
		this.pollTimer = setTimeout(() => this.fetchSets(), this.config.data.pollInterval);
	},

	scheduleRetry: function () {
		clearTimeout(this.retryTimer);
		if (this.suspended) return;
		this.retryTimer = setTimeout(() => this.fetchSets(), this.config.data.retryInterval);
	},

	scheduleCycle: function () {
		clearTimeout(this.cycleTimer);
		if (this.suspended || !this.config.cycle.enabled || this.sets.length <= this.config.productCount) return;
		this.cycleTimer = setTimeout(() => this.advanceCycle(), this.config.cycle.interval);
	},

	socketNotificationReceived: function (notification, payload) {
		if (!payload || payload.identifier !== this.identifier) return;
		if (notification === "MMM_NEW_LEGO_SETS_DATA") {
			this.fetching = false;
			this.loaded = true;
			this.error = payload.fetchError || null;
			this.stale = Boolean(payload.stale);
			this.sets = Array.isArray(payload.sets) ? payload.sets : [];
			if (this.config.cycle.shuffle) this.sets = this.shuffleSets(this.sets);
			this.currentIndex = Math.min(this.currentIndex, Math.max(this.sets.length - 1, 0));
			this.lastUpdated = payload.fetchedAt || new Date(Date.now()).toISOString();
			this.source = payload.source || "LEGO.com";
			this.sourceUrl = payload.sourceUrl || null;
			this.total = payload.total;
			this.configWarnings = [...new Set([...(this.configWarnings || []), ...(payload.configWarnings || []), ...(payload.warnings || [])])];
			this.updateDom(0);
			this.schedulePoll();
			this.scheduleCycle();
			return;
		}

		if (notification === "MMM_NEW_LEGO_SETS_ERROR") {
			this.fetching = false;
			this.loaded = true;
			this.error = payload.message || "Unable to fetch LEGO sets.";
			this.configWarnings = [...new Set([...(this.configWarnings || []), ...(payload.configWarnings || [])])];
			this.updateDom(0);
			this.scheduleRetry();
		}
	},

	getDom: function () {
		const wrapper = document.createElement("section");
		const layout = this.resolveLayout();
		const theme = MMMNewLegoThemes.resolve(this.config.theme, this.config.customTheme);
		wrapper.id = this.domId;
		wrapper.className = `mmm-new-lego-sets nl-theme-${this.config.theme} nl-decoration-${this.config.showThemeDecorations ? theme.decoration : "none"} nl-layout-${layout}`;
		this.applyRootStyles(wrapper, theme);

		if (this.pendingEnterAnimation) {
			wrapper.classList.add(`nl-cycle-in-${this.animationClass(this.pendingEnterAnimation)}`);
			wrapper.style.setProperty("--nl-animation-duration", `${this.config.animation.duration}ms`);
			wrapper.style.setProperty("--nl-animation-easing", this.config.animation.easing);
			if (["legoBuild", "legoBreakBuild"].includes(this.pendingEnterAnimation)) {
				wrapper.appendChild(this.buildBrickLayer("in"));
			}
			setTimeout(() => { this.pendingEnterAnimation = null; }, this.config.animation.duration + 80);
		}

		if (this.config.cycle.pauseOnHover) {
			wrapper.addEventListener("mouseenter", () => clearTimeout(this.cycleTimer));
			wrapper.addEventListener("mouseleave", () => this.scheduleCycle());
		}

		if (this.config.layoutSettings.showHeader) wrapper.appendChild(this.buildHeader());
		if (!this.loaded && !this.sets.length) {
			wrapper.appendChild(this.buildMessage("Loading new LEGO sets...", "loading"));
			return wrapper;
		}
		if (this.error && !this.sets.length) {
			wrapper.appendChild(this.buildMessage(this.error, "error"));
			return wrapper;
		}
		if (!this.sets.length) {
			wrapper.appendChild(this.buildMessage("No matching LEGO sets found.", "empty"));
			return wrapper;
		}

		wrapper.appendChild(this.buildLayout(this.getDisplaySets(), layout));
		if (this.config.cycle.showIndicators && this.config.cycle.indicatorStyle !== "none") {
			wrapper.appendChild(this.buildIndicators());
		}
		if (this.config.layoutSettings.showFooter) wrapper.appendChild(this.buildFooter());
		return wrapper;
	},

	applyRootStyles: function (wrapper, theme) {
		const variables = MMMNewLegoThemes.cssVariables(theme);
		Object.keys(variables).forEach((key) => wrapper.style.setProperty(key, variables[key]));
		const settings = this.config.layoutSettings;
		wrapper.style.setProperty("--nl-gap", `${settings.gap}px`);
		wrapper.style.setProperty("--nl-columns", String(settings.columns));
		wrapper.style.setProperty("--nl-card-min-width", `${settings.cardMinWidth}px`);
		wrapper.style.setProperty("--nl-padding", `${settings.padding}px`);
		wrapper.style.setProperty("--nl-card-padding", `${settings.cardPadding}px`);
		wrapper.style.setProperty("--nl-radius", `${settings.borderRadius}px`);
		wrapper.style.setProperty("--nl-card-radius", `${settings.cardBorderRadius}px`);
		wrapper.style.setProperty("--nl-base-font-size", `${this.config.typography.baseFontSize}px`);
		wrapper.style.setProperty("--nl-font-family", this.activeFontFamily());
		wrapper.style.setProperty("--nl-text-align", this.config.typography.textAlign);
		const image = this.config.fields.image;
		wrapper.style.setProperty("--nl-image-width", `${image.width}px`);
		wrapper.style.setProperty("--nl-image-height", `${image.height}px`);
		wrapper.style.setProperty("--nl-image-min-width", `${image.minWidth}px`);
		wrapper.style.setProperty("--nl-image-max-width", `${image.maxWidth}px`);
		wrapper.style.setProperty("--nl-image-aspect", image.aspectRatio);
		wrapper.style.setProperty("--nl-image-opacity", String(image.opacity));
		wrapper.style.setProperty("--nl-image-background", image.background);
		wrapper.style.setProperty("--nl-image-radius", `${image.borderRadius}px`);
		wrapper.style.setProperty("--nl-image-fit", image.fit);
		wrapper.style.setProperty("--nl-image-position", image.position);
		wrapper.style.setProperty("--nl-image-filter", image.filter);
		wrapper.style.width = this.cssLength(settings.moduleWidth);
		wrapper.style.maxWidth = `${settings.moduleMaxWidth}px`;
		wrapper.style.height = this.cssLength(settings.moduleHeight);
		if (!this.config.typography.antialias) wrapper.classList.add("nl-no-antialias");
		if (settings.imagePosition) wrapper.classList.add(`nl-image-${settings.imagePosition}`);
		wrapper.classList.add(`nl-align-${settings.alignItems}`);
		if (settings.showSeparators) wrapper.classList.add("nl-with-separators");
	},

	resolveLayout: function () {
		if (this.config.layout !== "auto") return this.config.layout;
		if (this.config.productCount === 1) return "hero";
		if (this.config.productCount <= 3) return "list";
		return "grid";
	},

	getDisplaySets: function () {
		const count = Math.min(this.config.productCount, this.sets.length);
		const visible = [];
		for (let offset = 0; offset < count; offset += 1) {
			const index = this.currentIndex + offset;
			if (!this.config.cycle.loop && index >= this.sets.length) break;
			visible.push(this.sets[index % this.sets.length]);
		}
		return visible;
	},

	buildLayout: function (sets, layout) {
		if (layout === "table") return this.buildTable(sets);
		if (layout === "carousel") return this.buildCarousel(sets);
		const container = document.createElement("div");
		container.className = `nl-items nl-items-${layout}`;
		sets.forEach((set, index) => container.appendChild(this.buildCard(set, index, layout)));
		return container;
	},

	buildCarousel: function (sets) {
		const container = document.createElement("div");
		container.className = "nl-carousel";
		container.appendChild(this.buildCard(sets[0], 0, "carousel-main"));
		if (sets.length > 1) {
			const rail = document.createElement("div");
			rail.className = "nl-carousel-rail";
			sets.slice(1).forEach((set, index) => rail.appendChild(this.buildCard(set, index + 1, "carousel-thumb")));
			container.appendChild(rail);
		}
		return container;
	},

	buildTable: function (sets) {
		const table = document.createElement("div");
		table.className = "nl-table";
		sets.forEach((set, index) => {
			const row = document.createElement("div");
			row.className = "nl-table-row";
			if (this.config.fields.image.show) row.appendChild(this.buildImage(set, index, "table"));
			["name", "price", "pieceCount", "setNumber", "releaseDate", "announcedDate", "availability", "ageRange", "pricePerPiece"]
				.filter((key) => this.config.fields[key].show)
				.forEach((key) => {
					const field = this.buildField(key, set);
					if (field) row.appendChild(field);
				});
			table.appendChild(row);
		});
		return table;
	},

	buildCard: function (set, index, variant) {
		const card = document.createElement("article");
		card.className = `nl-card nl-card-${variant}`;
		card.style.setProperty("--nl-card-index", String(index));
		if (this.config.fields.image.show) card.appendChild(this.buildImage(set, index, variant));
		const details = document.createElement("div");
		details.className = "nl-details";
		Object.keys(this.config.fields)
			.filter((key) => key !== "image" && this.config.fields[key].show)
			.sort((a, b) => this.config.fields[a].order - this.config.fields[b].order)
			.forEach((key) => {
				const field = this.buildField(key, set);
				if (field) details.appendChild(field);
			});
		card.appendChild(details);
		return card;
	},

	buildImage: function (set, index, variant) {
		const config = this.config.fields.image;
		const wrap = document.createElement("div");
		wrap.className = `nl-image-wrap nl-image-wrap-${variant}`;
		wrap.style.setProperty("--nl-image-width", `${config.width}px`);
		wrap.style.setProperty("--nl-image-height", `${config.height}px`);
		wrap.style.setProperty("--nl-image-min-width", `${config.minWidth}px`);
		wrap.style.setProperty("--nl-image-max-width", `${config.maxWidth}px`);
		wrap.style.setProperty("--nl-image-aspect", config.aspectRatio);
		wrap.style.setProperty("--nl-image-opacity", String(config.opacity));
		wrap.style.setProperty("--nl-image-background", config.background);
		wrap.style.setProperty("--nl-image-radius", `${config.borderRadius}px`);
		wrap.style.setProperty("--nl-image-fit", config.fit);
		wrap.style.setProperty("--nl-image-position", config.position);
		wrap.style.setProperty("--nl-image-filter", config.filter);
		wrap.style.setProperty("--nl-card-index", String(index));
		if (set.image) {
			const image = document.createElement("img");
			image.className = "nl-image";
			image.src = set.image;
			image.alt = set.name ? `${set.name} LEGO set` : "LEGO set";
			image.loading = index > 1 ? "lazy" : "eager";
			wrap.appendChild(image);
		} else if (config.showPlaceholder) {
			const placeholder = document.createElement("div");
			placeholder.className = "nl-image-placeholder";
			placeholder.textContent = "LEGO";
			wrap.appendChild(placeholder);
		}
		return wrap;
	},

	buildField: function (key, set) {
		const config = this.config.fields[key];
		const rawValue = this.fieldValue(key, set);
		const value = rawValue === null || rawValue === undefined || rawValue === "" ? config.missingText : rawValue;
		if (value === null || value === undefined || value === "") return null;
		const field = document.createElement(key === "name" ? "h3" : "div");
		field.className = `nl-field nl-field-${key} nl-text-effect-${config.effect || this.config.typography.textEffect}`;
		this.applyFieldStyles(field, config);

		if (config.label) {
			const label = document.createElement("span");
			label.className = "nl-field-label";
			label.textContent = config.label;
			field.appendChild(label);
		}
		const valueNode = key === "name" && set.url ? document.createElement("a") : document.createElement("span");
		valueNode.className = "nl-field-value";
		valueNode.textContent = `${config.prefix || ""}${value}${config.suffix || ""}`;
		if (key === "name" && set.url) {
			valueNode.href = set.url;
			valueNode.target = "_blank";
			valueNode.rel = "noopener noreferrer";
		}
		field.appendChild(valueNode);
		return field;
	},

	applyFieldStyles: function (field, config) {
		field.style.fontFamily = config.fontFamily;
		field.style.fontSize = config.fontSize;
		field.style.fontWeight = config.fontWeight;
		field.style.fontStyle = config.fontStyle;
		field.style.letterSpacing = config.letterSpacing;
		field.style.lineHeight = config.lineHeight;
		field.style.textTransform = config.textTransform;
		field.style.textAlign = config.textAlign;
		field.style.opacity = config.opacity;
		field.style.setProperty("--nl-line-clamp", String(config.lineClamp));
		if (config.color) field.style.color = config.color;
	},

	fieldValue: function (key, set) {
		if (key === "name") return set.name;
		if (key === "price") return set.price;
		if (key === "pieceCount") return Number.isFinite(set.pieceCount) ? this.formatNumber(set.pieceCount) : null;
		if (key === "setNumber") return set.setNumber ? `#${set.setNumber}` : null;
		if (key === "releaseDate") return this.formatDate(set.releaseDate);
		if (key === "announcedDate") return this.formatDate(set.announcedDate);
		if (key === "availability") return set.availability;
		if (key === "ageRange") return set.ageRange;
		if (key === "pricePerPiece") return this.formatPricePerPiece(set);
		return null;
	},

	buildHeader: function () {
		const header = document.createElement("header");
		header.className = "nl-header";
		const copy = document.createElement("div");
		copy.className = "nl-header-copy";
		if (this.config.title) {
			const title = document.createElement("h2");
			title.className = `nl-title nl-text-effect-${this.config.typography.textEffect}`;
			title.textContent = this.config.title;
			copy.appendChild(title);
		}
		if (this.config.subtitle) {
			const subtitle = document.createElement("div");
			subtitle.className = "nl-subtitle";
			subtitle.textContent = this.config.subtitle;
			copy.appendChild(subtitle);
		}
		header.appendChild(copy);
		if (this.stale) {
			const badge = document.createElement("span");
			badge.className = "nl-stale-badge";
			badge.textContent = "Cached";
			header.appendChild(badge);
		}
		return header;
	},

	buildMessage: function (message, state) {
		const element = document.createElement("div");
		element.className = `nl-message nl-message-${state}`;
		element.textContent = message;
		return element;
	},

	buildIndicators: function () {
		const step = this.config.cycle.step;
		const maxStart = Math.max(this.sets.length - this.config.productCount, 0);
		const pages = this.config.cycle.loop
			? Math.max(Math.ceil(this.sets.length / step), 1)
			: Math.max(Math.floor(maxStart / step) + 1, 1);
		const currentPage = Math.min(Math.floor(this.currentIndex / step), pages - 1);
		const indicators = document.createElement("div");
		indicators.className = `nl-indicators nl-indicators-${this.config.cycle.indicatorStyle}`;
		for (let index = 0; index < pages; index += 1) {
			const indicator = document.createElement("span");
			indicator.className = `nl-indicator${index === currentPage ? " is-active" : ""}`;
			if (this.config.cycle.indicatorStyle === "numbers") indicator.textContent = String(index + 1);
			indicators.appendChild(indicator);
		}
		return indicators;
	},

	buildFooter: function () {
		const footer = document.createElement("footer");
		footer.className = "nl-footer";
		const parts = [];
		if (this.config.layoutSettings.showCounter) {
			const count = Math.min(this.config.productCount, this.sets.length);
			const end = this.currentIndex + count;
			parts.push(end <= this.sets.length
				? `${this.currentIndex + 1}-${end} of ${this.sets.length}`
				: `${count} shown - starting ${this.currentIndex + 1} of ${this.sets.length}`);
		}
		if (this.config.layoutSettings.showUpdatedTime && this.lastUpdated) parts.push(`Updated ${this.formatTime(this.lastUpdated)}`);
		if (this.config.layoutSettings.showSource && this.source) parts.push(this.source);
		if (this.error) parts.push(`Cached after error: ${this.error}`);
		footer.textContent = parts.join(" - ");
		return footer;
	},

	advanceCycle: function () {
		if (this.transitioning || this.suspended || this.sets.length <= this.config.productCount) return;
		this.transitioning = true;
		const animation = this.effectiveAnimation();
		const duration = animation === "none" ? 0 : this.config.animation.duration;
		const root = document.getElementById(this.domId);
		if (root && animation !== "none") {
			root.classList.add(`nl-cycle-out-${this.animationClass(animation)}`);
			root.style.setProperty("--nl-animation-duration", `${duration}ms`);
			root.style.setProperty("--nl-animation-easing", this.config.animation.easing);
			if (["legoBuild", "legoBreakBuild"].includes(animation)) root.appendChild(this.buildBrickLayer("out"));
		}
		const outgoingFraction = ["legoBuild", "legoBreakBuild"].includes(animation) ? 1 : 0.72;
		clearTimeout(this.transitionTimer);
		this.transitionTimer = setTimeout(() => {
			const next = this.currentIndex + this.config.cycle.step;
			if (next >= this.sets.length) {
				this.currentIndex = this.config.cycle.loop ? next % this.sets.length : Math.max(this.sets.length - this.config.productCount, 0);
			} else {
				this.currentIndex = next;
			}
			this.pendingEnterAnimation = animation;
			this.transitioning = false;
			this.transitionTimer = null;
			this.updateDom(0);
			this.scheduleCycle();
		}, Math.max(duration * outgoingFraction, 0));
	},

	effectiveAnimation: function () {
		if (this.config.animation.respectReducedMotion && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "none";
		if (this.config.animation.name !== "random") return this.config.animation.name;
		const pool = this.config.animation.randomPool;
		return pool[Math.floor(Math.random() * pool.length)] || "fade";
	},

	animationClass: function (name) {
		return String(name).replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
	},

	buildBrickLayer: function (direction) {
		const layer = document.createElement("div");
		layer.className = `nl-brick-layer nl-brick-layer-${direction}`;
		layer.setAttribute("aria-hidden", "true");
		const colors = ["var(--nl-accent)", "var(--nl-accent-2)", "#0057b8", "#ffffff"];
		for (let index = 0; index < this.config.animation.particleCount; index += 1) {
			const brick = document.createElement("i");
			brick.className = "nl-animation-brick";
			const x = (index * 37 + 11) % 100;
			const y = (index * 61 + 7) % 100;
			const tx = ((index * 43) % 240) - 120;
			const ty = 80 + ((index * 29) % 180);
			brick.style.setProperty("--brick-x", `${x}%`);
			brick.style.setProperty("--brick-y", `${y}%`);
			brick.style.setProperty("--brick-tx", `${tx}px`);
			brick.style.setProperty("--brick-ty", `${ty}px`);
			brick.style.setProperty("--brick-rotate", `${((index * 47) % 260) - 130}deg`);
			brick.style.setProperty("--brick-delay", `${(index % 12) * this.config.animation.stagger}ms`);
			brick.style.setProperty("--brick-size", `${this.config.animation.brickSize + (index % 3) * 2}px`);
			brick.style.setProperty("--brick-color", colors[index % colors.length]);
			layer.appendChild(brick);
		}
		return layer;
	},

	shuffleSets: function (sets) {
		const shuffled = sets.slice();
		for (let index = shuffled.length - 1; index > 0; index -= 1) {
			const target = Math.floor(Math.random() * (index + 1));
			[shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
		}
		return shuffled;
	},

	injectCustomFont: function () {
		const typography = this.config.typography;
		if (!typography.customFontName || !typography.customFontUrl || typeof document === "undefined") return;
		const id = `${this.domId}-font`;
		if (document.getElementById(id)) return;
		const style = document.createElement("style");
		style.id = id;
		style.textContent = `@font-face { font-family: "${String(typography.customFontName).replace(/["\\]/g, "")}"; src: url("${String(typography.customFontUrl).replace(/["\\]/g, "")}") format("woff2"); font-display: swap; }`;
		document.head.appendChild(style);
	},

	activeFontFamily: function () {
		return this.config.typography.customFontName ? `"${this.config.typography.customFontName}", ${this.config.typography.fontFamily}` : this.config.typography.fontFamily;
	},

	cssLength: function (value) {
		if (value === null || value === undefined || value === "auto") return "auto";
		return typeof value === "number" ? `${value}px` : String(value);
	},

	formatNumber: function (value) {
		try {
			return new Intl.NumberFormat(this.config.data.locale).format(value);
		} catch (error) {
			return String(value);
		}
	},

	formatDate: function (value) {
		if (!value) return null;
		try {
			return new Intl.DateTimeFormat(this.config.data.locale, this.config.dateFormat).format(new Date(value));
		} catch (error) {
			return String(value);
		}
	},

	formatTime: function (value) {
		try {
			return new Intl.DateTimeFormat(this.config.data.locale, { hour: "numeric", minute: "2-digit" }).format(new Date(value));
		} catch (error) {
			return String(value);
		}
	},

	formatPricePerPiece: function (set) {
		if (!set.priceCents || !set.pieceCount || !set.currencyCode) return null;
		const amount = set.priceCents / 100 / set.pieceCount;
		try {
			return `${new Intl.NumberFormat(this.config.data.locale, {
				style: "currency",
				currency: set.currencyCode,
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			}).format(amount)}/piece`;
		} catch (error) {
			return `${amount.toFixed(2)}/piece`;
		}
	},
});
