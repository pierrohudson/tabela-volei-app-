/* Verifica o rotulo do time: padrao vs renomeado */
const fs = require("fs");
const { parseHTML } = require("linkedom");

const html = fs.readFileSync("index.html", "utf8");
const code = fs.readFileSync("_app.js", "utf8");

function novoApp(seed) {
  const { document, window } = parseHTML(html);
  const store = {};
  const localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };
  const fakeFetch = () =>
    Promise.resolve({
      ok: true, status: 200,
      json: () => Promise.resolve(null),
      text: () => Promise.resolve("null"),
      body: null
    });
  const nav = {
    userAgent: "iPhone", platform: "iPhone", maxTouchPoints: 5,
    serviceWorker: { register: () => Promise.resolve() }
  };
  if (seed) store["tabela_volei_cores_v2"] = JSON.stringify(seed);
  const fn = new window.Function(
    "document", "window", "localStorage", "confirm", "print", "navigator", "fetch",
    "AbortController", "ReadableStream", "TextDecoder", "setTimeout", "setInterval",
    "clearTimeout", "unescape", "encodeURIComponent", "Date", "Math", "JSON", "alert", code
  );
  fn(document, window, localStorage, () => true, () => {}, nav, fakeFetch,
    function () { this.signal = { addEventListener() {} }; this.abort = () => {}; },
    undefined, TextDecoder, setTimeout, setInterval, clearTimeout,
    unescape, encodeURIComponent, Date, Math, JSON, () => {});
  return { document, window };
}

const base = (teams) => ({
  teams,
  cfg: { win: 3, loss: 0 },
  scores: {},
  finals: { f34: { a: null, b: null }, f12: { a: null, b: null } },
  jogadores: [],
  formacao: {
    times: [
      { jogadores: [{ id: "1", nome: "Ana", estrelas: 3 }], soma: 3, capitao: "1" },
      { jogadores: [{ id: "2", nome: "Bia", estrelas: 2.5 }], soma: 2.5, capitao: "2" }
    ],
    sobrando: []
  },
  sorteioBrinde: null,
  infoJogo: "x",
  infoFormato: { alinhamento: "left", fonte: 1.02 },
  mapsUrl: "https://maps.app.goo.gl/eM9BXU1Gom4VBpFN8"
});

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  let falhas = 0;
  function check(nome, cond, extra) {
    console.log((cond ? "PASS  " : "FAIL  ") + nome + (extra !== undefined ? "  -> " + JSON.stringify(extra) : ""));
    if (!cond) falhas++;
  }

  /* --- caso 1: nomes padrao (TIME - N) --- */
  const A = novoApp(base(["TIME - 1", "TIME - 2", "TIME - 3", "TIME - 4", "TIME - 5"]));
  await espera(500);
  const opts1 = [...A.document.querySelectorAll("#raffleOrigem option")].map((o) => o.textContent);
  console.log("\n=== nomes padrao ===");
  console.log(opts1.join("\n"));
  console.log("");
  check("nenhum 'TIME - ' aparece no select",
    !opts1.some((t) => t.includes("TIME -")), opts1);
  check("nenhum '(TIME' aparece no select",
    !opts1.some((t) => t.includes("(TIME")), opts1);
  check("opcoes de time comecam com 'Time N'",
    opts1.slice(1, 6).every((t) => /^Time \d+/.test(t)), opts1.slice(1, 6));
  check("badge sem nome entre parenteses",
    !A.document.getElementById("raffleTimeBadge").textContent.includes("("),
    A.document.getElementById("raffleTimeBadge").textContent);

  /* --- caso 2: admin renomeou o time 5 --- */
  const B = novoApp(base(["TIME - 1", "TIME - 2", "TIME - 3", "TIME - 4", "FURACAO"]));
  await espera(500);
  const opts2 = [...B.document.querySelectorAll("#raffleOrigem option")].map((o) => o.textContent);
  console.log("\n=== time 5 renomeado para FURACAO ===");
  console.log(opts2.join("\n"));
  console.log("");
  check("time 5 renomeado mostra o nome real",
    opts2[5].startsWith("Time 5 (FURACAO)"), opts2[5]);
  check("time 4 padrao continua sem parenteses",
    opts2[4].startsWith("Time 4") && !opts2[4].includes("("), opts2[4]);
  check("nenhum '(TIME' aparece no select",
    !opts2.some((t) => t.includes("(TIME")), opts2);

  console.log("\n=== " + (falhas ? falhas + " FALHAS" : "TODOS OS TESTES PASSARAM") + " ===");
  process.exit(falhas ? 1 : 0);
})();
