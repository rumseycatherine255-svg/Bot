// ═══════════════════════════════════════════════════════════════════════════════
// TAB JUNIOR CERTIFICATE — Cloudflare Worker
// Routes:
//   GET  /                          → Assembly (home)
//   GET  /year-3                    → Year 3 Community Stars
//   GET  /year-4                    → Year 4 Community Stars
//   GET  /year-5                    → Year 5 Community Stars
//   GET  /year-6                    → Year 6 Community Stars
//   GET  /whole-school              → Whole School Community Stars
//   GET  /ht-totals                 → Whole School HT Totals
//   GET  /smoothwall                → Smoothwall
//   GET  /pe-vids                   → PE Vids
//   GET  /3rw-assembly              → 3RW Assembly
//   GET  /chick-hatching            → Chick Hatching Livestream
//   GET  /admin                     → Admin login/panel
//   POST /admin/login               → Login
//   POST /admin/save                → Save scores
//   POST /admin/logout              → Logout
//   GET  /api/scores                → Get all scores as JSON
// ═══════════════════════════════════════════════════════════════════════════════

const ADMIN_USER = "admin";
const ADMIN_PASS = "cmstars";
const SESSION_KEY = "tabjunior_admin";

const HOUSES = [
  { id: "lewes",   name: "Lewes",   color: "#FFD700", dark: "#b89b00", emoji: "🟡" },
  { id: "amberley",name: "Amberley",color: "#E8000D", dark: "#a30009", emoji: "🔴" },
  { id: "hastings",name: "Hastings",color: "#0057B7", dark: "#003d82", emoji: "🔵" },
  { id: "bramber", name: "Bramber", color: "#00A651", dark: "#006b35", emoji: "🟢" },
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, "") || "/";
    const method = request.method;

    try {
      // API
      if (path === "/api/scores") return getScores(env);

      // Admin
      if (path === "/admin" && method === "GET") return adminPage(request, env);
      if (path === "/admin/login" && method === "POST") return adminLogin(request, env, url);
      if (path === "/admin/save" && method === "POST") return adminSave(request, env);
      if (path === "/admin/logout" && method === "POST") return adminLogout();

      // Pages
      const pages = {
        "/": () => assemblyPage(env),
        "/year-3": () => starsPage(env, "Year 3", "year3"),
        "/year-4": () => starsPage(env, "Year 4", "year4"),
        "/year-5": () => starsPage(env, "Year 5", "year5"),
        "/year-6": () => starsPage(env, "Year 6", "year6"),
        "/whole-school": () => starsPage(env, "Whole School", "whole"),
        "/ht-totals": () => htTotalsPage(env),
        "/smoothwall": () => smoothwallPage(),
        "/pe-vids": () => peVidsPage(),
        "/3rw-assembly": () => assemblySub3RW(),
        "/chick-hatching": () => chickPage(),
      };

      if (pages[path]) return pages[path]();
      return notFound();
    } catch (err) {
      return new Response("Error: " + err.message, { status: 500 });
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// KV + SESSION
// ═══════════════════════════════════════════════════════════════════════════════

async function getScoreData(env) {
  try {
    const v = await env.TAB_KV.get("scores");
    if (v) return JSON.parse(v);
  } catch {}
  // Defaults
  return {
    year3:  { lewes: 0, amberley: 0, hastings: 0, bramber: 0 },
    year4:  { lewes: 0, amberley: 0, hastings: 0, bramber: 0 },
    year5:  { lewes: 0, amberley: 0, hastings: 0, bramber: 0 },
    year6:  { lewes: 0, amberley: 0, hastings: 0, bramber: 0 },
    whole:  { lewes: 0, amberley: 0, hastings: 0, bramber: 0 },
    ht:     { lewes: 0, amberley: 0, hastings: 0, bramber: 0 },
  };
}

async function getScores(env) {
  const data = await getScoreData(env);
  return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
}

function isAdmin(request) {
  const cookie = request.headers.get("Cookie") || "";
  return cookie.includes(`${SESSION_KEY}=yes`);
}

function adminCookie(set) {
  if (set) return `${SESSION_KEY}=yes; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`;
  return `${SESSION_KEY}=; Path=/; Max-Age=0`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN
// ═══════════════════════════════════════════════════════════════════════════════

async function adminLogin(request, env, url) {
  const body = await request.formData();
  const user = body.get("username");
  const pass = body.get("password");
  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    return new Response(null, { status: 302, headers: { Location: "/admin", "Set-Cookie": adminCookie(true) } });
  }
  return html(adminLoginHtml("Invalid username or password."));
}

async function adminSave(request, env) {
  if (!isAdmin(request)) return new Response("Unauthorized", { status: 401 });
  const body = await request.formData();
  const data = await getScoreData(env);
  const groups = ["year3","year4","year5","year6","whole","ht"];
  const houses = ["lewes","amberley","hastings","bramber"];
  for (const g of groups) {
    for (const h of houses) {
      const val = parseInt(body.get(`${g}_${h}`) || "0", 10);
      data[g][h] = isNaN(val) ? 0 : val;
    }
  }
  await env.TAB_KV.put("scores", JSON.stringify(data));
  return new Response(null, { status: 302, headers: { Location: "/admin?saved=1" } });
}

function adminLogout() {
  return new Response(null, { status: 302, headers: { Location: "/admin", "Set-Cookie": adminCookie(false) } });
}

async function adminPage(request, env) {
  if (!isAdmin(request)) return html(adminLoginHtml(""));
  const data = await getScoreData(env);
  const url = new URL(request.url);
  const saved = url.searchParams.get("saved") === "1";
  return html(adminPanelHtml(data, saved));
}

function adminLoginHtml(err) {
  return layout("Admin Login", `
    <div style="max-width:380px;margin:4rem auto;background:white;border-radius:14px;padding:2.5rem;box-shadow:0 8px 32px rgba(0,0,0,0.12)">
      <div style="text-align:center;margin-bottom:1.8rem">
        <div style="font-size:2.5rem;margin-bottom:0.5rem">🔐</div>
        <h2 style="font-size:1.4rem;color:#1a1a2e;font-weight:700">Admin Login</h2>
        <p style="color:#666;font-size:0.88rem;margin-top:0.3rem">Tab Junior Community Stars</p>
      </div>
      ${err ? `<div style="background:#fff0f0;border:1px solid #ffcccc;color:#cc0000;padding:0.7rem 1rem;border-radius:8px;font-size:0.85rem;margin-bottom:1rem">${err}</div>` : ""}
      <form method="POST" action="/admin/login">
        <div style="margin-bottom:1rem">
          <label style="display:block;font-size:0.78rem;font-weight:600;color:#555;margin-bottom:0.3rem;text-transform:uppercase;letter-spacing:0.05em">Username</label>
          <input name="username" type="text" required style="width:100%;padding:0.65rem 0.9rem;border:1px solid #ddd;border-radius:8px;font-size:0.92rem;outline:none;box-sizing:border-box">
        </div>
        <div style="margin-bottom:1.4rem">
          <label style="display:block;font-size:0.78rem;font-weight:600;color:#555;margin-bottom:0.3rem;text-transform:uppercase;letter-spacing:0.05em">Password</label>
          <input name="password" type="password" required style="width:100%;padding:0.65rem 0.9rem;border:1px solid #ddd;border-radius:8px;font-size:0.92rem;outline:none;box-sizing:border-box">
        </div>
        <button type="submit" style="width:100%;background:#e10600;color:white;border:none;padding:0.8rem;border-radius:8px;font-size:0.95rem;font-weight:700;cursor:pointer">Log In</button>
      </form>
    </div>
  `);
}

function adminPanelHtml(data, saved) {
  const groups = [
    { key: "year3", label: "Year 3" },
    { key: "year4", label: "Year 4" },
    { key: "year5", label: "Year 5" },
    { key: "year6", label: "Year 6" },
    { key: "whole", label: "Whole School" },
    { key: "ht",    label: "HT Totals" },
  ];

  const rows = groups.map(g => `
    <div style="background:white;border-radius:12px;padding:1.5rem;margin-bottom:1rem;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
      <h3 style="font-size:1rem;font-weight:700;color:#1a1a2e;margin-bottom:1rem;padding-bottom:0.6rem;border-bottom:2px solid #f0f0f0">${g.label}</h3>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.75rem">
        ${HOUSES.map(h => `
          <div>
            <label style="display:block;font-size:0.72rem;font-weight:700;margin-bottom:0.3rem;color:${h.color}">${h.name.toUpperCase()}</label>
            <input type="number" name="${g.key}_${h.id}" value="${data[g.key]?.[h.id] ?? 0}" min="0"
              style="width:100%;padding:0.6rem 0.5rem;border:2px solid ${h.color};border-radius:7px;font-size:1rem;font-weight:700;text-align:center;outline:none;box-sizing:border-box;color:${h.dark}">
          </div>
        `).join("")}
      </div>
    </div>
  `).join("");

  return layout("Admin Panel", `
    <div style="max-width:800px;margin:2rem auto;padding:0 1rem">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem">
        <div>
          <h2 style="font-size:1.5rem;font-weight:800;color:#1a1a2e">🏁 Admin Panel</h2>
          <p style="color:#666;font-size:0.88rem">Set community star totals for all year groups</p>
        </div>
        <form method="POST" action="/admin/logout" style="display:inline">
          <button style="background:#555;color:white;border:none;padding:0.5rem 1.2rem;border-radius:8px;font-size:0.85rem;font-weight:600;cursor:pointer">Log Out</button>
        </form>
      </div>
      ${saved ? `<div style="background:#e8f8f0;border:1px solid #a3d9b8;color:#1a6b3a;padding:0.8rem 1.1rem;border-radius:8px;font-size:0.88rem;margin-bottom:1.2rem;font-weight:600">✓ Scores saved successfully!</div>` : ""}
      <form method="POST" action="/admin/save">
        ${rows}
        <button type="submit" style="width:100%;background:#e10600;color:white;border:none;padding:1rem;border-radius:10px;font-size:1rem;font-weight:700;cursor:pointer;margin-top:0.5rem">🏁 Save All Scores</button>
      </form>
    </div>
  `);
}

// ═══════════════════════════════════════════════════════════════════════════════
// F1 RACE TRACK COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

function f1Track(scores, title) {
  const max = Math.max(...HOUSES.map(h => scores[h.id] || 0), 1);

  // F1 Car SVG paths for each house colour
  const carSvg = (color, dark) => `
    <svg width="52" height="24" viewBox="0 0 52 24" xmlns="http://www.w3.org/2000/svg">
      <!-- Body -->
      <rect x="8" y="7" width="32" height="10" rx="3" fill="${color}"/>
      <!-- Nose -->
      <polygon points="40,10 52,12 40,14" fill="${dark}"/>
      <!-- Cockpit -->
      <rect x="20" y="5" width="12" height="7" rx="2" fill="${dark}" opacity="0.8"/>
      <!-- Front wing -->
      <rect x="40" y="14" width="8" height="2" rx="1" fill="${dark}"/>
      <!-- Rear wing -->
      <rect x="4" y="4" width="6" height="2" rx="1" fill="${dark}"/>
      <rect x="3" y="10" width="2" height="4" rx="1" fill="${dark}"/>
      <!-- Wheels -->
      <circle cx="14" cy="18" r="4" fill="#222"/>
      <circle cx="14" cy="18" r="2" fill="#555"/>
      <circle cx="36" cy="18" r="4" fill="#222"/>
      <circle cx="36" cy="18" r="2" fill="#555"/>
      <circle cx="14" cy="6" r="3" fill="#222"/>
      <circle cx="14" cy="6" r="1.5" fill="#555"/>
      <circle cx="36" cy="6" r="3" fill="#222"/>
      <circle cx="36" cy="6" r="1.5" fill="#555"/>
    </svg>`;

  // Sort by score descending for positioning
  const sorted = [...HOUSES].sort((a,b) => (scores[b.id]||0) - (scores[a.id]||0));
  const maxScore = Math.max(...HOUSES.map(h => scores[h.id]||0), 1);

  const rows = HOUSES.map((house, i) => {
    const score = scores[house.id] || 0;
    const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
    // Car position: 0 = start, track width ~80% of container, car takes ~6%
    const carLeft = Math.max(0, Math.min(pct * 0.78, 78));
    const rank = sorted.findIndex(h => h.id === house.id) + 1;
    const rankEmoji = rank === 1 ? "🏆" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}`;

    return `
      <div style="margin-bottom:1.4rem">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.4rem">
          <div style="display:flex;align-items:center;gap:0.6rem">
            <span style="font-size:1.1rem">${rankEmoji}</span>
            <span style="font-weight:800;font-size:1rem;color:${house.color};text-shadow:0 1px 2px rgba(0,0,0,0.3)">${house.name}</span>
          </div>
          <span style="font-family:monospace;font-size:1.2rem;font-weight:900;color:white;background:${house.dark};padding:0.15rem 0.6rem;border-radius:6px">${score}</span>
        </div>
        <!-- TRACK -->
        <div style="position:relative;height:36px;background:linear-gradient(90deg,#2a2a3a,#1a1a2a);border-radius:18px;border:2px solid ${house.color}40;overflow:hidden">
          <!-- Track markings -->
          <div style="position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent,transparent 9.9%,rgba(255,255,255,0.04) 9.9%,rgba(255,255,255,0.04) 10%)"></div>
          <!-- Start line -->
          <div style="position:absolute;left:2%;top:0;bottom:0;width:3px;background:repeating-linear-gradient(180deg,white 0,white 4px,black 4px,black 8px)"></div>
          <!-- Finish line -->
          <div style="position:absolute;right:2%;top:0;bottom:0;width:6px;background:repeating-linear-gradient(180deg,white 0,white 4px,black 4px,black 8px);opacity:0.9"></div>
          <div style="position:absolute;right:2%;top:-8px;font-size:0.65rem;color:white;opacity:0.7;font-weight:700">FINISH</div>
          <!-- Progress glow -->
          <div style="position:absolute;left:3%;top:50%;transform:translateY(-50%);width:${Math.max(carLeft - 3, 0)}%;height:4px;background:linear-gradient(90deg,${house.color}00,${house.color}80);border-radius:2px"></div>
          <!-- CAR -->
          <div style="position:absolute;top:50%;transform:translateY(-50%);left:${carLeft + 2}%;transition:left 0.5s ease">
            ${carSvg(house.color, house.dark)}
          </div>
        </div>
      </div>`;
  }).join("");

  return `
    <div style="background:linear-gradient(135deg,#1a1a2e,#16213e);border-radius:16px;padding:1.8rem;margin:1.5rem 0;box-shadow:0 8px 32px rgba(0,0,0,0.3)">
      <div style="text-align:center;margin-bottom:1.5rem">
        <div style="font-size:1.8rem;margin-bottom:0.3rem">🏎️</div>
        <h2 style="font-size:1.2rem;font-weight:800;color:white;letter-spacing:0.05em;text-transform:uppercase">${title}</h2>
        <p style="color:#aaa;font-size:0.8rem;margin-top:0.2rem">Community Stars Race</p>
      </div>
      ${rows}
      <div style="text-align:center;margin-top:0.8rem;font-size:0.72rem;color:#666">
        🏁 Reach the finish line to win the term!
      </div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGES
// ═══════════════════════════════════════════════════════════════════════════════

async function assemblyPage(env) {
  return html(layout("Assembly — Tab Junior Certificate", `
    <div style="text-align:center;padding:2rem 1rem">
      <div style="font-size:3rem;margin-bottom:1rem">⭐</div>
      <h1 style="font-size:2rem;font-weight:800;color:#1a1a2e;margin-bottom:0.5rem">Tab Junior Certificate</h1>
      <h2 style="font-size:1.2rem;font-weight:600;color:#555;margin-bottom:2rem">Assembly</h2>
      <div style="max-width:600px;margin:0 auto;background:white;border-radius:14px;padding:2rem;box-shadow:0 4px 16px rgba(0,0,0,0.08)">
        <p style="color:#555;line-height:1.7;margin-bottom:1rem">Welcome to the Tab Junior Certificate assembly page. Use the navigation above to view community star totals for each year group and follow the F1 race to see which house is winning!</p>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:0.75rem;margin-top:1.5rem">
          ${HOUSES.map(h => `
            <div style="background:${h.color}15;border:2px solid ${h.color};border-radius:10px;padding:0.8rem;text-align:center">
              <div style="font-size:1.5rem">${h.emoji}</div>
              <div style="font-weight:800;color:${h.dark};font-size:0.95rem">${h.name}</div>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  `));
}

async function starsPage(env, yearLabel, key) {
  const data = await getScoreData(env);
  const scores = data[key] || { lewes: 0, amberley: 0, hastings: 0, bramber: 0 };
  return html(layout(`${yearLabel} Community Stars`, `
    <div style="max-width:700px;margin:0 auto;padding:1rem">
      <h1 style="text-align:center;font-size:1.6rem;font-weight:800;color:#1a1a2e;margin-bottom:0.3rem">
        ⭐ ${yearLabel.toUpperCase()} COMMUNITY STARS
      </h1>
      <p style="text-align:center;color:#666;font-size:0.9rem;margin-bottom:0.5rem">Weekly Total</p>
      ${f1Track(scores, `${yearLabel} Race`)}
    </div>
  `));
}

async function htTotalsPage(env) {
  const data = await getScoreData(env);
  const ht = data.ht || { lewes: 0, amberley: 0, hastings: 0, bramber: 0 };
  return html(layout("Whole School HT Totals", `
    <div style="max-width:700px;margin:0 auto;padding:1rem">
      <h1 style="text-align:center;font-size:1.6rem;font-weight:800;color:#1a1a2e;margin-bottom:0.3rem">
        🏆 WHOLE SCHOOL HT TOTALS
      </h1>
      <p style="text-align:center;color:#666;font-size:0.9rem;margin-bottom:0.5rem">Half Term Championship Standings</p>
      ${f1Track(ht, "Half Term Championship")}
    </div>
  `));
}

function smoothwallPage() {
  return html(layout("Smoothwall", `
    <div style="text-align:center;padding:3rem 1rem">
      <div style="font-size:3rem;margin-bottom:1rem">🛡️</div>
      <h1 style="font-size:1.6rem;font-weight:800;color:#1a1a2e;margin-bottom:1rem">Smoothwall</h1>
      <p style="color:#555;max-width:500px;margin:0 auto 1.5rem">Access the school's Smoothwall internet safety portal below.</p>
      <a href="https://www.smoothwall.net" target="_blank" rel="noopener"
        style="display:inline-block;background:#e10600;color:white;padding:0.85rem 2rem;border-radius:10px;font-weight:700;text-decoration:none;font-size:1rem">
        Open Smoothwall →
      </a>
    </div>
  `));
}

function peVidsPage() {
  return html(layout("PE Vids", `
    <div style="text-align:center;padding:3rem 1rem">
      <div style="font-size:3rem;margin-bottom:1rem">🏃</div>
      <h1 style="font-size:1.6rem;font-weight:800;color:#1a1a2e;margin-bottom:1rem">PE Vids</h1>
      <p style="color:#555;max-width:500px;margin:0 auto">PE videos and resources for Tab Junior pupils. Check back here for exercise videos and activity challenges!</p>
    </div>
  `));
}

function assemblySub3RW() {
  return html(layout("3RW Assembly", `
    <div style="text-align:center;padding:3rem 1rem">
      <div style="font-size:3rem;margin-bottom:1rem">🎓</div>
      <h1 style="font-size:1.6rem;font-weight:800;color:#1a1a2e;margin-bottom:1rem">3RW Assembly</h1>
      <p style="color:#555;max-width:500px;margin:0 auto">Resources and content for the 3RW class assembly.</p>
    </div>
  `));
}

function chickPage() {
  return html(layout("Chick Hatching Livestream", `
    <div style="text-align:center;padding:3rem 1rem">
      <div style="font-size:3rem;margin-bottom:1rem">🐣</div>
      <h1 style="font-size:1.6rem;font-weight:800;color:#1a1a2e;margin-bottom:1rem">Chick Hatching Livestream</h1>
      <p style="color:#555;max-width:500px;margin:0 auto">Watch the chick hatching livestream here! Eggs have been placed in the incubator and we're waiting for them to hatch.</p>
    </div>
  `));
}

function notFound() {
  return new Response("Page not found", { status: 404 });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED LAYOUT
// ═══════════════════════════════════════════════════════════════════════════════

const NAV_LINKS = [
  { href: "/",             label: "Assembly" },
  { href: "/year-3",       label: "Year 3 Community Stars" },
  { href: "/year-4",       label: "Year 4 Community Stars" },
  { href: "/year-5",       label: "Year 5 Community Stars" },
  { href: "/year-6",       label: "Year 6 Community Stars" },
  { href: "/whole-school", label: "Whole School Community Stars" },
  { href: "/ht-totals",    label: "Whole School HT Totals" },
  { href: "/smoothwall",   label: "Smoothwall" },
  { href: "/pe-vids",      label: "PE Vids" },
  { href: "/3rw-assembly", label: "3RW Assembly" },
  { href: "/chick-hatching",label: "Chick Hatching Livestream" },
];

function layout(title, content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  :root {
    --lewes: #FFD700;
    --amberley: #E8000D;
    --hastings: #0057B7;
    --bramber: #00A651;
    --dark: #1a1a2e;
    --mid: #16213e;
  }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    background: #f0f2f5;
    min-height: 100vh;
  }

  /* TOP STRIPE */
  .top-stripe {
    height: 6px;
    background: linear-gradient(90deg,
      var(--lewes) 0%, var(--lewes) 25%,
      var(--amberley) 25%, var(--amberley) 50%,
      var(--hastings) 50%, var(--hastings) 75%,
      var(--bramber) 75%, var(--bramber) 100%
    );
  }

  /* HEADER */
  header {
    background: linear-gradient(135deg, var(--dark), var(--mid));
    color: white;
    padding: 1.2rem 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.75rem;
  }
  .header-logo {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    text-decoration: none;
    color: white;
  }
  .logo-icon {
    width: 42px;
    height: 42px;
    background: #e10600;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.3rem;
    flex-shrink: 0;
    box-shadow: 0 0 0 3px rgba(225,6,0,0.3);
  }
  .header-title {
    font-size: 1.3rem;
    font-weight: 800;
    letter-spacing: -0.01em;
  }
  .header-sub {
    font-size: 0.78rem;
    color: #aaa;
    margin-top: 1px;
  }
  .header-admin {
    font-size: 0.78rem;
    color: #aaa;
    text-decoration: none;
    border: 1px solid rgba(255,255,255,0.2);
    padding: 0.3rem 0.75rem;
    border-radius: 6px;
    transition: all .2s;
  }
  .header-admin:hover { color: white; border-color: rgba(255,255,255,0.5); }

  /* NAV */
  nav {
    background: white;
    border-bottom: 1px solid #e0e0e0;
    overflow-x: auto;
    position: sticky;
    top: 0;
    z-index: 50;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  }
  .nav-inner {
    display: flex;
    min-width: max-content;
  }
  nav a {
    display: block;
    padding: 0.85rem 1.1rem;
    font-size: 0.82rem;
    font-weight: 600;
    color: #444;
    text-decoration: none;
    white-space: nowrap;
    border-bottom: 3px solid transparent;
    transition: all .15s;
  }
  nav a:hover { color: #e10600; border-bottom-color: #e10600; background: #fff5f5; }
  nav a.active { color: #e10600; border-bottom-color: #e10600; }

  /* MAIN */
  main {
    max-width: 900px;
    margin: 0 auto;
    padding: 1.5rem;
  }

  /* HOUSE COLOURS in nav */
  .house-lewes { color: #b89b00 !important; }
  .house-amberley { color: #a30009 !important; }
  .house-hastings { color: #003d82 !important; }
  .house-bramber { color: #006b35 !important; }

  /* FOOTER */
  footer {
    text-align: center;
    padding: 2rem;
    color: #888;
    font-size: 0.78rem;
    border-top: 1px solid #e0e0e0;
    background: white;
    margin-top: 3rem;
  }

  /* BOTTOM STRIPE */
  .bottom-stripe {
    height: 6px;
    background: linear-gradient(90deg,
      var(--bramber) 0%, var(--bramber) 25%,
      var(--hastings) 25%, var(--hastings) 50%,
      var(--amberley) 50%, var(--amberley) 75%,
      var(--lewes) 75%, var(--lewes) 100%
    );
  }

  @media (max-width: 600px) {
    header { padding: 1rem; }
    .header-title { font-size: 1.05rem; }
    main { padding: 1rem; }
  }
</style>
</head>
<body>

<div class="top-stripe"></div>

<header>
  <a href="/" class="header-logo">
    <div class="logo-icon">🏁</div>
    <div>
      <div class="header-title">Tab Junior Certificate</div>
      <div class="header-sub">Community Stars</div>
    </div>
  </a>
  <a href="/admin" class="header-admin">🔐 Admin</a>
</header>

<nav>
  <div class="nav-inner">
    ${NAV_LINKS.map(l => `<a href="${l.href}">${l.label}</a>`).join("")}
  </div>
</nav>

<main>
  ${content}
</main>

<footer>
  <p>© Tab Junior Certificate · Community Stars</p>
  <p style="margin-top:0.3rem">🟡 Lewes &nbsp; 🔴 Amberley &nbsp; 🔵 Hastings &nbsp; 🟢 Bramber</p>
</footer>

<div class="bottom-stripe"></div>

</body>
</html>`;
}

function html(content) {
  return new Response(content, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
