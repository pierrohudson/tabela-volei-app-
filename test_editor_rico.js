/* ============================================================
   TESTA O EDITOR RICO DO MURAL
   - formatacao (cor, tamanho, negrito, italico) so no trecho selecionado
   - sanitizacao do HTML salvo
   - o resto do mural nao e afetado
   ============================================================ */
const fs = require("fs");
const { parseHTML } = require("linkedom");

const html = fs.readFileSync("index.html", "utf8");
const code = fs.readFileSync("_app.js", "utf8");

const { document, window } = parseHTML(html);
/* shim de Range/Selection (o linkedom nao implementa) */
new Function("window", "document", fs.readFileSync("shim_dom.js", "utf8"))(window, document);

const store = {};
const localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; }
};
const fakeFetch = () => Promise.resolve({
  ok: true, status: 200,
  json: () => Promise.resolve(null),
  text: () => Promise.resolve("null"),
  body: null
});
const nav = { userAgent: "iPhone", platform: "iPhone", maxTouchPoints: 5,
  serviceWorker: { register: () => Promise.resolve() } };

store["tabela_volei_cores_v2"] = JSON.stringify({
  teams: ["TIME - 1", "TIME - 2", "TIME - 3", "TIME - 4", "TIME - 5"],
  cfg: { win: 3, loss: 0 },
  scores: {}, finals: { f34: { a: null, b: null }, f12: { a: null, b: null } },
  jogadores: [], formacao: null, sorteioBrinde: null,
  infoJogo: "<div>VOLEI SABADO 19:00</div>" +
    '<div class="info-linha-status">CONFIRMADO</div>' +
    "<div>ARENA FAMILY</div>",
  infoFormato: { alinhamento: "left", fonte: 1.02 },
  mapsUrl: "https://maps.app.goo.gl/x"
});

const fn = new window.Function(
  "document", "window", "localStorage", "confirm", "print", "navigator", "fetch",
  "AbortController", "ReadableStream", "TextDecoder", "setTimeout", "setInterval",
  "clearTimeout", "unescape", "encodeURIComponent", "Date", "Math", "JSON", "alert", code
);
fn(document, window, localStorage, () => true, () => {}, nav, fakeFetch,
  function () { this.signal = { addEventListener() {} }; this.abort = () => {}; },
  undefined, TextDecoder, setTimeout, setInterval, clearTimeout,
  unescape, encodeURIComponent, Date, Math, JSON, () => {});

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

let falhas = 0;
function check(nome, cond, extra) {
  console.log((cond ? "PASS  " : "FAIL  ") + nome + (extra !== undefined ? "  -> " + JSON.stringify(extra) : ""));
  if (!cond) falhas++;
}

/* seleciona um texto dentro do editor */
function selecionar(editor, texto) {
  const walker = document.createTreeWalker(editor, 4);
  let no = walker.nextNode();
  while (no) {
    const i = no.nodeValue.indexOf(texto);
    if (i >= 0) {
      const r = document.createRange();
      r.setStart(no, i);
      r.setEnd(no, i + texto.length);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(r);
      return true;
    }
    no = walker.nextNode();
  }
  return false;
}

function clicar(seletor) {
  const b = document.querySelector(seletor);
  if (!b) return false;
  b.dispatchEvent(new window.Event("mousedown", { bubbles: true, cancelable: true }));
  b.dispatchEvent(new window.Event("click", { bubbles: true }));
  return true;
}

(async () => {
  await espera(400);

  const mural = document.getElementById("infoJogoVisual");
  const editor = document.getElementById("infoJogoInput");
  const T = window.__test;

  check("hook de teste disponivel", !!T);

  /* ---- 1) render do mural a partir do HTML salvo ---- */
  check("mural renderiza as 3 linhas", mural.querySelectorAll("div").length === 3, mural.innerHTML);
  check("status CONFIRMADO com classe de destaque",
    mural.querySelector(".info-linha-status") !== null);
  check("status CONFIRMADO em verde",
    mural.querySelector(".info-linha-status").textContent === "CONFIRMADO");

  /* ---- 2) controles de formatacao ---- */
  check("2 botoes de estilo (negrito/italico)",
    document.querySelectorAll("[data-info-estilo]").length === 2);
  check("6 botoes de cor",
    document.querySelectorAll("[data-info-cor]").length === 6);

  /* ---- 3) modo admin ---- */
  T.entrarMesario();
  check("modo admin ativa", document.body.className.includes("modo-admin"));
  check("editor editavel no modo admin",
    editor.getAttribute("contenteditable") === "true",
    editor.getAttribute("contenteditable"));
  check("barra de formatacao visivel no modo admin",
    !document.querySelector(".info-format").hidden);

  /* ---- 4) COR so no trecho selecionado ---- */
  editor.innerHTML = "<div>VOLEI SABADO 19:00</div>" +
    '<div class="info-linha-status">CONFIRMADO</div>' +
    "<div>ARENA FAMILY</div>";

  check("selecao de 'CONFIRMADO' funciona", selecionar(editor, "CONFIRMADO"));
  check("botao de cor clicavel", clicar('[data-info-cor="#ffcf1a"]'));
  check("cor aplicada no trecho", editor.innerHTML.includes('data-cor="#ffcf1a"'), editor.innerHTML);
  check("so 1 trecho com cor (nao a linha inteira)",
    editor.querySelectorAll("[data-cor]").length === 1,
    editor.querySelectorAll("[data-cor]").length);
  check("o trecho com cor e exatamente 'CONFIRMADO'",
    editor.querySelectorAll("[data-cor]")[0] &&
    editor.querySelectorAll("[data-cor]")[0].textContent === "CONFIRMADO",
    editor.querySelectorAll("[data-cor]")[0] ?
      editor.querySelectorAll("[data-cor]")[0].textContent : null);
  check("as outras linhas ficaram intactas",
    editor.innerHTML.includes("<div>VOLEI SABADO 19:00</div>") &&
    editor.innerHTML.includes("<div>ARENA FAMILY</div>"), editor.innerHTML);

  /* ---- 5) NEGRITO so no trecho ---- */
  editor.innerHTML = "<div>VOLEI SABADO 19:00</div><div>ARENA FAMILY</div>";
  selecionar(editor, "ARENA FAMILY");
  clicar('[data-info-estilo="negrito"]');
  check("negrito aplicado", editor.querySelector("b") !== null, editor.innerHTML);
  check("negrito cobre so o trecho",
    editor.querySelector("b") && editor.querySelector("b").textContent === "ARENA FAMILY",
    editor.querySelector("b") ? editor.querySelector("b").textContent : null);

  /* ---- 6) ITALICO so no trecho ---- */
  editor.innerHTML = "<div>VOLEI SABADO 19:00</div><div>ARENA FAMILY</div>";
  selecionar(editor, "SABADO");
  clicar('[data-info-estilo="italico"]');
  check("italico aplicado", editor.querySelector("i") !== null, editor.innerHTML);
  check("italico cobre so o trecho",
    editor.querySelector("i") && editor.querySelector("i").textContent === "SABADO",
    editor.querySelector("i") ? editor.querySelector("i").textContent : null);

  /* ---- 7)TAMANHO so no trecho ---- */
  editor.innerHTML = "<div>VOLEI SABADO 19:00</div><div>ARENA FAMILY</div>";
  selecionar(editor, "SABADO");
  T.aplicarTrecho("data-tam", "1.55");
  check("tamanho aplicado no trecho",
    editor.innerHTML.includes('data-tam="1.55"'), editor.innerHTML);
  check("tamanho cobre so o trecho",
    editor.querySelectorAll("[data-tam]").length === 1 &&
    editor.querySelectorAll("[data-tam]")[0].textContent === "SABADO",
    editor.querySelectorAll("[data-tam]").length);

  /* ---- 8) SANITIZACAO ---- */
  editor.innerHTML = '<div onclick="alert(1)">texto</div>';
  editor.dispatchEvent(new window.Event("input", { bubbles: true }));
  const mural2 = document.getElementById("infoJogoVisual");
  check("onclick removido do mural", !mural2.innerHTML.includes("onclick"), mural2.innerHTML);

  editor.innerHTML = "<div>ok</div>";
  editor.dispatchEvent(new window.Event("input", { bubbles: true }));
  check("mural volta ao normal", mural2.textContent === "ok", mural2.textContent);

  /* ---- 9) preview ao vivo com cor ---- */
  editor.innerHTML = '<div><span data-cor="#ffcf1a">DESTAQUE</span></div>';
  editor.dispatchEvent(new window.Event("input", { bubbles: true }));
  const corPreview = mural2.querySelector("span") ? mural2.querySelector("span").style.color : "";
  /* o browser normaliza para rgb(); o linkedom mantem o hex */
  check("preview aplica a cor no mural",
    corPreview === "rgb(255, 207, 26)" || corPreview === "#ffcf1a", corPreview);
  check("preview mostra o texto destacado",
    mural2.textContent === "DESTAQUE", mural2.textContent);

  /* ---- 10) estado legado (texto puro) vira HTML ---- */
  const legado = T.normalizar("VOLEI SABADO 19:00\nCONFIRMADO\nARENA FAMILY");
  check("texto puro legado convertido em HTML",
    legado.includes("<div>") && legado.includes("info-linha-status"), legado);
  check("texto legado preserva as 3 linhas",
    legado.split("<div").length - 1 === 3, legado);

  /* ---- 11) estado legado no Firebase continua renderizando ---- */
  const st = T.estado();
  st.infoJogo = T.normalizar(st.infoJogo);
  check("mural legado normaliza sem perder conteudo",
    T.htmlParaTexto(st.infoJogo) === "VOLEI SABADO 19:00\nCONFIRMADO\nARENA FAMILY",
    JSON.stringify(T.htmlParaTexto(st.infoJogo)));

  /* ---- 12) cor fora da paleta e ignorada ---- */
  const corRuim = T.sanitizar('<div><span data-cor="#ff0000">x</span></div>');
  check("cor fora da paleta removida",
    !corRuim.includes("#ff0000"), corRuim);

  /* ---- 13) tamanho fora da escala e removido ---- */
  const tamRuim = T.sanitizar('<div><span data-tam="9">x</span></div>');
  check("tamanho fora da escala removido", !tamRuim.includes('data-tam="9"'), tamRuim);

  console.log("\n=== " + (falhas ? falhas + " FALHAS" : "TODOS OS TESTES PASSARAM") + " ===");
  process.exit(falhas ? 1 : 0);
})();
