export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let scores = await env.STARS_DB.get("totals", { type: "json" }) || {
      Y3: { Yellow: 0, Red: 0, Blue: 0, Green: 0 },
      Y4: { Yellow: 0, Red: 0, Blue: 0, Green: 0 },
      Y5: { Yellow: 0, Red: 0, Blue: 0, Green: 0 },
      Y6: { Yellow: 0, Red: 0, Blue: 0, Green: 0 }
    };

    if (url.pathname === "/admin") {
      if (request.method === "POST") {
        const formData = await request.formData();
        if (formData.get("user") === "admin" && formData.get("pass") === "cmstars") {
          const newScores = {
            Y3: { Yellow: formData.get("Y3_Y"), Red: formData.get("Y3_R"), Blue: formData.get("Y3_B"), Green: formData.get("Y3_G") },
            Y4: { Yellow: formData.get("Y4_Y"), Red: formData.get("Y4_R"), Blue: formData.get("Y4_B"), Green: formData.get("Y4_G") },
            Y5: { Yellow: formData.get("Y5_Y"), Red: formData.get("Y5_R"), Blue: formData.get("Y5_B"), Green: formData.get("Y5_G") },
            Y6: { Yellow: formData.get("Y6_Y"), Red: formData.get("Y6_R"), Blue: formData.get("Y6_B"), Green: formData.get("Y6_G") }
          };
          await env.STARS_DB.put("totals", JSON.stringify(newScores));
          return new Response("Race Data Updated! <a href='/'>Go to Race</a>", { headers: { "Content-Type": "text/html" } });
        }
        return new Response("Access Denied", { status: 403 });
      }
      return new Response(renderAdmin(scores), { headers: { "Content-Type": "text/html" } });
    }

    return new Response(renderRace(scores), { headers: { "Content-Type": "text/html" } });
  }
};

function renderRace(data) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>TAB Junior Grand Prix</title>
    <link href="https://fonts.googleapis.com/css2?family=Bungee&family=Oswald:wght@700&display=swap" rel="stylesheet">
    <style>
      body { background: #111; color: white; font-family: 'Oswald', sans-serif; margin: 0; overflow-x: hidden; text-align: center; }
      .stadium { padding: 20px; }
      h1 { font-family: 'Bungee'; color: #FF3E3E; font-size: 3rem; margin: 10px; text-shadow: 3px 3px 0px #fff; }
      
      .race-controls { margin: 20px; }
      #startBtn { padding: 15px 40px; font-family: 'Bungee'; font-size: 1.5rem; background: #28a745; color: white; border: none; cursor: pointer; border-radius: 10px; box-shadow: 0 5px 0 #1e7e34; }
      #startBtn:active { transform: translateY(4px); box-shadow: none; }

      .countdown-overlay { 
        position: fixed; top:0; left:0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); 
        display: none; justify-content: center; align-items: center; z-index: 100; font-family: 'Bungee'; font-size: 10rem; 
      }

      .year-container { background: #222; border: 4px solid #444; border-radius: 15px; margin: 20px auto; width: 90%; max-width: 1000px; padding: 10px; position: relative; }
      .year-title { font-family: 'Bungee'; color: #aaa; text-align: left; padding-left: 20px; font-size: 1.5rem; }
      
      .track { position: relative; height: 240px; background: #333; border-radius: 10px; margin-top: 10px; border-right: 20px double #fff; }
      .lane { height: 60px; border-bottom: 1px dashed #555; position: relative; display: flex; align-items: center; }
      
      .car { 
        position: absolute; left: 0%; font-size: 40px; transition: left 4s cubic-bezier(0.45, 0, 0.55, 1); 
        display: flex; align-items: center; filter: drop-shadow(2px 2px 2px black);
      }
      .car-label { font-size: 12px; background: white; color: black; padding: 2px 5px; border-radius: 4px; margin-left: 5px; font-family: sans-serif; display: none; }

      .results-overlay { 
        position: fixed; top:0; left:0; width: 100%; height:100%; background: rgba(0,0,0,0.9); 
        display: none; flex-direction: column; justify-content: center; align-items: center; z-index: 200; 
      }
      .winner-card { font-family: 'Bungee'; font-size: 3rem; color: gold; margin: 10px; animation: pop 0.5s ease-out; }
      @keyframes pop { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    </style>
  </head>
  <body>
    <div class="countdown-overlay" id="countdown">3</div>
    
    <div class="results-overlay" id="results">
      <h1 style="color:white">RACE RESULTS</h1>
      <div id="winnerList"></div>
      <button onclick="location.reload()" style="padding:10px 20px; margin-top:20px;">RESET TRACK</button>
    </div>

    <div class="stadium">
      <h1>TAB JUNIOR GRAND PRIX</h1>
      <div class="race-controls">
        <button id="startBtn" onclick="startRace()">START ENGINES!</button>
      </div>

      ${['Y3', 'Y4', 'Y5', 'Y6'].map(year => `
        <div class="year-container">
          <div class="year-title">YEAR ${year.slice(1)}</div>
          <div class="track">
            <div class="lane"><div id="${year}-Y" class="car" style="left: 0">🏎️<span class="car-label">Lewes</span></div></div>
            <div class="lane"><div id="${year}-R" class="car" style="left: 0; filter: hue-rotate(140deg);">🏎️<span class="car-label">Amberley</span></div></div>
            <div class="lane"><div id="${year}-B" class="car" style="left: 0; filter: hue-rotate(210deg);">🏎️<span class="car-label">Hastings</span></div></div>
            <div class="lane"><div id="${year}-G" class="car" style="left: 0; filter: hue-rotate(280deg);">🏎️<span class="car-label">Bramber</span></div></div>
          </div>
        </div>
      `).join('')}
    </div>

    <script>
      const scoreData = ${JSON.stringify(data)};
      const goal = 1000;

      function startRace() {
        document.getElementById('startBtn').style.display = 'none';
        const cd = document.getElementById('countdown');
        cd.style.display = 'flex';
        
        // Sound effects using Web Audio (Basic engine rev/beep)
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        
        let count = 3;
        const timer = setInterval(() => {
          count--;
          if (count > 0) {
            cd.innerText = count;
            beep(ctx, 440);
          } else if (count === 0) {
            cd.innerText = "GO!";
            cd.style.color = "#28a745";
            beep(ctx, 880);
          } else {
            clearInterval(timer);
            cd.style.display = 'none';
            beginMovement();
          }
        }, 1000);
      }

      function beep(ctx, freq) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freq;
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
        osc.start(); osc.stop(ctx.currentTime + 0.5);
      }

      function beginMovement() {
        // Move every car
        for (let year in scoreData) {
          const houses = scoreData[year];
          moveCar(year + '-Y', houses.Yellow);
          moveCar(year + '-R', houses.Red);
          moveCar(year + '-B', houses.Blue);
          moveCar(year + '-G', houses.Green);
        }

        // Show results after animation (4 seconds)
        setTimeout(revealResults, 4500);
      }

      function moveCar(id, score) {
        const percent = Math.min((score / goal) * 90, 92);
        document.getElementById(id).style.left = percent + '%';
      }

      function revealResults() {
        const res = document.getElementById('results');
        const list = document.getElementById('winnerList');
        res.style.display = 'flex';
        
        let html = '';
        for (let year in scoreData) {
          const s = scoreData[year];
          const sorted = [
            {n: 'Lewes', v: s.Yellow, c: '#FFD700'},
            {n: 'Amberley', v: s.Red, c: '#FF4136'},
            {n: 'Hastings', v: s.Blue, c: '#0074D9'},
            {n: 'Bramber', v: s.Green, c: '#2ECC40'}
          ].sort((a,b) => b.v - a.v);

          html += '<div style="margin-bottom:20px"><h2 style="margin:0">YEAR ' + year.slice(1) + '</h2>';
          html += '<div class="winner-card" style="color:'+sorted[0].c+'">1st: ' + sorted[0].n + ' ('+sorted[0].v+')</div></div>';
        }
        list.innerHTML = html;
      }
    </script>
  </body>
  </html>`;
}

function renderAdmin(scores) {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif; padding:20px;">
    <h2>Race Admin Panel</h2>
    <form method="POST">
      Username: <input type="text" name="user"><br>
      Password: <input type="password" name="pass"><br><br>
      ${['Y3', 'Y4', 'Y5', 'Y6'].map(y => `
        <h3>Year ${y.slice(1)}</h3>
        Lewes: <input type="number" name="${y}_Y" value="${scores[y].Yellow}"> 
        Amberley: <input type="number" name="${y}_R" value="${scores[y].Red}"> 
        Hastings: <input type="number" name="${y}_B" value="${scores[y].Blue}"> 
        Green: <input type="number" name="${y}_G" value="${scores[y].Green}"><br>
      `).join('')}
      <br><button type="submit">Update Scores & Reset Race</button>
    </form>
  </body></html>`;
}
