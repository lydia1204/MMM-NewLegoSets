(function () {
	"use strict";

	const verifiedImage = "blt621a9fb4f7d5deba/bltc8cac287dd2bee85-11512_Prod_en-gb.png";
	const names = [
		"Hanging Golden Pothos", "Jaguar E-Type", "Koenigsegg Sadair's Spear Megacar",
		"Arcade Pinball Machine", "The Shire", "Italian Riviera", "Emerald City Wall Art",
		"Star Wars Logo", "The Simpsons: Krusty Burger", "Mineral Collection",
	];
	const sets = names.map((name, index) => ({
		setNumber: String(11512 + index),
		name,
		url: "https://www.lego.com/en-us/categories/new-sets-and-products",
		image: `https://www.lego.com/cdn/cs/set/assets/${verifiedImage}?fit=bounds&format=jpg&quality=80&width=320&height=320&dpr=1`,
		price: `$${(59.99 + index * 20).toFixed(2)}`,
		priceCents: 5999 + index * 2000,
		currencyCode: "USD",
		pieceCount: 372 + index * 241,
		ageRange: index % 2 ? "12+" : "18+",
		availability: index % 3 ? "Available now" : "Backorder",
		releaseDate: `2026-08-${String(1 + index).padStart(2, "0")}T12:00:00.000Z`,
		announcedDate: `2026-07-${String(10 + index).padStart(2, "0")}T12:00:00.000Z`,
	}));

	const params = new URLSearchParams(window.location.search);
	const raw = {
		layout: params.get("layout") || "grid",
		productCount: Number(params.get("count") || 6),
		theme: params.get("theme") || "lego",
		animation: { name: params.get("animation") || "none", duration: 650 },
		layoutSettings: {
			columns: Number(params.get("columns") || 2),
			moduleWidth: params.get("width") || "100%",
			moduleMaxWidth: Number(params.get("maxWidth") || 980),
		},
		fields: {
			announcedDate: { show: params.get("announced") !== "false" },
			ageRange: { show: true },
			pricePerPiece: { show: true },
		},
	};
	const normalized = window.MMMNewLegoConfig.normalize(raw);
	const instance = Object.assign(Object.create(window.moduleDefinition), {
		name: "MMM-NewLegoSets",
		identifier: "preview",
		config: normalized.config,
		configWarnings: normalized.warnings,
		sets,
		currentIndex: 0,
		loaded: true,
		error: null,
		stale: false,
		lastUpdated: new Date().toISOString(),
		source: "LEGO.com",
		sourceUrl: "https://www.lego.com/en-us/categories/new-sets-and-products",
		total: 243,
		fetching: false,
		suspended: false,
		transitioning: false,
		pendingEnterAnimation: params.get("enter") || null,
		domId: "mmm-new-lego-preview",
		updateDom: function () { render(); },
		scheduleCycle: function () {},
	});
	window.__cycleEvents = [];

	function render() {
		const mount = document.getElementById("mount");
		mount.replaceChildren(instance.getDom());
		window.__cycleEvents.push(instance.currentIndex);
	}

	render();
	window.__legoPreview = { instance, sets, normalized, render };
	if (params.get("cycle") === "true") setTimeout(() => instance.advanceCycle(), 100);
}());
