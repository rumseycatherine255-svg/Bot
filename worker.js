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
    <title>TAB Community Stars Race</title>
    <link href="https://fonts.googleapis.com/css2?family=Bungee&family=Oswald:wght@700&display=swap" rel="stylesheet">
    <style>
      :root { --yellow: #ffd700; --red: #ff4136; --blue: #0074d9; --green: #2ecc40; }
      body { background: #fdfdfd; font-family: 'Oswald', sans-serif; margin: 0; text-align: center; color: #333; }
      
      /* Navigation Bar */
      nav { padding: 15px; background: #1a1a1a; display: flex; justify-content: center; align-items: center; flex-wrap: wrap; gap: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.2); }
      .nav-btn { color: #aaa; text-decoration: none; padding: 10px 18px; border-radius: 6px; background: #333; border: none; font-family: 'Oswald'; cursor: pointer; transition: 0.3s; }
      .active { background: #e74c3c; color: white; }
      .admin-trigger { background: #444; color: #888; font-size: 0.8rem; margin-left: 20px; }

      .container { max-width: 1100px; margin: 30px auto; padding: 0 20px; }
      h2 { font-family: 'Bungee', cursive; text-transform: uppercase; font-size: 2rem; margin-bottom: 20px; }
      
      /* Start Race Button */
      #start-btn { 
        padding: 15px 40px; font-family: 'Bungee'; font-size: 1.5rem; background: #28a745; 
        color: white; border: none; cursor: pointer; border-radius: 10px; margin-bottom: 20px;
        box-shadow: 0 6px 0 #1e7e34; transition: 0.1s;
      }
      #start-btn:active { transform: translateY(4px); box-shadow: 0 2px 0 #1e7e34; }

      /* The Track */
      .track-box { background: #333; border-radius: 25px; padding: 40px 20px; border: 5px solid #444; position: relative; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
      .lane { height: 90px; display: flex; align-items: center; position: relative; border-bottom: 2px dashed #555; }
      .lane:last-of-type { border-bottom: none; }
      
      .house-label { width: 130px; text-align: left; font-size: 1.4rem; font-weight: bold; color: white; z-index: 5; }
      
      /* The Cars */
      .car { 
        position: absolute; left: 130px; font-size: 50px; 
        transition: left 4s cubic-bezier(0.45, 0.05, 0.55, 0.95); 
        display: flex; flex-direction: column; align-items: center; z-index: 10;
      }
      .car span { transform: scaleX(-1); display: inline-block; }
      .score-bubble { background: #fff; color: #000; font-size: 14px; padding: 2px 8px; border-radius: 5px; margin-top: 5px; font-weight: bold; display: none; }
      
      .scale { display: flex; justify-content: space-between; margin-left: 130px; margin-top: 20px; border-top: 4px solid #fff; padding-top: 10px; color: #aaa; }
      
      /* Admin Modal */
      #admin-modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 1000; padding: 20px; box-sizing: border-box; overflow-y: auto; }
      .admin-content { background: white; max-width: 500px; margin: 20px auto; padding: 30px; border-radius: 15px; text-align: left; }
      .year-block { background: #f4f4f4; padding: 15px; border-radius: 10px; margin-bottom: 15px; }
      input { width: 100%; padding: 10px; margin: 5px 0 15px 0; border: 1px solid #ccc; border-radius: 5px; box-sizing: border-box; }
      .row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

      .ylw { color: var(--yellow); } .rd { color: var(--red); } .blu { color: var(--blue); } .grn { color: var(--green); }
    </style>
  </head>
  <body>

    <nav>
      <button onclick="changeView('WholeSchool')" class="nav-btn" id="nav-WholeSchool">Whole School</button>
      <button onclick="changeView('Y3')" class="nav-btn" id="nav-Y3">Year 3</button>
      <button onclick="changeView('Y4')" class="nav-btn" id="nav-Y4">Year 4</button>
      <button onclick="changeView('Y5')" class="nav-btn" id="nav-Y5">Year 5</button>
      <button onclick="changeView('Y6')" class="nav-btn" id="nav-Y6">Year 6</button>
      <button onclick="openAdmin()" class="nav-btn admin-trigger">Staff Login</button>
    </nav>
    
    <div class="container">
      <h2 id="page-title">Whole School Race</h2>
      <button id="start-btn" onclick="startRace()">START RACE!</button>

      <div class="track-box">
        <div class="lane"><div class="house-label ylw">Lewes</div><div id="car-y" class="car"><span>🏎️</span><div id="val-y" class="score-bubble">0</div></div></div>
        <div class="lane"><div class="house-label rd">Amberley</div><div id="car-r" class="car" style="filter: hue-rotate(140deg);"><span>🏎️</span><div id="val-r" class="score-bubble">0</div></div></div>
        <div class="lane"><div class="lane"><div class="house-label blu">Hastings</div><div id="car-b" class="car" style="filter: hue-rotate(210deg);"><span>🏎️</span><div id="val-b" class="score-bubble">0</div></div></div></div>
        <div class="lane"><div class="house-label grn">Bramber</div><div id="car-g" class="car" style="filter: hue-rotate(280deg);"><span>🏎️</span><div id="val-g" class="score-bubble">0</div></div></div>
        <div class="scale"><span>0</span><span>1000</span><span>2000</span><span>3000</span><span>4000</span><span>5000</span></div>
      </div>
    </div>

    <div id="admin-modal">
      <div class="admin-content">
        <h2>Admin Settings</h2>
        <label>Admin Password:</label>
        <input type="password" id="admin-password">
        <div id="admin-fields"></div>
        <button onclick="saveData()" style="width:100%; padding:15px; background:#28a745; color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer;">SAVE ALL DATA</button>
        <button onclick="closeAdmin()" style="width:100%; margin-top:10px; background:#ccc; border:none; padding:10px; border-radius:8px; cursor:pointer;">Close</button>
      </div>
    </div>

    <script>
      let activeView = 'WholeSchool';
      const maxScore = 5000;

      let starData = JSON.parse(localStorage.getItem('tab_stars_v2')) || {
        WholeSchool: {y:0, r:0, b:0, g:0},
        Y3: {y:0, r:0, b:0, g:0}, Y4: {y:0, r:0, b:0, g:0},
        Y5: {y:0, r:0, b:0, g:0}, Y6: {y:0, r:0, b:0, g:0}
      };

      function changeView(view) {
        activeView = view;
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('nav-' + view).classList.add('active');
        document.getElementById('page-title').innerText = (view === 'WholeSchool' ? 'Whole School' : view.replace('Y', 'Year ')) + " Race";
        
        resetCars();
        document.getElementById('start-btn').style.display = 'inline-block';
      }

      function resetCars() {
        ['y','r','b','g'].forEach(id => {
          document.getElementById('car-'+id).style.left = '130px';
          document.getElementById('val-'+id).style.display = 'none';
        });
      }

      function startRace() {
        document.getElementById('start-btn').style.display = 'none';
        const scores = starData[activeView];
        
        setTimeout(() => move('car-y', 'val-y', scores.y), 100);
        setTimeout(() => move('car-r', 'val-r', scores.r), 300);
        setTimeout(() => move('car-b', 'val-b', scores.b), 500);
        setTimeout(() => move('car-g', 'val-g', scores.g), 700);
      }

      function move(id, valId, val) {
        const percent = Math.min((val / maxScore) * 85, 87);
        document.getElementById(id).style.left = "calc(130px + " + percent + "%)";
        setTimeout(() => {
            document.getElementById(valId).innerText = val;
            document.getElementById(valId).style.display = 'block';
        }, 3500);
      }

      function openAdmin() {
        let html = '';
        const keys = ['WholeSchool', 'Y3', 'Y4', 'Y5', 'Y6'];
        keys.forEach(k => {
          html += '<div class="year-block"><strong>' + k + '</strong><div class="row">';
          html += '<span>L: <input type="number" id="in-'+k+'-y" value="'+starData[k].y+'"></span>';
          html += '<span>A: <input type="number" id="in-'+k+'-r" value="'+starData[k].r+'"></span>';
          html += '<span>H: <input type="number" id="in-'+k+'-b" value="'+starData[k].b+'"></span>';
          html += '<span>B: <input type="number" id="in-'+k+'-g" value="'+starData[k].g+'"></span>';
          html += '</div></div>';
        });
        document.getElementById('admin-fields').innerHTML = html;
        document.getElementById('admin-modal').style.display = 'block';
      }

      function saveData() {
        if (document.getElementById('admin-password').value !== 'cmstars') {
          alert('Wrong Password'); return;
        }
        ['WholeSchool', 'Y3', 'Y4', 'Y5', 'Y6'].forEach(k => {
          starData[k] = {
            y: parseInt(document.getElementById('in-'+k+'-y').value || 0),
            r: parseInt(document.getElementById('in-'+k+'-r').value || 0),
            b: parseInt(document.getElementById('in-'+k+'-b').value || 0),
            g: parseInt(document.getElementById('in-'+k+'-g').value || 0)
          };
        });
        localStorage.setItem('tab_stars_v2', JSON.stringify(starData));
        closeAdmin();
        resetCars();
      }

      function closeAdmin() { document.getElementById('admin-modal').style.display = 'none'; }
      window.onload = () => changeView('WholeSchool');
    </script>
  </body>
  </html>`;
}
