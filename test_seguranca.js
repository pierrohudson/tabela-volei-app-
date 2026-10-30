/* Testa os patches de seguranca aplicados */
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

  // 1) CSP declarado na meta tag
  const csp = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  check("meta tag CSP presente", csp !== null);
  check("CSP restringe default-src e connect-src",
    csp && csp.content.includes("default-src") && csp.content.includes("connect-src"));

  // 2) Sem hash e sem senha de Admin no codigo do cliente
  check("ADMIN_PASS_SHA256 removido do codigo", !code.includes("ADMIN_PASS_SHA256"));
  check("sha256Hex removido do codigo", !code.includes("function sha256Hex"));
  check("senha do admin em texto puro nao existe", !code.includes("HudsonAdmin@2026"));

  // 3) Rate limiting presente no codigo
  check("contador de tentativas presente", code.includes("loginTentativas"));
  check("bloqueio por tempo (loginBloqueadoAte)", code.includes("loginBloqueadoAte"));
  check("mensagem de bloqueio implementada", code.includes("Muitas tentativas. Aguarde"));

  // 4) Sem backdoor de auto-criacao no cliente
  check("sem signUp com email do admin no cliente",
    !/authPost\("signUp",\s*\{[^}]*ADMIN_EMAIL/.test(code));

  console.log("\n=== " + (fails ? fails + " FALHAS" : "TODOS OS TESTES DE SEGURANCA PASSARAM") + " ===");
  process.exit(fails ? 1 : 0);
})();
