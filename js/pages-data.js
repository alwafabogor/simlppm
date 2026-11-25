/* ============================================================
   pages-data.js — Registri Tridharma (non-hibah), Mitra & Kerja Sama,
   Publikasi/HKI & Kinerja Dosen, Kegiatan Ilmiah & Jurnal, Bukti Dukung
   (papan kriteria + kunci periode), Dokumen Mutu & PPEPP (kanban),
   Catatan Data, Laporan & Grafik, detail rekaman, profil.
   ============================================================ */
'use strict';
const tahunOpts = () => Array.from(new Set(Sesi.boot.periode.map(p => p.Tahun_Akademik))).sort().reverse();
const prodiOpts = () => Sesi.boot.prodi.map(p => ({ v: p.Kode_Prodi, l: p.Kode_Prodi + ' — ' + p.Nama_Prodi }));

// ===================== REGISTRI KEGIATAN =====================
Router.add('/nonhibah', async (view) => {
  const O = Sesi.boot.opts;
  judul(view, { title: T('Kegiatan Non-Hibah'), desc: 'Registri Tridharma gabungan: hibah internal + kegiatan mandiri/eksternal — sumber ekspor akreditasi.' });
  const host = document.createElement('div'); host.className = 'card'; view.appendChild(host);
  tabs(host, [{ k: 'reg', l: 'Registri gabungan', i: 'table_view' }, { k: 'inp', l: 'Input non-hibah', i: 'add_notes' }], async (k, b) => {
    if (k === 'inp') return crud(b, 'Kegiatan_NonHibah', { form: { wajib: 'Jenis Judul Tahun_Akademik Prodi_Pelaksana Sumber_Dana' }, filter: [{ k: 'Jenis', l: 'Jenis', opts: O.Jenis_Kegiatan }, { k: 'Tahun_Akademik', l: 'Tahun', opts: tahunOpts() }, { k: 'Status_Verifikasi', l: 'Verifikasi', opts: O.Status_Verifikasi }] });
    const h2 = stempel(b); let tb = null;
    b.innerHTML = '<div class="sk" style="height:260px"></div>';
    await swr('registri.gabungan', {}, (rows, c, err) => {
      if (!h2()) return; if (err) { b.innerHTML = kosong('error', esc(err)); return; }
      if (tb) return tb.set(rows);
      b.innerHTML = '';
      tb = tabel(b, { rows, nama: 'Registri_Tridharma', filter: [{ k: 'Jenis', l: 'Jenis', opts: O.Jenis_Kegiatan }, { k: 'Asal', l: 'Asal', opts: ['Hibah Internal', 'Non-Hibah', 'Mandiri'] }, { k: 'Tahun_Akademik', l: 'Tahun', opts: tahunOpts() }, { k: 'Prodi_Pelaksana', l: 'Prodi', opts: prodiOpts() }, { k: 'Sumber_Dana', l: 'Sumber dana', opts: O.Sumber_Dana }],
        cols: [{ k: 'ID', l: 'ID', r: r => '<span class="id">' + esc(r.ID) + '</span>' }, { k: 'Judul', l: 'Judul', r: r => '<div class="ttl">' + esc(r.Judul) + '</div><div class="sub">' + esc(r.Ketua + (r.Anggota ? ' · ' + r.Anggota : '')) + '</div>' }, { k: 'Jenis', l: 'Jenis' }, { k: 'Asal', l: 'Asal', r: r => badge(r.Asal, r.Asal === 'Hibah Internal' ? 'b-info' : 'b-teal') }, { k: 'Label_TS', l: 'TS', r: r => esc(r.Tahun_Akademik) + (r.Label_TS ? ' <span class="badge b-gray">' + esc(r.Label_TS) + '</span>' : '') }, { k: 'Prodi_nama', l: 'Prodi' }, { k: 'Sumber_Dana', l: 'Sumber dana' }, { k: 'Nominal', l: 'Dana', num: 1, r: r => fmt.rp(r.Nominal), exp: r => r.Nominal }, { k: 'Jumlah_Mahasiswa', l: 'Mhs', num: 1 }, { k: 'Status_Verifikasi', l: 'Verifikasi', r: r => badge(r.Status_Verifikasi) }],
        onRow: r => r.Sheet === 'Proposal' ? nav('proposal/' + r.ID) : nav('data/' + r.Sheet + '/' + r.ID) });
    });
  });
}, { roles: 'SA AD DS PM LPM', menu: 'nonhibah' });

// ===================== MITRA & KERJA SAMA =====================
Router.add('/mitra', async (view) => {
  const O = Sesi.boot.opts;
  judul(view, { title: T('Mitra & Kerja Sama'), desc: 'Basis mitra, MoU/PKS beserta masa berlaku, dan dampak PkM.' });
  const host = document.createElement('div'); host.className = 'card'; view.appendChild(host);
  tabs(host, [{ k: 'm', l: 'Mitra', i: 'apartment' }, { k: 'k', l: 'Kerja sama (MoU/PKS)', i: 'handshake' }, { k: 'd', l: 'Dampak PkM', i: 'volunteer_activism' }], (k, b) => {
    if (k === 'm') crud(b, 'Mitra', { form: { wajib: 'Nama_Mitra Jenis_Mitra', catatan: Sesi.me.role === 'DS' ? 'Mitra yang Anda tambahkan berstatus <b>Diusulkan</b> sampai disetujui Admin.' : '' }, filter: [{ k: 'Jenis_Mitra', l: 'Jenis', opts: O.Jenis_Mitra }, { k: 'Status', l: 'Status', opts: O.Status_Aktif.concat(['Diusulkan']) }] });
    if (k === 'k') crud(b, 'Kerjasama', { form: { wajib: 'ID_Mitra Nomor_MoU_PKS Tgl_Mulai Tgl_Berakhir' }, filter: [{ k: 'Status', l: 'Status', opts: O.Status_Kerjasama }], cols: ['ID', 'ID_Mitra', 'Nomor_MoU_PKS', 'Ruang_Lingkup', 'Tgl_Mulai', 'Tgl_Berakhir', 'Status'] });
    if (k === 'd') crud(b, 'Dampak_PkM', { form: { wajib: 'ID_Kegiatan Sasaran Jumlah_Penerima_Manfaat' } });
  });
}, { roles: 'SA AD DS PM LPM', menu: 'mitra' });

// ===================== PUBLIKASI & KINERJA DOSEN =====================
Router.add('/publikasi', async (view) => {
  const O = Sesi.boot.opts, pm = Sesi.me.role === 'PM';
  judul(view, { title: T('Publikasi & Kinerja Dosen'), desc: 'Publikasi, HKI/paten/TTG, dan rekap kinerja Tridharma per dosen.' });
  const host = document.createElement('div'); host.className = 'card'; view.appendChild(host);
  tabs(host, [{ k: 'pub', l: 'Publikasi', i: 'article' }, { k: 'hki', l: 'HKI, Paten & TTG', i: 'verified' }, { k: 'kin', l: pm ? 'Kinerja per Prodi' : 'Kinerja Dosen', i: 'leaderboard' }], async (k, b) => {
    if (k === 'pub') return crud(b, 'Publikasi_Dosen', { form: { wajib: 'Jenis Judul Nama_Jurnal_Penerbit Tahun Tahun_Akademik', catatan: 'Sistem memeriksa kemiripan judul untuk mencegah publikasi ganda.' }, filter: [{ k: 'Jenis', l: 'Jenis', opts: O.Jenis_Publikasi }, { k: 'Level_Indeks', l: 'Indeks', opts: O.Level_Indeks }, { k: 'Tahun_Akademik', l: 'Tahun', opts: tahunOpts() }, { k: 'Status_Verifikasi', l: 'Verifikasi', opts: O.Status_Verifikasi }] });
    if (k === 'hki') return crud(b, 'Kekayaan_Intelektual', { form: { wajib: 'Jenis Judul' }, filter: [{ k: 'Jenis', l: 'Jenis', opts: O.Jenis_HKI }, { k: 'Status_Verifikasi', l: 'Verifikasi', opts: O.Status_Verifikasi }] });
    const h2 = stempel(b);
    b.innerHTML = '<div class="toolbar"><select class="inp" id="kinTh" style="max-width:180px"><option value="">Semua tahun</option>' + tahunOpts().map(t => '<option>' + esc(t) + '</option>').join('') + '</select></div><div id="kinT"><div class="sk" style="height:220px"></div></div>';
    const muat = async () => {
      const r = await api('kinerja.dosen', { tahun: $('#kinTh', b).value }); if (!h2()) return;
      if (!r.success) { $('#kinT', b).innerHTML = kosong('error', esc(r.message)); return; }
      $('#kinT', b).innerHTML = '';
      if (r.data.agregat) return tabel($('#kinT', b), { rows: r.data.agregat, nama: 'Kinerja_Prodi', cols: [{ k: 'Prodi_nama', l: 'Prodi' }, { k: 'Dosen', l: 'Dosen', num: 1 }, { k: 'DTPS', l: 'DTPS', num: 1 }, { k: 'Penelitian', l: 'Penelitian', num: 1 }, { k: 'PkM', l: 'PkM', num: 1 }, { k: 'Publikasi', l: 'Publikasi', num: 1 }, { k: 'Terindeks', l: 'Terindeks', num: 1 }, { k: 'HKI', l: 'HKI', num: 1 }, { k: 'Dana', l: 'Dana', num: 1, r: r => fmt.rp(r.Dana), exp: r => r.Dana }] });
      tabel($('#kinT', b), { rows: r.data.rows, nama: 'Kinerja_Dosen', filter: [{ k: 'Prodi', l: 'Prodi', opts: prodiOpts() }, { k: 'DTPS', l: 'DTPS', opts: ['Ya', 'Tidak'] }], cols: [{ k: 'Nama', l: 'Dosen', r: r => '<b>' + esc(r.Nama) + '</b><div class="sub">' + esc((r.NIDN || '-') + ' · ' + (r.Jabatan || '-')) + '</div>' }, { k: 'Prodi_nama', l: 'Prodi' }, { k: 'DTPS', l: 'DTPS' }, { k: 'Penelitian', l: 'Penelitian', num: 1 }, { k: 'PkM', l: 'PkM', num: 1 }, { k: 'Ketua', l: 'Ketua', num: 1 }, { k: 'Publikasi', l: 'Publikasi', num: 1 }, { k: 'Terindeks', l: 'Terindeks', num: 1 }, { k: 'Sitasi', l: 'Sitasi', num: 1 }, { k: 'HKI', l: 'HKI', num: 1 }, { k: 'Dana', l: 'Dana (ketua)', num: 1, r: r => fmt.rp(r.Dana), exp: r => r.Dana }, { k: 'SINTA', l: 'Profil', noexp: 1, nosort: 1, r: r => [['SINTA', r.SINTA], ['Scholar', r.Scholar]].filter(x => /^https?:/.test(x[1] || '')).map(x => '<a href="' + esc(x[1]) + '" target="_blank" rel="noopener">' + x[0] + '</a>').join(' · ') || '-' }] });
    };
    $('#kinTh', b).onchange = muat; muat();
  });
}, { roles: 'SA AD DS PM LPM', menu: 'publikasi' });

// ===================== KEGIATAN ILMIAH & JURNAL =====================
Router.add('/kegiatan', async (view) => {
  const O = Sesi.boot.opts, ds = Sesi.me.role === 'DS';
  judul(view, { title: T('Kegiatan Ilmiah & Jurnal'), desc: 'Seminar, workshop, klinik proposal, pelatihan dosen, dan jurnal kampus.' });
  const host = document.createElement('div'); host.className = 'card'; view.appendChild(host);
  tabs(host, [{ k: 'k', l: 'Kegiatan ilmiah', i: 'school' }, { k: 'j', l: 'Jurnal kampus', i: 'auto_stories' }], (k, b) => {
    if (k === 'k') crud(b, 'Kegiatan_Ilmiah', { form: { wajib: 'Jenis Nama Tanggal Tahun_Akademik' }, filter: [{ k: 'Jenis', l: 'Jenis', opts: O.Jenis_Kegiatan_Ilmiah }, { k: 'Tahun_Akademik', l: 'Tahun', opts: tahunOpts() }],
      aksiTambahan: r => ds && String(r.Tanggal).slice(0, 10) >= new Date().toISOString().slice(0, 10) ? '<button class="btn sec xs" data-a="ikut">' + ms('how_to_reg') + 'Daftar</button> ' : '',
      onAksi: async (a, r, segar) => { if (a === 'ikut' && hasil(await api('kegiatan.ikut', { id: r.ID }))) segar(); } });
    if (k === 'j') crud(b, 'Jurnal_Kampus', { form: { wajib: 'Nama_Jurnal' }, filter: [{ k: 'Status_Akreditasi', l: 'Akreditasi', opts: O.Status_Akreditasi_Jurnal }] });
  });
}, { roles: 'SA AD DS PM LPM', menu: 'kegiatan' });

// ===================== BUKTI DUKUNG (papan kriteria) =====================
Router.add('/bukti', async (view, p, qs) => {
  const hidup = stempel(view), adm = Sesi.punya('SA AD'), sa = Sesi.punya('SA'), th = qs.get('tahun') || Sesi.boot.periodeAktif.tahun;
  judul(view, { title: T('Bukti Dukung'), desc: 'Papan kelengkapan bukti per kriteria akreditasi.', acts: '<select class="inp" id="bTh" style="width:auto">' + tahunOpts().map(t => '<option' + (t === th ? ' selected' : '') + '>' + esc(t) + '</option>').join('') + '</select><select class="inp" id="bPr" style="width:auto"><option value="">Semua prodi</option>' + prodiOpts().map(o => '<option value="' + esc(o.v) + '"' + (o.v === qs.get('prodi') ? ' selected' : '') + '>' + esc(o.l) + '</option>').join('') + '</select>' + (adm ? '<button class="btn out" id="bAuto">' + ms('auto_fix_high') + 'Tautkan otomatis</button>' : '') + (Sesi.punya('SA AD') ? '<button class="btn" id="bKunci"></button>' : '') });
  const host = document.createElement('div'); view.appendChild(host); host.innerHTML = kerangkaMuat(3);
  const go = () => nav('bukti?tahun=' + encodeURIComponent($('#bTh').value) + ($('#bPr').value ? '&prodi=' + encodeURIComponent($('#bPr').value) : ''));
  $('#bTh').onchange = go; $('#bPr').onchange = go;
  const param = { tahun: th, prodi: qs.get('prodi') || '' };
  const gambar = d => {
    if (!hidup()) return;
    const bk = $('#bKunci');
    if (bk) { bk.innerHTML = ms(d.terkunci ? 'lock_open' : 'lock') + (d.terkunci ? (sa ? 'Buka kunci periode' : 'Periode terkunci') : (sa ? 'Kunci periode ' + d.tahun : 'Usulkan kunci')); bk.className = 'btn ' + (d.terkunci ? 'warn' : ''); bk.disabled = d.terkunci && !sa;
      bk.onclick = async () => {
        if (sa) { const v = await isian(d.terkunci ? 'Buka kunci periode ' + d.tahun : 'Kunci periode ' + d.tahun, [{ k: 'alasan', label: d.terkunci ? 'Alasan membuka kunci (wajib, tercatat di audit)' : 'Catatan (opsional)', type: 'textarea', req: d.terkunci }], { note: d.terkunci ? 'Membuka kunci mengizinkan perubahan data periode final.' : 'Setelah dikunci, data periode ini tidak dapat diubah. Ekspor terbit & jembatan SIM-LPM diperbarui otomatis.', ok: d.terkunci ? 'Buka kunci' : 'Kunci sekarang', danger: !!d.terkunci }); if (v && hasil(await api('periode.kunci', { tahun: d.tahun, kunci: !d.terkunci, alasan: v.alasan }))) { Boot.segarkan(); segar(); } }
        else { const v = await isian('Usulkan kunci periode ' + d.tahun, [{ k: 'catatan', label: 'Catatan untuk Super Admin', type: 'textarea' }]); if (v) hasil(await api('periode.usulKunci', { tahun: d.tahun, catatan: v.catatan })); }
      }; }
    const len = d.kriteria.filter(k => k.status === 'Lengkap').length;
    host.innerHTML = (d.terkunci ? '<div class="note warn" style="margin-bottom:14px">' + ms('lock') + '<div>Periode <b>' + esc(d.tahun) + '</b> terkunci. Data bersifat final; perubahan memerlukan pembukaan kunci oleh Super Admin.</div></div>' : '') +
      '<div class="card" style="margin-bottom:16px"><div style="display:flex;justify-content:space-between;font-size:13px"><b>Kelengkapan kriteria</b><span>' + len + ' / ' + d.kriteria.length + ' lengkap</span></div><div class="bar green"><i style="width:' + (d.kriteria.length ? len / d.kriteria.length * 100 : 0) + '%"></i></div></div>' +
      '<div class="grid g3">' + d.kriteria.map(k => '<div class="card" style="cursor:pointer" data-k="' + esc(k.ID_Kriteria) + '"><div class="card-h"><div><h3>' + esc((k.Kode ? k.Kode + ' · ' : '') + k.Nama_Kriteria) + '</h3><p>' + esc(k.Lembaga + (k.Asal === 'Sinkron-LPM' ? ' · dari SIM-LPM' : '')) + '</p></div>' + badge(k.status) + '</div><div style="font-size:12.5px;color:var(--muted);min-height:34px">' + esc(k.Jenis_Bukti_Diminta || '') + '</div><div style="display:flex;justify-content:space-between;font-size:12.5px;margin-top:10px"><span>' + k.jumlah + ' bukti</span><b>' + k.lengkap + ' lengkap</b></div><div class="bar ' + (k.status === 'Lengkap' ? 'green' : 'amber') + '"><i style="width:' + (k.jumlah ? k.lengkap / k.jumlah * 100 : 0) + '%"></i></div></div>').join('') + '</div>';
    $$('[data-k]', host).forEach(c => c.onclick = () => lihatKriteria(d, d.kriteria.find(x => x.ID_Kriteria === c.dataset.k), segar));
  };
  const segar = () => swr('bukti.papan', param, (d, c, e) => e ? (host.innerHTML = kosong('error', esc(e))) : gambar(d), { fresh: true });
  if ($('#bAuto')) $('#bAuto').onclick = async () => { if (hasil(await api('bukti.otomatis', { tahun: th }))) segar(); };
  await swr('bukti.papan', param, (d, c, e) => e ? (host.innerHTML = kosong('error', esc(e))) : gambar(d));
}, { roles: 'SA AD DS PM LPM', menu: 'bukti' });

function lihatKriteria(d, k, segar) {
  const bukti = d.bukti.filter(b => b.ID_Kriteria === k.ID_Kriteria), meta = Sesi.boot.tabel.Bukti_Dukung || {};
  const dr = drawer((k.Kode ? k.Kode + ' · ' : '') + k.Nama_Kriteria, '<p class="sub">' + esc(k.Jenis_Bukti_Diminta || '') + '</p>' + (meta.C && !d.terkunci ? '<button class="btn sm" id="tbBukti">' + ms('add') + 'Tambah bukti</button>' : '') + '<div class="list" style="margin-top:12px">' + (bukti.map(b => '<div class="li">' + ms(b.ID_File ? 'attach_file' : b.Tautan_Drive ? 'link' : b.Sheet_Sumber ? 'dataset_linked' : 'description') + '<div class="grow"><b>' + esc(b.Judul_Bukti) + '</b><small>' + esc((b.Jenis || '') + (b.Sheet_Sumber ? ' · tertaut ' + b.Sheet_Sumber + ' ' + b.ID_Rekaman_Sumber : '') + (b.Prodi_nama ? ' · ' + b.Prodi_nama : '')) + '</small>' + (b.Catatan_LPM ? '<small style="display:block;color:var(--warn-ink)">LPM: ' + esc(b.Catatan_LPM) + '</small>' : '') + '</div>' + badge(b.Status_Kelengkapan) + (b.ID_File ? '<button class="btn ghost xs" data-dl="' + esc(b.ID_File) + '">' + ms('download') + '</button>' : '') + (b.Tautan_Drive ? '<a class="btn ghost xs" target="_blank" rel="noopener" href="' + esc(b.Tautan_Drive) + '">' + ms('open_in_new') + '</a>' : '') + (meta.U && !d.terkunci ? '<button class="btn ghost xs" data-e="' + esc(b.ID) + '">' + ms('edit') + '</button>' : '') + '</div>').join('') || '<div class="empty">' + ms('folder_off') + 'Belum ada bukti untuk kriteria ini.</div>') + '</div>');
  $$('[data-dl]', dr.body).forEach(x => x.onclick = () => unduh(x.dataset.dl));
  $$('[data-e]', dr.body).forEach(x => x.onclick = async () => { if (await bukaForm('Bukti_Dukung', bukti.find(b => b.ID === x.dataset.e))) { dr.close(); segar(); } });
  const tb = $('#tbBukti', dr.body);
  if (tb) tb.onclick = async () => { if (await bukaForm('Bukti_Dukung', null, { awal: { ID_Kriteria: k.ID_Kriteria, Tahun_Akademik: d.tahun, Status_Kelengkapan: 'Perlu Dilengkapi' }, wajib: 'ID_Kriteria Tahun_Akademik Judul_Bukti' })) { dr.close(); segar(); } };
}

// ===================== DOKUMEN MUTU & PPEPP =====================
Router.add('/mutu', async (view) => {
  const O = Sesi.boot.opts, adm = Sesi.punya('SA AD'), ds = Sesi.me.role === 'DS';
  judul(view, { title: T('Dokumen Mutu & PPEPP'), desc: 'Renstra, RIP, standar & SOP; target kinerja; siklus PPEPP; temuan AMI dari SIM-LPM.' });
  const host = document.createElement('div'); host.className = 'card'; view.appendChild(host);
  const tb = [{ k: 'dok', l: 'Dokumen mutu', i: 'library_books' }];
  if (!ds) tb.push({ k: 'tgt', l: 'Target kinerja', i: 'flag' }, { k: 'ppe', l: 'Siklus PPEPP', i: 'view_kanban' }, { k: 'ami', l: 'Temuan AMI', i: 'policy' });
  tabs(host, tb, async (k, b) => {
    if (k === 'dok') return crud(b, 'Dokumen_Mutu', { form: { wajib: 'Jenis Judul', catatan: 'Centang <b>Dibagikan ke LPM = Ya</b> agar dokumen tercantum di jembatan SIM-LPM (BR_Dokumen_Mutu).' }, filter: [{ k: 'Jenis', l: 'Jenis', opts: O.Jenis_Dokumen_Mutu }, { k: 'Status', l: 'Status', opts: O.Status_Dokumen_Mutu }] });
    if (k === 'tgt') return crud(b, 'Target_Kinerja', { form: { wajib: 'Tahun Indikator Target' }, tombol: adm ? '<button class="btn out sm" id="hitTgt">' + ms('calculate') + 'Hitung ulang capaian</button>' : '', setelah: (h, segar) => { const x = $('#hitTgt', h); if (x) x.onclick = async () => { if (hasil(await api('target.hitung', {}))) segar(); }; },
      cols: ['ID', 'Tahun', 'Indikator', 'Target', 'Capaian_Otomatis', 'Satuan', 'Sumber_Hitung'] });
    const h2 = stempel(b);
    if (k === 'ppe') {
      b.innerHTML = '<div class="toolbar">' + (adm ? '<button class="btn sm" id="ppAdd">' + ms('add') + 'Tindak lanjut baru</button>' : '') + '<span class="sub">Seret kartu antar kolom untuk memindahkan tahap.</span></div><div id="kb"><div class="sk" style="height:220px"></div></div>';
      const gambar = d => {
        if (!h2()) return;
        const rows = (d && d.rows) || [], kb = $('#kb', b);
        kb.innerHTML = '<div class="kanban">' + O.Tahap_PPEPP.map(t => { const isi = rows.filter(r => (r.Tahap_PPEPP || 'Penetapan') === t); return '<div class="kol" data-tahap="' + esc(t) + '"><h4>' + esc(t) + '<span>' + isi.length + '</span></h4>' + isi.map(r => '<div class="kc" draggable="' + (adm ? 'true' : 'false') + '" data-id="' + esc(r.ID) + '"><b>' + esc(String(r.Temuan).slice(0, 90)) + '</b><div class="sub">' + esc(r.Sumber_Temuan || '') + ' · ' + esc(r.PIC_nama || r.PIC || '-') + '</div><div style="display:flex;justify-content:space-between;margin-top:6px">' + badge(r.Status) + '<small class="' + (String(r.Tenggat).slice(0, 10) < new Date().toISOString().slice(0, 10) && r.Status !== 'Selesai' ? '' : 'sub') + '" style="' + (String(r.Tenggat).slice(0, 10) < new Date().toISOString().slice(0, 10) && r.Status !== 'Selesai' ? 'color:var(--bad)' : '') + '">' + fmt.tgl(r.Tenggat) + '</small></div></div>').join('') + '</div>'; }).join('') + '</div>';
        $$('.kc', kb).forEach(c => { c.ondragstart = e => e.dataTransfer.setData('text', c.dataset.id); c.onclick = () => { const r = rows.find(x => x.ID === c.dataset.id); if (adm) bukaForm('PPEPP_Tindak_Lanjut', r).then(x => x && segar()); else detailBaris('PPEPP_Tindak_Lanjut', r); }; });
        if (adm) $$('.kol', kb).forEach(kl => { kl.ondragover = e => { e.preventDefault(); kl.classList.add('over'); }; kl.ondragleave = () => kl.classList.remove('over'); kl.ondrop = async e => { e.preventDefault(); kl.classList.remove('over'); const id = e.dataTransfer.getData('text'); const r = rows.find(x => x.ID === id); if (!r || r.Tahap_PPEPP === kl.dataset.tahap) return; if (hasil(await api('ppepp.pindah', { id, tahap: kl.dataset.tahap, status: kl.dataset.tahap === 'Peningkatan' ? 'Selesai' : 'Proses' }))) segar(); }; });
      };
      const segar = () => swr('crud.list', { t: 'PPEPP_Tindak_Lanjut', filter: {}, per: 2000 }, (d, c, e) => e ? ($('#kb', b).innerHTML = kosong('error', esc(e))) : gambar(d), { fresh: true });
      if ($('#ppAdd', b)) $('#ppAdd', b).onclick = async () => { if (await bukaForm('PPEPP_Tindak_Lanjut', null, { wajib: 'Sumber_Temuan Temuan PIC Tenggat', awal: { Tahap_PPEPP: 'Penetapan', Status: 'Terbuka' } })) segar(); };
      return swr('crud.list', { t: 'PPEPP_Tindak_Lanjut', filter: {}, per: 2000 }, (d, c, e) => e ? ($('#kb', b).innerHTML = kosong('error', esc(e))) : gambar(d));
    }
    if (k === 'ami') {
      b.innerHTML = '<div class="sk" style="height:200px"></div>';
      const r = await api('mutu.temuanAmi', {}); if (!h2()) return;
      if (!r.success) { b.innerHTML = kosong('error', esc(r.message)); return; }
      const d = r.data;
      b.innerHTML = '<div class="note info" style="margin-bottom:12px">' + ms('sync') + '<div>Data dibaca dari jembatan SIM-LPM (hanya baca)' + (d.waktu ? ' · ditarik ' + fmt.rel(d.waktu) : '') + '. Tindak lanjut dikelola di SIM-LPM' + (d.lpmUrl ? ' — <a href="' + esc(d.lpmUrl) + '" target="_blank" rel="noopener">buka SIM-LPM</a>' : '') + '. Gunakan PPEPP untuk mencatat tindak lanjut LPPM.</div></div><h3>Temuan</h3><div id="amiT"></div><h3 style="margin-top:16px">Jadwal mutu</h3><div id="amiJ"></div>';
      tabel($('#amiT', b), { rows: d.temuan, nama: 'Temuan_AMI', cols: [{ k: 'Kode_Standar', l: 'Standar' }, { k: 'Kategori', l: 'Kategori', r: r => badge(r.Kategori) }, { k: 'Ringkasan', l: 'Ringkasan' }, { k: 'Tenggat', l: 'Tenggat', r: r => fmt.tgl(r.Tenggat) }, { k: 'Status', l: 'Status', r: r => badge(r.Status) }], aksi: r => adm ? '<button class="btn sec xs" data-a="pp">' + ms('add_task') + 'Jadikan PPEPP</button>' : '', onAksi: async (a, r) => { if (await bukaForm('PPEPP_Tindak_Lanjut', null, { awal: { Sumber_Temuan: 'AMI (rujukan SIM-LPM)', Temuan: r.Ringkasan, Standar_Terkait: r.Kode_Standar, Tenggat: String(r.Tenggat).slice(0, 10), Rujukan: r.ID_PKPA, Tahap_PPEPP: 'Penetapan', Status: 'Terbuka' } })) toast('Tindak lanjut PPEPP dibuat.', 'ok'); }, kosong: 'Tidak ada temuan AMI untuk unit LPPM.' });
      tabel($('#amiJ', b), { rows: d.jadwal, cari: false, unduh: false, cols: [{ k: 'Jenis_Jadwal', l: 'Jenis' }, { k: 'Tanggal', l: 'Tanggal', r: r => fmt.tgl(r.Tanggal) }, { k: 'Keterangan', l: 'Keterangan' }], kosong: 'Tidak ada jadwal.' });
    }
  });
}, { roles: 'SA AD DS PM LPM', menu: 'mutu' });

// ===================== CATATAN DATA =====================
Router.add('/catatan', async (view) => {
  const O = Sesi.boot.opts, adm = Sesi.punya('SA AD');
  judul(view, { title: T('Catatan Data'), desc: 'Catatan kekurangan/kejanggalan data — termasuk yang masuk dari SIM-LPM (Inbox). Status dicerminkan balik ke LPM.' });
  const host = document.createElement('div'); host.className = 'card'; view.appendChild(host);
  crud(host, 'Catatan_Data', { tanpaBulk: true, form: { wajib: 'Tabel_Terkait Isi_Catatan', kecuali: ['Status', 'Tgl_Selesai', 'Catatan_Penutupan'] }, filter: [{ k: 'Status', l: 'Status', opts: O.Status_Catatan }, { k: 'Prioritas', l: 'Prioritas', opts: O.Prioritas }, { k: 'Sumber', l: 'Sumber', opts: ['SIM-LPPM', 'SIM-LPM'] }],
    cols: ['ID', 'Tabel_Terkait', 'ID_Rekaman', 'Isi_Catatan', 'Prioritas', 'Sumber', 'Status'],
    aksiTambahan: r => (r.ID_Rekaman && Sesi.boot.tabel[r.Tabel_Terkait] ? '<a class="btn ghost xs" href="#/' + (r.Tabel_Terkait === 'Proposal' ? 'proposal/' : 'data/' + esc(r.Tabel_Terkait) + '/') + esc(r.ID_Rekaman) + '" title="Buka rekaman">' + ms('open_in_new') + '</a> ' : '') + (adm && r.Status !== 'Selesai' && r.Status !== 'Ditolak' ? (r.Status === 'Baru' ? '<button class="btn sec xs" data-a="proses">Proses</button> ' : '') + '<button class="btn ok xs" data-a="selesai">Selesai</button> <button class="btn ghost xs" data-a="tolak">Tolak</button> ' : ''),
    onAksi: async (a, r, segar) => {
      if (a === 'proses' && hasil(await api('catatan.status', { id: r.ID, status: 'Diproses' }))) segar();
      if (a === 'selesai' || a === 'tolak') { const v = await isian(a === 'selesai' ? 'Tandai selesai' : 'Tolak catatan', [{ k: 'catatan', label: 'Catatan penutupan', type: 'textarea', req: a === 'tolak' }]); if (v && hasil(await api('catatan.status', { id: r.ID, status: a === 'selesai' ? 'Selesai' : 'Ditolak', catatan: v.catatan }))) segar(); }
    } });
}, { roles: 'SA AD LPM', menu: 'catatan' });

// ===================== LAPORAN & GRAFIK =====================
Router.add('/laporan', async (view, p, qs) => {
  const hidup = stempel(view), th = qs.get('tahun') || '', ds = Sesi.me.role === 'DS';
  judul(view, { title: T('Laporan'), desc: 'Grafik kinerja penelitian & PkM. Data pribadi disamarkan untuk Pimpinan.', acts: ds ? '' : '<select class="inp" id="lTh" style="width:auto"><option value="">Semua tahun</option>' + tahunOpts().map(t => '<option' + (t === th ? ' selected' : '') + '>' + esc(t) + '</option>').join('') + '</select><button class="btn out" onclick="print()">' + ms('print') + 'Cetak</button>' });
  if (ds) { view.insertAdjacentHTML('beforeend', '<div class="card" id="lDs"></div>'); return laporanDosen($('#lDs')); }
  $('#lTh').onchange = e => nav('laporan' + (e.target.value ? '?tahun=' + encodeURIComponent(e.target.value) : ''));
  const host = document.createElement('div'); view.appendChild(host); host.innerHTML = kerangkaMuat(3);
  await swr('laporan.grafik', { tahun: th }, (d, c, err) => {
    if (!hidup()) return; if (err) { host.innerHTML = kosong('error', esc(err)); return; }
    const s = d.serapan, pc = s.alokasi ? Math.round(s.cair / s.alokasi * 100) : 0, pr = s.cair ? Math.round(s.realisasi / s.cair * 100) : 0;
    host.innerHTML = '<div class="grid g3">' + kpi({ label: 'Alokasi dana', value: fmt.rpj(s.alokasi), icon: 'account_balance' }) + kpi({ label: 'Dicairkan', value: pc, unit: '%', icon: 'payments', tone: 't-teal', sub: fmt.rpj(s.cair) }) + kpi({ label: 'Realisasi SPJ', value: pr, unit: '%', icon: 'receipt_long', tone: 't-amber', sub: fmt.rpj(s.realisasi) + ' dari dana cair' }) + '</div>' +
      '<div class="grid g2" style="margin-top:18px"><div class="card"><div class="card-h"><div><h3>Kegiatan per Prodi</h3></div></div><div style="height:280px"><canvas id="g1"></canvas></div></div><div class="card"><div class="card-h"><div><h3>Status Proposal</h3></div></div><div class="donut"><canvas id="g2"></canvas><div class="c"><div><b>' + Object.values(d.status).reduce((a, b) => a + b, 0) + '</b><small>Proposal</small></div></div></div><div class="legend" id="g2l"></div></div>' +
      '<div class="card"><div class="card-h"><div><h3>Luaran Terverifikasi per Tahun</h3></div></div><div style="height:260px"><canvas id="g3"></canvas></div></div><div class="card"><div class="card-h"><div><h3>Tren Pengajuan Proposal</h3></div></div><div style="height:260px"><canvas id="g4"></canvas></div></div>' +
      '<div class="card"><div class="card-h"><div><h3>Skor Kesiapan per Kriteria</h3></div></div><div style="height:260px"><canvas id="g5"></canvas></div></div><div class="card"><div class="card-h"><div><h3>Temuan Validasi</h3><p>Terbuka per tingkat & tren</p></div></div><div class="sev" style="margin-bottom:12px"><div style="background:var(--bad-bg);color:var(--bad-ink)"><b>' + (d.temuan.Kritis || 0) + '</b><small>Kritis</small></div><div style="background:var(--warn-bg);color:var(--warn-ink)"><b>' + (d.temuan.Peringatan || 0) + '</b><small>Peringatan</small></div><div style="background:var(--info-bg);color:var(--info-ink)"><b>' + (d.temuan.Info || 0) + '</b><small>Info</small></div></div><div style="height:170px"><canvas id="g6"></canvas></div></div>' +
      (d.beban.length ? '<div class="card span2"><div class="card-h"><div><h3>Beban Reviewer</h3></div></div><div style="height:240px"><canvas id="g7"></canvas></div></div>' : '') + '</div>';
    const pp = Object.keys(d.perProdi);
    batang($('#g1'), pp, [{ label: 'Penelitian', data: pp.map(k => d.perProdi[k].Penelitian), backgroundColor: '#2f4bbc' }, { label: 'PkM', data: pp.map(k => d.perProdi[k].PkM), backgroundColor: '#2fd9f4' }]);
    donutStatus($('#g2'), $('#g2l'), d.status);
    const ly = Object.keys(d.luaran).sort(), lj = Array.from(new Set([].concat.apply([], ly.map(y => Object.keys(d.luaran[y])))));
    batang($('#g3'), ly, lj.map((j, i) => ({ label: j, data: ly.map(y => d.luaran[y][j] || 0), backgroundColor: WARNA[i % WARNA.length] })), { stacked: true });
    const tk = Object.keys(d.tren).sort(); garis($('#g4'), tk, [{ label: 'Proposal', data: tk.map(k => d.tren[k]) }]);
    batang($('#g5'), d.kesiapan.map(k => k.kriteria), [{ label: 'Skor %', data: d.kesiapan.map(k => k.skor), backgroundColor: d.kesiapan.map(k => k.skor >= 80 ? '#16a34a' : k.skor >= 60 ? '#2f4bbc' : '#f5a623') }]);
    const tt = Object.keys(d.trenTemuan).sort().slice(-12); garis($('#g6'), tt.map(fmt.tgl), [{ label: 'Terbuka', data: tt.map(k => d.trenTemuan[k].terbuka) }, { label: 'Selesai', data: tt.map(k => d.trenTemuan[k].selesai), fill: false }]);
    if (d.beban.length) batang($('#g7'), d.beban.map(b => b.nama), [{ label: 'Aktif', data: d.beban.map(b => b.aktif), backgroundColor: '#f5a623' }, { label: 'Final', data: d.beban.map(b => b.final), backgroundColor: '#16a34a' }], { stacked: true });
  });
}, { roles: 'SA AD DS PM LPM', menu: 'laporan' });
async function laporanDosen(b) {
  const h2 = stempel(b); b.innerHTML = '<div class="sk" style="height:200px"></div>';
  const [k, reg] = await Promise.all([apiQ('kinerja.dosen', {}), apiQ('registri.gabungan', {})]);
  if (!h2()) return;
  const me = (k.success && k.data.rows[0]) || {};
  b.innerHTML = '<div class="card-h"><div><h3>Rekap kinerja saya</h3><p>Seluruh periode</p></div></div><div class="grid g4">' + [['Penelitian', me.Penelitian, 'science'], ['PkM', me.PkM, 'volunteer_activism'], ['Publikasi', me.Publikasi, 'article'], ['HKI', me.HKI, 'verified']].map(x => kpi({ label: x[0], value: x[1] || 0, icon: x[2] })).join('') + '</div><h3 style="margin-top:18px">Kegiatan saya</h3><div id="ldT"></div>';
  tabel($('#ldT', b), { rows: reg.success ? reg.data : [], nama: 'Kegiatan_Saya', cols: [{ k: 'Judul', l: 'Judul' }, { k: 'Jenis', l: 'Jenis' }, { k: 'Asal', l: 'Asal' }, { k: 'Tahun_Akademik', l: 'Tahun' }, { k: 'Status', l: 'Status', r: r => badge(r.Status) }] });
}

// ===================== DETAIL REKAMAN & BERKAS =====================
Router.add('/data/:t/:id', async (view, p) => {
  const hidup = stempel(view), meta = Sesi.boot.tabel[p.t];
  if (!meta) { view.innerHTML = kosong('lock', 'Tidak ada akses ke tabel ini.'); return; }
  view.innerHTML = kerangkaMuat(1);
  const r = await api('crud.get', { t: p.t, id: p.id }); if (!hidup()) return;
  if (!r.success) { view.innerHTML = kosong('error', esc(r.message)); return; }
  const row = r.data; view.innerHTML = '';
  judul(view, { crumb: [[meta.label, ''], [p.id]], title: row.Judul || row.Nama || row.Judul_Bukti || row.Nama_Mitra || p.id, desc: esc(meta.label), acts: (meta.U && row.Terkunci !== 'Ya' ? '<button class="btn out" id="dEdit">' + ms('edit') + 'Ubah</button>' : '') + (Sesi.punya('SA AD LPM') ? '<button class="btn sec" id="dCat">' + ms('sticky_note_2') + 'Catatan data</button>' : '') });
  view.insertAdjacentHTML('beforeend', '<div class="card"><dl class="kv">' + meta.cols.filter(k => row[k] !== '' && row[k] != null && k !== 'Draft_JSON').map(k => '<dt>' + esc(fmt.label(k)) + '</dt><dd>' + (/^ID_File/.test(k) ? '<a href="#" data-dl="' + esc(row[k]) + '">' + ms('download') + ' Unduh berkas</a>' : /Status/.test(k) ? badge(row[k]) : /^(Tautan|DOI_URL|Link_)/.test(k) && /^https?:/.test(row[k]) ? '<a href="' + esc(row[k]) + '" target="_blank" rel="noopener">' + esc(row[k]) + '</a>' : esc(row[k + '_nama'] ? row[k + '_nama'] + ' (' + row[k] + ')' : row[k])) + '</dd>').join('') + '</dl></div>');
  $$('[data-dl]', view).forEach(a => a.onclick = e => { e.preventDefault(); unduh(a.dataset.dl); });
  if ($('#dEdit')) $('#dEdit').onclick = async () => { if (await bukaForm(p.t, row)) Router.go(); };
  if ($('#dCat')) $('#dCat').onclick = () => detailBaris(p.t, row);
});
Router.add('/berkas/:id', async (view, p) => {
  judul(view, { title: 'Berkas', desc: 'Mengunduh berkas ' + esc(p.id) });
  view.insertAdjacentHTML('beforeend', '<div class="card"><button class="btn" id="bDl">' + ms('download') + 'Unduh berkas</button></div>');
  $('#bDl').onclick = () => unduh(p.id); unduh(p.id);
});

// ===================== PROFIL =====================
Router.add('/profil', async (view) => {
  const hidup = stempel(view);
  judul(view, { title: 'Profil & Preferensi', desc: 'Nomor WhatsApp, kanal notifikasi, dan tautan profil akademik.' });
  const host = document.createElement('div'); host.className = 'card'; view.appendChild(host); host.innerHTML = '<div class="sk" style="height:200px"></div>';
  if (Sesi.me.darurat) { host.innerHTML = kosong('shield_person', 'Akun darurat tidak memiliki profil. Masuk dengan akun Google untuk mengatur profil.'); return; }
  const r = await api('profil.get', {});
  if (!hidup()) return;
  const u = r && r.success ? r.data : {};
  host.innerHTML = '<dl class="kv" style="margin-bottom:18px"><dt>Nama</dt><dd>' + esc(Sesi.me.nama) + '</dd><dt>Email</dt><dd>' + esc(Sesi.me.email) + '</dd><dt>Peran</dt><dd>' + Sesi.me.roles.map(x => badge(Sesi.boot.roleLabels[x], 'b-info')).join(' ') + '</dd></dl><div class="form">' +
    [{ k: 'No_WA', label: 'Nomor WhatsApp', val: u.No_WA, ph: '081234567890' }, { k: 'Kanal_Notifikasi', label: 'Kanal notifikasi', type: 'select', opts: Sesi.boot.opts.Kanal, val: u.Kanal_Notifikasi || 'WA+Email', kosong: false }, { k: 'Bidang_Keahlian', label: 'Bidang keahlian (dipakai saran reviewer)', val: u.Bidang_Keahlian }, { k: 'Link_SINTA', label: 'Tautan SINTA', type: 'url', val: u.Link_SINTA }, { k: 'Link_Google_Scholar', label: 'Tautan Google Scholar', type: 'url', val: u.Link_Google_Scholar }, { k: 'ID_Scopus', label: 'Scopus Author ID', val: u.ID_Scopus }].map(fieldHtml).join('') +
    '</div><div style="margin-top:16px;display:flex;gap:8px"><button class="btn" id="pSimpan">' + ms('save') + T('Simpan') + '</button><button class="btn out" id="pPwa">' + ms('install_mobile') + 'Pasang aplikasi</button></div>';
  $('#pPwa').onclick = () => PWA.pasang();
  $('#pSimpan').onclick = async () => { const d = {}; ['No_WA', 'Kanal_Notifikasi', 'Bidang_Keahlian', 'Link_SINTA', 'Link_Google_Scholar', 'ID_Scopus'].forEach(k => { d[k] = $('[name="' + k + '"]', host).value.trim(); }); hasil(await api('profil.simpan', d)); };
});
