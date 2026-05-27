const fs = require('fs');
const path = require('path');
const indexPath = path.join(__dirname, 'public', 'index.html');

const htmlContent = `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Centro di Controllo di Nello</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
<style>
:root {
  --bg1: #0f172a; --bg2: #020617;
  --card-bg: rgba(30, 41, 59, 0.6);
  --card-border: rgba(255, 255, 255, 0.08);
  --primary: #10b981; --primary-hover: #059669;
  --secondary: #3b82f6; --secondary-hover: #2563eb;
  --danger: #ef4444;
  --text: #f8fafc; --text-muted: #94a3b8;
}

body { 
  font-family: 'Inter', sans-serif; 
  background: linear-gradient(135deg, var(--bg1), var(--bg2)); 
  color: var(--text); 
  min-height: 100vh; 
  margin: 0; 
  padding-bottom: 50px; 
}

header { padding: 40px 20px 20px; text-align: center; }
header img { width: 70px; height: 70px; border-radius: 50%; box-shadow: 0 0 25px rgba(16,185,129,0.4); margin-bottom: 15px; transition: transform 0.3s; }
header img:hover { transform: scale(1.1) rotate(5deg); }
header h1 { margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -0.5px; background: linear-gradient(to right, #fff, #94a3b8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }

main { display: flex; flex-wrap: wrap; gap: 20px; padding: 20px; justify-content: center; max-width: 1200px; margin: 0 auto; }

.card {
  width: 320px; background: var(--card-bg); border-radius: 20px; padding: 16px; display: flex; gap: 16px; align-items: center;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2); border: 1px solid var(--card-border);
  backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); position: relative;
}
.card:hover { transform: translateY(-6px) scale(1.02); box-shadow: 0 20px 40px rgba(0,0,0,0.4); border-color: rgba(255,255,255,0.2); }

/* Drag & Drop styles only for admin */
body.is-admin .card { cursor: grab; }
body.is-admin .card:active { cursor: grabbing; }
.card.dragging { opacity: 0.4; transform: scale(0.95); border: 2px dashed var(--primary); }

.icon-container { width: 64px; height: 64px; flex-shrink: 0; border-radius: 16px; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; overflow: hidden; padding: 10px; box-sizing: border-box; box-shadow: inset 0 2px 10px rgba(0,0,0,0.5); }
.icon-container img { width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4)); }

.card-text { flex: 1; min-width: 0; }
.card-text h4 { margin: 0 0 6px 0; font-size: 17px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card-text span { font-size: 13px; color: var(--text-muted); display: block; line-height: 1.4; }

.btn { background: var(--primary); color: #fff; padding: 10px 18px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 14px; transition: all 0.2s; border: none; cursor: pointer; box-shadow: 0 4px 15px rgba(16,185,129,0.3); }
.btn:hover { background: var(--primary-hover); transform: scale(1.05); box-shadow: 0 6px 20px rgba(16,185,129,0.5); }

/* Admin controls */
.admin-only { display: none !important; }
body.is-admin .admin-only { display: flex !important; }
body.is-admin .admin-only-block { display: block !important; }

.admin-controls { position: absolute; top: -12px; right: -12px; gap: 8px; z-index: 10; }
.admin-btn { width: 34px; height: 34px; border-radius: 50%; border: none; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; box-shadow: 0 4px 10px rgba(0,0,0,0.4); transition: transform 0.2s; }
.admin-btn:hover { transform: scale(1.15); }
.btn-edit { background: var(--secondary); }
.btn-delete { background: var(--danger); }

/* Add App Section */
.add-app-section { max-width: 600px; margin: 40px auto; padding: 30px; background: var(--card-bg); border-radius: 24px; border: 1px solid var(--card-border); backdrop-filter: blur(16px); box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
.add-app-section h3 { margin-top: 0; color: var(--primary); text-align: center; font-size: 22px; margin-bottom: 20px; }
.form-group { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.form-input { flex: 1; min-width: 140px; padding: 14px 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.3); color: white; font-family: inherit; outline: none; transition: all 0.2s; font-size: 14px; }
.form-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(16,185,129,0.2); }
.form-btn { width: 100%; padding: 16px; background: var(--secondary); color: white; border: none; border-radius: 12px; font-weight: 600; font-size: 16px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 15px rgba(59,130,246,0.3); }
.form-btn:hover { background: var(--secondary-hover); transform: translateY(-2px); box-shadow: 0 6px 20px rgba(59,130,246,0.5); }

/* Footer & Login */
footer { text-align: center; margin-top: 50px; color: var(--text-muted); font-size: 14px; }
.login-trigger { background: none; border: none; color: var(--text-muted); cursor: pointer; text-decoration: underline; margin-top: 15px; font-family: inherit; font-size: 13px; transition: color 0.2s; }
.login-trigger:hover { color: white; }

/* Modal */
.modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); z-index: 100; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.3s; }
.modal.active { display: flex; opacity: 1; }
.modal-content { background: var(--bg1); padding: 35px; border-radius: 24px; width: 90%; max-width: 380px; border: 1px solid var(--card-border); box-shadow: 0 25px 50px rgba(0,0,0,0.5); transform: translateY(20px); transition: transform 0.3s; }
.modal.active .modal-content { transform: translateY(0); }
.modal-content h3 { margin-top: 0; text-align: center; font-size: 24px; margin-bottom: 25px; }
.modal-content .form-input { width: 100%; box-sizing: border-box; margin-bottom: 15px; }
.modal-content .form-btn { background: var(--primary); box-shadow: 0 4px 15px rgba(16,185,129,0.3); }
.modal-content .form-btn:hover { background: var(--primary-hover); }
.close-modal { background: none; border: none; color: var(--text-muted); width: 100%; margin-top: 15px; cursor: pointer; font-family: inherit; transition: color 0.2s; }
.close-modal:hover { color: white; }
</style>
</head>
<body>

<header>
  <img src="assets/nello.png" alt="Nello">
  <h1>Centro di Controllo</h1>
</header>

<main id="main-content">
  <div id="loading-msg" style="width:100%;text-align:center;padding:40px;color:var(--text-muted);font-size:18px;">Caricamento App...</div>
</main>

<div class="add-app-section admin-only admin-only-block">
  <h3>➕ Gestione Applicazioni</h3>
  <div class="form-group">
      <input type="hidden" id="editingKey">
      <input type="text" id="appName" class="form-input" placeholder="Nome App (es. MyApp)">
      <input type="text" id="appCode" class="form-input" placeholder="Codice / URL (es. 123456)">
  </div>
  <div class="form-group">
      <input type="text" id="appDesc" class="form-input" placeholder="Descrizione breve">
      <input type="text" id="appIcon" class="form-input" placeholder="URL Icona (opzionale)">
  </div>
  <button onclick="addApp()" class="form-btn">Aggiungi Scheda</button>
</div>

<footer>
  Centro di Controllo di Nello — Codice: <strong>6097284</strong><br>
  <button id="login-btn" class="login-trigger" onclick="document.getElementById('login-modal').classList.add('active')">Accesso Amministratore</button>
  <button id="logout-btn" class="login-trigger admin-only" onclick="logoutAdmin()">Esci dall'Amministrazione</button>
</footer>

<!-- Login Modal -->
<div id="login-modal" class="modal">
  <div class="modal-content">
    <h3>Accesso Admin</h3>
    <input type="email" id="adminEmail" class="form-input" placeholder="Email">
    <input type="password" id="adminPass" class="form-input" placeholder="Password">
    <button onclick="loginAdmin()" class="form-btn">Accedi</button>
    <button onclick="document.getElementById('login-modal').classList.remove('active')" class="close-modal">Annulla</button>
  </div>
</div>

<!-- Firebase SDKs -->
<script type="module">
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
  import { getDatabase, ref, push, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
  import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
  
  import { firebaseConfig } from "./firebase-config.js";

  if (!firebaseConfig.databaseURL || firebaseConfig.databaseURL.includes("PLACEHOLDER")) {
    console.warn("Firebase non configurato.");
  } else {
    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);
    const auth = getAuth(app);
    const dbRef = ref(db, 'apps');

    // Gestione Autenticazione
    onAuthStateChanged(auth, (user) => {
      if (user) {
        document.body.classList.add('is-admin');
        document.getElementById('login-btn').style.display = 'none';
      } else {
        document.body.classList.remove('is-admin');
        document.getElementById('login-btn').style.display = 'inline-block';
      }
    });

    window.loginAdmin = function() {
      const email = document.getElementById('adminEmail').value;
      const pass = document.getElementById('adminPass').value;
      if(!email || !pass) return alert("Inserisci email e password");
      
      signInWithEmailAndPassword(auth, email, pass)
        .then(() => {
          document.getElementById('login-modal').classList.remove('active');
          document.getElementById('adminEmail').value = '';
          document.getElementById('adminPass').value = '';
        })
        .catch(e => alert("Errore login: Credenziali non valide."));
    };

    window.logoutAdmin = function() {
      signOut(auth).then(() => alert("Disconnesso con successo."));
    };

    // Ascolta i cambiamenti in tempo reale
    onValue(dbRef, (snapshot) => {
      const loading = document.getElementById('loading-msg');
      if(loading) loading.style.display = 'none';

      const data = snapshot.val();
      const main = document.getElementById('main-content');
      
      main.innerHTML = '';
      if(loading) main.appendChild(loading);

      if (data) {
        const appsArray = Object.entries(data).map(([key, val]) => ({
            id: key, 
            ...val
        })).sort((a,b) => (a.order || 0) - (b.order || 0));

        appsArray.forEach((app) => {
          createAppCard(app.name, app.code, app.desc, app.id, app.icon);
        });
      } else {
         initDefaultApps(dbRef);
      }
    });

    window.addApp = function() {
      const name = document.getElementById('appName').value;
      const code = document.getElementById('appCode').value;
      const desc = document.getElementById('appDesc').value;
      const icon = document.getElementById('appIcon').value;
      const editingKey = document.getElementById('editingKey').value;
      
      if(!name || !code) return alert("Inserisci almeno Nome e Codice!");
      
      const appData = {
        name: name,
        code: code,
        desc: desc,
        icon: icon,
        timestamp: Date.now(),
        order: editingKey ? undefined : Date.now() 
      };

      Object.keys(appData).forEach(key => appData[key] === undefined && delete appData[key]);

      if (editingKey) {
        update(ref(db, 'apps/' + editingKey), appData)
        .then(() => { resetForm(); }).catch((error) => { alert("Errore modifica: " + error.message); });
      } else {
        push(dbRef, appData).then(() => { resetForm(); }).catch((error) => { alert("Errore aggiunta: " + error.message); });
      }
    };
    
    window.saveOrder = function() {
        const cards = document.querySelectorAll('.card');
        const updates = {};
        cards.forEach((card, index) => {
            const key = card.getAttribute('data-key');
            if(key) updates['apps/' + key + '/order'] = index;
        });
        update(ref(db), updates).catch(e => console.error(e));
    };

    window.removeAppFromCloud = function(key) {
      if(confirm('Sei sicuro di voler eliminare definitivamente questa app?')) {
        remove(ref(db, 'apps/' + key)).catch(e => alert("Errore eliminazione: " + e.message));
      }
    };

    window.editAppFromCloud = function(key, name, code, desc, icon) {
        document.getElementById('appName').value = name;
        document.getElementById('appCode').value = code;
        document.getElementById('appDesc').value = desc || '';
        document.getElementById('appIcon').value = icon || '';
        document.getElementById('editingKey').value = key;
        
        const btn = document.querySelector('.form-btn');
        btn.innerText = "💾 Salva Modifiche";
        btn.style.background = "#eab308";
        
        document.querySelector('.add-app-section').scrollIntoView({behavior: 'smooth'});
    };

    function resetForm() {
        document.getElementById('appName').value = '';
        document.getElementById('appCode').value = '';
        document.getElementById('appDesc').value = '';
        document.getElementById('appIcon').value = '';
        document.getElementById('editingKey').value = '';
        
        const btn = document.querySelector('.form-btn');
        btn.innerText = "Aggiungi Scheda";
        btn.style.background = "";
    }
  }
  
  function initDefaultApps(dbRef) {
      const defaults = [
          {name: "Xrom", code: "4537574", desc: "Custom ROM / launcher", icon: "assets/android-os.png"},
          {name: "Vimu Craccato", code: "6768823", desc: "Vimu media player", icon: "assets/play-button-circled.png"},
          {name: "Stremio Cell Mod VLC", code: "5578609", desc: "Stremio mobile mod", icon: "assets/stremio.png"},
          {name: "Stremio TV Mod VLC", code: "3988093", desc: "Stremio TV mod", icon: "assets/stremio.png"},
          {name: "Stremio Proxy MPD", code: "4095972", desc: "Proxy MPD", icon: "assets/proxy.png"},
          {name: "Smart Tube", code: "9587028", desc: "Player YouTube-like", icon: "assets/youtube-play.png"},
          {name: "Kodi", code: "2130077", desc: "Media center", icon: "assets/kodi.png"},
          {name: "Veezie", code: "2895641", desc: "Player / aggregator", icon: "assets/video.png"},
          {name: "Launcher Manager 1.15", code: "7113338", desc: "Gestore launcher", icon: "assets/launcher.png"},
          {name: "Launcher Manager 1.04 AndroidTV", code: "2096234", desc: "", icon: "assets/tv-settings.png"},
          {name: "Launcher Fire TV", code: "5683409", desc: "Launcher ottimizzato", icon: "assets/tv.png"},
          {name: "Vimu Installer", code: "3188516", desc: "Installa Vimu", icon: "assets/downloads.png"},
          {name: "Xrom Lite", code: "3271802", desc: "Versione leggera", icon: "assets/android-file.png"},
          {name: "Xrom Nuovo", code: "2306309", desc: "Nuova versione", icon: "assets/android-new.png"},
          {name: "Tutti i File", code: "730116", desc: "Archivio completo", icon: "assets/folder-invoices.png"},
          {name: "Archivio completo / Altri", code: "250931", desc: "Raccolta link e file", icon: "assets/star.png"}
      ];
      
      defaults.forEach((app, index) => {
          push(dbRef, {...app, order: index});
      });
  }

  function createAppCard(name, code, desc, firebaseKey, iconPath) {
      let link = code;
      if(code.match(/^\\d+$/)) {
          link = 'https://go.aftvnews.com/' + code;
      }
      
      const main = document.getElementById('main-content');
      const newCard = document.createElement('div');
      newCard.className = 'card';
      newCard.draggable = true;
      newCard.setAttribute('data-key', firebaseKey);
      
      const finalIcon = iconPath || 'assets/nello.png';

      const controlsHtml = \`
        <div class="admin-controls admin-only">
            <button onclick="editAppFromCloud('\${firebaseKey}', '\${name.replace(/'/g, "\\\\'")}', '\${code}', '\${desc ? desc.replace(/'/g, "\\\\'") : ''}', '\${iconPath ? iconPath.replace(/'/g, "\\\\'") : ''}')" 
                    class="admin-btn btn-edit" title="Modifica">✏️</button>
            <button onclick="removeAppFromCloud('\${firebaseKey}')" 
                    class="admin-btn btn-delete" title="Elimina">🗑️</button>
        </div>
      \`;
      
      newCard.innerHTML = \`
        \${controlsHtml}
        <div class="icon-container"><img src="\${finalIcon}" onerror="this.src='assets/nello.png'" alt="\${name}"></div>
        <div class="card-text">
          <h4>\${name}</h4>
          <span>\${code} \${desc ? '— ' + desc : ''}</span>
        </div>
        <div class="actions"><a class="btn" href="\${link}">Scarica</a></div>
      \`;
      
      main.appendChild(newCard);
      
      newCard.addEventListener('click', (e)=>{ 
        if(e.target.closest('button')) return;
        window.location.href = link; 
      });

      newCard.addEventListener('dragstart', (e) => {
          if(!document.body.classList.contains('is-admin')) { e.preventDefault(); return; }
          newCard.classList.add('dragging');
      });
      newCard.addEventListener('dragend', () => {
          newCard.classList.remove('dragging');
          if(document.body.classList.contains('is-admin')) window.saveOrder();
      });
  }
  
  const mainContainer = document.getElementById('main-content');
  mainContainer.addEventListener('dragover', e => {
      if(!document.body.classList.contains('is-admin')) return;
      e.preventDefault();
      const afterElement = getDragAfterElement(mainContainer, e.clientY, e.clientX);
      const draggable = document.querySelector('.dragging');
      if(draggable) {
          if (afterElement == null) {
              mainContainer.appendChild(draggable);
          } else {
              mainContainer.insertBefore(draggable, afterElement);
          }
      }
  });

  function getDragAfterElement(container, y, x) {
      const draggableElements = [...container.querySelectorAll('.card:not(.dragging)')];
      return draggableElements.reduce((closest, child) => {
          const box = child.getBoundingClientRect();
          const offsetX = x - box.left - box.width / 2;
          const offsetY = y - box.top - box.height / 2;
          const dist = Math.hypot(offsetX, offsetY);
          if (dist < closest.offset) {
              return { offset: dist, element: child };
          } else {
              return closest;
          }
      }, { offset: Number.POSITIVE_INFINITY }).element;
  }
</script>
</body>
</html>`;

fs.writeFileSync(indexPath, htmlContent);
console.log('index.html aggiornato con successo!');
