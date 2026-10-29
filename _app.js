
(function () {
  "use strict";

  /* ============================================================
     ELENCO BASE (importado das listas do WhatsApp)
     Formato: [nome, nivel (1-3), casa/posicao]
     O nivel vira a nota: nivel 3 -> 5 estrelas, 2 -> 3, 1 -> 1
     ============================================================ */
  var ELENCO_BASE = [
    ["Lelê", 3, 1], ["Gil", 3, 2], ["Hugo", 3, 3], ["Will", 3, 4],
    ["Gustavo", 3, 5], ["Su", 3, 6], ["Rhayanne", 3, 7], ["Danilo", 3, 8],
    ["Lucas", 3, 9], ["Gabriel", 3, 10], ["Bia", 3, 11],
    ["Rafinha", 3, 12], ["Gabs", 2, 13], ["Vitor", 2, 14], ["Alan", 2, 15],
    ["Iarlon", 2, 16], ["Tainah", 2, 17], ["Priscila", 2, 18],
    ["Ivanir", 1, 19], ["Edson", 1, 20], ["Marcio", 1, 21], ["Joao", 1, 22],
    ["Mel", 1, 23], ["Nick", 1, 24], ["Erika", 1, 25], ["Hudson", 1, 26],
    ["Duda", 1, 27]
  ];

  /* Converte nivel (1-3) em estrelas (0-5) */
  function nivelParaEstrelas(nivel) {
    var n = Number(nivel) || 1;
    if (n >= 3) return 5;
    if (n === 2) return 3;
    return 1;
  }

  function elencoBaseParaJogadores() {
    return ELENCO_BASE.map(function (l, i) {
      return {
        id: "b" + i,
        nome: l[0],
        estrelas: nivelParaEstrelas(l[1]),
        nivel: l[1],
        casa: l[2],
        ativo: true
      };
    });
  }

  /* ===== CONFIGURAÇÃO ===== */
  var NUM_TEAMS = 5;
  var STORAGE_KEY = "tabela_volei_cores_v2";

  /* ===== SINCRONIZAÇÃO EM TEMPO REAL (Firebase Realtime Database) ===== */
  var DB_URL = "https://tabela-volei-dc585-default-rtdb.firebaseio.com";
  var DB_PATH = "estado";
  var API_KEY = "AIzaSyC6j7QjOblhXY-jvWwlEPnThsIy3ah0-JI";
  var ADMIN_EMAIL = "mesario@voleidobosque.app";
  var SESSION_KEY = "volei_admin_session";

  /* Senha do Mesário — guardada apenas como hash SHA-256 (nunca em texto puro) */
  var ADMIN_PASS_SHA256 = "7db55b7bec9e4495eb39160a09befc4995c0bc53da4b1d2695a6f110b061a97e";

  /* Ordem exata dos 10 confrontos (NÃO reorganizar) */
  var MATCH_ORDER = [
    [0, 1], /* J1:  Time 1 x Time 2 */
    [2, 3], /* J2:  Time 3 x Time 4 */
    [0, 4], /* J3:  Time 1 x Time 5 */
    [1, 2], /* J4:  Time 2 x Time 3 */
    [3, 4], /* J5:  Time 4 x Time 5 */
    [0, 2], /* J6:  Time 1 x Time 3 */
    [1, 3], /* J7:  Time 2 x Time 4 */
    [2, 4], /* J8:  Time 3 x Time 5 */
    [0, 3], /* J9:  Time 1 x Time 4 */
    [1, 4]  /* J10: Time 2 x Time 5 */
  ];

  var state = loadState();

  function defaultState() {
    var teams = [];
    for (var i = 0; i < NUM_TEAMS; i++) {
      teams.push("TIME - " + (i + 1));
    }
    return {
      teams: teams,
      cfg: { win: 3, loss: 0 },
      scores: {},
      finals: {
        f34: { a: null, b: null },
        f12: { a: null, b: null }
      },
      jogadores: [],
      formacao: null
    };
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      var s = JSON.parse(raw);
      if (s && Array.isArray(s.teams) && s.teams.length === NUM_TEAMS) {
        s.cfg = s.cfg || { win: 3, loss: 0 };
        s.scores = s.scores || {};
        s.finals = s.finals || { f34: { a: null, b: null }, f12: { a: null, b: null } };
        if (!s.finals.f34) s.finals.f34 = { a: null, b: null };
        if (!s.finals.f12) s.finals.f12 = { a: null, b: null };
        s.jogadores = Array.isArray(s.jogadores) ? s.jogadores.map(function (j) {
          if (j.ativo === undefined) j.ativo = true;
          return j;
        }) : [];
        s.formacao = s.formacao || null;
        return s;
      }
    } catch (err) {
      /* dados corrompidos: começa do zero */
    }
    return defaultState();
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      /* armazenamento indisponível: segue em memória */
    }
  }

  /* ============================================================
     SHA-256 PURO (sem dependencias externas)
     Usado para comparar a senha do Mesario sem trafegá-la em claro.
     ============================================================ */
  function sha256Hex(msg) {
    var K = new Uint32Array([
      0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
      0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
      0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
      0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
      0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
      0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
      0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
      0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
    ]);
    var Hh = new Uint32Array([
      0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19
    ]);
    function rotr(x, n) { return ((x >>> n) | (x << (32 - n))) >>> 0; }

    var utf8 = unescape(encodeURIComponent(String(msg)));
    var len = utf8.length;
    var bitLenHi = Math.floor(len / 536870912);
    var bitLenLo = (len << 3) >>> 0;
    var withPad = len + 1;
    var padLen = (56 - (withPad % 64) + 64) % 64;
    var total = withPad + padLen + 8;
    var bytes = new Uint8Array(total);
    for (var i = 0; i < len; i++) bytes[i] = utf8.charCodeAt(i);
    bytes[len] = 0x80;
    bytes[total-8]=(bitLenHi>>>24)&0xff; bytes[total-7]=(bitLenHi>>>16)&0xff;
    bytes[total-6]=(bitLenHi>>>8)&0xff;  bytes[total-5]=bitLenHi&0xff;
    bytes[total-4]=(bitLenLo>>>24)&0xff; bytes[total-3]=(bitLenLo>>>16)&0xff;
    bytes[total-2]=(bitLenLo>>>8)&0xff;  bytes[total-1]=bitLenLo&0xff;

    var w = new Uint32Array(64);
    var off, t;
    for (off = 0; off < total; off += 64) {
      for (t = 0; t < 16; t++) {
        w[t] = (bytes[off+t*4]<<24) | (bytes[off+t*4+1]<<16) |
               (bytes[off+t*4+2]<<8) | bytes[off+t*4+3];
      }
      for (t = 16; t < 64; t++) {
        var s0 = rotr(w[t-15],7) ^ rotr(w[t-15],18) ^ (w[t-15]>>>3);
        var s1 = rotr(w[t-2],17) ^ rotr(w[t-2],19) ^ (w[t-2]>>>10);
        w[t] = (w[t-16] + s0 + w[t-7] + s1) >>> 0;
      }
      var a=Hh[0],b=Hh[1],c=Hh[2],d=Hh[3],e=Hh[4],f=Hh[5],g=Hh[6],h=Hh[7];
      for (t = 0; t < 64; t++) {
        var S1 = rotr(e,6) ^ rotr(e,11) ^ rotr(e,25);
        var ch = (e & f) ^ ((~e) & g);
        var t1 = (h + S1 + ch + K[t] + w[t]) >>> 0;
        var S0 = rotr(a,2) ^ rotr(a,13) ^ rotr(a,22);
        var maj = (a & b) ^ (a & c) ^ (b & c);
        var t2 = (S0 + maj) >>> 0;
        h=g; g=f; f=e; e=(d+t1)>>>0; d=c; c=b; b=a; a=(t1+t2)>>>0;
      }
      Hh[0]=(Hh[0]+a)>>>0; Hh[1]=(Hh[1]+b)>>>0; Hh[2]=(Hh[2]+c)>>>0; Hh[3]=(Hh[3]+d)>>>0;
      Hh[4]=(Hh[4]+e)>>>0; Hh[5]=(Hh[5]+f)>>>0; Hh[6]=(Hh[6]+g)>>>0; Hh[7]=(Hh[7]+h)>>>0;
    }
    var out = "";
    for (i = 0; i < 8; i++) out += ("00000000" + Hh[i].toString(16)).slice(-8);
    return out;
  }

  /* ============================================================
     SINCRONIZACAO EM TEMPO REAL — Firebase Realtime Database
     - Leitura/escrita via REST (sem SDK: app continua em 1 arquivo)
     - Streaming via SSE (text/event-stream) para atualizacao instantanea
     ============================================================ */
  var dbRef = DB_URL + "/" + DB_PATH + ".json";
  var esAdmin = false;
  var sessao = null;            /* { idToken, refreshToken, expiraEm } */
  var liveState = "offline";    /* offline | somente-leitura | conectado */
  var aplicandoRemoto = false;  /* evita eco: remoto -> render -> write */
  var pendingWrite = null;
  var streamCtrl = null;
  var reconnectDelay = 0;
  var ultimoPublicadoEm = 0;   /* timestamp da ultima escrita local */
  var ultimoRemotoEm = 0;     /* timestamp do ultimo dado remoto aplicado */

  /* ---- escrita no banco (com token do Mesario, quando houver) ---- */
  function dbWrite(dados) {
    var url = dbRef;
    var init = {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados)
    };
    if (sessao && sessao.idToken) {
      url += "?auth=" + encodeURIComponent(sessao.idToken);
    }
    return fetch(url, init).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }

  /* ---- leitura do banco ---- */
  function dbRead() {
    return fetch(dbRef).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }

  /* ---- estado remoto -> estado local (sem eco) ---- */
  function aplicarEstadoRemoto(dados) {
    if (!dados || !Array.isArray(dados.teams) || dados.teams.length !== NUM_TEAMS) return;

    /* Se o Mesario acabou de publicar, nao re-aplica o que acabou de ir para a
       nuvem (evita sobrescrever um placar mais novo com o estado local antigo). */
    if (dados.atualizadoEm && ultimoPublicadoEm && dados.atualizadoEm <= ultimoPublicadoEm) {
      return;
    }
    if (dados.atualizadoEm) ultimoRemotoEm = dados.atualizadoEm;

    state.teams = dados.teams;
    state.cfg = dados.cfg || { win: 3, loss: 0 };
    state.scores = dados.scores || {};
    state.finals = dados.finals || { f34: { a: null, b: null }, f12: { a: null, b: null } };
    if (!state.finals.f34) state.finals.f34 = { a: null, b: null };
    if (!state.finals.f12) state.finals.f12 = { a: null, b: null };
    state.jogadores = Array.isArray(dados.jogadores) ? dados.jogadores : [];
    state.formacao = dados.formacao || null;
    save();
    aplicandoRemoto = true;
    try {
      cfgWin.value = state.cfg.win;
      cfgLoss.value = state.cfg.loss;
      renderAll();
    } finally {
      aplicandoRemoto = false;
    }
  }

  /* ---- escrita local -> banco (com debounce) ---- */
  var writeTimer = null;
  function publicarEstado() {
    if (aplicandoRemoto) return;
    if (!esAdmin) return;              /* so o Mesario publica */
    if (writeTimer) clearTimeout(writeTimer);
    writeTimer = setTimeout(function () {
      writeTimer = null;
      var agora = Date.now();
      var payload = {
        teams: state.teams,
        cfg: state.cfg,
        scores: state.scores,
        finals: state.finals,
        jogadores: state.jogadores,
        formacao: state.formacao,
        atualizadoEm: agora
      };
      ultimoPublicadoEm = agora;
      dbWrite(payload).then(function () {
        setLive("conectado", "Placar publicado — todos acompanham em tempo real");
      }).catch(function (err) {
        ultimoPublicadoEm = 0;
        setLive("offline", "Sem conexão para publicar. Verifique sua internet.");
      });
    }, 350);
  }

  /* ---- streaming SSE: recebe mudancas do Mesaro em tempo real ---- */
  function iniciarStream() {
    if (streamCtrl) return;
    if (typeof fetch === "undefined" || typeof ReadableStream === "undefined") return;

    streamCtrl = new AbortController();
    var url = dbRef + "?print=silent";

    fetch(url, {
      headers: { "Accept": "text/event-stream" },
      signal: streamCtrl.signal
    }).then(function (res) {
      if (!res.ok || !res.body) throw new Error("stream " + res.status);
      setLive(esAdmin ? "conectado" : "somente-leitura",
              esAdmin ? "Conectado — suas alterações vão ao vivo"
                       : "Acompanhe os resultados em tempo real");
      var reader = res.body.getReader();
      var dec = new TextDecoder();
      var buffer = "";

      function processar(bloco) {
        var linhas = bloco.split("\n");
        for (var i = 0; i < linhas.length; i++) {
          var ln = linhas[i].trim();
          if (ln.indexOf("data:") !== 0) continue;
          var json = ln.slice(5).trim();
          if (!json || json === "null") continue;
          try {
            var ev = JSON.parse(json);
            if (ev && ev.path === "/" && ev.data && !aplicandoRemoto) {
              aplicarEstadoRemoto(ev.data);
            }
          } catch (e) { /* payload malformado: ignora */ }
        }
      }

      (function pump() {
        return reader.read().then(function (r) {
          if (r.done) return;
          buffer += dec.decode(r.value, { stream: true });
          var partes = buffer.split("\n\n");
          buffer = partes.pop();
          for (var p = 0; p < partes.length; p++) processar(partes[p]);
          return pump();
        });
      })().catch(function () { /* stream encerrado: reconecta abaixo */ });
    }).catch(function () {
      setLive("offline", "Sem conexão — mostrando os dados salvos neste aparelho");
      streamCtrl = null;
      /* reconexao com backoff: evita loop apertado quando o banco esta fora do ar */
      reconnectDelay = Math.min(reconnectDelay ? reconnectDelay * 2 : 4000, 60000);
      setTimeout(function () { if (!streamCtrl) iniciarStream(); }, reconnectDelay);
    });
  }

  function pararStream() {
    if (streamCtrl) {
      try { streamCtrl.abort(); } catch (e) {}
      streamCtrl = null;
    }
  }

  /* ---- indicador visual de status ---- */
  var avisoAuthDesativado = false;

  function setLive(st, msg) {
    liveState = st;
    var bar = document.getElementById("liveBar");
    var dot = document.getElementById("liveDot");
    var lbl = document.getElementById("liveLabel");
    var m = document.getElementById("liveMsg");
    if (!bar) return;
    bar.hidden = false;
    var offline = (st === "offline");
    dot.classList.toggle("offline", offline);
    lbl.classList.toggle("offline", offline);
    lbl.textContent = offline ? "OFFLINE" : "AO VIVO";
    var texto = msg || "";
    /* Preserva o aviso de seguranca: Firebase Auth desligado = escrita publica. */
    if (avisoAuthDesativado && !/Auth ainda/i.test(texto)) {
      texto = texto + " · ⚠ Firebase Auth não ativado (escrita pública)";
    }
    m.textContent = texto;
    m.classList.toggle("admin", esAdmin);
  }

  /* ---- sessao do Mesario (Firebase Auth, email/senha) ---- */
  function salvarSessao(s) {
    sessao = s;
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch (e) {}
  }

  function carregarSessao() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (!s || !s.idToken || !s.refreshToken) return null;
      if (!s.expiraEm || s.expiraEm < Date.now()) return null;
      return s;
    } catch (e) { return null; }
  }

  function limparSessao() {
    sessao = null;
    try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
  }

  /* renova o token de acesso (idToken dura ~1h) */
  function renovarToken() {
    if (!sessao || !sessao.refreshToken) return Promise.resolve(false);
    return fetch(
      "https://securetoken.googleapis.com/v1/token?key=" + API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "refresh_token",
          refresh_token: sessao.refreshToken
        })
      }
    ).then(function (r) {
      if (!r.ok) { limparSessao(); return false; }
      return r.json().then(function (d) {
        if (!d.access_token) { limparSessao(); return false; }
        sessao.idToken = d.access_token;
        sessao.expiraEm = Date.now() + (Number(d.expires_in || 3600) - 60) * 1000;
        salvarSessao(sessao);
        return true;
      });
    }).catch(function () { return false; });
  }

  /* ============================================================
     LOGIN DO MESARIO — Firebase Auth (email/senha)
     Fluxo:
       1. valida a senha contra o hash SHA-256 local (nunca sai em claro);
       2. tenta login na conta do Mesaro;
       3. se a conta ainda NAO existe, cria automaticamente (auto-provisioning);
       4. guarda o idToken, que sera usado como `auth=` nas escritas do banco.
     Se o Firebase Auth ainda nao estiver ativado no projeto, o app
     funciona em modo "escrita publica" (as regras do banco aceitam).
     ============================================================ */

  var authEndpoint = "https://identitytoolkit.googleapis.com/v1/accounts:";

  function authPost(metodo, corpo) {
    return fetch(authEndpoint + metodo + "?key=" + API_KEY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo)
    }).then(function (r) {
      return r.json().then(function (d) {
        if (!d || typeof d !== "object") d = {};
        d.__status = r.status;
        return d;
      }, function () {
        return { __status: r.status, error: { message: "resposta invalida" } };
      });
    });
  }

  function guardarToken(d) {
    salvarSessao({
      idToken: d.idToken,
      refreshToken: d.refreshToken,
      expiraEm: Date.now() + (Number(d.expiresIn || 3600) - 60) * 1000
    });
  }

  /* login do Mesario: valida a senha e garante um token de escrita */
  function loginMesario(senha) {
    var hash = sha256Hex(senha);
    if (hash !== ADMIN_PASS_SHA256) {
      return Promise.reject(new Error("senha-invalida"));
    }

    /* 1) Tenta entrar na conta do Mesaro */
    return authPost("signInWithPassword", {
      email: ADMIN_EMAIL, password: senha, returnSecureToken: true
    }).then(function (d) {
      if (d.__status === 200 && d.idToken) {
        guardarToken(d);
        return { token: true };
      }

      /* 2) Conta ainda nao existe -> cria automaticamente */
      var msg = (d.error && d.error.message) || "";
      if (/EMAIL_EXISTS/i.test(msg)) {
        return Promise.reject(new Error("conta-existente-sem-senha"));
      }
      if (/CONFIGURATION_NOT_FOUND/i.test(msg)) {
        /* Firebase Auth ainda nao ativado no projeto:
           segue com a permissao publica do banco (funciona, porem menos seguro). */
        return { token: false, authDesativado: true };
      }
      if (/INVALID_PASSWORD|INVALID_LOGIN_CREDENTIALS/i.test(msg)) {
        return Promise.reject(new Error("senha-invalida"));
      }

      return authPost("signUp", {
        email: ADMIN_EMAIL, password: senha, returnSecureToken: true
      }).then(function (d2) {
        if (d2.__status === 200 && d2.idToken) {
          guardarToken(d2);
          return { token: true, recemCriado: true };
        }
        var m2 = (d2.error && d2.error.message) || "";
        if (/CONFIGURATION_NOT_FOUND/i.test(m2)) {
          return { token: false, authDesativado: true };
        }
        if (/EMAIL_EXISTS/i.test(m2)) {
          return Promise.reject(new Error("conta-existente-sem-senha"));
        }
        if (/WEAK_PASSWORD|PASSWORD_POLICY/i.test(m2)) {
          return Promise.reject(new Error("senha-fraca"));
        }
        return Promise.reject(new Error("falha-auth"));
      });
    }).catch(function (err) {
      if (err && err.message) throw err;
      /* Falha de rede: valida localmente e segue (banco publico ainda aceita). */
      return { token: false, offline: true };
    });
  }

  function sairMesario() {
    esAdmin = false;
    limparSessao();
    document.body.classList.remove("modo-admin");
    document.body.classList.add("modo-leitura");
    setLive("somente-leitura", "Modo leitura — acompanhando o placar ao vivo");
    var btn = document.getElementById("btnAdmin");
    if (btn) {
      btn.textContent = "🔓 Área do Mesário";
      btn.classList.remove("btn-admin-on");
    }
    renderAll();
  }

  function entrarMesario() {
    esAdmin = true;
    document.body.classList.remove("modo-leitura");
    document.body.classList.add("modo-admin");
    setLive("conectado", "Modo Mesário — suas alterações vão ao vivo para todos");
    var btn = document.getElementById("btnAdmin");
    if (btn) {
      btn.textContent = "🔒 Sair do Modo Mesário";
      btn.classList.add("btn-admin-on");
    }
    renderAll();
  }

  function matchKey(i, j) { return i + "-" + j; }

  function getScore(i, j) {
    var k = matchKey(i, j);
    if (!state.scores[k]) state.scores[k] = { a: null, b: null };
    return state.scores[k];
  }

  /* ===== ESTATÍSTICAS E CLASSIFICAÇÃO (lógica preservada) ===== */
  function computeStats() {
    var stats = state.teams.map(function (name, idx) {
      return {
        idx: idx, name: name,
        jogos: 0, vit: 0, der: 0,
        setsPro: 0, setsCon: 0, pontos: 0
      };
    });

    for (var m = 0; m < MATCH_ORDER.length; m++) {
      var pair = MATCH_ORDER[m];
      var i = pair[0], j = pair[1];
      var s = getScore(i, j);
      if (s.a == null || s.b == null) continue;

      stats[i].jogos++;
      stats[j].jogos++;
      stats[i].setsPro += s.a;
      stats[i].setsCon += s.b;
      stats[j].setsPro += s.b;
      stats[j].setsCon += s.a;

      if (s.a > s.b) {
        stats[i].vit++;
        stats[j].der++;
        stats[i].pontos += state.cfg.win;
        stats[j].pontos += state.cfg.loss;
      } else if (s.b > s.a) {
        stats[j].vit++;
        stats[i].der++;
        stats[j].pontos += state.cfg.win;
        stats[i].pontos += state.cfg.loss;
      }
    }
    return stats;
  }

  function saldo(s) { return s.setsPro - s.setsCon; }

  /* Critérios originais: Pontos -> Vitórias -> Saldo -> Sets Pró */
  function ranked() {
    var stats = computeStats();
    return stats.slice().sort(function (a, b) {
      return (b.pontos - a.pontos) ||
             (b.vit - a.vit) ||
             (saldo(b) - saldo(a)) ||
             (b.setsPro - a.setsPro) ||
             (a.idx - b.idx);
    });
  }

  function playedCount() {
    var n = 0;
    for (var m = 0; m < MATCH_ORDER.length; m++) {
      var s = getScore(MATCH_ORDER[m][0], MATCH_ORDER[m][1]);
      if (s.a != null && s.b != null) n++;
    }
    return n;
  }

  function allMatchesPlayed() { return playedCount() === MATCH_ORDER.length; }

  /* ===== HELPERS DE VISTA ===== */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function teamBadge(teamIdx) {
    return '<span class="team-badge t-' + teamIdx + '">' + esc(state.teams[teamIdx]) + '</span>';
  }

  function placeholderBadge(pos) {
    return '<span class="team-badge unknown">' + pos + 'º colocado</span>';
  }

  function saldoHtml(sd) {
    if (sd > 0) return '<span class="val-saldo-pos">+' + sd + '</span>';
    if (sd < 0) return '<span class="val-saldo-neg">' + sd + '</span>';
    return '<span class="val-saldo-zero">0</span>';
  }

  function parseScoreInput(value) {
    if (value === "") return null;
    var n = parseInt(value, 10);
    return isNaN(n) ? null : Math.max(0, n);
  }

  /* ===== CLASSIFICAÇÃO ===== */
  function renderStandings() {
    var rows = ranked();
    var tbody = document.querySelector("#standings tbody");
    tbody.innerHTML = "";

    rows.forEach(function (s, pos) {
      var place = pos + 1;
      var posClass = place <= 3 ? ("p" + place) : "pn";
      var rankClass = place <= 3 ? ("rank" + place) : "";
      var tr = document.createElement("tr");
      if (rankClass) tr.className = rankClass;

      tr.innerHTML =
        '<td><span class="pos-cell ' + posClass + '">' + place + 'º</span></td>' +
        '<td class="team-col">' +
          '<div class="team-input-row">' +
            '<span class="team-color-bar t-' + s.idx + '"></span>' +
            '<input class="teamname" data-team="' + s.idx + '" value="' + esc(s.name) + '" ' +
              'aria-label="Nome do time ' + (s.idx + 1) + '" maxlength="28">' +
          '</div>' +
        '</td>' +
        '<td>' + s.jogos + '</td>' +
        '<td><span class="val-win">' + s.vit + '</span></td>' +
        '<td>' + s.der + '</td>' +
        '<td>' + s.setsPro + '</td>' +
        '<td>' + s.setsCon + '</td>' +
        '<td>' + saldoHtml(saldo(s)) + '</td>' +
        '<td><span class="total-pts">' + s.pontos + '</span></td>';

      tbody.appendChild(tr);
    });

    tbody.querySelectorAll("input.teamname").forEach(function (inp) {
      inp.addEventListener("change", function (e) {
        if (!esAdmin) {
          e.target.value = state.teams[+e.target.dataset.team];
          return;
        }
        var idx = +e.target.dataset.team;
        var v = e.target.value.trim();
        state.teams[idx] = v || ("TIME - " + (idx + 1));
        save();
        renderAll();
        publicarEstado();
      });
    });
  }

  /* ===== JOGOS (ordem original preservada) ===== */
  function renderMatches() {
    var wrap = document.getElementById("matches");
    wrap.innerHTML = "";

    MATCH_ORDER.forEach(function (pair, index) {
      var i = pair[0], j = pair[1];
      var s = getScore(i, j);
      var played = s.a != null && s.b != null;
      var aWin = played && s.a > s.b;
      var bWin = played && s.b > s.a;

      var div = document.createElement("div");
      div.id = "match-card-" + i + "-" + j;
      div.className = "match-card" + (played ? " completed" : "") +
        (aWin ? " winner-a" : (bWin ? " winner-b" : ""));

      div.innerHTML =
        '<div class="match-top">' +
          '<span class="match-pill">Confronto ' + (index + 1) + '</span>' +
          '<span class="match-status">' + (played ? "Concluído" : "Em aberto") + '</span>' +
        '</div>' +
        '<div class="match-body">' +
          '<div class="team-cell left">' + teamBadge(i) + '</div>' +
          '<input class="score" type="number" min="0" inputmode="numeric" ' +
            'data-i="' + i + '" data-j="' + j + '" data-side="a" ' +
            'value="' + (s.a == null ? "" : s.a) + '" placeholder="–" ' +
            'aria-label="Placar de ' + esc(state.teams[i]) + '">' +
          '<div class="vs-badge">VS</div>' +
          '<input class="score" type="number" min="0" inputmode="numeric" ' +
            'data-i="' + i + '" data-j="' + j + '" data-side="b" ' +
            'value="' + (s.b == null ? "" : s.b) + '" placeholder="–" ' +
            'aria-label="Placar de ' + esc(state.teams[j]) + '">' +
          '<div class="team-cell right">' + teamBadge(j) + '</div>' +
        '</div>';

      wrap.appendChild(div);
    });

    wrap.querySelectorAll("input.score").forEach(function (inp) {
      inp.addEventListener("input", function (e) {
        if (!esAdmin) return;
        var i = +e.target.dataset.i;
        var j = +e.target.dataset.j;
        var side = e.target.dataset.side;
        var sc = getScore(i, j);
        sc[side] = parseScoreInput(e.target.value);
        save();
        updateMatchCard(i, j);
        renderStandings();
        renderFinals();
        renderPodium();
        publicarEstado();
      });
    });
  }

  function updateMatchCard(i, j) {
    var card = document.getElementById("match-card-" + i + "-" + j);
    if (!card) return;
    var s = getScore(i, j);
    var played = s.a != null && s.b != null;
    var aWin = played && s.a > s.b;
    var bWin = played && s.b > s.a;

    card.classList.toggle("completed", played);
    card.classList.toggle("winner-a", aWin);
    card.classList.toggle("winner-b", bWin);

    var status = card.querySelector(".match-status");
    if (status) status.textContent = played ? "Concluído" : "Em aberto";
  }

  /* ===== FINAIS ===== */
  function renderFinals() {
    var r = ranked();
    var ready = allMatchesPlayed();
    var wrap = document.getElementById("finals");
    var noticeWrap = document.getElementById("finalNoticeWrap");

    noticeWrap.innerHTML = ready ? "" :
      '<div class="final-notice">' +
        '<strong>Aguarde.</strong> Lance os 10 confrontos da primeira fase para liberar ' +
        'automaticamente os finalistas da disputa de 3º lugar e da grande final.' +
      '</div>';

    function slot(pos) {
      return ready ? teamBadge(r[pos].idx) : placeholderBadge(pos + 1);
    }

    function box(fid, boxClass, tagIcon, tagText, subTag, badgeA, badgeB, sc) {
      var played = sc.a != null && sc.b != null;
      var aWin = played && sc.a > sc.b;
      var bWin = played && sc.b > sc.a;
      var disabled = ready ? "" : " disabled";

      return '' +
        '<div class="final-box ' + boxClass + '">' +
          '<div class="final-title-bar">' +
            '<span class="final-tag">' + tagIcon + ' ' + tagText + '</span>' +
            '<span class="final-subtag">' + subTag + '</span>' +
          '</div>' +
          '<div class="match-body">' +
            '<div class="team-cell left">' + badgeA + '</div>' +
            '<input class="score" type="number" min="0" inputmode="numeric" ' +
              'data-f="' + fid + '" data-side="a" ' +
              'value="' + (sc.a == null ? "" : sc.a) + '" placeholder="–"' + disabled + '>' +
            '<div class="vs-badge">VS</div>' +
            '<input class="score" type="number" min="0" inputmode="numeric" ' +
              'data-f="' + fid + '" data-side="b" ' +
              'value="' + (sc.b == null ? "" : sc.b) + '" placeholder="–"' + disabled + '>' +
            '<div class="team-cell right">' + badgeB + '</div>' +
          '</div>' +
          (played && aWin ? '' : '') +
        '</div>';
    }

    wrap.innerHTML =
      box("f34", "f34", "🥉", "Disputa de 3º Lugar", "3º × 4º colocado",
          slot(2), slot(3), state.finals.f34) +
      box("f12", "f12", "🏆", "Grande Final", "1º × 2º colocado",
          slot(0), slot(1), state.finals.f12);

    wrap.querySelectorAll("input.score").forEach(function (inp) {
      inp.addEventListener("input", function (e) {
        if (!esAdmin) return;
        var fid = e.target.dataset.f;
        var side = e.target.dataset.side;
        state.finals[fid][side] = parseScoreInput(e.target.value);
        save();
        renderPodium();
        publicarEstado();
      });
    });
  }

  /* ===== PÓDIO ===== */
  function resolveFinalWinner(sc, teamA, teamB) {
    if (sc.a == null || sc.b == null || sc.a === sc.b) {
      return { winner: null, loser: null };
    }
    return sc.a > sc.b ? { winner: teamA, loser: teamB } : { winner: teamB, loser: teamA };
  }

  function podiumBadge(team, fallback) {
    if (!team) return '<span class="team-badge unknown">' + fallback + '</span>';
    return teamBadge(team.idx);
  }

  function renderPodium() {
    var r = ranked();
    var ready = allMatchesPlayed();
    var el = document.getElementById("podium");

    var p1 = null, p2 = null, p3 = null;

    if (ready) {
      var f12 = resolveFinalWinner(state.finals.f12, r[0], r[1]);
      var f34 = resolveFinalWinner(state.finals.f34, r[2], r[3]);
      p1 = f12.winner;
      p2 = f12.loser;
      p3 = f34.winner;
    }

    el.innerHTML =
      '<div class="podium-slot second">' +
        '<div class="medal-circle">🥈</div>' +
        '<div class="place-title">Vice-Campeão</div>' +
        podiumBadge(p2, "Aguardando resultado") +
      '</div>' +
      '<div class="podium-slot first">' +
        '<div class="medal-circle">🥇</div>' +
        '<div class="place-title">Campeão</div>' +
        podiumBadge(p1, "Aguardando resultado") +
      '</div>' +
      '<div class="podium-slot third">' +
        '<div class="medal-circle">🥉</div>' +
        '<div class="place-title">3º Lugar</div>' +
        podiumBadge(p3, "Aguardando resultado") +
      '</div>';
  }

  /* ============================================================
     JOGADORES E NOTAS — estrelas de 0 a 5 (meias estrelas)
     ============================================================ */
  var STAR_MAX = 5;

  function estrelasHtml(nota, idJogador) {
    var valor = Math.max(0, Math.min(STAR_MAX, Number(nota) || 0));
    var pct = (valor / STAR_MAX) * 100;
    var texto = "★★★★★";
    return '<span class="stars' + (esAdmin ? " clicavel" : "") + '"' +
      ' data-jog="' + idJogador + '" role="img"' +
      ' aria-label="Nota ' + valor.toFixed(1) + ' de 5">' +
      '<span class="stars-area">' +
        '<span class="base">' + texto + '</span>' +
        '<span class="fill" style="width:' + pct + '%">' + texto + '</span>' +
      '</span>' +
      '<span class="valor">' + valor.toFixed(1) + '</span>' +
      '</span>';
  }

  /* Converte a posicao do clique numa nota de 0 a 5 (passo de 0,5). */
  function notaFromPonto(x, largura) {
    if (!largura || !isFinite(largura) || largura <= 0) return null;
    var frac = Math.max(0, Math.min(1, x / largura));
    /* 10 faixas iguais = 10 meias estrelas -> passo de 0,5 */
    var valor = Math.round(frac * 10) * 0.5;
    return Math.max(0, Math.min(STAR_MAX, valor));
  }

  function renderJogadores() {
    var lista = document.getElementById("jogLista");
    if (!lista) return;
    lista.innerHTML = "";

    if (!state.jogadores.length) {
      lista.innerHTML =
        '<div class="sorteio-vazio">' +
          '<strong>Nenhum jogador cadastrado</strong>' +
          (esAdmin
            ? 'Toque em <b>+ Adicionar jogador</b> para começar a montar o elenco.'
            : 'O Mesário ainda não cadastrou o elenco.') +
        '</div>';
      var resumo = document.getElementById("jogResumo");
      if (resumo) resumo.textContent = "0 jogadores";
      renderFormacao();
      return;
    }

    state.jogadores.forEach(function (jog, i) {
      var ativo = jog.ativo !== false;
      var div = document.createElement("div");
      div.className = "jog-item" + (ativo ? "" : " desmarcado");
      div.innerHTML =
        (esAdmin
          ? '<span class="jog-check' + (ativo ? " on" : "") + '" data-i="' + i + '"' +
            ' title="Marcar para o sorteio" role="checkbox" aria-checked="' + (ativo ? "true" : "false") + '">✓</span>'
          : '') +
        '<input class="jog-nome" data-i="' + i + '" value="' + esc(jog.nome || "") + '"' +
          ' placeholder="Nome do jogador" maxlength="28"' +
          ' aria-label="Nome do jogador ' + (i + 1) + '"' +
          (esAdmin ? "" : " readonly") + '>' +
        '<span class="jog-stars">' + estrelasHtml(jog.estrelas, i) + '</span>' +
        (esAdmin
          ? '<button class="jog-remove" data-i="' + i + '" aria-label="Remover jogador">✕</button>'
          : '');

      lista.appendChild(div);
    });

    /* eventos do checkbox (marcar/desmarcar para sorteio) */
    lista.querySelectorAll(".jog-check").forEach(function (chk) {
      chk.addEventListener("click", function () {
        if (!esAdmin) return;
        var i = +chk.dataset.i;
        var novo = !(state.jogadores[i].ativo !== false);
        state.jogadores[i].ativo = novo;
        chk.classList.toggle("on", novo);
        chk.setAttribute("aria-checked", novo ? "true" : "false");
        var pai = chk.closest(".jog-item");
        if (pai) pai.classList.toggle("desmarcado", !novo);
        save();
        atualizarResumoJogadores();
        publicarEstado();
      });
    });

    /* eventos */
    lista.querySelectorAll("input.jog-nome").forEach(function (inp) {
      inp.addEventListener("change", function (e) {
        if (!esAdmin) return;
        var i = +e.target.dataset.i;
        state.jogadores[i].nome = e.target.value.trim();
        save();
        publicarEstado();
      });
    });

    lista.querySelectorAll(".stars.clicavel").forEach(function (st) {
      st.addEventListener("click", function (e) {
        if (!esAdmin) return;
        var i = +st.dataset.jog;
        var area = st.querySelector(".stars-area");
        if (!area) return;
        var rect;
        try { rect = area.getBoundingClientRect(); } catch (err) { rect = null; }
        if (!rect || !rect.width) return;
        var px = (e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX);
        var nova = notaFromPonto(px - rect.left, rect.width);
        if (nova == null || isNaN(nova)) return;
        state.jogadores[i].estrelas = nova;
        save();
        /* Atualiza SO a estrela clicada (evita re-renderizar a lista inteira,
           o que perderia a rolagem e o foco no celular). */
        var fill = st.querySelector(".fill");
        var valorEl = st.querySelector(".valor");
        var pct = (nova / STAR_MAX) * 100;
        if (fill) fill.style.width = pct + "%";
        if (valorEl) valorEl.textContent = nova.toFixed(1);
        st.setAttribute("aria-label", "Nota " + nova.toFixed(1) + " de 5");
        atualizarResumoJogadores();
        publicarEstado();
      });
    });

    lista.querySelectorAll(".jog-remove").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        if (!esAdmin) return;
        var i = +btn.dataset.i;
        var nome = state.jogadores[i].nome || "este jogador";
        if (!confirm('Remover "' + nome + '" da lista?')) return;
        state.jogadores.splice(i, 1);
        /* remove tambem da formacao, se houver */
        if (state.formacao && state.formacao.times) {
          state.formacao.times.forEach(function (t) {
            t.jogadores = (t.jogadores || []).filter(function (j) { return j.id !== state.jogadores[i].id; });
          });
        }
        save();
        renderJogadores();
        publicarEstado();
      });
    });

    atualizarResumoJogadores();
    renderFormacao();
  }

  function atualizarResumoJogadores() {
    var total = state.jogadores.length;
    var comNota = state.jogadores.filter(function (j) { return (j.estrelas || 0) > 0; }).length;
    var flegados = state.jogadores.filter(function (j) { return j.ativo !== false; }).length;
    var resumo = document.getElementById("jogResumo");
    if (resumo) {
      resumo.textContent = total + (total === 1 ? " jogador" : " jogadores") +
        (comNota ? " · " + comNota + " com nota" : " · sem notas");
    }
    var c = document.getElementById("contagemJog");
    if (c) {
      c.innerHTML = '<b style="color:var(--lime)">' + flegados + '</b> de ' + total + ' para o sorteio';
    }
  }

  function adicionarJogador() {
    if (!esAdmin) return;
    state.jogadores.push({
      id: "j" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      nome: "",
      estrelas: 0,
      casa: null,
      ativo: true
    });
    save();
    renderJogadores();
    publicarEstado();
    /* foca o ultimo campo recem-criado */
    var inputs = document.querySelectorAll("input.jog-nome");
    if (inputs.length) {
      var ultimo = inputs[inputs.length - 1];
      try { ultimo.focus(); } catch (e) {}
      try {
        if (typeof ultimo.scrollIntoView === "function") {
          ultimo.scrollIntoView({ block: "center", behavior: "smooth" });
        }
      } catch (e) {}
    }
  }

  /* Importa o elenco base (27 atletas com nivel e casa) */
  function importarElencoBase() {
    if (!esAdmin) return;
    if (state.jogadores.length &&
        !confirm("Isso vai substituir o elenco atual por " + ELENCO_BASE.length + " atletas. Continuar?")) {
      return;
    }
    state.jogadores = elencoBaseParaJogadores();
    state.formacao = null;
    save();
    renderJogadores();
    publicarEstado();
  }

  /* Importa a lista de nomes colada pelo Mesario (um por linha).
     Substitui o elenco mantendo as notas e a casa dos nomes que ja existiam. */
  function importarListaDeNomes(texto) {
    if (!esAdmin) return 0;
    var linhas = String(texto || "").split(/\r?\n/);
    var nomes = [];
    for (var i = 0; i < linhas.length; i++) {
      var n = linhas[i].trim();
      if (n) nomes.push(n);
    }
    if (!nomes.length) return 0;

    var antigos = {};
    state.jogadores.forEach(function (j) { antigos[j.nome] = j; });

    state.jogadores = nomes.map(function (nome, i) {
      var ant = antigos[nome];
      return {
        id: ant ? ant.id : "n" + i + "_" + Math.random().toString(36).slice(2, 7),
        nome: nome,
        estrelas: ant ? (ant.estrelas || 0) : 0,
        nivel: ant ? ant.nivel : null,
        casa: ant ? (ant.casa == null ? i + 1 : ant.casa) : i + 1,
        ativo: ant && ant.ativo !== undefined ? ant.ativo : true
      };
    });
    save();
    renderJogadores();
    publicarEstado();
    return state.jogadores.length;
  }

  /* ============================================================
     SORTEIO EQUILIBRADO
     Algoritmo: "snake draft" (cobra) + ajuste fino por otimizacao
     local — minimiza a diferenca de soma entre os times.
     ============================================================ */

  /* Fisher-Yates: embaralha de verdade (usa Math.random) */
  function embaralhar(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }
  function sortearTimes(numTimes, porTime, comCapitao) {
    /* Considera APENAS os jogadores flegados (marcados com ✓) */
    var jogadores = state.jogadores.filter(function (j) {
      return j.ativo !== false;
    });
    if (!jogadores.length) return null;

    /* Embaralha ANTES de ordenar: assim jogadores com a MESMA nota
       podem cair em times diferentes (sorteio com cara de sorteio). */
    embaralhar(jogadores);

    /* ordena por nota (maior primeiro); empates mantem a ordem aleatoria */
    jogadores.sort(function (a, b) {
      return (b.estrelas || 0) - (a.estrelas || 0);
    });

    var totalSlots = numTimes * porTime;
    var elenco = jogadores.slice(0, totalSlots);
    var sobrando = jogadores.slice(totalSlots);

    /* --- fase 1: distribuicao "cobra" (equilibra naturalmente) --- */
    var times = [];
    for (var t = 0; t < numTimes; t++) {
      times.push({ jogadores: [], soma: 0 });
    }
    var ordem = [];
    for (var volta = 0; volta < porTime; volta++) {
      var linha = [];
      for (var i = 0; i < numTimes; i++) {
        linha.push(volta % 2 === 0 ? i : (numTimes - 1 - i));
      }
      ordem = ordem.concat(linha);
    }
    var usados = {};
    for (var k = 0; k < ordem.length; k++) {
      var tI = ordem[k];
      var prox = null;
      for (var j = 0; j < elenco.length; j++) {
        if (!usados[j]) { prox = elenco[j]; usados[j] = true; break; }
      }
      if (!prox) break;
      times[tI].jogadores.push(prox);
      times[tI].soma += (prox.estrelas || 0);
    }

    /* --- fase 2: ajuste fino — troca jogador entre times para
       reduzir a diferenca de soma (local search) --- */
    function desvio(ts) {
      var max = -Infinity, min = Infinity;
      ts.forEach(function (t) {
        if (t.soma > max) max = t.soma;
        if (t.soma < min) min = t.soma;
      });
      return max - min;
    }
    var melhor = desvio(times);
    for (var passo = 0; passo < 400 && melhor > 0.001; passo++) {
      var melhorou = false;
      for (var a = 0; a < numTimes; a++) {
        for (var b = a + 1; b < numTimes; b++) {
          for (var x = 0; x < times[a].jogadores.length; x++) {
            for (var y = 0; y < times[b].jogadores.length; y++) {
              var ja = times[a].jogadores[x], jb = times[b].jogadores[y];
              var na = times[a].soma - (ja.estrelas || 0) + (jb.estrelas || 0);
              var nb = times[b].soma - (jb.estrelas || 0) + (ja.estrelas || 0);
              times[a].soma = na; times[b].soma = nb;
              times[a].jogadores[x] = jb; times[b].jogadores[y] = ja;
              var novo = desvio(times);
              if (novo < melhor - 0.001) {
                melhor = novo; melhorou = true; a = numTimes; break;
              } else {
                /* desfaz */
                times[a].soma = na - (jb.estrelas || 0) + (ja.estrelas || 0);
                times[b].soma = nb - (ja.estrelas || 0) + (jb.estrelas || 0);
                times[a].jogadores[x] = ja; times[b].jogadores[y] = jb;
              }
            }
          }
        }
      }
      if (!melhorou) break;
    }

    /* --- capitao: o de maior nota de cada time --- */
    times.forEach(function (t) {
      var cap = null;
      t.jogadores.forEach(function (j) {
        if (!cap || (j.estrelas || 0) > (cap.estrelas || 0)) cap = j;
      });
      t.capitao = cap ? cap.id : null;
    });

    return {
      numTimes: numTimes,
      porTime: porTime,
      comCapitao: comCapitao,
      times: times.map(function (t) {
        return {
          jogadores: t.jogadores.map(function (j) {
            return { id: j.id, nome: j.nome, estrelas: j.estrelas || 0 };
          }),
          soma: Math.round(t.soma * 10) / 10,
          capitao: t.capitao
        };
      }),
      sobrando: sobrando.map(function (j) {
        return { id: j.id, nome: j.nome, estrelas: j.estrelas || 0 };
      })
    };
  }

  function renderFormacao() {
    var el = document.getElementById("sorteioResultado");
    if (!el) return;
    var f = state.formacao;

    if (!f || !f.times || !f.times.length) {
      el.innerHTML =
        '<div class="sorteio-vazio">' +
          '<strong>Nenhum sorteio realizado</strong>' +
          (state.jogadores.length
            ? 'Toque em <b>🎲 Sortear</b> para formar os times equilibrados.'
            : 'Cadastre os jogadores primeiro.') +
        '</div>';
      return;
    }

    var usados = f.times.reduce(function (n, t) { return n + t.jogadores.length; }, 0);
    var somas = f.times.map(function (t) { return t.soma; });
    var maxS = Math.max.apply(null, somas);
    var minS = Math.min.apply(null, somas);
    var dif = Math.round((maxS - minS) * 10) / 10;

    var html = '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;' +
      'margin-bottom:14px;font-size:.8rem;color:var(--muted)">' +
      '<span>✅ <b style="color:var(--lime)">' + usados + '</b> jogadores distribuídos</span>' +
      '<span>⚖️ Diferença entre os times: <b style="color:' +
        (dif < 0.5 ? "var(--lime)" : "var(--yellow)") + '">' + dif.toFixed(1) + '</b> ponto(s) de nota</span>' +
      (f.sobrando && f.sobrando.length
        ? '<span>👥 <b style="color:var(--yellow)">' + f.sobrando.length + '</b> fora do sorteio</span>'
        : '') +
      '</div>';

    html += '<div class="times-resultado">';
    f.times.forEach(function (t, i) {
      var idx = i % NUM_TEAMS;
      html += '<div class="time-card t-' + idx + '">' +
        '<h4><span class="team-color-bar t-' + idx + '"></span>Time ' + (i + 1) + '</h4>' +
        '<div class="time-meta">' +
          '<span>👥 ' + t.jogadores.length + ' jogador(es)</span>' +
          '<span>⭐ soma <b>' + t.soma.toFixed(1) + '</b></span>' +
          '<span>📊 média <b>' +
            (t.jogadores.length ? (t.soma / t.jogadores.length).toFixed(2) : "0.00") + '</b></span>' +
        '</div>' +
        '<ul>';
      t.jogadores.forEach(function (j) {
        var isCap = f.comCapitao && j.id === t.capitao;
        html += '<li>' +
          '<span class="nome">' + esc(j.nome || "(sem nome)") + '</span>' +
          (isCap ? '<span class="cap">(C)</span>' : '') +
          '<span class="nota">' + (Number(j.estrelas) || 0).toFixed(1) + '</span>' +
          (esAdmin
            ? '<button class="flegar-btn" data-time="' + i + '" data-pid="' + esc(j.id) + '"' +
              ' title="Flegar: trocar por um da reserva">⇄</button>'
            : '') +
          '</li>';
      });
      html += '</ul></div>';
    });
    html += '</div>';

    if (f.sobrando && f.sobrando.length) {
      html += '<div style="margin-top:16px">' +
        '<h2 class="section-title" style="margin-top:0">Reserva (fora do sorteio)</h2>' +
        '<div class="card"><div class="jog-lista">';
      f.sobrando.forEach(function (j) {
        html += '<div class="jog-item">' +
          '<input class="jog-nome" value="' + esc(j.nome || "") + '" readonly>' +
          '<span class="jog-stars">' + estrelasHtml(j.estrelas, "") + '</span>' +
          '</div>';
      });
      html += '</div></div></div>';
    }

    el.innerHTML = html;

    /* registra os handlers DEPOIS de injetar o HTML (senao os botoes
       ainda nao existem no DOM e o listener nunca e anexado) */
    el.querySelectorAll(".flegar-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        abrirFlegar(+btn.dataset.time, btn.dataset.pid);
      });
    });
  }

  function fazerSorteio() {
    if (!esAdmin) {
      alert("Apenas o Mesário pode sortear os times.");
      return;
    }
    if (!state.jogadores.length) {
      alert("Cadastre os jogadores antes de sortear.");
      return;
    }
    var nTimes = parseInt(document.getElementById("sorteioTimes").value, 10);
    var porTime = parseInt(document.getElementById("sorteioPorTime").value, 10);
    if (isNaN(nTimes) || nTimes < 2) nTimes = 2;
    if (isNaN(porTime) || porTime < 1) porTime = 1;

    var resultado = sortearTimes(nTimes, porTime, false);
    if (!resultado) return;
    state.formacao = resultado;
    save();
    renderFormacao();
    publicarEstado();
  }

  /* ============================================================
     TROCA DE JOGADORES — permite trocar qualquer atleta escalado
     por qualquer jogador (da reserva ou de outro time)
     ============================================================ */
  var flegarAlvo = null;   /* { timeIndex, jogadorId } */

  function abrirFlegar(timeIndex, jogadorId) {
    if (!esAdmin) return;
    var f = state.formacao;
    if (!f || !f.times || !f.times[timeIndex]) return;

    flegarAlvo = { timeIndex: timeIndex, jogadorId: jogadorId };
    var titular = f.times[timeIndex].jogadores.filter(function (j) {
      return j.id === jogadorId;
    })[0];
    var nomeTitular = titular ? (titular.nome || "titular") : "titular";

    var doc = document.getElementById("flegarTitulo");
    var desc = document.getElementById("flegarDesc");
    if (doc) doc.textContent = "Trocar: " + nomeTitular;
    if (desc) {
      desc.textContent = "Escolha qualquer jogador para entrar no Time " + (timeIndex + 1) +
        " (troca direta com outro time ou entrada da reserva):";
    }

    var lista = document.getElementById("flegarLista");
    lista.innerHTML = "";

    /* 1. Atletas na reserva */
    var escalados = {};
    f.times.forEach(function (t) {
      t.jogadores.forEach(function (j) { escalados[j.id] = true; });
    });
    var reservas = (f.sobrando || []).filter(function (j) { return !escalados[j.id]; });

    /* Atletas cadastrados no elenco fora da escalacao */
    var idConhecidos = {};
    f.times.forEach(function (t) {
      t.jogadores.forEach(function (j) { idConhecidos[j.id] = true; });
    });
    (f.sobrando || []).forEach(function (j) { idConhecidos[j.id] = true; });
    var outrosElenco = (state.jogadores || []).filter(function (j) {
      return !idConhecidos[j.id] && j.id !== jogadorId;
    });

    var totalReservas = reservas.concat(outrosElenco);
    if (totalReservas.length) {
      var secRes = document.createElement("div");
      secRes.className = "flegar-secao";
      secRes.textContent = "👥 Atletas na Reserva (" + totalReservas.length + ")";
      lista.appendChild(secRes);

      totalReservas.forEach(function (j) {
        var div = document.createElement("div");
        div.className = "flegar-item";
        div.innerHTML =
          '<div class="flegar-info">' +
            '<span class="flegar-nome">' + esc(j.nome || "(sem nome)") + '</span>' +
            '<span class="flegar-meta">' +
              '<span class="stars" style="pointer-events:none">' + estrelasHtml(j.estrelas, "") + '</span>' +
              '<span style="color:var(--lime);font-weight:700">Reserva</span>' +
            '</span>' +
          '</div>' +
          '<button class="btn btn-primary flegar-btn-acao" data-flegar="' + esc(j.id) + '">' +
            'Entrar no Time ' + (timeIndex + 1) +
          '</button>';
        lista.appendChild(div);
      });
    }

    /* 2. Atletas de outros times */
    var temOutros = false;
    f.times.forEach(function (t, i) {
      if (i === timeIndex) return;
      if (!t.jogadores.length) return;
      temOutros = true;

      var secTime = document.createElement("div");
      secTime.className = "flegar-secao";
      secTime.textContent = "🔄 Time " + (i + 1) + " (Troca direta)";
      lista.appendChild(secTime);

      t.jogadores.forEach(function (j) {
        var div = document.createElement("div");
        div.className = "flegar-item";
        div.innerHTML =
          '<div class="flegar-info">' +
            '<span class="flegar-nome">' + esc(j.nome || "(sem nome)") + '</span>' +
            '<span class="flegar-meta">' +
              '<span class="stars" style="pointer-events:none">' + estrelasHtml(j.estrelas, "") + '</span>' +
              '<span style="color:var(--yellow);font-weight:700">Time ' + (i + 1) + '</span>' +
            '</span>' +
          '</div>' +
          '<button class="btn btn-primary flegar-btn-acao" style="background:rgba(255,207,26,0.15);color:var(--yellow);border-color:rgba(255,207,26,0.4)" data-flegar="' + esc(j.id) + '">' +
            'Trocar com este' +
          '</button>';
        lista.appendChild(div);
      });
    });

    if (!totalReservas.length && !temOutros) {
      lista.innerHTML = '<div class="sorteio-vazio">Nenhum outro jogador disponível para troca.</div>';
    }

    document.getElementById("flegarPainel").hidden = false;

    lista.querySelectorAll("button[data-flegar]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        trocarPorQualquer(btn.dataset.flegar);
      });
    });
  }

  function fecharFlegar() {
    document.getElementById("flegarPainel").hidden = true;
    flegarAlvo = null;
  }

  /* executa a troca: permite trocar com reserva ou com jogador de outro time */
  function trocarPorQualquer(idEscolhido) {
    var f = state.formacao;
    if (!flegarAlvo || !f) { fecharFlegar(); return; }

    var ti = flegarAlvo.timeIndex;
    var timeA = f.times[ti];
    if (!timeA) { fecharFlegar(); return; }

    var idxX = -1;
    for (var i = 0; i < timeA.jogadores.length; i++) {
      if (timeA.jogadores[i].id === flegarAlvo.jogadorId) { idxX = i; break; }
    }
    if (idxX < 0) { fecharFlegar(); return; }

    var jogX = timeA.jogadores[idxX];

    /* verifica se o jogador escolhido esta em algum outro time */
    var timeB = null;
    var idxY = -1;
    for (var t = 0; t < f.times.length; t++) {
      for (var j = 0; j < f.times[t].jogadores.length; j++) {
        if (f.times[t].jogadores[j].id === idEscolhido) {
          timeB = f.times[t];
          idxY = j;
          break;
        }
      }
      if (timeB) break;
    }

    if (timeB) {
      /* troca direta entre os dois times */
      var jogY = timeB.jogadores[idxY];
      timeA.jogadores[idxX] = jogY;
      timeB.jogadores[idxY] = jogX;
    } else {
      /* estava na reserva ou no elenco geral */
      var original = null;
      for (var k = 0; k < state.jogadores.length; k++) {
        if (state.jogadores[k].id === idEscolhido) { original = state.jogadores[k]; break; }
      }
      if (!original) {
        var sob = (f.sobrando || []).filter(function (s) { return s.id === idEscolhido; })[0];
        if (sob) original = sob;
      }

      timeA.jogadores[idxX] = {
        id: idEscolhido,
        nome: original ? original.nome : (idEscolhido || ""),
        estrelas: original ? (Number(original.estrelas) || 0) : 0
      };

      /* remove o escolhido da reserva e coloca o que saiu */
      f.sobrando = (f.sobrando || []).filter(function (j) { return j.id !== idEscolhido; });
      f.sobrando.push({
        id: jogX.id,
        nome: jogX.nome,
        estrelas: Number(jogX.estrelas) || 0
      });
    }

    /* recalcula as somas de todos os times */
    f.times.forEach(function (t) {
      t.soma = Math.round(t.jogadores.reduce(function (s, j) {
        return s + (Number(j.estrelas) || 0);
      }, 0) * 10) / 10;
    });

    fecharFlegar();
    save();
    renderFormacao();
    publicarEstado();
  }

  /* ===== RENDER GERAL ===== */
  function renderAll() {
    renderStandings();
    renderMatches();
    renderFinals();
    renderPodium();
    renderJogadores();
    aplicarBloqueioEdicao();
  }

  /* No modo leitura os campos ficam realmente travados (readonly),
     e nao apenas sem clique — impede edicao via teclado/foco tambem. */
  function aplicarBloqueioEdicao() {
    var travado = !esAdmin;
    document.querySelectorAll("input.teamname").forEach(function (inp) {
      inp.readOnly = travado;
      inp.setAttribute("aria-readonly", travado ? "true" : "false");
    });
    document.querySelectorAll("input.score").forEach(function (inp) {
      /* os campos das finais ja possuem disabled proprio quando nao ha	finalista */
      if (inp.hasAttribute("disabled")) return;
      inp.readOnly = travado;
      inp.setAttribute("aria-readonly", travado ? "true" : "false");
    });
    var cw = document.getElementById("cfgWin");
    var cl = document.getElementById("cfgLoss");
    if (cw) cw.readOnly = travado;
    if (cl) cl.readOnly = travado;
    document.querySelectorAll("input.jog-nome").forEach(function (inp) {
      inp.readOnly = travado;
    });
    document.querySelectorAll("input.jog-casa").forEach(function (inp) {
      inp.readOnly = travado;
    });
    /* os botoes de edicao de elenco so aparecem para o Mesario */
    var btnAdd = document.getElementById("btnAddJogador");
    if (btnAdd) btnAdd.hidden = travado;
    var btnImp = document.getElementById("btnImportarElenco");
    if (btnImp) btnImp.hidden = travado;
    var btnColar = document.getElementById("btnColarNomes");
    if (btnColar) btnColar.hidden = travado;
    var colarWrap = document.getElementById("colarPainelWrap");
    if (colarWrap && travado) colarWrap.hidden = true;
    var btnSort = document.getElementById("btnSortear");
    if (btnSort) btnSort.hidden = travado;
    var sorteioInputs = document.querySelectorAll("#sorteioTimes,#sorteioPorTime");
    for (var i = 0; i < sorteioInputs.length; i++) sorteioInputs[i].disabled = travado;
  }

  /* ===== EVENTOS ===== */
  var cfgWin = document.getElementById("cfgWin");
  var cfgLoss = document.getElementById("cfgLoss");
  cfgWin.value = state.cfg.win;
  cfgLoss.value = state.cfg.loss;

  cfgWin.addEventListener("change", function (e) {
    if (!esAdmin) { e.target.value = state.cfg.win; return; }
    var v = parseInt(e.target.value, 10);
    state.cfg.win = isNaN(v) ? 1 : Math.max(0, v);
    e.target.value = state.cfg.win;
    save();
    renderAll();
    publicarEstado();
  });

  cfgLoss.addEventListener("change", function (e) {
    if (!esAdmin) { e.target.value = state.cfg.loss; return; }
    var v = parseInt(e.target.value, 10);
    state.cfg.loss = isNaN(v) ? 0 : Math.max(0, v);
    e.target.value = state.cfg.loss;
    save();
    renderAll();
    publicarEstado();
  });

  document.getElementById("btnPrint").addEventListener("click", function () {
    window.print();
  });

  document.getElementById("btnReset").addEventListener("click", function () {
    if (!esAdmin) {
      alert("Apenas o Mesário pode zerar o campeonato.");
      return;
    }
    if (confirm("Zerar os placares e resultados do campeonato? Os nomes dos times serão mantidos.")) {
      state.scores = {};
      state.finals = { f34: { a: null, b: null }, f12: { a: null, b: null } };
      state.jogadores = [];
      state.formacao = null;
      save();
      renderAll();
      publicarEstado();
    }
  });

  /* ===== ABAS: navegacao entre as secoes ===== */
  (function initTabs() {
    var bar = document.getElementById("tabsBar");
    if (!bar) return;
    bar.querySelectorAll(".tab-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var alvo = btn.dataset.tab;
        bar.querySelectorAll(".tab-btn").forEach(function (b) {
          b.classList.toggle("ativo", b === btn);
        });
        document.querySelectorAll(".tab-panel").forEach(function (p) {
          p.classList.toggle("ativo", p.id === alvo);
        });
        try { localStorage.setItem("volei_aba_ativa", alvo); } catch (e) {}
        /* scrollTo pode nao existir em alguns contextos (ex.: webviews antigas) */
        try {
          if (typeof window.scrollTo === "function") {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        } catch (e) {}
      });
    });
    /* restaura a ultima aba usada */
    var salva = null;
    try { salva = localStorage.getItem("volei_aba_ativa"); } catch (e) {}
    if (salva) {
      var btn = bar.querySelector('[data-tab="' + salva + '"]');
      if (btn) btn.click();
    }
  })();

  /* ===== JOGADORES: botoes ===== */
  var btnAddJogador = document.getElementById("btnAddJogador");
  if (btnAddJogador) btnAddJogador.addEventListener("click", adicionarJogador);

  var btnImportarElenco = document.getElementById("btnImportarElenco");
  if (btnImportarElenco) btnImportarElenco.addEventListener("click", importarElencoBase);

  /* colar lista de nomes */
  var btnColarNomes = document.getElementById("btnColarNomes");
  var colarPainelWrap = document.getElementById("colarPainelWrap");
  var colarNomes = document.getElementById("colarNomes");
  if (btnColarNomes) {
    btnColarNomes.addEventListener("click", function () {
      colarPainelWrap.hidden = false;
      try { colarNomes.focus(); } catch (e) {}
    });
  }
  var btnColarCancelar = document.getElementById("btnColarCancelar");
  if (btnColarCancelar) {
    btnColarCancelar.addEventListener("click", function () {
      colarPainelWrap.hidden = true;
      colarNomes.value = "";
    });
  }
  var btnColarConfirmar = document.getElementById("btnColarConfirmar");
  if (btnColarConfirmar) {
    btnColarConfirmar.addEventListener("click", function () {
      var n = importarListaDeNomes(colarNomes.value);
      if (n) {
        colarPainelWrap.hidden = true;
        colarNomes.value = "";
        setLive("conectado", n + " jogadores no elenco — publicado para todos");
      } else {
        setLive("somente-leitura", "Nenhum nome válido na lista");
      }
    });
  }

  var btnSortear = document.getElementById("btnSortear");
  if (btnSortear) btnSortear.addEventListener("click", fazerSorteio);

  /* marcar / desmarcar todos */
  var btnMarcarTodos = document.getElementById("btnMarcarTodos");
  if (btnMarcarTodos) {
    btnMarcarTodos.addEventListener("click", function () {
      if (!esAdmin) return;
      state.jogadores.forEach(function (j) { j.ativo = true; });
      save();
      renderJogadores();
      publicarEstado();
    });
  }
  var btnDesmarcarTodos = document.getElementById("btnDesmarcarTodos");
  if (btnDesmarcarTodos) {
    btnDesmarcarTodos.addEventListener("click", function () {
      if (!esAdmin) return;
      state.jogadores.forEach(function (j) { j.ativo = false; });
      save();
      renderJogadores();
      publicarEstado();
    });
  }

  /* ===== FLEGAR: painel ===== */
  var btnFlegarFechar = document.getElementById("btnFlegarFechar");
  if (btnFlegarFechar) btnFlegarFechar.addEventListener("click", fecharFlegar);

  var flegarPainel = document.getElementById("flegarPainel");
  if (flegarPainel) {
    flegarPainel.addEventListener("click", function (e) {
      if (e.target === flegarPainel) fecharFlegar();
    });
  }

  /* ===== PWA: instalacao e service worker ===== */
  var installPrompt = null;

  var banner = document.getElementById("installBanner");
  var bannerIcon = document.getElementById("installIcon");
  var bannerTitle = document.getElementById("installTitle");
  var bannerDesc = document.getElementById("installDesc");
  var bannerActions = document.getElementById("installActions");
  var bannerInstallBtn = document.getElementById("btnInstallBanner");
  var bannerCloseBtn = document.getElementById("btnInstallClose");
  var guide = document.getElementById("installGuide");
  var guideSteps = document.getElementById("installGuideSteps");

  var installBtn = document.getElementById("btnInstall");

  // Detecta o dispositivo do usuario
  function detectDevice() {
    var ua = navigator.userAgent || "";
    var isIOS = /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    var isAndroid = /Android/.test(ua);
    var isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|Chrome|Edg|Android/.test(ua);
    var isInApp = /FBAN|FBAV|Instagram|Line|WhatsApp|Twitter/i.test(ua);
    var standalone = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
      window.navigator.standalone === true;
    return {
      isIOS: isIOS,
      isAndroid: isAndroid,
      isSafari: isSafari,
      isInApp: isInApp,
      standalone: standalone
    };
  }

  function isStandalone() {
    return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
      window.navigator.standalone === true;
  }

  // Exibe o banner com as instrucoes corretas para cada plataforma
  function showInstallBanner() {
    if (!banner) return;
    if (isStandalone()) return;              // ja esta instalado como app
    if (localStorage.getItem("volei_banner_closed") === "1") return;

    var d = detectDevice();
    var steps = [];

    if (d.isIOS) {
      bannerIcon.textContent = "🍎";
      bannerTitle.textContent = "Instalar no iPhone";
      bannerDesc.textContent = "Adicione o campeonato na tela inicial para abrir em tela cheia.";
      bannerInstallBtn.hidden = true;
      steps.push(
        "Toque no botao de <strong>Compartilhar</strong> <span class='ios-share-icon'>&#x2191;</span> na barra do Safari.",
        "Role a lista e toque em <strong>&ldquo;Adicionar &agrave; Tela de In&iacute;cio&rdquo;</strong>.",
        "Confirme em <strong>Adicionar</strong> (canto superior direito).",
        "Pronto! O icone <strong>V&ocirc;lei do Bosque</strong> aparece na sua tela inicial."
      );
    } else if (d.isAndroid) {
      bannerIcon.textContent = "🤖";
      bannerTitle.textContent = "Instalar no Android";
      bannerDesc.textContent = "Tenha o campeonato como aplicativo, em tela cheia e offline.";
      steps.push(
        "Toque no menu <strong>&#8942;</strong> do Chrome, no canto superior direito.",
        "Escolha <strong>&ldquo;Instalar aplicativo&rdquo;</strong> ou <strong>&ldquo;Adicionar &agrave; tela inicial&rdquo;</strong>.",
        "Confirme em <strong>Instalar</strong>.",
        "Pronto! O icone <strong>V&ocirc;lei do Bosque</strong> aparece na sua tela inicial."
      );
    } else {
      bannerIcon.textContent = "💻";
      bannerTitle.textContent = "Instalar como Aplicativo";
      bannerDesc.textContent = "Acesse em tela cheia e funcione offline, como um app.";
      steps.push(
        "No Chrome ou Edge, clique no icone de <strong>instalar</strong> (&#8615;) na barra de endere&ccedil;os, ou no menu <strong>&#8942;</strong> &rarr; <strong>Instalar</strong>.",
        "O aplicativo abre em tela cheia e funciona sem internet."
      );
    }

    guideSteps.innerHTML = "";
    steps.forEach(function (s) {
      var li = document.createElement("li");
      li.innerHTML = s;
      guideSteps.appendChild(li);
    });

    banner.hidden = false;
  }

  function showInstallButton() {
    if (installBtn) installBtn.hidden = false;
  }

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    installPrompt = e;
    showInstallButton();

    // No Android o botao nativo ja resolve: mostra o banner com o botao de acao
    var d = detectDevice();
    if (d.isAndroid && banner && !isStandalone()) {
      bannerIcon.textContent = "🤖";
      bannerTitle.textContent = "Instalar no Android";
      bannerDesc.textContent = "Toque em Instalar para ter o campeonato como app.";
      bannerInstallBtn.hidden = false;
      guideSteps.innerHTML = "";
      banner.hidden = false;
    }
  });

  if (bannerInstallBtn) {
    bannerInstallBtn.addEventListener("click", function () {
      if (!installPrompt) {
        showInstallBanner();
        return;
      }
      installPrompt.prompt();
      installPrompt.userChoice.then(function () {
        installPrompt = null;
        bannerInstallBtn.hidden = true;
        banner.hidden = true;
      });
    });
  }

  if (bannerCloseBtn) {
    bannerCloseBtn.addEventListener("click", function () {
      banner.hidden = true;
      try { localStorage.setItem("volei_banner_closed", "1"); } catch (err) {}
    });
  }

  // No iPhone o banner mostra o passo a passo na hora
  if (banner) {
    var d0 = detectDevice();
    if (d0.isIOS) {
      showInstallBanner();
    }
  }

  if (installBtn) {
    installBtn.addEventListener("click", function () {
      if (!installPrompt) {
        showInstallBanner();
        return;
      }
      installPrompt.prompt();
      installPrompt.userChoice.then(function () {
        installPrompt = null;
        installBtn.hidden = true;
      });
    });
  }

  window.addEventListener("appinstalled", function () {
    if (installBtn) installBtn.hidden = true;
    installPrompt = null;
  });

  // Registra o service worker (necessario para funcionamento offline e instalacao)
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("./sw.js").catch(function () {
        /* ambiente sem service worker (ex.: file://) — o app continua funcionando */
      });
    });
  }

  /* ============================================================
     MESAO DO MESARIO + INICIALIZACAO DA SINCRONIZACAO
     ============================================================ */
  var adminModal = document.getElementById("adminModal");
  var adminPass = document.getElementById("adminPass");
  var adminError = document.getElementById("adminError");
  var btnAdmin = document.getElementById("btnAdmin");

  function abrirModalAdmin() {
    adminModal.hidden = false;
    adminError.classList.remove("show");
    adminPass.value = "";
    setTimeout(function () { adminPass.focus(); }, 60);
  }

  function fecharModalAdmin() {
    adminModal.hidden = true;
    adminPass.value = "";
    adminError.classList.remove("show");
  }

  function tentarLogin() {
    var senha = adminPass.value || "";
    if (!senha) {
      adminError.textContent = "Digite a senha do organizador.";
      adminError.classList.add("show");
      return;
    }
    adminError.textContent = "Verificando...";
    adminError.classList.add("show");

    loginMesario(senha).then(function (res) {
      fecharModalAdmin();
      entrarMesario();
      if (res && res.authDesativado) {
        avisoAuthDesativado = true;
      }
      /* Importante: NAO sobrescreve a nuvem cegamente.
         Se ja existe placar no banco, adotamos ele (evita perder os dados
         do Mesaro ao entrar pelo celular de outro aparelho).
         Se o banco esta vazio, publicamos o estado local para iniciar. */
      dbRead().then(function (dados) {
        if (dados && Array.isArray(dados.teams) && dados.teams.length === NUM_TEAMS) {
          aplicarEstadoRemoto(dados);
          setLive("conectado", "Modo Mesário — placar oficial carregado do banco");
        } else {
          publicarEstado();
        }
      }).catch(function () {
        publicarEstado();
      });
    }).catch(function (err) {
      var msg = (err && err.message) || "";
      if (msg === "senha-fraca") {
        adminError.textContent = "Senha muito fraca para o Firebase. Use pelo menos 6 caracteres.";
      } else if (msg === "conta-existente-sem-senha") {
        adminError.textContent = "Já existe uma conta de Mesário com outro e-mail. Verifique no Firebase Console > Authentication > Usuários.";
      } else if (msg === "falha-auth") {
        adminError.textContent = "Não foi possível validar no servidor. Verifique sua internet e tente de novo.";
      } else {
        adminError.textContent = "Senha incorreta. Tente novamente.";
      }
      adminError.classList.add("show");
      adminPass.value = "";
      adminPass.focus();
    });
  }

  if (btnAdmin) {
    btnAdmin.addEventListener("click", function () {
      if (esAdmin) {
        if (confirm("Sair do Modo Mesário? O app volta a ser somente leitura.")) {
          sairMesario();
        }
      } else {
        abrirModalAdmin();
      }
    });
  }

  document.getElementById("btnAdminLogin").addEventListener("click", tentarLogin);
  document.getElementById("btnAdminCancel").addEventListener("click", fecharModalAdmin);
  adminPass.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); tentarLogin(); }
  });
  adminModal.addEventListener("click", function (e) {
    if (e.target === adminModal) fecharModalAdmin();
  });

  /* ---- inicializacao ---- */
  renderAll();

  /* modo leitura por padrao: o publico apenas acompanha */
  document.body.classList.add("modo-leitura");
  setLive("somente-leitura", "Acompanhe os resultados em tempo real");

  /* restore a sessao do Mesario neste aparelho */
  sessao = carregarSessao();
  if (sessao) {
    esAdmin = true;
    document.body.classList.remove("modo-leitura");
    document.body.classList.add("modo-admin");
    if (btnAdmin) {
      btnAdmin.textContent = "🔒 Sair do Modo Mesário";
      btnAdmin.classList.add("btn-admin-on");
    }
  }
  if (btnAdmin) btnAdmin.hidden = false;

  /* le o estado atual do banco e liga o stream ao vivo */
  dbRead().then(function (dados) {
    if (dados && Array.isArray(dados.teams)) {
      aplicarEstadoRemoto(dados);
    }
    iniciarStream();
  }).catch(function () {
    setLive("offline", "Sem conexão — mostrando os dados salvos neste aparelho");
    iniciarStream();
  });

  /* renova o token do Mesario periodicamente */
  setInterval(function () {
    if (sessao && sessao.expiraEm && sessao.expiraEm < Date.now() + 120000) {
      renovarToken();
    }
  }, 60000);
})();
