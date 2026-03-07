// ═══════════════════════════════════════════════════════════════
// SCREENS / TABS
// ═══════════════════════════════════════════════════════════════
function showSc(id){const el=document.getElementById(id);if(!el)return;document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));el.classList.add('active');}
function showTab(id,el){
  const tabEl=document.getElementById(id);
  if(!tabEl)return;
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.ntab').forEach(t=>t.classList.remove('active'));
  tabEl.classList.add('active');if(el)el.classList.add('active');
  if(id==='t-dash'){renderCabs();renderGrupos();}
  if(id==='t-clases'){renderClases();renderCalGr('calgr-pg');}
  if(id==='t-cumple')renderCumple();
  if(id==='t-peticiones'){cargarPeticionesAdmin();}
  if(id==='t-eventos-admin'){renderEventosAdmin();}
  if(id==='t-finanzas'){renderFinanzas();}
  if(id==='t-informes'){renderInformes();}
  if(id==='t-estudio-admin'){if(typeof renderMaterialAdmin==='function')renderMaterialAdmin();if(typeof renderEvaluacionesAdmin==='function')renderEvaluacionesAdmin();}
}
function initAdmin(){
  buildSel();renderDash();renderCabs();if(typeof renderGrupos==='function')renderGrupos();
  if(typeof renderEventosAdmin==='function')renderEventosAdmin();
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
  showTab('t-dash',document.querySelector('.ntab[onclick*="t-dash"]'));
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
// ═══════════════════════════════════════════════════════════════
let fGrupo='TODOS', fBadge='TODOS';
let _lastFGrupo=null, _lastFBadge=null;

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

// Debounce para el campo de búsqueda (estado definido en app.js)
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
    <div class="cab-scores"><div class="cab-sc">${cal.total.toFixed(1)}</div>${evalTxt}</div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════════
// CAB DETAIL MODAL
// ═══════════════════════════════════════════════════════════════
function openCabDetail(id){
  const c=DB.caballeros.find(x=>x.id===id);if(!c)return;
  const cal=calcCab(id);const rank=getRank(id);
  const avH2=c.photo?`<img src="${c.photo}">`:(ini(nombreCorto(c)||c.nombre));
  const val=autoVal(c);
  const starH=Array(7).fill(0).map((_,i)=>`<span class="star ${i<val?'lit':''}">★</span>`).join('');
  const barK=[{k:'i',l:'Interés'},{k:'p',l:'Puntualidad'},{k:'d',l:'Dominio'},{k:'pa',l:'Participación'}];
  const bars=barK.map(({k,l})=>{const pct=Math.min(100,(cal[k]/10)*100);return`<div class="bw"><div class="bl"><span>${l}</span><span>${cal[k].toFixed(1)}/10</span></div><div class="bt"><div class="bf" style="width:${pct}%"></div></div></div>`;}).join('');
  const esAdmin=document.getElementById('screen-admin')&&document.getElementById('screen-admin').classList.contains('active');
  const esMismo=typeof currentCabId!=='undefined'&&currentCabId===id;
  const hist=DB.clases.filter(cl=>cl.cal[id]).map(cl=>({fecha:cl.fecha,tema:cl.tema,...cl.cal[id],t:typeof classScoreForCab==='function'?classScoreForCab(cl,id):rowTotal(cl.cal[id])})).sort((a,b)=>b.fecha.localeCompare(a.fecha));
  const histH=mkHistoryTable(id);
  let evalBlock='';
  if((esAdmin||esMismo)&&typeof getEvalSummaryForCab==='function'){
    const info=getEvalSummaryForCab(id);
    if(info){
      const {count,last,ev,nota10}=info;
      const fechaStr=last.fecha?new Date(last.fecha).toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric'}):'';
      const tituloEv=ev&&ev.titulo?escAttr(ev.titulo):'Cuestionario';
      const baseRes=`${last.puntuacion}/${last.totalPreguntas||0} correctas`;
      const notaTxt=nota10!=null?` (${nota10}/10)`:'';
      const vecesTxt=count===1?'Has respondido 1 cuestionario.':`Has respondido ${count} cuestionarios.`;
      evalBlock=`<div class="dsec"><div class="dhead">Evaluaciones de cuestionario</div>
        <div style="font-size:13px;color:var(--text3);">${vecesTxt}</div>
        <div style="font-size:12px;color:var(--text3);margin-top:4px;">Último: <strong>${tituloEv}</strong>${fechaStr?` · ${fechaStr}`:''} · ${baseRes}${notaTxt}</div>
      </div>`;
    }
  }
  const btnRow=esAdmin?`<div class="btn-row">
      <button class="btn boutline" onclick="closeModal();openFormCab('${id}')">✏️ Editar</button>
      <button class="btn bred" onclick="confirmDelCab('${id}')">🗑 Eliminar</button>
    </div>`:'';
  const cumple=fmtDateCumple(c.fnac);
  const tel=c.telefono&&String(c.telefono).trim()?c.telefono.trim():'—';
  const waUrl=tel!=='—'?telParaWa(tel):'';
  const telEsc=escAttr(tel);const waEsc=escAttr(waUrl);const telNum=numeroParaEnlace(tel);const telHref=telNum?'tel:+'+telNum:'';
  const telHtml=tel!=='—'?`<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><span style="font-weight:700;">${telEsc}</span>${waUrl?`<a href="${waEsc}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:#25d366;color:white;text-decoration:none;" title="Enviar WhatsApp">📱</a>`:''}<a href="${escAttr(telHref)}" style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:var(--teal);color:white;text-decoration:none;" title="Llamar">📞</a></div>`:'<span style="font-weight:700;">—</span>';
  const ocultar=esAdmin?[]:(Array.isArray(c.ocultarAOtros)?c.ocultarAOtros:[]);
  const prof=escAttr(c.profesionOficio||'');const gustos=escAttr(c.gustosAficiones||'');const rolEsc=escAttr(c.rolActual||'');const rolHtml=rolEsc.replace(/\n/g,'<br>');const lema=escAttr(c.lema||'');
  const estCivil=c.estadoCivil==='soltero'?'Soltero':c.estadoCivil==='casado'?'Casado':c.estadoCivil==='noviazgo'?'En noviazgo':c.estadoCivil==='otro'?'Otro':'';
  const hijosTxt=c.tieneHijos==='no'?'No':c.tieneHijos==='si'?(c.numHijos?`Sí (${escAttr(c.numHijos)})`:'Sí'):'';
  const lineasPublicas=[
    prof&&!ocultar.includes('profesionOficio')&&`<div><span style="font-size:11px;color:var(--text3);">Profesión u oficio</span><div style="font-weight:700;">${prof}</div></div>`,
    gustos&&!ocultar.includes('gustosAficiones')&&`<div><span style="font-size:11px;color:var(--text3);">Gustos / aficiones</span><div style="font-weight:700;">${gustos}</div></div>`,
    rolEsc&&!ocultar.includes('rolActual')&&`<div><span style="font-size:11px;color:var(--text3);">Rol o roles en la iglesia</span><div style="font-weight:700;">${rolHtml}</div></div>`,
    lema&&!ocultar.includes('lema')&&`<div><span style="font-size:11px;color:var(--text3);">Versículo o lema</span><div style="font-weight:700;">${lema}</div></div>`,
    estCivil&&!ocultar.includes('estadoCivil')&&`<div><span style="font-size:11px;color:var(--text3);">Estado civil</span><div style="font-weight:700;">${estCivil}</div></div>`,
    hijosTxt&&!ocultar.includes('tieneHijos')&&`<div><span style="font-size:11px;color:var(--text3);">¿Tienes hijos?</span><div style="font-weight:700;">${hijosTxt}</div></div>`
  ].filter(Boolean);
  const perfilPublicoH=lineasPublicas.length?`<div class="dsec"><div class="dhead">Perfil</div><div style="display:flex;flex-wrap:wrap;gap:16px;">${lineasPublicas.join('')}</div></div>`:'';
  const ciudadNac=escAttr(c.ciudadNacimiento||'');const paisNac=escAttr(c.paisNacimiento||'');const anioConv=escAttr(c.anioConversion||'');const iglesiaProc=escAttr(c.iglesiaProcedencia||'');const infoHijos=escAttr(c.infoHijos||'');
  const fbautAdmin=c.fechaBautizado&&c.bautizado?escAttr(c.fechaBautizado):'';const fsellAdmin=c.fechaSellado&&c.sellado?escAttr(c.fechaSellado):'';
  const lineasAdmin=[ciudadNac&&`<div><span style="font-size:11px;color:var(--text3);">Ciudad de nacimiento</span><div>${ciudadNac}</div></div>`,paisNac&&`<div><span style="font-size:11px;color:var(--text3);">País de nacimiento</span><div>${paisNac}</div></div>`,anioConv&&`<div><span style="font-size:11px;color:var(--text3);">Año de conversión</span><div>${anioConv}</div></div>`,iglesiaProc&&`<div><span style="font-size:11px;color:var(--text3);">Iglesia de procedencia</span><div>${iglesiaProc}</div></div>`,infoHijos&&`<div><span style="font-size:11px;color:var(--text3);">Sobre sus hijos</span><div>${infoHijos}</div></div>`,fbautAdmin&&`<div><span style="font-size:11px;color:var(--text3);">Fecha bautizado</span><div>${fbautAdmin}</div></div>`,fsellAdmin&&`<div><span style="font-size:11px;color:var(--text3);">Fecha sellado</span><div>${fsellAdmin}</div></div>`].filter(Boolean);
  const datosAdminH=esAdmin&&lineasAdmin.length?`<div class="dsec"><div class="dhead">Datos completos (solo admin)</div><div style="display:flex;flex-wrap:wrap;gap:16px;">${lineasAdmin.join('')}</div></div>`:'';
  openSheet(avH2,nombreCorto(c)||c.nombre,`${c.dist} · Rank #${rank} · ${c.grupo}`,`
    <div class="dsec"><div class="dhead">Contacto</div><div style="display:flex;flex-wrap:wrap;gap:16px;"><div><span style="font-size:11px;color:var(--text3);">Cumpleaños</span><div style="font-weight:700;">${cumple}</div></div><div><span style="font-size:11px;color:var(--text3);">Teléfono</span>${telHtml}</div></div></div>
    ${perfilPublicoH}
    ${datosAdminH}
    <div class="dsec"><div class="dhead">Estado Espiritual</div>
      <div class="badges">${mkBadges(c)||'<span style="color:var(--text3);font-size:12px">Sin distinciones</span>'}</div>
      <div class="star-row" style="margin-top:10px">${starH}</div>
      <div style="text-align:center;font-size:11px;color:var(--text3);margin-top:4px">Valoración automática por estado</div>
    </div>
    <div class="dsec"><div class="dhead">Puntuación — <span style="color:var(--teal)">${cal.total.toFixed(1)} pts</span> · Asistencia: ${cal.asist}/${cal.totalClases}</div>${bars}</div>
    ${evalBlock}
    <div class="dsec"><div class="dhead">Historial de Clases</div>${histH}</div>
    ${btnRow}
  `);
}

function openListaCaballerosPV(){
  const list=ranking();
  const html=list.length?list.map(c=>mkCabCard(c)).join(''):'<p style="color:var(--text3);font-size:13px">No hay caballeros.</p>';
  openSheet('👥','Caballeros',`${list.length} caballeros · por puntuación`,'<div class="card-list" style="max-height:70vh;overflow-y:auto">'+html+'</div>');
}
function openListaGruposPV(){
  const map={};DB.caballeros.forEach(c=>{if(!map[c.grupo])map[c.grupo]=[];map[c.grupo].push(c);});
  let h='';
  (GRUPOS||[]).forEach(g=>{
    const ms=(map[g]||[]).sort((a,b)=>calcCab(b.id).total-calcCab(a.id).total);
    const avg=ms.length?(ms.reduce((s,c)=>s+calcCab(c.id).total,0)/ms.length).toFixed(1):'0.0';
    const col=(typeof GCOL!=='undefined'&&GCOL[g])||'var(--teal)';
    h+=`<div style="margin-bottom:16px;"><div style="font-weight:800;font-size:13px;color:${col};margin-bottom:8px;padding-bottom:4px;border-bottom:2px solid ${col}33;">${g}</div><div style="font-size:11px;color:var(--text3);margin-bottom:8px;">${ms.length} caballeros · Promedio: ${avg}</div><div style="display:flex;flex-direction:column;gap:4px;">${ms.map(c=>{const av=c.photo?`<img src="${c.photo}" style="width:32px;height:32px;object-fit:cover;border-radius:50%;flex-shrink:0">`:`<div style="width:32px;height:32px;border-radius:50%;background:${col}22;display:flex;align-items:center;justify-content:center;font-family:Montserrat;font-size:10px;font-weight:900;color:${col};flex-shrink:0">${typeof ini==='function'?ini(c.nombre):(c.nombre||'').split(' ').map(w=>w[0]||'').join('').substring(0,2).toUpperCase()}</div>`;return`<div onclick="closeModal();openCabDetail('${c.id}')" style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:#f8fafc;border-radius:10px;cursor:pointer;border:1px solid #e2e8f0;"><div>${av}</div><span style="font-weight:600;color:var(--dark);flex:1;min-width:0;">${nombreCorto(c)||c.nombre}</span><span style="font-weight:800;color:var(--teal);">${calcCab(c.id).total.toFixed(1)}</span></div>`}).join('')}</div></div>`;
  });
  openSheet('📊','Grupos',`${(GRUPOS||[]).length} grupos · integrantes por puntaje`,'<div style="max-height:70vh;overflow-y:auto">'+(h||'<p style="color:var(--text3);font-size:13px">No hay grupos.</p>')+'</div>');
}
function openGrupoIntegrantes(nombreGrupo){
  const map={};DB.caballeros.forEach(c=>{if(!map[c.grupo])map[c.grupo]=[];map[c.grupo].push(c);});
  const ms=(map[nombreGrupo]||[]).sort((a,b)=>calcCab(b.id).total-calcCab(a.id).total);
  const avg=ms.length?(ms.reduce((s,c)=>s+calcCab(c.id).total,0)/ms.length).toFixed(1):'0.0';
  const html=ms.length?ms.map((c,i)=>mkCabCard(c,i+1,true)).join(''):'<p style="color:var(--text3);font-size:13px">No hay integrantes en este grupo.</p>';
  openSheet('👥',nombreGrupo,`${ms.length} integrantes · Prom: ${avg}`,'<div class="card-list" style="max-height:70vh;overflow-y:auto">'+html+'</div>');
}
function confirmDelCab(id){
  const c=DB.caballeros.find(x=>x.id===id);
  document.getElementById('m-body').innerHTML+=`<div class="confirm-box" id="cdel"><p>¿Eliminar a <strong>${c.nombre}</strong>? Se borrarán todas sus calificaciones.</p><div class="btn-row"><button class="btn boutline" onclick="document.getElementById('cdel').remove()">Cancelar</button><button class="btn bred" onclick="doDelCab('${id}')">Eliminar</button></div></div>`;
}
async function doDelCab(id){
  DB.caballeros=DB.caballeros.filter(c=>c.id!==id);
  DB.clases.forEach(cl=>delete cl.cal[id]);
  closeModal();initAdmin();buildSel();toast('💾 Guardando...','info');
  await saveDB();toast('Caballero eliminado','ok');
}

// Escapar para atributos HTML (evita rotura con ", &, < en nombres)
function escAttr(s){if(s==null||s===undefined)return'';return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
// ═══════════════════════════════════════════════════════════════
// FORM CABALLERO — Fixed checkboxes + auto stars
// ═══════════════════════════════════════════════════════════════
function openFormCab(id){
  const isNew=!id;
  const c=id?DB.caballeros.find(x=>x.id===id):{nombre:'',grupo:'CABALLEROS DEL CIELO',dist:'Hermano',bautizado:0,sellado:0,servidor:0,directivo:0,predicador:0,evangelista:0,devoto:0,photo:'',fnac:'',fechaBautizado:'',fechaSellado:'',telefono:'',nombreMostrar:''};
  if(id&&!c){toast('Caballero no encontrado','err');return;}
  const gOpts=GRUPOS.map(g=>`<option value="${g}"${c.grupo===g?' selected':''}>${g}</option>`).join('');
  const telefonoEsc=escAttr(c.telefono||'');const nombreMostrarEsc=escAttr(c.nombreMostrar||'');
  const chkH=`<div class="chk-grid">${CHECKS.map(k=>`
    <div class="chk-item ${c[k]?'on':''}" id="chk-wrap-${k}" onclick="toggleChk('${k}')">
      <div class="chk-box" id="chk-box-${k}"><span class="chk-box-tick" id="chk-tick-${k}">✓</span></div>
      <span class="chk-lbl">${CLBL[k]}</span>
      <input type="checkbox" id="fc-${k}" ${c[k]?'checked':''} style="display:none">
    </div>`).join('')}</div>`;
  const curVal=autoVal(c);
  const starsH=Array(7).fill(0).map((_,i)=>`<span class="star ${i<curVal?'lit':''}" id="fstar-${i}">★</span>`).join('');
  const nombreEsc=escAttr(c.nombre);
  const fnacEsc=escAttr(c.fnac||'');
  const fbautEsc=escAttr(c.fechaBautizado||'');const fsellEsc=escAttr(c.fechaSellado||'');
  openSheet(isNew?'✚':(c.photo?`<img src="${c.photo}">`:(ini(c.nombre))),isNew?'Nuevo Caballero':`Editar: ${c.nombre}`,'',`
    <div class="fr"><label>Nombre completo</label><input id="fc-nombre" value="${nombreEsc}" placeholder="Nombre y apellido"></div>
    <div class="fr"><label>Nombre a mostrar</label><input id="fc-nombreMostrar" value="${nombreMostrarEsc}" placeholder="Ej. Juan Carlos García (primer nombre + primer apellido)"></div>
    <div class="fr"><label>Teléfono</label><input type="tel" id="fc-telefono" value="${telefonoEsc}" placeholder="Ej. 600 000 000"></div>
    <div class="fr"><label>Grupo</label><select id="fc-grupo">${gOpts}</select></div>
    <div class="fr"><label>Distintivo</label><select id="fc-dist"><option value="Hermano"${c.dist==='Hermano'?' selected':''}>Hermano</option><option value="Amigo"${c.dist==='Amigo'?' selected':''}>Amigo</option></select></div>
    <div class="fr"><label>Fecha de nacimiento</label><input type="date" id="fc-fnac" value="${fnacEsc}" placeholder="Para cumpleaños"></div>
    <div class="fr"><label>Fecha de bautizado</label><input type="date" id="fc-fechaBautizado" value="${fbautEsc}" placeholder="Para aniversario"></div>
    <div class="fr"><label>Fecha de sellado</label><input type="date" id="fc-fechaSellado" value="${fsellEsc}" placeholder="Para aniversario"></div>
    <div class="fr"><label>Distinciones (cada una suma 1 ⭐)</label>${chkH}
      <div style="margin-top:8px;background:#ecfdf5;border:1px solid #6ee7b7;border-radius:8px;padding:8px 10px;">
        <span style="font-size:10px;color:#065f46;line-height:1.6;"><strong>🌿 Devoto:</strong> Es aquel que ha nacido de nuevo y tiene una vida espiritual, dando frutos visibles y buen testimonio en su vida pública, en su hogar, su trabajo y la Iglesia.</span>
      </div>
    </div>
    <div class="fr">
      <label>Valoración automática ⭐</label>
      <div class="star-row" id="fc-stars">${starsH}</div>
      <div style="text-align:center;font-size:11px;color:var(--text3);margin-top:4px" id="fc-val-lbl">${curVal}/7 estrellas</div>
    </div>
    ${!isNew?(c.photo?`<div class="fr"><label>Foto actual</label><img src="${c.photo}" style="width:60px;height:60px;border-radius:50%;object-fit:cover;border:2px solid var(--border2)"><button class="btn boutline" style="margin-left:12px;font-size:11px" onclick="document.getElementById('photo-input-modal').click()">Cambiar foto</button></div>`:`<div class="fr"><label>Foto</label><button class="btn boutline" type="button" onclick="document.getElementById('photo-input-modal').click()">📷 Añadir foto</button></div>`):''}
    <button class="btn bteal bfull" onclick="${isNew?'doAddCab()':'doSaveCab(\''+id+'\')'}" style="margin-top:4px">${isNew?'✚ Agregar Caballero':'💾 Guardar Cambios'}</button>
    ${!isNew?`<button class="btn bred bfull" onclick="confirmDelCab('${id}')" style="margin-top:10px">🗑 Eliminar Caballero</button>`:''}
  `);
  // Set data-id for photo modal
  document.getElementById('photo-input-modal').dataset.cabId=id||'';
  updateFormStars();
}

// FIXED: Toggle checkbox properly updates visual + auto-updates stars
function toggleChk(key){
  const inp=document.getElementById('fc-'+key);
  const wrap=document.getElementById('chk-wrap-'+key);
  const box=document.getElementById('chk-box-'+key);
  const tick=document.getElementById('chk-tick-'+key);
  inp.checked=!inp.checked;
  const on=inp.checked;
  wrap.classList.toggle('on',on);
  box.style.background=on?'var(--teal)':'white';
  box.style.borderColor=on?'var(--teal)':'#d1d5db';
  tick.style.display=on?'block':'none';
  updateFormStars();
}

function updateFormStars(){
  // Count checked boxes
  const count=CHECKS.filter(k=>document.getElementById('fc-'+k)?.checked).length;
  // Update star display
  for(let i=0;i<7;i++){
    const s=document.getElementById('fstar-'+i);
    if(s){s.classList.toggle('lit',i<count);}
  }
  const lbl=document.getElementById('fc-val-lbl');
  if(lbl)lbl.textContent=`${count}/7 estrellas`;
}

function compressPhoto(file, callback){
  const reader=new FileReader();
  reader.onload=ev=>{
    const img=new Image();
    img.onload=()=>{
      const MAX=200; // máximo 200px — suficiente para avatar
      let w=img.width, h=img.height;
      if(w>h){if(w>MAX){h=Math.round(h*MAX/w);w=MAX;}}
      else{if(h>MAX){w=Math.round(w*MAX/h);h=MAX;}}
      const canvas=document.createElement('canvas');
      canvas.width=w;canvas.height=h;
      canvas.getContext('2d').drawImage(img,0,0,w,h);
      callback(canvas.toDataURL('image/jpeg',0.7));
    };
    img.src=ev.target.result;
  };
  reader.readAsDataURL(file);
}

function handlePhoto(e,ctx){
  const file=e.target.files[0];if(!file)return;
  if(file.size>10*1024*1024){toast('Imagen demasiado grande (max 10MB)','err');return;}
  toast('📷 Procesando foto...','info');
  compressPhoto(file, async function(data){
    if(ctx==='pv'){
      const c=DB.caballeros.find(x=>x.id===currentCabId);if(!c)return;
      c.photo=data;
      const av=document.getElementById('pv-av');
      av.innerHTML=`<img src="${data}" style="width:76px;height:76px;object-fit:cover;border-radius:50%">`;
      const rem=document.getElementById('pv-photo-reminder');if(rem)rem.style.display='none';
      const ok=await saveDB();if(ok)toast('📷 Foto actualizada','ok');else toast('Foto no se pudo guardar','err');
    }else{
      const cabId=document.getElementById('photo-input-modal').dataset.cabId;
      if(cabId){
        const c=DB.caballeros.find(x=>x.id===cabId);
        if(c){c.photo=data;const ok=await saveDB();if(ok)toast('📷 Foto guardada','ok');else toast('Foto no se pudo guardar','err');}
        else toast('Caballero no encontrado','err');
      }else toast('Abre de nuevo el formulario del caballero e intenta añadir la foto otra vez.','err');
    }
  });
  e.target.value='';
}

function readForm(){
  return{
    nombre:document.getElementById('fc-nombre').value.trim(),
    nombreMostrar:(document.getElementById('fc-nombreMostrar')?.value||'').trim(),
    telefono:(document.getElementById('fc-telefono')?.value||'').trim(),
    grupo:document.getElementById('fc-grupo').value,
    dist:document.getElementById('fc-dist').value,
    fnac:(document.getElementById('fc-fnac')?.value||'').trim(),
    fechaBautizado:(document.getElementById('fc-fechaBautizado')?.value||'').trim(),
    fechaSellado:(document.getElementById('fc-fechaSellado')?.value||'').trim(),
    ...Object.fromEntries(CHECKS.map(k=>[k,document.getElementById('fc-'+k).checked?1:0]))
  };
}
async function doAddCab(){
  const d=readForm();if(!d.nombre){toast('Ingresa el nombre','err');return;}
  DB.caballeros.push({id:'c'+Date.now(),photo:'',pw:'',...d});
  closeModal();initAdmin();buildSel();toast('💾 Guardando...','info');
  await saveDB();toast('✅ Caballero agregado','ok');
}
async function doSaveCab(id){
  const d=readForm();if(!d.nombre){toast('Ingresa el nombre','err');return;}
  const c=DB.caballeros.find(x=>x.id===id);
  if(!c){toast('Caballero no encontrado (id: '+id+')','err');return;}
  const keepPhoto=c.photo;const keepPw=c.pw||'';
  Object.assign(c,d);
  c.photo=keepPhoto;if(keepPw!==undefined)c.pw=keepPw;
  closeModal();initAdmin();buildSel();toast('💾 Guardando...','info');
  const ok=await saveDB();if(!ok){toast('Error al guardar. Revisa espacio o conexión.','err');return;}
  toast('✅ Guardado','ok');
}

// ═══════════════════════════════════════════════════════════════
// GRUPOS
// ═══════════════════════════════════════════════════════════════
function renderGrupos(){
  const map={};DB.caballeros.forEach(c=>{if(!map[c.grupo])map[c.grupo]=[];map[c.grupo].push(c);});
  let h='<div class="sec-ttl">Grupos</div>';
  GRUPOS.forEach(g=>{
    const ms=(map[g]||[]).sort((a,b)=>calcCab(b.id).total-calcCab(a.id).total);
    const avg=ms.length?(ms.reduce((s,c)=>s+calcCab(c.id).total,0)/ms.length).toFixed(1):'0.0';
    const col=GCOL[g]||'var(--teal)';
    const avatars=ms.slice(0,5).map((c,i)=>c.photo?`<img src="${c.photo}" style="width:28px;height:28px;object-fit:cover;border-radius:50%;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.15);margin-left:${i===0?0:'-8px'}" title="${escAttr(nombreCorto(c)||c.nombre)}">`:`<div style="width:28px;height:28px;border-radius:50%;background:${col};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.15);margin-left:${i===0?0:'-8px'};display:flex;align-items:center;justify-content:center;font-family:Montserrat;font-size:9px;font-weight:900;color:white" title="${escAttr(nombreCorto(c)||c.nombre)}">${typeof ini==='function'?ini(c.nombre):(c.nombre||'').split(' ').map(w=>w[0]||'').join('').substring(0,2).toUpperCase()}</div>`).join('');
    h+=`<div class="gr-card" onclick="openGrupoIntegrantes('${g.replace(/'/g,"\\'")}')" style="cursor:pointer;">
      <div class="gr-hdr"><div class="gr-nm" style="color:${col}">${g}</div><div style="font-size:11px;color:var(--text3)">${ms.length} integrantes · Prom: ${avg} · Toca para ver</div></div>
      ${avatars?`<div style="display:flex;align-items:center;padding-top:8px;margin-left:2px">${avatars}</div>`:''}
    </div>`;
  });
  document.getElementById('grupos-pg').innerHTML=h;
}

// ═══════════════════════════════════════════════════════════════
// CLASES
// ═══════════════════════════════════════════════════════════════
function mkClaseCard(cl){
  const{d,m}=fmtBox(cl.fecha);
  const avg=claseAvg(cl);
  const sc=avg>=7?'#15803d':avg>=4?'var(--gold2)':'var(--text3)';
  const asist=Object.values(cl.cal||{}).filter(q=>q&&q.a).length;
  const today=new Date().toISOString().split('T')[0];
  const realizada=cl.fecha<=today;
  const calificada=claseAvg(cl)>0;
  const estadoRealizada=realizada?'<span class="cl-badge cl-realizada">✓ Realizada</span>':'<span class="cl-badge cl-proxima">Próxima</span>';
  const estadoCalif=calificada?'<span class="cl-badge cl-calificada">Calificada</span>':'<span class="cl-badge cl-pendiente">Pendiente</span>';
  return`<div class="cl-card" onclick="openClaseDetail('${cl.fecha}')">
    <div class="cl-date"><div class="cl-day">${d}</div><div class="cl-mon">${m}</div></div>
    <div class="cl-inf">
      <div class="cl-nm">${cl.tema||'Estudio de las Dispensaciones'}</div>
      <div class="cl-mt">${cl.grupoResp||'Sin asignar'} · ${asist} asistentes</div>
      <div class="cl-badges">${estadoRealizada} ${estadoCalif}</div>
    </div>
    <div class="cl-avg" style="color:${sc}">${avg>0?avg.toFixed(1):'—'}</div>
  </div>`;
}
function renderClases(){
  const today=new Date().toISOString().split('T')[0];
  const sorted=[...DB.clases].sort((a,b)=>a.fecha.localeCompare(b.fecha));
  const porAnio={};
  sorted.forEach(cl=>{
    const y=cl.fecha.substring(0,4);
    if(!porAnio[y])porAnio[y]=[];
    porAnio[y].push(cl);
  });
  const anos=Object.keys(porAnio).sort();
  let html='';
  anos.forEach(y=>{
    html+=`<div class="cl-year-ttl">${y}</div>`;
    html+=porAnio[y].map(mkClaseCard).join('');
  });
  const el=document.getElementById('clases-list');
  el.innerHTML=sorted.length?html:'<p style="color:var(--text3);font-size:13px">Sin clases. ¡Crea la primera!</p>';
}

// ═══════════════════════════════════════════════════════════════
// CLASE DETAIL — Identificar por fecha para evitar confundir clases (ej. 13 feb vs 27 feb)
// ═══════════════════════════════════════════════════════════════
function getClaseByKey(key){
  if(!key)return null;
  const byFecha=/^\d{4}-\d{2}-\d{2}$/.test(key);
  return DB.clases.find(x=>byFecha?x.fecha===key:x.id===key)||null;
}
function openClaseDetail(key){
  const cl=getClaseByKey(key);if(!cl)return;
  const rows=DB.caballeros.filter(c=>cl.cal[c.id]).map(c=>{
    const ev=typeof getEvalScoreForClassAndCab==='function'?getEvalScoreForClassAndCab(cl.id||cl.fecha,c.id):null;
    return{nom:c.nombre,...cl.cal[c.id],ev,t:typeof classScoreForCab==='function'?classScoreForCab(cl,c.id):rowTotal(cl.cal[c.id])};
  }).sort((a,b)=>b.t-a.t);
  const th=`<table class="dtable"><thead><tr><th>Nombre</th><th>Int</th><th>Pun</th><th>Dom</th><th>Par</th><th>A</th><th>Eval</th><th>Total</th></tr></thead><tbody>${rows.map(r=>`<tr><td style="font-size:12px">${r.nom.split(' ').slice(0,2).join(' ')}</td><td>${r.a?r.i:'—'}</td><td>${r.a?r.p:'—'}</td><td>${r.a?r.d:'—'}</td><td>${r.a?r.pa:'—'}</td><td>${r.a?'✅':'❌'}</td><td>${r.a&&r.ev!=null?fmtScore(r.ev):'—'}</td><td class="sc ${scCls(r.t)}">${r.a?fmtScore(r.t):'—'}</td></tr>`).join('')}</tbody></table>`;
  const gOpts=['<option value="">Sin asignar</option>',...GRUPOS.map(g=>`<option value="${g}" ${cl.grupoResp===g?'selected':''}>${g}</option>`)].join('');
  const temaEsc=(cl.tema||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
  const clave=cl.fecha;
  openSheet('📅',cl.tema||'Estudio de las Dispensaciones',`${fmtDate(cl.fecha)} · Prom: ${claseAvg(cl).toFixed(2)}`,`
    <div class="dsec"><div class="dhead">Editar datos de la clase</div>
      <div class="fr"><label>Nombre / Tema de la clase</label><input id="edcl-tema" value="${temaEsc}" placeholder="Ej: Estudio de las Dispensaciones"></div>
      <div class="fr"><label>Fecha</label><input type="date" id="edcl-fecha" value="${cl.fecha}"></div>
      <div class="fr"><label>Grupo responsable</label><select id="edcl-grupo">${gOpts}</select></div>
      <button class="btn bteal" onclick="doSaveClaseInfo('${clave}')" style="margin-top:6px">💾 Guardar cambios</button>
    </div>
    <div class="dsec"><div class="dhead">Registro de Calificaciones</div>${th}</div>
    <div class="btn-row">
      <button class="btn bteal" style="flex:1" onclick="closeModal();openGrade('${clave}')">✏️ Calificar / Editar notas</button>
      <button class="btn bred" onclick="confirmDelClase('${clave}')">🗑 Eliminar</button>
    </div>
  `);
}
async function doSaveClaseInfo(key){
  const cl=getClaseByKey(key);if(!cl)return;
  const tema=document.getElementById('edcl-tema').value.trim()||'Estudio de las Dispensaciones';
  const fecha=document.getElementById('edcl-fecha').value;
  const grupoResp=document.getElementById('edcl-grupo').value;
  if(!fecha){toast('La fecha es obligatoria','err');return;}
  cl.tema=tema;cl.fecha=fecha;cl.grupoResp=grupoResp;
  closeModal();toast('💾 Guardando...','info');
  const ok=await saveDB();if(!ok){toast('Error al guardar','err');return;}
  toast('✅ Clase actualizada','ok');
  renderClases();renderDash();renderCalGr();
}
function confirmDelClase(key){
  const cl=getClaseByKey(key);if(!cl)return;
  document.getElementById('m-body').innerHTML+=`<div class="confirm-box" id="cdcl"><p>¿Eliminar la clase del <strong>${fmtDate(cl.fecha)}</strong>?</p><div class="btn-row"><button class="btn boutline" onclick="document.getElementById('cdcl').remove()">Cancelar</button><button class="btn bred" onclick="doDelClase('${cl.fecha}')">Eliminar</button></div></div>`;
}
async function doDelClase(key){
  const cl=getClaseByKey(key);if(!cl)return;
  DB.clases=DB.clases.filter(c=>c.id!==cl.id);
  closeModal();renderClases();renderDash();toast('💾 Guardando...','info');
  const ok=await saveDB();if(ok)toast('Clase eliminada','ok');else toast('Error al guardar','err');
}

// ═══════════════════════════════════════════════════════════════
// NUEVA CLASE
// ═══════════════════════════════════════════════════════════════
function openNuevaClase(){
  const today=new Date().toISOString().split('T')[0];
  const gOpts=['<option value="">Sin asignar</option>',...GRUPOS.map(g=>`<option value="${g}">${g}</option>`)].join('');
  openSheet('📅','Nueva Clase','Registrar sesión de estudios',`
    <div class="fr"><label>Fecha de la clase</label><input type="date" id="nc-fecha" value="${today}"></div>
    <div class="fr"><label>Tema del estudio</label><input id="nc-tema" value="Estudio de las Dispensaciones" placeholder="Ej: Estudio de las Dispensaciones"></div>
    <div class="fr"><label>Grupo Responsable</label><select id="nc-grupo">${gOpts}</select></div>
    <div class="info-box">💡 Después podrás marcar asistencia y calificar a cada caballero del 0 al 10.</div>
    <button class="btn bteal bfull" onclick="doCrearClase()">📋 Ir a Calificar →</button>
  `);
}
async function doCrearClase(){
  const fechaEl=document.getElementById('nc-fecha');
  const temaEl=document.getElementById('nc-tema');
  const grupoEl=document.getElementById('nc-grupo');
  const fecha=window._ncForce&&window._ncFormData?window._ncFormData.fecha:(fechaEl?fechaEl.value:'');
  if(!fecha){toast('Selecciona la fecha','err');return;}
  const dup=DB.clases.find(c=>c.fecha===fecha);
  if(dup&&!window._ncForce){
    window._ncFormData={fecha,tema:(temaEl?temaEl.value.trim():'')||'Estudio de las Dispensaciones',grupo:grupoEl?grupoEl.value:''};
    openSheet('⚠️','Clase ya existente','',`
      <p style="font-size:14px;color:var(--text);margin-bottom:10px;">Ya hay una clase el <strong>${fmtDate(fecha)}</strong>.</p>
      <p style="font-size:12px;color:var(--text3);margin-bottom:14px;">Si continúas, se añadirá otra clase para la misma fecha.</p>
      <div class="btn-row">
        <button class="btn boutline" onclick="closeModal()">Cancelar</button>
        <button class="btn bteal" onclick="closeModal();window._ncForce=true;doCrearClase();window._ncForce=false;">Continuar</button>
      </div>
    `);
    return;
  }
  const tema=window._ncForce&&window._ncFormData?window._ncFormData.tema:(temaEl?temaEl.value.trim():'')||'Estudio de las Dispensaciones';
  const grupoResp=window._ncForce&&window._ncFormData?window._ncFormData.grupo:(grupoEl?grupoEl.value:'');
  const id='cl'+Date.now();
  DB.clases.push({id,fecha,tema,grupoResp,cal:{}});
  window._ncFormData=null;window._ncForce=false;
  await saveDB();closeModal();openGrade(id);
}

// ═══════════════════════════════════════════════════════════════
// GRADING — full screen, table layout, FIXED
// ═══════════════════════════════════════════════════════════════
function openGrade(key){
  const cl=getClaseByKey(key);if(!cl)return;
  gradeClaseId=cl.id;
  document.getElementById('gs-ttl').textContent=cl.tema||'Estudio de las Dispensaciones';
  document.getElementById('gs-sub').textContent=fmtDate(cl.fecha)+' · Toca ○ para marcar asistencia · Notas del 0 al 10';

  const sorted=[...DB.caballeros].sort((a,b)=>a.grupo.localeCompare(b.grupo)||a.nombre.localeCompare(b.nombre));
  let html='';let lastG='';
  const getEvalSc=typeof getEvalScoreForClassAndCab==='function'?(cabId)=>getEvalScoreForClassAndCab(cl.id||cl.fecha,cabId):()=>null;
  sorted.forEach(c=>{
    if(c.grupo!==lastG){
      lastG=c.grupo;
      const col=GCOL[c.grupo]||'var(--teal)';
      html+=`<tr class="grp-sep"><td colspan="9" style="color:${col}">${c.grupo}</td></tr>`;
    }
    const q=cl.cal[c.id]||{a:0,i:'',p:'',d:'',pa:''};
    const pres=!!q.a;
    const nombre=c.nombre.split(' ').slice(0,2).join(' ');
    const evalSc=getEvalSc(c.id);
    const totVal=pres?(typeof classScoreForCab==='function'?classScoreForCab(cl,c.id):rowTotal(q)):null;
    html+=`<tr id="tr-${c.id}">
      <td><div class="gname">${nombre}</div></td>
      <td><button class="att-btn ${pres?'yes':''}" id="att-${c.id}" onclick="togAtt('${c.id}')">${pres?'✅':'○'}</button></td>
      <td><input class="sc-inp" id="si-${c.id}" type="number" min="0" max="10" step="1" value="${pres&&q.i!==''?q.i:''}" placeholder="—" ${pres?'':'disabled'} onfocus="this.select()" oninput="clamp(this);updTotal('${c.id}');jumpNextGrade(this)"></td>
      <td><input class="sc-inp" id="sp-${c.id}" type="number" min="0" max="10" step="1" value="${pres&&q.p!==''?q.p:''}" placeholder="—" ${pres?'':'disabled'} onfocus="this.select()" oninput="clamp(this);updTotal('${c.id}');jumpNextGrade(this)"></td>
      <td><input class="sc-inp" id="sd-${c.id}" type="number" min="0" max="10" step="1" value="${pres&&q.d!==''?q.d:''}" placeholder="—" ${pres?'':'disabled'} onfocus="this.select()" oninput="clamp(this);updTotal('${c.id}');jumpNextGrade(this)"></td>
      <td><input class="sc-inp" id="spa-${c.id}" type="number" min="0" max="10" step="1" value="${pres&&q.pa!==''?q.pa:''}" placeholder="—" ${pres?'':'disabled'} onfocus="this.select()" oninput="clamp(this);updTotal('${c.id}');jumpNextGrade(this)"></td>
      <td class="total-cell" style="font-weight:700;color:${evalSc!=null&&evalSc>0?'var(--teal)':'var(--text3)'}">${evalSc!=null?fmtScore(evalSc):'—'}</td>
      <td class="total-cell" id="tot-${c.id}">${totVal!=null?fmtScore(totVal):'—'}</td>
    </tr>`;
  });
  document.getElementById('grade-tbody').innerHTML=html;
  document.getElementById('grade-screen').classList.add('open');
  document.getElementById('grade-screen').scrollTop=0;
}

function togAtt(cabId){
  const btn=document.getElementById('att-'+cabId);
  const now=!btn.classList.contains('yes');
  btn.classList.toggle('yes',now);
  btn.textContent=now?'✅':'○';
  const ids=['si','sp','sd','spa'];
  ids.forEach(p=>{
    const inp=document.getElementById(p+'-'+cabId);
    if(!inp)return;
    inp.disabled=!now;
    if(now)inp.value='1';else inp.value='';
  });
  const tot=document.getElementById('tot-'+cabId);
  if(tot){
    if(now){
      const evScore=typeof getEvalScoreForClassAndCab==='function'&&gradeClaseId?getEvalScoreForClassAndCab(gradeClaseId,cabId):null;
      const base=rowTotal({i:1,p:1,d:1,pa:1});
      tot.textContent=fmtScore(evScore!=null?+(0.7*base+0.3*evScore).toFixed(2):base);
    }else tot.textContent='—';
  }
}
function clamp(inp){if(+inp.value>10)inp.value=10;if(+inp.value<0)inp.value=0;}
function jumpNextGrade(inp){
  var v=inp.value.trim();
  if(v==='')return;
  var n=+v;
  if(n<0||n>10)return;
  if(v==='1')return;
  if(v.length===2&&v!=='10')return;
  var id=inp.id;
  var idx=id.indexOf('-');
  if(idx===-1)return;
  var prefix=id.slice(0,idx);
  var cabId=id.slice(idx+1);
  var nextPref={si:'sp',sp:'sd',sd:'spa',spa:null}[prefix];
  if(!nextPref)return;
  var nextEl=document.getElementById(nextPref+'-'+cabId);
  if(nextEl)setTimeout(function(){nextEl.focus();},0);
}
function updTotal(cabId){
  const tot=document.getElementById('tot-'+cabId);
  if(!tot||!document.getElementById('att-'+cabId).classList.contains('yes'))return;
  const i=+document.getElementById('si-'+cabId).value||0;
  const p=+document.getElementById('sp-'+cabId).value||0;
  const d=+document.getElementById('sd-'+cabId).value||0;
  const pa=+document.getElementById('spa-'+cabId).value||0;
  const base=rowTotal({i,p,d,pa});
  const evScore=typeof getEvalScoreForClassAndCab==='function'&&gradeClaseId?getEvalScoreForClassAndCab(gradeClaseId,cabId):null;
  const final=evScore!=null?+(0.7*base+0.3*evScore).toFixed(2):base;
  tot.textContent=fmtScore(final);
}
function closeGrade(){document.getElementById('grade-screen').classList.remove('open');gradeClaseId=null;}

async function doSaveGrade(){
  if(!gradeClaseId)return;
  const cl=DB.clases.find(x=>x.id===gradeClaseId);if(!cl)return;
  const beforeTotals={};
  DB.caballeros.forEach(c=>{
    beforeTotals[c.id]=calcCab(c.id).total;
  });
  const missing=[];const newCal={};let saved=0;
  DB.caballeros.forEach(c=>{
    const btn=document.getElementById('att-'+c.id);if(!btn)return;
    const pres=btn.classList.contains('yes');
    if(pres){
      const iv=document.getElementById('si-'+c.id);
      const pv=document.getElementById('sp-'+c.id);
      const dv=document.getElementById('sd-'+c.id);
      const pav=document.getElementById('spa-'+c.id);
      if([iv,pv,dv,pav].some(x=>!x||x.value==='')){missing.push(c.nombre.split(' ')[0]);return;}
      const i=Math.min(10,Math.max(0,+iv.value));
      const p=Math.min(10,Math.max(0,+pv.value));
      const d=Math.min(10,Math.max(0,+dv.value));
      const pa=Math.min(10,Math.max(0,+pav.value));
      newCal[c.id]={a:1,i,p,d,pa};saved++;
    }
  });
  if(missing.length){toast(`⚠️ Faltan notas: ${missing.slice(0,3).join(', ')}${missing.length>3?'...':''}`,'err');return;}
  cl.cal=newCal;closeGrade();
  invalidateCache();
  DB.caballeros.forEach(c=>{
    const before=beforeTotals[c.id]||0;
    const after=calcCab(c.id).total;
    const delta=+(after-before).toFixed(2);
    if(!isNaN(delta)&&delta!==0){
      c.lastDelta=delta;
      c.lastDeltaClase=cl.fecha;
    }
  });
  renderClases();renderDash();renderCalGr('calgr-pg');
  toast('💾 Guardando calificaciones...','info');
  const ok=await saveDB();
  if(ok)toast(`✅ ${saved} calificaciones guardadas`,'ok');else toast('⚠️ Calificaciones no se pudieron guardar','err');
}

// ═══════════════════════════════════════════════════════════════
// CAL GRUPOS
// (targetId opcional para reutilizar en vista personal)
// ═══════════════════════════════════════════════════════════════
function renderCalGr(targetId){
  const el=document.getElementById(targetId||'calgr-pg');if(!el)return;
  const esPv=targetId==='pv-calgr-pg';
  // Pestaña Grupos caballero: solo tarjetas de grupos; tap = integrantes por puntaje
  if(esPv){
    const map={};DB.caballeros.forEach(c=>{if(!map[c.grupo])map[c.grupo]=[];map[c.grupo].push(c);});
    let h='<div class="sec-ttl" style="margin-bottom:14px;">👥 Grupos</div><p style="font-size:12px;color:var(--text3);margin-bottom:16px;">Toca un grupo para ver sus integrantes ordenados por puntuación.</p>';
    (GRUPOS||[]).forEach(g=>{
      const ms=(map[g]||[]).sort((a,b)=>calcCab(b.id).total-calcCab(a.id).total);
      const avg=ms.length?(ms.reduce((s,c)=>s+calcCab(c.id).total,0)/ms.length).toFixed(1):'0.0';
      const col=GCOL[g]||'var(--teal)';
      const avatars=ms.slice(0,3).map((c,i)=>c.photo?`<img src="${c.photo}" style="width:24px;height:24px;object-fit:cover;border-radius:50%;border:2px solid white;box-shadow:0 1px 2px rgba(0,0,0,0.1);margin-left:${i===0?0:'-10px'}" title="${escAttr(nombreCorto(c)||c.nombre)}">`:`<div style="width:24px;height:24px;border-radius:50%;background:${col};border:2px solid white;box-shadow:0 1px 2px rgba(0,0,0,0.1);margin-left:${i===0?0:'-10px'};display:flex;align-items:center;justify-content:center;font-family:Montserrat;font-size:8px;font-weight:900;color:white" title="${escAttr(nombreCorto(c)||c.nombre)}">${typeof ini==='function'?ini(c.nombre):(c.nombre||'').split(' ').map(w=>w[0]||'').join('').substring(0,2).toUpperCase()}</div>`).join('');
      h+=`<div onclick="openGrupoIntegrantes('${g.replace(/'/g,"\\'")}')" style="background:white;border:1.5px solid #e9edf2;border-radius:14px;padding:16px 18px;margin-bottom:10px;box-shadow:0 2px 10px rgba(0,0,0,0.04);cursor:pointer;display:flex;align-items:center;gap:14px;transition:all .2s;" onmouseover="this.style.borderColor='${col}';this.style.boxShadow='0 4px 16px rgba(0,0,0,0.08)'" onmouseout="this.style.borderColor='#e9edf2';this.style.boxShadow='0 2px 10px rgba(0,0,0,0.04)'">
        <div style="width:44px;height:44px;border-radius:12px;background:${col}22;display:flex;align-items:center;justify-content:flex-start;flex-shrink:0;overflow:visible;padding-left:2px;">${avatars||'<span style="font-size:20px">👥</span>'}</div>
        <div style="flex:1;min-width:0;"><div style="font-family:Montserrat,sans-serif;font-size:14px;font-weight:800;color:${col};">${g}</div><div style="font-size:11px;color:var(--text3);margin-top:2px;">${ms.length} integrantes · Prom: ${avg}</div></div>
        <div style="font-size:18px;color:var(--text3);flex-shrink:0;">→</div>
      </div>`;
    });
    el.innerHTML=h||'<p style="color:var(--text3);font-size:13px">No hay grupos.</p>';
    return;
  }
  const sorted=[...DB.clases].sort((a,b)=>a.fecha.localeCompare(b.fecha));
  if(!sorted.length){el.innerHTML='<div class="sec-ttl">Cal. por Grupo</div><p style="color:var(--text3);font-size:13px">Sin clases.</p>';return;}
  const porAnio={};
  sorted.forEach(cl=>{const y=cl.fecha.substring(0,4);if(!porAnio[y])porAnio[y]=[];porAnio[y].push(cl);});
  const anos=Object.keys(porAnio).sort();
  let h='<div class="sec-ttl">Calificaciones por Grupo</div>';
  anos.forEach(y=>{
    h+=`<div class="cl-year-ttl" style="margin-top:${h.includes('cl-year-ttl')?16:0}px">${y}</div>`;
    porAnio[y].forEach(cl=>{
      const gs={};DB.caballeros.forEach(c=>{const q=cl.cal[c.id];if(q&&q.a){if(!gs[c.grupo])gs[c.grupo]={s:0,n:0};gs[c.grupo].s+=(typeof classScoreForCab==='function'?classScoreForCab(cl,c.id):rowTotal(q));gs[c.grupo].n++;}});
      h+=`<div class="cgc"><div class="cgc-ttl">📅 ${fmtDate(cl.fecha)} — ${cl.tema||'Estudio de las Dispensaciones'}</div>
        ${GRUPOS.map(g=>{const d=gs[g];if(!d||!d.n)return`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f3f4f6;font-size:12px;color:var(--text3)"><span>${g}</span><span>Sin datos</span></div>`;
        const avg=(d.s/d.n).toFixed(2);const pct=Math.min(100,(+avg/10)*100);
        const sc=+avg>=7?'#15803d':+avg>=4?'var(--gold2)':'var(--text3)';const col=GCOL[g]||'var(--teal)';
        return`<div style="padding:6px 0;border-bottom:1px solid #f3f4f6"><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:12px;font-weight:700;color:${col}">${g}</span><span style="font-family:Montserrat;font-weight:800;font-size:13px;color:${sc}">${avg}<span style="font-size:10px;color:var(--text3);font-weight:400"> (${d.n})</span></span></div><div class="bt"><div class="bf" style="width:${pct}%;background:${col}"></div></div></div>`;
        }).join('')}</div>`;
    });
  });
  el.innerHTML=h;
}

function renderPersonal(cabId){
  const c=DB.caballeros.find(x=>x.id===cabId);if(!c)return;
  const cal=calcCab(cabId);const rank=getRank(cabId);const val=autoVal(c);
  // Avatar
  const av=document.getElementById('pv-av');
  av.innerHTML=c.photo?`<img src="${c.photo}" style="width:76px;height:76px;object-fit:cover;border-radius:50%">`:`<span style="font-family:Montserrat;font-size:26px;font-weight:900;color:white">${ini(c.nombre)}</span>`;
  const rem=document.getElementById('pv-photo-reminder');
  if(rem)rem.style.display=c.photo?'none':'block';
  document.getElementById('pv-name').textContent=c.nombre;
  document.getElementById('pv-meta').textContent=c.grupo?'Grupo '+(c.grupo||''):'';
  document.getElementById('pv-bdg').innerHTML=mkBadges(c);
  document.getElementById('pv-total').textContent=cal.total.toFixed(1);
  document.getElementById('pv-rank').textContent=`Posición #${rank} de ${DB.caballeros.length} · Asistencias: ${cal.asist}/${cal.totalClases}`;
  document.getElementById('pv-stars').innerHTML=Array(7).fill(0).map((_,i)=>`<span class="star ${i<val?'lit':''}">★</span>`).join('');
  const completionEl=document.getElementById('pv-profile-completion');
  if(completionEl){
    const req=[];
    req.push({ok:!!c.photo,label:'Foto de perfil'});
    req.push({ok:!!(c.nombreMostrar&&String(c.nombreMostrar).trim()),label:'Nombre a mostrar'});
    req.push({ok:!!(c.telefono&&String(c.telefono).trim()),label:'Teléfono'});
    req.push({ok:!!(c.fnac&&c.fnac.length>=10),label:'Fecha de nacimiento'});
    req.push({ok:!!(c.ciudadNacimiento&&String(c.ciudadNacimiento).trim()),label:'Ciudad de nacimiento'});
    req.push({ok:!!(c.paisNacimiento&&String(c.paisNacimiento).trim()),label:'País de nacimiento'});
    req.push({ok:!!(c.anioConversion&&String(c.anioConversion).trim()),label:'Año de conversión'});
    req.push({ok:!!(c.iglesiaProcedencia&&String(c.iglesiaProcedencia).trim()),label:'Iglesia de procedencia'});
    req.push({ok:!!(c.profesionOficio&&String(c.profesionOficio).trim()),label:'Profesión u oficio'});
    req.push({ok:!!(c.gustosAficiones&&String(c.gustosAficiones).trim()),label:'Gustos o aficiones'});
    req.push({ok:!!(c.rolActual&&String(c.rolActual).trim()),label:'Rol en la iglesia'});
    req.push({ok:!!(c.estadoCivil&&String(c.estadoCivil).trim()),label:'Estado civil'});
    req.push({ok:!!(c.tieneHijos&&String(c.tieneHijos).trim()),label:'¿Tienes hijos?'});
    req.push({ok:!!(c.lema&&String(c.lema).trim()),label:'Versículo o lema'});
    req.push({ok:!!(c.campamentoRespuesta&&String(c.campamentoRespuesta).trim()),label:'Campamento (¿vas?)'});
    if(c.bautizado)req.push({ok:!!(c.fechaBautizado&&c.fechaBautizado.length>=10),label:'Fecha de bautismo'});
    if(c.sellado)req.push({ok:!!(c.fechaSellado&&c.fechaSellado.length>=10),label:'Fecha de sellado'});
    const total=req.length||1;
    const done=req.filter(r=>r.ok).length;
    const pct=Math.round((done/total)*100);
    const faltan=req.filter(r=>!r.ok).map(r=>r.label);
    const barColor=pct>=100?'linear-gradient(90deg,#16a34a,#22c55e)':pct>=70?'linear-gradient(90deg,#3aabba,#2d8f9c)':'linear-gradient(90deg,#f59e0b,#f97316)';
    const msg=pct>=100?'Perfil completo ✅':'Perfil '+pct+'% completo';
    let subt;
    if(pct>=100){
      completionEl.innerHTML=`<div style="background:linear-gradient(135deg,#ecfdf5 0%,#d1fae5 100%);border:2px solid #22c55e;border-radius:14px;padding:14px 18px;text-align:center;"><span style="font-family:'Montserrat',sans-serif;font-size:15px;font-weight:900;color:#166534;">Perfil completo ✅</span></div>`;
    }else{
      if(pct>80)subt='Para llegar al 100% te falta: '+faltan.join(', ')+'. Entra en tu perfil (👤) para completarlo.';
      else subt='Entra en tu perfil (botón 👤 arriba) y completa los datos que te hacen falta.';
      completionEl.innerHTML=`
      <div class="panel panel-soft-teal">
        <div class="panel-title">${msg}</div>
        <div class="panel-desc">${subt}</div>
        <div class="bt" style="background:#e5e7eb;">
          <div class="bf" style="width:${pct}%;background:${barColor};transition:width .4s ease;"></div>
        </div>
      </div>
    `;
    }
  }
  const lastMsgEl=document.getElementById('pv-last-class-msg');
  if(lastMsgEl){
    const d=c.lastDelta;
    if(typeof d==='number'&&!isNaN(d)&&d!==0){
      const absDelta=Math.abs(d).toFixed(1);
      const mejoro=d>0;
      const color=mejoro?'#16a34a':'#b91c1c';
      const fechaTxt=c.lastDeltaClase?fmtDate(c.lastDeltaClase):'la última clase';
      const txt=mejoro
        ?`En ${fechaTxt} tu media subió <strong style="color:${color}">+${absDelta} pts</strong>. ¡Sigue así!`
        :`En ${fechaTxt} tu media bajó <strong style="color:${color}">-${absDelta} pts</strong>. ¡La próxima clase puedes recuperar terreno!`;
      lastMsgEl.innerHTML=`<div class="panel" style="margin-top:8px;border-color:${color}33;"><div class="panel-desc" style="color:${color};margin-bottom:0;">${txt}</div></div>`;
    }else{
      lastMsgEl.innerHTML='';
    }
  }
  const achEl=document.getElementById('pv-achievements');
  if(achEl){
    const sortedAll=[...DB.clases].sort((a,b)=>a.fecha.localeCompare(b.fecha));
    let longest=0,current=0,totalAsist=0;
    sortedAll.forEach(cl=>{
      const q=(cl.cal||{})[cabId];
      if(q&&q.a){
        totalAsist++;
        current++;
        if(current>longest)longest=current;
      }else{
        current=0;
      }
    });
    const achievements=[];
    if(longest>=3)achievements.push('Asistencia fiel: 3 o más clases seguidas asistiendo.');
    if(totalAsist>=10)achievements.push('Discípulo constante: 10 o más clases asistidas.');
    if(cal.total>=7)achievements.push('Media general alta: puntuación acumulada ≥ 7.0.');
    if(achievements.length){
      achEl.innerHTML=`
        <div class="panel panel-soft-gold">
          <div class="panel-title">Logros recientes</div>
          <ul style="margin:0;padding-left:18px;font-size:12px;color:#92400e;">
            ${achievements.map(a=>`<li>${a}</li>`).join('')}
          </ul>
        </div>
      `;
    }else{
      achEl.innerHTML='';
    }
  }
  const evalEl=document.getElementById('pv-eval-summary');
  if(evalEl)evalEl.innerHTML='';
  const bK=[{k:'i',l:'Interés'},{k:'p',l:'Puntualidad'},{k:'d',l:'Dominio'},{k:'pa',l:'Participación'}];
  document.getElementById('pv-bars').innerHTML='<div style="font-family:Montserrat,sans-serif;font-size:12px;font-weight:800;color:#1a1f2e;margin-bottom:8px">Media acumulada</div>'+bK.map(({k,l})=>{const pct=Math.min(100,(cal[k]/10)*100);return`<div class="bw"><div class="bl"><span>${l}</span><span>${cal[k].toFixed(1)}/10</span></div><div class="bt"><div class="bf" style="width:${pct}%"></div></div></div>`;}).join('');
  document.getElementById('pv-hist').innerHTML='<div class="pv-hist-ttl" style="font-family:Montserrat,sans-serif;font-size:12px;font-weight:800;color:#1a1f2e;margin-bottom:8px">Calificaciones individuales por clase</div>'+mkHistoryTableCompact(cabId);
  renderFbautCard(c);
  renderFsellCard(c);
  renderDevotoCard(c);
  renderFnacCard(c);
  renderTelefonoCard(c);
  renderEncuestaCampamento(c);
  renderCumpleBanners(cabId);
  renderEvalPendienteBanner(cabId);
  // Top 5 caballeros general en el inicio
  renderTop5Caballeros();
  const finBtn=document.getElementById('pv-btn-finanzas');
  if(finBtn)finBtn.style.display=(cabId===CARLOS_FINANZAS_ID||(c&&c.nombre==='Carlos Rodríguez'))?'':'none';
  showPvTab('perfil');
}
function renderEvalPendienteBanner(cabId){
  const wrap=document.getElementById('pv-eval-pendiente-wrap');
  if(!wrap)return;
  const list=(DB.evaluaciones||[]).filter(e=>!!e.titulo&&e.activo!==false);
  const respuestas=DB.evaluacionRespuestas||[];
  const pendientes=list.filter(ev=>{
    const miResp=respuestas.find(r=>r.evaluacionId===ev.id&&r.cabId===cabId);
    return !miResp||!!(miResp&&miResp.puedeRepetir);
  });
  if(!pendientes.length){wrap.innerHTML='';wrap.style.display='none';return;}
  wrap.style.display='block';
  const n=pendientes.length;
  wrap.innerHTML=`<div onclick="showPvTab('estudio')" style="background:linear-gradient(135deg,#fef3c7 0%,#fde68a 50%,#fcd34d 100%);border-radius:14px;padding:14px 18px;border:2px solid #f59e0b;box-shadow:0 4px 20px rgba(245,158,11,0.25);cursor:pointer;display:flex;align-items:center;gap:14px;">
    <div style="width:44px;height:44px;border-radius:12px;background:rgba(245,158,11,0.3);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">📝</div>
    <div style="flex:1;min-width:0;">
      <div style="font-family:'Montserrat',sans-serif;font-size:14px;font-weight:900;color:#92400e;">Tienes cuestionarios de evaluación por completar</div>
      <div style="font-size:12px;color:#b45309;margin-top:2px;">${n} ${n===1?'cuestionario pendiente':'cuestionarios pendientes'} · Toca para ir</div>
    </div>
    <div style="font-size:20px;color:#d97706;flex-shrink:0;">→</div>
  </div>`;
}

// Versículo del día (RVR60) — orientado a hombres (fortaleza, integridad, paternidad)
const VERSOS_DIA_RVR60=[
  {ref:'Josué 1:9',refCode:'JOS.1.9',text:'Esfuérzate y sé valiente; no temas ni desmayes, porque Jehová tu Dios estará contigo dondequiera que vayas.'},
  {ref:'Proverbios 27:17',refCode:'PRO.27.17',text:'Hierro con hierro se aguza; y así el hombre aguza el rostro de su amigo.'},
  {ref:'1 Corintios 16:13',refCode:'1CO.16.13',text:'Velad, estad firmes en la fe; portaos varonilmente, y esforzaos.'},
  {ref:'Efesios 6:10',refCode:'EPH.6.10',text:'Por lo demás, hermanos míos, fortaleceos en el Señor y en el poder de su fuerza.'},
  {ref:'Salmo 1:1',refCode:'PSA.1.1',text:'Bienaventurado el varón que no anduvo en consejo de malos, ni estuvo en camino de pecadores, ni en silla de escarnecedores se ha sentado.'},
  {ref:'Proverbios 20:7',refCode:'PRO.20.7',text:'El justo anda en su integridad; sus hijos son dichosos después de él.'},
  {ref:'1 Timoteo 6:11',refCode:'1TI.6.11',text:'Mas tú, oh hombre de Dios, huye de estas cosas, y sigue la justicia, la piedad, la fe, el amor, la paciencia, la mansedumbre.'},
  {ref:'Nehemías 8:10',refCode:'NEH.8.10',text:'El gozo de Jehová es vuestra fuerza.'},
  {ref:'Proverbios 3:5-6',refCode:'PRO.3.5-6',text:'Fíate de Jehová de todo tu corazón, y no te apoyes en tu propia prudencia. Reconócelo en todos tus caminos, y él enderezará tus veredas.'},
  {ref:'Salmo 27:14',refCode:'PSA.27.14',text:'Aguarda a Jehová; esfuérzate, y aliéntese tu corazón; sí, espera a Jehová.'},
  {ref:'Miqueas 6:8',refCode:'MIC.6.8',text:'Oh hombre, él te ha declarado lo que es bueno, y qué pide Jehová de ti: solamente hacer justicia, y amar misericordia, y humillarte ante tu Dios.'},
  {ref:'Colosenses 3:23',refCode:'COL.3.23',text:'Y todo lo que hagáis, hacedlo de corazón, como para el Señor y no para los hombres.'},
  {ref:'Romanos 12:2',refCode:'ROM.12.2',text:'No os conforméis a este siglo, sino transformaos por medio de la renovación de vuestro entendimiento.'},
  {ref:'Gálatas 6:9',refCode:'GAL.6.9',text:'No nos cansemos, pues, de hacer bien; porque a su tiempo segaremos, si no desmayamos.'},
  {ref:'Salmo 37:5',refCode:'PSA.37.5',text:'Encomienda a Jehová tu camino, y confía en él; y él hará.'},
  {ref:'Isaías 40:31',refCode:'ISA.40.31',text:'Los que esperan a Jehová tendrán nuevas fuerzas; levantarán alas como águilas; correrán, y no se cansarán; caminarán, y no se fatigarán.'},
  {ref:'2 Timoteo 2:15',refCode:'2TI.2.15',text:'Procura con diligencia presentarte a Dios aprobado, como obrero que no tiene de qué avergonzarse, que usa bien la palabra de verdad.'},
  {ref:'Salmo 119:105',refCode:'PSA.119.105',text:'Lámpara es a mis pies tu palabra, y lumbrera a mi camino.'},
  {ref:'Mateo 5:16',refCode:'MAT.5.16',text:'Así alumbre vuestra luz delante de los hombres, para que vean vuestras buenas obras y glorifiquen a vuestro Padre que está en los cielos.'},
  {ref:'Josué 24:15',refCode:'JOS.24.15',text:'Yo y mi casa serviremos a Jehová.'},
  {ref:'Proverbios 22:1',refCode:'PRO.22.1',text:'De más estima es el buen nombre que las muchas riquezas.'},
  {ref:'1 Reyes 2:2',refCode:'1KI.2.2',text:'Esfuérzate y sé hombre.'},
  {ref:'1 Samuel 16:7',refCode:'1SA.16.7',text:'Jehová no mira lo que mira el hombre; pues el hombre mira lo que está delante de sus ojos, pero Jehová mira el corazón.'},
  {ref:'Salmo 18:32',refCode:'PSA.18.32',text:'Dios es el que me ciñe de poder, y quien hace perfecto mi camino.'},
  {ref:'Filipenses 4:13',refCode:'PHP.4.13',text:'Todo lo puedo en Cristo que me fortalece.'},
  {ref:'Deuteronomio 31:6',refCode:'DEU.31.6',text:'Esforzaos y cobrad ánimo; no temáis, ni tengáis miedo de ellos, porque Jehová tu Dios es el que va contigo; no te dejará, ni te desamparará.'},
  {ref:'Salmo 46:1',refCode:'PSA.46.1',text:'Dios es nuestro amparo y fortaleza, nuestro pronto auxilio en las tribulaciones.'},
  {ref:'Salmo 112:1-2',refCode:'PSA.112.1',text:'Bienaventurado el hombre que teme a Jehová y en sus mandamientos se deleita enormemente. Su descendencia será poderosa en la tierra.'},
  {ref:'Ezequiel 22:30',refCode:'EZK.22.30',text:'Busqué entre ellos hombre que hiciese vallado y que se pusiese en la brecha delante de mí, a favor de la tierra.'},
  {ref:'Proverbios 16:3',refCode:'PRO.16.3',text:'Encomienda a Jehová tus obras, y tus pensamientos serán afirmados.'},
  {ref:'Salmo 128:1',refCode:'PSA.128.1',text:'Bienaventurado todo aquel que teme a Jehová, que anda en sus caminos.'},
  {ref:'Hebreos 12:1-2',refCode:'HEB.12.1',text:'Corramos con paciencia la carrera que tenemos por delante, puestos los ojos en Jesús.'},
  {ref:'Santiago 1:12',refCode:'JAS.1.12',text:'Bienaventurado el varón que soporta la tentación; porque cuando sea probado, recibirá la corona de vida.'},
];
function getVersoDelDia(){
  const d=new Date();
  const dayOfYear=Math.floor((d-new Date(d.getFullYear(),0,0))/86400000);
  return VERSOS_DIA_RVR60[dayOfYear % VERSOS_DIA_RVR60.length];
}
function renderVersoDelDia(){
  const wrap=document.getElementById('pv-verso-dia-wrap');
  if(!wrap)return;
  const v=getVersoDelDia();
  window._versoDiaRefCode=v.refCode;
  wrap.innerHTML='<div style="background:linear-gradient(135deg,#1a1f2e 0%,#2d3748 50%,#1a365d 100%);border-radius:14px;padding:14px 18px;border:1px solid rgba(58,171,186,0.25);box-shadow:0 4px 16px rgba(0,0,0,0.15);position:relative;overflow:hidden;"><div style="position:absolute;right:0;top:0;width:80px;height:80px;background:radial-gradient(circle,rgba(58,171,186,0.12) 0%,transparent 70%);pointer-events:none;"></div><div style="position:relative;z-index:1;"><span style="font-family:\'Montserrat\',sans-serif;font-size:13px;font-weight:700;color:#fff;line-height:1.45;">'+v.text+'</span><span style="font-size:12px;font-weight:600;color:#3aabba;margin-left:8px;">'+v.ref+'</span></div></div>';
}
function openVersoEnBiblia(){
  if(typeof currentCabId!=='undefined'&&currentCabId){try{sessionStorage.setItem('caballeros_miembro',currentCabId);}catch(e){}}
  const ref=window._versoDiaRefCode||'GEN.1.1';
  const url='https://www.bible.com/bible/149/'+ref.replace(/-/g,'.');
  window.open(url,'_blank', 'noopener,noreferrer');
}

function showPvTab(tab){
  ['perfil','oracion','eventos','calgr','finanzas','estudio'].forEach(t=>{
    const el=document.getElementById('pvtab-'+t);
    const btn=document.getElementById('pvtab-'+t+'-btn');
    if(el)el.classList.toggle('active',t===tab);
    if(btn)btn.classList.toggle('active',t===tab);
  });
  const btnGrupos=document.getElementById('pv-btn-grupos');
  if(btnGrupos)btnGrupos.classList.toggle('pv-hdr-active',tab==='calgr');
  const btnPerfil=document.querySelector('.pv-hdr-btn-perfil');
  if(btnPerfil)btnPerfil.classList.toggle('pv-hdr-active',tab==='perfil');
  if(tab==='eventos')  renderEventosPV();
  if(tab==='calgr')    renderCalGr('pv-calgr-pg');
  if(tab==='oracion')  cargarPeticiones();
  if(tab==='finanzas') renderFinanzas();
  if(tab==='estudio') renderEstudioPV();
}

// Estudio (vista caballero): lista de estudios desde DB.clases; al tocar se abre el detalle (material + cuestionario + calificación).
function renderEstudioPV(){
  const el=document.getElementById('pv-estudio-lista');
  if(!el)return;
  const clases=(Array.isArray(DB.clases)?DB.clases:[]).slice().sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''));
  if(clases.length===0){el.innerHTML='<p style="color:var(--text3);font-size:13px">Aún no hay estudios (clases) registrados.</p>';return;}
  let html='';
  clases.forEach(cl=>{
    const claseId=cl.id||cl.fecha;
    const tema=(cl.tema||'Estudio').replace(/</g,'&lt;');
    const fechaLbl=typeof fmtDate==='function'?fmtDate(cl.fecha):cl.fecha;
    html+=`<div onclick="openEstudioDetallePV('${claseId}')" style="margin-bottom:12px;border-radius:14px;padding:14px 16px;display:flex;align-items:flex-start;gap:14px;position:relative;overflow:hidden;cursor:pointer;background:linear-gradient(145deg,#fff 0%,#f8fafc 100%);border:1.5px solid #e5e7eb;box-shadow:0 2px 10px rgba(0,0,0,0.04);">
      <div style="position:absolute;top:0;left:0;width:5px;height:100%;background:linear-gradient(180deg,#f5c518,#d4a800);border-radius:4px 0 0 4px;"></div>
      <div style="font-size:28px;flex-shrink:0;margin-left:4px;margin-top:2px;">📚</div>
      <div style="flex:1;min-width:0;">
        <div style="font-family:'Montserrat',sans-serif;font-size:10px;font-weight:700;color:#9ca3af;letter-spacing:2px;text-transform:uppercase;margin-bottom:3px;">Estudio</div>
        <div style="font-family:'Montserrat',sans-serif;font-size:13px;font-weight:700;color:#1a1f2e;line-height:1.3;">${tema}</div>
        <div style="font-size:11px;color:#4b5563;margin-top:3px;">📅 ${fechaLbl}</div>
        ${cl.grupoResp?`<div style="display:inline-flex;align-items:center;gap:5px;background:#ede9fe;color:#6d28d9;font-size:10px;font-weight:800;padding:3px 10px;border-radius:20px;margin-top:6px;letter-spacing:0.5px;">👥 ${(cl.grupoResp||'').replace(/</g,'&lt;')}</div>`:''}
      </div>
      <div style="font-size:18px;color:#9ca3af;flex-shrink:0;">→</div>
    </div>`;
  });
  el.innerHTML=html;
}
// Construye el HTML del detalle de un estudio (material + cuestionario sin título + calificación con colores por grupo). Usado por openEstudioDetallePV y por la vista Estudio.
function getEstudioDetalleHTML(claseId,cabId){
  const cl=(DB.clases||[]).find(c=>(c.id||c.fecha)===claseId);
  if(!cl)return'<p style="color:var(--text3);font-size:13px;">Estudio no encontrado.</p>';
  const evaluaciones=DB.evaluaciones||[];
  const respuestas=DB.evaluacionRespuestas||[];
  const ev=evaluaciones.find(e=>!!e.titulo&&e.activo!==false&&e.claseId===claseId);
  const m=ev&&ev.materialId?(DB.materialEstudio||[]).find(x=>x.id===ev.materialId):null;
  const cabObj=(DB.caballeros||[]).find(c=>c.id===cabId);
  const grupoCaballero=cabObj?(cabObj.grupo||'Sin grupo'):'Sin grupo';
  const gcol=g=>{if(typeof GCOL==='undefined')return 'var(--teal)';const key=Object.keys(GCOL||{}).find(k=>String(k).toUpperCase()===(String(g||'')).toUpperCase());return key?GCOL[key]:'var(--teal)';};
  let html='';
  if(m&&getMaterialUrl(m)){
    html+=`<div onclick="openMaterialViewer('${m.id}');" style="background:linear-gradient(145deg,#f0f9ff 0%,#e0f2fe 50%,#bae6fd 100%);border:1.5px solid rgba(14,165,233,0.35);border-radius:14px;padding:18px 20px;cursor:pointer;box-shadow:0 4px 16px rgba(14,165,233,0.12);margin-bottom:12px;">
      <div style="font-size:10px;font-weight:800;color:#0369a1;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">Material de estudio</div>
      <div style="font-weight:800;color:var(--dark);font-size:15px;">${(m.titulo||'Sin título').replace(/</g,'&lt;')}</div>
      <div style="font-size:12px;color:#0c4a6e;margin-top:6px;opacity:0.9;">Toca para abrir la página</div>
    </div>`;
  }
  if(ev){
    const miResp=respuestas.find(r=>r.evaluacionId===ev.id&&r.cabId===cabId);
    const yaRespondido=!!miResp;
    const media10=yaRespondido&&miResp&&(miResp.totalPreguntas||0)>0?+(miResp.puntuacion/miResp.totalPreguntas*10).toFixed(2):null;
    const puedeRepetir=!!(miResp&&miResp.puedeRepetir);
    const puedeComenzar=!yaRespondido||puedeRepetir;
    const col=yaRespondido?'#fefce8':'#fef9c3';
    const borde=yaRespondido?'rgba(212,168,0,0.5)':'rgba(245,197,24,0.5)';
    const icono=yaRespondido?'✅':'📝';
    const subtituloEval=yaRespondido?('Cuestionario completado'+(media10!=null?' · '+media10+'/10':'')):'Cuestionario de evaluación';
    html+=`<div onclick="${puedeComenzar?'iniciarCuestionarioPV(\''+ev.id+'\')':yaRespondido?'verResultadoEvaluacionPV(\''+ev.id+'\')':''}" style="margin-bottom:12px;background:linear-gradient(145deg,${col} 0%,${yaRespondido?'#fef08a':'#fef3c7'} 100%);border:1.5px solid ${borde};border-radius:16px;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;cursor:pointer;box-shadow:0 4px 20px rgba(245,197,24,0.15);">
      <div style="display:flex;align-items:center;gap:14px;flex:1;min-width:0;">
        <div style="width:40px;height:40px;border-radius:12px;background:rgba(245,197,24,0.2);display:flex;align-items:center;justify-content:center;font-size:20px;">${icono}</div>
        <div><div style="font-size:11px;color:#4b5563;">${subtituloEval}</div></div>
      </div>
      <div style="display:flex;gap:8px;">${yaRespondido?`<button type="button" class="btn boutline" style="font-size:11px;padding:6px 12px;" onclick="event.stopPropagation();verResultadoEvaluacionPV('${ev.id}')">Ver resultado</button>`:''}${puedeComenzar?`<button type="button" class="btn bteal" style="font-size:11px;padding:6px 14px;" onclick="event.stopPropagation();iniciarCuestionarioPV('${ev.id}')">${yaRespondido?'Repetir':'Comenzar'}</button>`:''}</div>
    </div>`;
  }
  if(cl.cal&&Object.keys(cl.cal).length){
    const caballerosConCal=DB.caballeros.filter(c=>cl.cal[c.id]&&cl.cal[c.id].a);
    const grupos={};
    caballerosConCal.forEach(c=>{
      const g=c.grupo||'Sin grupo';
      if(!grupos[g])grupos[g]={s:0,n:0};
      const q=cl.cal[c.id];
      const t=typeof classScoreForCab==='function'?classScoreForCab(cl,c.id):(typeof rowTotal==='function'?rowTotal(q):0);
      grupos[g].s+=t;grupos[g].n++;
    });
    const miCal=typeof classScoreForCab==='function'?classScoreForCab(cl,cabId):null;
    const miCalTxt=miCal!=null?(typeof fmtScore==='function'?fmtScore(miCal):miCal):'—';
    html+=`<div style="margin-top:4px;padding:0;"><div style="font-size:11px;font-weight:800;color:var(--teal2);letter-spacing:0.5px;margin-bottom:8px;">📊 Calificación de este estudio</div>
      <div style="font-size:12px;font-weight:700;color:var(--dark);margin-bottom:10px;padding:8px 12px;background:white;border-radius:8px;border:1px solid #e2e8f0;">Tu calificación: <span style="color:var(--teal2);">${miCalTxt}</span></div>
      <div style="font-family:Montserrat,sans-serif;font-size:12px;font-weight:800;color:#1a1f2e;margin-bottom:8px;">Comparación por grupo</div>
      <div style="display:flex;flex-direction:column;gap:10px;">`;
    const gNames=Object.keys(grupos).sort();
    const maxAvg=Math.max(...gNames.map(g=>grupos[g].n?grupos[g].s/grupos[g].n:0),0.01);
    gNames.forEach(g=>{
      const avg=grupos[g].n?+(grupos[g].s/grupos[g].n).toFixed(1):'—';
      const avgNum=grupos[g].n?grupos[g].s/grupos[g].n:0;
      const pct=maxAvg>0?Math.min(100,(avgNum/10)*100):0;
      const esMiGrupo=(g||'Sin grupo')===grupoCaballero;
      const colorGrupo=gcol(g||'Sin grupo');
      html+=`<div style="border-radius:10px;overflow:hidden;border:2px solid ${esMiGrupo?colorGrupo:'#e2e8f0'};background:${esMiGrupo?colorGrupo+'18':'#f8fafc'};padding:10px 12px;">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;font-weight:600;"><span style="color:${colorGrupo};">${(g||'Sin grupo').replace(/</g,'&lt;')}${esMiGrupo?' <span style="font-size:10px;opacity:0.9;">(tu grupo)</span>':''}</span><span style="color:var(--teal2);">${avg}/10</span></div>
        <div style="height:10px;background:rgba(0,0,0,0.06);border-radius:999px;overflow:hidden;"><div style="width:${pct}%;height:100%;background:${colorGrupo};border-radius:999px;transition:width .6s ease;"></div></div>
      </div>`;
    });
    html+=`</div></div>`;
  }
  return html||'<p style="color:var(--text3);font-size:13px;">Sin material ni evaluación para este estudio.</p>';
}
function openEstudioDetallePV(claseId){
  const cl=(DB.clases||[]).find(c=>(c.id||c.fecha)===claseId);
  if(!cl){toast('Estudio no encontrado.','err');return;}
  const titulo=(cl.tema||'Estudio').replace(/</g,'&lt;');
  const subt=(typeof fmtDate==='function'?fmtDate(cl.fecha):cl.fecha)+' · '+(cl.grupoResp?'Expone: '+cl.grupoResp:'');
  const body=getEstudioDetalleHTML(claseId,typeof currentCabId!=='undefined'?currentCabId:'');
  if(typeof openSheet==='function')openSheet('📚',titulo,subt,body);
}
function getMaterialUrl(m){
  if(m.url)return m.url.startsWith('http')?m.url:'https://'+m.url;
  if(m.contenido){
    const match=String(m.contenido).match(/src\s*=\s*["']([^"']+)["']/i);
    if(match)return match[1].trim().startsWith('http')?match[1].trim():'https://'+match[1].trim();
  }
  return '';
}
function openMaterialViewer(id){
  const m=(DB.materialEstudio||[]).find(x=>x.id===id);
  if(!m)return;
  const url=getMaterialUrl(m);
  if(!url){toast('Este material no tiene URL.','err');return;}
  const wrap=document.getElementById('material-viewer-wrap');
  const ttl=document.getElementById('material-viewer-ttl');
  const iframe=document.getElementById('material-viewer-iframe');
  if(!wrap||!ttl||!iframe)return;
  ttl.textContent=m.titulo||'Material';
  iframe.src=url;
  wrap.style.display='flex';
  function onEsc(e){if(e.key==='Escape'){closeMaterialViewer();document.removeEventListener('keydown',onEsc);}}
  document.addEventListener('keydown',onEsc);
}
function closeMaterialViewer(){
  const wrap=document.getElementById('material-viewer-wrap');
  const iframe=document.getElementById('material-viewer-iframe');
  if(wrap)wrap.style.display='none';
  if(iframe)iframe.src='about:blank';
}

// ═══════════════════════════════════════════════════════════════
// CAMBIAR CONTRASEÑA
// ═══════════════════════════════════════════════════════════════
function openChangePw(){
  const nombre=DB.adminNombre||'';
  const tieneFoto=!!DB.adminPhoto;
  openSheet('🔑','Contraseña y perfil admin','Editar nombre, foto y contraseña',`
    <div style="margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid #e5e7eb;">
      <div class="fr" style="margin-bottom:10px;"><label>Nombre del administrador</label><input type="text" id="pw-admin-nombre" placeholder="Nombre" value="${nombre.replace(/"/g,'&quot;')}"></div>
      <div style="margin-bottom:8px;"><label style="font-size:12px;color:#6b7280;">Foto</label></div>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
        <div id="pw-admin-photo-preview" style="width:48px;height:48px;border-radius:50%;overflow:hidden;background:#e5e7eb;flex-shrink:0;">${tieneFoto?`<img src="${DB.adminPhoto}" style="width:100%;height:100%;object-fit:cover;">`:'<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:20px;">👤</div>'}</div>
        <input type="file" id="pw-admin-photo-inp" accept="image/*" style="font-size:11px;">
      </div>
      <button class="btn bteal" style="font-size:11px;padding:6px 12px;" onclick="saveAdminPerfilFromSheet()">💾 Guardar nombre y foto</button>
    </div>
    <div class="fr"><label>Contraseña actual</label><input type="password" id="pw-curr" placeholder="••••••••"></div>
    <div class="fr"><label>Nueva contraseña</label><input type="password" id="pw-new" placeholder="Mínimo 4 caracteres"></div>
    <div class="fr"><label>Confirmar nueva contraseña</label><input type="password" id="pw-conf" placeholder="Repetir nueva contraseña"></div>
    <div class="login-err" id="pw-err" style="display:none;margin-bottom:10px"></div>
    <button class="btn bteal bfull" onclick="doChangePw()">🔒 Cambiar Contraseña</button>
  `);
  document.getElementById('pw-admin-photo-inp').onchange=async function(e){
    const f=e.target.files[0];if(!f)return;
    const data=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(f);});
    const prev=document.getElementById('pw-admin-photo-preview');if(prev)prev.innerHTML='<img src="'+data+'" style="width:100%;height:100%;object-fit:cover;">';window._pwAdminPhotoPending=data;
  };
}
async function saveAdminPerfilFromSheet(){
  const nombreInp=document.getElementById('pw-admin-nombre');if(nombreInp)DB.adminNombre=nombreInp.value.trim();
  if(window._pwAdminPhotoPending){DB.adminPhoto=window._pwAdminPhotoPending;window._pwAdminPhotoPending=null;}
  await saveDB();toast('✅ Nombre y foto guardados','ok');
}
async function doChangePw(){
  const curr=document.getElementById('pw-curr').value;
  const nw=document.getElementById('pw-new').value;
  const conf=document.getElementById('pw-conf').value;
  const err=document.getElementById('pw-err');err.style.display='none';
  if(curr!==DB.adminPw){err.textContent='Contraseña actual incorrecta.';err.style.display='block';return;}
  if(nw.length<4){err.textContent='Mínimo 4 caracteres.';err.style.display='block';return;}
  if(nw!==conf){err.textContent='Las contraseñas no coinciden.';err.style.display='block';return;}
  DB.adminPw=nw;closeModal();toast('💾 Guardando...','info');await saveDB();toast('✅ Contraseña actualizada','ok');
}

// ═══════════════════════════════════════════════════════════════
// AUTOCALIFICACIÓN DEVOTO — Banner original sin marcar; al marcar: confirmación y desaparece
// Quitar devoto: en perfil (👤)
// ═══════════════════════════════════════════════════════════════
function renderDevotoCard(c){
  const el=document.getElementById('pv-devoto-card');
  if(!el)return;
  if(!!c.devoto){
    el.innerHTML='';el.style.display='none';
    return;
  }
  el.style.display='block';
  el.innerHTML=`
  <div style="background:white;border:1.5px solid #e9edf2;border-radius:14px;padding:14px 16px;box-shadow:0 2px 10px rgba(0,0,0,0.05);">
    <div style="display:flex;align-items:flex-start;gap:12px;">
      <div style="font-size:26px;flex-shrink:0;margin-top:2px;color:#f5c518;">★</div>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
          <div>
            <div style="font-family:'Montserrat',sans-serif;font-size:13px;font-weight:800;color:#1a1f2e;">¿Eres Devoto?</div>
            <div style="font-size:11px;color:#9ca3af;margin-top:2px;">Aún no has marcado esta distinción</div>
          </div>
          <button onclick="confirmarMarcarDevoto()" style="background:linear-gradient(135deg,#059669,#047857);border:none;color:white;border-radius:10px;padding:9px 16px;font-family:'Montserrat',sans-serif;font-size:11px;font-weight:800;cursor:pointer;white-space:nowrap;box-shadow:0 3px 10px rgba(5,150,105,0.3);letter-spacing:0.5px;flex-shrink:0;">Marcarme como Devoto</button>
        </div>
        <div style="margin-top:10px;background:rgba(156,163,175,0.07);border-radius:8px;padding:8px 10px;">
          <div style="font-size:10px;color:#6b7280;line-height:1.6;"><span style="font-weight:700;letter-spacing:0.5px;">¿Qué es un Devoto?</span> Es aquel que ha nacido de nuevo y tiene una vida espiritual, dando frutos visibles y buen testimonio en su vida pública, en su hogar, su trabajo y la Iglesia.</div>
        </div>
      </div>
    </div>
  </div>`;
}
function confirmarMarcarDevoto(){
  openSheet('★','Confirmar distinción Devoto','',`
    <p style="font-size:14px;color:var(--text);margin-bottom:12px;line-height:1.6;">Un Devoto es aquel que ha nacido de nuevo y tiene una vida espiritual, dando frutos visibles y buen testimonio en su vida pública, en su hogar, su trabajo y la Iglesia.</p>
    <p style="font-size:13px;color:var(--text2);margin-bottom:14px;">¿Deseas marcarte como Devoto? Añadirá una estrella a tus distinciones.</p>
    <div class="btn-row">
      <button class="btn boutline" onclick="closeModal()">Cancelar</button>
      <button class="btn bteal" onclick="closeModal();doMarcarDevoto();">Sí, soy Devoto</button>
    </div>
  `);
}
async function doMarcarDevoto(){
  const c=DB.caballeros.find(x=>x.id===currentCabId);if(!c)return;
  c.devoto=1;
  document.getElementById('pv-bdg').innerHTML=mkBadges(c);
  const val=autoVal(c);
  document.getElementById('pv-stars').innerHTML=Array(7).fill(0).map((_,i)=>`<span class="star ${i<val?'lit':''}">★</span>`).join('');
  renderDevotoCard(c);
  toast('💾 Guardando...','info');
  try{
    await saveDB();
    toast('🌿 ¡Distinción Devoto añadida a tu perfil!','ok');
  }catch(e){
    c.devoto=0;
    renderDevotoCard(c);
    toast('⚠️ Error al guardar. Intenta de nuevo.','err');
  }
}

function renderFbautCard(c){
  const el=document.getElementById('pv-fbaut-card');
  if(!el)return;
  const tieneFecha=c.fechaBautizado&&c.fechaBautizado.length>=10;
  if(!c.bautizado||(tieneFecha&&!window._pvFbautEditMode)){el.innerHTML='';el.style.display='none';return;}
  el.style.display='block';
  el.innerHTML=`<div style="background:linear-gradient(135deg,#dbeafe 0%,#eff6ff 100%);border:1.5px solid #93c5fd;border-radius:14px;padding:14px 16px;box-shadow:0 2px 10px rgba(0,0,0,0.05);">
    <div style="display:flex;align-items:center;gap:12px;">
      <div style="font-size:22px;flex-shrink:0;">💧</div>
      <div style="flex:1;min-width:0;">
        <div style="font-family:'Montserrat',sans-serif;font-size:13px;font-weight:800;color:#1e40af;">Fecha de bautizado</div>
        <div style="font-size:11px;color:#6b7280;margin-top:2px;">${tieneFecha?'Edita o restablece tu fecha':'Añade tu fecha para ver tu aniversario en Cumpleaños'}</div>
        <div style="margin-top:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <input type="date" id="pv-fbaut-inp" value="${c.fechaBautizado||''}" style="flex:1;min-width:120px;padding:8px 12px;border:1.5px solid #bfdbfe;border-radius:10px;font-size:13px;">
          <button onclick="guardarFbaut()" style="background:#2563eb;border:none;color:white;border-radius:10px;padding:8px 14px;font-size:12px;font-weight:700;cursor:pointer;">Guardar</button>
          ${tieneFecha?'<button onclick="window._pvFbautEditMode=false;restablecerFbaut()" style="background:transparent;border:1px solid #93c5fd;color:#1e40af;border-radius:10px;padding:8px 14px;font-size:12px;font-weight:700;cursor:pointer;">Restablecer</button><button onclick="window._pvFbautEditMode=false;renderFbautCard(DB.caballeros.find(x=>x.id===currentCabId))" style="background:transparent;border:1px solid #d1d5db;color:#6b7280;border-radius:10px;padding:8px 14px;font-size:12px;cursor:pointer;">Cancelar</button>':''}
        </div>
      </div>
    </div>
  </div>`;
}
function renderFsellCard(c){
  const el=document.getElementById('pv-fsell-card');
  if(!el)return;
  const tieneFecha=c.fechaSellado&&c.fechaSellado.length>=10;
  if(!c.sellado||(tieneFecha&&!window._pvFsellEditMode)){el.innerHTML='';el.style.display='none';return;}
  el.style.display='block';
  el.innerHTML=`<div style="background:linear-gradient(135deg,#ede9fe 0%,#f5f3ff 100%);border:1.5px solid #c4b5fd;border-radius:14px;padding:14px 16px;box-shadow:0 2px 10px rgba(0,0,0,0.05);">
    <div style="display:flex;align-items:center;gap:12px;">
      <div style="font-size:22px;flex-shrink:0;">🕊️</div>
      <div style="flex:1;min-width:0;">
        <div style="font-family:'Montserrat',sans-serif;font-size:13px;font-weight:800;color:#5b21b6;">Fecha de sellado</div>
        <div style="font-size:11px;color:#6b7280;margin-top:2px;">${tieneFecha?'Edita o restablece tu fecha':'Añade tu fecha para ver tu aniversario en Cumpleaños'}</div>
        <div style="margin-top:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <input type="date" id="pv-fsell-inp" value="${c.fechaSellado||''}" style="flex:1;min-width:120px;padding:8px 12px;border:1.5px solid #ddd6fe;border-radius:10px;font-size:13px;">
          <button onclick="guardarFsell()" style="background:#6d28d9;border:none;color:white;border-radius:10px;padding:8px 14px;font-size:12px;font-weight:700;cursor:pointer;">Guardar</button>
          ${tieneFecha?'<button onclick="window._pvFsellEditMode=false;restablecerFsell()" style="background:transparent;border:1px solid #c4b5fd;color:#5b21b6;border-radius:10px;padding:8px 14px;font-size:12px;font-weight:700;cursor:pointer;">Restablecer</button><button onclick="window._pvFsellEditMode=false;renderFsellCard(DB.caballeros.find(x=>x.id===currentCabId))" style="background:transparent;border:1px solid #d1d5db;color:#6b7280;border-radius:10px;padding:8px 14px;font-size:12px;cursor:pointer;">Cancelar</button>':''}
        </div>
      </div>
    </div>
  </div>`;
}
async function guardarFbaut(){
  const c=DB.caballeros.find(x=>x.id===currentCabId);
  if(!c){toast('Error: no se encontró el caballero','err');return;}
  const inp=document.getElementById('pv-fbaut-inp');
  if(!inp)return;
  c.fechaBautizado=(inp.value||'').trim();
  window._pvFbautEditMode=false;
  toast('💾 Guardando...','info');
  const ok=await saveDB();
  if(!ok){toast('Error al guardar. Comprueba conexión.','err');return;}
  renderFbautCard(c);
  renderCumplePV();
  toast('💧 Fecha de bautizado guardada','ok');
}
async function guardarFsell(){
  const c=DB.caballeros.find(x=>x.id===currentCabId);
  if(!c){toast('Error: no se encontró el caballero','err');return;}
  const inp=document.getElementById('pv-fsell-inp');
  if(!inp)return;
  c.fechaSellado=(inp.value||'').trim();
  window._pvFsellEditMode=false;
  toast('💾 Guardando...','info');
  const ok=await saveDB();
  if(!ok){toast('Error al guardar. Comprueba conexión.','err');return;}
  renderFsellCard(c);
  renderCumplePV();
  toast('🕊️ Fecha de sellado guardada','ok');
}
function renderFnacCard(c){
  const el=document.getElementById('pv-fnac-card');
  if(!el)return;
  const tiene=c.fnac&&c.fnac.length>=10;
  const editando=!!window._pvFnacEditMode;
  if(tiene&&!editando){
    el.innerHTML='';
    el.style.display='none';
    return;
  }
  el.style.display='block';
  const M=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  el.innerHTML=`
  <div style="background:white;border:1.5px solid #e9edf2;border-radius:14px;padding:14px 16px;box-shadow:0 2px 10px rgba(0,0,0,0.05);">
    <div style="display:flex;align-items:center;gap:12px;">
      <div style="font-size:22px;flex-shrink:0;">🎂</div>
      <div style="flex:1;min-width:0;">
        <div style="font-family:'Montserrat',sans-serif;font-size:13px;font-weight:800;color:#1a1f2e;">Fecha de nacimiento</div>
        <div style="font-size:11px;color:#9ca3af;margin-top:2px;">${tiene?'Edita tu fecha':'Añade tu fecha para aparecer en cumpleaños'}</div>
        <div style="margin-top:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <input type="date" id="pv-fnac-inp" value="${c.fnac||''}" style="flex:1;min-width:120px;padding:8px 12px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:13px;">
          <button onclick="guardarFnac()" style="background:var(--teal);border:none;color:white;border-radius:10px;padding:8px 14px;font-size:12px;font-weight:700;cursor:pointer;">Guardar</button>
          ${tiene?'<button onclick="window._pvFnacEditMode=false;renderFnacCard(DB.caballeros.find(x=>x.id===currentCabId))" style="background:transparent;border:1px solid #d1d5db;color:#6b7280;border-radius:10px;padding:8px 14px;font-size:12px;cursor:pointer;">Cancelar</button>':''}
        </div>
      </div>
    </div>
  </div>`;
}
function renderTelefonoCard(c){
  const el=document.getElementById('pv-telefono-card');
  if(!el)return;
  if(c.telefono&&String(c.telefono).trim()){el.style.display='none';el.innerHTML='';return;}
  el.style.display='block';
  el.innerHTML=`<div style="background:linear-gradient(135deg,#f0f9ff 0%,#e0f2fe 100%);border:1.5px solid rgba(14,165,233,0.3);border-radius:14px;padding:14px 16px;">
    <div style="font-family:'Montserrat',sans-serif;font-size:13px;font-weight:800;color:#0c4a6e;margin-bottom:6px;">📱 Tu número de teléfono</div>
    <div style="font-size:11px;color:#64748b;margin-bottom:10px;">Lo verán los hermanos en la ficha del caballero. Luego podrás editarlo en tu panel de perfil (👤).</div>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
      <input type="tel" id="pv-telefono-inp" placeholder="Ej. 600 000 000" value="" style="flex:1;min-width:160px;padding:10px 12px;border:1.5px solid #bae6fd;border-radius:10px;font-size:13px;">
      <button onclick="guardarTelefonoPV()" style="background:#0ea5e9;border:none;color:white;border-radius:10px;padding:10px 16px;font-size:12px;font-weight:700;cursor:pointer;">Guardar</button>
    </div>
  </div>`;
}
async function guardarTelefonoPV(){
  const c=DB.caballeros.find(x=>x.id===currentCabId);
  if(!c){toast('Error: no se encontró el caballero','err');return;}
  const v=(document.getElementById('pv-telefono-inp')?.value||'').trim();
  if(!v){toast('Escribe tu número de teléfono','err');return;}
  c.telefono=v;
  toast('💾 Guardando...','info');
  const ok=await saveDB();
  if(!ok){toast('Error al guardar','err');return;}
  renderTelefonoCard(c);
  toast('✅ Teléfono guardado','ok');
}
function openFnacEditFromCumple(){
  const c=DB.caballeros.find(x=>x.id===currentCabId);
  if(!c)return;
  const el=document.getElementById('pv-fnac-card');
  if(el){el.style.display='block';}
  window._pvFnacEditMode=true;
  renderFnacCard(c);
  showPvTab('perfil');
}
function openFbautEditFromCumple(){
  const c=DB.caballeros.find(x=>x.id===currentCabId);
  if(!c)return;
  window._pvFbautEditMode=true;
  renderFbautCard(c);
  showPvTab('perfil');
}
function openFsellEditFromCumple(){
  const c=DB.caballeros.find(x=>x.id===currentCabId);
  if(!c)return;
  window._pvFsellEditMode=true;
  renderFsellCard(c);
  showPvTab('perfil');
}
async function restablecerFbaut(){
  const c=DB.caballeros.find(x=>x.id===currentCabId);
  if(!c)return;
  c.fechaBautizado='';
  toast('💾 Guardando...','info');
  const ok=await saveDB();
  if(!ok){toast('Error al guardar','err');return;}
  renderFbautCard(c);
  renderCumplePV();
  toast('💧 Fecha de bautizado restablecida','ok');
}
async function restablecerFsell(){
  const c=DB.caballeros.find(x=>x.id===currentCabId);
  if(!c)return;
  c.fechaSellado='';
  toast('💾 Guardando...','info');
  const ok=await saveDB();
  if(!ok){toast('Error al guardar','err');return;}
  renderFsellCard(c);
  renderCumplePV();
  toast('🕊️ Fecha de sellado restablecida','ok');
}
async function guardarFnac(){
  const c=DB.caballeros.find(x=>x.id===currentCabId);
  if(!c){toast('Error: no se encontró el caballero','err');return;}
  const inp=document.getElementById('pv-fnac-inp');
  if(!inp){toast('Error al guardar','err');return;}
  const v=(inp.value||'').trim();
  c.fnac=v||'';
  toast('💾 Guardando...','info');
  const ok=await saveDB();
  if(!ok){toast('Error al guardar. Comprueba conexión.','err');return;}
  window._pvFnacEditMode=false;
  renderFnacCard(c);
  renderCumplePV();
  toast(v?'🎂 Fecha guardada':'Fecha eliminada','ok');
}

async function quitarDevotoDesdePerfil(){
  const c=DB.caballeros.find(x=>x.id===currentCabId);
  if(!c||!c.devoto)return;
  closeModal();
  c.devoto=0;
  document.getElementById('pv-bdg').innerHTML=mkBadges(c);
  const val=autoVal(c);
  document.getElementById('pv-stars').innerHTML=Array(7).fill(0).map((_,i)=>`<span class="star ${i<val?'lit':''}">★</span>`).join('');
  renderDevotoCard(c);
  toast('💾 Guardando...','info');
  try{
    await saveDB();
    toast('Distinción Devoto removida','ok');
  }catch(e){
    c.devoto=1;
    renderDevotoCard(c);
    toast('⚠️ Error al guardar. Intenta de nuevo.','err');
  }
}

// ═══════════════════════════════════════════════════════════════
// TOP 5 CABALLEROS GENERAL — Inicio
// ═══════════════════════════════════════════════════════════════
function renderTop5Caballeros(){
  const el=document.getElementById('pv-grupo-section');
  if(!el)return;
  el.style.display='';
  const prev=el.previousElementSibling;
  if(prev&&prev.classList.contains('vine-div'))prev.style.display='';
  const list=typeof ranking==='function'?ranking():[];
  const top5=list.slice(0,5);
  if(!top5.length){el.innerHTML='';return;}
  el.innerHTML=`<div style="background:white;border:1.5px solid #e9edf2;border-radius:14px;padding:14px;box-shadow:0 2px 10px rgba(0,0,0,0.05);">
    <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--teal2);font-weight:700;margin-bottom:10px;padding-bottom:6px;border-bottom:1.5px solid var(--border);">Top 5 Caballeros</div>
    ${top5.map((m,i)=>{
      const cal=typeof calcCab==='function'?calcCab(m.id):{total:0};
      const esYo=m.id===currentCabId;
      const gCol=GCOL[m.grupo]||'var(--teal)';
      return`<div onclick="openCabDetail('${m.id}')" style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid ${i===top5.length-1?'transparent':'#f3f4f6'};cursor:pointer;">
        <div style="width:24px;text-align:center;font-family:'Montserrat',sans-serif;font-size:11px;font-weight:800;color:${i===0?'#d4a800':i===1?'#9ca3af':i===2?'#c2783b':'var(--text3)'};">${i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`}</div>
        <div style="width:32px;height:32px;border-radius:50%;background:${esYo?gCol+'33':'#f3f4f6'};border:2px solid ${esYo?gCol:'#e9edf2'};display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;">
          ${m.photo?`<img src="${m.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:`<span style="font-family:Montserrat;font-size:9px;font-weight:900;color:${esYo?gCol:'var(--text3)'};">${ini(m.nombre)}</span>`}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:12px;font-weight:${esYo?'800':'600'};color:${esYo?gCol:'var(--dark)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.nombre}${esYo?' <span style="font-size:9px;background:'+gCol+'22;color:'+gCol+';padding:1px 6px;border-radius:10px;font-weight:700;">Tú</span>':''}</div>
          <div style="font-size:10px;color:var(--text3);margin-top:1px;">${m.grupo||''} · Asist: ${cal.asist||0}/${cal.totalClases||0}</div>
        </div>
        <div style="font-family:'Montserrat',sans-serif;font-size:15px;font-weight:900;color:${esYo?gCol:'var(--teal)'};">${(cal.total||0).toFixed(1)}</div>
      </div>`;
    }).join('')}
  </div>`;
}

// ═══════════════════════════════════════════════════════════════
// SECCIÓN GRUPO — Vista Personal (usado en pestaña Grupos)
// ═══════════════════════════════════════════════════════════════
function renderGrupoSection(c){
  const el=document.getElementById('pv-grupo-section');
  if(!el)return;
  const GRUPOS_ACTIVOS=GRUPOS;
  const miGrupo=c.grupo;

  // Calcular stats por grupo (solo grupos activos)
  const grupoStats={};
  GRUPOS_ACTIVOS.forEach(g=>{
    const miembros=DB.caballeros.filter(x=>x.grupo===g);
    const totalPts=miembros.reduce((s,x)=>s+calcCab(x.id).total,0);
    const avgPts=miembros.length?+(totalPts/miembros.length).toFixed(1):0;
    // Asistencia total / clases posibles
    const asistTot=miembros.reduce((s,x)=>s+calcCab(x.id).asist,0);
    const posTot=miembros.length*DB.clases.length;
    const pctAsist=posTot?Math.round((asistTot/posTot)*100):0;
    grupoStats[g]={miembros,totalPts:+totalPts.toFixed(1),avgPts,asistTot,pctAsist};
  });

  // Ordenar grupos por avgPts para ranking
  const ranking=[...GRUPOS_ACTIVOS].sort((a,b)=>grupoStats[b].avgPts-grupoStats[a].avgPts);
  const maxAvg=grupoStats[ranking[0]]?.avgPts||1;

  // Mi grupo — miembros ordenados por puntuación
  const misMiembros=[...grupoStats[miGrupo]?.miembros||[]].sort((a,b)=>calcCab(b.id).total-calcCab(a.id).total);
  const col=GCOL[miGrupo]||'var(--teal)';

  // Clases con calificaciones del grupo
  const clasesGrupo=DB.clases
    .filter(cl=>misMiembros.some(m=>cl.cal[m.id]&&cl.cal[m.id].a))
    .sort((a,b)=>b.fecha.localeCompare(a.fecha));

  const miRank=ranking.indexOf(miGrupo)+1;
  const medal=miRank===1?'🥇':miRank===2?'🥈':miRank===3?'🥉':'';

  // ── HTML ──
  let h=`
  <!-- ENCABEZADO MI GRUPO -->
  <div style="background:linear-gradient(135deg,var(--dark) 0%,var(--dark2) 60%,${col}33 100%);border-radius:14px;padding:14px 18px;margin-bottom:12px;border:1px solid ${col}44;box-shadow:0 4px 20px rgba(0,0,0,0.15);position:relative;overflow:hidden;">
    <div style="position:absolute;right:-20px;top:-20px;width:110px;height:110px;background:radial-gradient(circle,${col}22 0%,transparent 70%);pointer-events:none;"></div>
    <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.4);letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">Mi Grupo</div>
    <div style="font-family:'Montserrat',sans-serif;font-size:17px;font-weight:900;color:${col};letter-spacing:1px;">${medal} ${miGrupo}</div>
    <div style="display:flex;gap:16px;margin-top:10px;">
      <div style="text-align:center;">
        <div style="font-family:'Montserrat',sans-serif;font-size:22px;font-weight:900;color:white;">${grupoStats[miGrupo]?.avgPts??'—'}</div>
        <div style="font-size:9px;color:rgba(255,255,255,0.4);letter-spacing:1.5px;text-transform:uppercase;margin-top:2px;">Prom. pts</div>
      </div>
      <div style="text-align:center;">
        <div style="font-family:'Montserrat',sans-serif;font-size:22px;font-weight:900;color:white;">${grupoStats[miGrupo]?.pctAsist??0}%</div>
        <div style="font-size:9px;color:rgba(255,255,255,0.4);letter-spacing:1.5px;text-transform:uppercase;margin-top:2px;">Asistencia</div>
      </div>
      <div style="text-align:center;">
        <div style="font-family:'Montserrat',sans-serif;font-size:22px;font-weight:900;color:white;">#${miRank}</div>
        <div style="font-size:9px;color:rgba(255,255,255,0.4);letter-spacing:1.5px;text-transform:uppercase;margin-top:2px;">Ranking</div>
      </div>
      <div style="text-align:center;">
        <div style="font-family:'Montserrat',sans-serif;font-size:22px;font-weight:900;color:white;">${misMiembros.length}</div>
        <div style="font-size:9px;color:rgba(255,255,255,0.4);letter-spacing:1.5px;text-transform:uppercase;margin-top:2px;">Caballeros</div>
      </div>
    </div>
  </div>

  <!-- MIEMBROS DEL GRUPO -->
  <div style="background:white;border:1.5px solid #e9edf2;border-radius:14px;padding:14px;margin-bottom:12px;box-shadow:0 2px 10px rgba(0,0,0,0.05);">
    <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${col};font-weight:700;margin-bottom:10px;padding-bottom:6px;border-bottom:1.5px solid ${col}33;">Caballeros del Grupo</div>
    ${misMiembros.map((m,i)=>{
      const cal=calcCab(m.id);
      const esYo=m.id===c.id;
      return`<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid ${i===misMiembros.length-1?'transparent':'#f3f4f6'};">
        <div style="width:24px;text-align:center;font-family:'Montserrat',sans-serif;font-size:11px;font-weight:800;color:${i===0?'#d4a800':i===1?'#9ca3af':i===2?'#c2783b':'var(--text3)'};">${i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`}</div>
        <div style="width:32px;height:32px;border-radius:50%;background:${esYo?col+'33':'#f3f4f6'};border:2px solid ${esYo?col:'#e9edf2'};display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;">
          ${m.photo?`<img src="${m.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:`<span style="font-family:Montserrat;font-size:9px;font-weight:900;color:${esYo?col:'var(--text3)'};">${ini(m.nombre)}</span>`}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:12px;font-weight:${esYo?'800':'600'};color:${esYo?col:'var(--dark)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.nombre}${esYo?' <span style="font-size:9px;background:'+col+'22;color:'+col+';padding:1px 6px;border-radius:10px;font-weight:700;">Tú</span>':''}</div>
          <div style="font-size:10px;color:var(--text3);margin-top:1px;">Asist: ${cal.asist}/${cal.totalClases}</div>
        </div>
        <div style="font-family:'Montserrat',sans-serif;font-size:15px;font-weight:900;color:${esYo?col:'var(--teal)'};">${cal.total.toFixed(1)}</div>
      </div>`;
    }).join('')}
  </div>

  <!-- COMPARACIÓN ENTRE GRUPOS -->
  <div style="background:white;border:1.5px solid #e9edf2;border-radius:14px;padding:14px;margin-bottom:12px;box-shadow:0 2px 10px rgba(0,0,0,0.05);">
    <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--teal2);font-weight:700;margin-bottom:12px;padding-bottom:6px;border-bottom:1.5px solid var(--border);">Comparación de Grupos</div>
    ${ranking.map((g,i)=>{
      const st=grupoStats[g];
      const esMio=g===miGrupo;
      const gCol=GCOL[g]||'var(--teal)';
      const pct=maxAvg>0?Math.round((st.avgPts/maxAvg)*100):0;
      const med=i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`;
      return`<div style="margin-bottom:12px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;">
          <div style="display:flex;align-items:center;gap:7px;">
            <span style="font-size:13px;">${med}</span>
            <span style="font-size:12px;font-weight:${esMio?'800':'600'};color:${esMio?gCol:'var(--dark)'};">${g}</span>
            ${esMio?`<span style="font-size:9px;background:${gCol}22;color:${gCol};padding:1px 7px;border-radius:10px;font-weight:700;letter-spacing:0.5px;">Tu grupo</span>`:''}
          </div>
          <div style="text-align:right;">
            <span style="font-family:'Montserrat',sans-serif;font-size:13px;font-weight:900;color:${esMio?gCol:'var(--text)'};">${st.avgPts}</span>
            <span style="font-size:10px;color:var(--text3);"> pts · ${st.pctAsist}% asist</span>
          </div>
        </div>
        <div style="height:8px;background:#f0f2f5;border-radius:4px;overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:${esMio?`linear-gradient(90deg,${gCol},${gCol}bb)`:`linear-gradient(90deg,#d1d5db,#e5e7eb)`};border-radius:4px;transition:width .6s ease;"></div>
        </div>
        <div style="font-size:10px;color:var(--text3);margin-top:3px;">${st.miembros.length} caballero${st.miembros.length!==1?'s':''}</div>
      </div>`;
    }).join('')}
  </div>

  <!-- HISTORIAL POR CLASE — MI GRUPO -->
  ${clasesGrupo.length?`<div style="background:white;border:1.5px solid #e9edf2;border-radius:14px;padding:14px;margin-bottom:12px;box-shadow:0 2px 10px rgba(0,0,0,0.05);">
    <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${col};font-weight:700;margin-bottom:10px;padding-bottom:6px;border-bottom:1.5px solid ${col}33;">Clases de Mi Grupo</div>
    ${clasesGrupo.map(cl=>{
      const presentes=misMiembros.filter(m=>cl.cal[m.id]&&cl.cal[m.id].a);
      const avgCl=presentes.length?+(presentes.reduce((s,m)=>s+(typeof classScoreForCab==='function'?classScoreForCab(cl,m.id):rowTotal(cl.cal[m.id])),0)/presentes.length).toFixed(1):0;
      const sc=avgCl>=7?'#15803d':avgCl>=4?'var(--gold2)':'var(--text3)';
      const{d,m}=fmtBox(cl.fecha);
      return`<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f3f4f6;">
        <div style="background:linear-gradient(135deg,${col},${col}bb);border-radius:8px;padding:6px 8px;text-align:center;flex-shrink:0;min-width:38px;">
          <div style="font-family:'Montserrat',sans-serif;font-size:16px;font-weight:900;color:white;line-height:1;">${d}</div>
          <div style="font-size:8px;font-weight:700;color:rgba(255,255,255,0.8);letter-spacing:1px;">${m}</div>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:12px;font-weight:700;color:var(--dark);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${cl.tema||'Estudio de las Dispensaciones'}</div>
          <div style="font-size:10px;color:var(--text3);margin-top:2px;">${presentes.length} de ${misMiembros.length} asistieron</div>
        </div>
        <div style="font-family:'Montserrat',sans-serif;font-size:16px;font-weight:900;color:${sc};">${avgCl.toFixed(1)}</div>
      </div>`;
    }).join('')}
  </div>`:''}
  `;

  el.innerHTML=h;
}


function openChangeCabPw(){
  const c=DB.caballeros.find(x=>x.id===currentCabId);if(!c)return;
  const tienePass=!!c.pw;
  const nombreEsc=escAttr(c.nombre||'');
  const nombreMostrarEsc=escAttr(c.nombreMostrar||'');
  const telefonoEsc=escAttr(c.telefono||'');
  const fnacEsc=c.fnac||'';
  const fbautEsc=c.fechaBautizado||'';
  const fsellEsc=c.fechaSellado||'';
  const campResp=c.campamentoRespuesta||'';
  const tieneFoto=!!c.photo;
  const esBautizado=!!c.bautizado;
  const esSellado=!!c.sellado;
  const ciudadNacEsc=escAttr(c.ciudadNacimiento||'');
  const paisNacEsc=escAttr(c.paisNacimiento||'');
  const lemaEsc=escAttr(c.lema||'');
  const profesionEsc=escAttr(c.profesionOficio||'');
  const anioConvEsc=escAttr(c.anioConversion||'');
  const iglesiaProcEsc=escAttr(c.iglesiaProcedencia||'');
  const gustosEsc=escAttr(c.gustosAficiones||'');
  const rolEsc=escAttr(c.rolActual||'');
  const estadoCivilEsc=escAttr(c.estadoCivil||'');
  const tieneHijosEsc=escAttr(c.tieneHijos||'');
  const numHijosEsc=escAttr(c.numHijos||'');
  const infoHijosEsc=escAttr(c.infoHijos||'');
  const ocultar=Array.isArray(c.ocultarAOtros)?c.ocultarAOtros:[];
  const oc=(key)=>ocultar.includes(key)?'checked':'';
  openSheet('👤','Mi Perfil',nombreCorto(c)||c.nombre,`
    <div class="perfil-panel">
      <div class="perfil-hero">
        <div style="display:flex;align-items:center;gap:16px;">
          <div id="cpw-photo-preview" class="perfil-photo-wrap">${tieneFoto?`<img src="${c.photo}" style="width:100%;height:100%;object-fit:cover;">`:'<div>👤</div>'}</div>
          <div style="flex:1;min-width:0;position:relative;z-index:1;">
            <div class="perfil-hero-txt">Cuenta y foto</div>
            <div class="perfil-hero-sub">Así te verán los demás caballeros</div>
            <input type="file" id="cpw-photo-inp" accept="image/*" style="margin-top:10px;font-size:11px;color:rgba(255,255,255,0.9);max-width:100%;">
          </div>
        </div>
      </div>
      <div class="perfil-block">
        <div class="perfil-block-title">Datos personales</div>
      <div class="fr"><label>Nombre completo</label><input type="text" id="cpw-nombre" value="${nombreEsc}" placeholder="Nombre y apellido"></div>
      <div class="fr" style="margin-bottom:10px;"><label>Nombre a mostrar</label><input type="text" id="cpw-nombreMostrar" value="${nombreMostrarEsc}" placeholder="Ej. Juan García"></div>
      <div class="fr" style="margin-bottom:10px;"><label>Teléfono</label><input type="tel" id="cpw-telefono" value="${telefonoEsc}" placeholder="Ej. 600 000 000"></div>
      <div class="fr" style="margin-bottom:10px;"><label>Fecha de nacimiento</label><input type="date" id="cpw-fnac" value="${fnacEsc}"></div>
      <div class="fr" style="margin-bottom:10px;"><label>Ciudad de nacimiento</label><input type="text" id="cpw-ciudadNac" value="${ciudadNacEsc}" placeholder="Ej. Bogotá"></div>
      <div class="fr" style="margin-bottom:10px;"><label>País de nacimiento</label><input type="text" id="cpw-paisNac" value="${paisNacEsc}" placeholder="Ej. Colombia"></div>
      <div class="fr" style="margin-bottom:10px;"><label>Año de conversión</label><input type="number" id="cpw-anioConv" value="${anioConvEsc}" placeholder="Ej. 2015"></div>
      <div class="fr" style="margin-bottom:10px;"><label>Iglesia de procedencia</label><input type="text" id="cpw-iglesiaProc" value="${iglesiaProcEsc}" placeholder="Donde te congregabas antes"></div>
      <div class="fr" style="margin-bottom:10px;"><label>Profesión u oficio</label><input type="text" id="cpw-profesion" value="${profesionEsc}" placeholder="Ej. Ingeniero, carpintero, estudiante"></div>
      <div class="fr" style="margin-bottom:10px;"><label>Gustos / aficiones</label><input type="text" id="cpw-gustos" value="${gustosEsc}" placeholder="Deportes, música, hobbies..."></div>
      <div class="fr" style="margin-bottom:10px;">
        <label>Rol o roles en la iglesia</label>
        <textarea id="cpw-rol" rows="3" style="width:100%;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:13px;font-family:'Lato',sans-serif;resize:vertical;" placeholder="Ej. Servidor de ujieres&#10;Líder de célula&#10;Maestro de niños">${rolEsc}</textarea>
        <div style="font-size:11px;color:#6b7280;margin-top:4px;">Escribe hasta tres roles, uno por línea (en tu iglesia local).</div>
      </div>
      <div class="fr" style="margin-bottom:10px;">
        <label>Estado civil</label>
        <select id="cpw-estadoCivil" style="width:100%;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:13px;">
          <option value="" ${estadoCivilEsc===''?'selected':''}>—</option>
          <option value="soltero" ${estadoCivilEsc==='soltero'?'selected':''}>Soltero</option>
          <option value="casado" ${estadoCivilEsc==='casado'?'selected':''}>Casado</option>
          <option value="noviazgo" ${estadoCivilEsc==='noviazgo'?'selected':''}>En noviazgo</option>
          <option value="otro" ${estadoCivilEsc==='otro'?'selected':''}>Otro</option>
        </select>
      </div>
      <div class="fr" style="margin-bottom:10px;">
        <label>¿Tienes hijos?</label>
        <select id="cpw-tieneHijos" style="width:100%;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:13px;">
          <option value="" ${tieneHijosEsc===''?'selected':''}>Prefiero no decir</option>
          <option value="no" ${tieneHijosEsc==='no'?'selected':''}>No</option>
          <option value="si" ${tieneHijosEsc==='si'?'selected':''}>Sí</option>
        </select>
      </div>
      <div class="fr" style="margin-bottom:10px;"><label>Número de hijos</label><input type="number" id="cpw-numHijos" value="${numHijosEsc}" min="0" placeholder="Ej. 2"></div>
      <div class="fr" style="margin-bottom:10px;"><label>Comentario sobre tus hijos</label><input type="text" id="cpw-infoHijos" value="${infoHijosEsc}" placeholder="Ej. Aún viven conmigo, ya tienen su familia..."></div>
      ${esBautizado?`<div class="fr" style="margin-bottom:10px;"><label>Fecha de bautizado</label><input type="date" id="cpw-fbaut" value="${fbautEsc}"></div>`:''}
      ${esSellado?`<div class="fr" style="margin-bottom:10px;"><label>Fecha de sellado</label><input type="date" id="cpw-fsell" value="${fsellEsc}"></div>`:''}
      <div class="fr" style="margin-bottom:10px;"><label>Versículo favorito o lema personal</label><input type="text" id="cpw-lema" value="${lemaEsc}" placeholder="Ej. Filipenses 4:13 o una frase que te inspire"></div>
      ${c.devoto?`<div class="dsec" style="margin-top:14px;padding-top:14px;border-top:1px solid #e5e7eb;">
        <div class="dhead" style="margin-bottom:8px;">★ Distinción Devoto</div>
        <p style="font-size:12px;color:var(--text3);margin-bottom:10px;">Tienes la distinción de Devoto. Si deseas quitarla:</p>
        <button class="btn boutline" style="font-size:11px;padding:8px 14px;border-color:rgba(239,68,68,0.4);color:#b91c1c;" onclick="quitarDevotoDesdePerfil()">Quitar distinción de Devoto</button>
      </div>`:''}
      <div class="dsec" style="margin-top:14px;padding-top:14px;border-top:1px solid #e5e7eb;">
        <div class="dhead" style="margin-bottom:8px;">👁️ Qué ocultar a los demás</div>
        <div style="font-size:11px;color:var(--text3);margin-bottom:10px;">Marca los datos que no quieres que otros caballeros vean en tu ficha. El admin siempre ve todo.</div>
        <div style="display:flex;flex-wrap:wrap;gap:12px 20px;">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;"><input type="checkbox" id="cpw-oc-profesion" ${oc('profesionOficio')}> Profesión</label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;"><input type="checkbox" id="cpw-oc-gustos" ${oc('gustosAficiones')}> Gustos / aficiones</label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;"><input type="checkbox" id="cpw-oc-rol" ${oc('rolActual')}> Rol actual</label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;"><input type="checkbox" id="cpw-oc-lema" ${oc('lema')}> Versículo o lema</label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;"><input type="checkbox" id="cpw-oc-estadoCivil" ${oc('estadoCivil')}> Estado civil</label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;"><input type="checkbox" id="cpw-oc-tieneHijos" ${oc('tieneHijos')}> ¿Tienes hijos?</label>
        </div>
      </div>
      <div class="fr" style="margin-bottom:10px;">
        <label>Campamento de Caballeros</label>
        <select id="cpw-camp" style="width:100%;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:13px;">
          <option value="" ${campResp===''?'selected':''}>Aún no lo sé</option>
          <option value="si" ${campResp==='si'?'selected':''}>Sí voy</option>
          <option value="no" ${campResp==='no'?'selected':''}>No voy</option>
          <option value="aun_no_se" ${campResp==='aun_no_se'?'selected':''}>Aún no lo sé</option>
        </select>
      </div>
      <button class="btn bteal" onclick="doSaveCabPerfilPV();">💾 Guardar perfil</button>
      </div>
    </div>
    ${tienePass?`<div class="fr"><label>Contraseña actual</label><input type="password" id="cpw-curr" placeholder="Tu contraseña actual"></div>`:'<div style="background:var(--teal-bg);border:1px solid var(--border);border-radius:10px;padding:10px 13px;margin-bottom:12px;font-size:12px;color:var(--teal2)">🔑 Todavía no tienes contraseña personal. Crea una para proteger tu perfil.</div>'}
    <div class="fr"><label>${tienePass?'Nueva contraseña':'Crear contraseña'}</label><input type="password" id="cpw-new" placeholder="Mínimo 4 caracteres"></div>
    <div class="fr"><label>Confirmar contraseña</label><input type="password" id="cpw-conf" placeholder="Repetir contraseña"></div>
    <div class="login-err" id="cpw-err" style="display:none;margin-bottom:10px"></div>
    <button class="btn bteal bfull" onclick="doChangeCabPw(${tienePass})">🔒 ${tienePass?'Cambiar Contraseña':'Crear Contraseña'}</button>
  `);
  const photoInp=document.getElementById('cpw-photo-inp');
  if(photoInp){
    photoInp.onchange=async function(e){
      const f=e.target.files[0];if(!f)return;
      const data=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(f);});
      const prev=document.getElementById('cpw-photo-preview');
      if(prev)prev.innerHTML='<img src="'+data+'" style="width:100%;height:100%;object-fit:cover;">';
      window._cpwPhotoPending=data;
    };
  }
}
async function doSaveCabPerfilPV(){
  const c=DB.caballeros.find(x=>x.id===currentCabId);if(!c)return;
  c.nombre=(document.getElementById('cpw-nombre')?.value||'').trim();
  c.nombreMostrar=(document.getElementById('cpw-nombreMostrar')?.value||'').trim();
  c.telefono=(document.getElementById('cpw-telefono')?.value||'').trim();
  const fnacEl=document.getElementById('cpw-fnac');
  const fbautEl=document.getElementById('cpw-fbaut');
  const fsellEl=document.getElementById('cpw-fsell');
  const campEl=document.getElementById('cpw-camp');
  const ciudadNacEl=document.getElementById('cpw-ciudadNac');
  const paisNacEl=document.getElementById('cpw-paisNac');
  const lemaEl=document.getElementById('cpw-lema');
  const profesionEl=document.getElementById('cpw-profesion');
  const anioConvEl=document.getElementById('cpw-anioConv');
  const iglesiaProcEl=document.getElementById('cpw-iglesiaProc');
  const gustosEl=document.getElementById('cpw-gustos');
  const rolEl=document.getElementById('cpw-rol');
  const estadoCivilEl=document.getElementById('cpw-estadoCivil');
  const tieneHijosEl=document.getElementById('cpw-tieneHijos');
  const numHijosEl=document.getElementById('cpw-numHijos');
  const infoHijosEl=document.getElementById('cpw-infoHijos');
  if(fnacEl)c.fnac=fnacEl.value||'';
  if(fbautEl)c.fechaBautizado=fbautEl.value||'';
  if(fsellEl)c.fechaSellado=fsellEl.value||'';
  if(campEl)c.campamentoRespuesta=campEl.value||'';
  if(ciudadNacEl)c.ciudadNacimiento=ciudadNacEl.value.trim()||'';
  if(paisNacEl)c.paisNacimiento=paisNacEl.value.trim()||'';
  if(lemaEl)c.lema=lemaEl.value.trim()||'';
   if(profesionEl)c.profesionOficio=profesionEl.value.trim()||'';
   if(anioConvEl)c.anioConversion=anioConvEl.value.trim()||'';
   if(iglesiaProcEl)c.iglesiaProcedencia=iglesiaProcEl.value.trim()||'';
   if(gustosEl)c.gustosAficiones=gustosEl.value.trim()||'';
   if(rolEl)c.rolActual=rolEl.value.trim()||'';
   if(estadoCivilEl)c.estadoCivil=estadoCivilEl.value||'';
   if(tieneHijosEl)c.tieneHijos=tieneHijosEl.value||'';
   if(numHijosEl)c.numHijos=numHijosEl.value||'';
   if(infoHijosEl)c.infoHijos=infoHijosEl.value.trim()||'';
  const ocultarAOtros=[];
  if(document.getElementById('cpw-oc-profesion')?.checked)ocultarAOtros.push('profesionOficio');
  if(document.getElementById('cpw-oc-gustos')?.checked)ocultarAOtros.push('gustosAficiones');
  if(document.getElementById('cpw-oc-rol')?.checked)ocultarAOtros.push('rolActual');
  if(document.getElementById('cpw-oc-lema')?.checked)ocultarAOtros.push('lema');
  if(document.getElementById('cpw-oc-estadoCivil')?.checked)ocultarAOtros.push('estadoCivil');
  if(document.getElementById('cpw-oc-tieneHijos')?.checked)ocultarAOtros.push('tieneHijos');
  c.ocultarAOtros=ocultarAOtros;
  if(window._cpwPhotoPending){c.photo=window._cpwPhotoPending;window._cpwPhotoPending=null;}
  await saveDB();toast('✅ Datos guardados','ok');
}
async function doChangeCabPw(tienePass){
  const c=DB.caballeros.find(x=>x.id===currentCabId);if(!c)return;
  const err=document.getElementById('cpw-err');err.style.display='none';
  if(tienePass){
    const curr=document.getElementById('cpw-curr').value;
    // Acepta contraseña propia O contraseña maestra
    if(curr!==c.pw&&curr!==DB.adminPw){err.textContent='Contraseña actual incorrecta.';err.style.display='block';return;}
  }
  const nw=document.getElementById('cpw-new').value;
  const conf=document.getElementById('cpw-conf').value;
  if(nw.length<4){err.textContent='Mínimo 4 caracteres.';err.style.display='block';return;}
  if(nw!==conf){err.textContent='Las contraseñas no coinciden.';err.style.display='block';return;}
  c.pw=nw;closeModal();toast('💾 Guardando...','info');await saveDB();toast('✅ Contraseña '+(tienePass?'actualizada':'creada')+' con éxito','ok');
}

// ═══════════════════════════════════════════════════════════════
// MODAL HELPERS
// ═══════════════════════════════════════════════════════════════
function openSheet(av,ttl,sub,body){
  const avEl=document.getElementById('m-av');
  if(typeof av==='string'&&av.startsWith('<'))avEl.innerHTML=av;
  else avEl.textContent=av;
  document.getElementById('m-ttl').textContent=ttl;
  document.getElementById('m-sub').textContent=sub;
  document.getElementById('m-body').innerHTML=body;
  document.getElementById('overlay').classList.add('open');
  document.getElementById('sheet').scrollTop=0;
}
function closeModal(){document.getElementById('overlay').classList.remove('open');}

// ═══════════════════════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════════════════════
function toast(msg,type='info'){
  const t=document.createElement('div');t.className=`toast ${type}`;t.textContent=msg;
  document.body.appendChild(t);setTimeout(()=>t.remove(),2800);
}

// ═══════════════════════════════════════════════════════════════
// GOOGLE DRIVE GUIDE — Abrir como modal
// ═══════════════════════════════════════════════════════════════
// (llamar desde consola o botón oculto: showGDriveGuide())
function showGDriveGuide(){
  openSheet('☁️','Cómo compartir en Google Drive','Acceso desde móvil para todos',`
    <div style="font-size:13px;line-height:1.8;color:var(--text2)">
      <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:12px;margin-bottom:14px;font-size:12px;color:#856404">
        ⚠️ <strong>Importante:</strong> Google Drive solo puede abrir archivos HTML, no ejecutarlos. Para que la app funcione necesitas una de las opciones abajo.
      </div>
      <p style="font-weight:800;color:var(--dark);margin-bottom:8px;font-family:Montserrat">Opción 1 — GitHub Pages (Recomendado, GRATIS)</p>
      <ol style="margin-left:16px;margin-bottom:14px">
        <li>Crea cuenta en <strong>github.com</strong></li>
        <li>Crea repositorio nuevo (público)</li>
        <li>Sube el archivo <strong>caballeros_app.html</strong> renombrándolo a <strong>index.html</strong></li>
        <li>Ve a Settings → Pages → Source: main → /root</li>
        <li>Tu URL será: <em>tunombre.github.io/repositorio</em></li>
        <li>Comparte ese enlace por WhatsApp ✅</li>
      </ol>
      <p style="font-weight:800;color:var(--dark);margin-bottom:8px;font-family:Montserrat">Opción 2 — Netlify Drop (MÁS FÁCIL)</p>
      <ol style="margin-left:16px;margin-bottom:14px">
        <li>Ve a <strong>netlify.com/drop</strong> desde el computador</li>
        <li>Arrastra el archivo <strong>caballeros_app.html</strong></li>
        <li>Renómbralo a <strong>index.html</strong> antes de subir</li>
        <li>¡Listo! Te da un enlace público al instante</li>
        <li>Comparte por WhatsApp ✅</li>
      </ol>
      <p style="font-weight:800;color:var(--dark);margin-bottom:8px;font-family:Montserrat">📦 ¿Y los datos (calificaciones, fotos)?</p>
      <div style="background:var(--teal-bg);border:1px solid var(--border);border-radius:8px;padding:12px;font-size:12px;color:var(--teal2)">
        Cada persona guarda los datos en su propio celular (<strong>localStorage</strong>). Solo el <strong>Administrador</strong> puede calificar y sus datos se guardan en el dispositivo desde donde administra.<br><br>
        Para llevar los datos de un celular a otro: usa el botón <strong>Exportar / Importar datos</strong> (abajo).
      </div>
    </div>
    <div style="margin-top:14px">
      <button class="btn bteal bfull" onclick="exportData()">📤 Exportar datos (JSON)</button>
      <button class="btn boutline bfull" onclick="document.getElementById('import-file').click()" style="margin-top:8px">📥 Importar datos</button>
      <input type="file" id="import-file" accept=".json" style="display:none" onchange="importData(event)">
    </div>
  `);
}

// Export / Import data
function exportData(){
  const blob=new Blob([JSON.stringify(DB,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download='caballeros_datos_'+new Date().toISOString().split('T')[0]+'.json';
  a.click();toast('📤 Datos exportados','ok');
}
function importData(e){
  const file=e.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=async ev=>{
    try{
      const data=JSON.parse(ev.target.result);
      if(!data.caballeros||!data.clases)throw new Error('Formato incorrecto');
      window._importData=data;
      openSheet('📥','Importar datos','',`
        <p style="font-size:14px;color:var(--text);margin-bottom:10px;">Se reemplazarán todos los datos actuales (caballeros, clases, eventos, finanzas, etc.).</p>
        <p style="font-size:12px;color:var(--text3);margin-bottom:14px;">Te recomendamos tener una copia exportada antes de continuar.</p>
        <div class="btn-row">
          <button class="btn boutline" onclick="closeModal();window._importData=null">Cancelar</button>
          <button class="btn bteal" onclick="doConfirmImport()">Importar</button>
        </div>
      `);
    }catch(err){toast('⚠️ Archivo inválido','err');}
  };
  reader.readAsText(file);
  e.target.value='';
}
async function doConfirmImport(){
  const data=window._importData;if(!data)return;
  DB=data;window._importData=null;
  closeModal();initAdmin();buildSel();
  toast('💾 Guardando en la nube...','info');
  await saveDB();
  toast('✅ Datos importados correctamente','ok');
}

// EVENTOS: helpers, getEventosCompletos, renderEventosPV y renderEventosAdmin en app.eventos.js
// ═══════════════════════════════════════════════════════════════
