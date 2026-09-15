const { once } = require("node:events");
const { spawn } = require("node:child_process");
const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");

const port = 3100;
let app;

before(async () => {
	app = spawn(process.execPath, ["server.js"], {
		env: {
			...process.env,
			PORT: String(port),
			APP_VERSION: "test-release",
			NODE_NAME: "app",
		},
		stdio: "ignore",
	});

	for (let attempt = 0; attempt < 20; attempt += 1) {
		try {
			const response = await fetch(`http://127.0.0.1:${port}/health`);
			if (response.ok) return;
		} catch {}
		await new Promise((resolve) => setTimeout(resolve, 50));
	}

	throw new Error("Diagnostic app did not start");
});

after(async () => {
	app.kill();
	await once(app, "exit");
});

test("health endpoint reports healthy", async () => {
	const response = await fetch(`http://127.0.0.1:${port}/health`);

	assert.equal(response.status, 200);
	assert.deepEqual(await response.json(), { status: "ok" });
});

test("metrics expose numeric host readings and the deployed version", async () => {
	const response = await fetch(`http://127.0.0.1:${port}/metrics`);
	assert.equal(response.status, 200);
	assert.equal(response.headers.get("cache-control"), "no-store");
	const data = await response.json();
	assert.equal(data.node, "app");
	assert.equal(data.version, "test-release");
	for (const field of [
		"cpuCount",
		"memoryTotalBytes",
		"uptimeSeconds",
		"diskTotalBytes",
	]) {
		assert.ok(Number.isFinite(data[field]) && data[field] > 0, field);
	}
	assert.ok(
		data.memoryFreeBytes >= 0 && data.memoryFreeBytes <= data.memoryTotalBytes,
	);
	assert.ok(
		data.diskAvailableBytes >= 0 &&
			data.diskAvailableBytes <= data.diskTotalBytes,
	);
	assert.equal(data.loadAverage.length, 3);
	assert.ok(
		data.loadAverage.every((value) => Number.isFinite(value) && value >= 0),
	);
	const version = await fetch(`http://127.0.0.1:${port}/version`);
	assert.deepEqual(await version.json(), { version: "test-release" });
});
