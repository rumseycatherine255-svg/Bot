export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. DATABASE SYNC: Get current totals from Cloudflare KV
    let scores = await env.STARS_DB.get("totals", { type: "json" });
    if (!scores) {
      scores = { Yellow: 0, Red: 0, Blue: 0, Green: 0 };
    }

    // 2. ROUTE: Admin Login/Update Page
    if (url.pathname === "/admin") {
      if (request.method === "POST") {
        const formData = await request.formData();
        const user = formData.get("user");
        const pass = formData.get("pass");

        if (user === "admin" && pass === "cmstars") {
          const newScores = {
            Yellow: parseInt(formData.get("Yellow") || 0),
            Red: parseInt(formData.get("Red") || 0),
            Blue: parseInt(formData.get("Blue") || 0),
            Green: parseInt(formData.get("Green") || 0)
          };
          await env.STARS_DB.put("totals", JSON.stringify(newScores));
          return new Response("Success! <a href='/'>Click here to see the race!</a>", { 
            headers: { "Content-Type": "text/html" } 
          });
        }
        return new Response("Unauthorized. Check username/password.", { status: 403 });
      }
      return new Response(renderAdminPage(scores), { headers: { "Content-Type": "text/html" } });
    }

    // 3. ROUTE: Main Racing Track
    return new Response(renderMainTrack(scores), { headers: { "Content-Type": "text/html" } });
  }
};

// --- HTML GENERATION FUNCTIONS ---

function renderMainTrack(scores) {
  // Goal is 1000 stars to reach the finish line
  const goal = 1000;
  const calcPos = (val) => Math.min((val / goal) * 85, 88); 

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TAB Junior F1 Star Race</title>
    <link href="https://fonts.googleapis.com/css2?family=Bungee&family=Oswald:wght@700&display=swap" rel="stylesheet">
    <style>
      :root {
        --lewes: #FFD700; --amberley: #FF4136; --hastings: #0074D9; --bramber: #2ECC40;
      }
      body { 
        background: #1a1a1a; color: white; font-family: 'Oswald', sans-serif; 
        margin: 0; padding: 20px; display: flex; flex-direction: column; align-items: center;
      }
      h1 { font-family: 'Bungee', cursive; font-size: 2.5rem; color: #fff; text-shadow: 4px 4px #e74c3c; margin-bottom: 10px; text-align:center; }
      
      .track-area { 
        width: 95%; max-width: 1000px; background: #333; border: 8px solid #444; 
        border-radius: 20px; position: relative; padding: 20px 0; margin-top: 20px;
        box-shadow: 0 20px 50px rgba(0,0,0,0.5);
      }
      
      .finish-line { 
        position: absolute; right: 40px; top: 0; bottom: 0; width: 30px; 
        background: repeating-conic-gradient(#fff 0% 25%, #000 0% 50%) 50% / 20px 20px;
        border-left: 2px solid #fff; border-right: 2px solid #fff; z-index: 1;
      }

      .lane { 
        height: 100px; border-bottom: 2px dashed #555; position: relative; 
        display: flex; align-items: center; z-index: 2;
      }
      .lane:last-child { border-bottom: none; }
      
      .house-name { 
        width: 120px; padding-left: 20px; font-size: 1.4rem; letter-spacing: 1px;
        text-transform: uppercase; text-shadow: 2px 2px #000;
      }

      .car-container {
        position: absolute; height: 60px; transition: left 2.5s cubic-bezier(0.45, 0.05, 0.55, 0.95);
        display: flex; flex-direction: column; align-items: center;
      }
      
      .f1-car { font-size: 50px; line-height: 1; filter: drop-shadow(2px 4px 6px black); }
      .score-tag { 
        background: #fff; color: #000; padding: 2px 10px; border-radius: 5px; 
        font-size: 1rem; font-weight: 900; margin-top: -5px; border: 2px solid #000;
      }

      .footer { margin-top: 30px; color: #666; font-size: 0.9rem; text-decoration: none; }
    </style>
  </head>
  <body>
    <h1>COMMUNITY STAR TOTALS</h1>
    
    <div class="track-area">
      <div class="finish-line"></div>
      
      <div class="lane">
        <div class="house-name" style="color: var(--lewes)">Lewes</div>
        <div class="car-container" style="left: ${calcPos(scores.Yellow)}%">
          <div class="f1-car">🏎️</div>
          <div class="score-tag">${scores.Yellow}</div>
        </div>
      </div>

      <div class="lane">
        <div class="house-name" style="color: var(--amberley)">Amberley</div>
        <div class="car-container" style="left: ${calcPos(scores.Red)}%">
          <div class="f1-car" style="filter: hue-rotate(140deg);">🏎️</div>
          <div class="score-tag">${scores.Red}</div>
        </div>
      </div>

      <div class="lane">
        <div class="house-name" style="color: var(--hastings)">Hastings</div>
        <div class="car-container" style="left: ${calcPos(scores.Blue)}%">
          <div class="f1-car" style="filter: hue-rotate(210deg);">🏎️</div>
          <div class="score-tag">${scores.Blue}</div>
        </div>
      </div>

      <div class="lane">
        <div class="house-name" style="color: var(--bramber)">Bramber</div>
        <div class="car-container" style="left: ${calcPos(scores.Green)}%">
          <div class="f1-car" style="filter: hue-rotate(280deg);">🏎️</div>
          <div class="score-tag">${scores.Green}</div>
        </div>
      </div>
    </div>

    <a href="/admin" class="footer">Staff Login</a>
  </body>
  </html>`;
}

function renderAdminPage(scores) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin - Update Stars</title>
    <style>
      body { font-family: sans-serif; background: #f0f0f0; display: flex; justify-content: center; padding-top: 50px; }
      .card { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 10px 20px rgba(0,0,0,0.1); width: 100%; max-width: 400px; }
      input { width: 100%; padding: 12px; margin: 10px 0; border: 1px solid #ccc; border-radius: 6px; box-sizing: border-box; font-size: 1rem; }
      button { width: 100%; padding: 15px; background: #0074D9; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 1.1rem; font-weight: bold; }
      label { font-weight: bold; font-size: 0.9rem; color: #555; }
      .house-row { margin-bottom: 15px; }
    </style>
  </head>
  <body>
    <div class="card">
      <h2 style="margin-top:0">Update Star Totals</h2>
      <form method="POST">
        <label>Login Credentials</label>
        <input type="text" name="user" placeholder="Username" required>
        <input type="password" name="pass" placeholder="Password" required>
        <hr style="margin: 20px 0; border: 0; border-top: 1px solid #eee;">
        
        <div class="house-row">
          <label style="color:#d4af37">Lewes (Yellow)</label>
          <input type="number" name="Yellow" value="${scores.Yellow}">
        </div>
        <div class="house-row">
          <label style="color:#FF4136">Amberley (Red)</label>
          <input type="number" name="Red" value="${scores.Red}">
        </div>
        <div class="house-row">
          <label style="color:#0074D9">Hastings (Blue)</label>
          <input type="number" name="Blue" value="${scores.Blue}">
        </div>
        <div class="house-row">
          <label style="color:#2ECC40">Bramber (Green)</label>
          <input type="number" name="Green" value="${scores.Green}">
        </div>
        
        <button type="submit">Update Track</button>
      </form>
    </div>
  </body>
  </html>`;
}
