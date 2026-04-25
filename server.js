const express = require("express");
const session = require("express-session");
const path = require("path");
const fs = require("fs");
const { execSync, exec } = require("child_process");
const http = require("http");
const httpProxy = require("http-proxy");

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_DOMAIN = process.env.BASE_DOMAIN || `localhost:${PORT}`;
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const SESSION_SECRET = process.env.SESSION_SECRET || "comet-secret-change-me";

// ── STORAGE ──────────────────────────────────────────────────────────────────
const DATA_FILE = path.join(__dirname, "data.json");
function loadData() {
  if (!fs.existsSync(DATA_FILE)) return { users: {}, deployments: {} };
  try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); }
  catch { return { users: {}, deployments: {} }; }
}
function saveData(d) { fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }

// ── DEPLOYED SITES TRACKER ────────────────────────────────────────────────────
// { slug: { port, pid, repoUrl, customDomain, status, logs, userId, name, createdAt } }
const sites = {};
let nextPort = 4000;

// ── MIDDLEWARE ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

// ── REVERSE PROXY for deployed sites ─────────────────────────────────────────
const proxy = httpProxy.createProxyServer({});

app.use((req, res, next) => {
  const host = req.hostname;
  // Check if host matches a slug subdomain or custom domain
  for (const [slug, site] of Object.entries(sites)) {
    const subDomain = `${slug}.${BASE_DOMAIN.split(":")[0]}`;
    if (host === subDomain || host === site.customDomain) {
      if (site.status === "running") {
        return proxy.web(req, res, { target: `http://localhost:${site.port}` }, (err) => {
          res.status(502).send("Site is starting up, try again in a moment.");
        });
      } else {
        return res.send(buildingSitePage(slug, site));
      }
    }
  }
  next();
});

function buildingSitePage(slug, site) {
  return `<!DOCTYPE html><html><head><title>Deploying — Comet</title>
  <style>body{font-family:sans-serif;background:#0a0a0f;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:1rem;}
  .spinner{width:40px;height:40px;border:3px solid rgba(255,255,255,0.1);border-top-color:#f97316;border-radius:50%;animation:spin 0.8s linear infinite;}
  @keyframes spin{to{transform:rotate(360deg)}}</style></head>
  <body><div class="spinner"></div><h2>Deploying ${site.name}...</h2><p style="color:#888">Status: ${site.status}</p></body></html>`;
}

// ── STATIC FILES ──────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "public")));

// ── AUTH HELPERS ──────────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: "Not authenticated" });
  next();
}

// ── GITHUB OAUTH ──────────────────────────────────────────────────────────────
app.get("/auth/github", (req, res) => {
  if (!GITHUB_CLIENT_ID) {
    return res.redirect("/?error=no_github_config");
  }
  const url = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=repo,user`;
  res.redirect(url);
});

app.get("/auth/github/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) return res.redirect("/?error=no_code");

  try {
    // Exchange code for access token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, client_secret: GITHUB_CLIENT_SECRET, code })
    });
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) return res.redirect("/?error=token_failed");

    // Get GitHub user info
    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${accessToken}`, "User-Agent": "Comet-App" }
    });
    const ghUser = await userRes.json();

    const data = loadData();
    const userId = `gh_${ghUser.id}`;
    data.users[userId] = {
      id: userId,
      githubId: ghUser.id,
      username: ghUser.login,
      name: ghUser.name || ghUser.login,
      avatar: ghUser.avatar_url,
      email: ghUser.email,
      accessToken,
      createdAt: data.users[userId]?.createdAt || new Date().toISOString()
    };
    saveData(data);

    req.session.user = { id: userId, username: ghUser.login, avatar: ghUser.avatar_url, name: ghUser.name || ghUser.login };
    res.redirect("/dashboard");
  } catch (err) {
    console.error("OAuth error:", err);
    res.redirect("/?error=oauth_failed");
  }
});

app.get("/auth/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

// ── API: session ──────────────────────────────────────────────────────────────
app.get("/api/me", (req, res) => {
  if (!req.session.user) return res.json({ user: null });
  res.json({ user: req.session.user });
});

// ── API: get repos from GitHub ────────────────────────────────────────────────
app.get("/api/repos", requireAuth, async (req, res) => {
  const data = loadData();
  const user = data.users[req.session.user.id];
  try {
    const r = await fetch("https://api.github.com/user/repos?per_page=50&sort=updated", {
      headers: { Authorization: `Bearer ${user.accessToken}`, "User-Agent": "Comet-App" }
    });
    const repos = await r.json();
    res.json(repos.map(repo => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      language: repo.language,
      url: repo.clone_url,
      updatedAt: repo.updated_at,
      private: repo.private
    })));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch repos" });
  }
});

// ── API: get my deployments ───────────────────────────────────────────────────
app.get("/api/deployments", requireAuth, (req, res) => {
  const userId = req.session.user.id;
  const userSites = Object.entries(sites)
    .filter(([, s]) => s.userId === userId)
    .map(([slug, s]) => ({ slug, ...s, logs: s.logs.slice(-50) }));
  res.json(userSites);
});

// ── API: deploy a repo ────────────────────────────────────────────────────────
app.post("/api/deploy", requireAuth, async (req, res) => {
  const { repoUrl, repoName, branch = "main" } = req.body;
  if (!repoUrl || !repoName) return res.status(400).json({ error: "Missing repoUrl or repoName" });

  const data = loadData();
  const user = data.users[req.session.user.id];

  // Create a URL-safe slug
  const slug = `${req.session.user.username}-${repoName}`.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const port = nextPort++;
  const deployDir = path.join(__dirname, "deployments", slug);

  sites[slug] = {
    slug, port, userId: req.session.user.id,
    name: repoName, repoUrl, branch,
    status: "cloning",
    url: `http://${slug}.${BASE_DOMAIN}`,
    customDomain: null,
    logs: [`[${new Date().toISOString()}] Starting deployment of ${repoName}...`],
    createdAt: new Date().toISOString()
  };

  res.json({ slug, url: sites[slug].url, port });

  // Run deployment asynchronously
  deployRepo({ slug, repoUrl, branch, deployDir, port, accessToken: user.accessToken });
});

// ── DEPLOYMENT ENGINE ─────────────────────────────────────────────────────────
async function deployRepo({ slug, repoUrl, branch, deployDir, port, accessToken }) {
  const site = sites[slug];
  const log = (msg) => {
    const line = `[${new Date().toISOString()}] ${msg}`;
    site.logs.push(line);
    console.log(`[${slug}] ${msg}`);
  };

  try {
    // Clean and clone
    site.status = "cloning";
    if (fs.existsSync(deployDir)) fs.rmSync(deployDir, { recursive: true });
    fs.mkdirSync(deployDir, { recursive: true });

    // Inject token into URL for private repos
    const authedUrl = repoUrl.replace("https://", `https://${accessToken}@`);
    log(`Cloning repository...`);
    execSync(`git clone --depth 1 --branch ${branch} "${authedUrl}" "${deployDir}"`, { timeout: 60000 });
    log(`Clone complete.`);

    // Detect type and install deps
    site.status = "building";
    const hasPackageJson = fs.existsSync(path.join(deployDir, "package.json"));
    const hasIndexHtml = fs.existsSync(path.join(deployDir, "index.html")) ||
                         fs.existsSync(path.join(deployDir, "public", "index.html"));

    if (hasPackageJson) {
      log(`Detected Node.js project. Installing dependencies...`);
      execSync(`cd "${deployDir}" && npm install --production`, { timeout: 120000, stdio: "pipe" });
      log(`Dependencies installed.`);
    }

    // Start the site
    site.status = "starting";
    log(`Starting site on port ${port}...`);

    if (hasPackageJson) {
      // Try npm start, fallback to serving with a mini static server
      const pkg = JSON.parse(fs.readFileSync(path.join(deployDir, "package.json"), "utf8"));
      const startCmd = pkg.scripts?.start ? `npm start` : null;

      if (startCmd) {
        log(`Running: ${startCmd}`);
        const child = exec(`cd "${deployDir}" && PORT=${port} ${startCmd}`, { env: { ...process.env, PORT: String(port) } });
        site.pid = child.pid;
        child.stdout?.on("data", d => log(d.trim()));
        child.stderr?.on("data", d => log(`[err] ${d.trim()}`));
        child.on("exit", code => { log(`Process exited with code ${code}`); site.status = "stopped"; });
      } else {
        // No start script — serve static
        startStaticServer(deployDir, port, slug, log);
      }
    } else if (hasIndexHtml) {
      startStaticServer(deployDir, port, slug, log);
    } else {
      log(`No index.html or package.json found — serving directory listing.`);
      startStaticServer(deployDir, port, slug, log);
    }

    await new Promise(r => setTimeout(r, 2000));
    site.status = "running";
    log(`✓ Site is live at ${site.url}`);

  } catch (err) {
    site.status = "failed";
    log(`ERROR: ${err.message}`);
  }
}

function startStaticServer(dir, port, slug, log) {
  const staticApp = express();
  // Try public/ subfolder first, then root
  const publicDir = fs.existsSync(path.join(dir, "public")) ? path.join(dir, "public") : dir;
  staticApp.use(express.static(publicDir));
  staticApp.get("*", (req, res) => {
    const idx = path.join(publicDir, "index.html");
    if (fs.existsSync(idx)) res.sendFile(idx);
    else res.send("<h1>Site deployed via Comet</h1>");
  });
  const srv = staticApp.listen(port, () => log(`Static server listening on port ${port}`));
  sites[slug].server = srv;
}

// ── API: get logs ─────────────────────────────────────────────────────────────
app.get("/api/deployments/:slug/logs", requireAuth, (req, res) => {
  const site = sites[req.params.slug];
  if (!site || site.userId !== req.session.user.id) return res.status(404).json({ error: "Not found" });
  res.json({ logs: site.logs, status: site.status });
});

// ── API: set custom domain ────────────────────────────────────────────────────
app.post("/api/deployments/:slug/domain", requireAuth, (req, res) => {
  const { domain } = req.body;
  const site = sites[req.params.slug];
  if (!site || site.userId !== req.session.user.id) return res.status(404).json({ error: "Not found" });
  site.customDomain = domain?.trim() || null;
  site.logs.push(`[${new Date().toISOString()}] Custom domain set: ${site.customDomain}`);
  res.json({ ok: true, domain: site.customDomain, dnsInstructions: `Point a CNAME record from ${domain} to ${BASE_DOMAIN.split(":")[0]}` });
});

// ── API: delete deployment ────────────────────────────────────────────────────
app.delete("/api/deployments/:slug", requireAuth, (req, res) => {
  const site = sites[req.params.slug];
  if (!site || site.userId !== req.session.user.id) return res.status(404).json({ error: "Not found" });
  try {
    if (site.server) site.server.close();
    const deployDir = path.join(__dirname, "deployments", req.params.slug);
    if (fs.existsSync(deployDir)) fs.rmSync(deployDir, { recursive: true });
    delete sites[req.params.slug];
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── API: redeploy ─────────────────────────────────────────────────────────────
app.post("/api/deployments/:slug/redeploy", requireAuth, async (req, res) => {
  const site = sites[req.params.slug];
  if (!site || site.userId !== req.session.user.id) return res.status(404).json({ error: "Not found" });
  const data = loadData();
  const user = data.users[req.session.user.id];
  const deployDir = path.join(__dirname, "deployments", req.params.slug);
  site.status = "cloning";
  site.logs.push(`[${new Date().toISOString()}] Redeploying...`);
  if (site.server) site.server.close();
  res.json({ ok: true });
  deployRepo({ slug: req.params.slug, repoUrl: site.repoUrl, branch: site.branch, deployDir, port: site.port, accessToken: user.accessToken });
});

// ── DASHBOARD + CATCH-ALL ─────────────────────────────────────────────────────
app.get("/dashboard", (req, res) => {
  if (!req.session.user) return res.redirect("/");
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ── START ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🌠 Comet running on http://localhost:${PORT}`);
  console.log(`GitHub OAuth: ${GITHUB_CLIENT_ID ? "configured" : "NOT configured — set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET"}`);
});
