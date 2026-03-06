// FINANZAS DEL COMITÉ (Admin + Vista Personal) — extraído desde app.js

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
  renderResumenFinanzas();
  renderListasFinanzas();
}

function getFinanzasArrays(){
  if(!DB.finanzasGastos)DB.finanzasGastos=[];
  if(!DB.finanzasActividades)DB.finanzasActividades=[];
  if(!DB.finanzasDonativos)DB.finanzasDonativos=[];
  if(!DB.finanzasVotos)DB.finanzasVotos=[];
  return{
    gastos:DB.finanzasGastos,
    actividades:DB.finanzasActividades,
    donativos:DB.finanzasDonativos,
    votos:DB.finanzasVotos
  };
}

function renderResumenFinanzas(){
  const {gastos,actividades,donativos,votos}=getFinanzasArrays();
  const totalGastos=gastos.reduce((s,g)=>s+Number(g.monto||0),0);
  const totalAct=actividades.reduce((s,g)=>s+Number(g.monto||0),0);
  const totalDon=donativos.reduce((s,g)=>s+Number(g.monto||0),0);
  const totalVotos=votos.reduce((s,g)=>s+Number(g.monto||0),0);
  const totalIngresos=totalAct+totalDon+totalVotos;
  const balance=totalIngresos-totalGastos;
  const el=document.getElementById('fin-resumen');
  if(!el)return;
  el.innerHTML=`
    <div class="fin-cards">
      <div class="fin-card fin-card-ing">
        <div class="fin-label">Ingresos totales</div>
        <div class="fin-valor">${typeof MONEDA!=='undefined'?MONEDA.symbol:'$'}${typeof fmtMonto==='function'?fmtMonto(totalIngresos):totalIngresos.toLocaleString('es-CO')}</div>
        <div class="fin-sub">Actividades, donativos y votos</div>
      </div>
      <div class="fin-card fin-card-gas">
        <div class="fin-label">Gastos</div>
        <div class="fin-valor">${typeof MONEDA!=='undefined'?MONEDA.symbol:'$'}${typeof fmtMonto==='function'?fmtMonto(totalGastos):totalGastos.toLocaleString('es-CO')}</div>
        <div class="fin-sub">Salidas registradas</div>
      </div>
      <div class="fin-card fin-card-bal">
        <div class="fin-label">Balance estimado</div>
        <div class="fin-valor ${balance>=0?'pos':'neg'}">${typeof MONEDA!=='undefined'?MONEDA.symbol:'$'}${typeof fmtMonto==='function'?fmtMonto(balance):balance.toLocaleString('es-CO')}</div>
        <div class="fin-sub">${balance>=0?'A favor del comité':'Por cubrir'}</div>
      </div>
    </div>
  `;
}

function renderListasFinanzas(){
  const {gastos,actividades,donativos,votos}=getFinanzasArrays();
  const mapList=(arr,tipo)=>arr.slice().sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||'')).map(it=>{
    const fecha=it.fecha||'—';
    const monto=typeof fmtMonto==='function'?fmtMonto(it.monto||0):Number(it.monto||0).toLocaleString('es-CO');
    const nota=it.nota?`<div class="fin-nota">${it.nota}</div>`:'';
    const quien=getGuardadoPorNombre(it.guardadoPor);
    return `<div class="fin-row">
      <div class="fin-main">
        <div class="fin-titulo">${escAttr(it.concepto||'Sin concepto')}</div>
        ${nota}
        <div class="fin-meta">${fecha} · Registrado por ${escAttr(quien)}</div>
      </div>
      <div class="fin-monto ${tipo==='gasto'?'neg':'pos'}">${typeof MONEDA!=='undefined'?MONEDA.symbol:'$'}${monto}</div>
      <button class="fin-del" onclick="delFinanza('${tipo}','${it.id}')">🗑</button>
    </div>`;
  }).join('')||'<div class="fin-empty">Sin registros.</div>';

  const secG=document.getElementById('fin-list-gastos');
  const secA=document.getElementById('fin-list-actividades');
  const secD=document.getElementById('fin-list-donativos');
  const secV=document.getElementById('fin-list-votos');
  if(secG)secG.innerHTML=mapList(gastos,'gasto');
  if(secA)secA.innerHTML=mapList(actividades,'actividad');
  if(secD)secD.innerHTML=mapList(donativos,'donativo');
  if(secV)secV.innerHTML=mapList(votos,'voto');

  const pvSecG=document.getElementById('pv-fin-list-gastos');
  const pvSecA=document.getElementById('pv-fin-list-actividades');
  const pvSecD=document.getElementById('pv-fin-list-donativos');
  const pvSecV=document.getElementById('pv-fin-list-votos');
  if(pvSecG)pvSecG.innerHTML=mapList(gastos,'gasto');
  if(pvSecA)pvSecA.innerHTML=mapList(actividades,'actividad');
  if(pvSecD)pvSecD.innerHTML=mapList(donativos,'donativo');
  if(pvSecV)pvSecV.innerHTML=mapList(votos,'voto');
}

function readFinForm(prefix){
  return{
    fecha:document.getElementById(prefix+'-fecha')?.value||'',
    concepto:document.getElementById(prefix+'-concepto')?.value.trim()||'',
    monto:Number(document.getElementById(prefix+'-monto')?.value||0),
    nota:document.getElementById(prefix+'-nota')?.value.trim()||'',
  };
}

async function addGasto(esPv){
  const p=readFinForm(esPv?'pv-fin':'fin');
  if(!p.concepto||!p.monto){toast('Completa concepto y monto','err');return;}
  const id='g'+Date.now();
  const row={id,...p,guardadoPor:esPv?currentCabId:'admin'};
  getFinanzasArrays().gastos.push(row);
  toast('💾 Guardando...','info');
  await saveDB();
  toast('✅ Gasto registrado','ok');
  renderResumenFinanzas();
  renderListasFinanzas();
}
async function addActividad(esPv){
  const p=readFinForm(esPv?'pv-fin-a':'fin-a');
  if(!p.concepto||!p.monto){toast('Completa concepto y monto','err');return;}
  const id='a'+Date.now();
  const row={id,...p,guardadoPor:esPv?currentCabId:'admin'};
  getFinanzasArrays().actividades.push(row);
  toast('💾 Guardando...','info');
  await saveDB();
  toast('✅ Actividad registrada','ok');
  renderResumenFinanzas();
  renderListasFinanzas();
}
async function addDonativo(esPv){
  const p=readFinForm(esPv?'pv-fin-d':'fin-d');
  if(!p.concepto||!p.monto){toast('Completa concepto y monto','err');return;}
  const id='d'+Date.now();
  const row={id,...p,guardadoPor:esPv?currentCabId:'admin'};
  getFinanzasArrays().donativos.push(row);
  toast('💾 Guardando...','info');
  await saveDB();
  toast('✅ Donativo registrado','ok');
  renderResumenFinanzas();
  renderListasFinanzas();
}
async function addVoto(esPv){
  const p=readFinForm(esPv?'pv-fin-v':'fin-v');
  if(!p.concepto||!p.monto){toast('Completa concepto y monto','err');return;}
  const id='v'+Date.now();
  const row={id,...p,guardadoPor:esPv?currentCabId:'admin'};
  getFinanzasArrays().votos.push(row);
  toast('💾 Guardando...','info');
  await saveDB();
  toast('✅ Voto registrado','ok');
  renderResumenFinanzas();
  renderListasFinanzas();
}

async function delFinanza(tipo,id){
  const arrs=getFinanzasArrays();
  if(tipo==='gasto')DB.finanzasGastos=arrs.gastos.filter(x=>x.id!==id);
  if(tipo==='actividad')DB.finanzasActividades=arrs.actividades.filter(x=>x.id!==id);
  if(tipo==='donativo')DB.finanzasDonativos=arrs.donativos.filter(x=>x.id!==id);
  if(tipo==='voto')DB.finanzasVotos=arrs.votos.filter(x=>x.id!==id);
  toast('💾 Guardando...','info');
  await saveDB();
  toast('Registro eliminado','ok');
  renderResumenFinanzas();
  renderListasFinanzas();
}

