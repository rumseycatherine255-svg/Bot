const express = require("express");
const session = require("express-session");
const path = require("path");
const fs = require("fs");
const { execSync, exec } = require("child_process");

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const SESSION_SECRET = process.env.SESSION_SECRET || "comet-dev-secret-change-in-production";

// ── DATA STORAGE ──────────────────────────────────────────────────────────────
const DATA_FILE = path.join(__dirname, "data.json");
function loadData() {
  if (!fs.existsSync(DATA_FILE)) return { users: {} };
  try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); }
  catch { return { users: {} }; }
}
function saveData(d) {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch (e) { console.error("Failed to save data:", e.message); }
}

// ── IN-MEMORY SITES ───────────────────────────────────────────────────────────
// sites[slug] = { slug, port, userId, name, repoUrl, branch, status, url, customDomain, logs, createdAt, server }
const sites = {};
let nextPort = 4000;

// ── MIDDLEWARE ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

// ── STATIC FILES ──────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "public")));

// ── AUTH HELPER ───────────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: "Not authenticated" });
  next();
}

// ── GITHUB OAUTH ──────────────────────────────────────────────────────────────
app.get("/auth/github", (req, res) => {
  if (!GITHUB_CLIENT_ID) {
    console.error("GITHUB_CLIENT_ID is not set!");
    return res.redirect("/?error=no_github_config");
  }
  const callbackUrl = `${BASE_URL}/auth/github/callback`;
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    scope: "repo user",
    redirect_uri: callbackUrl
  });
  console.log("OAuth redirect_uri:", callbackUrl);
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

app.get("/auth/github/callback", async (req, res) => {
  const { code, error } = req.query;
  if (error || !code) {
    console.error("GitHub OAuth error:", error);
    return res.redirect("/?error=oauth_denied");
  }
  try {
    const callbackUrl = `${BASE_URL}/auth/github/callback`;
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: callbackUrl
      })
    });
    const tokenData = await tokenRes.json();
    console.log("Token response:", { ...tokenData, access_token: tokenData.access_token ? "[SET]" : "[MISSING]" });

    if (tokenData.error || !tokenData.access_token) {
      console.error("Token error:", tokenData.error, tokenData.error_description);
      return res.redirect("/?error=token_failed");
    }

    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "User-Agent": "Comet-Hosting-App"
      }
    });
    const ghUser = await userRes.json();
    if (!ghUser.id) {
      console.error("GitHub user fetch failed:", ghUser);
      return res.redirect("/?error=user_fetch_failed");
    }

    const data = loadData();
    const userId = `gh_${ghUser.id}`;
    data.users[userId] = {
      id: userId,
      githubId: ghUser.id,
      username: ghUser.login,
      name: ghUser.name || ghUser.login,
      avatar: ghUser.avatar_url,
      email: ghUser.email || "",
      accessToken: tokenData.access_token,
      createdAt: data.users[userId]?.createdAt || new Date().toISOString()
    };
    saveData(data);

    req.session.user = {
      id: userId,
      username: ghUser.login,
      avatar: ghUser.avatar_url,
      name: ghUser.name || ghUser.login
    };

    req.session.save((err) => {
      if (err) console.error("Session save error:", err);
      res.redirect("/dashboard");
    });

  } catch (err) {
    console.error("OAuth callback error:", err);
    res.redirect("/?error=oauth_failed");
  }
});

app.get("/auth/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

// ── API: me ───────────────────────────────────────────────────────────────────
app.get("/api/me", (req, res) => {
  res.json({ user: req.session.user || null });
});

// ── API: repos ────────────────────────────────────────────────────────────────
app.get("/api/repos", requireAuth, async (req, res) => {
  const data = loadData();
  const user = data.users[req.session.user.id];
  if (!user?.accessToken) return res.status(401).json({ error: "No access token" });
  try {
    const r = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner", {
      headers: {
        Authorization: `Bearer ${user.accessToken}`,
        "User-Agent": "Comet-Hosting-App"
      }
    });
    if (!r.ok) return res.status(r.status).json({ error: "GitHub API error" });
    const repos = await r.json();
    res.json(repos.map(repo => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      language: repo.language,
      url: repo.clone_url,
      updatedAt: repo.updated_at,
      private: repo.private,
      defaultBranch: repo.default_branch
    })));
  } catch (err) {
    console.error("Repos fetch error:", err);
    res.status(500).json({ error: "Failed to fetch repositories" });
  }
});

// ── API: deployments ──────────────────────────────────────────────────────────
app.get("/api/deployments", requireAuth, (req, res) => {
  const userId = req.session.user.id;
  const userSites = Object.values(sites)
    .filter(s => s.userId === userId)
    .map(s => ({
      slug: s.slug,
      name: s.name,
      status: s.status,
      url: s.url,
      customDomain: s.customDomain,
      repoUrl: s.repoUrl,
      branch: s.branch,
      createdAt: s.createdAt,
      logs: s.logs.slice(-100)
    }));
  res.json(userSites);
});

// ── API: deploy ───────────────────────────────────────────────────────────────
app.post("/api/deploy", requireAuth, async (req, res) => {
  const { repoUrl, repoName, branch } = req.body;
  if (!repoUrl || !repoName) return res.status(400).json({ error: "Missing repoUrl or repoName" });

  const data = loadData();
  const user = data.users[req.session.user.id];

  const slug = `${req.session.user.username}-${repoName}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);

  const port = nextPort++;
  const deployDir = path.join(__dirname, "deployments", slug);
  const usedBranch = branch || "main";

  // URL is now path-based — no subdomains needed
  const siteUrl = `${BASE_URL}/sites/${slug}/`;

  sites[slug] = {
    slug, port,
    userId: req.session.user.id,
    name: repoName,
    repoUrl,
    branch: usedBranch,
    status: "cloning",
    url: siteUrl,
    customDomain: null,
    logs: [`[${ts()}] 🌠 Starting deployment of ${repoName} (branch: ${usedBranch})...`],
    createdAt: new Date().toISOString(),
    server: null
  };

  res.json({ slug, url: siteUrl });

  deployRepo({ slug, repoUrl, branch: usedBranch, deployDir, port, accessToken: user.accessToken });
});

// ── SERVE DEPLOYED SITES via /sites/:slug/* ───────────────────────────────────
app.use("/sites/:slug", (req, res, next) => {
  const { slug } = req.params;
  const site = sites[slug];

  if (!site) {
    return res.status(404).send(`
      <html><body style="font-family:sans-serif;padding:2rem;background:#07070d;color:#f0efff">
      <h2>☄️ Site not found</h2>
      <p style="color:#7878a0">No deployment found for <code>${slug}</code>.</p>
      <a href="/" style="color:#f97316">← Back to Comet</a>
      </body></html>`);
  }

  if (site.status !== "running") {
    return res.send(`
      <!DOCTYPE html><html><head><title>Deploying — Comet</title>
      <style>*{margin:0;padding:0;box-sizing:border-box;}
      body{font-family:'Segoe UI',sans-serif;background:#07070d;color:#fff;
      display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:1.2rem;}
      .spinner{width:44px;height:44px;border:3px solid rgba(255,255,255,0.08);
      border-top-color:#f97316;border-radius:50%;animation:spin .8s linear infinite;}
      @keyframes spin{to{transform:rotate(360deg)}}
      h2{font-size:1.2rem;} p{color:#7878a0;font-size:.9rem;}
      </style></head>
      <body><div class="spinner"></div>
      <h2>Deploying ${site.name}…</h2>
      <p>Status: ${site.status} — refreshing automatically</p>
      <script>setTimeout(()=>location.reload(), 3000)</script>
      </body></html>`);
  }

  // Strip the /sites/:slug prefix and proxy to the internal port
  req.url = req.url || "/";
  const http = require("http");
  const options = {
    hostname: "localhost",
    port: site.port,
    path: req.url,
    method: req.method,
    headers: req.headers
  };

  const proxy = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxy.on("error", () => {
    res.status(502).send(`
      <html><body style="font-family:sans-serif;padding:2rem;background:#07070d;color:#f0efff">
      <h2>☄️ Site starting up</h2>
      <p style="color:#7878a0">Give it a moment and refresh.</p>
      <script>setTimeout(()=>location.reload(),3000)</script>
      </body></html>`);
  });

  req.pipe(proxy, { end: true });
});

// ── API: logs ─────────────────────────────────────────────────────────────────
app.get("/api/deployments/:slug/logs", requireAuth, (req, res) => {
  const site = sites[req.params.slug];
  if (!site) return res.status(404).json({ error: "Deployment not found" });
  if (site.userId !== req.session.user.id) return res.status(403).json({ error: "Forbidden" });
  res.json({ logs: site.logs, status: site.status, url: site.url });
});

// ── API: custom domain ────────────────────────────────────────────────────────
app.post("/api/deployments/:slug/domain", requireAuth, (req, res) => {
  const site = sites[req.params.slug];
  if (!site) return res.status(404).json({ error: "Not found" });
  if (site.userId !== req.session.user.id) return res.status(403).json({ error: "Forbidden" });
  const domain = (req.body.domain || "").trim().toLowerCase().replace(/^https?:\/\//, "");
  site.customDomain = domain || null;
  site.logs.push(`[${ts()}] Custom domain ${domain ? "set to: " + domain : "removed"}`);
  const baseDomain = BASE_URL.replace(/^https?:\/\//, "");
  res.json({
    ok: true,
    domain: site.customDomain,
    dnsInstructions: domain
      ? `To point ${domain} to this site:\n\n1. Add a CNAME record:\n   Name:  ${domain}\n   Value: ${baseDomain}\n\n2. DNS can take up to 48 hours to propagate.\n\nNote: Custom domain routing requires a Pro plan with a dedicated server.`
      : null
  });
});

// ── API: delete deployment ────────────────────────────────────────────────────
app.delete("/api/deployments/:slug", requireAuth, (req, res) => {
  const site = sites[req.params.slug];
  if (!site) return res.status(404).json({ error: "Not found" });
  if (site.userId !== req.session.user.id) return res.status(403).json({ error: "Forbidden" });
  try {
    if (site.server) site.server.close();
    const deployDir = path.join(__dirname, "deployments", req.params.slug);
    if (fs.existsSync(deployDir)) fs.rmSync(deployDir, { recursive: true, force: true });
    delete sites[req.params.slug];
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── API: redeploy ─────────────────────────────────────────────────────────────
app.post("/api/deployments/:slug/redeploy", requireAuth, async (req, res) => {
  const site = sites[req.params.slug];
  if (!site) return res.status(404).json({ error: "Not found" });
  if (site.userId !== req.session.user.id) return res.status(403).json({ error: "Forbidden" });
  const data = loadData();
  const user = data.users[req.session.user.id];
  const deployDir = path.join(__dirname, "deployments", req.params.slug);
  if (site.server) { try { site.server.close(); } catch {} }
  site.status = "cloning";
  site.logs.push(`[${ts()}] 🔄 Redeploying...`);
  res.json({ ok: true });
  deployRepo({ slug: req.params.slug, repoUrl: site.repoUrl, branch: site.branch, deployDir, port: site.port, accessToken: user.accessToken });
});

// ── DEPLOY ENGINE ─────────────────────────────────────────────────────────────
async function deployRepo({ slug, repoUrl, branch, deployDir, port, accessToken }) {
  const site = sites[slug];
  const log = (msg) => { site.logs.push(`[${ts()}] ${msg}`); console.log(`[${slug}] ${msg}`); };

  try {
    site.status = "cloning";
    log("Cloning repository...");

    if (fs.existsSync(deployDir)) fs.rmSync(deployDir, { recursive: true, force: true });
    fs.mkdirSync(deployDir, { recursive: true });

    const authedUrl = accessToken
      ? repoUrl.replace("https://", `https://oauth2:${accessToken}@`)
      : repoUrl;

    try {
      execSync(`git clone --depth 1 --branch "${branch}" "${authedUrl}" "${deployDir}"`, { timeout: 90000, stdio: "pipe" });
      log("✓ Clone complete.");
    } catch {
      log(`Branch '${branch}' not found, cloning default branch...`);
      execSync(`git clone --depth 1 "${authedUrl}" "${deployDir}"`, { timeout: 90000, stdio: "pipe" });
      log("✓ Clone complete (default branch).");
    }

    site.status = "building";
    const hasPackageJson = fs.existsSync(path.join(deployDir, "package.json"));
    const hasIndexHtml = fs.existsSync(path.join(deployDir, "index.html")) ||
      fs.existsSync(path.join(deployDir, "public", "index.html"));

    if (hasPackageJson) {
      log("🔍 Detected: Node.js project");
      log("📦 Installing dependencies...");
      execSync(`cd "${deployDir}" && npm install --production --prefer-offline`, {
        timeout: 180000, stdio: "pipe",
        env: { ...process.env, NODE_ENV: "production" }
      });
      log("✓ Dependencies installed.");

      const pkg = JSON.parse(fs.readFileSync(path.join(deployDir, "package.json"), "utf8"));

      if (pkg.scripts?.build) {
        log("🔨 Running build script...");
        execSync(`cd "${deployDir}" && npm run build`, { timeout: 120000, stdio: "pipe" });
        log("✓ Build complete.");
      }

      site.status = "starting";
      if (pkg.scripts?.start) {
        log(`🚀 Starting app on port ${port}...`);
        const child = exec(`cd "${deployDir}" && npm start`, {
          env: { ...process.env, PORT: String(port), NODE_ENV: "production" }
        });
        site.pid = child.pid;
        child.stdout?.on("data", d => d.trim().split("\n").forEach(l => log(l)));
        child.stderr?.on("data", d => d.trim().split("\n").forEach(l => log(`[stderr] ${l}`)));
        child.on("exit", code => { log(`Process exited (code ${code})`); site.status = "stopped"; });
        await wait(3000);
      } else {
        log("No start script — serving as static site.");
        startStaticServer(deployDir, port, slug, log);
        await wait(1000);
      }
    } else if (hasIndexHtml) {
      log("🔍 Detected: Static HTML site");
      site.status = "starting";
      startStaticServer(deployDir, port, slug, log);
      await wait(1000);
    } else {
      log("🔍 No index.html or package.json — serving directory.");
      site.status = "starting";
      startStaticServer(deployDir, port, slug, log);
      await wait(1000);
    }

    site.status = "running";
    log(`✓ Live at ${site.url}`);

  } catch (err) {
    site.status = "failed";
    log(`ERROR: ${err.message}`);
    console.error(`[${slug}] Deploy failed:`, err);
  }
}

function startStaticServer(dir, port, slug, log) {
  const staticApp = express();
  const candidates = [
    path.join(dir, "public"),
    path.join(dir, "dist"),
    path.join(dir, "build"),
    path.join(dir, "out"),
    dir
  ];
  const publicDir = candidates.find(d => fs.existsSync(d) && fs.statSync(d).isDirectory()) || dir;
  log(`Serving static files from: ${path.basename(publicDir)}/`);
  staticApp.use(express.static(publicDir));
  staticApp.get("*", (req, res) => {
    const idx = path.join(publicDir, "index.html");
    if (fs.existsSync(idx)) return res.sendFile(idx);
    res.send(`<html><body style="font-family:sans-serif;padding:2rem;background:#07070d;color:#f0efff">
      <h2>☄️ Deployed via Comet</h2>
      <p style="color:#7878a0">No index.html found.</p></body></html>`);
  });
  const srv = staticApp.listen(port, () => log(`Static server on port ${port}`));
  srv.on("error", e => log(`Server error: ${e.message}`));
  sites[slug].server = srv;
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
app.get("/dashboard", (req, res) => {
  if (!req.session.user) return res.redirect("/?error=not_logged_in");
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// ── HEALTH ────────────────────────────────────────────────────────────────────
app.get("/health", (req, res) => res.json({ status: "ok", uptime: process.uptime() }));

// ── CATCH ALL ─────────────────────────────────────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ── UTILS ─────────────────────────────────────────────────────────────────────
function ts() { return new Date().toISOString(); }
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── START ─────────────────────────────────────────────────────────────────────
const deployFolder = path.join(__dirname, "deployments");
if (!fs.existsSync(deployFolder)) fs.mkdirSync(deployFolder, { recursive: true });

app.listen(PORT, () => {
  console.log(`\n🌠 Comet running`);
  console.log(`   URL:    ${BASE_URL}`);
  console.log(`   GitHub: ${GITHUB_CLIENT_ID ? "✓ configured" : "✗ NOT configured"}`);
  console.log(`   Sites served at: ${BASE_URL}/sites/:slug/\n`);
});
