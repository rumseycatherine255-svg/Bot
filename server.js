const express = require("express");
const session = require("express-session");
const path = require("path");
const fs = require("fs");
const { execSync, exec } = require("child_process");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const SESSION_SECRET = process.env.SESSION_SECRET || "comet-dev";

// ───────────────── DATA ─────────────────
const DATA_FILE = path.join(__dirname, "data.json");
function loadData() {
  if (!fs.existsSync(DATA_FILE)) return { users: {} };
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}
function saveData(d) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2));
}

// ───────────────── STATE ─────────────────
const sites = {};
let nextPort = 4000;

// ───────────────── MIDDLEWARE ─────────────────
app.use(express.json());
app.use(express.static("public"));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: "Not logged in" });
  next();
}

// ───────────────── DEPLOY QUEUE ─────────────────
const queue = [];
let deploying = false;

function enqueue(job) {
  queue.push(job);
  processQueue();
}

async function processQueue() {
  if (deploying || !queue.length) return;
  deploying = true;

  const job = queue.shift();
  await deploy(job);

  deploying = false;
  processQueue();
}

// ───────────────── HASH CACHE ─────────────────
function hashRepo(repo, branch) {
  return crypto.createHash("sha1").update(repo + branch).digest("hex");
}

// ───────────────── DEPLOY ENGINE ─────────────────
async function deploy({ slug, repoUrl, branch, port }) {
  const site = sites[slug];

  const log = (msg) => {
    const line = `[${new Date().toISOString()}] ${msg}`;
    site.logs.push(line);
    console.log(`[${slug}] ${msg}`);
  };

  try {
    const cacheKey = hashRepo(repoUrl, branch);
    const cacheDir = path.join(__dirname, ".cache", cacheKey);
    const deployDir = path.join(__dirname, "deployments", slug);

    site.status = "cloning";
    log("Cloning...");

    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
      execSync(`git clone --depth 1 ${repoUrl} "${cacheDir}"`);
      log("Cached repo.");
    } else {
      log("Using cache.");
    }

    if (fs.existsSync(deployDir)) fs.rmSync(deployDir, { recursive: true });
    fs.cpSync(cacheDir, deployDir, { recursive: true });

    site.status = "building";

    if (fs.existsSync(path.join(deployDir, "package.json"))) {
      if (!fs.existsSync(path.join(deployDir, "node_modules"))) {
        log("Installing deps...");
        execSync(`cd "${deployDir}" && npm install`, { stdio: "pipe" });
      } else {
        log("Using cached deps.");
      }

      site.status = "starting";

      const child = exec(`cd "${deployDir}" && npm start`, {
        env: { PORT: port }
      });

      site.process = child;

      child.stdout.on("data", d => log(d.toString()));
      child.stderr.on("data", d => log("[ERR] " + d.toString()));

      child.on("exit", () => {
        site.status = "stopped";
      });

    } else {
      log("Static site");
      startStatic(deployDir, port, slug, log);
    }

    site.status = "running";
    log("Live 🚀");

  } catch (e) {
    site.status = "failed";
    log("ERROR: " + e.message);
  }
}

// ───────────────── STATIC SERVER ─────────────────
function startStatic(dir, port, slug, log) {
  const staticApp = express();
  staticApp.use(express.static(dir));
  const server = staticApp.listen(port);
  sites[slug].server = server;
  log("Static server started");
}

// ───────────────── API ─────────────────
app.get("/api/deployments", requireAuth, (req, res) => {
  res.json(Object.values(sites));
});

app.post("/api/deploy", requireAuth, (req, res) => {
  const { repoUrl, name } = req.body;

  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const port = nextPort++;

  sites[slug] = {
    slug,
    name,
    repoUrl,
    port,
    status: "queued",
    logs: [],
    url: `${BASE_URL}/sites/${slug}`
  };

  enqueue({ slug, repoUrl, branch: "main", port });

  res.json({ slug });
});

app.get("/api/deployments/:slug/logs", (req, res) => {
  const site = sites[req.params.slug];
  res.json({ logs: site.logs, status: site.status });
});

// ───────────────── PROXY ─────────────────
app.use("/sites/:slug", (req, res) => {
  const site = sites[req.params.slug];
  if (!site) return res.send("Not found");

  const http = require("http");

  const proxy = http.request({
    hostname: "localhost",
    port: site.port,
    path: req.url,
    method: req.method
  }, r => r.pipe(res));

  req.pipe(proxy);
});

// ───────────────── START ─────────────────
app.listen(PORT, () => {
  console.log("☄️ Comet running at", BASE_URL);
});
