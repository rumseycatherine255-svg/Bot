export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // --- ADMIN LOGIN LOGIC ---
    if (url.pathname === "/admin") {
      if (request.method === "POST") {
        const formData = await request.formData();
        if (formData.get("user") === "admin" && formData.get("pass") === "cmstars") {
          // Update scores in database
          const scores = {
            Yellow: formData.get("Yellow") || 0,
            Red: formData.get("Red") || 0,
            Blue: formData.get("Blue") || 0,
            Green: formData.get("Green") || 0
          };
          await env.STARS_DB.put("totals", JSON.stringify(scores));
          return new Response("Scores Updated! <a href='/'>View Track</a>", { headers: { "Content-Type": "text/html" } });
        }
        return new Response("Invalid Login", { status: 403 });
      }
      return new Response(adminPage(), { headers: { "Content-Type": "text/html" } });
    }

    // --- MAIN DISPLAY PAGE ---
    const data = await env.STARS_DB.get("totals", { type: "json" }) || { Yellow: 0, Red: 0, Blue: 0, Green: 0 };
    return new Response(mainPage(data), { headers: { "Content-Type": "text/html" } });
  }
};

function mainPage(scores) {
  // Calculate max score to determine race progress (e.g., 1000 is finish line)
  const goal = 1000; 
  const getPos = (val) => Math.min((val / goal) * 85, 85); // Caps at 85% across screen

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <title>TAB Junior Community Stars</title>
    <link href="https://fonts.googleapis.com/css2?family=Bungee&display=swap" rel="stylesheet">
    <style>
      body { background: #222; color: white; font-family: 'Segoe UI', Tahoma, sans-serif; margin: 0; padding: 20px; }
      h1 { text-align: center; font-family: 'Bungee', cursive; color: #ffeb3b; text-shadow: 2px 2px #000; }
      .track-container { background: #333; border: 5px solid #555; padding: 20px; border-radius: 15px; position: relative; overflow: hidden; }
      
      /* The Racing Lines */
      .lane { height: 80px; border-bottom: 2px dashed #666; position: relative; display: flex; align-items: center; }
      .lane:last-child { border-bottom: none; }
      .lane-label { width: 120px; font-weight: bold; font-size: 1.2rem; text-transform: uppercase; }
      
      .finish-line { position: absolute; right: 50px; top: 0; bottom: 0; width: 20px; background: repeating-conic-gradient(#fff 0% 25%, #000 0% 50%) 50% / 20px 20px; }
      
      .car { 
        position: absolute; height: 50px; transition: left 2s ease-in-out; 
        display: flex; flex-direction: column; align-items: center;
      }
      .car-icon { font-size: 40px; }
      .score-bubble { background: white; color: black; padding: 2px 8px; border-radius: 10px; font-size: 0.8rem; font-weight: bold; margin-top: -5px; }
      
      .lewes { color: #FFD700; } .amberley { color: #FF4136; } .hastings { color: #0074D9; } .bramber { color: #2ECC40; }
    </style>
  </head>
  <body>
    <h1>TAB Junior Community Star Race</h1>
    <div class="track-container">
      <div class="finish-line"></div>
      
      <div class="lane"><span class="lane-label lewes">Lewes</span>
        <div class="car" style="left: ${getPos(scores.Yellow)}%">
          <div class="car-icon">🏎️</div>
          <div class="score-bubble">${scores.Yellow}</div>
        </div>
      </div>

      <div class="lane"><span class="lane-label amberley">Amberley</span>
        <div class="car" style="left: ${getPos(scores.Red)}%">
          <div class="car-icon" style="filter: hue-rotate(140deg);">🏎️</div>
          <div class="score-bubble">${scores.Red}</div>
        </div>
      </div>

      <div class="lane"><span class="lane-label hastings">Hastings</span>
        <div class="car" style="left: ${getPos(scores.Blue)}%">
          <div class="car-icon" style="filter: hue-rotate(200deg);">🏎️</div>
          <div class="score-bubble">${scores.Blue}</div>
        </div>
      </div>

      <div class="lane"><span class="lane-label bramber">Bramber</span>
        <div class="car" style="left: ${getPos(scores.Green)}%">
          <div class="car-icon" style="filter: hue-rotate(280deg);">🏎️</div>
          <div class="score-bubble">${scores.Green}</div>
        </div>
      </div>
    </div>
    <p style="text-align:center; color: #888;">Admin: /admin</p>
  </body>
  </html>`;
}

function adminPage() {
  return `
  <!DOCTYPE html>
  <html>
  <head><title>Admin Login</title></head>
  <body style="font-family:sans-serif; padding: 50px; text-align: center;">
    <h2>Update Star Totals</h2>
    <form method="POST" style="display: inline-block; text-align: left; background: #f4f4f4; padding: 20px; border-radius: 8px;">
      <input type="text" name="user" placeholder="Username" required><br><br>
      <input type="password" name="pass" placeholder="Password" required><br><hr>
      Lewes (Yellow): <input type="number" name="Yellow"><br><br>
      Amberley (Red): <input type="number" name="Red"><br><br>
      Hastings (Blue): <input type="number" name="Blue"><br><br>
      Bramber (Green): <input type="number" name="Green"><br><br>
      <button type="submit" style="width:100%; padding: 10px; background: #28a745; color: white; border: none;">Update Race</button>
    </form>
  </body>
  </html>`;
}
