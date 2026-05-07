// ═══════════════════════════════════════════════════════════════
// BAT Promotoría Bodegas — Google Apps Script Backend
// Auto-setup: Sheet + Drive Folder creados automáticamente
// ═══════════════════════════════════════════════════════════════

const SHEET_NAME   = 'Visitas';
const SPREADSHEET_NAME = 'BAT Promotoría Bodegas — Auditoría';
const FOLDER_NAME  = 'BAT Promotoría Bodegas — Fotos';

const HEADERS = [
  'ID POS', 'Timestamp', 'Fecha', 'Hora', 'Auditor', 'Día',
  'Nombre PDV', 'Dirección', 'Distrito',
  '¿Local Abierto?',
  'Staff que Atiende',
  'Placa – Encontrada', 'Placa – Estado Óptimo', 'Placa – Requiere Reemplazo',
  'Jalavista Vuse – Encontrada', 'Jalavista Vuse – Estado Óptimo', 'Jalavista Vuse – Requiere Reemplazo',
  'Jalavista Lucky Strike – Encontrada', 'Jalavista Lucky Strike – Estado Óptimo', 'Jalavista Lucky Strike – Requiere Reemplazo',
  'Jalavista Velo – Encontrada', 'Jalavista Velo – Estado Óptimo', 'Jalavista Velo – Requiere Reemplazo',
  'Foto Placa POP', 'Comentarios Placa',
  'Foto Jalavista Vuse', 'Comentarios Jalavista Vuse',
  'Foto Jalavista Lucky Strike', 'Comentarios Jalavista Lucky Strike',
  'Foto Jalavista Velo', 'Comentarios Jalavista Velo',
  '¿Tiene Cigarrera?', 'Foto Cigarrera',
  'Comunicación Cigarrera Actualizada', '¿Cliente Permite el Cambio?',
  '¿Tiene Dispenser?', 'Foto Dispenser', 'Comentarios Dispenser',
  'Stock de Productos (1-5)', 'SKUs Sin Disponibilidad',
  '¿Productos Contrabando/Falsificados?', 'Marcas de Contrabando', 'Foto Contrabando',
  'Foto Fachada', 'Foto Panorámica Interior'
];

// ───────────────────────────────────────────────────────────────
// AUTO-SETUP: obtiene o crea el Sheet y la carpeta Drive
// Los IDs se persisten en Script Properties para reutilizarlos
// ───────────────────────────────────────────────────────────────

function getScriptProps() {
  return PropertiesService.getScriptProperties();
}

function getOrCreateSpreadsheet() {
  const props = getScriptProps();
  let ssId = props.getProperty('SHEET_ID');

  if (ssId) {
    try {
      return SpreadsheetApp.openById(ssId);
    } catch(e) {
      // El sheet fue eliminado; crear uno nuevo
      props.deleteProperty('SHEET_ID');
    }
  }

  // Crear spreadsheet nuevo
  const ss = SpreadsheetApp.create(SPREADSHEET_NAME);
  props.setProperty('SHEET_ID', ss.getId());

  // Mover a la carpeta de fotos si ya existe
  const folder = getOrCreateDriveFolder();
  DriveApp.getFileById(ss.getId()).moveTo(folder);

  Logger.log('✅ Spreadsheet creado: ' + ss.getUrl());
  return ss;
}

function getOrCreateDriveFolder() {
  const props = getScriptProps();
  let folderId = props.getProperty('FOLDER_ID');

  if (folderId) {
    try {
      return DriveApp.getFolderById(folderId);
    } catch(e) {
      props.deleteProperty('FOLDER_ID');
    }
  }

  // Buscar si ya existe una carpeta con ese nombre en Mi Drive
  const existing = DriveApp.getFoldersByName(FOLDER_NAME);
  if (existing.hasNext()) {
    const folder = existing.next();
    props.setProperty('FOLDER_ID', folder.getId());
    Logger.log('📁 Carpeta existente reutilizada: ' + folder.getName());
    return folder;
  }

  // Crear carpeta nueva en la raíz de Mi Drive
  const folder = DriveApp.createFolder(FOLDER_NAME);
  props.setProperty('FOLDER_ID', folder.getId());
  Logger.log('✅ Carpeta creada: ' + folder.getName());
  return folder;
}

function getOrCreateSheet() {
  const ss = getOrCreateSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);

    // Eliminar Sheet1 vacía si existe
    const defaultSheet = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1');
    if (defaultSheet && ss.getSheets().length > 1) {
      ss.deleteSheet(defaultSheet);
    }

    // Encabezados
    const hdr = sheet.getRange(1, 1, 1, HEADERS.length);
    hdr.setValues([HEADERS]);
    hdr.setBackground('#1C2B4A')
       .setFontColor('#ffffff')
       .setFontWeight('bold')
       .setFontSize(10)
       .setWrap(true);
    sheet.setRowHeight(1, 48);
    sheet.setFrozenRows(1);

    // Anchos de columna
    const widths = [
      90, 170, 80, 65, 180, 80, 240, 220, 120,  // meta
      90, 180,                                    // abierto, staff
      70, 70, 90,  70, 70, 90,  70, 70, 90,  70, 70, 90,  // POP 4×3
      160, 200,   160, 200,   160, 200,   160, 200,        // fotos + comentarios POP
      90, 160, 200, 150,                          // cigarrera
      90, 160, 200,                               // dispenser
      80, 200,                                    // stock
      90, 200, 160,                               // contrabando
      160, 160                                    // fachada + panorámica
    ];
    widths.forEach((w, i) => sheet.setColumnWidth(i + 1, w));

    Logger.log('✅ Hoja "' + SHEET_NAME + '" creada con ' + HEADERS.length + ' columnas.');
  }

  return sheet;
}

// ───────────────────────────────────────────────────────────────
// FUNCIÓN DE SETUP MANUAL (ejecutar 1 vez desde el editor)
// Crea el Sheet + carpeta y muestra los IDs y la URL del Sheet
// ───────────────────────────────────────────────────────────────

function setup() {
  const sheet  = getOrCreateSheet();
  const folder = getOrCreateDriveFolder();
  const ss     = sheet.getParent();

  const msg = [
    '════════════════════════════════',
    '  BAT Promotoría — Setup OK ✅  ',
    '════════════════════════════════',
    '',
    '📊 Spreadsheet:',
    '   ' + ss.getUrl(),
    '',
    '📁 Carpeta Drive:',
    '   https://drive.google.com/drive/folders/' + folder.getId(),
    '',
    'No necesitas configurar nada más.',
    'Implementa esta app como Web App y listo.',
  ].join('\n');

  Logger.log(msg);
}

// ───────────────────────────────────────────────────────────────
// WEB APP ENDPOINTS
// ───────────────────────────────────────────────────────────────

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    processVisit(data);
    return jsonOut({ok: true});
  } catch(err) {
    return jsonOut({ok: false, error: err.message});
  }
}

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || '';

  if (action === 'getAll') {
    try {
      const sheet = getOrCreateSheet();
      const rows  = sheet.getDataRange().getValues();
      if (rows.length < 2) return jsonOut({ok: true, data: []});

      const headers = rows[0];
      const data = rows.slice(1).map(row => {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = row[i]; });
        return {
          id:          obj['ID POS']           || '',
          fecha:       obj['Fecha']             || '',
          hora:        obj['Hora']              || '',
          auditor:     obj['Auditor']           || '',
          dia:         obj['Día']               || '',
          nombre:      obj['Nombre PDV']        || '',
          direccion:   obj['Dirección']         || '',
          distrito:    obj['Distrito']          || '',
          estado:      obj['¿Local Abierto?'] === 'Sí' ? 'visitado' : 'nogo',
          abierto:     obj['¿Local Abierto?'] === 'Sí' ? 'Si' : 'No',
          staff:       obj['Staff que Atiende'] || '',
          cigarrera:   obj['¿Tiene Cigarrera?'] === 'Sí' ? 'Si' : 'No',
          dispenser:   obj['¿Tiene Dispenser?'] === 'Sí' ? 'Si' : 'No',
          stock:       obj['Stock de Productos (1-5)'] || null,
          contrabando: obj['¿Productos Contrabando/Falsificados?'] === 'Sí' ? 'Si' : 'No',
          pop: {
            placa: { enc: obj['Placa – Encontrada']==='Sí',                      opt: obj['Placa – Estado Óptimo']==='Sí',                      rep: obj['Placa – Requiere Reemplazo']==='Sí' },
            vuse:  { enc: obj['Jalavista Vuse – Encontrada']==='Sí',             opt: obj['Jalavista Vuse – Estado Óptimo']==='Sí',             rep: obj['Jalavista Vuse – Requiere Reemplazo']==='Sí' },
            lucky: { enc: obj['Jalavista Lucky Strike – Encontrada']==='Sí',     opt: obj['Jalavista Lucky Strike – Estado Óptimo']==='Sí',     rep: obj['Jalavista Lucky Strike – Requiere Reemplazo']==='Sí' },
            velo:  { enc: obj['Jalavista Velo – Encontrada']==='Sí',             opt: obj['Jalavista Velo – Estado Óptimo']==='Sí',             rep: obj['Jalavista Velo – Requiere Reemplazo']==='Sí' }
          },
          fotos: {
            fachada:     obj['Foto Fachada']               || null,
            placa:       obj['Foto Placa POP']             || null,
            vuse:        obj['Foto Jalavista Vuse']        || null,
            lucky:       obj['Foto Jalavista Lucky Strike']|| null,
            velo:        obj['Foto Jalavista Velo']        || null,
            cigarrera:   obj['Foto Cigarrera']             || null,
            dispenser:   obj['Foto Dispenser']             || null,
            contrabando: obj['Foto Contrabando']           || null,
            panoramica:  obj['Foto Panorámica Interior']   || null
          }
        };
      });
      return jsonOut({ok: true, data: data});
    } catch(err) {
      return jsonOut({ok: false, error: err.message});
    }
  }

  // Health-check
  return jsonOut({ok: true, msg: 'API activa — BAT Promotoría Bodegas'});
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ───────────────────────────────────────────────────────────────
// PROCESAMIENTO DE VISITA
// ───────────────────────────────────────────────────────────────

function processVisit(d) {
  const sheet  = getOrCreateSheet();
  const folder = getOrCreateDriveFolder();
  const sub    = getOrCreateSubfolder(folder, d.fecha || 'sin-fecha');

  function foto(key) {
    if (!d.fotos || !d.fotos[key]) return '';
    try { return saveBase64Image(d.fotos[key], d.id + '_' + key, sub); }
    catch(e) { return 'Error al subir'; }
  }

  function pop(mat, field) {
    return (d.pop && d.pop[mat] && d.pop[mat][field]) ? 'Sí' : 'No';
  }

  function yn(val) { return val === 'Si' ? 'Sí' : (val === 'No' ? 'No' : ''); }

  const row = [
    d.id         || '',
    d.timestamp  || new Date().toISOString(),
    d.fecha      || '',
    d.hora       || '',
    d.auditor    || '',
    d.dia        || '',
    d.nombre     || '',
    d.direccion  || '',
    d.distrito   || '',
    yn(d.abierto),
    d.staff      || '',
    // POP tabla (4 materiales × 3 campos)
    pop('placa','enc'), pop('placa','opt'), pop('placa','rep'),
    pop('vuse','enc'),  pop('vuse','opt'),  pop('vuse','rep'),
    pop('lucky','enc'), pop('lucky','opt'), pop('lucky','rep'),
    pop('velo','enc'),  pop('velo','opt'),  pop('velo','rep'),
    // Fotos POP + comentarios
    foto('placa'),  d.obsPlaca      || '',
    foto('vuse'),   d.obsVuse       || '',
    foto('lucky'),  d.obsLucky      || '',
    foto('velo'),   d.obsVelo       || '',
    // Cigarrera
    yn(d.cigarrera), foto('cigarrera'),
    d.cigCom || '', d.permiteCambio || '',
    // Dispenser
    yn(d.dispenser), foto('dispenser'), d.obsDispenser || '',
    // Stock
    d.stock || '', d.skusFaltantes || '',
    // Contrabando
    yn(d.contrabando), d.marcasContrabando || '', foto('contrabando'),
    // Fachada + panorámica
    foto('fachada'), foto('panoramica')
  ];

  sheet.appendRow(row);

  // Colorear fila según si el local estaba abierto
  const lastRow   = sheet.getLastRow();
  const isAbierto = d.abierto === 'Si';
  sheet.getRange(lastRow, 1, 1, HEADERS.length)
       .setBackground(isAbierto ? '#f0fdf4' : '#fef2f2');
  sheet.getRange(lastRow, 10)
       .setFontColor(isAbierto ? '#15803d' : '#b91c1c')
       .setFontWeight('bold');
}

// ───────────────────────────────────────────────────────────────
// UTILIDADES
// ───────────────────────────────────────────────────────────────

function getOrCreateSubfolder(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function saveBase64Image(b64, filename, folder) {
  const parts = b64.split(',');
  const mime  = (parts[0].match(/:(.*?);/) || [])[1] || 'image/jpeg';
  const ext   = mime === 'image/png' ? 'png' : 'jpg';
  const blob  = Utilities.newBlob(
    Utilities.base64Decode(parts[1] || parts[0]),
    mime,
    filename + '.' + ext
  );
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}
