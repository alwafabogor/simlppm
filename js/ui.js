/* ============================================================
   ui.js — Komponen: grafik (Chart.js), tabel (cari/filter/urut/halaman/
   unduh Excel & PDF), formulir dari skema server, CRUD generik, KPI,
   cincin progres, kalender, referensi dropdown.
   ============================================================ */
'use strict';
const WARNA = ['#2f4bbc', '#2fd9f4', '#f5a623', '#dc2626', '#16a34a', '#8ea0fe', '#007a8b', '#b45309', '#7c3aed', '#64748b'];
const STATUS_RGB = { 'Diterima': '#2f4bbc', 'Kontrak': '#4b65d6', 'Berjalan': '#16a34a', 'Selesai': '#0f766e', 'Dalam Review': '#2fd9f4', 'Diajukan': '#f5a623', 'Verifikasi Admin': '#fbbf24', 'Revisi': '#fb923c', 'Perlu Perbaikan Administrasi': '#f97316', 'Ditolak': '#dc2626' };
function tungguChart() { return new Promise(res => { if (window.Chart) return res(); let n = 0; const t = setInterval(() => { if (window.Chart || ++n > 60) { clearInterval(t); res(); } }, 100); }); }
const _charts = new WeakMap();
/** Penanda generasi: callback lama (pindah menu/tab) tidak menimpa tampilan baru. */
function stempel(el) { const s = Math.random().toString(36).slice(2); el.dataset.s = s; return () => el.isConnected && el.dataset.s === s; }
async function grafik(canvas, cfg) {
  if (!canvas) return;
  await tungguChart(); if (!window.Chart) return;
  const lama = _charts.get(canvas); if (lama) lama.destroy();
  Chart.defaults.font.family = 'Inter, system-ui, sans-serif'; Chart.defaults.color = '#7a8194';
  const c = new Chart(canvas, cfg); _charts.set(canvas, c); return c;
}
function donut(canvas, labels, values, colors, opts) {
  return grafik(canvas, { type: 'doughnut', data: { labels, datasets: [{ data: values, backgroundColor: colors || WARNA, borderWidth: 0, borderRadius: 4, spacing: 2 }] }, options: Object.assign({ cutout: '72%', plugins: { legend: { display: false } }, maintainAspectRatio: true }, opts || {}) });
}
function batang(canvas, labels, datasets, opts) {
  opts = opts || {};
  return grafik(canvas, { type: opts.horizontal ? 'bar' : 'bar', data: { labels, datasets: datasets.map((d, i) => Object.assign({ backgroundColor: i === 0 ? '#dce3fa' : '#2f4bbc', borderRadius: 8, maxBarThickness: 34 }, d)) },
    options: { indexAxis: opts.horizontal ? 'y' : 'x', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: datasets.length > 1, position: 'top', align: 'end', labels: { boxWidth: 10, usePointStyle: true } } }, scales: { x: { stacked: !!opts.stacked, grid: { display: false } }, y: { stacked: !!opts.stacked, beginAtZero: true, grid: { color: '#eef0f5' }, ticks: { precision: 0, callback: opts.rp ? (v => fmt.rpj(v)) : undefined } } } } });
}
function garis(canvas, labels, datasets, opts) {
  return grafik(canvas, { type: 'line', data: { labels, datasets: datasets.map((d, i) => Object.assign({ borderColor: WARNA[i], backgroundColor: 'rgba(47,75,188,.08)', fill: i === 0, tension: .35, pointRadius: 3 }, d)) }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: datasets.length > 1 } }, scales: { y: { beginAtZero: true, ticks: { callback: (opts || {}).rp ? (v => fmt.rpj(v)) : undefined } }, x: { grid: { display: false } } } } });
}
/** Cincin progres SVG kecil (kartu "Capaian Saya"). */
function cincin(persen, warna, teks) {
  const p = Math.max(0, Math.min(100, Number(persen) || 0)), r = 32, k = 2 * Math.PI * r;
  return '<svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="' + r + '" fill="none" stroke="#dce3fa" stroke-width="8"/><circle cx="40" cy="40" r="' + r + '" fill="none" stroke="' + (warna || '#2f4bbc') + '" stroke-width="8" stroke-linecap="round" stroke-dasharray="' + (k * p / 100) + ' ' + k + '" transform="rotate(-90 40 40)"/><text x="40" y="45" text-anchor="middle" font-size="16" font-weight="800" fill="#1f2430">' + esc(teks == null ? p + '%' : teks) + '</text></svg>';
}
function kpi(o) {
  return '<div class="card kpi"><div class="lbl">' + esc(o.label) + '</div><div class="ico ' + (o.tone || 't-blue') + '">' + ms(o.icon || 'insights') + '</div><div class="val">' + esc(o.value) + (o.unit ? '<small>' + esc(o.unit) + '</small>' : '') + '</div>' + (o.sub ? '<div class="sub">' + o.sub + '</div>' : '') + '</div>';
}
function kerangkaMuat(n) { return '<div class="grid g4">' + Array.from({ length: n || 4 }, () => '<div class="card"><div class="sk" style="height:96px"></div></div>').join('') + '</div><div class="card" style="margin-top:18px"><div class="sk" style="height:260px"></div></div>'; }
function judul(view, o) {
  view.insertAdjacentHTML('beforeend', (o.crumb ? '<div class="crumb">' + o.crumb.map((c, i) => i === o.crumb.length - 1 ? '<b>' + esc(c[0]) + '</b>' : '<a href="#/' + c[1] + '">' + esc(c[0]) + '</a>' + ms('chevron_right')).join('') + '</div>' : '') +
    '<div class="ph"><div><h1>' + esc(o.title) + (o.tag ? ' <span class="badge b-info">' + esc(o.tag) + '</span>' : '') + '</h1>' + (o.desc ? '<p>' + o.desc + '</p>' : '') + '</div><div class="acts">' + (o.acts || '') + '</div></div>');
}
function tabs(host, items, onPilih, aktif) {
  host.innerHTML = '<div class="tabs">' + items.map(t => '<button data-t="' + t.k + '">' + (t.i ? ms(t.i) : '') + esc(t.l) + (t.n ? ' <span class="badge b-bad">' + t.n + '</span>' : '') + '</button>').join('') + '</div><div class="tab-body"></div>';
  const body = $('.tab-body', host);
  const kunci = 'tab:' + location.hash.split('?')[0] + ':' + items.map(t => t.k).join(',');
  const pilih = k => { if (!items.some(t => t.k === k)) k = items[0].k; $$('.tabs button', host).forEach(b => b.classList.toggle('on', b.dataset.t === k)); body.innerHTML = ''; stempel(body); Store.set(kunci, k); onPilih(k, body); };
  $$('.tabs button', host).forEach(b => b.onclick = () => pilih(b.dataset.t));
  pilih(aktif || Store.get(kunci, items[0].k));
}

// ---------------- Tabel generik ----------------
/** o: { cols:[{k,l,r(row),num,w,nosort,exp(row)}], rows, cari:true, filter:[{k,l,opts}], per, aksi(row)→html, onAksi(act,row,el), nama, kosong, pilih:true } */
function tabel(host, o) {
  const st = { q: '', f: {}, sort: o.sort || null, dir: o.dir || -1, page: 1, per: o.per || 15, pilih: {} };
  host.innerHTML = '<div class="toolbar">' + (o.cari === false ? '' : '<input class="inp q" placeholder="Cari di tabel…" aria-label="Cari">') +
    (o.filter || []).map(f => '<select class="inp" data-f="' + f.k + '"><option value="">' + esc(f.l) + ': semua</option>' + (f.opts || []).map(v => { const val = typeof v === 'object' ? v.v : v, lab = typeof v === 'object' ? v.l : v; return '<option value="' + esc(val) + '">' + esc(lab) + '</option>'; }).join('') + '</select>').join('') +
    '<span class="spacer"></span>' + (o.tombol || '') + (o.unduh === false ? '' : '<button class="btn out sm" data-x="xls">' + ms('table_view') + 'Unduh Excel</button><button class="btn out sm" data-x="pdf">' + ms('picture_as_pdf') + 'Unduh PDF</button>') + '</div>' +
    (o.pilih ? '<div class="bulk" hidden style="margin-bottom:10px"></div>' : '') + '<div class="tblw"><table class="tbl"><thead></thead><tbody></tbody></table></div><div class="pager"></div>';
  const tb = $('tbody', host), th = $('thead', host), pg = $('.pager', host);
  const nilai = (r, c) => c.exp ? c.exp(r) : (r[c.k + '_nama'] || r[c.k]);
  function saring() {
    let rows = o.rows.slice();
    if (st.q) { const q = st.q.toLowerCase(); rows = rows.filter(r => o.cols.some(c => String(nilai(r, c) == null ? '' : nilai(r, c)).toLowerCase().indexOf(q) >= 0) || Object.values(r).some(v => typeof v === 'string' && v.toLowerCase().indexOf(q) >= 0)); }
    Object.keys(st.f).forEach(k => { if (st.f[k] !== '') rows = rows.filter(r => String(r[k]) === st.f[k]); });
    if (st.sort) { const c = o.cols.find(x => x.k === st.sort) || { k: st.sort }; rows.sort((a, b) => { const x = nilai(a, c), y = nilai(b, c); return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x == null ? '' : x).localeCompare(String(y == null ? '' : y), 'id', { numeric: true })) * st.dir; }); }
    return rows;
  }
  function gambar() {
    const rows = saring(), tot = rows.length, maxP = Math.max(1, Math.ceil(tot / st.per)); if (st.page > maxP) st.page = maxP;
    const slice = rows.slice((st.page - 1) * st.per, st.page * st.per);
    th.innerHTML = '<tr>' + (o.pilih ? '<th class="nosort" style="width:30px"><input type="checkbox" data-all></th>' : '') + o.cols.map(c => '<th data-k="' + c.k + '"' + (c.nosort ? ' class="nosort"' : '') + (c.w ? ' style="width:' + c.w + '"' : '') + '>' + esc(c.l) + (st.sort === c.k ? (st.dir > 0 ? ' ↑' : ' ↓') : '') + '</th>').join('') + (o.aksi ? '<th class="nosort"></th>' : '') + '</tr>';
    tb.innerHTML = slice.length ? slice.map((r, i) => '<tr data-i="' + o.rows.indexOf(r) + '">' + (o.pilih ? '<td><input type="checkbox" data-p' + (st.pilih[o.rows.indexOf(r)] ? ' checked' : '') + '></td>' : '') + o.cols.map(c => '<td' + (c.num ? ' class="num"' : '') + '>' + (c.r ? c.r(r) : esc(nilai(r, c) == null || nilai(r, c) === '' ? '-' : nilai(r, c))) + '</td>').join('') + (o.aksi ? '<td style="white-space:nowrap;text-align:right">' + o.aksi(r) + '</td>' : '') + '</tr>').join('')
      : '<tr><td colspan="' + (o.cols.length + 2) + '">' + '<div class="empty">' + ms('inbox') + (o.kosong || 'Belum ada data.') + '</div></td></tr>';
    pg.innerHTML = '<span>' + fmt.n(tot) + ' data' + (tot ? ' · ' + ((st.page - 1) * st.per + 1) + '–' + Math.min(tot, st.page * st.per) : '') + '</span><span class="acts"><select class="inp" data-per style="width:auto;padding:5px 8px">' + [10, 15, 25, 50, 100].map(n => '<option' + (n === st.per ? ' selected' : '') + '>' + n + '</option>').join('') + '</select><button class="btn out xs" data-pg="-1"' + (st.page <= 1 ? ' disabled' : '') + '>‹</button><span>' + st.page + '/' + maxP + '</span><button class="btn out xs" data-pg="1"' + (st.page >= maxP ? ' disabled' : '') + '>›</button></span>';
    $$('th[data-k]:not(.nosort)', th).forEach(h => h.onclick = () => { st.dir = st.sort === h.dataset.k ? -st.dir : 1; st.sort = h.dataset.k; gambar(); });
    $$('[data-pg]', pg).forEach(b => b.onclick = () => { st.page += Number(b.dataset.pg); gambar(); });
    $('[data-per]', pg).onchange = e => { st.per = Number(e.target.value); st.page = 1; gambar(); };
    if (o.onAksi) $$('[data-a]', tb).forEach(b => b.onclick = e => { e.stopPropagation(); o.onAksi(b.dataset.a, o.rows[Number(b.closest('tr').dataset.i)], b); });
    if (o.onRow) $$('tr[data-i]', tb).forEach(tr => { tr.style.cursor = 'pointer'; tr.onclick = e => { if (!e.target.closest('button,a,input')) o.onRow(o.rows[Number(tr.dataset.i)]); }; });
    if (o.pilih) {
      $$('[data-p]', tb).forEach(cb => cb.onchange = () => { st.pilih[Number(cb.closest('tr').dataset.i)] = cb.checked; bulk(); });
      $('[data-all]', th).onchange = e => { slice.forEach(r => { st.pilih[o.rows.indexOf(r)] = e.target.checked; }); gambar(); bulk(); };
    }
  }
  function bulk() { const sel = Object.keys(st.pilih).filter(k => st.pilih[k]).map(k => o.rows[k]); const b = $('.bulk', host); if (!b) return; b.hidden = !sel.length; if (sel.length && o.bulk) b.innerHTML = '<div class="acts"><b>' + sel.length + ' dipilih</b>' + o.bulk + '</div>'; $$('[data-b]', b).forEach(x => x.onclick = () => o.onBulk(x.dataset.b, sel)); }
  const qi = $('.q', host); if (qi) { let t; qi.oninput = () => { clearTimeout(t); t = setTimeout(() => { st.q = qi.value.trim(); st.page = 1; gambar(); }, 200); }; }
  $$('[data-f]', host).forEach(s => s.onchange = () => { st.f[s.dataset.f] = s.value; st.page = 1; gambar(); });
  const ekspor = () => ({ header: o.cols.filter(c => !c.noexp).map(c => c.l), rows: saring().map(r => o.cols.filter(c => !c.noexp).map(c => { const v = nilai(r, c); return v == null ? '' : v; })) });
  const bx = $('[data-x="xls"]', host); if (bx) bx.onclick = () => { const e = ekspor(); unduhExcel((o.nama || 'data') + '_' + new Date().toISOString().slice(0, 10), [{ nama: o.nama || 'Data', header: e.header, rows: e.rows }]); };
  const bp = $('[data-x="pdf"]', host); if (bp) bp.onclick = () => cetakTabel(o.nama || 'Data', ekspor());
  gambar();
  return { set(rows) { o.rows = rows; st.pilih = {}; gambar(); bulk(); }, rows: () => saring() };
}
function cetakTabel(judulT, e) {
  const w = window.open('', '_blank'); if (!w) return toast('Izinkan pop-up untuk mencetak.', 'warn');
  w.document.write('<html><head><title>' + esc(judulT) + '</title><style>body{font:12px Inter,Arial;padding:20px}h2{margin:0 0 4px}table{border-collapse:collapse;width:100%;margin-top:12px}th,td{border:1px solid #ccc;padding:5px 7px;text-align:left;vertical-align:top}th{background:#eef1fb}</style></head><body><h2>' + esc(judulT) + '</h2><small>SIM-LPPM · dicetak ' + new Date().toLocaleString('id-ID') + ' · ' + e.rows.length + ' baris</small><table><thead><tr>' + e.header.map(h => '<th>' + esc(h) + '</th>').join('') + '</tr></thead><tbody>' + e.rows.map(r => '<tr>' + r.map(v => '<td>' + esc(v) + '</td>').join('') + '</tr>').join('') + '</tbody></table><script>setTimeout(()=>print(),300)<\/script></body></html>');
  w.document.close();
}

// ---------------- Referensi dropdown (cache SWR) ----------------
const Ref = {
  memo: {},
  async get(jenis, data) { const k = jenis + JSON.stringify(data || {}); if (this.memo[k]) return this.memo[k]; const e = Cache.get('ref.list', Object.assign({ jenis }, data)); const p = e && !Cache.isStale(e, 120000) ? Promise.resolve(e.v) : apiQ('ref.list', Object.assign({ jenis }, data)).then(r => { if (r.success) Cache.put('ref.list', Object.assign({ jenis }, data), r.data); return r.success ? r.data : (e ? e.v : []); }); this.memo[k] = p; setTimeout(() => delete this.memo[k], 30000); return p; },
  reset() { this.memo = {}; }
};
const REF_KOLOM = { ID_Mitra: 'mitra', ID_Kegiatan: 'kegiatan', ID_Kegiatan_Terkait: 'kegiatan', ID_Proposal: 'proposal', ID_Kriteria: 'kriteria', ID_Termin: 'termin', ID_RAB_Item: 'rab', ID_Petugas: 'petugas', ID_Ketua: 'dosen', ID_User: 'dosen', PIC: 'petugas', Penanggung_Jawab: 'petugas', ID_Skema: 'skema' };

// ---------------- Formulir dari skema ----------------
const SEMBUNYI = /^(created_at|created_by|updated_at|updated_by|Sumber_Data|Terkunci|Draft_JSON|ID_Folder_Drive|StatusWA|CekWAAt|Capaian_Otomatis|Pembuat|Sumber|ID_Eksternal|Diusulkan_Oleh|Dikunci_Oleh|Tgl_Kunci)$|_nama$/;
function opsiKolom(t, k) {
  const O = Sesi.boot.opts, per = Array.from(new Set(Sesi.boot.periode.map(p => p.Tahun_Akademik))).sort().reverse();
  const peta = {
    Semester: O.Semester, Melibatkan_Mahasiswa: O.YaTidak, Flag_DTPS: O.YaTidak, Dibagikan_ke_LPM: O.YaTidak, Pelibatan_Mahasiswa: O.YaTidak, Aktif: O.YaTidak,
    Status_Verifikasi: t === 'SPJ_Bukti' ? O.Status_SPJ : O.Status_Verifikasi, Level: O.Level, Level_Indeks: O.Level_Indeks, Jenis_Mitra: O.Jenis_Mitra, Sumber_Dana: O.Sumber_Dana, Tahun_Akademik: per,
    Metode: O.Metode_Monev, Tahap_PPEPP: O.Tahap_PPEPP, Sumber_Temuan: O.Sumber_Temuan, Status_Akreditasi: O.Status_Akreditasi_Jurnal, Lembaga_Akreditasi: O.Lembaga_Akreditasi, Status_Kelengkapan: O.Status_Kelengkapan,
    Prioritas: O.Prioritas, Syarat_Ketua: O.Syarat_Ketua, Hasil_Cek_Similarity: O.Hasil_Similarity, Kategori: O.Kategori_RAB, Severity: O.Severity, Jenis_Aturan: O.Jenis_Aturan, Status_Kegiatan: ['Berjalan', 'Selesai'], Jabatan_Fungsional: O.Jabatan_Fungsional, Kanal_Notifikasi: O.Kanal, Status_Aktif: O.Status_Aktif, Jenis_Reviewer: O.Jenis_Reviewer, Kategori_Sumber: ['Riset', 'PkM', 'Lainnya'], Asal: ['Manual', 'Sinkron-LPM']
  };
  const jenis = { Kegiatan_NonHibah: O.Jenis_Kegiatan, Luaran: O.Jenis_Luaran, Publikasi_Dosen: O.Jenis_Publikasi, Kekayaan_Intelektual: O.Jenis_HKI, Dokumen_Mutu: O.Jenis_Dokumen_Mutu, Kegiatan_Ilmiah: O.Jenis_Kegiatan_Ilmiah, Laporan: O.Jenis_Laporan, Skema_Hibah: O.Jenis_Skema, Bukti_Dukung: ['Rekaman', 'Dokumen', 'Foto', 'Tautan', 'Lainnya'] };
  const status = { Skema_Hibah: O.Status_Skema, Mitra: O.Status_Aktif.concat(['Diusulkan']), Kerjasama: O.Status_Kerjasama, Dokumen_Mutu: O.Status_Dokumen_Mutu, PPEPP_Tindak_Lanjut: O.Status_PPEPP, Monev: O.Status_Monev, Catatan_Data: O.Status_Catatan, Laporan: O.Status_Laporan, Periode_Akademik: ['Aktif', 'Selesai', 'Akan Datang'] };
  if (k === 'Jenis') return jenis[t];
  if (k === 'Status') return status[t];
  if (/^(Prodi|Prodi_Pelaksana|Prodi_Homebase|Berlaku_Untuk_Prodi)$/.test(k)) return Sesi.boot.prodi.map(p => ({ v: p.Kode_Prodi, l: p.Kode_Prodi + ' — ' + p.Nama_Prodi }));
  return peta[k];
}
function tipeKolom(t, k) {
  if (/^ID_File/.test(k)) return 'file';
  if (REF_KOLOM[k]) return 'ref';
  if (opsiKolom(t, k)) return 'select';
  if (/^(Tgl_|Tanggal$|Tenggat|Penerbitan_Terakhir)/.test(k)) return 'date';
  if (/^(Nominal|Total_|Harga|Volume|Jumlah|Skor|Persentase|Bobot|Sitasi|Kuota|Plafon|Target$|Maks_|Min_|Ambang|Subtotal|Urutan|Termin_Ke)/.test(k) || (k === 'Tahun' && /Luaran|Publikasi/.test(t))) return 'number';
  if (/^(Abstrak|Catatan|Isi_|Ringkasan|Uraian|Temuan|Rencana|Capaian|Kendala|Kegiatan$|Ruang_Lingkup|Bentuk_Dampak|Bukti_Dampak|Deskripsi|Rekomendasi|Anggota|Pesan|Sasaran|Jenis_Bukti_Diminta|Penulis|Mata_Kuliah)/.test(k)) return 'textarea';
  if (/^(Tautan|DOI_URL|Link_)/.test(k)) return 'url';
  return 'text';
}
/** Bangun formulir dari kolom tabel. Mengembalikan {html, isi(), berkas()} */
async function formSkema(t, row, o) {
  o = o || {};
  const meta = Sesi.boot.tabel[t], key = meta.key;
  const own = meta.own && Sesi.me.role === 'DS';
  const kolom = meta.cols.filter(k => !SEMBUNYI.test(k) && !(k === key && /^(ID|ID_\w+)$/.test(k) && !/^(Kunci|Kode_Prodi)$/.test(k)) && !(own && /^(ID_Ketua|ID_User|Status_Verifikasi)$/.test(k)) && !(k === 'Status_Verifikasi' && !meta.V) && (!o.hanya || o.hanya.indexOf(k) >= 0) && (!o.kecuali || o.kecuali.indexOf(k) < 0));
  const refs = {};
  await Promise.all(kolom.filter(k => tipeKolom(t, k) === 'ref').map(async k => { refs[k] = await Ref.get(REF_KOLOM[k], k === 'ID_RAB_Item' ? { proposal: (row || {}).ID_Proposal || o.proposal || '' } : k === 'ID_Termin' ? { proposal: (row || {}).ID_Proposal || o.proposal || '' } : {}); }));
  const wajib = (o.wajib || '').split(' ');
  const html = '<div class="form">' + kolom.map(k => {
    const tp = tipeKolom(t, k), v = row ? row[k] : (o.awal || {})[k], f = { k, label: fmt.label(k), val: v == null ? '' : v, req: wajib.indexOf(k) >= 0 };
    if (tp === 'file') return '<div class="field"><label>' + esc(fmt.label(k).replace(/^ID File /, 'Berkas ')) + '</label><div class="file-row">' + ms('attach_file') + '<span class="grow" data-fn="' + k + '">' + (v ? 'Berkas tersimpan · <a href="#" data-dl="' + esc(v) + '">unduh</a>' : 'Belum ada berkas') + '</span><input type="file" data-file="' + k + '" style="max-width:160px"></div><div class="prog"><i data-pr="' + k + '"></i></div></div>';
    if (tp === 'ref') { f.type = 'select'; f.opts = (refs[k] || []).map(x => ({ v: x.id, l: x.nama + (x.sub ? ' · ' + x.sub : '') })); if (v && !f.opts.some(x => String(x.v) === String(v))) f.opts.unshift({ v: v, l: (row && row[k + '_nama']) || v }); }
    else if (tp === 'select') { f.type = 'select'; f.opts = opsiKolom(t, k); }
    else f.type = tp === 'textarea' ? 'textarea' : tp;
    if (tp === 'date' && v) f.val = String(v).slice(0, 10);
    return fieldHtml(f);
  }).join('') + '</div>';
  return {
    html,
    isi(box) { const out = {}; kolom.forEach(k => { const el = $('[name="' + k + '"]', box); if (el) out[k] = tipeKolom(t, k) === 'number' ? (el.value === '' ? '' : Number(el.value)) : el.value.trim(); }); if (row && row[key]) out[key] = row[key]; return out; },
    berkas(box) { return $$('[data-file]', box).filter(i => i.files[0]).map(i => ({ kolom: i.dataset.file, file: i.files[0] })); },
    pasang(box) { $$('[data-dl]', box).forEach(a => a.onclick = e => { e.preventDefault(); unduh(a.dataset.dl); }); }
  };
}
/** Modal tambah/ubah baris tabel generik. */
async function bukaForm(t, row, o) {
  o = o || {};
  const f = await formSkema(t, row, o), meta = Sesi.boot.tabel[t];
  return new Promise(res => {
    const m = modal({ title: (row ? T('Ubah') + ' ' : T('Tambah') + ' ') + meta.label, size: 'lg', body: f.html + (o.catatan ? '<div class="note info" style="margin-top:12px">' + ms('info') + '<div>' + o.catatan + '</div></div>' : ''), onClose: v => res(v || null), buttons: [{ label: T('Batal'), cls: 'out', act: c => c() }, { label: T('Simpan'), icon: 'save', act: async (c) => {
      const box = m.body, data = Object.assign({}, o.tetap || {}, f.isi(box));
      const r = await api('crud.save', { t, row: data });
      if (!r.success) return toast(r.message, 'bad');
      const id = r.data.row[meta.key];
      for (const b of f.berkas(box)) {
        const pr = $('[data-pr="' + b.kolom + '"]', box);
        const u = await unggah(b.file, { tabel: t, id, kolom: b.kolom }, p => { if (pr) pr.style.width = p + '%'; });
        if (!u.success) toast('Berkas ' + b.file.name + ': ' + u.message, 'bad');
      }
      (r.data.peringatan || []).forEach(p => toast(p, 'warn'));
      toast(r.message, 'ok'); Ref.reset(); c(r.data.row);
    } }] });
    f.pasang(m.body);
  });
}
/** Halaman/tab CRUD generik untuk tabel ber-RBAC. */
async function crud(host, t, o) {
  o = o || {};
  const meta = Sesi.boot.tabel[t];
  if (!meta) { host.innerHTML = kosong('lock', 'Tidak ada akses.'); return; }
  host.innerHTML = '<div class="sk" style="height:220px"></div>';
  const hidup = stempel(host);
  let tbl = null;
  const kolom = (o.cols || meta.list).map(k => ({ k, l: fmt.label(k), num: /^(Nominal|Total_RAB|Plafon|Sitasi|Jumlah|Skor|Persentase|Target)/.test(k), r: rowRender(t, k) }));
  const aksi = r => (meta.V && r.Status_Verifikasi && r.Status_Verifikasi !== 'Terverifikasi' && !/^(Ya)$/.test(r.Terkunci) ? '<button class="btn ok xs" data-a="v">' + ms('check') + 'Verifikasi</button> ' : '') +
    (meta.U && r.Terkunci !== 'Ya' ? '<button class="btn ghost xs" data-a="e" title="Ubah">' + ms('edit') + '</button>' : '') +
    (r.Terkunci === 'Ya' ? ms('lock', '') : '') + (o.aksiTambahan ? o.aksiTambahan(r) : '') +
    (meta.D && r.Terkunci !== 'Ya' ? '<button class="btn ghost xs" data-a="d" title="Hapus" style="color:var(--bad)">' + ms('delete') + '</button>' : '');
  const muat = (rows, cached) => {
    if (!hidup()) return;
    rows = (rows && rows.rows) || [];
    if (o.saring) rows = rows.filter(o.saring);
    if (!tbl) {
      host.innerHTML = '';
      tbl = tabel(host, { cols: kolom, rows, nama: meta.label, filter: o.filter, aksi, pilih: meta.V && !o.tanpaBulk, bulk: '<button class="btn ok sm" data-b="v">' + ms('done_all') + 'Verifikasi terpilih</button><button class="btn warn sm" data-b="p">Perlu perbaikan</button>',
        onBulk: async (b, sel) => { const st = b === 'v' ? 'Terverifikasi' : 'Perlu Perbaikan'; let cat = ''; if (b === 'p') { const v = await isian('Catatan perbaikan', [{ k: 'c', label: 'Catatan untuk pemilik data', type: 'textarea', req: true }]); if (!v) return; cat = v.c; } const r = await api('crud.verify', { t, ids: sel.map(x => x[meta.key]), status: st, catatan: cat }); if (hasil(r)) segar(); },
        tombol: (meta.C && !o.tanpaTambah ? '<button class="btn sm" data-x="add">' + ms('add') + T('Tambah') + '</button>' : '') + (o.tombol || ''),
        onRow: o.onRow || (r => detailBaris(t, r, segar)),
        onAksi: async (a, r) => {
          if (a === 'e') { if (await bukaForm(t, r, o.form)) segar(); }
          if (a === 'd') { if (await konfirmasi('Hapus data <b>' + esc(r[meta.key]) + '</b>? Tindakan ini tercatat di audit log.', { danger: true, ok: 'Hapus' })) { if (hasil(await api('crud.delete', { t, id: r[meta.key] }))) segar(); } }
          if (a === 'v') { if (hasil(await api('crud.verify', { t, ids: [r[meta.key]], status: 'Terverifikasi' }))) segar(); }
          if (o.onAksi) o.onAksi(a, r, segar);
        }
      });
      const add = $('[data-x="add"]', host); if (add) add.onclick = async () => { if (await bukaForm(t, null, o.form)) segar(); };
      if (o.setelah) o.setelah(host, segar);
    } else tbl.set(rows);
  };
  const segar = () => swr('crud.list', { t, filter: o.filterServer || {}, per: 2000 }, (d, c, err) => { if (!hidup()) return; if (err) host.innerHTML = kosong('error', esc(err)); else muat(d, c); }, { fresh: true });
  await swr('crud.list', { t, filter: o.filterServer || {}, per: 2000 }, (d, c, err) => { if (!hidup()) return; if (err) host.innerHTML = kosong('error', esc(err)); else muat(d, c); });
  return { segar };
}
function rowRender(t, k) {
  if (/^(Status|Status_Verifikasi|Status_Review|Status_Kelengkapan|Status_Kegiatan|Severity|Asal)$/.test(k)) return r => badge(r[k]);
  if (/^(Nominal|Total_RAB|Plafon_Per_Proposal|Kuota_Anggaran_Total)$/.test(k)) return r => fmt.rp(r[k]);
  if (/^(Tgl_|Tanggal|Tenggat|Waktu$)/.test(k)) return r => fmt.tgl(r[k]);
  if (/^ID_File/.test(k)) return r => r[k] ? '<a href="#" onclick="unduh(\'' + esc(r[k]) + '\');return false">' + ms('download') + '</a>' : '-';
  if (/^(ID|ID_Proposal|ID_Skema|ID_Mitra|Kode|ID_Kriteria|Kode_Prodi)$/.test(k)) return r => '<span class="id">' + esc(r[k]) + '</span>' + (k === 'ID_Mitra' && r.ID_Mitra_nama && t !== 'Mitra' ? '<div class="sub">' + esc(r.ID_Mitra_nama) + '</div>' : '');
  if (/^(Judul|Nama_Skema|Nama_Mitra|Nama_Kriteria|Nama|Indikator|Temuan|Judul_Bukti|Isi_Catatan|Nama_Jurnal)$/.test(k)) return r => '<div class="ttl">' + esc(r[k]) + '</div>';
  if (/^(Prodi|Prodi_Pelaksana)$/.test(k)) return r => esc(r[k + '_nama'] || r[k] || '-');
  return null;
}
/** Laci detail satu baris (dengan tombol berkas & catatan data). */
function detailBaris(t, r, segar) {
  const meta = Sesi.boot.tabel[t] || { cols: Object.keys(r), label: t };
  const isi = '<dl class="kv">' + meta.cols.filter(k => !/^(Draft_JSON)$/.test(k) && r[k] !== '' && r[k] != null).map(k => '<dt>' + esc(fmt.label(k)) + '</dt><dd>' + (/^ID_File/.test(k) ? '<a href="#" data-dl="' + esc(r[k]) + '">' + ms('download') + ' Unduh</a>' : /Status/.test(k) ? badge(r[k]) : /^(Tautan|DOI_URL|Link_)/.test(k) && /^https?:/.test(r[k]) ? '<a href="' + esc(r[k]) + '" target="_blank" rel="noopener">' + esc(r[k]) + '</a>' : esc(r[k + '_nama'] ? r[k + '_nama'] + ' (' + r[k] + ')' : r[k])) + '</dd>').join('') + '</dl>' +
    (Sesi.punya('LPM SA AD') && t !== 'Catatan_Data' ? '<div style="margin-top:16px"><button class="btn sec sm" id="buatCatatan">' + ms('sticky_note_2') + 'Buat Catatan Data atas rekaman ini</button></div>' : '');
  const d = drawer(meta.label + ' · ' + (r[meta.key] || ''), isi);
  $$('[data-dl]', d.body).forEach(a => a.onclick = e => { e.preventDefault(); unduh(a.dataset.dl); });
  const bc = $('#buatCatatan', d.body);
  if (bc) bc.onclick = async () => { const v = await isian('Catatan Data', [{ k: 'Isi_Catatan', label: 'Isi catatan (data kurang/janggal)', type: 'textarea', req: true }, { k: 'Prioritas', type: 'select', opts: ['Normal', 'Tinggi'], val: 'Normal', kosong: false }]); if (!v) return; if (hasil(await api('catatan.simpan', { row: Object.assign(v, { Tabel_Terkait: t, ID_Rekaman: r[meta.key] }) }))) d.close(); };
}

// ---------------- Kalender mini & agenda ----------------
function kalender(agenda, bulan) {
  const now = new Date(), b = bulan || new Date(now.getFullYear(), now.getMonth(), 1), awal = (b.getDay() + 6) % 7, hari = new Date(b.getFullYear(), b.getMonth() + 1, 0).getDate();
  const ada = {}; (agenda || []).forEach(a => { ada[a.tanggal] = 1; });
  let s = '<div class="cal">' + ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(h => '<div class="h">' + h + '</div>').join('');
  for (let i = 0; i < awal; i++) s += '<div class="d x">·</div>';
  for (let d = 1; d <= hari; d++) { const k = b.getFullYear() + '-' + String(b.getMonth() + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0'); s += '<div class="d' + (d === now.getDate() && b.getMonth() === now.getMonth() ? ' now' : '') + '">' + d + (ada[k] ? '<i></i>' : '') + '</div>'; }
  return s + '</div>';
}
function daftarAgenda(agenda, n) {
  return (agenda || []).length ? '<div class="agenda">' + agenda.slice(0, n || 6).map(a => '<a class="ag ' + esc(a.jenis) + '" href="#/' + esc(a.rute || 'dashboard') + '" style="color:inherit;text-decoration:none"><small>' + fmt.tgl(a.tanggal) + ' · ' + fmt.hari(Math.round((new Date(a.tanggal + 'T00:00:00') - new Date(new Date().toDateString())) / 864e5)) + '</small><b>' + esc(a.judul) + '</b>' + (a.sub ? '<small>' + esc(a.sub) + '</small>' : '') + '</a>').join('') + '</div>' : '<div class="empty" style="padding:14px">Tidak ada agenda dekat.</div>';
}
