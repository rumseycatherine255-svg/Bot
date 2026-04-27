export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // SAFETY CHECK: Ensure KV is working
    if (!env.STARS_DB) {
      return new Response("KV Binding Missing: check your wrangler.toml for STARS_DB.", { status: 500 });
    }

    // Load data or set defaults
    let scores;
    try {
      const kvData = await env.STARS_DB.get("totals");
      scores = kvData ? JSON.parse(kvData) : {
        WholeSchool: { Yellow: 0, Red: 0, Blue: 0, Green: 0 },
        Y3: { Yellow: 0, Red: 0, Blue: 0, Green: 0 },
        Y4: { Yellow: 0, Red: 0, Blue: 0, Green: 0 },
        Y5: { Yellow: 0, Red: 0, Blue: 0, Green: 0 },
        Y6: { Yellow: 0, Red: 0, Blue: 0, Green: 0 }
      };
    } catch (e) {
      scores = {
        WholeSchool: { Yellow: 0, Red: 0, Blue: 0, Green: 0 },
        Y3: { Yellow: 0, Red: 0, Blue: 0, Green: 0 },
        Y4: { Yellow: 0, Red: 0, Blue: 0, Green: 0 },
        Y5: { Yellow: 0, Red: 0, Blue: 0, Green: 0 },
        Y6: { Yellow: 0, Red: 0, Blue: 0, Green: 0 }
      };
    }

    // --- ADMIN ROUTE ---
    if (url.pathname === "/admin") {
      if (request.method === "POST") {
        const formData = await request.formData();
        if (formData.get("user") === "admin" && formData.get("pass") === "cmstars") {
          const keys = ["WholeSchool", "Y3", "Y4", "Y5", "Y6"];
          const newScores = {};
          keys.forEach(k => {
            newScores[k] = {
              Yellow: parseInt(formData.get(`${k}_Y`) || 0),
              Red: parseInt(formData.get(`${k}_R`) || 0),
              Blue: parseInt(formData.get(`${k}_B`) || 0),
              Green: parseInt(formData.get(`${k}_G`) || 0)
            };
          });
          await env.STARS_DB.put("totals", JSON.stringify(newScores));
          return new Response("Success! <a href='/'>View Race</a>", { headers: { "Content-Type": "text/html" } });
        }
        return new Response("Wrong Username/Password", { status: 403 });
      }
      return new Response(renderAdmin(scores), { headers: { "Content-Type": "text/html" } });
    }

    // --- MAIN PAGES ---
    const view = url.searchParams.get("view") || "WholeSchool";
    return new Response(renderTrack(view, scores), { headers: { "Content-Type": "text/html" } });
  }
};

function renderTrack(view, allScores) {
  const scores = allScores[view];
  const labels = { "WholeSchool": "Whole School", "Y3": "Year 3", "Y4": "Year 4", "Y5": "Year 5", "Y6": "Year 6" };
  const maxScore = 5000;

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TAB Community Stars</title>
    <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@700&display=swap" rel="stylesheet">
    <style>
      body { background: #fdfdfd; font-family: 'Oswald', sans-serif; margin: 0; text-align: center; }
      nav { padding: 20px; background: #333; display: flex; justify-content: center; flex-wrap: wrap; gap: 10px; }
      .nav-btn { color: white; text-decoration: none; padding: 10px 15px; border-radius: 5px; background: #444; transition: 0.2s; }
      .nav-btn:hover, .active { background: #e74c3c; }
      
      .container { max-width: 1000px; margin: 20px auto; padding: 20px; background: white; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
      .track { background: #eee; border-radius: 10px; padding: 20px; position: relative; margin-top: 20px; }
      .lane { height: 80px; display: flex; align-items: center; position: relative; border-bottom: 2px dashed #ddd; }
      .lane:last-child { border-bottom: none; }
      
      .house-name { width: 120px; text-align: left; font-size: 1.2rem; }
      .car { 
        position: absolute; left: 120px; font-size: 45px; transition: left 3s ease-in-out; 
        display: flex; align-items: center; 
      }
      .car span { transform: scaleX(-1); display: inline-block; } /* Flip car emoji */
      
      .score-tag { background: black; color: white; font-size: 12px; padding: 2px 6px; border-radius: 4px; margin-left: 5px; font-family: sans-serif; }
      
      .ruler { display: flex; justify-content: space-between; margin-left: 120px; padding-top: 10px; border-top: 3px solid #333; color: #777; }
      
      .yellow { color: #d4af37; } .red { color: #e74c3c; } .blue { color: #3498db; } .green { color: #2ecc71; }
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
      <h2>${labels[view]} Community Stars</h2>
      <div class="track">
        <div class="lane"><div class="house-name yellow">Lewes</div><div id="car-y" class="car"><span>🏎️</span><div class="score-tag">${scores.Yellow}</div></div></div>
        <div class="lane"><div class="house-name red">Amberley</div><div id="car-r" class="car" style="filter: hue-rotate(140deg);"><span>🏎️</span><div class="score-tag">${scores.Red}</div></div></div>
        <div class="lane"><div class="house-name blue">Hastings</div><div id="car-b" class="car" style="filter: hue-rotate(210deg);"><span>🏎️</span><div class="score-tag">${scores.Blue}</div></div></div>
        <div class="lane"><div class="house-name green">Bramber</div><div id="car-g" class="car" style="filter: hue-rotate(280deg);"><span>🏎️</span><div class="score-tag">${scores.Green}</div></div></div>
        
        <div class="ruler">
          <span>0</span><span>1000</span><span>2000</span><span>3000</span><span>4000</span><span>5000</span>
        </div>
      </div>
    </div>

    <script>
      function move(id, val) {
        const p = Math.min((val / ${maxScore}) * 80, 85);
        document.getElementById(id).style.left = "calc(120px + " + p + "%)";
      }
      window.onload = () => {
        move('car-y', ${scores.Yellow}); move('car-r', ${scores.Red}); 
        move('car-b', ${scores.Blue}); move('car-g', ${scores.Green});
      };
    </script>
    <p><a href="/admin" style="color:#eee; text-decoration:none">.</a></p>
  </body>
  </html>`;
}

function renderAdmin(scores) {
  const keys = ["WholeSchool", "Y3", "Y4", "Y5", "Y6"];
  return `<!DOCTYPE html><html><body style="font-family:sans-serif; padding:20px;">
    <h2>Race Admin</h2>
    <form method="POST">
      User: <input type="text" name="user" required> 
      Pass: <input type="password" name="pass" required><br><hr>
      ${keys.map(k => `
        <h3>${k}</h3>
        Lewes: <input type="number" name="${k}_Y" value="${scores[k].Yellow}">
        Amberley: <input type="number" name="${k}_R" value="${scores[k].Red}">
        Hastings: <input type="number" name="${k}_B" value="${scores[k].Blue}">
        Bramber: <input type="number" name="${k}_G" value="${scores[k].Green}"><br>
      `).join('')}
      <br><button type="submit" style="padding:15px; background:green; color:white; border:none;">SAVE ALL TOTALS</button>
    </form>
  </body></html>`;
}
