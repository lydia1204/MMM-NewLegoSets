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
const responseCache = new Map();

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

function send(response, status, body, contentType, extraHeaders = {}) {
	response.writeHead(status, {
		"Cache-Control": "no-store",
		"Content-Type": contentType,
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
		const body = fs.readFileSync(target);
		send(response, 200, body, MIME_TYPES[path.extname(target).toLowerCase()] || "application/octet-stream");
	} catch (error) {
		send(response, 404, "Not found", "text/plain; charset=utf-8");
	}
}

function boundedNumber(value, fallback, minimum, maximum) {
	const number = Number(value);
	return Number.isFinite(number) ? Math.min(Math.max(number, minimum), maximum) : fallback;
}

async function serveSets(response, url) {
	const config = {
		locale: String(url.searchParams.get("locale") || "en-us"),
		countryCode: String(url.searchParams.get("countryCode") || "US"),
		poolSize: Math.round(boundedNumber(url.searchParams.get("poolSize"), 10, 1, 50)),
		pageCount: Math.round(boundedNumber(url.searchParams.get("pageCount"), 2, 1, 8)),
		includeComingSoon: url.searchParams.get("includeComingSoon") === "true",
		includePreorders: url.searchParams.get("includePreorders") === "true",
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
		responseCache.set(key, { savedAt: Date.now(), payload });
		sendJson(response, 200, payload);
	} catch (error) {
		sendJson(response, 502, { error: error.message, fetchedAt: new Date().toISOString() });
	}
}

const server = http.createServer(async (request, response) => {
	const url = new URL(request.url, `http://${request.headers.host || `${HOST}:${PORT}`}`);
	if (request.method !== "GET") {
		send(response, 405, "Method not allowed", "text/plain; charset=utf-8", { Allow: "GET" });
		return;
	}
	if (url.pathname === "/api/sets") {
		await serveSets(response, url);
		return;
	}
	if (url.pathname === "/api/health") {
		sendJson(response, 200, { ok: true, moduleRoot: MODULE_ROOT, now: new Date().toISOString() });
		return;
	}
	if (url.pathname.startsWith("/module/")) {
		serveFile(response, MODULE_ROOT, url.pathname.slice("/module".length));
		return;
	}
	serveFile(response, LAB_ROOT, url.pathname === "/" ? "/index.html" : url.pathname);
});

server.listen(PORT, HOST, () => {
	console.log(`MMM-NewLegoSets Test Mirror: http://${HOST}:${PORT}`);
});
