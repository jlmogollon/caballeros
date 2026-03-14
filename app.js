// Extraído desde index.html: lógica principal de la app Caballeros

// ═══════════════════════════════════════════════════════════════
// CONFIG & DB
// ═══════════════════════════════════════════════════════════════
const SK = 'hdv_v2';
let DB = {};
function _db(){ return (typeof window!=='undefined'&&window.DB)!==undefined ? window.DB : (typeof DB!=='undefined'?DB:{}); }
let currentCabId = null;
let gradeClaseId = null;

// Moneda y locale unificados (pantalla e informes PDF)
const MONEDA = { symbol: '$', locale: 'es-CO' };
function fmtMonto(n){ return (Number(n)||0).toLocaleString(MONEDA.locale,{minimumFractionDigits:2,maximumFractionDigits:2}); }
function escAttr(s){ if(s==null||s===undefined)return''; return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// Clave pública VAPID para push (VAPID public key)
// Generada con web-push.generateVAPIDKeys()
const PUSH_VAPID_PUBLIC_KEY = 'BEv3_CKyyLvU8eqh747UwP9WdJN07czCySodDtVWULIWsGnQQBLHvdJPEQx6Zz3RPJljJDynTy_KpJf0Z2f89fQ';

// ═══════════════════════════════════════════════════════════════
// NUBE — Firebase Firestore (como Escuela Dominical)
// ═══════════════════════════════════════════════════════════════
const FIRESTORE_COLLECTION = 'caballeros_data';
const FIRESTORE_DOC = 'db';
const FIRESTORE_DOC_BACKUP = 'db_backup';

function getFirestoreDb(){
  try{
    if(window.__firebaseDb)return window.__firebaseDb;
    if(typeof firebase!=='undefined'&&firebase.firestore)return firebase.firestore();
  }catch(e){}
  return null;
}
function waitForFirestore(ms){
  return new Promise(function(resolve){
    var db=getFirestoreDb();
    if(db){resolve(db);return;}
    var t0=Date.now();
    var iv=setInterval(function(){
      var d=getFirestoreDb();
      if(d){clearInterval(iv);resolve(d);}
      else if(Date.now()-t0>ms){clearInterval(iv);resolve(null);}
    },300);
  });
}

async function cloudLoad(){
  var database=await waitForFirestore(12000);
  if(!database)throw new Error('Firebase no conectado');
  var snap=await database.collection(FIRESTORE_COLLECTION).doc(FIRESTORE_DOC).get({source:'server'});
  if(!snap.exists)return null;
  var raw=snap.data().value;
  if(raw==null||raw==='')return null;
  return JSON.parse(raw);
}
async function cloudSave(data){
  var database=await waitForFirestore(12000);
  if(!database)throw new Error('Firebase no conectado');
  // Backup automático: guardar en db_backup lo que hay ahora antes de sobrescribir
  try{
    var snap=await database.collection(FIRESTORE_COLLECTION).doc(FIRESTORE_DOC).get({source:'server'});
    if(snap.exists){
      var raw=snap.data().value;
      if(raw!=null&&raw!=='')
        await database.collection(FIRESTORE_COLLECTION).doc(FIRESTORE_DOC_BACKUP).set({value:raw,backupTime:new Date().toISOString()},{merge:true});
    }
  }catch(e){ console.warn('Backup automático nube:',e.message); }
  // Enviar una copia: lo que se sube es exactamente el estado actual de la base; no se modifica DB en memoria
  var snapshot=JSON.parse(JSON.stringify(data));
  var str=JSON.stringify(snapshot);
  if(str.length>900000)console.warn('Payload grande:',Math.round(str.length/1024),'KB. Firestore limita 1 MB por documento.');
  await database.collection(FIRESTORE_COLLECTION).doc(FIRESTORE_DOC).set({value:str},{merge:true});
}

function useCloud(){
  if(!window.FIREBASE_CONFIGURED)return false;
  try{
    var h=window.location.hostname||'';
    var p=window.location.protocol||'';
    if(p==='file:')return false;
    if(h==='localhost'||h==='127.0.0.1'||h==='')return false;
    return true;
  }catch(e){return false;}
}

function urlBase64ToUint8Array(base64String){
  const padding='='.repeat((4-base64String.length%4)%4);
  const base64=(base64String+padding).replace(/-/g,'+').replace(/_/g,'/');
  const rawData=atob(base64);
  const outputArray=new Uint8Array(rawData.length);
  for(let i=0;i<rawData.length;i++)outputArray[i]=rawData.charCodeAt(i);
  return outputArray;
}

async function savePushSubscription(kind,cabId,sub){
  if(!sub)return;
  const dbFs=await waitForFirestore(12000);
  if(!dbFs)return;
  const id=(kind||'admin')+'_'+(cabId||'main');
  try{
    await dbFs.collection('caballeros_push').doc(id).set({
      subscription:sub,
      kind:kind||'admin',
      cabId:cabId||null,
      updatedAt:new Date().toISOString()
    },{merge:true});
  }catch(e){
    console.warn('No se pudo guardar la suscripción push:',e.message);
  }
}

async function subscribePush(kind,cabId){
  try{
    if(!('serviceWorker' in navigator))return;
    if(!('PushManager' in window))return;
    if(!PUSH_VAPID_PUBLIC_KEY)return;
    const reg=await navigator.serviceWorker.ready;
    let sub=await reg.pushManager.getSubscription();
    if(!sub){
      sub=await reg.pushManager.subscribe({
        userVisibleOnly:true,
        applicationServerKey:urlBase64ToUint8Array(PUSH_VAPID_PUBLIC_KEY)
      });
    }
    await savePushSubscription(kind,cabId,sub.toJSON?sub.toJSON():sub);
  }catch(e){
    console.warn('Error al suscribirse a push:',e.message);
  }
}

function showLoading(msg){
  let el=document.getElementById('fb-loading');
  if(!el){
    el=document.createElement('div');el.id='fb-loading';
    el.style.cssText='position:fixed;inset:0;background:white;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9999;font-family:Lato,sans-serif;gap:14px;';
    el.innerHTML=`<div style="font-size:42px">🛡️</div><div style="font-family:Montserrat,sans-serif;font-size:18px;font-weight:800;color:#1a1f2e">Hombres de Verdad</div><div id="fb-load-msg" style="color:#3aabba;font-size:13px;font-weight:600">${msg}</div><div style="width:40px;height:40px;border:3px solid #e5e7eb;border-top-color:#3aabba;border-radius:50%;animation:spin 0.7s linear infinite"></div><style>@keyframes spin{to{transform:rotate(360deg)}}</style>`;
    document.body.appendChild(el);
    window._loadingTimeout=setTimeout(hideLoading,15000);
  }else{const m=document.getElementById('fb-load-msg');if(m)m.textContent=msg;}
}
function hideLoading(){clearTimeout(window._loadingTimeout);window._loadingTimeout=null;const el=document.getElementById('fb-loading');if(el)el.remove();}

const CARLOS_FINANZAS_ID='c9';
function seedDB(){
  return{
    adminPw:'1234',
    adminNombre:'',
    adminPhoto:'',
    caballeros:JSON.parse(JSON.stringify(SEED_CABS)),
    clases:JSON.parse(JSON.stringify(SEED_CLASES)),
    peticiones:[],
    eventos:JSON.parse(JSON.stringify(SEED_EVENTOS))
  };
}

function mergeLegacyIntoDB(legacy,forcePeticiones){
  if(!legacy||!legacy.caballeros||!Array.isArray(legacy.caballeros))return;
  const byId={};
  legacy.caballeros.forEach(c=>{if(c&&c.id)byId[c.id]=c;});
  DB.caballeros.forEach(c=>{
    const old=byId[c.id];
    if(!old)return;
    if(old.photo!=null&&old.photo!==''&&(!c.photo||c.photo===''))c.photo=old.photo;
    if(old.pw!=null&&old.pw!==''&&(!c.pw||c.pw===''))c.pw=old.pw;
    if(old.fnac!=null&&old.fnac!==''&&(!c.fnac||c.fnac===''))c.fnac=old.fnac;
  });
  if(Array.isArray(legacy.peticiones)&&legacy.peticiones.length>0){
    if(forcePeticiones||!DB.peticiones||DB.peticiones.length<legacy.peticiones.length)DB.peticiones=JSON.parse(JSON.stringify(legacy.peticiones));
  }
}

function descargarBackupDB(){
  // Exportar con claves amigables: "estudios" en lugar de "clases" (misma terminología que la UI)
  var exportObj=JSON.parse(JSON.stringify(DB));
  exportObj.estudios=exportObj.clases;
  delete exportObj.clases;
  const json=JSON.stringify(exportObj,null,2);
  const blob=new Blob([json],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='caballeros-backup-'+new Date().toISOString().slice(0,10)+'.json';
  a.click();
  URL.revokeObjectURL(a.href);
  toast('✅ Copia descargada. Guárdala en un lugar seguro.','ok');
}
function aplicarBackupCompleto(legacy){
  if(!legacy||typeof legacy!=='object')return;
  if(typeof DB==='undefined'){ console.error('aplicarBackupCompleto: DB no definido'); return; }
  var keys=['adminPw','adminNombre','adminPhoto','caballeros','peticiones','eventos','eventosCultosOverride','eventosEstudiosOverride','evaluaciones','evaluacionRespuestas','finanzasGastos','finanzasActividades','finanzasDonativos','finanzasVotos','materialEstudio','appHistorial'];
  try {
    keys.forEach(function(k){ if(legacy[k]!==undefined) DB[k]=JSON.parse(JSON.stringify(legacy[k])); });
    if(legacy.estudios!==undefined&&Array.isArray(legacy.estudios)) DB.clases=JSON.parse(JSON.stringify(legacy.estudios));
    else if(legacy.clases!==undefined&&Array.isArray(legacy.clases)) DB.clases=JSON.parse(JSON.stringify(legacy.clases));
    if(typeof window!=='undefined')window.DB=DB;
    ensureDbShape();
  } catch(e) {
    console.error('aplicarBackupCompleto error:',e);
    if(typeof toast==='function')toast('Error al aplicar backup: '+e.message,'err');
  }
}
async function recuperarDesdeBackup(){
  const ta=document.getElementById('legacy-json-inp');
  if(!ta||!ta.value.trim()){toast('Pega el JSON de la base anterior en el cuadro de texto','err');return;}
  var legacy;
  try{legacy=JSON.parse(ta.value.trim());}catch(e){toast('El JSON no es válido. Pega una copia completa del respaldo.','err');return;}
  if(!legacy||!legacy.caballeros||!Array.isArray(legacy.caballeros)){toast('El JSON no tiene lista de caballeros.','err');return;}
  aplicarBackupCompleto(legacy);
  var nCab=(DB.caballeros&&Array.isArray(DB.caballeros))?DB.caballeros.length:0;
  if(nCab===0){toast('Tras restaurar no hay caballeros. Revisa el JSON o la consola (F12).','err');return;}
  toast('💾 Guardando base restaurada...','info');
  var ok=await saveDB();
  if(ok){
    toast('✅ Base restaurada y guardada.','ok');
    ta.value='';
    if(typeof renderPeticiones==='function')renderPeticiones();
    invalidateCache();
    if(typeof renderClases==='function')renderClases();
    if(typeof buildSel==='function')buildSel();
    if(typeof renderDash==='function')renderDash();
  }
  else toast('Error al guardar. Comprueba conexión.','err');
}
function recuperarDesdeDispositivo(){
  try{
    var raw=localStorage.getItem(SK);
    if(!raw){toast('En este navegador no hay copia guardada.','err');return;}
    var local=JSON.parse(raw);
    if(!local||typeof local!=='object'){toast('La copia de este dispositivo no es válida.','err');return;}
    var nCab=(local.caballeros&&Array.isArray(local.caballeros))?local.caballeros.length:0;
    var nCla=(local.clases&&Array.isArray(local.clases))?local.clases.length:(local.estudios&&Array.isArray(local.estudios))?local.estudios.length:0;
    if(nCab===0&&nCla===0){toast('La copia está vacía. Usa un backup en JSON si lo tienes.','err');return;}
    aplicarBackupCompleto(local);
    toast('💾 Recuperados datos de este dispositivo. Guardando...','info');
    saveDB().then(function(ok){
      if(ok){ toast('✅ Datos recuperados y guardados. Recarga la página.'); location.reload(); }
      else toast('Datos recuperados aquí. Revisa la conexión para subir a la nube.','err');
    }).catch(function(){ toast('Error al guardar.','err'); });
  }catch(e){ toast('No se pudo leer la copia guardada.','err'); }
}

async function loadDB(){
  showLoading('Cargando datos...');
  try{
    if(useCloud()){
      try{
        const data=await cloudLoad();
        if(data&&typeof data==='object'){
          DB=data;
          if(typeof window!=='undefined')window.DB=DB;
          try{ ensureDbShape(); }catch(ee){ console.error('loadDB ensureDbShape:',ee); }
          try{
            const raw=localStorage.getItem(SK);
            if(raw){
              const legacy=JSON.parse(raw);
              const hasLegacyPhotos=legacy.caballeros&&legacy.caballeros.some(c=>c.photo&&c.photo.length>50);
              const hasLegacyPeticiones=legacy.peticiones&&legacy.peticiones.length>0;
              const currentHasPhotos=DB.caballeros.some(c=>c.photo&&c.photo.length>50);
              const needRecovery=(hasLegacyPhotos&&!currentHasPhotos)||(hasLegacyPeticiones&&(!DB.peticiones||DB.peticiones.length<legacy.peticiones.length));
              if(needRecovery){
                mergeLegacyIntoDB(legacy);
                await cloudSave(DB);
                toast('✅ Recuperadas fotos, claves y peticiones de la copia anterior','ok');
              }
            }
          }catch(e){console.warn('Legacy merge:',e);}
          return;
        }
        // Nube vacía o sin caballeros: usar localStorage si tiene datos; NUNCA sobrescribir la nube con semilla ni con local
        try{
          const r=localStorage.getItem(SK);
          if(r){
            const local=JSON.parse(r);
            if(local&&Array.isArray(local.caballeros)&&local.caballeros.length>0){
              DB=local;
              if(typeof window!=='undefined')window.DB=DB;
              try{ ensureDbShape(); }catch(ee){ console.error('loadDB ensureDbShape:',ee); }
              toast('✅ Se cargaron datos desde este dispositivo (la nube no tenía datos válidos). Para guardar en la nube, haz un cambio y guarda.','ok');
              return;
            }
          }
        }catch(e){}
        DB=seedDB();
        if(typeof window!=='undefined')window.DB=DB;
        try{ ensureDbShape(); }catch(ee){ console.error('loadDB ensureDbShape:',ee); }
        toast('⚠️ No había datos válidos. Se cargaron datos iniciales. Restaura desde Peticiones → Copia de seguridad si tienes un backup.','err');
        return;
      }catch(e){
        console.warn('Nube falló:',e);
        toast('⚠️ Sin conexión a la nube','err');
      }
    }
    try{const r=localStorage.getItem(SK);if(r){DB=JSON.parse(r);if(typeof window!=='undefined')window.DB=DB;}}catch(e){}
    if(!DB||typeof DB!=='object'){DB=seedDB();if(typeof window!=='undefined')window.DB=DB;}
    try{ ensureDbShape(); }catch(ee){ console.error('loadDB ensureDbShape:',ee); }
  }finally{
    hideLoading();
  }
}

function _localBackupThenSave(){
  try{ var prev=localStorage.getItem(SK); if(prev) localStorage.setItem(SK+'_backup',prev); }catch(_){}
  // Guardar copia: lo que se escribe es el estado actual; no se modifica DB
  try{ var snapshot=JSON.parse(JSON.stringify(DB)); localStorage.setItem(SK,JSON.stringify(snapshot)); return true; }catch(e){
    console.error('localStorage save failed',e);
    toast('⚠️ No se pudo guardar (espacio o privacidad).','err');
    return false;
  }
}
async function saveDB(){
  invalidateCache();
  if(useCloud()){
    try{await cloudSave(DB);return true;}
    catch(e){
      const msg=(e.message||e.code||String(e)).slice(0,80);
      if(e.code==='permission-denied'){
        toast('🔑 Sin permiso en Firebase. Revisa reglas de Firestore y que el proyecto esté bien configurado. Guardando en este dispositivo…','err');
      }else{
        toast('No se pudo guardar en la nube. Comprueba la conexión.','err');
      }
      _localBackupThenSave();
      console.error('cloudSave failed',e);
      return false;
    }
  }
  return _localBackupThenSave();
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════
const GRUPOS=['CABALLEROS DEL CIELO','CENTINELAS','EMBAJADORES DEL REY','EMANUEL'];
const GCOL={'CABALLEROS DEL CIELO':'#3aabba','CENTINELAS':'#ef4444','EMBAJADORES DEL REY':'#22c55e','EMANUEL':'#f59e0b'};
const CHECKS=['bautizado','sellado','servidor','directivo','predicador','evangelista','devoto'];
const CLBL={bautizado:'Bautizado',sellado:'Sellado',servidor:'Servidor Activo',directivo:'Directivo',predicador:'Predicador',evangelista:'Evangelista',devoto:'Devoto'};
// Stars auto-calculation based on checkboxes
function autoVal(c){return CHECKS.filter(k=>c[k]).length;}

// ═══════════════════════════════════════════════════════════════
// SEED DATA
// ═══════════════════════════════════════════════════════════════
const SEED_CABS=[
  {id:'c1', nombre:'Alejandro Ocampo',    grupo:'CABALLEROS DEL CIELO', dist:'Hermano',bautizado:1,sellado:1,servidor:1,directivo:1,predicador:1,evangelista:0,devoto:0,photo:''},
  {id:'c2', nombre:'Alexander Catalán',   grupo:'CENTINELAS',            dist:'Hermano',bautizado:1,sellado:1,servidor:0,directivo:0,predicador:0,evangelista:0,devoto:0,photo:''},
  {id:'c3', nombre:'Alfredo (Fredy)',      grupo:'EMBAJADORES DEL REY',   dist:'Amigo',  bautizado:0,sellado:0,servidor:0,directivo:0,predicador:0,evangelista:0,devoto:0,photo:''},
  {id:'c4', nombre:'Andrés Jaramillo',    grupo:'CABALLEROS DEL CIELO',  dist:'Hermano',bautizado:1,sellado:0,servidor:0,directivo:0,predicador:0,evangelista:0,devoto:0,photo:''},
  {id:'c5', nombre:'Andrés Loaiza',       grupo:'CENTINELAS',            dist:'Hermano',bautizado:1,sellado:0,servidor:0,directivo:0,predicador:0,evangelista:0,devoto:1,photo:''},
  {id:'c6', nombre:'Andrés Sepúlveda',    grupo:'EMANUEL',               dist:'Hermano',bautizado:1,sellado:1,servidor:1,directivo:1,predicador:1,evangelista:1,devoto:1,photo:''},
  {id:'c7', nombre:'Arturo Rodríguez',    grupo:'EMBAJADORES DEL REY',   dist:'Hermano',bautizado:1,sellado:1,servidor:1,directivo:1,predicador:1,evangelista:1,devoto:1,photo:''},
  {id:'c8', nombre:'Aurelio Rodríguez',   grupo:'EMANUEL',               dist:'Hermano',bautizado:1,sellado:1,servidor:0,directivo:0,predicador:0,evangelista:1,devoto:0,photo:''},
  {id:'c9', nombre:'Carlos Rodríguez',    grupo:'CENTINELAS',            dist:'Hermano',bautizado:1,sellado:1,servidor:1,directivo:1,predicador:1,evangelista:1,devoto:1,photo:''},
  {id:'c10',nombre:'César Pulido',        grupo:'CABALLEROS DEL CIELO',  dist:'Hermano',bautizado:1,sellado:0,servidor:0,directivo:0,predicador:0,evangelista:0,devoto:1,photo:''},
  {id:'c11',nombre:'Cristian Monterrubio',grupo:'CABALLEROS DEL CIELO',  dist:'Hermano',bautizado:1,sellado:0,servidor:0,directivo:0,predicador:0,evangelista:0,devoto:1,photo:''},
  {id:'c12',nombre:'Diego (Tito)',        grupo:'EMBAJADORES DEL REY',   dist:'Amigo',  bautizado:0,sellado:0,servidor:0,directivo:0,predicador:0,evangelista:0,devoto:0,photo:''},
  {id:'c13',nombre:'Eliuth Albornoz',     grupo:'EMBAJADORES DEL REY',   dist:'Hermano',bautizado:1,sellado:1,servidor:0,directivo:0,predicador:0,evangelista:0,devoto:0,photo:''},
  {id:'c14',nombre:'Emerson Reina',       grupo:'EMANUEL',               dist:'Hermano',bautizado:1,sellado:0,servidor:0,directivo:0,predicador:0,evangelista:0,devoto:1,photo:''},
  {id:'c15',nombre:'Erwin Liñan',         grupo:'CABALLEROS DEL CIELO',  dist:'Hermano',bautizado:1,sellado:1,servidor:0,directivo:0,predicador:0,evangelista:0,devoto:0,photo:''},
  {id:'c16',nombre:'Felipe García',       grupo:'EMBAJADORES DEL REY',   dist:'Amigo',  bautizado:0,sellado:0,servidor:0,directivo:0,predicador:0,evangelista:0,devoto:0,photo:''},
  {id:'c17',nombre:'Felipe Salguero',     grupo:'CABALLEROS DEL CIELO',  dist:'Hermano',bautizado:1,sellado:1,servidor:0,directivo:0,predicador:0,evangelista:0,devoto:0,photo:''},
  {id:'c18',nombre:'Fran Lizardo',        grupo:'CENTINELAS',            dist:'Amigo',  bautizado:0,sellado:0,servidor:0,directivo:0,predicador:0,evangelista:0,devoto:0,photo:''},
  {id:'c19',nombre:'Francisco Mendieta',  grupo:'EMANUEL',               dist:'Hermano',bautizado:1,sellado:1,servidor:0,directivo:0,predicador:1,evangelista:0,devoto:0,photo:''},
  {id:'c20',nombre:'Fredis Hernández',    grupo:'CABALLEROS DEL CIELO',  dist:'Amigo',  bautizado:0,sellado:0,servidor:0,directivo:0,predicador:0,evangelista:0,devoto:0,photo:''},
  {id:'c21',nombre:'Gabriel Ávila',       grupo:'CENTINELAS',            dist:'Hermano',bautizado:1,sellado:0,servidor:1,directivo:1,predicador:0,evangelista:0,devoto:1,photo:''},
  {id:'c22',nombre:'Genaro Ocampo',       grupo:'CABALLEROS DEL CIELO',  dist:'Hermano',bautizado:1,sellado:0,servidor:1,directivo:1,predicador:0,evangelista:0,devoto:0,photo:''},
  {id:'c23',nombre:'Gino Castro',         grupo:'CENTINELAS',            dist:'Hermano',bautizado:1,sellado:1,servidor:0,directivo:0,predicador:0,evangelista:1,devoto:0,photo:''},
  {id:'c24',nombre:'Henry Ramírez',       grupo:'EMBAJADORES DEL REY',   dist:'Hermano',bautizado:1,sellado:0,servidor:0,directivo:0,predicador:0,evangelista:0,devoto:0,photo:''},
  {id:'c25',nombre:'Javier Miranda',      grupo:'CENTINELAS',            dist:'Hermano',bautizado:1,sellado:0,servidor:0,directivo:0,predicador:0,evangelista:0,devoto:0,photo:''},
  {id:'c26',nombre:'Jesús Contreras',     grupo:'CENTINELAS',            dist:'Hermano',bautizado:1,sellado:0,servidor:1,directivo:1,predicador:0,evangelista:1,devoto:1,photo:''},
  {id:'c27',nombre:'José Hernán Díaz',    grupo:'CABALLEROS DEL CIELO',  dist:'Hermano',bautizado:1,sellado:1,servidor:1,directivo:1,predicador:1,evangelista:1,devoto:1,photo:''},
  {id:'c28',nombre:'José Mogollón',       grupo:'CABALLEROS DEL CIELO',  dist:'Hermano',bautizado:1,sellado:1,servidor:1,directivo:1,predicador:1,evangelista:1,devoto:1,photo:''},
  {id:'c29',nombre:'Juan Ramón',          grupo:'CENTINELAS',            dist:'Amigo',  bautizado:0,sellado:0,servidor:0,directivo:0,predicador:0,evangelista:0,devoto:0,photo:''},
  {id:'c30',nombre:'Kartal Demir',        grupo:'EMANUEL',               dist:'Hermano',bautizado:1,sellado:0,servidor:0,directivo:0,predicador:0,evangelista:0,devoto:0,photo:''},
  {id:'c31',nombre:'Leonardo Delgado',    grupo:'EMANUEL',               dist:'Amigo',  bautizado:0,sellado:0,servidor:0,directivo:0,predicador:0,evangelista:0,devoto:0,photo:''},
  {id:'c32',nombre:'Mauricio Lozano',     grupo:'EMANUEL',               dist:'Hermano',bautizado:1,sellado:1,servidor:1,directivo:1,predicador:0,evangelista:0,devoto:0,photo:''},
  {id:'c33',nombre:'Michael Rodríguez',   grupo:'EMBAJADORES DEL REY',   dist:'Hermano',bautizado:1,sellado:1,servidor:1,directivo:1,predicador:1,evangelista:0,devoto:1,photo:''},
  {id:'c34',nombre:'Miguel Fajardo',      grupo:'CABALLEROS DEL CIELO',  dist:'Amigo',  bautizado:0,sellado:0,servidor:0,directivo:0,predicador:0,evangelista:0,devoto:0,photo:''},
  {id:'c35',nombre:'Miguel Lozano',       grupo:'EMANUEL',               dist:'Amigo',  bautizado:0,sellado:0,servidor:0,directivo:0,predicador:0,evangelista:0,devoto:0,photo:''},
  {id:'c36',nombre:'Pierre Morales',      grupo:'CABALLEROS DEL CIELO',  dist:'Hermano',bautizado:1,sellado:0,servidor:0,directivo:0,predicador:0,evangelista:1,devoto:1,photo:''},
  {id:'c37',nombre:'Ramiro Pacheco',      grupo:'EMBAJADORES DEL REY',   dist:'Hermano',bautizado:1,sellado:1,servidor:0,directivo:0,predicador:0,evangelista:0,devoto:1,photo:''},
  {id:'c38',nombre:'Ricardo Pérez',       grupo:'EMANUEL',               dist:'Hermano',bautizado:1,sellado:0,servidor:0,directivo:0,predicador:0,evangelista:0,devoto:0,photo:''},
  {id:'c39',nombre:'Roque García',        grupo:'EMBAJADORES DEL REY',   dist:'Hermano',bautizado:1,sellado:1,servidor:1,directivo:0,predicador:1,evangelista:1,devoto:1,photo:''},
  {id:'c40',nombre:'Samir Jaramillo',     grupo:'CABALLEROS DEL CIELO',  dist:'Amigo',  bautizado:0,sellado:0,servidor:0,directivo:0,predicador:0,evangelista:0,devoto:0,photo:''},
  {id:'c41',nombre:'Samuel Giraldo',      grupo:'EMBAJADORES DEL REY',   dist:'Hermano',bautizado:1,sellado:1,servidor:1,directivo:0,predicador:0,evangelista:0,devoto:1,photo:''},
  {id:'c42',nombre:'Sebastián Quintero',  grupo:'CABALLEROS DEL CIELO',  dist:'Amigo',  bautizado:0,sellado:0,servidor:0,directivo:0,predicador:0,evangelista:0,devoto:0,photo:''},
  {id:'c43',nombre:'Yadir Pérez',         grupo:'EMANUEL',               dist:'Hermano',bautizado:1,sellado:0,servidor:0,directivo:0,predicador:0,evangelista:0,devoto:0,photo:''},
  {id:'c44',nombre:'Yefri Palacios',      grupo:'CENTINELAS',            dist:'Amigo',  bautizado:0,sellado:0,servidor:0,directivo:0,predicador:0,evangelista:0,devoto:0,photo:''}
];

const SEED_CLASES=[
  {id:'cl1',fecha:'2026-02-13',grupoResp:'CABALLEROS DEL CIELO',tema:'Estudio de las Dispensaciones',cal:{
    'c1':{a:1,i:9,p:10,d:9,pa:9},'c4':{a:1,i:9,p:10,d:1,pa:3},'c6':{a:1,i:5,p:5,d:1,pa:1},
    'c7':{a:1,i:10,p:9,d:5,pa:5},'c9':{a:1,i:10,p:9,d:5,pa:5},'c11':{a:1,i:10,p:7,d:1,pa:5},
    'c13':{a:1,i:7,p:7,d:1,pa:1},'c14':{a:1,i:10,p:10,d:1,pa:5},'c15':{a:1,i:10,p:7,d:1,pa:3},
    'c16':{a:1,i:10,p:9,d:3,pa:5},'c21':{a:1,i:10,p:10,d:3,pa:2},'c22':{a:1,i:7,p:7,d:2,pa:1},
    'c26':{a:1,i:10,p:10,d:3,pa:3},'c30':{a:1,i:10,p:10,d:5,pa:10},'c34':{a:1,i:10,p:5,d:1,pa:1},
    'c36':{a:1,i:10,p:10,d:9,pa:10},'c39':{a:1,i:10,p:9,d:1,pa:7}
  }},
  {id:'cl2',fecha:'2026-02-27',grupoResp:'EMANUEL',tema:'Estudio de las Dispensaciones',cal:{
    'c1':{a:1,i:0,p:0,d:0,pa:0},'c4':{a:1,i:9,p:10,d:1,pa:3},'c6':{a:1,i:5,p:5,d:1,pa:1},
    'c7':{a:1,i:10,p:9,d:5,pa:5},'c9':{a:1,i:10,p:9,d:5,pa:5},
    'c30':{a:1,i:10,p:10,d:5,pa:10},'c36':{a:1,i:10,p:10,d:9,pa:10}
  }},
  {id:'cl3',fecha:'2026-03-13',grupoResp:'EMBAJADORES DEL REY',tema:'Estudio de las Dispensaciones',cal:{}},
  {id:'cl4',fecha:'2026-03-27',grupoResp:'CENTINELAS',tema:'Estudio de las Dispensaciones',cal:{}},
  {id:'cl5',fecha:'2026-04-10',grupoResp:'CABALLEROS DEL CIELO',tema:'Estudio de las Dispensaciones',cal:{}},
  {id:'cl6',fecha:'2026-04-24',grupoResp:'EMANUEL',tema:'Estudio de las Dispensaciones',cal:{}},
  {id:'cl7',fecha:'2026-05-08',grupoResp:'EMBAJADORES DEL REY',tema:'Estudio de las Dispensaciones',cal:{}},
  {id:'cl8',fecha:'2026-05-22',grupoResp:'CENTINELAS',tema:'Estudio de las Dispensaciones',cal:{}},
  {id:'cl9',fecha:'2026-06-05',grupoResp:'CABALLEROS DEL CIELO',tema:'Estudio de las Dispensaciones',cal:{}},
  {id:'cl10',fecha:'2026-06-19',grupoResp:'EMANUEL',tema:'Estudio de las Dispensaciones',cal:{}},
  {id:'cl11',fecha:'2026-07-03',grupoResp:'EMBAJADORES DEL REY',tema:'Estudio de las Dispensaciones',cal:{}},
  {id:'cl12',fecha:'2026-07-17',grupoResp:'CENTINELAS',tema:'Estudio de las Dispensaciones',cal:{}},
  {id:'cl13',fecha:'2026-07-31',grupoResp:'CABALLEROS DEL CIELO',tema:'Estudio de las Dispensaciones',cal:{}},
  {id:'cl14',fecha:'2026-08-14',grupoResp:'EMANUEL',tema:'Estudio de las Dispensaciones',cal:{}},
  {id:'cl15',fecha:'2026-08-28',grupoResp:'EMBAJADORES DEL REY',tema:'Estudio de las Dispensaciones',cal:{}},
  {id:'cl16',fecha:'2026-09-11',grupoResp:'CENTINELAS',tema:'Estudio de las Dispensaciones',cal:{}},
  {id:'cl17',fecha:'2026-09-25',grupoResp:'CABALLEROS DEL CIELO',tema:'Estudio de las Dispensaciones',cal:{}},
  {id:'cl18',fecha:'2026-10-09',grupoResp:'EMANUEL',tema:'Estudio de las Dispensaciones',cal:{}},
  {id:'cl19',fecha:'2026-10-23',grupoResp:'EMBAJADORES DEL REY',tema:'Estudio de las Dispensaciones',cal:{}},
  {id:'cl20',fecha:'2026-11-06',grupoResp:'CENTINELAS',tema:'Estudio de las Dispensaciones',cal:{}},
  {id:'cl21',fecha:'2026-11-20',grupoResp:'CABALLEROS DEL CIELO',tema:'Estudio de las Dispensaciones',cal:{}},
  {id:'cl22',fecha:'2026-12-04',grupoResp:'EMANUEL',tema:'Estudio de las Dispensaciones',cal:{}},
  {id:'cl23',fecha:'2026-12-18',grupoResp:'EMBAJADORES DEL REY',tema:'Estudio de las Dispensaciones',cal:{}},
  {id:'cl24',fecha:'2027-01-01',grupoResp:'CENTINELAS',tema:'Estudio de las Dispensaciones',cal:{}},
  {id:'cl25',fecha:'2027-01-15',grupoResp:'CABALLEROS DEL CIELO',tema:'Estudio de las Dispensaciones',cal:{}},
  {id:'cl26',fecha:'2027-01-29',grupoResp:'EMANUEL',tema:'Estudio de las Dispensaciones',cal:{}},
  {id:'cl27',fecha:'2027-02-12',grupoResp:'EMBAJADORES DEL REY',tema:'Estudio de las Dispensaciones',cal:{}},
];

// Añade a DB.clases solo las fechas que falten; no modifica ni borra la clase del 13 feb.
function addClasesFaltantes(){
  if(!DB||!Array.isArray(DB.clases))return;
  const fechasEnDB=new Set(DB.clases.map(c=>c.fecha));
  SEED_CLASES.forEach(seed=>{
    if(fechasEnDB.has(seed.fecha))return;
    DB.clases.push({id:seed.id,fecha:seed.fecha,grupoResp:seed.grupoResp,tema:seed.tema||'Estudio de las Dispensaciones',cal:JSON.parse(JSON.stringify(seed.cal||{}))});
    fechasEnDB.add(seed.fecha);
  });
  DB.clases.sort((a,b)=>a.fecha.localeCompare(b.fecha));
}

const SEED_EVAL_DISPENSACIONES={
  id:'evq-dispensaciones',
  titulo:'Dispensaciones — Cuestionario',
  descripcion:'Cuestionario sobre el estudio de las dispensaciones (inmutabilidad de Dios, revelación progresiva, mayordomía, etc.).',
  activo:true,
  claseId:'cl1',
  preguntas:[
    {id:'disp1',texto:'¿Cómo explica el texto la relación entre la inmutabilidad de Dios y Sus diferentes formas de tratar con el hombre?',opciones:[{texto:'Dios cambia Su carácter dependiendo de la época histórica.',correcta:false},{texto:'Dios es el mismo siempre, pero Sus métodos de administración varían según el tiempo y el hombre.',correcta:true},{texto:'Dios trata a todos los hombres de la misma manera exacta desde Adán hasta hoy.',correcta:false},{texto:'La Biblia sugiere que Dios evoluciona a medida que el hombre aprende más.',correcta:false}]},
    {
      id:'disp2',
      texto:'¿Qué concepto describe que Dios no entrega toda Su verdad al hombre de una sola vez?',
      opciones:[
        {texto:'Inspiración plenaria',correcta:false},
        {texto:'Revelación progresiva',correcta:true},
        {texto:'Iluminación espiritual',correcta:false},
        {texto:'Tradición eclesiástica',correcta:false}
      ]
    },
    {
      id:'disp3',
      texto:'Según el texto, ¿cuál era la diferencia principal entre las tareas dadas a Noé y a Salomón?',
      opciones:[
        {texto:'Noé debía predicar y Salomón debía escribir proverbios.',correcta:false},
        {texto:'Noé tenía que construir un arca y Salomón un templo.',correcta:true},
        {texto:'Noé vivía bajo la ley y Salomón bajo la gracia.',correcta:false},
        {texto:'Noé no conocía a Dios y Salomón sí.',correcta:false}
      ]
    },
    {
      id:'disp4',
      texto:'¿Qué analogía utiliza el autor para explicar por qué Dios revela la verdad poco a poco?',
      opciones:[
        {texto:'Un sembrador que espera la cosecha.',correcta:false},
        {texto:'La alimentación de un bebé con leche y luego con carne.',correcta:true},
        {texto:'La construcción de una casa desde los cimientos.',correcta:false},
        {texto:'Un viaje por un camino que se ilumina con el sol.',correcta:false}
      ]
    },
    {
      id:'disp5',
      texto:'¿De qué libros consistía la Biblia que poseía Moisés?',
      opciones:[
        {texto:'Solo el Génesis.',correcta:false},
        {texto:'Génesis, Éxodo, Levítico, Números y Deuteronomio.',correcta:true},
        {texto:'El Antiguo Testamento completo.',correcta:false},
        {texto:'Moisés no tenía una Biblia escrita.',correcta:false}
      ]
    },
    {
      id:'disp6',
      texto:'¿Cuál era la situación de la Biblia para Juan el Bautista?',
      opciones:[
        {texto:'Tenía todo el Nuevo Testamento pero nada del Antiguo.',correcta:false},
        {texto:'Tenía todos los libros del Antiguo Testamento, pero ninguno del Nuevo.',correcta:true},
        {texto:'Solo tenía los Salmos y los Profetas.',correcta:false},
        {texto:'Su Biblia incluía los Evangelios porque conoció a Jesús.',correcta:false}
      ]
    },
    {
      id:'disp7',
      texto:'A pesar de las diferencias dispensacionales, ¿qué elemento ha sido siempre el mismo para la salvación de hombres como Abraham, David o nosotros?',
      opciones:[
        {texto:'La obediencia estricta a los diez mandamientos.',correcta:false},
        {texto:'La gracia de Dios por medio de la fe.',correcta:true},
        {texto:'El cumplimiento de los sacrificios de animales.',correcta:false},
        {texto:'La pertenencia a la nación de Israel.',correcta:false}
      ]
    },
    {
      id:'disp8',
      texto:'¿Cuál es la diferencia fundamental respecto al sacerdocio entre el Antiguo Testamento y la época actual?',
      opciones:[
        {texto:'En el pasado no había sacerdotes y ahora sí los hay.',correcta:false},
        {texto:'Antiguamente solo los hijos de Aarón eran sacerdotes; hoy todo creyente es un sacerdote.',correcta:true},
        {texto:'Hoy en día los pastores cumplen la misma función que los sacerdotes de Aarón.',correcta:false},
        {texto:'El sacerdocio ya no existe en ninguna forma.',correcta:false}
      ]
    },
    {
      id:'disp9',
      texto:'En cuanto a la dieta humana, ¿qué cambio ocurrió específicamente después del Diluvio según Génesis 9:2-3?',
      opciones:[
        {texto:'Dios prohibió comer todo tipo de plantas.',correcta:false},
        {texto:'Se permitió al hombre comer carne de animales.',correcta:true},
        {texto:'Se establecieron las leyes de alimentos limpios e inmundos.',correcta:false},
        {texto:'El hombre dejó de comer para alimentarse solo de maná.',correcta:false}
      ]
    },
    {
      id:'disp10',
      texto:'¿Qué distinción de grupos humanos surgió a partir del llamado de Abraham?',
      opciones:[
        {texto:'La división entre creyentes e incrédulos.',correcta:false},
        {texto:'La separación entre judíos y gentiles.',correcta:true},
        {texto:'La creación de la Iglesia de Dios.',correcta:false},
        {texto:'La división de la humanidad en diferentes lenguas.',correcta:false}
      ]
    },
    {
      id:'disp11',
      texto:'Según el texto, ¿qué cambio ocurrió respecto al Espíritu Santo en el día de Pentecostés?',
      opciones:[
        {texto:'El Espíritu Santo dejó de actuar en el mundo.',correcta:false},
        {texto:'El Espíritu pasó de estar “con” los discípulos a estar “en” ellos.',correcta:true},
        {texto:'El Espíritu Santo fue creado en ese momento.',correcta:false},
        {texto:'Solo los profetas recibieron al Espíritu en Pentecostés.',correcta:false}
      ]
    },
    {
      id:'disp12',
      texto:'Después del Arrebatamiento, ¿cuántos grupos de personas habrá en el mundo según la perspectiva dispensacional descrita?',
      opciones:[
        {texto:'Tres: Judíos, Gentiles y la Iglesia.',correcta:false},
        {texto:'Dos: Judíos y Gentiles.',correcta:true},
        {texto:'Solo uno: los que se queden en la tierra.',correcta:false},
        {texto:'Ninguno, la tierra quedará vacía.',correcta:false}
      ]
    },
    {
      id:'disp13',
      texto:'¿Qué cambio se espera en el comportamiento animal durante el Reino Milenial?',
      opciones:[
        {texto:'Los animales salvajes se extinguirán por completo.',correcta:false},
        {texto:'Los animales vivirán en paz y su naturaleza agresiva cambiará.',correcta:true},
        {texto:'Los animales dejarán de existir y solo habrá seres espirituales.',correcta:false},
        {texto:'No habrá cambios, la naturaleza seguirá bajo la ley del más fuerte.',correcta:false}
      ]
    },
    {
      id:'disp14',
      texto:'¿Cuál es el origen etimológico de la palabra griega “oikonomia”?',
      opciones:[
        {texto:'Proviene de palabras que significan “mensaje” y “salvación”.',correcta:false},
        {texto:'OIKOS (casa) y NOMOS (ley).',correcta:true},
        {texto:'DIS (dos) y PENSAR (meditar).',correcta:false},
        {texto:'THEOS (Dios) y LOGOS (palabra).',correcta:false}
      ]
    },
    {
      id:'disp15',
      texto:'Según 1ª Corintios 4:2, ¿cuál es el requisito esencial de un mayordomo?',
      opciones:[
        {texto:'Ser muy inteligente y talentoso.',correcta:false},
        {texto:'Ser hallado fiel.',correcta:true},
        {texto:'Tener una posición social elevada.',correcta:false},
        {texto:'Haber estudiado mucha geometría y álgebra.',correcta:false}
      ]
    },
    {
      id:'disp16',
      texto:'En el ejemplo de José y Potifar, ¿quién era el dueño y quién el administrador?',
      opciones:[
        {texto:'José era el dueño y Potifar el administrador.',correcta:false},
        {texto:'Potifar era el dueño y José el administrador.',correcta:true},
        {texto:'Ambos eran dueños por partes iguales.',correcta:false},
        {texto:'Dios era el dueño y ambos eran administradores por igual.',correcta:false}
      ]
    },
    {
      id:'disp17',
      texto:'En el marco de una dispensación, ¿qué representa “la casa” según el Salmo 24:1?',
      opciones:[
        {texto:'El edificio físico de una iglesia local.',correcta:false},
        {texto:'El mundo entero y la tierra.',correcta:true},
        {texto:'Solo la nación de Israel.',correcta:false},
        {texto:'El corazón individual de cada persona.',correcta:false}
      ]
    },
    {
      id:'disp18',
      texto:'¿Qué término utiliza el autor para definir a una persona que reconoce las diferencias importantes en el trato de Dios a través de la historia?',
      opciones:[
        {texto:'Un teólogo sistemático.',correcta:false},
        {texto:'Un dispensacionalista.',correcta:true},
        {texto:'Un reformador.',correcta:false},
        {texto:'Un historiador bíblico.',correcta:false}
      ]
    },
    {
      id:'disp19',
      texto:'¿Cuál es la responsabilidad del “mayordomo” en el esquema de las dispensaciones?',
      opciones:[
        {texto:'Crear sus propias leyes para la casa.',correcta:false},
        {texto:'Manejar fielmente lo que Dios ha puesto en sus manos.',correcta:true},
        {texto:'Convertirse en el dueño de la propiedad tras un tiempo de servicio.',correcta:false},
        {texto:'Decidir qué partes de la Biblia aplicar y cuáles ignorar.',correcta:false}
      ]
    },
    {
      id:'disp20',
      texto:'¿Qué ocurrió con la duración de los lenguajes en la tierra después del juicio de Babel?',
      opciones:[
        {texto:'La gente dejó de hablar para comunicarse por señas.',correcta:false},
        {texto:'La humanidad pasó de tener un solo lenguaje a tener muchos lenguajes.',correcta:true},
        {texto:'Dios unificó todos los dialectos en una sola lengua perfecta.',correcta:false},
        {texto:'Los lenguajes solo cambiaron para los que construían la torre.',correcta:false}
      ]
    },
    {
      id:'disp21',
      texto:'Antes de la Cruz, bajo la ley de Moisés, había reglas dietéticas estrictas. ¿Qué pasaje se cita para mostrar el cambio después de la Cruz?',
      opciones:[
        {texto:'Levítico 11',correcta:false},
        {texto:'1ª Timoteo 4:3-5',correcta:true},
        {texto:'Génesis 1:29',correcta:false},
        {texto:'Éxodo 20',correcta:false}
      ]
    },
    {
      id:'disp22',
      texto:'¿Qué diferencia existe en la orden de predicar entre Mateo 10 y Mateo 28?',
      opciones:[
        {texto:'En Mateo 10 debían ir a todo el mundo; en el 28 solo a Israel.',correcta:false},
        {texto:'En Mateo 10 la orden era limitada a Israel; en el 28 es para todas las naciones.',correcta:true},
        {texto:'No hay ninguna diferencia, la orden siempre fue la misma.',correcta:false},
        {texto:'En Mateo 10 se les prohibió hablar y en el 28 se les obligó.',correcta:false}
      ]
    },
    {
      id:'disp23',
      texto:'¿Quién fue el hombre que escribió el último libro del Nuevo Testamento, completando así la Biblia?',
      opciones:[
        {texto:'El apóstol Pablo.',correcta:false},
        {texto:'El apóstol Juan.',correcta:true},
        {texto:'Pedro.',correcta:false},
        {texto:'Moisés.',correcta:false}
      ]
    },
    {
      id:'disp24',
      texto:'Antes del Diluvio, ¿existía la pena capital para los asesinos según el caso de Caín?',
      opciones:[
        {texto:'Sí, Dios ordenó matar a quien matara a otro.',correcta:false},
        {texto:'No, Dios prohibió que alguien matara al asesino Caín.',correcta:true},
        {texto:'Solo se aplicaba si el asesino no se arrepentía.',correcta:false},
        {texto:'La pena capital existía desde la caída de Adán.',correcta:false}
      ]
    },
    {
      id:'disp25',
      texto:'¿En cuántas ocasiones aparece la palabra “dispensación” en el Nuevo Testamento según el texto?',
      opciones:[
        {texto:'10 veces.',correcta:false},
        {texto:'4 veces.',correcta:true},
        {texto:'Ninguna, es un invento moderno.',correcta:false},
        {texto:'Solo una vez en el Apocalipsis.',correcta:false}
      ]
    },
    {
      id:'disp26',
      texto:'¿Qué simboliza el cambio del Sábado al Domingo en la era después de la Cruz?',
      opciones:[
        {texto:'Un error de los primeros cristianos al contar los días.',correcta:false},
        {texto:'Un cambio administrativo tras la resurrección de Cristo.',correcta:true},
        {texto:'Una imposición de los gentiles para diferenciarse de los judíos.',correcta:false},
        {texto:'Que el Sábado ahora dura dos días en lugar de uno.',correcta:false}
      ]
    }
  ]
};

// Cuestionario Dispensaciones (Introducción) — 26 preguntas (original)
const SEED_EVAL_DISPENSACIONES_CUESTIONARIO={
  id:'evq-dispensaciones-cuestionario',
  titulo:'Dispensaciones — Cuestionario (Introducción)',
  descripcion:'Cuestionario sobre el estudio de las dispensaciones: inmutabilidad de Dios, revelación progresiva, mayordomía, sacerdocio, etc.',
  activo:true,
  claseId:'',
  preguntas:[
    {id:'dc1',texto:'¿Cómo explica el texto la relación entre la inmutabilidad de Dios y Sus diferentes formas de tratar con el hombre?',opciones:[{texto:'Dios cambia Su carácter dependiendo de la época histórica.',correcta:false},{texto:'Dios es el mismo siempre, pero Sus métodos de administración varían según el tiempo y el hombre.',correcta:true},{texto:'Dios trata a todos los hombres de la misma manera exacta desde Adán hasta hoy.',correcta:false},{texto:'La Biblia sugiere que Dios evoluciona a medida que el hombre aprende más.',correcta:false}]},
    {id:'dc2',texto:'¿Qué concepto describe que Dios no entrega toda Su verdad al hombre de una sola vez?',opciones:[{texto:'Inspiración plenaria',correcta:false},{texto:'Revelación progresiva',correcta:true},{texto:'Iluminación espiritual',correcta:false},{texto:'Tradición eclesiástica',correcta:false}]},
    {id:'dc3',texto:'Según el texto, ¿cuál era la diferencia principal entre las tareas dadas a Noé y a Salomón?',opciones:[{texto:'Noé debía predicar y Salomón debía escribir proverbios.',correcta:false},{texto:'Noé tenía que construir un arca y Salomón un templo.',correcta:true},{texto:'Noé vivía bajo la ley y Salomón bajo la gracia.',correcta:false},{texto:'Noé no conocía a Dios y Salomón sí.',correcta:false}]},
    {id:'dc4',texto:'¿Qué analogía utiliza el autor para explicar por qué Dios revela la verdad poco a poco?',opciones:[{texto:'Un sembrador que espera la cosecha.',correcta:false},{texto:'La alimentación de un bebé con leche y luego con carne.',correcta:true},{texto:'La construcción de una casa desde los cimientos.',correcta:false},{texto:'Un viaje por un camino que se ilumina con el sol.',correcta:false}]},
    {id:'dc5',texto:'¿De qué libros consistía la Biblia que poseía Moisés?',opciones:[{texto:'Solo el Génesis.',correcta:false},{texto:'Génesis, Éxodo, Levítico, Números y Deuteronomio.',correcta:true},{texto:'El Antiguo Testamento completo.',correcta:false},{texto:'Moisés no tenía una Biblia escrita.',correcta:false}]},
    {id:'dc6',texto:'¿Cuál era la situación de la Biblia para Juan el Bautista?',opciones:[{texto:'Tenía todo el Nuevo Testamento pero nada del Antiguo.',correcta:false},{texto:'Tenía todos los libros del Antiguo Testamento, pero ninguno del Nuevo.',correcta:true},{texto:'Solo tenía los Salmos y los Profetas.',correcta:false},{texto:'Su Biblia incluía los Evangelios porque conoció a Jesús.',correcta:false}]},
    {id:'dc7',texto:'A pesar de las diferencias dispensacionales, ¿qué elemento ha sido siempre el mismo para la salvación de hombres como Abraham, David o nosotros?',opciones:[{texto:'La obediencia estricta a los diez mandamientos.',correcta:false},{texto:'La gracia de Dios por medio de la fe.',correcta:true},{texto:'El cumplimiento de los sacrificios de animales.',correcta:false},{texto:'La pertenencia a la nación de Israel.',correcta:false}]},
    {id:'dc8',texto:'¿Cuál es la diferencia fundamental respecto al sacerdocio entre el Antiguo Testamento y la época actual?',opciones:[{texto:'En el pasado no había sacerdotes y ahora sí los hay.',correcta:false},{texto:'Antiguamente solo los hijos de Aarón eran sacerdotes; hoy todo creyente es un sacerdote.',correcta:true},{texto:'Hoy en día los pastores cumplen la misma función que los sacerdotes de Aarón.',correcta:false},{texto:'El sacerdocio ya no existe en ninguna forma.',correcta:false}]},
    {id:'dc9',texto:'En cuanto a la dieta humana, ¿qué cambio ocurrió específicamente después del Diluvio según Génesis 9:2-3?',opciones:[{texto:'Dios prohibió comer todo tipo de plantas.',correcta:false},{texto:'Se permitió al hombre comer carne de animales.',correcta:true},{texto:'Se establecieron las leyes de alimentos limpios e inmundos.',correcta:false},{texto:'El hombre dejó de comer para alimentarse solo de maná.',correcta:false}]},
    {id:'dc10',texto:'¿Qué distinción de grupos humanos surgió a partir del llamado de Abraham?',opciones:[{texto:'La división entre creyentes e incrédulos.',correcta:false},{texto:'La separación entre judíos y gentiles.',correcta:true},{texto:'La creación de la Iglesia de Dios.',correcta:false},{texto:'La división de la humanidad en diferentes lenguas.',correcta:false}]},
    {id:'dc11',texto:'Según el texto, ¿qué cambio ocurrió respecto al Espíritu Santo en el día de Pentecostés?',opciones:[{texto:'El Espíritu Santo dejó de actuar en el mundo.',correcta:false},{texto:'El Espíritu pasó de estar "con" los discípulos a estar "en" ellos.',correcta:true},{texto:'El Espíritu Santo fue creado en ese momento.',correcta:false},{texto:'Solo los profetas recibieron al Espíritu en Pentecostés.',correcta:false}]},
    {id:'dc12',texto:'Después del Arrebatamiento, ¿cuántos grupos de personas habrá en el mundo según la perspectiva dispensacional descrita?',opciones:[{texto:'Tres: Judíos, Gentiles y la Iglesia.',correcta:false},{texto:'Dos: Judíos y Gentiles.',correcta:true},{texto:'Solo uno: los que se queden en la tierra.',correcta:false},{texto:'Ninguno, la tierra quedará vacía.',correcta:false}]},
    {id:'dc13',texto:'¿Qué cambio se espera en el comportamiento animal durante el Reino Milenial?',opciones:[{texto:'Los animales salvajes se extinguirán por completo.',correcta:false},{texto:'Los animales vivirán en paz y su naturaleza agresiva cambiará.',correcta:true},{texto:'Los animales dejarán de existir y solo habrá seres espirituales.',correcta:false},{texto:'No habrá cambios, la naturaleza seguirá bajo la ley del más fuerte.',correcta:false}]},
    {id:'dc14',texto:'¿Cuál es el origen etimológico de la palabra griega "oikonomia"?',opciones:[{texto:'Proviene de palabras que significan "mensaje" y "salvación".',correcta:false},{texto:'OIKOS (casa) y NOMOS (ley).',correcta:true},{texto:'DIS (dos) y PENSAR (meditar).',correcta:false},{texto:'THEOS (Dios) y LOGOS (palabra).',correcta:false}]},
    {id:'dc15',texto:'Según 1ª Corintios 4:2, ¿cuál es el requisito esencial de un mayordomo?',opciones:[{texto:'Ser muy inteligente y talentoso.',correcta:false},{texto:'Ser hallado fiel.',correcta:true},{texto:'Tener una posición social elevada.',correcta:false},{texto:'Haber estudiado mucha geometría y álgebra.',correcta:false}]},
    {id:'dc16',texto:'En el ejemplo de José y Potifar, ¿quién era el dueño y quién el administrador?',opciones:[{texto:'José era el dueño y Potifar el administrador.',correcta:false},{texto:'Potifar era el dueño y José el administrador.',correcta:true},{texto:'Ambos eran dueños por partes iguales.',correcta:false},{texto:'Dios era el dueño y ambos eran administradores por igual.',correcta:false}]},
    {id:'dc17',texto:'En el marco de una dispensación, ¿qué representa "la casa" según el Salmo 24:1?',opciones:[{texto:'El edificio físico de una iglesia local.',correcta:false},{texto:'El mundo entero y la tierra.',correcta:true},{texto:'Solo la nación de Israel.',correcta:false},{texto:'El corazón individual de cada persona.',correcta:false}]},
    {id:'dc18',texto:'¿Qué término utiliza el autor para definir a una persona que reconoce las diferencias importantes en el trato de Dios a través de la historia?',opciones:[{texto:'Un teólogo sistemático.',correcta:false},{texto:'Un dispensacionalista.',correcta:true},{texto:'Un reformador.',correcta:false},{texto:'Un historiador bíblico.',correcta:false}]},
    {id:'dc19',texto:'¿Cuál es la responsabilidad del "mayordomo" en el esquema de las dispensaciones?',opciones:[{texto:'Crear sus propias leyes para la casa.',correcta:false},{texto:'Manejar fielmente lo que Dios ha puesto en sus manos.',correcta:true},{texto:'Convertirse en el dueño de la propiedad tras un tiempo de servicio.',correcta:false},{texto:'Decidir qué partes de la Biblia aplicar y cuáles ignorar.',correcta:false}]},
    {id:'dc20',texto:'¿Qué ocurrió con la duración de los lenguajes en la tierra después del juicio de Babel?',opciones:[{texto:'La gente dejó de hablar para comunicarse por señas.',correcta:false},{texto:'La humanidad pasó de tener un solo lenguaje a tener muchos lenguajes.',correcta:true},{texto:'Dios unificó todos los dialectos en una sola lengua perfecta.',correcta:false},{texto:'Los lenguajes solo cambiaron para los que construían la torre.',correcta:false}]},
    {id:'dc21',texto:'Antes de la Cruz, bajo la ley de Moisés, había reglas dietéticas estrictas. ¿Qué pasaje se cita para mostrar el cambio después de la Cruz?',opciones:[{texto:'Levítico 11',correcta:false},{texto:'1ª Timoteo 4:3-5',correcta:true},{texto:'Génesis 1:29',correcta:false},{texto:'Éxodo 20',correcta:false}]},
    {id:'dc22',texto:'¿Qué diferencia existe en la orden de predicar entre Mateo 10 y Mateo 28?',opciones:[{texto:'En Mateo 10 debían ir a todo el mundo; en el 28 solo a Israel.',correcta:false},{texto:'En Mateo 10 la orden era limitada a Israel; en el 28 es para todas las naciones.',correcta:true},{texto:'No hay ninguna diferencia, la orden siempre fue la misma.',correcta:false},{texto:'En Mateo 10 se les prohibió hablar y en el 28 se les obligó.',correcta:false}]},
    {id:'dc23',texto:'¿Quién fue el hombre que escribió el último libro del Nuevo Testamento, completando así la Biblia?',opciones:[{texto:'El apóstol Pablo.',correcta:false},{texto:'El apóstol Juan.',correcta:true},{texto:'Pedro.',correcta:false},{texto:'Moisés.',correcta:false}]},
    {id:'dc24',texto:'Antes del Diluvio, ¿existía la pena capital para los asesinos según el caso de Caín?',opciones:[{texto:'Sí, Dios ordenó matar a quien matara a otro.',correcta:false},{texto:'No, Dios prohibió que alguien matara al asesino Caín.',correcta:true},{texto:'Solo se aplicaba si el asesino no se arrepentía.',correcta:false},{texto:'La pena capital existía desde la caída de Adán.',correcta:false}]},
    {id:'dc25',texto:'¿En cuántas ocasiones aparece la palabra "dispensación" en el Nuevo Testamento según el texto?',opciones:[{texto:'10 veces.',correcta:false},{texto:'4 veces.',correcta:true},{texto:'Ninguna, es un invento moderno.',correcta:false},{texto:'Solo una vez en el Apocalipsis.',correcta:false}]},
    {id:'dc26',texto:'¿Qué simboliza el cambio del Sábado al Domingo en la era después de la Cruz?',opciones:[{texto:'Un error de los primeros cristianos al contar los días.',correcta:false},{texto:'Un cambio administrativo tras la resurrección de Cristo.',correcta:true},{texto:'Una imposición de los gentiles para diferenciarse de los judíos.',correcta:false},{texto:'Que el Sábado ahora dura dos días en lugar de uno.',correcta:false}]}
  ]
};

// Cuestionario Dispensaciones — Texto (desde Dispensaciones Cuestionario (1).json) — 28 preguntas — vinculado a clase 27 feb
const SEED_EVAL_DISPENSACIONES_TEXTO={
  id:'evq-dispensaciones-texto',
  titulo:'Dispensaciones — Cuestionario (Texto)',
  descripcion:'Cuestionario sobre el estudio de las dispensaciones: gobierno de Dios, revelación progresiva, mayordomía, interpretación literal, etc.',
  activo:true,
  claseId:'cl2',
  preguntas:[
    {id:'dt1',texto:'¿Qué significa fundamentalmente el término \'dispensación\' según el texto?',opciones:[{texto:'Un periodo de tiempo donde las leyes de la naturaleza cambian.',correcta:false},{texto:'La manera en que Dios gobierna su casa en diferentes tiempos.',correcta:true},{texto:'Un pacto secreto que solo los profetas podían entender.',correcta:false},{texto:'La salvación automática de todas las personas en una época.',correcta:false}]},
    {id:'dt2',texto:'En la ilustración del Sr. Jones, ¿por qué el hijo de 20 años tiene reglas diferentes a las del hijo de 10 años?',opciones:[{texto:'Porque el padre ama más al hijo mayor.',correcta:false},{texto:'Porque el hijo mayor tiene más privilegios pero también más responsabilidades.',correcta:true},{texto:'Porque las reglas del hogar original fueron un fracaso total.',correcta:false},{texto:'Porque el hijo de 20 años ya no está sujeto a la autoridad de su padre.',correcta:false}]},
    {id:'dt3',texto:'¿Qué elemento permaneció igual para Noé, David y Pablo según el estudio de las dispensaciones?',opciones:[{texto:'La obligación de guardar el día sábado.',correcta:false},{texto:'La necesidad de ofrecer sacrificios de animales.',correcta:false},{texto:'El privilegio y la responsabilidad de creer lo que Dios había dicho.',correcta:true},{texto:'La práctica de la circuncisión de los hijos varones.',correcta:false}]},
    {id:'dt4',texto:'¿Cuál es la cuarta etapa que se debe considerar en el análisis de cada dispensación?',opciones:[{texto:'El premio de la vida eterna.',correcta:false},{texto:'El juicio de Dios.',correcta:true},{texto:'La desaparición de la conciencia humana.',correcta:false},{texto:'La abolición de toda ley previa.',correcta:false}]},
    {id:'dt5',texto:'Según el texto, ¿qué caracteriza a la dispensación del \'Reino\'?',opciones:[{texto:'Es el tiempo actual en el que vive la Iglesia.',correcta:false},{texto:'Cristo mismo reinará sobre las naciones desde el trono de David.',correcta:true},{texto:'Es un estado puramente espiritual en el cielo sin relación con la tierra.',correcta:false},{texto:'Termina con la desaparición total del gobierno de Dios.',correcta:false}]},
    {id:'dt6',texto:'¿Cómo interpreta un dispensacionalista la frase \'mil años\' en Apocalipsis 20?',opciones:[{texto:'Como un símbolo de un periodo muy largo e indefinido.',correcta:false},{texto:'Como exactamente mil años, en su sentido literal y normal.',correcta:true},{texto:'Como una representación de la era de la Iglesia que ya dura dos mil años.',correcta:false},{texto:'Como el tiempo que tarda el evangelio en llegar a todo el mundo.',correcta:false}]},
    {id:'dt7',texto:'¿Cuál es el error principal que el autor señala en la \'Teología del Pacto\'?',opciones:[{texto:'Creer que la fe es necesaria para la salvación.',correcta:false},{texto:'Usar términos como \'Pacto de Obras\' que no se encuentran literalmente en la Biblia.',correcta:true},{texto:'Negar que Adán desobedeció a Dios en el Edén.',correcta:false},{texto:'Enseñar que Dios es un Dios de gracia y misericordia.',correcta:false}]},
    {id:'dt8',texto:'Según el texto, ¿cuándo comenzó la Iglesia?',opciones:[{texto:'Con el llamamiento de Abraham en el Antiguo Testamento.',correcta:false},{texto:'Cuando el Espíritu Santo vino en el día de Pentecostés.',correcta:true},{texto:'Desde el principio de la creación con Adán y Eva.',correcta:false},{texto:'En Hechos Capítulo 28, al final del ministerio de Pablo.',correcta:false}]},
    {id:'dt9',texto:'Si una palabra en la Biblia se usa en sentido metafórico, como cuando Jesús dice \'Yo soy la puerta\', ¿cómo debe entenderse?',opciones:[{texto:'Como un código secreto que requiere un decodificador especial.',correcta:false},{texto:'Como una figura de lenguaje donde el sentido literal no tendría coherencia.',correcta:true},{texto:'Como una prueba de que nada en la Biblia debe tomarse literalmente.',correcta:false},{texto:'Como un error de traducción de los idiomas originales.',correcta:false}]},
    {id:'dt10',texto:'¿Cuál es la diferencia fundamental entre un Israelita y un Gentil según el material?',opciones:[{texto:'Su nivel de santidad personal ante Dios.',correcta:false},{texto:'Su descendencia física de la línea de Abraham, Isaac y Jacob.',correcta:true},{texto:'Que los israelitas son salvos y los gentiles están perdidos.',correcta:false},{texto:'El idioma que hablaban originalmente en el jardín del Edén.',correcta:false}]},
    {id:'dt11',texto:'En el ultra-dispensacionalismo, ¿qué práctica común de la iglesia suele decirse que \'no es para hoy\'?',opciones:[{texto:'La lectura de las epístolas de Pablo.',correcta:false},{texto:'El bautismo en agua.',correcta:true},{texto:'La creencia en la resurrección de los muertos.',correcta:false},{texto:'La oración dirigida directamente al Padre.',correcta:false}]},
    {id:'dt12',texto:'¿Cuál es el tema unificador de toda la Biblia según el punto de vista dispensacionalista?',opciones:[{texto:'La evolución del pensamiento humano sobre la religión.',correcta:false},{texto:'La gloria de Dios.',correcta:true},{texto:'Únicamente la salvación del mayor número posible de personas.',correcta:false},{texto:'El establecimiento de un sistema político perfecto en la tierra.',correcta:false}]},
    {id:'dt13',texto:'¿Por qué el autor afirma que la salvación del hombre no puede ser el propósito principal de Dios?',opciones:[{texto:'Porque Dios no desea que todos los hombres sean salvos.',correcta:false},{texto:'Porque si lo fuera, Dios habría fracasado en los días de Noé al salvar solo a ocho personas.',correcta:true},{texto:'Porque la Biblia enseña que la mayoría de la gente se salvará al final.',correcta:false},{texto:'Porque Dios prefiere juzgar a los hombres que mostrarles su gracia.',correcta:false}]},
    {id:'dt14',texto:'¿Qué demostró Dios al mundo durante la dispensación de Noé (Gobierno Humano)?',opciones:[{texto:'Que el hombre es capaz de gobernarse a sí mismo sin pecado.',correcta:false},{texto:'Que Él es un Dios santo que juzga el pecado y un Dios de gracia para el que cree.',correcta:true},{texto:'Que ya no se necesitarían más revelaciones en el futuro.',correcta:false},{texto:'Que el sacrificio de animales era opcional para los patriarcas.',correcta:false}]},
    {id:'dt15',texto:'Al analizar el uso de la palabra \'día\' en Génesis 1, ¿qué factor asegura que se refiere a 24 horas?',opciones:[{texto:'El hecho de que Dios sea todopoderoso y no necesite más tiempo.',correcta:false},{texto:'El uso de la palabra en plural y acompañada de un número (ej. \'seis días\').',correcta:true},{texto:'Que en ese tiempo la Tierra giraba mucho más rápido sobre su eje.',correcta:false},{texto:'Que la palabra hebrea para \'día\' nunca puede significar un periodo largo.',correcta:false}]},
    {id:'dt16',texto:'¿Cuál es la relación entre los privilegios y las responsabilidades en una dispensación?',opciones:[{texto:'Son inversamente proporcionales; a más privilegios, menos reglas.',correcta:false},{texto:'Van unidos; Dios pone Su verdad en manos del hombre esperando una mayordomía fiel.',correcta:true},{texto:'Los privilegios son solo para los líderes, mientras que las responsabilidades son para el pueblo.',correcta:false},{texto:'No tienen relación alguna, pues la gracia de Dios elimina toda responsabilidad.',correcta:false}]},
    {id:'dt17',texto:'En el diagrama del cronograma bíblico, ¿qué evento marca el final de la \'Edad de la Iglesia\' en la tierra?',opciones:[{texto:'La muerte física de todos los creyentes.',correcta:false},{texto:'El Rapto de la Iglesia.',correcta:true},{texto:'La reconstrucción del templo de Jerusalén.',correcta:false},{texto:'La conversión nacional de Israel.',correcta:false}]},
    {id:'dt18',texto:'¿Qué significa que haya un \'PROGRESO EN LA REVELACIÓN\'?',opciones:[{texto:'Que Dios va cambiando de opinión sobre lo que es pecado.',correcta:false},{texto:'Que Dios revela la verdad al hombre de forma gradual y progresiva a través de la historia.',correcta:true},{texto:'Que los hombres modernos son más inteligentes que los personajes bíblicos.',correcta:false},{texto:'Que la Biblia se escribe sola a medida que el hombre descubre nuevas leyes científicas.',correcta:false}]},
    {id:'dt19',texto:'Al comparar a David y Pablo, ¿qué cambio notable ocurrió respecto a los sacrificios?',opciones:[{texto:'David no necesitaba sacrificar animales, pero Pablo sí.',correcta:false},{texto:'David debía ofrecer sacrificios de animales, pero para Pablo ya no eran necesarios.',correcta:true},{texto:'Ambos tenían prohibido terminantemente ofrecer cualquier tipo de sacrificio.',correcta:false},{texto:'Solo Pablo entendía que los animales debían ser sacrificados en el templo de Jerusalén.',correcta:false}]},
    {id:'dt20',texto:'Un dispensacionalista distingue cambios importantes después de ciertos eventos. ¿Cuál de estos eventos NO es mencionado como un punto de cambio?',opciones:[{texto:'La caída del hombre.',correcta:false},{texto:'El juicio de la torre de Babel.',correcta:false},{texto:'El descubrimiento de los manuscritos del Mar Muerto.',correcta:true},{texto:'La muerte y resurrección de Cristo.',correcta:false}]},
    {id:'dt21',texto:'Según el texto, ¿por qué es incorrecto decir que David formaba parte de \'la Iglesia\'?',opciones:[{texto:'Porque David no era un hombre salvado por Dios.',correcta:false},{texto:'Porque la Iglesia no comenzó hasta que el Espíritu Santo vino en Pentecostés.',correcta:true},{texto:'Porque David pertenecía a una raza diferente a la de los miembros de la Iglesia.',correcta:false},{texto:'Porque David nunca creyó en las promesas futuras de Dios.',correcta:false}]},
    {id:'dt22',texto:'Al leer la Biblia, ¿qué recomienda el autor hacer cuando el sentido \'llano\' tiene coherencia?',opciones:[{texto:'Buscar un significado espiritual oculto detrás de las palabras.',correcta:false},{texto:'No buscar otro sentido para no terminar en un \'sinsentido\'.',correcta:true},{texto:'Consultar un diccionario de símbolos para descifrar el mensaje.',correcta:false},{texto:'Asumir que es una metáfora hasta que se demuestre lo contrario.',correcta:false}]},
    {id:'dt23',texto:'¿Cuál de estos personajes vivió bajo la dispensación de la \'Ley\'?',opciones:[{texto:'Adán.',correcta:false},{texto:'Juan el Bautista.',correcta:true},{texto:'Noé.',correcta:false},{texto:'Pablo.',correcta:false}]},
    {id:'dt24',texto:'En la analogía de la carta de un amigo, ¿qué punto intenta ilustrar el autor?',opciones:[{texto:'Que las cartas antiguas son difíciles de entender hoy.',correcta:false},{texto:'Que entendemos el lenguaje de forma natural y literal sin buscar significados extraños.',correcta:true},{texto:'Que las metáforas son la base de toda comunicación personal.',correcta:false},{texto:'Que la Biblia es como una carta de amor que no requiere reglas de interpretación.',correcta:false}]},
    {id:'dt25',texto:'¿Cómo se resuelve la aparente contradicción de que la Iglesia ya existía cuando Pablo se convirtió?',opciones:[{texto:'Se asume que Pablo perseguía a un grupo político, no religioso.',correcta:false},{texto:'Se entiende que no se puede perseguir algo que no existe, por lo que la Iglesia debió empezar antes.',correcta:true},{texto:'Se concluye que hubo dos Iglesias diferentes en el Nuevo Testamento.',correcta:false},{texto:'Se acepta que el término \'iglesia\' en esos versículos es un error de los copistas.',correcta:false}]},
    {id:'dt26',texto:'En la dispensación de la Gracia, ¿cuál es la responsabilidad principal del hombre?',opciones:[{texto:'Cumplir los diez mandamientos para ser salvo.',correcta:false},{texto:'Creer en el Salvador y ser un fiel mayordomo de la verdad recibida.',correcta:true},{texto:'Regresar a los sacrificios de animales como señal de humildad.',correcta:false},{texto:'Establecer un gobierno humano perfecto en la tierra antes del rapto.',correcta:false}]},
    {id:'dt27',texto:'¿Qué ocurre al final de cada dispensación debido al fracaso del hombre?',opciones:[{texto:'Dios decide ignorar el pecado y empezar de nuevo sin consecuencias.',correcta:false},{texto:'Un juicio de Dios sobre la humanidad o el grupo responsable.',correcta:true},{texto:'El hombre evoluciona automáticamente a un estado de mayor pureza.',correcta:false},{texto:'Dios retira toda posibilidad de salvación para las generaciones futuras.',correcta:false}]},
    {id:'dt28',texto:'¿Cuál es la postura del \'Premilenarismo\' mencionada al final del texto?',opciones:[{texto:'Que Jesús vuelve después de que el hombre establezca el reino.',correcta:false},{texto:'Que Jesús vuelve a la tierra ANTES del milenio (mil años).',correcta:true},{texto:'Que no habrá un reinado literal de Cristo en la tierra jamás.',correcta:false},{texto:'Que el milenio ya ocurrió en el pasado durante el Imperio Romano.',correcta:false}]}
  ]
};

// Asegura que la estructura de DB tenga todos los campos esperados (nunca borrar datos válidos)
function ensureDbShape(){
  if(!DB)DB={};
  if(DB.adminPw===undefined||DB.adminPw===null||DB.adminPw==='')DB.adminPw='1234';
  if(typeof window!=='undefined')window.DB=DB;
  if(!Array.isArray(DB.caballeros))DB.caballeros=[];
  else DB.caballeros=DB.caballeros.filter(c=>c&&typeof c==='object');
  if(!Array.isArray(DB.clases))DB.clases=[];
  try{
  DB.caballeros.forEach(c=>{
    if(!c||typeof c!=='object')return;
    if(c.pw===undefined)c.pw='';
    if(c.fnac===undefined)c.fnac='';
    if(c.fechaBautizado===undefined)c.fechaBautizado='';
    if(c.fechaSellado===undefined)c.fechaSellado='';
    if(c.campamentoRespuesta===undefined)c.campamentoRespuesta='';
    if(c.telefono===undefined)c.telefono='';
    if(c.nombreMostrar===undefined)c.nombreMostrar='';
    if(c.ciudadNacimiento===undefined)c.ciudadNacimiento='';
    if(c.paisNacimiento===undefined)c.paisNacimiento='';
    if(c.lema===undefined)c.lema='';
    if(c.profesionOficio===undefined)c.profesionOficio='';
    if(c.anioConversion===undefined)c.anioConversion='';
    if(c.iglesiaProcedencia===undefined)c.iglesiaProcedencia='';
    if(c.gustosAficiones===undefined)c.gustosAficiones='';
    if(c.rolActual===undefined)c.rolActual='';
    if(c.estadoCivil===undefined)c.estadoCivil='';
    if(c.tieneHijos===undefined)c.tieneHijos='';
    if(c.numHijos===undefined)c.numHijos='';
    if(c.infoHijos===undefined)c.infoHijos='';
    if(!Array.isArray(c.ocultarAOtros))c.ocultarAOtros=[];
    if(c.honorPuntos===undefined)c.honorPuntos=0;
    if(c.honorRacha===undefined)c.honorRacha=0;
    if(c.honorLastFecha===undefined)c.honorLastFecha='';
    if(c.honorDesafioIntentosHoy===undefined)c.honorDesafioIntentosHoy=0;
    if(c.honorDesafioFechaIntentos===undefined)c.honorDesafioFechaIntentos='';
    if(c.honorDesafioMejorPuntosHoy===undefined)c.honorDesafioMejorPuntosHoy=0;
    if(c.honorDesafioPuntosSumadosHoy===undefined)c.honorDesafioPuntosSumadosHoy=0;
    if(c.honorDesafioFechaPuntosSumados===undefined)c.honorDesafioFechaPuntosSumados='';
    if(!Array.isArray(c.honorPreguntasAcertadasIds))c.honorPreguntasAcertadasIds=[];
  });
  }catch(e){ console.error('ensureDbShape caballeros:',e); }
  if(!Array.isArray(DB.peticiones))DB.peticiones=[];
  if(!Array.isArray(DB.eventos))DB.eventos=JSON.parse(JSON.stringify(SEED_EVENTOS));
  if(!DB.eventosCultosOverride)DB.eventosCultosOverride={};
  if(!DB.eventosEstudiosOverride)DB.eventosEstudiosOverride={};
  if(!DB.finanzasGastos)DB.finanzasGastos=[];
  if(!DB.finanzasActividades)DB.finanzasActividades=[];
  if(!DB.finanzasDonativos)DB.finanzasDonativos=[];
  if(!DB.finanzasVotos)DB.finanzasVotos=[];
  if(!Array.isArray(DB.evaluaciones))DB.evaluaciones=[];
  if(!Array.isArray(DB.evaluacionRespuestas))DB.evaluacionRespuestas=[];
  // Solo AÑADIR evaluaciones si no existen; NUNCA sobrescribir las que el admin ya editó (nombres, preguntas eliminadas, etc.)
  if(Array.isArray(DB.evaluaciones)&&SEED_EVAL_DISPENSACIONES){
    const idx=DB.evaluaciones.findIndex(e=>e.id===SEED_EVAL_DISPENSACIONES.id);
    if(idx<0){DB.evaluaciones.push(JSON.parse(JSON.stringify(SEED_EVAL_DISPENSACIONES)));saveDB().then(()=>{}).catch(()=>{});}
  }
  // Solo los dos cuestionarios vinculados a clases (cl1 y cl2); no auto-crear el tercero (CUESTIONARIO sin clase)
  if(Array.isArray(DB.evaluaciones)&&SEED_EVAL_DISPENSACIONES_TEXTO){
    const idx=DB.evaluaciones.findIndex(e=>e.id===SEED_EVAL_DISPENSACIONES_TEXTO.id);
    if(idx<0){DB.evaluaciones.push(JSON.parse(JSON.stringify(SEED_EVAL_DISPENSACIONES_TEXTO)));saveDB().then(()=>{}).catch(()=>{});}
  }
  if(DB.adminNombre===undefined)DB.adminNombre='';
  if(DB.adminPhoto===undefined)DB.adminPhoto='';
  if(!Array.isArray(DB.materialEstudio))DB.materialEstudio=[];
  if(!Array.isArray(DB.appHistorial))DB.appHistorial=[];
  if(!Array.isArray(DB.desafiosDiarios))DB.desafiosDiarios=[];
  addClasesFaltantes();
  // Anexar material al primer estudio (13 feb / cl1) si no tiene
  const cl1=Array.isArray(DB.clases)?DB.clases.find(c=>c.id==='cl1'||c.fecha==='2026-02-13'):null;
  if(cl1&&!cl1.materialId){
    const matId='mat_cl1';
    if(!(DB.materialEstudio||[]).some(m=>m.id===matId)){
      DB.materialEstudio.push({id:matId,titulo:'Estudio 13 feb',url:'',orden:(DB.materialEstudio||[]).length});
    }
    cl1.materialId=matId;
  }
}

// ═══════════════════════════════════════════════════════════════
// SEED EVENTOS
// ═══════════════════════════════════════════════════════════════
const SEED_EVENTOS=[
  {id:'ev1',nombre:'Vigilia (Pro recepción del Espíritu Santo)',fecha:'2026-04-03',fechaFin:'',icono:'🕯️',color:'#8b5cf6',nota:''},
  {id:'ev2',nombre:'Congreso Nacional',fecha:'2026-04-18',fechaFin:'',icono:'🏟️',color:'#ef4444',nota:'Lema: El fruto del Espíritu Santo'},
  {id:'ev3',nombre:'Culto dirigido por los niños',fecha:'2026-05-26',fechaFin:'',icono:'👧',color:'#f59e0b',nota:''},
  {id:'ev4',nombre:'Ayuno Caballeros',fecha:'recurrente_ultimo_domingo',fechaFin:'',icono:'✝️',color:'#6d28d9',nota:'Último domingo de cada mes'},
  {id:'ev5',nombre:'Reunión Mensual de Caballeros',fecha:'por_definir',fechaFin:'',icono:'👥',color:'#3aabba',nota:'A fin de mes se votará por el día y la sede'},
  {id:'ev6',nombre:'Campamento Nacional de Caballeros',fecha:'2026-11-13',fechaFin:'2026-11-15',icono:'⛺',color:'#22c55e',nota:'Del 13 al 15 de noviembre'},
];

// ═══════════════════════════════════════════════════════════════
// CALC — con caché para evitar recalcular en cada render
// ═══════════════════════════════════════════════════════════════
let _calcCache={};
let _rankCache=null;
function invalidateCache(){_calcCache={};_rankCache=null;}

function rowTotal(q){return+((q.i*0.3)+(q.p*0.3)+(q.d*0.2)+(q.pa*0.2)).toFixed(2);}
// Puntuación 0-10 de la evaluación vinculada a una clase.
// null = no hay cuestionario para esta clase; 0 = no la ha hecho (afecta el 30% de la calificación total)
function getEvalScoreForClassAndCab(claseId,cabId){
  if(!claseId||!cabId)return null;
  const ev=(DB.evaluaciones||[]).find(e=>e.claseId===claseId);
  if(!ev)return null;
  const r=(DB.evaluacionRespuestas||[]).find(x=>x.evaluacionId===ev.id&&x.cabId===cabId);
  if(!r||!(r.totalPreguntas>0))return 0;
  return+(r.puntuacion/r.totalPreguntas*10).toFixed(2);
}
// Calificación final de una clase para un caballero: 70% nota (i,p,d,pa) + 30% evaluación si existe
function classScoreForCab(cl,cabId){
  const q=cl.cal&&cl.cal[cabId];
  if(!q||!q.a)return 0;
  const base=rowTotal(q);
  const evScore=getEvalScoreForClassAndCab(cl.id||cl.fecha,cabId);
  if(evScore==null)return base;
  return+(0.7*base+0.3*evScore).toFixed(2);
}
// Promedio de evaluación (0-10) del caballero en clases con cuestionario vinculado; null si no tiene ninguna
function avgEvalScoreForCab(cabId){
  const evals=DB.evaluaciones||[];
  const conClase=evals.filter(e=>e.claseId);
  if(!conClase.length)return null;
  let sum=0,n=0;
  conClase.forEach(ev=>{
    const s=getEvalScoreForClassAndCab(ev.claseId,cabId);
    if(s!=null&&s>0){sum+=s;n++;}
  });
  return n?+(sum/n).toFixed(1):null;
}
// Puntuación media de cuestionarios (0-10) para mostrar en calificaciones; 0 si no ha respondido
function getEvalDisplayScoreForCab(cabId){
  const todas=DB.evaluacionRespuestas||[];
  const mias=todas.filter(r=>r.cabId===cabId);
  if(!mias.length)return 0;
  let sum=0;
  mias.forEach(r=>{
    if(r.totalPreguntas>0)sum+=r.puntuacion/r.totalPreguntas*10;
  });
  return mias.length?+(sum/mias.length).toFixed(1):0;
}
// Resumen de evaluaciones de cuestionario para un caballero (para vistas admin y personal)
function getEvalSummaryForCab(cabId){
  const todas=DB.evaluacionRespuestas||[];
  const mias=todas.filter(r=>r.cabId===cabId);
  if(!mias.length)return null;
  const ordenadas=[...mias].sort((a,b)=>{
    const fa=a.fecha||'';
    const fb=b.fecha||'';
    return fa<fb?1:fa>fb?-1:0;
  });
  const last=ordenadas[0];
  const ev=(DB.evaluaciones||[]).find(e=>e.id===last.evaluacionId)||null;
  const nota10=last.totalPreguntas>0?+(last.puntuacion/last.totalPreguntas*10).toFixed(1):null;
  return{
    count:mias.length,
    last,
    ev,
    nota10
  };
}
function calcCab(id){
  if(_calcCache[id])return _calcCache[id];
  let si=0,sp=0,sd=0,spa=0,n=0,tot=0;
  DB.clases.forEach(cl=>{const q=cl.cal[id];if(q){tot+=(q.a?classScoreForCab(cl,id):0);if(q.a){si+=q.i;sp+=q.p;sd+=q.d;spa+=q.pa;n++;}}});
  const result={i:n?+(si/n).toFixed(1):0,p:n?+(sp/n).toFixed(1):0,d:n?+(sd/n).toFixed(1):0,pa:n?+(spa/n).toFixed(1):0,asist:n,totalClases:DB.clases.length,total:+tot.toFixed(1)};
  _calcCache[id]=result;
  return result;
}
function claseAvg(cl){const vs=Object.keys(cl.cal||{}).filter(cabId=>cl.cal[cabId]&&cl.cal[cabId].a);return vs.length?+(vs.reduce((s,cabId)=>s+classScoreForCab(cl,cabId),0)/vs.length).toFixed(2):0;}
function ranking(){
  if(_rankCache)return _rankCache;
  _rankCache=[...DB.caballeros].sort((a,b)=>calcCab(b.id).total-calcCab(a.id).total);
  return _rankCache;
}
function getRank(id){return ranking().findIndex(c=>c.id===id)+1;}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
function ini(n){return n.split(' ').map(w=>w[0]||'').join('').substring(0,2).toUpperCase();}
function nombreCorto(c){if(!c)return'';if(c.nombreMostrar&&String(c.nombreMostrar).trim())return c.nombreMostrar.trim();const n=String(c.nombre||'').trim();if(!n)return'';const p=n.split(/\s+/);if(p.length===1)return p[0];if(p.length===2)return p[0]+' '+p[1];return p[0]+' '+p[1]+' '+p[2];}
function fmtDate(f){if(!f)return'';const[y,m,d]=f.split('-');const M=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];return`${+d} ${M[+m-1]} ${y}`;}
function fmtDateCumple(f){if(!f)return'—';const parts=f.split('-');if(parts.length!==3)return'—';const M=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];return`${+parts[2]} ${M[+parts[1]-1]}`;}
function fmtBox(f){const[y,m,d]=f.split('-');const M=['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];return{d,m:M[+m-1]};}
// Normaliza número para enlaces: si son 9 dígitos españoles (6/7/8/9...) añade +34
function numeroParaEnlace(t){
  if(!t||!String(t).trim())return'';
  const d=String(t).replace(/\D/g,'');
  if(!d)return'';
  if(d.length===9&&/^[6789]/.test(d))return '34'+d;
  if(d.length>=11&&d.startsWith('34'))return d.substring(0,11);
  if(d.length===10&&d.startsWith('0'))return '34'+d.slice(1);
  return d;
}
function telParaWa(t){const n=numeroParaEnlace(t);return n?('https://wa.me/'+n):'';}
function mkBadges(c){return CHECKS.filter(k=>c[k]).map(k=>`<span class="bdg ${k}">${CLBL[k]}</span>`).join('');}
function scCls(v){return v>=7?'sc-hi':v>=4?'sc-mid':'sc-lo';}
function fmtScore(v){if(v==null||v===undefined||isNaN(v))return '—';const n=Number(v);if(n>=9.995&&n<=10.005)return '10';return n.toFixed(1);}
function avH(c,size=42){if(c.photo)return`<img src="${c.photo}" style="width:${size}px;height:${size}px;object-fit:cover;border-radius:50%">`;return ini(c.nombre);}

// Abreviar tema: solo palabras largas (ej. Introducción a las dispensaciones → Introducción dispensaciones)
function abrevTema(t){
  if(!t||!t.trim())return '—';
  const cortas=/^(a|de|la|el|los|las|del|al|y|e|o|u|en|un|una|por|su|se|al|con)$/i;
  const palabras=t.trim().split(/\s+/).filter(p=>p.length>2&&!cortas.test(p));
  return palabras.length?palabras.join(' '):t.trim().substring(0,30);
}
// Tabla de historial de clases reutilizable (evita duplicación entre openCabDetail y renderPersonal)
function mkHistoryTable(cabId,forPdf){
  const hist=DB.clases.filter(cl=>cl.cal[cabId]).map(cl=>{
    const ev=getEvalScoreForClassAndCab(cl.id||cl.fecha,cabId);
    return{fecha:cl.fecha,tema:cl.tema,...cl.cal[cabId],ev,t:classScoreForCab(cl,cabId)};
  }).sort((a,b)=>b.fecha.localeCompare(a.fecha));
  if(!hist.length)return'<p style="color:var(--text3);font-size:13px">Sin estudios.</p>';
  if(forPdf){
    const temaStyle='font-size:10px;white-space:normal;word-wrap:break-word;line-height:1.35;';
    const headers='<tr><th>FECHA</th><th>TEMA</th><th>A</th><th>PUN</th><th>INT</th><th>DOM</th><th>PAR</th><th>EVAL</th><th>TOT</th></tr>';
    return`<table class="dtable dtable-pdf"><thead>${headers}</thead><tbody>${
      hist.map(r=>`<tr><td>${fmtDate(r.fecha)}</td><td style="${temaStyle}">${(r.tema||'—').replace(/</g,'&lt;')}</td><td>${r.a?'✅':'❌'}</td><td>${r.a?r.p:'—'}</td><td>${r.a?r.i:'—'}</td><td>${r.a?r.d:'—'}</td><td>${r.a?r.pa:'—'}</td><td>${r.a&&r.ev!=null?fmtScore(r.ev):'—'}</td><td class="sc ${scCls(r.t)}" style="font-weight:700;">${r.a?fmtScore(r.t):'—'}</td></tr>`).join('')
    }</tbody></table>`;
  }
  const temaStyle='font-size:10px;white-space:normal;word-wrap:break-word;line-height:1.35;';
  const headers='<tr><th>Fecha</th><th>Tema</th><th>A</th><th>Pun</th><th>Int</th><th>Dom</th><th>Par</th><th>Eval</th><th>Tot</th></tr>';
  const tableHtml=`<table class="dtable dtable-perfil dtable-perfil-compact"><thead>${headers}</thead><tbody>${
    hist.map(r=>`<tr><td>${fmtDate(r.fecha)}</td><td style="${temaStyle}">${(r.tema||'—').replace(/</g,'&lt;')}</td><td>${r.a?'✅':'❌'}</td><td>${r.a?r.p:'—'}</td><td>${r.a?r.i:'—'}</td><td>${r.a?r.d:'—'}</td><td>${r.a?r.pa:'—'}</td><td>${r.a&&r.ev!=null?fmtScore(r.ev):'—'}</td><td class="sc ${scCls(r.t)}">${r.a?fmtScore(r.t):'—'}</td></tr>`).join('')
  }</tbody></table>`;
  return`<div class="historial-table-wrap" style="overflow-x:auto;-webkit-overflow-scrolling:touch;max-width:100%;">${tableHtml}</div>`;
}

// Versión compacta para vista personal: muestra las 3 últimas clases
function mkHistoryTableCompact(cabId){
  const hist=DB.clases.filter(cl=>cl.cal[cabId]).map(cl=>{
    const ev=getEvalScoreForClassAndCab(cl.id||cl.fecha,cabId);
    return{fecha:cl.fecha,tema:cl.tema,...cl.cal[cabId],ev,t:classScoreForCab(cl,cabId)};
  }).sort((a,b)=>b.fecha.localeCompare(a.fecha)).slice(0,3);
  if(!hist.length)return'<p style="color:var(--text3);font-size:13px">Sin estudios.</p>';
  const temaStyle='font-size:11px;white-space:normal;word-wrap:break-word;line-height:1.4;';
  const rows=hist.map(r=>`<tr>
    <td>${fmtDate(r.fecha)}</td>
    <td style="${temaStyle}">${(r.tema||'—').replace(/</g,'&lt;')}</td>
    <td>${r.a?'✅':'❌'}</td>
    <td>${r.a?r.p:'—'}</td>
    <td>${r.a?r.i:'—'}</td>
    <td>${r.a?r.d:'—'}</td>
    <td>${r.a?r.pa:'—'}</td>
    <td>${r.a&&r.ev!=null?fmtScore(r.ev):'—'}</td>
    <td class="sc ${scCls(r.t)}">${r.a?fmtScore(r.t):'—'}</td>
  </tr>`).join('');
  return`<div class="pv-hist-table-wrap" style="margin-top:6px;overflow-x:auto;-webkit-overflow-scrolling:touch;">
    <table class="dtable dtable-perfil dtable-perfil-compact">
      <thead><tr><th>Fecha</th><th>Tema</th><th>A</th><th>Pun</th><th>Int</th><th>Dom</th><th>Par</th><th>Eval</th><th>Tot</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

// ═══════════════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════════════
let loginMode='admin';
function setMode(m){
  loginMode=m;
  document.getElementById('btn-admin').classList.toggle('active',m==='admin');
  document.getElementById('btn-miembro').classList.toggle('active',m==='miembro');
  document.getElementById('admin-fields').style.display=m==='admin'?'':'none';
  document.getElementById('miembro-fields').style.display=m==='miembro'?'':'none';
  if(m==='admin'){
    currentCabId=null;
    var pw=document.getElementById('admin-pw');
    if(pw){setTimeout(function(){pw.focus();},50);}
  }
}
function buildSel(){
  const sel=document.getElementById('miembro-sel');
  if(!sel)return;
  sel.innerHTML='<option value="">— Seleccionar —</option>';
  if(!DB||typeof DB!=='object'||!Array.isArray(DB.caballeros))return;
  const nom = c=>(c&&c.nombreMostrar&&String(c.nombreMostrar).trim()?c.nombreMostrar.trim():c&&c.nombre||'');
  DB.caballeros.filter(c=>c&&typeof c==='object').sort((a,b)=>nom(a).localeCompare(nom(b))).forEach(c=>{
    const o=document.createElement('option');o.value=c.id;
    o.textContent=nom(c);
    sel.appendChild(o);
  });
}
function onMiembroSelChange(){
  const v=document.getElementById('miembro-sel').value;
  const wrap=document.getElementById('miembro-pw-wrap');
  const hint=document.getElementById('miembro-pw-hint');
  const lbl=document.getElementById('miembro-pw-label');
  document.getElementById('miembro-pw').value='';
  if(!v){wrap.style.display='none';return;}
  const c=DB.caballeros.find(x=>x.id===v);
  if(!c){wrap.style.display='none';return;}
  wrap.style.display='';
  if(!c.pw){
    lbl.textContent='Crear contraseña personal';
    hint.style.display='';
  }else{
    lbl.textContent='Contraseña';
    hint.style.display='none';
  }
  const pwInput=document.getElementById('miembro-pw');
  if(pwInput){setTimeout(function(){pwInput.focus();},50);}
}
function doLogin(){
  const err=document.getElementById('login-err');err.style.display='none';
  if(loginMode==='admin'){
    if(document.getElementById('admin-pw').value===DB.adminPw){
      currentCabId=null;
      try{sessionStorage.removeItem('caballeros_miembro');}catch(e){}
      showSc('screen-admin');initAdmin();
      // Contraseña por defecto: pedir que la cambien solo una vez por sesión (no repetir si no la cambia)
      if(DB.adminPw==='1234'){
        var yaMostrado=false;
        try{yaMostrado=sessionStorage.getItem('caballeros_admin_pw_prompt_shown')==='1';}catch(e){}
        if(!yaMostrado){
          try{sessionStorage.setItem('caballeros_admin_pw_prompt_shown','1');}catch(e){}
          setTimeout(function(){
            toast('Por seguridad, cambia la contraseña por defecto.','info');
            if(typeof openChangePw==='function')openChangePw();
          },500);
        }
      }
    }else{err.textContent='Contraseña incorrecta.';err.style.display='block';}
  }else{
    const v=document.getElementById('miembro-sel').value;
    if(!v){err.textContent='Selecciona tu nombre.';err.style.display='block';return;}
    const c=DB.caballeros.find(x=>x.id===v);if(!c)return;
    const pw=document.getElementById('miembro-pw').value;
    var primeraVezCaballero=false;
    if(!c.pw){
      // Primera vez — crear contraseña
      if(pw.length<4){err.textContent='Crea una contraseña de al menos 4 caracteres.';err.style.display='block';return;}
      c.pw=pw;saveDB();toast('🔑 ¡Contraseña creada! Recuérdala bien.','ok');
      primeraVezCaballero=true;
    }else{
      // Verificar: contraseña propia O contraseña maestra (admin)
      if(pw!==c.pw&&pw!==DB.adminPw){err.textContent='Contraseña incorrecta.';err.style.display='block';return;}
    }
    currentCabId=v;
    try{sessionStorage.setItem('caballeros_miembro',v);}catch(e){}
    showSc('screen-personal');renderPersonal(v);
    function scrollInicioArriba(){
      window.scrollTo(0,0);
      if(document.documentElement)document.documentElement.scrollTop=0;
      if(document.body)document.body.scrollTop=0;
      var sp=document.getElementById('screen-personal');
      if(sp)sp.scrollTop=0;
      var tabActivo=sp?sp.querySelector('.pv-tab.active'):null;
      if(tabActivo)tabActivo.scrollTop=0;
    }
    scrollInicioArriba();
    setTimeout(scrollInicioArriba,0);
    setTimeout(scrollInicioArriba,80);
    setTimeout(scrollInicioArriba,200);
    // Primera vez: solo toast, sin cambiar de pestaña ni auto-scroll
    if(primeraVezCaballero){
      var toastCabYa=false;
      try{toastCabYa=sessionStorage.getItem('caballeros_cab_pw_toast_shown')==='1';}catch(e){}
      if(!toastCabYa){
        try{sessionStorage.setItem('caballeros_cab_pw_toast_shown','1');}catch(e){}
        setTimeout(function(){ toast('Por seguridad, puedes cambiar tu contraseña en tu perfil (👤).','info'); },600);
      }
    }
  }
}
function logout(){currentCabId=null;try{sessionStorage.removeItem('caballeros_miembro');sessionStorage.removeItem('pv_recordatorio_cerrado');sessionStorage.removeItem('caballeros_admin_pw_prompt_shown');sessionStorage.removeItem('caballeros_cab_pw_toast_shown');}catch(e){}document.getElementById('admin-pw').value='';document.getElementById('miembro-pw').value='';document.getElementById('miembro-sel').value='';document.getElementById('miembro-pw-wrap').style.display='none';document.getElementById('login-err').style.display='none';showSc('screen-login');}

// ═══════════════════════════════════════════════════════════════
// SCREENS / TABS
// ═══════════════════════════════════════════════════════════════
function showSc(id){const el=document.getElementById(id);if(!el)return;document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));el.classList.add('active');if(id==='screen-admin'||id==='screen-personal')initInstallBanner();}

// ── Banner "Instalar app" (inicio; no volver a mostrar al cerrar) ──
var INSTALL_BANNER_KEY='caballeros_install_banner_dismissed';
function isMobileDevice(){return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)||('ontouchstart' in window)||window.innerWidth<=768;}
function isStandalone(){return !!navigator.standalone||window.matchMedia('(display-mode: standalone)').matches;}
function getInstallBannerSteps(){
  var ua=navigator.userAgent||'';
  if(/iPad|iPhone|iPod/.test(ua))return 'En Safari: toca el botón compartir (□↑) abajo y luego «Añadir a pantalla de inicio».';
  if(/Android/i.test(ua))return 'En Chrome: menú ⋮ (arriba) → «Instalar app» o «Añadir a la pantalla de inicio».';
  return 'En el navegador: menú ⋮ → «Instalar app» o «Añadir a la pantalla de inicio».';
}
function dismissInstallBanner(){try{localStorage.setItem(INSTALL_BANNER_KEY,'1');}catch(e){}var a=document.getElementById('install-banner-admin');var b=document.getElementById('install-banner-personal');if(a)a.style.display='none';if(b)b.style.display='none';}
function initInstallBanner(){
  var dismissed=false;try{dismissed=localStorage.getItem(INSTALL_BANNER_KEY)==='1';}catch(e){}
  if(dismissed||!isMobileDevice()||isStandalone()){dismissInstallBanner();return;}
  var steps=getInstallBannerSteps();
  var admin=document.getElementById('install-banner-admin');var adminSteps=document.getElementById('install-banner-steps-admin');
  var personal=document.getElementById('install-banner-personal');var personalSteps=document.getElementById('install-banner-steps-personal');
  if(adminSteps)adminSteps.textContent=steps;if(personalSteps)personalSteps.textContent=steps;
  if(admin){admin.style.display=document.getElementById('screen-admin').classList.contains('active')?'block':'none';}
  if(personal){personal.style.display=document.getElementById('screen-personal').classList.contains('active')?'block':'none';}
}
function showTab(id,el){
  const tabEl=document.getElementById(id);
  if(!tabEl)return;
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.ntab').forEach(t=>t.classList.remove('active'));
  tabEl.classList.add('active');if(el)el.classList.add('active');
  if(id==='t-dash'){renderDash();}
  if(id==='t-cumple')renderCumple();
  if(id==='t-peticiones'){cargarPeticionesAdmin();}
  if(id==='t-caballeros'){renderCabs();}
  if(id==='t-estudio-admin'){renderClases();}
  if(id==='t-eventos-admin'){renderEventosAdmin();}
  if(id==='t-finanzas'){renderFinanzas();}
  if(id==='t-informes'){renderInformes();}
}
function initAdmin(){
  if(typeof buildSel==='function')buildSel();
  if(typeof renderDash==='function')renderDash(); else if(console&&console.warn)console.warn('renderDash no definido');
  if(typeof renderCabs==='function')renderCabs(); else if(console&&console.warn)console.warn('renderCabs no definido');
  const wrap=document.getElementById('admin-perfil-wrap');
  const tieneNombre=DB.adminNombre&&String(DB.adminNombre).trim();
  const tieneFoto=!!DB.adminPhoto;
  if(wrap)wrap.style.display=(tieneNombre&&tieneFoto)?'none':'block';
  const nombreInp=document.getElementById('admin-nombre-inp');
  const photoInp=document.getElementById('admin-photo-inp');
  const photoPreview=document.getElementById('admin-photo-preview');
  const photoPlaceholder=document.getElementById('admin-photo-placeholder');
  if(nombreInp){nombreInp.value=DB.adminNombre||'';nombreInp.oninput=nombreInp.onblur=async function(){DB.adminNombre=nombreInp.value.trim();await saveDB();if(DB.adminNombre&&DB.adminPhoto&&wrap)wrap.style.display='none';};}
  if(photoPreview&&photoPlaceholder){
    if(DB.adminPhoto){photoPreview.src=DB.adminPhoto;photoPreview.style.display='';photoPlaceholder.style.display='none';} else {photoPreview.style.display='none';photoPlaceholder.style.display='flex';}
  }
  if(photoInp)photoInp.onchange=async function(e){
    const f=e.target.files[0];if(!f)return;
    const data=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(f);});
    DB.adminPhoto=data;await saveDB();
    if(photoPreview&&photoPlaceholder){photoPreview.src=data;photoPreview.style.display='';photoPlaceholder.style.display='none';}
    photoInp.value='';
    if(DB.adminNombre&&String(DB.adminNombre).trim()&&wrap)wrap.style.display='none';
  };
}

// goToStatCard y renderDash están en app.ui.js (se cargan después y son la versión activa)

// ═══════════════════════════════════════════════════════════════
// CABALLEROS LIST
// (estado de filtros definido en index.html para evitar duplicados)
// ═══════════════════════════════════════════════════════════════
function renderCabs(){
  // Solo reconstruir chips si cambió el filtro activo
  if(fGrupo!==_lastFGrupo){
    _lastFGrupo=fGrupo;
    document.getElementById('chips-grupo').innerHTML=
      ['TODOS',...GRUPOS].map(g=>`<div class="chip ${g===fGrupo?'active':''}" onclick="setFG('${g}')">${g==='TODOS'?'Todos':g}</div>`).join('');
  }
  if(fBadge!==_lastFBadge){
    _lastFBadge=fBadge;
    const badgeOpts=[{id:'TODOS',l:'Todos'},{id:'Hermano',l:'Hermanos'},{id:'Amigo',l:'Amigos'},
      ...CHECKS.map(k=>({id:k,l:CLBL[k]}))];
    document.getElementById('chips-badge').innerHTML=
      badgeOpts.map(b=>`<div class="chip bdg-filter ${b.id===fBadge?'active':''}" onclick="setFB('${b.id}')">${b.l}</div>`).join('');
  }

  const q=(document.getElementById('search-inp').value||'').toLowerCase();
  let list=[...DB.caballeros];
  if(fGrupo!=='TODOS')list=list.filter(c=>c.grupo===fGrupo);
  if(fBadge==='Hermano'||fBadge==='Amigo')list=list.filter(c=>c.dist===fBadge);
  else if(CHECKS.includes(fBadge))list=list.filter(c=>c[fBadge]);
  if(q)list=list.filter(c=>c.nombre.toLowerCase().includes(q));
  list.sort((a,b)=>calcCab(b.id).total-calcCab(a.id).total);
  document.getElementById('cabs-list').innerHTML=list.length?list.map(c=>mkCabCard(c)).join(''):'<p style="color:var(--text3);font-size:13px">Sin resultados.</p>';
}
function setFG(g){fGrupo=g;_lastFGrupo=null;renderCabs();}
function setFB(b){fBadge=b;_lastFBadge=null;renderCabs();}

// Debounce para el campo de búsqueda
let _searchTimer=null;
function onSearch(){clearTimeout(_searchTimer);_searchTimer=setTimeout(renderCabs,220);}

function mkCabCard(c,rank,hideGrupo){
  const cal=calcCab(c.id);
  const evalAvg=typeof avgEvalScoreForCab==='function'?avgEvalScoreForCab(c.id):null;
  const bd=mkBadges(c);
  const nm=nombreCorto(c);
  const evalTxt=evalAvg!=null?`<div class="cab-eval" title="Calificación complementaria (evaluaciones)">Eval. ${evalAvg}</div>`:'';
  const subtitulo=hideGrupo?(c.dist||''):(`${c.dist||''} · ${c.grupo||''}`).replace(/^ · | · $/g,'').trim()||'';
  return`<div class="cab-card" onclick="openCabDetail('${c.id}')">
    <div class="av">${rank&&!c.photo?`<span style="font-family:Montserrat;font-size:12px;font-weight:900">#${rank}</span>`:(c.photo?`<img src="${c.photo}" style="width:42px;height:42px;object-fit:cover;border-radius:50%">`:`<span style="font-family:Montserrat;font-size:13px;font-weight:800;color:white">${ini(nm||c.nombre)}</span>`)}</div>
    <div class="cab-inf">
      <div class="cab-nm">${nm||c.nombre}</div>
      ${subtitulo?`<div class="cab-mt">${subtitulo}</div>`:''}
      ${bd?`<div class="badges">${bd}</div>`:''}
    </div>
    <div class="cab-scores"><div class="cab-sc">${cal.total===10?'10':cal.total.toFixed(1)}</div>${evalTxt}</div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════════
// CUMPLEAÑOS Y BANNERS PERSONALES
// ═══════════════════════════════════════════════════════════════
function getProximoCumple(fnac){
  if(!fnac||fnac.length<10)return null;
  const today=new Date();
  const [y,m,d]=fnac.split('-').map(Number);
  const esteAnio=new Date(today.getFullYear(),m-1,d);
  let prox=new Date(today.getFullYear(),m-1,d);
  const yaPaso=esteAnio<today;
  if(yaPaso)prox=new Date(today.getFullYear()+1,m-1,d);
  const diasRest=Math.ceil((prox-today)/(1000*60*60*24));
  const edad=prox.getFullYear()-y;
  return{dia:d,mes:m,prox,diasRest,edad,yaPaso};
}
function renderCumple(){
  const el=document.getElementById('cumple-pg');if(!el)return;
  const today=new Date();
  const items=DB.caballeros.filter(c=>c.fnac&&c.fnac.length>=10).map(c=>{
    const r=getProximoCumple(c.fnac);
    if(!r)return null;
    return{...c,...r};
  }).filter(Boolean);
  if(!items.length){el.innerHTML='<div class="sec-ttl">🎂 Cumpleaños</div><p style="color:var(--text3);font-size:13px">Aún no hay fechas de nacimiento. Los caballeros pueden añadirlas en su perfil o el admin al editar.</p>';return;}
  const M=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const proximos=items.filter(x=>!x.yaPaso).sort((a,b)=>a.diasRest-b.diasRest);
  const yaCumplidos=items.filter(x=>x.yaPaso).sort((a,b)=>a.diasRest-b.diasRest);
  let h='<div class="sec-ttl">🎂 Cumpleaños</div>';
  function row(x){
    const fechaStr=`${x.dia} ${M[x.mes-1]}`;
    const diasTxt=x.diasRest===0?'¡Hoy cumple!':x.diasRest===1?'Mañana':x.yaPaso?`Próximo en ${x.diasRest} días`:`En ${x.diasRest} días`;
    return `<div class="cl-card" onclick="openCabDetail('${x.id}')" style="display:flex;align-items:center;gap:10px;"><div class="cl-date" style="min-width:50px"><div class="cl-day">${x.dia}</div><div class="cl-mon">${M[x.mes-1]}</div></div><div class="cl-inf" style="flex:1"><div class="cl-nm">${x.nombre}</div><div class="cl-mt">${fechaStr} · Cumple ${x.edad} años · ${x.yaPaso?'Ya pasó':diasTxt}</div></div></div>`;
  }
  if(proximos.length){h+='<div style="font-size:11px;font-weight:700;color:#6b7280;margin:10px 0 6px;">Próximos</div>';proximos.forEach(x=>{h+=row(x);});}
  if(yaCumplidos.length){h+='<div style="font-size:11px;font-weight:700;color:#6b7280;margin:16px 0 6px;">Ya cumplidos</div>';yaCumplidos.forEach(x=>{h+=row(x);});}
  el.innerHTML=h;
}

function renderCumplePV(){
  const el=document.getElementById('pv-fnac-card');if(!el)return;
  const c=DB.caballeros.find(x=>x.id===currentCabId);
  const M=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  let h='';
  // Aniversario bautizado / sellado del usuario actual
  if(c){
    if(c.fechaBautizado&&c.fechaBautizado.length>=10){
      const r=getProximoCumple(c.fechaBautizado);
      if(r){
        const fechaStr=`${r.dia} ${M[r.mes-1]}`;
        const diasTxt=r.diasRest===0?'¡Hoy!':r.diasRest===1?'Mañana':r.yaPaso?`Próximo en ${r.diasRest} días`:`En ${r.diasRest} días`;
        h+=`<div style="background:linear-gradient(135deg,#dbeafe,#eff6ff);border:1.5px solid #93c5fd;border-radius:12px;padding:12px 14px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:10px;">
          <div><div style="font-size:10px;font-weight:700;color:#1e40af;letter-spacing:1px;margin-bottom:4px;">💧 Cumple años de bautizado</div><div style="font-size:13px;font-weight:800;color:#1a1f2e;">${fechaStr} · ${diasTxt}</div></div>
          <div style="flex-shrink:0;"><button onclick="restablecerFbaut()" style="background:transparent;border:none;padding:6px;cursor:pointer;font-size:18px;" title="Restablecer fecha">🔄</button></div>
        </div>`;
      }
    }
    if(c.fechaSellado&&c.fechaSellado.length>=10){
      const r=getProximoCumple(c.fechaSellado);
      if(r){
        const fechaStr=`${r.dia} ${M[r.mes-1]}`;
        const diasTxt=r.diasRest===0?'¡Hoy!':r.diasRest===1?'Mañana':r.yaPaso?`Próximo en ${r.diasRest} días`:`En ${r.diasRest} días`;
        h+=`<div style="background:linear-gradient(135deg,#ede9fe,#f5f3ff);border:1.5px solid #c4b5fd;border-radius:12px;padding:12px 14px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:10px;">
          <div><div style="font-size:10px;font-weight:700;color:#5b21b6;letter-spacing:1px;margin-bottom:4px;">🕊️ Cumple años de sellado</div><div style="font-size:13px;font-weight:800;color:#1a1f2e;">${fechaStr} · ${diasTxt}</div></div>
          <div style="flex-shrink:0;"><button onclick="restablecerFsell()" style="background:transparent;border:none;padding:6px;cursor:pointer;font-size:18px;" title="Restablecer fecha">🔄</button></div>
        </div>`;
      }
    }
  }
  // Cumpleaños personal (fecha de nacimiento)
  if(c&&c.fnac&&c.fnac.length>=10){
    const r=getProximoCumple(c.fnac);
    if(r){
      const fechaStr=`${r.dia} ${M[r.mes-1]}`;
      const diasTxt=r.diasRest===0?'¡Hoy es tu cumpleaños! 🎉':r.diasRest===1?'Mañana':'En '+r.diasRest+' días';
      h+=`<div class="panel panel-soft-gold" style="margin-bottom:10px;">
        <div class="panel-title">🎂 Tu cumpleaños</div>
        <div class="panel-desc">${fechaStr} · Cumples ${r.edad} años · ${diasTxt}</div>
        <button type="button" class="btn boutline" style="margin-top:4px;font-size:11px;padding:6px 10px;" onclick="openFnacEditFromCumple()">✏️ Editar fecha</button>
      </div>`;
    }
  }else{
    h+=`<div class="panel" style="margin-bottom:10px;">
      <div class="panel-title">🎂 Tu cumpleaños</div>
      <div class="panel-desc">Añade tu fecha de nacimiento para que podamos recordarte y celebrar contigo.</div>
      <button type="button" class="btn bteal" style="font-size:11px;padding:6px 10px;" onclick="openFnacEditFromCumple()">➕ Añadir fecha</button>
    </div>`;
  }
  el.innerHTML=h;
}

function renderEncuestaCampamento(c){
  const el=document.getElementById('pv-encuesta-campamento');
  if(!el)return;
  if(c.campamentoRespuesta){
    el.style.display='none';
    el.innerHTML='';
    return;
  }
  el.style.display='block';
  el.innerHTML=`
    <div style="background:linear-gradient(135deg,#1a1f2e 0%,#242b3d 50%,#22c55e 80%);border-radius:14px;padding:16px 18px;border:1px solid rgba(34,197,94,0.35);box-shadow:0 4px 16px rgba(34,197,94,0.15);">
      <div style="font-family:'Montserrat',sans-serif;font-size:14px;font-weight:800;color:#fff;margin-bottom:12px;">
        ⛺ ¿Vas al campamento de Caballeros?
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        <button type="button"
          onclick="guardarCampamentoRespuesta('${c.id}','si')"
          style="padding:10px 18px;background:#22c55e;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;">
          Sí
        </button>
        <button type="button"
          onclick="guardarCampamentoRespuesta('${c.id}','no')"
          style="padding:10px 18px;background:#64748b;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;">
          No
        </button>
        <button type="button"
          onclick="guardarCampamentoRespuesta('${c.id}','aun_no_se')"
          style="padding:10px 18px;background:#f59e0b;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;">
          Aún no lo sé
        </button>
      </div>
    </div>
  `;
}
async function guardarCampamentoRespuesta(cabId, valor){
  const c=DB.caballeros.find(x=>x.id===cabId);if(!c)return;
  c.campamentoRespuesta=valor;
  const ok=await saveDB();
  if(ok){toast('✅ Respuesta guardada','ok');renderEncuestaCampamento(c);if(document.getElementById('pv-campamento-banner-wrap'))renderCampamentoBanner();}
}
function renderCampamentoBanner(){
  const wrap=document.getElementById('pv-campamento-banner-wrap');
  if(!wrap)return;
  const cabs=DB.caballeros||[];
  const si=cabs.filter(c=>c.campamentoRespuesta==='si').length;
  const no=cabs.filter(c=>c.campamentoRespuesta==='no').length;
  const aun=cabs.filter(c=>c.campamentoRespuesta==='aun_no_se').length;
  const total=si+no+aun;
  const tieneRespuesta=currentCabId&&(DB.caballeros.find(x=>x.id===currentCabId)||{}).campamentoRespuesta;
  const editBtn=tieneRespuesta
    ? `<div style="flex-shrink:0;">
         <button type="button"
           onclick="openEditCampamento()"
           style="background:transparent;border:none;padding:4px;cursor:pointer;font-size:16px;"
           title="Cambiar mi respuesta">✏️</button>
       </div>`
    : '';
  wrap.innerHTML = `
    <div style="background:linear-gradient(135deg,rgba(34,197,94,0.12) 0%,rgba(245,158,11,0.08) 100%);border-radius:14px;padding:14px 16px;border:1px solid rgba(34,197,94,0.25);display:flex;align-items:center;justify-content:space-between;gap:12px;">
      <div style="display:flex;align-items:center;gap:10px;min-width:0;flex:1;">
        <span style="font-family:'Montserrat',sans-serif;font-size:12px;font-weight:800;color:#1a1f2e;">
          ⛺ Campamento de Caballeros
        </span>
        <span style="font-size:12px;color:#4b5563;">
          Sí: <strong>${si}</strong> ·
          No: <strong>${no}</strong> ·
          Aún no lo sé: <strong>${aun}</strong>
          ${total>0 ? `· ${total} respuestas` : ''}
        </span>
      </div>
      ${editBtn}
    </div>
  `;
}
function openEditCampamento(){
  const c=DB.caballeros.find(x=>x.id===currentCabId);if(!c)return;
  const v=c.campamentoRespuesta||'';
  openSheet('⛺','¿Vas al campamento de Caballeros?','Cambia tu respuesta',`
    <div style="display:flex;flex-direction:column;gap:10px;">
      <button type="button" onclick="doEditCampamento('si')" style="padding:12px 18px;background:${v==='si'?'#22c55e':'#f1f5f9'};color:${v==='si'?'#fff':'#1a1f2e'};border:2px solid ${v==='si'?'#22c55e':'#e2e8f0'};border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;text-align:left;">Sí</button>
      <button type="button" onclick="doEditCampamento('no')" style="padding:12px 18px;background:${v==='no'?'#64748b':'#f1f5f9'};color:${v==='no'?'#fff':'#1a1f2e'};border:2px solid ${v==='no'?'#64748b':'#e2e8f0'};border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;text-align:left;">No</button>
      <button type="button" onclick="doEditCampamento('aun_no_se')" style="padding:12px 18px;background:${v==='aun_no_se'?'#f59e0b':'#f1f5f9'};color:${v==='aun_no_se'?'#fff':'#1a1f2e'};border:2px solid ${v==='aun_no_se'?'#f59e0b':'#e2e8f0'};border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;text-align:left;">Aún no lo sé</button>
    </div>
  `);
}
async function doEditCampamento(valor){
  const c=DB.caballeros.find(x=>x.id===currentCabId);if(!c)return;
  c.campamentoRespuesta=valor;
  const ok=await saveDB();
  closeModal();
  if(ok){toast('✅ Respuesta actualizada','ok');renderCampamentoBanner();}
}

function cumpleHoy(){
  const hoy=new Date();
  const m=hoy.getMonth()+1, d=hoy.getDate();
  return (DB.caballeros||[]).filter(c=>{
    if(!c.fnac||c.fnac.length<10)return false;
    const p=c.fnac.split('-');
    return +p[1]===m&&+p[2]===d;
  });
}
// Versículos de bendición por cumplir años (RVR60)
const VERSOS_CUMPLE=[
  {ref:'Salmo 91:16',refCode:'PSA.91.16',text:'Con larga vida lo saciaré, y le mostraré mi salvación.'},
  {ref:'Salmo 65:11',refCode:'PSA.65.11',text:'Tú coronas el año con tus bienes; y tus nubes destilan grosura.'},
  {ref:'Job 36:11',refCode:'JOB.36.11',text:'Si oyeren y le sirvieren, acabarán sus días en bien, y sus años en deleites.'},
  {ref:'Proverbios 9:11',refCode:'PRO.9.11',text:'Porque por mí se aumentarán tus días, y años de vida se te añadirán.'},
  {ref:'Salmo 118:24',refCode:'PSA.118.24',text:'Este es el día que hizo Jehová; nos gozaremos y alegraremos en él.'},
  {ref:'Números 6:24-26',refCode:'NUM.6.24',text:'Jehová te bendiga y te guarde; Jehová haga resplandecer su rostro sobre ti y tenga de ti misericordia; Jehová alce su rostro sobre ti y ponga en ti paz.'},
  {ref:'Salmo 20:4',refCode:'PSA.20.4',text:'Te dé conforme al deseo de tu corazón, y cumpla todo tu consejo.'},
  {ref:'3 Juan 1:2',refCode:'3JN.1.2',text:'Deseo que tú seas prosperado en todas las cosas y que tengas salud, así como prospera tu alma.'},
];
function getVersoCumple(){
  const d=new Date();
  const dayOfYear=Math.floor((d-new Date(d.getFullYear(),0,0))/86400000);
  return VERSOS_CUMPLE[dayOfYear % VERSOS_CUMPLE.length];
}
function renderCumpleBanners(cabId,wrapId){
  const wrap=document.getElementById(wrapId||'pv-cumple-banner-wrap');
  if(!wrap)return;
  const losQueCumplen=cumpleHoy();
  const items=(DB.caballeros||[]).filter(c=>c.fnac&&c.fnac.length>=10).map(c=>{
    const r=getProximoCumple(c.fnac);
    return r?{...c,...r}:null;
  }).filter(Boolean);
  const proximos=items.filter(x=>!x.yaPaso).sort((a,b)=>a.diasRest-b.diasRest);
  const proximoMasCercano=proximos[0]||null;
  if(losQueCumplen.length===0&&!proximoMasCercano){wrap.innerHTML='';wrap.style.display='none';wrap.onclick=null;wrap.removeAttribute('data-cab-id');wrap.style.cursor='';return;}
  const yoCumple=losQueCumplen.some(c=>c.id===cabId);
  const verso=getVersoCumple();
  // Día exacto del cumpleaños → banner con verso + botones WhatsApp y llamada
  if(yoCumple||losQueCumplen.length>0){
    wrap.style.display='block';
    const cumple=losQueCumplen[0];
    wrap.dataset.cabId=cumple.id;
    wrap.style.cursor='pointer';
    wrap.onclick=function(e){ if(e.target.closest('a'))return; const id=wrap.dataset.cabId; if(id&&typeof openCabDetail==='function')openCabDetail(id); };
    const waUrl=telParaWa(cumple.telefono||'');
    const telUrl=(cumple.telefono&&cumple.telefono.trim())?('tel:+'+numeroParaEnlace(cumple.telefono)):'';
    const nomCumple=escAttr(nombreCorto(cumple)||cumple.nombre||'');
    const btnsHtml=(waUrl||telUrl)?'<div style="margin-top:14px;display:flex;flex-wrap:wrap;gap:10px;"><span style="font-size:11px;color:rgba(5,46,22,0.9);display:block;width:100%;margin-bottom:4px;">Envía un saludo</span>'+(waUrl?'<a href="'+waUrl+'" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;background:#25d366;color:#fff;padding:10px 18px;border-radius:12px;font-size:13px;font-weight:700;text-decoration:none;box-shadow:0 2px 10px rgba(37,211,102,0.35);">📱 WhatsApp</a>':'')+(telUrl?'<a href="'+telUrl+'" style="display:inline-flex;align-items:center;gap:6px;background:#059669;color:#fff;padding:10px 18px;border-radius:12px;font-size:13px;font-weight:700;text-decoration:none;box-shadow:0 2px 10px rgba(5,150,105,0.3);">📞 Llamar</a>':'')+'</div>':'';
    wrap.innerHTML='<div style="background:linear-gradient(160deg,#065f46 0%,#047857 45%,#059669 100%);border-radius:18px;padding:20px 20px;box-shadow:0 8px 28px rgba(5,46,22,0.25);overflow:hidden;position:relative;"><div style="position:absolute;top:-30px;right:-30px;width:120px;height:120px;background:rgba(255,255,255,0.06);border-radius:50%;"></div><div style="position:relative;"><div style="font-size:32px;margin-bottom:8px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.2));">🎂</div><div style="font-family:\'Montserrat\',sans-serif;font-size:16px;font-weight:800;color:rgba(255,255,255,0.95);letter-spacing:0.5px;margin-bottom:4px;">¡Feliz cumpleaños!</div><div style="font-size:15px;font-weight:700;color:#a7f3d0;margin-bottom:10px;">'+nomCumple+'</div><div style="font-size:13px;color:rgba(255,255,255,0.88);line-height:1.55;margin-bottom:8px;">'+verso.text+'</div><div style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.7);">'+verso.ref+'</div>'+btnsHtml+'</div></div>';
    return;
  }
  // Si hoy no hay cumple, mostrar banner del cumpleaños más cercano
  if(!proximoMasCercano){wrap.innerHTML='';wrap.style.display='none';wrap.onclick=null;wrap.removeAttribute('data-cab-id');wrap.style.cursor='';return;}
  wrap.dataset.cabId=proximoMasCercano.id;
  wrap.style.cursor='pointer';
  wrap.onclick=function(){ const id=wrap.dataset.cabId; if(id&&typeof openCabDetail==='function')openCabDetail(id); };
  const M=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const nom=escAttr(nombreCorto(proximoMasCercano)||proximoMasCercano.nombre||'');
  const fechaStr=`${proximoMasCercano.dia} ${M[proximoMasCercano.mes-1]}`;
  const diasTxt=proximoMasCercano.diasRest===1?'Mañana':`En ${proximoMasCercano.diasRest} días`;
  wrap.style.display='block';
  const edad=proximoMasCercano.edad;
  const edadTxt=edad&&Number.isFinite(edad)?' · '+edad+' años':'';
  const grupo=escAttr(proximoMasCercano.grupo||'');
  const siguienteCumple=proximos[1]||null;
  const recordatorioSiguiente=siguienteCumple?'<div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.2);font-size:10px;color:rgba(255,255,255,0.7);">Después: <strong style="color:rgba(255,255,255,0.9);">'+escAttr(nombreCorto(siguienteCumple)||siguienteCumple.nombre||'')+'</strong> · '+siguienteCumple.dia+' '+M[siguienteCumple.mes-1]+' (en '+siguienteCumple.diasRest+' días)</div>':'';
  wrap.innerHTML='<div onclick="typeof openCabDetail===\'function\'&&openCabDetail(\''+proximoMasCercano.id+'\')" style="cursor:pointer;background:linear-gradient(160deg,#1e3a5f 0%,#1e4976 50%,#2563eb 100%);border-radius:18px;padding:18px 20px;box-shadow:0 8px 24px rgba(30,58,95,0.3);overflow:hidden;position:relative;"><div style="position:absolute;bottom:-20px;right:-20px;width:80px;height:80px;background:rgba(255,255,255,0.08);border-radius:50%;"></div><div style="display:flex;align-items:center;gap:16px;position:relative;"><div style="width:56px;height:56px;border-radius:14px;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0;">🎂</div><div style="flex:1;min-width:0;"><div style="font-family:\'Montserrat\',sans-serif;font-size:11px;font-weight:800;color:rgba(255,255,255,0.7);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px;">Próximo cumpleaños</div><div style="font-size:16px;font-weight:800;color:#fff;margin-bottom:2px;">'+nom+'</div>'+(grupo?'<div style="font-size:12px;color:rgba(255,255,255,0.75);">👥 '+grupo+'</div>':'')+recordatorioSiguiente+'</div><div style="text-align:right;flex-shrink:0;"><div style="font-size:13px;font-weight:800;color:#93c5fd;">📅 '+fechaStr+'</div><div style="font-size:12px;color:rgba(255,255,255,0.85);margin-top:4px;">'+diasTxt+edadTxt+'</div></div></div></div>';
}

// ═══════════════════════════════════════════════════════════════
// EVENTOS: renderEventosPV, renderEventosAdmin y CRUD en app.eventos.js


// ═══════════════════════════════════════════════════════════════
// FINANZAS: lógica en app.finanzas.js (renderFinanzas, addGasto, delGasto, etc.)
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// INFORMES PDF (HTML + window.print — estilo Escuela Dominical)
// ═══════════════════════════════════════════════════════════════
function generarPDF(titulo,htmlContent){
  const cache=window._reportLogos||{};
  const faviconDataUrl=cache.favicon||'';
  const evLogoUrl=cache.ev||'';
  const logoLeftHtml=faviconDataUrl?'<div class="header-logo-hdv"><img src="'+faviconDataUrl+'" alt="Hombres de Verdad" class="header-logo-hdv-img"/></div>':'';
  const logoEvHtml=evLogoUrl?'<div class="header-logo-ev"><img src="'+evLogoUrl+'" alt="Evidencias" class="header-logo-ev-img"/></div>':'';
  const estilos=`<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Inter',sans-serif;background:#fff;color:#1a1f2e;font-size:13px;line-height:1.5;}
    .header{background:linear-gradient(135deg,#1a1f2e 0%,#242b3d 50%,#1d6b77 100%);color:#fff;padding:20px 24px;display:flex;align-items:center;gap:16px;margin-bottom:20px;}
    .header h1{font-size:15px;font-weight:700;}
    .header .sub{font-size:11px;opacity:0.85;margin-top:2px;color:rgba(255,255,255,0.9);}
    .header-logo-hdv{flex-shrink:0;padding:6px 10px;border-radius:12px;background:#fff;}
    .header-logo-hdv-img{height:48px;width:auto;object-fit:contain;display:block;}
    .header-logo-ev{flex-shrink:0;margin-left:48px;margin-right:16px;}
    .header-logo-ev-img{height:80px;width:auto;object-fit:contain;display:block;}
    .section{margin:0 20px 20px;background:#fff;border-radius:12px;border:1.5px solid rgba(58,171,186,0.25);overflow:hidden;}
    .section-title{background:linear-gradient(135deg,rgba(58,171,186,0.12),rgba(58,171,186,0.2));padding:10px 16px;font-weight:600;font-size:12px;color:#2d8f9c;border-bottom:1.5px solid rgba(58,171,186,0.22);}
    table{width:100%;border-collapse:collapse;}
    th{background:rgba(58,171,186,0.08);padding:6px 10px;text-align:left;font-size:10px;font-weight:600;color:#2d8f9c;letter-spacing:0.3px;text-transform:uppercase;}
    td{padding:7px 10px;border-bottom:1px solid rgba(58,171,186,0.12);font-size:11px;}
    tr:last-child td{border-bottom:none;}
    tr:nth-child(even) td{background:#fafbfc;}
    table.dtable{width:100%;}
    table.dtable th:nth-child(1),table.dtable td:nth-child(1){width:68px;max-width:68px;}
    table.dtable th:nth-child(2),table.dtable td:nth-child(2){white-space:normal;word-wrap:break-word;max-width:100px;}
    table.dtable th:nth-child(n+3),table.dtable td:nth-child(n+3){width:48px;max-width:52px;text-align:center;}
    table.dtable-pdf{table-layout:fixed;width:100%;}
    table.dtable-pdf th:nth-child(1),table.dtable-pdf td:nth-child(1){width:82px;}
    table.dtable-pdf th:nth-child(2),table.dtable-pdf td:nth-child(2){width:320px;min-width:320px;white-space:normal;word-wrap:break-word;font-size:14px;}
    table.dtable-pdf th:nth-child(n+3),table.dtable-pdf td:nth-child(n+3){width:calc((100% - 402px) / 6);text-align:center;}
    .star-pdf{display:inline-block;font-size:22px;color:rgba(255,255,255,0.4);}
    .star-pdf.lit{color:#eab308;filter:drop-shadow(0 0 6px rgba(234,179,8,0.6));}
    .distinciones-pdf{background:linear-gradient(145deg,#1a1f2e 0%,#242b3d 60%);border-radius:12px;padding:14px 18px;margin:0 20px 16px;border:1px solid rgba(58,171,186,0.3);box-shadow:0 4px 16px rgba(0,0,0,0.2);}
    .distinciones-pdf-title{font-size:10px;color:rgba(255,255,255,0.85);font-weight:700;letter-spacing:0.5px;margin-bottom:12px;text-transform:uppercase;}
    .distinciones-pdf-stars{display:flex;flex-wrap:wrap;gap:4px 6px;align-items:flex-start;justify-content:flex-start;}
    .distinciones-pdf-item{display:inline-flex;flex-direction:column;align-items:center;width:72px;flex-shrink:0;}
    .distinciones-pdf-starwrap{width:44px;height:44px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.08);border-radius:12px;border:1px solid rgba(255,255,255,0.15);}
    .distinciones-pdf-lbl{font-size:7px;color:rgba(255,255,255,0.75);margin-top:6px;text-align:center;line-height:1.2;}
    .stat{background:rgba(58,171,186,0.08);border-radius:8px;padding:8px 10px;}
    .stat-val{font-size:14px;font-weight:600;color:#3aabba;}
    .stat-lbl{font-size:10px;color:#4b5563;}
    .neg{color:#ef4444;font-weight:700;}
    .pos{color:#16a34a;font-weight:700;}
    .bar-wrap{height:8px;background:rgba(58,171,186,0.12);border-radius:999px;overflow:hidden;margin-top:4px;}
    .bar-fill{height:100%;border-radius:999px;}
    .badge-mini{display:inline-block;padding:2px 5px;border-radius:10px;font-size:8px;font-weight:600;margin:1px;}
    .footer{text-align:center;padding:12px;font-size:9px;color:#9ca3af;border-top:1px solid rgba(58,171,186,0.15);margin:0 16px;}
    .print-btn{display:block;margin:16px auto;padding:10px 24px;background:linear-gradient(135deg,#3aabba,#2d8f9c);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;box-shadow:0 3px 10px rgba(58,171,186,0.3);}
    @media print{.print-btn{display:none!important;}body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
  </style>`;
  const fecha=new Date().toLocaleDateString('es-ES',{day:'2-digit',month:'long',year:'numeric'});
  const full=`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">${estilos}<title>${titulo}</title></head><body>
    <div class="header">${logoLeftHtml}<div><h1>📋 ${titulo}</h1><div class="sub">Caballeros · Hombres de Verdad · ${fecha}</div></div>${logoEvHtml}</div>
    ${htmlContent}
    <div class="footer">Generado por Sistema Caballeros · ${fecha}</div>
    <button class="print-btn" onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
  </${''}body></${''}html>`;
  const blob=new Blob([full],{type:'text/html;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const w=window.open(url,'_blank','noopener,noreferrer');
  if(w)setTimeout(()=>URL.revokeObjectURL(url),10000);
  toast('✅ Informe abierto. Usa el botón para imprimir o guardar PDF.','ok');
}
function barRow(label,value,max,color){const v=parseFloat(value)||0;const m=parseFloat(max)||1;const pct=m>0?Math.min(100,(v/m)*100):0;return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:11px"><div style="width:120px;color:#4b5563;flex-shrink:0">'+label+'</div><div style="flex:1;background:rgba(58,171,186,0.12);border-radius:999px;overflow:hidden;height:8px"><div style="width:'+pct+'%;background:'+color+';height:100%;border-radius:999px;transition:width .4s"></div></div><div style="width:55px;text-align:right;font-weight:700;color:#1a1f2e">'+value+'</div></div>';}
function renderInformes(){
  const sel=document.getElementById('informe-cab-sel');
  if(sel){
    const nombreMostrar=c=>(c.nombreMostrar&&String(c.nombreMostrar).trim()?c.nombreMostrar.trim():c.nombre||'');
    const ordenados=[...(DB.caballeros||[])].sort((a,b)=>nombreMostrar(a).localeCompare(nombreMostrar(b)));
    const opts=ordenados.map(c=>`<option value="${c.id}">${nombreMostrar(c)}</option>`).join('');
    sel.innerHTML='<option value="">Seleccionar caballero</option>'+opts;
  }
}

function renderHistorialApp(){
  const el=document.getElementById('historial-app-list');
  if(!el)return;
  const list=Array.isArray(DB.appHistorial)?DB.appHistorial:[];
  const hace3d=Date.now()-3*24*60*60*1000;
  const filtrado=list.filter(e=>e.ts>=hace3d).sort((a,b)=>b.ts-a.ts);
  const nombreCab=id=>{const c=(DB.caballeros||[]).find(x=>x.id===id);return c?(c.nombreMostrar&&String(c.nombreMostrar).trim()?c.nombreMostrar.trim():c.nombre):('ID '+id);};
  const accionLbl=acc=>{const t={entrada_app:'Entrada a la app',material_estudio:'Material de estudio',cuestionario:'Cuestionario',perfil:'Perfil'};return t[acc]||acc;}
  if(!filtrado.length){el.innerHTML='<p style="color:var(--text3);font-size:13px;padding:12px;">Sin registros en los últimos 3 días.</p>';return;}
  const byCab={};
  filtrado.forEach(e=>{if(!byCab[e.cabId])byCab[e.cabId]=[];byCab[e.cabId].push(e);});
  const cabIds=Object.keys(byCab).sort((a,b)=>nombreCab(b).localeCompare(nombreCab(a)));
  const html=cabIds.map(cabId=>{
    const nom=nombreCab(cabId).replace(/</g,'&lt;');
    const entradas=byCab[cabId];
    const items=entradas.map(e=>{
      const d=new Date(e.ts);
      const fechaHora=d.toLocaleString('es-CO',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
      const acc=accionLbl(e.accion);
      const det=(e.detalle||'').toString().replace(/</g,'&lt;').substring(0,80);
      return`<div style="background:#f8fafc;border-radius:10px;padding:10px 12px;margin-bottom:6px;display:flex;flex-wrap:wrap;align-items:center;gap:8px;border-left:3px solid var(--teal);">
        <span style="font-size:11px;color:var(--text3);">${fechaHora}</span>
        <span style="background:var(--teal-bg);color:var(--teal2);font-size:10px;font-weight:800;padding:2px 8px;border-radius:16px;">${acc}</span>
        ${det?'<span style="font-size:12px;color:var(--text2);">'+det+'</span>':''}
      </div>`;
    }).join('');
    return`<details style="background:white;border:1.5px solid #e9edf2;border-radius:12px;margin-bottom:10px;box-shadow:0 2px 8px rgba(0,0,0,0.04);overflow:hidden;">
      <summary style="padding:14px 16px;font-weight:800;color:var(--dark);cursor:pointer;list-style:none;display:flex;align-items:center;gap:8px;">
        <span style="font-size:18px;">👤</span>
        <span>${nom}</span>
        <span style="margin-left:auto;font-size:11px;color:var(--text3);font-weight:600;">${entradas.length} actividad${entradas.length!==1?'es':''}</span>
      </summary>
      <div style="padding:0 16px 16px 16px;border-top:1px solid #f3f4f6;">${items}</div>
    </details>`;
  }).join('');
  el.innerHTML=html;
}

// ═══════════════════════════════════════════════════════════════
// MATERIAL DE ESTUDIO (admin: solo URL, p. ej. Gamma)
// ═══════════════════════════════════════════════════════════════
function extractUrlFromMaterialInput(input){
  const s=(input||'').trim();
  if(!s)return '';
  if(s.startsWith('http://')||s.startsWith('https://'))return s;
  const m=s.match(/src\s*=\s*["']([^"']+)["']/i)||s.match(/src\s*=\s*([^\s>]+)/i);
  return m?(m[1]||'').trim():s;
}
function renderMaterialAdmin(){
  const list=document.getElementById('material-admin-lista');
  if(!list)return;
  const arr=Array.isArray(DB.materialEstudio)?DB.materialEstudio:[];
  list.innerHTML=arr.length===0?'<p style="color:var(--text3);font-size:13px">Aún no hay material. Inserta la primera URL con el botón de abajo.</p>':arr.map((m,i)=>`
    <div class="panel" style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
      <div style="flex:1;min-width:0;">
        <div style="font-weight:700;color:var(--dark);">${(m.titulo||'Sin título').replace(/</g,'&lt;')}</div>
        <div style="font-size:11px;color:var(--text3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${(m.url||m.contenido||'').replace(/</g,'&lt;').substring(0,60)}${(m.url||m.contenido||'').length>60?'…':''}</div>
      </div>
      <div style="display:flex;gap:8px;">
        <button type="button" class="btn boutline" style="font-size:11px;padding:6px 12px;" onclick="openFormMaterialUrl(${i})">Editar</button>
        <button type="button" class="btn bred" style="font-size:11px;padding:6px 12px;" onclick="confirmDelMaterial('${m.id}')">Eliminar</button>
      </div>
    </div>`).join('');
}
function openFormMaterialUrl(editIndex){
  const list=Array.isArray(DB.materialEstudio)?DB.materialEstudio:[];
  const isEdit=typeof editIndex==='number'&&editIndex>=0&&editIndex<list.length;
  const item=isEdit?list[editIndex]:null;
  let urlVal=item?(item.url||''):'';
  if(!urlVal&&item&&item.contenido)urlVal=extractUrlFromMaterialInput(item.contenido)||item.contenido;
  const tituloVal=item?(item.titulo||''):'';
  const body='<div class="fr" style="margin-bottom:12px;"><label>URL</label><textarea id="material-url-inp" rows="3" placeholder="Pega la URL (ej. https://gamma.app/embed/...) o el código del iframe" style="width:100%;padding:12px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:13px;">'+String(urlVal).replace(/</g,'&lt;').replace(/"/g,'&quot;')+'</textarea></div><div class="fr" style="margin-bottom:12px;"><label>Título (opcional)</label><input type="text" id="material-titulo-inp" value="'+String(tituloVal).replace(/"/g,'&quot;')+'" placeholder="Ej: Estudio de las dispensaciones" style="width:100%;padding:12px;border:1.5px solid #e5e7eb;border-radius:10px;"></div><div class="btn-row"><button type="button" class="btn boutline" onclick="closeModal()">Cancelar</button><button type="button" class="btn bteal" onclick="saveMaterialUrl('+editIndex+')">'+(isEdit?'Guardar':'Insertar')+'</button></div>';
  if(typeof openSheet==='function')openSheet('📚',isEdit?'Editar material':'Insertar URL','La página se verá tal cual (ej. Gamma) dentro de la app.',body);
}
function saveMaterialUrl(editIndex){
  const urlEl=document.getElementById('material-url-inp');
  const tituloEl=document.getElementById('material-titulo-inp');
  if(!urlEl)return;
  let url=extractUrlFromMaterialInput(urlEl.value);
  if(!url){toast('Escribe o pega la URL (o el iframe).','err');return;}
  if(!url.startsWith('http://')&&!url.startsWith('https://'))url='https://'+url;
  const titulo=(tituloEl&&tituloEl.value?tituloEl.value.trim():'')||url.replace(/^https?:\/\//,'').split('/')[0]||'Material';
  if(!Array.isArray(DB.materialEstudio))DB.materialEstudio=[];
  const list=DB.materialEstudio;
  const isEdit=typeof editIndex==='number'&&editIndex>=0&&editIndex<list.length;
  if(isEdit){
    const m=list[editIndex];
    if(m){m.url=url;m.titulo=titulo;if(m.contenido!==undefined)delete m.contenido;}
  } else {
    const newId='mat_'+(Date.now().toString(36))+'_'+(Math.random().toString(36).slice(2,8));
    DB.materialEstudio.push({id:newId,titulo,url,orden:DB.materialEstudio.length});
  }
  saveDB().then(()=>{toast(isEdit?'✅ Actualizado':'✅ URL agregada','ok');closeModal();renderMaterialAdmin();if(typeof renderEstudioPV==='function')renderEstudioPV();}).catch(()=>toast('Error al guardar','err'));
}
function confirmDelMaterial(id){
  const m=(DB.materialEstudio||[]).find(x=>x.id===id);
  if(!m)return;
  const tituloEsc=(m.titulo||'Sin título').replace(/</g,'&lt;');
  if(typeof openSheet==='function')openSheet('🗑','Eliminar módulo','',`
    <p style="font-size:14px;color:var(--text);margin-bottom:16px;">¿Eliminar el material <strong>${tituloEsc}</strong>? Se quitará de la lista.</p>
    <div class="btn-row">
      <button class="btn boutline" onclick="closeModal()">Cancelar</button>
      <button class="btn bred" onclick="closeModal();doDelMaterial('${id}')">Eliminar</button>
    </div>`);
}
function doDelMaterial(id){
  if(!Array.isArray(DB.materialEstudio))return;
  DB.materialEstudio=DB.materialEstudio.filter(x=>x.id!==id);
  saveDB().then(()=>{toast('Módulo eliminado','ok');if(typeof renderMaterialAdmin==='function')renderMaterialAdmin();}).catch(()=>{});
}

async function generarInformeEconomico(){
  const gastos=DB.finanzasGastos||[];
  const actividades=DB.finanzasActividades||[];
  const donativos=DB.finanzasDonativos||[];
  const votos=DB.finanzasVotos||[];
  const totalGastos=gastos.reduce((s,g)=>s+(Number(g.monto)||0),0);
  const totalActIng=actividades.reduce((s,a)=>s+(Number(a.efectivo)||0)+(Number(a.tpv)||0),0);
  const totalActGas=actividades.reduce((s,a)=>s+(Number(a.gastos)||0),0);
  const totalDon=donativos.reduce((s,d)=>s+(Number(d.efectivo)||0)+(Number(d.tpv)||0),0);
  const totalVotos=votos.reduce((s,v)=>s+(Number(v.efectivo)||0)+(Number(v.tpv)||0),0);
  const balance=totalActIng+totalDon+totalVotos-totalGastos-totalActGas;
  const totalMov=totalGastos+totalActIng+totalActGas+totalDon+totalVotos;
  const barrasEco=totalMov>0?'<div style="padding:14px 20px 8px">'+barRow('Gastos comité',totalGastos.toFixed(2),totalMov,'#ef4444')+barRow('Ingresos actividades',totalActIng.toFixed(2),totalMov,'#16a34a')+barRow('Gastos actividades',totalActGas.toFixed(2),totalMov,'#f5c518')+barRow('Donativos',totalDon.toFixed(2),totalMov,'#3aabba')+barRow('Votos',totalVotos.toFixed(2),totalMov,'#2d8f9c')+'</div>':'';
  const resumen='<div class="section"><div class="section-title">💰 Resumen Económico</div><div style="padding:16px 20px;display:flex;flex-wrap:wrap;gap:20px"><div class="stat"><div class="stat-lbl">Total gastos comité</div><div class="stat-val neg">'+MONEDA.symbol+fmtMonto(totalGastos)+'</div></div><div class="stat"><div class="stat-lbl">Ingresos actividades</div><div class="stat-val pos">'+MONEDA.symbol+fmtMonto(totalActIng)+'</div></div><div class="stat"><div class="stat-lbl">Gastos actividades</div><div class="stat-val neg">'+MONEDA.symbol+fmtMonto(totalActGas)+'</div></div><div class="stat"><div class="stat-lbl">Donativos</div><div class="stat-val pos">'+MONEDA.symbol+fmtMonto(totalDon)+'</div></div><div class="stat"><div class="stat-lbl">Votos</div><div class="stat-val pos">'+MONEDA.symbol+fmtMonto(totalVotos)+'</div></div><div class="stat"><div class="stat-lbl">Balance</div><div class="stat-val" style="color:'+(balance>=0?'#16a34a':'#ef4444')+'">'+MONEDA.symbol+fmtMonto(balance)+'</div></div></div>'+barrasEco+'</div>';
  const filasG=gastos.map(g=>{const r=(DB.caballeros||[]).find(c=>c.id===g.responsable);return '<tr><td>'+(g.fecha||'—')+'</td><td><strong>'+(g.concepto||'').replace(/</g,'&lt;')+'</strong></td><td>'+(r?r.nombre:'—')+'</td><td class="neg">'+MONEDA.symbol+fmtMonto(g.monto)+'</td></tr>';}).join('');
  const filasA=actividades.map(a=>{const r=(DB.caballeros||[]).find(c=>c.id===a.responsable);const ing=(Number(a.efectivo)||0)+(Number(a.tpv)||0);const gas=Number(a.gastos)||0;return '<tr><td>'+(a.fecha||'—')+'</td><td><strong>'+(a.nombre||'').replace(/</g,'&lt;')+'</strong></td><td>'+(r?r.nombre:'—')+'</td><td class="pos">'+MONEDA.symbol+fmtMonto(ing)+'</td><td class="neg">'+MONEDA.symbol+fmtMonto(gas)+'</td></tr>';}).join('');
  const filasD=donativos.map(d=>{const r=(DB.caballeros||[]).find(c=>c.id===d.responsable);return '<tr><td>'+(d.fecha||'—')+'</td><td><strong>'+(d.concepto||'').replace(/</g,'&lt;')+'</strong></td><td>'+(r?r.nombre:'—')+'</td><td class="pos">'+MONEDA.symbol+fmtMonto((Number(d.efectivo)||0)+(Number(d.tpv)||0))+'</td></tr>';}).join('');
  const filasV=votos.map(v=>{const r=(DB.caballeros||[]).find(c=>c.id===v.responsable);return '<tr><td>'+(v.fecha||'—')+'</td><td><strong>'+(v.concepto||'').replace(/</g,'&lt;')+'</strong></td><td>'+(r?r.nombre:'—')+'</td><td class="pos">'+MONEDA.symbol+fmtMonto((Number(v.efectivo)||0)+(Number(v.tpv)||0))+'</td></tr>';}).join('');
  const totalIngresos=totalActIng+totalDon+totalVotos;
  const totalGastosComiteYAct=totalGastos+totalActGas;
  const balanceFinal=totalIngresos-totalGastosComiteYAct;
  const balanceColor=balanceFinal>=0?'#16a34a':'#ef4444';
  const balanceFinalHtml='<div class="section"><div class="section-title">📊 Balance final</div><div style="padding:20px;background:linear-gradient(135deg,#1a1f2e 0%,#242b3d 100%);border-radius:12px;margin:16px 20px;color:white;"><div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;"><div><div style="font-size:11px;opacity:0.85;">Total ingresos</div><div style="font-size:18px;font-weight:800;">'+MONEDA.symbol+fmtMonto(totalIngresos)+'</div><div style="font-size:10px;opacity:0.75;">Actividades + Donativos + Votos</div></div><div><div style="font-size:11px;opacity:0.85;">Total gastos</div><div style="font-size:18px;font-weight:800;">'+MONEDA.symbol+fmtMonto(totalGastosComiteYAct)+'</div><div style="font-size:10px;opacity:0.75;">Comité + Gastos actividades</div></div></div><div style="border-top:1px solid rgba(255,255,255,0.2);padding-top:14px;"><div style="font-size:11px;opacity:0.9;">Balance final (ingresos − gastos)</div><div style="font-size:22px;font-weight:900;color:'+balanceColor+';">'+MONEDA.symbol+fmtMonto(balanceFinal)+'</div></div></div></div>';
  const secciones='<div class="section"><div class="section-title">🐷 Gastos del Comité</div><table><thead><tr><th>Fecha</th><th>Concepto</th><th>Responsable</th><th>Monto</th></tr></thead><tbody>'+(filasG||'<tr><td colspan="4" style="text-align:center;color:#9ca3af">Sin gastos registrados</td></tr>')+'</tbody></table></div><div class="section"><div class="section-title">💡 Actividades del Comité</div><table><thead><tr><th>Fecha</th><th>Actividad</th><th>Responsable</th><th>Ingresos</th><th>Gastos</th></tr></thead><tbody>'+(filasA||'<tr><td colspan="5" style="text-align:center;color:#9ca3af">Sin actividades registradas</td></tr>')+'</tbody></table></div><div class="section"><div class="section-title">🤲 Donativos</div><table><thead><tr><th>Fecha</th><th>Concepto</th><th>Responsable</th><th>Total</th></tr></thead><tbody>'+(filasD||'<tr><td colspan="4" style="text-align:center;color:#9ca3af">Sin donativos registrados</td></tr>')+'</tbody></table></div><div class="section"><div class="section-title">📜 Votos</div><table><thead><tr><th>Fecha</th><th>Concepto</th><th>Responsable</th><th>Total</th></tr></thead><tbody>'+(filasV||'<tr><td colspan="4" style="text-align:center;color:#9ca3af">Sin votos registrados</td></tr>')+'</tbody></table></div>'+balanceFinalHtml;
  generarPDF('Informe Económico',resumen+secciones);
}
async function generarInformeCaballeros(){
  const cabs=DB.caballeros||[];
  const grupos=GRUPOS||[];
  const totalBaut=cabs.filter(c=>c.bautizado).length;
  const totalSell=cabs.filter(c=>c.sellado).length;
  const totalServ=cabs.filter(c=>c.servidor).length;
  const totalDir=cabs.filter(c=>c.directivo).length;
  const totalPred=cabs.filter(c=>c.predicador).length;
  const totalEvang=cabs.filter(c=>c.evangelista).length;
  const totalDev=cabs.filter(c=>c.devoto).length;
  const barras='<div style="padding:14px 20px 8px">'+barRow('Bautizados',totalBaut,cabs.length,'#16a34a')+barRow('Sellados',totalSell,cabs.length,'#3aabba')+barRow('Servidores',totalServ,cabs.length,'#2d8f9c')+barRow('Directivos',totalDir,cabs.length,'#f5c518')+barRow('Predicadores',totalPred,cabs.length,'#d4a800')+barRow('Evangelistas',totalEvang,cabs.length,'#1d6b77')+barRow('Devotos',totalDev,cabs.length,'#22c55e')+'</div>';
  const filasGrupos=grupos.map(g=>{const n=cabs.filter(c=>c.grupo===g).length;const pct=cabs.length>0?Math.round((n/cabs.length)*100):0;return '<tr><td><strong>'+g+'</strong></td><td>'+n+'</td><td><div class="bar-wrap"><div class="bar-fill" style="width:'+pct+'%;background:#3aabba"></div></div><small style="color:#6b7280">'+pct+'%</small></td></tr>';}).join('');
  const badges=(c)=>{return (CHECKS||[]).filter(k=>c[k]).map(k=>'<span class="badge-mini" style="background:'+(k==='bautizado'?'#dcfce7':k==='sellado'?'#ede9fe':k==='servidor'?'#dcfce7':k==='directivo'?'#fef3c7':k==='predicador'?'#fee2e2':k==='evangelista'?'#fff7ed':'#ecfdf5')+';color:'+(k==='bautizado'?'#15803d':k==='sellado'?'#6d28d9':k==='servidor'?'#15803d':k==='directivo'?'#b45309':k==='predicador'?'#b91c1c':k==='evangelista'?'#c2410c':'#065f46')+'">'+(CLBL||{})[k]||k+'</span>').join(' ');};
  const filasCabs=cabs.map(c=>{const cal=typeof calcCab==='function'?calcCab(c.id):null;const ptsVal=cal?cal.total:(c.puntos!=null?Number(c.puntos):null);const pts=ptsVal==null?'—':(ptsVal===10?'10':ptsVal.toFixed(1));const asist=cal?(cal.asist+'/'+cal.totalClases):'—';const pctAsist=cal&&cal.totalClases>0?Math.round((cal.asist/cal.totalClases)*100):0;return '<tr><td><strong>'+c.nombre+'</strong></td><td>'+(c.grupo||'—')+'</td><td style="font-size:10px">'+badges(c)+'</td><td>'+(c.fnac?fmtDate(c.fnac):'—')+'</td><td>'+asist+(pctAsist>0?' <small style="color:#6b7280">('+pctAsist+'%)</small>':'')+'</td><td style="font-weight:800;color:#3aabba">'+pts+(pts!=='—'?' pts':'')+'</td></tr>';}).join('');
  const html='<div class="section"><div class="section-title">📊 Resumen General · '+cabs.length+' Caballeros</div>'+barras+'<table><thead><tr><th>Grupo</th><th>Caballeros</th><th>%</th></tr></thead><tbody>'+filasGrupos+'</tbody></table></div><div class="section"><div class="section-title">📋 Listado Completo de Caballeros</div><table><thead><tr><th>Nombre</th><th>Grupo</th><th>Distinciones</th><th>Cumpleaños</th><th>Asistencia</th><th>Puntuación</th></tr></thead><tbody>'+filasCabs+'</tbody></table></div>';
  generarPDF('Informe de Caballeros General',html);
}
function generarInformeIndividualPorId(id){
  const cab=DB.caballeros.find(c=>c.id===id);
  if(!cab)return;
  const calCab=typeof calcCab==='function'?calcCab(cab.id):null;
  const ptsNum=calCab?calCab.total:(cab.puntos!=null?Number(cab.puntos):0);
  const pts=ptsNum===10?'10':(typeof ptsNum==='number'&&!isNaN(ptsNum)?ptsNum.toFixed(1):String(ptsNum));
  const pctAsist=calCab&&calCab.totalClases>0?Math.round((calCab.asist/calCab.totalClases)*100):0;
  const totalClases=calCab?calCab.totalClases:0;
  const ptsPosibles=totalClases*10;
  const rank=typeof getRank==='function'?getRank(id):'—';
  const valEstrellas=typeof autoVal==='function'?autoVal(cab):0;
  const escP=s=>String(s||'').replace(/</g,'&lt;').replace(/"/g,'&quot;');
  const rolesTexto=(CHECKS||[]).filter(k=>cab[k]).map(k=>(CLBL||{})[k]||k).join(' / ');
  const starsHtml='<div class="distinciones-pdf"><div class="distinciones-pdf-title">Distinciones</div>'+(rolesTexto?'<div class="distinciones-pdf-roles">'+escP(rolesTexto)+'</div>':'')+'<div class="distinciones-pdf-stars">'+(CHECKS||[]).map((k,i)=>'<div class="distinciones-pdf-item" title="'+(CLBL[k]||k)+'"><div class="distinciones-pdf-starwrap"><span class="star-pdf '+(i<valEstrellas?'lit':'')+'">★</span></div><span class="distinciones-pdf-lbl">'+(CLBL[k]||k)+'</span></div>').join('')+'</div></div>';
  const gastos=(DB.finanzasGastos||[]).filter(x=>x.responsable===id);
  const act=(DB.finanzasActividades||[]).filter(x=>x.responsable===id);
  const don=(DB.finanzasDonativos||[]).filter(x=>x.responsable===id);
  const vot=(DB.finanzasVotos||[]).filter(x=>x.responsable===id);
  const numAct=act.length, numDon=don.length, numVot=vot.length;
  const totalDon=don.reduce((s,d)=>s+(Number(d.efectivo)||0)+(Number(d.tpv)||0),0);
  const totalVot=vot.reduce((s,v)=>s+(Number(v.efectivo)||0)+(Number(v.tpv)||0),0);
  const asistStr=(calCab?calCab.asist:0)+'/'+(totalClases||1);
  const barrasInd='<div style="padding:8px 16px 12px"><div style="margin-bottom:8px"><div style="font-size:10px;color:#4b5563;margin-bottom:3px">Asistencia a clases</div><div style="font-size:14px;font-weight:700;color:#1a1f2e">'+asistStr+'</div>'+barRow('',calCab?calCab.asist:0,totalClases||1,pctAsist>=80?'#16a34a':pctAsist>=60?'#f5c518':'#ef4444')+'</div><div style="margin-bottom:6px"><div style="font-size:10px;color:#4b5563;margin-bottom:3px">Puntuación acumulada vs puntuación posible</div>'+barRow('Acumulada / posible',parseFloat(pts)||0,ptsPosibles||1,'#3aabba')+'<div style="font-size:11px;font-weight:600;color:#3aabba;margin-top:3px">'+pts+' pts de '+(ptsPosibles||0)+' posibles</div></div></div>';
  const fotoCab=cab.photo?'<img src="'+cab.photo+'" style="width:48px;height:48px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-right:10px;border:2px solid rgba(58,171,186,0.3)">':'';
  const esc=(s)=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
  const fila=(lbl,v)=>v?('<div class="stat"><div class="stat-lbl">'+lbl+'</div><div class="stat-val">'+esc(v)+'</div></div>'):'';
  const perfilCompleto='<div style="padding:16px 20px;display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px 20px;">'+
    fila('Nombre completo',cab.nombre)+
    fila('Nombre a mostrar',cab.nombreMostrar)+
    fila('Teléfono',cab.telefono)+
    fila('Grupo',cab.grupo)+
    fila('Distintivo',cab.dist)+
    fila('Fecha de nacimiento',cab.fnac?fmtDate(cab.fnac):'')+
    fila('Fecha de bautismo',cab.fechaBautizado?fmtDate(cab.fechaBautizado):'')+
    fila('Fecha de sellado',cab.fechaSellado?fmtDate(cab.fechaSellado):'')+
    fila('Ciudad de nacimiento',cab.ciudadNacimiento)+
    fila('País de nacimiento',cab.paisNacimiento)+
    fila('Año de conversión',cab.anioConversion)+
    fila('Iglesia de procedencia',cab.iglesiaProcedencia)+
    fila('Profesión u oficio',cab.profesionOficio)+
    fila('Gustos / aficiones',cab.gustosAficiones)+
    fila('Rol en la iglesia',(cab.rolActual||'').replace(/\n/g,' · '))+
    fila('Estado civil',cab.estadoCivil==='soltero'?'Soltero':cab.estadoCivil==='casado'?'Casado':cab.estadoCivil==='noviazgo'?'En noviazgo':cab.estadoCivil==='otro'?'Otro':cab.estadoCivil||'')+
    fila('¿Tiene hijos?',cab.tieneHijos==='no'?'No':cab.tieneHijos==='si'?(cab.numHijos?('Sí ('+cab.numHijos+')'):'Sí')+(cab.infoHijos?': '+esc(cab.infoHijos):''):cab.tieneHijos||'')+
    fila('Versículo o lema',cab.lema)+
    fila('Campamento (¿vas?)',cab.campamentoRespuesta==='si'?'Sí':cab.campamentoRespuesta==='no'?'No':cab.campamentoRespuesta==='aun_no_se'?'Aún no lo sé':cab.campamentoRespuesta||'')+
    '</div>';
  const datos='<div class="section"><div class="section-title">'+fotoCab+'Datos del Caballero (perfil completo)</div>'+perfilCompleto+'<div style="padding:0 20px 16px">'+starsHtml+'</div><div style="padding:16px 20px;display:flex;flex-wrap:wrap;gap:16px"><div class="stat"><div class="stat-lbl">Puntuación acumulada vs puntuación posible</div><div class="stat-val">'+pts+' / '+(ptsPosibles||0)+' pts</div></div><div class="stat"><div class="stat-lbl">Puntos aportados al grupo</div><div class="stat-val">'+pts+' pts</div></div><div class="stat"><div class="stat-lbl">Rank</div><div class="stat-val">#'+rank+'</div></div></div>'+barrasInd+'</div>';
  const GRUPOS_ACT=GRUPOS||[];
  const grupoStats={};
  GRUPOS_ACT.forEach(g=>{
    const miembros=DB.caballeros.filter(x=>x.grupo===g);
    const totalPts=miembros.reduce((s,x)=>s+calcCab(x.id).total,0);
    const avgPts=miembros.length?+(totalPts/miembros.length).toFixed(1):0;
    const asistTot=miembros.reduce((s,x)=>s+calcCab(x.id).asist,0);
    const posTot=miembros.length*DB.clases.length;
    const pctAsistG=posTot?Math.round((asistTot/posTot)*100):0;
    grupoStats[g]={miembros,totalPts:+totalPts.toFixed(1),avgPts,asistTot,pctAsist:pctAsistG};
  });
  const ranking=[...GRUPOS_ACT].sort((a,b)=>grupoStats[b].avgPts-grupoStats[a].avgPts);
  const maxAvg=grupoStats[ranking[0]]?.avgPts||1;
  const miGrupo=cab.grupo;
  const col=GCOL[miGrupo]||'#3aabba';
  const miRank=ranking.indexOf(miGrupo)+1;
  const medal=miRank===1?'🥇':miRank===2?'🥈':miRank===3?'🥉':'';
  const secEstadisticasGrupo='<div class="section"><div class="section-title">📊 Estadísticas gráficas del grupo</div><div style="padding:12px 16px"><div style="background:linear-gradient(135deg,#1a1f2e 0%,#242b3d 50%);border-radius:8px;padding:10px 14px;margin-bottom:10px;color:white;"><div style="font-size:10px;opacity:0.8;margin-bottom:3px">Mi grupo</div><div style="font-size:13px;font-weight:700">'+medal+' '+(miGrupo||'—')+'</div><div style="display:flex;gap:12px;margin-top:8px;flex-wrap:wrap"><div><div style="font-size:14px;font-weight:700">'+(grupoStats[miGrupo]?.avgPts??'—')+'</div><div style="font-size:8px;opacity:0.8">Prom. pts</div></div><div><div style="font-size:14px;font-weight:700">'+(grupoStats[miGrupo]?.pctAsist??0)+'%</div><div style="font-size:8px;opacity:0.8">Asistencia</div></div><div><div style="font-size:14px;font-weight:700">#'+miRank+'</div><div style="font-size:8px;opacity:0.8">Ranking</div></div></div></div><div style="font-size:10px;font-weight:600;color:#4b5563;margin-bottom:6px">Comparación con el resto de grupos</div>'+ranking.map((g,i)=>{const st=grupoStats[g];const esMio=g===miGrupo;const pct=maxAvg>0?Math.round((st.avgPts/maxAvg)*100):0;return '<div style="margin-bottom:6px"><div style="display:flex;justify-content:space-between;margin-bottom:3px"><span style="font-weight:600;color:'+(esMio?col:'#374151')+';font-size:11px">'+(i+1)+'. '+g+'</span><span style="font-weight:700;font-size:11px">'+st.avgPts+' pts · '+st.pctAsist+'% asist</span></div><div style="height:5px;background:#e5e7eb;border-radius:999px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:'+(esMio?col:'#9ca3af')+';border-radius:999px"></div></div></div>';}).join('')+'</div></div></div>';
  const secFinanzas='<div class="section"><div class="section-title">💰 Información financiera aportada al comité</div><div style="padding:16px 20px;display:flex;flex-wrap:wrap;gap:16px"><div class="stat"><div class="stat-lbl">Colaboraciones (actividades)</div><div class="stat-val">'+numAct+'</div></div><div class="stat"><div class="stat-lbl">Donativos</div><div class="stat-val">'+numDon+' ('+MONEDA.symbol+fmtMonto(totalDon)+')</div></div><div class="stat"><div class="stat-lbl">Votos</div><div class="stat-val">'+numVot+' ('+MONEDA.symbol+fmtMonto(totalVot)+')</div></div></div></div>';
  const histClases=typeof mkHistoryTable==='function'?mkHistoryTable(id,true):'<p style="color:#9ca3af;font-size:13px;padding:16px">Sin historial de estudios.</p>';
  const respuestasEval=(DB.evaluacionRespuestas||[]).filter(r=>r.cabId===id).sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''));
  const filasEval=respuestasEval.map(r=>{const ev=(DB.evaluaciones||[]).find(e=>e.id===r.evaluacionId);const titulo=ev&&ev.titulo?escP(ev.titulo):'—';const total=r.totalPreguntas||0;const nota10=total>0?+(r.puntuacion/total*10):null;const notaStr=nota10!=null?(typeof fmtScore==='function'?fmtScore(nota10):(nota10===10?'10':nota10.toFixed(1))):'—';return '<tr><td>'+titulo+'</td><td>'+r.puntuacion+' / '+total+'</td><td class="stat-val">'+notaStr+'</td></tr>';}).join('');
  const secHistorialEval=respuestasEval.length?'<div class="section"><div class="section-title">📝 Historial de evaluaciones</div><table><thead><tr><th>Evaluación</th><th>Correctas</th><th>Puntaje /10</th></tr></thead><tbody>'+filasEval+'</tbody></table></div>':'';
  const peticionesCab=(DB.peticiones||[]).filter(p=>p.cabId===id&&p.nombre!=='Anónimo').sort((a,b)=>(b.ts||0)-(a.ts||0));
  const filasPet=peticionesCab.map(p=>'<tr><td>'+(p.fecha||'—')+'</td><td>'+(p.texto||'').replace(/</g,'&lt;').substring(0,120)+(p.texto&&p.texto.length>120?'…':'')+'</td></tr>').join('');
  const secPeticiones=peticionesCab.length?'<div class="section"><div class="section-title">🙏 Historial de peticiones a su nombre</div><table><thead><tr><th>Fecha</th><th>Petición</th></tr></thead><tbody>'+filasPet+'</tbody></table></div>':'';
  const filasG=gastos.map(g=>'<tr><td>'+(g.fecha||'—')+'</td><td><strong>'+(g.concepto||'').replace(/</g,'&lt;')+'</strong></td><td class="neg">'+MONEDA.symbol+fmtMonto(g.monto)+'</td></tr>').join('');
  const filasA=act.map(a=>'<tr><td>'+(a.fecha||'—')+'</td><td><strong>'+(a.nombre||'').replace(/</g,'&lt;')+'</strong></td><td class="pos">'+MONEDA.symbol+fmtMonto((Number(a.efectivo)||0)+(Number(a.tpv)||0))+'</td><td class="neg">'+MONEDA.symbol+fmtMonto(a.gastos)+'</td></tr>').join('');
  const filasD=don.map(d=>'<tr><td>'+(d.fecha||'—')+'</td><td><strong>'+(d.concepto||'').replace(/</g,'&lt;')+'</strong></td><td class="pos">'+MONEDA.symbol+fmtMonto((Number(d.efectivo)||0)+(Number(d.tpv)||0))+'</td></tr>').join('');
  const filasV=vot.map(v=>'<tr><td>'+(v.fecha||'—')+'</td><td><strong>'+(v.concepto||'').replace(/</g,'&lt;')+'</strong></td><td class="pos">'+MONEDA.symbol+fmtMonto((Number(v.efectivo)||0)+(Number(v.tpv)||0))+'</td></tr>').join('');
  const secciones=secEstadisticasGrupo+secFinanzas+'<div class="section"><div class="section-title">📚 Historial de estudios</div><div style="padding:12px 16px">'+histClases+'</div></div>'+secHistorialEval+secPeticiones+(gastos.length?'<div class="section"><div class="section-title">🐷 Gastos como responsable</div><table><thead><tr><th>Fecha</th><th>Concepto</th><th>Monto</th></tr></thead><tbody>'+filasG+'</tbody></table></div>':'')+(act.length?'<div class="section"><div class="section-title">💡 Actividades como responsable</div><table><thead><tr><th>Fecha</th><th>Actividad</th><th>Ingresos</th><th>Gastos</th></tr></thead><tbody>'+filasA+'</tbody></table></div>':'')+(don.length?'<div class="section"><div class="section-title">🤲 Donativos como responsable</div><table><thead><tr><th>Fecha</th><th>Concepto</th><th>Total</th></tr></thead><tbody>'+filasD+'</tbody></table></div>':'')+(vot.length?'<div class="section"><div class="section-title">📜 Votos como responsable</div><table><thead><tr><th>Fecha</th><th>Concepto</th><th>Total</th></tr></thead><tbody>'+filasV+'</tbody></table></div>':'');
  generarPDF('Informe Individual: '+cab.nombre,datos+secciones);
}
function generarInformeIndividual(){
  const sel=document.getElementById('informe-cab-sel');
  const id=sel?.value;
  if(!id){toast('Selecciona un caballero','err');return;}
  if(!DB.caballeros.find(c=>c.id===id)){toast('Caballero no encontrado','err');return;}
  generarInformeIndividualPorId(id);
}

// ═══════════════════════════════════════════════════════════════
// TEMPORIZADOR DE ORACIÓN (Vista personal)
// ═══════════════════════════════════════════════════════════════
let prayerInterval=null;
let prayerSeconds=20*60;
let prayerRunning=false;

function togglePrayerTimer(){
  if(prayerRunning){
    clearInterval(prayerInterval);
    prayerRunning=false;
    prayerSeconds=20*60;
    document.getElementById('prayer-timer-display').textContent='20:00';
    document.getElementById('prayer-timer-label').textContent='INICIAR';
    document.getElementById('prayer-banner').style.boxShadow='0 4px 20px rgba(139,92,246,0.2)';
  } else {
    prayerRunning=true;
    document.getElementById('prayer-timer-label').textContent='DETENER';
    document.getElementById('prayer-banner').style.boxShadow='0 4px 24px rgba(139,92,246,0.5)';
    prayerInterval=setInterval(()=>{
      prayerSeconds--;
      if(prayerSeconds<=0){
        clearInterval(prayerInterval);
        prayerRunning=false;
        document.getElementById('prayer-timer-display').textContent='✅';
        document.getElementById('prayer-timer-label').textContent='¡AMÉN!';
        document.getElementById('prayer-banner').style.boxShadow='0 4px 24px rgba(22,163,74,0.5)';
        toast('🙏 ¡20 minutos de oración completados! Amén.','ok');
        setTimeout(()=>{
          prayerSeconds=20*60;
          document.getElementById('prayer-timer-display').textContent='20:00';
          document.getElementById('prayer-timer-label').textContent='INICIAR';
          document.getElementById('prayer-banner').style.boxShadow='0 4px 20px rgba(139,92,246,0.2)';
        },4000);
        return;
      }
      const m=Math.floor(prayerSeconds/60);
      const s=prayerSeconds%60;
      document.getElementById('prayer-timer-display').textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    },1000);
  }
}

// Historial de uso de la app (caballeros): entradas, material, cuestionarios, perfil
function logAppHistorial(cabId,accion,detalle){
  if(!cabId||!DB||!Array.isArray(DB.appHistorial))return;
  DB.appHistorial.push({cabId,accion,detalle:detalle||'',ts:Date.now()});
  const hace7d=Date.now()-7*24*60*60*1000;
  while(DB.appHistorial.length>0&&DB.appHistorial[0].ts<hace7d)DB.appHistorial.shift();
  if(DB.appHistorial.length>800){DB.appHistorial=DB.appHistorial.slice(-600);}
  saveDB().catch(()=>{});
}

// ═══════════════════════════════════════════════════════════════
// EVIDENCIAS — Texto del plan (cuadro flotante al clic en logo caballeros)
// ═══════════════════════════════════════════════════════════════
function getEvidenciasInfoHTML(){
  return `<div style="font-size:17px;line-height:1.85;color:var(--text2);max-height:70vh;overflow-y:auto;font-family:'Lato',sans-serif;">
  <p style="font-size:19px;line-height:1.6;color:var(--dark);font-weight:600;margin-bottom:18px;">En años anteriores, nuestros planes de trabajo de Hombres de Verdad se han enfocado en identidad y propósito. En <strong style="color:var(--teal2);">Raíces</strong> exploramos los fundamentos bíblicos que sostienen la vida del varón cristiano, fortaleciendo su fe y afirmando su pertenencia a Cristo.</p>
  <p style="margin-bottom:16px;">En <strong style="color:var(--teal2);">El Legado</strong>, llamamos a los hombres a proyectar su vida más allá de sí mismos, dejando huellas firmes en su familia, su comunidad y las generaciones venideras.</p>
  <p style="margin-bottom:16px;">Para el 2026, la realidad espiritual y social que enfrentan los hombres demanda un paso más: la coherencia visible entre lo que creemos y lo que vivimos.</p>
  <p style="margin-bottom:16px;">El contexto actual está marcado por la necesidad que plantea el apóstol Pablo en Romanos 8:19: la manifestación gloriosa de los hijos de Dios. Ante ello, la escritura nos enseña que el fruto del Espíritu Santo es la prueba tangible de una vida transformada (Gálatas 5:22-23).</p>
  <p style="margin-bottom:12px;font-weight:600;color:var(--dark);">Por eso, el plan "Evidencias" surge como continuidad natural de nuestro proceso formativo:</p>
  <p style="margin-left:16px;padding:16px 18px;background:linear-gradient(135deg,rgba(58,171,186,0.08) 0%,rgba(45,143,156,0.12) 100%);border-radius:12px;border-left:4px solid var(--teal);font-size:18px;color:var(--dark);margin-bottom:20px;">
    Si Raíces respondió a la pregunta "¿De dónde vengo?"<br>
    Y Legado a la pregunta "¿Qué dejo?"<br>
    <strong style="color:var(--teal2);font-size:19px;">Evidencias</strong> responde a "¿Qué demuestra que vivo para Dios?"
  </p>
  <p style="margin-bottom:16px;">"Evidencias" además de transmitir conocimiento bíblico, busca formar carácter, desarrollar dominio propio, cultivar relaciones sanas y reflejar el amor de Cristo de manera práctica. Así, los Hombres de Verdad no solo hablan de fe, sino que la hacen visible en su hogar, en su trabajo y en su comunidad, convirtiéndose en testigos vivos del poder transformador del Espíritu Santo.</p>
  <p style="margin-bottom:20px;">"Evidencias" promueve la coherencia entre la fe y la vida práctica de los hombres, de manera que cada área espiritual, familiar, laboral y social se convierta en evidencia clara del obrar de Dios.</p>
  <p style="margin-top:20px;padding:18px 20px;background:linear-gradient(135deg,rgba(58,171,186,0.12) 0%,rgba(45,143,156,0.08) 100%);border-radius:12px;border-left:5px solid var(--teal);font-style:italic;color:var(--dark);font-size:18px;line-height:1.7;box-shadow:0 2px 12px rgba(58,171,186,0.15);">No me elegisteis vosotros a mí, sino que yo os elegí a vosotros, y os he puesto para que vayáis y llevéis fruto, y vuestro fruto permanezca; para que todo lo que pidiereis al Padre en mi nombre, él os lo dé. <strong style="color:var(--teal2);">San Juan 15:16</strong></p>
</div>`;
}

// ═══════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════
async function initApp(){
  await loadDB();
  if(typeof navigator!=='undefined'&&'serviceWorker' in navigator){ navigator.serviceWorker.register('sw.js').catch(function(){}); }
  if(typeof buildSel==='function')buildSel();
  const savedCab=typeof sessionStorage!=='undefined'?sessionStorage.getItem('caballeros_miembro'):null;
  if(savedCab&&DB.caballeros&&DB.caballeros.some(c=>c.id===savedCab)){
    currentCabId=savedCab;
    logAppHistorial(savedCab,'entrada_app','Entró a la app');
    showSc('screen-personal');
    if(typeof renderPersonal==='function')renderPersonal(savedCab);
    function scrollInicioArriba(){
      window.scrollTo(0,0);
      if(document.documentElement)document.documentElement.scrollTop=0;
      if(document.body)document.body.scrollTop=0;
      var sp=document.getElementById('screen-personal');
      if(sp)sp.scrollTop=0;
      var tabActivo=sp?sp.querySelector('.pv-tab.active'):null;
      if(tabActivo)tabActivo.scrollTop=0;
    }
    setTimeout(scrollInicioArriba,0);
    setTimeout(scrollInicioArriba,80);
    setTimeout(scrollInicioArriba,200);
  }
  setInterval(function(){if(document.hidden)location.reload();},3600000);
  window._reportLogos={favicon:'',ev:(document.querySelector('#screen-admin .ev-banner img')||document.querySelector('.ev-banner img'))?.src||''};
  fetch('favicon.png').then(r=>r.blob()).then(blob=>new Promise((res,rej)=>{const rd=new FileReader();rd.onload=()=>res(rd.result);rd.onerror=rej;rd.readAsDataURL(blob);})).then(dataUrl=>{window._reportLogos.favicon=dataUrl;}).catch(()=>{});
  // Clonar banner de evidencias para que también lo vean los caballeros (siempre bajo pestañas; clic = info)
  const adminBanner=document.querySelector('#screen-admin .ev-banner');
  const personalWrap=document.getElementById('ev-banner-personal-wrap');
  if(adminBanner&&personalWrap){
    personalWrap.innerHTML=adminBanner.innerHTML;
    personalWrap.style.cursor='pointer';
    personalWrap.title='Ver qué es Evidencias';
    personalWrap.onclick=function(){ if(typeof openSheet==='function') openSheet('🍇','Evidencias 2026','Plan de trabajo Hombres de Verdad', getEvidenciasInfoHTML()); };
  }
  if(adminBanner){
    adminBanner.style.cursor='pointer';
    adminBanner.title='Ver qué es Evidencias';
    adminBanner.onclick=function(){ if(typeof openSheet==='function') openSheet('🍇','Evidencias 2026','Plan de trabajo Hombres de Verdad', getEvidenciasInfoHTML()); };
  }
  if(adminBanner&&window._reportLogos)window._reportLogos.ev=adminBanner.querySelector('img')?.src||window._reportLogos.ev;
  renderVersoDelDia();
  const acts=document.querySelector('.hacts');
}

function openModalEvidencias(){
  const body=`<div class="ev-modal-body" style="font-family:'Lato',sans-serif;font-size:14px;line-height:1.75;color:var(--text2);max-height:70vh;overflow-y:auto;">
    <p style="margin-bottom:14px;">En años anteriores, nuestros planes de trabajo de Hombres de Verdad se han enfocado en identidad y propósito. En <strong>Raíces</strong> exploramos los fundamentos bíblicos que sostienen la vida del varón cristiano, fortaleciendo su fe y afirmando su pertenencia a Cristo.</p>
    <p style="margin-bottom:14px;">En <strong>El Legado</strong>, llamamos a los hombres a proyectar su vida más allá de sí mismos, dejando huellas firmes en su familia, su comunidad y las generaciones venideras.</p>
    <p style="margin-bottom:14px;">Para el 2026, la realidad espiritual y social que enfrentan los hombres demanda un paso más: la coherencia visible entre lo que creemos y lo que vivimos.</p>
    <p style="margin-bottom:14px;">El contexto actual está marcado por la necesidad que plantea el apóstol Pablo en Romanos, 8:19: la manifestación gloriosa de los hijos de Dios. Ante ello, la escritura nos enseña que el fruto del Espíritu Santo es la prueba tangible de una vida transformada (Gálatas 5:22-23).</p>
    <p style="margin-bottom:14px;">Por eso, el plan <strong>"Evidencias"</strong> surge como continuidad natural de nuestro proceso formativo:</p>
    <p style="margin-bottom:14px;">Si Raíces respondió a la pregunta <em>"¿De dónde vengo?"</em><br>Y Legado a la pregunta <em>"¿Qué dejo?"</em><br>Evidencias responde a <em>"¿Qué demuestra que vivo para Dios?"</em></p>
    <p style="margin-bottom:14px;">"Evidencias" además de transmitir conocimiento bíblico, busca formar carácter, desarrollar dominio propio, cultivar relaciones sanas y reflejar el amor de Cristo de manera práctica. Así, los Hombres de Verdad no solo hablan de fe, sino que la hacen visible en su hogar, en su trabajo y en su comunidad, convirtiéndose en testigos vivos del poder transformador del Espíritu Santo.</p>
    <p style="margin-bottom:14px;">"Evidencias" promueve la coherencia entre la fe y la vida práctica de los hombres, de manera que cada área espiritual, familiar, laboral y social se convierta en evidencia clara del obrar de Dios.</p>
    <p style="margin-top:20px;padding:14px;background:rgba(58,171,186,0.1);border-radius:12px;border-left:4px solid var(--teal);font-style:italic;color:var(--dark);">No me elegisteis vosotros a mí, sino que yo os elegí a vosotros, y os he puesto para que vayáis y llevéis fruto, y vuestro fruto permanezca; para que todo lo que pidiereis al Padre en mi nombre, él os lo dé. <strong>San Juan 15:16</strong></p>
  </div>`;
  if(typeof openSheet==='function')openSheet('🍇','Evidencias 2026','Plan de trabajo · Hombres de Verdad',body);
}

document.addEventListener('DOMContentLoaded', initApp);

