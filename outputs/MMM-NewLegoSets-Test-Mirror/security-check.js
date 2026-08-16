"use strict";

const assert = require("assert");
const http = require("http");
const path = require("path");
const {
	SECURITY_HEADERS,
	cacheResponse,
	normalizedCountry,
	normalizedLocale,
	responseCache,
	safeFile,
	server,
} = require("./server");

function request(port, pathname, method = "GET") {
	return new Promise((resolve, reject) => {
		const outgoing = http.request({ host: "127.0.0.1", port, path: pathname, method }, (response) => {
			let body = "";
			response.setEncoding("utf8");
			response.on("data", (chunk) => { body += chunk; });
			response.on("end", () => resolve({ status: response.statusCode, headers: response.headers, body }));
		});
		outgoing.on("error", reject);
		outgoing.end();
	});
}

async function main() {
	assert.strictEqual(normalizedLocale("EN-us"), "en-us");
	assert.strictEqual(normalizedLocale("../../etc/passwd"), "en-us");
	assert.strictEqual(normalizedCountry("ca"), "CA");
	assert.strictEqual(normalizedCountry("US\r\nInjected: yes"), "US");
	assert.strictEqual(safeFile(__dirname, "/../server.js"), null);
	assert.strictEqual(safeFile(__dirname, "/app.js"), path.join(__dirname, "app.js"));
	assert.match(SECURITY_HEADERS["Content-Security-Policy"], /frame-ancestors 'none'/);
	assert.strictEqual(SECURITY_HEADERS["X-Content-Type-Options"], "nosniff");

	for (let index = 0; index < 75; index += 1) cacheResponse(`key-${index}`, { index });
	assert.strictEqual(responseCache.size, 50);

	await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
	try {
		const port = server.address().port;
		const health = await request(port, "/api/health");
		assert.strictEqual(health.status, 200);
		assert.strictEqual(health.headers["x-content-type-options"], "nosniff");
		assert.match(health.headers["content-security-policy"], /default-src 'self'/);
		assert.strictEqual(Object.hasOwn(JSON.parse(health.body), "moduleRoot"), false);

		const post = await request(port, "/api/health", "POST");
		assert.strictEqual(post.status, 405);
		assert.strictEqual(post.headers.allow, "GET");

		const missing = await request(port, "/module/%2e%2e/%2e%2e/etc/passwd");
		assert.strictEqual(missing.status, 404);
	} finally {
		await new Promise((resolve) => server.close(resolve));
	}

	console.log("PASS: local editor security checks");
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
