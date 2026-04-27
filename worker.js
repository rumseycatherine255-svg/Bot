export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const defaultScores = {
      WholeSchool: {y:0, r:0, b:0, g:0},
      Y3: {y:0, r:0, b:0, g:0}, Y4: {y:0, r:0, b:0, g:0},
      Y5: {y:0, r:0, b:0, g:0}, Y6: {y:0, r:0, b:0, g:0}
    };

    let starData;
    try {
      const kvData = await env.STARS_DB.get("tab_junior_scores");
      starData = kvData ? JSON.parse(kvData) : defaultScores;
    } catch (e) {
      starData = defaultScores;
    }

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
          return new Response("<h1>Saved!</h1><a href='/'>Back to Race</a>", { headers: {"Content-Type": "text/html"} });
        }
        return new Response("Unauthorized", { status: 403 });
      }
      return new Response(renderAdmin(starData), { headers: {"Content-Type": "text/html"} });
    }

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
      body { background: #0a0a0a; font-family: 'Oswald', sans-serif; margin: 0; text-align: center; color: white; overflow-x: hidden; }
      nav { background: #000; padding: 15px; display: flex; justify-content: center; gap: 10px; border-bottom: 2px solid #333; }
      .nav-btn { color: #888; text-decoration: none; padding: 8px 15px; background: #222; border-radius: 5px; font-weight: bold; }
      .active { background: #e10600; color: white; }
      
      .container { max-width: 1100px; margin: 20px auto; padding: 20px; }
      h1 { font-family: 'Bungee'; font-size: 3.5rem; margin-bottom: 10px; color: #fff; text-shadow: 0 0 20px rgba(255,0,0,0.4); }
      
      #countdown { 
        display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        font-family: 'Bungee'; font-size: 18rem; z-index: 100; color: #fff; text-shadow: 0 0 50px #e10600;
      }

      #start-btn { 
        padding: 25px 60px; font-family: 'Bungee'; font-size: 2.2rem; background: #28a745; 
        color: white; border: none; cursor: pointer; border-radius: 5px; box-shadow: 0 8px 0 #1e7e34; margin-bottom: 30px; 
      }

      .track { background: #111; border-radius: 10px; padding: 50px 20px; border: 10px solid #222; position: relative; }
      .lane { height: 110px; border-bottom: 3px dashed #333; position: relative; display: flex; align-items: center; }
      .lane:last-child { border-bottom: none; }
      
      .house-label { width: 160px; text-align: left; font-size: 2rem; font-weight: bold; font-family: 'Bungee'; font-style: italic; }
      
      .car { position: absolute; left: 160px; font-size: 70px; transition: left 3.5s cubic-bezier(0.45, 0.05, 0.55, 0.95); display: flex; flex-direction: column; align-items: center; z-index: 50; }
      .car span { transform: scaleX(-1); display: inline-block; }
      
      .car-yellow { filter: hue-rotate(50deg) brightness(1.2); }
      .car-red { filter: none; }
      .car-blue { filter: hue-rotate(220deg); }
      .car-green { filter: hue-rotate(100deg); }
      
      .bubble { background: #e10600; color: #fff; font-size: 20px; padding: 4px 15px; border-radius: 4px; margin-top: 5px; display: none; font-weight: bold; font-family: 'Bungee'; border: 2px solid white; }

      .scale { display: flex; justify-content: space-between; margin-left: 160px; margin-top: 25px; border-top: 8px solid #fff; padding-top: 10px; color: #666; font-size: 1.4rem; font-family: 'Bungee'; }
    </style>
  </head>
  <body>
    <div id="countdown">3</div>
    
    <audio id="snd-drum" src="https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3"></audio>

    <nav>
      <a href="?view=WholeSchool" class="nav-btn ${view==='WholeSchool'?'active':''}">Whole School</a>
      <a href="?view=Y3" class="nav-btn ${view==='Y3'?'active':''}">Year 3</a>
      <a href="?view=Y4" class="nav-btn ${view==='Y4'?'active':''}">Year 4</a>
      <a href="?view=Y5" class="nav-btn ${view==='Y5'?'active':''}">Year 5</a>
      <a href="?view=Y6" class="nav-btn ${view==='Y6'?'active':''}">Year 6</a>
      <a href="/admin" class="nav-btn" style="opacity:0.2">Admin</a>
    </nav>

    <div class="container">
      <h1>${title} GP</h1>
      <button id="start-btn" onclick="startSequence()">READY...</button>
      
      <div class="track">
        <div class="lane"><div class="house-label" style="color:#ffd700">LEWES</div><div id="cy" class="car car-yellow"><span>🏎️</span><div id="vy" class="bubble">${scores.y}</div></div></div>
        <div class="lane"><div class="house-label" style="color:#ff4136">AMBERLEY</div><div id="cr" class="car car-red"><span>🏎️</span><div id="vr" class="bubble">${scores.r}</div></div></div>
        <div class="lane"><div class="house-label" style="color:#0074d9">HASTINGS</div><div id="cb" class="car car-blue"><span>🏎️</span><div id="vb" class="bubble">${scores.b}</div></div></div>
        <div class="lane"><div class="house-label" style="color:#2ecc40">BRAMBER</div><div id="cg" class="car car-green"><span>🏎️</span><div id="vg" class="bubble">${scores.g}</div></div></div>
        <div class="scale"><span>0</span><span>1000</span><span>2000</span><span>3000</span><span>4000</span><span>5000</span></div>
      </div>
    </div>

    <script>
      const drum = document.getElementById('snd-drum');

      function startSequence() {
        const btn = document.getElementById('start-btn');
        const countDiv = document.getElementById('countdown');
        btn.style.display = 'none';
        countDiv.style.display = 'block';
        
        let count = 3;
        
        // Initial "Budun" for 3
        drum.currentTime = 0;
        drum.play();

        const timer = setInterval(() => {
          count--;
          if (count > 0) {
            countDiv.innerText = count;
            drum.currentTime = 0;
            drum.play(); // "Budun" for 2 and 1
          } else if (count === 0) {
            countDiv.innerText = "GO!";
            countDiv.style.color = "#00ff00";
            
            drum.currentTime = 0;
            drum.play(); // Final "Budun" for GO!
            
            clearInterval(timer);
            runRace();
            setTimeout(() => { countDiv.style.display = 'none'; }, 1000);
          }
        }, 1000);
      }

      function runRace() {
        const move = (id, vId, val) => {
          const p = Math.min((val / 5000) * 82, 85);
          document.getElementById(id).style.left = "calc(160px + " + p + "%)";
          setTimeout(() => { document.getElementById(vId).style.display = 'block'; }, 3600);
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
  return `<!DOCTYPE html><html><body style="font-family:sans-serif; padding:30px;"><h2>Staff Admin</h2><form method="POST">User: <input type="text" name="user"> Pass: <input type="password" name="pass"><hr>${years.map(y => `<h3>${y}</h3>L: <input type="number" name="${y}_y" value="${data[y].y}"> A: <input type="number" name="${y}_r" value="${data[y].r}"> H: <input type="number" name="${y}_b" value="${data[y].b}"> B: <input type="number" name="${y}_g" value="${data[y].g}"><br>`).join('')}<br><button type="submit">SAVE TO CLOUDFLARE</button></form></body></html>`;
}
