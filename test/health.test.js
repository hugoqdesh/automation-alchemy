const { once } = require("node:events");
const { spawn } = require("node:child_process");
const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");

const port = 3100;
let app;

before(async () => {
	app = spawn(process.execPath, ["server.js"], {
		env: { ...process.env, PORT: String(port) },
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
