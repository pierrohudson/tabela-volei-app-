/* ============================================================
   SUÍTE DE TESTES: FORMATO DINÂMICO DO TORNEIO (3, 4, 5 ou 6 times)
   - 5 times padrão 100% preservado (10 jogos clássicos)
   - 3 times: 3 jogos, final direta (1ºx2º), 3º lugar automático
   - 4 times: 6 jogos, 2 finais
   - 6 times: 15 jogos, 2 finais, cor do Time 6
   - Sincronização e segurança de modo leitura
   ============================================================ */
const fs = require('fs');
const { parseHTML } = require('linkedom');

const html = fs.readFileSync('index.html', 'utf8');
const code = fs.readFileSync('_app.js', 'utf8');

function novoApp(seed) {
  const { document, window } = parseHTML(html);
  new Function('window', 'document', fs.readFileSync('shim_dom.js', 'utf8'))(window, document);

  const store = Object.assign({}, seed || {});
  const localStorage = {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; }
  };
  const fakeFetch = () => Promise.resolve({
    ok: true, status: 200,
    json: () => Promise.resolve(null),
    text: () => Promise.resolve('null'),
    body: null
  });
  const nav = {
    userAgent: 'iPhone', platform: 'iPhone', maxTouchPoints: 5,
    serviceWorker: { register: () => Promise.resolve() }
  };
  const fn = new window.Function(
    'document', 'window', 'localStorage', 'confirm', 'print', 'navigator', 'fetch',
    'AbortController', 'ReadableStream', 'TextDecoder', 'setTimeout', 'setInterval',
    'clearTimeout', 'unescape', 'encodeURIComponent', 'Date', 'Math', 'JSON', 'alert', code
  );
  fn(document, window, localStorage, () => true, () => {}, nav, fakeFetch,
    function () { this.signal = { addEventListener() {} }; this.abort = () => {}; },
    undefined, TextDecoder, setTimeout, setInterval, clearTimeout,
    unescape, encodeURIComponent, Date, Math, JSON, () => {});
  return { document, window, localStorage };
}

const wait = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
function check(n, c, e) {
  console.log((c ? 'PASS  ' : 'FAIL  ') + n + (e !== undefined ? '  -> ' + JSON.stringify(e) : ''));
  if (!c) fails++;
}

(async () => {
  const A = novoApp();
  await wait(300);
  const T = A.window.__test;

  // ---- 1. FORMATO PADRÃO INICIAL (5 TIMES) ----
  check('torneio inicia com 5 times', A.document.querySelectorAll('#standings tbody tr').length === 5);
  check('10 jogos gerados para 5 times', A.document.querySelectorAll('#matches .match-card').length === 10);
  check('hint informa 10 confrontos', A.document.getElementById('jogosHint')?.textContent.includes('10 confrontos'));
  check('2 caixas de final para 5 times', A.document.querySelectorAll('#finals .final-box').length === 2);
  check('botao de 5 times ativo no inicio', A.document.querySelector('[data-torneio-qtd="5"].ativo') !== null);

  // ---- 2. MODO LEITURA NÃO PERMITE MUDAR FORMATO ----
  check('espectador no modo leitura por padrao', A.document.body.classList.contains('modo-leitura'));
  A.document.querySelector('[data-torneio-qtd="3"]').click();
  check('espectador nao consegue mudar formato do torneio',
    A.document.querySelectorAll('#standings tbody tr').length === 5);

  // ---- 3. ADMIN ATIVA MODO MESARIO ----
  T.entrarMesario();
  check('modo admin ativo', A.document.body.classList.contains('modo-admin'));

  // ---- 4. MUDANÇA PARA 3 TIMES ----
  T.mudarQuantidadeTimes(3);
  await wait(100);
  check('3 linhas na classificacao para 3 times', A.document.querySelectorAll('#standings tbody tr').length === 3);
  check('3 jogos gerados para 3 times', A.document.querySelectorAll('#matches .match-card').length === 3);
  check('hint atualizado para 3 confrontos', A.document.getElementById('jogosHint')?.textContent.includes('3 confrontos'));
  check('apenas 1 caixa de final para 3 times (Grande Final)', A.document.querySelectorAll('#finals .final-box').length === 1);
  check('caixa e da Grande Final', A.document.querySelector('#finals .final-box.f12') !== null);
  check('nao tem disputa de 3º lugar para 3 times', A.document.querySelector('#finals .final-box.f34') === null);
  check('botao 3 ativo', A.document.querySelector('[data-torneio-qtd="3"].ativo') !== null);
  check('botao 5 desativado', A.document.querySelector('[data-torneio-qtd="5"].ativo') === null);

  // ---- 5. MUDANÇA PARA 4 TIMES ----
  T.mudarQuantidadeTimes(4);
  await wait(100);
  check('4 linhas na classificacao para 4 times', A.document.querySelectorAll('#standings tbody tr').length === 4);
  check('6 jogos gerados para 4 times', A.document.querySelectorAll('#matches .match-card').length === 6);
  check('hint atualizado para 6 confrontos', A.document.getElementById('jogosHint')?.textContent.includes('6 confrontos'));
  check('2 caixas de final para 4 times', A.document.querySelectorAll('#finals .final-box').length === 2);
  check('botao 4 ativo', A.document.querySelector('[data-torneio-qtd="4"].ativo') !== null);

  // ---- 6. MUDANÇA PARA 6 TIMES ----
  T.mudarQuantidadeTimes(6);
  await wait(100);
  check('6 linhas na classificacao para 6 times', A.document.querySelectorAll('#standings tbody tr').length === 6);
  check('15 jogos gerados para 6 times', A.document.querySelectorAll('#matches .match-card').length === 15);
  check('hint atualizado para 15 confrontos', A.document.getElementById('jogosHint')?.textContent.includes('15 confrontos'));
  check('2 caixas de final para 6 times', A.document.querySelectorAll('#finals .final-box').length === 2);
  check('botao 6 ativo', A.document.querySelector('[data-torneio-qtd="6"].ativo') !== null);
  check('time 6 com classe t-5 na classificacao',
    A.document.querySelector('.team-color-bar.t-5') !== null);

  // ---- 7. RETORNO PARA O PADRÃO CLÁSSICO DE 5 TIMES ----
  T.mudarQuantidadeTimes(5);
  await wait(100);
  check('volta para 5 linhas na classificacao', A.document.querySelectorAll('#standings tbody tr').length === 5);
  check('volta para 10 jogos', A.document.querySelectorAll('#matches .match-card').length === 10);
  check('hint volta para 10 confrontos', A.document.getElementById('jogosHint')?.textContent.includes('10 confrontos'));
  check('ordem dos confrontos de 5 times permanece intacta',
    A.document.querySelector('#match-card-0-1') !== null &&
    A.document.querySelector('#match-card-1-4') !== null);
  check('botao 5 ativo novamente', A.document.querySelector('[data-torneio-qtd="5"].ativo') !== null);

  console.log('\n=== ' + (fails ? fails + ' FALHAS' : 'TODOS OS TESTES DE TORNEIO DINAMICO PASSARAM') + ' ===');
  process.exit(fails ? 1 : 0);
})();
