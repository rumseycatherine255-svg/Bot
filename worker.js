export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Initial Data Setup
    const defaultScores = {
      WholeSchool: {y:0, r:0, b:0, g:0},
      Y3: {y:0, r:0, b:0, g:0}, Y4: {y:0, r:0, b:0, g:0},
      Y5: {y:0, r:0, b:0, g:0}, Y6: {y:0, r:0, b:0, g:0}
    };

    // 1. Get data from KV
    let starData;
    try {
      const kvData = await env.STARS_DB.get("tab_junior_scores");
      starData = kvData ? JSON.parse(kvData) : defaultScores;
    } catch (e) {
      starData = defaultScores;
    }

    // --- ADMIN PAGE ---
    if (url.pathname === "/admin") {
      if (request.method === "POST") {
        const formData = await request.formData();
        // Check credentials
        if (formData.get("user") === "admin" && formData.get("pass") === "cmstars") {
          const keys = ['WholeSchool', 'Y3', 'Y4', 'Y5', 'Y6'];
          const newScores = {};
          keys.forEach(k => {
            newScores[k] = {
              y: parseInt(formData.get(`${k}_y`) || 0),
              r: parseInt(formData.get(`${k}_r`) || 0),
              b: parseInt(formData.get(`${k}_b`) || 0),
              g: parseInt(formData.get(`${k}_g`) || 0)
            };
          });
          // Save to KV Database
          await env.STARS_DB.put("tab_junior_scores", JSON.stringify(newScores));
          return new Response("<h1>Scores Saved!</h1><p>The race is now updated for everyone.</p><a href='/'>Go to Race Track</a>", { headers: {"Content-Type": "text/html"} });
        }
        return new Response("Wrong Username/Password", { status: 403 });
      }
      return new Response(renderAdmin(starData), { headers: {"Content-Type": "text/html"} });
    }

    // --- MAIN RACE PAGE ---
    const view = url.searchParams.get("view") || "WholeSchool";
    return new Response(renderRace(view, starData), { headers: {"Content-Type": "text/html"} });
  }
};

function renderRace(view, starData) {
  const scores = starData[view];
  const title = view === "WholeSchool" ? "Whole School" : view.replace("Y", "Year ");
  
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>TAB Community Stars</title>
    <link href="https://fonts.googleapis.com/css2?family=Bungee&family=Oswald:wght@700&display=swap" rel="stylesheet">
    <style>
      body { background: #fdfdfd; font-family: 'Oswald', sans-serif; margin: 0; text-align: center; }
      nav { background: #111; padding: 15px; display: flex; justify-content: center; align-items: center; gap: 10px; flex-wrap: wrap; }
      .nav-btn { color: #bbb; text-decoration: none; padding: 10px 15px; background: #333; border-radius: 5px; transition: 0.3s; }
      .nav-btn:hover { color: white; background: #444; }
      .active { background: #e74c3c; color: white; }
      .staff-btn { background: #555; border: 1px solid #777; font-size: 0.85rem; margin-left: 20px; }

      .container { max-width: 1100px; margin: 30px auto; padding: 20px; }
      h1 { font-family: 'Bungee'; margin-bottom: 20px; font-size: 2.5rem; color: #222; }
      
      #start-btn { padding: 15px 40px; font-family: 'Bungee'; font-size: 1.5rem; background: #28a745; color: white; border: none; cursor: pointer; border-radius: 10px; box-shadow: 0 5px 0 #1e7e34; margin-bottom: 30px; }
      #start-btn:active { transform: translateY(4px); box-shadow: none; }

      .track { background: #222; border-radius: 25px; padding: 40px 20px; position: relative; border: 5px solid #333; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
      .lane { height: 100px; border-bottom: 2px dashed #444; position: relative; display: flex; align-items: center; }
      .lane:last-child { border-bottom: none; }
      
      .house-label { width: 140px; text-align: left; font-size: 1.6rem; font-weight: bold; }
      .car { position: absolute; left: 140px; font-size: 55px; transition: left 4s cubic-bezier(0.45, 0.05, 0.55, 0.95); display: flex; flex-direction: column; align-items: center; }
      .car span { transform: scaleX(-1); display: inline-block; } /* Flip car to move right */
      
      .bubble { background: #fff; color: #000; font-size: 14px; padding: 2px 8px; border-radius: 5px; margin-top: 5px; display: none; font-family: sans-serif; }

      .scale { display: flex; justify-content: space-between; margin-left: 140px; margin-top: 20px; border-top: 5px solid #fff; padding-top: 10px; color: #888; font-weight: bold; font-size: 1.1rem; }
    </style>
  </head>
  <body>
    <nav>
      <a href="?view=WholeSchool" class="nav-btn ${view==='WholeSchool'?'active':''}">Whole School</a>
      <a href="?view=Y3" class="nav-btn ${view==='Y3'?'active':''}">Year 3</a>
      <a href="?view=Y4" class="nav-btn ${view==='Y4'?'active':''}">Year 4</a>
      <a href="?view=Y5" class="nav-btn ${view==='Y5'?'active':''}">Year 5</a>
      <a href="?view=Y6" class="nav-btn ${view==='Y6'?'active':''}">Year 6</a>
      <a href="/admin" class="nav-btn staff-btn">Staff Login</a>
    </nav>

    <div class="container">
      <h1>${title} Community Stars</h1>
      <button id="start-btn" onclick="runRace()">START RACE!</button>
      
      <div class="track">
        <div class="lane"><div class="house-label" style="color:#ffd700">Lewes</div><div id="cy" class="car"><span>🏎️</span><div id="vy" class="bubble">${scores.y}</div></div></div>
        <div class="lane"><div class="house-label" style="color:#ff4136">Amberley</div><div id="cr" class="car" style="filter: hue-rotate(140deg);"><span>🏎️</span><div id="vr" class="bubble">${scores.r}</div></div></div>
        <div class="lane"><div class="house-label" style="color:#0074d9">Hastings</div><div id="cb" class="car" style="filter: hue-rotate(210deg);"><span>🏎️</span><div id="vb" class="bubble">${scores.b}</div></div></div>
        <div class="lane"><div class="house-label" style="color:#2ecc40">Bramber</div><div id="cg" class="car" style="filter: hue-rotate(280deg);"><span>🏎️</span><div id="vg" class="bubble">${scores.g}</div></div></div>
        
        <div class="scale">
          <span>0</span><span>1000</span><span>2000</span><span>3000</span><span>4000</span><span>5000</span>
        </div>
      </div>
    </div>

    <script>
      function runRace() {
        document.getElementById('start-btn').style.display = 'none';
        const move = (id, vId, val) => {
          // Calculate move (cap at 85% of track width)
          const p = Math.min((val / 5000) * 85, 88);
          document.getElementById(id).style.left = "calc(140px + " + p + "%)";
          
          // Reveal score after car stops
          setTimeout(() => {
            document.getElementById(vId).style.display = 'block';
          }, 3900);
        };
        
        // Start cars with a tiny staggered delay for effect
        setTimeout(() => move('cy','vy', ${scores.y}), 0);
        setTimeout(() => move('cr','vr', ${scores.r}), 200);
        setTimeout(() => move('cb','vb', ${scores.b}), 400);
        setTimeout(() => move('cg','vg', ${scores.g}), 600);
      }
    </script>
  </body>
  </html>`;
}

function renderAdmin(data) {
  const years = ['WholeSchool', 'Y3', 'Y4', 'Y5', 'Y6'];
  return `
  <!DOCTYPE html>
  <html>
  <head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="font-family:sans-serif; padding:30px; background:#f4f4f4;">
    <div style="max-width:600px; margin:auto; background:white; padding:30px; border-radius:15px; box-shadow:0 5px 15px rgba(0,0,0,0.1);">
      <h2 style="margin-top:0">Staff Star Portal</h2>
      <form method="POST">
        <div style="background:#eee; padding:15px; border-radius:8px; margin-bottom:20px;">
          <strong>Admin Login</strong><br>
          User: <input type="text" name="user" required> 
          Pass: <input type="password" name="pass" required>
        </div>
        <hr>
        ${years.map(y => `
          <div style="margin-bottom:20px; border-bottom:1px solid #eee; padding-bottom:10px;">
            <h3 style="margin-bottom:5px;">${y} Totals</h3>
            L: <input type="number" name="${y}_y" value="${data[y].y}" style="width:60px"> 
            A: <input type="number" name="${y}_r" value="${data[y].r}" style="width:60px"> 
            H: <input type="number" name="${y}_b" value="${data[y].b}" style="width:60px"> 
            B: <input type="number" name="${y}_g" value="${data[y].g}" style="width:60px">
          </div>
        `).join('')}
        <button type="submit" style="width:100%; padding:20px; background:#28a745; color:white; border:none; border-radius:10px; font-weight:bold; font-size:1.1rem; cursor:pointer;">UPDATE RACE TRACKS</button>
      </form>
      <p><a href="/">Cancel & Back to Race</a></p>
    </div>
  </body>
  </html>`;
}
