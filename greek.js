/*
 * greek.js — Lematizador de griego antiguo para el navegador.
 * Usa la tabla de formas analizadas de Eulexis (Ph. Verkerk, Biblissima; GPL v3),
 * construida a partir de los datos de Diogenes (P. Heslin) y del proyecto Perseus.
 * Los datos van en fragmentos que se cargan bajo demanda.
 */
(function (global) {
  'use strict';
  const NF = 128, NL = 32;

  // ---------- Betacode → Unicode ----------
  const L = {};
  'abgdezhqiklmncoprstufxywv'.split('').forEach((c, i) => { L[c] = 'αβγδεζηθικλμνξοπρστυφχψωϝ'[i]; });
  const M = { ')': '̓', '(': '̔', '/': '́', '\\': '̀', '=': '͂', '+': '̈', '|': 'ͅ', '_': '̄', '^': '̆' };
  const ORDER = ['_', '^', '+', ')', '(', '/', '\\', '=', '|'];
  const byOrder = (a, b) => ORDER.indexOf(a) - ORDER.indexOf(b);
  function betaToUni(b) {
    let out = '', i = 0;
    const n = b.length;
    while (i < n) {
      const c = b[i];
      if (c === '*') {
        let j = i + 1; const marks = [];
        while (j < n && M[b[j]]) marks.push(b[j++]);
        if (j < n && L[b[j]]) {
          const base = L[b[j++]].toUpperCase();
          while (j < n && M[b[j]]) marks.push(b[j++]);
          out += base + marks.sort(byOrder).map((m) => M[m]).join('');
        }
        i = j; continue;
      }
      if (L[c]) {
        let j = i + 1; const marks = [];
        while (j < n && M[b[j]]) marks.push(b[j++]);
        let base = L[c];
        if (c === 's') { const nx = j < n ? b[j] : ''; if (!nx || !(L[nx] || nx === '*')) base = 'ς'; }
        out += base + marks.sort(byOrder).map((m) => M[m]).join('');
        i = j; continue;
      }
      if (c >= '0' && c <= '9') { i++; continue; }
      out += c === "'" ? '’' : c; i++;
    }
    return out.normalize('NFC');
  }

  // ---------- Unicode → clave sin diacríticos (la de Eulexis) ----------
  const G2B = {};
  'αβγδεζηθικλμνξοπρστυφχψωϝ'.split('').forEach((c, i) => { G2B[c] = 'abgdezhqiklmncoprstufxywv'[i]; });
  Object.assign(G2B, { 'ς': 's', 'ϲ': 's', 'ϐ': 'b', 'ϑ': 'q', 'ϕ': 'f', 'ϰ': 'k', 'ϱ': 'r', 'ϖ': 'p', 'ϵ': 'e', 'ϛ': 's' });
  const APOS = /[’ʼ᾽᾿'´΄´]/g;
  function keyOf(word) {
    const s = word.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(APOS, "'");
    let k = '';
    for (const ch of s) { if (G2B[ch]) k += G2B[ch]; else if (ch === "'") k += "'"; else if (/[a-z]/.test(ch)) k += ch; }
    return k;
  }
  const keyOfBeta = (b) => b.replace(/[()\/\\|=+*_^0-9]/g, '').toLowerCase();

  // Forma canónica para comparar acentos: grave = agudo; se quita el segundo acento de enclítica.
  function canon(word) {
    let s = word.normalize('NFD').toLowerCase().replace(APOS, "'")
      .replace(/[̀̀́]/g, '́').replace(/[̄̆]/g, '');
    const ac = [...s.matchAll(/́/g)].map((m) => m.index);
    const per = s.indexOf('͂');
    if (ac.length === 2) s = s.slice(0, ac[1]) + s.slice(ac[1] + 1);
    else if (ac.length === 1 && per >= 0 && ac[0] > per) s = s.slice(0, ac[0]) + s.slice(ac[0] + 1);
    return s.replace(/ς/g, 'σ').normalize('NFC');
  }

  function hash(s) { let x = 5381; for (const ch of s) x = (Math.imul(x, 33) ^ ch.charCodeAt(0)) >>> 0; return x; }

  // ---------- Morfología en español ----------
  const T = {
    tense: { pres: 'presente', imperf: 'imperfecto', fut: 'futuro', aor: 'aoristo', perf: 'perfecto', plup: 'pluscuamperfecto', futperf: 'futuro perfecto' },
    mood: { ind: 'indicativo', subj: 'subjuntivo', opt: 'optativo', imperat: 'imperativo', inf: 'infinitivo', part: 'participio' },
    voice: { act: 'activo', mid: 'medio', pass: 'pasivo', mp: 'medio-pasivo' },
    pers: { '1st': '1ª', '2nd': '2ª', '3rd': '3ª' },
    num: { sg: 'singular', pl: 'plural', dual: 'dual' },
    cas: { nom: 'nominativo', gen: 'genitivo', dat: 'dativo', acc: 'acusativo', voc: 'vocativo' },
    gen: { masc: 'masculino', fem: 'femenino', neut: 'neutro' },
    deg: { comp: 'comparativo', superl: 'superlativo', irreg_comp: 'comparativo irregular', irreg_superl: 'superlativo irregular' },
    extra: { adverbial: 'uso adverbial', proclitic: 'proclítica', enclitic: 'enclítica', nu_movable: 'con ν efelcística', contr: 'contracta', a_priv: 'con α privativa', iota_intens: 'con ι intensiva', geog_name: 'topónimo' },
    dial: { attic: 'ático', epic: 'épico', doric: 'dórico', ionic: 'jónico', aeolic: 'eólico', homeric: 'homérico', parad_form: 'forma de paradigma', prose: 'prosa', poetic: 'poético' },
    pos: { adverb: 'adverbio', prep: 'preposición', conj: 'conjunción', particle: 'partícula', exclam: 'interjección', numeral: 'numeral', indecl: 'indeclinable', interrog: 'interrogativo', alphabetic: 'nombre de letra', expletive: 'expletivo', indeclform: 'indeclinable' }
  };
  const slash = (x, map) => x.split('/').map((p) => map[p] || p).join(' o ');
  function esMorph(m) {
    const paren = [];
    const main = m.replace(/\(([^)]*)\)/g, (_, x) => { paren.push(...x.split(/\s+/).filter(Boolean)); return ' '; }).split(/\s+/).filter(Boolean);
    const f = { dial: [], extra: [], pos: [] };
    for (const t of main.concat(paren)) {
      const base = t.split('/')[0];
      if (T.tense[t]) f.tense = T.tense[t];
      else if (T.mood[t]) f.mood = t;
      else if (T.voice[t]) f.voice = T.voice[t];
      else if (T.pers[t]) f.pers = T.pers[t];
      else if (T.num[t]) f.num = T.num[t];
      else if (T.cas[base]) f.cas = slash(t, T.cas);
      else if (T.gen[base]) f.gen = slash(t, T.gen);
      else if (T.deg[t]) f.deg = T.deg[t];
      else if (T.dial[t]) { if (!f.dial.includes(T.dial[t])) f.dial.push(T.dial[t]); }
      else if (t === 'indeclform') f.indecl = true;
      else if (T.extra[t]) f.extra.push(T.extra[t]);
      else if (T.pos[t]) f.pos.push(T.pos[t]);
    }
    let s;
    const nom = [f.cas, f.gen, f.num].filter(Boolean).join(' ');
    if (f.mood && f.mood !== 'inf' && f.mood !== 'part') s = `${f.tense || ''} de ${T.mood[f.mood]} ${f.voice || ''}`.replace(/\s+/g, ' ').trim() + (f.pers ? `, ${f.pers} pers. ${f.num || ''}` : (f.num ? `, ${f.num}` : ''));
    else if (f.mood === 'inf') s = `infinitivo de ${f.tense || ''} ${f.voice || ''}`.replace(/\s+/g, ' ').trim();
    else if (f.mood === 'part') s = `participio de ${f.tense || ''} ${f.voice || ''}`.replace(/\s+/g, ' ').trim() + (nom ? ': ' + nom : '');
    else if (f.indecl || f.pos.length) s = f.pos.length ? f.pos.join(', ') : 'indeclinable';
    else s = nom;
    const add = [];
    if (f.deg) add.push(f.deg);
    add.push(...f.extra);
    if (f.indecl && f.pos.length && s !== f.pos.join(', ')) add.push(f.pos.join(', '));
    s = [s, ...add].filter(Boolean).join(', ');
    return { morpho: s.trim(), dial: f.dial.join(', ') };
  }

  // ---------- Núcleo ----------
  class GreekCore {
    constructor(fetchText) { this.fetchText = fetchText; this.fsh = new Map(); this.lsh = new Map(); this.esm = new Map(); }
    async init() { this.morphs = JSON.parse(await this.fetchText('data/morph.json')); return this; }
    shard(i) {
      if (!this.fsh.has(i)) this.fsh.set(i, this.fetchText('data/f/' + i + '.txt').then((txt) => {
        const map = new Map();
        for (const line of txt.split('\n')) {
          if (!line) continue;
          const t = line.indexOf('\t');
          const form = line.slice(0, t), k = keyOfBeta(form);
          const a = map.get(k); const e = { form, enc: line.slice(t + 1) };
          if (a) a.push(e); else map.set(k, [e]);
        }
        return map;
      }));
      return this.fsh.get(i);
    }
    lshard(i) {
      if (!this.lsh.has(i)) this.lsh.set(i, this.fetchText('data/l/' + i + '.txt').then((txt) => {
        const map = new Map();
        for (const line of txt.split('\n')) {
          if (!line) continue;
          const [id, beta, lang, gloss, w, reg] = line.split('\t');
          map.set(parseInt(id, 36), { beta, lang, gloss, w: parseInt(w || '0', 36), reg: reg || '' });
        }
        return map;
      }));
      return this.lsh.get(i);
    }
    async lemma(id) { return (await this.lshard(id % NL)).get(id); }
    morph(id) {
      if (!this.esm.has(id)) this.esm.set(id, esMorph(this.morphs[id] || ''));
      return this.esm.get(id);
    }

    async analyse(word) {
      word = (word || '').trim();
      if (!word) return [];
      let k, cIn;
      if (/^[A-Za-z'()\/\\=+|*_^]+$/.test(word)) {        // escrito en betacode o transliterado
        const b = word.toLowerCase().replace(/^\*?/, '');
        k = keyOfBeta(b); cIn = /[()\/\\=+|]/.test(b) ? canon(betaToUni(b)) : null;
      } else { k = keyOf(word); cIn = /[\u0300-\u036f]/.test(word.normalize('NFD')) ? canon(word) : null; }   // sin diacríticos: no se exige acentuación
      if (!k) return [];
      let entries = (await this.shard(hash(k) % NF)).get(k) || [];
      if (!entries.length && k.endsWith("'")) entries = (await this.shard(hash(k.slice(0, -1)) % NF)).get(k.slice(0, -1)) || [];
      const upIn = /^\p{Lu}/u.test(word);
      const groups = new Map();
      for (const e of entries) {
        const fu = betaToUni(e.form);
        const exact = cIn ? canon(fu) === cIn : true;
        const caseOk = /^\p{Lu}/u.test(fu) === upIn;
        for (const a of e.enc.split(';')) {
          let pre = '', rest = a;
          const dash = a.lastIndexOf('-');
          if (dash >= 0) { pre = a.slice(0, dash); rest = a.slice(dash + 1); }
          const [lid, mid] = rest.split('.');
          const id = parseInt(lid, 36), m = parseInt(mid, 36);
          const gk = id + '|' + pre;
          let g = groups.get(gk);
          if (!g) { g = { id, pre, exact: false, cm: false, formes: [], seen: new Set() }; groups.set(gk, g); }
          if (exact) g.exact = true;
          if (exact && caseOk) g.cm = true;
          const mm = this.morph(m);
          const sk = fu.toLowerCase() + '|' + m;
          if (!g.seen.has(sk)) { g.seen.add(sk); g.formes.push({ forme: fu, exact, morpho: mm.morpho, dial: mm.dial }); }
        }
      }
      const out = [];
      for (const g of groups.values()) {
        const L0 = await this.lemma(g.id);
        if (!L0) continue;
        const lem = betaToUni(L0.beta);
        const pres = g.pre ? g.pre.split(',').filter(Boolean).map(betaToUni) : [];
        g.formes.sort((a, b) => (b.exact ? 1 : 0) - (a.exact ? 1 : 0));
        out.push({
          lid: g.id + (g.pre ? '|' + g.pre : ''), cle: L0.beta, lemme: pres.length ? pres.join(' + ') + ' + ' + lem : lem, base: lem,
          preverbes: pres, indMorph: '', trad: L0.gloss, lang: L0.lang, freq: L0.w, exact: g.exact, cm: g.cm,
          homonyme: /\d$/.test(L0.beta) ? L0.beta.slice(-1) : '', formes: g.formes, regime: pres.length ? '' : L0.reg
        });
      }
      out.sort((a, b) => (b.exact ? 1 : 0) - (a.exact ? 1 : 0) || (b.cm ? 1 : 0) - (a.cm ? 1 : 0) || b.freq - a.freq);
      return out;
    }
  }

  global.GreekCore = GreekCore;
  global.GreekUtil = { betaToUni, keyOf, canon, esMorph, hash };
  if (typeof module !== 'undefined') module.exports = { GreekCore, betaToUni, keyOf, canon, esMorph, hash };
})(typeof window !== 'undefined' ? window : globalThis);
