// ═══════════════════════════════════════════════════════════════
// EVALUACIONES — Cuestionarios interactivos
// Admin: crear/editar/eliminar evaluaciones y preguntas
// Caballeros: responder y ver puntuación
// ═══════════════════════════════════════════════════════════════

function renderEvaluacionesAdmin(){
  const el=document.getElementById('evaluaciones-admin-lista');
  if(!el)return;
  const list=(DB.evaluaciones||[]).filter(e=>!!e.titulo);
  const html=list.length?list.map(ev=>{
    const nPreg=(ev.preguntas||[]).length;
    const nResp=(DB.evaluacionRespuestas||[]).filter(r=>r.evaluacionId===ev.id).length;
    return`<div class="panel" style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
      <div style="flex:1;min-width:0;">
        <div style="font-weight:800;color:var(--dark);margin-bottom:4px;">${escAttr(ev.titulo)}</div>
        <div style="font-size:12px;color:var(--text3);">${nPreg} preguntas · ${nResp} respuestas</div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn bteal" style="font-size:11px;padding:6px 12px;" onclick="openFormEvaluacion('${ev.id}')">✏️ Editar</button>
        <button class="btn boutline" style="font-size:11px;padding:6px 12px;" onclick="confirmarDelEvaluacion('${ev.id}')">🗑</button>
      </div>
    </div>`;
  }).join(''):'<p style="color:var(--text3);font-size:13px;">Aún no hay cuestionarios. Crea uno con el botón de abajo.</p>';
  el.innerHTML=html;
}

function openFormEvaluacion(id){
  const ev=id?(DB.evaluaciones||[]).find(e=>e.id===id):null;
  const titulo=ev?(ev.titulo||''):'';
  const descripcion=ev?(ev.descripcion||''):'';
  const preguntas=(ev&&ev.preguntas)?ev.preguntas:[];
  const pregHtml=preguntas.map((p,i)=>{
    const opciones=(p.opciones||[]).map((o,j)=>`<label style="display:flex;align-items:center;gap:8px;margin:6px 0;"><input type="radio" name="evq-p-${i}" value="${j}" ${o.correcta?'checked':''}><input type="text" data-preg="${i}" data-op="${j}" value="${escAttr(o.texto)}" placeholder="Opción ${j+1}" style="flex:1;padding:6px 10px;"></label>`).join('');
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
      <label style="display:flex;align-items:center;gap:8px;margin:6px 0;"><input type="radio" name="evq-p-${i}" value="0" checked><input type="text" data-preg="${i}" data-op="0" value="" placeholder="Opción 1" style="flex:1;padding:6px 10px;"></label>
      <label style="display:flex;align-items:center;gap:8px;margin:6px 0;"><input type="radio" name="evq-p-${i}" value="1"><input type="text" data-preg="${i}" data-op="1" value="" placeholder="Opción 2" style="flex:1;padding:6px 10px;"></label>
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
  const n=opWrap.querySelectorAll('label').length;
  const label=document.createElement('label');
  label.style.cssText='display:flex;align-items:center;gap:8px;margin:6px 0;';
  label.innerHTML=`<input type="radio" name="evq-p-${pidx}" value="${n}"><input type="text" data-preg="${pidx}" data-op="${n}" value="" placeholder="Opción ${n+1}" style="flex:1;padding:6px 10px;">`;
  opWrap.appendChild(label);
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
    panel.querySelectorAll('.evq-opciones label').forEach(lab=>{
      const radio=lab.querySelector('input[type="radio"]');
      const textInp=lab.querySelector('input[type="text"]');
      const opVal=(textInp&&textInp.value?textInp.value:'').trim();
      opciones.push({texto:opVal,correcta:!!(radio&&radio.checked)});
    });
    const conTexto=opciones.some(o=>o.texto!=='');
    if(texto||conTexto)preguntas.push({id:pid,texto,opciones});
  });
  const evId=id||'evq'+Date.now();
  const existing=(DB.evaluaciones||[]).find(e=>e.id===evId);
  const ev={id:evId,titulo,descripcion,activo:true,preguntas:existing&&existing.preguntas?preguntas.length?preguntas:existing.preguntas:preguntas};
  if(existing)Object.assign(existing,ev);else (DB.evaluaciones=DB.evaluaciones||[]).push(ev);
  closeModal();
  toast('Cuestionario guardado','ok');
  saveDB().then(()=>renderEvaluacionesAdmin());
}

function confirmarDelEvaluacion(id){
  const ev=(DB.evaluaciones||[]).find(e=>e.id===id);
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
  DB.evaluaciones=(DB.evaluaciones||[]).filter(e=>e.id!==id);
  DB.evaluacionRespuestas=(DB.evaluacionRespuestas||[]).filter(r=>r.evaluacionId!==id);
  toast('Cuestionario eliminado','ok');
  saveDB().then(()=>renderEvaluacionesAdmin());
}

// ─── Vista caballero: listar y responder
function renderEvaluacionesPV(){
  const el=document.getElementById('evaluaciones-pv-lista');
  if(!el)return;
  const list=(DB.evaluaciones||[]).filter(e=>!!e.titulo&&e.activo!==false);
  const cabId=currentCabId;
  const respuestas=DB.evaluacionRespuestas||[];
  const html=list.length?list.map(ev=>{
    const miResp=respuestas.find(r=>r.evaluacionId===ev.id&&r.cabId===cabId);
    const nPreg=(ev.preguntas||[]).length;
    const yaRespondido=!!miResp;
    const pts=yaRespondido?miResp.puntuacion:0;
    const total=yaRespondido?miResp.totalPreguntas:0;
    return`<div class="panel" style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
      <div style="flex:1;min-width:0;">
        <div style="font-weight:800;color:var(--dark);margin-bottom:4px;">${escAttr(ev.titulo)}</div>
        <div style="font-size:12px;color:var(--text3);">${nPreg} preguntas${yaRespondido?' · Tu puntuación: '+pts+'/'+total:''}</div>
      </div>
      <button class="btn bteal" style="font-size:11px;padding:6px 12px;" onclick="iniciarCuestionarioPV('${ev.id}')">${yaRespondido?'Ver de nuevo':'Comenzar'}</button>
    </div>`;
  }).join(''):'<p style="color:var(--text3);font-size:13px;">No hay cuestionarios disponibles.</p>';
  el.innerHTML=html;
}

function iniciarCuestionarioPV(evId){
  const ev=(DB.evaluaciones||[]).find(e=>e.id===evId);
  if(!ev||!(ev.preguntas||[]).length){toast('Cuestionario no disponible','err');return;}
  const cabId=currentCabId;
  const preguntas=ev.preguntas;
  let html='<div style="margin-bottom:16px;"><div style="font-weight:800;font-size:16px;color:var(--dark);">'+escAttr(ev.titulo)+'</div>';
  if(ev.descripcion)html+='<div style="font-size:13px;color:var(--text3);margin-top:4px;">'+escAttr(ev.descripcion)+'</div></div>';
  preguntas.forEach((p,i)=>{
    const opts=(p.opciones||[]).map((o,j)=>`<label style="display:flex;align-items:center;gap:10px;padding:12px 14px;border:1.5px solid #e5e7eb;border-radius:10px;margin-bottom:8px;cursor:pointer;transition:all .2s;" class="evq-opt" data-pidx="${i}" data-oidx="${j}"><input type="radio" name="evq-resp-${evId}-${i}" value="${j}"><span>${escAttr(o.texto)||'Opción '+(j+1)}</span></label>`).join('');
    html+=`<div class="evq-preg-pv" style="margin-bottom:20px;">
      <div style="font-weight:700;color:var(--dark);margin-bottom:8px;">${i+1}. ${escAttr(p.texto)||'Pregunta '+(i+1)}</div>
      <div class="evq-opts-pv">${opts}</div>
    </div>`;
  });
  html+=`<button type="button" class="btn bteal bfull" onclick="enviarRespuestasPV('${evId}')">Enviar respuestas</button>`;
  openSheet('📋',ev.titulo,'',html);
  window._evqActual={evId,preguntas:ev.preguntas};
  document.querySelectorAll('.evq-opt').forEach(lab=>{
    lab.onclick=function(){lab.querySelector('input[type="radio"]').checked=true;document.querySelectorAll('.evq-opt').forEach(l=>l.style.background='');lab.style.background='var(--teal-bg)';};
  });
}

function enviarRespuestasPV(evId){
  const ev=(DB.evaluaciones||[]).find(e=>e.id===evId);
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
  DB.evaluacionRespuestas=DB.evaluacionRespuestas||[];
  const prev=DB.evaluacionRespuestas.find(r=>r.evaluacionId===evId&&r.cabId===cabId);
  const registro={evaluacionId:evId,cabId,fecha:new Date().toISOString(),respuestas,puntuacion,totalPreguntas};
  if(prev){const idx=DB.evaluacionRespuestas.indexOf(prev);DB.evaluacionRespuestas[idx]=registro;}else DB.evaluacionRespuestas.push(registro);
  closeModal();
  toast('Respuestas guardadas: '+puntuacion+'/'+totalPreguntas,'ok');
  saveDB().then(()=>{if(typeof renderEvaluacionesPV==='function')renderEvaluacionesPV();});
}
