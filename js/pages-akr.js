/* ============================================================
   pages-akr.js — Pusat Ekspor & Impor (+ migrasi app lama), Templat &
   Validasi (hasil, skor kesiapan, katalog templat, aturan), editor
   pemetaan templat dua panel, Jembatan Integrasi SIM-LPM.
   ============================================================ */
'use strict';
const PAKET_IKON = { P1: 'folder_zip', P2: 'badge', P3: 'payments', P4: 'insights', P5: 'dataset', P6: 'fact_check', PT: 'grid_on' };

// ===================== PUSAT EKSPOR & IMPOR =====================
Router.add('/ekspor', async (view) => {
  const adm = Sesi.punya('SA AD'), sa = Sesi.punya('SA');
  judul(view, { title: T('Pusat Ekspor & Impor'), desc: 'Paket Excel siap pakai untuk akreditasi & laporan; impor massal dengan pratinjau; migrasi data app lama.' });
  const host = document.createElement('div'); host.className = 'card'; view.appendChild(host);
  const tb = [{ k: 'pak', l: 'Paket ekspor', i: 'download' }, { k: 'riw', l: 'Riwayat & banding', i: 'history' }];
  if (adm) tb.push({ k: 'imp', l: 'Impor massal', i: 'upload' });
  if (sa) tb.push({ k: 'mig', l: 'Migrasi app lama', i: 'move_up' });
  tabs(host, tb, (k, b) => ({ pak: eksporPaket, riw: eksporRiwayat, imp: imporMassal, mig: migrasiLama })[k](b));
}, { roles: 'SA AD DS PM LPM', menu: 'ekspor' });

async function eksporPaket(b) {
  const h2 = stempel(b); b.innerHTML = '<div class="sk" style="height:220px"></div>';
  const r = await api('ekspor.paket', {}); if (!h2()) return;
  if (!r.success) { b.innerHTML = kosong('error', esc(r.message)); return; }
  const d = r.data;
  b.innerHTML = '<div class="note ' + (d.mode === 'Blokir' ? 'warn' : 'info') + '" style="margin-bottom:14px">' + ms('rule') + '<div>Validasi dijalankan otomatis sebelum ekspor. Mode pra-ekspor: <b>' + esc(d.mode) + '</b>' + (d.mode === 'Blokir' ? ' — ekspor resmi ditolak bila masih ada temuan Kritis.' : ' — temuan dicantumkan di sheet README_Metadata.') + '</div></div><div class="grid g3">' +
    d.paket.map(p => '<div class="card flat"><div class="card-h"><div style="display:flex;gap:12px"><div class="ico t-blue" style="width:42px;height:42px;border-radius:13px;display:grid;place-items:center;flex:none">' + ms(PAKET_IKON[p.kode] || 'download') + '</div><div><h3>' + esc(p.kode + ' · ' + p.nama) + '</h3><p>' + esc(p.ket) + '</p></div></div></div>' + (p.boleh ? '<button class="btn sm" data-p="' + esc(p.kode) + '">' + ms('file_download') + 'Buat & unduh</button>' : '<span class="badge b-gray">Tidak tersedia untuk peran Anda</span>') + '</div>').join('') + '</div>';
  $$('[data-p]', b).forEach(x => x.onclick = () => dialogEkspor(x.dataset.p, d));
}
async function dialogEkspor(kode, d) {
  const O = Sesi.boot.opts, sk = await Ref.get('skema');
  const m = modal({ title: 'Ekspor ' + kode, size: 'lg', body: '<div class="form"><div class="field full"><label>Tahun akademik (TS-2 · TS-1 · TS)</label><div style="display:flex;gap:14px;flex-wrap:wrap">' + d.tahunTS.map((t, i) => '<label style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-th value="' + esc(t) + '" checked> ' + esc(t) + ' <span class="badge b-gray">' + ['TS-2', 'TS-1', 'TS'][i] + '</span></label>').join('') + '</div></div>' +
    fieldHtml({ k: 'prodi', label: 'Prodi', type: 'select', opts: prodiOpts() }) + fieldHtml({ k: 'jenis', label: 'Jenis kegiatan', type: 'select', opts: O.Jenis_Kegiatan }) + fieldHtml({ k: 'sumber', label: 'Sumber dana', type: 'select', opts: O.Sumber_Dana }) + fieldHtml({ k: 'skema', label: 'Skema', type: 'select', opts: sk.map(s => ({ v: s.id, l: s.nama })) }) +
    (kode === 'PT' ? fieldHtml({ k: 'templat', label: 'Templat', type: 'select', opts: d.templat.map(t => ({ v: t.id, l: t.nama + ' (' + t.lembaga + ' v' + t.versi + ')' })), req: true }) : '') +
    (Sesi.me.role === 'DS' ? '' : fieldHtml({ k: 'semua', type: 'check', label: 'Sertakan data belum terverifikasi', text: 'Ya (default: hanya data terverifikasi)' })) + '</div><div id="eHasil" style="margin-top:14px"></div>',
    buttons: [{ label: 'Tutup', cls: 'out', act: c => c() }, { label: 'Buat ekspor', icon: 'file_download', act: async () => {
      const g = n => $('[name="' + n + '"]', m.body), data = { paket: kode, tahun: $$('[data-th]', m.body).filter(x => x.checked).map(x => x.value), prodi: g('prodi').value, jenis: g('jenis').value, sumber: g('sumber').value, skema: g('skema').value, semua: g('semua') ? g('semua').checked : false, templat: g('templat') ? g('templat').value : '' };
      if (kode === 'PT' && !data.templat) return toast('Pilih templat.', 'warn');
      $('#eHasil', m.body).innerHTML = '<div class="note info">' + ms('hourglass_top') + '<div>Menjalankan validasi & menyusun berkas… (bisa beberapa detik)</div></div>';
      const r = await api('ekspor.buat', data);
      const v = (r.data && r.data.validasi) || {};
      const sev = '<div class="sev" style="margin:10px 0"><div style="background:var(--bad-bg);color:var(--bad-ink)"><b>' + (v.Kritis || 0) + '</b><small>Kritis</small></div><div style="background:var(--warn-bg);color:var(--warn-ink)"><b>' + (v.Peringatan || 0) + '</b><small>Peringatan</small></div><div style="background:var(--info-bg);color:var(--info-ink)"><b>' + (v.Info || 0) + '</b><small>Info</small></div></div>';
      if (!r.success) { $('#eHasil', m.body).innerHTML = '<div class="note bad">' + ms('block') + '<div>' + esc(r.message) + '</div></div>' + sev + '<a class="btn out sm" href="#/validasi">Buka hasil validasi</a>'; return; }
      if (r.data.antri) { $('#eHasil', m.body).innerHTML = '<div class="note info">' + ms('schedule') + '<div>' + esc(r.message) + '</div></div>' + sev; return; }
      $('#eHasil', m.body).innerHTML = '<div class="note ok">' + ms('task_alt') + '<div><b>' + esc(r.data.nama) + '</b><br>' + fmt.n(r.data.baris) + ' baris' + (r.data.peringatan ? ' · ' + esc(r.data.peringatan) : '') + '</div></div>' + sev + '<button class="btn" id="eDl">' + ms('download') + 'Unduh Excel</button>';
      $('#eDl', m.body).onclick = () => unduh(r.data.ID_File, r.data.nama);
      unduh(r.data.ID_File, r.data.nama);
    } }] });
}
async function eksporRiwayat(b) {
  const h2 = stempel(b); b.innerHTML = '<div class="sk" style="height:220px"></div>';
  await swr('ekspor.riwayat', {}, (rows, c, err) => {
    if (!h2()) return; if (err) { b.innerHTML = kosong('error', esc(err)); return; }
    b.innerHTML = '';
    tabel(b, { rows, nama: 'Riwayat_Ekspor', pilih: Sesi.punya('SA AD PM LPM'), bulk: '<button class="btn sec sm" data-b="banding">' + ms('compare_arrows') + 'Bandingkan 2 ekspor</button>', filter: [{ k: 'Kode_Paket', l: 'Paket', opts: Object.keys(PAKET_IKON) }, { k: 'Status', l: 'Status', opts: ['Selesai', 'Antri', 'Gagal', 'Terbit'] }],
      cols: [{ k: 'Waktu', l: 'Waktu', r: r => fmt.tglw(r.Waktu) }, { k: 'Kode_Paket', l: 'Paket', r: r => '<span class="badge b-info">' + esc(r.Kode_Paket) + '</span>' }, { k: 'Nama_File', l: 'Berkas', r: r => '<div class="ttl">' + esc(r.Nama_File || '-') + '</div><div class="sub">' + esc(r.Oleh || '') + '</div>' }, { k: 'Jumlah_Baris', l: 'Baris', num: 1 }, { k: 'Status', l: 'Status', r: r => badge(r.Status) }],
      aksi: r => r.ID_File_Hasil ? '<button class="btn out xs" data-a="dl">' + ms('download') + '</button>' : '', onAksi: (a, r) => unduh(r.ID_File_Hasil, r.Nama_File),
      onBulk: async (x, sel) => {
        if (sel.length !== 2) return toast('Pilih tepat dua ekspor dari paket yang sama.', 'warn');
        const r = await api('ekspor.banding', { a: sel[1].ID, b: sel[0].ID });
        if (!r.success) return toast(r.message, 'bad');
        const mm = modal({ title: 'Perbandingan ekspor · ' + r.data.perbedaan + ' perbedaan', size: 'lg', body: '<div id="bdT"></div>', buttons: [{ label: 'Tutup', cls: 'out', act: c => c() }, { label: 'Unduh laporan selisih', icon: 'download', act: () => unduh(r.data.ID_File, r.data.nama) }] });
        const cols = r.data.contoh[0] ? Object.keys(r.data.contoh[0]) : [];
        tabel($('#bdT', mm.body), { rows: r.data.contoh, cari: false, unduh: false, cols: cols.map(k => ({ k, l: fmt.label(k) })), kosong: 'Tidak ada perbedaan.' });
      } });
  });
}
async function imporMassal(b) {
  const h2 = stempel(b); b.innerHTML = '<div class="sk" style="height:200px"></div>';
  const r = await api('impor.templat', {}); if (!h2()) return;
  if (!r.success) { b.innerHTML = kosong('error', esc(r.message)); return; }
  const jenis = r.data.filter(j => j.jenis !== 'dosen' || Sesi.punya('SA'));
  b.innerHTML = '<div class="note info" style="margin-bottom:14px">' + ms('info') + '<div>Alur: <b>unduh templat</b> → isi di Excel → <b>unggah</b> → periksa pratinjau (dry-run, tidak menulis apa pun) → <b>impor final</b>. Baris yang sudah ada dilewati sehingga aman diulang.</div></div><div class="grid g3">' +
    jenis.map(j => '<div class="card flat"><h3 style="margin:0 0 6px">' + esc(j.label) + '</h3><p class="sub" style="margin:0 0 10px">Wajib: ' + j.wajib.map(esc).join(', ') + '</p><div class="acts"><button class="btn out sm" data-t="' + esc(j.jenis) + '">' + ms('table_view') + 'Templat</button><button class="btn sm" data-u="' + esc(j.jenis) + '">' + ms('upload') + 'Unggah</button></div></div>').join('') + '</div><div id="iHasil" style="margin-top:16px"></div>';
  $$('[data-t]', b).forEach(x => x.onclick = () => { const j = jenis.find(y => y.jenis === x.dataset.t); unduhExcel('Templat_Impor_' + j.jenis, [{ nama: j.jenis, header: j.kolom, rows: [] }]); });
  $$('[data-u]', b).forEach(x => x.onclick = async () => {
    const j = jenis.find(y => y.jenis === x.dataset.u), f = await pilihBerkas('.xlsx,.xls,.csv'); if (!f) return;
    await muatSkrip(XLSX_URL);
    const wb = XLSX.read(await f.arrayBuffer(), { type: 'array', cellDates: true }), ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false, dateNF: 'yyyy-mm-dd' });
    if (!rows.length) return toast('Berkas kosong.', 'warn');
    const kurang = j.wajib.filter(k => !(k in rows[0]));
    if (kurang.length) return toast('Kolom wajib tidak ditemukan: ' + kurang.join(', '), 'bad');
    const jalan = async mode => {
      const res = await api('impor.jalankan', { jenis: j.jenis, mode, rows, namaFile: f.name });
      const host = $('#iHasil', b);
      if (!res.success) { host.innerHTML = '<div class="note bad">' + esc(res.message) + '</div>'; return; }
      const d = res.data;
      host.innerHTML = '<div class="card flat"><div class="card-h"><div><h3>' + esc(j.label) + ' · ' + esc(d.mode) + '</h3><p>' + esc(f.name) + ' · ' + rows.length + ' baris</p></div><div class="acts">' + (d.ID_File_Error ? '<button class="btn out sm" id="iErr">' + ms('error') + 'Unduh baris gagal</button>' : '') + (d.mode === 'Dry-run' && d.siap ? '<button class="btn ok sm" id="iFinal">' + ms('done_all') + 'Impor final (' + d.siap + ' baris)</button>' : '') + '</div></div><div class="sev" style="margin-bottom:12px"><div style="background:var(--ok-bg);color:var(--ok-ink)"><b>' + d.siap + '</b><small>' + (d.mode === 'Final' ? 'Masuk' : 'Siap') + '</small></div><div style="background:var(--bad-bg);color:var(--bad-ink)"><b>' + d.gagal + '</b><small>Gagal</small></div><div style="background:var(--surface-low)"><b>' + d.dilewati + '</b><small>Dilewati</small></div></div><div id="iT"></div></div>';
      tabel($('#iT', host), { rows: d.hasil, cari: true, unduh: false, filter: [{ k: 'status', l: 'Status', opts: ['Siap', 'Masuk', 'Gagal', 'Dilewati'] }], cols: [{ k: 'baris', l: 'Baris', num: 1 }, { k: 'status', l: 'Status', r: r => badge(r.status === 'Siap' || r.status === 'Masuk' ? 'Siap' : r.status === 'Gagal' ? 'Gagal' : 'Info', r.status === 'Gagal' ? 'b-bad' : r.status === 'Dilewati' ? 'b-gray' : 'b-ok').replace(/>[^<]*</, '>' + esc(r.status) + '<') }, { k: 'pesan', l: 'Keterangan' }] });
      if ($('#iErr')) $('#iErr').onclick = () => unduh(d.ID_File_Error);
      if ($('#iFinal')) $('#iFinal').onclick = async () => { if (await konfirmasi('Impor ' + d.siap + ' baris ke ' + esc(j.label) + '?', { ok: 'Impor final' })) jalan('final'); };
    };
    jalan('dry');
  });
}
async function migrasiLama(b) {
  const TB = ['Config', 'Master_Prodi', 'Periode_Akademik', 'Pengguna', 'Mitra', 'Skema_Hibah', 'Rubrik_Master', 'Proposal', 'Proposal_Anggota', 'RAB_Item', 'Reviewer_Plot', 'Rubrik_Nilai', 'Riwayat_Status', 'Kontrak_Surat', 'Logbook', 'Laporan', 'Monev', 'Termin_Dana', 'SPJ_Bukti', 'Kegiatan_NonHibah', 'Luaran', 'Publikasi_Dosen', 'Kekayaan_Intelektual', 'Kerjasama', 'Dampak_PkM', 'Dokumen_Mutu', 'Target_Kinerja', 'PPEPP_Tindak_Lanjut', 'Kegiatan_Ilmiah', 'Peserta_Kegiatan', 'Jurnal_Kampus', 'Kriteria_Akreditasi', 'Bukti_Dukung', 'Catatan_Data', 'Berkas'];
  b.innerHTML = '<div class="note info" style="margin-bottom:14px">' + ms('info') + '<div>Pindahkan data dari spreadsheet SIM-LPPM versi lama (akun Google yang sama). Spreadsheet lama <b>hanya dibaca</b>. Kolom dicocokkan berdasarkan nama header; data yang sudah ada tidak digandakan. Jalankan <b>Pindai</b> dulu, lalu <b>Migrasi</b>; ulangi sesaat sebelum pindah (delta).</div></div>' +
    '<div class="field"><label>URL / ID spreadsheet app lama</label><input class="inp" id="mSrc" placeholder="https://docs.google.com/spreadsheets/d/…"></div>' +
    '<details style="margin:12px 0"><summary style="cursor:pointer;font-weight:600">Pilih sheet (' + TB.length + ')</summary><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:6px;margin-top:10px">' + TB.map(t => '<label style="font-size:13px;display:flex;gap:6px"><input type="checkbox" data-sh value="' + t + '"' + (/Riwayat|Berkas/.test(t) ? '' : ' checked') + '> ' + t + '</label>').join('') + '</div></details>' +
    '<label style="display:flex;gap:8px;align-items:center;font-size:13px"><input type="checkbox" id="mTimpa"> Timpa data yang sudah ada (default: hanya tambah)</label><div class="acts" style="margin-top:14px"><button class="btn out" id="mScan">' + ms('search') + 'Pindai (dry-run)</button><button class="btn" id="mRun">' + ms('move_up') + 'Jalankan migrasi</button></div><div id="mHasil" style="margin-top:16px"></div>';
  const jalan = async dry => {
    const src = $('#mSrc', b).value.trim(); if (!src) return toast('Tempel URL spreadsheet lama.', 'warn');
    if (!dry && !(await konfirmasi('Jalankan migrasi dari spreadsheet lama? Spreadsheet lama tidak diubah.', { ok: 'Migrasi' }))) return;
    const r = await api('migrasi.jalankan', { sumber: src, sheets: $$('[data-sh]', b).filter(x => x.checked).map(x => x.value), timpa: $('#mTimpa', b).checked, dryRun: dry });
    if (!r.success) { $('#mHasil', b).innerHTML = '<div class="note bad">' + esc(r.message) + '</div>'; return; }
    const L = r.data.laporan;
    $('#mHasil', b).innerHTML = '<div class="note ' + (dry ? 'info' : 'ok') + '">' + ms(dry ? 'search' : 'task_alt') + '<div><b>' + esc(r.data.sumber.nama) + '</b> · ' + esc(r.message) + '</div></div>' + (r.data.peringatan.length ? '<div class="note warn" style="margin-top:8px">' + ms('warning') + '<div>' + r.data.peringatan.map(esc).join('<br>') + '</div></div>' : '') + '<div id="mT" style="margin-top:10px"></div>';
    tabel($('#mT', b), { rows: Object.keys(L).map(t => Object.assign({ tabel: t }, L[t])), cari: false, nama: 'Laporan_Migrasi', per: 50, cols: [{ k: 'tabel', l: 'Sheet' }, { k: 'sumber', l: 'Di app lama' }, { k: 'ditambah', l: 'Ditambah', num: 1 }, { k: 'diperbarui', l: 'Diperbarui', num: 1 }, { k: 'dilewati', l: 'Dilewati', num: 1 }] });
  };
  $('#mScan', b).onclick = () => jalan(true); $('#mRun', b).onclick = () => jalan(false);
}

// ===================== TEMPLAT & VALIDASI =====================
Router.add('/validasi', async (view) => {
  const adm = Sesi.punya('SA AD'), lpm = Sesi.punya('SA LPM');
  judul(view, { title: T('Templat & Validasi'), desc: 'Mesin aturan kesiapan data (V01–V16), skor per kriteria, dan katalog templat Excel akreditasi.', acts: Sesi.punya('SA AD LPM') ? '<button class="btn" id="vRun">' + ms('play_circle') + 'Jalankan validasi</button>' : '' });
  const host = document.createElement('div'); host.className = 'card'; view.appendChild(host);
  const tb = [{ k: 'has', l: 'Hasil validasi', i: 'rule', n: (Sesi.boot.lencana || {}).kritis }, { k: 'skr', l: 'Skor kesiapan', i: 'speed' }, { k: 'tpl', l: 'Katalog templat', i: 'grid_on' }, { k: 'atr', l: 'Aturan', i: 'tune' }];
  tabs(host, tb, (k, b) => ({ has: validasiHasil, skr: validasiSkor, tpl: katalogTemplat, atr: validasiAturan })[k](b));
  if ($('#vRun')) $('#vRun').onclick = async () => {
    const v = await isian('Jalankan validasi', [{ k: 'tahun', label: 'Tahun akademik', type: 'select', opts: tahunOpts(), val: Sesi.boot.periodeAktif.tahun }, { k: 'cekTautan', type: 'check', label: 'Periksa tautan (lebih lama)', text: 'Cek tautan bukti/DOI dapat dibuka' }], { ok: 'Jalankan' });
    if (!v) return;
    const r = await api('validasi.jalankan', v);
    if (hasil(r)) { Boot.segarkan(); Router.go(); }
  };
}, { roles: 'SA AD PM LPM', menu: 'validasi' });

async function validasiHasil(b) {
  const h2 = stempel(b), adm = Sesi.punya('SA AD');
  b.innerHTML = '<div class="toolbar"><div class="seg" id="vSeg"><button data-s="" class="on">Terbuka</button><button data-s="semua">Semua</button></div><span class="sub" id="vInfo"></span></div><div id="vT"><div class="sk" style="height:240px"></div></div>';
  let mode = '';
  const muat = async () => {
    const r = await api('validasi.hasil', mode ? { semua: true } : {}); if (!h2()) return;
    if (!r.success) { $('#vT', b).innerHTML = kosong('error', esc(r.message)); return; }
    $('#vInfo', b).textContent = r.data.terakhir ? 'Validasi terakhir ' + fmt.rel(r.data.terakhir) + ' · mode pra-ekspor: ' + r.data.mode : 'Validasi belum pernah dijalankan.';
    const host = $('#vT', b); host.innerHTML = '';
    tabel(host, { rows: r.data.rows, nama: 'Hasil_Validasi', pilih: adm, per: 25,
      bulk: '<button class="btn sec sm" data-b="tugaskan">Tugaskan PIC</button><button class="btn ok sm" data-b="selesai">Tandai selesai</button><button class="btn out sm" data-b="catatan">Buat catatan data</button><button class="btn ghost sm" data-b="abaikan">Abaikan…</button>',
      filter: [{ k: 'Severity', l: 'Tingkat', opts: Sesi.boot.opts.Severity }, { k: 'Kode_Aturan', l: 'Aturan', opts: r.data.aturan.map(a => ({ v: a.Kode, l: a.Kode + ' ' + a.Nama })) }, { k: 'Sheet', l: 'Tabel', opts: Array.from(new Set(r.data.rows.map(x => x.Sheet))) }, { k: 'Status', l: 'Status', opts: Sesi.boot.opts.Status_Temuan }],
      cols: [{ k: 'Severity', l: 'Tingkat', r: r => badge(r.Severity, r.Severity === 'Kritis' ? 'b-bad' : r.Severity === 'Peringatan' ? 'b-warn' : 'b-info') }, { k: 'Kode_Aturan', l: 'Aturan', r: r => '<span class="id">' + esc(r.Kode_Aturan) + '</span><div class="sub">' + esc(r.Nama_Aturan || '') + '</div>' }, { k: 'Pesan', l: 'Temuan', r: r => '<div class="ttl" style="font-weight:500">' + esc(r.Pesan) + '</div><div class="sub">' + esc(r.Sheet + ' · ' + r.ID_Rekaman + (r.Prodi_nama ? ' · ' + r.Prodi_nama : '') + (r.Tahun_Akademik ? ' · ' + r.Tahun_Akademik : '')) + '</div>' }, { k: 'PIC_nama', l: 'PIC' }, { k: 'Status', l: 'Status', r: r => badge(r.Status) }],
      aksi: r => r.rute ? '<a class="btn ghost xs" href="#/' + esc(r.rute) + '" title="Perbaiki data">' + ms('build') + '</a>' : '',
      onBulk: async (aksi, sel) => {
        const d = { ids: sel.map(x => x.ID), aksi };
        if (aksi === 'tugaskan') { const ps = await Ref.get('petugas'); const v = await isian('Tugaskan PIC', [{ k: 'pic', label: 'Penanggung jawab', type: 'select', opts: ps.map(p => ({ v: p.id, l: p.nama + ' · ' + p.sub })), req: true }]); if (!v) return; d.pic = v.pic; }
        if (aksi === 'abaikan') { const v = await isian('Abaikan temuan', [{ k: 'alasan', label: 'Alasan (tercatat di audit log)', type: 'textarea', req: true }], { danger: true, ok: 'Abaikan' }); if (!v) return; d.alasan = v.alasan; }
        if (hasil(await api('validasi.tindak', d))) muat();
      } });
  };
  $$('#vSeg button', b).forEach(x => x.onclick = () => { $$('#vSeg button', b).forEach(y => y.classList.toggle('on', y === x)); mode = x.dataset.s; muat(); });
  muat();
}
async function validasiSkor(b) {
  const h2 = stempel(b);
  b.innerHTML = '<div class="toolbar"><select class="inp" id="sTh" style="max-width:180px">' + tahunOpts().map(t => '<option' + (t === Sesi.boot.periodeAktif.tahun ? ' selected' : '') + '>' + esc(t) + '</option>').join('') + '</select><span class="sub" id="sW"></span></div><div id="sIsi"><div class="sk" style="height:260px"></div></div>';
  const muat = async () => {
    const r = await api('validasi.skor', { tahun: $('#sTh', b).value }); if (!h2()) return;
    if (!r.success) { $('#sIsi', b).innerHTML = kosong('error', esc(r.message)); return; }
    const d = r.data, ada = d.kriteria.filter(k => k.skor !== null), rata = ada.length ? Math.round(ada.reduce((a, k) => a + k.skor, 0) / ada.length) : null;
    $('#sW', b).textContent = d.waktu ? 'Dihitung ' + fmt.tglw(d.waktu) : 'Belum ada skor — jalankan validasi.';
    $('#sIsi', b).innerHTML = '<div class="grid g-main"><div class="card flat"><div class="card-h"><div><h3>Skor per kriteria</h3><p>Dibanding run sebelumnya</p></div></div><div class="list">' + d.kriteria.map(k => { const dl = k.skor !== null && k.sebelum !== null && k.sebelum !== undefined ? k.skor - k.sebelum : null; return '<div><div style="display:flex;justify-content:space-between;font-size:13px;gap:10px"><b>' + esc((k.kode ? k.kode + ' · ' : '') + k.nama) + '</b><span>' + (k.skor === null ? '—' : k.skor + '%') + (dl ? ' <small style="color:' + (dl > 0 ? 'var(--ok)' : 'var(--bad)') + '">' + (dl > 0 ? '▲' : '▼') + Math.abs(dl) + '</small>' : '') + '</span></div><div class="bar ' + (k.skor >= 80 ? 'green' : k.skor >= 60 ? '' : 'amber') + '"><i style="width:' + (k.skor || 0) + '%"></i></div></div>'; }).join('') + '</div></div>' +
      '<div class="grid"><div class="hero"><div class="lbl">Rata-rata kesiapan ' + esc(d.tahun) + '</div><div class="big">' + (rata === null ? '—' : rata + '%') + '</div><small>' + ada.length + ' dari ' + d.kriteria.length + ' kriteria memiliki skor</small></div><div class="card flat"><div class="card-h"><div><h3>Riwayat</h3></div></div><div style="height:180px"><canvas id="sRw"></canvas></div></div></div></div><h3 style="margin-top:18px">Rincian per prodi</h3><div id="sRc"></div>';
    garis($('#sRw', b), d.riwayat.map(x => fmt.tgl(x.waktu)), [{ label: 'Rata-rata %', data: d.riwayat.map(x => x.rata) }]);
    tabel($('#sRc', b), { rows: d.rinci, nama: 'Skor_Kesiapan', cols: [{ k: 'ID_Kriteria', l: 'Kriteria' }, { k: 'Prodi_nama', l: 'Prodi' }, { k: 'Skor_Persen', l: 'Skor %', num: 1 }, { k: 'Jumlah_Kritis', l: 'Kritis', num: 1 }, { k: 'Jumlah_Peringatan', l: 'Peringatan', num: 1 }] });
  };
  $('#sTh', b).onchange = muat; muat();
}
async function validasiAturan(b) {
  const h2 = stempel(b), boleh = Sesi.punya('SA LPM');
  b.innerHTML = '<div class="sk" style="height:220px"></div>';
  const r = await api('validasi.hasil', { semua: true, status: '__x' }); if (!h2()) return;
  if (!r.success) { b.innerHTML = kosong('error', esc(r.message)); return; }
  b.innerHTML = '';
  tabel(b, { rows: r.data.aturan, nama: 'Aturan_Validasi', per: 25, cols: [{ k: 'Kode', l: 'Kode', r: x => '<span class="id">' + esc(x.Kode) + '</span>' }, { k: 'Nama', l: 'Aturan', r: x => '<b>' + esc(x.Nama) + '</b><div class="sub">' + esc(x.Pesan_Perbaikan || '') + '</div>' }, { k: 'Jenis_Aturan', l: 'Jenis' }, { k: 'Severity', l: 'Tingkat', r: x => badge(x.Severity, x.Severity === 'Kritis' ? 'b-bad' : x.Severity === 'Peringatan' ? 'b-warn' : 'b-info') }, { k: 'Kriteria_Terkait', l: 'Kriteria' }, { k: 'Aktif', l: 'Aktif', r: x => badge(x.Aktif === 'Ya' ? 'Aktif' : 'Nonaktif') }],
    aksi: x => boleh ? '<button class="btn ghost xs" data-a="e">' + ms('edit') + '</button>' : '',
    onAksi: async (a, x) => {
      const v = await isian('Aturan ' + x.Kode + ' · ' + x.Nama, [{ k: 'Severity', label: 'Tingkat', type: 'select', opts: Sesi.boot.opts.Severity, val: x.Severity, kosong: false }, { k: 'Aktif', label: 'Aktif', type: 'select', opts: ['Ya', 'Tidak'], val: x.Aktif, kosong: false }, { k: 'Kriteria_Terkait', label: 'Kriteria terkait (ID)', val: x.Kriteria_Terkait }, { k: 'Parameter_JSON', label: 'Parameter (JSON)', type: 'textarea', val: x.Parameter_JSON, help: 'Mis. {"ambang":14} — ubah hanya bila paham.' }, { k: 'Pesan_Perbaikan', label: 'Pesan perbaikan', type: 'textarea', val: x.Pesan_Perbaikan }], { size: 'lg' });
      if (v && hasil(await api('validasi.aturanSimpan', { row: Object.assign({ Kode: x.Kode }, v) }))) validasiAturan(b);
    } });
}
async function katalogTemplat(b) {
  const h2 = stempel(b), boleh = Sesi.punya('SA LPM');
  b.innerHTML = '<div class="sk" style="height:220px"></div>';
  const muat = async () => {
    const r = await api('templat.list', {}); if (!h2()) return;
    if (!r.success) { b.innerHTML = kosong('error', esc(r.message)); return; }
    b.innerHTML = '<div class="toolbar"><span class="sub">Templat <b>Bawaan</b> dipakai paket P1–P6; templat <b>Unggahan</b> (milik Tim LPM) dipakai paket PT.</span><span class="spacer"></span>' + (boleh ? '<button class="btn sm" id="tUp">' + ms('upload_file') + 'Unggah templat .xlsx</button>' : '') + '</div><div class="grid g3">' +
      (r.data.map(t => '<div class="card flat"><div class="card-h"><div><h3>' + esc(t.Nama_Templat) + '</h3><p>' + esc((t.Lembaga_Akreditasi || '-') + ' · ' + (t.Versi_Instrumen || '') + ' · prodi ' + (t.Berlaku_Untuk_Prodi || 'Semua')) + '</p></div>' + badge(t.Status) + '</div><div class="sub">' + esc(t.Jenis_Templat) + ' · versi pemetaan ' + esc(t.Versi || 0) + ' · ' + t.jumlahPemetaan + ' kolom terpetakan</div><div class="acts" style="margin-top:12px"><a class="btn sm' + (boleh ? '' : ' out') + '" href="#/templat/' + esc(t.ID_Templat) + '">' + ms(boleh ? 'edit' : 'visibility') + (boleh ? 'Pemetaan' : 'Lihat') + '</a>' + (t.url ? '<a class="btn ghost sm" target="_blank" rel="noopener" href="' + esc(t.url) + '">' + ms('open_in_new') + '</a>' : '') + '</div></div>').join('') || kosong('grid_off', 'Belum ada templat.')) + '</div>';
    if ($('#tUp', b)) $('#tUp', b).onclick = async () => {
      const v = await isian('Unggah templat akreditasi', [{ k: 'nama', label: 'Nama templat', req: true }, { k: 'lembaga', label: 'Lembaga akreditasi', type: 'select', opts: Sesi.boot.opts.Lembaga_Akreditasi }, { k: 'versiInstrumen', label: 'Versi instrumen', ph: 'mis. IAPS 4.0' }, { k: 'prodi', label: 'Berlaku untuk prodi', type: 'select', opts: [{ v: 'Semua', l: 'Semua prodi' }].concat(prodiOpts()), val: 'Semua', kosong: false }], { ok: 'Pilih berkas .xlsx', note: 'Berkas dikonversi menjadi Google Sheet kerja untuk dipindai. Disarankan tanpa makro.' });
      if (!v) return;
      const f = await pilihBerkas('.xlsx'); if (!f) return;
      const res = await api('templat.unggah', Object.assign(v, { b64: await bacaBase64(f), namaFile: f.name }));
      if (hasil(res)) nav('templat/' + res.data.templat.ID_Templat);
    };
  };
  muat();
}

// ===================== EDITOR PEMETAAN TEMPLAT (dua panel) =====================
Router.add('/templat/:id', async (view, params) => {
  const hidup = stempel(view), id = params.id, boleh = Sesi.punya('SA LPM');
  view.innerHTML = kerangkaMuat(1);
  const [pm, sb] = await Promise.all([apiQ('templat.pemetaan', { id }), apiQ('templat.sumber', {})]);
  if (!hidup()) return;
  if (!pm.success || !sb.success) { view.innerHTML = kosong('error', esc((pm.success ? sb : pm).message)); return; }
  const t = pm.data.templat, views = sb.data;
  let peta = pm.data.pemetaan.map(m => Object.assign({}, m)), kategori = pm.data.kategori.map(k => ({ Kolom: k.Kolom, Nilai_Sistem: k.Nilai_Sistem, Label_Templat: k.Label_Templat }));
  let lembar = [], aktif = 0;
  if (t.ID_Sheet_Kerja) { const sc = await api('templat.pindai', { id }); if (!hidup()) return; if (sc.success) lembar = sc.data; else toast(sc.message, 'warn'); }
  view.innerHTML = '';
  judul(view, { crumb: [['Templat & Validasi', 'validasi'], [t.Nama_Templat]], title: t.Nama_Templat, desc: esc((t.Lembaga_Akreditasi || '') + ' · ' + t.Jenis_Templat + ' · versi ' + (t.Versi || 0)) + ' &nbsp;' + badge(t.Status),
    acts: '<button class="btn out" id="tPrev">' + ms('preview') + 'Pratinjau</button>' + (boleh ? '<button class="btn ghost" id="tJson">' + ms('data_object') + 'JSON</button><button class="btn ' + (t.Status === 'Aktif' ? 'warn' : 'ok') + '" id="tStat">' + ms(t.Status === 'Aktif' ? 'archive' : 'check_circle') + (t.Status === 'Aktif' ? 'Arsipkan' : 'Aktifkan') + '</button><button class="btn" id="tSave">' + ms('save') + 'Simpan pemetaan</button>' : '') });
  view.insertAdjacentHTML('beforeend', '<div class="two"><div class="card"><div class="card-h"><div><h3>Templat</h3><p>' + (lembar.length ? 'Klik saran area tabel untuk menambahkan kolom' : 'Templat bawaan tidak memiliki lembar kerja') + '</p></div></div><div id="tSh"></div><div id="tSar" style="margin:10px 0"></div><div class="preview-grid" id="tGrid"></div></div>' +
    '<div class="card"><div class="card-h"><div><h3>Pemetaan kolom</h3><p>Kolom templat → field data sistem</p></div>' + (boleh ? '<button class="btn out sm" id="tAdd">' + ms('add') + 'Baris</button>' : '') + '</div><div id="tMap"></div><details style="margin-top:14px"><summary style="cursor:pointer;font-weight:600">Pemetaan kategori (mis. Sumber_Dana → label templat)</summary><div id="tKat" style="margin-top:10px"></div></details><details style="margin-top:10px"><summary style="cursor:pointer;font-weight:600">Riwayat versi (' + pm.data.versi.length + ')</summary><div class="list" style="margin-top:10px">' + pm.data.versi.map(v => '<div class="li">' + ms('history') + '<div class="grow"><b>Versi ' + esc(v.Versi) + '</b><small>' + fmt.tglw(v.Waktu) + ' · ' + esc(v.Oleh_nama || v.Oleh || '') + '</small></div></div>').join('') + '</div></details></div></div>');
  const opsiField = cur => '<option value="">— tidak dipetakan —</option>' + views.map(v => '<optgroup label="' + esc(v.label) + '">' + v.fields.map(f => { const val = v.view + '|' + f.kode; return '<option value="' + esc(val) + '"' + (val === cur ? ' selected' : '') + '>' + esc(f.label) + '</option>'; }).join('') + '</optgroup>').join('');
  const gambarPeta = () => {
    $('#tMap').innerHTML = peta.length ? '<div class="map-row" style="font-weight:700;color:var(--muted);font-size:11.5px"><span>Kolom</span><span>Judul / sel awal</span><span>Field sumber</span><span>Transformasi · agregasi</span><span></span></div>' + peta.map((m, i) => '<div class="map-row"><span class="id">' + esc((m.Sheet_Templat ? m.Sheet_Templat.slice(0, 10) + '!' : '') + (m.Kolom_Templat || '?')) + '</span><span><div style="font-weight:600">' + esc(m.Judul_Kolom_Templat || '-') + '</div><input class="inp" data-m="' + i + '.Sel_Awal" value="' + esc(m.Sel_Awal || '') + '" placeholder="B7" style="margin-top:4px"' + (boleh ? '' : ' disabled') + '></span><select class="inp" data-m="' + i + '.field"' + (boleh ? '' : ' disabled') + '>' + opsiField(m.Sumber_Sheet + '|' + m.Sumber_Kolom) + '</select><span><input class="inp" data-m="' + i + '.Transformasi" value="' + esc(m.Transformasi || '') + '" placeholder="nomor / tanggal:dd/MM/yyyy"' + (boleh ? '' : ' disabled') + '><input class="inp" data-m="' + i + '.Agregasi" value="' + esc(m.Agregasi || '') + '" placeholder="hitung / jumlah:Nominal" style="margin-top:4px"' + (boleh ? '' : ' disabled') + '><input class="inp" data-m="' + i + '.Filter_JSON" value="' + esc(m.Filter_JSON || '') + '" placeholder=\'{"Jenis":"Penelitian"}\' style="margin-top:4px"' + (boleh ? '' : ' disabled') + '></span>' + (boleh ? '<button class="btn ghost xs" data-del="' + i + '">' + ms('close') + '</button>' : '<span></span>') + '</div>').join('') : kosong('table_rows', 'Belum ada pemetaan. Pilih area tabel di panel kiri atau tambah baris manual.');
    $$('[data-m]', view).forEach(el => el.onchange = () => { const [i, k] = el.dataset.m.split('.'); if (k === 'field') { const [v, f] = el.value.split('|'); peta[i].Sumber_Sheet = v || 'Kegiatan'; peta[i].Sumber_Kolom = f || ''; } else peta[i][k] = el.value.trim(); gambarGrid(); });
    $$('[data-del]', view).forEach(x => x.onclick = () => { peta.splice(Number(x.dataset.del), 1); gambarPeta(); gambarGrid(); });
  };
  const gambarKat = () => {
    $('#tKat').innerHTML = '<table class="tbl"><thead><tr><th>Kolom sistem</th><th>Nilai sistem</th><th>Label di templat</th><th></th></tr></thead><tbody>' + kategori.map((k, i) => '<tr><td><input class="inp" data-k="' + i + '.Kolom" value="' + esc(k.Kolom) + '"></td><td><input class="inp" data-k="' + i + '.Nilai_Sistem" value="' + esc(k.Nilai_Sistem) + '"></td><td><input class="inp" data-k="' + i + '.Label_Templat" value="' + esc(k.Label_Templat) + '"></td><td>' + (boleh ? '<button class="btn ghost xs" data-kd="' + i + '">' + ms('close') + '</button>' : '') + '</td></tr>').join('') + '</tbody></table>' + (boleh ? '<button class="btn out xs" id="kAdd" style="margin-top:8px">' + ms('add') + 'Kategori</button>' : '');
    $$('[data-k]', view).forEach(el => el.onchange = () => { const [i, k] = el.dataset.k.split('.'); kategori[i][k] = el.value; });
    $$('[data-kd]', view).forEach(x => x.onclick = () => { kategori.splice(Number(x.dataset.kd), 1); gambarKat(); });
    if ($('#kAdd')) $('#kAdd').onclick = () => { kategori.push({ Kolom: 'Sumber_Dana', Nilai_Sistem: '', Label_Templat: '' }); gambarKat(); };
  };
  const gambarGrid = () => {
    if (!lembar.length) { $('#tGrid').innerHTML = '<div class="empty">' + ms('grid_off') + 'Tidak ada pratinjau lembar.</div>'; $('#tSh').innerHTML = ''; return; }
    const sh = lembar[aktif], ditandai = {}, hdr = {};
    peta.filter(m => m.Sheet_Templat === sh.nama).forEach(m => { ditandai[m.Kolom_Templat] = 1; });
    sh.saran.forEach(s => { hdr[s.headerRow] = 1; });
    $('#tSh').innerHTML = '<div class="seg">' + lembar.map((l, i) => '<button data-sh="' + i + '"' + (i === aktif ? ' class="on"' : '') + '>' + esc(l.nama) + '</button>').join('') + '</div>';
    $('#tSar').innerHTML = boleh ? sh.saran.map((s, i) => '<button class="btn sec xs" data-sr="' + i + '" style="margin:2px">' + ms('table_rows') + 'Area baris ' + s.headerRow + ' → mulai ' + esc(s.selAwal) + ' (' + s.kolom.length + ' kolom)</button>').join('') || '<span class="sub">Tidak ada area tabel terdeteksi.</span>' : '';
    const ncol = Math.max(1, ...sh.preview.map(r => r.length)), huruf = n => { let s = ''; n++; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
    $('#tGrid').innerHTML = '<table><thead><tr><th></th>' + Array.from({ length: ncol }, (x, c) => '<th>' + huruf(c) + '</th>').join('') + '</tr></thead><tbody>' + sh.preview.map((r, ri) => '<tr><th>' + (ri + 1) + '</th>' + Array.from({ length: ncol }, (x, c) => '<td class="' + (hdr[ri + 1] ? 'hl' : '') + (ditandai[huruf(c)] && !hdr[ri + 1] ? ' map' : '') + '" title="' + esc(r[c] || '') + '">' + esc(r[c] || '') + '</td>').join('') + '</tr>').join('') + '</tbody></table>';
    $$('[data-sh]', view).forEach(x => x.onclick = () => { aktif = Number(x.dataset.sh); gambarGrid(); });
    $$('[data-sr]', view).forEach(x => x.onclick = async () => {
      const s = sh.saran[Number(x.dataset.sr)];
      const v = await isian('Sumber data area ini', [{ k: 'view', label: 'Ambil baris dari', type: 'select', opts: views.map(w => ({ v: w.view, l: w.label })), val: 'Kegiatan', kosong: false }]);
      if (!v) return;
      const r = await api('templat.saran', { view: v.view, headers: s.kolom });
      if (!r.success) return toast(r.message, 'bad');
      const baris = s.selAwal.replace(/^[A-Z]+/, '');
      r.data.forEach(h => { if (!peta.some(m => m.Sheet_Templat === sh.nama && m.Kolom_Templat === h.kol)) peta.push({ Sheet_Templat: sh.nama, Sel_Awal: h.kol + baris, Kolom_Templat: h.kol, Judul_Kolom_Templat: h.judul, Sumber_Sheet: h.view, Sumber_Kolom: h.field, Transformasi: h.transformasi, Agregasi: '', Filter_JSON: '' }); });
      toast(r.data.filter(h => h.field).length + ' dari ' + r.data.length + ' kolom tersaran otomatis — periksa sebelum menyimpan.', 'ok');
      gambarPeta(); gambarGrid();
    });
  };
  gambarPeta(); gambarKat(); gambarGrid();
  if ($('#tAdd')) $('#tAdd').onclick = () => { peta.push({ Sheet_Templat: (lembar[aktif] || {}).nama || 'Data', Sel_Awal: 'A2', Kolom_Templat: 'A', Judul_Kolom_Templat: '', Sumber_Sheet: 'Kegiatan', Sumber_Kolom: '', Transformasi: '', Agregasi: '', Filter_JSON: '' }); gambarPeta(); };
  if ($('#tSave')) $('#tSave').onclick = async () => { peta.forEach(m => { if (m.Sel_Awal && !m.Kolom_Templat) m.Kolom_Templat = String(m.Sel_Awal).replace(/\d+$/, ''); }); const r = await api('templat.simpanPemetaan', { id, pemetaan: peta, kategori }); if (hasil(r)) Router.go(); };
  if ($('#tStat')) $('#tStat').onclick = async () => { const ke = t.Status === 'Aktif' ? 'Arsip' : 'Aktif'; if (hasil(await api('templat.status', { id, status: ke }))) Router.go(); };
  if ($('#tJson')) $('#tJson').onclick = async () => {
    const m = modal({ title: 'Ekspor / impor pemetaan (JSON)', size: 'sm', body: '<p>Bagikan pemetaan antar instalasi atau simpan cadangan.</p><div class="acts"><button class="btn out" id="jEx">' + ms('download') + 'Ekspor JSON</button><button class="btn" id="jIm">' + ms('upload') + 'Impor JSON</button></div>', buttons: [{ label: 'Tutup', cls: 'out', act: c => c() }] });
    $('#jEx', m.body).onclick = async () => { const r = await api('templat.eksporJson', { id }); if (!r.success) return toast(r.message, 'bad'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' })); a.download = 'pemetaan_' + id + '.json'; a.click(); };
    $('#jIm', m.body).onclick = async () => { const f = await pilihBerkas('.json,application/json'); if (!f) return; if (hasil(await api('templat.imporJson', { id, json: await f.text() }))) { m.close(); Router.go(); } };
  };
  $('#tPrev').onclick = async () => {
    const v = await isian('Pratinjau isi templat', [{ k: 'tahun', label: 'Tahun akademik', type: 'select', opts: tahunOpts(), val: Sesi.boot.periodeAktif.tahun }, { k: 'prodi', label: 'Prodi', type: 'select', opts: prodiOpts() }], { ok: 'Pratinjau' });
    if (!v) return;
    const heads = []; lembar.forEach(l => l.saran.forEach(s => s.kolom.forEach(k => heads.push({ sheet: l.nama, kol: k.kol, judul: k.judul }))));
    const r = await api('templat.pratinjau', { id, tahun: v.tahun, prodi: v.prodi, headers: heads });
    if (!r.success) return toast(r.message, 'bad');
    const mm = modal({ title: 'Pratinjau · ' + t.Nama_Templat, size: 'lg', body: (r.data.peringatan.length ? '<div class="note warn">' + ms('warning') + '<div>' + r.data.peringatan.slice(0, 12).map(esc).join('<br>') + '</div></div>' : '') + r.data.pratinjau.map((a, i) => '<h4>' + esc(a.sheet) + ' · mulai ' + esc(a.selAwal) + '</h4><div id="pv' + i + '"></div>').join('') + (r.data.sel && r.data.sel.length ? '<h4>Sel agregat</h4><div id="pvSel"></div>' : ''), buttons: [{ label: 'Tutup', cls: 'out', act: c => c() }] });
    r.data.pratinjau.forEach((a, i) => tabel($('#pv' + i, mm.body), { rows: a.rows.map(rw => { const o = {}; a.header.forEach((h, j) => { o['c' + j] = rw[j]; }); return o; }), cari: false, unduh: false, per: 10, cols: a.header.map((h, j) => ({ k: 'c' + j, l: h })) }));
    if ($('#pvSel', mm.body)) tabel($('#pvSel', mm.body), { rows: r.data.sel, cari: false, unduh: false, cols: Object.keys(r.data.sel[0] || {}).map(k => ({ k, l: k })) });
  };
}, { roles: 'SA AD PM LPM', menu: 'validasi' });

// ===================== JEMBATAN INTEGRASI SIM-LPM =====================
Router.add('/jembatan', async (view) => {
  const hidup = stempel(view), adm = Sesi.punya('SA AD'), sa = Sesi.punya('SA');
  judul(view, { title: T('Jembatan Integrasi'), desc: 'Pertukaran data dengan SIM-LPM lewat spreadsheet jembatan (kontrak Lampiran A). Spreadsheet utama tidak pernah dibagikan.', acts: adm ? '<button class="btn out" id="jIn">' + ms('move_to_inbox') + 'Proses inbox</button><button class="btn out" id="jTr">' + ms('cloud_download') + 'Tarik SIM-LPM</button><button class="btn" id="jSg">' + ms('sync') + 'Segarkan jembatan</button>' : '' });
  const host = document.createElement('div'); view.appendChild(host); host.innerHTML = kerangkaMuat(3);
  const WARNA_LV = { hijau: ['var(--ok-bg)', 'var(--ok-ink)', 'check_circle', 'Segar'], kuning: ['var(--warn-bg)', 'var(--warn-ink)', 'schedule', '24–72 jam'], merah: ['var(--bad-bg)', 'var(--bad-ink)', 'error', '> 72 jam'], abu: ['var(--surface-low)', 'var(--muted)', 'block', 'Nonaktif'] };
  const gambar = d => {
    if (!hidup()) return;
    host.innerHTML = '<div class="grid g3">' + d.arah.map(a => { const w = WARNA_LV[a.level] || WARNA_LV.abu; return '<div class="card" style="border-top:4px solid ' + w[1] + '"><div class="card-h"><div><h3>' + esc(a.nama) + '</h3><p>' + esc(a.jadwal) + '</p></div><span class="badge" style="background:' + w[0] + ';color:' + w[1] + '">' + ms(w[2]) + ' ' + w[3] + '</span></div><div style="font-size:13px">Terakhir: <b>' + (a.waktu ? fmt.tglw(a.waktu) + ' (' + fmt.rel(a.waktu) + ')' : 'belum pernah') + '</b></div><div class="sub" style="margin-top:4px">' + esc(a.status) + '</div></div>'; }).join('') + '</div>' +
      '<div class="grid g-main" style="margin-top:18px"><div class="card" id="jTabs"></div><div class="grid"><div class="card"><div class="card-h"><div><h3>BR_Meta</h3><p>Kontrak v' + esc(d.kontrak) + ' · mode ' + esc(d.mode) + '</p></div></div><dl class="kv" style="grid-template-columns:120px 1fr"><dt>Status</dt><dd>' + badge(d.meta.status || '-') + '</dd><dt>Waktu segar</dt><dd>' + fmt.tglw(d.meta.waktu_segar) + '</dd><dt>Checksum</dt><dd><span class="id">' + esc(d.meta.checksum || '-') + '…</span></dd><dt>Versi kontrak</dt><dd>' + esc(d.meta.kontrak_versi || '-') + '</dd></dl></div>' +
      (d.galat.length ? '<div class="card"><div class="card-h"><div><h3>Galat terakhir</h3></div></div><div class="list">' + d.galat.map(g => '<div class="note bad">' + ms('error') + '<div><b>' + esc(g.Objek) + '</b> · ' + fmt.rel(g.Waktu) + '<br>' + esc(g.Galat) + '</div></div>').join('') + '</div></div>' : '') +
      (sa ? '<div class="card"><div class="card-h"><div><h3>Konfigurasi</h3><p>Hanya Super Admin</p></div></div><div class="list"><div class="li">' + ms('table') + '<div class="grow"><b>Jembatan LPPM (BR_*)</b><small>Dibagikan Viewer ke akun SIM-LPM</small></div>' + (d.konfigurasi.jembatanUrl ? '<a class="btn ghost xs" target="_blank" rel="noopener" href="' + esc(d.konfigurasi.jembatanUrl) + '">' + ms('open_in_new') + '</a>' : '') + '</div><div class="li">' + ms('inbox') + '<div class="grid" style="flex:1;gap:0"><b>Inbox Catatan</b><small>Dibagikan Editor ke akun SIM-LPM</small></div>' + (d.konfigurasi.inboxUrl ? '<a class="btn ghost xs" target="_blank" rel="noopener" href="' + esc(d.konfigurasi.inboxUrl) + '">' + ms('open_in_new') + '</a>' : '') + '</div></div><button class="btn out sm" id="jAtur" style="margin-top:12px">' + ms('settings') + 'Atur sambungan SIM-LPM</button></div>' : '') + '</div></div>';
    tabs($('#jTabs'), [{ k: 'ps', l: 'Per sheet BR_*', i: 'table_chart' }, { k: 'log', l: 'Log integrasi', i: 'receipt' }, { k: 'inb', l: 'Inbox', i: 'inbox', n: d.inbox.filter(i => !i.Status_Proses).length }, { k: 'rek', l: 'Rekonsiliasi prodi', i: 'rule_folder', n: d.rekonsiliasi.length }], (k, b) => {
      if (k === 'ps') tabel(b, { rows: (Array.isArray(d.whitelist) ? d.whitelist : Object.keys(d.whitelist || {})).map(s => ({ sheet: s, baris: d.perSheet[s] === undefined ? '-' : d.perSheet[s] })), cari: false, unduh: false, per: 20, cols: [{ k: 'sheet', l: 'Sheet', r: r => '<span class="id">' + esc(r.sheet) + '</span>' }, { k: 'baris', l: 'Baris', num: 1 }] });
      if (k === 'log') tabel(b, { rows: d.log, nama: 'Log_Integrasi', cols: [{ k: 'Waktu', l: 'Waktu', r: r => fmt.tglw(r.Waktu) }, { k: 'Arah', l: 'Arah' }, { k: 'Objek', l: 'Objek' }, { k: 'Status', l: 'Status', r: r => badge(r.Status) }, { k: 'Jumlah_Baris', l: 'Baris', num: 1 }, { k: 'Galat', l: 'Galat' }] });
      if (k === 'inb') tabel(b, { rows: d.inbox, nama: 'Inbox', cols: Object.keys(d.inbox[0] || { ID_Eksternal: 1, Isi_Catatan: 1, Status_Proses: 1 }).filter(c => !/^_/.test(c)).slice(0, 8).map(c => ({ k: c, l: fmt.label(c) })), kosong: 'Inbox kosong.' });
      if (k === 'rek') tabel(b, { rows: d.rekonsiliasi, nama: 'Rekonsiliasi_Prodi', cols: [{ k: 'tabel', l: 'Tabel' }, { k: 'id', l: 'ID' }, { k: 'kode', l: 'Kode prodi', r: r => badge(r.kode, 'b-bad') }, { k: 'judul', l: 'Judul/Nama' }], kosong: 'Semua kode prodi cocok dengan master.' });
    });
    if ($('#jAtur')) $('#jAtur').onclick = async () => { const v = await isian('Sambungan SIM-LPM', [{ k: 'lpmJembatan', label: 'ID/URL Jembatan SIM-LPM (dibaca LPPM)', val: d.konfigurasi.lpmJembatan }, { k: 'akunLpm', label: 'Email akun SIM-LPM (dibagikan akses jembatan & inbox)', type: 'email', val: d.konfigurasi.akunLpm }, { k: 'lpmUrl', label: 'Alamat aplikasi SIM-LPM (tautan)', type: 'url', val: d.konfigurasi.lpmUrl }], { size: 'lg', note: 'Kosongkan ID jembatan SIM-LPM untuk mode mandiri (master prodi & kriteria dikelola manual).' }); if (v && hasil(await api('jembatan.atur', v))) segar(); };
  };
  const segar = () => swr('jembatan.status', {}, (d, c, e) => e ? (host.innerHTML = kosong('error', esc(e))) : gambar(d), { fresh: true });
  const tombol = (sel, aksi) => { const x = $(sel); if (x) x.onclick = async () => { x.classList.add('busy'); const r = await api(aksi, {}); x.classList.remove('busy'); if (hasil(r)) { Boot.segarkan(); segar(); } }; };
  tombol('#jSg', 'jembatan.segarkan'); tombol('#jTr', 'jembatan.tarik'); tombol('#jIn', 'jembatan.inbox');
  await swr('jembatan.status', {}, (d, c, e) => e ? (host.innerHTML = kosong('error', esc(e))) : gambar(d));
}, { roles: 'SA AD LPM', menu: 'jembatan' });
