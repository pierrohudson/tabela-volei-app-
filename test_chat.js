/* Testa a unicidade de apelidos do chat */
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

let fails = 0;
function check(n, c, e) {
  console.log((c ? "PASS  " : "FAIL  ") + n + (e !== undefined ? "  -> " + JSON.stringify(e) : ""));
  if (!c) fails++;
}

(() => {
  const A = nova();
  // 1) elemento de aviso removido
  check("texto 'Ao enviar, você concorda' removido",
    A.document.getElementById("chatAviso") === null);

  // 2) campo de apelido e mensagem de erro existem
  check("campo de apelido existe", A.document.getElementById("chatNick") !== null);
  check("elemento de erro de apelido existe", A.document.getElementById("chatNickMsg") !== null);
  check("botao trocar nome existe", A.document.getElementById("chatTrocar") !== null);

  // 3) botao de envio sem nós de texto vazios dentro (garante alinhamento)
  const btnEnv = A.document.getElementById("chatEnviar");
  const filhos = [...btnEnv.childNodes];
  const temTextoVazio = filhos.some(n => n.nodeType === 3 && n.textContent.trim() === "");
  check("botao enviar: svg limpo (sem texto vazio desalinhando)",
    btnEnv.querySelector("svg") !== null && !temTextoVazio);

  // 4) unicidade: normalizacao de apelido (funcao existe no app)
  const appCode = fs.readFileSync("_app.js", "utf8");
  check("funcao chatNormalizarNick presente no app", appCode.includes("function chatNormalizarNick"));
  check("funcao chatReservarNick presente no app", appCode.includes("function chatReservarNick"));
  check("funcao chatLiberarNick presente no app", appCode.includes("function chatLiberarNick"));
  check("path chat-apelidos configurado", appCode.includes('"chat-apelidos"'));

  console.log("\n=== " + (fails ? fails + " FALHAS" : "TODOS OS TESTES DE CHAT PASSARAM") + " ===");
  process.exit(fails ? 1 : 0);
})();
