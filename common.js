// Shared by index.html (scanner) and labels.html (label printer).
const Inv = (() => {
  const KEYS = { cfg: 'inv.cfg', items: 'inv.items', count: 'inv.count', recv: 'inv.recv', outbox: 'inv.outbox' };
  const TRUCKS = ['Ice Cream', 'Drinks', 'Sysco / Dry Goods'];
  const ICON = { 'Ice Cream': '🍦', 'Drinks': '🥤', 'Sysco / Dry Goods': '🍪' };

  function load(name, fallback) {
    try {
      const v = localStorage.getItem(KEYS[name]);
      return v ? JSON.parse(v) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function save(name, value) {
    try {
      if (value === null) localStorage.removeItem(KEYS[name]);
      else localStorage.setItem(KEYS[name], JSON.stringify(value));
    } catch (e) { /* storage full or blocked — nothing we can do */ }
  }

  function cfg() {
    return Object.assign({ api: '', key: '', gap: 0.8, sound: true, camera: true }, load('cfg', {}));
  }

  // The QR code from the sheet opens this page with #api=...&key=... — save it and clean the URL.
  function readSetupLink() {
    if (!location.hash.includes('api=')) return false;
    const p = new URLSearchParams(location.hash.slice(1));
    const api = p.get('api');
    const key = p.get('key');
    history.replaceState(null, '', location.pathname + location.search);
    if (!api || !key) return false;
    save('cfg', Object.assign(cfg(), { api, key }));
    return true;
  }

  class ApiError extends Error {}

  // Network failures throw TypeError (retryable); problems the sheet reports throw ApiError.
  async function api(action, payload) {
    const c = cfg();
    if (!c.api || !c.key) throw new ApiError('Not set up yet. Scan the QR code from the sheet menu.');
    const res = await fetch(c.api, {
      method: 'POST',
      body: JSON.stringify(Object.assign({ key: c.key, action }, payload || {})),
    });
    let data;
    try {
      data = await res.json();
    } catch (e) {
      throw new ApiError('Google sent back something unexpected. Check the web app is deployed with access "Anyone".');
    }
    if (!data.ok) throw new ApiError(data.error || 'Something went wrong.');
    if (data.items) save('items', { at: Date.now(), list: data.items });
    return data;
  }

  function items() {
    return (load('items', { list: [] }).list || []);
  }

  function norm(code) {
    return String(code || '').trim().toUpperCase();
  }

  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function money(n) {
    return '$' + (Number(n) || 0).toFixed(2);
  }

  let toastTimer;
  function toast(msg, kind) {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.className = 'show ' + (kind || '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = ''; }, kind === 'bad' ? 6000 : 3000);
  }

  return { KEYS, TRUCKS, ICON, load, save, cfg, readSetupLink, api, ApiError, items, norm, uid, esc, money, toast };
})();
