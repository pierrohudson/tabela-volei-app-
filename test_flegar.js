const fs = require("fs");
const { parseHTML } = require("linkedom");
const html = fs.readFileSync("index.html", "utf8");
const code = fs.readFileSync("_app.js", "utf8");

function nova() {
  const { document, window } = parseHTML(html);
  const store = {};
  const localStorage = {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; }
  };
  const fakeFetch = (url, init) => {
    const u = String(url);
    let body = null;
    if (u.includes("signInWithPassword")) body = { idToken: "T", refreshToken: "R", expiresIn: 3600 };
    return Promise.resolve({
      ok: true, status: 200,
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(JSON.stringify(body)),
      body: null
    });
  };
  const nav = { userAgent: "iPhone", platform: "iPhone", maxTouchPoints: 5, serviceWorker: { register: () => Promise.resolve() } };
  const fn = new window.Function("document", "window", "localStorage", "confirm", "print", "navigator",
    "fetch", "AbortController", "ReadableStream", "TextDecoder", "setTimeout", "setInterval",
    "clearTimeout", "unescape", "encodeURIComponent", "Date", "Math", "JSON", "alert", code);
  fn(document, window, localStorage, () => true, () => {}, nav, fakeFetch,
    function () { this.signal = { addEventListener() {} }; this.abort = () => {}; },
    undefined, TextDecoder, setTimeout, setInterval, clearTimeout,
    unescape, encodeURIComponent, Date, Math, JSON, () => {});
  return { document, window, localStorage };
}

const wait = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
function check(n, c, e) {
  console.log((c ? "PASS  " : "FAIL  ") + n + (e !== undefined ? "  -> " + JSON.stringify(e) : ""));
  if (!c) fails++;
}

(async () => {
  const A = nova();
  await wait(300);
  A.document.getElementById("btnAdmin").dispatchEvent(new A.window.Event("click"));
  A.document.getElementById("adminPass").value = "HudsonAdmin@2026";
  A.document.getElementById("btnAdminLogin").dispatchEvent(new A.window.Event("click"));
  await wait(600);

  // ---- IMPORTAR ELENCO BASE (27 atletas) ----
  check("botao importar elenco visivel para mesario",
    A.document.getElementById("btnImportarElenco").hidden === false);
  A.document.getElementById("btnImportarElenco").dispatchEvent(new A.window.Event("click"));
  await wait(500);

  const st = JSON.parse(A.localStorage.getItem("tabela_volei_cores_v2"));
  check("27 jogadores importados", st.jogadores.length === 27, st.jogadores.length);
  check("primeiro e Lelê", st.jogadores[0].nome === "Lele" || st.jogadores[0].nome === "Lelê",
    st.jogadores[0].nome);
  check("ultimo e Duda", st.jogadores[26].nome === "Duda", st.jogadores[26].nome);
  check("nivel 3 -> 5 estrelas", st.jogadores[0].estrelas === 5, st.jogadores[0].estrelas);
  check("nivel 2 -> 3 estrelas", st.jogadores[12].estrelas === 3, st.jogadores[12].estrelas);
  check("nivel 1 -> 1 estrela", st.jogadores[18].estrelas === 1, st.jogadores[18].estrelas);
  check("casa preservada", st.jogadores[0].casa === 1 && st.jogadores[26].casa === 27,
    [st.jogadores[0].casa, st.jogadores[26].casa]);
  check("IDs unicos", new Set(st.jogadores.map(j => j.id)).size === 27);
  check("nomes sem espaco duplicado",
    st.jogadores.every(j => j.nome && j.nome.trim() === j.nome && j.nome.indexOf("  ") < 0));

  const casas = st.jogadores.map(j => j.casa);
  check("casas 1..27 sem repeticao", new Set(casas).size === 27 && Math.min.apply(null, casas) === 1,
    { min: Math.min.apply(null, casas), max: Math.max.apply(null, casas) });

  // ---- NOMES DOS JOGADORES NA TELA ----
  const nomeInputs = A.document.querySelectorAll("input.jog-nome");
  check("27 campos de nome na tela", nomeInputs.length === 27, nomeInputs.length);
  check("sem campo de casa na tela", A.document.querySelectorAll("input.jog-casa").length === 0);

  // ---- SORTEIO: 5 times x 5 = 25 de 27 ----
  A.document.getElementById("sorteioTimes").value = "5";
  A.document.getElementById("sorteioPorTime").value = "5";
  A.document.getElementById("btnSortear").dispatchEvent(new A.window.Event("click"));
  await wait(600);
  const st3 = JSON.parse(A.localStorage.getItem("tabela_volei_cores_v2"));
  check("sorteio 5x5", st3.formacao.times.length === 5 &&
    st3.formacao.times.every(t => t.jogadores.length === 5),
    st3.formacao.times.map(t => t.jogadores.length));
  check("2 na reserva", st3.formacao.sobrando.length === 2, st3.formacao.sobrando.length);

  // ---- FLEGAR ----
  const flegBtns = A.document.querySelectorAll(".flegar-btn");
  check("botoes flegar visiveis no time escalado", flegBtns.length === 25, flegBtns.length);

  // titular do time 1
  const t0 = st3.formacao.times[0];
  const titular = t0.jogadores[0];
  const reservasAntes = st3.formacao.sobrando.map(j => j.nome);

  flegBtns[0].dispatchEvent(new A.window.Event("click"));
  await wait(300);
  check("painel de flegar abre", A.document.getElementById("flegarPainel").hidden === false);
  check("titulo mostra o titular",
    A.document.getElementById("flegarTitulo").textContent.indexOf(titular.nome) >= 0,
    A.document.getElementById("flegarTitulo").textContent);

  const btnsOpcoes = A.document.querySelectorAll("#flegarLista button[data-flegar]");
  check("opcoes de troca disponiveis no painel (reserva + outros times)", btnsOpcoes.length >= 2, btnsOpcoes.length);

  // flega o primeiro da reserva
  const nomeReserva = st3.formacao.sobrando[0].nome;
  btnsOpcoes[0].dispatchEvent(new A.window.Event("click"));
  await wait(400);

  const st4 = JSON.parse(A.localStorage.getItem("tabela_volei_cores_v2"));
  check("painel fecha apos flegar", A.document.getElementById("flegarPainel").hidden === true);

  const t0novo = st4.formacao.times[0];
  check("reserva entrou em campo",
    t0novo.jogadores.some(j => j.nome === nomeReserva),
    t0novo.jogadores.map(j => j.nome));
  check("titular saiu de campo",
    !t0novo.jogadores.some(j => j.nome === titular.nome),
    t0novo.jogadores.map(j => j.nome));
  check("titular voltou para a reserva",
    st4.formacao.sobrando.some(j => j.nome === titular.nome),
    st4.formacao.sobrando.map(j => j.nome));
  check("reserva saiu da reserva",
    !st4.formacao.sobrando.some(j => j.nome === nomeReserva),
    st4.formacao.sobrando.map(j => j.nome));
  check("time continua com 5 jogadores", t0novo.jogadores.length === 5, t0novo.jogadores.length);
  check("total de jogadores continua 27",
    st4.formacao.times.reduce((n, t) => n + t.jogadores.length, 0) + st4.formacao.sobrando.length === 27);
  check("nenhum duplicado apos flegar", (() => {
    const ids = [];
    st4.formacao.times.forEach(t => t.jogadores.forEach(j => ids.push(j.id)));
    st4.formacao.sobrando.forEach(j => ids.push(j.id));
    return new Set(ids).size === 27;
  })(), (() => {
    const ids = [];
    st4.formacao.times.forEach(t => t.jogadores.forEach(j => ids.push(j.id)));
    st4.formacao.sobrando.forEach(j => ids.push(j.id));
    return { total: ids.length, unicos: new Set(ids).size };
  })());

  // soma recalculada
  const somaEsperada = Math.round(t0novo.jogadores.reduce((s, j) => s + (j.estrelas || 0), 0) * 10) / 10;
  check("soma do time recalculada", Math.abs(t0novo.soma - somaEsperada) < 0.01,
    { soma: t0novo.soma, esperada: somaEsperada });

  // capitao recalculado
  if (st4.formacao.comCapitao) {
    check("capitao recalculado", (() => {
      const cap = t0novo.jogadores.find(j => j.id === t0novo.capitao);
      return cap && t0novo.jogadores.every(j => (j.estrelas || 0) <= (cap.estrelas || 0));
    })(), t0novo.capitao);
  }

  // ---- MODO LEITURA: sem botao flegar ----
  const B = nova();
  await wait(400);
  // semeca o estado do Mesario para o espectador
  const seed = {};
  seed["tabela_volei_cores_v2"] = A.localStorage.getItem("tabela_volei_cores_v2");
  const C = nova();
  C.localStorage.setItem("tabela_volei_cores_v2", seed["tabela_volei_cores_v2"]);
  await wait(300);
  check("espectador nao ve botao flegar", C.document.querySelectorAll(".flegar-btn").length === 0,
    C.document.querySelectorAll(".flegar-btn").length);
  check("espectador nao ve botao importar elenco",
    C.document.getElementById("btnImportarElenco").hidden === true);

  console.log("\n=== " + (fails ? fails + " FALHAS" : "TODOS OS TESTES PASSARAM") + " ===");
  process.exit(fails ? 1 : 0);
})();
