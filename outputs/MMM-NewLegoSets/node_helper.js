"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const NodeHelper = require("node_helper");
const Config = require("./config");
const { fetchRecentSets } = require("./lego-store");

const MODULE_NAME = "MMM-NewLegoSets";
const NOTIFICATIONS = {
	FETCH: "MMM_NEW_LEGO_SETS_FETCH",
	DATA: "MMM_NEW_LEGO_SETS_DATA",
	ERROR: "MMM_NEW_LEGO_SETS_ERROR",
};

module.exports = NodeHelper.create({
	requiresVersion: "2.1.0",

	start: function () {
		this.fetching = new Set();
		this.cachePath = path.join(this.path, ".cache", "sets-v2.json");
		this.cache = this.readCache();
	},

	stop: function () {
		this.writeCache();
	},

	socketNotificationReceived: function (notification, payload) {
		if (notification !== NOTIFICATIONS.FETCH || !payload || !payload.identifier) return;
		this.fetchSets(payload.identifier, payload.config || {});
	},

	readCache: function () {
		try {
			if (!fs.existsSync(this.cachePath)) return { version: 2, entries: {}, firstSeen: {} };
			const parsed = JSON.parse(fs.readFileSync(this.cachePath, "utf8"));
			return parsed && parsed.version === 2 ? parsed : { version: 2, entries: {}, firstSeen: {} };
		} catch (error) {
			console.warn(`${MODULE_NAME}: ignored unreadable cache: ${error.message}`);
			return { version: 2, entries: {}, firstSeen: {} };
		}
	},

	writeCache: function () {
		try {
			fs.mkdirSync(path.dirname(this.cachePath), { recursive: true });
			fs.writeFileSync(this.cachePath, JSON.stringify(this.cache, null, 2), "utf8");
		} catch (error) {
			console.warn(`${MODULE_NAME}: could not write cache: ${error.message}`);
		}
	},

	cacheKey: function (config) {
		const data = config.data;
		const identity = JSON.stringify({
			locale: data.locale,
			countryCode: data.countryCode,
			sourceUrl: data.sourceUrl,
			includeComingSoon: data.includeComingSoon,
			includePreorders: data.includePreorders,
			sortBy: data.sortBy,
			sortDirection: data.sortDirection,
		});
		return crypto.createHash("sha256").update(identity).digest("hex").slice(0, 20);
	},

	attachDiscoveryDates: function (sets, fetchedAt) {
		return sets.map((set) => {
			const key = String(set.setNumber || set.sku || set.name);
			if (!this.cache.firstSeen[key]) this.cache.firstSeen[key] = fetchedAt;
			return { ...set, discoveredDate: this.cache.firstSeen[key] };
		});
	},

	cacheResult: function (key, result) {
		this.cache.entries[key] = {
			storedAt: new Date(Date.now()).toISOString(),
			result,
		};
		this.writeCache();
	},

	getCachedResult: function (key, maxAge) {
		const entry = this.cache.entries[key];
		if (!entry || !entry.storedAt || !entry.result) return null;
		const age = Date.now() - new Date(entry.storedAt).getTime();
		return Number.isFinite(age) && age <= maxAge ? entry.result : null;
	},

	fetchSets: async function (identifier, rawConfig) {
		if (this.fetching.has(identifier)) return;
		this.fetching.add(identifier);
		const normalized = Config.normalize(rawConfig);
		const config = normalized.config;
		const key = this.cacheKey(config);

		try {
			const result = await fetchRecentSets(config);
			result.sets = this.attachDiscoveryDates(result.sets, result.fetchedAt);
			result.configWarnings = normalized.warnings;
			result.stale = false;
			if (config.data.cacheEnabled) this.cacheResult(key, result);
			this.sendSocketNotification(NOTIFICATIONS.DATA, { identifier, ...result });
		} catch (error) {
			const message = error && error.message ? error.message : "Unable to fetch LEGO sets";
			const cached = config.data.cacheEnabled ? this.getCachedResult(key, config.data.cacheMaxAge) : null;
			if (cached) {
				this.sendSocketNotification(NOTIFICATIONS.DATA, {
					identifier,
					...cached,
					stale: true,
					fetchError: message,
					configWarnings: normalized.warnings,
					warnings: [...(cached.warnings || []), `Using cached data: ${message}`],
				});
			} else {
				console.error(`${MODULE_NAME}: ${message}`);
				this.sendSocketNotification(NOTIFICATIONS.ERROR, {
					identifier,
					message,
					configWarnings: normalized.warnings,
					fetchedAt: new Date(Date.now()).toISOString(),
				});
			}
		} finally {
			this.fetching.delete(identifier);
		}
	},
});
