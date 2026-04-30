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

// ─── RACE PAGE ─────────────────────────────────────────────
function racePage(view, starData) {
  const scores = starData[view] || { y:0, r:0, b:0, g:0 };
  const label  = view === "WholeSchool" ? "Whole School" : view.replace("Y","Year ");

  return `<!DOCTYPE html>
<html>
<body>

<button onclick="startRace()">START</button>

<div id="track"></div>

<script>
const SCORES = { y:${scores.y}, r:${scores.r}, b:${scores.b}, g:${scores.g} };
const HOUSES = ['y','r','b','g'];

function setProgress(id, frac) {}

function runRace() {
  const frameTime = 500;

  HOUSES.forEach(h => {
    const carEl = document.getElementById('car-' + h);
    const px = 100;

    // ✅ FIXED LINE
    carEl.style.transition = \`left \${frameTime * 0.85}ms cubic-bezier(0.4, 0.0, 0.6, 1.0)\`;

    carEl.style.left = px + 'px';
    setProgress(h, 0.5);
  });
}

function startRace() {
  runRace();
}
</script>

</body>
</html>`;
}

// ─── ADMIN PAGE ────────────────────────────────────────────
function adminPage(data, msg) {
  return `<html><body>admin</body></html>`;
}

function html(content) {
  return new Response(content, {
    headers: { "Content-Type": "text/html" }
  });
}
