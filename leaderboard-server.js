const http = require("http");
const fs = require("fs");
const path = require("path");

const port = process.env.PORT || 3000;
const root = __dirname;
const dataFile = path.join(root, "leaderboard-data.json");
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function readScores() {
  try {
    return JSON.parse(fs.readFileSync(dataFile, "utf8"));
  } catch {
    return [];
  }
}

function writeScores(scores) {
  fs.writeFileSync(dataFile, `${JSON.stringify(scores, null, 2)}\n`);
}

function cleanScore(score) {
  return {
    name: String(score.name || "Player").slice(0, 16),
    score: Math.floor(Number(score.score || 0)),
    wave: Math.floor(Number(score.wave || 0)),
    date: String(score.date || new Date().toISOString()),
  };
}

function sendJson(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

const server = http.createServer((request, response) => {
  if (request.url === "/api/leaderboard" && request.method === "GET") {
    sendJson(response, 200, readScores());
    return;
  }

  if (request.url === "/api/leaderboard" && request.method === "POST") {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 10000) request.destroy();
    });
    request.on("end", () => {
      try {
        const score = cleanScore(JSON.parse(body || "{}"));
        const scores = [...readScores(), score].sort((a, b) => b.score - a.score).slice(0, 10);
        writeScores(scores);
        sendJson(response, 200, scores);
      } catch {
        sendJson(response, 400, { error: "Invalid score" });
      }
    });
    return;
  }

  const requestedPath = request.url === "/" ? "/index.html" : request.url.split("?")[0];
  const filePath = path.normalize(path.join(root, requestedPath));
  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    response.writeHead(200, { "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream" });
    response.end(data);
  });
});

server.listen(port, () => {
  console.log(`Wavebound running at http://localhost:${port}`);
});
