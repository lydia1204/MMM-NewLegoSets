"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");
const { fetchRecentSets } = require("../MMM-NewLegoSets/lego-store");

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || process.argv[2] || 4174);
const LAB_ROOT = __dirname;
const MODULE_ROOT = path.resolve(__dirname, "../MMM-NewLegoSets");
const CACHE_TTL = 60 * 1000;
const MAX_CACHE_ENTRIES = 50;
const MAX_REQUEST_URL_LENGTH = 4096;
const responseCache = new Map();
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);
const DISPLAY_HOST = HOST.includes(":") ? `[${HOST}]` : HOST;

if (!LOOPBACK_HOSTS.has(HOST) && process.env.ALLOW_REMOTE !== "true") {
	throw new Error("Remote editor binding is disabled. Set ALLOW_REMOTE=true only on a trusted network.");
}

const MIME_TYPES = {
	".css": "text/css; charset=utf-8",
	".html": "text/html; charset=utf-8",
	".js": "application/javascript; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".pdf": "application/pdf",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".woff2": "font/woff2",
};

const SECURITY_HEADERS = {
	"Content-Security-Policy": "default-src 'self'; base-uri 'none'; connect-src 'self'; font-src 'self' https: data:; form-action 'none'; frame-ancestors 'none'; img-src 'self' https: data:; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'",
	"Cross-Origin-Opener-Policy": "same-origin",
	"Permissions-Policy": "camera=(), geolocation=(), microphone=()",
	"Referrer-Policy": "no-referrer",
	"X-Content-Type-Options": "nosniff",
	"X-Frame-Options": "DENY",
};

function send(response, status, body, contentType, extraHeaders = {}) {
	response.writeHead(status, {
		"Cache-Control": "no-store",
		"Content-Type": contentType,
		...SECURITY_HEADERS,
		...extraHeaders,
	});
	response.end(body);
}

function sendJson(response, status, payload) {
	send(response, status, JSON.stringify(payload, null, 2), MIME_TYPES[".json"]);
}

function safeFile(root, requestPath) {
	const target = path.resolve(root, `.${requestPath}`);
	return target === root || target.startsWith(`${root}${path.sep}`) ? target : null;
}

function serveFile(response, root, requestPath) {
	let target = safeFile(root, requestPath);
	if (!target) {
		send(response, 403, "Forbidden", "text/plain; charset=utf-8");
		return;
	}
	try {
		if (fs.statSync(target).isDirectory()) target = path.join(target, "index.html");
		const realRoot = fs.realpathSync(root);
		const realTarget = fs.realpathSync(target);
		if (realTarget !== realRoot && !realTarget.startsWith(`${realRoot}${path.sep}`)) {
			send(response, 403, "Forbidden", "text/plain; charset=utf-8");
			return;
		}
		const body = fs.readFileSync(realTarget);
		send(response, 200, body, MIME_TYPES[path.extname(realTarget).toLowerCase()] || "application/octet-stream");
	} catch (error) {
		send(response, 404, "Not found", "text/plain; charset=utf-8");
	}
}

function boundedNumber(value, fallback, minimum, maximum) {
	const number = Number(value);
	return Number.isFinite(number) ? Math.min(Math.max(number, minimum), maximum) : fallback;
}

function allowedValue(value, allowed, fallback) {
	return allowed.includes(value) ? value : fallback;
}

function normalizedLocale(value) {
	const locale = String(value || "en-us").trim().toLowerCase();
	return /^[a-z]{2,3}(?:-[a-z]{2})?$/.test(locale) ? locale : "en-us";
}

function normalizedCountry(value) {
	const country = String(value || "US").trim().toUpperCase();
	return /^[A-Z]{2}$/.test(country) ? country : "US";
}

function cacheResponse(key, payload) {
	responseCache.set(key, { savedAt: Date.now(), payload });
	while (responseCache.size > MAX_CACHE_ENTRIES) responseCache.delete(responseCache.keys().next().value);
}

async function serveSets(response, url) {
	const config = {
		locale: normalizedLocale(url.searchParams.get("locale")),
		countryCode: normalizedCountry(url.searchParams.get("countryCode")),
		poolSize: Math.round(boundedNumber(url.searchParams.get("poolSize"), 10, 1, 50)),
		pageCount: Math.round(boundedNumber(url.searchParams.get("pageCount"), 2, 1, 8)),
		includeComingSoon: url.searchParams.get("includeComingSoon") === "true",
		includePreorders: url.searchParams.get("includePreorders") === "true",
		recentOnly: url.searchParams.get("recentOnly") !== "false",
		recentDays: Math.round(boundedNumber(url.searchParams.get("recentDays"), 31, 1, 365)),
		unknownDatePolicy: allowedValue(url.searchParams.get("unknownDatePolicy"), ["firstSeen", "include", "exclude"], "firstSeen"),
		newsroomAnnouncements: url.searchParams.get("newsroomAnnouncements") !== "false",
		newsroomPageLimit: Math.round(boundedNumber(url.searchParams.get("newsroomPageLimit"), 30, 1, 100)),
		sortBy: allowedValue(url.searchParams.get("sortBy"), ["recent", "source", "releaseDate", "announcedDate", "discoveredDate", "price", "pieceCount", "setNumber", "name"], "recent"),
		sortDirection: allowedValue(url.searchParams.get("sortDirection"), ["asc", "desc"], "desc"),
		requestTimeout: 30000,
	};
	const key = JSON.stringify(config);
	const cached = responseCache.get(key);
	const force = url.searchParams.get("force") === "true";
	if (!force && cached && Date.now() - cached.savedAt < CACHE_TTL) {
		sendJson(response, 200, { ...cached.payload, labCache: true });
		return;
	}
	try {
		const result = await fetchRecentSets(config);
		const payload = { ...result, labCache: false };
		cacheResponse(key, payload);
		sendJson(response, 200, payload);
	} catch (error) {
		sendJson(response, 502, { error: error.message, fetchedAt: new Date().toISOString() });
	}
}

const server = http.createServer(async (request, response) => {
	if (!request.url || request.url.length > MAX_REQUEST_URL_LENGTH) {
		send(response, 414, "URI too long", "text/plain; charset=utf-8");
		return;
	}
	let url;
	try {
		url = new URL(request.url, `http://${DISPLAY_HOST}:${PORT}`);
	} catch (error) {
		send(response, 400, "Bad request", "text/plain; charset=utf-8");
		return;
	}
	if (request.method !== "GET") {
		send(response, 405, "Method not allowed", "text/plain; charset=utf-8", { Allow: "GET" });
		return;
	}
	if (url.pathname === "/api/sets") {
		await serveSets(response, url);
		return;
	}
	if (url.pathname === "/api/health") {
		sendJson(response, 200, { ok: true, now: new Date().toISOString() });
		return;
	}
	if (url.pathname.startsWith("/module/")) {
		serveFile(response, MODULE_ROOT, url.pathname.slice("/module".length));
		return;
	}
	serveFile(response, LAB_ROOT, url.pathname === "/" ? "/index.html" : url.pathname);
});

server.headersTimeout = 10000;
server.requestTimeout = 35000;

if (require.main === module) {
	server.listen(PORT, HOST, () => {
		console.log(`MMM-NewLegoSets Test Mirror: http://${DISPLAY_HOST}:${PORT}`);
	});
}

module.exports = { SECURITY_HEADERS, cacheResponse, normalizedCountry, normalizedLocale, responseCache, safeFile, server };
