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
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(express.static(path.join(__dirname, "public")));

const DATA_FILE = "./data.json";
const sites = {};
let nextPort = 4000;

/* DATA */
function loadData() {
  if (!fs.existsSync(DATA_FILE)) return { users: {} };
  return JSON.parse(fs.readFileSync(DATA_FILE));
}
function saveData(d) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2));
}
function ts() { return new Date().toISOString(); }

function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect("/");
  next();
}

/* LANDING */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

/* GITHUB OAUTH */
app.get("/auth/github", (req, res) => {
  const redirect = `${BASE_URL}/auth/github/callback`;
  res.redirect(
    `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=repo&redirect_uri=${redirect}`
  );
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

  const token = await tokenRes.json();

  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      "User-Agent": "app"
    }
  });

  const ghUser = await userRes.json();

  const db = loadData();
  const id = "gh_" + ghUser.id;

  db.users[id] = {
    id,
    username: ghUser.login,
    avatar: ghUser.avatar_url,
    token: token.access_token
  };

  saveData(db);

  req.session.user = db.users[id];
  res.redirect("/dashboard");
});

/* USER */
app.get("/api/me", (req, res) => {
  res.json({ user: req.session.user || null });
});

/* REPOS */
app.get("/api/repos", requireAuth, async (req, res) => {
  const r = await fetch("https://api.github.com/user/repos", {
    headers: {
      Authorization: `Bearer ${req.session.user.token}`,
      "User-Agent": "app"
    }
  });

  const data = await r.json();

  res.json(data.map(r => ({
    name: r.name,
    full: r.full_name,
    url: r.clone_url,
    desc: r.description
  })));
});

/* DEPLOY */
app.post("/api/deploy", requireAuth, async (req, res) => {
  const { repoUrl, name } = req.body;

  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const port = nextPort++;

  const dir = path.join(__dirname, "sites", slug);
  fs.mkdirSync(dir, { recursive: true });

  execSync(`git clone ${repoUrl} ${dir}`);

  exec(`cd ${dir} && npm install && npm start`, {
    env: { ...process.env, PORT: port }
  });

  sites[slug] = {
    port,
    name,
    url: `${BASE_URL}/sites/${slug}`
  };

  res.json({ ok: true, slug });
});

/* PROXY */
app.use("/sites/:slug", (req, res) => {
  const site = sites[req.params.slug];
  if (!site) return res.send("Not found");

  const http = require("http");

  const options = {
    hostname: "localhost",
    port: site.port,
    path: req.url,
    method: req.method,
    headers: req.headers
  };

  const proxy = http.request(options, r => {
    res.writeHead(r.statusCode, r.headers);
    r.pipe(res);
  });

  req.pipe(proxy);
});

/* DASHBOARD */
app.get("/dashboard", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public/dashboard.html"));
});

/* START */
app.listen(PORT, () => console.log("running:", PORT));
