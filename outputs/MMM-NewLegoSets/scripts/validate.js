"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const configApi = require("../config");
const store = require("../lego-store");
const themes = require("../themes");

const root = path.resolve(__dirname, "..");
const failures = [];

function check(condition, message) {
	if (!condition) failures.push(message);
}

function validateSyntax() {
	["MMM-NewLegoSets.js", "config.js", "lego-store.js", "node_helper.js", "themes.js"].forEach((file) => {
		try {
			new vm.Script(fs.readFileSync(path.join(root, file), "utf8"), { filename: file });
		} catch (error) {
			failures.push(`${file}: ${error.message}`);
		}
	});
}

function validateConfiguration() {
	configApi.LAYOUTS.forEach((layout) => check(configApi.normalize({ layout }).config.layout === layout, `Layout rejected: ${layout}`));
	configApi.THEMES.forEach((theme) => {
		check(configApi.normalize({ theme }).config.theme === theme, `Theme rejected: ${theme}`);
		check(Boolean(themes.resolve(theme)), `Theme missing: ${theme}`);
	});
	configApi.ANIMATIONS.forEach((name) => check(configApi.normalize({ animation: { name } }).config.animation.name === name, `Animation rejected: ${name}`));
	for (let count = 1; count <= 10; count += 1) {
		const normalized = configApi.normalize({ productCount: count, data: { poolSize: 1 } }).config;
		check(normalized.productCount === count, `Product count rejected: ${count}`);
		check(normalized.data.poolSize >= count, `Pool size does not cover product count ${count}`);
	}
	const bounded = configApi.normalize({ productCount: 99, data: { pollInterval: 1 }, cycle: { interval: 1 } }).config;
	check(bounded.productCount === 10, "Product count upper bound failed");
	check(bounded.data.pollInterval === 60000, "Poll interval lower bound failed");
	check(bounded.cycle.interval === 2000, "Cycle interval lower bound failed");
}

async function validateLiveData() {
	const result = await store.fetchRecentSets({ locale: "en-us", countryCode: "US", pageCount: 1, poolSize: 10, requestTimeout: 30000 });
	check(result.sets.length === 10, `Live fetch returned ${result.sets.length} sets instead of 10`);
	result.sets.forEach((set, index) => {
		check(Boolean(set.setNumber), `Live set ${index + 1} has no set number`);
		check(Boolean(set.name), `Live set ${index + 1} has no name`);
		check(Boolean(set.image), `Live set ${index + 1} has no image`);
		check(Boolean(set.price), `Live set ${index + 1} has no price`);
		check(Number.isFinite(set.pieceCount), `Live set ${index + 1} has no piece count`);
	});
	console.log(`Live LEGO.com parser: ${result.sets.length} sets via ${result.parserVersions.join(", ")}`);
}

(async () => {
	validateSyntax();
	validateConfiguration();
	if (process.argv.includes("--live")) await validateLiveData();
	if (failures.length) {
		console.error(failures.map((failure) => `FAIL: ${failure}`).join("\n"));
		process.exit(1);
	}
	console.log(`PASS: ${configApi.LAYOUTS.length} layouts, ${configApi.THEMES.length} themes, ${configApi.ANIMATIONS.length} animations, product counts 1-10`);
})().catch((error) => {
	console.error(`FAIL: ${error.stack || error.message}`);
	process.exit(1);
});
