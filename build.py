"""Build script: generates index.html with real POS data + full redesign."""
import json, os

with open(r'C:/Users/clau_/Documents/ruta-bat-promotoria/pos_data.json', encoding='utf-8') as f:
    data = json.load(f)

ordered_days = ['LUNES','MARTES','MIERCOLES','JUEVES','VIERNES']
lines = ['const POS_DATA = {']
for di, day in enumerate(ordered_days):
    if day not in data['days']:
        continue
    pos_list = data['days'][day]
    lines.append(f'  "{day}": [')
    for i, p in enumerate(pos_list):
        comma = ',' if i < len(pos_list)-1 else ''
        pid  = f"pos_{day[:3]}_{i+1:02d}"
        nom  = json.dumps(p["nombre"],  ensure_ascii=False)
        dire = json.dumps(p["direccion"], ensure_ascii=False)
        dist = json.dumps(p["distrito"], ensure_ascii=False)
        lines.append(f'    {{"id":"{pid}","nombre":{nom},"direccion":{dire},"distrito":{dist},"lat":{p["lat"]},"lon":{p["lon"]}}}{comma}')
    dc = ',' if di < len(ordered_days)-1 else ''
    lines.append(f'  ]{dc}')
lines.append('};')
POS_JS = '\n'.join(lines)

LOGO_SVG = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 62" height="38">
  <g transform="translate(2,2)">
    <circle cx="29" cy="29" r="27" fill="none" stroke="#1A2E6A" stroke-width="1.4"/>
    <circle cx="29" cy="21" r="3.2" fill="#1A2E6A"/>
    <circle cx="18" cy="29" r="2.8" fill="#F5A123"/>
    <circle cx="40" cy="29" r="2.8" fill="#F5A123"/>
    <circle cx="22" cy="39" r="2.4" fill="#1A2E6A"/>
    <circle cx="36" cy="39" r="2.4" fill="#1A2E6A"/>
    <circle cx="29" cy="45" r="2.4" fill="#4A8FD4"/>
    <line x1="29" y1="21" x2="18" y2="29" stroke="#1A2E6A" stroke-width="1.1"/>
    <line x1="29" y1="21" x2="40" y2="29" stroke="#1A2E6A" stroke-width="1.1"/>
    <line x1="18" y1="29" x2="22" y2="39" stroke="#F5A123" stroke-width="1.1"/>
    <line x1="40" y1="29" x2="36" y2="39" stroke="#F5A123" stroke-width="1.1"/>
    <line x1="22" y1="39" x2="29" y2="45" stroke="#1A2E6A" stroke-width="1.1"/>
    <line x1="36" y1="39" x2="29" y2="45" stroke="#1A2E6A" stroke-width="1.1"/>
    <line x1="18" y1="29" x2="40" y2="29" stroke="#4A8FD4" stroke-width="1" opacity="0.5"/>
  </g>
  <text x="66" y="36" font-family="Arial Black,sans-serif" font-size="27" font-weight="900" fill="#1A2E6A" letter-spacing="-0.5">TT</text>
  <text x="106" y="36" font-family="Arial Black,sans-serif" font-size="27" font-weight="900" fill="#1A2E6A">AUDIT</text>
  <text x="66" y="50" font-family="Arial,sans-serif" font-size="7.5" fill="#8A96B3" letter-spacing="1.8">TRADE MARKETING SOLUTIONS</text>
</svg>'''

LOGO_SM = LOGO_SVG.replace('height="38"', 'height="32"')
LOGO_XS = LOGO_SVG.replace('height="38"', 'height="28"')

html_parts = []

html_parts.append('''<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>Promotoría Bodegas Audit — TT Audit</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<style>
:root{
  --navy:#1A2E6A;--navy2:#243d8a;--accent:#F5A123;--accent2:#e09215;
  --blue:#4A8FD4;--bg:#EEF1F7;--card:#fff;--border:#DDE3EF;
  --text:#1e293b;--muted:#64748b;--green:#22c55e;--red:#ef4444;
}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:"Segoe UI",Arial,sans-serif;background:var(--bg);height:100vh;overflow:hidden}

/* LOGIN */
#login-screen{position:fixed;inset:0;background:linear-gradient(135deg,var(--navy) 0%,#0f1d47 100%);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px}
.login-card{background:#fff;border-radius:20px;padding:36px 32px;width:100%;max-width:360px;box-shadow:0 24px 64px rgba(0,0,0,.4);text-align:center}
.lc-logo{margin:0 auto 16px;display:flex;justify-content:center}
.lc-badge{display:inline-block;background:var(--accent);color:#fff;font-size:10px;font-weight:700;border-radius:5px;padding:2px 8px;margin-bottom:12px;letter-spacing:.5px}
.lc-title{font-size:16px;font-weight:700;color:var(--navy);margin-bottom:4px}
.lc-sub{font-size:12px;color:var(--muted);margin-bottom:22px}
.lc-input{width:100%;border:1.5px solid var(--border);border-radius:9px;padding:11px 14px;font-size:14px;margin-bottom:10px;outline:none;transition:.2s;font-family:inherit}
.lc-input:focus{border-color:var(--navy)}
.lc-btn{width:100%;background:var(--navy);color:#fff;border:none;border-radius:9px;padding:13px;font-size:15px;font-weight:700;cursor:pointer;transition:.2s;margin-top:4px}
.lc-btn:hover{background:var(--navy2)}
.lc-err{color:var(--red);font-size:12px;margin-top:10px;display:none}

/* APP */
#app{display:none;height:100vh;flex-direction:column}
#app.active{display:flex}

/* HEADER */
header{background:var(--navy);color:#fff;padding:0 12px;height:52px;display:flex;align-items:center;gap:10px;flex-shrink:0;z-index:100;border-bottom:3px solid var(--accent)}
.hdr-logo{display:flex;align-items:center;gap:8px;flex-shrink:0;background:#fff;border-radius:8px;padding:4px 10px}
.hdr-divider{width:1px;height:26px;background:rgba(255,255,255,.2);flex-shrink:0}
.hdr-title{font-size:13px;font-weight:700;color:#fff;white-space:nowrap;line-height:1.2;flex-shrink:0}
.hdr-title small{display:block;font-size:9px;font-weight:400;opacity:.7;letter-spacing:.3px}
.hdr-right{display:flex;align-items:center;gap:6px;flex-shrink:0}
.hdr-progress{display:flex;align-items:center;gap:5px;font-size:11px;white-space:nowrap}
.hdr-progress .bar{width:60px;height:5px;background:rgba(255,255,255,.2);border-radius:3px;overflow:hidden}
.hdr-progress .fill{height:100%;background:#4ade80;border-radius:3px;transition:.4s}
.btn-icon{background:rgba(255,255,255,.12);border:none;color:#fff;border-radius:7px;padding:5px 9px;font-size:11px;cursor:pointer;white-space:nowrap;font-weight:600}
.btn-icon:hover{background:rgba(255,255,255,.22)}
.btn-icon.accent{background:var(--accent);color:#fff}
.btn-icon.accent:hover{background:var(--accent2)}

/* MAIN */
.main{display:flex;flex:1;overflow:hidden}

/* SIDEBAR */
#sidebar{width:300px;background:var(--card);display:flex;flex-direction:column;border-right:1px solid var(--border);flex-shrink:0}
@media(max-width:700px){
  #sidebar{position:fixed;bottom:0;left:0;right:0;width:100%;max-height:52vh;border-radius:16px 16px 0 0;box-shadow:0 -4px 20px rgba(0,0,0,.15);z-index:200;border-right:none}
  #map{flex:1;height:100%}
}
.day-tabs{display:flex;border-bottom:1px solid var(--border);background:#f8f9fc;overflow-x:auto;flex-shrink:0;scrollbar-width:none}
.day-tabs::-webkit-scrollbar{display:none}
.day-tab{padding:8px 12px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;border-bottom:2px solid transparent;transition:.15s;color:var(--muted);text-transform:uppercase;letter-spacing:.3px;flex-shrink:0}
.day-tab:hover{color:var(--navy)}
.day-tab.active{color:var(--navy);border-bottom-color:var(--accent)}

.sidebar-header{padding:8px 10px 6px;border-bottom:1px solid var(--border);flex-shrink:0}
.sh-row{display:flex;align-items:center;justify-content:space-between}
.sh-title{font-size:11px;font-weight:700;color:var(--text)}
.sh-counts{display:flex;gap:7px;font-size:10px}
.sh-cnt{display:flex;align-items:center;gap:2px}
.sh-cnt .dot{width:7px;height:7px;border-radius:50%}

.pos-list{flex:1;overflow-y:auto;padding:5px}
.pos-card{border-radius:9px;padding:8px 9px;margin-bottom:4px;cursor:pointer;border:1.5px solid var(--border);background:var(--card);transition:.15s;display:flex;align-items:center;gap:7px}
.pos-card:hover{border-color:var(--navy);background:#f0f4ff}
.pos-card.selected{border-color:var(--navy);background:#eef1ff}
.pos-card.visited{border-left:3px solid var(--green)}
.pos-card.nogo{border-left:3px solid var(--red)}
.pos-num{width:23px;height:23px;border-radius:50%;background:var(--navy);color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.pos-card.visited .pos-num{background:var(--green)}
.pos-card.nogo .pos-num{background:var(--red)}
.pos-info{flex:1;min-width:0}
.pos-nombre{font-size:11px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pos-dir{font-size:10px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pos-dist{font-size:9px;color:#94a3b8;margin-top:1px}
.btn-maps{background:#e8f0fe;border:none;border-radius:6px;padding:4px 6px;cursor:pointer;font-size:12px;flex-shrink:0;color:#1a73e8;transition:.15s;line-height:1}
.btn-maps:hover{background:#1a73e8;color:#fff}
.pos-done{font-size:13px;flex-shrink:0}

.sidebar-footer{padding:6px 8px;border-top:1px solid var(--border);flex-shrink:0}
.btn-sync{width:100%;padding:8px;background:var(--navy);color:#fff;border:none;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;transition:.2s}
.btn-sync:hover{background:var(--navy2)}
.btn-sync:disabled{background:#94a3b8;cursor:not-allowed}

/* MAP */
#map{flex:1;z-index:0}

/* MODAL */
#modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:500;display:none;align-items:center;justify-content:center;padding:0}
#modal-bg.active{display:flex}
@media(min-width:600px){#modal-bg{padding:16px}}
#modal{background:#fff;border-radius:0;width:100%;height:100%;max-height:100%;display:flex;flex-direction:column;overflow:hidden}
@media(min-width:600px){#modal{border-radius:16px;max-width:560px;height:auto;max-height:90vh}}
.modal-hdr{padding:12px 14px 10px;border-bottom:1px solid var(--border);display:flex;align-items:flex-start;justify-content:space-between;flex-shrink:0;background:linear-gradient(135deg,var(--navy),var(--navy2));border-radius:0}
@media(min-width:600px){.modal-hdr{border-radius:16px 16px 0 0}}
.modal-hdr h2{font-size:13px;font-weight:700;color:#fff}
.modal-hdr p{font-size:11px;color:rgba(255,255,255,.75);margin-top:1px}
.btn-close{background:rgba(255,255,255,.15);border:none;font-size:18px;cursor:pointer;color:#fff;border-radius:50%;width:27px;height:27px;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-left:8px}
.btn-nav{display:inline-flex;align-items:center;gap:4px;background:var(--accent);color:#fff;border:none;border-radius:6px;padding:4px 9px;font-size:10px;font-weight:700;cursor:pointer;margin-top:5px;text-decoration:none;transition:.15s}
.btn-nav:hover{background:var(--accent2)}

.modal-body{padding:12px 14px;overflow-y:auto;flex:1}
.field-group{margin-bottom:11px}
.field-label{font-size:10px;font-weight:700;color:var(--text);margin-bottom:5px;display:flex;align-items:center;gap:3px;text-transform:uppercase;letter-spacing:.4px}
.field-label .req{color:var(--red);font-size:10px}
.radio-group{display:flex;gap:5px;flex-wrap:wrap}
.rbtn{padding:6px 12px;border:1.5px solid var(--border);border-radius:7px;background:#fff;cursor:pointer;font-size:12px;font-weight:600;transition:.15s;white-space:nowrap}
.rbtn:hover{border-color:var(--navy)}
.rbtn.sel{border-color:var(--navy);background:#eef1ff;color:var(--navy)}
.rbtn.sel-si{border-color:var(--green);background:#f0fdf4;color:#15803d}
.rbtn.sel-no{border-color:var(--red);background:#fef2f2;color:#b91c1c}
select,textarea,input[type=text]{width:100%;border:1.5px solid var(--border);border-radius:8px;padding:8px 10px;font-size:12px;font-family:inherit;outline:none;transition:.2s;background:#fff}
select:focus,textarea:focus,input[type=text]:focus{border-color:var(--navy)}
textarea{resize:vertical;min-height:52px}

.pop-table{width:100%;border-collapse:collapse;font-size:11px}
.pop-table th{background:#f1f5f9;padding:5px 6px;text-align:center;font-size:9px;font-weight:700;color:var(--muted);border:1px solid var(--border)}
.pop-table td{padding:5px 6px;border:1px solid var(--border);text-align:center}
.pop-table td:first-child{text-align:left;font-weight:600;font-size:10px;color:var(--text);width:100px}
.pop-cb{width:15px;height:15px;cursor:pointer;accent-color:var(--navy)}

.stock-scale{display:flex;gap:5px;align-items:center;margin-top:3px}
.stock-scale .lbl-ext{font-size:10px;color:var(--muted);white-space:nowrap}
.stock-btns{display:flex;gap:3px}
.stock-btn{width:32px;height:32px;border:1.5px solid var(--border);border-radius:7px;background:#fff;cursor:pointer;font-size:12px;font-weight:700;transition:.15s;color:var(--text)}
.stock-btn:hover{border-color:var(--navy)}
.stock-btn.sel{background:var(--navy);color:#fff;border-color:var(--navy)}

.fotos-grid-named{display:grid;grid-template-columns:repeat(2,1fr);gap:6px}
.foto-named{border:1.5px dashed var(--border);border-radius:8px;overflow:hidden;background:#f8fafc;display:flex;flex-direction:column}
.foto-named .fn-label{font-size:9px;font-weight:700;color:var(--muted);padding:3px 7px 2px;background:#f1f5f9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-transform:uppercase;letter-spacing:.3px}
.foto-named .fn-label .req{color:var(--red)}
.foto-named .fn-preview{aspect-ratio:4/3;position:relative;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:2px;font-size:9px;color:#94a3b8;cursor:pointer}
.foto-named .fn-preview:hover{background:#eef1ff}
.foto-named .fn-preview img{width:100%;height:100%;object-fit:cover;position:absolute;inset:0}
.foto-named .fn-preview input[type=file]{position:absolute;inset:0;opacity:0;cursor:pointer;z-index:2}
.fn-del{position:absolute;top:3px;right:3px;background:rgba(0,0,0,.6);color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:11px;cursor:pointer;z-index:3;display:flex;align-items:center;justify-content:center}

.section-divider{border:none;border-top:1px solid var(--border);margin:10px 0}
.section-title{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--accent);margin-bottom:7px}

.modal-footer{padding:10px 14px;border-top:1px solid var(--border);display:flex;gap:7px;flex-shrink:0}
.btn-cancel{flex:1;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:#fff;font-size:13px;font-weight:600;cursor:pointer;color:var(--muted)}
.btn-save{flex:2;padding:10px;background:var(--navy);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;transition:.2s}
.btn-save:hover{background:var(--navy2)}
.btn-save:disabled{background:#94a3b8;cursor:not-allowed}

/* DASHBOARD */
#dash-overlay{position:fixed;inset:0;background:var(--bg);z-index:600;display:none;flex-direction:column;overflow:hidden}
#dash-overlay.active{display:flex}
.dash-hdr{background:var(--navy);color:#fff;padding:0 14px;height:52px;display:flex;align-items:center;gap:10px;border-bottom:3px solid var(--accent);flex-shrink:0}
.dash-hdr h1{font-size:14px;font-weight:700;flex:1}
.dash-body{flex:1;overflow-y:auto;padding:14px}
.dash-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:14px}
.kpi-card{background:var(--card);border-radius:12px;padding:14px;border:1px solid var(--border);text-align:center}
.kpi-val{font-size:30px;font-weight:800;color:var(--navy)}
.kpi-val.ok{color:var(--green)}
.kpi-val.ng{color:var(--red)}
.kpi-val.warn{color:var(--accent)}
.kpi-label{font-size:10px;color:var(--muted);margin-top:4px;font-weight:600;text-transform:uppercase;letter-spacing:.4px}
.dash-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px;margin-bottom:12px}
.chart-card{background:var(--card);border-radius:12px;padding:12px;border:1px solid var(--border)}
.chart-card h3{font-size:11px;font-weight:700;color:var(--text);margin-bottom:8px;text-transform:uppercase;letter-spacing:.4px;color:var(--navy)}
.chart-card canvas{max-height:180px}
.gallery-tabs{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px}
.gal-tab{padding:5px 11px;border:1.5px solid var(--border);border-radius:20px;font-size:10px;font-weight:600;cursor:pointer;transition:.15s;background:#fff;color:var(--muted)}
.gal-tab.active{background:var(--navy);color:#fff;border-color:var(--navy)}
.gallery-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:7px}
.gal-item{border-radius:8px;overflow:hidden;position:relative;aspect-ratio:4/3;background:#f1f5f9;cursor:pointer;border:1px solid var(--border)}
.gal-item img{width:100%;height:100%;object-fit:cover}
.gal-item .gal-lbl{position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,.6);color:#fff;font-size:9px;padding:2px 4px;font-weight:600}

/* TOAST */
#toast{position:fixed;bottom:76px;left:50%;transform:translateX(-50%);background:rgba(26,46,106,.95);color:#fff;padding:9px 18px;border-radius:28px;font-size:12px;font-weight:600;z-index:999;opacity:0;transition:.3s;pointer-events:none;white-space:nowrap;border-left:3px solid var(--accent)}
#toast.show{opacity:1}
</style>
</head>
<body>
''')

html_parts.append(f'''
<!-- LOGIN -->
<div id="login-screen">
  <div class="login-card">
    <div class="lc-logo">{LOGO_SVG}</div>
    <div class="lc-badge">BAT · PROMOTORÍA BODEGAS</div>
    <div class="lc-title">Promotoría Bodegas Audit</div>
    <div class="lc-sub">Ingresa tus credenciales para continuar</div>
    <input class="lc-input" id="l-email" type="text" placeholder="correo@ttaudit.com" autocomplete="username" inputmode="email"/>
    <input class="lc-input" id="l-pass" type="password" placeholder="Contraseña" onkeydown="if(event.key==='Enter')doLogin()"/>
    <button class="lc-btn" onclick="doLogin()">Ingresar</button>
    <div class="lc-err" id="login-err">Credenciales incorrectas</div>
  </div>
</div>

<!-- APP -->
<div id="app">
  <header>
    <div class="hdr-logo">{LOGO_SM}</div>
    <div class="hdr-divider"></div>
    <div class="hdr-title">Promotoría Bodegas Audit<small id="hdr-day-label">—</small></div>
    <div class="hdr-right">
      <div class="hdr-progress">
        <div class="bar"><div class="fill" id="h-bar" style="width:0%"></div></div>
        <span id="h-pct">0%</span>
      </div>
      <button class="btn-icon" onclick="syncPending()">⬆ Sync</button>
      <button class="btn-icon accent" id="btn-dash" style="display:none" onclick="openDash()">📊 Dashboard</button>
      <button class="btn-icon" onclick="doLogout()">↩</button>
    </div>
  </header>
  <div class="main">
    <aside id="sidebar">
      <div class="day-tabs" id="day-tabs"></div>
      <div class="sidebar-header">
        <div class="sh-row">
          <span class="sh-title" id="sb-title">Puntos del día</span>
          <div class="sh-counts">
            <span class="sh-cnt"><span class="dot" style="background:var(--green)"></span><span id="cnt-v">0</span></span>
            <span class="sh-cnt"><span class="dot" style="background:var(--red)"></span><span id="cnt-n">0</span></span>
            <span class="sh-cnt"><span class="dot" style="background:#d1d5db"></span><span id="cnt-p">0</span></span>
          </div>
        </div>
      </div>
      <div class="pos-list" id="pos-list"></div>
      <div class="sidebar-footer">
        <button class="btn-sync" id="sync-btn" onclick="syncPending()" disabled>⬆ Sincronizar con Google Sheets</button>
      </div>
    </aside>
    <div id="map"></div>
  </div>
</div>

<!-- DASHBOARD -->
<div id="dash-overlay">
  <div class="dash-hdr">
    <div class="hdr-logo">{LOGO_XS}</div>
    <h1>Dashboard — Promotoría Bodegas Audit</h1>
    <select id="dash-day-filter" onchange="renderDash()" style="width:auto;padding:6px 10px;font-size:11px;border-radius:7px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.1);color:#fff;cursor:pointer">
      <option value="ALL">Todos los días</option>
      <option value="LUNES">Lunes (15)</option>
      <option value="MARTES">Martes (17)</option>
      <option value="MIERCOLES">Miércoles (22)</option>
      <option value="JUEVES">Jueves (24)</option>
      <option value="VIERNES">Viernes (12)</option>
    </select>
    <button class="btn-icon" onclick="closeDash()" style="margin-left:6px">✕ Cerrar</button>
  </div>
  <div class="dash-body" id="dash-body"></div>
</div>
''')

html_parts.append('''
<!-- VISIT MODAL -->
<div id="modal-bg" onclick="handleBgClick(event)">
  <div id="modal">
    <div class="modal-hdr">
      <div style="flex:1;min-width:0">
        <h2 id="m-nombre"></h2>
        <p id="m-dir"></p>
        <a id="btn-nav-maps" class="btn-nav" href="#" target="_blank" rel="noopener">🗺️ Abrir en Google Maps</a>
      </div>
      <button class="btn-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="field-group">
        <label class="field-label">¿El Local se encuentra Abierto? <span class="req">*</span></label>
        <div class="radio-group">
          <button class="rbtn" id="rb-abierto-si" onclick="selAbierto('Si')">✅ Sí, abierto</button>
          <button class="rbtn" id="rb-abierto-no" onclick="selAbierto('No')">❌ Cerrado / No se pudo</button>
        </div>
      </div>
      <div class="field-group">
        <label class="field-label">📷 Foto Fachada Principal</label>
        <div class="foto-named" style="max-width:190px">
          <div class="fn-label">Fachada</div>
          <div class="fn-preview" id="fp-fachada"><span style="font-size:20px">🏪</span><span>Tomar foto</span><input type="file" accept="image/*" onchange="setFoto('fachada',this)"></div>
        </div>
      </div>
      <div id="seccion-abierto" style="display:none">
        <div class="field-group">
          <label class="field-label">Nombres y Apellidos del Staff <span class="req">*</span></label>
          <input type="text" id="m-staff" placeholder="Ej: Juan Pérez García"/>
        </div>
        <hr class="section-divider">
        <div class="section-title">▸ Materiales POP Instalados</div>
        <div class="field-group">
          <label class="field-label">Revisión de Materiales de Convivencia <span class="req">*</span></label>
          <table class="pop-table">
            <thead><tr><th>Material</th><th>Encontrado</th><th>Óptimo</th><th>Requiere Reemplazo</th></tr></thead>
            <tbody>
              <tr><td>Placa</td><td><input type="checkbox" class="pop-cb" id="pop-placa-enc"></td><td><input type="checkbox" class="pop-cb" id="pop-placa-opt"></td><td><input type="checkbox" class="pop-cb" id="pop-placa-rep"></td></tr>
              <tr><td>Jalavista Vuse</td><td><input type="checkbox" class="pop-cb" id="pop-vuse-enc"></td><td><input type="checkbox" class="pop-cb" id="pop-vuse-opt"></td><td><input type="checkbox" class="pop-cb" id="pop-vuse-rep"></td></tr>
              <tr><td>Jalavista Lucky Strike</td><td><input type="checkbox" class="pop-cb" id="pop-lucky-enc"></td><td><input type="checkbox" class="pop-cb" id="pop-lucky-opt"></td><td><input type="checkbox" class="pop-cb" id="pop-lucky-rep"></td></tr>
              <tr><td>Jalavista Velo</td><td><input type="checkbox" class="pop-cb" id="pop-velo-enc"></td><td><input type="checkbox" class="pop-cb" id="pop-velo-opt"></td><td><input type="checkbox" class="pop-cb" id="pop-velo-rep"></td></tr>
            </tbody>
          </table>
        </div>
        <div class="field-group">
          <label class="field-label">Fotos de Materiales POP</label>
          <div class="fotos-grid-named">
            <div class="foto-named"><div class="fn-label">📌 Placa</div><div class="fn-preview" id="fp-placa"><span style="font-size:16px">📌</span><span>Foto</span><input type="file" accept="image/*" onchange="setFoto('placa',this)"></div></div>
            <div class="foto-named"><div class="fn-label">🔖 Jalavista Vuse</div><div class="fn-preview" id="fp-vuse"><span style="font-size:16px">🔖</span><span>Foto</span><input type="file" accept="image/*" onchange="setFoto('vuse',this)"></div></div>
            <div class="foto-named"><div class="fn-label">🔖 Lucky Strike <span class="req">*</span></div><div class="fn-preview" id="fp-lucky"><span style="font-size:16px">🔖</span><span>Foto</span><input type="file" accept="image/*" onchange="setFoto('lucky',this)"></div></div>
            <div class="foto-named"><div class="fn-label">🔖 Jalavista Velo <span class="req">*</span></div><div class="fn-preview" id="fp-velo"><span style="font-size:16px">🔖</span><span>Foto</span><input type="file" accept="image/*" onchange="setFoto('velo',this)"></div></div>
          </div>
        </div>
        <div class="field-group"><label class="field-label">Comentarios – Placa</label><textarea id="obs-placa" rows="2" placeholder="Observaciones..."></textarea></div>
        <div class="field-group"><label class="field-label">Comentarios – Jalavista Vuse</label><textarea id="obs-vuse" rows="2" placeholder="Observaciones..."></textarea></div>
        <div class="field-group"><label class="field-label">Comentarios – Jalavista Lucky Strike</label><textarea id="obs-lucky" rows="2" placeholder="Observaciones..."></textarea></div>
        <div class="field-group"><label class="field-label">Comentarios – Jalavista Velo</label><textarea id="obs-velo" rows="2" placeholder="Observaciones..."></textarea></div>
        <hr class="section-divider">
        <div class="section-title">▸ Cigarrera</div>
        <div class="field-group">
          <label class="field-label">¿El Local cuenta con Cigarrera? <span class="req">*</span></label>
          <div class="radio-group"><button class="rbtn" id="rb-cig-si" onclick="selCigarrera('Si')">Sí</button><button class="rbtn" id="rb-cig-no" onclick="selCigarrera('No')">No</button></div>
        </div>
        <div id="seccion-cigarrera" style="display:none">
          <div class="field-group"><label class="field-label">📷 Fotografía de la Cigarrera <span class="req">*</span></label><div class="foto-named" style="max-width:190px"><div class="fn-label">Cigarrera <span class="req">*</span></div><div class="fn-preview" id="fp-cigarrera"><span style="font-size:18px">🗄️</span><span>Foto</span><input type="file" accept="image/*" onchange="setFoto('cigarrera',this)"></div></div></div>
          <div class="field-group">
            <label class="field-label">¿Comunicación en Cigarrera Actualizada? <span class="req">*</span></label>
            <div class="radio-group" style="flex-direction:column;align-items:flex-start;gap:4px">
              <button class="rbtn" id="rb-cigcom-vigente" onclick="selCigCom('Sí, comunicación vigente')">Sí, comunicación vigente</button>
              <button class="rbtn" id="rb-cigcom-antigua" onclick="selCigCom('No, tiene comunicación antigua')">No, tiene comunicación antigua</button>
              <button class="rbtn" id="rb-cigcom-na" onclick="selCigCom('No aplica')">No aplica</button>
            </div>
          </div>
          <div class="field-group"><label class="field-label">¿El cliente permite el cambio?</label><textarea id="m-permite-cambio" rows="2" placeholder="Ej: Sí, acordamos el jueves..."></textarea></div>
        </div>
        <hr class="section-divider">
        <div class="section-title">▸ Dispenser</div>
        <div class="field-group">
          <label class="field-label">¿El Local cuenta con Dispenser? <span class="req">*</span></label>
          <div class="radio-group"><button class="rbtn" id="rb-disp-si" onclick="selDispenser('Si')">Sí</button><button class="rbtn" id="rb-disp-no" onclick="selDispenser('No')">No</button></div>
        </div>
        <div id="seccion-dispenser" style="display:none">
          <div class="field-group"><div class="foto-named" style="max-width:190px"><div class="fn-label">📷 Dispenser</div><div class="fn-preview" id="fp-dispenser"><span style="font-size:18px">📦</span><span>Foto</span><input type="file" accept="image/*" onchange="setFoto('dispenser',this)"></div></div></div>
        </div>
        <div class="field-group"><label class="field-label">Comentarios adicionales – Dispenser</label><textarea id="obs-dispenser" rows="2" placeholder="Observaciones..."></textarea></div>
        <hr class="section-divider">
        <div class="section-title">▸ Stock y Control</div>
        <div class="field-group">
          <label class="field-label">¿El Local tiene Stock Suficiente?</label>
          <div class="stock-scale">
            <span class="lbl-ext">Muy bajo</span>
            <div class="stock-btns">
              <button class="stock-btn" id="stk-1" onclick="selStock(1)">1</button>
              <button class="stock-btn" id="stk-2" onclick="selStock(2)">2</button>
              <button class="stock-btn" id="stk-3" onclick="selStock(3)">3</button>
              <button class="stock-btn" id="stk-4" onclick="selStock(4)">4</button>
              <button class="stock-btn" id="stk-5" onclick="selStock(5)">5</button>
            </div>
            <span class="lbl-ext">Óptimo</span>
          </div>
        </div>
        <div class="field-group"><label class="field-label">¿Qué SKUs no tiene disponible?</label><textarea id="m-skus-faltantes" rows="2" placeholder="Ej: Lucky Strike Box 10s, Vuse Pod Menta..."></textarea></div>
        <div class="field-group">
          <label class="field-label">¿Se identificaron Productos de Contrabando? <span class="req">*</span></label>
          <div class="radio-group"><button class="rbtn" id="rb-cont-si" onclick="selContrabando('Si')">Sí</button><button class="rbtn" id="rb-cont-no" onclick="selContrabando('No')">No</button></div>
        </div>
        <div id="seccion-contrabando" style="display:none">
          <div class="field-group"><div class="foto-named" style="max-width:190px"><div class="fn-label">⚠️ Foto Contrabando</div><div class="fn-preview" id="fp-contrabando"><span style="font-size:18px">⚠️</span><span>Evidencia</span><input type="file" accept="image/*" onchange="setFoto('contrabando',this)"></div></div></div>
          <div class="field-group"><label class="field-label">¿Qué marcas de contrabando ofrece?</label><textarea id="m-marcas-contrabando" rows="2" placeholder="Ej: Marlboro Paraguayo..."></textarea></div>
        </div>
        <div class="field-group">
          <label class="field-label">📷 Foto Panorámica Interior</label>
          <div class="foto-named" style="max-width:190px"><div class="fn-label">Vista interior</div><div class="fn-preview" id="fp-panoramica"><span style="font-size:18px">🏬</span><span>Foto panorámica</span><input type="file" accept="image/*" onchange="setFoto('panoramica',this)"></div></div>
        </div>
      </div><!-- /seccion-abierto -->
    </div><!-- /modal-body -->
    <div class="modal-footer">
      <button class="btn-cancel" onclick="closeModal()">Cancelar</button>
      <button class="btn-save" id="btn-save" onclick="saveVisit()">💾 Guardar visita</button>
    </div>
  </div>
</div>

<div id="toast"></div>
''')

html_parts.append(f'''
<script>
// ═══════════════════════════════
// POS DATA — 90 registros reales
// ═══════════════════════════════
{POS_JS}

const DAYS_ORDER = ['LUNES','MARTES','MIERCOLES','JUEVES','VIERNES'];
const DAY_LABELS = {{LUNES:'Lunes',MARTES:'Martes',MIERCOLES:'Miércoles',JUEVES:'Jueves',VIERNES:'Viernes'}};

// ─── CONFIG ───
// Reemplaza con la URL de tu Apps Script Web App desplegado
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxjm2DOxDlONCId0OKYjw3X1pYGKp04SLGRIU1b1GwDZ6A4blJCOqYqjSp11wLZqn831Q/exec';

const USERS = {{
  'auditor1@ttaudit.com': {{pass:'123456', role:'auditor'}},
  'ccamarena@ttaudit.com': {{pass:'Audit2026', role:'admin'}}
}};

// ─── STATE ───
let currentUser=null, currentRole=null, currentDay=null;
let selectedPosId=null, map=null, markers={{}}, visits={{}};
let mAbierto=null, mCigarrera=null, mCigCom=null, mDispenser=null, mContrabando=null, mStock=null;
let fotosData={{}}, currentPosId=null;

// ─── LOGIN ───
function doLogin(){{
  const email=(document.getElementById('l-email').value||'').trim().toLowerCase();
  const pass=(document.getElementById('l-pass').value||'').trim();
  const u=USERS[email];
  if(!u||u.pass!==pass){{document.getElementById('login-err').style.display='block';return;}}
  document.getElementById('login-err').style.display='none';
  currentUser=email; currentRole=u.role;
  document.getElementById('login-screen').style.display='none';
  document.getElementById('app').classList.add('active');
  if(currentRole==='admin') document.getElementById('btn-dash').style.display='';
  visits=JSON.parse(localStorage.getItem('bat_v2_'+email)||'{{}}');
  initApp();
  setTimeout(()=>{{ if(map) map.invalidateSize(); }},150);
}}
function doLogout(){{
  currentUser=null; currentRole=null;
  document.getElementById('app').classList.remove('active');
  document.getElementById('login-screen').style.display='flex';
  document.getElementById('l-pass').value='';
}}

// ─── INIT ───
function initApp(){{
  buildDayTabs();
  const today=new Date().toLocaleDateString('es-PE',{{weekday:'long'}}).toUpperCase()
    .normalize('NFD').replace(/[\\u0300-\\u036f]/g,'');
  const match=DAYS_ORDER.find(d=>today.startsWith(d.substring(0,3)))||DAYS_ORDER[0];
  selectDay(match);
}}

function buildDayTabs(){{
  document.getElementById('day-tabs').innerHTML=DAYS_ORDER.map(d=>
    `<div class="day-tab" id="tab-${{d}}" onclick="selectDay('${{d}}')">${{DAY_LABELS[d]}}<br><small style="font-size:8px;opacity:.65">${{(POS_DATA[d]||[]).length}} POS</small></div>`
  ).join('');
}}

function selectDay(day){{
  currentDay=day;
  DAYS_ORDER.forEach(d=>document.getElementById(`tab-${{d}}`).classList.toggle('active',d===day));
  document.getElementById('hdr-day-label').textContent=DAY_LABELS[day]||day;
  renderPosList(); renderMapMarkers(); updateHeader();
}}

// ─── SIDEBAR ───
function renderPosList(){{
  const posList=POS_DATA[currentDay]||[];
  let v=0,n=0,p=0;
  document.getElementById('pos-list').innerHTML=posList.map((pos,idx)=>{{
    const visit=visits[pos.id];
    let cls='',icon='⬜';
    if(visit){{ if(visit.estado==='visitado'){{cls='visited';icon='✅';v++;}} else{{cls='nogo';icon='❌';n++;}} }} else p++;
    return `<div class="pos-card ${{cls}}${{pos.id===selectedPosId?' selected':''}}" onclick="openModal('${{pos.id}}')" id="card-${{pos.id}}">
      <div class="pos-num">${{idx+1}}</div>
      <div class="pos-info">
        <div class="pos-nombre">${{pos.nombre}}</div>
        <div class="pos-dir">${{pos.direccion}}</div>
        <div class="pos-dist">${{pos.distrito}}</div>
      </div>
      <button class="btn-maps" onclick="openMaps(${{pos.lat}},${{pos.lon}},event)" title="Google Maps">🗺️</button>
      <span class="pos-done">${{icon}}</span>
    </div>`;
  }}).join('');
  document.getElementById('sb-title').textContent=`${{posList.length}} POS · ${{DAY_LABELS[currentDay]}}`;
  document.getElementById('cnt-v').textContent=v;
  document.getElementById('cnt-n').textContent=n;
  document.getElementById('cnt-p').textContent=p;
}}

// ─── MAP ───
function initMap(){{
  map=L.map('map',{{zoomControl:true}}).setView([-12.08,-77.02],12);
  L.tileLayer('https://{{s}}.tile.openstreetmap.org/{{z}}/{{x}}/{{y}}.png',{{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}}).addTo(map);
}}
function makeNumberedIcon(num,status){{
  const c={{pending:'#1A2E6A',visitado:'#22c55e',nogo:'#ef4444'}}[status]||'#1A2E6A';
  return L.divIcon({{className:'',iconAnchor:[14,14],html:`<div style="width:28px;height:28px;background:${{c}};border:2.5px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.35);font-size:11px;font-weight:800;color:#fff">${{num}}</div>`}});
}}
function renderMapMarkers(){{
  Object.values(markers).forEach(m=>map.removeLayer(m));
  markers={{}};
  const posList=POS_DATA[currentDay]||[];
  const bounds=[];
  posList.forEach((pos,idx)=>{{
    const v=visits[pos.id];
    const status=v?(v.estado==='visitado'?'visitado':'nogo'):'pending';
    const m=L.marker([pos.lat,pos.lon],{{icon:makeNumberedIcon(idx+1,status)}}).addTo(map)
      .bindPopup(`<b>${{pos.nombre}}</b><br><small>${{pos.direccion}}</small><br><small>${{pos.distrito}}</small>`);
    m.on('click',()=>openModal(pos.id));
    markers[pos.id]=m; bounds.push([pos.lat,pos.lon]);
  }});
  if(bounds.length) map.fitBounds(bounds,{{padding:[30,30]}});
}}
function updateMarker(posId){{
  const pos=getAllPos().find(p=>p.id===posId); if(!pos||!markers[posId]) return;
  const v=visits[posId]; const status=v?(v.estado==='visitado'?'visitado':'nogo'):'pending';
  const idx=(POS_DATA[currentDay]||[]).findIndex(p=>p.id===posId);
  markers[posId].setIcon(makeNumberedIcon(idx+1,status));
}}
function getAllPos(){{ return DAYS_ORDER.flatMap(d=>POS_DATA[d]||[]); }}

// ─── MODAL ───
function openModal(posId){{
  currentPosId=posId; selectedPosId=posId;
  const pos=getAllPos().find(p=>p.id===posId); if(!pos) return;
  document.getElementById('m-nombre').textContent=pos.nombre;
  document.getElementById('m-dir').textContent=`${{pos.direccion}} · ${{pos.distrito}}`;
  document.getElementById('btn-nav-maps').href=`https://www.google.com/maps/dir/?api=1&destination=${{pos.lat}},${{pos.lon}}`;
  resetModal();
  const ex=visits[posId];
  if(ex){{
    if(ex.abierto) selAbierto(ex.abierto,true);
    ['m-staff','obs-placa','obs-vuse','obs-lucky','obs-velo','m-permite-cambio','obs-dispenser','m-skus-faltantes','m-marcas-contrabando']
      .forEach(id=>{{ if(ex[id.replace('m-','').replace('-','')]) document.getElementById(id).value=ex[id.replace('m-','').replace('-','')]||''; }});
    if(ex.staff) document.getElementById('m-staff').value=ex.staff;
    if(ex.obsPlaca) document.getElementById('obs-placa').value=ex.obsPlaca;
    if(ex.obsVuse) document.getElementById('obs-vuse').value=ex.obsVuse;
    if(ex.obsLucky) document.getElementById('obs-lucky').value=ex.obsLucky;
    if(ex.obsVelo) document.getElementById('obs-velo').value=ex.obsVelo;
    if(ex.permiteCambio) document.getElementById('m-permite-cambio').value=ex.permiteCambio;
    if(ex.obsDispenser) document.getElementById('obs-dispenser').value=ex.obsDispenser;
    if(ex.skusFaltantes) document.getElementById('m-skus-faltantes').value=ex.skusFaltantes;
    if(ex.marcasContrabando) document.getElementById('m-marcas-contrabando').value=ex.marcasContrabando;
    if(ex.pop) ['placa','vuse','lucky','velo'].forEach(k=>{{if(ex.pop[k]) ['enc','opt','rep'].forEach(s=>{{if(ex.pop[k][s]) document.getElementById(`pop-${{k}}-${{s}}`).checked=true;}});}});
    if(ex.cigarrera) selCigarrera(ex.cigarrera,true);
    if(ex.cigCom) selCigCom(ex.cigCom,true);
    if(ex.dispenser) selDispenser(ex.dispenser,true);
    if(ex.stock) selStock(ex.stock,true);
    if(ex.contrabando) selContrabando(ex.contrabando,true);
    if(ex.fotos){{ fotosData={{...ex.fotos}}; Object.keys(fotosData).forEach(k=>refreshFotoSlot(k)); }}
  }}
  document.getElementById('modal-bg').classList.add('active');
  if(markers[posId]){{ map.setView([pos.lat,pos.lon],16,{{animate:true}}); markers[posId].openPopup(); }}
  renderPosList();
}}

function resetModal(){{
  mAbierto=null;mCigarrera=null;mCigCom=null;mDispenser=null;mContrabando=null;mStock=null;fotosData={{}};
  ['rb-abierto-si','rb-abierto-no','rb-cig-si','rb-cig-no','rb-disp-si','rb-disp-no','rb-cont-si','rb-cont-no','rb-cigcom-vigente','rb-cigcom-antigua','rb-cigcom-na']
    .forEach(id=>{{ const el=document.getElementById(id); if(el) el.className='rbtn'; }});
  for(let i=1;i<=5;i++) document.getElementById(`stk-${{i}}`).className='stock-btn';
  ['placa','vuse','lucky','velo'].forEach(k=>['enc','opt','rep'].forEach(s=>{{ const el=document.getElementById(`pop-${{k}}-${{s}}`); if(el) el.checked=false; }}));
  ['m-staff','obs-placa','obs-vuse','obs-lucky','obs-velo','m-permite-cambio','obs-dispenser','m-skus-faltantes','m-marcas-contrabando']
    .forEach(id=>{{ const el=document.getElementById(id); if(el) el.value=''; }});
  ['fachada','placa','vuse','lucky','velo','cigarrera','dispenser','contrabando','panoramica'].forEach(k=>clearFotoSlot(k));
  ['seccion-abierto','seccion-cigarrera','seccion-dispenser','seccion-contrabando'].forEach(id=>document.getElementById(id).style.display='none');
}}

function selAbierto(v){{ mAbierto=v; document.getElementById('rb-abierto-si').className='rbtn'+(v==='Si'?' sel-si':''); document.getElementById('rb-abierto-no').className='rbtn'+(v==='No'?' sel-no':''); document.getElementById('seccion-abierto').style.display=v==='Si'?'block':'none'; }}
function selCigarrera(v){{ mCigarrera=v; document.getElementById('rb-cig-si').className='rbtn'+(v==='Si'?' sel-si':''); document.getElementById('rb-cig-no').className='rbtn'+(v==='No'?' sel-no':''); document.getElementById('seccion-cigarrera').style.display=v==='Si'?'block':'none'; }}
function selCigCom(v){{ mCigCom=v; const m={{'Sí, comunicación vigente':'rb-cigcom-vigente','No, tiene comunicación antigua':'rb-cigcom-antigua','No aplica':'rb-cigcom-na'}}; Object.keys(m).forEach(k=>document.getElementById(m[k]).className='rbtn'+(k===v?' sel':'')); }}
function selDispenser(v){{ mDispenser=v; document.getElementById('rb-disp-si').className='rbtn'+(v==='Si'?' sel-si':''); document.getElementById('rb-disp-no').className='rbtn'+(v==='No'?' sel-no':''); document.getElementById('seccion-dispenser').style.display=v==='Si'?'block':'none'; }}
function selContrabando(v){{ mContrabando=v; document.getElementById('rb-cont-si').className='rbtn'+(v==='Si'?' sel-si':''); document.getElementById('rb-cont-no').className='rbtn'+(v==='No'?' sel-no':''); document.getElementById('seccion-contrabando').style.display=v==='Si'?'block':'none'; }}
function selStock(n){{ mStock=n; for(let i=1;i<=5;i++) document.getElementById(`stk-${{i}}`).className='stock-btn'+(i===n?' sel':''); }}

function setFoto(key,input){{ const file=input.files[0]; if(!file) return; const r=new FileReader(); r.onload=e=>compressImage(e.target.result,900,.78,b64=>{{ fotosData[key]=b64; refreshFotoSlot(key); }}); r.readAsDataURL(file); }}
function refreshFotoSlot(key){{ const p=document.getElementById(`fp-${{key}}`); if(!p) return; p.querySelectorAll('img,.fn-del').forEach(el=>el.remove()); if(fotosData[key]){{ const img=document.createElement('img'); img.src=fotosData[key]; const del=document.createElement('button'); del.className='fn-del'; del.textContent='×'; del.onclick=e=>{{ e.stopPropagation(); fotosData[key]=null; clearFotoSlot(key); }}; p.appendChild(img); p.appendChild(del); }} }}
function clearFotoSlot(key){{ const p=document.getElementById(`fp-${{key}}`); if(p) p.querySelectorAll('img,.fn-del').forEach(el=>el.remove()); }}
function compressImage(src,maxW,q,cb){{ const img=new Image(); img.onload=()=>{{ const c=document.createElement('canvas'); let w=img.width,h=img.height; if(w>maxW){{h=Math.round(h*maxW/w);w=maxW;}} c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h); cb(c.toDataURL('image/jpeg',q)); }}; img.src=src; }}

function openMaps(lat,lon,e){{ e.stopPropagation(); window.open(`https://www.google.com/maps/dir/?api=1&destination=${{lat}},${{lon}}`,'_blank','noopener'); }}
function closeModal(){{ document.getElementById('modal-bg').classList.remove('active'); currentPosId=null; }}
function handleBgClick(e){{ if(e.target===document.getElementById('modal-bg')) closeModal(); }}

// ─── SAVE ───
async function saveVisit(){{
  if(!mAbierto){{ toast('Indica si el local está abierto'); return; }}
  const btn=document.getElementById('btn-save'); btn.disabled=true; btn.textContent='Guardando...';
  const pos=getAllPos().find(p=>p.id===currentPosId);
  const popData={{}};
  ['placa','vuse','lucky','velo'].forEach(k=>{{ popData[k]={{enc:document.getElementById(`pop-${{k}}-enc`).checked,opt:document.getElementById(`pop-${{k}}-opt`).checked,rep:document.getElementById(`pop-${{k}}-rep`).checked}}; }});
  const record={{
    id:currentPosId, timestamp:new Date().toISOString(),
    fecha:new Date().toLocaleDateString('es-PE'), hora:new Date().toLocaleTimeString('es-PE',{{hour:'2-digit',minute:'2-digit'}}),
    auditor:currentUser, dia:currentDay, nombre:pos.nombre, direccion:pos.direccion, distrito:pos.distrito,
    abierto:mAbierto, estado:mAbierto==='Si'?'visitado':'nogo',
    staff:document.getElementById('m-staff').value.trim(),
    pop:mAbierto==='Si'?popData:{{}},
    obsPlaca:document.getElementById('obs-placa').value.trim(),
    obsVuse:document.getElementById('obs-vuse').value.trim(),
    obsLucky:document.getElementById('obs-lucky').value.trim(),
    obsVelo:document.getElementById('obs-velo').value.trim(),
    cigarrera:mAbierto==='Si'?mCigarrera:'',
    cigCom:mAbierto==='Si'&&mCigarrera==='Si'?mCigCom:'',
    permiteCambio:document.getElementById('m-permite-cambio').value.trim(),
    dispenser:mAbierto==='Si'?mDispenser:'',
    obsDispenser:document.getElementById('obs-dispenser').value.trim(),
    stock:mAbierto==='Si'?mStock:null,
    skusFaltantes:document.getElementById('m-skus-faltantes').value.trim(),
    contrabando:mAbierto==='Si'?mContrabando:'',
    marcasContrabando:document.getElementById('m-marcas-contrabando').value.trim(),
    fotos:{{...fotosData}}, synced:false
  }};
  visits[currentPosId]=record;
  localStorage.setItem('bat_v2_'+currentUser,JSON.stringify(visits));
  updateMarker(currentPosId); renderPosList(); updateHeader();
  closeModal(); btn.disabled=false; btn.textContent='💾 Guardar visita';
  toast('✓ Visita guardada localmente');
  trySync(record);
}}

// ─── SYNC ───
async function trySync(record){{
  if(APPS_SCRIPT_URL==='TU_APPS_SCRIPT_URL_AQUI') return;
  try{{ const r=await fetch(APPS_SCRIPT_URL,{{method:'POST',body:JSON.stringify(record)}}); const j=await r.json(); if(j.ok){{ record.synced=true; visits[record.id]=record; localStorage.setItem('bat_v2_'+currentUser,JSON.stringify(visits)); updateSyncBtn(); toast('✓ Sincronizado con Sheets'); }} }} catch(e){{}}
}}
async function syncPending(){{
  if(APPS_SCRIPT_URL==='TU_APPS_SCRIPT_URL_AQUI'){{ toast('Configura APPS_SCRIPT_URL primero'); return; }}
  const pending=Object.values(visits).filter(v=>!v.synced);
  if(!pending.length){{ toast('Todo sincronizado ✓'); return; }}
  toast(`Sincronizando ${{pending.length}} registro(s)...`);
  let ok=0;
  for(const rec of pending){{ try{{ const r=await fetch(APPS_SCRIPT_URL,{{method:'POST',body:JSON.stringify(rec)}}); const j=await r.json(); if(j.ok){{rec.synced=true;visits[rec.id]=rec;ok++;}} }} catch(e){{}} }}
  localStorage.setItem('bat_v2_'+currentUser,JSON.stringify(visits));
  updateSyncBtn(); toast(`${{ok}}/${{pending.length}} sincronizados`);
}}
function updateSyncBtn(){{
  const p=Object.values(visits).filter(v=>!v.synced).length;
  const btn=document.getElementById('sync-btn');
  btn.disabled=p===0; btn.textContent=p>0?`⬆ Sincronizar (${{p}} pend.)`:'✓ Todo sincronizado';
}}
function updateHeader(){{
  const v=Object.values(visits).filter(r=>r.estado==='visitado').length;
  const n=Object.values(visits).filter(r=>r.estado==='nogo').length;
  const total=getAllPos().length;
  const pct=total>0?Math.round((v+n)/total*100):0;
  const bar=document.getElementById('h-bar');
  const pctEl=document.getElementById('h-pct');
  if(bar) bar.style.width=pct+'%';
  if(pctEl) pctEl.textContent=pct+'%';
  updateSyncBtn();
}}

// ─── DASHBOARD ───
function openDash(){{ document.getElementById('dash-overlay').classList.add('active'); renderDash(); }}
function closeDash(){{ document.getElementById('dash-overlay').classList.remove('active'); }}

let _charts=[];
async function renderDash(){{
  _charts.forEach(c=>c.destroy()); _charts=[];
  const body=document.getElementById('dash-body');
  body.innerHTML='<p style="text-align:center;padding:40px;color:var(--muted)">⏳ Cargando...</p>';
  let allRecords=[...Object.values(visits)];
  if(APPS_SCRIPT_URL!=='TU_APPS_SCRIPT_URL_AQUI'){{
    try{{
      const resp=await fetch(APPS_SCRIPT_URL+'?action=getAll',{{mode:'cors'}});
      const r=await resp.json();
      if(r.ok&&r.data){{ const ids=new Set(allRecords.map(x=>x.id)); r.data.forEach(rec=>{{if(!ids.has(rec.id)) allRecords.push(rec);}}) }}
    }} catch(e){{ console.log('Remote dash error',e); }}
  }}
  const df=document.getElementById('dash-day-filter').value;
  const records=df==='ALL'?allRecords:allRecords.filter(r=>r.dia===df);
  const total=getAllPos().length;
  const dayTotal=df==='ALL'?total:(POS_DATA[df]||[]).length;
  const visitados=records.filter(r=>r.estado==='visitado').length;
  const noEf=records.filter(r=>r.estado==='nogo').length;
  const pend=Math.max(0,dayTotal-records.length);
  const pct=dayTotal>0?Math.round((visitados+noEf)/dayTotal*100):0;
  const cigSi=records.filter(r=>r.cigarrera==='Si').length;
  const dispSi=records.filter(r=>r.dispenser==='Si').length;
  const contSi=records.filter(r=>r.contrabando==='Si').length;
  const stocks=records.filter(r=>r.stock).map(r=>r.stock);
  const sAvg=stocks.length?(stocks.reduce((a,b)=>a+b,0)/stocks.length).toFixed(1):'—';

  body.innerHTML=`
  <div class="dash-grid">
    <div class="kpi-card"><div class="kpi-val ok">${{visitados}}</div><div class="kpi-label">✅ Visitados</div></div>
    <div class="kpi-card"><div class="kpi-val ng">${{noEf}}</div><div class="kpi-label">❌ No Efectivos</div></div>
    <div class="kpi-card"><div class="kpi-val warn">${{pend}}</div><div class="kpi-label">⏳ Pendientes</div></div>
    <div class="kpi-card"><div class="kpi-val" style="font-size:26px">${{pct}}%</div><div class="kpi-label">📊 Avance</div></div>
    <div class="kpi-card"><div class="kpi-val" style="font-size:26px">${{cigSi}}</div><div class="kpi-label">🗄️ Con Cigarrera</div></div>
    <div class="kpi-card"><div class="kpi-val" style="font-size:26px">${{dispSi}}</div><div class="kpi-label">📦 Con Dispenser</div></div>
    <div class="kpi-card"><div class="kpi-val warn">${{contSi}}</div><div class="kpi-label">⚠️ Contrabando</div></div>
    <div class="kpi-card"><div class="kpi-val" style="font-size:26px">${{sAvg}}</div><div class="kpi-label">📦 Stock Prom.</div></div>
  </div>
  <div class="dash-row">
    <div class="chart-card"><h3>Estado de Visitas</h3><canvas id="ch-est"></canvas></div>
    <div class="chart-card"><h3>Materiales POP Encontrados</h3><canvas id="ch-pop"></canvas></div>
    <div class="chart-card"><h3>Cigarrera y Dispenser</h3><canvas id="ch-act"></canvas></div>
    <div class="chart-card"><h3>Stock (1-5)</h3><canvas id="ch-stk"></canvas></div>
  </div>
  <div class="chart-card" style="margin-bottom:14px">
    <h3>Galería de Fotos por Pregunta</h3>
    <div class="gallery-tabs" id="gal-tabs"></div>
    <div class="gallery-grid" id="gal-grid"></div>
  </div>`;

  const opt={{animation:{{duration:300}},plugins:{{legend:{{labels:{{font:{{size:10}}}}}}}}}};
  _charts.push(new Chart(document.getElementById('ch-est'),{{type:'doughnut',data:{{labels:['Visitados','No Efectivos','Pendientes'],datasets:[{{data:[visitados,noEf,pend],backgroundColor:['#22c55e','#ef4444','#d1d5db'],borderWidth:2}}]}},options:opt}}));
  const pk=['placa','vuse','lucky','velo'], pl=['Placa','Vuse','Lucky','Velo'];
  _charts.push(new Chart(document.getElementById('ch-pop'),{{type:'bar',data:{{labels:pl,datasets:[{{label:'Encontrado',data:pk.map(k=>records.filter(r=>r.pop&&r.pop[k]&&r.pop[k].enc).length),backgroundColor:'#1A2E6A'}},{{label:'Óptimo',data:pk.map(k=>records.filter(r=>r.pop&&r.pop[k]&&r.pop[k].opt).length),backgroundColor:'#F5A123'}}]}},options:{{...opt,scales:{{y:{{beginAtZero:true}}}}}}}}));
  _charts.push(new Chart(document.getElementById('ch-act'),{{type:'bar',data:{{labels:['Cigarrera','Dispenser'],datasets:[{{label:'Sí',data:[cigSi,dispSi],backgroundColor:'#22c55e'}},{{label:'No',data:[records.filter(r=>r.cigarrera==='No').length,records.filter(r=>r.dispenser==='No').length],backgroundColor:'#ef4444'}}]}},options:{{...opt,scales:{{y:{{beginAtZero:true,stacked:true}},x:{{stacked:true}}}}}}}}));
  _charts.push(new Chart(document.getElementById('ch-stk'),{{type:'bar',data:{{labels:['1','2','3','4','5'],datasets:[{{label:'PDVs',data:[1,2,3,4,5].map(n=>stocks.filter(s=>s===n).length),backgroundColor:['#ef4444','#f97316','#eab308','#84cc16','#22c55e']}}]}},options:{{...opt,scales:{{y:{{beginAtZero:true}}}}}}}}));

  const GK=['fachada','placa','vuse','lucky','velo','cigarrera','dispenser','contrabando','panoramica'];
  const GL={{fachada:'Fachada',placa:'Placa',vuse:'Vuse',lucky:'Lucky',velo:'Velo',cigarrera:'Cigarrera',dispenser:'Dispenser',contrabando:'Contrabando',panoramica:'Panorámica'}};
  window._gRec=records; window._gL=GL;
  document.getElementById('gal-tabs').innerHTML=GK.map(k=>`<button class="gal-tab${{k==='fachada'?' active':''}}" onclick="switchGal('${{k}}',${{JSON.stringify(GL[k])}})">${{GL[k]}}</button>`).join('');
  switchGal('fachada','Fachada');
}}

window.switchGal=function(key,label){{
  document.querySelectorAll('.gal-tab').forEach(t=>t.classList.toggle('active',t.textContent===label));
  const grid=document.getElementById('gal-grid');
  const photos=(window._gRec||[]).filter(r=>r.fotos&&r.fotos[key]);
  grid.innerHTML=photos.length
    ? photos.map(r=>`<div class="gal-item"><img src="${{r.fotos[key]}}" loading="lazy"><div class="gal-lbl">${{r.nombre.substring(0,18)}}</div></div>`).join('')
    : '<p style="color:var(--muted);font-size:11px;grid-column:1/-1;padding:10px">Sin fotos para esta pregunta</p>';
}};

function toast(msg,dur=2600){{ const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove('show'),dur); }}

document.addEventListener('DOMContentLoaded',()=>{{
  initMap();
  document.getElementById('l-email').addEventListener('keydown',e=>{{ if(e.key==='Enter') document.getElementById('l-pass').focus(); }});
}});
</script>
</body>
</html>
''')

html = ''.join(html_parts)
out = r'C:/Users/clau_/Documents/ruta-bat-promotoria/index.html'
with open(out, 'w', encoding='utf-8') as f:
    f.write(html)
print(f"index.html written: {len(html):,} chars, {html.count(chr(10))} lines")
