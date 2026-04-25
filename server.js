require("dotenv").config();

const express = require("express");
const session = require("express-session");
const path = require("path");
const fs = require("fs");
const { execSync, exec } = require("child_process");
const httpProxy = require("http-proxy");

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 3000;

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const SESSION_SECRET = process.env.SESSION_SECRET || "change-me";

// ── STORAGE ─────────────────────────────────────────────
const DATA_FILE = path.join(__dirname, "data.json");

function loadData() {
  if (!fs.existsSync(DATA_FILE)) return { users: {} };
  return JSON.parse(fs.readFileSync(DATA_FILE));
}

function saveData(d) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2));
}

// ── DEPLOYMENTS ─────────────────────────────────────────
const sites = {};
let nextPort = 4000;

// ensure deployments folder exists
const deploymentsDir = path.join(__dirname, "deployments");
if (!fs.existsSync(deploymentsDir)) {
  fs.mkdirSync(deploymentsDir);
}

// ── MIDDLEWARE ──────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("trust proxy", 1);

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

// ── STATIC ──────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "public")));

// ── AUTH ────────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: "Not logged in" });
  next();
}

// ── GITHUB LOGIN ────────────────────────────────────────
app.get("/auth/github", (req, res) => {
  if (!GITHUB_CLIENT_ID) {
    return res.redirect("/?error=no_github_config");
  }

  const url = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}`;
  res.redirect(url);
});

app.get("/auth/github/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) return res.redirect("/");

  try {
    const tokenRes = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: { Accept: "application/json" },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          client_secret: GITHUB_CLIENT_SECRET,
          code,
        }),
      }
    );

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const ghUser = await userRes.json();

    const data = loadData();
    const userId = `gh_${ghUser.id}`;

    data.users[userId] = {
      id: userId,
      username: ghUser.login,
      accessToken,
    };

    saveData(data);

    req.session.user = { id: userId, username: ghUser.login };

    res.redirect("/dashboard");
  } catch (e) {
    console.error(e);
    res.redirect("/");
  }
});

// ── API ─────────────────────────────────────────────────
app.get("/api/me", (req, res) => {
  res.json({ user: req.session.user || null });
});

app.get("/api/repos", requireAuth, async (req, res) => {
  const data = loadData();
  const user = data.users[req.session.user.id];

  const r = await fetch("https://api.github.com/user/repos", {
    headers: { Authorization: `Bearer ${user.accessToken}` },
  });

  const repos = await r.json();
  res.json(repos);
});

// ── DEPLOY ──────────────────────────────────────────────
app.post("/api/deploy", requireAuth, async (req, res) => {
  const { repoUrl, repoName } = req.body;

  const slug = repoName.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const port = nextPort++;

  const deployDir = path.join(deploymentsDir, slug);

  sites[slug] = {
    slug,
    port,
    status: "building",
    url: `http://localhost:${port}`,
  };

  res.json({ slug, url: sites[slug].url });

  deployRepo(slug, repoUrl, deployDir, port);
});

// ── DEPLOY ENGINE ───────────────────────────────────────
function deployRepo(slug, repoUrl, deployDir, port) {
  try {
    if (fs.existsSync(deployDir)) {
      fs.rmSync(deployDir, { recursive: true });
    }

    execSync(`git clone ${repoUrl} ${deployDir}`);

    if (fs.existsSync(path.join(deployDir, "package.json"))) {
      execSync(`cd ${deployDir} && npm install`, { stdio: "inherit" });

      const child = exec(`cd ${deployDir} && PORT=${port} npm start`);
      sites[slug].pid = child.pid;
    } else {
      const staticApp = express();
      staticApp.use(express.static(deployDir));
      staticApp.listen(port);
    }

    sites[slug].status = "running";
  } catch (e) {
    console.error(e);
    sites[slug].status = "failed";
  }
}

// ── DASHBOARD ───────────────────────────────────────────
app.get("/dashboard", (req, res) => {
  if (!req.session.user) return res.redirect("/");
  res.sendFile(path.join(__dirname, "public/dashboard.html"));
});

// ── FALLBACK ────────────────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// ── START ───────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Running on http://localhost:${PORT}`);
});
