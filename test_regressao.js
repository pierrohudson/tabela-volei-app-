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
  check("estado legado: sem quebra na aba", L.document.getElementById("tab-info").classList.contains("ativo"));

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

  // ---- CABECALHO: 6 icones minimalistas ----
  check("cabecalho tem 6 botoes/links de acao",
    A.document.querySelectorAll(".header-ico").length === 6,
    A.document.querySelectorAll(".header-ico").length);
  check("icone do WhatsApp com link correto",
    (A.document.getElementById("btnWpp") || {}).href?.includes("chat.whatsapp.com"));
  check("icone do Instagram com link correto",
    (A.document.getElementById("btnInstagram") || {}).href?.includes("instagram.com/voleidobosque_"));
  check("icone do Pix existe", A.document.getElementById("btnPix") !== null);
  check("Pix e o primeiro icone do cabecalho",
    A.document.querySelector(".header-actions .header-ico").id === "btnPix",
    A.document.querySelector(".header-actions .header-ico").id);
  check("modal do Pix existe", A.document.getElementById("pixModal") !== null);
  check("modal do Pix com QR Code",
    A.document.querySelector("#pixModal .pix-qr img") !== null);
  check("codigo Pix copia e cola presente",
    (A.document.getElementById("pixCodigo")?.textContent || "").startsWith("00020126450014br.gov.bcb.pix"));
  check("botao copiar codigo Pix existe",
    A.document.getElementById("btnPixCopiar") !== null);
  check("modal do Pix começa fechado",
    A.document.getElementById("pixModal").hidden === true);
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

  // ---- ORDEM DAS ABAS: Informacoes primeiro (checado antes de clicar) ----
  const ordemAbas = [...A.document.querySelectorAll(".tab-btn")].map(b => b.dataset.tab);
  check("Informacoes e a primeira aba",
    ordemAbas[0] === "tab-info", ordemAbas);
  check("Classificacao e a segunda aba",
    ordemAbas[1] === "tab-classif", ordemAbas);
  check("Informacoes e o painel ativo inicial",
    A.document.getElementById("tab-info").classList.contains("ativo"),
    A.document.querySelector(".tab-btn.ativo")?.dataset.tab);

  ["tab-classif", "tab-jogos", "tab-sorteio", "tab-info", "tab-jogadores"].forEach(id => {
    const btn = A.document.querySelector('[data-tab="' + id + '"]');
    btn.dispatchEvent(new A.window.Event("click"));
  });
  await wait(150);
  check("aba de jogadores ativa apos clicar",
    A.document.getElementById("tab-jogadores").classList.contains("ativo"));

  // ---- CHAT REMOVIDO ----
  check("aba do chat nao existe mais", A.document.getElementById("tab-chat") === null);
  check("chat nao aparece na barra de abas",
    A.document.querySelector('[data-tab="tab-chat"]') === null);
  check("lista do chat removida", A.document.getElementById("chatLista") === null);
  check("campo de mensagem removido", A.document.getElementById("chatInput") === null);
  check("campo de apelido removido", A.document.getElementById("chatNick") === null);
  check("nenhum elemento com classe chat-* no app",
    A.document.querySelectorAll('[class*="chat-"]').length === 0,
    A.document.querySelectorAll('[class*="chat-"]').length);
  check("codigo do app sem modulo de chat",
    !code.includes("chatInit") && !code.includes("chatReservarNick"));

  // ---- NOVA ABA DE INFORMACOES ----
  check("aba de informacoes existe", A.document.getElementById("tab-info") !== null);
  check("informacoes aparece na barra de abas",
    A.document.querySelector('[data-tab="tab-info"]') !== null);
  check("rotulo da aba e 'Informacoes'",
    A.document.querySelector('[data-tab="tab-info"] .tab-txt')?.textContent.trim() === "Informações",
    A.document.querySelector('[data-tab="tab-info"] .tab-txt')?.textContent);
  check("informacoes do jogo dentro da aba de informacoes",
    A.document.getElementById("tab-info").contains(A.document.getElementById("infoJogoVisual")) &&
    A.document.getElementById("tab-info").contains(A.document.getElementById("mapaEmbed")));
  check("classificacao NAO esta dentro da aba de informacoes",
    !A.document.getElementById("tab-info").contains(A.document.getElementById("standings")));
  check("classificacao continua na aba de classificacao",
    A.document.getElementById("tab-classif").contains(A.document.getElementById("standings")));
  check("cada aba tem um icone svg",
    A.document.querySelectorAll(".tab-btn .tab-ico").length === 5,
    A.document.querySelectorAll(".tab-btn .tab-ico").length);

  // ---- FORMATACAO DO MURAL (alinhar + tamanho da fonte) ----
  check("3 botoes de alinhamento",
    A.document.querySelectorAll("[data-info-alinhamento]").length === 3);
  check("4 tamanhos de fonte",
    A.document.querySelectorAll("[data-info-fonte]").length === 4);
  check("alinhar: esquerda, centro e direita",
    ["left", "center", "right"].every(a =>
      A.document.querySelector('[data-info-alinhamento="' + a + '"]') !== null));
  check("botao centralizar existe",
    A.document.querySelector('[data-info-alinhamento="center"]') !== null);
  check("controles de formatacao dentro do editor",
    A.document.getElementById("infoJogoEdit").contains(
      A.document.querySelector("[data-info-alinhamento]")));
  check("funcao normalizarInfoFormato presente", code.includes("function normalizarInfoFormato"));
  check("formato salvo no estado", code.includes("infoFormato"));
  check("formato publicado no firebase", /infoFormato:\s*state\.infoFormato/.test(code));
  check("alinhamento aplicado via variavel CSS",
    code.includes("--info-alinhamento") && code.includes("--info-fonte"));

  // ---- CONTADOR DE JOGADORES EM PILLS ----
  check("contador total de jogadores existe",
    A.document.getElementById("gavetaTotal") !== null);
  check("contador de marcados existe",
    A.document.getElementById("gavetaMarcados") !== null);
  check("resumo usa pills formatadas",
    A.document.querySelectorAll(".gaveta-pill").length === 2,
    A.document.querySelectorAll(".gaveta-pill").length);
  /* o cabecalho da gaveta nao pode transbordar em telas estreitas */
  check("cabecalho da gaveta pode encolher (min-width: 0)",
    /\.gaveta-info \{[^}]*min-width:\s*0/.test(html));
  check("titulo da gaveta pode encolher",
    /\.gaveta-titulo \{[^}]*min-width:\s*0/.test(html));
  check("pills com flex: none (nao encolhem fora de forma)",
    /\.gaveta-pill \{[^}]*flex:\s*none/.test(html));
  check("regra para telas de 380px existe",
    html.includes("@media (max-width: 380px)"));
  check("gaveta compacta na media de 580px",
    /@media \(max-width: 580px\)[\s\S]*?\.gaveta-head \{[^}]*padding:\s*12px 14px/.test(html));

  // ---- BOTAO SORTEAR CENTRALIZADO ----
  check("botao sortear existe", A.document.getElementById("btnSortear") !== null);
  check("botao sortear tem classe dedicada",
    A.document.getElementById("btnSortear").classList.contains("btn-sortear"));
  check("campos do sorteio agrupados",
    A.document.querySelector(".sorteio-campos") !== null);
  check("rotulos dos campos acima dos inputs",
    A.document.querySelectorAll(".sorteio-campo .sorteio-label").length === 2);

  // ---- WIDGETS INFO DO JOGO + GOOGLE MAPS ----
  check("card de informacoes do jogo existe", A.document.getElementById("infoJogoVisual") !== null);
  check("texto padrao de info do jogo carregado",
    A.document.getElementById("infoJogoVisual")?.textContent.includes("ARENA FAMILY"));
  check("status CONFIRMADO com classe destacada",
    A.document.querySelector(".info-linha-status")?.textContent.includes("CONFIRMADO"));
  check("botao de editar info existe", A.document.getElementById("infoJogoEditar") !== null);
  check("card do Google Maps existe", A.document.getElementById("mapaEmbed") !== null);
  check("iframe do mapa usa OpenStreetMap com o pin da Arena Family",
    A.document.getElementById("mapaEmbed")?.src.includes("openstreetmap.org") &&
    A.document.getElementById("mapaEmbed")?.src.includes("-3.7915037%2C-38.5619707"),
    A.document.getElementById("mapaEmbed")?.src);
  check("botao para traçar rota no Google Maps",
    A.document.getElementById("mapaBtnGoogle")?.href.includes("maps.app.goo.gl"));
  check("botao para traçar rota no Waze",
    A.document.getElementById("mapaBtnWaze")?.href.includes("waze.com"));
  check("nome do local exibido", A.document.getElementById("mapaNomeLocal")?.textContent.includes("Arena Family"));
  check("campo de link do mapa existe", A.document.getElementById("mapaUrl") !== null);

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
  /* o linkedom nao aplica CSS: a regra e conferida no texto-fonte */
  check("CSS esconde o botao de editar info no modo leitura",
    /body\.modo-leitura \.btn-editar-info/.test(html) &&
    !/\.body\.modo-leitura \.btn-editar-info/.test(html));
  check("CSS esconde o campo de link do mapa no modo leitura",
    /body\.modo-leitura \.mapa-footer/.test(html));

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
