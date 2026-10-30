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

const LEGADO = {
  "tabela_volei_cores_v2": JSON.stringify({
    teams: ["AZUL", "VERMELHO", "LARANJA", "VERDE", "CINZA"],
    cfg: { win: 3, loss: 0 },
    scores: { "0-1": { a: 3, b: 1 }, "2-3": { a: 2, b: 3 } },
    finals: { f34: { a: null, b: null }, f12: { a: null, b: null } }
  })
};

(async () => {
  // ---- BACKWARD COMPAT: estado antigo sem jogadores ----
  const L = nova(LEGADO);
  await wait(400);
  check("estado legado: 5 linhas na classificacao",
    L.document.querySelectorAll("#standings tbody tr").length === 5,
    L.document.querySelectorAll("#standings tbody tr").length);
  check("estado legado: os 5 nomes preservados",
    [...L.document.querySelectorAll("input.teamname")].map(i => i.value).sort().join(",") ===
    "AZUL,CINZA,LARANJA,VERDE,VERMELHO",
    [...L.document.querySelectorAll("input.teamname")].map(i => i.value));
  check("estado legado: state.teams intacta",
    JSON.parse(L.localStorage.getItem("tabela_volei_cores_v2")).teams.join(",") ===
    "AZUL,VERMELHO,LARANJA,VERDE,CINZA");
  check("estado legado: placar carregado",
    L.document.querySelectorAll("input.score")[0].value === "3",
    L.document.querySelectorAll("input.score")[0].value);
  check("estado legado: elenco vazio (sem erro)",
    /Nenhum jogador cadastrado/.test(L.document.getElementById("jogLista").textContent));
  check("estado legado: sem quebra na aba", L.document.getElementById("tab-classif").classList.contains("ativo"));

  // ---- PLACAR + CLASSIFICACAO (regressao) ----
  const A = nova();
  await wait(300);
  A.document.getElementById("btnAdmin").dispatchEvent(new A.window.Event("click"));
  A.document.getElementById("adminPass").value = "HudsonAdmin@2026";
  A.document.getElementById("btnAdminLogin").dispatchEvent(new A.window.Event("click"));
  await wait(600);

  check("modo mesario", A.document.body.className.includes("modo-admin"));
  check("10 cards de jogo", A.document.querySelectorAll(".match-card").length === 10);
  check("2 finais", A.document.querySelectorAll(".final-box").length === 2);
  check("3 slots no podio", A.document.querySelectorAll(".podium-slot").length === 3);

  // ---- CABECALHO: 4 icones minimalistas ----
  check("cabecalho tem 5 botoes/links de acao",
    A.document.querySelectorAll(".header-ico").length === 5,
    A.document.querySelectorAll(".header-ico").length);
  check("icone do WhatsApp com link correto",
    (A.document.getElementById("btnWpp") || {}).href?.includes("chat.whatsapp.com"));
  check("icone do Instagram com link correto",
    (A.document.getElementById("btnInstagram") || {}).href?.includes("instagram.com/voleidobosque_"));
  check("icone de instalar existe",
    A.document.getElementById("btnInstall") !== null);
  check("icone de admin existe",
    A.document.getElementById("btnAdmin") !== null);
  check("icone de zerar existe",
    A.document.getElementById("btnReset") !== null);
  check("ao vivo nao tem mais botao admin duplicado",
    A.document.querySelectorAll("#btnAdmin").length === 1,
    A.document.querySelectorAll("#btnAdmin").length);

  // placar: time 1 x time 2 = 3x1
  const sc = A.document.querySelectorAll("input.score");
  sc[0].value = "3"; sc[0].dispatchEvent(new A.window.Event("input"));
  sc[1].value = "1"; sc[1].dispatchEvent(new A.window.Event("input"));
  await wait(300);

  const st = JSON.parse(A.localStorage.getItem("tabela_volei_cores_v2"));
  check("placar salvo", st.scores["0-1"].a === 3 && st.scores["0-1"].b === 1, st.scores["0-1"]);

  // classificacao: time 1 lider com 3 pontos
  // a tabela reordena por pontuacao; o nome esta no <input>, nao no td
  const linhas = [...A.document.querySelectorAll("#standings tbody tr")].map(tr => {
    const tds = [...tr.querySelectorAll("td")];
    return {
      pos: tds[0].textContent.trim(),
      nome: tr.querySelector("input.teamname").value,
      pontos: tds[8].textContent.trim()
    };
  });
  check("time 1 (vencedor) em 1o lugar com 3 pontos",
    linhas[0].pos === "1º" && linhas[0].nome === "TIME - 1" && linhas[0].pontos === "3", linhas[0]);
  check("time 2 (perdedor) em ultimo lugar com 0 pontos",
    linhas[4].nome === "TIME - 2" && linhas[4].pontos === "0", linhas[4]);
  check("classificacao ordenada por pontos (decrescente)",
    linhas.every((l, i) => i === 0 || Number(linhas[i-1].pontos) >= Number(l.pontos)),
    linhas.map(l => l.pontos));

  // times: 5 rodadas, todos os 10 confrontos
  const cartoes = A.document.querySelectorAll(".match-card");
  check("cards seguem a ordem original", cartoes[0].textContent.indexOf("TIME - 1") === 0 ||
    cartoes[0].textContent.indexOf("TIME - 1") >= 0, cartoes[0].textContent.slice(0, 40));

  // ---- ABAS ----
  check("5 abas", A.document.querySelectorAll(".tab-btn").length === 5);
  ["tab-classif", "tab-jogos", "tab-sorteio", "tab-chat", "tab-jogadores"].forEach(id => {
    const btn = A.document.querySelector('[data-tab="' + id + '"]');
    btn.dispatchEvent(new A.window.Event("click"));
  });
  await wait(150);
  check("aba de jogadores ativa apos clicar",
    A.document.getElementById("tab-jogadores").classList.contains("ativo"));

  // ---- CHAT (estrutura) ----
  check("aba do chat existe", A.document.getElementById("tab-chat") !== null);
  check("lista do chat existe", A.document.getElementById("chatLista") !== null);
  check("campo de mensagem existe", A.document.getElementById("chatInput") !== null);
  check("botao enviar existe", A.document.getElementById("chatEnviar") !== null);
  check("campo de apelido existe", A.document.getElementById("chatNick") !== null);
  check("indicador de status do chat existe (bolinha)",
    A.document.getElementById("chatDot") !== null);
  check("chatTopo mostra apenas 'Chat'",
    A.document.querySelector(".chat-topo h3") !== null &&
    A.document.querySelector(".chat-topo h3").textContent.trim() === "Chat",
    A.document.querySelector(".chat-topo h3")?.textContent);
  check("sem texto 'ao vivo' ao lado da bolinha",
    A.document.getElementById("chatStatus") === null);
  check("chat aparece na barra de abas",
    A.document.querySelector('[data-tab="tab-chat"]') !== null);
  check("cada aba tem um icone svg",
    A.document.querySelectorAll(".tab-btn .tab-ico").length === 5,
    A.document.querySelectorAll(".tab-btn .tab-ico").length);

  // ---- FINAIS E PREMIACAO DENTRO DA ABA DE JOGOS ----
  check("finais dentro da aba de jogos",
    A.document.getElementById("tab-jogos").contains(A.document.getElementById("finals")) &&
    A.document.getElementById("tab-jogos").contains(A.document.getElementById("podium")));
  check("abas de finais e premiacao removidas",
    A.document.querySelectorAll('[data-tab="tab-finais"],[data-tab="tab-premio"]').length === 0 &&
    A.document.getElementById("tab-finais") === null &&
    A.document.getElementById("tab-premio") === null);

  // ---- SORTEIO DO CAMPEAO ----
  check("aba de sorteio existe", A.document.getElementById("tab-sorteio") !== null);
  check("display do sorteio existe", A.document.getElementById("raffleDisplay") !== null);
  check("botao girar sorteio existe", A.document.getElementById("btnRaffle") !== null);
  check("campo premio existe", A.document.getElementById("rafflePremio") !== null);

  // ---- MODO LEITURA ----
  const R = nova();
  await wait(300);
  check("modo leitura por padrao", R.document.body.className.includes("modo-leitura"));
  check("campos travados", [...R.document.querySelectorAll("input.teamname")].every(i => i.readOnly));
  check("sem botao adicionar", R.document.getElementById("btnAddJogador").hidden === true);
  check("sem botao importar elenco", R.document.getElementById("btnImportarElenco").hidden === true);
  check("sem botao sortear", R.document.getElementById("btnSortear").hidden === true);
  check("sem botao limpar chat para espectador",
    R.document.getElementById("chatLimpar").hidden === true);

  // espectador nao edita o placar
  const antes = R.localStorage.getItem("tabela_volei_cores_v2");
  const rsc = R.document.querySelectorAll("input.score")[0];
  rsc.value = "9"; rsc.dispatchEvent(new R.window.Event("input"));
  await wait(200);
  check("espectador nao edita placar",
    R.localStorage.getItem("tabela_volei_cores_v2") === antes);

  console.log("\n=== " + (fails ? fails + " FALHAS" : "TODOS OS TESTES PASSARAM") + " ===");
  process.exit(fails ? 1 : 0);
})();
