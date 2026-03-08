// FINANZAS DEL COMITÉ (Admin + Vista Personal) — único módulo de finanzas
// _db() definido en app.js

function getGuardadoPorNombre(guardadoPor){
  if(!guardadoPor)return '—';
  var db=_db();
  if(guardadoPor==='admin')return (db.adminNombre||'Admin').trim()||'Admin';
  var c=(db.caballeros||[]).find(function(x){return x.id===guardadoPor;}); return c?c.nombre:guardadoPor;
}
function renderFinanzas(){
  var db=_db();
  var hoy=new Date().toISOString().split('T')[0];
  ['fin-fecha-g','fin-fecha-a','fin-fecha-d','fin-fecha-v'].forEach(function(id){
    var el=document.getElementById(id);if(el)el.value=hoy;
  });
  var pvPrefix=['pv-fin-fecha-g','pv-fin-fecha-a','pv-fin-fecha-d','pv-fin-fecha-v'];
  pvPrefix.forEach(function(id){var el=document.getElementById(id);if(el)el.value=hoy;});
  var nombreMostrarCab=function(c){return (c.nombreMostrar&&String(c.nombreMostrar).trim()?c.nombreMostrar.trim():c.nombre||'');};
  var cabOpts=[...(db.caballeros||[])].sort(function(a,b){return nombreMostrarCab(a).localeCompare(nombreMostrarCab(b));}).map(function(c){return '<option value="'+c.id+'">'+nombreMostrarCab(c)+'</option>';}).join('');
  ['fin-resp-g','fin-resp-a','fin-resp-d','fin-resp-v'].forEach(function(id){
    var sel=document.getElementById(id);if(sel){sel.innerHTML='<option value="">Seleccionar</option>'+cabOpts;}
  });
  ['pv-fin-resp-g','pv-fin-resp-a','pv-fin-resp-d','pv-fin-resp-v'].forEach(function(id){
    var sel=document.getElementById(id);if(sel){sel.innerHTML='<option value="">Seleccionar</option>'+cabOpts;}
  });
  renderListaGastos();renderListaActividades();renderListaDonativos();renderListaVotos();
}
function renderListaGastos(){
  var db=_db();
  var c=document.getElementById('fin-lista-gastos');if(!c)return;
  var arr=db.finanzasGastos||[];
  if(arr.length===0){c.innerHTML='<div style="font-size:12px;color:#9ca3af;">Sin gastos registrados.</div>';} else {
  c.innerHTML=arr.map(function(g){
    var cab=(db.caballeros||[]).find(function(x){return x.id===g.responsable;});
    var nom=cab?cab.nombre:'—';
    var por=getGuardadoPorNombre(g.guardadoPor);
    return '<div style="display:flex;align-items:center;justify-content:space-between;background:white;border-radius:8px;padding:10px 12px;border:1px solid #e9edf2;"><span style="font-size:13px;">'+(g.fecha||'—')+' · '+(g.concepto||'').slice(0,40)+' · '+(typeof MONEDA!=='undefined'?MONEDA.symbol:'$')+(typeof fmtMonto==='function'?fmtMonto(g.monto||0):Number(g.monto||0).toLocaleString('es-CO'))+' · '+nom+' <span style="color:#6b7280;font-size:11px;">('+por+')</span></span><button onclick="delGasto(\''+g.id+'\')" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:12px;" aria-label="Eliminar gasto">🗑</button></div>';
  }).join('');
  }
  var c2=document.getElementById('pv-fin-lista-gastos');if(c2)c2.innerHTML=c.innerHTML;
}
function renderListaActividades(){
  var db=_db();
  var c=document.getElementById('fin-lista-actividades');if(!c)return;
  var arr=db.finanzasActividades||[];
  if(arr.length===0){c.innerHTML='<div style="font-size:12px;color:#9ca3af;">Sin actividades registradas.</div>';} else {
  c.innerHTML=arr.map(function(a){
    var cab=(db.caballeros||[]).find(function(x){return x.id===a.responsable;});
    var nom=cab?cab.nombre:'—';
    var por=getGuardadoPorNombre(a.guardadoPor);
    return '<div style="display:flex;align-items:center;justify-content:space-between;background:white;border-radius:8px;padding:10px 12px;border:1px solid #e9edf2;"><span style="font-size:13px;">'+(a.fecha||'—')+' · '+(a.nombre||'').slice(0,35)+' · E:'+(typeof MONEDA!=='undefined'?MONEDA.symbol:'$')+(typeof fmtMonto==='function'?fmtMonto(a.efectivo||0):0)+' T:'+(typeof fmtMonto==='function'?fmtMonto(a.tpv||0):0)+' G:'+(typeof fmtMonto==='function'?fmtMonto(a.gastos||0):0)+' · '+nom+' <span style="color:#6b7280;font-size:11px;">('+por+')</span></span><button onclick="delActividad(\''+a.id+'\')" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:12px;" aria-label="Eliminar actividad">🗑</button></div>';
  }).join('');
  }
  var c2=document.getElementById('pv-fin-lista-actividades');if(c2)c2.innerHTML=c.innerHTML;
}
function renderListaDonativos(){
  var db=_db();
  var c=document.getElementById('fin-lista-donativos');if(!c)return;
  var arr=db.finanzasDonativos||[];
  if(arr.length===0){c.innerHTML='<div style="font-size:12px;color:#9ca3af;">Sin donativos registrados.</div>';} else {
  c.innerHTML=arr.map(function(d){
    var cab=(db.caballeros||[]).find(function(x){return x.id===d.responsable;});
    var nom=cab?cab.nombre:'—';
    var otro=d.otroDonante?' · Otro: '+d.otroDonante:'';
    var por=getGuardadoPorNombre(d.guardadoPor);
    return '<div style="display:flex;align-items:center;justify-content:space-between;background:white;border-radius:8px;padding:10px 12px;border:1px solid #e9edf2;"><span style="font-size:13px;">'+(d.fecha||'—')+' · '+(d.concepto||'').slice(0,30)+' · E:'+(typeof MONEDA!=='undefined'?MONEDA.symbol:'$')+(typeof fmtMonto==='function'?fmtMonto(d.efectivo||0):0)+' T:'+(typeof fmtMonto==='function'?fmtMonto(d.tpv||0):0)+' · '+nom+otro+' <span style="color:#6b7280;font-size:11px;">('+por+')</span></span><button onclick="delDonativo(\''+d.id+'\')" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:12px;" aria-label="Eliminar donativo">🗑</button></div>';
  }).join('');
  }
  var c2=document.getElementById('pv-fin-lista-donativos');if(c2)c2.innerHTML=c.innerHTML;
}
function renderListaVotos(){
  var db=_db();
  var c=document.getElementById('fin-lista-votos');if(!c)return;
  var arr=db.finanzasVotos||[];
  if(arr.length===0){c.innerHTML='<div style="font-size:12px;color:#9ca3af;">Sin votos registrados.</div>';} else {
  c.innerHTML=arr.map(function(v){
    var cab=(db.caballeros||[]).find(function(x){return x.id===v.responsable;});
    var nom=cab?cab.nombre:'—';
    var otro=v.nombreNoMaestro?' · No maestro: '+v.nombreNoMaestro:'';
    var por=getGuardadoPorNombre(v.guardadoPor);
    return '<div style="display:flex;align-items:center;justify-content:space-between;background:white;border-radius:8px;padding:10px 12px;border:1px solid #e9edf2;"><span style="font-size:13px;">'+(v.fecha||'—')+' · '+(v.concepto||'').slice(0,30)+' · E:'+(typeof MONEDA!=='undefined'?MONEDA.symbol:'$')+(typeof fmtMonto==='function'?fmtMonto(v.efectivo||0):0)+' T:'+(typeof fmtMonto==='function'?fmtMonto(v.tpv||0):0)+' · '+nom+otro+' <span style="color:#6b7280;font-size:11px;">('+por+')</span></span><button onclick="delVoto(\''+v.id+'\')" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:12px;" aria-label="Eliminar voto">🗑</button></div>';
  }).join('');
  }
  var c2=document.getElementById('pv-fin-lista-votos');if(c2)c2.innerHTML=c.innerHTML;
}
async function addGasto(){
  var db=_db();
  var fecha=document.getElementById('fin-fecha-g')&&document.getElementById('fin-fecha-g').value;
  var concepto=document.getElementById('fin-concepto-g')&&document.getElementById('fin-concepto-g').value&&document.getElementById('fin-concepto-g').value.trim();
  var monto=parseFloat(document.getElementById('fin-monto-g')&&document.getElementById('fin-monto-g').value)||0;
  var responsable=document.getElementById('fin-resp-g')&&document.getElementById('fin-resp-g').value;
  if(!concepto){toast('Indica el concepto','err');return;}
  if(!db.finanzasGastos)db.finanzasGastos=[];
  db.finanzasGastos.push({id:'fg'+Date.now(),fecha:fecha,concepto:concepto,monto:monto,responsable:responsable,guardadoPor:'admin'});
  if(document.getElementById('fin-concepto-g'))document.getElementById('fin-concepto-g').value='';
  if(document.getElementById('fin-monto-g'))document.getElementById('fin-monto-g').value='';
  toast('💾 Guardando...','info');await saveDB();toast('✅ Gasto añadido','ok');
  renderListaGastos();
}
async function addActividad(){
  var db=_db();
  var fecha=document.getElementById('fin-fecha-a')&&document.getElementById('fin-fecha-a').value;
  var nombre=document.getElementById('fin-nombre-a')&&document.getElementById('fin-nombre-a').value&&document.getElementById('fin-nombre-a').value.trim();
  var efectivo=parseFloat(document.getElementById('fin-efectivo-a')&&document.getElementById('fin-efectivo-a').value)||0;
  var tpv=parseFloat(document.getElementById('fin-tpv-a')&&document.getElementById('fin-tpv-a').value)||0;
  var gastos=parseFloat(document.getElementById('fin-gastos-a')&&document.getElementById('fin-gastos-a').value)||0;
  var responsable=document.getElementById('fin-resp-a')&&document.getElementById('fin-resp-a').value;
  if(!nombre){toast('Indica el nombre de la actividad','err');return;}
  if(!db.finanzasActividades)db.finanzasActividades=[];
  db.finanzasActividades.push({id:'fa'+Date.now(),fecha:fecha,nombre:nombre,efectivo:efectivo,tpv:tpv,gastos:gastos,responsable:responsable,guardadoPor:'admin'});
  if(document.getElementById('fin-nombre-a'))document.getElementById('fin-nombre-a').value='';
  if(document.getElementById('fin-efectivo-a'))document.getElementById('fin-efectivo-a').value='';
  if(document.getElementById('fin-tpv-a'))document.getElementById('fin-tpv-a').value='';
  if(document.getElementById('fin-gastos-a'))document.getElementById('fin-gastos-a').value='';
  toast('💾 Guardando...','info');await saveDB();toast('✅ Actividad añadida','ok');
  renderListaActividades();
}
async function addDonativo(){
  var db=_db();
  var fecha=document.getElementById('fin-fecha-d')&&document.getElementById('fin-fecha-d').value;
  var concepto=document.getElementById('fin-concepto-d')&&document.getElementById('fin-concepto-d').value&&document.getElementById('fin-concepto-d').value.trim();
  var efectivo=parseFloat(document.getElementById('fin-efectivo-d')&&document.getElementById('fin-efectivo-d').value)||0;
  var tpv=parseFloat(document.getElementById('fin-tpv-d')&&document.getElementById('fin-tpv-d').value)||0;
  var responsable=document.getElementById('fin-resp-d')&&document.getElementById('fin-resp-d').value;
  var otroDonante=document.getElementById('fin-otro-d')&&document.getElementById('fin-otro-d').value&&document.getElementById('fin-otro-d').value.trim();
  if(!concepto){toast('Indica el concepto','err');return;}
  if(!db.finanzasDonativos)db.finanzasDonativos=[];
  db.finanzasDonativos.push({id:'fd'+Date.now(),fecha:fecha,concepto:concepto,efectivo:efectivo,tpv:tpv,responsable:responsable,otroDonante:otroDonante,guardadoPor:'admin'});
  if(document.getElementById('fin-concepto-d'))document.getElementById('fin-concepto-d').value='';
  if(document.getElementById('fin-efectivo-d'))document.getElementById('fin-efectivo-d').value='';
  if(document.getElementById('fin-tpv-d'))document.getElementById('fin-tpv-d').value='';
  if(document.getElementById('fin-otro-d'))document.getElementById('fin-otro-d').value='';
  toast('💾 Guardando...','info');await saveDB();toast('✅ Donativo añadido','ok');
  renderListaDonativos();
}
async function addVoto(){
  var db=_db();
  var fecha=document.getElementById('fin-fecha-v')&&document.getElementById('fin-fecha-v').value;
  var concepto=document.getElementById('fin-concepto-v')&&document.getElementById('fin-concepto-v').value&&document.getElementById('fin-concepto-v').value.trim();
  var efectivo=parseFloat(document.getElementById('fin-efectivo-v')&&document.getElementById('fin-efectivo-v').value)||0;
  var tpv=parseFloat(document.getElementById('fin-tpv-v')&&document.getElementById('fin-tpv-v').value)||0;
  var responsable=document.getElementById('fin-resp-v')&&document.getElementById('fin-resp-v').value;
  var nombreNoMaestro=document.getElementById('fin-otro-v')&&document.getElementById('fin-otro-v').value&&document.getElementById('fin-otro-v').value.trim();
  if(!concepto){toast('Indica el concepto','err');return;}
  if(!db.finanzasVotos)db.finanzasVotos=[];
  db.finanzasVotos.push({id:'fv'+Date.now(),fecha:fecha,concepto:concepto,efectivo:efectivo,tpv:tpv,responsable:responsable,nombreNoMaestro:nombreNoMaestro,guardadoPor:'admin'});
  if(document.getElementById('fin-concepto-v'))document.getElementById('fin-concepto-v').value='';
  if(document.getElementById('fin-efectivo-v'))document.getElementById('fin-efectivo-v').value='';
  if(document.getElementById('fin-tpv-v'))document.getElementById('fin-tpv-v').value='';
  if(document.getElementById('fin-otro-v'))document.getElementById('fin-otro-v').value='';
  toast('💾 Guardando...','info');await saveDB();toast('✅ Voto añadido','ok');
  renderListaVotos();
}
async function addGastoCarlos(){
  var db=_db();
  var cabId=typeof currentCabId!=='undefined'?currentCabId:(typeof window!=='undefined'&&window.currentCabId)!==undefined?window.currentCabId:null;
  var fecha=document.getElementById('pv-fin-fecha-g')&&document.getElementById('pv-fin-fecha-g').value;
  var concepto=document.getElementById('pv-fin-concepto-g')&&document.getElementById('pv-fin-concepto-g').value&&document.getElementById('pv-fin-concepto-g').value.trim();
  var monto=parseFloat(document.getElementById('pv-fin-monto-g')&&document.getElementById('pv-fin-monto-g').value)||0;
  var responsable=document.getElementById('pv-fin-resp-g')&&document.getElementById('pv-fin-resp-g').value;
  if(!concepto){toast('Indica el concepto','err');return;}
  if(!db.finanzasGastos)db.finanzasGastos=[];
  db.finanzasGastos.push({id:'fg'+Date.now(),fecha:fecha,concepto:concepto,monto:monto,responsable:responsable,guardadoPor:cabId});
  if(document.getElementById('pv-fin-concepto-g'))document.getElementById('pv-fin-concepto-g').value='';
  if(document.getElementById('pv-fin-monto-g'))document.getElementById('pv-fin-monto-g').value='';
  toast('💾 Guardando...','info');await saveDB();toast('✅ Gasto añadido','ok');
  renderListaGastos();
}
async function addActividadCarlos(){
  var db=_db();
  var cabId=typeof currentCabId!=='undefined'?currentCabId:(typeof window!=='undefined'&&window.currentCabId)!==undefined?window.currentCabId:null;
  var fecha=document.getElementById('pv-fin-fecha-a')&&document.getElementById('pv-fin-fecha-a').value;
  var nombre=document.getElementById('pv-fin-nombre-a')&&document.getElementById('pv-fin-nombre-a').value&&document.getElementById('pv-fin-nombre-a').value.trim();
  var efectivo=parseFloat(document.getElementById('pv-fin-efectivo-a')&&document.getElementById('pv-fin-efectivo-a').value)||0;
  var tpv=parseFloat(document.getElementById('pv-fin-tpv-a')&&document.getElementById('pv-fin-tpv-a').value)||0;
  var gastos=parseFloat(document.getElementById('pv-fin-gastos-a')&&document.getElementById('pv-fin-gastos-a').value)||0;
  var responsable=document.getElementById('pv-fin-resp-a')&&document.getElementById('pv-fin-resp-a').value;
  if(!nombre){toast('Indica el nombre de la actividad','err');return;}
  if(!db.finanzasActividades)db.finanzasActividades=[];
  db.finanzasActividades.push({id:'fa'+Date.now(),fecha:fecha,nombre:nombre,efectivo:efectivo,tpv:tpv,gastos:gastos,responsable:responsable,guardadoPor:cabId});
  if(document.getElementById('pv-fin-nombre-a'))document.getElementById('pv-fin-nombre-a').value='';
  if(document.getElementById('pv-fin-efectivo-a'))document.getElementById('pv-fin-efectivo-a').value='';
  if(document.getElementById('pv-fin-tpv-a'))document.getElementById('pv-fin-tpv-a').value='';
  if(document.getElementById('pv-fin-gastos-a'))document.getElementById('pv-fin-gastos-a').value='';
  toast('💾 Guardando...','info');await saveDB();toast('✅ Actividad añadida','ok');
  renderListaActividades();
}
async function addDonativoCarlos(){
  var db=_db();
  var cabId=typeof currentCabId!=='undefined'?currentCabId:(typeof window!=='undefined'&&window.currentCabId)!==undefined?window.currentCabId:null;
  var fecha=document.getElementById('pv-fin-fecha-d')&&document.getElementById('pv-fin-fecha-d').value;
  var concepto=document.getElementById('pv-fin-concepto-d')&&document.getElementById('pv-fin-concepto-d').value&&document.getElementById('pv-fin-concepto-d').value.trim();
  var efectivo=parseFloat(document.getElementById('pv-fin-efectivo-d')&&document.getElementById('pv-fin-efectivo-d').value)||0;
  var tpv=parseFloat(document.getElementById('pv-fin-tpv-d')&&document.getElementById('pv-fin-tpv-d').value)||0;
  var responsable=document.getElementById('pv-fin-resp-d')&&document.getElementById('pv-fin-resp-d').value;
  var otroDonante=document.getElementById('pv-fin-otro-d')&&document.getElementById('pv-fin-otro-d').value&&document.getElementById('pv-fin-otro-d').value.trim();
  if(!concepto){toast('Indica el concepto','err');return;}
  if(!db.finanzasDonativos)db.finanzasDonativos=[];
  db.finanzasDonativos.push({id:'fd'+Date.now(),fecha:fecha,concepto:concepto,efectivo:efectivo,tpv:tpv,responsable:responsable,otroDonante:otroDonante,guardadoPor:cabId});
  if(document.getElementById('pv-fin-concepto-d'))document.getElementById('pv-fin-concepto-d').value='';
  if(document.getElementById('pv-fin-efectivo-d'))document.getElementById('pv-fin-efectivo-d').value='';
  if(document.getElementById('pv-fin-tpv-d'))document.getElementById('pv-fin-tpv-d').value='';
  if(document.getElementById('pv-fin-otro-d'))document.getElementById('pv-fin-otro-d').value='';
  toast('💾 Guardando...','info');await saveDB();toast('✅ Donativo añadido','ok');
  renderListaDonativos();
}
async function addVotoCarlos(){
  var db=_db();
  var cabId=typeof currentCabId!=='undefined'?currentCabId:(typeof window!=='undefined'&&window.currentCabId)!==undefined?window.currentCabId:null;
  var fecha=document.getElementById('pv-fin-fecha-v')&&document.getElementById('pv-fin-fecha-v').value;
  var concepto=document.getElementById('pv-fin-concepto-v')&&document.getElementById('pv-fin-concepto-v').value&&document.getElementById('pv-fin-concepto-v').value.trim();
  var efectivo=parseFloat(document.getElementById('pv-fin-efectivo-v')&&document.getElementById('pv-fin-efectivo-v').value)||0;
  var tpv=parseFloat(document.getElementById('pv-fin-tpv-v')&&document.getElementById('pv-fin-tpv-v').value)||0;
  var responsable=document.getElementById('pv-fin-resp-v')&&document.getElementById('pv-fin-resp-v').value;
  var nombreNoMaestro=document.getElementById('pv-fin-otro-v')&&document.getElementById('pv-fin-otro-v').value&&document.getElementById('pv-fin-otro-v').value.trim();
  if(!concepto){toast('Indica el concepto','err');return;}
  if(!db.finanzasVotos)db.finanzasVotos=[];
  db.finanzasVotos.push({id:'fv'+Date.now(),fecha:fecha,concepto:concepto,efectivo:efectivo,tpv:tpv,responsable:responsable,nombreNoMaestro:nombreNoMaestro,guardadoPor:cabId});
  if(document.getElementById('pv-fin-concepto-v'))document.getElementById('pv-fin-concepto-v').value='';
  if(document.getElementById('pv-fin-efectivo-v'))document.getElementById('pv-fin-efectivo-v').value='';
  if(document.getElementById('pv-fin-tpv-v'))document.getElementById('pv-fin-tpv-v').value='';
  if(document.getElementById('pv-fin-otro-v'))document.getElementById('pv-fin-otro-v').value='';
  toast('💾 Guardando...','info');await saveDB();toast('✅ Voto añadido','ok');
  renderListaVotos();
}
function delGasto(id){
  var db=_db();
  var g=(db.finanzasGastos||[]).find(function(x){return x.id===id;});
  var esc=typeof escAttr==='function'?escAttr(g&&g.concepto||''):(g&&g.concepto||'');
  if(typeof openSheet==='function')openSheet('🗑','Eliminar gasto','','<p style="font-size:14px;color:var(--text);margin-bottom:10px;">¿Eliminar este gasto'+(esc?' <strong>'+esc+'</strong>':'')+'?</p><p style="font-size:12px;color:var(--text3);margin-bottom:14px;">Esta acción no se puede deshacer.</p><div class="btn-row"><button class="btn boutline" onclick="closeModal()">Cancelar</button><button class="btn bred" onclick="doDelGasto(\''+id+'\')">Eliminar</button></div>');
}
async function doDelGasto(id){
  var db=_db();
  db.finanzasGastos=(db.finanzasGastos||[]).filter(function(g){return g.id!==id;});
  await saveDB();renderListaGastos();toast('Gasto eliminado','ok');if(typeof closeModal==='function')closeModal();
}
function delActividad(id){
  var db=_db();
  var a=(db.finanzasActividades||[]).find(function(x){return x.id===id;});
  var esc=typeof escAttr==='function'?escAttr(a&&a.nombre||''):(a&&a.nombre||'');
  if(typeof openSheet==='function')openSheet('🗑','Eliminar actividad','','<p style="font-size:14px;color:var(--text);margin-bottom:10px;">¿Eliminar la actividad'+(esc?' <strong>'+esc+'</strong>':'')+'?</p><p style="font-size:12px;color:var(--text3);margin-bottom:14px;">Esta acción no se puede deshacer.</p><div class="btn-row"><button class="btn boutline" onclick="closeModal()">Cancelar</button><button class="btn bred" onclick="doDelActividad(\''+id+'\')">Eliminar</button></div>');
}
async function doDelActividad(id){
  var db=_db();
  db.finanzasActividades=(db.finanzasActividades||[]).filter(function(a){return a.id!==id;});
  await saveDB();renderListaActividades();toast('Actividad eliminada','ok');if(typeof closeModal==='function')closeModal();
}
function delDonativo(id){
  var db=_db();
  var d=(db.finanzasDonativos||[]).find(function(x){return x.id===id;});
  var esc=typeof escAttr==='function'?escAttr(d&&d.concepto||''):(d&&d.concepto||'');
  if(typeof openSheet==='function')openSheet('🗑','Eliminar donativo','','<p style="font-size:14px;color:var(--text);margin-bottom:10px;">¿Eliminar este donativo'+(esc?' <strong>'+esc+'</strong>':'')+'?</p><p style="font-size:12px;color:var(--text3);margin-bottom:14px;">Esta acción no se puede deshacer.</p><div class="btn-row"><button class="btn boutline" onclick="closeModal()">Cancelar</button><button class="btn bred" onclick="doDelDonativo(\''+id+'\')">Eliminar</button></div>');
}
async function doDelDonativo(id){
  var db=_db();
  db.finanzasDonativos=(db.finanzasDonativos||[]).filter(function(d){return d.id!==id;});
  await saveDB();renderListaDonativos();toast('Donativo eliminado','ok');if(typeof closeModal==='function')closeModal();
}
function delVoto(id){
  var db=_db();
  var v=(db.finanzasVotos||[]).find(function(x){return x.id===id;});
  var esc=typeof escAttr==='function'?escAttr(v&&v.concepto||''):(v&&v.concepto||'');
  if(typeof openSheet==='function')openSheet('🗑','Eliminar voto','','<p style="font-size:14px;color:var(--text);margin-bottom:10px;">¿Eliminar este voto'+(esc?' <strong>'+esc+'</strong>':'')+'?</p><p style="font-size:12px;color:var(--text3);margin-bottom:14px;">Esta acción no se puede deshacer.</p><div class="btn-row"><button class="btn boutline" onclick="closeModal()">Cancelar</button><button class="btn bred" onclick="doDelVoto(\''+id+'\')">Eliminar</button></div>');
}
async function doDelVoto(id){
  var db=_db();
  db.finanzasVotos=(db.finanzasVotos||[]).filter(function(v){return v.id!==id;});
  await saveDB();renderListaVotos();toast('Voto eliminado','ok');if(typeof closeModal==='function')closeModal();
}

if(typeof window!=='undefined'){
  window.getGuardadoPorNombre=getGuardadoPorNombre;
  window.renderFinanzas=renderFinanzas;
  window.renderListaGastos=renderListaGastos;
  window.renderListaActividades=renderListaActividades;
  window.renderListaDonativos=renderListaDonativos;
  window.renderListaVotos=renderListaVotos;
  window.addGasto=addGasto;
  window.addActividad=addActividad;
  window.addDonativo=addDonativo;
  window.addVoto=addVoto;
  window.addGastoCarlos=addGastoCarlos;
  window.addActividadCarlos=addActividadCarlos;
  window.addDonativoCarlos=addDonativoCarlos;
  window.addVotoCarlos=addVotoCarlos;
  window.delGasto=delGasto;
  window.doDelGasto=doDelGasto;
  window.delActividad=delActividad;
  window.doDelActividad=doDelActividad;
  window.delDonativo=delDonativo;
  window.doDelDonativo=doDelDonativo;
  window.delVoto=delVoto;
  window.doDelVoto=doDelVoto;
}
