// EVENTOS — helpers compartidos + vista personal + admin (extraído desde app.js)

function lastSundayOfMonth(year,month){
  const fin=new Date(year,month,0);
  fin.setHours(0,0,0,0);
  while(fin.getDay()!==0) fin.setDate(fin.getDate()-1);
  return fin;
}

function proximaFechaEvento(ev, desde){
  if(ev.fecha==='por_definir') return null;
  if(ev.fecha==='recurrente_ultimo_domingo'){
    let y=desde.getFullYear(), m=desde.getMonth()+1;
    for(let i=0;i<14;i++){
      const d=lastSundayOfMonth(y,m);
      if(d>=desde) return d;
      m++;if(m>12){m=1;y++;}
    }
    return null;
  }
  const d=new Date(ev.fecha+'T00:00:00');
  return d>=desde?d:null;
}

function fmtEvDate(d){
  const dias=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const meses=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  return`${dias[d.getDay()]} ${d.getDate()} de ${meses[d.getMonth()]}`;
}

function diffDaysEv(d,today){return Math.round((d-today)/(1000*60*60*24));}

function badgeEv(n){
  if(n===0)return`<span style="background:#dcfce7;color:#15803d;font-size:10px;font-weight:800;padding:2px 10px;border-radius:20px;letter-spacing:1px;">¡HOY!</span>`;
  if(n===1)return`<span style="background:#fef3c7;color:#b45309;font-size:10px;font-weight:800;padding:2px 10px;border-radius:20px;letter-spacing:1px;">MAÑANA</span>`;
  if(n<0)return`<span style="background:#f3f4f6;color:#6b7280;font-size:10px;font-weight:800;padding:2px 10px;border-radius:20px;letter-spacing:1px;">✓ Pasó</span>`;
  return`<span style="background:rgba(58,171,186,0.12);color:#2d8f9c;font-size:10px;font-weight:800;padding:2px 10px;border-radius:20px;letter-spacing:1px;">En ${n} días</span>`;
}

function esEventoPasado(ev,todayStr){
  if(!ev.fecha||ev.fecha==='por_definir'||ev.fecha==='recurrente_ultimo_domingo')return false;
  const fin=ev.fechaFin||ev.fecha;
  return fin<todayStr;
}

const TEMAS_CULTO=[
  {mes:1,titulo:'Evidencia de una Muerte',sub:'Arrepentimiento',ref:'Romanos 6:6'},
  {mes:2,titulo:'Evidencia de una Resurrección',sub:'Nueva Vida',ref:'Juan 5:24'},
  {mes:3,titulo:'Evidencia de una Experiencia',sub:'Bautismo del Espíritu Santo',ref:'Hechos 2:33'},
  {mes:4,titulo:'Evidencia de Gozo',sub:'',ref:'Hechos 8:38-39 NBV'},
  {mes:5,titulo:'Evidencia de la Paz',sub:'Tranquilidad en medio de las pruebas',ref:'Hechos 16:25 / Filipenses 4:9'},
  {mes:6,titulo:'Evidencia de Comunión',sub:'',ref:'Hechos 2:42-44 / 1 Juan 1:7'},
  {mes:7,titulo:'Evidencia de Testimonio',sub:'Ejemplo',ref:'Daniel 3 / Mateo 5:16 PDT'},
  {mes:8,titulo:'Evidencia de una Marca',sub:'Enseñanza para hermanos apartados',ref:'Mateo 26:73'},
  {mes:9,titulo:'Evidencia de Dependencia',sub:'Enseñanza para hermanos apartados',ref:'2 Corintios 3:4-5'},
  {mes:10,titulo:'Evidencia de una Herida',sub:'Pruebas',ref:'2 Corintios 4:8-9'},
  {mes:11,titulo:'Evidencia de un Servicio',sub:'Especial nativos / Las marcas de Cristo',ref:'Gálatas 6:17'},
  {mes:12,titulo:'Evidencia de una Perseverancia al fin',sub:'',ref:'Filipenses 3:12-14'},
];

const ESTUDIOS_CALENDARIO=[
  {fecha:'2026-02-13',grupo:'Caballeros del Cielo'},{fecha:'2026-02-27',grupo:'Emanuel'},
  {fecha:'2026-03-13',grupo:'Embajadores del Rey'},{fecha:'2026-03-27',grupo:'Centinelas'},
  {fecha:'2026-04-10',grupo:'Caballeros del Cielo'},{fecha:'2026-04-24',grupo:'Emanuel'},
  {fecha:'2026-05-08',grupo:'Embajadores del Rey'},{fecha:'2026-05-22',grupo:'Centinelas'},
  {fecha:'2026-06-05',grupo:'Caballeros del Cielo'},{fecha:'2026-06-19',grupo:'Emanuel'},
  {fecha:'2026-07-03',grupo:'Embajadores del Rey'},{fecha:'2026-07-17',grupo:'Centinelas'},
  {fecha:'2026-07-31',grupo:'Caballeros del Cielo'},{fecha:'2026-08-14',grupo:'Emanuel'},
  {fecha:'2026-08-28',grupo:'Embajadores del Rey'},{fecha:'2026-09-11',grupo:'Centinelas'},
  {fecha:'2026-09-25',grupo:'Caballeros del Cielo'},{fecha:'2026-10-09',grupo:'Emanuel'},
  {fecha:'2026-10-23',grupo:'Embajadores del Rey'},{fecha:'2026-11-06',grupo:'Centinelas'},
  {fecha:'2026-11-20',grupo:'Caballeros del CIELO'},{fecha:'2026-12-04',grupo:'Emanuel'},
  {fecha:'2026-12-18',grupo:'Embajadores del Rey'},{fecha:'2027-01-01',grupo:'Centinelas'},
  {fecha:'2027-01-15',grupo:'Caballeros del Cielo'},{fecha:'2027-01-29',grupo:'Emanuel'},
  {fecha:'2027-02-12',grupo:'Embajadores del Rey'},
];

function getCultoDate(y,m){
  if(y===2026&&m===2)return new Date(2026,1,26);
  const d=new Date(y,m-1,1);
  d.setDate(1+((4-d.getDay()+7)%7));return d;
}

function getEventosCompletos(){
  const today=new Date();today.setHours(0,0,0,0);
  const todayStr=today.toISOString().split('T')[0];
  const ocultosCulto=DB.eventosCultosOverride||{};
  const ocultosEstudio=DB.eventosEstudiosOverride||{};
  const allItems=[];
  for(let y=2026;y<=2026;y++){
    for(let m=1;m<=12;m++){
      const d=getCultoDate(y,m);
      const fechaStr=d.toISOString().split('T')[0];
      if(ocultosCulto[fechaStr]?.oculto)continue;
      allItems.push({tipo:'culto',fecha:d,fechaStr,tema:TEMAS_CULTO.find(t=>t.mes===m)||null});
    }
  }
  (ESTUDIOS_CALENDARIO||[]).forEach(ev=>{
    const d=new Date(ev.fecha+'T00:00:00');
    const fechaStr=ev.fecha;
    if(ocultosEstudio[fechaStr]?.oculto)return;
    allItems.push({tipo:'estudio',fecha:d,fechaStr,grupo:ev.grupo});
  });
  (DB.eventos||[]).forEach(ev=>{
    const d=ev.fecha==='recurrente_ultimo_domingo'
      ?proximaFechaEvento(ev,today)
      :(ev.fecha&&ev.fecha!=='por_definir'?new Date(ev.fecha+'T00:00:00'):null);
    const fechaStr=ev.fecha&&ev.fecha!=='recurrente_ultimo_domingo'&&ev.fecha!=='por_definir'
      ?ev.fecha
      :d?d.toISOString().split('T')[0]:'';
    const esPasado=esEventoPasado(ev,todayStr);
    const base={tipo:'evento',ev,fecha:d||new Date(),fechaStr};
    if(esPasado)allItems.push({...base,yaPaso:true});
    else allItems.push({...base,yaPaso:false});
  });
  const futuros=allItems.filter(x=>!x.yaPaso&&x.fecha>=today).sort((a,b)=>a.fecha-b.fecha);
  const pasados=allItems.filter(x=>x.yaPaso||x.fecha<today).sort((a,b)=>b.fecha-a.fecha);
  return{proximos:futuros,pasados,today};
}

function renderEventosPV(){
  const el=document.getElementById('pv-eventos');
  if(!el)return;
  renderCampamentoBanner();

  const {proximos:items,pasados,today}=getEventosCompletos();
  const meses=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const ovCulto=DB.eventosCultosOverride||{};
  const ovEstudio=DB.eventosEstudiosOverride||{};

  const html=items.map((item,idx)=>{
    const n=diffDaysEv(item.fecha,today);
    const esProximo=idx===0;
    const estiloProximo=esProximo?'background:linear-gradient(135deg,#f0fdfa 0%,#ccfbf1 50%,#99f6e4 100%);border:2px solid #2dd4bf;box-shadow:0 8px 24px rgba(45,212,191,0.25);':'background:white;border:1.5px solid #e9edf2;box-shadow:0 2px 12px rgba(0,0,0,0.06);';
    const badgeProximo=esProximo?'<span style="background:linear-gradient(135deg,#14b8a6,#0d9488);color:white;font-size:10px;font-weight:800;padding:3px 12px;border-radius:20px;letter-spacing:1.5px;box-shadow:0 2px 8px rgba(20,184,166,0.4);">PRÓXIMO</span>':'';

    if(item.tipo==='culto'){
      const nomCulto=(ovCulto[item.fechaStr]?.nombre)||(item.tema?'Culto de Caballeros · '+item.tema.titulo:'Culto de Caballeros');
      const {tema}=item;
      const temaLine=tema&&!ovCulto[item.fechaStr]?.nombre
        ?`<div style="font-family:'Montserrat',sans-serif;font-size:13px;font-weight:900;color:#1a1f2e;line-height:1.3;margin-top:2px;">${tema.titulo}</div>
          ${tema.sub?`<div style="font-size:11px;color:#3aabba;font-style:italic;margin-top:1px;">${tema.sub}</div>`:''}
          <div style="font-size:10px;color:#9ca3af;margin-top:2px;">📖 ${tema.ref}</div>`:'';
      return`<div style="${estiloProximo}border-radius:14px;padding:14px 16px;display:flex;align-items:flex-start;gap:14px;position:relative;overflow:hidden;">
        <div style="position:absolute;top:0;left:0;width:5px;height:100%;background:linear-gradient(180deg,#3aabba,#1d6b77);border-radius:4px 0 0 4px;"></div>
        <div style="font-size:28px;flex-shrink:0;margin-left:4px;margin-top:2px;">⚔️</div>
        <div style="flex:1;min-width:0;">
          <div style="font-family:'Montserrat',sans-serif;font-size:10px;font-weight:700;color:#9ca3af;letter-spacing:2px;text-transform:uppercase;margin-bottom:3px;">${nomCulto}</div>
          <div style="font-size:11px;color:#4b5563;">📅 ${fmtEvDate(item.fecha)}</div>
          ${temaLine}
        </div>
        <div style="flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;gap:6px;">${badgeProximo}${badgeEv(n)}<button type="button" class="btn bteal" style="font-size:11px;padding:6px 10px;white-space:nowrap;" onclick="openProximoEventoDetalle(${idx})">Ver detalles</button></div>
      </div>`;
    }

    if(item.tipo==='estudio'){
      const nomEstudio=(ovEstudio[item.fechaStr]?.nombre)||'Estudio de las Dispensaciones';
      return`<div style="${estiloProximo}border-radius:14px;padding:14px 16px;display:flex;align-items:flex-start;gap:14px;position:relative;overflow:hidden;">
        <div style="position:absolute;top:0;left:0;width:5px;height:100%;background:linear-gradient(180deg,#f5c518,#d4a800);border-radius:4px 0 0 4px;"></div>
        <div style="font-size:28px;flex-shrink:0;margin-left:4px;margin-top:2px;">📚</div>
        <div style="flex:1;min-width:0;">
          <div style="font-family:'Montserrat',sans-serif;font-size:10px;font-weight:700;color:#9ca3af;letter-spacing:2px;text-transform:uppercase;margin-bottom:3px;">Estudio</div>
          <div style="font-family:'Montserrat',sans-serif;font-size:13px;font-weight:900;color:#1a1f2e;line-height:1.3;">${nomEstudio}</div>
          <div style="font-size:11px;color:#4b5563;margin-top:3px;">📅 ${fmtEvDate(item.fecha)}</div>
          <div style="display:inline-flex;align-items:center;gap:5px;background:#ede9fe;color:#6d28d9;font-size:10px;font-weight:800;padding:3px 10px;border-radius:20px;margin-top:6px;letter-spacing:0.5px;">👥 Expone: ${item.grupo}</div>
        </div>
        <div style="flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;gap:6px;">${badgeProximo}${badgeEv(n)}<button type="button" class="btn bteal" style="font-size:11px;padding:6px 10px;white-space:nowrap;" onclick="openProximoEventoDetalle(${idx})">Ver detalles</button></div>
      </div>`;
    }

    if(item.tipo==='evento'){
      const {ev}=item;
      const fechaRango=ev.fechaFin
        ?` – ${new Date(ev.fechaFin+'T00:00:00').getDate()} de ${meses[new Date(ev.fechaFin+'T00:00:00').getMonth()]}`
        :'';
      return`<div style="${estiloProximo}border-radius:14px;padding:14px 16px;display:flex;align-items:flex-start;gap:14px;position:relative;overflow:hidden;">
        <div style="position:absolute;top:0;left:0;width:5px;height:100%;background:${ev.color||'#6b7280'};border-radius:4px 0 0 4px;opacity:0.8;"></div>
        <div style="font-size:28px;flex-shrink:0;margin-left:4px;margin-top:2px;">${ev.icono||'📅'}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-family:'Montserrat',sans-serif;font-size:10px;font-weight:700;color:#9ca3af;letter-spacing:2px;text-transform:uppercase;margin-bottom:3px;">Evento</div>
          <div style="font-family:'Montserrat',sans-serif;font-size:13px;font-weight:900;color:#1a1f2e;line-height:1.3;">${ev.nombre}</div>
          ${ev.nota?`<div style="font-size:11px;color:${ev.color||'#6b7280'};margin-top:2px;font-weight:600;">${ev.nota}</div>`:''}
          <div style="font-size:11px;color:#4b5563;margin-top:4px;">📅 ${fmtEvDate(item.fecha)}${fechaRango}</div>
        </div>
        <div style="flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;gap:6px;">${badgeProximo}${badgeEv(n)}<button type="button" class="btn bteal" style="font-size:11px;padding:6px 10px;white-space:nowrap;" onclick="openProximoEventoDetalle(${idx})">Ver detalles</button></div>
      </div>`;
    }
    return'';
  }).join('');

  el.innerHTML=html||'<div style="text-align:center;padding:16px;color:#9ca3af;font-size:13px;">No hay eventos próximos.</div>';

  const elPasados=document.getElementById('pv-eventos-pasados');
  if(elPasados){
    const htmlPasados=pasados.map(item=>{
      const n=diffDaysEv(item.fecha,today);
      if(item.tipo==='culto'){
        const nomCulto=(ovCulto[item.fechaStr]?.nombre)||(item.tema?'Culto de Caballeros · '+item.tema.titulo:'Culto de Caballeros');
        const {tema}=item;
        const temaLine=tema&&!ovCulto[item.fechaStr]?.nombre
          ?`<div style="font-family:'Montserrat',sans-serif;font-size:12px;font-weight:900;color:#4b5563;line-height:1.3;margin-top:2px;">${tema.titulo}</div>`:'';
        return`<div style="background:#f9fafb;border:1.5px solid #e5e7eb;border-radius:14px;padding:14px 16px;opacity:0.9;display:flex;align-items:flex-start;gap:14px;position:relative;overflow:hidden;">
          <div style="position:absolute;top:0;left:0;width:4px;height:100%;background:#9ca3af;border-radius:4px 0 0 4px;opacity:0.5;"></div>
          <div style="font-size:28px;flex-shrink:0;margin-left:4px;margin-top:2px;opacity:0.8;">⚔️</div>
          <div style="flex:1;min-width:0;">
            <div style="font-family:'Montserrat',sans-serif;font-size:10px;font-weight:700;color:#9ca3af;letter-spacing:2px;text-transform:uppercase;margin-bottom:3px;">${nomCulto}</div>
            <div style="font-size:11px;color:#9ca3af;">📅 ${fmtEvDate(item.fecha)}</div>
            ${temaLine}
          </div>
          <div style="flex-shrink:0;">${badgeEv(n)}</div>
        </div>`;
      }
      if(item.tipo==='estudio'){
        const nomEstudio=(ovEstudio[item.fechaStr]?.nombre)||'Estudio de las Dispensaciones';
        return`<div style="background:#f9fafb;border:1.5px solid #e5e7eb;border-radius:14px;padding:14px 16px;opacity:0.9;display:flex;align-items:flex-start;gap:14px;position:relative;overflow:hidden;">
          <div style="position:absolute;top:0;left:0;width:4px;height:100%;background:#9ca3af;border-radius:4px 0 0 4px;opacity:0.5;"></div>
          <div style="font-size:28px;flex-shrink:0;margin-left:4px;margin-top:2px;opacity:0.8;">📚</div>
          <div style="flex:1;min-width:0;">
            <div style="font-family:'Montserrat',sans-serif;font-size:10px;font-weight:700;color:#9ca3af;letter-spacing:2px;text-transform:uppercase;margin-bottom:3px;">Estudio</div>
            <div style="font-family:'Montserrat',sans-serif;font-size:12px;font-weight:900;color:#4b5563;line-height:1.3;">${nomEstudio}</div>
            <div style="font-size:11px;color:#9ca3af;margin-top:3px;">📅 ${fmtEvDate(item.fecha)}</div>
            <div style="display:inline-flex;align-items:center;gap:5px;background:#ede9fe;color:#6d28d9;font-size:10px;font-weight:800;padding:3px 10px;border-radius:20px;margin-top:6px;letter-spacing:0.5px;opacity:0.9;">👥 ${item.grupo}</div>
          </div>
          <div style="flex-shrink:0;">${badgeEv(n)}</div>
        </div>`;
      }
      const {ev}=item;
      const fechaRango=ev.fechaFin
        ?` – ${new Date(ev.fechaFin+'T00:00:00').getDate()} de ${meses[new Date(ev.fechaFin+'T00:00:00').getMonth()]}`
        :'';
      return`<div style="background:#f9fafb;border:1.5px solid #e5e7eb;border-radius:14px;padding:14px 16px;opacity:0.9;display:flex;align-items:flex-start;gap:14px;position:relative;overflow:hidden;">
        <div style="position:absolute;top:0;left:0;width:4px;height:100%;background:${ev.color||'#9ca3af'};border-radius:4px 0 0 4px;opacity:0.5;"></div>
        <div style="font-size:28px;flex-shrink:0;margin-left:4px;margin-top:2px;opacity:0.8;">${ev.icono||'📅'}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-family:'Montserrat',sans-serif;font-size:10px;font-weight:700;color:#9ca3af;letter-spacing:2px;text-transform:uppercase;margin-bottom:3px;">Evento</div>
          <div style="font-family:'Montserrat',sans-serif;font-size:13px;font-weight:900;color:#4b5563;line-height:1.3;">${ev.nombre}</div>
          ${ev.nota?`<div style="font-size:11px;color:#6b7280;margin-top:2px;font-weight:600;">${ev.nota}</div>`:''}
          <div style="font-size:11px;color:#9ca3af;margin-top:4px;">📅 ${fmtEvDate(item.fecha)}${fechaRango}</div>
        </div>
        <div style="flex-shrink:0;">${badgeEv(n)}</div>
      </div>`;
    }).join('');
    elPasados.innerHTML=htmlPasados||'<div style="text-align:center;padding:12px;color:#9ca3af;font-size:12px;">No hay eventos pasados.</div>';
  }
}

function openProximoEventoDetalle(idx){
  showPvTab('eventos');
  const {proximos,today}=getEventosCompletos();
  if(!proximos||!proximos.length){
    toast('No hay eventos próximos para mostrar.','err');
    return;
  }
  const i=typeof idx==='number'&&idx>=0?Math.min(idx,proximos.length-1):0;
  const next=proximos[i];
  const ovCulto=DB.eventosCultosOverride||{};
  const ovEstudio=DB.eventosEstudiosOverride||{};
  let cuerpo='';
  let icono='📅';
  let titulo='Próximo evento';
  let subt='';
  const fechaTxt=fmtEvDate(next.fecha);
  const diff=diffDaysEv(next.fecha,today);
  const diasTxt=diff===0?'Hoy':diff===1?'Mañana':`En ${diff} días`;
  if(next.tipo==='estudio'){
    const nomEstudio=(ovEstudio[next.fechaStr]?.nombre)||'Estudio de las Dispensaciones';
    const grupo=next.grupo||'';
    icono='📚';
    titulo='Detalles del estudio';
    subt=`${fechaTxt} · ${diasTxt}`;
    cuerpo=`<div style="font-size:14px;font-weight:800;color:#1a1f2e;margin-bottom:8px;">${nomEstudio}</div>
      <div style="font-size:13px;color:#4b5563;margin-bottom:6px;">📅 ${fechaTxt}</div>
      <div style="font-size:13px;color:#4b5563;margin-bottom:6px;">🕐 <strong>21:00 h</strong> por Zoom</div>
      ${grupo?`<div style="font-size:13px;color:#6d28d9;margin-bottom:10px;">👥 <strong>Expone el grupo:</strong> ${grupo}</div>`:''}
      <div style="background:rgba(58,171,186,0.08);border-radius:10px;padding:12px;border:1px solid rgba(58,171,186,0.4);margin-top:12px;">
        <div style="font-size:12px;font-weight:800;color:#0e7490;margin-bottom:4px;">¡Conéctate al estudio!</div>
        <div style="font-size:12px;color:#155e75;line-height:1.45;">Pide el enlace a tu coordinador o en el grupo de Caballeros para unirte a las 21:00 h.</div>
      </div>`;
  }else if(next.tipo==='culto'){
    const nomCulto=(ovCulto[next.fechaStr]?.nombre)||(next.tema?'Culto de Caballeros · '+next.tema.titulo:'Culto de Caballeros');
    icono='⚔️';
    titulo='Detalles del culto';
    subt=`${fechaTxt} · ${diasTxt}`;
    const temaBlock=next.tema&&!ovCulto[next.fechaStr]?.nombre
      ?`<div style="background:rgba(58,171,186,0.08);border-radius:10px;padding:14px;margin-top:12px;border:1px solid rgba(58,171,186,0.2);">
        <div style="font-size:14px;font-weight:800;color:#1a1f2e;">${next.tema.titulo}</div>
        ${next.tema.sub?`<div style="font-size:12px;color:#3aabba;font-style:italic;margin-top:4px;">${next.tema.sub}</div>`:''}
        ${next.tema.ref?`<div style="font-size:12px;color:#6b7280;margin-top:6px;">📖 ${next.tema.ref}</div>`:''}
      </div>`:'';
    cuerpo=`<div style="font-size:13px;color:#374151;"><strong>${nomCulto}</strong></div>
      <div style="font-size:12px;color:#6b7280;margin-top:8px;">📅 ${fechaTxt}</div>${temaBlock}`;
  }else if(next.tipo==='evento'){
    const ev=next.ev;
    icono=ev.icono||'📅';
    titulo='Detalles del evento';
    subt=`${fechaTxt} · ${diasTxt}`;
    const nota=ev.nota||'';
    const fechaFinLine=ev.fechaFin?`<div style="font-size:12px;color:#6b7280;margin-top:4px;">Hasta: ${fmtEvDate(new Date(ev.fechaFin+'T00:00:00'))}</div>`:'';
    cuerpo=`<div style="font-size:14px;font-weight:800;color:#1a1f2e;margin-bottom:8px;">${ev.nombre}</div>
      <div style="font-size:13px;color:#4b5563;">📅 ${fechaTxt}</div>${fechaFinLine}
      ${nota?`<div style="font-size:13px;color:#6b7280;margin-top:12px;line-height:1.5;padding:12px;background:#f9fafb;border-radius:10px;">${nota}</div>`:''}`;
  }else{
    subt=`${fechaTxt} · ${diasTxt}`;
    cuerpo=`<div style="font-size:13px;color:#374151;">${subt}</div>`;
  }
  openSheet(icono,titulo,subt,`<div>${cuerpo}</div>`);
}

function renderCampamentoAdmin(){
  const wrap=document.getElementById('eventos-admin-campamento-wrap');
  if(!wrap)return;
  const cabs=DB.caballeros||[];
  const si=cabs.filter(c=>c.campamentoRespuesta==='si');
  const no=cabs.filter(c=>c.campamentoRespuesta==='no');
  const aun=cabs.filter(c=>c.campamentoRespuesta==='aun_no_se');
  const total=si.length+no.length+aun.length;
  const label=v=>v==='si'?'Sí':v==='no'?'No':'Aún no lo sé';
  const listRows=[...si,...no,...aun]
    .sort((a,b)=>a.nombre.localeCompare(b.nombre))
    .map(c=>'<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;border-radius:8px;background:#f8fafc;"><span style="font-size:13px;font-weight:600;color:#1a1f2e;">'+escAttr(c.nombre)+'</span><span style="font-size:12px;font-weight:700;color:#3aabba;">'+label(c.campamentoRespuesta)+'</span></div>')
    .join('');
  wrap.innerHTML='<div style="background:linear-gradient(135deg,rgba(34,197,94,0.1) 0%,rgba(245,158,11,0.06) 100%);border-radius:14px;padding:14px 16px;border:1px solid rgba(34,197,94,0.2);">'+
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;"><span style="font-family:\'Montserrat\',sans-serif;font-size:12px;font-weight:800;color:#1a1f2e;">⛺ ¿Vas al campamento de Caballeros?</span><span style="font-size:12px;color:#4b5563;">Sí: <strong>'+si.length+'</strong> · No: <strong>'+no.length+'</strong> · Aún no lo sé: <strong>'+aun.length+'</strong>'+(total>0?' · '+total+' respuestas':'')+'</span></div>'+
    '<details style="font-size:12px;"><summary style="cursor:pointer;font-weight:700;color:#3aabba;">Ver caballeros que han votado</summary><div style="display:flex;flex-direction:column;gap:4px;margin-top:10px;max-height:220px;overflow-y:auto;">'+(listRows||'<div style="padding:8px;color:#9ca3af;">Nadie ha respondido aún.</div>')+'</div></details></div>';
}

function renderEventosAdmin(){
  const el=document.getElementById('eventos-admin-lista');
  const elPasados=document.getElementById('eventos-admin-pasados');
  if(!el)return;
  renderCampamentoAdmin();

  const {proximos,pasados,today}=getEventosCompletos();

  const ovCulto=DB.eventosCultosOverride||{};
  const ovEstudio=DB.eventosEstudiosOverride||{};
  function cardProximo(item){
    const n=diffDaysEv(item.fecha,today);
    const diasStr=n===0?'¡HOY!':n===1?'Mañana':'En '+n+' días';
    if(item.tipo==='culto'){
      const nom=(ovCulto[item.fechaStr]?.nombre)||(item.tema?'Culto de Caballeros · '+item.tema.titulo:'Culto de Caballeros');
      return`<div style="background:white;border:1.5px solid #e9edf2;border-radius:12px;padding:12px 14px;box-shadow:0 2px 8px rgba(0,0,0,0.04);display:flex;align-items:center;gap:12px;">
        <div style="width:40px;height:40px;border-radius:10px;background:#3aabba18;border:1.5px solid #3aabba44;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">⚔️</div>
        <div style="flex:1;min-width:0;">
          <div style="font-family:'Montserrat',sans-serif;font-size:12px;font-weight:800;color:#1a1f2e;">${nom}</div>
          <div style="font-size:11px;color:#9ca3af;margin-top:2px;">📅 ${fmtEvDate(item.fecha)}</div>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <div style="font-family:'Montserrat',sans-serif;font-size:11px;font-weight:800;color:#3aabba;">${diasStr}</div>
          <div style="display:flex;gap:5px;margin-top:5px;justify-content:flex-end;">
            <button onclick="openFormCulto('${item.fechaStr}')" style="background:var(--teal-bg);border:1px solid var(--border);color:var(--teal2);border-radius:7px;padding:4px 10px;font-size:10px;font-weight:700;cursor:pointer;">✏️</button>
            <button onclick="confirmarDelCulto('${item.fechaStr}')" style="background:var(--red-bg);border:1px solid rgba(239,68,68,0.3);color:var(--red);border-radius:7px;padding:4px 10px;font-size:10px;font-weight:700;cursor:pointer;">🗑</button>
          </div>
        </div>
      </div>`;
    }
    if(item.tipo==='estudio'){
      const nom=(ovEstudio[item.fechaStr]?.nombre)||'Estudio de las Dispensaciones';
      return`<div style="background:white;border:1.5px solid #e9edf2;border-radius:12px;padding:12px 14px;box-shadow:0 2px 8px rgba(0,0,0,0.04);display:flex;align-items:center;gap:12px;">
        <div style="width:40px;height:40px;border-radius:10px;background:#f5c51818;border:1.5px solid #f5c51844;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">📚</div>
        <div style="flex:1;min-width:0;">
          <div style="font-family:'Montserrat',sans-serif;font-size:12px;font-weight:800;color:#1a1f2e;">${nom}</div>
          <div style="font-size:11px;color:#9ca3af;margin-top:2px;">📅 ${fmtEvDate(item.fecha)} · 👥 ${item.grupo}</div>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <div style="font-family:'Montserrat',sans-serif;font-size:11px;font-weight:800;color:#f5c518;">${diasStr}</div>
          <div style="display:flex;gap:5px;margin-top:5px;justify-content:flex-end;">
            <button onclick="openFormEstudio('${item.fechaStr}')" style="background:var(--teal-bg);border:1px solid var(--border);color:var(--teal2);border-radius:7px;padding:4px 10px;font-size:10px;font-weight:700;cursor:pointer;">✏️</button>
            <button onclick="confirmarDelEstudio('${item.fechaStr}')" style="background:var(--red-bg);border:1px solid rgba(239,68,68,0.3);color:var(--red);border-radius:7px;padding:4px 10px;font-size:10px;font-weight:700;cursor:pointer;">🗑</button>
          </div>
        </div>
      </div>`;
    }
    const ev=item.ev;
    const fechaLegible=ev.fecha==='recurrente_ultimo_domingo'?'Último domingo de cada mes':ev.fecha==='por_definir'?'Fecha por definir':fmtEvDate(new Date(ev.fecha+'T00:00:00'))+(ev.fechaFin?` — ${fmtEvDate(new Date(ev.fechaFin+'T00:00:00'))}`:'');
    return`<div style="background:white;border:1.5px solid #e9edf2;border-radius:12px;padding:12px 14px;box-shadow:0 2px 8px rgba(0,0,0,0.04);display:flex;align-items:center;gap:12px;">
      <div style="width:40px;height:40px;border-radius:10px;background:${ev.color}18;border:1.5px solid ${ev.color}44;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">${ev.icono}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-family:'Montserrat',sans-serif;font-size:12px;font-weight:800;color:#1a1f2e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${ev.nombre}</div>
        <div style="font-size:11px;color:#9ca3af;margin-top:2px;">${fechaLegible}</div>
        ${ev.nota?`<div style="font-size:10px;color:#6b7280;margin-top:1px;font-style:italic;">${ev.nota}</div>`:''}
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <div style="font-family:'Montserrat',sans-serif;font-size:11px;font-weight:800;color:${ev.color};">${diasStr}</div>
        <div style="display:flex;gap:5px;margin-top:5px;justify-content:flex-end;">
          <button onclick="openFormEvento('${ev.id}')" style="background:var(--teal-bg);border:1px solid var(--border);color:var(--teal2);border-radius:7px;padding:4px 10px;font-size:10px;font-weight:700;cursor:pointer;font-family:'Montserrat',sans-serif;">✏️</button>
          <button onclick="confirmarDelEvento('${ev.id}')" style="background:var(--red-bg);border:1px solid rgba(239,68,68,0.3);color:var(--red);border-radius:7px;padding:4px 10px;font-size:10px;font-weight:700;cursor:pointer;font-family:'Montserrat',sans-serif;">🗑</button>
        </div>
      </div>
    </div>`;
  }

  function cardPasado(item){
    if(item.tipo==='culto'){
      const nom=(ovCulto[item.fechaStr]?.nombre)||(item.tema?'Culto de Caballeros · '+item.tema.titulo:'Culto de Caballeros');
      return`<div style="background:#f9fafb;border:1.5px solid #e5e7eb;border-radius:12px;padding:12px 14px;opacity:0.9;display:flex;align-items:center;gap:12px;">
        <div style="width:40px;height:40px;border-radius:10px;background:#9ca3af18;border:1.5px solid #9ca3af44;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;opacity:0.8;">⚔️</div>
        <div style="flex:1;min-width:0;">
          <div style="font-family:'Montserrat',sans-serif;font-size:12px;font-weight:800;color:#4b5563;">${nom}</div>
          <div style="font-size:11px;color:#9ca3af;margin-top:2px;">📅 ${fmtEvDate(item.fecha)}</div>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <span style="font-size:10px;font-weight:700;color:#9ca3af;background:#f3f4f6;padding:2px 10px;border-radius:20px;">✓ Pasó</span>
          <div style="display:flex;gap:5px;margin-top:5px;justify-content:flex-end;">
            <button onclick="openFormCulto('${item.fechaStr}')" style="background:var(--teal-bg);border:1px solid var(--border);color:var(--teal2);border-radius:7px;padding:4px 10px;font-size:10px;font-weight:700;cursor:pointer;">✏️</button>
            <button onclick="confirmarDelCulto('${item.fechaStr}')" style="background:var(--red-bg);border:1px solid rgba(239,68,68,0.3);color:var(--red);border-radius:7px;padding:4px 10px;font-size:10px;font-weight:700;cursor:pointer;">🗑</button>
          </div>
        </div>
      </div>`;
    }
    if(item.tipo==='estudio'){
      const nom=(ovEstudio[item.fechaStr]?.nombre)||'Estudio de las Dispensaciones';
      return`<div style="background:#f9fafb;border:1.5px solid #e5e7eb;border-radius:12px;padding:12px 14px;opacity:0.9;display:flex;align-items:center;gap:12px;">
        <div style="width:40px;height:40px;border-radius:10px;background:#9ca3af18;border:1.5px solid #9ca3af44;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;opacity:0.8;">📚</div>
        <div style="flex:1;min-width:0;">
          <div style="font-family:'Montserrat',sans-serif;font-size:12px;font-weight:800;color:#4b5563;">${nom}</div>
          <div style="font-size:11px;color:#9ca3af;margin-top:2px;">📅 ${fmtEvDate(item.fecha)} · 👥 ${item.grupo}</div>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <span style="font-size:10px;font-weight:700;color:#9ca3af;background:#f3f4f6;padding:2px 10px;border-radius:20px;">✓ Pasó</span>
          <div style="display:flex;gap:5px;margin-top:5px;justify-content:flex-end;">
            <button onclick="openFormEstudio('${item.fechaStr}')" style="background:var(--teal-bg);border:1px solid var(--border);color:var(--teal2);border-radius:7px;padding:4px 10px;font-size:10px;font-weight:700;cursor:pointer;">✏️</button>
            <button onclick="confirmarDelEstudio('${item.fechaStr}')" style="background:var(--red-bg);border:1px solid rgba(239,68,68,0.3);color:var(--red);border-radius:7px;padding:4px 10px;font-size:10px;font-weight:700;cursor:pointer;">🗑</button>
          </div>
        </div>
      </div>`;
    }
    const ev=item.ev;
    const fechaLegible=ev.fecha==='recurrente_ultimo_domingo'?'Último domingo de cada mes':ev.fecha==='por_definir'?'Fecha por definir':fmtEvDate(new Date(ev.fecha+'T00:00:00'))+(ev.fechaFin?` — ${fmtEvDate(new Date(ev.fechaFin+'T00:00:00'))}`:'');
    return`<div style="background:#f9fafb;border:1.5px solid #e5e7eb;border-radius:12px;padding:12px 14px;opacity:0.9;display:flex;align-items:center;gap:12px;">
      <div style="width:40px;height:40px;border-radius:10px;background:${ev.color}18;border:1.5px solid ${ev.color}44;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;opacity:0.8;">${ev.icono}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-family:'Montserrat',sans-serif;font-size:12px;font-weight:800;color:#4b5563;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${ev.nombre}</div>
        <div style="font-size:11px;color:#9ca3af;margin-top:2px;">${fechaLegible}</div>
        ${ev.nota?`<div style="font-size:10px;color:#6b7280;margin-top:1px;font-style:italic;">${ev.nota}</div>`:''}
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <span style="font-size:10px;font-weight:700;color:#9ca3af;background:#f3f4f6;padding:2px 10px;border-radius:20px;">✓ Pasó</span>
        <div style="display:flex;gap:5px;margin-top:5px;justify-content:flex-end;">
          <button onclick="openFormEvento('${ev.id}')" style="background:var(--teal-bg);border:1px solid var(--border);color:var(--teal2);border-radius:7px;padding:4px 10px;font-size:10px;font-weight:700;cursor:pointer;font-family:'Montserrat',sans-serif;">✏️</button>
          <button onclick="confirmarDelEvento('${ev.id}')" style="background:var(--red-bg);border:1px solid rgba(239,68,68,0.3);color:var(--red);border-radius:7px;padding:4px 10px;font-size:10px;font-weight:700;cursor:pointer;font-family:'Montserrat',sans-serif;">🗑</button>
        </div>
      </div>
    </div>`;
  }

  el.innerHTML=proximos.length?proximos.map(cardProximo).join(''):`<div style="text-align:center;padding:24px;color:#9ca3af;font-size:13px;">No hay eventos próximos.</div>`;

  if(elPasados){
    elPasados.innerHTML=pasados.length?pasados.map(cardPasado).join(''):`<div style="text-align:center;padding:16px;color:#9ca3af;font-size:12px;">No hay eventos pasados.</div>`;
  }
}

const ICONOS_EV=['📅','⚔️','🏟️','⛺','🕯️','✝️','👥','📚','🙏','🎉','👧','🌿','📖','🎵'];
const COLORES_EV=['#3aabba','#ef4444','#22c55e','#f59e0b','#8b5cf6','#6d28d9','#ec4899','#14b8a6','#f97316','#64748b'];

function openFormEvento(id){
  const isNew=!id;
  const ev=id?(DB.eventos||[]).find(e=>e.id===id):{nombre:'',fecha:'',fechaFin:'',icono:'📅',color:'#3aabba',nota:''};
  if(!ev)return;

  const tipoFecha=ev.fecha==='recurrente_ultimo_domingo'?'recurrente':ev.fecha==='por_definir'?'por_definir':'fija';
  const fechaVal=tipoFecha==='fija'?ev.fecha:'';
  const fechaFinVal=ev.fechaFin||'';

  const iconoOpts=ICONOS_EV.map(i=>`<span onclick="selectEvIcon('${i}')" id="ev-ico-${i}" style="font-size:22px;cursor:pointer;padding:6px;border-radius:8px;border:2px solid ${ev.icono===i?'var(--teal)':'transparent'};background:${ev.icono===i?'var(--teal-bg)':'transparent'};transition:all .15s;">${i}</span>`).join('');
  const colorOpts=COLORES_EV.map(c=>`<div onclick="selectEvColor('${c}')" id="ev-col-${c.replace('#','')}" style="width:26px;height:26px;border-radius:50%;background:${c};cursor:pointer;border:3px solid ${ev.color===c?'#1a1f2e':'transparent'};box-shadow:${ev.color===c?'0 0 0 2px white inset':'none'};transition:all .15s;flex-shrink:0;"></div>`).join('');

  openSheet(ev.icono||'📅',isNew?'Nuevo Evento':`Editar Evento`,'',`
    <div class="fr"><label>Nombre del evento</label><input id="ev-nombre" value="${ev.nombre}" placeholder="Ej: Congreso Nacional"></div>
    <div class="fr"><label>Ícono</label><div style="display:flex;flex-wrap:wrap;gap:4px;padding:8px;background:var(--off);border-radius:10px;">${iconoOpts}</div></div>
    <div class="fr"><label>Color</label><div style="display:flex;flex-wrap:wrap;gap:8px;padding:8px;background:var(--off);border-radius:10px;">${colorOpts}</div></div>
    <div class="fr"><label>Tipo de fecha</label>
      <select id="ev-tipofecha" onchange="onEvTipoFechaChange()" style="width:100%;padding:11px 14px;background:var(--off);border:1.5px solid #e9edf2;border-radius:10px;font-family:'Lato',sans-serif;font-size:14px;outline:none;">
        <option value="fija" ${tipoFecha==='fija'?'selected':''}>Fecha fija</option>
        <option value="recurrente" ${tipoFecha==='recurrente'?'selected':''}>Último domingo de cada mes</option>
        <option value="por_definir" ${tipoFecha==='por_definir'?'selected':''}>Por definir</option>
      </select>
    </div>
    <div id="ev-fecha-wrap" style="display:${tipoFecha==='fija'?'block':'none'}">
      <div class="fr"><label>Fecha</label><input type="date" id="ev-fecha" value="${fechaVal}"></div>
      <div class="fr"><label>Fecha fin (opcional, para eventos de varios días)</label><input type="date" id="ev-fechafin" value="${fechaFinVal}"></div>
    </div>
    <div class="fr"><label>Nota / descripción breve (opcional)</label><input id="ev-nota" value="${ev.nota||''}" placeholder="Ej: Lema: El fruto del Espíritu Santo"></div>
    <input type="hidden" id="ev-icono-val" value="${ev.icono||'📅'}">
    <input type="hidden" id="ev-color-val" value="${ev.color||'#3aabba'}">
    <button class="btn bteal bfull" onclick="${isNew?'doAddEvento()':'doSaveEvento(\''+id+'\')'}" style="margin-top:4px">${isNew?'✚ Crear Evento':'💾 Guardar Cambios'}</button>
  `);
}

function onEvTipoFechaChange(){
  const v=document.getElementById('ev-tipofecha').value;
  document.getElementById('ev-fecha-wrap').style.display=v==='fija'?'block':'none';
}
function selectEvIcon(ico){
  document.getElementById('ev-icono-val').value=ico;
  ICONOS_EV.forEach(i=>{
    const el=document.getElementById('ev-ico-'+i);
    if(el){el.style.border=i===ico?'2px solid var(--teal)':'2px solid transparent';el.style.background=i===ico?'var(--teal-bg)':'transparent';}
  });
  document.getElementById('m-av').textContent=ico;
}
function selectEvColor(col){
  document.getElementById('ev-color-val').value=col;
  COLORES_EV.forEach(c=>{
    const el=document.getElementById('ev-col-'+c.replace('#',''));
    if(el){el.style.border=c===col?'3px solid #1a1f2e':'3px solid transparent';el.style.boxShadow=c===col?'0 0 0 2px white inset':'none';}
  });
}

function readFormEvento(){
  const tipo=document.getElementById('ev-tipofecha').value;
  let fecha='',fechaFin='';
  if(tipo==='fija'){fecha=document.getElementById('ev-fecha').value;fechaFin=document.getElementById('ev-fechafin').value;}
  else if(tipo==='recurrente')fecha='recurrente_ultimo_domingo';
  else fecha='por_definir';
  return{
    nombre:document.getElementById('ev-nombre').value.trim(),
    fecha,fechaFin,
    icono:document.getElementById('ev-icono-val').value,
    color:document.getElementById('ev-color-val').value,
    nota:document.getElementById('ev-nota').value.trim()
  };
}

async function doAddEvento(){
  const d=readFormEvento();
  if(!d.nombre){toast('Escribe el nombre del evento','err');return;}
  if(!DB.eventos)DB.eventos=[];
  DB.eventos.push({id:'ev'+Date.now(),...d});
  closeModal();toast('💾 Guardando...','info');
  await saveDB();toast('✅ Evento creado','ok');
  renderEventosAdmin();
}
async function doSaveEvento(id){
  const d=readFormEvento();
  if(!d.nombre){toast('Escribe el nombre del evento','err');return;}
  const ev=(DB.eventos||[]).find(e=>e.id===id);if(!ev)return;
  Object.assign(ev,d);
  closeModal();toast('💾 Guardando...','info');
  await saveDB();toast('✅ Evento actualizado','ok');
  renderEventosAdmin();
}
function confirmarDelEvento(id){
  const ev=(DB.eventos||[]).find(e=>e.id===id);if(!ev)return;
  openSheet('🗑','Eliminar evento','',`
    <p style="font-size:14px;color:var(--text);margin-bottom:16px;">¿Eliminar <strong>${ev.nombre}</strong>? Esta acción no se puede deshacer.</p>
    <div style="display:flex;gap:10px;">
      <button class="btn boutline" onclick="closeModal()" style="flex:1;">Cancelar</button>
      <button class="btn bred" onclick="closeModal();doDelEvento('${id}')" style="flex:1;">Eliminar</button>
    </div>
  `);
}
async function doDelEvento(id){
  DB.eventos=(DB.eventos||[]).filter(e=>e.id!==id);
  toast('💾 Guardando...','info');await saveDB();toast('Evento eliminado','ok');
  renderEventosAdmin();
  renderEventosPV();
}

function openFormCulto(fechaStr){
  const ov=(DB.eventosCultosOverride||{})[fechaStr]||{};
  const nom=ov.nombre||'';
  openSheet('⚔️','Editar culto',`📅 ${fechaStr}`,''
    +`<div class="fr"><label>Nombre a mostrar</label><input id="evc-nombre" value="${(nom||'').replace(/"/g,'&quot;')}" placeholder="Ej: Culto de Caballeros · Evidencia de..."></div>`
    +`<button class="btn bteal bfull" onclick="doSaveCultoOverride('${fechaStr}')">💾 Guardar</button>`
  );
}
async function doSaveCultoOverride(fechaStr){
  const nombre=document.getElementById('evc-nombre').value.trim();
  if(!DB.eventosCultosOverride)DB.eventosCultosOverride={};
  DB.eventosCultosOverride[fechaStr]={...(DB.eventosCultosOverride[fechaStr]||{}),nombre:nombre||undefined,oculto:false};
  closeModal();toast('💾 Guardando...','info');await saveDB();toast('✅ Guardado','ok');
  renderEventosAdmin();renderEventosPV();
}
function confirmarDelCulto(fechaStr){
  openSheet('🗑','Ocultar culto','',`
    <p style="font-size:14px;color:var(--text);margin-bottom:16px;">¿Ocultar este culto de la lista? Podrás volver a mostrarlo editando.</p>
    <div style="display:flex;gap:10px;">
      <button class="btn boutline" onclick="closeModal()" style="flex:1;">Cancelar</button>
      <button class="btn bred" onclick="closeModal();doDelCultoOverride('${fechaStr}')" style="flex:1;">Ocultar</button>
    </div>
  `);
}
async function doDelCultoOverride(fechaStr){
  if(!DB.eventosCultosOverride)DB.eventosCultosOverride={};
  DB.eventosCultosOverride[fechaStr]={...(DB.eventosCultosOverride[fechaStr]||{}),oculto:true};
  toast('💾 Guardando...','info');await saveDB();toast('Culto oculto','ok');
  renderEventosAdmin();renderEventosPV();
}

function openFormEstudio(fechaStr){
  const ov=(DB.eventosEstudiosOverride||{})[fechaStr]||{};
  const nom=ov.nombre||'';
  openSheet('📚','Editar estudio',`📅 ${fechaStr}`,''
    +`<div class="fr"><label>Nombre a mostrar</label><input id="eve-nombre" value="${(nom||'').replace(/"/g,'&quot;')}" placeholder="Ej: Estudio de las Dispensaciones"></div>`
    +`<button class="btn bteal bfull" onclick="doSaveEstudioOverride('${fechaStr}')">💾 Guardar</button>`
  );
}
async function doSaveEstudioOverride(fechaStr){
  const nombre=document.getElementById('eve-nombre').value.trim();
  if(!DB.eventosEstudiosOverride)DB.eventosEstudiosOverride={};
  DB.eventosEstudiosOverride[fechaStr]={...(DB.eventosEstudiosOverride[fechaStr]||{}),nombre:nombre||undefined,oculto:false};
  closeModal();toast('💾 Guardando...','info');await saveDB();toast('✅ Guardado','ok');
  renderEventosAdmin();renderEventosPV();
}
function confirmarDelEstudio(fechaStr){
  openSheet('🗑','Ocultar estudio','',`
    <p style="font-size:14px;color:var(--text);margin-bottom:16px;">¿Ocultar este estudio de la lista? Podrás volver a mostrarlo editando.</p>
    <div style="display:flex;gap:10px;">
      <button class="btn boutline" onclick="closeModal()" style="flex:1;">Cancelar</button>
      <button class="btn bred" onclick="closeModal();doDelEstudioOverride('${fechaStr}')" style="flex:1;">Ocultar</button>
    </div>
  `);
}
async function doDelEstudioOverride(fechaStr){
  if(!DB.eventosEstudiosOverride)DB.eventosEstudiosOverride={};
  DB.eventosEstudiosOverride[fechaStr]={...(DB.eventosEstudiosOverride[fechaStr]||{}),oculto:true};
  toast('💾 Guardando...','info');await saveDB();toast('Estudio oculto','ok');
  renderEventosAdmin();renderEventosPV();
}

