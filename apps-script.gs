// ═══════════════════════════════════════════════════════════════
// BAT Promotoría Bodegas — Google Apps Script Backend
// Auto-setup: Sheet + Drive Folder creados automáticamente
// ═══════════════════════════════════════════════════════════════

const SHEET_NAME      = 'Visitas';
const PADRON_SHEET_NAME = 'Padrón Rutas';
const SPREADSHEET_NAME  = 'BAT Promotoría Bodegas — Auditoría';
const FOLDER_NAME       = 'BAT Promotoría Bodegas — Fotos';

const PADRON_HEADERS = ['ID', 'Nombre PDV', 'Dirección', 'Distrito', 'Latitud', 'Longitud', 'Día de Visita', 'Activo'];

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
// PADRÓN RUTAS — gestión dinámica de POS desde el Sheet
// ───────────────────────────────────────────────────────────────

function getOrCreatePadronSheet() {
  const ss = getOrCreateSpreadsheet();
  let sheet = ss.getSheetByName(PADRON_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(PADRON_SHEET_NAME, 1); // segunda pestaña

    // Encabezados
    const hdr = sheet.getRange(1, 1, 1, PADRON_HEADERS.length);
    hdr.setValues([PADRON_HEADERS]);
    hdr.setBackground('#1C2B4A')
       .setFontColor('#ffffff')
       .setFontWeight('bold')
       .setFontSize(10)
       .setWrap(false);
    sheet.setFrozenRows(1);

    // Anchos de columna
    sheet.setColumnWidth(1, 115);  // ID
    sheet.setColumnWidth(2, 290);  // Nombre PDV
    sheet.setColumnWidth(3, 310);  // Dirección
    sheet.setColumnWidth(4, 145);  // Distrito
    sheet.setColumnWidth(5, 105);  // Latitud
    sheet.setColumnWidth(6, 105);  // Longitud
    sheet.setColumnWidth(7, 115);  // Día de Visita
    sheet.setColumnWidth(8,  65);  // Activo

    // Poblar con los 90 POS iniciales
    populatePadronIfEmpty(sheet);

    Logger.log('✅ Hoja "' + PADRON_SHEET_NAME + '" creada y pre-poblada con los 90 POS.');
  }

  return sheet;
}

function populatePadronIfEmpty(sheet) {
  if (sheet.getLastRow() > 1) {
    Logger.log('ℹ️ Padrón Rutas ya tiene datos, no se sobreescribe.');
    return;
  }

  // Formato: [ID, Nombre PDV, Dirección, Distrito, Latitud, Longitud, Día, Activo]
  const defaults = [
    // ── LUNES (15) ──────────────────────────────────────────────────────────
    ['pos_LUN_01','AQUINO PEREZ MARILU','AV LIMA 478','SAN MIGUEL',-12.0893726939697,-77.0787742361426,'LUNES',true],
    ['pos_LUN_02','COMERCIALIZADORA AYKILU SOCIEDAD ANONIMA CERRADA','CALLE JOSE OLAYA 163','SAN MIGUEL',-12.0798195818304,-77.1041868254542,'LUNES',true],
    ['pos_LUN_03','CONSORCIO AQUINO SAC','PROLONGACION AYACUCHO 277','SAN MIGUEL',-12.0852395780384,-77.075503282249,'LUNES',true],
    ['pos_LUN_04','CONSORCIO BRISOL S.A.C.','AV BRIGIDA SILVA 240','SAN MIGUEL',-12.081702429876174,-77.08856530487537,'LUNES',true],
    ['pos_LUN_05','GRIFO JUAN PABLO II EIRL','AV LA MARINA 3805 LA PERLA ALTA','LA PERLA',-12.0702543256972,-77.1100628748536,'LUNES',true],
    ['pos_LUN_06','LIKOW S.A.C.','JR JOSE GALVEZ 633','MAGDALENA DEL MAR',-12.0901116452254,-77.0740998163819,'LUNES',true],
    ['pos_LUN_07','MARTEL JIMENEZ JORGE ALBERTO','CL MARIANA ECHEVARRIA 289','SAN MIGUEL',-12.084249,-77.084931,'LUNES',true],
    ['pos_LUN_08','NEGOCIACIONES CAZU S.A.C.','AV DE LOS PATRIOTAS 532 SAN MIGUEL','SAN MIGUEL',-12.0756902526649,-77.1004796773195,'LUNES',true],
    ['pos_LUN_09','OBRADOVICH RIOFRIO HELEN SOLANGE','AV LA PAZ 1195','LA PERLA',-12.0721474046999,-77.1242219209671,'LUNES',true],
    ['pos_LUN_10','PETROCENTRO YULIA S.A.C.','AV LA MARINA 2789 URB MARANGA','SAN MIGUEL',-12.0777026323877,-77.0932846516371,'LUNES',true],
    ['pos_LUN_11','TENORIO NUÑEZ JOSE EDWIN','MARISCAL CASTILLA MZ F1 LT 1 LA PERLA ALTA CALLAO','LA PERLA',-12.0697579394154,-77.1164233982563,'LUNES',true],
    ['pos_LUN_12','EMPRESA COMERCIALIZADORA Y DE SERVICIOS JULIA SAC','AV UNIVERSITARIA 1789 CERCADO DE LIMA','LIMA',-12.0680845141581,-77.0775223150849,'LUNES',true],
    ['pos_LUN_13','OPERACIONES Y SERVICIOS GENERALES','AV CAMINOS DEL INCA MZ N LT 19 URB SAN JUAN BAUTISTA','CHORRILLOS',-12.1041926366876,-77.0640502497554,'LUNES',true],
    ['pos_LUN_14','ESTACION DE SERVICIOS LA MARINA S.A.C.','AV LA MARINA NRO 405 URB DOIG LOSSIO LA PERLA CALLAO','LA PERLA',-12.0672507484182,-77.1154423803091,'LUNES',true],
    ['pos_LUN_15','QUISPE QUINTANA MELCHORA','AV HIPOLITO UNANUE 114 URB COLONIAL','CALLAO',-12.0521864532339,-77.0929443463683,'LUNES',true],
    // ── MARTES (17) ─────────────────────────────────────────────────────────
    ['pos_MAR_01','COMERCIAL AMECAR S.A.C','JR INCA 640 SURQUILLO','SURQUILLO',-12.1146445,-77.0209908,'MARTES',true],
    ['pos_MAR_02','MARLO NUNEZ SEGUNDO SIMEON','AV PETIT THOUARS 4536','MIRAFLORES',-12.1079,-77.0298,'MARTES',true],
    ['pos_MAR_03','MINI MARKET DAYLU S.A.C.','CALLE FRANCISCO MORENO 1099 SURQUILLO','SURQUILLO',-12.1104123355005,-77.0246656984091,'MARTES',true],
    ['pos_MAR_04','INVERSIONES & NEGOCIACIONES DAMI S.A.C.','JR CENTENARIO 1198','BREÑA',-12.0595224723205,-77.0566081255674,'MARTES',true],
    ['pos_MAR_05','TIENDAS AQUINOMAS E.I.R.L.','AV JOSE GALVEZ NRO 501','LA VICTORIA',-12.064963,-77.032057,'MARTES',true],
    ['pos_MAR_06','YARANGA ASCA KATHERINE MAURA','JR MARISCAL DE LAS HERAS 264','LINCE',-12.0863247443473,-77.033405341208,'MARTES',true],
    ['pos_MAR_07','YARANGA ASCA VALERY DANITZA','CALLE MARISCAL LAS HERAS NRO 268','LINCE',-12.086339,-77.0334314927459,'MARTES',true],
    ['pos_MAR_08','BODEGA ALCAS E. I. R. L','JR MARISCAL MILLER 1098','JESUS MARIA',-12.0758633611925,-77.0383231714368,'MARTES',true],
    ['pos_MAR_09','BODEGA ALE & JOAO E.I.R.L','JR PUMACAHUA 2400 LINCE','LINCE',-12.085902808604455,-77.04314108937979,'MARTES',true],
    ['pos_MAR_10','HOME MARKET PERUMAS E.I.R.L','JR BRIGADIER MATEO PUMACAHUA 1698','JESUS MARIA',-12.0789822462323,-77.043405957520,'MARTES',true],
    ['pos_MAR_11','INVERSIONES MARK LIZ S. A. C','AV. ARENALES 1913','LINCE',-12.083930487870504,-77.03560810536146,'MARTES',true],
    ['pos_MAR_12','INVERSIONES Y SERVICIOS ROMY E.I.R.L','CA GENERAL TRINIDAD MORAN 1123','SAN ISIDRO',-12.0903852,-77.0425894,'MARTES',true],
    ['pos_MAR_13','MARKET JUANITO S.A.C','AV HORACIO URTEAGA 1519','JESUS MARIA',-12.0765561220401,-77.05042161047461,'MARTES',true],
    ['pos_MAR_14','NOVO MARKET VF SOCIEDAD ANONIMA CERRADA','AV JULIO C TELLO 301 LINCE','LINCE',-12.08618606623946,-77.0371389761567,'MARTES',true],
    ['pos_MAR_15','ROQUE GUTIERREZ EFRAIN','AV VENEZUELA 703','BREÑA',-12.054766,-77.043892,'MARTES',true],
    ['pos_MAR_16','QUINTANA CARBAJAL DIEGO ENRIQUE','AV SERGIO BERNALES 537','SURQUILLO',-12.1173704375064,-77.0139395445585,'MARTES',true],
    ['pos_MAR_17','TINTOS INDELEBLES E.I.R.L.','AV REPUBLICA DE PANAMA 5454','SURQUILLO',-12.1183463143464,-77.0184526965022,'MARTES',true],
    // ── MIÉRCOLES (22) ──────────────────────────────────────────────────────
    ['pos_MIE_01','ARAKAKI S.A.','JR ENRIQUE PALACIOS 915','MIRAFLORES',-12.1172075178475,-77.0384304597974,'MIERCOLES',true],
    ['pos_MIE_02','BONCALCORP S.A.C.','AV DEFENSORES DEL MORRO 1499','CHORRILLOS',-12.176290338229045,-77.01680950820446,'MIERCOLES',true],
    ['pos_MIE_03','BRISAS MARKET E.I.R.L.','ALAMEDA EL TRIANGULO MZ E LT 3 URB LAS BRISAS DE VILLA','CHORRILLOS',-12.219034158098,-76.9939218834043,'MIERCOLES',true],
    ['pos_MIE_04','CHRISMARKET EIRL','AV MEXICO 372','CHORRILLOS',-12.17453892459325,-77.02195029705763,'MIERCOLES',true],
    ['pos_MIE_05','CORPORACION DIAS BUENOS SAC','AV BERLIN 390','MIRAFLORES',-12.120397381446,-77.0335736498237,'MIERCOLES',true],
    ['pos_MIE_06','CUBAS MARLO INDALESIO','AV ARICA 406','MIRAFLORES',-12.1157087834429,-77.0357368513942,'MIERCOLES',true],
    ['pos_MIE_07','GOMEZ CAJAS SONIA','JR JUAN FANNING 401','MIRAFLORES',-12.129014182266204,-77.03127332031727,'MIERCOLES',true],
    ['pos_MIE_08','NEGOCIACIONES JIREH & MAJAZ EIRL','CALLE BERLIN 375','MIRAFLORES',-12.120866466176302,-77.03335035592316,'MIERCOLES',true],
    ['pos_MIE_09','PIZARRO BARRIENTOS WALTER','AV ENRIQUE PALACIOS 1188','MIRAFLORES',-12.1170160789261,-77.0409279316664,'MIERCOLES',true],
    ['pos_MIE_10','RB CORPORACION RAMIREZ SAC','AV REPUBLICA DE ARGENTINA 3093','MIRAFLORES',-12.115505214538,-77.0450012013316,'MIERCOLES',true],
    ['pos_MIE_11','VEGA VEGA MARIA LUZ','ABRAHAM BALLENA 195','CHORRILLOS',-12.1670998762297,-77.0206182450056,'MIERCOLES',true],
    ['pos_MIE_12','ARROYO COCHACHI MIGUEL ANGEL','AV LA PAZ 472','MIRAFLORES',-12.1221239107626,-77.0269033312798,'MIERCOLES',true],
    ['pos_MIE_13','DYUSPA MAKIN S.A.C.','CALLE PERCY PHILIPS CUBA 328','MIRAFLORES',-12.126265962111276,-77.00750358402729,'MIERCOLES',true],
    ['pos_MIE_14','DYUSPA MAKIN S.A.C.','CALLE SAN FERNANDO 405 URB LEURO MIRAFLORES','MIRAFLORES',-12.1324782629215,-77.0266069471836,'MIERCOLES',true],
    ['pos_MIE_15','HERRERA IRIGOIN CARLOS ALBERTO','CALLE COMANDANTE ARISTIDES ALJOVIN NRO 137','MIRAFLORES',-12.130938640655748,-77.02952485531569,'MIERCOLES',true],
    ['pos_MIE_16','IRRIZABAL HUAMAN DIANA FLOR','AV LA PAZ NRO 1101 URB ALMENDARIZ','MIRAFLORES',-12.129109897438614,-77.02638264745474,'MIERCOLES',true],
    ['pos_MIE_17','LAGOS SOTO MARISOL','JR PEA RIVERA MZ A LOTE 15','SANTIAGO DE SURCO',-12.1422684396729,-77.0110977441072,'MIERCOLES',true],
    ['pos_MIE_18','MINIMARKET-LICORERIA VICTORIA S.R.L.','AV ALMIRANTE MIGUEL GRAU 384','BARRANCO',-12.14781860335268,-77.02122777700424,'MIERCOLES',true],
    ['pos_MIE_19','NAVEROS VARGAS MARISOL','AV GRAU 202A','BARRANCO',-12.1503427374274,-77.0204351842403,'MIERCOLES',true],
    ['pos_MIE_20','ORCAP SAC','AV BALTA 281A','BARRANCO',-12.143073454936896,-77.01623182743788,'MIERCOLES',true],
    ['pos_MIE_21','RODRIGO SOTO BENJAMIN','AVENIDA GRAU 1175','BARRANCO',-12.1397935,-77.022401,'MIERCOLES',true],
    ['pos_MIE_22','SIRIUS IMPORT S.A.C.','A V ALFREDO BENAVIDES 540','MIRAFLORES',-12.12511375976216,-77.02751185745002,'MIERCOLES',true],
    // ── JUEVES (24) ─────────────────────────────────────────────────────────
    ['pos_JUE_01','BELISARIO PACOMPIA FAUSTINA','CA BEETHOVEN 303','SAN BORJA',-12.0987876,-76.9967696,'JUEVES',true],
    ['pos_JUE_02','ELIAS REJAS VICTOR EDUARDO','AV PASEO EL BOSQUE MZA B LTE 16','SAN BORJA',-12.10643755390606,-76.99103951454163,'JUEVES',true],
    ['pos_JUE_03','ESTACION SERVICIO AVIACION','AV AVIACION 2680','SAN BORJA',-12.0940342160888,-77.0030658692122,'JUEVES',true],
    ['pos_JUE_04','GPO. ABJ CEMAR S.A.C.','CALLE MONTE GRANDE 187 URB CHACARILLA DEL ESTANQUE','SANTIAGO DE SURCO',-12.1126181908264,-76.9905661046504,'JUEVES',true],
    ['pos_JUE_05','HUAYTAN VASQUEZ TEODORO W.','CL ENGELS 190 LA CALERA','SURQUILLO',-12.1157995862699,-77.0028033480048,'JUEVES',true],
    ['pos_JUE_06','HYM OJEDA MARKET S.A.C','CALLE 24 160 SAN BORJA MARISCAL CASTILLA','SAN BORJA',-12.095390136939011,-76.98217783123255,'JUEVES',true],
    ['pos_JUE_07','JLF ASOCIADOS S.A.C','AV SAN BORJA NORTE 1415','SAN BORJA',-12.096089,-76.988326,'JUEVES',true],
    ['pos_JUE_08','LUZMER S.A.C.','AV SAN BORJA NORTE 1361','SAN BORJA',-12.095737,-76.989412,'JUEVES',true],
    ['pos_JUE_09','MARKET NORMITA E. I. R. L.','CALLE 24 NRO 194','SAN BORJA',-12.0950029658502,-76.9822961837053,'JUEVES',true],
    ['pos_JUE_10','MERLUZ SAC','AV CAMINOS DEL INCA 1337','SANTIAGO DE SURCO',-12.1233378,-76.9850605,'JUEVES',true],
    ['pos_JUE_11','OJEDA BAUTISTA OSCAR JAVIER','AV LAS ARTES 1540','SAN BORJA',-12.090662415019812,-76.98744334280491,'JUEVES',true],
    ['pos_JUE_12','OJEDA BAUTISTA OSCAR JAVIER','AV LAS ARTES NRO 1540','SAN BORJA',-12.0907532263592,-76.9873213022947,'JUEVES',true],
    ['pos_JUE_13','OJEDA CANO LILIANA','AV DE LAS ARTES NORTE NRO 1570','SAN BORJA',-12.0908994423859,-76.9870822504163,'JUEVES',true],
    ['pos_JUE_14','OJEDA CANO RAMON NICANOR','CALLE 24 NRO 224 URB MARISCAL CASTILLA','SAN BORJA',-12.0947711874619,-76.9823675975204,'JUEVES',true],
    ['pos_JUE_15','OJEDA CANO RUBEN OSCAR','JR POUSSIN NRO 199 URB JACARANDA','SAN BORJA',-12.0879337985556,-76.9858048483729,'JUEVES',true],
    ['pos_JUE_16','OJEDA CANO RUBEN OSCAR','JR POUSSIN 199 URB JACARANDA SAN BORJA','SAN BORJA',-12.087983,-76.985706,'JUEVES',true],
    ['pos_JUE_17','OJEDA MARKET L & F E.I.R.L.','JR LOMA REDONDA 184','SANTIAGO DE SURCO',-12.1367315993892,-76.9882309064269,'JUEVES',true],
    ['pos_JUE_18','OJEDA MARKET QHATU S.A.C','MZE1 LT 43 AV ALEJANDRO VELASCO ASTETE SANTIAGO DE SURCO','SANTIAGO DE SURCO',-12.12896403012448,-76.98790334165095,'JUEVES',true],
    ['pos_JUE_19','PASTOR RUA RAQUEL','CL LUIS MONTERO 194','SAN BORJA',-12.1088335,-77.0013042,'JUEVES',true],
    ['pos_JUE_20','REYES FLORES MIGUEL ANGEL','AV AVIACION N 3459','SAN BORJA',-12.10642870278,-77.0007363706827,'JUEVES',true],
    ['pos_JUE_21','RIOS OJEDA SEBASTIAN','AV ALEJANDRO VELASCO ASTETE 2083','SANTIAGO DE SURCO',-12.12747060647,-76.9872120022774,'JUEVES',true],
    ['pos_JUE_22','ADAN ARANDA MIRIAN','JR JUAN SOTO BERMEO 120 URB LA VIRREYNA','SANTIAGO DE SURCO',-12.1421606015313,-76.9921318441629,'JUEVES',true],
    ['pos_JUE_23','NUÑEZ BENITES MONICA LAURA','AV JUAN SOTO BERMEO 302 URB LA VIRREYNA SURCO','SANTIAGO DE SURCO',-12.144006627158536,-76.99329257011415,'JUEVES',true],
    ['pos_JUE_24','OJEDA YARANGA PERCY','AV SURCO 650','SANTIAGO DE SURCO',-12.1408219627277,-76.9947071000934,'JUEVES',true],
    // ── VIERNES (12) ────────────────────────────────────────────────────────
    ['pos_VIE_01','BARATUS SAC','AV LAS LOMAS MZ A1 LOTE 2','LA MOLINA',-12.1011678038228,-76.93842597305769,'VIERNES',true],
    ['pos_VIE_02','CORPORACION MILLA E HIJOS E.I.R.L.','JR EL POLO 493 URBANIZACION MONTERRICO','SANTIAGO DE SURCO',-12.1036350104875,-76.9726740941405,'VIERNES',true],
    ['pos_VIE_03','DETALLES VICTORIANA S.A.C.','AV FLORA TRISTAN 637','LA MOLINA',-12.068243529350733,-76.94335386157036,'VIERNES',true],
    ['pos_VIE_04','DIAZ EVELYN MILAGROS','AV JR LOS CONQUISTADORES LAS LOMAS 196','LA MOLINA',-12.0995312916996,-76.9393811747432,'VIERNES',true],
    ['pos_VIE_05','GAMARRA HUAMAN DE LOPEZ ANA ISABEL','CALLE BUGANVILLAS MZ 2 LT 16 2DA ETAPA URB MUSA','LA MOLINA',-12.086362774265,-76.8881157785654,'VIERNES',true],
    ['pos_VIE_06','MAX MARKET OJEDA E.I.R.L.','JR PIO XII NRO 277','SANTIAGO DE SURCO',-12.096421825493916,-76.96541838347912,'VIERNES',true],
    ['pos_VIE_07','MAX MARKET OJEDA EIRL','AV PIO XXII 385 URB HUERTOS DE SANTA ROSA','SANTIAGO DE SURCO',-12.098231778541,-76.9652185589075,'VIERNES',true],
    ['pos_VIE_08','OJEDA MARKET INVERSIONES E.I.R.L.','AVENIDA CENTRAL 987 SURCO','SANTIAGO DE SURCO',-12.106697514625631,-76.95824950933456,'VIERNES',true],
    ['pos_VIE_09','MARKET PERCY E.I.R.L','AV 26 DE JULIO 211','SAN LUIS',-12.062740237355236,-76.99835523962975,'VIERNES',true],
    ['pos_VIE_10','ASTORAYME MANSILLA GUIDO DARIO','AVENIDA CANADA 3678 URB VILLA JARDIN','SAN LUIS',-12.080444139371206,-76.9923323392868,'VIERNES',true],
    ['pos_VIE_11','BODEBAZAR ANITAHS EIRL','JR MANUEL BEINGOLEA 301','SAN LUIS',-12.071575613629625,-76.99613370001317,'VIERNES',true],
    ['pos_VIE_12','FAMLAI SAC','AV BENJAMIN FRANKLIN 331','ATE',-12.065659602747605,-76.97621595114468,'VIERNES',true]
  ];

  sheet.getRange(2, 1, defaults.length, 8).setValues(defaults);

  // Aplicar validación de casilla de verificación (checkbox) en la columna "Activo"
  const checkRule = SpreadsheetApp.newDataValidation().requireCheckbox().build();
  sheet.getRange(2, 8, defaults.length, 1).setDataValidation(checkRule);

  // Formateo visual: fondo alternado por día
  const dayColors = {LUNES:'#EEF6FF',MARTES:'#FFF8EE',MIERCOLES:'#EEFFF3',JUEVES:'#FFF0EE',VIERNES:'#F3EEFF'};
  defaults.forEach((row, i) => {
    const color = dayColors[row[6]] || '#FFFFFF';
    sheet.getRange(i + 2, 1, 1, 8).setBackground(color);
  });

  Logger.log('✅ ' + defaults.length + ' POS pre-cargados en Padrón Rutas.');
}

// ───────────────────────────────────────────────────────────────
// FUNCIÓN DE SETUP MANUAL (ejecutar 1 vez desde el editor)
// Crea el Sheet + carpeta y muestra los IDs y la URL del Sheet
// ───────────────────────────────────────────────────────────────

function setup() {
  const sheet       = getOrCreateSheet();
  const padronSheet = getOrCreatePadronSheet();
  const folder      = getOrCreateDriveFolder();
  const ss          = sheet.getParent();

  const msg = [
    '════════════════════════════════════════════',
    '   BAT Promotoría — Setup OK ✅             ',
    '════════════════════════════════════════════',
    '',
    '📊 Spreadsheet:',
    '   ' + ss.getUrl(),
    '',
    '📋 Pestaña "Padrón Rutas" creada en:',
    '   ' + ss.getUrl() + '#gid=' + padronSheet.getSheetId(),
    '',
    '📁 Carpeta Drive:',
    '   https://drive.google.com/drive/folders/' + folder.getId(),
    '',
    '➡️  Para agregar/quitar POS: edita la pestaña "Padrón Rutas".',
    '   Desmarca "Activo" para ocultar un punto sin borrarlo.',
    '   Los cambios se reflejan en el mapa al próximo inicio de sesión.',
    '',
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

  // ── getPOS: devuelve los POS activos del Padrón Rutas, agrupados por día ──
  if (action === 'getPOS') {
    try {
      const sheet = getOrCreatePadronSheet();
      const rows  = sheet.getDataRange().getValues();
      if (rows.length < 2) return jsonOut({ok: true, data: {}});

      const result = {};
      rows.slice(1).forEach(row => {
        const id       = String(row[0] || '').trim();
        const nombre   = String(row[1] || '').trim();
        const direccion= String(row[2] || '').trim();
        const distrito = String(row[3] || '').trim();
        const lat      = parseFloat(row[4]) || 0;
        const lon      = parseFloat(row[5]) || 0;
        const dia      = String(row[6] || '').trim().toUpperCase();
        const activo   = row[7]; // true/false (checkbox)

        if (!activo || !id || !dia) return; // saltar inactivos o incompletos

        if (!result[dia]) result[dia] = [];
        result[dia].push({id, nombre, direccion, distrito, lat, lon});
      });

      return jsonOut({ok: true, data: result});
    } catch(err) {
      return jsonOut({ok: false, error: err.message});
    }
  }

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
  // Devuelve URL directa de imagen (no el viewer de Drive) para poder mostrarla en <img>
  return 'https://drive.google.com/uc?export=view&id=' + file.getId();
}
