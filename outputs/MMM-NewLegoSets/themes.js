(function (root, factory) {
	const api = factory();
	if (typeof module === "object" && module.exports) {
		module.exports = api;
	} else {
		root.MMMNewLegoThemes = api;
	}
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
	"use strict";

	const PRESETS = {
		mirror: {
			background: "transparent",
			surface: "rgba(255,255,255,0.06)",
			text: "#ffffff",
			muted: "#b8b8b8",
			accent: "#ffffff",
			accent2: "#d6d6d6",
			border: "rgba(255,255,255,0.18)",
			shadow: "rgba(0,0,0,0.55)",
			gradient: "none",
			decoration: "none",
		},
		lego: {
			background: "rgba(15,15,15,0.92)",
			surface: "rgba(255,255,255,0.08)",
			text: "#ffffff",
			muted: "#d8d8d8",
			accent: "#ffd500",
			accent2: "#e3000b",
			border: "#ffd500",
			shadow: "rgba(0,0,0,0.55)",
			gradient: "linear-gradient(135deg, rgba(227,0,11,0.12), rgba(0,87,184,0.12))",
			decoration: "bricks",
		},
		tuxedo: {
			background: "rgba(5,5,5,0.96)",
			surface: "rgba(255,255,255,0.07)",
			text: "#ffffff",
			muted: "#c8c8c8",
			accent: "#d5b46c",
			accent2: "#ffffff",
			border: "rgba(213,180,108,0.7)",
			shadow: "rgba(0,0,0,0.7)",
			gradient: "linear-gradient(145deg, rgba(255,255,255,0.035), rgba(213,180,108,0.06))",
			decoration: "tuxedo",
		},
		pride: {
			background: "rgba(10,10,12,0.92)",
			surface: "rgba(255,255,255,0.1)",
			text: "#ffffff",
			muted: "#f1f1f1",
			accent: "#ffed00",
			accent2: "#ff5c8a",
			border: "rgba(255,255,255,0.55)",
			shadow: "rgba(0,0,0,0.55)",
			gradient: "linear-gradient(135deg, rgba(228,3,3,0.22), rgba(255,140,0,0.18), rgba(255,237,0,0.16), rgba(0,128,38,0.18), rgba(0,77,255,0.18), rgba(117,7,135,0.22))",
			decoration: "pride",
		},
		progress: {
			background: "rgba(9,9,12,0.94)",
			surface: "rgba(255,255,255,0.09)",
			text: "#ffffff",
			muted: "#efefef",
			accent: "#f5a9b8",
			accent2: "#613915",
			border: "rgba(255,255,255,0.5)",
			shadow: "rgba(0,0,0,0.6)",
			gradient: "linear-gradient(135deg, rgba(97,57,21,0.2), rgba(116,215,238,0.18), rgba(245,169,184,0.18), rgba(228,3,3,0.18), rgba(0,77,255,0.18), rgba(117,7,135,0.2))",
			decoration: "progress",
		},
		trans: {
			background: "rgba(10,17,24,0.94)",
			surface: "rgba(255,255,255,0.11)",
			text: "#ffffff",
			muted: "#f7f7f7",
			accent: "#5bcefa",
			accent2: "#f5a9b8",
			border: "rgba(255,255,255,0.72)",
			shadow: "rgba(0,0,0,0.55)",
			gradient: "linear-gradient(135deg, rgba(91,206,250,0.28), rgba(245,169,184,0.24), rgba(255,255,255,0.12))",
			decoration: "trans",
		},
		bisexual: {
			background: "rgba(13,8,20,0.95)",
			surface: "rgba(255,255,255,0.1)",
			text: "#ffffff",
			muted: "#e8def0",
			accent: "#d60270",
			accent2: "#0038a8",
			border: "#9b4f96",
			shadow: "rgba(0,0,0,0.58)",
			gradient: "linear-gradient(135deg, rgba(214,2,112,0.28), rgba(155,79,150,0.2), rgba(0,56,168,0.3))",
			decoration: "bisexual",
		},
		lesbian: {
			background: "rgba(21,9,11,0.95)",
			surface: "rgba(255,255,255,0.1)",
			text: "#ffffff",
			muted: "#f7e8ec",
			accent: "#ff9a56",
			accent2: "#d52d00",
			border: "#d362a4",
			shadow: "rgba(0,0,0,0.58)",
			gradient: "linear-gradient(135deg, rgba(213,45,0,0.25), rgba(255,154,86,0.2), rgba(255,255,255,0.09), rgba(211,98,164,0.2), rgba(163,2,98,0.25))",
			decoration: "lesbian",
		},
		nonbinary: {
			background: "rgba(12,10,18,0.95)",
			surface: "rgba(255,255,255,0.1)",
			text: "#ffffff",
			muted: "#ece8f3",
			accent: "#fff430",
			accent2: "#9c59d1",
			border: "#ffffff",
			shadow: "rgba(0,0,0,0.58)",
			gradient: "linear-gradient(135deg, rgba(255,244,48,0.2), rgba(255,255,255,0.08), rgba(156,89,209,0.25), rgba(0,0,0,0.2))",
			decoration: "nonbinary",
		},
		pansexual: {
			background: "rgba(10,13,19,0.95)",
			surface: "rgba(255,255,255,0.1)",
			text: "#ffffff",
			muted: "#eef4f7",
			accent: "#ff218c",
			accent2: "#21b1ff",
			border: "#ffd800",
			shadow: "rgba(0,0,0,0.58)",
			gradient: "linear-gradient(135deg, rgba(255,33,140,0.27), rgba(255,216,0,0.18), rgba(33,177,255,0.27))",
			decoration: "pansexual",
		},
	};

	function resolve(name, customTheme) {
		if (name === "custom") {
			return { ...PRESETS.mirror, ...(customTheme || {}) };
		}
		return { ...PRESETS.mirror, ...(PRESETS[name] || PRESETS.mirror) };
	}

	function cssVariables(theme) {
		return {
			"--nl-background": theme.background,
			"--nl-surface": theme.surface,
			"--nl-text": theme.text,
			"--nl-muted": theme.muted,
			"--nl-accent": theme.accent,
			"--nl-accent-2": theme.accent2,
			"--nl-border": theme.border,
			"--nl-shadow": theme.shadow,
			"--nl-gradient": theme.gradient,
		};
	}

	return { PRESETS, cssVariables, resolve };
}));
