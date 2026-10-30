const fs = require("fs");
const { parseHTML } = require("linkedom");
const html = fs.readFileSync("index.html", "utf8");
const code = fs.readFileSync("_app.js", "utf8");

function nova(seed) {
  const { document, window } = parseHTML(html);
  const store = Object.assign({}, seed || {});
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

  // importa os 27 atletas
  A.document.getElementById("btnImportarElenco").dispatchEvent(new A.window.Event("click"));
  await wait(500);

  // sorteia 5 times x 5
  A.document.getElementById("sorteioTimes").value = "5";
  A.document.getElementById("sorteioPorTime").value = "5";
  A.document.getElementById("btnSortear").dispatchEvent(new A.window.Event("click"));
  await wait(600);

  // define um placar: jogo 1 = 3x1
  const sc = A.document.querySelectorAll("input.score");
  sc[0].value = "3"; sc[0].dispatchEvent(new A.window.Event("input"));
  sc[1].value = "1"; sc[1].dispatchEvent(new A.window.Event("input"));
  await wait(300);

  // renomeia um time (campo da tabela de classificacao) para checar que o nome sobrevive
  const nomeTime = A.document.querySelector('#standings input.teamname[data-team="0"]');
  nomeTime.value = "FURACAO"; nomeTime.dispatchEvent(new A.window.Event("change"));
  await wait(200);

  // estado ANTES do reset
  const antes = JSON.parse(A.localStorage.getItem("tabela_volei_cores_v2"));
  check("antes do reset: 27 jogadores cadastrados", antes.jogadores.length === 27, antes.jogadores.length);
  check("antes do reset: 5 times sorteados", antes.formacao && antes.formacao.times.length === 5,
    antes.formacao ? antes.formacao.times.length : null);
  check("antes do reset: placar 3x1 gravado", antes.scores["0-1"].a === 3 && antes.scores["0-1"].b === 1,
    antes.scores["0-1"]);
  check("antes do reset: nome do time renomeado", antes.teams[0] === "FURACAO", antes.teams[0]);

  // ---- ZERAR CAMPEONATO ----
  A.document.getElementById("btnReset").dispatchEvent(new A.window.Event("click"));
  await wait(500);

  const depois = JSON.parse(A.localStorage.getItem("tabela_volei_cores_v2"));

  // o que DEVE ser zerado
  check("reset: placares zerados", Object.keys(depois.scores).length === 0, depois.scores);
  check("reset: finais zeradas",
    depois.finals.f34.a === null && depois.finals.f34.b === null &&
    depois.finals.f12.a === null && depois.finals.f12.b === null, depois.finals);

  // o que DEVE ser MANTIDO (o bug que estamos corrigindo)
  check("reset: 27 jogadores MANTIDOS", depois.jogadores.length === 27, depois.jogadores.length);
  check("reset: nomes dos jogadores preservados",
    depois.jogadores[0].nome === antes.jogadores[0].nome &&
    depois.jogadores[26].nome === antes.jogadores[26].nome,
    [depois.jogadores[0].nome, depois.jogadores[26].nome]);
  check("reset: estrelas dos jogadores preservadas",
    depois.jogadores.every((j, i) => j.estrelas === antes.jogadores[i].estrelas));
  check("reset: IDs dos jogadores preservados",
    depois.jogadores.every((j, i) => j.id === antes.jogadores[i].id));
  check("reset: formacao de times MANTIDA",
    depois.formacao && depois.formacao.times.length === 5,
    depois.formacao ? depois.formacao.times.length : null);
  check("reset: jogadores dentro dos times preservados",
    depois.formacao.times.every(t => t.jogadores.length === 5),
    depois.formacao.times.map(t => t.jogadores.length));
  check("reset: nomes dos times MANTIDOS", depois.teams[0] === "FURACAO", depois.teams[0]);

  // a lista de jogadores continua mostrando os 27 jogadores apos o reset
  await wait(200);
  check("reset: 27 campos de nome ainda na lista de jogadores",
    A.document.querySelectorAll("#jogLista input.jog-nome").length === 27,
    A.document.querySelectorAll("#jogLista input.jog-nome").length);

  console.log("\n=== " + (fails ? fails + " FALHAS" : "TODOS OS TESTES DE RESET PASSARAM") + " ===");
  process.exit(fails ? 1 : 0);
})();
