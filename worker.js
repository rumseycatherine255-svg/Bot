export default {
  async fetch(request, env) {
    return new Response(renderSite(), {
      headers: { "Content-Type": "text/html" }
    });
  }
};

function renderSite() {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TAB Community Stars</title>
    <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@700&display=swap" rel="stylesheet">
    <style>
      :root {
        --yellow: #ffd700; --red: #ff4136; --blue: #0074d9; --green: #2ecc40;
      }
      body { background: #fdfdfd; font-family: 'Oswald', sans-serif; margin: 0; text-align: center; color: #333; overflow-x: hidden; }
      
      /* Navigation */
      nav { padding: 15px; background: #1a1a1a; display: flex; justify-content: center; flex-wrap: wrap; gap: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.2); }
      .nav-btn { color: #aaa; text-decoration: none; padding: 10px 18px; border-radius: 6px; background: #333; border: none; font-family: 'Oswald'; cursor: pointer; transition: 0.3s; font-size: 1rem; }
      .nav-btn:hover { background: #444; color: white; }
      .active { background: #e74c3c; color: white; box-shadow: 0 0 10px rgba(231, 76, 60, 0.5); }
      
      .container { max-width: 1100px; margin: 30px auto; padding: 0 20px; }
      h2 { text-transform: uppercase; letter-spacing: 2px; font-size: 2.2rem; margin-bottom: 40px; color: #222; }
      
      /* The Track */
      .track-box { background: #eee; border-radius: 25px; padding: 40px 20px; border: 3px solid #ddd; position: relative; box-shadow: inset 0 0 20px rgba(0,0,0,0.05); }
      .lane { height: 100px; display: flex; align-items: center; position: relative; border-bottom: 2px dashed #ccc; }
      .lane:last-of-type { border-bottom: none; }
      
      .house-label { width: 130px; text-align: left; font-size: 1.5rem; font-weight: bold; text-shadow: 1px 1px 0 #fff; }
      
      /* The Cars */
      .car { 
        position: absolute; left: 130px; font-size: 55px; transition: left 3s cubic-bezier(0.34, 1.56, 0.64, 1); 
        display: flex; flex-direction: column; align-items: center; line-height: 1; z-index: 10;
      }
      .car span { transform: scaleX(-1); display: inline-block; } /* Flip emoji to face right */
      
      .score-bubble { background: #222; color: white; font-size: 14px; padding: 3px 10px; border-radius: 6px; margin-top: 5px; font-family: sans-serif; font-weight: normal; }
      
      /* The Ruler */
      .scale { display: flex; justify-content: space-between; margin-left: 130px; margin-top: 20px; border-top: 5px solid #222; padding-top: 10px; color: #555; font-size: 1.1rem; }
      
      /* Admin Modal */
      #admin-modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 1000; overflow-y: auto; padding: 20px; box-sizing: border-box; }
      .admin-content { background: white; max-width: 600px; margin: 40px auto; padding: 30px; border-radius: 15px; text-align: left; }
      .admin-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; background: #f9f9f9; padding: 15px; border-radius: 10px; }
      input[type="number"] { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-family: sans-serif; }
      label { font-size: 0.9rem; color: #666; display: block; margin-bottom: 4px; }
      
      .yellow-t { color: var(--yellow); } .red-t { color: var(--red); } .blue-t { color: var(--blue); } .green-t { color: var(--green); }
    </style>
  </head>
  <body>

    <nav>
      <button onclick="changeView('WholeSchool')" class="nav-btn" id="nav-WholeSchool">Whole School</button>
      <button onclick="changeView('Y3')" class="nav-btn" id="nav-Y3">Year 3</button>
      <button onclick="changeView('Y4')" class="nav-btn" id="nav-Y4">Year 4</button>
      <button onclick="changeView('Y5')" class="nav-btn" id="nav-Y5">Year 5</button>
      <button onclick="changeView('Y6')" class="nav-btn" id="nav-Y6">Year 6</button>
    </nav>
    
    <div class="container">
      <h2 id="page-title">Whole School Community Stars</h2>
      <div class="track-box">
        <div class="lane"><div class="house-label yellow-t">Lewes</div><div id="car-y" class="car"><span>🏎️</span><div id="val-y" class="score-bubble">0</div></div></div>
        <div class="lane"><div class="house-label red-t">Amberley</div><div id="car-r" class="car" style="filter: hue-rotate(140deg);"><span>🏎️</span><div id="val-r" class="score-bubble">0</div></div></div>
        <div class="lane"><div class="house-label blue-t">Hastings</div><div id="car-b" class="car" style="filter: hue-rotate(210deg);"><span>🏎️</span><div id="val-b" class="score-bubble">0</div></div></div>
        <div class="lane"><div class="house-label green-t">Bramber</div><div id="car-g" class="car" style="filter: hue-rotate(280deg);"><span>🏎️</span><div id="val-g" class="score-bubble">0</div></div></div>
        
        <div class="scale">
          <span>0</span><span>1000</span><span>2000</span><span>3000</span><span>4000</span><span>5000</span>
        </div>
      </div>
    </div>

    <div style="margin-top:100px; padding: 20px;">
      <button onclick="openAdmin()" style="opacity: 0.1; background: none; border: none; cursor: pointer;">Staff Admin</button>
    </div>

    <div id="admin-modal">
      <div class="admin-content">
        <h2 style="margin-top:0">Update Star Totals</h2>
        <div style="margin-bottom:20px;">
          <label>Admin Password:</label>
          <input type="password" id="pass-check" style="width:100%; padding:10px;">
        </div>
        
        <div id="admin-fields"></div>

        <button onclick="saveData()" style="width: 100%; padding: 15px; background: #2ecc71; color: white; border: none; border-radius: 8px; font-weight: bold; font-family: 'Oswald'; font-size: 1.2rem; cursor: pointer;">SAVE TO BROWSER</button>
        <button onclick="closeAdmin()" style="width: 100%; margin-top: 10px; background: #eee; border: none; padding: 10px; cursor: pointer;">Cancel</button>
      </div>
    </div>

    <script>
      let activeView = 'WholeSchool';
      const maxScore = 5000;

      // Load data or set empty defaults
      let starData = JSON.parse(localStorage.getItem('tab_junior_v1')) || {
        WholeSchool: {y:0, r:0, b:0, g:0},
        Y3: {y:0, r:0, b:0, g:0}, Y4: {y:0, r:0, b:0, g:0},
        Y5: {y:0, r:0, b:0, g:0}, Y6: {y:0, r:0, b:0, g:0}
      };

      function changeView(view) {
        activeView = view;
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById('nav-' + view).classList.add('active');
        
        const title = view === 'WholeSchool' ? 'Whole School' : view.replace('Y', 'Year ');
        document.getElementById('page-title').innerText = title + " Community Stars";
        
        refreshTrack();
      }

      function refreshTrack() {
        const scores = starData[activeView];
        const animate = (id, valId, val) => {
          const percent = Math.min((val / maxScore) * 85, 87);
          document.getElementById(id).style.left = "calc(130px + " + percent + "%)";
          document.getElementById(valId).innerText = val;
        };
        
        animate('car-y', 'val-y', scores.y);
        animate('car-r', 'val-r', scores.r);
        animate('car-b', 'val-b', scores.b);
        animate('car-g', 'val-g', scores.g);
      }

      function openAdmin() {
        let html = '';
        const keys = ['WholeSchool', 'Y3', 'Y4', 'Y5', 'Y6'];
        keys.forEach(k => {
          html += '<div class="admin-grid">';
          html += '<h4 style="grid-column: span 2; margin:0">' + k + '</h4>';
          html += '<div><label>Lewes (Y)</label><input type="number" id="in-'+k+'-y" value="'+starData[k].y+'"></div>';
          html += '<div><label>Amberley (R)</label><input type="number" id="in-'+k+'-r" value="'+starData[k].r+'"></div>';
          html += '<div><label>Hastings (B)</label><input type="number" id="in-'+k+'-b" value="'+starData[k].b+'"></div>';
          html += '<div><label>Bramber (G)</label><input type="number" id="in-'+k+'-g" value="'+starData[k].g+'"></div>';
          html += '</div>';
        });
        document.getElementById('admin-fields').innerHTML = html;
        document.getElementById('admin-modal').style.display = 'block';
      }

      function saveData() {
        if (document.getElementById('pass-check').value !== 'cmstars') {
          alert('Incorrect Password');
          return;
        }
        
        const keys = ['WholeSchool', 'Y3', 'Y4', 'Y5', 'Y6'];
        keys.forEach(k => {
          starData[k] = {
            y: parseInt(document.getElementById('in-'+k+'-y').value || 0),
            r: parseInt(document.getElementById('in-'+k+'-r').value || 0),
            b: parseInt(document.getElementById('in-'+k+'-b').value || 0),
            g: parseInt(document.getElementById('in-'+k+'-g').value || 0)
          };
        });
        
        localStorage.setItem('tab_junior_v1', JSON.stringify(starData));
        closeAdmin();
        refreshTrack();
      }

      function closeAdmin() { document.getElementById('admin-modal').style.display = 'none'; }

      // Initial Load
      window.onload = () => changeView('WholeSchool');
    </script>
  </body>
  </html>`;
}
