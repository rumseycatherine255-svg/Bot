export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. DEFAULT DATA (Prevents 1101 Errors)
    let scores = {
      WholeSchool: { Yellow: 0, Red: 0, Blue: 0, Green: 0 },
      Y3: { Yellow: 0, Red: 0, Blue: 0, Green: 0 },
      Y4: { Yellow: 0, Red: 0, Blue: 0, Green: 0 },
      Y5: { Yellow: 0, Red: 0, Blue: 0, Green: 0 },
      Y6: { Yellow: 0, Red: 0, Blue: 0, Green: 0 }
    };

    // 2. TRY TO LOAD FROM DATABASE
    try {
      const kvData = await env.STARS_DB.get("totals");
      if (kvData) {
        scores = JSON.parse(kvData);
      }
    } catch (e) {
      console.log("KV not initialized yet, using defaults.");
    }

    // 3. ADMIN ROUTE
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
          return new Response("<h1>Scores Saved!</h1><a href='/'>Go to Race Track</a>", { 
            headers: { "Content-Type": "text/html" } 
          });
        }
        return new Response("Wrong Password", { status: 403 });
      }
      return new Response(renderAdmin(scores), { headers: { "Content-Type": "text/html" } });
    }

    // 4. MAIN PAGE ROUTE
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
      nav { padding: 15px; background: #222; display: flex; justify-content: center; flex-wrap: wrap; gap: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
      .nav-btn { color: #bbb; text-decoration: none; padding: 8px 16px; border-radius: 4px; background: #333; font-size: 0.9rem; transition: 0.2s; }
      .nav-btn:hover { background: #444; color: white; }
      .active { background: #e74c3c; color: white; pointer-events: none; }
      
      .container { max-width: 1100px; margin: 20px auto; padding: 20px; }
      h2 { text-transform: uppercase; letter-spacing: 2px; color: #1a1a1a; margin-bottom: 30px; }
      
      .track-box { background: #f0f0f0; border-radius: 20px; padding: 40px 20px; border: 2px solid #ddd; position: relative; box-shadow: inset 0 0 20px rgba(0,0,0,0.05); }
      .lane { height: 90px; display: flex; align-items: center; position: relative; border-bottom: 2px dashed #ccc; }
      .lane:last-child { border-bottom: none; }
      
      .house-label { width: 120px; text-align: left; font-size: 1.4rem; font-weight: bold; }
      .car { 
        position: absolute; left: 120px; font-size: 50px; transition: left 3s cubic-bezier(0.34, 1.56, 0.64, 1); 
        display: flex; flex-direction: column; align-items: center; line-height: 1;
      }
      .car span { transform: scaleX(-1); display: inline-block; } /* Car faces right */
      
      .score-bubble { background: #333; color: white; font-size: 14px; padding: 2px 8px; border-radius: 5px; margin-top: 5px; font-family: sans-serif; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
      
      .scale { display: flex; justify-content: space-between; margin-left: 120px; margin-top: 15px; border-top: 4px solid #333; padding-top: 8px; color: #666; font-weight: bold; }
      
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
      <div class="track-box">
        <div class="lane"><div class="house-label yellow">Lewes</div><div id="car-y" class="car"><span>🏎️</span><div class="score-bubble">${scores.Yellow}</div></div></div>
        <div class="lane"><div class="house-label red">Amberley</div><div id="car-r" class="car" style="filter: hue-rotate(140deg);"><span>🏎️</span><div class="score-bubble">${scores.Red}</div></div></div>
        <div class="lane"><div class="house-label blue">Hastings</div><div id="car-b" class="car" style="filter: hue-rotate(210deg);"><span>🏎️</span><div class="score-bubble">${scores.Blue}</div></div></div>
        <div class="lane"><div class="house-label green">Bramber</div><div id="car-g" class="car" style="filter: hue-rotate(280deg);"><span>🏎️</span><div class="score-bubble">${scores.Green}</div></div></div>
        
        <div class="scale">
          <span>0</span><span>1000</span><span>2000</span><span>3000</span><span>4000</span><span>MAX (5k)</span>
        </div>
      </div>
    </div>

    <script>
      function drive(id, val) {
        // Calculate percentage (capping at 85% of track width)
        const percent = Math.min((val / ${maxScore}) * 85, 88);
        document.getElementById(id).style.left = "calc(120px + " + percent + "%)";
      }
      
      // Drive cars when page loads
      window.onload = () => {
        drive('car-y', ${scores.Yellow});
        drive('car-r', ${scores.Red});
        drive('car-b', ${scores.Blue});
        drive('car-g', ${scores.Green});
      };
    </script>
    <div style="margin-top:100px; opacity: 0.1;"><a href="/admin">Staff Admin</a></div>
  </body>
  </html>`;
}

function renderAdmin(scores) {
  const keys = ["WholeSchool", "Y3", "Y4", "Y5", "Y6"];
  return `
  <!DOCTYPE html>
  <html>
  <head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="font-family:sans-serif; padding:20px; background:#f4f4f4;">
    <div style="max-width:500px; margin:auto; background:white; padding:25px; border-radius:12px; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">
      <h2 style="margin-top:0">Update Star Totals</h2>
      <form method="POST">
        <input type="text" name="user" placeholder="Username" style="width:100%; padding:10px; margin-bottom:10px;" required>
        <input type="password" name="pass" placeholder="Password" style="width:100%; padding:10px; margin-bottom:20px;" required>
        
        ${keys.map(k => `
          <div style="background:#eee; padding:10px; border-radius:8px; margin-bottom:15px;">
            <h4 style="margin:0 0 10px 0">${k}</h4>
            Y: <input type="number" name="${k}_Y" value="${scores[k].Yellow}" style="width:50px"> 
            R: <input type="number" name="${k}_R" value="${scores[k].Red}" style="width:50px"> 
            B: <input type="number" name="${k}_B" value="${scores[k].Blue}" style="width:50px"> 
            G: <input type="number" name="${k}_G" value="${scores[k].Green}" style="width:50px">
          </div>
        `).join('')}
        
        <button type="submit" style="width:100%; padding:15px; background:#2ecc71; color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer;">SAVE ALL CHANGES</button>
      </form>
    </div>
  </body>
  </html>`;
}
