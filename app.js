// Extraído desde index.html: lógica principal de la app Caballeros

// ═══════════════════════════════════════════════════════════════
// CONFIG & DB
// ═══════════════════════════════════════════════════════════════
const SK = 'hdv_v2';
let DB = {};
let currentCabId = null;
let gradeClaseId = null;

// Moneda y locale unificados (pantalla e informes PDF)
const MONEDA = { symbol: '$', locale: 'es-CO' };
function fmtMonto(n){ return (Number(n)||0).toLocaleString(MONEDA.locale,{minimumFractionDigits:2,maximumFractionDigits:2}); }

// ═══════════════════════════════════════════════════════════════
// NUBE — Firebase Firestore (como Escuela Dominical)
// ═══════════════════════════════════════════════════════════════
const FIRESTORE_COLLECTION = 'caballeros_data';
const FIRESTORE_DOC = 'db';

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
  var str=JSON.stringify(data);
  if(str.length>900000)console.warn('Payload grande:',Math.round(str.length/1024),'KB. Firestore limita 1 MB por documento.');
  await database.collection(FIRESTORE_COLLECTION).doc(FIRESTORE_DOC).set({value:str},{merge:true});
}

function useCloud(){
  return !!window.FIREBASE_CONFIGURED;
}

function showLoading(msg){
  let el=document.getElementById('fb-loading');
  if(!el){
    el=document.createElement('div');el.id='fb-loading';
    el.style.cssText='position:fixed;inset:0;background:white;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9999;font-family:Lato,sans-serif;gap:14px;';
    el.innerHTML=`<div style="font-size:42px">🛡️</div><div style="font-family:Montserrat,sans-serif;font-size:18px;font-weight:800;color:#1a1f2e">Hombres de Verdad</div><div id="fb-load-msg" style="color:#3aabba;font-size:13px;font-weight:600">${msg}</div><div style="width:40px;height:40px;border:3px solid #e5e7eb;border-top-color:#3aabba;border-radius:50%;animation:spin 0.7s linear infinite"></div><style>@keyframes spin{to{transform:rotate(360deg)}}</style>`;
    document.body.appendChild(el);
  }else{const m=document.getElementById('fb-load-msg');if(m)m.textContent=msg;}
}
function hideLoading(){const el=document.getElementById('fb-loading');if(el)el.remove();}

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

async function recuperarDesdeBackup(){
  const ta=document.getElementById('legacy-json-inp');
  if(!ta||!ta.value.trim()){toast('Pega el JSON de la base anterior en el cuadro de texto','err');return;}
  let legacy;
  try{legacy=JSON.parse(ta.value.trim());}catch(e){toast('JSON inválido. Revisa que sea una copia completa de la base.','err');return;}
  if(!legacy.caballeros||!Array.isArray(legacy.caballeros)){toast('El JSON no tiene lista de caballeros.','err');return;}
  // Reemplazar por completo caballeros y clases desde el backup
  DB.caballeros=JSON.parse(JSON.stringify(legacy.caballeros||[]));
  DB.clases=JSON.parse(JSON.stringify(legacy.clases||[]));
  if(Array.isArray(legacy.peticiones))DB.peticiones=JSON.parse(JSON.stringify(legacy.peticiones));
  ensureDbShape();
  toast('💾 Guardando base restaurada...','info');
  const ok=await saveDB();
  if(ok){
    toast('✅ Caballeros y clases restaurados y guardados en Firebase.','ok');
    ta.value='';
    renderPeticiones();
    invalidateCache();
    if(typeof renderClases==='function')renderClases();
    if(typeof buildSel==='function')buildSel();
    renderDash();
  }
  else toast('Error al guardar. Comprueba conexión.','err');
}

async function loadDB(){
  showLoading('Cargando datos...');
  // Intentar nube
  if(useCloud()){
    try{
      const data=await cloudLoad();
      if(data&&data.caballeros&&data.caballeros.length>0){
        DB=data;
        ensureDbShape();
        // Recuperación automática: si en localStorage hay copia antigua con fotos/claves/peticiones, fusionar y guardar en Firebase
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
        hideLoading();return;
      }
      // Bin vacío — cargar datos iniciales
      showLoading('Cargando datos iniciales...');
      DB=seedDB();
      await cloudSave(DB);
      hideLoading();return;
    }catch(e){
      console.warn('Nube falló, usando localStorage:',e);
      toast('⚠️ Sin conexión a la nube','err');
    }
  }
  // localStorage como respaldo
  try{const r=localStorage.getItem(SK);if(r)DB=JSON.parse(r);}catch(e){}
  if(!DB||!DB.caballeros)DB=seedDB();
  ensureDbShape();
  try{localStorage.setItem(SK,JSON.stringify(DB));}catch(e){}
  hideLoading();
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
        toast('⚠️ Error al guardar en Firebase: '+msg,'err');
      }
      try{localStorage.setItem(SK,JSON.stringify(DB));}catch(_){}
      console.error('cloudSave failed',e);
      return false;
    }
  }
  try{localStorage.setItem(SK,JSON.stringify(DB));return true;}catch(e){
    console.error('localStorage save failed',e);
    toast('⚠️ No se pudo guardar (espacio o privacidad).','err');
    return false;
  }
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

// Asegura que la estructura de DB tenga todos los campos esperados
function ensureDbShape(){
  if(!DB)DB={};
  if(!Array.isArray(DB.caballeros))DB.caballeros=[];
  DB.caballeros.forEach(c=>{
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
  });
  if(!DB.peticiones)DB.peticiones=[];
  if(!DB.eventos)DB.eventos=JSON.parse(JSON.stringify(SEED_EVENTOS));
  if(!DB.eventosCultosOverride)DB.eventosCultosOverride={};
  if(!DB.eventosEstudiosOverride)DB.eventosEstudiosOverride={};
  if(!DB.finanzasGastos)DB.finanzasGastos=[];
  if(!DB.finanzasActividades)DB.finanzasActividades=[];
  if(!DB.finanzasDonativos)DB.finanzasDonativos=[];
  if(!DB.finanzasVotos)DB.finanzasVotos=[];
  if(DB.adminNombre===undefined)DB.adminNombre='';
  if(DB.adminPhoto===undefined)DB.adminPhoto='';
  addClasesFaltantes();
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
function calcCab(id){
  if(_calcCache[id])return _calcCache[id];
  let si=0,sp=0,sd=0,spa=0,n=0,tot=0;
  DB.clases.forEach(cl=>{const q=cl.cal[id];if(q){tot+=(q.a?rowTotal(q):0);if(q.a){si+=q.i;sp+=q.p;sd+=q.d;spa+=q.pa;n++;}}});
  const result={i:n?+(si/n).toFixed(1):0,p:n?+(sp/n).toFixed(1):0,d:n?+(sd/n).toFixed(1):0,pa:n?+(spa/n).toFixed(1):0,asist:n,totalClases:DB.clases.length,total:+tot.toFixed(1)};
  _calcCache[id]=result;
  return result;
}
function claseAvg(cl){const vs=Object.values(cl.cal).filter(q=>q.a);return vs.length?+(vs.reduce((s,q)=>s+rowTotal(q),0)/vs.length).toFixed(2):0;}
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
function fmtScore(v){if(v==null||v===undefined||isNaN(v))return '—';const n=Number(v);if(n===10)return '10';return n.toFixed(1);}
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
  const hist=DB.clases.filter(cl=>cl.cal[cabId]).map(cl=>({fecha:cl.fecha,tema:cl.tema,...cl.cal[cabId],t:rowTotal(cl.cal[cabId])})).sort((a,b)=>b.fecha.localeCompare(a.fecha));
  if(!hist.length)return'<p style="color:var(--text3);font-size:13px">Sin clases.</p>';
  const temaStyle=forPdf?'font-size:10px;white-space:normal;word-wrap:break-word;line-height:1.35;':'font-size:11px;white-space:normal;word-wrap:break-word;line-height:1.4;';
  const headers=forPdf?'<tr><th>Fecha</th><th>Tema</th><th>Asistencia</th><th>Puntualidad</th><th>Interés</th><th>Dominio</th><th>Participación</th><th>Total</th></tr>':'<tr><th>Fecha</th><th>Tema</th><th>A</th><th>Pun</th><th>Int</th><th>Dom</th><th>Par</th><th>Tot</th></tr>';
  return`<table class="dtable ${forPdf?'dtable-pdf':'dtable-perfil'}"><thead>${headers}</thead><tbody>${
    hist.map(r=>`<tr><td>${fmtDate(r.fecha)}</td><td style="${temaStyle}">${forPdf?(r.tema||'—').replace(/</g,'&lt;'):abrevTema(r.tema).replace(/</g,'&lt;')}</td><td>${r.a?'✅':'❌'}</td><td>${r.a?r.p:'—'}</td><td>${r.a?r.i:'—'}</td><td>${r.a?r.d:'—'}</td><td>${r.a?r.pa:'—'}</td><td class="sc ${scCls(r.t)}">${r.a?fmtScore(r.t):'—'}</td></tr>`).join('')
  }</tbody></table>`;
}

// Versión compacta para vista personal: agrupa por año y permite plegar
function mkHistoryTableCompact(cabId){
  const hist=DB.clases.filter(cl=>cl.cal[cabId]).map(cl=>({fecha:cl.fecha,tema:cl.tema,...cl.cal[cabId],t:rowTotal(cl.cal[cabId])})).sort((a,b)=>b.fecha.localeCompare(a.fecha));
  if(!hist.length)return'<p style="color:var(--text3);font-size:13px">Sin clases.</p>';
  const byYear={};
  hist.forEach(r=>{
    const y=r.fecha.substring(0,4);
    if(!byYear[y])byYear[y]=[];
    byYear[y].push(r);
  });
  const years=Object.keys(byYear).sort((a,b)=>b.localeCompare(a));
  const temaStyle='font-size:11px;white-space:normal;word-wrap:break-word;line-height:1.4;';
  let out='';
  years.forEach((y,idx)=>{
    const rows=byYear[y].map(r=>`<tr>
      <td>${fmtDate(r.fecha)}</td>
      <td style="${temaStyle}">${abrevTema(r.tema).replace(/</g,'&lt;')}</td>
      <td>${r.a?'✅':'❌'}</td>
      <td>${r.a?r.p:'—'}</td>
      <td>${r.a?r.i:'—'}</td>
      <td>${r.a?r.d:'—'}</td>
      <td>${r.a?r.pa:'—'}</td>
      <td class="sc ${scCls(r.t)}">${r.a?fmtScore(r.t):'—'}</td>
    </tr>`).join('');
    out+=`<details ${idx===0?'open':''} style="margin-bottom:8px;">
      <summary style="font-family:Montserrat,sans-serif;font-size:12px;font-weight:800;color:#1a1f2e;cursor:pointer;outline:none;">📅 ${y} (${byYear[y].length} clases)</summary>
      <div style="margin-top:6px;">
        <table class="dtable dtable-perfil">
          <thead><tr><th>Fecha</th><th>Tema</th><th>A</th><th>Pun</th><th>Int</th><th>Dom</th><th>Par</th><th>Tot</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </details>`;
  });
  return out;
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
}
function buildSel(){
  const sel=document.getElementById('miembro-sel');
  if(!sel)return;
  sel.innerHTML='<option value="">— Seleccionar —</option>';
  if(!DB||!DB.caballeros)return;
  [...DB.caballeros].sort((a,b)=>a.nombre.localeCompare(b.nombre)).forEach(c=>{
    const o=document.createElement('option');o.value=c.id;o.textContent=c.nombre;sel.appendChild(o);
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
}
function doLogin(){
  const err=document.getElementById('login-err');err.style.display='none';
  if(loginMode==='admin'){
    if(document.getElementById('admin-pw').value===DB.adminPw){showSc('screen-admin');initAdmin();}
    else{err.textContent='Contraseña incorrecta.';err.style.display='block';}
  }else{
    const v=document.getElementById('miembro-sel').value;
    if(!v){err.textContent='Selecciona tu nombre.';err.style.display='block';return;}
    const c=DB.caballeros.find(x=>x.id===v);if(!c)return;
    const pw=document.getElementById('miembro-pw').value;
    if(!c.pw){
      // Primera vez — crear contraseña
      if(pw.length<4){err.textContent='Crea una contraseña de al menos 4 caracteres.';err.style.display='block';return;}
      c.pw=pw;saveDB();toast('🔑 ¡Contraseña creada! Recuérdala bien.','ok');
    }else{
      // Verificar: contraseña propia O contraseña maestra (admin)
      if(pw!==c.pw&&pw!==DB.adminPw){err.textContent='Contraseña incorrecta.';err.style.display='block';return;}
    }
    currentCabId=v;showSc('screen-personal');renderPersonal(v);
  }
}
function logout(){document.getElementById('admin-pw').value='';document.getElementById('miembro-pw').value='';document.getElementById('miembro-sel').value='';document.getElementById('miembro-pw-wrap').style.display='none';document.getElementById('login-err').style.display='none';showSc('screen-login');}

// ═══════════════════════════════════════════════════════════════
// SCREENS / TABS
// ═══════════════════════════════════════════════════════════════
function showSc(id){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));document.getElementById(id).classList.add('active');}
function showTab(id,el){
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.ntab').forEach(t=>t.classList.remove('active'));
  document.getElementById(id).classList.add('active');if(el)el.classList.add('active');
  if(id==='t-grupos')renderGrupos();
  if(id==='t-cabs')renderCabs();
  if(id==='t-clases')renderClases();
  if(id==='t-calgr')renderCalGr();
  if(id==='t-cumple')renderCumple();
  if(id==='t-peticiones'){cargarPeticionesAdmin();}
  if(id==='t-eventos-admin'){renderEventosAdmin();}
  if(id==='t-finanzas'){renderFinanzas();}
  if(id==='t-informes'){renderInformes();}
}
function initAdmin(){
  buildSel();renderDash();renderCabs();
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

function goToStatCard(tipo){
  if(tipo==='clases'){showTab('t-clases',document.querySelector('.ntab[onclick*="t-clases"]'));return;}
  fGrupo='TODOS';
  if(tipo==='caballeros')fBadge='TODOS';
  else if(tipo==='hermanos')fBadge='Hermano';
  else if(tipo==='amigos')fBadge='Amigo';
  _lastFGrupo=null;_lastFBadge=null;
  showTab('t-cabs',document.querySelector('.ntab[onclick*="t-cabs"]'));
}
function renderDash(){
  document.getElementById('stats-grid').innerHTML=`
    <div class="stat-card stat-click" onclick="goToStatCard('caballeros')"><div class="stat-num">${DB.caballeros.length}</div><div class="stat-lbl">Caballeros</div></div>
    <div class="stat-card stat-click" onclick="goToStatCard('hermanos')"><div class="stat-num">${DB.caballeros.filter(c=>c.dist==='Hermano').length}</div><div class="stat-lbl">Hermanos</div></div>
    <div class="stat-card stat-click" onclick="goToStatCard('amigos')"><div class="stat-num">${DB.caballeros.filter(c=>c.dist==='Amigo').length}</div><div class="stat-lbl">Amigos</div></div>
    <div class="stat-card stat-click gold" onclick="goToStatCard('clases')"><div class="stat-num">${DB.clases.filter(cl=>claseAvg(cl)>0).length}</div><div class="stat-lbl">Clases</div></div>
  `;
  const list=ranking();
  document.getElementById('top5').innerHTML=list.slice(0,5).map((c,i)=>mkCabCard(c,i+1)).join('');
  const calificadas=[...DB.clases].filter(cl=>claseAvg(cl)>0).sort((a,b)=>b.fecha.localeCompare(a.fecha)).slice(0,2);
  document.getElementById('recent-cl').innerHTML=calificadas.length?calificadas.map(mkClaseCard).join(''):'<p style="color:var(--text3);font-size:13px">Sin clases calificadas aún.</p>';
}

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

function mkCabCard(c,rank){
  const cal=calcCab(c.id);
  const bd=mkBadges(c);
  const nm=nombreCorto(c);
  return`<div class="cab-card" onclick="openCabDetail('${c.id}')">
    <div class="av">${rank&&!c.photo?`<span style="font-family:Montserrat;font-size:12px;font-weight:900">#${rank}</span>`:(c.photo?`<img src="${c.photo}" style="width:42px;height:42px;object-fit:cover;border-radius:50%">`:`<span style="font-family:Montserrat;font-size:13px;font-weight:800;color:white">${ini(nm||c.nombre)}</span>`)}</div>
    <div class="cab-inf">
      <div class="cab-nm">${nm||c.nombre}</div>
      <div class="cab-mt">${c.dist} · ${c.grupo}</div>
      ${bd?`<div class="badges">${bd}</div>`:''}
    </div>
    <div class="cab-sc">${cal.total.toFixed(1)}</div>
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
function renderCumpleBanners(cabId){
  const wrap=document.getElementById('pv-cumple-banner-wrap');
  if(!wrap)return;
  const losQueCumplen=cumpleHoy();
  const items=(DB.caballeros||[]).filter(c=>c.fnac&&c.fnac.length>=10).map(c=>{
    const r=getProximoCumple(c.fnac);
    return r?{...c,...r}:null;
  }).filter(Boolean);
  const proximos=items.filter(x=>!x.yaPaso).sort((a,b)=>a.diasRest-b.diasRest);
  const proximoMasCercano=proximos[0]||null;
  if(losQueCumplen.length===0&&!proximoMasCercano){wrap.innerHTML='';wrap.style.display='none';return;}
  const yoCumple=losQueCumplen.some(c=>c.id===cabId);
  const verso=getVersoCumple();
  // Día exacto del cumpleaños → banner especial actual
  if(yoCumple||losQueCumplen.length>0){
    wrap.style.display='block';
    wrap.innerHTML='<div style="background:linear-gradient(135deg,#ecfdf5 0%,#d1fae5 50%,#a7f3d0 100%);border-radius:14px;padding:16px 18px;border:2px solid #10b981;box-shadow:0 4px 20px rgba(16,185,129,0.2);"><div style="font-family:\'Montserrat\',sans-serif;font-size:18px;font-weight:900;color:#065f46;margin-bottom:10px;">🎂 ¡Feliz cumpleaños!</div><div style="font-size:13px;color:#047857;line-height:1.5;margin-bottom:8px;">'+verso.text+'</div><span style="font-size:12px;font-weight:700;color:#059669;">'+verso.ref+'</span></div>';
    return;
  }
  // Si hoy no hay cumple, mostrar banner del cumpleaños más cercano
  if(!proximoMasCercano){wrap.innerHTML='';wrap.style.display='none';return;}
  const M=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const nom=escAttr(nombreCorto(proximoMasCercano)||proximoMasCercano.nombre||'');
  const fechaStr=`${proximoMasCercano.dia} ${M[proximoMasCercano.mes-1]}`;
  const diasTxt=proximoMasCercano.diasRest===1?'Mañana':`En ${proximoMasCercano.diasRest} días`;
  wrap.style.display='block';
  const edad=proximoMasCercano.edad;
  const edadTxt=edad&&Number.isFinite(edad)?' · Cumple '+edad+' años':'';
  const grupo=escAttr(proximoMasCercano.grupo||'');
  const grupoHtml=grupo?'<div style="font-size:12px;color:#b45309;margin-top:2px;">👥 Grupo: '+grupo+'</div>':'';
  wrap.innerHTML='<div style="background:linear-gradient(135deg,#fef3c7 0%,#fde68a 50%,#fcd34d 100%);border-radius:14px;padding:14px 18px;border:2px solid #f59e0b;box-shadow:0 4px 16px rgba(245,158,11,0.2);"><div style="font-family:\'Montserrat\',sans-serif;font-size:14px;font-weight:800;color:#92400e;margin-bottom:4px;">🎂 Próximo cumpleaños</div><div style="font-size:13px;color:#92400e;font-weight:700;margin-bottom:2px;">'+nom+'</div><div style="font-size:12px;color:#b45309;">'+fechaStr+' · '+diasTxt+edadTxt+'</div>'+grupoHtml+'<div style="font-size:11px;color:#92400e;margin-top:6px;">💌 Ora por este caballero y aprovecha para enviarle un saludo especial.</div></div>';
}

// ═══════════════════════════════════════════════════════════════
// EVENTOS: renderEventosPV, renderEventosAdmin y CRUD en app.eventos.js


// ═══════════════════════════════════════════════════════════════
// FINANZAS DEL COMITÉ (Admin + Vista Personal)
// ═══════════════════════════════════════════════════════════════
function getGuardadoPorNombre(guardadoPor){
  if(!guardadoPor)return '—';
  if(guardadoPor==='admin')return (DB.adminNombre||'Admin').trim()||'Admin';
  const c=(DB.caballeros||[]).find(x=>x.id===guardadoPor);return c?c.nombre:guardadoPor;
}
function renderFinanzas(){
  const hoy=new Date().toISOString().split('T')[0];
  ['fin-fecha-g','fin-fecha-a','fin-fecha-d','fin-fecha-v'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.value=hoy;
  });
  const pvPrefix=['pv-fin-fecha-g','pv-fin-fecha-a','pv-fin-fecha-d','pv-fin-fecha-v'];
  pvPrefix.forEach(id=>{const el=document.getElementById(id);if(el)el.value=hoy;});
  const opts=(DB.caballeros||[]).map(c=>`<option value="${c.id}">${c.nombre}</option>`).join('');
  ['fin-resp-g','fin-resp-a','fin-resp-d','fin-resp-v'].forEach(id=>{
    const sel=document.getElementById(id);if(sel){sel.innerHTML='<option value="">Seleccionar</option>'+opts;}
  });
  ['pv-fin-resp-g','pv-fin-resp-a','pv-fin-resp-d','pv-fin-resp-v'].forEach(id=>{
    const sel=document.getElementById(id);if(sel){sel.innerHTML='<option value="">Seleccionar</option>'+opts;}
  });
  renderListaGastos();renderListaActividades();renderListaDonativos();renderListaVotos();
}
function renderListaGastos(){
  const c=document.getElementById('fin-lista-gastos');if(!c)return;
  const arr=DB.finanzasGastos||[];
  if(arr.length===0){c.innerHTML='<div style="font-size:12px;color:#9ca3af;">Sin gastos registrados.</div>';} else {
  c.innerHTML=arr.map(g=>{
    const cab=(DB.caballeros||[]).find(x=>x.id===g.responsable);
    const nom=cab?cab.nombre:'—';
    const por=getGuardadoPorNombre(g.guardadoPor);
    return `<div style="display:flex;align-items:center;justify-content:space-between;background:white;border-radius:8px;padding:10px 12px;border:1px solid #e9edf2;">
      <span style="font-size:13px;">${g.fecha||'—'} · ${(g.concepto||'').slice(0,40)} · ${MONEDA.symbol}${fmtMonto(g.monto||0)} · ${nom} <span style="color:#6b7280;font-size:11px;">(${por})</span></span>
      <button onclick="delGasto('${g.id}')" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:12px;">🗑</button>
    </div>`;
  }).join('');
  }
  const c2=document.getElementById('pv-fin-lista-gastos');if(c2)c2.innerHTML=c.innerHTML;
}
function renderListaActividades(){
  const c=document.getElementById('fin-lista-actividades');if(!c)return;
  const arr=DB.finanzasActividades||[];
  if(arr.length===0){c.innerHTML='<div style="font-size:12px;color:#9ca3af;">Sin actividades registradas.</div>';} else {
  c.innerHTML=arr.map(a=>{
    const cab=(DB.caballeros||[]).find(x=>x.id===a.responsable);
    const nom=cab?cab.nombre:'—';
    const por=getGuardadoPorNombre(a.guardadoPor);
    return `<div style="display:flex;align-items:center;justify-content:space-between;background:white;border-radius:8px;padding:10px 12px;border:1px solid #e9edf2;">
      <span style="font-size:13px;">${a.fecha||'—'} · ${(a.nombre||'').slice(0,35)} · E:${MONEDA.symbol}${fmtMonto(a.efectivo||0)} T:${MONEDA.symbol}${fmtMonto(a.tpv||0)} G:${MONEDA.symbol}${fmtMonto(a.gastos||0)} · ${nom} <span style="color:#6b7280;font-size:11px;">(${por})</span></span>
      <button onclick="delActividad('${a.id}')" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:12px;">🗑</button>
    </div>`;
  }).join('');
  }
  const c2=document.getElementById('pv-fin-lista-actividades');if(c2)c2.innerHTML=c.innerHTML;
}
function renderListaDonativos(){
  const c=document.getElementById('fin-lista-donativos');if(!c)return;
  const arr=DB.finanzasDonativos||[];
  if(arr.length===0){c.innerHTML='<div style="font-size:12px;color:#9ca3af;">Sin donativos registrados.</div>';} else {
  c.innerHTML=arr.map(d=>{
    const cab=(DB.caballeros||[]).find(x=>x.id===d.responsable);
    const nom=cab?cab.nombre:'—';
    const otro=d.otroDonante?` · Otro: ${d.otroDonante}`:'';
    const por=getGuardadoPorNombre(d.guardadoPor);
    return `<div style="display:flex;align-items:center;justify-content:space-between;background:white;border-radius:8px;padding:10px 12px;border:1px solid #e9edf2;">
      <span style="font-size:13px;">${d.fecha||'—'} · ${(d.concepto||'').slice(0,30)} · E:${MONEDA.symbol}${fmtMonto(d.efectivo||0)} T:${MONEDA.symbol}${fmtMonto(d.tpv||0)} · ${nom}${otro} <span style="color:#6b7280;font-size:11px;">(${por})</span></span>
      <button onclick="delDonativo('${d.id}')" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:12px;">🗑</button>
    </div>`;
  }).join('');
  }
  const c2=document.getElementById('pv-fin-lista-donativos');if(c2)c2.innerHTML=c.innerHTML;
}
function renderListaVotos(){
  const c=document.getElementById('fin-lista-votos');if(!c)return;
  const arr=DB.finanzasVotos||[];
  if(arr.length===0){c.innerHTML='<div style="font-size:12px;color:#9ca3af;">Sin votos registrados.</div>';} else {
  c.innerHTML=arr.map(v=>{
    const cab=(DB.caballeros||[]).find(x=>x.id===v.responsable);
    const nom=cab?cab.nombre:'—';
    const otro=v.nombreNoMaestro?` · No maestro: ${v.nombreNoMaestro}`:'';
    const por=getGuardadoPorNombre(v.guardadoPor);
    return `<div style="display:flex;align-items:center;justify-content:space-between;background:white;border-radius:8px;padding:10px 12px;border:1px solid #e9edf2;">
      <span style="font-size:13px;">${v.fecha||'—'} · ${(v.concepto||'').slice(0,30)} · E:${MONEDA.symbol}${fmtMonto(v.efectivo||0)} T:${MONEDA.symbol}${fmtMonto(v.tpv||0)} · ${nom}${otro} <span style="color:#6b7280;font-size:11px;">(${por})</span></span>
      <button onclick="delVoto('${v.id}')" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:12px;">🗑</button>
    </div>`;
  }).join('');
  }
  const c2=document.getElementById('pv-fin-lista-votos');if(c2)c2.innerHTML=c.innerHTML;
}
async function addGasto(){
  const fecha=document.getElementById('fin-fecha-g')?.value;
  const concepto=document.getElementById('fin-concepto-g')?.value?.trim();
  const monto=parseFloat(document.getElementById('fin-monto-g')?.value)||0;
  const responsable=document.getElementById('fin-resp-g')?.value;
  if(!concepto){toast('Indica el concepto','err');return;}
  if(!DB.finanzasGastos)DB.finanzasGastos=[];
  DB.finanzasGastos.push({id:'fg'+Date.now(),fecha,concepto,monto,responsable,guardadoPor:'admin'});
  document.getElementById('fin-concepto-g').value='';document.getElementById('fin-monto-g').value='';
  toast('💾 Guardando...','info');await saveDB();toast('✅ Gasto añadido','ok');
  renderListaGastos();
}
async function addActividad(){
  const fecha=document.getElementById('fin-fecha-a')?.value;
  const nombre=document.getElementById('fin-nombre-a')?.value?.trim();
  const efectivo=parseFloat(document.getElementById('fin-efectivo-a')?.value)||0;
  const tpv=parseFloat(document.getElementById('fin-tpv-a')?.value)||0;
  const gastos=parseFloat(document.getElementById('fin-gastos-a')?.value)||0;
  const responsable=document.getElementById('fin-resp-a')?.value;
  if(!nombre){toast('Indica el nombre de la actividad','err');return;}
  if(!DB.finanzasActividades)DB.finanzasActividades=[];
  DB.finanzasActividades.push({id:'fa'+Date.now(),fecha,nombre,efectivo,tpv,gastos,responsable,guardadoPor:'admin'});
  document.getElementById('fin-nombre-a').value='';document.getElementById('fin-efectivo-a').value='';document.getElementById('fin-tpv-a').value='';document.getElementById('fin-gastos-a').value='';
  toast('💾 Guardando...','info');await saveDB();toast('✅ Actividad añadida','ok');
  renderListaActividades();
}
async function addDonativo(){
  const fecha=document.getElementById('fin-fecha-d')?.value;
  const concepto=document.getElementById('fin-concepto-d')?.value?.trim();
  const efectivo=parseFloat(document.getElementById('fin-efectivo-d')?.value)||0;
  const tpv=parseFloat(document.getElementById('fin-tpv-d')?.value)||0;
  const responsable=document.getElementById('fin-resp-d')?.value;
  const otroDonante=document.getElementById('fin-otro-d')?.value?.trim();
  if(!concepto){toast('Indica el concepto','err');return;}
  if(!DB.finanzasDonativos)DB.finanzasDonativos=[];
  DB.finanzasDonativos.push({id:'fd'+Date.now(),fecha,concepto,efectivo,tpv,responsable,otroDonante,guardadoPor:'admin'});
  document.getElementById('fin-concepto-d').value='';document.getElementById('fin-efectivo-d').value='';document.getElementById('fin-tpv-d').value='';document.getElementById('fin-otro-d').value='';
  toast('💾 Guardando...','info');await saveDB();toast('✅ Donativo añadido','ok');
  renderListaDonativos();
}
async function addVoto(){
  const fecha=document.getElementById('fin-fecha-v')?.value;
  const concepto=document.getElementById('fin-concepto-v')?.value?.trim();
  const efectivo=parseFloat(document.getElementById('fin-efectivo-v')?.value)||0;
  const tpv=parseFloat(document.getElementById('fin-tpv-v')?.value)||0;
  const responsable=document.getElementById('fin-resp-v')?.value;
  const nombreNoMaestro=document.getElementById('fin-otro-v')?.value?.trim();
  if(!concepto){toast('Indica el concepto','err');return;}
  if(!DB.finanzasVotos)DB.finanzasVotos=[];
  DB.finanzasVotos.push({id:'fv'+Date.now(),fecha,concepto,efectivo,tpv,responsable,nombreNoMaestro,guardadoPor:'admin'});
  document.getElementById('fin-concepto-v').value='';document.getElementById('fin-efectivo-v').value='';document.getElementById('fin-tpv-v').value='';document.getElementById('fin-otro-v').value='';
  toast('💾 Guardando...','info');await saveDB();toast('✅ Voto añadido','ok');
  renderListaVotos();
}
async function addGastoCarlos(){
  const fecha=document.getElementById('pv-fin-fecha-g')?.value;
  const concepto=document.getElementById('pv-fin-concepto-g')?.value?.trim();
  const monto=parseFloat(document.getElementById('pv-fin-monto-g')?.value)||0;
  const responsable=document.getElementById('pv-fin-resp-g')?.value;
  if(!concepto){toast('Indica el concepto','err');return;}
  if(!DB.finanzasGastos)DB.finanzasGastos=[];
  DB.finanzasGastos.push({id:'fg'+Date.now(),fecha,concepto,monto,responsable,guardadoPor:currentCabId});
  document.getElementById('pv-fin-concepto-g').value='';document.getElementById('pv-fin-monto-g').value='';
  toast('💾 Guardando...','info');await saveDB();toast('✅ Gasto añadido','ok');
  renderListaGastos();
}
async function addActividadCarlos(){
  const fecha=document.getElementById('pv-fin-fecha-a')?.value;
  const nombre=document.getElementById('pv-fin-nombre-a')?.value?.trim();
  const efectivo=parseFloat(document.getElementById('pv-fin-efectivo-a')?.value)||0;
  const tpv=parseFloat(document.getElementById('pv-fin-tpv-a')?.value)||0;
  const gastos=parseFloat(document.getElementById('pv-fin-gastos-a')?.value)||0;
  const responsable=document.getElementById('pv-fin-resp-a')?.value;
  if(!nombre){toast('Indica el nombre de la actividad','err');return;}
  if(!DB.finanzasActividades)DB.finanzasActividades=[];
  DB.finanzasActividades.push({id:'fa'+Date.now(),fecha,nombre,efectivo,tpv,gastos,responsable,guardadoPor:currentCabId});
  document.getElementById('pv-fin-nombre-a').value='';document.getElementById('pv-fin-efectivo-a').value='';document.getElementById('pv-fin-tpv-a').value='';document.getElementById('pv-fin-gastos-a').value='';
  toast('💾 Guardando...','info');await saveDB();toast('✅ Actividad añadida','ok');
  renderListaActividades();
}
async function addDonativoCarlos(){
  const fecha=document.getElementById('pv-fin-fecha-d')?.value;
  const concepto=document.getElementById('pv-fin-concepto-d')?.value?.trim();
  const efectivo=parseFloat(document.getElementById('pv-fin-efectivo-d')?.value)||0;
  const tpv=parseFloat(document.getElementById('pv-fin-tpv-d')?.value)||0;
  const responsable=document.getElementById('pv-fin-resp-d')?.value;
  const otroDonante=document.getElementById('pv-fin-otro-d')?.value?.trim();
  if(!concepto){toast('Indica el concepto','err');return;}
  if(!DB.finanzasDonativos)DB.finanzasDonativos=[];
  DB.finanzasDonativos.push({id:'fd'+Date.now(),fecha,concepto,efectivo,tpv,responsable,otroDonante,guardadoPor:currentCabId});
  document.getElementById('pv-fin-concepto-d').value='';document.getElementById('pv-fin-efectivo-d').value='';document.getElementById('pv-fin-tpv-d').value='';document.getElementById('pv-fin-otro-d').value='';
  toast('💾 Guardando...','info');await saveDB();toast('✅ Donativo añadido','ok');
  renderListaDonativos();
}
async function addVotoCarlos(){
  const fecha=document.getElementById('pv-fin-fecha-v')?.value;
  const concepto=document.getElementById('pv-fin-concepto-v')?.value?.trim();
  const efectivo=parseFloat(document.getElementById('pv-fin-efectivo-v')?.value)||0;
  const tpv=parseFloat(document.getElementById('pv-fin-tpv-v')?.value)||0;
  const responsable=document.getElementById('pv-fin-resp-v')?.value;
  const nombreNoMaestro=document.getElementById('pv-fin-otro-v')?.value?.trim();
  if(!concepto){toast('Indica el concepto','err');return;}
  if(!DB.finanzasVotos)DB.finanzasVotos=[];
  DB.finanzasVotos.push({id:'fv'+Date.now(),fecha,concepto,efectivo,tpv,responsable,nombreNoMaestro,guardadoPor:currentCabId});
  document.getElementById('pv-fin-concepto-v').value='';document.getElementById('pv-fin-efectivo-v').value='';document.getElementById('pv-fin-tpv-v').value='';document.getElementById('pv-fin-otro-v').value='';
  toast('💾 Guardando...','info');await saveDB();toast('✅ Voto añadido','ok');
  renderListaVotos();
}
function delGasto(id){
  const g=(DB.finanzasGastos||[]).find(x=>x.id===id);
  openSheet('🗑','Eliminar gasto','',`
    <p style="font-size:14px;color:var(--text);margin-bottom:10px;">¿Eliminar este gasto${g&&g.concepto?` <strong>${escAttr(g.concepto)}</strong>`:''}?</p>
    <p style="font-size:12px;color:var(--text3);margin-bottom:14px;">Esta acción no se puede deshacer.</p>
    <div class="btn-row">
      <button class="btn boutline" onclick="closeModal()">Cancelar</button>
      <button class="btn bred" onclick="doDelGasto('${id}')">Eliminar</button>
    </div>
  `);
}
async function doDelGasto(id){
  DB.finanzasGastos=(DB.finanzasGastos||[]).filter(g=>g.id!==id);
  await saveDB();renderListaGastos();toast('Gasto eliminado','ok');closeModal();
}
function delActividad(id){
  const a=(DB.finanzasActividades||[]).find(x=>x.id===id);
  openSheet('🗑','Eliminar actividad','',`
    <p style="font-size:14px;color:var(--text);margin-bottom:10px;">¿Eliminar la actividad${a&&a.nombre?` <strong>${escAttr(a.nombre)}</strong>`:''}?</p>
    <p style="font-size:12px;color:var(--text3);margin-bottom:14px;">Esta acción no se puede deshacer.</p>
    <div class="btn-row">
      <button class="btn boutline" onclick="closeModal()">Cancelar</button>
      <button class="btn bred" onclick="doDelActividad('${id}')">Eliminar</button>
    </div>
  `);
}
async function doDelActividad(id){
  DB.finanzasActividades=(DB.finanzasActividades||[]).filter(a=>a.id!==id);
  await saveDB();renderListaActividades();toast('Actividad eliminada','ok');closeModal();
}
function delDonativo(id){
  const d=(DB.finanzasDonativos||[]).find(x=>x.id===id);
  openSheet('🗑','Eliminar donativo','',`
    <p style="font-size:14px;color:var(--text);margin-bottom:10px;">¿Eliminar este donativo${d&&d.concepto?` <strong>${escAttr(d.concepto)}</strong>`:''}?</p>
    <p style="font-size:12px;color:var(--text3);margin-bottom:14px;">Esta acción no se puede deshacer.</p>
    <div class="btn-row">
      <button class="btn boutline" onclick="closeModal()">Cancelar</button>
      <button class="btn bred" onclick="doDelDonativo('${id}')">Eliminar</button>
    </div>
  `);
}
async function doDelDonativo(id){
  DB.finanzasDonativos=(DB.finanzasDonativos||[]).filter(d=>d.id!==id);
  await saveDB();renderListaDonativos();toast('Donativo eliminado','ok');closeModal();
}
function delVoto(id){
  const v=(DB.finanzasVotos||[]).find(x=>x.id===id);
  openSheet('🗑','Eliminar voto','',`
    <p style="font-size:14px;color:var(--text);margin-bottom:10px;">¿Eliminar este voto${v&&v.concepto?` <strong>${escAttr(v.concepto)}</strong>`:''}?</p>
    <p style="font-size:12px;color:var(--text3);margin-bottom:14px;">Esta acción no se puede deshacer.</p>
    <div class="btn-row">
      <button class="btn boutline" onclick="closeModal()">Cancelar</button>
      <button class="btn bred" onclick="doDelVoto('${id}')">Eliminar</button>
    </div>
  `);
}
async function doDelVoto(id){
  DB.finanzasVotos=(DB.finanzasVotos||[]).filter(v=>v.id!==id);
  await saveDB();renderListaVotos();toast('Voto eliminado','ok');closeModal();
}

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
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Inter',sans-serif;background:#fff;color:#1a1f2e;font-size:13px;line-height:1.5;}
    .header{background:linear-gradient(135deg,#1a1f2e 0%,#242b3d 50%,#1d6b77 100%);color:#fff;padding:20px 24px;display:flex;align-items:center;gap:16px;margin-bottom:20px;}
    .header h1{font-size:18px;font-weight:900;}
    .header .sub{font-size:12px;opacity:0.85;margin-top:2px;color:rgba(255,255,255,0.9);}
    .header-logo-hdv{flex-shrink:0;padding:6px 10px;border-radius:12px;background:#fff;}
    .header-logo-hdv-img{height:48px;width:auto;object-fit:contain;display:block;}
    .header-logo-ev{flex-shrink:0;margin-left:48px;margin-right:16px;}
    .header-logo-ev-img{height:80px;width:auto;object-fit:contain;display:block;}
    .section{margin:0 20px 20px;background:#fff;border-radius:12px;border:1.5px solid rgba(58,171,186,0.25);overflow:hidden;}
    .section-title{background:linear-gradient(135deg,rgba(58,171,186,0.12),rgba(58,171,186,0.2));padding:10px 16px;font-weight:800;font-size:14px;color:#2d8f9c;border-bottom:1.5px solid rgba(58,171,186,0.22);}
    table{width:100%;border-collapse:collapse;}
    th{background:rgba(58,171,186,0.08);padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#2d8f9c;letter-spacing:0.5px;text-transform:uppercase;}
    td{padding:9px 12px;border-bottom:1px solid rgba(58,171,186,0.12);font-size:12px;}
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
    .stat-val{font-size:20px;font-weight:900;color:#3aabba;}
    .stat-lbl{font-size:10px;color:#4b5563;}
    .neg{color:#ef4444;font-weight:700;}
    .pos{color:#16a34a;font-weight:700;}
    .bar-wrap{height:8px;background:rgba(58,171,186,0.12);border-radius:999px;overflow:hidden;margin-top:4px;}
    .bar-fill{height:100%;border-radius:999px;}
    .badge-mini{display:inline-block;padding:2px 6px;border-radius:12px;font-size:9px;font-weight:700;margin:1px;}
    .footer{text-align:center;padding:16px;font-size:10px;color:#9ca3af;border-top:1px solid rgba(58,171,186,0.15);margin:0 20px;}
    .print-btn{display:block;margin:20px auto;padding:12px 30px;background:linear-gradient(135deg,#3aabba,#2d8f9c);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(58,171,186,0.35);}
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
    const opts=(DB.caballeros||[]).map(c=>`<option value="${c.id}">${c.nombre}</option>`).join('');
    sel.innerHTML='<option value="">Seleccionar caballero</option>'+opts;
  }
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
  const secciones='<div class="section"><div class="section-title">🐷 Gastos del Comité</div><table><thead><tr><th>Fecha</th><th>Concepto</th><th>Responsable</th><th>Monto</th></tr></thead><tbody>'+(filasG||'<tr><td colspan="4" style="text-align:center;color:#9ca3af">Sin gastos registrados</td></tr>')+'</tbody></table></div><div class="section"><div class="section-title">💡 Actividades del Comité</div><table><thead><tr><th>Fecha</th><th>Actividad</th><th>Responsable</th><th>Ingresos</th><th>Gastos</th></tr></thead><tbody>'+(filasA||'<tr><td colspan="5" style="text-align:center;color:#9ca3af">Sin actividades registradas</td></tr>')+'</tbody></table></div><div class="section"><div class="section-title">🤲 Donativos</div><table><thead><tr><th>Fecha</th><th>Concepto</th><th>Responsable</th><th>Total</th></tr></thead><tbody>'+(filasD||'<tr><td colspan="4" style="text-align:center;color:#9ca3af">Sin donativos registrados</td></tr>')+'</tbody></table></div><div class="section"><div class="section-title">📜 Votos</div><table><thead><tr><th>Fecha</th><th>Concepto</th><th>Responsable</th><th>Total</th></tr></thead><tbody>'+(filasV||'<tr><td colspan="4" style="text-align:center;color:#9ca3af">Sin votos registrados</td></tr>')+'</tbody></table></div>';
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
  const filasCabs=cabs.map(c=>{const cal=typeof calcCab==='function'?calcCab(c.id):null;const pts=cal?cal.total.toFixed(1):(c.puntos||'—');const asist=cal?(cal.asist+'/'+cal.totalClases):'—';const pctAsist=cal&&cal.totalClases>0?Math.round((cal.asist/cal.totalClases)*100):0;return '<tr><td><strong>'+c.nombre+'</strong></td><td>'+(c.grupo||'—')+'</td><td style="font-size:10px">'+badges(c)+'</td><td>'+(c.fnac?fmtDate(c.fnac):'—')+'</td><td>'+asist+(pctAsist>0?' <small style="color:#6b7280">('+pctAsist+'%)</small>':'')+'</td><td style="font-weight:800;color:#3aabba">'+pts+' pts</td></tr>';}).join('');
  const html='<div class="section"><div class="section-title">📊 Resumen General · '+cabs.length+' Caballeros</div>'+barras+'<table><thead><tr><th>Grupo</th><th>Caballeros</th><th>%</th></tr></thead><tbody>'+filasGrupos+'</tbody></table></div><div class="section"><div class="section-title">📋 Listado Completo de Caballeros</div><table><thead><tr><th>Nombre</th><th>Grupo</th><th>Distinciones</th><th>Cumpleaños</th><th>Asistencia</th><th>Puntuación</th></tr></thead><tbody>'+filasCabs+'</tbody></table></div>';
  generarPDF('Informe de Caballeros General',html);
}
function generarInformeIndividualPorId(id){
  const cab=DB.caballeros.find(c=>c.id===id);
  if(!cab)return;
  const calCab=typeof calcCab==='function'?calcCab(cab.id):null;
  const pts=calCab?calCab.total.toFixed(1):(cab.puntos||0);
  const pctAsist=calCab&&calCab.totalClases>0?Math.round((calCab.asist/calCab.totalClases)*100):0;
  const totalClases=calCab?calCab.totalClases:0;
  const ptsPosibles=totalClases*10;
  const rank=typeof getRank==='function'?getRank(id):'—';
  const valEstrellas=typeof autoVal==='function'?autoVal(cab):0;
  const starsHtml='<div class="distinciones-pdf"><div class="distinciones-pdf-title">Distinciones</div><div class="distinciones-pdf-stars">'+(CHECKS||[]).map((k,i)=>'<div class="distinciones-pdf-item" title="'+(CLBL[k]||k)+'"><div class="distinciones-pdf-starwrap"><span class="star-pdf '+(i<valEstrellas?'lit':'')+'">★</span></div><span class="distinciones-pdf-lbl">'+(CLBL[k]||k)+'</span></div>').join('')+'</div></div>';
  const gastos=(DB.finanzasGastos||[]).filter(x=>x.responsable===id);
  const act=(DB.finanzasActividades||[]).filter(x=>x.responsable===id);
  const don=(DB.finanzasDonativos||[]).filter(x=>x.responsable===id);
  const vot=(DB.finanzasVotos||[]).filter(x=>x.responsable===id);
  const numAct=act.length, numDon=don.length, numVot=vot.length;
  const totalDon=don.reduce((s,d)=>s+(Number(d.efectivo)||0)+(Number(d.tpv)||0),0);
  const totalVot=vot.reduce((s,v)=>s+(Number(v.efectivo)||0)+(Number(v.tpv)||0),0);
  const asistStr=(calCab?calCab.asist:0)+'/'+(totalClases||1);
  const barrasInd='<div style="padding:10px 20px 14px"><div style="margin-bottom:10px"><div style="font-size:11px;color:#4b5563;margin-bottom:4px">Asistencia a clases</div><div style="font-size:18px;font-weight:900;color:#1a1f2e">'+asistStr+'</div>'+barRow('',calCab?calCab.asist:0,totalClases||1,pctAsist>=80?'#16a34a':pctAsist>=60?'#f5c518':'#ef4444')+'</div><div style="margin-bottom:8px"><div style="font-size:11px;color:#4b5563;margin-bottom:4px">Puntuación acumulada vs puntuación posible</div>'+barRow('Acumulada / posible',parseFloat(pts)||0,ptsPosibles||1,'#3aabba')+'<div style="font-size:12px;font-weight:700;color:#3aabba;margin-top:4px">'+pts+' pts de '+(ptsPosibles||0)+' posibles</div></div></div>';
  const fotoCab=cab.photo?'<img src="'+cab.photo+'" style="width:48px;height:48px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-right:10px;border:2px solid rgba(58,171,186,0.3)">':'';
  const datos='<div class="section"><div class="section-title">'+fotoCab+'Datos del Caballero</div><div style="padding:16px 20px;display:flex;flex-wrap:wrap;gap:16px"><div class="stat"><div class="stat-lbl">Grupo</div><div class="stat-val">'+(cab.grupo||'—')+'</div></div><div class="stat"><div class="stat-lbl">Cumpleaños</div><div class="stat-val">'+(cab.fnac?fmtDate(cab.fnac):'—')+'</div></div><div class="stat"><div class="stat-lbl">Puntuación acumulada vs puntuación posible</div><div class="stat-val">'+pts+' / '+(ptsPosibles||0)+' pts</div></div><div class="stat"><div class="stat-lbl">Puntos aportados al grupo</div><div class="stat-val">'+pts+' pts</div></div><div class="stat"><div class="stat-lbl">Rank</div><div class="stat-val">#'+rank+'</div></div></div><div style="padding:0 20px 16px">'+starsHtml+'</div>'+barrasInd+'</div>';
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
  const secEstadisticasGrupo='<div class="section"><div class="section-title">📊 Estadísticas gráficas del grupo</div><div style="padding:14px 20px"><div style="background:linear-gradient(135deg,#1a1f2e 0%,#242b3d 50%);border-radius:10px;padding:12px 16px;margin-bottom:12px;color:white;"><div style="font-size:11px;opacity:0.8;margin-bottom:4px">Mi grupo</div><div style="font-size:16px;font-weight:900">'+medal+' '+(miGrupo||'—')+'</div><div style="display:flex;gap:16px;margin-top:10px;flex-wrap:wrap"><div><div style="font-size:18px;font-weight:900">'+(grupoStats[miGrupo]?.avgPts??'—')+'</div><div style="font-size:9px;opacity:0.8">Prom. pts</div></div><div><div style="font-size:18px;font-weight:900">'+(grupoStats[miGrupo]?.pctAsist??0)+'%</div><div style="font-size:9px;opacity:0.8">Asistencia</div></div><div><div style="font-size:18px;font-weight:900">#'+miRank+'</div><div style="font-size:9px;opacity:0.8">Ranking</div></div></div></div><div style="font-size:11px;font-weight:700;color:#4b5563;margin-bottom:8px">Comparación con el resto de grupos</div>'+ranking.map((g,i)=>{const st=grupoStats[g];const esMio=g===miGrupo;const pct=maxAvg>0?Math.round((st.avgPts/maxAvg)*100):0;return '<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-weight:700;color:'+(esMio?col:'#374151')+'">'+(i+1)+'. '+g+'</span><span style="font-weight:800">'+st.avgPts+' pts · '+st.pctAsist+'% asist</span></div><div style="height:6px;background:#e5e7eb;border-radius:999px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:'+(esMio?col:'#9ca3af')+';border-radius:999px"></div></div></div>';}).join('')+'</div></div></div>';
  const secFinanzas='<div class="section"><div class="section-title">💰 Información financiera aportada al comité</div><div style="padding:16px 20px;display:flex;flex-wrap:wrap;gap:16px"><div class="stat"><div class="stat-lbl">Colaboraciones (actividades)</div><div class="stat-val">'+numAct+'</div></div><div class="stat"><div class="stat-lbl">Donativos</div><div class="stat-val">'+numDon+' ('+MONEDA.symbol+fmtMonto(totalDon)+')</div></div><div class="stat"><div class="stat-lbl">Votos</div><div class="stat-val">'+numVot+' ('+MONEDA.symbol+fmtMonto(totalVot)+')</div></div></div></div>';
  const histClases=typeof mkHistoryTable==='function'?mkHistoryTable(id,true):'<p style="color:#9ca3af;font-size:13px;padding:16px">Sin historial de clases.</p>';
  const peticionesCab=(DB.peticiones||[]).filter(p=>p.cabId===id&&p.nombre!=='Anónimo').sort((a,b)=>(b.ts||0)-(a.ts||0));
  const filasPet=peticionesCab.map(p=>'<tr><td>'+(p.fecha||'—')+'</td><td>'+(p.texto||'').replace(/</g,'&lt;').substring(0,120)+(p.texto&&p.texto.length>120?'…':'')+'</td></tr>').join('');
  const secPeticiones=peticionesCab.length?'<div class="section"><div class="section-title">🙏 Historial de peticiones a su nombre</div><table><thead><tr><th>Fecha</th><th>Petición</th></tr></thead><tbody>'+filasPet+'</tbody></table></div>':'';
  const filasG=gastos.map(g=>'<tr><td>'+(g.fecha||'—')+'</td><td><strong>'+(g.concepto||'').replace(/</g,'&lt;')+'</strong></td><td class="neg">'+MONEDA.symbol+fmtMonto(g.monto)+'</td></tr>').join('');
  const filasA=act.map(a=>'<tr><td>'+(a.fecha||'—')+'</td><td><strong>'+(a.nombre||'').replace(/</g,'&lt;')+'</strong></td><td class="pos">'+MONEDA.symbol+fmtMonto((Number(a.efectivo)||0)+(Number(a.tpv)||0))+'</td><td class="neg">'+MONEDA.symbol+fmtMonto(a.gastos)+'</td></tr>').join('');
  const filasD=don.map(d=>'<tr><td>'+(d.fecha||'—')+'</td><td><strong>'+(d.concepto||'').replace(/</g,'&lt;')+'</strong></td><td class="pos">'+MONEDA.symbol+fmtMonto((Number(d.efectivo)||0)+(Number(d.tpv)||0))+'</td></tr>').join('');
  const filasV=vot.map(v=>'<tr><td>'+(v.fecha||'—')+'</td><td><strong>'+(v.concepto||'').replace(/</g,'&lt;')+'</strong></td><td class="pos">'+MONEDA.symbol+fmtMonto((Number(v.efectivo)||0)+(Number(v.tpv)||0))+'</td></tr>').join('');
  const secciones=secEstadisticasGrupo+secFinanzas+'<div class="section"><div class="section-title">📚 Historial de Clases</div><div style="padding:12px 16px">'+histClases+'</div></div>'+secPeticiones+(gastos.length?'<div class="section"><div class="section-title">🐷 Gastos como responsable</div><table><thead><tr><th>Fecha</th><th>Concepto</th><th>Monto</th></tr></thead><tbody>'+filasG+'</tbody></table></div>':'')+(act.length?'<div class="section"><div class="section-title">💡 Actividades como responsable</div><table><thead><tr><th>Fecha</th><th>Actividad</th><th>Ingresos</th><th>Gastos</th></tr></thead><tbody>'+filasA+'</tbody></table></div>':'')+(don.length?'<div class="section"><div class="section-title">🤲 Donativos como responsable</div><table><thead><tr><th>Fecha</th><th>Concepto</th><th>Total</th></tr></thead><tbody>'+filasD+'</tbody></table></div>':'')+(vot.length?'<div class="section"><div class="section-title">📜 Votos como responsable</div><table><thead><tr><th>Fecha</th><th>Concepto</th><th>Total</th></tr></thead><tbody>'+filasV+'</tbody></table></div>':'');
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

// ═══════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════
async function initApp(){
  await loadDB();
  buildSel();
  setInterval(function(){if(document.hidden)location.reload();},3600000);
  window._reportLogos={favicon:'',ev:(document.querySelector('#screen-admin .ev-banner img')||document.querySelector('.ev-banner img'))?.src||''};
  fetch('favicon.png').then(r=>r.blob()).then(blob=>new Promise((res,rej)=>{const rd=new FileReader();rd.onload=()=>res(rd.result);rd.onerror=rej;rd.readAsDataURL(blob);})).then(dataUrl=>{window._reportLogos.favicon=dataUrl;}).catch(()=>{});
  // Clonar banner de evidencias para que también lo vean los caballeros
  const adminBanner=document.querySelector('#screen-admin .ev-banner');
  const personalWrap=document.getElementById('ev-banner-personal-wrap');
  if(adminBanner&&personalWrap)personalWrap.innerHTML=adminBanner.innerHTML;
  if(adminBanner&&window._reportLogos)window._reportLogos.ev=adminBanner.querySelector('img')?.src||window._reportLogos.ev;
  renderVersoDelDia();
  const acts=document.querySelector('.hacts');
}

document.addEventListener('DOMContentLoaded', initApp);

