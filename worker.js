export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Default data structure
    const defaultScores = {
      WholeSchool: {y:0, r:0, b:0, g:0},
      Y3: {y:0, r:0, b:0, g:0}, Y4: {y:0, r:0, b:0, g:0},
      Y5: {y:0, r:0, b:0, g:0}, Y6: {y:0, r:0, b:0, g:0}
    };

    // 1. Fetch data from the database
    let starData;
    try {
      const kvData = await env.STARS_DB.get("tab_junior_scores");
      starData = kvData ? JSON.parse(kvData) : defaultScores;
    } catch (e) {
      starData = defaultScores;
    }

    // --- ADMIN ROUTE ---
    if (url.pathname === "/admin") {
      if (request.method === "POST") {
        const formData = await request.formData();
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
          await env.STARS_DB.put("tab_junior_scores", JSON.stringify(newScores));
          return new Response("<h1>Saved!</h1><a href='/'>Go to Race</a>", { headers: {"Content-Type": "text/html"} });
        }
        return new Response("Unauthorized", { status: 403 });
      }
      return new Response(renderAdmin(starData), { headers: {"Content-Type": "text/html"} });
    }

    // --- MAIN RACE VIEW ---
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
      body { background: #f4f4f4; font-family: 'Oswald', sans-serif; margin: 0; text-align: center; }
      nav { background: #111; padding: 15px; display: flex; justify-content: center; gap: 10px; }
      .nav-btn { color: white; text-decoration: none; padding: 10px 15px; background: #333; border-radius: 5px; }
      .active { background: #e74c3c; }
      
      .container { max-width: 1100px; margin: 30px auto; padding: 20px; }
      h1 { font-family: 'Bungee'; margin-bottom: 20px; }
      
      #start-btn { padding: 15px 40px; font-family: 'Bungee'; font-size: 1.5rem; background: #28a745; color: white; border: none; cursor: pointer; border-radius: 10px; box-shadow: 0 5px 0 #1e7e34; margin-bottom: 20px; }
      #start-btn:active { transform: translateY(4px); box-shadow: none; }

      .track { background: #333; border-radius: 20px; padding: 40px 20px; position: relative; border: 4px solid #444; }
      .lane { height: 90px; border-bottom: 2px dashed #555; position: relative; display: flex; align-items: center; }
      .lane:last-child { border-bottom: none; }
      
      .house-label { width: 130px; text-align: left; font-size: 1.5rem; color: #fff; font-weight: bold; }
      .car { position: absolute; left: 130px; font-size: 50px; transition: left 4s cubic-bezier(0.45, 0.05, 0.55, 0.95); display: flex; flex-direction: column; align-items: center; }
      .car span { transform: scaleX(-1); display: inline-block; }
      .bubble { background: #fff; color: #000; font-size: 14px; padding: 2px 8px; border-radius: 5px; margin-top: 5px; display: none; }

      .scale { display: flex; justify-content: space-between; margin-left: 130px; margin-top: 20px; border-top: 4px solid #fff; padding-top: 10px; color: #aaa; }
    </style>
  </head>
  <body>
    <nav>
      <a href="?view=WholeSchool" class="nav-btn ${view==='WholeSchool'?'active':''}">Whole School</a>
      <a href="?view=Y3" class="nav-btn ${view==='Y3'?'active':''}">Year 3</a>
      <a href="?view=Y4" class="nav-btn ${view==='Y4'?'active':''}">Year 4</a>
      <a href="?view=Y5" class="nav-btn ${view==='Y5'?'active':''}">Year 5</a>
      <a href="?view=Y6" class="nav-btn ${view==='Y6'?'active':''}">Year 6</a>
    </nav>
    <div class="container">
      <h1>${title} Race</h1>
      <button id="start-btn" onclick="go()">START RACE!</button>
      <div class="track">
        <div class="lane"><div class="house-label" style="color:#ffd700">Lewes</div><div id="cy" class="car"><span>🏎️</span><div id="vy" class="bubble">${scores.y}</div></div></div>
        <div class="lane"><div class="house-label" style="color:#ff4136">Amberley</div><div id="cr" class="car" style="filter: hue-rotate(140deg);"><span>🏎️</span><div id="vr" class="bubble">${scores.r}</div></div></div>
        <div class="lane"><div class="house-label" style="color:#0074d9">Hastings</div><div id="cb" class="car" style="filter: hue-rotate(210deg);"><span>🏎️</span><div id="vb" class="bubble">${scores.b}</div></div></div>
        <div class="lane"><div class="house-label" style="color:#2ecc40">Bramber</div><div id="cg" class="car" style="filter: hue-rotate(280deg);"><span>🏎️</span><div id="vg" class="bubble">${scores.g}</div></div></div>
        <div class="scale"><span>0</span><span>1000</span><span>2000</span><span>3000</span><span>4000</span><span>5000</span></div>
      </div>
    </div>
    <script>
      function go() {
        document.getElementById('start-btn').style.display = 'none';
        const move = (id, vId, val) => {
          const p = Math.min((val / 5000) * 85, 88);
          document.getElementById(id).style.left = "calc(130px + " + p + "%)";
          setTimeout(() => document.getElementById(vId).style.display = 'block', 3800);
        };
        move('cy','vy', ${scores.y}); move('cr','vr', ${scores.r});
        move('cb','vb', ${scores.b}); move('cg','vg', ${scores.g});
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
  <body style="font-family:sans-serif; padding:20px;">
    <h2>Staff Admin</h2>
    <form method="POST">
      User: <input type="text" name="user"> Pass: <input type="password" name="pass">
      <hr>
      ${years.map(y => `
        <h3>${y}</h3>
        L: <input type="number" name="${y}_y" value="${data[y].y}"> 
        A: <input type="number" name="${y}_r" value="${data[y].r}"> 
        H: <input type="number" name="${y}_b" value="${data[y].b}"> 
        B: <input type="number" name="${y}_g" value="${data[y].g}"><br>
      `).join('')}
      <br><button type="submit" style="padding:15px; background:green; color:white;">SAVE TOTALS TO WEB</button>
    </form>
  </body>
  </html>`;
}
