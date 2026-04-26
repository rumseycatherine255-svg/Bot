const express = require("express");
const session = require("express-session");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const SESSION_SECRET = process.env.SESSION_SECRET || "change-me";

if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
  console.warn("⚠️ Missing GitHub OAuth env vars");
}

// ───── DATA ─────
const DATA_FILE = path.join(__dirname, "data.json");

function loadData() {
  if (!fs.existsSync(DATA_FILE)) return { users: {} };
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

// ───── AUTH GUARD ─────
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/auth/github");
  }
  next();
}

// ───── LANDING ─────
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ───── DASHBOARD (FORCED AUTH) ─────
app.get("/dashboard", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// ───── GITHUB OAUTH START ─────
app.get("/auth/github", (req, res) => {
  const redirectUri = `${BASE_URL}/auth/github/callback`;

  const url =
    "https://github.com/login/oauth/authorize" +
    `?client_id=${GITHUB_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=read:user repo`;

  return res.redirect(url);
});

// ───── GITHUB CALLBACK ─────
app.get("/auth/github/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.redirect("/");

  try {
    const tokenRes = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          client_secret: GITHUB_CLIENT_SECRET,
          code,
        }),
      }
    );

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      console.log(tokenData);
      return res.send("OAuth failed (no token)");
    }

    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "User-Agent": "comet-app",
      },
    });

    const ghUser = await userRes.json();

    const data = loadData();
    const userId = `gh_${ghUser.id}`;

    data.users[userId] = {
      id: userId,
      username: ghUser.login,
      avatar: ghUser.avatar_url,
      token: tokenData.access_token,
    };

    saveData(data);

    req.session.user = data.users[userId];

    req.session.save(() => {
      res.redirect("/dashboard");
    });
  } catch (err) {
    console.error(err);
    res.redirect("/");
  }
});

// ───── LOGOUT ─────
app.get("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.redirect("/");
  });
});

// ───── API ME ─────
app.get("/api/me", (req, res) => {
  res.json({ user: req.session.user || null });
});

// ───── GITHUB REPOS ─────
app.get("/api/repos", requireAuth, async (req, res) => {
  const user = req.session.user;

  const r = await fetch(
    "https://api.github.com/user/repos?per_page=100&sort=updated",
    {
      headers: {
        Authorization: `Bearer ${user.token}`,
        "User-Agent": "comet-app",
      },
    }
  );

  const repos = await r.json();
  res.json(repos);
});

// ───── START ─────
app.listen(PORT, () => {
  console.log(`🚀 Running on ${BASE_URL}`);
});
