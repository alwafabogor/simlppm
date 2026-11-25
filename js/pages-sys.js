/* ============================================================
   pages-sys.js — Pengguna & Pengaturan (umum, keamanan/rahasia, master,
   database Sheets⇄Firebase, status sistem, audit), Notifikasi WA/Email
   (konfigurasi, matriks event, antrean, blast per batch) & CRM kontak.
   ============================================================ */
'use strict';

// ===================== PENGGUNA & PENGATURAN =====================
Router.add('/pengaturan', async (view) => {
  const sa = Sesi.punya('SA');
  judul(view, { title: T('Pengguna & Pengaturan'), desc: 'Akun & peran, konfigurasi lembaga, rahasia (Script Properties), master data, database, dan audit.' });
  const host = document.createElement('div'); host.className = 'card'; view.appendChild(host);
  const tb = [{ k: 'usr', l: 'Pengguna', i: 'group' }, { k: 'umum', l: 'Umum', i: 'tune' }];
  if (sa) tb.push({ k: 'aman', l: 'Keamanan', i: 'shield_lock' });
  tb.push({ k: 'mst', l: 'Master data', i: 'database' });
  if (sa) tb.push({ k: 'db', l: 'Database', i: 'storage' }, { k: 'sys', l: 'Sistem', i: 'monitor_heart' });
  tb.push({ k: 'aud', l: 'Audit log', i: 'history' });
  tabs(host, tb, (k, b) => ({ usr: tabPengguna, umum: tabUmum, aman: tabKeamanan, mst: tabMaster, db: tabDatabase, sys: tabSistem, aud: tabAudit })[k](b));
}, { roles: 'SA AD', menu: 'pengaturan' });

async function tabPengguna(b) {
  const h2 = stempel(b), sa = Sesi.punya('SA'), L = Sesi.boot.roleLabels;
  b.innerHTML = '<div class="sk" style="height:240px"></div>';
  const muat = async () => {
    const r = await api('pengguna.list', {}); if (!h2()) return;
    if (!r.success) { b.innerHTML = kosong('error', esc(r.message)); return; }
    b.innerHTML = '';
    tabel(b, { rows: r.data, nama: 'Pengguna', per: 25, tombol: sa ? '<button class="btn sm" data-x="add">' + ms('person_add') + 'Tambah pengguna</button>' : '',
      filter: [{ k: 'Status_Aktif', l: 'Status', opts: ['Aktif', 'Nonaktif'] }, { k: 'Flag_DTPS', l: 'DTPS', opts: ['Ya', 'Tidak'] }],
      cols: [{ k: 'Nama', l: 'Nama', r: u => '<b>' + esc(u.Nama) + '</b><div class="sub">' + esc(u.Email_Google) + '</div>' }, { k: 'Role', l: 'Peran', r: u => (u._roles || []).map(x => '<span class="badge b-info" style="margin:1px">' + esc(L[x] || x) + '</span>').join('') }, { k: 'Prodi_Homebase', l: 'Prodi', exp: u => u.Prodi_Homebase }, { k: 'NIDN_NIM', l: 'NIDN' }, { k: 'No_WA', l: 'WhatsApp', r: u => esc(u.No_WA || '-') + (u.StatusWA ? ' ' + badge(u.StatusWA === 'Terdaftar' ? 'Terdaftar' : u.StatusWA, u.StatusWA === 'Terdaftar' ? 'b-ok' : 'b-gray') : '') }, { k: 'Status_Aktif', l: 'Status', r: u => badge(u.Status_Aktif) }],
      aksi: u => sa ? '<button class="btn ghost xs" data-a="e">' + ms('edit') + '</button>' : '', onAksi: (a, u) => formPengguna(u, muat), onRow: sa ? u => formPengguna(u, muat) : null });
    const add = $('[data-x="add"]', b); if (add) add.onclick = () => formPengguna(null, muat);
  };
  muat();
}
async function formPengguna(u, segar) {
  u = u || { Status_Aktif: 'Aktif', Kanal_Notifikasi: 'WA+Email', Flag_DTPS: 'Tidak', _roles: ['DS'] };
  const O = Sesi.boot.opts, L = Sesi.boot.roleLabels, roles = u._roles || String(u.Role || '').split(/[,\s]+/);
  const m = modal({ title: u.ID_User ? 'Ubah pengguna' : 'Pengguna baru', size: 'lg', body: '<div class="form">' +
    [{ k: 'Nama', req: true, val: u.Nama }, { k: 'Email_Google', label: 'Email Google (untuk login)', type: 'email', req: true, val: u.Email_Google }, { k: 'NIDN_NIM', label: 'NIDN / NIM', val: u.NIDN_NIM }, { k: 'Prodi_Homebase', label: 'Prodi homebase', type: 'select', opts: prodiOpts(), val: u.Prodi_Homebase }, { k: 'Fakultas', val: u.Fakultas }, { k: 'Jabatan_Fungsional', label: 'Jabatan fungsional', type: 'select', opts: O.Jabatan_Fungsional, val: u.Jabatan_Fungsional }, { k: 'Flag_DTPS', label: 'DTPS', type: 'select', opts: O.YaTidak, val: u.Flag_DTPS, kosong: false }, { k: 'No_WA', label: 'Nomor WhatsApp', val: u.No_WA, ph: '0812…' }, { k: 'Kanal_Notifikasi', label: 'Kanal notifikasi', type: 'select', opts: O.Kanal, val: u.Kanal_Notifikasi, kosong: false }, { k: 'Status_Aktif', label: 'Status', type: 'select', opts: O.Status_Aktif, val: u.Status_Aktif, kosong: false }, { k: 'Bidang_Keahlian', label: 'Bidang keahlian', val: u.Bidang_Keahlian }, { k: 'Jenis_Reviewer', label: 'Jenis reviewer', type: 'select', opts: O.Jenis_Reviewer, val: u.Jenis_Reviewer }, { k: 'Link_SINTA', label: 'Tautan SINTA', type: 'url', val: u.Link_SINTA }, { k: 'Link_Google_Scholar', label: 'Tautan Google Scholar', type: 'url', val: u.Link_Google_Scholar }].map(fieldHtml).join('') +
    '<div class="field full"><label>Peran (boleh lebih dari satu) <span class="req">*</span></label><div style="display:flex;gap:14px;flex-wrap:wrap">' + Object.keys(L).map(r => '<label style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-role value="' + r + '"' + (roles.indexOf(r) >= 0 ? ' checked' : '') + '> ' + esc(L[r]) + '</label>').join('') + '</div><small>Pengguna dengan beberapa peran dapat berpindah peran dari bilah atas tanpa logout.</small></div></div>',
    buttons: [{ label: T('Batal'), cls: 'out', act: c => c() }, { label: T('Simpan'), icon: 'save', act: async c => {
      const d = { ID_User: u.ID_User || '' }; $$('[name]', m.body).forEach(el => { d[el.name] = el.value.trim(); });
      d.Role = $$('[data-role]', m.body).filter(x => x.checked).map(x => x.value);
      if (hasil(await api('pengguna.simpan', d))) { c(); Ref.reset(); segar(); }
    } }] });
}
async function tabUmum(b) {
  const h2 = stempel(b), sa = Sesi.punya('SA');
  b.innerHTML = '<div class="sk" style="height:240px"></div>';
  const r = await api('pengaturan.get', {}); if (!h2()) return;
  if (!r.success) { b.innerHTML = kosong('error', esc(r.message)); return; }
  const pilih = { MODE_PRA_EKSPOR: ['Peringatkan', 'Blokir'], SEMESTER_AKTIF: ['Ganjil', 'Genap'], TAHUN_AKTIF: tahunOpts() };
  b.innerHTML = '<div class="note info" style="margin-bottom:14px">' + ms('info') + '<div>Pengaturan non-rahasia (sheet Config). Token & kunci disimpan terpisah di tab <b>Keamanan</b> (Script Properties).</div></div><div class="form">' +
    r.data.settings.map(s => fieldHtml({ k: s.kunci, label: fmt.label(s.kunci), val: s.nilai, help: esc(s.ket), type: pilih[s.kunci] ? 'select' : /URL/.test(s.kunci) ? 'url' : 'text', opts: pilih[s.kunci], kosong: false })).join('') + '</div>' +
    (sa ? '<div style="margin-top:16px"><button class="btn" id="uSave">' + ms('save') + T('Simpan') + '</button></div>' : '');
  if (!sa) $$('[name]', b).forEach(el => { el.disabled = true; });
  if ($('#uSave', b)) $('#uSave', b).onclick = async () => { const s = {}; $$('[name]', b).forEach(el => { s[el.name] = el.value.trim(); }); if (hasil(await api('pengaturan.simpan', { settings: s }))) { Boot.segarkan(); } };
}
async function tabKeamanan(b) {
  const h2 = stempel(b);
  b.innerHTML = '<div class="sk" style="height:200px"></div>';
  const r = await api('pengaturan.get', {}); if (!h2()) return;
  if (!r.success) { b.innerHTML = kosong('error', esc(r.message)); return; }
  const R = r.data.rahasia;
  const kartu = (k, judulK, ket, ph) => '<div class="card flat"><div class="card-h"><div><h3>' + judulK + '</h3><p>' + ket + '</p></div>' + badge(R[k] && R[k].ada ? 'Tersimpan' : 'Belum diisi', R[k] && R[k].ada ? 'b-ok' : 'b-warn') + '</div>' + (R[k] && R[k].ada ? '<div class="sub" style="margin-bottom:8px">Nilai saat ini: <span class="id">' + esc(R[k].samar) + '</span></div>' : '') + '<div class="toolbar"><input class="inp" type="password" autocomplete="off" data-rh="' + k + '" placeholder="' + ph + '"><button class="btn sm" data-simpan="' + k + '">' + ms('lock') + 'Simpan</button>' + (R[k] && R[k].ada ? '<button class="btn ghost sm" data-hapus="' + k + '" style="color:var(--bad)">Hapus</button>' : '') + '</div></div>';
  b.innerHTML = '<div class="note warn" style="margin-bottom:14px">' + ms('shield') + '<div>Rahasia disimpan di <b>Script Properties</b> server — tidak pernah di spreadsheet, kode, atau browser. Setelah disimpan, nilai hanya tampil tersamarkan.</div></div><div class="grid g2">' +
    kartu('GOOGLE_CLIENT_ID', 'Google OAuth Client ID', 'Untuk tombol “Masuk dengan Google”. Origin GitHub Pages harus terdaftar di Google Cloud Console.', 'xxxx.apps.googleusercontent.com') +
    kartu('FONNTE_TOKEN', 'Token Fonnte (WhatsApp)', 'Dipakai modul notifikasi WA. Bisa juga diatur di menu Notifikasi.', 'token Fonnte') +
    '<div class="card flat span2"><div class="card-h"><div><h3>Sandi akses darurat</h3><p>Login cadangan Super Admin saat Google Sign-In bermasalah. Ganti sandi bawaan dari log setup.</p></div></div><div class="toolbar"><input class="inp" type="password" id="dS1" autocomplete="new-password" placeholder="Sandi baru (min. 12, huruf+angka)"><input class="inp" type="password" id="dS2" autocomplete="new-password" placeholder="Ulangi sandi"><button class="btn warn sm" id="dRot">' + ms('key') + 'Ganti sandi darurat</button></div></div></div>';
  $$('[data-simpan]', b).forEach(x => x.onclick = async () => { const k = x.dataset.simpan, v = $('[data-rh="' + k + '"]', b).value.trim(); if (!v) return toast('Isi nilainya dulu.', 'warn'); if (hasil(await api('rahasia.simpan', { kunci: k, nilai: v }))) tabKeamanan(b); });
  $$('[data-hapus]', b).forEach(x => x.onclick = async () => { if (await konfirmasi('Hapus ' + x.dataset.hapus + '? Fitur terkait berhenti bekerja.', { danger: true, ok: 'Hapus' })) { if (hasil(await api('rahasia.simpan', { kunci: x.dataset.hapus, nilai: '__HAPUS__' }))) tabKeamanan(b); } });
  $('#dRot', b).onclick = async () => { const a = $('#dS1', b).value, c = $('#dS2', b).value; if (a !== c) return toast('Sandi tidak sama.', 'warn'); if (hasil(await api('darurat.rotasi', { sandi: a }))) { $('#dS1', b).value = ''; $('#dS2', b).value = ''; } };
}
function tabMaster(b) {
  const sa = Sesi.punya('SA');
  b.innerHTML = '<div id="mT"></div>';
  tabs($('#mT', b), [{ k: 'per', l: 'Periode akademik', i: 'event' }, { k: 'prd', l: 'Master prodi', i: 'domain' }, { k: 'krt', l: 'Kriteria akreditasi', i: 'checklist' }], (k, x) => {
    if (k === 'per') crud(x, 'Periode_Akademik', { form: { wajib: 'Tahun_Akademik Semester Label_TS' } });
    if (k === 'prd') crud(x, 'Master_Prodi', { form: { wajib: 'Kode_Prodi Nama_Prodi', catatan: 'Kode prodi harus sama dengan kode di SIM-LPM. Bila jembatan SIM-LPM aktif, master ini disinkronkan otomatis (Asal = Sinkron-LPM).' } });
    if (k === 'krt') crud(x, 'Kriteria_Akreditasi', { form: { wajib: 'ID_Kriteria Lembaga_Akreditasi Nama_Kriteria' } });
  });
  if (!sa) b.insertAdjacentHTML('afterbegin', '<div class="note info" style="margin-bottom:10px">' + ms('info') + '<div>Hanya Super Admin yang dapat mengubah master data.</div></div>');
}
async function tabDatabase(b) {
  const h2 = stempel(b);
  b.innerHTML = '<div class="sk" style="height:220px"></div>';
  const r = await api('db.status', {}); if (!h2()) return;
  if (!r.success) { b.innerHTML = kosong('error', esc(r.message)); return; }
  const d = r.data, fb = d.firebase, mig = d.migrasiBerjalan, akhir = d.migrasiTerakhir;
  b.innerHTML = '<div class="grid g2"><div class="hero"><div class="lbl">Database aktif</div><div class="big">' + (d.mode === 'firebase' ? 'Firebase Firestore' : 'Google Sheets') + '</div><small>' + d.tabel + ' tabel · beralih kapan saja tanpa mengubah aplikasi</small>' +
    '<div class="box"><div><small>Firebase</small><b style="display:block">' + (fb.terkonfigurasi ? esc(fb.projectId || '-') : 'Belum diatur') + '</b></div><div><small>Akun layanan</small><b style="display:block">' + esc(d.akunLayanan || '-') + '</b></div></div></div>' +
    '<div class="card flat"><div class="card-h"><div><h3>Status migrasi</h3></div></div>' + (mig ? '<div class="note info">' + ms('sync') + '<div>Migrasi <b>' + esc(mig.dari + ' → ' + mig.ke) + '</b> sedang berjalan · tabel ' + esc((mig.idx || 0) + '/' + (mig.tabel || []).length) + '. Berlanjut otomatis di latar belakang.</div></div>' : '<div class="sub">Tidak ada migrasi berjalan.</div>') + (akhir ? '<div class="sub" style="margin-top:8px">Terakhir: ' + esc((akhir.dari || '') + ' → ' + (akhir.ke || '')) + ' · ' + fmt.tglw(akhir.selesai || akhir.waktu) + '</div>' : '') + '</div></div>' +
    '<div class="grid g2" style="margin-top:16px"><div class="card flat"><div class="card-h"><div><h3>1 · Kredensial Firebase</h3><p>Tempel isi file JSON akun layanan (Firebase Console → Project settings → Service accounts → Generate new private key).</p></div></div><textarea class="inp" id="fbJson" rows="5" placeholder=\'{"type":"service_account","project_id":"…",…}\' autocomplete="off"></textarea><div class="acts" style="margin-top:10px"><button class="btn sm" id="fbSave">' + ms('key') + 'Simpan kredensial</button><button class="btn out sm" id="fbTes"' + (fb.terkonfigurasi ? '' : ' disabled') + '>' + ms('network_check') + 'Tes koneksi</button></div><small class="sub">Disimpan di Script Properties (FIREBASE_SA_JSON). Hanya server yang memakainya.</small></div>' +
    '<div class="card flat"><div class="card-h"><div><h3>2 · Pindahkan data & beralih</h3><p>Pindai (tanpa menulis) → migrasi → aktifkan mode. Bisa kembali ke Sheets kapan saja.</p></div></div><div class="seg" id="arah"><button data-a="ke-firebase" class="on">Sheets → Firebase</button><button data-a="ke-sheets">Firebase → Sheets</button></div><div class="acts" style="margin-top:12px"><button class="btn out sm" id="dbScan"' + (fb.terkonfigurasi ? '' : ' disabled') + '>' + ms('search') + 'Pindai</button><button class="btn sm" id="dbMig"' + (fb.terkonfigurasi ? '' : ' disabled') + '>' + ms('move_down') + 'Migrasi</button></div><div class="acts" style="margin-top:12px"><button class="btn ' + (d.mode === 'firebase' ? 'out' : 'ok') + ' sm" data-mode="firebase"' + (fb.terkonfigurasi && d.mode !== 'firebase' ? '' : ' disabled') + '>Gunakan Firebase</button><button class="btn ' + (d.mode === 'sheets' ? 'out' : 'ok') + ' sm" data-mode="sheets"' + (d.mode !== 'sheets' ? '' : ' disabled') + '>Gunakan Sheets</button></div></div></div><div id="dbHasil" style="margin-top:16px"></div>';
  let arah = 'ke-firebase';
  $$('#arah button', b).forEach(x => x.onclick = () => { arah = x.dataset.a; $$('#arah button', b).forEach(y => y.classList.toggle('on', y === x)); });
  $('#fbSave', b).onclick = async () => { const j = $('#fbJson', b).value.trim(); if (!j) return toast('Tempel isi JSON.', 'warn'); if (hasil(await api('db.aksi', { aksi: 'kredensial', json: j }))) { $('#fbJson', b).value = ''; tabDatabase(b); } };
  $('#fbTes', b).onclick = async () => hasil(await api('db.aksi', { aksi: 'tes' }));
  $('#dbScan', b).onclick = async () => { const r2 = await api('db.aksi', { aksi: 'pindai', arah }); if (!hasil(r2)) return; const T2 = r2.data.tabel; $('#dbHasil', b).innerHTML = '<div class="card flat"><div class="card-h"><div><h3>Hasil pindai ' + esc(r2.data.arah.join(' → ')) + '</h3></div></div><div id="dbT"></div></div>'; tabel($('#dbT', b), { rows: Object.keys(T2).map(t => ({ tabel: t, asal: T2[t].asal, tujuan: T2[t].tujuan })), cari: true, nama: 'Pindai_DB', per: 60, cols: [{ k: 'tabel', l: 'Tabel' }, { k: 'asal', l: 'Baris di asal', num: 1 }, { k: 'tujuan', l: 'Baris di tujuan', num: 1 }] }); };
  $('#dbMig', b).onclick = async () => { if (!(await konfirmasi('Salin seluruh data <b>' + (arah === 'ke-firebase' ? 'Sheets → Firebase' : 'Firebase → Sheets') + '</b>? Data tujuan untuk tabel yang sama akan diganti. Sumber tidak diubah.', { ok: 'Mulai migrasi' }))) return; if (hasil(await api('db.aksi', { aksi: 'migrasi', arah }))) tabDatabase(b); };
  $$('[data-mode]', b).forEach(x => x.onclick = async () => { if (!(await konfirmasi('Alihkan database aktif ke <b>' + x.dataset.mode + '</b>? Pastikan data sudah dimigrasi. Semua pengguna langsung memakai database baru.', { ok: 'Alihkan' }))) return; if (hasil(await api('db.aksi', { aksi: 'mode', mode: x.dataset.mode }))) { Store.clearCache(); location.reload(); } });
}
async function tabSistem(b) {
  const h2 = stempel(b);
  b.innerHTML = '<div class="sk" style="height:200px"></div>';
  const r = await api('sistem.status', {}); if (!h2()) return;
  if (!r.success) { b.innerHTML = kosong('error', esc(r.message)); return; }
  const d = r.data, perlu = ['detakMenit', 'detak15Menit', 'harianPagi', 'harianMalam', 'jembatanHarian', 'tarikHarian', 'backupMingguan'];
  b.innerHTML = '<div class="grid g4">' + kpi({ label: 'Versi', value: d.versi, icon: 'new_releases' }) + kpi({ label: 'Database', value: d.db, icon: 'storage', tone: 't-teal' }) + kpi({ label: 'Kuota email hari ini', value: d.kuotaEmail, icon: 'mail', tone: 't-amber' }) + kpi({ label: 'Script Properties', value: Math.round(d.ukuranProps / 1024 * 10) / 10, unit: 'KB / 500', icon: 'key', tone: 't-green' }) + '</div>' +
    '<div class="grid g2" style="margin-top:16px"><div class="card flat"><div class="card-h"><div><h3>Pemicu terjadwal</h3><p>Dipasang oleh setupAppEnvironment</p></div></div><div class="list">' + perlu.map(p => '<div class="li">' + ms(d.pemicu.indexOf(p) >= 0 ? 'check_circle' : 'cancel', d.pemicu.indexOf(p) >= 0 ? 't-green' : 't-red') + '<div class="grow"><b>' + p + '</b></div></div>').join('') + '</div></div>' +
    '<div class="card flat"><div class="card-h"><div><h3>Performa</h3><p>Warm-up server menjaga respons cepat</p></div></div><dl class="kv"><dt>Keep-warm</dt><dd>' + badge(d.keepWarm === 'on' ? 'Aktif' : 'Nonaktif') + '</dd><dt>Warm-up terakhir</dt><dd>' + (d.warm ? fmt.rel(d.warm.t || d.warm.waktu) + (d.warm.ms ? ' · ' + d.warm.ms + ' ms' : '') : '-') + '</dd><dt>Spreadsheet</dt><dd>' + (d.spreadsheet ? '<a target="_blank" rel="noopener" href="' + esc(d.spreadsheet) + '">Buka database</a>' : '-') + '</dd><dt>Folder Drive</dt><dd>' + (d.folder ? '<a target="_blank" rel="noopener" href="' + esc(d.folder) + '">Buka folder</a>' : '-') + '</dd></dl><div class="note info" style="margin-top:12px">' + ms('speed') + '<div>Tekan <b>F12 → Console</b> lalu ketik <code>Perf.summary()</code> untuk melihat waktu respons per aksi.</div></div></div></div>';
}
async function tabAudit(b) {
  const h2 = stempel(b);
  b.innerHTML = '<div class="toolbar"><input class="inp" id="aQ" placeholder="Cari aksi / tabel / ID…" style="max-width:280px"><button class="btn out sm" id="aGo">' + ms('search') + 'Cari di server</button></div><div id="aT"><div class="sk" style="height:220px"></div></div>';
  const muat = async () => {
    const r = await api('audit.list', { q: $('#aQ', b).value.trim() }); if (!h2()) return;
    if (!r.success) { $('#aT', b).innerHTML = kosong('error', esc(r.message)); return; }
    $('#aT', b).innerHTML = '';
    tabel($('#aT', b), { rows: r.data, nama: 'Audit_Log', per: 25, cols: [{ k: 'Waktu', l: 'Waktu', r: x => fmt.tglw(x.Waktu) }, { k: 'Nama', l: 'Pengguna' }, { k: 'Aksi', l: 'Aksi', r: x => '<span class="badge b-info">' + esc(x.Aksi) + '</span>' }, { k: 'Tabel', l: 'Tabel' }, { k: 'ID_Rekaman', l: 'ID' }, { k: 'Nilai_Baru', l: 'Perubahan', r: x => '<div class="sub" style="max-width:360px;white-space:normal">' + esc(String(x.Nilai_Lama || '').slice(0, 120)) + (x.Nilai_Lama ? ' → ' : '') + esc(String(x.Nilai_Baru || '').slice(0, 160)) + '</div>' }] });
  };
  $('#aGo', b).onclick = muat; $('#aQ', b).onkeydown = e => { if (e.key === 'Enter') muat(); };
  muat();
}

// ===================== NOTIFIKASI & CRM =====================
Router.add('/notifikasi', async (view) => {
  const sa = Sesi.punya('SA');
  judul(view, { title: T('Notifikasi & CRM'), desc: 'WhatsApp (Fonnte) & email otomatis per kegiatan, blast per batch, dan basis kontak civitas.' });
  const host = document.createElement('div'); host.className = 'card'; view.appendChild(host);
  const tb = sa ? [{ k: 'cfg', l: 'Konfigurasi', i: 'settings' }] : [];
  tb.push({ k: 'q', l: 'Antrean & log', i: 'outbox' }, { k: 'blast', l: 'Blast WA', i: 'campaign' }, { k: 'crm', l: 'Kontak (CRM)', i: 'contacts' });
  tabs(host, tb, (k, b) => ({ cfg: notifKonfig, q: notifAntrean, blast: notifBlast, crm: notifCrm })[k](b));
}, { roles: 'SA AD', menu: 'notifikasi' });

const sakelar = (id, on, lbl) => '<label style="display:flex;gap:10px;align-items:center"><span class="switch"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + '><span></span></span>' + lbl + '</label>';
async function notifKonfig(b) {
  const h2 = stempel(b);
  b.innerHTML = '<div class="sk" style="height:260px"></div>';
  const r = await api('notif.config', {}); if (!h2()) return;
  if (!r.success) { b.innerHTML = kosong('error', esc(r.message)); return; }
  const d = r.data, mx = d.matriks;
  b.innerHTML = (d.trigger ? '' : '<div class="note warn" style="margin-bottom:12px">' + ms('schedule') + '<div>Pemicu antrean (detakMenit) belum terpasang — jalankan <code>setupAppEnvironment</code> atau <code>installTriggers</code> dari editor Apps Script.</div></div>') +
    '<div class="grid g2"><div class="card flat"><div class="card-h"><div><h3>WhatsApp (Fonnte)</h3><p>Token: ' + (d.tokenAda ? '<span class="id">' + esc(d.token) + '</span>' : 'belum diisi') + '</p></div>' + sakelar('cWa', d.waAktif, '') + '</div><div class="form"><div class="field full"><label>Token Fonnte</label><input class="inp" type="password" id="cTok" autocomplete="off" placeholder="' + (d.tokenAda ? 'kosongkan bila tidak diganti' : 'tempel token dari fonnte.com') + '"></div>' + fieldHtml({ k: 'batch', label: 'Ukuran batch blast', type: 'select', opts: ['10', '20', '50'], val: String(d.batchDefault), kosong: false }) + fieldHtml({ k: 'jeda', label: 'Jeda antarpesan (detik)', val: d.jeda, help: 'Angka (5) atau rentang acak (3-8)' }) + '</div><div style="margin-top:10px">' + sakelar('cDet', d.deteksiOtomatis, 'Deteksi otomatis nomor terdaftar WA') + '</div><div class="toolbar" style="margin-top:12px"><input class="inp" id="tWa" placeholder="08… untuk tes" style="max-width:180px"><button class="btn out sm" id="bTWa">' + ms('send') + 'Kirim tes</button><button class="btn ghost sm" id="bDev">' + ms('smartphone') + 'Status perangkat</button></div></div>' +
    '<div class="card flat"><div class="card-h"><div><h3>Email</h3><p>Sisa kuota hari ini: <b>' + esc(d.kuotaEmail) + '</b></p></div>' + sakelar('cEm', d.emailAktif, '') + '</div><div class="form">' + fieldHtml({ k: 'nama', label: 'Nama pengirim', val: d.namaPengirim, full: true }) + fieldHtml({ k: 'url', label: 'Alamat aplikasi (untuk tautan di pesan)', type: 'url', val: d.appUrl, full: true, help: 'Terisi otomatis saat admin login dari GitHub Pages.' }) + '</div><div class="toolbar" style="margin-top:12px"><input class="inp" type="email" id="tEm" placeholder="email tes" style="max-width:220px" value="' + esc(Sesi.me.email || '') + '"><button class="btn out sm" id="bTEm">' + ms('send') + 'Kirim tes</button></div></div></div>' +
    '<div class="card flat" style="margin-top:16px"><div class="card-h"><div><h3>Matriks kegiatan × kanal</h3><p>Placeholder: {nama} {institusi} {link} dan variabel kegiatan ({judul}, {id}, {tenggat}, …)</p></div></div><div class="tblw"><table class="tbl"><thead><tr><th>Kegiatan</th><th style="width:70px">WA</th><th style="width:70px">Email</th><th style="width:90px"></th></tr></thead><tbody>' + Object.keys(mx).map(k => '<tr><td><b>' + esc(mx[k].label) + '</b><div class="sub">' + esc(k) + '</div></td><td><input type="checkbox" data-wa="' + k + '"' + (mx[k].wa ? ' checked' : '') + '></td><td><input type="checkbox" data-em="' + k + '"' + (mx[k].email ? ' checked' : '') + '></td><td><button class="btn ghost xs" data-ed="' + k + '">' + ms('edit') + 'Pesan</button></td></tr>').join('') + '</tbody></table></div></div>' +
    '<div style="margin-top:16px"><button class="btn" id="cSave">' + ms('save') + 'Simpan konfigurasi</button></div>';
  $$('[data-ed]', b).forEach(x => x.onclick = async () => { const k = x.dataset.ed, e = mx[k]; const v = await isian('Pesan · ' + e.label, [{ k: 'subjek', label: 'Subjek email', val: e.subjek }, { k: 'pesan', label: 'Isi pesan (WA & email)', type: 'textarea', rows: 7, val: e.pesan }], { size: 'lg', note: 'Kosongkan untuk kembali ke teks bawaan.' }); if (v) { e.subjek = v.subjek || e.subjekDefault; e.pesan = v.pesan || e.pesanDefault; toast('Ubahan tersimpan setelah klik Simpan konfigurasi.', 'ok'); } });
  $('#cSave', b).onclick = async () => {
    Object.keys(mx).forEach(k => { mx[k].wa = $('[data-wa="' + k + '"]', b).checked; mx[k].email = $('[data-em="' + k + '"]', b).checked; });
    const data = { token: $('#cTok', b).value.trim(), waAktif: $('#cWa', b).checked, emailAktif: $('#cEm', b).checked, deteksiOtomatis: $('#cDet', b).checked, batchDefault: Number($('[name="batch"]', b).value), jeda: $('[name="jeda"]', b).value.trim(), namaPengirim: $('[name="nama"]', b).value.trim(), appUrl: $('[name="url"]', b).value.trim(), matriks: {} };
    Object.keys(mx).forEach(k => { data.matriks[k] = { wa: mx[k].wa, email: mx[k].email, subjek: mx[k].subjek, pesan: mx[k].pesan }; });
    if (hasil(await api('notif.configSave', data))) notifKonfig(b);
  };
  $('#bTWa', b).onclick = async () => hasil(await api('wa.test', { nomor: $('#tWa', b).value.trim() }));
  $('#bTEm', b).onclick = async () => hasil(await api('email.test', { email: $('#tEm', b).value.trim() }));
  $('#bDev', b).onclick = async () => { const r2 = await api('wa.device', {}); if (!r2.success) return toast(r2.message, 'bad'); const dv = r2.data, ds = dv.device || dv; modal({ title: 'Perangkat Fonnte', size: 'sm', body: '<dl class="kv">' + Object.keys(ds).filter(k => typeof ds[k] !== 'object').slice(0, 12).map(k => '<dt>' + esc(k) + '</dt><dd>' + esc(ds[k]) + '</dd>').join('') + '</dl>' }); };
}
async function notifAntrean(b) {
  const h2 = stempel(b), sa = Sesi.punya('SA');
  b.innerHTML = '<div class="toolbar"><select class="inp" id="qSt" style="max-width:160px"><option value="">Semua status</option><option>Antri</option><option>Terkirim</option><option>Gagal</option><option>Batal</option></select><select class="inp" id="qKn" style="max-width:140px"><option value="">Semua kanal</option><option>WA</option><option>Email</option></select><span class="spacer"></span><button class="btn sm" id="qRun">' + ms('play_arrow') + 'Proses sekarang</button></div><div id="qR"></div><div id="qT"><div class="sk" style="height:220px"></div></div>';
  const muat = async () => {
    const r = await api('notif.queue', { status: $('#qSt', b).value, kanal: $('#qKn', b).value }); if (!h2()) return;
    if (!r.success) { $('#qT', b).innerHTML = kosong('error', esc(r.message)); return; }
    const s = r.data.ringkas;
    $('#qR', b).innerHTML = '<div class="grid g4" style="margin-bottom:14px">' + [['Antri', s.antri, 't-amber', 'schedule'], ['Terkirim', s.terkirim, 't-green', 'done_all'], ['Gagal', s.gagal, 't-red', 'error'], ['Batal', s.batal, 't-blue', 'block']].map(x => kpi({ label: x[0], value: x[1], tone: x[2], icon: x[3] })).join('') + '</div>';
    $('#qT', b).innerHTML = '';
    tabel($('#qT', b), { rows: r.data.rows, nama: 'Notifikasi_Log', pilih: sa, bulk: '<button class="btn sm" data-b="retry">' + ms('replay') + 'Kirim ulang</button>', onBulk: async (x, sel) => { if (hasil(await api('notif.retry', { ids: sel.map(y => y.ID) }))) muat(); },
      cols: [{ k: 'Waktu', l: 'Waktu', r: x => fmt.tglw(x.Waktu) }, { k: 'Kanal', l: 'Kanal', r: x => badge(x.Kanal, x.Kanal === 'WA' ? 'b-ok' : 'b-info') }, { k: 'NamaPenerima', l: 'Penerima', r: x => '<b>' + esc(x.NamaPenerima || '-') + '</b><div class="sub">' + esc(x.Penerima) + '</div>' }, { k: 'Jenis_Pengingat', l: 'Kegiatan' }, { k: 'Isi', l: 'Isi', r: x => '<div class="sub" style="max-width:320px;white-space:normal">' + esc(String(x.Subjek ? x.Subjek + ' — ' : '') + String(x.Isi || '').slice(0, 140)) + '</div>' }, { k: 'Status_Kirim', l: 'Status', r: x => badge(x.Status_Kirim) + (x.Respons_API && x.Status_Kirim === 'Gagal' ? '<div class="sub" style="color:var(--bad)">' + esc(String(x.Respons_API).slice(0, 80)) + '</div>' : '') }] });
  };
  $('#qSt', b).onchange = muat; $('#qKn', b).onchange = muat;
  $('#qRun', b).onclick = async () => { const r = await api('notif.processNow', {}); if (hasil(r)) muat(); };
  muat();
}
async function notifBlast(b) {
  const h2 = stempel(b), st = { rows: [], ring: null };
  b.innerHTML = '<div class="grid g-main"><div class="grid"><div class="card flat"><div class="card-h"><div><h3>1 · Sasaran</h3><p>Dari CRM (segmen/tag) atau daftar manual</p></div></div><div class="seg" id="bSrc"><button data-s="crm" class="on">Kontak CRM</button><button data-s="manual">Manual</button></div><div class="form" style="margin-top:12px" id="bFil"></div><div class="acts" style="margin-top:10px"><button class="btn out sm" id="bAud">' + ms('group') + 'Muat penerima</button></div><div id="bRing" style="margin-top:12px"></div></div>' +
    '<div class="card flat"><div class="card-h"><div><h3>2 · Pesan</h3><p>{nama} diganti nama penerima</p></div></div><div class="form">' + fieldHtml({ k: 'judul', label: 'Judul blast', full: true, ph: 'mis. Pengumuman Klinik Proposal' }) + fieldHtml({ k: 'pesan', label: 'Isi pesan', type: 'textarea', rows: 6, full: true, val: 'Assalamu\'alaikum {nama},\n\n' }) + fieldHtml({ k: 'ukuran', label: 'Ukuran batch', type: 'select', opts: ['10', '20', '50'], val: '20', kosong: false }) + fieldHtml({ k: 'jeda', label: 'Jeda (detik)', val: '5', help: 'Angka atau rentang 3-8' }) + '</div><div class="acts" style="margin-top:12px"><button class="btn" id="bBuat">' + ms('campaign') + 'Buat blast</button></div></div></div>' +
    '<div class="grid"><div class="card flat"><div class="card-h"><div><h3>Pratinjau</h3></div></div><div class="wa-bubble" id="bPrev"></div></div><div class="card flat"><div class="card-h"><div><h3>Riwayat blast</h3></div></div><div id="bList"></div></div></div></div>';
  let sumber = 'crm';
  const fil = () => { $('#bFil', b).innerHTML = sumber === 'crm' ? fieldHtml({ k: 'segmen', label: 'Segmen', type: 'select', opts: ['Dosen', 'Reviewer', 'Mahasiswa', 'Mitra', 'Pimpinan', 'Lainnya'] }) + fieldHtml({ k: 'tag', label: 'Tag' }) : fieldHtml({ k: 'manual', label: 'Satu baris per nomor: 0812…|Nama', type: 'textarea', rows: 5, full: true }); };
  $$('#bSrc button', b).forEach(x => x.onclick = () => { sumber = x.dataset.s; $$('#bSrc button', b).forEach(y => y.classList.toggle('on', y === x)); fil(); });
  fil();
  const prev = () => { const p = $('[name="pesan"]', b).value, n = (st.rows.find(r => r.valid && !r.ganda && !r.optOut) || {}).nama || 'Bapak/Ibu'; $('#bPrev', b).textContent = p.replace(/\{nama\}/g, n); };
  $('[name="pesan"]', b).oninput = prev; prev();
  $('#bAud', b).onclick = async () => {
    const d = { sumber }; $$('#bFil [name]', b).forEach(el => { d[el.name] = el.value; });
    const r = await api('wa.audience', d); if (!r.success) return toast(r.message, 'bad');
    st.rows = r.data.rows; st.ring = r.data.ringkas; const g = st.ring;
    $('#bRing', b).innerHTML = '<div class="sev"><div style="background:var(--ok-bg);color:var(--ok-ink)"><b>' + g.valid + '</b><small>Valid</small></div><div style="background:var(--bad-bg);color:var(--bad-ink)"><b>' + g.tidakValid + '</b><small>Tidak valid</small></div><div style="background:var(--warn-bg);color:var(--warn-ink)"><b>' + (g.ganda + g.optOut) + '</b><small>Ganda/opt-out</small></div></div><div class="sub" style="margin-top:8px">' + g.terdaftarWA + ' terverifikasi WA · ' + g.tidakTerdaftarWA + ' tidak terdaftar</div>';
    prev();
  };
  $('#bBuat', b).onclick = async () => {
    const pen = st.rows.filter(r => r.valid && !r.ganda && !r.optOut && r.statusWA !== 'Tidak Terdaftar');
    if (!pen.length) return toast('Muat penerima dulu.', 'warn');
    const uk = Number($('[name="ukuran"]', b).value);
    if (!(await konfirmasi('Kirim ke <b>' + pen.length + '</b> penerima dalam ' + Math.ceil(pen.length / uk) + ' batch × ' + uk + '? Pesan diproses bertahap oleh antrean.', { ok: 'Buat blast' }))) return;
    const r = await api('wa.blastCreate', { judul: $('[name="judul"]', b).value, pesan: $('[name="pesan"]', b).value, sasaran: sumber, ukuranBatch: uk, jeda: $('[name="jeda"]', b).value, penerima: pen.map(x => ({ hp: x.hp, nama: x.nama, id: x.id })) });
    if (hasil(r)) daftar();
  };
  const daftar = async () => {
    const r = await api('wa.blastList', {}); if (!h2()) return;
    const host = $('#bList', b); host.innerHTML = '';
    if (!r.success) { host.innerHTML = kosong('error', esc(r.message)); return; }
    host.innerHTML = '<div class="list">' + (r.data.map(x => '<div class="li" style="display:block"><div style="display:flex;justify-content:space-between;gap:8px"><b>' + esc(x.Judul) + '</b>' + badge(x.Status) + '</div><small>' + fmt.tglw(x.Tanggal) + ' · ' + x.Terkirim + ' terkirim · ' + x.Gagal + ' gagal · sisa ' + x.sisa + '</small><div class="bar ' + (x.Gagal ? 'amber' : 'green') + '" style="margin-top:6px"><i style="width:' + x.persen + '%"></i></div>' + (x.sisa > 0 && x.Status !== 'Dihentikan' ? '<div class="acts" style="margin-top:8px"><button class="btn sm" data-pr="' + esc(x.BlastID) + '">' + ms('play_arrow') + 'Proses batch</button><button class="btn ghost sm" data-st="' + esc(x.BlastID) + '" style="color:var(--bad)">Hentikan</button></div>' : '') + '</div>').join('') || '<div class="empty" style="padding:14px">Belum ada blast.</div>') + '</div>';
    $$('[data-pr]', host).forEach(x => x.onclick = async () => { x.classList.add('busy'); const r2 = await api('wa.blastProcess', { blastId: x.dataset.pr }); x.classList.remove('busy'); if (r2.success) { toast('Batch diproses.', 'ok'); daftar(); } else toast(r2.message, 'bad'); });
    $$('[data-st]', host).forEach(x => x.onclick = async () => { if (await konfirmasi('Hentikan blast? Pesan yang belum terkirim dibatalkan.', { danger: true })) { if (hasil(await api('wa.blastStop', { blastId: x.dataset.st }))) daftar(); } });
  };
  daftar();
}
async function notifCrm(b) {
  const h2 = stempel(b), sa = Sesi.punya('SA'), st = { cari: '', segmen: '', statusWA: '', tag: '', duplikat: false, halaman: 1 };
  b.innerHTML = '<div id="crS"></div><div class="toolbar" style="margin-top:14px"><input class="inp" id="crQ" placeholder="Cari nama / email / WA" style="max-width:240px"><select class="inp" id="crSeg" style="max-width:150px"><option value="">Semua segmen</option>' + ['Dosen', 'Reviewer', 'Mahasiswa', 'Mitra', 'Pimpinan', 'Lainnya'].map(x => '<option>' + x + '</option>').join('') + '</select><select class="inp" id="crWa" style="max-width:170px"><option value="">Status WA</option><option>Terdaftar</option><option>Tidak Terdaftar</option><option value="Belum">Belum dicek</option></select><label style="display:flex;gap:6px;align-items:center;font-size:13px"><input type="checkbox" id="crDup"> Duplikat</label><span class="spacer"></span><button class="btn out sm" id="crSync">' + ms('sync') + 'Sinkron dari pengguna & mitra</button><button class="btn out sm" id="crImp">' + ms('upload') + 'Impor</button>' + (sa ? '<button class="btn out sm" id="crExp">' + ms('download') + 'Ekspor</button>' : '') + '</div><div id="crT"><div class="sk" style="height:240px"></div></div>';
  const stat = async () => { const r = await api('crm.stats', {}); if (!h2() || !r.success) return; const s = r.data; $('#crS', b).innerHTML = '<div class="grid g4">' + kpi({ label: 'Total kontak', value: fmt.n(s.total), icon: 'contacts', sub: s.duplikat + ' indikasi duplikat' }) + kpi({ label: 'WA terverifikasi', value: fmt.n(s.waTerverifikasi), icon: 'verified', tone: 't-green', sub: s.belumCek + ' belum dicek dari ' + s.punyaWA + ' nomor' }) + kpi({ label: 'Email valid', value: fmt.n(s.emailValid), icon: 'mail', tone: 't-teal' }) + kpi({ label: 'Opt-out / tak terjangkau', value: s.optOut + ' / ' + s.tidakTerjangkau, icon: 'do_not_disturb_on', tone: 't-red' }) + '</div>'; };
  const muat = async () => {
    const r = await api('crm.list', st); if (!h2()) return;
    if (!r.success) { $('#crT', b).innerHTML = kosong('error', esc(r.message)); return; }
    const d = r.data, host = $('#crT', b); host.innerHTML = '';
    tabel(host, { rows: d.rows, cari: false, nama: 'Kontak', per: 50, pilih: true, bulk: '<button class="btn sm" data-b="deteksiWA">' + ms('how_to_reg') + 'Cek WA</button><button class="btn out sm" data-b="tag">Beri tag</button><button class="btn out sm" data-b="untag">Hapus tag</button><button class="btn ghost sm" data-b="optout">Opt-out</button><button class="btn ghost sm" data-b="optin">Opt-in</button>',
      onBulk: async (aksi, sel) => { const dd = { ids: sel.map(x => x.KontakID), aksi }; if (aksi === 'tag' || aksi === 'untag') { const v = await isian(aksi === 'tag' ? 'Beri tag' : 'Hapus tag', [{ k: 'nilai', label: 'Tag', req: true }]); if (!v) return; dd.nilai = v.nilai; } if (hasil(await api('crm.bulk', dd))) { muat(); stat(); } },
      cols: [{ k: 'Nama', l: 'Nama', r: k => '<b>' + esc(k.Nama) + '</b>' + (k.duplikat ? ' <span class="badge b-warn">duplikat?</span>' : '') + '<div class="sub">' + esc(k.Email || '-') + '</div>' }, { k: 'NoWA', l: 'WhatsApp', r: k => esc(k.NoWA || '-') + (k.StatusWA ? ' ' + badge(k.StatusWA, k.StatusWA === 'Terdaftar' ? 'b-ok' : 'b-bad') : '') }, { k: 'Segmen', l: 'Segmen' }, { k: 'Tag', l: 'Tag' }, { k: 'OptOut', l: 'Opt-out', r: k => k.OptOut === 'YA' ? badge('Opt-out', 'b-bad') : '-' }, { k: 'TerakhirDihubungi', l: 'Terakhir', r: k => fmt.rel(k.TerakhirDihubungi) }],
      onRow: k => detailKontak(k.KontakID, () => { muat(); stat(); }) });
    host.insertAdjacentHTML('afterbegin', '<div class="sub" style="margin-bottom:8px">' + fmt.n(d.total) + ' kontak · halaman ' + d.halaman + ' dari ' + Math.max(1, Math.ceil(d.total / 50)) + (d.sinkron ? ' · sinkron ' + fmt.rel(d.sinkron) : '') + (d.total > 50 ? ' <button class="btn ghost xs" id="crPrev"' + (d.halaman <= 1 ? ' disabled' : '') + '>‹</button><button class="btn ghost xs" id="crNext"' + (d.halaman * 50 >= d.total ? ' disabled' : '') + '>›</button>' : '') + '</div>');
    if ($('#crPrev', host)) { $('#crPrev', host).onclick = () => { st.halaman--; muat(); }; $('#crNext', host).onclick = () => { st.halaman++; muat(); }; }
  };
  let tq; $('#crQ', b).oninput = e => { clearTimeout(tq); tq = setTimeout(() => { st.cari = e.target.value.trim(); st.halaman = 1; muat(); }, 350); };
  $('#crSeg', b).onchange = e => { st.segmen = e.target.value; st.halaman = 1; muat(); };
  $('#crWa', b).onchange = e => { st.statusWA = e.target.value; st.halaman = 1; muat(); };
  $('#crDup', b).onchange = e => { st.duplikat = e.target.checked; st.halaman = 1; muat(); };
  $('#crSync', b).onclick = async () => { if (hasil(await api('crm.sync', {}))) { muat(); stat(); } };
  $('#crImp', b).onclick = async () => {
    const f = await pilihBerkas('.xlsx,.csv'); if (!f) return;
    await muatSkrip(XLSX_URL);
    const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' }), rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: false }).map(r => { const o = {}; Object.keys(r).forEach(k => { o[k.toLowerCase().replace(/[^a-z]/g, '')] = r[k]; }); return { nama: o.nama, email: o.email, wa: o.wa || o.whatsapp || o.nowa || o.hp, segmen: o.segmen, tag: o.tag }; });
    if (!(await konfirmasi('Impor ' + rows.length + ' baris kontak? Kolom yang dibaca: Nama, Email, WA/WhatsApp, Segmen, Tag.'))) return;
    if (hasil(await api('crm.import', { rows }))) { muat(); stat(); }
  };
  if ($('#crExp', b)) $('#crExp', b).onclick = async () => { const r = await api('crm.export', {}); if (!r.success) return toast(r.message, 'bad'); const h = Object.keys(r.data[0] || { Nama: 1 }); unduhExcel('Kontak_CRM_' + new Date().toISOString().slice(0, 10), [{ nama: 'Kontak', header: h, rows: r.data.map(x => h.map(k => x[k])) }]); };
  stat(); muat();
}
async function detailKontak(id, segar) {
  const r = await api('crm.detail', { kontakId: id }); if (!r.success) return toast(r.message, 'bad');
  const k = r.data.kontak;
  const d = drawer(k.Nama || k.NoWA, '<dl class="kv" style="grid-template-columns:110px 1fr"><dt>Email</dt><dd>' + esc(k.Email || '-') + '</dd><dt>WhatsApp</dt><dd>' + esc(k.NoWA || '-') + ' ' + (k.StatusWA ? badge(k.StatusWA) : '') + '</dd><dt>Segmen</dt><dd>' + esc(k.Segmen) + '</dd><dt>Sumber</dt><dd>' + esc(k.Sumber + ' · ' + k.RefID) + '</dd><dt>Pesan</dt><dd>' + esc(k.JumlahPesan || 0) + '</dd></dl>' +
    '<div class="form" style="margin-top:14px">' + fieldHtml({ k: 'Tag', val: k.Tag, full: true }) + fieldHtml({ k: 'Catatan', type: 'textarea', val: k.Catatan, full: true }) + '</div><button class="btn sm" id="kSave" style="margin-top:10px">' + ms('save') + 'Simpan</button>' +
    '<h4 style="margin:18px 0 8px">Catat interaksi</h4><div class="toolbar"><select class="inp" id="kKan" style="max-width:120px"><option>Telepon</option><option>WA</option><option>Email</option><option>Tatap muka</option></select><input class="inp" id="kRing" placeholder="Ringkasan"><button class="btn out sm" id="kInt">Catat</button></div>' +
    '<h4 style="margin:18px 0 8px">Riwayat</h4><div class="timeline">' + r.data.interaksi.map(i => '<div class="tl"><div class="dot">' + ms('forum') + '</div><div><b>' + esc(i.Kanal) + '</b><small>' + fmt.tglw(i.Tanggal || i.Waktu) + '</small><div style="font-size:13px">' + esc(i.Ringkasan) + '</div></div></div>').join('') + (r.data.pesan || []).slice(0, 15).map(p => '<div class="tl"><div class="dot">' + ms(p.Kanal === 'WA' ? 'chat' : 'mail') + '</div><div><b>' + esc(p.Jenis_Pengingat || p.Kanal) + ' · ' + esc(p.Status_Kirim) + '</b><small>' + fmt.tglw(p.Waktu) + '</small></div></div>').join('') + '</div>');
  $('#kSave', d.body).onclick = async () => { if (hasil(await api('crm.save', { kontak: { KontakID: id, Tag: $('[name="Tag"]', d.body).value, Catatan: $('[name="Catatan"]', d.body).value } }))) { d.close(); segar(); } };
  $('#kInt', d.body).onclick = async () => { const t = $('#kRing', d.body).value.trim(); if (!t) return; if (hasil(await api('crm.interaksi', { kontakId: id, kanal: $('#kKan', d.body).value, ringkasan: t }))) { d.close(); detailKontak(id, segar); } };
}
