/* Hilo de trabajo del lematizador griego (datos de Eulexis, cargados por fragmentos). */
importScripts('greek.js');
const get = (u) => fetch(u).then((r) => { if (!r.ok) throw new Error(u + ' ' + r.status); return r.text(); });
const core = new self.GreekCore(get);
const ready = Promise.all([core.init(), get('data/meta.json')])
  .then(([, m]) => self.postMessage({ type: 'ready', lemmes: JSON.parse(m).n }))
  .catch((e) => self.postMessage({ type: 'error', message: String(e && e.message || e) }));
self.onmessage = async (e) => {
  const { id, word, ctx } = e.data;
  try {
    await ready;
    if (ctx) { self.postMessage({ type: 'result', id, result: null }); return; }
    self.postMessage({ type: 'result', id, result: await core.analyse(word) });
  } catch (err) {
    self.postMessage({ type: 'result', id, result: [], error: String(err) });
  }
};
