export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    const defaultScores = {
      WholeSchool: { y: 0, r: 0, b: 0, g: 0 },
      Y3: { y: 0, r: 0, b: 0, g: 0 },
      Y4: { y: 0, r: 0, b: 0, g: 0 },
      Y5: { y: 0, r: 0, b: 0, g: 0 },
      Y6: { y: 0, r: 0, b: 0, g: 0 },
    };

    let starData;
    try {
      const kv = await env.STARS_DB.get("tab_junior_scores");
      starData = kv ? JSON.parse(kv) : defaultScores;
    } catch {
      starData = defaultScores;
    }

    // ── ADMIN ──────────────────────────────────────────────────────────────
    if (path === "/admin") {
      if (request.method === "POST") {
        const form = await request.formData();
        if (form.get("user") !== "admin" || form.get("pass") !== "cmstars") {
          return html(adminPage(starData, "❌ Wrong username or password."));
        }
        const keys = ["WholeSchool", "Y3", "Y4", "Y5", "Y6"];
        const newScores = {};
        keys.forEach(k => {
          newScores[k] = {
            y: Math.max(0, parseInt(form.get(`${k}_y`) || 0, 10)),
            r: Math.max(0, parseInt(form.get(`${k}_r`) || 0, 10)),
            b: Math.max(0, parseInt(form.get(`${k}_b`) || 0, 10)),
            g: Math.max(0, parseInt(form.get(`${k}_g`) || 0, 10)),
          };
        });
        await env.STARS_DB.put("tab_junior_scores", JSON.stringify(newScores));
        return html(adminPage(newScores, "✅ Scores saved successfully!"));
      }
      return html(adminPage(starData, ""));
    }

    // ── RACE PAGE ──────────────────────────────────────────────────────────
    const view = url.searchParams.get("view") || "WholeSchool";
    const validViews = ["WholeSchool", "Y3", "Y4", "Y5", "Y6"];
    const safeView = validViews.includes(view) ? view : "WholeSchool";
    return html(racePage(safeView, starData));
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// RACE PAGE
// ═══════════════════════════════════════════════════════════════════════════════

function racePage(view, starData) {
  const scores = starData[view] || { y: 0, r: 0, b: 0, g: 0 };
  const label = view === "WholeSchool" ? "Whole School" : view.replace("Y", "Year ");
  const maxScore = Math.max(scores.y, scores.r, scores.b, scores.g, 1);

  // Rank cars by score
  const cars = [
    { id: "y", name: "Lewes",    color: "#FFD700", glow: "#ffd70080", score: scores.y },
    { id: "r", name: "Amberley", color: "#E8000D", glow: "#e8000d80", score: scores.r },
    { id: "b", name: "Hastings", color: "#1E90FF", glow: "#1e90ff80", score: scores.b },
    { id: "g", name: "Bramber",  color: "#00C853", glow: "#00c85380", score: scores.g },
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>TAB Community Stars — ${label}</title>
<link href="https://fonts.googleapis.com/css2?family=Bungee&family=Orbitron:wght@700;900&family=Rajdhani:wght@600;700&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

  :root {
    --y: #FFD700; --r: #E8000D; --b: #1E90FF; --g: #00C853;
    --track-bg: #0f0f0f; --lane-h: 120px;
  }

  body {
    background: #050505;
    font-family: 'Rajdhani', sans-serif;
    color: white;
    overflow-x: hidden;
    min-height: 100vh;
  }

  /* SCANLINE EFFECT */
  body::before {
    content: '';
    position: fixed; inset: 0; z-index: 9999; pointer-events: none;
    background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px);
  }

  /* CREDIT */
  .credit {
    position: fixed; top: 8px; left: 12px;
    font-size: 0.68rem; color: #333; letter-spacing: 1px;
    font-family: monospace; z-index: 200;
  }

  /* NAV */
  nav {
    background: #000;
    border-bottom: 3px solid #e10600;
    padding: 0.7rem 1rem;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    position: relative;
  }
  .nav-logo {
    font-family: 'Bungee';
    font-size: 1rem;
    color: #e10600;
    margin-right: 1rem;
    letter-spacing: 0.05em;
  }
  .nav-btn {
    color: #999;
    text-decoration: none;
    padding: 6px 14px;
    background: #111;
    border-radius: 5px;
    font-weight: 700;
    font-size: 0.82rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    border: 1px solid #222;
    transition: all .15s;
  }
  .nav-btn:hover { background: #1a1a1a; color: white; border-color: #444; }
  .nav-btn.active { background: #e10600; color: white; border-color: #e10600; box-shadow: 0 0 12px rgba(225,6,0,0.5); }
  .nav-admin { opacity: 0.25; margin-left: 0.5rem; }
  .nav-admin:hover { opacity: 0.7; }

  /* HEADER */
  .header {
    text-align: center;
    padding: 2rem 1rem 0.5rem;
    position: relative;
  }
  .f1-title {
    font-family: 'Bungee';
    font-size: clamp(2rem, 5vw, 3.5rem);
    letter-spacing: 0.04em;
    text-shadow: 0 0 30px rgba(225,6,0,0.6), 0 0 60px rgba(225,6,0,0.2);
    line-height: 1;
    margin-bottom: 0.3rem;
  }
  .f1-sub {
    font-family: 'Orbitron';
    font-size: 0.75rem;
    color: #555;
    letter-spacing: 0.2em;
    text-transform: uppercase;
  }

  /* START BUTTON */
  .btn-wrap { text-align: center; padding: 1.5rem 0 0.5rem; }
  #start-btn {
    font-family: 'Bungee';
    font-size: 1.6rem;
    padding: 18px 56px;
    background: linear-gradient(135deg, #28a745, #20893a);
    color: white;
    border: none;
    cursor: pointer;
    border-radius: 8px;
    box-shadow: 0 6px 0 #166128, 0 0 30px rgba(40,167,69,0.4);
    letter-spacing: 0.1em;
    transition: all .1s;
    position: relative;
    overflow: hidden;
  }
  #start-btn::after {
    content: '';
    position: absolute; inset: 0;
    background: linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 50%);
  }
  #start-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 0 #166128, 0 0 40px rgba(40,167,69,0.5); }
  #start-btn:active { transform: translateY(4px); box-shadow: 0 2px 0 #166128; }
  #start-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  /* COUNTDOWN OVERLAY */
  #countdown {
    display: none;
    position: fixed; top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    font-family: 'Bungee';
    font-size: min(22vw, 220px);
    z-index: 500;
    color: white;
    text-shadow: 0 0 80px #e10600, 0 0 160px #e10600;
    animation: countPulse 0.8s ease-out;
    pointer-events: none;
  }
  @keyframes countPulse {
    0% { transform: translate(-50%, -50%) scale(1.8); opacity: 0; }
    30% { opacity: 1; }
    100% { transform: translate(-50%, -50%) scale(1); }
  }
  #countdown.go { color: #00ff44; text-shadow: 0 0 80px #00ff44, 0 0 160px #00ff44; }
  #countdown.flash { animation: flash 0.5s ease-out; }
  @keyframes flash {
    0% { transform: translate(-50%, -50%) scale(1.4); }
    100% { transform: translate(-50%, -50%) scale(1); }
  }

  /* DARK OVERLAY during countdown */
  #overlay {
    display: none;
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.75);
    z-index: 499;
    backdrop-filter: blur(2px);
  }

  /* TRACK */
  .track-wrap { max-width: 1200px; margin: 0.5rem auto 2rem; padding: 0 1rem; }

  .track {
    background: linear-gradient(180deg, #0a0a0a 0%, #111 100%);
    border-radius: 16px;
    border: 2px solid #222;
    padding: 0 0 1rem;
    position: relative;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.04);
  }

  /* TRACK SURFACE LINES */
  .track::before {
    content: '';
    position: absolute; inset: 0;
    background: repeating-linear-gradient(
      90deg, transparent 0, transparent calc(10% - 1px),
      rgba(255,255,255,0.03) calc(10% - 1px), rgba(255,255,255,0.03) 10%
    );
    pointer-events: none;
  }

  /* FINISH LINE */
  .finish-line {
    position: absolute;
    right: 4%;
    top: 0; bottom: 1rem;
    width: 18px;
    background: repeating-linear-gradient(
      180deg,
      white 0, white 9px,
      black 9px, black 18px
    );
    opacity: 0.9;
    z-index: 10;
  }
  .finish-label {
    position: absolute;
    right: calc(4% + 22px);
    top: 8px;
    font-family: 'Bungee';
    font-size: 0.65rem;
    color: rgba(255,255,255,0.5);
    letter-spacing: 0.12em;
    writing-mode: vertical-rl;
    text-orientation: mixed;
  }

  /* START LINE */
  .start-line {
    position: absolute;
    left: 180px;
    top: 0; bottom: 1rem;
    width: 6px;
    background: repeating-linear-gradient(
      180deg, white 0, white 6px, black 6px, black 12px
    );
    opacity: 0.35;
    z-index: 10;
  }

  /* LANES */
  .lane {
    height: var(--lane-h);
    display: flex;
    align-items: center;
    position: relative;
    border-bottom: 1px solid rgba(255,255,255,0.04);
  }
  .lane:last-child { border-bottom: none; }
  .lane::after {
    content: '';
    position: absolute; left: 180px; right: 0; top: 50%;
    height: 1px;
    background: repeating-linear-gradient(90deg, #333 0, #333 12px, transparent 12px, transparent 24px);
  }

  /* HOUSE LABEL */
  .house-label {
    width: 180px;
    padding-left: 1.2rem;
    flex-shrink: 0;
    z-index: 5;
    position: relative;
  }
  .house-name {
    font-family: 'Bungee';
    font-size: 1.3rem;
    font-style: italic;
    letter-spacing: 0.04em;
    line-height: 1;
  }
  .house-pos {
    font-family: 'Orbitron';
    font-size: 0.62rem;
    color: #555;
    letter-spacing: 0.1em;
    margin-top: 2px;
  }

  /* CAR */
  .car {
    position: absolute;
    left: 185px;
    display: flex;
    flex-direction: column;
    align-items: center;
    transition: left 3.5s cubic-bezier(0.35, 0.05, 0.45, 0.95);
    z-index: 20;
  }
  .car svg { filter: drop-shadow(0 0 8px currentColor); }

  /* SCORE BUBBLE */
  .score-bubble {
    font-family: 'Bungee';
    font-size: 0.85rem;
    padding: 3px 10px;
    border-radius: 4px;
    border: 2px solid rgba(255,255,255,0.3);
    color: #000;
    margin-top: 3px;
    display: none;
    white-space: nowrap;
    letter-spacing: 0.04em;
  }

  /* WIN BANNER */
  #win-banner {
    display: none;
    position: fixed; top: 0; left: 0; right: 0;
    background: linear-gradient(135deg, #e10600, #ff4500);
    text-align: center;
    padding: 1rem;
    z-index: 600;
    font-family: 'Bungee';
    font-size: clamp(1.2rem, 4vw, 2.2rem);
    letter-spacing: 0.08em;
    box-shadow: 0 4px 30px rgba(225,6,0,0.6);
    animation: slideDown 0.5s ease-out;
  }
  @keyframes slideDown { from { transform: translateY(-100%); } to { transform: translateY(0); } }

  /* SCALE BAR */
  .scale-bar {
    display: flex;
    justify-content: space-between;
    margin-left: 180px;
    padding: 0.8rem 4% 0.2rem 8px;
    border-top: 2px solid rgba(255,255,255,0.08);
    color: #444;
    font-family: 'Orbitron';
    font-size: 0.65rem;
    letter-spacing: 0.1em;
  }

  /* LEADERBOARD */
  .leaderboard {
    max-width: 1200px;
    margin: 0 auto 2rem;
    padding: 0 1rem;
    display: none;
  }
  .lb-title {
    font-family: 'Bungee';
    font-size: 1rem;
    color: #666;
    letter-spacing: 0.12em;
    text-align: center;
    margin-bottom: 0.75rem;
    text-transform: uppercase;
  }
  .lb-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }
  .lb-card {
    border-radius: 10px;
    padding: 1rem;
    text-align: center;
    border: 2px solid;
    position: relative;
    overflow: hidden;
  }
  .lb-card::before {
    content: '';
    position: absolute; inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 60%);
  }
  .lb-rank { font-family: 'Orbitron'; font-size: 0.65rem; color: rgba(255,255,255,0.4); letter-spacing: 0.1em; margin-bottom: 4px; }
  .lb-name { font-family: 'Bungee'; font-size: 1.1rem; letter-spacing: 0.06em; }
  .lb-score { font-family: 'Orbitron'; font-size: 1.8rem; font-weight: 900; margin-top: 4px; }
  .lb-trophy { font-size: 1.4rem; margin-bottom: 2px; }

  @media (max-width: 600px) {
    :root { --lane-h: 90px; }
    .house-label { width: 120px; }
    .house-name { font-size: 0.95rem; }
    .start-line { left: 120px; }
    .scale-bar { margin-left: 120px; }
    .car { left: 125px; }
    .lb-grid { grid-template-columns: repeat(2, 1fr); }
  }
</style>
</head>
<body>

<div class="credit">Designed by Arthur Chapman · 6MC</div>
<div id="overlay"></div>
<div id="countdown">3</div>
<div id="win-banner"></div>

<nav>
  <span class="nav-logo">🏁 TAB</span>
  ${["WholeSchool","Y3","Y4","Y5","Y6"].map(v => {
    const lbl = v === "WholeSchool" ? "Whole School" : v.replace("Y","Year ");
    return `<a href="?view=${v}" class="nav-btn ${v===view?"active":""}">${lbl}</a>`;
  }).join("")}
  <a href="/admin" class="nav-btn nav-admin">⚙ Admin</a>
</nav>

<div class="header">
  <div class="f1-title">${label.toUpperCase()} COMMUNITY STARS</div>
  <div class="f1-sub">Season ${new Date().getFullYear()} · Community Championship</div>
</div>

<div class="btn-wrap">
  <button id="start-btn" onclick="startSequence()">🚦 START RACE</button>
</div>

<div class="track-wrap">
  <div class="track">
    <div class="finish-line"></div>
    <div class="finish-label">FINISH</div>
    <div class="start-line"></div>

    ${cars.map(c => `
    <div class="lane">
      <div class="house-label">
        <div class="house-name" style="color:${c.color}">${c.name.toUpperCase()}</div>
        <div class="house-pos" id="pos-${c.id}">P—</div>
      </div>
      <div class="car" id="car-${c.id}">
        ${f1CarSvg(c.color)}
        <div class="score-bubble" id="score-${c.id}" style="background:${c.color}">${c.score.toLocaleString()}</div>
      </div>
    </div>`).join("")}

    <div class="scale-bar">
      <span>START</span><span>20%</span><span>40%</span><span>60%</span><span>80%</span><span>FINISH</span>
    </div>
  </div>
</div>

<div class="leaderboard" id="leaderboard">
  <div class="lb-title">🏆 Race Results</div>
  <div class="lb-grid" id="lb-grid"></div>
</div>

<script>
const SCORES = { y: ${scores.y}, r: ${scores.r}, b: ${scores.b}, g: ${scores.g} };
const HOUSES = [
  { id: 'y', name: 'Lewes',    color: '#FFD700', bg: '#2a2200' },
  { id: 'r', name: 'Amberley', color: '#E8000D', bg: '#2a0000' },
  { id: 'b', name: 'Hastings', color: '#1E90FF', bg: '#001a2a' },
  { id: 'g', name: 'Bramber',  color: '#00C853', bg: '#002a10' },
];

let raceRun = false;

function startSequence() {
  if (raceRun) return;
  const btn = document.getElementById('start-btn');
  const cd = document.getElementById('countdown');
  const ov = document.getElementById('overlay');
  btn.disabled = true;
  ov.style.display = 'block';
  cd.style.display = 'block';
  cd.className = '';
  cd.innerText = '3';

  let count = 3;
  // Play tick sound via AudioContext
  function tick(freq) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'square';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(); osc.stop(ctx.currentTime + 0.15);
    } catch {}
  }

  tick(440);

  const timer = setInterval(() => {
    count--;
    if (count > 0) {
      cd.style.animation = 'none';
      cd.offsetHeight; // reflow
      cd.style.animation = 'countPulse 0.8s ease-out';
      cd.innerText = count;
      tick(440);
    } else if (count === 0) {
      cd.className = 'go flash';
      cd.innerText = 'GO!';
      tick(880);
      clearInterval(timer);
      setTimeout(() => {
        ov.style.display = 'none';
        cd.style.display = 'none';
      }, 900);
      runRace();
    }
  }, 1000);
}

function runRace() {
  raceRun = true;
  const maxScore = Math.max(...Object.values(SCORES), 1);
  // Track usable % = from start (left:185px) to finish (right:4%)
  // We'll use CSS calc. Map score to 0–82% of track width past start.

  HOUSES.forEach(h => {
    const score = SCORES[h.id];
    const pct = maxScore > 0 ? (score / maxScore) * 80 : 0;
    const car = document.getElementById('car-' + h.id);
    // Use inline style — calc based on track container
    car.style.left = 'calc(185px + ' + pct.toFixed(2) + '% - 30px)';
  });

  // After race animation finishes, show scores + leaderboard
  setTimeout(() => {
    showResults();
  }, 4200);
}

function showResults() {
  // Show score bubbles
  HOUSES.forEach(h => {
    document.getElementById('score-' + h.id).style.display = 'block';
  });

  // Sort by score
  const sorted = [...HOUSES].sort((a,b) => SCORES[b.id] - SCORES[a.id]);
  const medals = ['🥇','🥈','🥉','4️⃣'];

  // Update position labels
  sorted.forEach((h, i) => {
    document.getElementById('pos-' + h.id).innerText = 'P' + (i+1);
  });

  // Show win banner
  const winner = sorted[0];
  const winScore = SCORES[winner.id];
  const banner = document.getElementById('win-banner');
  banner.style.display = 'block';
  banner.innerHTML = '🏆 ' + winner.name.toUpperCase() + ' WINS! · ' + winScore.toLocaleString() + ' STARS 🏁';
  banner.style.color = winner.color;

  // Show leaderboard
  const lb = document.getElementById('leaderboard');
  const grid = document.getElementById('lb-grid');
  lb.style.display = 'block';
  grid.innerHTML = sorted.map((h, i) => \`
    <div class="lb-card" style="border-color:\${h.color}55;background:\${h.bg}">
      <div class="lb-trophy">\${medals[i]}</div>
      <div class="lb-rank">POSITION \${i+1}</div>
      <div class="lb-name" style="color:\${h.color}">\${h.name.toUpperCase()}</div>
      <div class="lb-score" style="color:\${h.color}">\${SCORES[h.id].toLocaleString()}</div>
    </div>
  \`).join('');

  // Scroll to leaderboard
  setTimeout(() => lb.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 300);
}
</script>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// F1 CAR SVG
// ═══════════════════════════════════════════════════════════════════════════════

function f1CarSvg(color) {
  // Proper F1 silhouette facing right
  return `<svg width="80" height="32" viewBox="0 0 80 32" xmlns="http://www.w3.org/2000/svg">
    <!-- Rear wing -->
    <rect x="0" y="4" width="8" height="3" rx="1" fill="${color}" opacity="0.9"/>
    <rect x="2" y="7" width="2" height="6" rx="1" fill="${color}"/>
    <!-- Main body -->
    <ellipse cx="38" cy="18" rx="30" ry="8" fill="${color}"/>
    <!-- Body highlight -->
    <ellipse cx="38" cy="15" rx="28" ry="5" fill="rgba(255,255,255,0.15)"/>
    <!-- Nose cone -->
    <polygon points="68,15 80,18 68,21" fill="${color}"/>
    <!-- Cockpit surround -->
    <ellipse cx="34" cy="13" rx="11" ry="5" fill="rgba(0,0,0,0.5)"/>
    <!-- Cockpit glass -->
    <ellipse cx="34" cy="12" rx="8" ry="3.5" fill="#1a3a5c" opacity="0.9"/>
    <ellipse cx="32" cy="11" rx="5" ry="2" fill="#2a5a8c" opacity="0.6"/>
    <!-- Front wing -->
    <rect x="62" y="21" width="14" height="2.5" rx="1" fill="${color}" opacity="0.9"/>
    <rect x="64" y="18" width="2" height="3" rx="0.5" fill="${color}" opacity="0.7"/>
    <!-- Tyres -->
    <ellipse cx="18" cy="25" rx="5" ry="5" fill="#111"/>
    <ellipse cx="18" cy="25" rx="3" ry="3" fill="#333"/>
    <ellipse cx="18" cy="25" rx="1.5" ry="1.5" fill="#555"/>
    <ellipse cx="56" cy="25" rx="5" ry="5" fill="#111"/>
    <ellipse cx="56" cy="25" rx="3" ry="3" fill="#333"/>
    <ellipse cx="56" cy="25" rx="1.5" ry="1.5" fill="#555"/>
    <!-- Tyre tops -->
    <ellipse cx="18" cy="11" rx="4" ry="4" fill="#111"/>
    <ellipse cx="18" cy="11" rx="2.5" ry="2.5" fill="#333"/>
    <ellipse cx="56" cy="11" rx="4" ry="4" fill="#111"/>
    <ellipse cx="56" cy="11" rx="2.5" ry="2.5" fill="#333"/>
    <!-- Sidepod details -->
    <rect x="24" y="19" width="18" height="5" rx="2" fill="rgba(0,0,0,0.3)"/>
    <!-- Number plate -->
    <rect x="8" y="15" width="10" height="6" rx="1" fill="white" opacity="0.15"/>
  </svg>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

function adminPage(data, msg) {
  const groups = [
    { key: "WholeSchool", label: "🌍 Whole School" },
    { key: "Y3", label: "Year 3" },
    { key: "Y4", label: "Year 4" },
    { key: "Y5", label: "Year 5" },
    { key: "Y6", label: "Year 6" },
  ];
  const houses = [
    { id: "y", name: "Lewes",    color: "#FFD700", dark: "#7a6000" },
    { id: "r", name: "Amberley", color: "#E8000D", dark: "#8a0008" },
    { id: "b", name: "Hastings", color: "#1E90FF", dark: "#0a4a88" },
    { id: "g", name: "Bramber",  color: "#00C853", dark: "#006628" },
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Admin — TAB Community Stars</title>
<link href="https://fonts.googleapis.com/css2?family=Bungee&family=Rajdhani:wght@600;700&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0a0a0f; color: #eee; font-family: 'Rajdhani', sans-serif; min-height: 100vh; }
  .topbar { background: #000; border-bottom: 3px solid #e10600; padding: 0.9rem 1.5rem; display: flex; align-items: center; justify-content: space-between; }
  .topbar-logo { font-family: 'Bungee'; font-size: 1.1rem; color: #e10600; text-decoration: none; }
  .topbar-back { font-size: 0.82rem; color: #888; text-decoration: none; border: 1px solid #333; padding: 0.3rem 0.8rem; border-radius: 5px; transition: all .2s; }
  .topbar-back:hover { color: white; border-color: #666; }
  .wrap { max-width: 720px; margin: 2rem auto; padding: 0 1rem; }
  h1 { font-family: 'Bungee'; font-size: 1.6rem; letter-spacing: 0.06em; margin-bottom: 0.3rem; }
  .sub { color: #555; font-size: 0.85rem; margin-bottom: 1.5rem; }
  .msg { padding: 0.8rem 1.1rem; border-radius: 8px; font-size: 0.9rem; font-weight: 600; margin-bottom: 1.2rem; }
  .msg.ok { background: rgba(0,200,83,0.12); border: 1px solid rgba(0,200,83,0.3); color: #00c853; }
  .msg.err { background: rgba(232,0,13,0.12); border: 1px solid rgba(232,0,13,0.3); color: #ff4444; }
  .login-box { background: #111; border: 1px solid #222; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; }
  .login-box h3 { font-family: 'Bungee'; font-size: 0.95rem; color: #888; letter-spacing: 0.08em; margin-bottom: 1rem; text-transform: uppercase; }
  .login-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
  label { display: block; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.08em; color: #666; text-transform: uppercase; margin-bottom: 0.3rem; }
  input[type=text], input[type=password], input[type=number] {
    width: 100%; background: #0a0a0a; border: 1px solid #333; border-radius: 7px;
    color: white; font-family: 'Rajdhani', sans-serif; font-size: 0.95rem; font-weight: 600;
    padding: 0.6rem 0.8rem; outline: none; transition: border .15s;
  }
  input:focus { border-color: #e10600; }
  input[type=number] { text-align: center; font-size: 1.1rem; }
  .group { background: #111; border: 1px solid #1e1e1e; border-radius: 12px; padding: 1.3rem; margin-bottom: 0.9rem; }
  .group-title { font-family: 'Bungee'; font-size: 1rem; letter-spacing: 0.06em; color: #ccc; margin-bottom: 1rem; padding-bottom: 0.6rem; border-bottom: 1px solid #1e1e1e; }
  .scores-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; }
  .score-field { text-align: center; }
  .score-label { font-size: 0.8rem; font-weight: 700; letter-spacing: 0.06em; margin-bottom: 0.35rem; text-transform: uppercase; }
  .save-btn {
    width: 100%; padding: 1rem; font-family: 'Bungee'; font-size: 1.1rem; letter-spacing: 0.1em;
    background: linear-gradient(135deg, #e10600, #c40000);
    color: white; border: none; cursor: pointer; border-radius: 10px;
    box-shadow: 0 4px 0 #7a0000, 0 0 30px rgba(225,6,0,0.3);
    transition: all .1s; margin-top: 0.5rem;
  }
  .save-btn:hover { box-shadow: 0 6px 0 #7a0000, 0 0 40px rgba(225,6,0,0.4); transform: translateY(-1px); }
  .save-btn:active { transform: translateY(3px); box-shadow: 0 1px 0 #7a0000; }
  @media (max-width: 500px) { .scores-row { grid-template-columns: repeat(2,1fr); } .login-row { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<div class="topbar">
  <a href="/" class="topbar-logo">🏁 TAB Community Stars</a>
  <a href="/" class="topbar-back">← Back to Race</a>
</div>
<div class="wrap">
  <h1>⚙️ Admin Panel</h1>
  <div class="sub">Set community star totals for all year groups. Enter your credentials each time you save.</div>
  ${msg ? `<div class="msg ${msg.startsWith('✅') ? 'ok' : 'err'}">${msg}</div>` : ""}
  <form method="POST" action="/admin">
    <div class="login-box">
      <h3>🔐 Staff Login</h3>
      <div class="login-row">
        <div><label>Username</label><input type="text" name="user" placeholder="admin" required autocomplete="username"></div>
        <div><label>Password</label><input type="password" name="pass" placeholder="••••••••" required autocomplete="current-password"></div>
      </div>
    </div>
    ${groups.map(g => `
    <div class="group">
      <div class="group-title">${g.label}</div>
      <div class="scores-row">
        ${houses.map(h => `
        <div class="score-field">
          <div class="score-label" style="color:${h.color}">${h.name}</div>
          <input type="number" name="${g.key}_${h.id}" value="${data[g.key]?.[h.id] ?? 0}" min="0" max="99999">
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
