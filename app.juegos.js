/**
 * Trivia del desafío diario. 15 preguntas; 3 oportunidades (empezar de nuevo); puntos acumulados por lo lejos que llegue.
 */
(function(){
  'use strict';

  window.JUEGOS_INTERNOS_IDS = ['millonario'];

  var PREGUNTAS_CACHE = null;

  function shuffle(arr){
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function esc(s){ return String(s||'').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  /** Quita explicación o referencia al final de la opción para que la correcta no se distinga por texto extra (p. ej. "Texto (Génesis 1:1)" o "Texto — nota" -> "Texto") */
  function limpiarTexto(t){
    var s = String(t||'').trim();
    var i = s.indexOf(' (');
    if (i > 0) s = s.substring(0, i);
    i = s.indexOf(' —');
    if (i > 0) s = s.substring(0, i);
    return s.trim();
  }

  function cargarPreguntas(cb){
    if (PREGUNTAS_CACHE && Array.isArray(PREGUNTAS_CACHE)) { cb(PREGUNTAS_CACHE); return; }
    fetch('preguntas_biblicas.json').then(function(r){ return r.json(); }).then(function(data){
      PREGUNTAS_CACHE = data.preguntas || [];
      cb(PREGUNTAS_CACHE);
    }).catch(function(){
      PREGUNTAS_CACHE = [];
      cb([]);
    });
  }

  /** Normaliza pregunta: opciones limpias, índice correcto, opciones barajadas; incluye id para no repetir las ya acertadas */
  function normalizarPregunta(q){
    var op = (q.opciones || []).map(function(o){ return limpiarTexto(o); });
    var resp = limpiarTexto(q.respuesta);
    var idx = op.findIndex(function(o){ return o === resp; });
    if (idx < 0) idx = 0;
    var correctaTexto = op[idx];
    op = shuffle(op);
    var newIdx = op.findIndex(function(o){ return o === correctaTexto; });
    if (newIdx < 0) newIdx = 0;
    return { id: q.id, pregunta: q.pregunta, opciones: op, correcta: newIdx };
  }

  /** Arma 15 preguntas: 4 fácil, 4 medio, 4 difícil, 3 avanzado (si hay); si no hay suficientes de un nivel, completa con otros */
  function elegir15(preguntas){
    var facil = preguntas.filter(function(p){ return (p.nivel||'').toLowerCase() === 'facil'; });
    var medio = preguntas.filter(function(p){ return (p.nivel||'').toLowerCase() === 'medio'; });
    var dificil = preguntas.filter(function(p){ return (p.nivel||'').toLowerCase() === 'dificil'; });
    var avanzado = preguntas.filter(function(p){ return (p.nivel||'').toLowerCase() === 'avanzado'; });
    var a = shuffle(facil).slice(0, 4).concat(shuffle(medio).slice(0, 4)).concat(shuffle(dificil).slice(0, 4)).concat(shuffle(avanzado).slice(0, 3));
    if (a.length < 15) {
      var idsUsados = new Set(a.map(function(p){ return p.id; }));
      var rest = preguntas.filter(function(p){ return !idsUsados.has(p.id); });
      a = a.concat(shuffle(rest).slice(0, 15 - a.length));
    }
    return a.slice(0, 15).map(normalizarPregunta);
  }

  function renderMillonario(containerId, reiniciosUsados){
    reiniciosUsados = typeof reiniciosUsados === 'number' ? reiniciosUsados : 0;
    var el = document.getElementById(containerId);
    if (!el) return;
    var db = typeof _db === 'function' ? _db() : {};
    var cabId = typeof currentCabId !== 'undefined' ? currentCabId : null;
    var cab = cabId ? (db.caballeros || []).find(function(c){ return c.id === cabId; }) : null;
    var hoy = typeof hoyStr === 'function' ? hoyStr() : '';
    if (cab && hoy && cab.honorDesafioFechaIntentos === hoy && (cab.honorDesafioIntentosHoy || 0) >= 3) {
      el.innerHTML = '<div class="pv-desafio-card-interno" style="text-align:center;padding:24px;"><div style="font-size:14px;font-weight:700;color:var(--text2);">Has usado tus 3 intentos de hoy.</div><div style="font-size:12px;color:var(--text3);margin-top:6px;">Vuelve mañana.</div></div>';
      return;
    }

    el.innerHTML = '<div class="juego-mill-wrap" style="text-align:center;padding:32px 24px;"><div style="font-size:14px;color:var(--text2);">Cargando preguntas…</div><div style="margin-top:12px;height:4px;background:rgba(58,171,186,0.2);border-radius:999px;overflow:hidden;"><div style="height:100%;width:40%;background:var(--teal);border-radius:999px;animation:juego-mill-pulse 1s ease-in-out infinite;"></div></div></div>';
    if (reiniciosUsados === 0) window.millonarioMejorPuntos = 0;
    cargarPreguntas(function(todas){
      if (!todas.length) {
        el.innerHTML = '<div class="juego-mill-wrap" style="padding:20px;border-color:rgba(239,68,68,0.3);"><div style="font-size:13px;color:#b91c1c;font-weight:600;">No se pudieron cargar las preguntas. Revisa que exista preguntas_biblicas.json</div></div>';
        return;
      }
      window.millonarioTotalPreguntasDb = todas.length;
      var setAcertadas = new Set(cab ? (cab.honorPreguntasAcertadasIds || []) : []);
      (window.millonarioPreguntasIdsCorrectas || []).forEach(function(id){ setAcertadas.add(id); });
      var disponibles = todas.filter(function(p){ return !setAcertadas.has(p.id); });
      if (disponibles.length < 15) disponibles = todas;
      var preguntas = elegir15(disponibles);
      window.millonarioPuntosObtenidos = 0;
      if (reiniciosUsados === 0) window.millonarioPreguntasIdsCorrectas = [];
      if (!Array.isArray(window.millonarioPreguntasIdsCorrectas)) window.millonarioPreguntasIdsCorrectas = [];
      var respuestas = [];
      var idx = 0;

      function getRacha(){
        var c = cabId && _db ? (_db().caballeros || []).find(function(c){ return c.id === cabId; }) : null;
        if (!c) return 0;
        return c.honorRacha || 0;
      }

      function pintar(){
        if (idx >= preguntas.length) {
          var correctas = respuestas.filter(function(r, i){ return r === preguntas[i].correcta; }).length;
          window.millonarioPuntosObtenidos = correctas;
          window.millonarioMejorPuntos = Math.max(window.millonarioMejorPuntos || 0, correctas);
          var racha = getRacha();
          if (typeof completarDesafioCaballeroHoy === 'function') completarDesafioCaballeroHoy(correctas);
          el.innerHTML = '<div class="juego-mill-wrap juego-mill-result">' +
            '<h3>🎉 Desafío completado</h3>' +
            '<div class="score-line">Puntuación: <strong>' + correctas + '</strong> de 15</div>' +
            '<div style="font-size:14px;color:var(--text2);margin-bottom:8px;">Puntuación máxima: <strong style="color:var(--teal2);">' + (window.millonarioMejorPuntos || correctas) + '</strong></div>' +
            '<div style="font-size:13px;color:var(--text2);">Días de racha: <strong>' + racha + '</strong></div></div>';
          return;
        }
        var q = preguntas[idx];
        var puntuacionActual = respuestas.filter(function(r, i){ return r === preguntas[i].correcta; }).length;
        var pct = preguntas.length ? Math.round(((idx + 1) / preguntas.length) * 100) : 0;
        var opHtml = q.opciones.map(function(op, i){
          return '<div role="button" tabindex="0" class="juego-mill-op" data-i="' + i + '">' + esc(op) + '</div>';
        }).join('');
        el.innerHTML = '<div class="juego-mill-wrap" tabindex="-1">' +
          '<div class="juego-mill-progress"><span>Pregunta ' + (idx + 1) + ' de 15</span><span class="score">Puntuación: ' + puntuacionActual + '</span></div>' +
          '<div class="juego-mill-bar"><div class="juego-mill-bar-fill" style="width:' + pct + '%"></div></div>' +
          '<div class="juego-mill-pregunta">' + esc(q.pregunta) + '</div>' +
          '<div class="juego-mill-opciones">' + opHtml + '</div></div>';

        var wrap = el.querySelector('.juego-mill-wrap');
        function quitarMarcado(){
          if (document.activeElement && typeof document.activeElement.blur === 'function') document.activeElement.blur();
          if (wrap && typeof wrap.focus === 'function') wrap.focus();
        }
        quitarMarcado();
        if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(quitarMarcado);
        else setTimeout(quitarMarcado, 0);
        var opcionesDiv = el.querySelector('.juego-mill-opciones');
        var btns = el.querySelectorAll('.juego-mill-op');

        function elegir(i){
          var correcta = q.correcta;
          btns.forEach(function(b){ b.setAttribute('aria-disabled', 'true'); b.style.pointerEvents = 'none'; });
            if (i === correcta) {
              if (Array.isArray(window.millonarioPreguntasIdsCorrectas) && q.id != null) window.millonarioPreguntasIdsCorrectas.push(q.id);
              var btn = el.querySelector('.juego-mill-op[data-i="' + i + '"]');
              if (btn) { btn.style.background = 'linear-gradient(135deg,#86efac,#4ade80)'; btn.style.borderColor = '#22c55e'; btn.style.color = '#166534'; }
              setTimeout(function(){ respuestas.push(i); idx++; pintar(); }, 800);
            } else {
              var btnErr = el.querySelector('.juego-mill-op[data-i="' + i + '"]');
              if (btnErr) { btnErr.style.background = 'linear-gradient(135deg,#fca5a5,#ef4444)'; btnErr.style.borderColor = '#dc2626'; btnErr.style.color = '#fff'; }
              var correctBtn = el.querySelector('.juego-mill-op[data-i="' + correcta + '"]');
              if (correctBtn) {
                correctBtn.style.background = 'linear-gradient(135deg,#86efac,#4ade80)';
                correctBtn.style.borderColor = '#22c55e';
                correctBtn.style.color = '#166534';
              }
              var correctasFail = respuestas.filter(function(r, ix){ return r === preguntas[ix].correcta; }).length;
              window.millonarioPuntosObtenidos = correctasFail;
              window.millonarioMejorPuntos = Math.max(window.millonarioMejorPuntos || 0, correctasFail);
              var msg = document.createElement('div');
              msg.className = 'juego-mill-fail-msg';
              msg.textContent = 'La respuesta correcta era: ' + q.opciones[correcta];
              opcionesDiv.appendChild(msg);
              var puntuacionLinea = document.createElement('div');
              puntuacionLinea.style.cssText = 'margin-top:10px;font-size:13px;color:var(--text2);font-weight:600;';
              puntuacionLinea.textContent = 'Puntuación: ' + correctasFail + ' de 15 · Puntuación máxima: ' + (window.millonarioMejorPuntos || correctasFail);
              opcionesDiv.appendChild(puntuacionLinea);
              if (reiniciosUsados < 2) {
                var textoBoton = reiniciosUsados === 0 ? 'Empezar de nuevo (te quedan 2 oportunidades)' : 'Empezar de nuevo (última oportunidad)';
                var btnReintentar = document.createElement('button');
                btnReintentar.type = 'button';
                btnReintentar.className = 'juego-mill-reintentar';
                btnReintentar.textContent = textoBoton;
                btnReintentar.addEventListener('click', function(){
                  if (typeof renderMillonario === 'function') renderMillonario(containerId, reiniciosUsados + 1);
                });
                opcionesDiv.appendChild(btnReintentar);
              } else {
                var aviso = document.createElement('div');
                aviso.className = 'juego-mill-aviso';
                aviso.textContent = 'Has usado tus 2 oportunidades de empezar de nuevo. Se ha marcado el desafío como cumplido con tu puntuación.';
                opcionesDiv.appendChild(aviso);
                if (typeof completarDesafioCaballeroHoy === 'function') completarDesafioCaballeroHoy(window.millonarioPuntosObtenidos);
              }
            }
        }

        btns.forEach(function(btn){
          btn.addEventListener('click', function(){
            if (btn.getAttribute('aria-disabled') === 'true') return;
            var i = parseInt(btn.getAttribute('data-i'), 10);
            elegir(i);
          });
          btn.addEventListener('keydown', function(ev){
            if (ev.key !== 'Enter' && ev.key !== ' ') return;
            ev.preventDefault();
            if (btn.getAttribute('aria-disabled') === 'true') return;
            var i = parseInt(btn.getAttribute('data-i'), 10);
            elegir(i);
          });
        });
      }
      pintar();
    });
  }

  window.renderJuegoInterno = function(containerId, juegoId){
    if (juegoId === 'millonario') renderMillonario(containerId, 0);
  };

  window.esJuegoInterno = function(juegoId){
    return window.JUEGOS_INTERNOS_IDS && window.JUEGOS_INTERNOS_IDS.indexOf(juegoId) !== -1;
  };
})();
