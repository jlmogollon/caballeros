// PETICIONES DE ORACIÓN — extraído desde app.js
let petAnon=false;

function toggleAnon(){
  petAnon=!petAnon;
  const box=document.getElementById('pet-anon-box');
  const lbl=document.getElementById('pet-anon-lbl');
  const toggle=document.getElementById('pet-anon-toggle');
  box.textContent=petAnon?'✓':'';
  box.style.background=petAnon?'#8b5cf6':'white';
  box.style.borderColor=petAnon?'#8b5cf6':'#d1d5db';
  box.style.color='white';
  toggle.style.borderColor=petAnon?'#8b5cf6':'#e9edf2';
  toggle.style.background=petAnon?'rgba(139,92,246,0.08)':'#f9fafb';
  lbl.style.color=petAnon?'#6d28d9':'#4b5563';
}

async function enviarPeticion(){
  const texto=document.getElementById('pet-texto').value.trim();
  if(!texto){toast('Escribe tu petición primero','err');return;}
  const cab=DB.caballeros.find(x=>x.id===currentCabId);
  const nombre=petAnon?'Anónimo':(cab?cab.nombre:'Hermano');
  const id='pet_'+Date.now();
  const peticion={id,texto,nombre,cabId:currentCabId,ts:Date.now(),fecha:new Date().toLocaleDateString('es-CO',{day:'2-digit',month:'short'})};
  if(!DB.peticiones)DB.peticiones=[];
  DB.peticiones.push(peticion);
  try{
    toast('💾 Enviando...','info');
    await saveDB();
    document.getElementById('pet-texto').value='';
    if(petAnon){petAnon=false;toggleAnon();}
    toast('🙏 Petición enviada. Los hermanos orarán por ti','ok');
    cargarPeticiones();
  }catch(e){
    DB.peticiones=DB.peticiones.filter(p=>p.id!==id);
    toast('⚠️ Error al enviar. Intenta de nuevo.','err');
    console.error(e);
  }
}

function borrarPeticion(id){
  const card=document.getElementById('pet-card-'+id);
  if(!card)return;
  // Si ya hay confirmación abierta, la cerramos
  const ya=document.getElementById('pet-confirm-'+id);
  if(ya){ya.remove();return;}
  const conf=document.createElement('div');
  conf.id='pet-confirm-'+id;
  conf.className='panel';
  conf.style.marginTop='8px';
  conf.style.background='rgba(239,68,68,0.07)';
  conf.style.borderColor='rgba(239,68,68,0.2)';
  conf.innerHTML=`<span style="font-size:12px;color:#b91c1c;font-weight:600;">¿Borrar esta petición?</span>
    <div style="display:flex;gap:6px;">
      <button onclick="document.getElementById('pet-confirm-${id}').remove()" class="btn" style="background:white;border:1px solid #e5e7eb;color:#6b7280;border-radius:6px;padding:4px 10px;font-size:11px;">Cancelar</button>
      <button onclick="confirmarBorrarPeticion('${id}')" class="btn" style="background:#ef4444;border:none;color:white;border-radius:6px;padding:4px 10px;font-size:11px;">Borrar</button>
    </div>`;
  card.appendChild(conf);
}

async function confirmarBorrarPeticion(id){
  DB.peticiones=(DB.peticiones||[]).filter(p=>p.id!==id);
  try{
    toast('💾 Guardando...','info');
    await saveDB();
    toast('✅ Petición eliminada','ok');
  }catch(e){toast('⚠️ Error al guardar','err');console.error(e);}
  cargarPeticiones();
  cargarPeticionesAdmin();
}

function cargarPeticiones(esAdmin=false){
  const listaId=esAdmin?'admin-peticiones-lista':'peticiones-lista';
  const lista=document.getElementById(listaId);
  if(!lista)return;
  const badge=document.getElementById('peticiones-count-badge');
  const adminBadge=document.getElementById('admin-pet-badge');
  const items=[...(DB.peticiones||[])].sort((a,b)=>b.ts-a.ts);
  const count=items.length;
  if(badge)badge.textContent=`${count} petición${count!==1?'es':''}`;
  if(adminBadge)adminBadge.textContent=`${count} petición${count!==1?'es':''}`;
  if(count===0){
    lista.innerHTML=`<div style="text-align:center;padding:24px 16px;background:white;border-radius:14px;border:1.5px dashed #e9edf2;">
      <div style="font-size:28px;margin-bottom:8px;">🕊️</div>
      <div style="font-size:13px;color:#9ca3af;font-weight:600;">No hay peticiones esta semana</div>
      <div style="font-size:11px;color:#d1d5db;margin-top:4px;">Sé el primero en compartir una</div>
    </div>`;
    return;
  }
  lista.innerHTML=items.map(p=>{
    const isAnon=p.nombre==='Anónimo';
    const nombreMostrar=esAdmin&&isAnon&&p.cabId?(DB.caballeros||[]).find(c=>c.id===p.cabId)?.nombre||p.nombre:p.nombre;
    const avColor=isAnon&&!esAdmin?'#9ca3af':'#8b5cf6';
    const avIcon=isAnon&&!esAdmin?'🤍':'🙏';
    const puedeborrar=esAdmin||(p.cabId&&p.cabId===currentCabId);
    return`<div id="pet-card-${p.id}" class="panel pet-card">
      <div style="position:absolute;top:0;left:0;width:3px;height:100%;background:linear-gradient(180deg,#8b5cf6,#6d28d9);border-radius:3px 0 0 3px;"></div>
      <div style="display:flex;align-items:flex-start;gap:10px;margin-left:4px;">
        <div style="width:34px;height:34px;border-radius:50%;background:${isAnon&&!esAdmin?'rgba(156,163,175,0.15)':'rgba(139,92,246,0.12)'};display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;border:1.5px solid ${isAnon&&!esAdmin?'rgba(156,163,175,0.3)':'rgba(139,92,246,0.25)'};">${avIcon}</div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
            <span style="font-family:'Montserrat',sans-serif;font-size:11px;font-weight:800;color:${avColor};">${nombreMostrar}${esAdmin&&isAnon?' (anónimo)':''}</span>
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:10px;color:#d1d5db;">${p.fecha||''}</span>
              ${puedeborrar?`<button onclick="borrarPeticion('${p.id}')" style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);color:#ef4444;border-radius:6px;padding:3px 8px;font-size:10px;font-weight:700;cursor:pointer;font-family:'Montserrat',sans-serif;" title="Eliminar">🗑</button>`:''}
            </div>
          </div>
          <div style="font-size:13px;color:#374151;line-height:1.5;">${p.texto}</div>
          <div style="margin-top:6px;font-size:11px;color:#a78bfa;font-family:'Caveat',cursive;">🙏 Orando por esto</div>
        </div>
      </div>
    </div>`;
  }).join('');
}

function cargarPeticionesAdmin(){cargarPeticiones(true);}

