// ═══════════════════════════════════════════════════════════════
// BAT Promotoría Bodegas — Google Apps Script Backend  (v2 · 2026)
// ───────────────────────────────────────────────────────────────
// NUEVO SHEET desde 0. Hojas que usa:
//   • "Padrón Rutas" → maestro de bodegas (lo lee la app al iniciar)
//   • "Visitas"      → se crea sola; aquí caen las visitas semana a semana
// ═══════════════════════════════════════════════════════════════

// ─── El script CREA y RECUERDA su propio Sheet y carpeta de Drive ───
// No hay que pegar IDs. En la primera llamada (o corriendo setup() una vez
// desde el editor) se crea todo solo: el Sheet "Promotoría Bodegas 2026 v2"
// con sus hojas "Padrón Rutas" y "Visitas", y la carpeta de fotos en Drive.
// Los IDs quedan guardados en las Propiedades del Script.
const SS_NAME        = 'Promotoría Bodegas 2026 v2';
const FOLDER_NAME    = 'Fotos Promotoría Bodegas 2026';
const PADRON_HEADERS = ['ID','Nombre PDV','Dirección','Distrito','Día','Lat','Lon','Cigarrera','Dispenser Velo','Com. Cigarrera'];

// ─── CATÁLOGO DE SKUs (debe coincidir con el de index.html) ───
const VELO_SKUS = [
  {id:'velo_mf4', n:'Velo Menta Fresca 4mg'},
  {id:'velo_uv4', n:'Velo Uva Morada 4mg'},
  {id:'velo_sd4', n:'Velo Sandía Fresca 4mg'},
  {id:'velo_mf6', n:'Velo Menta Fresca 6mg'},
  {id:'velo_uv6', n:'Velo Uva Morada 6mg'},
  {id:'velo_sd6', n:'Velo Sandía Fresca 6mg'},
  {id:'velo_mg8', n:'Velo Mango Tropical 8mg'},
  {id:'velo_ms8', n:'Velo Menta Suave 8mg'}
];
const VUSE_SKUS = [
  {id:'vuse_1k_tab', n:'Vuse New Aromatic Tobacco 1K'},
  {id:'vuse_1k_grp', n:'Vuse Grape Ice 1K'},
  {id:'vuse_1k_wat', n:'Vuse Watermelon Ice 1K'},
  {id:'vuse_1k_pep', n:'Vuse Peppermint Ice 1K'},
  {id:'vuse_1k_grn', n:'Vuse Green Apple 1K'},
  {id:'vuse_1k_bbl', n:'Vuse Berry Blend 1K'},
  {id:'vuse_1k_bwt', n:'Vuse Berry Watermelon 1K'},
  {id:'vuse_1k_str', n:'Vuse Strawberry Ice 1K'},
  {id:'vuse_1k_blu', n:'Vuse Blueberry Ice 1K'},
  {id:'vuse_3k_grp', n:'Vuse Grape Ice 3K'},
  {id:'vuse_3k_pep', n:'Vuse Peppermint Ice 3K'},
  {id:'vuse_3k_blu', n:'Vuse Blueberry Ice 3K'},
  {id:'vuse_3k_grn', n:'Vuse Green Apple 3K'},
  {id:'vuse_5k_grp', n:'Vuse Grape Ice 5K'},
  {id:'vuse_5k_grn', n:'Vuse Green Apple 5K'},
  {id:'vuse_5k_bwt', n:'Vuse Berry Watermelon 5K'},
  {id:'vuse_5k_pep', n:'Vuse Peppermint Ice 5K'},
  {id:'vuse_5k_blu', n:'Vuse Blueberry Ice 5K'}
];

// ─── ENCABEZADOS DE LA HOJA "Visitas" ───
function buildHeaders(){
  const h = [
    'ID Registro','Timestamp','Fecha','Hora','Auditor','Mes','Semana','Día',
    'Nombre PDV','Dirección','Distrito',
    '¿Local Abierto?','¿Permitió tomar info?','Visitado','Efectivo','Capacitado',
    'Comentarios Materiales',
    'Jalavista Placa (foto)','Jalavista Vuse (foto)','Jalavista Lucky Strike (foto)','Jalavista Velo (foto)',
    '¿Tiene Dispenser?','Comentarios Dispenser',
    'LS Eclipse ¿Quiebre?','LS Eclipse Motivo Quiebre',
    'Competencia','¿Contrabando?','Marcas Contrabando'
  ];
  // Velo: cantidad + vencimiento por SKU
  VELO_SKUS.forEach(s => { h.push(s.n + ' (cant)'); h.push(s.n + ' (venc)'); });
  // Vuse: solo cantidad por SKU
  VUSE_SKUS.forEach(s => { h.push(s.n + ' (cant)'); });
  // Fotos
  h.push('Foto Fachada','Foto Placa','Foto Jalavista Vuse','Foto Jalavista Lucky Strike',
         'Foto Jalavista Velo','Foto Dispenser','Foto Contrabando','Foto Panorámica');
  // Blob JSON (para que el dashboard reconstruya el registro completo)
  h.push('_DATA_JSON');
  return h;
}

// ═══════════════════════════════ API ═══════════════════════════════
function doGet(e){
  const action = (e && e.parameter && e.parameter.action) || '';
  try{
    if(action === 'getPOS')  return json({ok:true, data: getPadron()});
    if(action === 'getAll')  return json({ok:true, data: getAllVisitas()});
    return json({ok:true, msg:'API v2 activa'});
  }catch(err){ return json({ok:false, error:String(err)}); }
}

function doPost(e){
  try{
    const d = JSON.parse(e.postData.contents);
    const fotos = processVisit(d);
    return json({ok:true, fotos: fotos});
  }catch(err){
    return json({ok:false, error:String(err && err.message || err)});
  }
}

function json(obj){
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ═══════════════ BOOTSTRAP: crea/recuerda Sheet y carpeta ═══════════
function props_(){ return PropertiesService.getScriptProperties(); }

// Devuelve el Spreadsheet; lo crea (con sus hojas) la primera vez.
function getSS_(){
  const p = props_();
  const id = p.getProperty('SHEET_ID');
  if(id){ try{ return SpreadsheetApp.openById(id); }catch(e){ /* borrado → recrear */ } }
  const ss = SpreadsheetApp.create(SS_NAME);
  p.setProperty('SHEET_ID', ss.getId());
  ensurePadron_(ss);
  ensureVisitas_(ss);
  // borra la hoja por defecto vacía ("Sheet1"/"Hoja 1")
  ss.getSheets().forEach(sh=>{
    if(/^(Sheet1|Hoja ?1)$/i.test(sh.getName()) && ss.getSheets().length>1){
      try{ ss.deleteSheet(sh); }catch(e){}
    }
  });
  return ss;
}

// Devuelve la carpeta de fotos; la crea/reutiliza la primera vez.
function getFolder_(){
  const p = props_();
  const id = p.getProperty('FOLDER_ID');
  if(id){ try{ return DriveApp.getFolderById(id); }catch(e){} }
  const it = DriveApp.getFoldersByName(FOLDER_NAME);
  const folder = it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
  p.setProperty('FOLDER_ID', folder.getId());
  return folder;
}

// Asegura la hoja "Padrón Rutas" con sus encabezados.
function ensurePadron_(ss){
  let sheet = ss.getSheetByName('Padrón Rutas');
  if(!sheet){
    sheet = ss.insertSheet('Padrón Rutas', 0);
    const hdr = sheet.getRange(1,1,1,PADRON_HEADERS.length);
    hdr.setValues([PADRON_HEADERS]);
    hdr.setBackground('#1A2E6A').setFontColor('#ffffff').setFontWeight('bold').setWrap(true);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// Asegura la hoja "Visitas" con sus encabezados.
function ensureVisitas_(ss){
  let sheet = ss.getSheetByName('Visitas');
  if(!sheet){
    const HEADERS = buildHeaders();
    sheet = ss.insertSheet('Visitas');
    const hdr = sheet.getRange(1,1,1,HEADERS.length);
    hdr.setValues([HEADERS]);
    hdr.setBackground('#1A2E6A').setFontColor('#ffffff').setFontWeight('bold')
       .setFontSize(9).setWrap(true);
    sheet.setRowHeight(1, 54);
    sheet.setFrozenRows(1);
    sheet.setFrozenColumns(9);
  }
  return sheet;
}

// ▶ Corre esto UNA vez desde el editor para crear todo, autorizar permisos
//   y ver en el Log (Ver → Registro) la URL del Sheet y de la carpeta.
function setup(){
  const ss = getSS_();
  const folder = getFolder_();
  Logger.log('✅ Sheet:   ' + ss.getUrl());
  Logger.log('✅ Carpeta: ' + folder.getUrl());
  return {sheet: ss.getUrl(), folder: folder.getUrl()};
}

// ═══════════════════════════ PADRÓN ════════════════════════════════
// Lee la hoja "Padrón Rutas" y la agrupa por día para la app.
// Columnas esperadas (fila 1 = encabezados):
//   ID | Nombre PDV | Dirección | Distrito | Día | Lat | Lon | Cigarrera | Dispenser Velo | Com. Cigarrera
function getPadron(){
  const ss = getSS_();
  const sheet = ensurePadron_(ss);
  const rows = sheet.getDataRange().getValues();
  if(rows.length < 2) return {};
  const H = rows[0].map(x => String(x).trim().toLowerCase());
  const col = name => H.findIndex(h => h.indexOf(name) === 0 || h === name);
  const cId=col('id'), cNom=col('nombre'), cDir=col('direcc'), cDis=col('distrito'),
        cDia=col('día')>=0?col('día'):col('dia'), cLat=col('lat'), cLon=col('lon'),
        cCig=col('cigarrera'), cDsp=col('dispenser'), cCom=col('com');
  const norm = s => String(s||'').trim().toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const data = {LUNES:[],MARTES:[],MIERCOLES:[],JUEVES:[],VIERNES:[]};
  for(let i=1;i<rows.length;i++){
    const r = rows[i];
    if(!r[cNom]) continue;
    let dia = norm(r[cDia]);
    ['LUNES','MARTES','MIERCOLES','JUEVES','VIERNES'].forEach(base=>{ if(dia.indexOf(base.substring(0,3))===0) dia=base; });
    if(!data[dia]) continue;
    data[dia].push({
      id: String(r[cId]||('pos_'+dia+'_'+i)),
      nombre: String(r[cNom]),
      direccion: String(r[cDir]||''),
      distrito: String(r[cDis]||''),
      lat: parseFloat(r[cLat])||-12.08,
      lon: parseFloat(r[cLon])||-77.02,
      cigarreraFijo: cCig>=0 ? String(r[cCig]||'') : '',
      dispenserVeloFijo: cDsp>=0 ? String(r[cDsp]||'') : '',
      comCigarreraFijo: cCom>=0 ? String(r[cCom]||'') : ''
    });
  }
  return data;
}

// ═══════════════════════════ VISITAS ═══════════════════════════════
function getAllVisitas(){
  const ss = getSS_();
  const sheet = ss.getSheetByName('Visitas');
  if(!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  if(rows.length < 2) return [];
  const jsonCol = rows[0].length - 1; // última columna = _DATA_JSON
  const out = [];
  for(let i=1;i<rows.length;i++){
    const raw = rows[i][jsonCol];
    if(!raw) continue;
    try{ out.push(JSON.parse(raw)); }catch(e){}
  }
  return out;
}

// Normaliza el stock de un SKU a un array de lotes {c,v}.
// Acepta el formato nuevo ([{c,v},...]) y el viejo ({c,v}).
function normLots_(x){
  if(!x) return [];
  if(Array.isArray(x)) return x;
  return [x];
}

function processVisit(d){
  const ss     = getSS_();
  const sheet  = ensureVisitas_(ss);
  const folder = getFolder_();
  const sub    = getOrCreateSubfolder(folder, d.fecha || 'sin-fecha');

  const fotoKeys = ['fachada','placa','vuse','lucky','velo','dispenser','contrabando','panoramica'];
  const fotoUrls = {};
  fotoKeys.forEach(k=>{
    if(d.fotos && d.fotos[k] && String(d.fotos[k]).startsWith('data:')){
      try{ fotoUrls[k] = saveBase64Image(d.fotos[k], `${d.id}_${d.semana}_${k}`, sub); }
      catch(e){ fotoUrls[k] = 'Error'; }
    } else if(d.fotos && d.fotos[k]) {
      fotoUrls[k] = d.fotos[k]; // ya es URL
    }
  });
  // Reemplazar base64 por URLs en el JSON que se guarda
  d.fotos = fotoUrls;

  const yn = v => v==='Si'||v==='SI'||v===true ? 'Sí' : (v==='No'||v==='NO' ? 'No' : '');
  const st = d.veloStock || {};
  const vu = d.vuseStock || {};

  const row = [
    d.id||'', d.timestamp||new Date().toISOString(), d.fecha||'', d.hora||'',
    d.auditor||'', d.mes||'', d.semana||'', d.dia||'',
    d.nombre||'', d.direccion||'', d.distrito||'',
    yn(d.abierto), yn(d.permite),
    d.abierto==='Si'?'Sí':'No',                                  // Visitado
    (d.abierto==='Si'&&d.permite==='Si')?'Sí':'No',              // Efectivo
    yn(d.capacitado),                                            // Capacitado
    d.obsMateriales||'',
    fotoUrls.placa?'Sí':'No', fotoUrls.vuse?'Sí':'No',
    fotoUrls.lucky?'Sí':'No', fotoUrls.velo?'Sí':'No',
    yn(d.dispenser), d.obsDispenser||'',
    yn(d.lsQuiebre), d.lsMotivo||'',
    d.competencia||'', yn(d.contrabando), d.marcasContrabando||''
  ];
  VELO_SKUS.forEach(s=>{
    const lots = normLots_(st[s.id]);            // array de {c,v} (soporta lotes o formato viejo)
    let has = false, tot = 0;
    lots.forEach(l=>{ if(l && (l.c===0 || l.c)){ has = true; tot += (Number(l.c)||0); } });
    const detail = lots.filter(l=> l && (l.c===0 || l.c || l.v))
      .map(l=> ((l.c===0||l.c) ? l.c+'u' : '') + (l.v ? '→'+l.v : '')).join(' · ');
    row.push(has ? tot : '');                     // columna (cant) = total de unidades
    row.push(detail);                             // columna (venc) = desglose por lote
  });
  VUSE_SKUS.forEach(s=>{
    const q = vu[s.id];
    row.push(q===0||q ? q : '');
  });
  row.push(fotoUrls.fachada||'', fotoUrls.placa||'', fotoUrls.vuse||'',
           fotoUrls.lucky||'', fotoUrls.velo||'', fotoUrls.dispenser||'',
           fotoUrls.contrabando||'', fotoUrls.panoramica||'');
  row.push(JSON.stringify(d));

  sheet.appendRow(row);
  const lastRow = sheet.getLastRow();
  const abierto = d.abierto==='Si';
  sheet.getRange(lastRow, 1, 1, row.length).setBackground(abierto ? '#f0fdf4' : '#fef2f2');

  return fotoUrls;
}

function getOrCreateSubfolder(parent, name){
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function saveBase64Image(b64, filename, folder){
  const parts = b64.split(',');
  const mime  = (parts[0].match(/:(.*?);/)||[])[1] || 'image/jpeg';
  const ext   = mime==='image/png' ? 'png' : 'jpg';
  const blob  = Utilities.newBlob(Utilities.base64Decode(parts[1]), mime, `${filename}.${ext}`);
  const file  = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}
