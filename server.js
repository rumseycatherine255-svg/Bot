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
const SESSION_SECRET = process.env.SESSION_SECRET || "change-me";

// ───────────── DATA ─────────────
const DATA_FILE = path.join(__dirname, "data.json");

function loadData() {
  if (!fs.existsSync(DATA_FILE)) return { users: {}, sites: {} };
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return { users: {}, sites: {} };
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ───────────── APP ─────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(express.static(path.join(__dirname, "public")));

// ───────────── AUTH ─────────────
function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: "Not logged in" });
  next();
}

// ───────────── GITHUB OAUTH ─────────────
app.get("/auth/github", (req, res) => {
  const redirect = `${BASE_URL}/auth/github/callback`;

  const url =
    `https://github.com/login/oauth/authorize` +
    `?client_id=${GITHUB_CLIENT_ID}` +
    `&scope=repo user` +
    `&redirect_uri=${redirect}`;

  res.redirect(url);
});

app.get("/auth/github/callback", async (req, res) => {
  const code = req.query.code;

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code
    })
  });

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "Comet"
    }
  });

  const ghUser = await userRes.json();

  const data = loadData();

  data.users[ghUser.id] = {
    id: ghUser.id,
    login: ghUser.login,
    avatar: ghUser.avatar_url,
    token: accessToken
  };

  saveData(data);

  req.session.user = data.users[ghUser.id];

  req.session.save(() => {
    res.redirect("/dashboard");
  });
});

// ───────────── USER ─────────────
app.get("/api/me", (req, res) => {
  res.json({ user: req.session.user || null });
});

// ───────────── REPOS ─────────────
app.get("/api/repos", requireAuth, async (req, res) => {
  const user = req.session.user;

  const r = await fetch("https://api.github.com/user/repos", {
    headers: {
      Authorization: `Bearer ${user.token}`,
      "User-Agent": "Comet"
    }
  });

  const repos = await r.json();

  res.json(repos.map(r => ({
    name: r.name,
    full: r.full_name,
    url: r.clone_url,
    desc: r.description
  })));
});

// ───────────── DEPLOY STORAGE ─────────────
function getDB() {
  const d = loadData();
  if (!d.sites) d.sites = {};
  return d;
}

// ───────────── DEPLOY ─────────────
app.post("/api/deploy", requireAuth, (req, res) => {
  const { repoUrl, repoName } = req.body;

  const db = getDB();

  const id = repoName + "-" + Date.now();

  db.sites[id] = {
    id,
    repoUrl,
    name: repoName,
    status: "running",
    domain: null,
    created: Date.now()
  };

  saveData(db);

  res.json({ ok: true, id });
});

// ───────────── LIST DEPLOYMENTS ─────────────
app.get("/api/deployments", requireAuth, (req, res) => {
  const db = loadData();
  res.json(Object.values(db.sites || {}));
});

// ───────────── DOMAIN ─────────────
app.post("/api/domain/:id", requireAuth, (req, res) => {
  const db = getDB();

  if (!db.sites[req.params.id]) {
    return res.status(404).json({ error: "Not found" });
  }

  db.sites[req.params.id].domain = req.body.domain;

  saveData(db);

  res.json({ ok: true });
});

// ───────────── DASHBOARD ─────────────
app.get("/dashboard", (req, res) => {
  if (!req.session.user) return res.redirect("/");
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// ───────────── START ─────────────
app.listen(PORT, () => {
  console.log("Running on " + PORT);
});
