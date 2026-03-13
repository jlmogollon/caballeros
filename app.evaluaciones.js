// ═══════════════════════════════════════════════════════════════
// EVALUACIONES — Cuestionarios interactivos
// Admin: crear/editar/eliminar evaluaciones y preguntas
// Caballeros: responder y ver puntuación
// ═══════════════════════════════════════════════════════════════
// _db() definido en app.js

function renderEvaluacionesAdmin(){
  const el=document.getElementById('evaluaciones-admin-lista');
  if(!el)return;
  const db=_db();
  const list=(db.evaluaciones||[]).filter(e=>!!e.titulo);
  const html=list.length?list.map(ev=>{
    const nPreg=(ev.preguntas||[]).length;
    const nResp=(db.evaluacionRespuestas||[]).filter(r=>r.evaluacionId===ev.id).length;
    const cl=ev.claseId?(db.clases||[]).find(c=>(c.id||c.fecha)===ev.claseId):null;
    const claseLbl=cl?(typeof fmtDate==='function'?fmtDate(cl.fecha):cl.fecha)+' — '+(cl.tema||'').substring(0,25):'';
    const mat=ev.materialId?(db.materialEstudio||[]).find(m=>m.id===ev.materialId):null;
    const matLbl=mat?(mat.titulo||'').substring(0,30):'';
    return`<div class="panel" style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
      <div style="flex:1;min-width:0;">
        <div class="evq-titulo" style="margin-bottom:4px;" title="${escAttr(ev.titulo)}">${escAttr(ev.titulo)}</div>
        <div style="font-size:12px;color:var(--text3);">${nPreg} preguntas · ${nResp} respuestas${claseLbl?' · Clase: '+claseLbl:''}${matLbl?' · Material: '+matLbl:''}</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn boutline" style="font-size:11px;padding:6px 12px;" onclick="openRespuestasEvaluacionAdmin('${ev.id}')">📋 Ver respuestas</button>
        <button class="btn bteal" style="font-size:11px;padding:6px 12px;" onclick="openFormEvaluacion('${ev.id}')">✏️ Editar</button>
        <button class="btn boutline" style="font-size:11px;padding:6px 12px;" onclick="confirmarDelEvaluacion('${ev.id}')">🗑</button>
      </div>
    </div>`;
  }).join(''):'<p style="color:var(--text3);font-size:13px;">Aún no hay cuestionarios. Crea uno con el botón de abajo.</p>';
  el.innerHTML=html;
}

function openFormEvaluacion(id,preselectedClaseId){
  const ev=id?(_db().evaluaciones||[]).find(e=>e.id===id):null;
  const titulo=ev?(ev.titulo||''):'';
  const descripcion=ev?(ev.descripcion||''):'';
  const claseId=preselectedClaseId!==undefined&&preselectedClaseId!==''?preselectedClaseId:(ev&&ev.claseId?ev.claseId:'');
  if(preselectedClaseId!==undefined&&preselectedClaseId!=='')window._evqClasePreseleccionada=preselectedClaseId;
  const preguntas=(ev&&ev.preguntas)?ev.preguntas:[];
  const pregHtml=preguntas.map((p,i)=>{
    const opciones=(p.opciones||[]).map((o,j)=>{
      const nOp=(p.opciones||[]).length;
      return`<div class="evq-opcion-row" data-pidx="${i}" data-opidx="${j}" style="display:flex;align-items:center;gap:6px;margin:6px 0;">
        <span class="evq-opcion-mover" style="display:flex;flex-direction:column;gap:0;">
          <button type="button" class="btn boutline" style="font-size:10px;padding:2px 6px;line-height:1;" onclick="moverOpcionEvq(${i},${j},-1)" title="Subir" ${j===0?'disabled':''}>↑</button>
          <button type="button" class="btn boutline" style="font-size:10px;padding:2px 6px;line-height:1;" onclick="moverOpcionEvq(${i},${j},1)" title="Bajar" ${j>=nOp-1?'disabled':''}>↓</button>
        </span>
        <label style="display:flex;align-items:center;gap:8px;flex:1;margin:0;"><input type="radio" name="evq-p-${i}" value="${j}" ${o.correcta?'checked':''}><input type="text" data-preg="${i}" data-op="${j}" value="${escAttr(o.texto)}" placeholder="Opción ${j+1}" style="flex:1;padding:6px 10px;"></label>
      </div>`;
    }).join('');
    return`<div class="panel" style="margin-bottom:12px;" data-pidx="${i}" data-pid="${p.id||('p'+i)}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <strong>Pregunta ${i+1}</strong>
        <button type="button" class="btn boutline" style="font-size:10px;padding:4px 8px;" onclick="quitarPreguntaEvq(${i})">Quitar</button>
      </div>
      <input type="text" class="evq-preg-texto" data-pidx="${i}" value="${escAttr(p.texto)}" placeholder="Enunciado de la pregunta" style="width:100%;padding:8px 12px;margin-bottom:8px;border:1.5px solid #e5e7eb;border-radius:8px;">
      <div class="evq-opciones" data-pidx="${i}">${opciones||'<p style="font-size:12px;color:#9ca3af;">Añade opciones abajo.</p>'}</div>
      <button type="button" class="btn boutline" style="font-size:11px;margin-top:6px;" onclick="añadirOpcionEvq(${i})">+ Añadir opción</button>
    </div>`;
  }).join('');
  openSheet('📋',id?'Editar cuestionario':'Nuevo cuestionario','',`
    <div class="fr"><label>Título</label><input type="text" id="evq-titulo" value="${escAttr(titulo)}" placeholder="Ej. Evidencias de un Caballero"></div>
    <div class="fr"><label>Descripción (opcional)</label><input type="text" id="evq-desc" value="${escAttr(descripcion)}" placeholder="Breve descripción del cuestionario"></div>
    <input type="hidden" id="evq-clase" value="${escAttr(claseId)}">
    <div style="margin-top:14px;"><strong>Preguntas</strong></div>
    <div id="evq-preguntas-wrap">${pregHtml}</div>
    <button type="button" class="btn boutline bfull" style="margin-top:10px;" onclick="añadirPreguntaEvq()">+ Añadir pregunta</button>
    <input type="hidden" id="evq-id" value="${id||''}">
    <button type="button" class="btn bteal bfull" style="margin-top:14px;" onclick="guardarEvaluacion()">💾 Guardar cuestionario</button>
  `);
  window._evqPreguntas=preguntas.length?JSON.parse(JSON.stringify(preguntas)):[];
}

function añadirPreguntaEvq(){
  window._evqPreguntas=window._evqPreguntas||[];
  const i=window._evqPreguntas.length;
  window._evqPreguntas.push({id:'p'+Date.now()+i,texto:'',opciones:[{texto:'',correcta:true},{texto:'',correcta:false}]});
  const wrap=document.getElementById('evq-preguntas-wrap');
  if(!wrap)return;
  const div=document.createElement('div');
  div.className='panel';
  div.style.marginBottom='12px';
  div.setAttribute('data-pidx',i);
  div.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <strong>Pregunta ${i+1}</strong>
      <button type="button" class="btn boutline" style="font-size:10px;padding:4px 8px;" onclick="quitarPreguntaEvq(${i})">Quitar</button>
    </div>
    <input type="text" class="evq-preg-texto" data-pidx="${i}" value="" placeholder="Enunciado de la pregunta" style="width:100%;padding:8px 12px;margin-bottom:8px;border:1.5px solid #e5e7eb;border-radius:8px;">
    <div class="evq-opciones" data-pidx="${i}">
      <div class="evq-opcion-row" data-pidx="${i}" data-opidx="0" style="display:flex;align-items:center;gap:6px;margin:6px 0;">
        <span class="evq-opcion-mover" style="display:flex;flex-direction:column;gap:0;">
          <button type="button" class="btn boutline" style="font-size:10px;padding:2px 6px;line-height:1;" onclick="moverOpcionEvq(${i},0,-1)" title="Subir" disabled>↑</button>
          <button type="button" class="btn boutline" style="font-size:10px;padding:2px 6px;line-height:1;" onclick="moverOpcionEvq(${i},0,1)" title="Bajar">↓</button>
        </span>
        <label style="display:flex;align-items:center;gap:8px;flex:1;margin:0;"><input type="radio" name="evq-p-${i}" value="0" checked><input type="text" data-preg="${i}" data-op="0" value="" placeholder="Opción 1" style="flex:1;padding:6px 10px;"></label>
      </div>
      <div class="evq-opcion-row" data-pidx="${i}" data-opidx="1" style="display:flex;align-items:center;gap:6px;margin:6px 0;">
        <span class="evq-opcion-mover" style="display:flex;flex-direction:column;gap:0;">
          <button type="button" class="btn boutline" style="font-size:10px;padding:2px 6px;line-height:1;" onclick="moverOpcionEvq(${i},1,-1)" title="Subir">↑</button>
          <button type="button" class="btn boutline" style="font-size:10px;padding:2px 6px;line-height:1;" onclick="moverOpcionEvq(${i},1,1)" title="Bajar" disabled>↓</button>
        </span>
        <label style="display:flex;align-items:center;gap:8px;flex:1;margin:0;"><input type="radio" name="evq-p-${i}" value="1"><input type="text" data-preg="${i}" data-op="1" value="" placeholder="Opción 2" style="flex:1;padding:6px 10px;"></label>
      </div>
    </div>
    <button type="button" class="btn boutline" style="font-size:11px;margin-top:6px;" onclick="añadirOpcionEvq(${i})">+ Añadir opción</button>
  `;
  wrap.appendChild(div);
}

function quitarPreguntaEvq(pidx){
  window._evqPreguntas=window._evqPreguntas||[];
  window._evqPreguntas.splice(pidx,1);
  const wrap=document.getElementById('evq-preguntas-wrap');
  const el=wrap&&wrap.querySelector('[data-pidx="'+pidx+'"]');
  if(el)el.remove();
  wrap.querySelectorAll('[data-pidx]').forEach((e,idx)=>{e.setAttribute('data-pidx',idx);e.querySelector('strong').textContent='Pregunta '+(idx+1);});
}

function añadirOpcionEvq(pidx){
  const wrap=document.getElementById('evq-preguntas-wrap');
  const panel=wrap&&wrap.querySelector('.panel[data-pidx="'+pidx+'"]');
  if(!panel)return;
  const opWrap=panel.querySelector('.evq-opciones');
  if(!opWrap)return;
  const rows=opWrap.querySelectorAll('.evq-opcion-row');
  const n=rows.length;
  const row=document.createElement('div');
  row.className='evq-opcion-row';
  row.setAttribute('data-pidx',String(pidx));
  row.setAttribute('data-opidx',String(n));
  row.style.cssText='display:flex;align-items:center;gap:6px;margin:6px 0;';
  row.innerHTML=`<span class="evq-opcion-mover" style="display:flex;flex-direction:column;gap:0;">
    <button type="button" class="btn boutline" style="font-size:10px;padding:2px 6px;line-height:1;" onclick="moverOpcionEvq(${pidx},${n},-1)" title="Subir">↑</button>
    <button type="button" class="btn boutline" style="font-size:10px;padding:2px 6px;line-height:1;" onclick="moverOpcionEvq(${pidx},${n},1)" title="Bajar" disabled>↓</button>
  </span>
  <label style="display:flex;align-items:center;gap:8px;flex:1;margin:0;"><input type="radio" name="evq-p-${pidx}" value="${n}"><input type="text" data-preg="${pidx}" data-op="${n}" value="" placeholder="Opción ${n+1}" style="flex:1;padding:6px 10px;"></label>`;
  opWrap.appendChild(row);
  rows.forEach((r,idx)=>{ if(idx<n){ const btnDown=r.querySelector('.evq-opcion-mover button[title="Bajar"]'); if(btnDown)btnDown.disabled=false; } });
  const lastBtnDown=row.querySelector('.evq-opcion-mover button[title="Bajar"]');
  if(lastBtnDown)lastBtnDown.disabled=true;
}

function moverOpcionEvq(pidx,opidx,dir){
  const wrap=document.getElementById('evq-preguntas-wrap');
  const panel=wrap&&wrap.querySelector('.panel[data-pidx="'+pidx+'"]');
  if(!panel)return;
  const opWrap=panel.querySelector('.evq-opciones');
  if(!opWrap)return;
  const rows=Array.from(opWrap.querySelectorAll('.evq-opcion-row'));
  const n=rows.length;
  if(n<2||opidx<0||opidx>=n)return;
  const newIdx=opidx+dir;
  if(newIdx<0||newIdx>=n)return;
  const a=rows[opidx];
  const b=rows[newIdx];
  if(dir<0){ opWrap.insertBefore(a,b); } else { opWrap.insertBefore(b,a); }
  const rowsAfter=Array.from(opWrap.querySelectorAll('.evq-opcion-row'));
  rowsAfter.forEach((r,idx)=>{
    r.setAttribute('data-opidx',idx);
    const radio=r.querySelector('input[type="radio"]');
    const textInp=r.querySelector('input[type="text"]');
    if(radio){ radio.value=idx; radio.name='evq-p-'+pidx; }
    if(textInp)textInp.setAttribute('data-op',idx);
    const btnUp=r.querySelector('.evq-opcion-mover button[title="Subir"]');
    const btnDown=r.querySelector('.evq-opcion-mover button[title="Bajar"]');
    if(btnUp){ btnUp.disabled=idx===0; btnUp.onclick=function(){ moverOpcionEvq(pidx,idx,-1); }; }
    if(btnDown){ btnDown.disabled=idx>=rowsAfter.length-1; btnDown.onclick=function(){ moverOpcionEvq(pidx,idx,1); }; }
  });
}

function guardarEvaluacion(){
  const id=document.getElementById('evq-id').value.trim();
  const titulo=(document.getElementById('evq-titulo')?.value||'').trim();
  if(!titulo){toast('Escribe el título del cuestionario','err');return;}
  const descripcion=(document.getElementById('evq-desc')?.value||'').trim();
  const wrap=document.getElementById('evq-preguntas-wrap');
  const preguntas=[];
  wrap.querySelectorAll('.panel[data-pidx]').forEach(panel=>{
    const pidx=parseInt(panel.getAttribute('data-pidx'),10);
    const pid=panel.getAttribute('data-pid')||('p'+pidx+Date.now());
    const textoInp=panel.querySelector('.evq-preg-texto');
    const texto=(textoInp&&textoInp.value?textoInp.value:'').trim();
    const opciones=[];
    panel.querySelectorAll('.evq-opciones .evq-opcion-row').forEach(row=>{
      const lab=row.querySelector('label');
      const radio=lab&&lab.querySelector('input[type="radio"]');
      const textInp=lab&&lab.querySelector('input[type="text"]');
      const opVal=(textInp&&textInp.value?textInp.value:'').trim();
      opciones.push({texto:opVal,correcta:!!(radio&&radio.checked)});
    });
    const conTexto=opciones.some(o=>o.texto!=='');
    if(texto||conTexto)preguntas.push({id:pid,texto,opciones});
  });
  const evClaseId=(document.getElementById('evq-clase')?.value||'').trim();
  const evId=id||'evq'+Date.now();
  const existing=(_db().evaluaciones||[]).find(e=>e.id===evId);
  const materialId=existing&&existing.materialId?existing.materialId:undefined;
  const ev={id:evId,titulo,descripcion,activo:true,claseId:evClaseId||undefined,materialId,preguntas:existing&&existing.preguntas?preguntas.length?preguntas:existing.preguntas:preguntas};
  if(existing)Object.assign(existing,ev);else (_db().evaluaciones=_db().evaluaciones||[]).push(ev);
  window._evqClasePreseleccionada=undefined;
  closeModal();
  toast('Cuestionario guardado','ok');
  saveDB().then(()=>{if(typeof renderEvaluacionesAdmin==='function')renderEvaluacionesAdmin();if(typeof renderClases==='function')renderClases();});
}

function confirmarDelEvaluacion(id){
  const ev=(_db().evaluaciones||[]).find(e=>e.id===id);
  if(!ev)return;
  openSheet('🗑','Eliminar cuestionario','',`
    <p style="font-size:14px;color:var(--text);margin-bottom:14px;">¿Eliminar <strong>${escAttr(ev.titulo)}</strong>? Se perderán también las respuestas guardadas.</p>
    <div class="btn-row">
      <button class="btn boutline" onclick="closeModal()">Cancelar</button>
      <button class="btn bred" onclick="closeModal();doDelEvaluacion('${id}')">Eliminar</button>
    </div>
  `);
}

function doDelEvaluacion(id){
  _db().evaluaciones=(_db().evaluaciones||[]).filter(e=>e.id!==id);
  _db().evaluacionRespuestas=(_db().evaluacionRespuestas||[]).filter(r=>r.evaluacionId!==id);
  toast('Cuestionario eliminado','ok');
  saveDB().then(()=>renderEvaluacionesAdmin());
}

function openRespuestasEvaluacionAdmin(evId){
  const ev=(_db().evaluaciones||[]).find(e=>e.id===evId);
  if(!ev){toast('Cuestionario no encontrado','err');return;}
  const list=(_db().evaluacionRespuestas||[]).filter(r=>r.evaluacionId===evId);
  const rows=list.map(r=>{
    const c=(_db().caballeros||[]).find(x=>x.id===r.cabId);
    const nom=nombreCorto?nombreCorto(c):(c?c.nombre:r.cabId);
    const puedeRepetir=!!r.puedeRepetir;
    const fecha=r.fecha?(r.fecha.split('T')[0]):'—';
    return`<tr><td>${escAttr(nom||'—')}</td><td>${escAttr(fecha)}</td><td>${r.puntuacion}/${r.totalPreguntas||0}</td><td><button type="button" class="btn boutline" style="font-size:11px;padding:4px 10px;" onclick="permiterRepetirEvaluacion('${evId}','${r.cabId}')">${puedeRepetir?'✓ Permitido repetir':'Permitir repetir'}</button></td></tr>`;
  }).join('');
  const tbl=list.length?`<table class="dtable" style="width:100%;"><thead><tr><th>Caballero</th><th>Fecha</th><th>Puntuación</th><th>Acción</th></tr></thead><tbody>${rows}</tbody></table>`:'<p style="color:var(--text3);font-size:13px;">Aún no hay respuestas.</p>';
  openSheet('📋','Respuestas: '+ev.titulo,'Solo el admin puede permitir repetir el cuestionario.',tbl);
}
function permiterRepetirEvaluacion(evId,cabId){
  const r=(_db().evaluacionRespuestas||[]).find(x=>x.evaluacionId===evId&&x.cabId===cabId);
  if(!r)return;
  r.puedeRepetir=!r.puedeRepetir;
  saveDB().then(()=>{toast(r.puedeRepetir?'Puede repetir el cuestionario':'Ya no puede repetir','ok');openRespuestasEvaluacionAdmin(evId);});
}

// ─── Vista caballero: listar y responder
function renderEvaluacionesPV(){
  const el=document.getElementById('evaluaciones-pv-lista');
  if(!el)return;
  const list=(_db().evaluaciones||[]).filter(e=>!!e.titulo&&e.activo!==false);
  const cabId=currentCabId;
  const respuestas=_db().evaluacionRespuestas||[];
  const html=list.length?list.map(ev=>{
    const miResp=respuestas.find(r=>r.evaluacionId===ev.id&&r.cabId===cabId);
    const nPreg=(ev.preguntas||[]).length;
    const yaRespondido=!!miResp;
    const puedeRepetir=!!(miResp&&miResp.puedeRepetir);
    const puedeComenzar=!yaRespondido||puedeRepetir;
    const col=yaRespondido?'#fefce8':'#fef9c3';
    const borde=yaRespondido?'rgba(212,168,0,0.5)':'rgba(245,197,24,0.5)';
    const icono=yaRespondido?'✅':'📝';
    return`<div onclick="${puedeComenzar?'iniciarCuestionarioPV(\''+ev.id+'\')':yaRespondido?'verResultadoEvaluacionPV(\''+ev.id+'\')':''}" style="background:linear-gradient(145deg,${col} 0%,${yaRespondido?'#fef08a':'#fef3c7'} 100%);border:1.5px solid ${borde};border-radius:16px;padding:16px 18px;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;cursor:pointer;box-shadow:0 4px 20px rgba(245,197,24,0.15);transition:transform .2s,box-shadow .2s;">
      <div style="display:flex;align-items:center;gap:14px;flex:1;min-width:0;">
        <div style="width:48px;height:48px;border-radius:14px;background:rgba(245,197,24,0.2);display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;">${icono}</div>
        <div style="flex:1;min-width:0;">
          <div class="evq-titulo" style="margin-bottom:2px;" title="${escAttr(ev.titulo)}">${escAttr(ev.titulo)}</div>
          <div style="font-size:12px;color:#4b5563;">${nPreg} preguntas${yaRespondido?' · Completado':''}</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0;">
        ${yaRespondido?`<button type="button" class="btn boutline" style="font-size:11px;padding:8px 14px;" onclick="event.stopPropagation();verResultadoEvaluacionPV('${ev.id}')">Ver resultado</button>`:''}
        ${puedeComenzar?`<button type="button" class="btn bteal" style="font-size:12px;padding:8px 16px;font-weight:800;" onclick="event.stopPropagation();iniciarCuestionarioPV('${ev.id}')">${yaRespondido?'Responder de nuevo':'Comenzar'}</button>`:''}
      </div>
    </div>`;
  }).join(''):'<p style="color:var(--text3);font-size:13px;">No hay cuestionarios disponibles.</p>';
  el.innerHTML=html;
}

function verResultadoEvaluacionPV(evId){
  const ev=(_db().evaluaciones||[]).find(e=>e.id===evId);
  if(!ev)return;
  const cabId=currentCabId;
  const r=(_db().evaluacionRespuestas||[]).find(x=>x.evaluacionId===evId&&x.cabId===cabId);
  if(!r){toast('No tienes respuestas guardadas para este cuestionario','err');return;}
  mostrarResultadoEvaluacionPV(ev,r);
}

function getResultadoEvaluacionHTML(ev,registro){
  const preguntas=ev.preguntas||[];
  const nota10=registro.totalPreguntas>0?(registro.puntuacion/registro.totalPreguntas*10):0;
  const notaTxt=typeof fmtScore==='function'?fmtScore(nota10):nota10.toFixed(1);
  const banner='<div style="margin-bottom:20px;padding:16px 18px;background:linear-gradient(135deg,#f0fdfa 0%,#ccfbf1 100%);border-radius:14px;border:2px solid #2dd4bf;"><div class="evq-titulo" style="font-size:17px;font-weight:900;color:#0f766e;" title="'+escAttr(ev.titulo)+'">'+escAttr(ev.titulo)+'</div><div style="font-size:14px;color:#115e59;margin-top:8px;font-weight:700;">Resultado: '+registro.puntuacion+' de '+registro.totalPreguntas+' correctas · Nota: '+notaTxt+'/10</div></div>';
  let html=banner;
  preguntas.forEach((p,i)=>{
    const correctIdx=(p.opciones||[]).findIndex(o=>o.correcta);
    const correctaTxt=correctIdx>=0?(p.opciones||[])[correctIdx].texto:'—';
    const miResp=registro.respuestas&&registro.respuestas.find(x=>x.preguntaId===p.id);
    const valor=miResp&&miResp.valor>=0?miResp.valor:-1;
    const miTxt=valor>=0&&(p.opciones||[])[valor]?(p.opciones||[])[valor].texto:'—';
    const acerto=valor===correctIdx;
    html+=`<div style="margin-bottom:16px;padding:12px;border-radius:10px;border:1.5px solid ${acerto?'#dcfce7':'#fee2e2'};background:${acerto?'#f0fdf4':'#fef2f2'};">
      <div style="font-weight:700;color:var(--dark);margin-bottom:6px;">${i+1}. ${escAttr(p.texto)||'Pregunta '+(i+1)}</div>
      <div style="font-size:12px;color:var(--text3);">Tu respuesta: ${escAttr(miTxt)} ${acerto?'<span style="color:#15803d;font-weight:700;">✓ Correcta</span>':'<span style="color:#b91c1c;font-weight:700;">✗ Incorrecta</span>'}</div>
      <div style="font-size:12px;color:#15803d;margin-top:4px;">Respuesta correcta: ${escAttr(correctaTxt)}</div>
    </div>`;
  });
  html+='<button type="button" class="btn bteal bfull" onclick="closeModal();">Cerrar</button>';
  return html;
}

function mostrarResultadoEvaluacionPV(ev,registro){
  const html=getResultadoEvaluacionHTML(ev,registro);
  const nota10=registro.totalPreguntas>0?(registro.puntuacion/registro.totalPreguntas*10):0;
  const notaTxt=typeof fmtScore==='function'?fmtScore(nota10):nota10.toFixed(1);
  openSheet('📋','Resultado: '+ev.titulo,registro.puntuacion+' de '+registro.totalPreguntas+' correctas · Nota: '+notaTxt+'/10',html);
}

function iniciarCuestionarioPV(evId){
  const ev=(_db().evaluaciones||[]).find(e=>e.id===evId);
  if(!ev||!(ev.preguntas||[]).length){toast('Cuestionario no disponible','err');return;}
  const cabId=currentCabId;
  const prev=(_db().evaluacionRespuestas||[]).find(r=>r.evaluacionId===evId&&r.cabId===cabId);
  if(prev&&!prev.puedeRepetir){verResultadoEvaluacionPV(evId);return;}
  const preguntas=ev.preguntas;
  let html='<div style="margin-bottom:20px;padding:16px 18px;background:linear-gradient(135deg,#f0fdfa 0%,#ccfbf1 100%);border-radius:14px;border:2px solid #2dd4bf;"><div class="evq-titulo" style="font-size:17px;font-weight:900;color:#0f766e;" title="'+escAttr(ev.titulo)+'">'+escAttr(ev.titulo)+'</div>';
  if(ev.descripcion)html+='<div style="font-size:13px;color:#115e59;margin-top:6px;line-height:1.45;">'+escAttr(ev.descripcion)+'</div>';
  html+='</div>';
  preguntas.forEach((p,i)=>{
    const opts=(p.opciones||[]).map((o,j)=>`<label style="display:flex;align-items:center;gap:12px;padding:14px 16px;border:2px solid #e5e7eb;border-radius:12px;margin-bottom:10px;cursor:pointer;transition:all .2s;background:white;font-size:14px;" class="evq-opt" data-pidx="${i}" data-oidx="${j}"><input type="radio" name="evq-resp-${evId}-${i}" value="${j}" style="width:18px;height:18px;"><span>${escAttr(o.texto)||'Opción '+(j+1)}</span></label>`).join('');
    html+=`<div class="evq-preg-pv" style="margin-bottom:24px;padding:16px;background:#f8fafc;border-radius:14px;border:1.5px solid #e2e8f0;">
      <div style="font-family:'Montserrat',sans-serif;font-weight:800;font-size:14px;color:#1a1f2e;margin-bottom:12px;line-height:1.4;">${i+1}. ${escAttr(p.texto)||'Pregunta '+(i+1)}</div>
      <div class="evq-opts-pv">${opts}</div>
    </div>`;
  });
  html+=`<button type="button" class="btn bteal bfull" style="padding:14px 20px;font-size:15px;font-weight:800;border-radius:12px;" onclick="enviarRespuestasPV('${evId}')">✓ Enviar respuestas</button>`;
  openSheet('📋',ev.titulo,'',html);
  window._evqActual={evId,preguntas:ev.preguntas};
  document.querySelectorAll('.evq-opt').forEach(lab=>{
    lab.onclick=function(){
      lab.querySelector('input[type="radio"]').checked=true;
      document.querySelectorAll('.evq-opt').forEach(l=>{l.style.background='white';l.style.borderColor='#e5e7eb';});
      lab.style.background='var(--teal-bg)';lab.style.borderColor='var(--teal)';
    };
  });
}

function enviarRespuestasPV(evId){
  const ev=(_db().evaluaciones||[]).find(e=>e.id===evId);
  if(!ev){closeModal();toast('Cuestionario no encontrado','err');return;}
  const cabId=currentCabId;
  const preguntas=ev.preguntas||[];
  const respuestas=[];
  let correctas=0;
  preguntas.forEach((p,i)=>{
    const name=`evq-resp-${evId}-${i}`;
    const radio=document.querySelector('input[name="'+name+'"]:checked');
    const valor=radio?parseInt(radio.value,10):-1;
    respuestas.push({preguntaId:p.id,valor});
    const correctIdx=(p.opciones||[]).findIndex(o=>o.correcta);
    if(correctIdx>=0&&valor===correctIdx)correctas++;
  });
  const totalPreguntas=preguntas.length;
  const puntuacion=correctas;
  _db().evaluacionRespuestas=_db().evaluacionRespuestas||[];
  const prev=_db().evaluacionRespuestas.find(r=>r.evaluacionId===evId&&r.cabId===cabId);
  const registro={evaluacionId:evId,cabId,fecha:new Date().toISOString(),respuestas,puntuacion,totalPreguntas,puedeRepetir:false};
  if(prev){const idx=_db().evaluacionRespuestas.indexOf(prev);_db().evaluacionRespuestas[idx]=registro;}else _db().evaluacionRespuestas.push(registro);
  if(typeof invalidateCache==='function')invalidateCache();
  if(typeof logAppHistorial==='function')logAppHistorial(cabId,'cuestionario',(ev.titulo||evId||'').toString());
  const nota10=totalPreguntas>0?(puntuacion/totalPreguntas*10):0;
  const notaTxt=typeof fmtScore==='function'?fmtScore(nota10):nota10.toFixed(1);
  const body=getResultadoEvaluacionHTML(ev,registro);
  const mBody=document.getElementById('m-body');
  const mTtl=document.getElementById('m-ttl');
  const mSub=document.getElementById('m-sub');
  if(mBody)mBody.innerHTML=body;
  if(mTtl)mTtl.textContent='Resultado: '+ev.titulo;
  if(mSub)mSub.textContent=puntuacion+' de '+totalPreguntas+' correctas · Nota: '+notaTxt+'/10';
  const sheet=document.getElementById('sheet');
  if(sheet)sheet.scrollTop=0;
  toast('Respuestas guardadas','ok');
  saveDB().then(()=>{
    if(typeof renderEvaluacionesPV==='function')renderEvaluacionesPV();
    if(typeof renderEstudioPV==='function')renderEstudioPV();
  });
}
