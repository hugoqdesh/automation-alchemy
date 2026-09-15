const http = require("node:http");
const os = require("node:os");
const { statfsSync } = require("node:fs");

const port = Number(process.env.PORT || 3000);

const server = http.createServer((request, response) => {
	response.setHeader("Cache-Control", "no-store");
	if (request.url === "/metrics") {
		try {
			const disk = statfsSync("/");
			response.writeHead(200, { "Content-Type": "application/json" });
			response.end(
				JSON.stringify({
					node: process.env.NODE_NAME || os.hostname(),
					version: process.env.APP_VERSION || "development",
					cpuCount: os.cpus().length,
					loadAverage: os.loadavg(),
					memoryTotalBytes: os.totalmem(),
					memoryFreeBytes: os.freemem(),
					uptimeSeconds: os.uptime(),
					diskTotalBytes: disk.blocks * disk.bsize,
					diskAvailableBytes: disk.bavail * disk.bsize,
				}),
			);
		} catch {
			response.writeHead(503, { "Content-Type": "application/json" });
			response.end(JSON.stringify({ error: "Metrics unavailable" }));
		}
		return;
	}
	if (request.url === "/version") {
		response.writeHead(200, { "Content-Type": "application/json" });
		response.end(
			JSON.stringify({ version: process.env.APP_VERSION || "development" }),
		);
		return;
	}
	if (request.url === "/health") {
		response.writeHead(200, { "Content-Type": "application/json" });
		response.end(JSON.stringify({ status: "ok" }));
		return;
	}

	response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
	response.end("Automation Alchemy diagnostic app\n");
});

server.listen(port, "0.0.0.0", () => {
	console.log(`Diagnostic app listening on port ${port}`);
});
