/* ============================================================
   core.js — Inti SPA SIM-LPPM: API fetch ke GAS (text/plain, tanpa CORS
   preflight), dedupe & batch otomatis, cache SWR (localStorage), sesi,
   router hash, kerangka (sidebar/topbar), login Google & darurat, util UI.
   ============================================================ */
'use strict';
const VERSI = '3.1.0';
const CFG = window.APP_CONFIG || {};
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ms = (n, cls) => '<span class="ms' + (cls ? ' ' + cls : '') + '">' + n + '</span>';

// ---------------- Penyimpanan lokal aman ----------------
const Store = {
  get(k, d) { try { const v = localStorage.getItem('lppm:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('lppm:' + k, JSON.stringify(v)); } catch (e) { try { Store.clearCache(); localStorage.setItem('lppm:' + k, JSON.stringify(v)); } catch (e2) { } } },
  del(k) { try { localStorage.removeItem('lppm:' + k); } catch (e) { } },
  clearCache() { try { Object.keys(localStorage).filter(k => k.indexOf('lppm:c:') === 0).forEach(k => localStorage.removeItem(k)); } catch (e) { } }
};

// ---------------- Pengukur kinerja (console: Perf.table()) ----------------
const Perf = { log: [], add(a, total, srv, cached) { this.log.push({ aksi: a, total_ms: total, server_ms: srv, net_ms: total - (srv || 0), cache: cached ? '✓' : '' }); if (this.log.length > 200) this.log.shift(); }, table() { console.table(this.log); }, summary() { const m = {}; this.log.forEach(l => { m[l.aksi] = m[l.aksi] || { n: 0, t: 0 }; m[l.aksi].n++; m[l.aksi].t += l.total_ms; }); console.table(Object.keys(m).map(k => ({ aksi: k, panggilan: m[k].n, rata_ms: Math.round(m[k].t / m[k].n) }))); } };

// ---------------- API ----------------
const READ = /^(boot|batch|dash\.|crud\.(list|get)|ref\.|skema\.list|rubrik\.get|proposal\.(list|detail)|plot\.(saran|beban)|review\.tugas|dok\.(list|templat)|logbook\.|termin\.list|registri\.|publikasi\.cekDuplikat|kinerja\.|bukti\.papan|mutu\.|notif\.(app|config|queue)|wa\.(device|audience|blastList)|crm\.(list|stats|detail)|ekspor\.(paket|riwayat)|impor\.templat|templat\.(list|pindai|sumber|pemetaan|saran|pratinjau|eksporJson)|validasi\.(hasil|skor)|jembatan\.status|pengguna\.list|pengaturan\.get|audit\.list|sistem\.status|db\.status|kalender|laporan\.grafik|cari|auth\.(me|config)|file\.get|profil\.get)$/;
const PUBLIC = { 'auth.config': 1, 'auth.google': 1, 'auth.darurat': 1, 'doc.verify': 1, 'notif.drain': 1, ping: 1 };
let _inflight = {}, _writeEpoch = 0, _busy = 0;
function konfigSiap() { return CFG.GAS_URL && !/GANTI|XXXX/.test(CFG.GAS_URL); }
function loadbar(on) {
  _busy += on ? 1 : -1; const b = $('#loadbar'); if (!b) return;
  if (_busy > 0) { b.style.opacity = 1; b.style.width = '70%'; } else { b.style.width = '100%'; setTimeout(() => { if (_busy <= 0) { b.style.opacity = 0; b.style.width = '0'; } }, 250); }
}
async function apiRun(action, data, opts) {
  opts = opts || {};
  if (!konfigSiap()) return { success: false, message: 'Konfigurasi belum lengkap: isi GAS_URL di js/config.js.' };
  const t0 = performance.now();
  if (!opts.silent) loadbar(true);
  try {
    const res = await fetch(CFG.GAS_URL, { method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, token: PUBLIC[action] ? (Sesi.token || '') : Sesi.token, data: data || {} }) });
    const txt = await res.text();
    let j; try { j = JSON.parse(txt); } catch (e) { return { success: false, message: 'Server membalas tidak valid (HTTP ' + res.status + '). Pastikan URL /exec benar & akses "Siapa saja".' }; }
    Perf.add(action, Math.round(performance.now() - t0), j.ms, j.cached);
    if (!j.success && j.code === 'AUTH' && !PUBLIC[action]) { Sesi.keluar(true); }
    return j;
  } catch (e) {
    return { success: false, network: true, message: navigator.onLine ? 'Tidak dapat terhubung ke server. Coba lagi.' : 'Anda sedang offline.' };
  } finally { if (!opts.silent) loadbar(false); }
}
function api(action, data, opts) {
  if (!READ.test(action)) {
    _writeEpoch++;
    return apiRun(action, data, opts).then(r => { if (r.success) { Cache.stale(); scheduleDrain(); } return r; });
  }
  const k = _writeEpoch + '|' + action + '|' + Sesi.token + '|' + JSON.stringify(data || {});
  if (_inflight[k]) return _inflight[k];
  const p = apiRun(action, data, opts);
  _inflight[k] = p; p.then(() => delete _inflight[k], () => delete _inflight[k]);
  return p;
}
/** Penggabung batch otomatis: banyak baca di tik yang sama → 1 eksekusi server. */
const Batcher = {
  q: null,
  add(action, data) { return new Promise(res => { if (!this.q) { this.q = []; setTimeout(() => this.flush(), 0); } this.q.push({ action, data: data || {}, res }); }); },
  async flush() {
    const q = this.q; this.q = null;
    if (q.length === 1) { q[0].res(await api(q[0].action, q[0].data)); return; }
    for (let i = 0; i < q.length; i += 10) {
      const part = q.slice(i, i + 10), r = await api('batch', { calls: part.map(x => ({ action: x.action, data: x.data })) });
      part.forEach((x, j) => x.res(r.success ? r.data[j] : r));
    }
  }
};
const apiQ = (a, d) => Batcher.add(a, d);
let _drainT = null;
function scheduleDrain() { clearTimeout(_drainT); _drainT = setTimeout(() => apiRun('notif.drain', {}, { silent: true }), 600); }

// ---------------- Cache SWR ----------------
const Cache = {
  key: (a, d) => 'c:' + (Sesi.me ? Sesi.me.id + ':' + Sesi.me.role : '-') + ':' + a + ':' + JSON.stringify(d || {}),
  get(a, d) { return Store.get(this.key(a, d), null); },
  put(a, d, v) { Store.set(this.key(a, d), { t: Date.now(), v: v }); },
  stale() { Store.set('staleBefore', Date.now()); },
  isStale(e, maxAge) { return !e || Date.now() - e.t > maxAge || e.t < Store.get('staleBefore', 0); }
};
/** Tampilkan dari cache lokal dulu (instan), lalu segarkan dari server bila basi. */
async function swr(action, data, onData, opts) {
  opts = opts || {};
  const e = Cache.get(action, data), maxAge = opts.maxAge || 30000;
  let shown = null;
  if (e) { shown = JSON.stringify(e.v); onData(e.v, true); }
  if (!opts.fresh && e && !Cache.isStale(e, maxAge)) return e.v;
  const r = await apiQ(action, data);
  if (!r.success) { if (!e) onData(null, false, r.message); else if (!r.network) toast(r.message, 'bad'); return null; }
  Cache.put(action, data, r.data);
  if (JSON.stringify(r.data) !== shown) onData(r.data, false);
  return r.data;
}

// ---------------- Sesi ----------------
const Sesi = {
  token: Store.get('token', ''), me: Store.get('me', null), boot: null,
  simpan(token, me) { this.token = token; this.me = me; Store.set('token', token); Store.set('me', me); },
  keluar(paksa) {
    if (!paksa && this.token) apiRun('auth.logout', {}, { silent: true });
    this.token = ''; this.me = null; this.boot = null; Store.del('token'); Store.del('me'); Store.clearCache();
    if (paksa) toast('Sesi berakhir. Silakan masuk kembali.', 'warn');
    location.hash = '#/masuk'; Router.go();
  },
  punya(roles) { return !!this.me && String(roles).split(' ').indexOf(this.me.role) >= 0; }
};

// ---------------- i18n (label utama) ----------------
const Lang = { cur: Store.get('lang', 'id') };
const KAMUS = {
  en: { 'Dashboard': 'Dashboard', 'Skema & Jadwal': 'Schemes & Schedule', 'Proposal': 'Proposals', 'Review': 'Review', 'Kontrak & Surat': 'Contracts & Letters', 'Logbook & Laporan': 'Logbook & Reports', 'Monev': 'Monitoring', 'Anggaran & Termin': 'Budget & Disbursement', 'Kegiatan Non-Hibah': 'Non-Grant Activities', 'Mitra & Kerja Sama': 'Partners & MoU', 'Publikasi & Kinerja Dosen': 'Publications & Faculty', 'Kegiatan Ilmiah & Jurnal': 'Scientific Events & Journals', 'Bukti Dukung': 'Evidence', 'Dokumen Mutu & PPEPP': 'Quality & PPEPP', 'Pusat Ekspor & Impor': 'Export & Import', 'Templat & Validasi': 'Templates & Validation', 'Jembatan Integrasi': 'Integration Bridge', 'Laporan': 'Reports', 'Pengguna & Pengaturan': 'Users & Settings', 'Notifikasi & CRM': 'Notifications & CRM', 'Catatan Data': 'Data Notes', 'Keluar': 'Log out', 'Cari…': 'Search…', 'Simpan': 'Save', 'Batal': 'Cancel', 'Tambah': 'Add', 'Ubah': 'Edit', 'Hapus': 'Delete', 'Halo': 'Hello' }
};
const T = s => (Lang.cur === 'en' && KAMUS.en[s]) || s;

// ---------------- Format ----------------
const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const fmt = {
  rp: n => 'Rp' + Math.round(Number(n) || 0).toLocaleString('id-ID'),
  rpj: n => { n = Number(n) || 0; return n >= 1e9 ? 'Rp' + (n / 1e9).toFixed(1).replace('.', ',') + ' M' : n >= 1e6 ? 'Rp' + (n / 1e6).toFixed(1).replace('.', ',') + ' jt' : fmt.rp(n); },
  n: n => (Number(n) || 0).toLocaleString('id-ID'),
  tgl: v => { if (!v) return '-'; const d = new Date(String(v).length === 10 ? v + 'T00:00:00' : v); return isNaN(d) ? String(v) : d.getDate() + ' ' + BLN[d.getMonth()] + ' ' + d.getFullYear(); },
  tglw: v => { if (!v) return '-'; const d = new Date(v); return isNaN(d) ? String(v) : fmt.tgl(v) + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); },
  rel: v => { if (!v) return '-'; const s = (Date.now() - new Date(v).getTime()) / 1000; if (isNaN(s)) return v; if (s < 60) return 'baru saja'; if (s < 3600) return Math.floor(s / 60) + ' mnt lalu'; if (s < 86400) return Math.floor(s / 3600) + ' jam lalu'; return Math.floor(s / 86400) + ' hari lalu'; },
  hari: n => n === null || n === undefined || n === '' ? '' : n > 0 ? 'H-' + n : n === 0 ? 'Hari ini' : 'Lewat ' + (-n) + ' hr',
  inisial: s => String(s || '?').replace(/^(dr|prof|drs|ir|h)\.?\s+/i, '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase(),
  label: k => String(k || '').replace(/_nama$/, '').replace(/_/g, ' ')
};
const STATUS_WARNA = {
  ok: /^(Terverifikasi|Disetujui|Diterima|Lengkap|Terbit|Aktif|Dicairkan|Selesai|Final|SAH|Terkirim|Berlaku|Sukses|Siap|Dikonfirmasi|Berjalan|Kontrak)$/,
  warn: /^(Menunggu|Diajukan|Verifikasi Admin|Dalam Review|Perlu Dilengkapi|Siap Cair|Menunggu Syarat|Menunggu Pengesahan|Revisi|Draft|Dibuka|Ditugaskan|Antri|Diproses|Proses|Peringatan|Terjadwal|Belum Diverifikasi|Diusulkan|Perlu Revisi|Terbuka|Baru)$/,
  bad: /^(Ditolak|Terlambat|Gagal|Kritis|Perlu Perbaikan|Perlu Perbaikan Administrasi|Ditarik|Melebihi|Berakhir|TIDAK VALID|DITARIK|Dihentikan|Nonaktif)$/,
  gray: /^(Draf|Ditutup|Arsip|Batal|Diabaikan|Tidak|Info)$/
};
function badge(s, kelas) {
  s = String(s == null || s === '' ? '-' : s);
  const c = kelas || (STATUS_WARNA.ok.test(s) ? 'b-ok' : STATUS_WARNA.warn.test(s) ? 'b-warn' : STATUS_WARNA.bad.test(s) ? 'b-bad' : STATUS_WARNA.gray.test(s) ? 'b-gray' : 'b-info');
  return '<span class="badge ' + c + '">' + esc(s) + '</span>';
}

// ---------------- Toast, modal, konfirmasi, drawer ----------------
function toast(msg, type) {
  const el = document.createElement('div'); el.className = 'toast ' + (type || 'ok');
  el.innerHTML = ms(type === 'bad' ? 'error' : type === 'warn' ? 'warning' : 'check_circle') + '<span>' + esc(msg) + '</span>';
  $('#toasts').appendChild(el); setTimeout(() => el.remove(), type === 'bad' ? 6000 : 3500);
}
function hasil(r, okMsg) { if (r && r.success) { toast(okMsg || r.message || 'Berhasil.', 'ok'); return true; } toast((r && r.message) || 'Gagal.', 'bad'); return false; }
function modal(o) {
  const ov = document.createElement('div'); ov.className = 'ovl';
  ov.innerHTML = '<div class="modal ' + (o.size || '') + '" role="dialog" aria-modal="true"><div class="modal-h"><h3>' + esc(o.title || '') + '</h3><button class="ibtn" data-x aria-label="Tutup">' + ms('close') + '</button></div><div class="modal-b"></div>' + (o.foot === false ? '' : '<div class="modal-f"></div>') + '</div>';
  const b = $('.modal-b', ov), f = $('.modal-f', ov);
  if (typeof o.body === 'string') b.innerHTML = o.body; else if (o.body) b.appendChild(o.body);
  const close = v => { ov.remove(); document.removeEventListener('keydown', onEsc); if (o.onClose) o.onClose(v); };
  const onEsc = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onEsc);
  $('[data-x]', ov).onclick = () => close();
  ov.addEventListener('mousedown', e => { if (e.target === ov && !o.sticky) close(); });
  if (f) (o.buttons || [{ label: T('Batal'), cls: 'out', act: () => close() }]).forEach(bt => {
    const x = document.createElement('button'); x.className = 'btn ' + (bt.cls || ''); x.innerHTML = (bt.icon ? ms(bt.icon) : '') + esc(bt.label);
    x.onclick = async () => { if (!bt.act) return close(); x.classList.add('busy'); try { await bt.act(close, x); } finally { x.classList.remove('busy'); } };
    f.appendChild(x);
  });
  document.body.appendChild(ov);
  const first = $('input,select,textarea', b); if (first && !o.noFocus) setTimeout(() => first.focus(), 30);
  return { el: ov, body: b, close };
}
function konfirmasi(pesan, opts) {
  opts = opts || {};
  return new Promise(res => {
    const m = modal({ title: opts.title || 'Konfirmasi', size: 'sm', body: '<p style="margin:0">' + pesan + '</p>', onClose: v => res(!!v), buttons: [{ label: T('Batal'), cls: 'out', act: c => c(false) }, { label: opts.ok || 'Ya, lanjutkan', cls: opts.danger ? 'bad' : '', act: c => c(true) }] });
    return m;
  });
}
/** Formulir kecil di modal → Promise nilai (atau null). fields: [{k,label,type,opts,req,val,help}] */
function isian(title, fields, opts) {
  opts = opts || {};
  return new Promise(res => {
    const html = '<div class="form">' + fields.map(f => fieldHtml(f)).join('') + '</div>' + (opts.note ? '<div class="note info" style="margin-top:12px">' + ms('info') + '<div>' + opts.note + '</div></div>' : '');
    let selesai = false;
    modal({ title, size: opts.size || 'sm', body: html, onClose: v => { if (!selesai) res(null); }, buttons: [{ label: T('Batal'), cls: 'out', act: c => c() }, { label: opts.ok || T('Simpan'), cls: opts.danger ? 'bad' : '', act: (c, btn) => {
      const box = btn.closest('.modal'), v = {}; let bad = false;
      fields.forEach(f => { const el = $('[name="' + f.k + '"]', box); if (!el) return; v[f.k] = f.type === 'check' ? el.checked : el.value.trim(); el.classList.toggle('err', !!f.req && !v[f.k]); if (f.req && !v[f.k]) bad = true; });
      if (bad) { toast('Lengkapi isian yang wajib.', 'warn'); return; }
      selesai = true; res(v); c(v);
    } }] });
  });
}
function fieldHtml(f) {
  const id = 'f_' + f.k, req = f.req ? ' <span class="req">*</span>' : '', val = f.val == null ? '' : f.val;
  let input;
  if (f.type === 'select') input = '<select class="inp" id="' + id + '" name="' + f.k + '">' + (f.kosong === false ? '' : '<option value="">— pilih —</option>') + (f.opts || []).map(o => { const v = typeof o === 'object' ? o.v : o, l = typeof o === 'object' ? o.l : o; return '<option value="' + esc(v) + '"' + (String(v) === String(val) ? ' selected' : '') + '>' + esc(l) + '</option>'; }).join('') + '</select>';
  else if (f.type === 'textarea') input = '<textarea class="inp" id="' + id + '" name="' + f.k + '" rows="' + (f.rows || 3) + '">' + esc(val) + '</textarea>';
  else if (f.type === 'check') input = '<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="' + id + '" name="' + f.k + '"' + (val ? ' checked' : '') + '> ' + esc(f.text || '') + '</label>';
  else input = '<input class="inp" id="' + id + '" name="' + f.k + '" type="' + (f.type || 'text') + '" value="' + esc(val) + '"' + (f.ph ? ' placeholder="' + esc(f.ph) + '"' : '') + (f.type === 'number' ? ' step="any" min="0"' : '') + '>';
  return '<div class="field' + (f.full || f.type === 'textarea' ? ' full' : '') + '"><label for="' + id + '">' + esc(f.label || fmt.label(f.k)) + req + '</label>' + input + (f.help ? '<small>' + f.help + '</small>' : '') + '</div>';
}
function drawer(title, html) {
  const sc = document.createElement('div'); sc.className = 'ovl'; sc.style.background = 'rgba(17,22,40,.3)';
  const d = document.createElement('div'); d.className = 'drawer';
  d.innerHTML = '<div class="modal-h"><h3>' + esc(title) + '</h3><button class="ibtn" data-x>' + ms('close') + '</button></div><div class="modal-b" style="flex:1"></div>';
  $('.modal-b', d).innerHTML = html;
  const close = () => { d.remove(); sc.remove(); };
  sc.onclick = close; $('[data-x]', d).onclick = close;
  document.body.appendChild(sc); document.body.appendChild(d);
  return { el: d, body: $('.modal-b', d), close };
}

// ---------------- Berkas: unggah (chunk) & unduh ----------------
function bacaBase64(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = rej; r.readAsDataURL(file); }); }
function pilihBerkas(accept) { return new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept || ''; i.onchange = () => res(i.files[0] || null); i.click(); }); }
async function unggah(file, meta, onProg) {
  const maks = 10 * 1024 * 1024;
  if (file.size > maks * 1.5) return { success: false, message: 'Berkas terlalu besar (maks ±10 MB).' };
  const base = Object.assign({ nama: file.name, mime: file.type || 'application/octet-stream', ukuran: file.size }, meta);
  const b64 = await bacaBase64(file);
  if (b64.length <= 3.5 * 1024 * 1024) { if (onProg) onProg(50); const r = await api('file.upload', Object.assign(base, { b64 })); if (onProg) onProg(100); return r; }
  const CH = 2 * 1024 * 1024, uploadId = 'up' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8), total = Math.ceil(b64.length / CH);
  for (let i = 0; i < total; i++) {
    const r = await api('file.chunk', { uploadId, idx: i, b64: b64.slice(i * CH, (i + 1) * CH) });
    if (!r.success) return r;
    if (onProg) onProg(Math.round((i + 1) / (total + 1) * 100));
  }
  const r = await api('file.finish', Object.assign(base, { uploadId, total }));
  if (onProg) onProg(100);
  return r;
}
async function unduh(id, nama) {
  if (!id) return toast('Berkas belum ada.', 'warn');
  toast('Menyiapkan berkas…', 'ok');
  const r = await api('file.get', { id });
  if (!r.success) return toast(r.message, 'bad');
  const bin = atob(r.data.b64), arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([arr], { type: r.data.mime }));
  const a = document.createElement('a'); a.href = url; a.download = nama || r.data.nama;
  if (/pdf|image/.test(r.data.mime)) { a.target = '_blank'; a.removeAttribute('download'); }
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
}
function muatSkrip(src) { return new Promise((res, rej) => { if ($('script[src="' + src + '"]')) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Gagal memuat ' + src)); document.head.appendChild(s); }); }
const XLSX_URL = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
async function unduhExcel(nama, sheets) {
  await muatSkrip(XLSX_URL);
  const wb = XLSX.utils.book_new();
  sheets.forEach(s => { const ws = XLSX.utils.aoa_to_sheet([s.header].concat(s.rows.map(r => r.map(v => (typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v))))); XLSX.utils.book_append_sheet(wb, ws, String(s.nama).slice(0, 31)); });
  XLSX.writeFile(wb, nama.replace(/[^\w.-]+/g, '_') + '.xlsx');
}

// ---------------- Router ----------------
const Router = {
  routes: [], nav: 0,
  add(pola, fn, o) { const keys = []; const re = new RegExp('^' + pola.replace(/:(\w+)/g, (m, k) => { keys.push(k); return '([^/]+)'; }) + '$'); this.routes.push(Object.assign({ re, keys, fn, pola }, o || {})); },
  cur: '',
  async go() {
    const h = decodeURIComponent((location.hash || '#/').slice(1)) || '/', path = h.split('?')[0], qs = new URLSearchParams(h.split('?')[1] || '');
    const pub = this.routes.filter(r => r.pub).find(r => r.re.test(path));
    if (pub) { const m = path.match(pub.re), p = {}; pub.keys.forEach((k, i) => { p[k] = m[i + 1]; }); return pub.fn(p, qs); }
    if (!Sesi.token) return Halaman.masuk();
    if (!Sesi.boot) { const ok = await Boot.mulai(); if (!ok) return; }
    const rt = this.routes.find(r => !r.pub && r.re.test(path === '/' ? '/dashboard' : path));
    const view = Shell.pastikan();
    if (!rt) { view.innerHTML = kosong('travel_explore', 'Halaman tidak ditemukan.'); return; }
    if (rt.roles && !Sesi.punya(rt.roles)) { view.innerHTML = kosong('lock', 'Peran ' + esc(Sesi.boot.roleLabels[Sesi.me.role]) + ' tidak memiliki akses ke halaman ini.'); return; }
    const m = (path === '/' ? '/dashboard' : path).match(rt.re), p = {}; rt.keys.forEach((k, i) => { p[k] = decodeURIComponent(m[i + 1]); });
    this.cur = rt.menu || path.split('/')[1]; this.nav = (this.nav || 0) + 1;
    Shell.aktif(this.cur);
    window.scrollTo(0, 0);
    view.innerHTML = '';
    try { await rt.fn(view, p, qs); } catch (e) { console.error(e); view.innerHTML = kosong('bug_report', 'Terjadi kesalahan tampilan: ' + esc(e.message)); }
  }
};
window.addEventListener('hashchange', () => Router.go());
const nav = h => { if (location.hash === '#/' + h) Router.go(); else location.hash = '#/' + h; };
function kosong(icon, teks) { return '<div class="card empty">' + ms(icon) + '<div>' + teks + '</div></div>'; }

// ---------------- Boot ----------------
const Boot = {
  async mulai() {
    const e = Cache.get('boot', {});
    if (e) { Sesi.boot = e.v; Shell.render(); }
    const r = await api('boot', {});
    if (!r.success) { if (!e) { if (r.code !== 'AUTH') { $('#root').innerHTML = '<div class="public">' + kosong('cloud_off', esc(r.message) + '<br><br><button class="btn" onclick="location.reload()">Coba lagi</button>') + '</div>'; } return false; } return true; }
    Cache.put('boot', {}, r.data);
    const berubah = !e || JSON.stringify(e.v) !== JSON.stringify(r.data);
    Sesi.boot = r.data; Sesi.me = Object.assign({}, Sesi.me, r.data.me); Store.set('me', Sesi.me);
    if (berubah) Shell.render();
    setTimeout(() => Prefetch.idle(), 1200);
    return true;
  },
  async segarkan() { const r = await api('boot', {}); if (r.success) { Cache.put('boot', {}, r.data); Sesi.boot = r.data; Shell.updateBadges(); } }
};
const Prefetch = {
  idle() {
    const run = () => { const r = Sesi.me.role; ['dash.get', 'kalender'].forEach(a => this.ambil(a, {})); if (/SA|AD/.test(r)) this.ambil('proposal.list', {}); if (r === 'RV') this.ambil('review.tugas', {}); };
    if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 3000 }); else setTimeout(run, 800);
  },
  async ambil(a, d) { const e = Cache.get(a, d); if (e && !Cache.isStale(e, 30000)) return; const r = await apiQ(a, d); if (r.success) Cache.put(a, d, r.data); }
};

// ---------------- Menu per peran (PRD 7.3) ----------------
const MENU = [
  { k: 'dashboard', l: 'Dashboard', i: 'dashboard', r: 'SA AD DS RV PM LPM' },
  { k: 'skema', l: 'Skema & Jadwal', i: 'calendar_month', r: 'SA AD DS RV PM LPM' },
  { k: 'proposal', l: 'Proposal', i: 'description', r: 'SA AD DS LPM', badge: 'verifikasi' },
  { k: 'review', l: 'Review', i: 'rate_review', r: 'SA AD RV', badge: 'review' },
  { k: 'dokumen', l: 'Kontrak & Surat', i: 'contract', r: 'SA AD DS PM LPM' },
  { k: 'logbook', l: 'Logbook & Laporan', i: 'edit_note', r: 'SA AD DS LPM' },
  { k: 'monev', l: 'Monev', i: 'fact_check', r: 'SA AD DS RV PM LPM' },
  { k: 'anggaran', l: 'Anggaran & Termin', i: 'account_balance_wallet', r: 'SA AD DS PM LPM' },
  { k: 'nonhibah', l: 'Kegiatan Non-Hibah', i: 'science', r: 'SA AD DS PM LPM' },
  { k: 'mitra', l: 'Mitra & Kerja Sama', i: 'handshake', r: 'SA AD DS PM LPM' },
  { k: 'publikasi', l: 'Publikasi & Kinerja Dosen', i: 'menu_book', r: 'SA AD DS PM LPM' },
  { k: 'kegiatan', l: 'Kegiatan Ilmiah & Jurnal', i: 'school', r: 'SA AD DS PM LPM' },
  { k: 'bukti', l: 'Bukti Dukung', i: 'folder_special', r: 'SA AD DS PM LPM' },
  { k: 'mutu', l: 'Dokumen Mutu & PPEPP', i: 'verified', r: 'SA AD DS PM LPM' },
  { k: 'catatan', l: 'Catatan Data', i: 'sticky_note_2', r: 'SA AD LPM', badge: 'catatan' },
  { k: 'ekspor', l: 'Pusat Ekspor & Impor', i: 'swap_vert', r: 'SA AD DS PM LPM' },
  { k: 'validasi', l: 'Templat & Validasi', i: 'rule', r: 'SA AD PM LPM', badge: 'kritis' },
  { k: 'jembatan', l: 'Jembatan Integrasi', i: 'hub', r: 'SA AD LPM' },
  { k: 'laporan', l: 'Laporan', i: 'monitoring', r: 'SA AD DS PM LPM' },
  { k: 'notifikasi', l: 'Notifikasi & CRM', i: 'campaign', r: 'SA AD' },
  { k: 'pengaturan', l: 'Pengguna & Pengaturan', i: 'manage_accounts', r: 'SA AD' }
];
const BNAV = { DS: ['dashboard', 'proposal', 'logbook', 'publikasi'], RV: ['dashboard', 'review', 'monev', 'skema'], AD: ['dashboard', 'proposal', 'review', 'validasi'], SA: ['dashboard', 'proposal', 'validasi', 'pengaturan'], PM: ['dashboard', 'laporan', 'anggaran', 'nonhibah'], LPM: ['dashboard', 'validasi', 'ekspor', 'bukti'] };

// ---------------- Kerangka ----------------
const Shell = {
  pastikan() { if (!$('#view')) this.render(); return $('#view'); },
  render() {
    const b = Sesi.boot, me = Sesi.me;
    if (!b || !me) return;
    const role = me.role, menu = MENU.filter(m => m.r.split(' ').indexOf(role) >= 0);
    const jb = b.jembatan || {};
    $('#root').innerHTML = '<div class="app">' +
      '<aside class="side" id="side"><div class="brand"><div class="logo">' + ms('hub', 'fill') + '</div><div><b>SIM-LPPM</b><small>' + esc(b.app.institusi || 'STIS Al Wafa') + '</small></div></div>' +
      '<nav class="nav" id="nav">' + menu.map(m => '<a href="#/' + m.k + '" data-k="' + m.k + '">' + ms(m.i) + '<span>' + esc(T(m.l)) + '</span>' + (m.badge ? '<span class="cnt" data-b="' + m.badge + '" hidden></span>' : '') + '</a>').join('') + '</nav>' +
      '<div class="side-foot"><button id="btnKeluar">' + ms('logout') + T('Keluar') + ' / Logout</button><div class="rilis">Status Rilis <span>v' + VERSI + ' Rev. Integrasi</span></div></div></aside>' +
      '<div class="main"><header class="top">' +
      '<button class="ibtn burger" id="burger" aria-label="Menu">' + ms('menu') + '</button>' +
      '<div class="search"><span class="ms">search</span><input id="cari" placeholder="' + T('Cari…') + '" autocomplete="off" aria-label="Pencarian global"><kbd>Ctrl K</kbd><div class="hasil-cari" id="hasilCari" hidden></div></div>' +
      (me.roles.length > 1 ? '<div class="roles" id="roles">' + me.roles.map(r => '<button data-r="' + r + '" class="' + (r === role ? 'on' : '') + '">' + esc(b.roleLabels[r].replace('Dosen/Peneliti', 'Dosen')) + '</button>').join('') + '</div>' : '') +
      '<div class="spacer"></div>' +
      '<div class="lang"><button data-l="id" class="' + (Lang.cur === 'id' ? 'on' : '') + '">ID</button><button data-l="en" class="' + (Lang.cur === 'en' ? 'on' : '') + '">EN</button></div>' +
      '<span class="chip-periode' + (b.periodeAktif.terkunci ? ' kunci' : '') + '" title="Periode aktif">' + ms(b.periodeAktif.terkunci ? 'lock' : 'lock_open') + '<span class="t">' + esc(b.periodeAktif.tahun + ' ' + b.periodeAktif.semester) + '</span></span>' +
      (/SA|AD|LPM/.test(role) ? '<button class="ibtn" id="btnSurat" title="Catatan Data">' + ms('mail') + '<span class="dot" data-b="catatan" hidden></span></button>' : '') +
      '<div style="position:relative"><button class="ibtn" id="btnLonceng" title="Notifikasi">' + ms('notifications') + '<span class="dot" data-b="notif" hidden></span></button></div>' +
      '<div style="position:relative"><div class="me" id="btnMe"><div class="ava">' + esc(fmt.inisial(me.nama)) + '</div><div><b>' + esc(me.nama) + '</b><small>' + esc(b.roleLabels[role]) + '</small></div>' + ms('expand_more') + '</div></div>' +
      '</header>' +
      (jb.level === 'merah' && /SA|AD|LPM/.test(role) ? '<div class="banner merah">' + ms('sync_problem') + 'Jembatan SIM-LPM tidak segar lebih dari 72 jam (terakhir ' + esc(fmt.tglw(jb.terbit) ) + '). <a href="#/jembatan">Periksa</a></div>' : jb.level === 'kuning' && /SA|AD|LPM/.test(role) ? '<div class="banner kuning">' + ms('schedule') + 'Data jembatan terakhir disinkron ' + esc(fmt.rel(jb.terbit)) + '.</div>' : '') +
      '<main id="view"></main></div>' +
      '<nav class="bnav" id="bnav">' + (BNAV[role] || []).map(k => { const m = MENU.find(x => x.k === k); return m ? '<a href="#/' + k + '" data-k="' + k + '">' + ms(m.i) + '<span>' + esc(T(m.l).split(' ')[0]) + '</span></a>' : ''; }).join('') + '<a href="#" id="bnavMenu">' + ms('apps') + '<span>Menu</span></a></nav></div>';
    this.events();
    this.updateBadges();
    this.aktif(Router.cur);
  },
  aktif(k) { $$('#nav a, #bnav a').forEach(a => a.classList.toggle('on', a.dataset.k === k)); $('#side') && $('#side').classList.remove('open'); $('.scrim') && $('.scrim').remove(); },
  updateBadges() {
    const L = (Sesi.boot && Sesi.boot.lencana) || {};
    $$('[data-b]').forEach(el => { const n = L[el.dataset.b] || 0; el.hidden = !n; el.textContent = n > 99 ? '99+' : n; });
  },
  events() {
    $('#btnKeluar').onclick = async () => { if (await konfirmasi('Keluar dari SIM-LPPM?')) Sesi.keluar(); };
    const side = $('#side');
    const buka = () => { side.classList.add('open'); const s = document.createElement('div'); s.className = 'scrim'; s.onclick = () => this.aktif(Router.cur); document.body.appendChild(s); };
    $('#burger').onclick = buka; $('#bnavMenu').onclick = e => { e.preventDefault(); buka(); };
    $$('#roles button').forEach(b => b.onclick = async () => {
      if (b.classList.contains('on')) return;
      const r = await api('auth.switchRole', { peran: b.dataset.r });
      if (!hasil(r)) return;
      Sesi.simpan(r.data.token, Object.assign({}, Sesi.me, r.data.me)); Sesi.boot = null;
      location.hash = '#/dashboard'; Router.go();
    });
    $$('.lang button').forEach(b => b.onclick = () => { Lang.cur = b.dataset.l; Store.set('lang', Lang.cur); this.render(); Router.go(); });
    const q = $('#cari'), hc = $('#hasilCari'); let tq;
    q.oninput = () => { clearTimeout(tq); tq = setTimeout(async () => {
      const v = q.value.trim(); if (v.length < 2) { hc.hidden = true; return; }
      const r = await api('cari', { q: v }, { silent: true });
      hc.hidden = false;
      hc.innerHTML = r.success && r.data.length ? r.data.map(x => '<a href="#/' + esc(x.rute) + '"><span class="badge b-info">' + esc(x.tipe) + '</span><div><b>' + esc(x.judul) + '</b><small>' + esc(x.id + (x.sub ? ' · ' + x.sub : '')) + '</small></div></a>').join('') : '<div class="empty" style="padding:16px">Tidak ditemukan.</div>';
    }, 350); };
    q.onblur = () => setTimeout(() => { hc.hidden = true; }, 200);
    document.onkeydown = e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); q.focus(); } };
    if ($('#btnSurat')) $('#btnSurat').onclick = () => nav('catatan');
    $('#btnLonceng').onclick = e => this.lonceng(e.currentTarget.parentNode);
    $('#btnMe').onclick = e => this.menuMe(e.currentTarget.parentNode);
  },
  async lonceng(host) {
    if ($('.pop', host)) return $('.pop', host).remove();
    const p = document.createElement('div'); p.className = 'pop'; p.innerHTML = '<div class="sk" style="height:60px"></div>'; host.appendChild(p);
    const tutup = ev => { if (!host.contains(ev.target)) { p.remove(); document.removeEventListener('mousedown', tutup); } };
    document.addEventListener('mousedown', tutup);
    const r = await api('notif.app', {}, { silent: true });
    if (!r.success) { p.innerHTML = '<div class="empty">' + esc(r.message) + '</div>'; return; }
    p.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px"><b>Notifikasi</b><button class="btn ghost xs" id="bacaSemua">Tandai dibaca</button></div>' + (r.data.items.length ? r.data.items.map(n => '<a class="it' + (n.Dibaca !== 'Ya' ? ' baru' : '') + '" href="#/' + esc(n.Tautan || 'dashboard') + '"><b>' + esc(n.Judul) + '</b><small>' + esc(n.Pesan) + '</small><small>' + fmt.rel(n.Waktu) + '</small></a>').join('') : '<div class="empty">' + ms('notifications_off') + 'Belum ada notifikasi.</div>');
    $('#bacaSemua', p).onclick = async () => { await api('notif.baca', {}); Sesi.boot.lencana.notif = 0; this.updateBadges(); p.remove(); };
  },
  menuMe(host) {
    if ($('.pop', host)) return $('.pop', host).remove();
    const p = document.createElement('div'); p.className = 'pop'; p.style.width = '260px';
    p.innerHTML = '<div style="padding:8px 12px"><b>' + esc(Sesi.me.nama) + '</b><small style="display:block;color:var(--muted)">' + esc(Sesi.me.email) + '</small></div>' +
      (Sesi.me.darurat ? '' : '<a class="it" href="#/profil">' + ms('person') + ' Profil & preferensi notifikasi</a>') +
      '<a class="it" id="pasangApp">' + ms('install_mobile') + ' Pasang aplikasi (PWA)</a><a class="it" id="keluarSemua">' + ms('devices') + ' Keluar dari semua perangkat</a><a class="it" id="keluar1">' + ms('logout') + ' Keluar</a>';
    host.appendChild(p);
    const tutup = ev => { if (!host.contains(ev.target)) { p.remove(); document.removeEventListener('mousedown', tutup); } };
    document.addEventListener('mousedown', tutup);
    $('#keluar1', p).onclick = () => Sesi.keluar();
    $('#keluarSemua', p).onclick = async () => { if (await konfirmasi('Semua sesi Anda di perangkat lain akan berakhir.')) { await api('auth.logout', { semua: true }); Sesi.keluar(true); } };
    $('#pasangApp', p).onclick = () => PWA.pasang();
  }
};

// ---------------- PWA ----------------
const PWA = {
  prompt: null,
  init() {
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('./sw.js').catch(() => { });
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); this.prompt = e; });
  },
  async pasang() {
    if (this.prompt) { this.prompt.prompt(); await this.prompt.userChoice; this.prompt = null; return; }
    modal({ title: 'Pasang SIM-LPPM di perangkat', size: 'sm', body: '<p><b>Android (Chrome):</b> menu ⋮ → <i>Instal aplikasi</i> / <i>Tambahkan ke layar utama</i>.</p><p><b>iPhone (Safari):</b> tombol Bagikan ⬆ → <i>Tambahkan ke Layar Utama</i>.</p><p><b>Laptop (Chrome/Edge):</b> ikon pasang di ujung kanan bilah alamat.</p>', buttons: [{ label: 'Mengerti', act: c => c() }] });
  }
};

// ---------------- Halaman publik: masuk & verifikasi ----------------
const Halaman = {
  async masuk() {
    $('#root').innerHTML = '<div class="login"><div class="art"><div style="display:flex;gap:12px;align-items:center"><div class="logo" style="width:44px;height:44px;border-radius:13px;background:rgba(255,255,255,.15);display:grid;place-items:center">' + ms('hub', 'fill') + '</div><b style="font-size:18px">SIM-LPPM · RisetHub Kampus</b></div>' +
      '<div><h1>Satu pintu riset & pengabdian STIS Al Wafa</h1><p>Hibah internal, blind review, kontrak ber-QR, monitoring dana, registri Tridharma, bukti akreditasi, dan jembatan data ke SIM-LPM — semuanya di satu tempat.</p></div>' +
      '<div class="pills"><span>Blind review</span><span>Dokumen ber-QR</span><span>Ekspor Excel akreditasi</span><span>Validasi kesiapan</span><span>Integrasi SIM-LPM</span></div></div>' +
      '<div class="form-side"><div class="box" id="loginBox"><div><h2>Masuk</h2><p style="color:var(--muted);margin:6px 0 0">Gunakan akun Google kampus yang terdaftar di LPPM.</p></div><div id="gbtn" style="min-height:44px"><div class="sk" style="height:44px"></div></div><div id="loginMsg"></div>' +
      '<div style="text-align:center;color:var(--muted);font-size:12.5px">Belum terdaftar? Hubungi Admin LPPM.</div></div></div></div>';
    if (!konfigSiap()) { $('#gbtn').innerHTML = '<div class="note bad">' + ms('settings') + '<div><b>Konfigurasi belum lengkap.</b><br>Isi <code>GAS_URL</code> di <code>js/config.js</code> dengan URL Aplikasi Web Apps Script (berakhiran /exec).</div></div>'; return; }
    try { fetch(CFG.GAS_URL + '?w=pub', { mode: 'no-cors' }); } catch (e) { }
    if (location.hash === '#darurat' || location.hash === '#/darurat') return this.darurat();
    const c = await api('auth.config', {});
    if (!c.success) { $('#gbtn').innerHTML = '<div class="note bad">' + ms('cloud_off') + '<div>' + esc(c.message) + '</div></div>'; return; }
    if (!c.data.googleClientId) { $('#gbtn').innerHTML = '<div class="note warn">' + ms('key') + '<div>Login Google belum diaktifkan (Client ID kosong). Super Admin: masuk lewat <a href="#darurat" onclick="setTimeout(()=>Halaman.masuk(),0)">akses darurat</a> lalu isi Client ID di Pengaturan → Keamanan.</div></div>'; return; }
    try {
      await muatSkrip('https://accounts.google.com/gsi/client');
      google.accounts.id.initialize({ client_id: c.data.googleClientId, callback: r => this.kredensial(r.credential), ux_mode: 'popup' });
      $('#gbtn').innerHTML = '';
      google.accounts.id.renderButton($('#gbtn'), { theme: 'filled_blue', size: 'large', shape: 'pill', text: 'signin_with', width: Math.min(360, $('#loginBox').clientWidth) });
    } catch (e) { $('#gbtn').innerHTML = '<div class="note bad">Gagal memuat Google Sign-In. Periksa koneksi.</div>'; }
  },
  async kredensial(cred) {
    $('#loginMsg').innerHTML = '<div class="note info">' + ms('hourglass_top') + '<div>Memverifikasi akun…</div></div>';
    const r = await api('auth.google', { credential: cred, origin: location.origin + location.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '') });
    if (!r.success) { $('#loginMsg').innerHTML = '<div class="note bad">' + ms('block') + '<div>' + esc(r.message) + '</div></div>'; return; }
    Sesi.simpan(r.data.token, r.data.me); Sesi.boot = null; location.hash = '#/dashboard'; Router.go();
  },
  darurat() {
    $('#loginBox').innerHTML = '<div><h2>Akses darurat</h2><p style="color:var(--muted);margin:6px 0 0">Khusus Super Admin saat login Google belum siap. 5× salah = terkunci 15 menit.</p></div>' +
      '<div class="field"><label>Nama pengguna</label><input class="inp" id="dUser" autocomplete="username" value="darurat"></div><div class="field"><label>Kata sandi</label><input class="inp" id="dPass" type="password" autocomplete="current-password"></div><button class="btn" id="dMasuk">' + ms('login') + 'Masuk</button><div id="loginMsg"></div><a href="#/masuk" onclick="setTimeout(()=>Halaman.masuk(),0)" style="text-align:center">← Kembali ke login Google</a>';
    const go = async () => {
      const b = $('#dMasuk'); b.classList.add('busy');
      const r = await api('auth.darurat', { username: $('#dUser').value, password: $('#dPass').value, origin: location.origin + location.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '') });
      b.classList.remove('busy');
      if (!r.success) { $('#loginMsg').innerHTML = '<div class="note bad">' + ms('block') + '<div>' + esc(r.message) + '</div></div>'; return; }
      Sesi.simpan(r.data.token, r.data.me); Sesi.boot = null; location.hash = '#/dashboard'; Router.go();
    };
    $('#dMasuk').onclick = go; $('#dPass').onkeydown = e => { if (e.key === 'Enter') go(); };
  },
  async verifikasi(p) {
    $('#root').innerHTML = '<div class="public"><div class="card"><div style="display:flex;gap:12px;align-items:center;margin-bottom:16px"><div class="logo" style="width:44px;height:44px;border-radius:13px;background:var(--navy);color:#fff;display:grid;place-items:center">' + ms('verified_user', 'fill') + '</div><div><b style="font-size:17px">Verifikasi Dokumen</b><small style="display:block;color:var(--muted)">SIM-LPPM · tanpa login</small></div></div><div id="vHasil"><div class="sk" style="height:120px"></div></div></div></div>';
    const r = await api('doc.verify', { kode: p.kode });
    const d = r.data || {}, sah = d.status === 'SAH';
    $('#vHasil').innerHTML = !r.success ? '<div class="note bad">' + esc(r.message) + '</div>' :
      '<div class="note ' + (sah ? 'ok' : 'bad') + '" style="font-size:15px">' + ms(sah ? 'verified' : 'gpp_bad', 'fill') + '<div><b>' + esc(d.status) + '</b><br>' + (sah ? 'Dokumen ini asli dan tercatat di SIM-LPPM.' : d.status === 'DITARIK' ? 'Dokumen ini telah ditarik oleh penerbit.' : 'Kode verifikasi tidak dikenali atau dokumen tidak valid.') + '</div></div>' +
      (d.nomor ? '<dl class="kv" style="margin-top:16px"><dt>Jenis</dt><dd>' + esc(d.jenis) + '</dd><dt>Nomor</dt><dd>' + esc(d.nomor) + '</dd><dt>Tanggal terbit</dt><dd>' + esc(d.tanggal) + '</dd><dt>Judul kegiatan</dt><dd>' + esc(d.judul) + '</dd><dt>Ketua pelaksana</dt><dd>' + esc(d.ketua) + '</dd><dt>Penanda tangan</dt><dd>' + esc(d.penandatangan) + '</dd><dt>Penerbit</dt><dd>' + esc(d.lembaga + ' · ' + d.institusi) + '</dd></dl>' : '');
  }
};
Router.add('/verifikasi/:kode', Halaman.verifikasi.bind(Halaman), { pub: true });
Router.add('/masuk', () => Sesi.token ? nav('dashboard') : Halaman.masuk(), { pub: true });

document.addEventListener('DOMContentLoaded', () => { PWA.init(); Router.go(); });
