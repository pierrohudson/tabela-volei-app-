/* Verifica que o Chat foi REMOVIDO do app e substituido pela aba de Informacoes */
const fs = require("fs");
const { parseHTML } = require("linkedom");
const html = fs.readFileSync("index.html", "utf8");
const code = fs.readFileSync("_app.js", "utf8");

let fails = 0;
function check(n, c, e) {
  console.log((c ? "PASS  " : "FAIL  ") + n + (e !== undefined ? "  -> " + JSON.stringify(e) : ""));
  if (!c) fails++;
}

(() => {
  const { document } = parseHTML(html);

  // 1) Nenhum elemento do chat sobrou no HTML
  check("aba do chat removida", document.getElementById("tab-chat") === null);
  check("botao do chat na barra de abas removido",
    document.querySelector('[data-tab="tab-chat"]') === null);
  check("lista de mensagens removida", document.getElementById("chatLista") === null);
  check("campo de mensagem removido", document.getElementById("chatInput") === null);
  check("campo de apelido removido", document.getElementById("chatNick") === null);
  check("botao enviar removido", document.getElementById("chatEnviar") === null);
  check("botao limpar chat removido", document.getElementById("chatLimpar") === null);
  check("indicador de status do chat removido", document.getElementById("chatDot") === null);
  check("nenhum elemento com classe chat-* no HTML",
    document.querySelectorAll('[class*="chat-"]').length === 0,
    document.querySelectorAll('[class*="chat-"]').length);

  // 2) Nenhuma logica de chat sobrou no JS
  check("sem funcao chatInit no codigo", !code.includes("function chatInit"));
  check("sem funcao chatReservarNick no codigo", !code.includes("function chatReservarNick"));
  check("sem funcao chatLiberarNick no codigo", !code.includes("function chatLiberarNick"));
  check("sem funcao chatDefinirNick no codigo", !code.includes("function chatDefinirNick"));
  check("sem funcao chatNormalizarNick no codigo", !code.includes("function chatNormalizarNick"));
  check("sem criacao de sessao temporaria de chat", !code.includes("chatCriarSessao"));
  check("sem stream do chat", !code.includes("chatIniciarStream"));
  check("path chat-apelidos removido", !code.includes('"chat-apelidos"'));
  check("path /chat nao e mais lido", !code.includes('var CHAT_PATH = "chat"'));
  check("nenhuma chamada a chatInit()", !code.includes("chatInit()"));

  // 3) A nova aba de Informacoes substituiu o chat
  check("aba de informacoes existe", document.getElementById("tab-info") !== null);
  check("botao de informacoes na barra de abas",
    document.querySelector('[data-tab="tab-info"]') !== null);
  check("rotulo 'Informações'",
    document.querySelector('[data-tab="tab-info"] .tab-txt')?.textContent.trim() === "Informações");
  check("informacoes do jogo dentro da aba info",
    document.getElementById("tab-info")?.contains(document.getElementById("infoJogoVisual")));
  check("mapa do local dentro da aba info",
    document.getElementById("tab-info")?.contains(document.getElementById("mapaEmbed")));
  check("classificacao fora da aba info",
    !document.getElementById("tab-info")?.contains(document.getElementById("standings")));
  check("classificacao dentro da aba classif",
    document.getElementById("tab-classif")?.contains(document.getElementById("standings")));

  console.log("\n=== " + (fails ? fails + " FALHAS" : "CHAT REMOVIDO E INFORMACOES OK") + " ===");
  process.exit(fails ? 1 : 0);
})();
