const express = require("express");
const session = require("express-session");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

const DATA_FILE = path.join(__dirname, "data.json");

// ───── STORAGE ─────
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
    secret: "secret",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(express.static(path.join(__dirname, "public")));

function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect("/auth/github");
  next();
}

// ───── DASHBOARD ─────
app.get("/dashboard", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// ───── API DEPLOY ─────
app.post("/api/deploy", requireAuth, (req, res) => {
  const { repoName, repoUrl } = req.body;

  const data = loadData();

  const id = `${req.session.user.username}-${Date.now()}`;

  data.deployments[id] = {
    id,
    name: repoName,
    repoUrl,
    status: "running",
    createdAt: Date.now(),
    logs: ["Deploy started"],
    customDomain: null,
  };

  saveData(data);

  res.json({ ok: true, id });
});

// ───── GET DEPLOYMENTS ─────
app.get("/api/deployments", requireAuth, (req, res) => {
  const data = loadData();
  res.json(Object.values(data.deployments || {}));
});

// ───── DELETE DEPLOYMENT ─────
app.delete("/api/deployments/:id", requireAuth, (req, res) => {
  const data = loadData();
  delete data.deployments[req.params.id];
  saveData(data);
  res.json({ ok: true });
});

// ───── REDEPLOY ─────
app.post("/api/deployments/:id/redeploy", requireAuth, (req, res) => {
  const data = loadData();

  const d = data.deployments[req.params.id];
  if (!d) return res.json({ ok: false });

  d.logs.push("Redeploy triggered");
  d.status = "running";

  saveData(data);
  res.json({ ok: true });
});

// ───── DOMAIN SYSTEM (FIXED) ─────
app.post("/api/deployments/:id/domain", requireAuth, (req, res) => {
  const { domain } = req.body;

  const data = loadData();
  const d = data.deployments[req.params.id];

  if (!d) return res.status(404).json({ error: "not found" });

  d.customDomain = domain;

  saveData(data);

  res.json({
    ok: true,
    dns: `Point ${domain} → ${BASE_URL}`,
  });
});

// ───── DOMAIN ROUTER (THIS WAS MISSING!) ─────
app.use((req, res, next) => {
  const data = loadData();

  const host = req.headers.host?.replace("www.", "");

  const match = Object.values(data.deployments || {}).find(
    (d) => d.customDomain === host
  );

  if (match) {
    return res.send(`
      <h1>🚀 Domain Connected</h1>
      <p>This domain is mapped to deployment:</p>
      <b>${match.name}</b>
    `);
  }

  next();
});

// ───── DEFAULT SITE ROUTE ─────
app.get("/sites/:id", (req, res) => {
  const data = loadData();
  const d = data.deployments[req.params.id];

  if (!d) return res.status(404).send("Not found");

  res.send(`
    <h1>${d.name}</h1>
    <p>Deployment running</p>
    <p>Domain: ${d.customDomain || "none"}</p>
  `);
});

// ───── API ME ─────
app.get("/api/me", (req, res) => {
  res.json({ user: req.session.user || null });
});

// ───── START ─────
app.listen(PORT, () => {
  console.log("running", BASE_URL);
});
