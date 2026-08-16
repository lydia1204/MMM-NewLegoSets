"use strict";

const https = require("https");

const DEFAULTS = {
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
	requestTimeout: 20000,
	userAgent: "MMM-NewLegoSets/2.1 MagicMirror",
	bricksetApiKey: "",
	metadataOverrides: {},
	sortBy: "recent",
	sortDirection: "desc",
};

const ALLOWED_REMOTE_HOSTS = ["lego.com", "brickset.com"];
const MAX_RESPONSE_BYTES = 12 * 1024 * 1024;

function clampInteger(value, fallback, min, max) {
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) ? Math.min(Math.max(parsed, min), max) : fallback;
}

function normalizeLocale(locale) {
	const normalized = String(locale || DEFAULTS.locale).trim().toLowerCase();
	return /^[a-z]{2,3}(?:-[a-z]{2})?$/.test(normalized) ? normalized : DEFAULTS.locale;
}

function countryFromLocale(locale, fallback) {
	const parts = normalizeLocale(locale).split("-");
	const candidate = String(fallback || parts[1] || DEFAULTS.countryCode).trim().toUpperCase();
	return /^[A-Z]{2}$/.test(candidate) ? candidate : DEFAULTS.countryCode;
}

function languageTagFromLocale(locale) {
	return normalizeLocale(locale).replace(/-([a-z]{2})$/, (_, country) => `-${country.toUpperCase()}`);
}

function dataConfig(config) {
	return { ...DEFAULTS, ...((config && config.data) || config || {}) };
}

function withPageParameter(url, page) {
	if (url.includes("{page}")) return url.replace(/\{page\}/g, String(page));
	if (page <= 1) return url;
	return `${url}${url.includes("?") ? "&" : "?"}page=${page}`;
}

function buildPageUrls(config = {}) {
	const merged = dataConfig(config);
	const locale = normalizeLocale(merged.locale);
	const pageCount = clampInteger(merged.pageCount, DEFAULTS.pageCount, 1, 8);
	const template = String(merged.sourceUrl || DEFAULTS.sourceUrl).replace(/\{locale\}/g, locale);
	return Array.from({ length: pageCount }, (_, index) => withPageParameter(template, index + 1));
}

function isAllowedRemoteUrl(url) {
	try {
		const parsed = new URL(url);
		const hostname = parsed.hostname.toLowerCase();
		return parsed.protocol === "https:"
			&& !parsed.username
			&& !parsed.password
			&& (!parsed.port || parsed.port === "443")
			&& ALLOWED_REMOTE_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));
	} catch (error) {
		return false;
	}
}

function requestText(url, options = {}, redirectCount = 0) {
	return new Promise((resolve, reject) => {
		if (!isAllowedRemoteUrl(url)) {
			reject(new Error("Refused a non-LEGO/Brickset or non-HTTPS data source"));
			return;
		}
		const parsed = new URL(url);
		const request = https.request(parsed, {
			method: options.method || "GET",
			timeout: clampInteger(options.timeout, DEFAULTS.requestTimeout, 1000, 120000),
			headers: options.headers || {},
		}, (response) => {
			const statusCode = response.statusCode || 0;
			const location = response.headers.location;
			if ([301, 302, 303, 307, 308].includes(statusCode) && location) {
				response.resume();
				if (redirectCount >= 5) {
					reject(new Error(`Too many redirects while fetching ${parsed.hostname}`));
					return;
				}
				resolve(requestText(new URL(location, parsed).toString(), options, redirectCount + 1));
				return;
			}

			response.setEncoding("utf8");
			let body = "";
			let bytes = 0;
			response.on("data", (chunk) => {
				bytes += Buffer.byteLength(chunk);
				if (bytes > MAX_RESPONSE_BYTES) {
					response.destroy(new Error(`Response from ${parsed.hostname} exceeded the size limit`));
					return;
				}
				body += chunk;
			});
			response.on("error", reject);
			response.on("end", () => {
				if (statusCode < 200 || statusCode >= 300) {
					reject(new Error(`${parsed.hostname} returned HTTP ${statusCode}`));
					return;
				}
				resolve(body);
			});
		});

		request.on("timeout", () => request.destroy(new Error(`Timed out fetching ${parsed.hostname}`)));
		request.on("error", reject);
		if (options.body) request.write(options.body);
		request.end();
	});
}

function legoHeaders(config) {
	const locale = normalizeLocale(config.locale);
	const countryCode = countryFromLocale(locale, config.countryCode);
	const language = languageTagFromLocale(locale);
	return {
		"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
		"Accept-Language": `${language},en;q=0.8`,
		"Cookie": `country=${countryCode}; original_country=${countryCode}; locale=${language}`,
		"User-Agent": String(config.userAgent || DEFAULTS.userAgent).replace(/[\r\n]+/g, " ").slice(0, 200),
	};
}

function decodeJsonScript(value) {
	return value
		.replace(/&quot;/g, "\"")
		.replace(/&#x27;/g, "'")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">");
}

function extractNextData(html) {
	const match = String(html).match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
	if (!match) throw new Error("Could not find LEGO __NEXT_DATA__ payload");
	try {
		return JSON.parse(match[1]);
	} catch (error) {
		return JSON.parse(decodeJsonScript(match[1]));
	}
}

function resolveRef(state, ref) {
	return ref && typeof ref === "object" && ref.id ? state[ref.id] || null : null;
}

function findField(object, prefix, parameterizedFirst = false) {
	if (!object || typeof object !== "object") return undefined;
	const parameterizedKey = Object.keys(object).find((candidate) => candidate.startsWith(`${prefix}(`));
	if (parameterizedFirst && parameterizedKey) return object[parameterizedKey];
	if (object[prefix] !== undefined) return object[prefix];
	return parameterizedKey ? object[parameterizedKey] : undefined;
}

function absoluteLegoUrl(pathOrUrl) {
	if (!pathOrUrl) return null;
	try {
		return new URL(pathOrUrl, "https://www.lego.com").toString();
	} catch (error) {
		return null;
	}
}

function isoDate(value) {
	if (!value) return null;
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function dateFromAvailability(text) {
	const value = String(text || "");
	const match = value.match(/(?:available|releases?|launches?)\s+(?:on|from)\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})/i);
	return match ? isoDate(match[1]) : null;
}

function normalizeProduct(state, productRef, sourcePageUrl, sourceIndex) {
	const product = resolveRef(state, productRef);
	if (!product || product.__typename !== "SingleVariantProduct") return null;
	const variant = resolveRef(state, product.variant);
	const attributes = resolveRef(state, variant && variant.attributes) || {};
	const price = resolveRef(state, variant && variant.price) || resolveRef(state, variant && variant.listPrice) || {};
	const assets = findField(product, "listingAssets");
	const listingAsset = Array.isArray(assets) ? resolveRef(state, assets[0]) : null;
	const image = findField(product, "primaryImage", true) || (listingAsset && listingAsset.url) || product.primaryImage;
	const availabilityDate = dateFromAvailability(attributes.availabilityText);

	return {
		setNumber: product.productCode || product.id,
		sku: variant ? variant.sku : null,
		name: product.name || "Untitled LEGO set",
		url: absoluteLegoUrl(product.overrideUrl || product.pdpPath),
		image: image || null,
		price: price.formattedAmount || null,
		priceCents: Number.isFinite(price.centAmount) ? price.centAmount : null,
		currencyCode: price.currencyCode || null,
		pieceCount: Number.isFinite(attributes.pieceCount) ? attributes.pieceCount : null,
		ageRange: attributes.ageRange || null,
		availability: attributes.availabilityText || null,
		availabilityStatus: attributes.availabilityStatus || null,
		isNew: Boolean(attributes.isNew),
		releaseDate: availabilityDate,
		announcedDate: null,
		discoveredDate: null,
		dateSource: availabilityDate ? "LEGO availability" : null,
		sourcePageUrl,
		sourceIndex,
	};
}

function legacyProductRefs(state) {
	const sections = Object.values(state).filter((entry) => entry && entry.__typename === "BasicProductSection");
	const section = sections.find((entry) => entry.filterName === "flags" && entry.filterValue === "new") || sections[0];
	const query = resolveRef(state, findField(section, "products")) || Object.values(state)
		.filter((entry) => entry && entry.__typename === "ProductQueryResult" && Array.isArray(entry.results))
		.sort((a, b) => b.results.length - a.results.length)[0];
	return query ? { refs: query.results || [], total: query.total, parserVersion: "apollo-query-v1" } : null;
}

function currentProductRefs(state) {
	const listing = Object.values(state).find((entry) => entry && entry.__typename === "ProductListingPage" && Array.isArray(entry.tiles));
	if (!listing) return null;
	const refs = listing.tiles.map((tileRef) => {
		const tile = resolveRef(state, tileRef);
		return tile && tile.__typename === "ProductTile" ? tile.product : null;
	}).filter(Boolean);
	const pagination = resolveRef(state, listing.pagination) || {};
	return {
		refs,
		total: Number.isFinite(pagination.totalProducts) ? pagination.totalProducts : refs.length,
		parserVersion: "product-listing-page-v2",
	};
}

function fallbackProductRefs(state) {
	const refs = Object.keys(state)
		.filter((key) => state[key] && state[key].__typename === "SingleVariantProduct")
		.map((key) => ({ id: key }));
	return refs.length ? { refs, total: refs.length, parserVersion: "entity-fallback" } : null;
}

function parseLegoPage(html, sourcePageUrl = "https://www.lego.com") {
	const nextData = extractNextData(html);
	const state = nextData && nextData.props && nextData.props.pageProps && nextData.props.pageProps.__APOLLO_STATE__;
	if (!state || typeof state !== "object") throw new Error("Could not find LEGO Apollo product cache");
	const listing = currentProductRefs(state) || legacyProductRefs(state) || fallbackProductRefs(state);
	if (!listing || !listing.refs.length) throw new Error("Could not find LEGO product listing data");
	const sets = listing.refs.map((ref, index) => normalizeProduct(state, ref, sourcePageUrl, index)).filter(Boolean);
	return {
		sets,
		total: Number.isFinite(listing.total) ? listing.total : sets.length,
		count: sets.length,
		parserVersion: listing.parserVersion,
		sourceTitle: "LEGO.com New Sets and Products",
	};
}

function shouldIncludeSet(set, config) {
	const status = String(set.availabilityStatus || "").toUpperCase();
	if (!config.includeComingSoon && status.includes("COMING_SOON")) return false;
	if (!config.includePreorders && status.includes("PRE_ORDER")) return false;
	return true;
}

function bricksetRegion(countryCode) {
	const code = String(countryCode || "US").toUpperCase();
	if (code === "GB") return "UK";
	return ["US", "CA", "DE"].includes(code) ? code : "US";
}

async function fetchBricksetMetadata(sets, config) {
	if (!config.bricksetApiKey || !sets.length) return { records: new Map(), warning: null };
	const params = JSON.stringify({
		setNumber: sets.map((set) => `${set.setNumber}-1`).join(","),
		pageSize: Math.min(sets.length, 50),
	});
	const endpoint = new URL("https://brickset.com/api/v3.asmx/getSets");
	endpoint.searchParams.set("apiKey", config.bricksetApiKey);
	endpoint.searchParams.set("userHash", "");
	endpoint.searchParams.set("params", params);
	try {
		const body = await requestText(endpoint.toString(), {
			timeout: config.requestTimeout,
			headers: { "Accept": "application/json", "User-Agent": config.userAgent },
		});
		const payload = JSON.parse(body);
		if (payload.status !== "success") throw new Error(payload.message || "Brickset request failed");
		const records = new Map();
		(payload.sets || []).forEach((record) => records.set(String(record.number), record));
		return { records, warning: null };
	} catch (error) {
		return { records: new Map(), warning: `Brickset enrichment failed: ${error.message}` };
	}
}

function applyBricksetMetadata(set, record, config) {
	if (!record) return set;
	const region = bricksetRegion(config.countryCode);
	const regionData = record.LEGOCom && record.LEGOCom[region];
	const releaseDate = isoDate((regionData && regionData.dateFirstAvailable) || record.launchDate) || set.releaseDate;
	return {
		...set,
		releaseDate,
		dateSource: releaseDate ? `Brickset ${region}` : set.dateSource,
		bricksetUrl: record.bricksetURL || null,
	};
}

function newsroomSitemapUrl(config) {
	return `https://www.lego.com/${normalizeLocale(config.locale)}/aboutus/sitemap.xml`;
}

function parseNewsroomEntries(xml) {
	return Array.from(String(xml).matchAll(/<url>\s*<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/gi))
		.map((match) => ({ url: decodeJsonScript(match[1]), modifiedDate: isoDate(match[2]) }))
		.filter((entry) => entry.url.includes("/aboutus/news/") && entry.modifiedDate);
}

function publishedDateFromArticle(html) {
	const match = String(html).match(/property=["']article:published_time["']\s+content=["']([^"']+)["']/i)
		|| String(html).match(/["']datePublished["']\s*:\s*["']([^"']+)["']/i);
	return match ? isoDate(match[1]) : null;
}

async function mapWithConcurrency(items, limit, mapper) {
	const results = new Array(items.length);
	let cursor = 0;
	const worker = async () => {
		while (cursor < items.length) {
			const index = cursor;
			cursor += 1;
			results[index] = await mapper(items[index], index);
		}
	};
	await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
	return results;
}

async function fetchNewsroomAnnouncements(sets, config) {
	if (!config.newsroomAnnouncements || !sets.length) return { records: new Map(), warning: null };
	try {
		const sitemap = await requestText(newsroomSitemapUrl(config), {
			timeout: config.requestTimeout,
			headers: legoHeaders(config),
		});
		const cutoff = Date.now() - (clampInteger(config.recentDays, DEFAULTS.recentDays, 1, 365) + 7) * 24 * 60 * 60 * 1000;
		const entries = parseNewsroomEntries(sitemap)
			.filter((entry) => new Date(entry.modifiedDate).getTime() >= cutoff)
			.slice(0, clampInteger(config.newsroomPageLimit, DEFAULTS.newsroomPageLimit, 1, 100));
		const pages = await mapWithConcurrency(entries, 5, async (entry) => {
			try {
				const html = await requestText(entry.url, { timeout: config.requestTimeout, headers: legoHeaders(config) });
				return { ...entry, html, publishedDate: publishedDateFromArticle(html) };
			} catch (error) {
				return null;
			}
		});
		const records = new Map();
		for (const set of sets) {
			const number = String(set.setNumber || "").replace(/-1$/, "");
			if (!number) continue;
			const match = pages.filter(Boolean).find((page) => page.publishedDate && new RegExp(`(?:^|\\D)${number}(?:\\D|$)`).test(page.html));
			if (match) records.set(number, { announcedDate: match.publishedDate, announcementUrl: match.url });
		}
		return { records, warning: null };
	} catch (error) {
		return { records: new Map(), warning: `LEGO Newsroom enrichment failed: ${error.message}` };
	}
}

function applyNewsroomMetadata(set, record) {
	if (!record || !record.announcedDate) return set;
	return {
		...set,
		announcedDate: record.announcedDate,
		announcementUrl: record.announcementUrl,
		announcementSource: "LEGO Newsroom",
		dateSource: set.releaseDate ? set.dateSource : "LEGO Newsroom",
	};
}

function applyOverrides(set, overrides) {
	const override = overrides && (overrides[set.setNumber] || overrides[`${set.setNumber}-1`]);
	if (!override || typeof override !== "object") return set;
	const allowed = ["name", "url", "image", "price", "priceCents", "currencyCode", "pieceCount", "ageRange", "availability", "releaseDate", "announcedDate"];
	const next = { ...set };
	allowed.forEach((key) => {
		if (override[key] !== undefined) next[key] = ["releaseDate", "announcedDate"].includes(key) ? isoDate(override[key]) : override[key];
	});
	if (override.releaseDate || override.announcedDate) next.dateSource = "config override";
	return next;
}

function setIdentity(set) {
	if (set && set.setNumber) return `set:${String(set.setNumber).replace(/-1$/, "")}`;
	if (set && set.sku) return `sku:${set.sku}`;
	if (set && set.url) return `url:${String(set.url).split(/[?#]/)[0].toLowerCase()}`;
	return `name:${String(set && set.name || "unknown").trim().toLowerCase()}`;
}

function deduplicateSets(sets) {
	const seen = new Set();
	return sets.filter((set) => {
		const key = setIdentity(set);
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

function dateValue(value) {
	const timestamp = value ? new Date(value).getTime() : NaN;
	return Number.isFinite(timestamp) ? timestamp : null;
}

function filterRecentSets(sets, config, now = Date.now()) {
	if (!config.recentOnly) return sets.slice();
	const cutoff = now - clampInteger(config.recentDays, DEFAULTS.recentDays, 1, 365) * 24 * 60 * 60 * 1000;
	return sets.filter((set) => {
		const announced = dateValue(set.announcedDate);
		if (announced !== null) return announced >= cutoff && announced <= now;
		const released = dateValue(set.releaseDate);
		if (released !== null && released <= now) return released >= cutoff;
		const firstSeen = config.unknownDatePolicy === "firstSeen" ? dateValue(set.discoveredDate) : null;
		if (firstSeen !== null) return firstSeen >= cutoff && firstSeen <= now;
		return config.unknownDatePolicy === "include";
	});
}

function compareRecent(a, b, now = Date.now()) {
	const groups = ["announcedDate", "releaseDate", "discoveredDate"];
	const hasSortableDate = (set, key) => {
		const value = dateValue(set[key]);
		return value !== null && (key !== "releaseDate" || value <= now);
	};
	const leftGroup = groups.findIndex((key) => hasSortableDate(a, key));
	const rightGroup = groups.findIndex((key) => hasSortableDate(b, key));
	const normalizedLeftGroup = leftGroup < 0 ? groups.length : leftGroup;
	const normalizedRightGroup = rightGroup < 0 ? groups.length : rightGroup;
	if (normalizedLeftGroup !== normalizedRightGroup) return normalizedLeftGroup - normalizedRightGroup;
	const key = groups[normalizedLeftGroup];
	if (key) {
		const difference = dateValue(b[key]) - dateValue(a[key]);
		if (difference) return difference;
	}
	return a.sourceIndex - b.sourceIndex;
}

function finalizeRecentSets(sets, config = {}, now = Date.now()) {
	const merged = dataConfig(config);
	const unique = deduplicateSets(sets);
	const filtered = filterRecentSets(unique, merged, now);
	if (merged.sortBy === "recent") {
		const direction = merged.sortDirection === "asc" ? -1 : 1;
		return filtered.slice().sort((a, b) => compareRecent(a, b, now) * direction);
	}
	return sortSets(filtered, merged);
}

function compareSets(a, b, key) {
	if (key === "source") return a.sourceIndex - b.sourceIndex;
	if (key === "recent") return compareRecent(a, b);
	const left = key === "price" ? a.priceCents : a[key];
	const right = key === "price" ? b.priceCents : b[key];
	if (left === null || left === undefined || left === "") return 1;
	if (right === null || right === undefined || right === "") return -1;
	if (["releaseDate", "announcedDate"].includes(key)) return new Date(left).getTime() - new Date(right).getTime();
	if (typeof left === "number" && typeof right === "number") return left - right;
	return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" });
}

function sortSets(sets, config) {
	if (config.sortBy === "source") return sets;
	if (config.sortBy === "recent") {
		const direction = config.sortDirection === "asc" ? -1 : 1;
		return sets.slice().sort((a, b) => compareRecent(a, b) * direction);
	}
	const direction = config.sortDirection === "asc" ? 1 : -1;
	return sets.slice().sort((a, b) => compareSets(a, b, config.sortBy) * direction);
}

async function fetchRecentSets(config = {}, runtime = {}) {
	const merged = dataConfig(config);
	const poolSize = clampInteger(merged.poolSize || merged.maxItems, DEFAULTS.poolSize, 1, 50);
	const scanLimit = merged.recentOnly ? 50 : poolSize;
	const urls = buildPageUrls(merged);
	const seen = new Set();
	const warnings = [];
	const parserVersions = new Set();
	let total = null;
	let sets = [];

	for (const url of urls) {
		try {
			const html = await requestText(url, { timeout: merged.requestTimeout, headers: legoHeaders(merged) });
			const page = parseLegoPage(html, url);
			parserVersions.add(page.parserVersion);
			total = total === null ? page.total : Math.max(total, page.total);
			for (const set of page.sets.filter((candidate) => shouldIncludeSet(candidate, merged))) {
				const key = set.setNumber || set.url || set.name;
				if (!seen.has(key)) {
					seen.add(key);
					sets.push({ ...set, sourceIndex: sets.length });
				}
				if (sets.length >= scanLimit) break;
			}
		} catch (error) {
			if (!sets.length) throw error;
			warnings.push(`Partial LEGO result: ${error.message}`);
		}
		if (sets.length >= scanLimit) break;
	}

	const brickset = await fetchBricksetMetadata(sets, merged);
	if (brickset.warning) warnings.push(brickset.warning);
	sets = sets.map((set) => applyBricksetMetadata(set, brickset.records.get(String(set.setNumber)), merged));
	const newsroom = await fetchNewsroomAnnouncements(sets, merged);
	if (newsroom.warning) warnings.push(newsroom.warning);
	sets = sets.map((set) => applyNewsroomMetadata(set, newsroom.records.get(String(set.setNumber).replace(/-1$/, ""))));
	sets = sets.map((set) => applyOverrides(set, merged.metadataOverrides));
	sets = deduplicateSets(sets);
	const fetchedAt = new Date(Date.now()).toISOString();
	if (!runtime.deferFinalize) {
		sets = sets.map((set) => ({ ...set, discoveredDate: set.discoveredDate || fetchedAt }));
		sets = finalizeRecentSets(sets, merged).slice(0, poolSize);
	}
	return {
		sets,
		total: total === null ? sets.length : total,
		source: "LEGO.com",
		sourceUrl: urls[0],
		fetchedAt,
		warnings,
		parserVersions: Array.from(parserVersions),
		enrichedByBrickset: Boolean(merged.bricksetApiKey && brickset.records.size),
	};
}

module.exports = {
	applyOverrides,
	buildPageUrls,
	deduplicateSets,
	fetchRecentSets,
	filterRecentSets,
	finalizeRecentSets,
	isAllowedRemoteUrl,
	parseLegoPage,
	parseNewsroomEntries,
	publishedDateFromArticle,
	setIdentity,
	sortSets,
};
