export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    const defaultScores = {
      WholeSchool: { y:0, r:0, b:0, g:0 },
      Y3: { y:0, r:0, b:0, g:0 },
      Y4: { y:0, r:0, b:0, g:0 },
      Y5: { y:0, r:0, b:0, g:0 },
      Y6: { y:0, r:0, b:0, g:0 },
    };

    let starData;
    try {
      const kv = await env.STARS_DB.get("tab_junior_scores");
      starData = kv ? JSON.parse(kv) : defaultScores;
    } catch { starData = defaultScores; }

    if (path === "/admin") {
      if (request.method === "POST") {
        const form = await request.formData();
        if (form.get("user") !== "admin" || form.get("pass") !== "cmstars") {
          return html(adminPage(starData, "❌ Wrong username or password."));
        }
        const keys = ["WholeSchool","Y3","Y4","Y5","Y6"];
        const newScores = {};
        keys.forEach(k => {
          newScores[k] = {
            y: Math.max(0, parseInt(form.get(`${k}_y`)||0,10)),
            r: Math.max(0, parseInt(form.get(`${k}_r`)||0,10)),
            b: Math.max(0, parseInt(form.get(`${k}_b`)||0,10)),
            g: Math.max(0, parseInt(form.get(`${k}_g`)||0,10)),
          };
        });
        await env.STARS_DB.put("tab_junior_scores", JSON.stringify(newScores));
        return html(adminPage(newScores, "✅ Scores saved!"));
      }
      return html(adminPage(starData, ""));
    }

    const view = url.searchParams.get("view") || "WholeSchool";
    const safe = ["WholeSchool","Y3","Y4","Y5","Y6"].includes(view) ? view : "WholeSchool";
    return html(racePage(safe, starData));
  }
};

// ─── RACE PAGE ────────────────────────────────────────────────────────────────
function racePage(view, starData) {
  const scores = starData[view] || { y:0, r:0, b:0, g:0 };
  const label  = view === "WholeSchool" ? "Whole School" : view.replace("Y","Year ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>TAB Community Stars — ${label}</title>
<link href="https://fonts.googleapis.com/css2?family=Bungee&family=Orbitron:wght@700;900&family=Rajdhani:wght@500;600;700&display=swap" rel="stylesheet">
<style>
*, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
:root {
  --y:#FFD700; --r:#E8000D; --b:#1E90FF; --g:#00C853;
  --yd:#b89b00; --rd:#a30009; --bd:#0a4a88; --gd:#006628;
}
body {
  background:#050508;
  font-family:'Rajdhani',sans-serif;
  color:white;
  overflow-x:hidden;
  min-height:100vh;
}

/* SCANLINES */
body::after {
  content:'';
  position:fixed; inset:0; z-index:9999; pointer-events:none;
  background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.03) 2px,rgba(0,0,0,0.03) 4px);
}

/* CREDIT */
.credit { position:fixed; bottom:8px; right:12px; font-size:.65rem; color:#333; font-family:monospace; z-index:200; }

/* NAV */
nav {
  background:#000;
  border-bottom:3px solid #e10600;
  padding:.65rem 1rem;
  display:flex; align-items:center; gap:6px; flex-wrap:wrap;
  position:relative;
}
.nav-logo { font-family:'Bungee'; font-size:.95rem; color:#e10600; margin-right:.75rem; letter-spacing:.05em; }
.nav-btn {
  color:#888; text-decoration:none; padding:5px 13px;
  background:#111; border-radius:5px; font-weight:700; font-size:.78rem;
  letter-spacing:.04em; text-transform:uppercase; border:1px solid #222; transition:all .15s;
}
.nav-btn:hover { background:#1a1a1a; color:white; }
.nav-btn.active { background:#e10600; color:white; border-color:#e10600; box-shadow:0 0 10px rgba(225,6,0,.4); }
.nav-admin { opacity:.2; margin-left:.5rem; }
.nav-admin:hover { opacity:.6; }

/* HEADER */
.header { text-align:center; padding:1.8rem 1rem .4rem; }
.f1-title {
  font-family:'Bungee';
  font-size:clamp(1.6rem,5vw,3rem);
  letter-spacing:.04em;
  text-shadow:0 0 24px rgba(225,6,0,.5);
  line-height:1; margin-bottom:.25rem;
}
.f1-sub { font-family:'Orbitron'; font-size:.68rem; color:#444; letter-spacing:.18em; text-transform:uppercase; }

/* START BTN */
.btn-wrap { text-align:center; padding:1.2rem 0 .4rem; }
#start-btn {
  font-family:'Bungee'; font-size:1.4rem; padding:16px 50px;
  background:linear-gradient(135deg,#28a745,#1e7e34);
  color:white; border:none; cursor:pointer; border-radius:8px;
  box-shadow:0 5px 0 #145220, 0 0 28px rgba(40,167,69,.35);
  letter-spacing:.1em; transition:all .1s;
}
#start-btn:hover { transform:translateY(-2px); box-shadow:0 7px 0 #145220, 0 0 38px rgba(40,167,69,.5); }
#start-btn:active { transform:translateY(3px); box-shadow:0 2px 0 #145220; }
#start-btn:disabled { opacity:.4; cursor:not-allowed; transform:none; }

/* COUNTDOWN */
#ov { display:none; position:fixed; inset:0; background:rgba(0,0,0,.8); backdrop-filter:blur(3px); z-index:498; }
#cd {
  display:none; position:fixed; top:50%; left:50%;
  transform:translate(-50%,-50%);
  font-family:'Bungee'; font-size:min(22vw,200px); z-index:500;
  color:white; text-shadow:0 0 60px #e10600;
  animation:cpulse .7s ease-out; pointer-events:none;
}
#cd.go { color:#00ff44; text-shadow:0 0 60px #00ff44; }
@keyframes cpulse { 0%{transform:translate(-50%,-50%) scale(1.8);opacity:0;} 30%{opacity:1;} 100%{transform:translate(-50%,-50%) scale(1);} }

/* WIN BANNER */
#win-banner {
  display:none; position:fixed; top:0; left:0; right:0;
  text-align:center; padding:.9rem;
  font-family:'Bungee'; font-size:clamp(1rem,4vw,2rem);
  letter-spacing:.08em; z-index:600;
  box-shadow:0 4px 24px rgba(0,0,0,.5);
  animation:slideD .4s ease-out;
}
@keyframes slideD { from{transform:translateY(-100%);} to{transform:translateY(0);} }

/* TRACK */
.track-wrap { max-width:1200px; margin:.5rem auto 1rem; padding:0 .8rem; }
.track {
  background:linear-gradient(180deg,#0a0a0e 0%,#0f0f14 100%);
  border-radius:14px; border:2px solid #1a1a22;
  padding:0 0 .8rem;
  position:relative; overflow:hidden;
  box-shadow:0 16px 50px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.03);
}

/* Dashed centre lines */
.track::before {
  content:'';
  position:absolute; inset:0;
  background:repeating-linear-gradient(90deg,transparent 0,transparent calc(10% - 1px),rgba(255,255,255,.025) calc(10% - 1px),rgba(255,255,255,.025) 10%);
  pointer-events:none;
}

/* FINISH LINE */
.finish-line {
  position:absolute; right:4%; top:0; bottom:.8rem; width:16px;
  background:repeating-linear-gradient(180deg,white 0,white 8px,black 8px,black 16px);
  opacity:.85; z-index:10;
}
.finish-txt {
  position:absolute; right:calc(4% + 20px); top:6px;
  font-family:'Bungee'; font-size:.6rem; color:rgba(255,255,255,.45);
  letter-spacing:.1em; writing-mode:vertical-rl;
}

/* START LINE */
.start-line {
  position:absolute; left:175px; top:0; bottom:.8rem; width:5px;
  background:repeating-linear-gradient(180deg,white 0,white 5px,black 5px,black 10px);
  opacity:.25; z-index:10;
}

/* LANES */
.lane {
  height:108px;
  display:flex; align-items:center;
  position:relative;
  border-bottom:1px solid rgba(255,255,255,.04);
}
.lane:last-child { border-bottom:none; }

/* dashed lane centre line */
.lane::after {
  content:'';
  position:absolute; left:175px; right:0; top:50%; height:1px;
  background:repeating-linear-gradient(90deg,#2a2a3a 0,#2a2a3a 10px,transparent 10px,transparent 20px);
}

/* HOUSE LABEL */
.hlabel {
  width:175px; padding-left:1rem; flex-shrink:0; z-index:5; position:relative;
}
.hname {
  font-family:'Bungee'; font-size:1.15rem; font-style:italic;
  letter-spacing:.04em; line-height:1;
}
.hpos { font-family:'Orbitron'; font-size:.58rem; color:#444; letter-spacing:.1em; margin-top:3px; }

/* CAR WRAPPER — positioned absolutely on the track */
.car {
  position:absolute;
  display:flex; flex-direction:column; align-items:center;
  z-index:20;
  /* JS drives left via style.left */
}
.car svg { filter:drop-shadow(0 0 6px currentColor); }

/* SCORE BUBBLE */
.sbubble {
  font-family:'Bungee'; font-size:.78rem;
  padding:2px 9px; border-radius:4px;
  border:2px solid rgba(255,255,255,.25);
  color:#000; margin-top:2px; display:none;
  white-space:nowrap; letter-spacing:.04em;
}

/* SCALE */
.scale-bar {
  display:flex; justify-content:space-between;
  margin-left:175px; padding:.6rem 4% .1rem 6px;
  border-top:2px solid rgba(255,255,255,.06);
  color:#333; font-family:'Orbitron'; font-size:.6rem; letter-spacing:.08em;
}

/* LEADERBOARD */
.lb { max-width:1200px; margin:0 auto 2rem; padding:0 .8rem; display:none; }
.lb-title { font-family:'Bungee'; font-size:.9rem; color:#555; letter-spacing:.1em; text-align:center; margin-bottom:.6rem; text-transform:uppercase; }
.lb-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; }
.lb-card {
  border-radius:10px; padding:.9rem; text-align:center;
  border:2px solid; position:relative; overflow:hidden;
}
.lb-card::before {
  content:''; position:absolute; inset:0;
  background:linear-gradient(135deg,rgba(255,255,255,.06) 0%,transparent 60%);
}
.lb-rank { font-family:'Orbitron'; font-size:.58rem; color:rgba(255,255,255,.35); letter-spacing:.1em; margin-bottom:3px; }
.lb-name { font-family:'Bungee'; font-size:1rem; letter-spacing:.06em; }
.lb-score { font-family:'Orbitron'; font-size:1.6rem; font-weight:900; margin-top:3px; }
.lb-trophy { font-size:1.2rem; margin-bottom:2px; }

/* RACE PROGRESS BAR (subtle underneath car) */
.progress-track {
  position:absolute; left:178px; right:5%; top:50%;
  transform:translateY(-50%); height:3px;
  background:rgba(255,255,255,.04); border-radius:2px; z-index:1;
}
.progress-fill {
  height:100%; border-radius:2px; width:0%;
  transition:width .1s linear;
}

@media(max-width:600px){
  .lane { height:82px; }
  .hlabel { width:120px; }
  .hname { font-size:.85rem; }
  .start-line { left:120px; }
  .scale-bar { margin-left:120px; }
  .car { /* JS adjusts */ }
  .lb-grid { grid-template-columns:repeat(2,1fr); }
}
</style>
</head>
<body>

<div class="credit">Designed by Arthur Chapman · 6MC</div>
<div id="ov"></div>
<div id="cd">3</div>
<div id="win-banner"></div>

<nav>
  <span class="nav-logo">🏁 TAB</span>
  ${["WholeSchool","Y3","Y4","Y5","Y6"].map(v=>{
    const l = v==="WholeSchool" ? "Whole School" : v.replace("Y","Year ");
    return `<a href="?view=${v}" class="nav-btn${v===view?" active":""}">${l}</a>`;
  }).join("")}
  <a href="/admin" class="nav-btn nav-admin">⚙ Admin</a>
</nav>

<div class="header">
  <div class="f1-title">${label.toUpperCase()} COMMUNITY STARS</div>
  <div class="f1-sub">Season ${new Date().getFullYear()} · Community Championship</div>
</div>

<div class="btn-wrap">
  <button id="start-btn" onclick="startRace()">🚦 START RACE</button>
</div>

<div class="track-wrap">
  <div class="track" id="track">
    <div class="finish-line"></div>
    <div class="finish-txt">FINISH</div>
    <div class="start-line"></div>

    ${[
      {id:"y", name:"Lewes",    color:"#FFD700", dark:"#b89b00", bg:"#1a1600"},
      {id:"r", name:"Amberley", color:"#E8000D", dark:"#8a0008", bg:"#1a0000"},
      {id:"b", name:"Hastings", color:"#1E90FF", dark:"#0a4a88", bg:"#001020"},
      {id:"g", name:"Bramber",  color:"#00C853", dark:"#006628", bg:"#001a08"},
    ].map(h => `
    <div class="lane">
      <div class="hlabel">
        <div class="hname" style="color:${h.color}">${h.name.toUpperCase()}</div>
        <div class="hpos" id="pos-${h.id}">P—</div>
      </div>
      <div class="progress-track"><div class="progress-fill" id="pf-${h.id}" style="background:${h.color}40"></div></div>
      <div class="car" id="car-${h.id}" style="left:180px; top:50%; transform:translateY(-50%)">
        ${carSvg(h.color, h.dark)}
        <div class="sbubble" id="score-${h.id}" style="background:${h.color}">${scores[h.id]}</div>
      </div>
    </div>`).join("")}

    <div class="scale-bar">
      <span>START</span><span>25%</span><span>50%</span><span>75%</span><span>FINISH</span>
    </div>
  </div>
</div>

<div class="lb" id="lb">
  <div class="lb-title">🏆 Final Results</div>
  <div class="lb-grid" id="lb-grid"></div>
</div>

<script>
// ── CONFIG ────────────────────────────────────────────────────────────────────
const SCORES = { y:${scores.y}, r:${scores.r}, b:${scores.b}, g:${scores.g} };
const HOUSES = [
  { id:'y', name:'Lewes',    color:'#FFD700', dark:'#b89b00', bg:'#1a1600' },
  { id:'r', name:'Amberley', color:'#E8000D', dark:'#8a0008', bg:'#1a0000' },
  { id:'b', name:'Hastings', color:'#1E90FF', dark:'#0a4a88', bg:'#001020' },
  { id:'g', name:'Bramber',  color:'#00C853', dark:'#006628', bg:'#001a08' },
];

const RACE_DURATION = 5000; // ms of actual racing after GO
const TICK = 50;            // ms per frame

let raceRan = false;

// ── HELPERS ───────────────────────────────────────────────────────────────────
function tick(freq, dur=0.12) {
  try {
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.frequency.value = freq; osc.type = 'square';
    g.gain.setValueAtTime(0.25, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(); osc.stop(ctx.currentTime + dur);
  } catch {}
}

function getTrackWidth() {
  const track = document.getElementById('track');
  // usable pixels from start line to finish line
  const total = track.offsetWidth;
  const startPx = window.innerWidth <= 600 ? 120 : 175;
  const endPx   = total * 0.04; // finish at right:4%
  return { total, startPx, endPx, usable: total - startPx - endPx - 80 };
}

function setCarLeft(id, px) {
  document.getElementById('car-' + id).style.left = px + 'px';
}

function setProgress(id, frac) {
  document.getElementById('pf-' + id).style.width = (frac * 100) + '%';
}

// ── COUNTDOWN ─────────────────────────────────────────────────────────────────
function startRace() {
  if (raceRan) return;
  document.getElementById('start-btn').disabled = true;
  document.getElementById('ov').style.display   = 'block';
  const cd = document.getElementById('cd');
  cd.style.display = 'block'; cd.className = ''; cd.innerText = '3';
  tick(440);

  let count = 3;
  const timer = setInterval(() => {
    count--;
    if (count > 0) {
      cd.style.animation = 'none'; cd.offsetHeight;
      cd.style.animation = 'cpulse .7s ease-out';
      cd.innerText = count; tick(440);
    } else {
      cd.className = 'go'; cd.innerText = 'GO!'; tick(880, 0.3);
      clearInterval(timer);
      setTimeout(() => {
        document.getElementById('ov').style.display = 'none';
        cd.style.display = 'none';
      }, 800);
      runRace();
    }
  }, 1000);
}

// ── RACE ENGINE ───────────────────────────────────────────────────────────────
function runRace() {
  raceRan = true;
  const maxScore = Math.max(...Object.values(SCORES), 1);
  const { startPx, usable } = getTrackWidth();

  // Each car has a "drama path" — fake intermediate positions, ending at true final
  // We generate ~8 keyframes over RACE_DURATION where cars jostle for position
  // then converge to their true score-based finish by the end

  const finalFracs = {};
  HOUSES.forEach(h => { finalFracs[h.id] = SCORES[h.id] / maxScore; });

  // Build drama keyframes for each car
  // Cars with lower scores can briefly overtake but then fall back
  const KF_COUNT  = 9; // number of keyframes including final
  const keyframes = {}; // id -> array of fracs

  HOUSES.forEach(h => {
    const finalF = finalFracs[h.id];
    const frames = [];

    // Generate dramatic intermediate path
    // Cars start at 0, end at finalF
    // In the middle they get some random drama — max overshoot depends on score
    const maxBoost = 0.2; // how far above final a lagging car can briefly be

    for (let i = 0; i < KF_COUNT - 1; i++) {
      const t = (i + 1) / KF_COUNT; // 0..~0.88
      // Base progress curve (ease in)
      const base = Math.pow(t, 0.7) * finalF;
      // Drama wobble — strongest in the middle
      const drama = Math.sin(t * Math.PI) * maxBoost * (1 - finalF + 0.1);
      // Add some noise
      const noise = (Math.random() - 0.3) * 0.08 * Math.sin(t * Math.PI * 2);
      frames.push(Math.max(0, Math.min(0.96, base + drama + noise)));
    }
    // Final keyframe = true score position
    frames.push(Math.min(finalF * 0.9, 0.92)); // 90% of track max
    keyframes[h.id] = frames;
  });

  // Animate
  let frame = 0;
  const totalFrames = KF_COUNT;
  const frameTime   = RACE_DURATION / totalFrames;

  const advanceFrame = () => {
    if (frame >= totalFrames) {
      // Show final positions
      setTimeout(() => showResults(finalFracs, startPx, usable), 300);
      return;
    }

    HOUSES.forEach(h => {
      const frac = keyframes[h.id][frame];
      const px   = startPx + (frac * usable);
      // Animate smoothly to this keyframe
      const carEl = document.getElementById('car-' + h.id);
      carEl.style.transition = `left ${frameTime * 0.85}ms cubic-bezier(0.4,0.0,0.6,1.0)`;
      carEl.style.left = px + 'px';
      setProgress(h.id, frac);
    });

    frame++;
    setTimeout(advanceFrame, frameTime);
  };

  advanceFrame();
}

// ── FINAL RESULTS ─────────────────────────────────────────────────────────────
function showResults(finalFracs, startPx, usable) {
  const maxScore = Math.max(...Object.values(SCORES), 1);

  // Snap cars to true final positions (smooth)
  HOUSES.forEach(h => {
    const frac  = SCORES[h.id] / maxScore * 0.9;
    const px    = startPx + frac * usable;
    const carEl = document.getElementById('car-' + h.id);
    carEl.style.transition = 'left 0.8s ease-out';
    carEl.style.left = px + 'px';
    setProgress(h.id, frac);
  });

  // Sort by score
  const sorted = [...HOUSES].sort((a,b) => SCORES[b.id] - SCORES[a.id]);
  const medals = ['🥇','🥈','🥉','4️⃣'];

  // Update position labels
  sorted.forEach((h,i) => {
    document.getElementById('pos-' + h.id).innerText = 'P' + (i+1);
  });

  // Show score bubbles after 500ms
  setTimeout(() => {
    HOUSES.forEach(h => { document.getElementById('score-' + h.id).style.display = 'block'; });
  }, 600);

  // Win banner
  const winner = sorted[0];
  const banner = document.getElementById('win-banner');
  banner.style.background = \`linear-gradient(135deg, \${winner.dark}, \${winner.color})\`;
  banner.style.color = winner.id === 'y' ? '#000' : 'white';
  banner.innerHTML = \`🏆 \${winner.name.toUpperCase()} WINS! · \${SCORES[winner.id].toLocaleString()} STARS 🏁\`;
  banner.style.display = 'block';
  tick(1320, 0.4);

  // Leaderboard
  setTimeout(() => {
    const lb   = document.getElementById('lb');
    const grid = document.getElementById('lb-grid');
    lb.style.display = 'block';
    grid.innerHTML = sorted.map((h,i) => \`
      <div class="lb-card" style="border-color:\${h.color}60;background:\${h.bg}">
        <div class="lb-trophy">\${medals[i]}</div>
        <div class="lb-rank">POSITION \${i+1}</div>
        <div class="lb-name" style="color:\${h.color}">\${h.name.toUpperCase()}</div>
        <div class="lb-score" style="color:\${h.color}">\${SCORES[h.id].toLocaleString()}</div>
      </div>
    \`).join('');
    lb.scrollIntoView({ behavior:'smooth', block:'nearest' });
  }, 900);
}
</script>
</body>
</html>`;
}

// ─── F1 CAR SVG ───────────────────────────────────────────────────────────────
function carSvg(color, dark) {
  return `<svg width="76" height="28" viewBox="0 0 76 28" xmlns="http://www.w3.org/2000/svg">
    <!-- Rear wing -->
    <rect x="0" y="4" width="9" height="3" rx="1" fill="${color}" opacity=".9"/>
    <rect x="2" y="7" width="2.5" height="5" rx="1" fill="${color}"/>
    <!-- Body -->
    <ellipse cx="36" cy="17" rx="28" ry="7.5" fill="${color}"/>
    <ellipse cx="36" cy="14" rx="26" ry="5" fill="rgba(255,255,255,0.14)"/>
    <!-- Nose -->
    <polygon points="64,14 76,17 64,20" fill="${color}"/>
    <!-- Cockpit -->
    <ellipse cx="32" cy="12" rx="10" ry="4.5" fill="rgba(0,0,0,0.5)"/>
    <ellipse cx="32" cy="11" rx="7" ry="3" fill="#1a3a5c" opacity=".9"/>
    <ellipse cx="30" cy="10" rx="4" ry="1.8" fill="#2a5a8c" opacity=".55"/>
    <!-- Front wing -->
    <rect x="58" y="20" width="13" height="2.5" rx="1" fill="${color}" opacity=".9"/>
    <rect x="60" y="17.5" width="2" height="2.5" rx=".5" fill="${color}" opacity=".7"/>
    <!-- Wheels -->
    <circle cx="16" cy="23" r="4.5" fill="#111"/><circle cx="16" cy="23" r="2.8" fill="#2a2a2a"/><circle cx="16" cy="23" r="1.2" fill="#444"/>
    <circle cx="52" cy="23" r="4.5" fill="#111"/><circle cx="52" cy="23" r="2.8" fill="#2a2a2a"/><circle cx="52" cy="23" r="1.2" fill="#444"/>
    <circle cx="16" cy="10" r="3.5" fill="#111"/><circle cx="16" cy="10" r="2" fill="#2a2a2a"/>
    <circle cx="52" cy="10" r="3.5" fill="#111"/><circle cx="52" cy="10" r="2" fill="#2a2a2a"/>
    <!-- Sidepod -->
    <rect x="22" y="18" width="16" height="4.5" rx="2" fill="rgba(0,0,0,.25)"/>
  </svg>`;
}

// ─── ADMIN PAGE ───────────────────────────────────────────────────────────────
function adminPage(data, msg) {
  const groups = [
    { key:"WholeSchool", label:"🌍 Whole School" },
    { key:"Y3", label:"Year 3" }, { key:"Y4", label:"Year 4" },
    { key:"Y5", label:"Year 5" }, { key:"Y6", label:"Year 6" },
  ];
  const houses = [
    { id:"y", name:"Lewes",    color:"#FFD700", dark:"#7a6000" },
    { id:"r", name:"Amberley", color:"#E8000D", dark:"#8a0008" },
    { id:"b", name:"Hastings", color:"#1E90FF", dark:"#0a4a88" },
    { id:"g", name:"Bramber",  color:"#00C853", dark:"#006628" },
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Admin — TAB Stars</title>
<link href="https://fonts.googleapis.com/css2?family=Bungee&family=Rajdhani:wght@600;700&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
body{background:#09090f;color:#eee;font-family:'Rajdhani',sans-serif;min-height:100vh;}
.top{background:#000;border-bottom:3px solid #e10600;padding:.85rem 1.4rem;display:flex;align-items:center;justify-content:space-between;}
.top-logo{font-family:'Bungee';font-size:1rem;color:#e10600;text-decoration:none;}
.top-back{font-size:.8rem;color:#777;text-decoration:none;border:1px solid #333;padding:.28rem .75rem;border-radius:5px;}
.top-back:hover{color:white;border-color:#666;}
.wrap{max-width:700px;margin:1.8rem auto;padding:0 1rem;}
h1{font-family:'Bungee';font-size:1.4rem;letter-spacing:.06em;margin-bottom:.25rem;}
.sub{color:#555;font-size:.83rem;margin-bottom:1.3rem;}
.msg{padding:.75rem 1rem;border-radius:8px;font-size:.88rem;font-weight:600;margin-bottom:1.1rem;}
.msg.ok{background:rgba(0,200,83,.1);border:1px solid rgba(0,200,83,.25);color:#00c853;}
.msg.er{background:rgba(232,0,13,.1);border:1px solid rgba(232,0,13,.25);color:#ff5555;}
.login-box{background:#111;border:1px solid #1e1e1e;border-radius:12px;padding:1.3rem;margin-bottom:1.3rem;}
.login-box h3{font-family:'Bungee';font-size:.88rem;color:#666;letter-spacing:.08em;margin-bottom:.9rem;text-transform:uppercase;}
.login-row{display:grid;grid-template-columns:1fr 1fr;gap:.7rem;}
label{display:block;font-size:.7rem;font-weight:700;letter-spacing:.08em;color:#555;text-transform:uppercase;margin-bottom:.28rem;}
input[type=text],input[type=password],input[type=number]{
  width:100%;background:#080808;border:1px solid #2a2a2a;border-radius:7px;
  color:white;font-family:'Rajdhani',sans-serif;font-size:.92rem;font-weight:600;
  padding:.58rem .75rem;outline:none;transition:border .15s;
}
input:focus{border-color:#e10600;}
input[type=number]{text-align:center;font-size:1.05rem;}
.group{background:#111;border:1px solid #1a1a1a;border-radius:12px;padding:1.2rem;margin-bottom:.85rem;}
.gtitle{font-family:'Bungee';font-size:.92rem;letter-spacing:.06em;color:#ccc;margin-bottom:.9rem;padding-bottom:.55rem;border-bottom:1px solid #1a1a1a;}
.srow{display:grid;grid-template-columns:repeat(4,1fr);gap:.65rem;}
.sfield{text-align:center;}
.slabel{font-size:.78rem;font-weight:700;letter-spacing:.06em;margin-bottom:.3rem;text-transform:uppercase;}
.save-btn{
  width:100%;padding:.9rem;font-family:'Bungee';font-size:1rem;letter-spacing:.1em;
  background:linear-gradient(135deg,#e10600,#c40000);
  color:white;border:none;cursor:pointer;border-radius:10px;
  box-shadow:0 4px 0 #7a0000,0 0 24px rgba(225,6,0,.25);
  transition:all .1s;margin-top:.4rem;
}
.save-btn:hover{box-shadow:0 5px 0 #7a0000,0 0 32px rgba(225,6,0,.35);transform:translateY(-1px);}
.save-btn:active{transform:translateY(3px);box-shadow:0 1px 0 #7a0000;}
@media(max-width:480px){.srow{grid-template-columns:repeat(2,1fr);}.login-row{grid-template-columns:1fr;}}
</style>
</head>
<body>
<div class="top">
  <a href="/" class="top-logo">🏁 TAB Community Stars</a>
  <a href="/" class="top-back">← Back to Race</a>
</div>
<div class="wrap">
  <h1>⚙️ Admin Panel</h1>
  <div class="sub">Set community star totals. Enter your credentials with each save.</div>
  ${msg ? `<div class="msg ${msg.startsWith("✅")?"ok":"er"}">${msg}</div>` : ""}
  <form method="POST" action="/admin">
    <div class="login-box">
      <h3>🔐 Staff Login</h3>
      <div class="login-row">
        <div><label>Username</label><input type="text" name="user" placeholder="admin" required autocomplete="username"></div>
        <div><label>Password</label><input type="password" name="pass" placeholder="••••••••" required autocomplete="current-password"></div>
      </div>
    </div>
    ${groups.map(g=>`
    <div class="group">
      <div class="gtitle">${g.label}</div>
      <div class="srow">
        ${houses.map(h=>`
        <div class="sfield">
          <div class="slabel" style="color:${h.color}">${h.name}</div>
          <input type="number" name="${g.key}_${h.id}" value="${data[g.key]?.[h.id]??0}" min="0" max="99999">
        </div>`).join("")}
      </div>
    </div>`).join("")}
    <button type="submit" class="save-btn">🏁 SAVE ALL SCORES</button>
  </form>
</div>
</body>
</html>`;
}

function html(content) {
  return new Response(content, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
