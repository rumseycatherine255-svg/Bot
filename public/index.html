// ─────────────────────────────────────────────────────────────────────────────
// COMET — Cloudflare Worker
// Routes: /, /auth/github, /auth/github/callback, /auth/logout,
//         /dashboard, /api/me, /api/repos, /api/deployments,
//         /api/dns, /api/dns/:id (DELETE), /api/dns/:id/test
// Storage: Cloudflare KV (COMET_KV)
// ─────────────────────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // ── ROUTER ──────────────────────────────────────────────────────────────
    try {
      if (path === "/" && method === "GET") return serveIndex(request, env);
      if (path === "/auth/github" && method === "GET") return handleGithubLogin(request, env);
      if (path === "/auth/github/callback" && method === "GET") return handleGithubCallback(request, env);
      if (path === "/auth/logout" && method === "GET") return handleLogout(request);
      if (path === "/dashboard" && method === "GET") return serveDashboard(request, env);

      if (path === "/api/me") return apiMe(request, env);
      if (path === "/api/repos") return apiRepos(request, env);
      if (path === "/api/deployments" && method === "GET") return apiGetDeployments(request, env);
      if (path === "/api/deployments" && method === "POST") return apiAddDeployment(request, env);
      if (path.match(/^\/api\/deployments\/[^/]+$/) && method === "DELETE") return apiDeleteDeployment(request, env, path.split("/")[3]);

      if (path === "/api/dns" && method === "GET") return apiGetDns(request, env);
      if (path === "/api/dns" && method === "POST") return apiAddDns(request, env);
      if (path.match(/^\/api\/dns\/[^/]+$/) && method === "DELETE") return apiDeleteDns(request, env, path.split("/")[3]);
      if (path.match(/^\/api\/dns\/[^/]+\/test$/) && method === "GET") return apiTestDns(request, env, path.split("/")[3]);

      return new Response("Not found", { status: 404 });
    } catch (err) {
      console.error("Worker error:", err);
      return new Response("Internal server error: " + err.message, { status: 500 });
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// SESSION HELPERS (cookie-based, signed with SESSION_SECRET)
// ─────────────────────────────────────────────────────────────────────────────

async function signData(data, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function createSession(user, secret) {
  const payload = JSON.stringify({ user, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  const b64 = btoa(encodeURIComponent(payload));
  const sig = await signData(b64, secret);
  return `${b64}.${sig.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")}`;
}

async function verifySession(token, secret) {
  if (!token) return null;
  try {
    const [b64, sig] = token.split(".");
    if (!b64 || !sig) return null;
    const expectedSig = (await signData(b64, secret)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    if (sig !== expectedSig) return null;
    const payload = JSON.parse(decodeURIComponent(atob(b64)));
    if (payload.exp < Date.now()) return null;
    return payload.user;
  } catch {
    return null;
  }
}

function getSessionToken(request) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/comet_session=([^;]+)/);
  return match ? match[1] : null;
}

async function getUser(request, env) {
  const token = getSessionToken(request);
  return verifySession(token, env.SESSION_SECRET || "comet-default-secret");
}

function setSessionCookie(token, baseUrl) {
  const isHttps = baseUrl.startsWith("https");
  return `comet_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 3600}${isHttps ? "; Secure" : ""}`;
}

function clearSessionCookie() {
  return `comet_session=; Path=/; HttpOnly; Max-Age=0`;
}

// ─────────────────────────────────────────────────────────────────────────────
// KV HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function kvGet(env, key) {
  try {
    const val = await env.COMET_KV.get(key);
    return val ? JSON.parse(val) : null;
  } catch { return null; }
}

async function kvSet(env, key, value) {
  await env.COMET_KV.put(key, JSON.stringify(value));
}

async function kvDelete(env, key) {
  await env.COMET_KV.delete(key);
}

// ─────────────────────────────────────────────────────────────────────────────
// GITHUB OAUTH
// ─────────────────────────────────────────────────────────────────────────────

function handleGithubLogin(request, env) {
  if (!env.GITHUB_CLIENT_ID) {
    return Response.redirect(`${env.BASE_URL || "https://comethosting.uk"}/?error=no_github_config`, 302);
  }
  const base = env.BASE_URL || "https://comethosting.uk";
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    scope: "repo user",
    redirect_uri: `${base}/auth/github/callback`
  });
  return Response.redirect(`https://github.com/login/oauth/authorize?${params}`, 302);
}

async function handleGithubCallback(request, env) {
  const base = env.BASE_URL || "https://comethosting.uk";
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) return Response.redirect(`${base}/?error=oauth_denied`, 302);

  try {
    // Exchange code for token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${base}/auth/github/callback`
      })
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) return Response.redirect(`${base}/?error=token_failed`, 302);

    // Get GitHub user
    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${tokenData.access_token}`, "User-Agent": "Comet-Worker" }
    });
    const ghUser = await userRes.json();
    if (!ghUser.id) return Response.redirect(`${base}/?error=user_fetch_failed`, 302);

    // Store user in KV
    const userId = `gh_${ghUser.id}`;
    const existing = await kvGet(env, `user:${userId}`) || {};
    await kvSet(env, `user:${userId}`, {
      id: userId,
      username: ghUser.login,
      name: ghUser.name || ghUser.login,
      avatar: ghUser.avatar_url,
      email: ghUser.email || "",
      accessToken: tokenData.access_token,
      createdAt: existing.createdAt || new Date().toISOString()
    });

    // Create session
    const sessionUser = { id: userId, username: ghUser.login, avatar: ghUser.avatar_url, name: ghUser.name || ghUser.login };
    const token = await createSession(sessionUser, env.SESSION_SECRET || "comet-default-secret");

    return new Response(null, {
      status: 302,
      headers: {
        Location: `${base}/dashboard`,
        "Set-Cookie": setSessionCookie(token, base)
      }
    });
  } catch (err) {
    console.error("OAuth error:", err);
    return Response.redirect(`${base}/?error=oauth_failed`, 302);
  }
}

function handleLogout(request) {
  return new Response(null, {
    status: 302,
    headers: { Location: "/", "Set-Cookie": clearSessionCookie() }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// API ROUTES
// ─────────────────────────────────────────────────────────────────────────────

async function apiMe(request, env) {
  const user = await getUser(request, env);
  return jsonResponse({ user: user || null });
}

async function apiRepos(request, env) {
  const user = await getUser(request, env);
  if (!user) return jsonResponse({ error: "Not authenticated" }, 401);
  const userData = await kvGet(env, `user:${user.id}`);
  if (!userData?.accessToken) return jsonResponse({ error: "No access token" }, 401);
  try {
    const r = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner", {
      headers: { Authorization: `Bearer ${userData.accessToken}`, "User-Agent": "Comet-Worker" }
    });
    const repos = await r.json();
    if (!Array.isArray(repos)) return jsonResponse({ error: "GitHub API error" }, 502);
    return jsonResponse(repos.map(repo => ({
      id: repo.id, name: repo.name, fullName: repo.full_name,
      description: repo.description, language: repo.language,
      url: repo.clone_url, updatedAt: repo.updated_at,
      private: repo.private, defaultBranch: repo.default_branch
    })));
  } catch (err) {
    return jsonResponse({ error: "Failed to fetch repos" }, 500);
  }
}

// Deployments (stored in KV, no actual build engine — UI only for now)
async function apiGetDeployments(request, env) {
  const user = await getUser(request, env);
  if (!user) return jsonResponse({ error: "Not authenticated" }, 401);
  const deployments = await kvGet(env, `deployments:${user.id}`) || [];
  return jsonResponse(deployments);
}

async function apiAddDeployment(request, env) {
  const user = await getUser(request, env);
  if (!user) return jsonResponse({ error: "Not authenticated" }, 401);
  const body = await request.json();
  const { repoName, repoUrl, branch = "main", note = "" } = body;
  if (!repoName || !repoUrl) return jsonResponse({ error: "Missing fields" }, 400);

  const deployments = await kvGet(env, `deployments:${user.id}`) || [];
  const id = `${user.username}-${repoName}`.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const newDep = {
    id, repoName, repoUrl, branch, note,
    status: "pending",
    url: `https://${id}.comethosting.uk`,
    createdAt: new Date().toISOString()
  };
  deployments.unshift(newDep);
  await kvSet(env, `deployments:${user.id}`, deployments);
  return jsonResponse(newDep);
}

async function apiDeleteDeployment(request, env, id) {
  const user = await getUser(request, env);
  if (!user) return jsonResponse({ error: "Not authenticated" }, 401);
  const deployments = await kvGet(env, `deployments:${user.id}`) || [];
  await kvSet(env, `deployments:${user.id}`, deployments.filter(d => d.id !== id));
  return jsonResponse({ ok: true });
}

// DNS Records
async function apiGetDns(request, env) {
  const user = await getUser(request, env);
  if (!user) return jsonResponse({ error: "Not authenticated" }, 401);
  const records = await kvGet(env, `dns:${user.id}`) || [];
  return jsonResponse(records);
}

async function apiAddDns(request, env) {
  const user = await getUser(request, env);
  if (!user) return jsonResponse({ error: "Not authenticated" }, 401);
  const body = await request.json();
  const { type, name, value, port, proxied = true, note = "" } = body;
  if (!type || !name || !value) return jsonResponse({ error: "Missing fields: type, name, value required" }, 400);

  const records = await kvGet(env, `dns:${user.id}`) || [];
  const id = crypto.randomUUID();
  const record = {
    id, type: type.toUpperCase(), name: name.toLowerCase().trim(),
    value: value.trim(), port: port || null,
    proxied, note, status: "active",
    createdAt: new Date().toISOString()
  };
  records.unshift(record);
  await kvSet(env, `dns:${user.id}`, records);
  return jsonResponse(record);
}

async function apiDeleteDns(request, env, id) {
  const user = await getUser(request, env);
  if (!user) return jsonResponse({ error: "Not authenticated" }, 401);
  const records = await kvGet(env, `dns:${user.id}`) || [];
  await kvSet(env, `dns:${user.id}`, records.filter(r => r.id !== id));
  return jsonResponse({ ok: true });
}

async function apiTestDns(request, env, id) {
  const user = await getUser(request, env);
  if (!user) return jsonResponse({ error: "Not authenticated" }, 401);
  const records = await kvGet(env, `dns:${user.id}`) || [];
  const record = records.find(r => r.id === id);
  if (!record) return jsonResponse({ error: "Record not found" }, 404);

  // Try to resolve the domain by fetching it
  try {
    const testUrl = `https://${record.name}`;
    const res = await fetch(testUrl, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(5000) });
    return jsonResponse({ ok: true, status: res.status, reachable: true });
  } catch {
    return jsonResponse({ ok: false, reachable: false, message: "Domain not reachable yet — DNS may still be propagating." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML PAGES
// ─────────────────────────────────────────────────────────────────────────────

function htmlResponse(html, status = 200, extra = {}) {
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", ...extra }
  });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

async function serveIndex(request, env) {
  const user = await getUser(request, env);
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  const errors = {
    no_github_config: "GitHub OAuth is not configured.",
    oauth_denied: "GitHub login was cancelled.",
    token_failed: "Could not get GitHub access token. Check your OAuth app settings.",
    oauth_failed: "GitHub login failed. Please try again.",
    user_fetch_failed: "Could not fetch your GitHub profile."
  };
  const errorHtml = error ? `<div class="err-bar">${errors[error] || "Something went wrong."}</div>` : "";
  const navRight = user
    ? `<a href="/dashboard" class="n-fire">Dashboard →</a>`
    : `<a href="/auth/github" class="n-ghost">Log in</a><a href="/auth/github" class="n-fire">Get started free</a>`;

  return htmlResponse(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Comet — Deploy at the speed of light</title>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
:root{--ink:#07070e;--ink2:#0d0d1a;--ink3:#121220;--card:#17172a;--rim:rgba(255,255,255,0.06);--rim2:rgba(255,255,255,0.11);--fire:#ff5c00;--fire2:#ff8040;--fire3:#ffb380;--ice:#00d4ff;--lime:#a8ff3e;--text:#eeeeff;--sub:#7a7a9a;--d:'Syne',sans-serif;--b:'DM Sans',sans-serif;}
html{scroll-behavior:smooth;}
body{font-family:var(--b);background:var(--ink);color:var(--text);overflow-x:hidden;}
.orb{position:fixed;border-radius:50%;pointer-events:none;z-index:0;filter:blur(130px);opacity:0.18;}
.orb.a{width:600px;height:600px;background:var(--fire);top:-200px;right:-150px;animation:drift 18s ease-in-out infinite;}
.orb.b{width:500px;height:500px;background:var(--ice);bottom:-150px;left:-100px;animation:drift 22s ease-in-out infinite reverse;}
@keyframes drift{0%,100%{transform:translate(0,0);}50%{transform:translate(40px,30px);}}
nav{position:sticky;top:0;z-index:100;display:flex;align-items:center;padding:0 2rem;height:56px;border-bottom:1px solid var(--rim);background:rgba(7,7,14,0.9);backdrop-filter:blur(20px);}
.logo{font-family:var(--d);font-size:1.25rem;font-weight:800;color:var(--text);text-decoration:none;display:flex;align-items:center;gap:7px;letter-spacing:-0.01em;}
.nl{display:flex;gap:0.2rem;margin-left:2rem;list-style:none;}
.nl a{color:var(--sub);text-decoration:none;font-size:0.83rem;padding:0.35rem 0.8rem;border-radius:6px;transition:all .15s;font-weight:500;}
.nl a:hover{color:var(--text);background:var(--rim);}
.nr{margin-left:auto;display:flex;gap:0.6rem;align-items:center;}
.n-ghost{background:none;border:1px solid var(--rim2);color:var(--text);padding:0.38rem 0.9rem;border-radius:7px;font-size:0.81rem;font-weight:500;cursor:pointer;font-family:var(--b);text-decoration:none;transition:all .2s;}
.n-ghost:hover{background:var(--rim);}
.n-fire{background:var(--fire);color:white;padding:0.4rem 1rem;border-radius:7px;font-size:0.81rem;font-weight:600;cursor:pointer;font-family:var(--b);text-decoration:none;border:none;transition:all .2s;box-shadow:0 0 16px rgba(255,92,0,0.3);}
.n-fire:hover{background:var(--fire2);}
.hero{position:relative;z-index:1;min-height:90vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4rem 2rem 3rem;text-align:center;overflow:hidden;}
.hgrid{position:absolute;inset:0;background-image:linear-gradient(var(--rim) 1px,transparent 1px),linear-gradient(90deg,var(--rim) 1px,transparent 1px);background-size:64px 64px;pointer-events:none;mask-image:radial-gradient(ellipse 80% 80% at 50% 50%,black 20%,transparent 100%);}
.streak{position:absolute;top:22%;right:8%;width:220px;height:2px;background:linear-gradient(90deg,transparent,var(--fire),white);border-radius:999px;animation:sm 5s ease-in-out infinite;opacity:0.6;}
.streak::after{content:'';position:absolute;right:0;top:-4px;width:10px;height:10px;background:white;border-radius:50%;box-shadow:0 0 10px white,0 0 22px var(--fire);}
.streak.s2{top:66%;left:5%;width:140px;animation-delay:2.5s;animation-duration:7s;}
@keyframes sm{0%{opacity:0;transform:translateX(80px);}15%{opacity:0.6;}85%{opacity:0.6;}100%{opacity:0;transform:translateX(-320px);}}
.tag{display:inline-flex;align-items:center;gap:7px;background:rgba(255,92,0,0.1);border:1px solid rgba(255,92,0,0.25);color:var(--fire3);padding:0.28rem 0.9rem;border-radius:999px;font-size:0.7rem;font-weight:600;margin-bottom:1.8rem;letter-spacing:0.09em;text-transform:uppercase;}
.tdot{width:6px;height:6px;background:var(--fire);border-radius:50%;animation:tp 2s infinite;}
@keyframes tp{0%,100%{opacity:1;}50%{opacity:0.3;}}
h1{font-family:var(--d);font-size:clamp(3rem,8vw,6.2rem);font-weight:800;line-height:0.95;letter-spacing:-0.04em;margin-bottom:1.4rem;}
h1 em{font-style:normal;display:block;background:linear-gradient(90deg,var(--fire),var(--ice));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.hsub{font-size:1.02rem;color:var(--sub);line-height:1.75;max-width:480px;margin:0 auto 2.5rem;font-weight:300;}
.hbtns{display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;margin-bottom:3.5rem;}
.btn-main{background:linear-gradient(135deg,var(--fire),#c93800);color:white;padding:0.9rem 2.2rem;border-radius:10px;font-size:0.96rem;font-weight:600;text-decoration:none;border:none;cursor:pointer;font-family:var(--b);transition:all .2s;box-shadow:0 4px 28px rgba(255,92,0,0.35);display:inline-flex;align-items:center;gap:9px;}
.btn-main:hover{transform:translateY(-2px);box-shadow:0 8px 36px rgba(255,92,0,0.5);}
.btn-plain{background:var(--card);color:var(--text);padding:0.9rem 2.2rem;border-radius:10px;font-size:0.96rem;font-weight:500;text-decoration:none;border:1px solid var(--rim2);cursor:pointer;font-family:var(--b);transition:all .2s;}
.btn-plain:hover{background:var(--ink3);}
.err-bar{background:rgba(255,92,0,0.1);border:1px solid rgba(255,92,0,0.25);color:var(--fire3);padding:0.7rem 1.2rem;border-radius:8px;font-size:0.83rem;margin-bottom:1.5rem;max-width:420px;}
.term{width:100%;max-width:640px;margin:0 auto;background:var(--ink2);border:1px solid var(--rim2);border-radius:14px;overflow:hidden;box-shadow:0 40px 100px rgba(0,0,0,0.8);}
.tbar{background:var(--ink3);padding:0.72rem 1rem;display:flex;align-items:center;gap:6px;border-bottom:1px solid var(--rim);}
.dot{width:10px;height:10px;border-radius:50%;}.dot.r{background:#ff5f57;}.dot.y{background:#febc2e;}.dot.g{background:#28c840;}
.ttitle{font-size:0.7rem;color:var(--sub);margin:0 auto;font-family:monospace;}
.tbody{padding:1.3rem 1.5rem;font-family:monospace;font-size:0.79rem;line-height:2.05;text-align:left;}
.p{color:var(--fire3);}.c{color:var(--text);}.ok{color:var(--lime);}.m{color:var(--sub);}.lk{color:#67e8f9;}
.cur{display:inline-block;width:7px;height:13px;background:var(--fire);vertical-align:middle;animation:cur 1s infinite;}
@keyframes cur{0%,100%{opacity:1;}50%{opacity:0;}}
.sbar{position:relative;z-index:1;padding:1.4rem 0;border-top:1px solid var(--rim);border-bottom:1px solid var(--rim);background:var(--ink2);}
.slabel{font-size:0.66rem;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:var(--sub);margin-bottom:0.8rem;text-align:center;}
.srow{display:flex;justify-content:center;gap:2.5rem;flex-wrap:wrap;padding:0 2rem;}
.sp{color:var(--sub);font-size:0.82rem;font-weight:500;}
.feats{position:relative;z-index:1;padding:5.5rem 2rem;max-width:1100px;margin:0 auto;}
.ey{font-size:0.66rem;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:var(--fire);margin-bottom:0.5rem;}
.sh{font-family:var(--d);font-size:clamp(1.8rem,3.5vw,2.7rem);font-weight:800;letter-spacing:-0.03em;line-height:1.1;margin-bottom:0.7rem;}
.ss{color:var(--sub);font-size:0.94rem;line-height:1.7;max-width:450px;margin-bottom:3rem;font-weight:300;}
.fg{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--rim);border:1px solid var(--rim);border-radius:16px;overflow:hidden;}
.fc{background:var(--ink2);padding:1.8rem;transition:background .2s;}
.fc:hover{background:var(--ink3);}
.fc.ac{background:linear-gradient(135deg,rgba(255,92,0,0.07),rgba(0,212,255,0.03));}
.fi{font-size:1.4rem;margin-bottom:0.85rem;}
.fc h3{font-family:var(--d);font-size:0.95rem;font-weight:700;margin-bottom:0.3rem;}
.fc p{font-size:0.81rem;color:var(--sub);line-height:1.65;font-weight:300;}
.how{position:relative;z-index:1;padding:4.5rem 2rem;background:var(--ink2);border-top:1px solid var(--rim);border-bottom:1px solid var(--rim);}
.hi{max-width:960px;margin:0 auto;}
.steps{display:grid;grid-template-columns:repeat(4,1fr);gap:1.5rem;margin-top:2.8rem;position:relative;}
.steps::before{content:'';position:absolute;top:22px;left:14%;right:14%;height:1px;background:linear-gradient(90deg,transparent,var(--fire),var(--ice),transparent);}
.step{text-align:center;padding:1rem;}
.sn{width:44px;height:44px;border-radius:50%;background:var(--ink3);border:1px solid var(--rim2);display:flex;align-items:center;justify-content:center;font-family:var(--d);font-size:0.9rem;font-weight:800;margin:0 auto 0.8rem;position:relative;z-index:1;color:var(--fire);}
.step h4{font-family:var(--d);font-size:0.9rem;font-weight:700;margin-bottom:0.3rem;}
.step p{font-size:0.78rem;color:var(--sub);line-height:1.6;font-weight:300;}
.pricing{position:relative;z-index:1;padding:5.5rem 2rem;max-width:960px;margin:0 auto;}
.pg{display:grid;grid-template-columns:repeat(3,1fr);gap:1.2rem;margin-top:2.8rem;}
.plan{background:var(--ink2);border:1px solid var(--rim);border-radius:16px;padding:1.8rem;position:relative;}
.plan.pop{border-color:var(--fire);}
.pbadge{position:absolute;top:-11px;left:50%;transform:translateX(-50%);background:var(--fire);color:white;font-size:0.65rem;font-weight:700;padding:0.18rem 0.75rem;border-radius:999px;white-space:nowrap;letter-spacing:0.08em;text-transform:uppercase;}
.pname{font-size:0.7rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--sub);margin-bottom:0.45rem;}
.pprice{font-family:var(--d);font-size:2.3rem;font-weight:800;letter-spacing:-0.03em;margin-bottom:0.25rem;}
.pprice sub{font-size:0.95rem;font-weight:400;color:var(--sub);vertical-align:middle;}
.pdesc{font-size:0.8rem;color:var(--sub);margin-bottom:1.4rem;line-height:1.5;font-weight:300;}
.pf{list-style:none;margin-bottom:1.6rem;display:flex;flex-direction:column;gap:0.45rem;}
.pf li{font-size:0.81rem;display:flex;gap:7px;align-items:flex-start;}
.pf .y{color:var(--lime);flex-shrink:0;font-weight:700;}
.pf .n{color:#2a2a3a;flex-shrink:0;}
.pbtn{width:100%;padding:0.72rem;border-radius:8px;font-size:0.86rem;font-weight:600;cursor:pointer;font-family:var(--b);transition:all .2s;border:1px solid var(--rim2);background:var(--ink3);color:var(--text);}
.pbtn:hover{background:var(--card);}
.plan.pop .pbtn{background:var(--fire);color:white;border-color:var(--fire);box-shadow:0 4px 16px rgba(255,92,0,0.28);}
.plan.pop .pbtn:hover{background:var(--fire2);}
.cta{position:relative;z-index:1;padding:5.5rem 2rem;text-align:center;}
.cta::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(255,92,0,0.08) 0%,transparent 65%);pointer-events:none;}
.cta-inner{position:relative;z-index:1;max-width:540px;margin:0 auto;}
.cta-inner h2{font-family:var(--d);font-size:clamp(2rem,5vw,3.2rem);font-weight:800;letter-spacing:-0.03em;margin-bottom:0.9rem;line-height:1.05;}
.cta-inner p{color:var(--sub);font-size:0.95rem;margin-bottom:2rem;line-height:1.7;font-weight:300;}
footer{border-top:1px solid var(--rim);background:var(--ink);padding:2.5rem 2rem 1.8rem;position:relative;z-index:1;}
.fi2{max-width:1060px;margin:0 auto;}
.fgrid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:2.5rem;margin-bottom:2rem;}
.fbrand .fl{font-family:var(--d);font-size:1.1rem;font-weight:800;color:var(--text);display:flex;align-items:center;gap:6px;margin-bottom:0.7rem;text-decoration:none;}
.fbrand p{font-size:0.8rem;color:var(--sub);line-height:1.7;max-width:220px;font-weight:300;}
.fc2 h4{font-size:0.68rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--text);margin-bottom:0.9rem;}
.fc2 a{display:block;font-size:0.8rem;color:var(--sub);text-decoration:none;margin-bottom:0.4rem;transition:color .15s;font-weight:300;}
.fc2 a:hover{color:var(--text);}
.fbot{border-top:1px solid var(--rim);padding-top:1.2rem;display:flex;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;font-size:0.75rem;color:var(--sub);}
@media(max-width:768px){.fg,.steps,.pg,.fgrid{grid-template-columns:1fr;}.nl{display:none;}.steps::before{display:none;}.fgrid{grid-template-columns:1fr 1fr;}}
</style>
</head>
<body>
<div class="orb a"></div><div class="orb b"></div>
<nav>
  <a href="/" class="logo">☄️ Comet</a>
  <ul class="nl"><li><a href="#features">Features</a></li><li><a href="#how">How it works</a></li><li><a href="#pricing">Pricing</a></li></ul>
  <div class="nr">${navRight}</div>
</nav>
<section class="hero">
  <div class="hgrid"></div>
  <div class="streak"></div><div class="streak s2"></div>
  <div class="tag"><span class="tdot"></span>Real subdomains on comethosting.uk</div>
  <h1>Deploy at the<em>speed of light.</em></h1>
  <p class="hsub">Connect your GitHub. Pick a repo. Get a live URL on comethosting.uk in under 60 seconds. No config. No DevOps.</p>
  ${errorHtml}
  <div class="hbtns">
    <a href="/auth/github" class="btn-main"><svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>Deploy with GitHub</a>
    <a href="#how" class="btn-plain">See how it works</a>
  </div>
  <div class="term">
    <div class="tbar"><div class="dot r"></div><div class="dot y"></div><div class="dot g"></div><div class="ttitle">comet — terminal</div></div>
    <div class="tbody">
      <div><span class="p">$</span> <span class="c">comet deploy my-portfolio</span></div>
      <div class="m">🔗 Authenticating with GitHub...</div>
      <div class="m">📦 Cloning <span class="c">my-portfolio</span>...</div>
      <div class="m">🔍 Detected: <span class="c">Static HTML</span></div>
      <div class="ok">✓ Build complete <span class="m">(8.4s)</span></div>
      <div class="ok">✓ Health check passed</div>
      <div class="lk">🌠 Live → https://yourname-my-portfolio.comethosting.uk</div>
      <div><span class="p">$</span> <span class="cur"></span></div>
    </div>
  </div>
</section>
<div class="sbar"><div class="slabel">Works with every stack</div><div class="srow"><div class="sp">🟢 Node.js</div><div class="sp">🐍 Python</div><div class="sp">⚛️ React</div><div class="sp">💚 Vue</div><div class="sp">🌐 Static HTML</div><div class="sp">🔷 TypeScript</div><div class="sp">🐹 Go</div><div class="sp">🐳 Docker</div></div></div>
<section class="feats" id="features">
  <div class="ey">Built different</div>
  <div class="sh">Everything you need.</div>
  <p class="ss">Comet handles the boring stuff so you can focus on shipping.</p>
  <div class="fg">
    <div class="fc ac"><div class="fi">🚀</div><h3>Git-based deploys</h3><p>Connect GitHub, pick a repo, deploy in one click. Auto-detects your runtime.</p></div>
    <div class="fc"><div class="fi">🌐</div><h3>Real subdomains</h3><p>Every deployment gets a live URL on comethosting.uk instantly.</p></div>
    <div class="fc"><div class="fi">🔒</div><h3>SSL everywhere</h3><p>Every site and custom domain gets HTTPS automatically. Always.</p></div>
    <div class="fc"><div class="fi">🔗</div><h3>Custom domains</h3><p>Add your own domain with our DNS manager. Step-by-step instructions included.</p></div>
    <div class="fc"><div class="fi">📋</div><h3>DNS records manager</h3><p>Add, remove and test DNS records for your domains right from the dashboard.</p></div>
    <div class="fc ac"><div class="fi">↩️</div><h3>One-click redeploy</h3><p>Redeploy any project from the dashboard in seconds.</p></div>
  </div>
</section>
<section class="how" id="how">
  <div class="hi">
    <div class="ey">Simple by design</div>
    <div class="sh">Live in 4 steps</div>
    <p class="ss" style="margin-bottom:0">No YAML. No Kubernetes. No headaches.</p>
    <div class="steps">
      <div class="step"><div class="sn">1</div><h4>Sign in with GitHub</h4><p>One click via OAuth. We never store your password.</p></div>
      <div class="step"><div class="sn">2</div><h4>Pick a repo</h4><p>See all your GitHub repos. Choose one to deploy.</p></div>
      <div class="step"><div class="sn">3</div><h4>We build it</h4><p>We clone, detect the runtime, and launch your site.</p></div>
      <div class="step"><div class="sn">4</div><h4>You go live</h4><p>Get a real comethosting.uk URL. Add your own domain anytime.</p></div>
    </div>
  </div>
</section>
<section class="pricing" id="pricing">
  <div class="ey">Pricing</div>
  <div class="sh">Start free. Scale later.</div>
  <p class="ss">No card needed to get started.</p>
  <div class="pg">
    <div class="plan"><div class="pname">Hobby</div><div class="pprice">Free</div><div class="pdesc">Personal projects and experiments.</div><ul class="pf"><li><span class="y">✓</span>3 deployments</li><li><span class="y">✓</span>comethosting.uk subdomain</li><li><span class="y">✓</span>Free SSL</li><li><span class="y">✓</span>DNS manager</li><li><span class="n">✗</span>Custom domains</li><li><span class="n">✗</span>Priority builds</li></ul><button class="pbtn" onclick="location.href='/auth/github'">Get started free</button></div>
    <div class="plan pop"><div class="pbadge">Most popular</div><div class="pname">Pro</div><div class="pprice">£8<sub>/mo</sub></div><div class="pdesc">For real projects that need to stay up.</div><ul class="pf"><li><span class="y">✓</span>Unlimited deployments</li><li><span class="y">✓</span>Custom domains</li><li><span class="y">✓</span>Priority builds</li><li><span class="y">✓</span>Full DNS manager</li><li><span class="y">✓</span>99.9% uptime SLA</li><li><span class="y">✓</span>Email support</li></ul><button class="pbtn" onclick="location.href='/auth/github'">Start Pro trial</button></div>
    <div class="plan"><div class="pname">Team</div><div class="pprice">£24<sub>/mo</sub></div><div class="pdesc">Collaborate and ship together.</div><ul class="pf"><li><span class="y">✓</span>Everything in Pro</li><li><span class="y">✓</span>Team members</li><li><span class="y">✓</span>Shared deployments</li><li><span class="y">✓</span>DDoS protection</li><li><span class="y">✓</span>99.99% uptime SLA</li><li><span class="y">✓</span>Live chat support</li></ul><button class="pbtn" onclick="location.href='/auth/github'">Start Team trial</button></div>
  </div>
</section>
<section class="cta"><div class="cta-inner"><h2>Ready to launch?</h2><p>Connect your GitHub and deploy in under 60 seconds. No credit card needed.</p><a href="/auth/github" class="btn-main" style="display:inline-flex;margin:0 auto"><svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>Deploy with GitHub — free</a></div></section>
<footer><div class="fi2"><div class="fgrid"><div class="fbrand"><a href="/" class="fl">☄️ Comet</a><p>The fastest way to deploy GitHub projects. Built for developers who ship.</p></div><div class="fc2"><h4>Product</h4><a href="#">Deployments</a><a href="#">DNS Manager</a><a href="#">Custom Domains</a><a href="#pricing">Pricing</a></div><div class="fc2"><h4>Resources</h4><a href="#">Docs</a><a href="#">Status</a><a href="#">Community</a></div><div class="fc2"><h4>Company</h4><a href="#">About</a><a href="#">Privacy</a><a href="#">Terms</a></div></div><div class="fbot"><span>© 2025 Comet · comethosting.uk</span><span>Built for developers who move fast ☄️</span></div></div></footer>
</body></html>`);
}

async function serveDashboard(request, env) {
  const user = await getUser(request, env);
  if (!user) {
    return new Response(null, { status: 302, headers: { Location: "/?error=not_logged_in" } });
  }
  return htmlResponse(dashboardHtml(user));
}

function dashboardHtml(user) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Dashboard — Comet</title>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
:root{--ink:#07070e;--ink2:#0d0d1a;--ink3:#121220;--card:#17172a;--s:#1c1c30;--s2:#222238;--rim:rgba(255,255,255,0.06);--rim2:rgba(255,255,255,0.11);--fire:#ff5c00;--fire2:#ff8040;--fire3:#ffb380;--ice:#00d4ff;--lime:#a8ff3e;--red:#ff4444;--yellow:#ffcc00;--text:#eeeeff;--sub:#7a7a9a;--d:'Syne',sans-serif;--b:'DM Sans',sans-serif;}
html,body{height:100%;font-family:var(--b);background:var(--ink);color:var(--text);}
.app{display:grid;grid-template-columns:210px 1fr;grid-template-rows:56px 1fr;min-height:100vh;}
/* TOPBAR */
.tb{grid-column:1/-1;background:rgba(7,7,14,0.95);border-bottom:1px solid var(--rim);display:flex;align-items:center;padding:0 1.5rem;gap:1rem;position:sticky;top:0;z-index:50;}
.tbl{font-family:var(--d);font-size:1.15rem;font-weight:800;color:var(--text);text-decoration:none;display:flex;align-items:center;gap:6px;margin-right:0.5rem;}
.tbr{margin-left:auto;display:flex;align-items:center;gap:0.8rem;}
.upill{display:flex;align-items:center;gap:7px;background:var(--s);border:1px solid var(--rim);border-radius:8px;padding:0.3rem 0.7rem;font-size:0.82rem;font-weight:500;}
.uav{width:22px;height:22px;border-radius:50%;object-fit:cover;}
.lo{color:var(--sub);font-size:0.8rem;text-decoration:none;transition:color .2s;}
.lo:hover{color:var(--text);}
/* SIDEBAR */
.sb{background:var(--ink2);border-right:1px solid var(--rim);padding:1rem 0.65rem;display:flex;flex-direction:column;gap:2px;}
.sbl{font-size:0.63rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--sub);padding:0.35rem 0.7rem;margin-top:0.5rem;}
.sb a{display:flex;align-items:center;gap:8px;padding:0.55rem 0.7rem;border-radius:7px;font-size:0.83rem;font-weight:500;color:var(--sub);text-decoration:none;transition:all .15s;}
.sb a:hover,.sb a.act{background:var(--s);color:var(--text);}
.sb a.act{color:var(--fire);}
/* MAIN */
main{padding:1.8rem;overflow-y:auto;}
.page{display:none;}.page.on{display:block;}
/* PAGE HEADER */
.ph{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:1.8rem;flex-wrap:wrap;gap:1rem;}
.ptitle{font-family:var(--d);font-size:1.5rem;font-weight:800;letter-spacing:-0.02em;margin-bottom:0.15rem;}
.psub{font-size:0.84rem;color:var(--sub);}
/* BUTTONS */
.btn-fire{background:var(--fire);color:white;padding:0.55rem 1.2rem;border-radius:8px;font-size:0.84rem;font-weight:600;cursor:pointer;font-family:var(--b);border:none;transition:all .2s;display:flex;align-items:center;gap:5px;}
.btn-fire:hover{background:var(--fire2);}
.btn-act{background:var(--s);border:1px solid var(--rim);color:var(--text);padding:0.35rem 0.75rem;border-radius:6px;font-size:0.76rem;font-weight:500;cursor:pointer;font-family:var(--b);transition:all .15s;}
.btn-act:hover{background:var(--s2);border-color:var(--rim2);}
.btn-act.danger:hover{background:rgba(255,68,68,0.1);border-color:rgba(255,68,68,0.3);color:var(--red);}
.btn-act.success:hover{background:rgba(168,255,62,0.1);border-color:rgba(168,255,62,0.3);color:var(--lime);}
/* DEPLOY CARDS */
.dcards{display:flex;flex-direction:column;gap:0.85rem;}
.dcard{background:var(--ink2);border:1px solid var(--rim);border-radius:12px;padding:1.2rem 1.4rem;display:flex;align-items:center;gap:1.1rem;transition:border-color .2s;}
.dcard:hover{border-color:var(--rim2);}
.sdot{width:9px;height:9px;border-radius:50%;flex-shrink:0;}
.sdot.running{background:var(--lime);box-shadow:0 0 6px var(--lime);}
.sdot.pending{background:var(--yellow);animation:bp 1s infinite;}
.sdot.failed,.sdot.stopped{background:var(--red);}
@keyframes bp{0%,100%{opacity:1;}50%{opacity:0.3;}}
.dinfo{flex:1;min-width:0;}
.dname{font-family:var(--d);font-size:0.95rem;font-weight:700;margin-bottom:0.18rem;display:flex;align-items:center;gap:8px;}
.dbadge{font-size:0.63rem;font-weight:700;padding:0.15rem 0.5rem;border-radius:4px;text-transform:uppercase;letter-spacing:0.06em;}
.dbadge.running{background:rgba(168,255,62,0.12);color:var(--lime);}
.dbadge.pending{background:rgba(255,204,0,0.12);color:var(--yellow);}
.dbadge.failed,.dbadge.stopped{background:rgba(255,68,68,0.12);color:var(--red);}
.durl{font-size:0.78rem;color:var(--ice);text-decoration:none;}
.durl:hover{text-decoration:underline;}
.dmeta{font-size:0.73rem;color:var(--sub);margin-top:0.15rem;}
.dacts{display:flex;gap:0.5rem;flex-shrink:0;flex-wrap:wrap;}
/* DNS TABLE */
.dns-table{width:100%;border-collapse:collapse;font-size:0.83rem;}
.dns-table th{text-align:left;padding:0.6rem 0.9rem;font-size:0.68rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--sub);border-bottom:1px solid var(--rim);}
.dns-table td{padding:0.75rem 0.9rem;border-bottom:1px solid var(--rim);vertical-align:middle;}
.dns-table tr:last-child td{border-bottom:none;}
.dns-table tr:hover td{background:rgba(255,255,255,0.015);}
.type-badge{display:inline-block;padding:0.15rem 0.5rem;border-radius:4px;font-size:0.68rem;font-weight:700;letter-spacing:0.06em;font-family:monospace;}
.type-A{background:rgba(255,92,0,0.12);color:var(--fire3);}
.type-CNAME{background:rgba(0,212,255,0.1);color:var(--ice);}
.type-TXT{background:rgba(168,255,62,0.1);color:var(--lime);}
.type-MX{background:rgba(168,85,247,0.12);color:#c084fc;}
.type-AAAA{background:rgba(255,92,0,0.08);color:var(--fire2);}
.type-NS{background:rgba(255,255,255,0.06);color:var(--sub);}
.dns-val{font-family:monospace;font-size:0.78rem;color:var(--sub);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.dns-port{font-family:monospace;font-size:0.78rem;color:var(--fire3);}
.proxied-on{color:var(--fire3);font-size:0.75rem;}
.proxied-off{color:var(--sub);font-size:0.75rem;}
.status-dot{width:7px;height:7px;border-radius:50%;display:inline-block;margin-right:5px;}
.status-dot.active{background:var(--lime);}
.status-dot.testing{background:var(--yellow);animation:bp 1s infinite;}
.status-dot.failed{background:var(--red);}
.table-wrap{background:var(--ink2);border:1px solid var(--rim);border-radius:12px;overflow:hidden;overflow-x:auto;}
/* FORM PANEL */
.form-box{background:var(--ink2);border:1px solid var(--rim);border-radius:12px;padding:1.4rem;margin-bottom:1.4rem;}
.form-box h3{font-family:var(--d);font-size:1rem;font-weight:700;margin-bottom:1.2rem;padding-bottom:0.7rem;border-bottom:1px solid var(--rim);}
.frow{display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;}
.frow3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.75rem;}
.fg2{margin-bottom:0.85rem;}
.fl{font-size:0.72rem;font-weight:600;color:var(--sub);margin-bottom:0.3rem;display:block;text-transform:uppercase;letter-spacing:0.06em;}
.fi2{width:100%;padding:0.65rem 0.85rem;background:var(--ink3);border:1px solid var(--rim);border-radius:7px;color:var(--text);font-family:var(--b);font-size:0.86rem;outline:none;transition:border .15s;}
.fi2:focus{border-color:var(--fire);}
select.fi2{cursor:pointer;}
.fi2.small{width:80px;}
.check-row{display:flex;align-items:center;gap:8px;font-size:0.84rem;color:var(--sub);}
.check-row input{width:16px;height:16px;cursor:pointer;accent-color:var(--fire);}
/* MODAL */
.mo{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.82);backdrop-filter:blur(4px);z-index:200;align-items:center;justify-content:center;padding:1rem;}
.mo.open{display:flex;}
.mc{background:var(--ink2);border:1px solid var(--rim2);border-radius:16px;width:100%;max-width:560px;max-height:82vh;display:flex;flex-direction:column;overflow:hidden;}
.mh{padding:1.2rem 1.5rem;border-bottom:1px solid var(--rim);display:flex;align-items:center;justify-content:space-between;}
.mh h2{font-family:var(--d);font-size:1.1rem;font-weight:800;}
.mx{background:none;border:none;color:var(--sub);font-size:1.2rem;cursor:pointer;line-height:1;padding:0.2rem;}
.mb{padding:1.3rem 1.5rem;overflow-y:auto;flex:1;}
.search-i{width:100%;padding:0.65rem 0.9rem;background:var(--ink3);border:1px solid var(--rim);border-radius:7px;color:var(--text);font-family:var(--b);font-size:0.86rem;outline:none;margin-bottom:0.9rem;}
.search-i:focus{border-color:var(--fire);}
.rlist{display:flex;flex-direction:column;gap:0.55rem;}
.ri{background:var(--s);border:1px solid var(--rim);border-radius:8px;padding:0.9rem 1.1rem;cursor:pointer;transition:all .15s;display:flex;align-items:center;justify-content:space-between;gap:1rem;}
.ri:hover{border-color:var(--fire);background:var(--s2);}
.ri h4{font-size:0.88rem;font-weight:600;margin-bottom:0.15rem;}
.ri p{font-size:0.75rem;color:var(--sub);}
.rlang{font-size:0.7rem;background:rgba(255,92,0,0.1);color:var(--fire3);padding:0.18rem 0.55rem;border-radius:4px;font-weight:600;white-space:nowrap;}
/* EMPTY */
.empty{text-align:center;padding:3.5rem 2rem;color:var(--sub);}
.empty-ic{font-size:2.5rem;margin-bottom:0.9rem;}
.empty h3{font-family:var(--d);font-size:1.1rem;font-weight:700;color:var(--text);margin-bottom:0.35rem;}
/* TOAST */
.toast{position:fixed;bottom:1.5rem;right:1.5rem;background:var(--s2);border:1px solid var(--rim2);border-radius:10px;padding:0.75rem 1.2rem;font-size:0.85rem;font-weight:500;z-index:1000;transition:all .3s;transform:translateY(0);opacity:1;}
.toast.hide{transform:translateY(20px);opacity:0;}
.toast.ok{border-left:3px solid var(--lime);color:var(--lime);}
.toast.err{border-left:3px solid var(--red);color:var(--red);}
/* INFO BOX */
.info-box{background:rgba(0,212,255,0.06);border:1px solid rgba(0,212,255,0.15);border-radius:8px;padding:1rem 1.2rem;font-size:0.82rem;color:#67e8f9;line-height:1.7;margin-bottom:1.2rem;}
.info-box strong{font-weight:600;color:var(--ice);}
@media(max-width:700px){.app{grid-template-columns:1fr;}.sb{display:none;}main{padding:1rem;}}
</style>
</head>
<body>
<div class="app">
<!-- TOPBAR -->
<header class="tb">
  <a href="/" class="tbl">☄️ Comet</a>
  <div class="tbr">
    <div class="upill"><img class="uav" id="uav" src="${user.avatar}" alt=""><span id="uname">${user.username}</span></div>
    <a href="/auth/logout" class="lo">Log out</a>
  </div>
</header>
<!-- SIDEBAR -->
<nav class="sb">
  <a href="#" class="act" onclick="pg('deployments',this)">🚀 Deployments</a>
  <a href="#" onclick="pg('repos',this)">📦 Repositories</a>
  <a href="#" onclick="pg('dns',this)">🌐 DNS Records</a>
  <div class="sbl">Account</div>
  <a href="#" onclick="pg('settings',this)">⚙️ Settings</a>
  <a href="/auth/logout" class="lo" style="display:flex;align-items:center;gap:8px;padding:0.55rem 0.7rem;border-radius:7px;font-size:0.83rem;font-weight:500;color:var(--sub);text-decoration:none;">👋 Log out</a>
</nav>
<!-- MAIN -->
<main>

<!-- DEPLOYMENTS -->
<div class="page on" id="p-deployments">
  <div class="ph">
    <div><div class="ptitle">Deployments</div><div class="psub">Your registered deployments on comethosting.uk</div></div>
    <button class="btn-fire" onclick="openDeployModal()">+ New deployment</button>
  </div>
  <div class="info-box">☄️ <strong>Note:</strong> Comet is running on Cloudflare Workers. Deployments are registered here and get a subdomain on <strong>comethosting.uk</strong>. To serve your actual site, you'll need to point that subdomain to your own server. <a href="#" onclick="pg('dns',null)" style="color:var(--ice)">Set up DNS →</a></div>
  <div class="dcards" id="dlist"><div class="empty"><div class="empty-ic">🌌</div><h3>No deployments yet</h3><p>Click "New deployment" to register a GitHub repo.</p></div></div>
</div>

<!-- REPOS -->
<div class="page" id="p-repos">
  <div class="ph"><div><div class="ptitle">Repositories</div><div class="psub">Your GitHub repositories</div></div><button class="btn-fire" onclick="loadRepos()">↻ Refresh</button></div>
  <div class="rlist" id="allrepos"><div class="empty"><div class="empty-ic">📦</div><h3>Loading repositories...</h3></div></div>
</div>

<!-- DNS RECORDS -->
<div class="page" id="p-dns">
  <div class="ph"><div><div class="ptitle">DNS Records</div><div class="psub">Manage custom domain routing for your deployments</div></div></div>

  <div class="form-box">
    <h3>➕ Add DNS Record</h3>
    <div class="frow3" style="margin-bottom:0.85rem">
      <div class="fg2"><label class="fl">Type</label>
        <select class="fi2" id="dns-type">
          <option>A</option><option>AAAA</option><option selected>CNAME</option>
          <option>TXT</option><option>MX</option><option>NS</option>
        </select>
      </div>
      <div class="fg2"><label class="fl">Name / Hostname</label><input class="fi2" id="dns-name" placeholder="e.g. myapp or myapp.comethosting.uk"></div>
      <div class="fg2"><label class="fl">Value / Target</label><input class="fi2" id="dns-value" placeholder="e.g. 1.2.3.4 or myserver.com"></div>
    </div>
    <div class="frow" style="margin-bottom:0.85rem">
      <div class="fg2"><label class="fl">Port (optional)</label><input class="fi2" id="dns-port" type="number" placeholder="e.g. 3000" min="1" max="65535"></div>
      <div class="fg2"><label class="fl">Note (optional)</label><input class="fi2" id="dns-note" placeholder="e.g. My portfolio site"></div>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem">
      <label class="check-row"><input type="checkbox" id="dns-proxied" checked> Proxied through Cloudflare (orange cloud)</label>
      <button class="btn-fire" onclick="addDns()">Add Record</button>
    </div>
  </div>

  <div class="table-wrap">
    <table class="dns-table">
      <thead><tr><th>Type</th><th>Name</th><th>Value</th><th>Port</th><th>Proxied</th><th>Status</th><th>Note</th><th>Actions</th></tr></thead>
      <tbody id="dns-tbody"><tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--sub)">Loading DNS records...</td></tr></tbody>
    </table>
  </div>
</div>

<!-- SETTINGS -->
<div class="page" id="p-settings">
  <div class="ptitle" style="margin-bottom:1.5rem">Settings</div>
  <div class="form-box" style="max-width:480px">
    <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.2rem">
      <img src="${user.avatar}" style="width:48px;height:48px;border-radius:50%" alt="">
      <div><div style="font-family:var(--d);font-size:1.05rem;font-weight:700">${user.name}</div><div style="font-size:0.82rem;color:var(--sub)">@${user.username}</div></div>
    </div>
    <div style="font-size:0.82rem;color:var(--sub);line-height:1.7">Connected via GitHub OAuth. Your GitHub access token is stored securely in Cloudflare KV and used only to fetch your repositories.</div>
  </div>
</div>

</main>
</div>

<!-- DEPLOY MODAL -->
<div class="mo" id="mo-deploy">
  <div class="mc">
    <div class="mh"><h2>Register a deployment</h2><button class="mx" onclick="closeMo('mo-deploy')">✕</button></div>
    <div class="mb">
      <input class="search-i" placeholder="Search repositories..." id="repo-search" oninput="filterRepos(this.value)">
      <div class="rlist" id="mo-repos"><div style="text-align:center;padding:1.5rem;color:var(--sub)">Loading your repos...</div></div>
    </div>
  </div>
</div>

<script>
let repos=[], dnsRecords=[], deployments=[];

async function init(){
  await loadDeployments();
  await loadRepos();
  await loadDns();
}

// ── PAGE NAV ──────────────────────────────────────────────────────────────────
function pg(name,el){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('on'));
  document.getElementById('p-'+name).classList.add('on');
  document.querySelectorAll('.sb a').forEach(a=>a.classList.remove('act'));
  if(el) el.classList.add('act');
}

// ── DEPLOYMENTS ───────────────────────────────────────────────────────────────
async function loadDeployments(){
  const r=await fetch('/api/deployments');
  deployments=await r.json();
  renderDeployments();
}
function renderDeployments(){
  const el=document.getElementById('dlist');
  if(!deployments.length){el.innerHTML='<div class="empty"><div class="empty-ic">🌌</div><h3>No deployments yet</h3><p>Click "New deployment" to register a GitHub repo.</p></div>';return;}
  el.innerHTML=deployments.map(d=>\`
    <div class="dcard">
      <div class="sdot \${d.status}"></div>
      <div class="dinfo">
        <div class="dname">\${d.repoName} <span class="dbadge \${d.status}">\${d.status}</span></div>
        <a href="\${d.url}" target="_blank" class="durl">\${d.url}</a>
        <div class="dmeta">Branch: \${d.branch} · Registered \${ago(d.createdAt)}\${d.note?' · '+d.note:''}</div>
      </div>
      <div class="dacts">
        <button class="btn-act" onclick="copyUrl('\${d.url}')">📋 Copy URL</button>
        <button class="btn-act danger" onclick="delDeploy('\${d.id}')">🗑 Delete</button>
      </div>
    </div>
  \`).join('');
}
function openDeployModal(){
  document.getElementById('mo-deploy').classList.add('open');
  renderModalRepos(repos);
}
async function registerDeploy(repo){
  closeMo('mo-deploy');
  const r=await fetch('/api/deployments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({repoName:repo.name,repoUrl:repo.url,branch:repo.defaultBranch||'main'})});
  const d=await r.json();
  if(d.id){toast('Deployment registered! ☄️','ok');await loadDeployments();}
  else toast('Failed: '+(d.error||'unknown'),'err');
}
async function delDeploy(id){
  if(!confirm('Delete this deployment?')) return;
  await fetch('/api/deployments/'+id,{method:'DELETE'});
  toast('Deployment deleted','ok');
  await loadDeployments();
}
function copyUrl(url){navigator.clipboard.writeText(url);toast('URL copied!','ok');}

// ── REPOS ─────────────────────────────────────────────────────────────────────
async function loadRepos(){
  const r=await fetch('/api/repos');
  if(!r.ok){repos=[];return;}
  repos=await r.json();
  renderAllRepos();
  renderModalRepos(repos);
}
function renderAllRepos(){
  const el=document.getElementById('allrepos');
  if(!repos.length){el.innerHTML='<div class="empty"><div class="empty-ic">📦</div><h3>No repos found</h3></div>';return;}
  el.innerHTML='<div class="rlist">'+repos.map(r=>repoHtml(r,true)).join('')+'</div>';
}
function repoHtml(r,deploy){
  return \`<div class="ri" \${deploy?'onclick="registerDeploy('+JSON.stringify(r).replace(/"/g,'&quot;')+')"':''}>
    <div><h4>\${r.name}\${r.private?' <span style="font-size:0.68rem;color:var(--sub);border:1px solid var(--rim);padding:0.1rem 0.4rem;border-radius:3px">private</span>':''}</h4><p>\${r.description||'No description'} · Updated \${ago(r.updatedAt)}</p></div>
    \${r.language?'<span class="rlang">'+r.language+'</span>':''}
  </div>\`;
}
function renderModalRepos(list){
  const el=document.getElementById('mo-repos');
  if(!list.length){el.innerHTML='<div style="text-align:center;padding:1.5rem;color:var(--sub)">No repos found</div>';return;}
  el.innerHTML=list.map(r=>repoHtml(r,true)).join('');
  el.querySelectorAll('.ri').forEach((item,i)=>{item.onclick=()=>registerDeploy(list[i]);});
}
function filterRepos(q){
  const f=repos.filter(r=>r.name.toLowerCase().includes(q.toLowerCase())||(r.description||'').toLowerCase().includes(q.toLowerCase()));
  renderModalRepos(f);
}

// ── DNS ───────────────────────────────────────────────────────────────────────
async function loadDns(){
  const r=await fetch('/api/dns');
  dnsRecords=await r.json();
  renderDns();
}
function renderDns(){
  const tb=document.getElementById('dns-tbody');
  if(!dnsRecords.length){tb.innerHTML='<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--sub)">No DNS records yet. Add one above.</td></tr>';return;}
  tb.innerHTML=dnsRecords.map(r=>\`
    <tr id="dnsrow-\${r.id}">
      <td><span class="type-badge type-\${r.type}">\${r.type}</span></td>
      <td style="font-family:monospace;font-size:0.8rem">\${r.name}</td>
      <td><div class="dns-val" title="\${r.value}">\${r.value}</div></td>
      <td>\${r.port?'<span class="dns-port">:'+r.port+'</span>':'<span style="color:var(--sub)">—</span>'}</td>
      <td>\${r.proxied?'<span class="proxied-on">🟠 On</span>':'<span class="proxied-off">⚪ Off</span>'}</td>
      <td><span class="status-dot \${r.status}"></span>\${r.status}</td>
      <td style="color:var(--sub);font-size:0.78rem">\${r.note||'—'}</td>
      <td>
        <div style="display:flex;gap:5px;flex-wrap:wrap">
          <button class="btn-act success" onclick="testDns('\${r.id}')">🔍 Test</button>
          <button class="btn-act danger" onclick="delDns('\${r.id}')">🗑</button>
        </div>
      </td>
    </tr>
  \`).join('');
}
async function addDns(){
  const type=document.getElementById('dns-type').value;
  const name=document.getElementById('dns-name').value.trim();
  const value=document.getElementById('dns-value').value.trim();
  const port=document.getElementById('dns-port').value;
  const note=document.getElementById('dns-note').value.trim();
  const proxied=document.getElementById('dns-proxied').checked;
  if(!name||!value){toast('Name and Value are required','err');return;}
  const r=await fetch('/api/dns',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type,name,value,port:port||null,note,proxied})});
  const d=await r.json();
  if(d.id){
    toast('DNS record added ✓','ok');
    document.getElementById('dns-name').value='';
    document.getElementById('dns-value').value='';
    document.getElementById('dns-port').value='';
    document.getElementById('dns-note').value='';
    await loadDns();
  } else toast('Failed: '+(d.error||'unknown'),'err');
}
async function delDns(id){
  if(!confirm('Delete this DNS record?')) return;
  await fetch('/api/dns/'+id,{method:'DELETE'});
  toast('Record deleted','ok');
  await loadDns();
}
async function testDns(id){
  const row=document.getElementById('dnsrow-'+id);
  const dot=row?.querySelector('.status-dot');
  if(dot){dot.className='status-dot testing';}
  const r=await fetch('/api/dns/'+id+'/test');
  const d=await r.json();
  if(d.reachable){toast('✓ Domain is reachable! (HTTP '+d.status+')','ok');}
  else toast('⚠ Not reachable yet — DNS may still be propagating.','err');
  await loadDns();
}

// ── MODAL ─────────────────────────────────────────────────────────────────────
function closeMo(id){document.getElementById(id).classList.remove('open');}
document.querySelectorAll('.mo').forEach(o=>{o.addEventListener('click',e=>{if(e.target===o)o.classList.remove('open');});});

// ── UTILS ─────────────────────────────────────────────────────────────────────
function ago(iso){
  const d=Date.now()-new Date(iso).getTime(),m=Math.floor(d/60000);
  if(m<2)return 'just now';if(m<60)return m+'m ago';
  const h=Math.floor(m/60);if(h<24)return h+'h ago';
  return Math.floor(h/24)+'d ago';
}
let toastT;
function toast(msg,type='ok'){
  let el=document.getElementById('toast-el');
  if(!el){el=document.createElement('div');el.id='toast-el';document.body.appendChild(el);}
  el.className='toast '+type;el.textContent=msg;
  clearTimeout(toastT);
  toastT=setTimeout(()=>el.classList.add('hide'),3000);
}

init();
</script>
</body></html>`;
}
