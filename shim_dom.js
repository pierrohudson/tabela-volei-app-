/* ============================================================
   SHIM de Range/Selection para o linkedom.
   O linkedom nao implementa Range.setStart/intersectsNode,
   splitText nem Selection — sem isso nao da para testar a
   formatacao por selecao no Node.

   Implementacao fiel ao padrao DOM para o caso de uso do app:
   - Range com startContainer/startOffset/endContainer/endOffset
   - Range.intersectsNode (respeita a ordem no documento)
   - Selection com getRangeAt/addRange/removeAllRanges/toString
   - Text.splitText
   ============================================================ */
(function instalarShim(window, document) {
  const TEXT = 3;

  /* ---------- Text.splitText ---------- */
  const TextProto = window.Text ? window.Text.prototype : null;
  if (TextProto && !TextProto.splitText) {
    TextProto.splitText = function (offset) {
      const texto = this.nodeValue;
      const off = Math.max(0, Math.min(offset, texto.length));
      const resto = texto.slice(off);
      const novo = document.createTextNode(resto);
      this.nodeValue = texto.slice(0, off);
      if (this.parentNode) this.parentNode.insertBefore(novo, this.nextSibling);
      return novo;
    };
  }

  /* ---------- ordem dos nos no documento ---------- */
  function ordem(no) {
    const partes = [];
    let atual = no;
    while (atual) {
      let i = 0;
      let irmao = atual.parentNode ? atual.parentNode.firstChild : null;
      while (irmao && irmao !== atual) { i++; irmao = irmao.nextSibling; }
      partes.unshift(i);
      atual = atual.parentNode;
    }
    return partes;
  }
  function comparar(a, b) {
    const oa = ordem(a), ob = ordem(b);
    const n = Math.min(oa.length, ob.length);
    for (let i = 0; i < n; i++) {
      if (oa[i] !== ob[i]) return oa[i] < ob[i] ? -1 : 1;
    }
    return oa.length - ob.length;
  }
  /* true se `no` esta entre `a` e `b` (inclusive) no documento */
  function entre(no, a, b) {
    if (comparar(no, a) < 0) return false;
    if (comparar(no, b) > 0) return false;
    return true;
  }

  /* ---------- Range ---------- */
  class RangeShim {
    constructor() {
      this.startContainer = document.body;
      this.startOffset = 0;
      this.endContainer = document.body;
      this.endOffset = 0;
    }
    setStart(no, off) {
      this.startContainer = no;
      this.startOffset = off;
    }
    setEnd(no, off) {
      this.endContainer = no;
      this.endOffset = off;
    }
    get collapsed() {
      return this.startContainer === this.endContainer &&
             this.startOffset === this.endOffset;
    }
    cloneRange() {
      const r = new RangeShim();
      r.startContainer = this.startContainer;
      r.startOffset = this.startOffset;
      r.endContainer = this.endContainer;
      r.endOffset = this.endOffset;
      return r;
    }
    /* Um no intersecta a faixa se ele toca a faixa.
       Para texto: precisa estar dentro dos limites da faixa. */
    intersectsNode(no) {
      if (!no) return false;

      if (no.nodeType === TEXT) {
        /* o no precisa estar entre o inicio e o fim da faixa */
        const antes = comparar(no, this.startContainer);
        const depois = comparar(no, this.endContainer);
        if (antes < 0 || depois > 0) return false;
        /* se for o proprio no de inicio/fim, confere os offsets */
        if (no === this.startContainer && this.startOffset >= no.nodeValue.length) return false;
        if (no === this.endContainer && this.endOffset <= 0) return false;
        return true;
      }

      /* elemento: true se algum descendente de texto intersecta */
      const walk = document.createTreeWalker(no, 4);
      let t = walk.nextNode();
      while (t) {
        if (this.intersectsNode(t)) return true;
        t = walk.nextNode();
      }
      return false;
    }
  }

  /* ---------- Selection ---------- */
  class SelectionShim {
    constructor() {
      this._ranges = [];
    }
    get rangeCount() { return this._ranges.length; }
    getRangeAt(i) { return this._ranges[i]; }
    addRange(r) { this._ranges.push(r); }
    removeAllRanges() { this._ranges = []; }
    removeRange(r) {
      const i = this._ranges.indexOf(r);
      if (i >= 0) this._ranges.splice(i, 1);
    }
    toString() {
      let out = "";
      for (const r of this._ranges) {
        const no = r.startContainer;
        if (no && no.nodeType === TEXT) {
          const fim = r.endContainer === no ? r.endOffset : no.nodeValue.length;
          out += no.nodeValue.slice(r.startOffset, fim);
        }
      }
      return out;
    }
  }

  window.Range = RangeShim;
  window.Selection = SelectionShim;
  window.getSelection = function () {
    if (!window.__sel) window.__sel = new SelectionShim();
    return window.__sel;
  };
  document.getSelection = window.getSelection;
  /* sobrescreve o Range nativo do linkedom (que nao tem setStart) */
  document.createRange = function () { return new RangeShim(); };

  /* NodeFilter: o app usa NodeFilter.SHOW_TEXT (= 4) */
  window.NodeFilter = { SHOW_TEXT: 4, SHOW_ELEMENT: 1, SHOW_ALL: -1 };
  if (typeof global !== "undefined" && !global.NodeFilter) global.NodeFilter = window.NodeFilter;

  /* Event / MouseEvent para os testes dispararem os botoes */
  if (!window.MouseEvent) {
    window.MouseEvent = window.Event;
  }
  if (!window.Event) {
    window.Event = class EventShim {
      constructor(type, opts) {
        this.type = type;
        this.bubbles = !!(opts && opts.bubbles);
        this.cancelable = !!(opts && opts.cancelable);
        this.defaultPrevented = false;
      }
      preventDefault() { this.defaultPrevented = true; }
      stopPropagation() {}
    };
  }
  document.Event = window.Event;
})(window, document);
