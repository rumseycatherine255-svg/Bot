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
const SESSION_SECRET = process.env.SESSION_SECRET || "secret";

// ───── STORAGE (FIX: deployments persist now) ─────
const DATA_FILE = path.join(__dirname, "data.json");

function loadData() {
  if (!fs.existsSync(DATA_FILE)) return { users: {}, deployments: {} };
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function saveData(d) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2));
}

// ───── APP ─────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(express.static(path.join(__dirname, "public")));

function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect("/auth/github");
  next();
}

// ───── LANDING ─────
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ───── DASHBOARD ─────
app.get("/dashboard", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// ───── GITHUB OAUTH ─────
app.get("/auth/github", (req, res) => {
  const redirect = `${BASE_URL}/auth/github/callback`;

  const url =
    `https://github.com/login/oauth/authorize` +
    `?client_id=${GITHUB_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(redirect)}` +
    `&scope=read:user repo`;

  res.redirect(url);
});

// ───── CALLBACK ─────
app.get("/auth/github/callback", async (req, res) => {
  const code = req.query.code;

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const token = await tokenRes.json();

  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      "User-Agent": "app",
    },
  });

  const ghUser = await userRes.json();

  const data = loadData();

  const userId = `gh_${ghUser.id}`;

  data.users[userId] = {
    id: userId,
    username: ghUser.login,
    avatar: ghUser.avatar_url,
    token: token.access_token,
  };

  saveData(data);

  req.session.user = data.users[userId];

  res.redirect("/dashboard");
});

// ───── API: USER ─────
app.get("/api/me", (req, res) => {
  res.json({ user: req.session.user || null });
});

// ───── API: REPOS ─────
app.get("/api/repos", requireAuth, async (req, res) => {
  const r = await fetch(
    "https://api.github.com/user/repos?per_page=100&sort=updated",
    {
      headers: {
        Authorization: `Bearer ${req.session.user.token}`,
        "User-Agent": "app",
      },
    }
  );

  const repos = await r.json();
  res.json(repos);
});

// ───── API: DEPLOY (FIXED — NOW SAVES) ─────
app.post("/api/deploy", requireAuth, (req, res) => {
  const { repoName, repoUrl } = req.body;

  const data = loadData();

  const id = `${req.session.user.username}-${Date.now()}`;

  data.deployments[id] = {
    id,
    name: repoName,
    repoUrl,
    status: "running",
    url: `${BASE_URL}/sites/${id}`,
    createdAt: new Date().toISOString(),
    logs: ["Deploy started..."],
  };

  saveData(data);

  res.json({ ok: true, id });
});

// ───── API: DEPLOYMENTS (FIXED) ─────
app.get("/api/deployments", requireAuth, (req, res) => {
  const data = loadData();

  const list = Object.values(data.deployments || {}).filter(Boolean);

  res.json(list);
});

// ───── API: DELETE ─────
app.delete("/api/deployments/:id", requireAuth, (req, res) => {
  const data = loadData();

  delete data.deployments[req.params.id];

  saveData(data);

  res.json({ ok: true });
});

// ───── API: REDEPLOY ─────
app.post("/api/deployments/:id/redeploy", requireAuth, (req, res) => {
  const data = loadData();

  if (!data.deployments[req.params.id]) return res.json({ ok: false });

  data.deployments[req.params.id].logs.push("Redeploy triggered...");

  saveData(data);

  res.json({ ok: true });
});

// ───── SERVE DEPLOYED SITE ─────
app.get("/sites/:id", (req, res) => {
  res.send(`<h1>Deployed site: ${req.params.id}</h1>`);
});

// ───── LOGOUT ─────
app.get("/auth/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

// ───── START ─────
app.listen(PORT, () => {
  console.log("Running on", BASE_URL);
});
