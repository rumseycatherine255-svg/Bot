export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Initial Data Setup
    let scores = await env.STARS_DB.get("totals", { type: "json" }) || {
      WholeSchool: { Yellow: 0, Red: 0, Blue: 0, Green: 0 },
      Y3: { Yellow: 0, Red: 0, Blue: 0, Green: 0 },
      Y4: { Yellow: 0, Red: 0, Blue: 0, Green: 0 },
      Y5: { Yellow: 0, Red: 0, Blue: 0, Green: 0 },
      Y6: { Yellow: 0, Red: 0, Blue: 0, Green: 0 }
    };

    // --- ADMIN ROUTE ---
    if (url.pathname === "/admin") {
      if (request.method === "POST") {
        const formData = await request.formData();
        if (formData.get("user") === "admin" && formData.get("pass") === "cmstars") {
          const keys = ["WholeSchool", "Y3", "Y4", "Y5", "Y6"];
          keys.forEach(k => {
            scores[k] = {
              Yellow: parseInt(formData.get(`${k}_Y`) || 0),
              Red: parseInt(formData.get(`${k}_R`) || 0),
              Blue: parseInt(formData.get(`${k}_B`) || 0),
              Green: parseInt(formData.get(`${k}_G`) || 0)
            };
          });
          await env.STARS_DB.put("totals", JSON.stringify(scores));
          return new Response("Updated! <a href='/'>Back to Site</a>", { headers: { "Content-Type": "text/html" } });
        }
        return new Response("Invalid Admin Credentials", { status: 403 });
      }
      return new Response(renderAdmin(scores), { headers: { "Content-Type": "text/html" } });
    }

    // --- PAGE ROUTING ---
    const page = url.searchParams.get("view") || "WholeSchool";
    return new Response(renderPage(page, scores), { headers: { "Content-Type": "text/html" } });
  }
};

function renderPage(view, allScores) {
  const scores = allScores[view];
  const titleMap = { "WholeSchool": "Whole School", "Y3": "Year 3", "Y4": "Year 4", "Y5": "Year 5", "Y6": "Year 6" };
  const maxScore = 5000; // The end of the track scale

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TAB Junior Community Stars</title>
    <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@700&display=swap" rel="stylesheet">
    <style>
      body { background: #fdfdfd; font-family: 'Oswald', sans-serif; margin: 0; color: #333; }
      header { background: #fff; padding: 20px; border-bottom: 4px solid #eee; text-align: center; }
      h1 { margin: 0; color: #1a1a1a; letter-spacing: 2px; }
      
      nav { display: flex; justify-content: center; gap: 10px; padding: 20px; flex-wrap: wrap; }
      .nav-btn { 
        padding: 10px 20px; background: #eee; text-decoration: none; color: #555; 
        border-radius: 5px; font-weight: bold; transition: 0.3s; 
      }
      .nav-btn:hover { background: #ddd; }
      .nav-btn.active { background: #333; color: white; }

      .container { max-width: 1000px; margin: 0 auto; padding: 20px; }
      .track-box { background: #f0f0f0; border-radius: 15px; padding: 40px 20px; position: relative; overflow: hidden; box-shadow: inset 0 2px 10px rgba(0,0,0,0.05); }
      
      .lane { height: 70px; position: relative; border-bottom: 1px dashed #ccc; display: flex; align-items: center; }
      .lane:last-of-type { border-bottom: none; }
      
      .house-label { width: 100px; font-size: 1.2rem; text-transform: uppercase; }
      .car { 
        position: absolute; left: 0; font-size: 40px; 
        transition: left 3s ease-out; display: flex; align-items: center;
      }
      /* Ensure the emoji faces right */
      .car span { display: inline-block; transform: scaleX(-1); } 

      .scale { 
        display: flex; justify-content: space-between; margin-top: 10px; 
        border-top: 2px solid #333; padding-top: 5px; color: #888; font-size: 0.9rem;
        margin-left: 100px; /* Aligns with start of track */
      }

      .score-box { background: #333; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; margin-left: 5px; }

      .yellow { color: #d4af37; } .red { color: #e74c3c; } .blue { color: #3498db; } .green { color: #2ecc71; }
    </style>
  </head>
  <body>
    <header>
      <h1>COMMUNITY STARS: ${titleMap[view]}</h1>
    </header>

    <nav>
      <a href="?view=WholeSchool" class="nav-btn ${view === 'WholeSchool' ? 'active' : ''}">Whole School</a>
      <a href="?view=Y3" class="nav-btn ${view === 'Y3' ? 'active' : ''}">Year 3</a>
      <a href="?view=Y4" class="nav-btn ${view === 'Y4' ? 'active' : ''}">Year 4</a>
      <a href="?view=Y5" class="nav-btn ${view === 'Y5' ? 'active' : ''}">Year 5</a>
      <a href="?view=Y6" class="nav-btn ${view === 'Y6' ? 'active' : ''}">Year 6</a>
    </nav>

    <div class="container">
      <div class="track-box">
        <div class="lane">
          <div class="house-label yellow">Lewes</div>
          <div class="car" id="car-y"><span>🏎️</span><div class="score-box">${scores.Yellow}</div></div>
        </div>
        <div class="lane">
          <div class="house-label red">Amberley</div>
          <div class="car" id="car-r" style="filter: hue-rotate(140deg);"><span>🏎️</span><div class="score-box">${scores.Red}</div></div>
        </div>
        <div class="lane">
          <div class="house-label blue">Hastings</div>
          <div class="car" id="car-b" style="filter: hue-rotate(210deg);"><span>🏎️</span><div class="score-box">${scores.Blue}</div></div>
        </div>
        <div class="lane">
          <div class="house-label green">Bramber</div>
          <div class="car" id="car-g" style="filter: hue-rotate(280deg);"><span>🏎️</span><div class="score-box">${scores.Green}</div></div>
        </div>

        <div class="scale">
          <span>0</span><span>1000</span><span>2000</span><span>3000</span><span>4000</span><span>5000</span>
        </div>
      </div>
    </div>

    <script>
      function setPosition(id, score) {
        const percent = Math.min((score / ${maxScore}) * 85, 88);
        document.getElementById(id).style.left = "calc(100px + " + percent + "%)";
      }

      // Trigger movement after page load
      window.onload = () => {
        setPosition('car-y', ${scores.Yellow});
        setPosition('car-r', ${scores.Red});
        setPosition('car-b', ${scores.Blue});
        setPosition('car-g', ${scores.Green});
      };
    </script>
    <div style="text-align:center; margin-top:50px;"><a href="/admin" style="color:#ccc; text-decoration:none;">Admin</a></div>
  </body>
  </html>`;
}

function renderAdmin(scores) {
  const keys = ["WholeSchool", "Y3", "Y4", "Y5", "Y6"];
  return `
  <!DOCTYPE html>
  <html>
  <body style="font-family:sans-serif; padding:40px; background:#f4f4f4;">
    <div style="max-width:600px; margin:auto; background:white; padding:20px; border-radius:10px;">
      <h2>Update House Totals</h2>
      <form method="POST">
        <input type="text" name="user" placeholder="Username" required><br>
        <input type="password" name="pass" placeholder="Password" required><br>
        <hr>
        ${keys.map(k => `
          <h3>${k}</h3>
          Y: <input type="number" name="${k}_Y" value="${scores[k].Yellow}">
          R: <input type="number" name="${k}_R" value="${scores[k].Red}">
          B: <input type="number" name="${k}_B" value="${scores[k].Blue}">
          G: <input type="number" name="${k}_G" value="${scores[k].Green}">
        `).join('<br>')}
        <br><br>
        <button type="submit" style="padding:10px 20px; background:green; color:white; border:none; border-radius:5px;">Save All Totals</button>
      </form>
    </div>
  </body>
  </html>`;
}
