/* ============================================================
   pages-main.js — Dasbor 5 peran, Skema, Proposal (wizard 6 langkah,
   detail + aksi admin), Review (blind review & ploting), Kontrak & Surat,
   Logbook & Laporan, Monev, Anggaran & Termin.
   ============================================================ */
'use strict';

// ===================== DASBOR =====================
Router.add('/dashboard', async (view) => {
  const hidup = stempel(view), role = Sesi.me.role;
  view.innerHTML = kerangkaMuat(4);
  await swr('dash.get', {}, (d, cached, err) => {
    if (!hidup()) return;
    if (err) { view.innerHTML = kosong('cloud_off', esc(err)); return; }
    view.innerHTML = '';
    ({ DS: dashDS, RV: dashRV, AD: dashAD, SA: dashAD, PM: dashPM, LPM: dashLPM })[role](view, d);
  });
}, { menu: 'dashboard' });

function salam() { const h = new Date().getHours(); return h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam'; }
function sapaan(view, sub, acts) {
  view.insertAdjacentHTML('beforeend', '<div class="ph"><div class="greet"><h1>' + T('Halo') + ', ' + esc(String(Sesi.me.nama).split(',')[0]) + ' 👋</h1><p>' + salam() + ' · ' + sub + '</p></div><div class="acts">' + (acts || '') + '</div></div>');
}
function kartuAgenda(agenda) {
  return '<div class="card"><div class="card-h"><div><h3>Kalender & Tenggat</h3><p>' + BULAN[new Date().getMonth()] + ' ' + new Date().getFullYear() + '</p></div><a class="btn ghost xs" href="#/skema">' + ms('calendar_month') + '</a></div>' + kalender(agenda) + '<div style="margin-top:14px">' + daftarAgenda(agenda, 5) + '</div></div>';
}

function dashDS(view, d) {
  sapaan(view, 'Periode ' + esc(d.periode.tahun + ' ' + d.periode.semester), '<a class="btn" href="#/proposal/baru">' + ms('add') + 'Ajukan Proposal</a>');
  const dn = d.dana, cp = d.capaian;
  const cair = dn ? dn.termin.filter(t => t.status === 'Dicairkan').reduce((a, t) => a + t.nominal, 0) : 0;
  view.insertAdjacentHTML('beforeend', '<div class="grid g-main"><div class="grid">' +
    '<div class="grid g2">' +
    (dn ? '<div class="hero"><div class="lbl">Dana hibah aktif</div><div class="big">' + fmt.rp(dn.total) + '</div><small>' + esc(dn.skema || '') + ' · ' + badge(dn.status) + '</small><div style="margin-top:8px;font-weight:600">' + esc(dn.judul) + '</div>' +
      '<div class="box"><div><small>Sudah cair</small><b style="display:block">' + fmt.rp(cair) + '</b></div><div><small>Termin</small><b style="display:block">' + (dn.termin.map(t => t.persen + '%' + (t.status === 'Dicairkan' ? ' ✓' : '')).join(' · ') || 'Belum ada') + '</b></div></div>' +
      '<a class="btn sec sm" style="margin-top:14px" href="#/proposal/' + esc(dn.id) + '">' + ms('open_in_new') + 'Detail proposal</a></div>'
      : '<div class="hero"><div class="lbl">Belum ada hibah aktif</div><div class="big" style="font-size:22px">Mulai ajukan proposal</div><small>' + (d.skemaBuka.length ? d.skemaBuka.length + ' skema sedang dibuka.' : 'Belum ada skema dibuka.') + '</small><div class="box" style="grid-template-columns:1fr">' + (d.skemaBuka.slice(0, 2).map(s => '<div><b>' + esc(s.nama) + '</b><small style="display:block">Tutup ' + fmt.hari(s.sisa) + ' · plafon ' + fmt.rpj(s.plafon) + '</small></div>').join('') || '<small>Pantau menu Skema & Jadwal.</small>') + '</div></div>') +
    '<div class="card"><div class="card-h"><div><h3>Tugas Saya</h3><p>Yang perlu ditindaklanjuti</p></div><span class="badge ' + (d.tugas.length ? 'b-warn' : 'b-ok') + '">' + d.tugas.length + '</span></div><div class="list">' +
    (d.tugas.length ? d.tugas.slice(0, 6).map(t => '<a class="li" href="#/' + esc(t.rute) + '" style="text-decoration:none;color:inherit">' + ms({ revisi: 'edit_document', logbook: 'edit_note', spj: 'receipt_long', anggota: 'group_add' }[t.jenis] || 'task_alt', 't-amber') + '<div class="grow"><b>' + esc(t.teks) + '</b></div>' + ms('chevron_right') + '</a>').join('') : '<div class="empty" style="padding:16px">' + ms('task_alt') + 'Semua beres.</div>') + '</div></div></div>' +
    (cp ? '<div class="card"><div class="card-h"><div><h3>Capaian Saya</h3><p>' + esc(dn.judul) + '</p></div></div><div class="grid g4">' +
      [['Logbook', cp.logbook, '#2f4bbc'], ['Laporan kemajuan', cp.laporan, '#2fd9f4'], ['Serapan dana', cp.serapan, '#f5a623'], ['Luaran wajib', cp.luaran, '#16a34a']].map(x => '<div class="ring">' + cincin(x[1].persen, x[2]) + '<b>' + x[0] + '</b><small>' + esc(x[1].catatan) + '</small></div>').join('') + '</div></div>' : '') +
    '<div class="grid g2"><div class="card"><div class="card-h"><div><h3>Progres Kegiatan</h3><p>Persentase dari logbook per bulan</p></div></div><div style="height:220px"><canvas id="cProg"></canvas></div></div>' +
    '<div class="card"><div class="card-h"><div><h3>Tim Pelaksana</h3><p>' + d.tim.length + ' orang</p></div></div><div class="list">' + (d.tim.map(a => '<div class="li"><div class="ava" style="width:36px;height:36px;border-radius:12px;background:var(--primary-soft);color:var(--primary);display:grid;place-items:center;font-weight:800">' + esc(fmt.inisial(a.nama)) + '</div><div class="grow"><b>' + esc(a.nama) + '</b><small>' + esc(a.peran + ' · ' + a.sub) + '</small></div>' + (a.status === 'Menunggu' ? badge('Menunggu') : '') + '</div>').join('') || '<div class="empty" style="padding:14px">Belum ada tim.</div>') + '</div></div></div>' +
    '<div class="card"><div class="card-h"><div><h3>Proposal Saya</h3></div><a class="btn ghost sm" href="#/proposal">Lihat semua</a></div><div id="tProp"></div></div>' +
    '</div><div class="grid">' + kartuAgenda(d.agenda) +
    '<div class="card"><div class="card-h"><div><h3>Skema Dibuka</h3></div></div><div class="list">' + (d.skemaBuka.map(s => '<a class="li" href="#/skema" style="color:inherit;text-decoration:none">' + ms('campaign') + '<div class="grow"><b>' + esc(s.nama) + '</b><small>Tutup ' + fmt.hari(s.sisa) + ' · plafon ' + fmt.rpj(s.plafon) + '</small></div></a>').join('') || '<div class="empty" style="padding:14px">Tidak ada.</div>') + '</div></div></div></div>');
  const bl = Object.keys(d.progres).sort();
  garis($('#cProg'), bl.map(k => BLN[Number(k.slice(5, 7)) - 1] + ' ' + k.slice(2, 4)), [{ label: 'Progres %', data: bl.map(k => d.progres[k]) }]);
  tabel($('#tProp'), { cols: [{ k: 'Judul', l: 'Judul', r: r => '<div class="ttl">' + esc(r.Judul || '(tanpa judul)') + '</div><div class="sub">' + esc(r.ID_Proposal + ' · ' + r.Nama_Skema) + '</div>' }, { k: 'Status', l: 'Status', r: r => badge(r.Status) }, { k: 'Total_RAB', l: 'RAB', num: 1, r: r => fmt.rp(r.Total_RAB) }], rows: d.proposal, cari: false, unduh: false, per: 5, onRow: r => nav('proposal/' + r.ID_Proposal) });
}

function dashRV(view, d) {
  sapaan(view, 'Panel reviewer · blind review');
  view.insertAdjacentHTML('beforeend', '<div class="grid g4">' + kpi({ label: 'Menunggu dinilai', value: d.menunggu, icon: 'pending_actions', tone: 't-amber' }) + kpi({ label: 'Terlambat', value: d.terlambat, icon: 'alarm', tone: 't-red' }) + kpi({ label: 'Selesai (final)', value: d.final, icon: 'task_alt', tone: 't-green' }) + kpi({ label: 'Total penugasan', value: d.total, icon: 'assignment', tone: 't-blue' }) + '</div>' +
    '<div class="grid g-main" style="margin-top:18px"><div class="card"><div class="card-h"><div><h3>Antrean Review</h3><p>Identitas pengusul disembunyikan</p></div><a class="btn ghost sm" href="#/review">Semua</a></div><div class="list">' +
    (d.tugas.length ? d.tugas.map(t => '<a class="li" href="#/review/' + esc(t.id) + '" style="color:inherit;text-decoration:none">' + ms('rate_review') + '<div class="grow"><b>' + esc(t.judul) + '</b><small>' + esc(t.proposal) + ' · tenggat ' + fmt.tgl(t.tenggat) + '</small></div>' + '<span class="badge ' + (t.sisa < 0 ? 'b-bad' : t.sisa <= 3 ? 'b-warn' : 'b-info') + '">' + fmt.hari(t.sisa) + '</span>' + badge(t.status) + '</a>').join('') : '<div class="empty">' + ms('celebration') + 'Tidak ada penugasan tertunda.</div>') + '</div></div>' + kartuAgenda(d.agenda) + '</div>');
}

function dashAD(view, d) {
  const k = d.kpi, sel = k.masukLalu ? Math.round((k.masuk - k.masukLalu) / Math.max(1, k.masukLalu) * 100) : null;
  sapaan(view, 'Ringkasan operasional LPPM · ' + esc(d.periode.tahun), '<a class="btn out" href="#/validasi">' + ms('rule') + 'Jalankan validasi</a><a class="btn" href="#/proposal">' + ms('description') + 'Antrean proposal</a>');
  view.insertAdjacentHTML('beforeend', '<div class="grid g4">' +
    kpi({ label: 'Proposal masuk (TS)', value: fmt.n(k.masuk), icon: 'inbox', sub: sel === null ? 'periode berjalan' : (sel >= 0 ? '▲ ' : '▼ ') + Math.abs(sel) + '% vs periode lain' }) +
    kpi({ label: 'Menunggu verifikasi', value: k.verifikasi, icon: 'fact_check', tone: 't-amber', sub: '<a href="#/proposal">Periksa sekarang →</a>' }) +
    kpi({ label: 'Dalam review', value: k.review, icon: 'rate_review', tone: 't-teal', sub: 'rata-rata ' + k.durasiReview + ' hari / review' }) +
    kpi({ label: 'SPJ menunggu', value: k.spj, icon: 'receipt_long', tone: 't-red', sub: fmt.rpj(k.spjNominal) + ' · ' + k.siapCair + ' termin siap cair' }) + '</div>' +
    '<div class="grid g-main" style="margin-top:18px"><div class="grid">' +
    '<div class="card"><div class="card-h"><div><h3>Antrean Verifikasi Administrasi</h3><p>Proposal Diajukan / Verifikasi Admin</p></div></div><div id="tAntre"></div></div>' +
    '<div class="grid g2"><div class="card"><div class="card-h"><div><h3>Status Proposal</h3></div></div><div class="donut"><canvas id="cStat"></canvas><div class="c"><div><b>' + Object.values(d.status).reduce((a, b) => a + b, 0) + '</b><small>Proposal</small></div></div></div><div class="legend" id="lgStat"></div></div>' +
    '<div class="card"><div class="card-h"><div><h3>Beban Reviewer</h3><p>Aktif vs kuota</p></div><a class="btn ghost xs" href="#/review">Plot</a></div><div class="list">' + (d.beban.map(b => '<div><div style="display:flex;justify-content:space-between;font-size:13px"><b>' + esc(b.nama) + '</b><span>' + b.aktif + '/' + b.kuota + (b.terlambat ? ' · <span style="color:var(--bad)">' + b.terlambat + ' telat</span>' : '') + '</span></div><div class="bar ' + (b.aktif >= b.kuota ? 'red' : b.aktif >= b.kuota - 1 ? 'amber' : '') + '"><i style="width:' + Math.min(100, b.aktif / Math.max(1, b.kuota) * 100) + '%"></i></div></div>').join('') || '<div class="empty" style="padding:14px">Belum ada reviewer aktif.</div>') + '</div></div></div>' +
    '<div class="card"><div class="card-h"><div><h3>Monev Terjadwal</h3></div><a class="btn ghost xs" href="#/monev">Semua</a></div><div class="list">' + (d.monev.map(m => '<div class="li">' + ms('event') + '<div class="grow"><b>' + esc(m.proposal) + ' · ' + esc(m.metode) + '</b><small>' + fmt.tgl(m.tanggal) + ' · ' + esc(m.petugas || '-') + '</small></div></div>').join('') || '<div class="empty" style="padding:14px">Tidak ada.</div>') + '</div></div>' +
    '</div><div class="grid">' +
    '<div class="card"><div class="card-h"><div><h3>Kesiapan Data</h3><p>Temuan validasi terbuka</p></div><a class="btn ghost xs" href="#/validasi">Buka</a></div><div class="sev"><div style="background:var(--bad-bg);color:var(--bad-ink)"><b>' + d.temuan.kritis + '</b><small>Kritis</small></div><div style="background:var(--warn-bg);color:var(--warn-ink)"><b>' + d.temuan.peringatan + '</b><small>Peringatan</small></div><div style="background:var(--info-bg);color:var(--info-ink)"><b>' + d.temuan.info + '</b><small>Info</small></div></div></div>' +
    '<div class="card"><div class="card-h"><div><h3>Inbox SIM-LPM</h3><p>' + d.catatanBaru + ' catatan data baru</p></div><a class="btn ghost xs" href="#/catatan">Buka</a></div><div class="list">' + (d.inbox.map(c => '<a class="li" href="#/catatan" style="color:inherit;text-decoration:none">' + ms('mark_email_unread') + '<div class="grow"><b>' + esc(String(c.Isi_Catatan).slice(0, 80)) + '</b><small>' + esc(c.Tabel_Terkait + ' · ' + c.ID_Rekaman) + '</small></div>' + badge(c.Prioritas === 'Tinggi' ? 'Tinggi' : 'Baru', c.Prioritas === 'Tinggi' ? 'b-bad' : 'b-info') + '</a>').join('') || '<div class="empty" style="padding:14px">Tidak ada catatan dari LPM.</div>') +
    (d.ami.length ? d.ami.map(a => '<div class="note warn">' + ms('policy') + '<div><b>Temuan AMI ' + esc(a.Kode_Standar || '') + '</b><br>' + esc(a.Ringkasan) + ' · tenggat ' + fmt.tgl(a.Tenggat) + '</div></div>').join('') : '') + '</div></div>' +
    kartuAgenda(d.agenda) + '</div></div>');
  tabel($('#tAntre'), { cols: [{ k: 'ID_Proposal', l: 'ID', r: r => '<span class="id">' + esc(r.ID_Proposal) + '</span>' }, { k: 'Judul', l: 'Judul', r: r => '<div class="ttl">' + esc(r.Judul) + '</div><div class="sub">' + esc(r.Ketua + ' · ' + r.Prodi_nama) + '</div>' }, { k: 'Nama_Skema', l: 'Skema' }, { k: 'Tgl_Diajukan', l: 'Masuk', r: r => fmt.rel(r.Tgl_Diajukan) }, { k: 'Status', l: 'Status', r: r => badge(r.Status) }], rows: d.antrean, cari: false, unduh: false, per: 6, kosong: 'Tidak ada antrean verifikasi.', onRow: r => nav('proposal/' + r.ID_Proposal) });
  donutStatus($('#cStat'), $('#lgStat'), d.status);
}
function donutStatus(cv, lg, st) {
  const ks = Object.keys(st).sort((a, b) => st[b] - st[a]), tot = ks.reduce((a, k) => a + st[k], 0) || 1, cols = ks.map((k, i) => STATUS_RGB[k] || WARNA[i % WARNA.length]);
  donut(cv, ks, ks.map(k => st[k]), cols);
  if (lg) lg.innerHTML = ks.map((k, i) => '<div><i style="background:' + cols[i] + '"></i>' + esc(k) + '<b>' + st[k] + '</b><span>' + Math.round(st[k] / tot * 100) + '%</span></div>').join('') || '<div class="empty" style="padding:10px">Belum ada data.</div>';
}

function dashPM(view, d) {
  const k = d.kpi;
  sapaan(view, 'Ringkasan eksekutif · data agregat (tanpa data pribadi)', '<a class="btn out" href="#/laporan">' + ms('monitoring') + 'Laporan & grafik</a><a class="btn" href="#/ekspor">' + ms('download') + 'Unduh paket</a>');
  view.insertAdjacentHTML('beforeend', '<div class="grid g4">' + kpi({ label: 'Proposal TS', value: fmt.n(k.proposal), icon: 'description' }) + kpi({ label: 'Dana tersalur', value: fmt.rpj(k.tersalur), icon: 'payments', tone: 't-teal', sub: 'dari alokasi ' + fmt.rpj(k.alokasi) }) + kpi({ label: 'Serapan (SPJ)', value: k.serapan, unit: '%', icon: 'pie_chart', tone: 't-amber' }) + kpi({ label: 'Luaran terverifikasi', value: fmt.n(k.luaran), icon: 'workspace_premium', tone: 't-green', sub: d.kesiapan === null ? 'skor kesiapan belum dihitung' : 'kesiapan akreditasi ' + d.kesiapan + '%' }) + '</div>' +
    '<div class="grid g-main" style="margin-top:18px"><div class="grid"><div class="card"><div class="card-h"><div><h3>Kegiatan per Prodi (TS)</h3><p>Penelitian vs PkM</p></div></div><div style="height:280px"><canvas id="cProdi"></canvas></div></div>' +
    '<div class="card"><div class="card-h"><div><h3>Target Kinerja</h3><p>Capaian dihitung otomatis</p></div><a class="btn ghost xs" href="#/mutu">Detail</a></div><div class="list">' + (d.target.map(t => { const p = t.target ? Math.round(t.capaian / t.target * 100) : 0; return '<div><div style="display:flex;justify-content:space-between;font-size:13px;gap:10px"><b>' + esc(t.indikator) + '</b><span>' + fmt.n(t.capaian) + ' / ' + fmt.n(t.target) + ' ' + esc(t.satuan || '') + '</span></div><div class="bar ' + (p >= 100 ? 'green' : p >= 60 ? '' : 'amber') + '"><i style="width:' + Math.min(100, p) + '%"></i></div></div>'; }).join('') || '<div class="empty" style="padding:14px">Belum ada target tahun ini.</div>') + '</div></div></div>' +
    '<div class="grid"><div class="hero"><div class="lbl">Kesiapan akreditasi</div><div class="big">' + (d.kesiapan === null ? '—' : d.kesiapan + '%') + '</div><small>Rata-rata skor per kriteria (validasi terakhir)</small></div>' +
    '<div class="card"><div class="card-h"><div><h3>Status Proposal</h3></div></div><div class="donut"><canvas id="cStat"></canvas><div class="c"><div><b>' + Object.values(d.status).reduce((a, b) => a + b, 0) + '</b><small>Total</small></div></div></div><div class="legend" id="lgStat"></div></div>' +
    '<div class="card"><div class="card-h"><div><h3>Tren Pencairan</h3></div></div><div style="height:200px"><canvas id="cTren"></canvas></div></div></div></div>');
  const pr = Object.keys(d.perProdi);
  batang($('#cProdi'), pr, [{ label: 'Penelitian', data: pr.map(p => d.perProdi[p].Penelitian), backgroundColor: '#2f4bbc' }, { label: 'PkM', data: pr.map(p => d.perProdi[p].PkM), backgroundColor: '#2fd9f4' }]);
  donutStatus($('#cStat'), $('#lgStat'), d.status);
  const tk = Object.keys(d.tren).sort();
  garis($('#cTren'), tk, [{ label: 'Pencairan', data: tk.map(x => d.tren[x]) }], { rp: 1 });
}

function dashLPM(view, d) {
  sapaan(view, 'Kesiapan data akreditasi · ' + esc(d.kunci.tahun), '<a class="btn out" href="#/catatan">' + ms('sticky_note_2') + 'Catatan data (' + d.catatanMenunggu + ')</a><a class="btn" href="#/ekspor">' + ms('download') + 'Pusat ekspor</a>');
  const h = d.health;
  view.insertAdjacentHTML('beforeend', '<div class="grid g-main"><div class="grid"><div class="grid g2"><div class="hero"><div class="lbl">Skor kesiapan</div><div class="big">' + (d.kesiapan === null ? '—' : d.kesiapan + '%') + '</div><small>' + (d.kunci.terkunci ? '🔒 Periode ' + esc(d.kunci.tahun) + ' terkunci — data final' : '🔓 Periode ' + esc(d.kunci.tahun) + ' masih terbuka') + '</small><div class="box"><div><small>Catatan menunggu</small><b style="display:block">' + d.catatanMenunggu + '</b></div><div><small>Belum diverifikasi</small><b style="display:block">' + h.belumVerifikasi + '</b></div></div></div>' +
    '<div class="card"><div class="card-h"><div><h3>Kesehatan Data</h3><p>Yang memengaruhi skor</p></div><a class="btn ghost xs" href="#/validasi">Validasi</a></div><div class="list">' +
    [['link_off', 'Kegiatan terverifikasi tanpa bukti dukung', h.tanpaBukti], ['tag', 'Publikasi tanpa DOI/URL', h.tanpaDoi], ['domain_disabled', 'Kegiatan tanpa prodi/tahun', h.tanpaProdiTahun], ['content_copy', 'Indikasi duplikat (V05)', h.duplikat]].map(x => '<div class="li">' + ms(x[0]) + '<div class="grow"><b>' + x[1] + '</b></div><span class="badge ' + (x[2] ? 'b-warn' : 'b-ok') + '">' + x[2] + '</span></div>').join('') + '</div></div></div>' +
    '<div class="card"><div class="card-h"><div><h3>Skor per Kriteria</h3><p>Hasil validasi terakhir</p></div></div><div style="height:' + Math.max(200, d.kriteria.length * 34) + 'px"><canvas id="cKr"></canvas></div></div>' +
    '<div class="card"><div class="card-h"><div><h3>Rekap TS-2 · TS-1 · TS</h3></div></div><div class="tblw"><table class="tbl"><thead><tr><th>Kategori</th><th>TS-2</th><th>TS-1</th><th>TS</th></tr></thead><tbody>' + ['Penelitian', 'PkM', 'Publikasi'].map(j => '<tr><td>' + j + '</td>' + ['TS-2', 'TS-1', 'TS'].map(l => '<td class="num">' + (d.ts[l] ? d.ts[l][j] : 0) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div></div></div>' +
    '<div class="grid">' + kartuAgenda(d.agenda) + '<div class="card"><div class="card-h"><div><h3>Jadwal Mutu (SIM-LPM)</h3></div></div><div class="list">' + (d.jadwal.map(j => '<div class="li">' + ms('event_note') + '<div class="grow"><b>' + esc(j.Jenis_Jadwal) + '</b><small>' + fmt.tgl(j.Tanggal) + ' · ' + esc(j.Keterangan || '') + '</small></div></div>').join('') || '<div class="empty" style="padding:14px">Belum ada jadwal dari SIM-LPM.</div>') + '</div></div></div></div>');
  batang($('#cKr'), d.kriteria.map(k => k.kode || k.id), [{ label: 'Skor %', data: d.kriteria.map(k => k.skor || 0), backgroundColor: d.kriteria.map(k => k.skor === null ? '#cdd2e0' : k.skor >= 80 ? '#16a34a' : k.skor >= 60 ? '#2f4bbc' : '#f5a623') }], { horizontal: true });
}

// ===================== SKEMA & JADWAL =====================
Router.add('/skema', async (view) => {
  const hidup = stempel(view), adm = Sesi.punya('SA AD');
  judul(view, { title: T('Skema & Jadwal'), desc: 'Skema hibah, kuota, syarat ketua, dan tenggat.', acts: adm ? '<button class="btn" id="bSkema">' + ms('add') + 'Skema baru</button>' : '' });
  const host = document.createElement('div'); view.appendChild(host); host.innerHTML = '<div class="sk" style="height:240px"></div>';
  const gambar = rows => {
    if (!hidup()) return;
    if (!rows.length) { host.innerHTML = kosong('event_busy', 'Belum ada skema.'); return; }
    host.innerHTML = '<div class="grid g3">' + rows.map(s => '<div class="card"><div class="card-h"><div><h3>' + esc(s.Nama_Skema) + '</h3><p>' + esc(s.Jenis + ' · ' + s.Tahun) + '</p></div>' + badge(s.buka ? 'Dibuka' : s.Status) + '</div>' +
      '<dl class="kv" style="grid-template-columns:130px 1fr"><dt>Plafon</dt><dd>' + fmt.rp(s.Plafon_Per_Proposal) + '</dd><dt>Tutup pengajuan</dt><dd>' + fmt.tgl(s.Tgl_Tutup_Proposal) + (s.buka ? ' <span class="badge ' + (s.sisaHari <= 3 ? 'b-bad' : 'b-warn') + '">' + fmt.hari(s.sisaHari) + '</span>' : '') + '</dd><dt>Laporan kemajuan</dt><dd>' + fmt.tgl(s.Tgl_Tutup_Laporan_Kemajuan) + '</dd><dt>Laporan akhir</dt><dd>' + fmt.tgl(s.Tgl_Tutup_Laporan_Akhir) + '</dd><dt>Syarat ketua</dt><dd>' + esc(s.Syarat_Ketua || 'Bebas') + '</dd><dt>Termin</dt><dd>' + esc(s.Skema_Termin || '-') + '</dd><dt>Luaran wajib</dt><dd>' + esc(s.Target_Luaran_Wajib || '-') + '</dd></dl>' +
      (adm ? '<div style="margin-top:12px"><div style="display:flex;justify-content:space-between;font-size:12.5px"><span>Kuota terserap</span><b>' + s.persenKuota + '% · ' + s.jumlahProposal + ' proposal</b></div><div class="bar ' + (s.persenKuota > 90 ? 'red' : '') + '"><i style="width:' + Math.min(100, s.persenKuota) + '%"></i></div></div>' : '') +
      (s.Deskripsi ? '<p style="font-size:13px;color:var(--muted)">' + esc(s.Deskripsi) + '</p>' : '') +
      '<div class="acts" style="margin-top:12px">' +
      (Sesi.me.role === 'DS' ? (s.proposalSaya && s.proposalSaya.length ? s.proposalSaya.map(p => '<a class="btn out sm" href="#/proposal/' + esc(p.id) + '">' + esc(p.id) + ' · ' + esc(p.status) + '</a>').join('') : '') + (s.buka ? (s.memenuhiSyarat ? '<a class="btn sm" href="#/proposal/baru?skema=' + esc(s.ID_Skema) + '">' + ms('add') + 'Ajukan</a>' : '<span class="note warn" style="padding:6px 10px">' + ms('block') + esc(s.alasanSyarat) + '</span>') : '') : '') +
      (adm ? '<button class="btn out sm" data-e="' + esc(s.ID_Skema) + '">' + ms('edit') + 'Ubah</button><button class="btn sec sm" data-r="' + esc(s.ID_Skema) + '">' + ms('checklist') + 'Rubrik</button>' : '') + '</div></div>').join('') + '</div>';
    $$('[data-e]', host).forEach(b => b.onclick = () => formSkemaHibah(rows.find(x => x.ID_Skema === b.dataset.e), segar));
    $$('[data-r]', host).forEach(b => b.onclick = () => editorRubrik(b.dataset.r));
  };
  const segar = () => swr('skema.list', {}, (d, c, e) => e ? (host.innerHTML = kosong('error', esc(e))) : gambar(d), { fresh: true });
  if ($('#bSkema')) $('#bSkema').onclick = () => formSkemaHibah(null, segar);
  await swr('skema.list', {}, (d, c, e) => e ? (host.innerHTML = kosong('error', esc(e))) : gambar(d));
}, { menu: 'skema' });

async function formSkemaHibah(row, segar) {
  const f = await formSkema('Skema_Hibah', row, { wajib: 'Nama_Skema Jenis Tahun Plafon_Per_Proposal Tgl_Buka Tgl_Tutup_Proposal' });
  const m = modal({ title: row ? 'Ubah skema' : 'Skema baru', size: 'lg', body: f.html + '<div class="note info" style="margin-top:12px">' + ms('info') + '<div>Skema termin ditulis seperti <b>70,30</b> (jumlah 100). Rubrik bawaan dibuat otomatis dan bisa diubah lewat tombol <b>Rubrik</b>.</div></div>', buttons: [{ label: T('Batal'), cls: 'out', act: c => c() }, { label: T('Simpan'), icon: 'save', act: async c => { const r = await api('skema.simpan', { row: f.isi(m.body) }); if (hasil(r)) { c(); Ref.reset(); segar(); } } }] });
}
async function editorRubrik(skema) {
  const r = await api('rubrik.get', { skema });
  if (!r.success) return toast(r.message, 'bad');
  const items = r.data.map(x => ({ Kriteria: x.Kriteria, Bobot: x.Bobot, Skor_Maks: x.Skor_Maks || 100 }));
  const m = modal({ title: 'Rubrik penilaian · ' + skema, size: 'lg', body: '<div id="rbk"></div><button class="btn out sm" id="rbAdd" style="margin-top:10px">' + ms('add') + 'Tambah kriteria</button><div class="note info" style="margin-top:12px">' + ms('info') + '<div>Total bobot harus 100. Rubrik terkunci setelah ada penilaian final.</div></div>', buttons: [{ label: T('Batal'), cls: 'out', act: c => c() }, { label: T('Simpan'), icon: 'save', act: async c => { if (hasil(await api('rubrik.simpan', { skema, items }))) c(); } }] });
  const gb = () => {
    const tot = items.reduce((a, x) => a + (Number(x.Bobot) || 0), 0);
    $('#rbk', m.body).innerHTML = '<table class="tbl"><thead><tr><th>Kriteria</th><th style="width:90px">Bobot %</th><th style="width:100px">Skor maks</th><th></th></tr></thead><tbody>' + items.map((x, i) => '<tr><td><input class="inp" data-i="' + i + '" data-k="Kriteria" value="' + esc(x.Kriteria) + '"></td><td><input class="inp" type="number" data-i="' + i + '" data-k="Bobot" value="' + esc(x.Bobot) + '"></td><td><input class="inp" type="number" data-i="' + i + '" data-k="Skor_Maks" value="' + esc(x.Skor_Maks) + '"></td><td><button class="btn ghost xs" data-del="' + i + '">' + ms('delete') + '</button></td></tr>').join('') + '<tr><td><b>Total</b></td><td><b style="color:' + (tot === 100 ? 'var(--ok)' : 'var(--bad)') + '">' + tot + '</b></td><td colspan="2"></td></tr></tbody></table>';
    $$('[data-i]', m.body).forEach(el => el.onchange = () => { items[el.dataset.i][el.dataset.k] = el.type === 'number' ? Number(el.value) : el.value; gb(); });
    $$('[data-del]', m.body).forEach(b => b.onclick = () => { items.splice(Number(b.dataset.del), 1); gb(); });
  };
  $('#rbAdd', m.body).onclick = () => { items.push({ Kriteria: '', Bobot: 0, Skor_Maks: 100 }); gb(); };
  gb();
}

// ===================== PROPOSAL: DAFTAR =====================
const ALUR = ['Draft', 'Diajukan', 'Verifikasi Admin', 'Dalam Review', 'Keputusan', 'Kontrak', 'Berjalan', 'Selesai'];
function posisiAlur(st) { if (st === 'Perlu Perbaikan Administrasi') return 2; if (/Revisi|Diterima|Ditolak/.test(st)) return 4; const i = ALUR.indexOf(st); return i < 0 ? 0 : i; }
Router.add('/proposal', async (view) => {
  const hidup = stempel(view), ds = Sesi.me.role === 'DS', O = Sesi.boot.opts;
  judul(view, { title: T('Proposal'), desc: ds ? 'Proposal yang Anda ketuai atau ikuti.' : 'Seluruh proposal hibah internal: verifikasi, review, keputusan.', acts: Sesi.punya('DS SA') ? '<a class="btn" href="#/proposal/baru">' + ms('add') + 'Ajukan proposal</a>' : '' });
  const host = document.createElement('div'); host.className = 'card'; view.appendChild(host); host.innerHTML = '<div class="sk" style="height:300px"></div>';
  let tb = null;
  await swr('proposal.list', {}, (rows, c, err) => {
    if (!hidup()) return;
    if (err) { host.innerHTML = kosong('error', esc(err)); return; }
    if (tb) return tb.set(rows);
    const skema = Array.from(new Set(rows.map(r => r.Nama_Skema))).filter(Boolean);
    tb = tabel(host, {
      nama: 'Proposal', rows, filter: [{ k: 'Status', l: 'Status', opts: O.Status_Proposal }, { k: 'Nama_Skema', l: 'Skema', opts: skema }, { k: 'Tahun_Akademik', l: 'Tahun', opts: Array.from(new Set(rows.map(r => r.Tahun_Akademik))).sort().reverse() }],
      cols: [{ k: 'ID_Proposal', l: 'ID', r: r => '<span class="id">' + esc(r.ID_Proposal) + '</span>' }, { k: 'Judul', l: 'Judul', r: r => '<div class="ttl">' + esc(r.Judul || '(draf tanpa judul)') + '</div><div class="sub">' + esc(r.Ketua + ' · ' + (r.Prodi_nama || '-')) + '</div>' }, { k: 'Nama_Skema', l: 'Skema' }, { k: 'Total_RAB', l: 'RAB', num: 1, r: r => fmt.rp(r.Total_RAB), exp: r => r.Total_RAB }, { k: 'reviewer', l: 'Review', r: r => r.reviewer ? r.reviewerFinal + '/' + r.reviewer + (r.Skor_Akhir ? ' · ' + r.Skor_Akhir : '') : '-' }, { k: 'Status', l: 'Status', r: r => badge(r.Status) + (r.Perlu_Review_Tambahan === 'Ya' ? ' <span class="badge b-bad" title="Selisih skor reviewer melebihi ambang">Selisih</span>' : '') }, { k: 'updated_at', l: 'Diperbarui', r: r => fmt.rel(r.updated_at) }],
      onRow: r => nav('proposal/' + r.ID_Proposal)
    });
  });
}, { roles: 'SA AD DS PM LPM', menu: 'proposal' });

// ===================== PROPOSAL: WIZARD 6 LANGKAH =====================
const LANGKAH = ['Skema', 'Identitas', 'Tim', 'RAB', 'Berkas', 'Ajukan'];
async function wizardProposal(view, params, qs) {
  const hidup = stempel(view);
  const st = { id: params.id || '', step: 0, p: { ID_Skema: qs.get('skema') || '', Judul: '', Abstrak: '', Bidang_Fokus: '', Prodi_Pelaksana: Sesi.me.prodi || '', Mata_Kuliah_Terintegrasi: '', ID_Mitra: '', Sumber_Dana: '' }, anggota: [], rab: [], file: '', status: 'Draft', kotor: false };
  judul(view, { crumb: [['Proposal', 'proposal'], [st.id ? 'Lanjutkan ' + st.id : 'Proposal baru']], title: st.id ? 'Lanjutkan proposal' : 'Ajukan proposal baru', desc: 'Draf tersimpan otomatis setiap pindah langkah.' });
  const box = document.createElement('div'); view.appendChild(box); box.innerHTML = kerangkaMuat(1);
  const [sk, ds, mt] = await Promise.all([apiQ('skema.list', {}), Ref.get('dosen'), Ref.get('mitra')]);
  if (!hidup()) return;
  let skema = sk.success ? sk.data : [];
  if (st.id) {
    const r = await api('proposal.detail', { id: st.id });
    if (!hidup()) return;
    if (!r.success) { box.innerHTML = kosong('error', esc(r.message)); return; }
    const p = r.data.proposal;
    if (!r.data.bisaEdit) { box.innerHTML = kosong('lock', 'Proposal berstatus ' + esc(p.Status) + ' tidak dapat diubah. <a href="#/proposal/' + esc(st.id) + '">Lihat detail</a>'); return; }
    Object.keys(st.p).forEach(k => { if (p[k] !== undefined) st.p[k] = p[k]; });
    st.anggota = r.data.anggota.filter(a => a.Peran !== 'Ketua').map(a => a.ID_User ? { ID_User: a.ID_User, nama: a.nama, Status_Konfirmasi: a.Status_Konfirmasi } : { Nama_Mahasiswa: a.nama, NIM: a.NIM });
    st.rab = r.data.rab.map(x => ({ ID: x.ID, Kategori: x.Kategori, Uraian: x.Uraian, Volume: x.Volume, Satuan: x.Satuan, Harga_Satuan: x.Harga_Satuan }));
    st.file = p.ID_File_Terbaru; st.status = p.Status;
    try { const dj = JSON.parse(p.Draft_JSON || '{}'); if (dj && dj.step) st.step = Math.min(5, dj.step); } catch (e) { }
    if (!skema.some(s => s.ID_Skema === p.ID_Skema)) skema.push({ ID_Skema: p.ID_Skema, Nama_Skema: p.Nama_Skema, buka: true, Plafon_Per_Proposal: p.Plafon, Jenis: '', memenuhiSyarat: true });
  }
  if (!st.p.ID_Skema) { const b = skema.filter(s => s.buka && s.memenuhiSyarat !== false); if (b.length === 1) st.p.ID_Skema = b[0].ID_Skema; }
  const skAktif = () => skema.find(s => s.ID_Skema === st.p.ID_Skema) || {};
  const total = () => st.rab.reduce((a, x) => a + (Number(x.Volume) || 0) * (Number(x.Harga_Satuan) || 0), 0);
  async function simpan(diam) {
    const r = await api('proposal.draft', { proposal: Object.assign({ ID_Proposal: st.id }, st.p, { Draft_JSON: { step: st.step } }), anggota: st.anggota, rab: st.rab }, { silent: diam });
    if (!r.success) { toast(r.message, 'bad'); return false; }
    if (!st.id) { st.id = r.data.ID_Proposal; history.replaceState(null, '', '#/proposal/edit/' + st.id); }
    (r.data.peringatan || []).forEach(p => toast(p, 'warn'));
    st.kotor = false; if (!diam) toast('Draf ' + st.id + ' tersimpan.', 'ok');
    return true;
  }
  function baca() {
    $$('[data-p]', box).forEach(el => { st.p[el.dataset.p] = el.value; });
    $$('[data-rab]', box).forEach(el => { const [i, k] = el.dataset.rab.split('.'); st.rab[i][k] = el.type === 'number' ? Number(el.value) : el.value; });
    $$('[data-mhs]', box).forEach(el => { const [i, k] = el.dataset.mhs.split('.'); st.anggota[i][k] = el.value; });
  }
  async function ke(n) {
    baca();
    if (n > st.step) {
      if (st.step === 0 && !st.p.ID_Skema) return toast('Pilih skema dulu.', 'warn');
      if (st.step === 1 && (!st.p.Judul.trim() || !st.p.Abstrak.trim())) return toast('Judul dan abstrak wajib diisi.', 'warn');
    }
    if (st.step !== n || !st.id) { const lama = st.step; st.step = n; if (!(await simpan(true))) { st.step = lama; return; } }
    gambar();
  }
  function gambar() {
    if (!hidup()) return;
    const s = skAktif(), O = Sesi.boot.opts;
    let isi = '';
    if (st.step === 0) isi = '<h3>Pilih skema hibah</h3><div class="grid g2" style="margin-top:12px">' + (skema.filter(x => x.buka || x.ID_Skema === st.p.ID_Skema).map(x => '<label class="card flat" style="cursor:pointer;display:block;' + (x.ID_Skema === st.p.ID_Skema ? 'outline:2px solid var(--primary)' : '') + '"><input type="radio" name="sk" value="' + esc(x.ID_Skema) + '"' + (x.ID_Skema === st.p.ID_Skema ? ' checked' : '') + (x.memenuhiSyarat === false || (st.id && x.ID_Skema !== st.p.ID_Skema) ? ' disabled' : '') + '> <b>' + esc(x.Nama_Skema) + '</b><div class="sub" style="margin-top:6px">' + esc(x.Jenis || '') + ' · plafon ' + fmt.rp(x.Plafon_Per_Proposal) + (x.Tgl_Tutup_Proposal ? ' · tutup ' + fmt.tgl(x.Tgl_Tutup_Proposal) : '') + '</div>' + (x.memenuhiSyarat === false ? '<div class="note warn" style="margin-top:8px">' + esc(x.alasanSyarat) + '</div>' : '') + '</label>').join('') || kosong('event_busy', 'Tidak ada skema yang sedang dibuka.')) + '</div>';
    if (st.step === 1) isi = '<h3>Identitas proposal</h3><div class="form" style="margin-top:12px">' +
      '<div class="field full"><label>Judul <span class="req">*</span></label><input class="inp" data-p="Judul" maxlength="400" value="' + esc(st.p.Judul) + '"></div>' +
      '<div class="field full"><label>Abstrak <span class="req">*</span> <small id="nAbs"></small></label><textarea class="inp" data-p="Abstrak" rows="7" maxlength="6000">' + esc(st.p.Abstrak) + '</textarea></div>' +
      '<div class="field"><label>Bidang fokus</label><input class="inp" data-p="Bidang_Fokus" value="' + esc(st.p.Bidang_Fokus) + '" placeholder="mis. Ekonomi Syariah, Zakat"></div>' +
      '<div class="field"><label>Prodi pelaksana</label><select class="inp" data-p="Prodi_Pelaksana"><option value="">— pilih —</option>' + Sesi.boot.prodi.map(p => '<option value="' + esc(p.Kode_Prodi) + '"' + (String(p.Kode_Prodi) === String(st.p.Prodi_Pelaksana) ? ' selected' : '') + '>' + esc(p.Kode_Prodi + ' — ' + p.Nama_Prodi) + '</option>').join('') + '</select></div>' +
      '<div class="field"><label>Mata kuliah terintegrasi</label><input class="inp" data-p="Mata_Kuliah_Terintegrasi" value="' + esc(st.p.Mata_Kuliah_Terintegrasi) + '"></div>' +
      '<div class="field"><label>Sumber dana</label><select class="inp" data-p="Sumber_Dana">' + O.Sumber_Dana.map(v => '<option' + (v === st.p.Sumber_Dana ? ' selected' : '') + '>' + esc(v) + '</option>').join('') + '</select></div>' +
      (/PkM|Pengabdian|PKM/i.test(s.Jenis || '') || st.p.ID_Mitra ? '<div class="field full"><label>Mitra (wajib untuk PkM)</label><select class="inp" data-p="ID_Mitra"><option value="">— pilih —</option>' + mt.map(m => '<option value="' + esc(m.id) + '"' + (m.id === st.p.ID_Mitra ? ' selected' : '') + '>' + esc(m.nama + ' · ' + m.sub) + '</option>').join('') + '</select><small>Mitra belum terdaftar? Tambahkan lewat menu Mitra & Kerja Sama (status Diusulkan).</small></div>' : '') + '</div>';
    if (st.step === 2) isi = '<h3>Tim pelaksana</h3><p class="sub">Anda tercatat otomatis sebagai Ketua. Anggota dosen akan diminta konfirmasi setelah proposal diajukan.</p>' +
      '<div class="card flat" style="margin-top:12px"><b>Anggota dosen</b><div class="list" style="margin-top:10px">' + (st.anggota.map((a, i) => a.ID_User ? '<div class="li">' + ms('person') + '<div class="grow"><b>' + esc(a.nama || (ds.find(x => x.id === a.ID_User) || {}).nama || a.ID_User) + '</b><small>' + esc((ds.find(x => x.id === a.ID_User) || {}).sub || '') + '</small></div>' + (a.Status_Konfirmasi ? badge(a.Status_Konfirmasi) : '') + '<button class="btn ghost xs" data-hapus="' + i + '">' + ms('close') + '</button></div>' : '').join('')) + '</div><div class="toolbar" style="margin-top:10px"><select class="inp" id="pilDosen"><option value="">— tambah dosen —</option>' + ds.filter(x => x.id !== Sesi.me.id && !st.anggota.some(a => a.ID_User === x.id)).map(x => '<option value="' + esc(x.id) + '">' + esc(x.nama + ' · ' + x.sub) + '</option>').join('') + '</select></div></div>' +
      '<div class="card flat" style="margin-top:12px"><b>Mahasiswa terlibat</b><div class="list" style="margin-top:10px">' + st.anggota.map((a, i) => a.ID_User ? '' : '<div class="li"><input class="inp" data-mhs="' + i + '.Nama_Mahasiswa" placeholder="Nama mahasiswa" value="' + esc(a.Nama_Mahasiswa || '') + '"><input class="inp" data-mhs="' + i + '.NIM" placeholder="NIM" value="' + esc(a.NIM || '') + '" style="max-width:160px"><button class="btn ghost xs" data-hapus="' + i + '">' + ms('close') + '</button></div>').join('') + '</div><button class="btn out sm" id="addMhs" style="margin-top:10px">' + ms('add') + 'Tambah mahasiswa</button></div>';
    if (st.step === 3) { const pl = Number(s.Plafon_Per_Proposal) || 0;
      isi = '<h3>Rencana Anggaran Biaya</h3><div style="margin:12px 0"><div style="display:flex;justify-content:space-between;font-size:13px"><span>Total RAB</span><b id="rabTot"></b></div>' + (pl ? '<div class="bar" id="rabBar"><i></i></div>' : '') + '</div>' +
        '<div class="tblw"><table class="tbl"><thead><tr><th style="width:170px">Kategori</th><th>Uraian</th><th style="width:80px">Vol</th><th style="width:90px">Satuan</th><th style="width:140px">Harga satuan</th><th style="width:130px" class="num">Subtotal</th><th></th></tr></thead><tbody>' +
        st.rab.map((x, i) => '<tr><td><select class="inp" data-rab="' + i + '.Kategori">' + O.Kategori_RAB.map(k => '<option' + (k === x.Kategori ? ' selected' : '') + '>' + esc(k) + '</option>').join('') + '</select></td><td><input class="inp" data-rab="' + i + '.Uraian" value="' + esc(x.Uraian || '') + '"></td><td><input class="inp" type="number" min="0" data-rab="' + i + '.Volume" value="' + esc(x.Volume || '') + '"></td><td><input class="inp" data-rab="' + i + '.Satuan" value="' + esc(x.Satuan || '') + '"></td><td><input class="inp" type="number" min="0" data-rab="' + i + '.Harga_Satuan" value="' + esc(x.Harga_Satuan || '') + '"></td><td class="num" id="sub' + i + '">' + fmt.rp((Number(x.Volume) || 0) * (Number(x.Harga_Satuan) || 0)) + '</td><td><button class="btn ghost xs" data-hrab="' + i + '">' + ms('delete') + '</button></td></tr>').join('') +
        '</tbody></table></div><button class="btn out sm" id="addRab" style="margin-top:10px">' + ms('add') + 'Tambah item</button>'; }
    if (st.step === 4) isi = '<h3>Berkas proposal (PDF)</h3><p class="sub">Unggah naskah lengkap. Versi tersimpan otomatis (01_Proposal_vN.pdf). Naskah anonim untuk reviewer disiapkan oleh Admin LPPM.</p>' +
      '<div class="drop" id="drop" style="margin-top:12px">' + ms('upload_file') + '<div><b>Seret PDF ke sini</b> atau klik untuk memilih</div><small>Maks. ' + esc((Sesi.boot.app && '10') || '10') + ' MB</small><div class="prog"><i id="prU"></i></div></div>' +
      '<div class="file-row" style="margin-top:12px">' + ms('picture_as_pdf') + '<span class="grow">' + (st.file ? 'Berkas tersimpan' : 'Belum ada berkas') + '</span>' + (st.file ? '<button class="btn out xs" id="lihatPdf">' + ms('visibility') + 'Lihat</button>' : '') + '</div>';
    if (st.step === 5) { const cek = [['Skema dipilih', !!st.p.ID_Skema], ['Judul & abstrak', !!(st.p.Judul && st.p.Abstrak)], ['Bidang fokus', !!st.p.Bidang_Fokus], ['Prodi pelaksana', !!st.p.Prodi_Pelaksana], ['RAB minimal 1 item', st.rab.some(x => x.Uraian)], ['RAB ≤ plafon', !(Number(s.Plafon_Per_Proposal) && total() > Number(s.Plafon_Per_Proposal))], ['Berkas PDF', !!st.file]];
      isi = '<h3>Periksa & ajukan</h3><div class="two" style="margin-top:12px"><div><dl class="kv"><dt>Skema</dt><dd>' + esc(s.Nama_Skema || '-') + '</dd><dt>Judul</dt><dd>' + esc(st.p.Judul) + '</dd><dt>Bidang fokus</dt><dd>' + esc(st.p.Bidang_Fokus || '-') + '</dd><dt>Tim</dt><dd>' + (st.anggota.length + 1) + ' orang (' + st.anggota.filter(a => !a.ID_User).length + ' mahasiswa)</dd><dt>Total RAB</dt><dd>' + fmt.rp(total()) + '</dd></dl></div><div class="list">' + cek.map(c => '<div class="li">' + ms(c[1] ? 'check_circle' : 'cancel', c[1] ? 't-green' : 't-red') + '<div class="grow"><b>' + c[0] + '</b></div></div>').join('') + '</div></div>' +
        '<div class="note warn" style="margin-top:14px">' + ms('lock') + '<div>Setelah diajukan, proposal <b>terkunci</b> untuk verifikasi administrasi. Perubahan hanya bisa dilakukan bila Admin mengembalikan untuk perbaikan.</div></div>'; }
    box.innerHTML = '<div class="card"><div class="stepper">' + LANGKAH.map((l, i) => '<div class="st' + (i < st.step ? ' done' : i === st.step ? ' on' : '') + '" data-ke="' + i + '"><div class="n">' + (i < st.step ? ms('check') : i + 1) + '</div>' + l + '</div>').join('') + '</div></div>' +
      '<div class="card" style="margin-top:16px">' + isi + '<div class="acts" style="margin-top:20px;justify-content:space-between;display:flex"><div>' + (st.step ? '<button class="btn out" id="wPrev">' + ms('arrow_back') + 'Sebelumnya</button>' : '') + '</div><div class="acts"><button class="btn ghost" id="wSave">' + ms('save') + 'Simpan draf</button>' + (st.step < 5 ? '<button class="btn" id="wNext">Berikutnya' + ms('arrow_forward') + '</button>' : '<button class="btn ok" id="wAju">' + ms('send') + 'Ajukan proposal</button>') + '</div></div></div>';
    $$('[data-ke]', box).forEach(x => x.onclick = () => ke(Number(x.dataset.ke)));
    if ($('#wPrev')) $('#wPrev').onclick = () => ke(st.step - 1);
    if ($('#wNext')) $('#wNext').onclick = () => ke(st.step + 1);
    $('#wSave').onclick = async () => { baca(); await simpan(false); };
    $$('[name="sk"]', box).forEach(r => r.onchange = () => { st.p.ID_Skema = r.value; gambar(); });
    const abs = $('[data-p="Abstrak"]', box); if (abs) { const n = () => { $('#nAbs').textContent = '(' + abs.value.trim().split(/\s+/).filter(Boolean).length + ' kata)'; }; abs.oninput = n; n(); }
    const pd = $('#pilDosen'); if (pd) pd.onchange = () => { if (!pd.value) return; baca(); const x = ds.find(y => y.id === pd.value); st.anggota.push({ ID_User: x.id, nama: x.nama }); gambar(); };
    if ($('#addMhs')) $('#addMhs').onclick = () => { baca(); st.anggota.push({ Nama_Mahasiswa: '', NIM: '' }); gambar(); };
    $$('[data-hapus]', box).forEach(b => b.onclick = () => { baca(); st.anggota.splice(Number(b.dataset.hapus), 1); gambar(); });
    if ($('#addRab')) $('#addRab').onclick = () => { baca(); st.rab.push({ Kategori: O.Kategori_RAB[0], Uraian: '', Volume: 1, Satuan: 'paket', Harga_Satuan: 0 }); gambar(); };
    $$('[data-hrab]', box).forEach(b => b.onclick = () => { baca(); st.rab.splice(Number(b.dataset.hrab), 1); gambar(); });
    const rabTot = () => { const t = $('#rabTot'); if (!t) return; const tot = total(), pl = Number(s.Plafon_Per_Proposal) || 0; t.textContent = fmt.rp(tot) + (pl ? ' / plafon ' + fmt.rp(pl) : ''); t.style.color = pl && tot > pl ? 'var(--bad)' : ''; const br = $('#rabBar'); if (br) { br.className = 'bar ' + (tot > pl ? 'red' : tot > pl * .9 ? 'amber' : 'green'); $('i', br).style.width = Math.min(100, tot / pl * 100) + '%'; } st.rab.forEach((x, i) => { const c = $('#sub' + i); if (c) c.textContent = fmt.rp((Number(x.Volume) || 0) * (Number(x.Harga_Satuan) || 0)); }); };
    $$('[data-rab]', box).forEach(el => el.oninput = () => { baca(); rabTot(); });
    rabTot();
    const dr = $('#drop');
    if (dr) {
      const kirim = async f => { if (!f) return; if (f.type !== 'application/pdf') return toast('Berkas harus PDF.', 'warn'); const u = await unggah(f, { tabel: 'Proposal', id: st.id, kolom: 'ID_File_Terbaru', wajibPdf: true }, p => { $('#prU').style.width = p + '%'; }); if (hasil(u)) { st.file = u.data.ID_File; gambar(); } };
      dr.onclick = async () => kirim(await pilihBerkas('application/pdf'));
      dr.ondragover = e => { e.preventDefault(); dr.classList.add('hover'); }; dr.ondragleave = () => dr.classList.remove('hover');
      dr.ondrop = e => { e.preventDefault(); dr.classList.remove('hover'); kirim(e.dataTransfer.files[0]); };
    }
    if ($('#lihatPdf')) $('#lihatPdf').onclick = () => unduh(st.file);
    if ($('#wAju')) $('#wAju').onclick = async () => {
      baca(); if (!(await simpan(true))) return;
      if (!(await konfirmasi('Ajukan proposal <b>' + esc(st.p.Judul) + '</b>? Proposal akan terkunci untuk verifikasi.', { ok: 'Ajukan' }))) return;
      const r = await api('proposal.ajukan', { id: st.id });
      if (hasil(r)) nav('proposal/' + st.id);
    };
  }
  gambar();
}
Router.add('/proposal/baru', wizardProposal, { roles: 'DS SA', menu: 'proposal' });
Router.add('/proposal/edit/:id', wizardProposal, { roles: 'DS SA', menu: 'proposal' });

// ===================== PROPOSAL: DETAIL =====================
Router.add('/proposal/:id', async (view, params) => {
  const hidup = stempel(view), id = params.id;
  view.innerHTML = kerangkaMuat(1);
  const muat = () => swr('proposal.detail', { id }, (d, c, err) => { if (!hidup()) return; if (err) { view.innerHTML = kosong('error', esc(err)); return; } gambarDetail(view, d, muat); }, { fresh: true });
  await swr('proposal.detail', { id }, (d, c, err) => { if (!hidup()) return; if (err) { view.innerHTML = kosong('error', esc(err)); return; } gambarDetail(view, d, muat); });
}, { roles: 'SA AD DS PM LPM', menu: 'proposal' });

function gambarDetail(view, d, muat) {
  const p = d.proposal, adm = Sesi.punya('SA AD'), sa = Sesi.punya('SA'), me = Sesi.me, pos = posisiAlur(p.Status);
  const sayaAnggota = d.anggota.find(a => a.ID_User === me.id && a.Peran !== 'Ketua' && a.Status_Konfirmasi === 'Menunggu');
  view.innerHTML = '';
  judul(view, { crumb: [['Proposal', 'proposal'], [p.ID_Proposal]], title: p.Judul || '(tanpa judul)', desc: esc(p.ID_Proposal + ' · ' + p.Nama_Skema + ' · ' + (p.ID_Ketua_nama || '') + ' · ' + (p.Prodi_Pelaksana_nama || p.Prodi_Pelaksana || '')) + ' &nbsp;' + badge(p.Status), acts: '' });
  view.insertAdjacentHTML('beforeend', '<div class="card"><div class="stepper">' + ['Draf', 'Diajukan', 'Verifikasi', 'Review', 'Keputusan', 'Kontrak', 'Berjalan', 'Selesai'].map((l, i) => '<div class="st' + (i < pos ? ' done' : i === pos ? ' on' : '') + '" style="cursor:default"><div class="n">' + (i < pos ? ms('check') : i + 1) + '</div>' + l + '</div>').join('') + '</div>' +
    (p.Status === 'Ditolak' ? '<div class="note bad" style="margin-top:12px">' + ms('cancel') + '<div><b>Ditolak.</b> ' + esc(p.Catatan_Keputusan || '') + '</div></div>' : p.Status === 'Perlu Perbaikan Administrasi' ? '<div class="note warn" style="margin-top:12px">' + ms('edit_document') + '<div><b>Perlu perbaikan administrasi:</b> ' + esc(p.Catatan_Admin || '') + '</div></div>' : p.Status === 'Revisi' ? '<div class="note warn" style="margin-top:12px">' + ms('history_edu') + '<div><b>Revisi diminta.</b> ' + esc(p.Catatan_Keputusan || 'Lihat catatan reviewer pada tab Review.') + '</div></div>' : '') + '</div>' +
    '<div class="grid g-main" style="margin-top:16px"><div class="card" id="dTabs"></div><div class="grid" id="dSide"></div></div>');
  // ---- Panel aksi ----
  const side = $('#dSide'), aksi = [];
  if (d.bisaEdit) aksi.push('<a class="btn" href="#/proposal/edit/' + esc(p.ID_Proposal) + '">' + ms('edit') + (p.Status === 'Draft' ? 'Lanjutkan pengisian' : 'Perbaiki proposal') + '</a>');
  if (d.bisaEdit && (p.Status === 'Perlu Perbaikan Administrasi' || p.Status === 'Revisi')) aksi.push('<button class="btn ok" data-x="revisi">' + ms('send') + 'Kirim ' + (p.Status === 'Revisi' ? 'revisi' : 'perbaikan') + '</button>');
  if (sayaAnggota) aksi.push('<div class="note info">' + ms('group_add') + '<div>Anda tercatat sebagai anggota proposal ini.</div></div><div class="acts"><button class="btn ok sm" data-x="konf">' + ms('check') + 'Konfirmasi</button><button class="btn out sm" data-x="tolakAng">Tolak</button></div>');
  if (adm) {
    if (p.Status === 'Diajukan') aksi.push('<button class="btn" data-x="mulai">' + ms('play_arrow') + 'Mulai periksa administrasi</button>');
    if (['Diajukan', 'Verifikasi Admin'].indexOf(p.Status) >= 0 && p.Status_Verifikasi !== 'Terverifikasi') aksi.push('<button class="btn ok" data-x="lengkap">' + ms('verified') + 'Administrasi lengkap</button><button class="btn warn" data-x="perbaikan">' + ms('undo') + 'Kembalikan untuk perbaikan</button>');
    if (['Diajukan', 'Verifikasi Admin', 'Dalam Review', 'Revisi'].indexOf(p.Status) >= 0) aksi.push('<button class="btn out" data-x="anonim">' + ms('visibility_off') + (p.ID_File_Anonim ? 'Ganti' : 'Unggah') + ' naskah anonim</button><button class="btn out" data-x="sim">' + ms('plagiarism') + 'Hasil cek similarity</button>');
    if ((p.Status === 'Verifikasi Admin' && p.Status_Verifikasi === 'Terverifikasi') || p.Status === 'Dalam Review') aksi.push('<a class="btn sec" href="#/plot/' + esc(p.ID_Proposal) + '">' + ms('group') + 'Plot reviewer</a>');
    if (p.Status === 'Dalam Review') aksi.push('<button class="btn" data-x="keputusan">' + ms('gavel') + 'Tetapkan keputusan</button>');
    if (['Diterima', 'Kontrak'].indexOf(p.Status) >= 0 && !d.dokumen.some(k => k.Jenis_Dokumen === 'Kontrak' && k.Status !== 'Ditarik')) aksi.push('<button class="btn" data-x="kontrak">' + ms('contract') + 'Buat draf kontrak</button>');
    if (['Kontrak', 'Berjalan', 'Selesai'].indexOf(p.Status) >= 0) aksi.push('<button class="btn out" data-x="surat">' + ms('description') + 'Buat surat (Tugas/BAST/BA)</button>');
  }
  side.innerHTML = '<div class="card"><div class="card-h"><div><h3>Tindakan</h3><p>Sesuai peran ' + esc(Sesi.boot.roleLabels[me.role]) + '</p></div></div><div class="list">' + (aksi.join('') || '<div class="empty" style="padding:12px">Tidak ada tindakan untuk status ini.</div>') + '</div></div>' +
    '<div class="card"><div class="card-h"><div><h3>Ringkasan</h3></div></div><dl class="kv" style="grid-template-columns:120px 1fr"><dt>Total RAB</dt><dd>' + fmt.rp(p.Total_RAB) + (p.Plafon ? '<div class="sub">plafon ' + fmt.rp(p.Plafon) + '</div>' : '') + '</dd><dt>Skor akhir</dt><dd>' + esc(p.Skor_Akhir || '-') + '</dd><dt>Verifikasi</dt><dd>' + badge(p.Status_Verifikasi) + '</dd><dt>Similarity</dt><dd>' + esc(p.Hasil_Cek_Similarity || '-') + '</dd><dt>Naskah anonim</dt><dd>' + (p.ID_File_Anonim ? badge('Tersedia', 'b-ok') : badge('Belum', 'b-warn')) + '</dd><dt>Tahun</dt><dd>' + esc(p.Tahun_Akademik + ' ' + (p.Semester || '')) + '</dd></dl></div>' +
    '<div class="card"><div class="card-h"><div><h3>Riwayat Status</h3></div></div><div class="timeline">' + d.riwayat.slice().reverse().map(r => '<div class="tl"><div class="dot">' + ms('radio_button_checked') + '</div><div><b>' + esc(r.Status) + '</b><small>' + fmt.tglw(r.Waktu) + (r.Oleh ? ' · ' + esc(r.Oleh) : '') + '</small>' + (r.Catatan ? '<div style="font-size:12.5px;margin-top:2px">' + esc(r.Catatan) + '</div>' : '') + '</div></div>').join('') + '</div></div>';
  const X = (k, f) => { const b = $('[data-x="' + k + '"]', side); if (b) b.onclick = f; };
  X('revisi', async () => { if (await konfirmasi('Kirim ' + (p.Status === 'Revisi' ? 'revisi ke reviewer' : 'perbaikan ke Admin LPPM') + '?')) { if (hasil(await api('proposal.revisi', { id: p.ID_Proposal }))) muat(); } });
  X('konf', async () => { if (hasil(await api('proposal.anggota.konfirmasi', { id: p.ID_Proposal }))) muat(); });
  X('tolakAng', async () => { if (await konfirmasi('Tolak keanggotaan?', { danger: true })) { if (hasil(await api('proposal.anggota.konfirmasi', { id: p.ID_Proposal, tolak: true }))) muat(); } });
  X('mulai', async () => { if (hasil(await api('proposal.verifikasi', { id: p.ID_Proposal, mulai: true }))) muat(); });
  X('lengkap', async () => { const v = await isian('Administrasi lengkap', [{ k: 'similarity', label: 'Hasil cek similarity', type: 'select', opts: Sesi.boot.opts.Hasil_Similarity, val: p.Hasil_Cek_Similarity }, { k: 'catatan', label: 'Catatan (opsional)', type: 'textarea' }], { note: 'Pastikan naskah anonim untuk reviewer sudah diunggah.' }); if (v && hasil(await api('proposal.verifikasi', { id: p.ID_Proposal, hasil: 'Lengkap', similarity: v.similarity, catatan: v.catatan }))) muat(); });
  X('perbaikan', async () => { const v = await isian('Kembalikan untuk perbaikan', [{ k: 'catatan', label: 'Catatan perbaikan untuk dosen', type: 'textarea', req: true, rows: 5 }], { ok: 'Kembalikan', danger: true }); if (v && hasil(await api('proposal.verifikasi', { id: p.ID_Proposal, hasil: 'Perlu Perbaikan', catatan: v.catatan }))) muat(); });
  X('anonim', async () => { const f = await pilihBerkas('application/pdf'); if (!f) return; const u = await unggah(f, { tabel: 'Proposal', id: p.ID_Proposal, kolom: 'ID_File_Anonim', anonim: true, wajibPdf: true }); if (hasil(u, 'Naskah anonim tersimpan.')) muat(); });
  X('sim', async () => { const v = await isian('Hasil cek similarity', [{ k: 'hasil', label: 'Hasil', type: 'select', opts: Sesi.boot.opts.Hasil_Similarity, val: p.Hasil_Cek_Similarity, req: true }]); if (v && hasil(await api('proposal.similarity', { id: p.ID_Proposal, hasil: v.hasil }))) muat(); });
  X('keputusan', async () => { const fin = d.review.filter(r => r.status === 'Final'); const v = await isian('Keputusan proposal', [{ k: 'keputusan', label: 'Keputusan', type: 'select', opts: ['Diterima', 'Revisi', 'Ditolak'], req: true }, { k: 'catatan', label: 'Catatan keputusan', type: 'textarea' }], { note: fin.length + '/' + d.review.length + ' reviewer final · rata-rata skor ' + (fin.length ? Math.round(fin.reduce((a, r) => a + Number(r.skor || 0), 0) / fin.length * 100) / 100 : '-') + (p.Perlu_Review_Tambahan === 'Ya' ? '<br><b>Perhatian:</b> selisih skor antar reviewer melebihi ambang — pertimbangkan reviewer tambahan.' : '') }); if (v && hasil(await api('proposal.keputusan', { id: p.ID_Proposal, keputusan: v.keputusan, catatan: v.catatan }))) muat(); });
  X('kontrak', async () => { if (await konfirmasi('Buat draf Kontrak dari templat? Dokumen menunggu pengesahan Ketua LPPM (Super Admin).')) { if (hasil(await api('dok.buat', { proposal: p.ID_Proposal, jenis: 'Kontrak' }))) muat(); } });
  X('surat', async () => { const v = await isian('Buat dokumen', [{ k: 'jenis', label: 'Jenis dokumen', type: 'select', opts: ['Surat Tugas', 'BAST', 'Berita Acara'], req: true }]); if (v && hasil(await api('dok.buat', { proposal: p.ID_Proposal, jenis: v.jenis }))) muat(); });
  // ---- Tab konten ----
  const tbs = [{ k: 'ring', l: 'Ringkasan', i: 'article' }, { k: 'tim', l: 'Tim', i: 'group' }, { k: 'rab', l: 'RAB', i: 'payments' }, { k: 'berkas', l: 'Berkas & Versi', i: 'folder' }];
  if (d.review.length || adm) tbs.push({ k: 'review', l: 'Review', i: 'rate_review' });
  if (pos >= 5 || d.dokumen.length) tbs.push({ k: 'pel', l: 'Pelaksanaan', i: 'task' });
  tabs($('#dTabs'), tbs, (k, b) => {
    if (k === 'ring') b.innerHTML = '<h3 style="margin:0 0 8px">Abstrak</h3><p style="white-space:pre-wrap;line-height:1.65">' + esc(p.Abstrak || '-') + '</p><dl class="kv" style="margin-top:14px"><dt>Bidang fokus</dt><dd>' + esc(p.Bidang_Fokus || '-') + '</dd><dt>Jenis kegiatan</dt><dd>' + esc(p.Jenis_Kegiatan || '-') + '</dd><dt>Mata kuliah terintegrasi</dt><dd>' + esc(p.Mata_Kuliah_Terintegrasi || '-') + '</dd><dt>Mitra</dt><dd>' + esc(p.ID_Mitra_nama || p.ID_Mitra || '-') + '</dd><dt>Sumber dana</dt><dd>' + esc(p.Sumber_Dana || '-') + '</dd><dt>Target luaran wajib</dt><dd>' + esc(p.Target_Luaran_Wajib || '-') + '</dd><dt>Melibatkan mahasiswa</dt><dd>' + esc(p.Melibatkan_Mahasiswa || '-') + '</dd></dl>';
    if (k === 'tim') tabel(b, { cols: [{ k: 'nama', l: 'Nama' }, { k: 'Peran', l: 'Peran' }, { k: 'NIM', l: 'NIM' }, { k: 'prodi', l: 'Prodi' }, { k: 'Status_Konfirmasi', l: 'Konfirmasi', r: r => badge(r.Status_Konfirmasi) }], rows: d.anggota, cari: false, nama: 'Tim_' + p.ID_Proposal });
    if (k === 'rab') tabel(b, { cols: [{ k: 'Kategori', l: 'Kategori' }, { k: 'Uraian', l: 'Uraian' }, { k: 'Volume', l: 'Vol', num: 1 }, { k: 'Satuan', l: 'Satuan' }, { k: 'Harga_Satuan', l: 'Harga', num: 1, r: r => fmt.rp(r.Harga_Satuan) }, { k: 'Subtotal', l: 'Subtotal', num: 1, r: r => fmt.rp(r.Subtotal) }], rows: d.rab, cari: false, nama: 'RAB_' + p.ID_Proposal, kosong: 'RAB belum diisi.' });
    if (k === 'berkas') { b.innerHTML = '<div class="list">' + (d.versi.slice().reverse().map(v => '<div class="file-row">' + ms(v.Anonim === 'Ya' ? 'visibility_off' : 'picture_as_pdf') + '<span class="grow"><b>' + esc(v.Nama) + '</b> <small class="sub">' + fmt.tglw(v.Waktu) + ' · ' + Math.round((Number(v.Ukuran) || 0) / 1024) + ' KB' + (v.Anonim === 'Ya' ? ' · untuk reviewer' : '') + '</small></span><button class="btn out xs" data-dl="' + esc(v.ID_File) + '">' + ms('download') + '</button></div>').join('') || '<div class="empty">' + ms('folder_off') + 'Belum ada berkas.</div>') + '</div>'; $$('[data-dl]', b).forEach(x => x.onclick = () => unduh(x.dataset.dl)); }
    if (k === 'review') {
      b.innerHTML = (d.review.length ? '<div class="grid g2">' + d.review.map(r => '<div class="card flat"><div class="card-h"><div><h3>' + esc(r.label) + (r.nama ? ' · ' + esc(r.nama) : '') + '</h3><p>Tenggat ' + fmt.tgl(r.tenggat) + '</p></div>' + badge(r.status) + '</div>' + (r.skor !== undefined && r.skor !== '' ? '<div style="font-size:28px;font-weight:800">' + esc(r.skor) + '<small style="font-size:13px;color:var(--muted)"> / 100</small></div>' : '') + (r.rekomendasi ? '<div style="margin:6px 0">' + badge(r.rekomendasi) + '</div>' : '') + (r.catatan ? '<p style="white-space:pre-wrap;font-size:13px">' + esc(r.catatan) + '</p>' : '') + (r.rinci ? '<details><summary style="cursor:pointer;font-size:13px">Rincian per kriteria</summary><div class="list" style="margin-top:8px">' + r.rinci.map(n => '<div class="li"><div class="grow"><b>' + esc(n.kriteria || '-') + (n.skor !== undefined ? ' · ' + esc(n.skor) : '') + '</b><small>' + esc(n.catatan || '') + '</small></div></div>').join('') + '</div></details>' : '') + (sa && r.ID_Plot && r.status === 'Final' ? '<button class="btn ghost xs" data-kor="' + esc(r.ID_Plot) + '" style="margin-top:8px">' + ms('edit') + 'Koreksi skor</button>' : '') + (adm && r.ID_Plot && r.status !== 'Final' ? '<button class="btn ghost xs" data-hp="' + esc(r.ID_Plot) + '" style="margin-top:8px;color:var(--bad)">' + ms('person_remove') + 'Batalkan penugasan</button>' : '') + '</div>').join('') + '</div>' : kosong('rate_review', Sesi.me.role === 'DS' ? 'Catatan reviewer tampil setelah keputusan ditetapkan.' : 'Belum ada reviewer.'));
      $$('[data-hp]', b).forEach(x => x.onclick = async () => { if (await konfirmasi('Batalkan penugasan reviewer ini?', { danger: true })) { if (hasil(await api('plot.hapus', { id: x.dataset.hp }))) muat(); } });
      $$('[data-kor]', b).forEach(x => x.onclick = () => koreksiSkor(x.dataset.kor, d, muat));
    }
    if (k === 'pel') {
      b.innerHTML = '<h3>Dokumen</h3><div id="pDok"></div><h3 style="margin-top:18px">Termin dana</h3><div id="pTrm"></div><h3 style="margin-top:18px">Logbook</h3><div id="pLog"></div><h3 style="margin-top:18px">Laporan</h3><div id="pLap"></div><h3 style="margin-top:18px">Luaran</h3><div id="pLua"></div><h3 style="margin-top:18px">Monev</h3><div id="pMon"></div>';
      tabel($('#pDok', b), { cols: [{ k: 'Jenis_Dokumen', l: 'Jenis' }, { k: 'Nomor_Surat', l: 'Nomor' }, { k: 'Tgl_Terbit', l: 'Terbit', r: r => fmt.tgl(r.Tgl_Terbit) }, { k: 'Status', l: 'Status', r: r => badge(r.Status) }], rows: d.dokumen, cari: false, unduh: false, aksi: r => r.ID_File_PDF ? '<button class="btn out xs" data-a="dl">' + ms('download') + '</button>' : '', onAksi: (a, r) => unduh(r.ID_File_PDF), kosong: 'Belum ada dokumen.' });
      tabel($('#pTrm', b), { cols: [{ k: 'Termin_Ke', l: 'Termin' }, { k: 'Persentase', l: '%' }, { k: 'Nominal', l: 'Nominal', num: 1, r: r => fmt.rp(r.Nominal) }, { k: 'Syarat_Pencairan', l: 'Syarat' }, { k: 'Status', l: 'Status', r: r => badge(r.Status) }, { k: 'Tgl_Cair', l: 'Cair', r: r => fmt.tgl(r.Tgl_Cair) }], rows: d.termin, cari: false, unduh: false, kosong: 'Termin dibuat saat kontrak disahkan.' });
      tabel($('#pLog', b), { cols: [{ k: 'Tanggal', l: 'Tanggal', r: r => fmt.tgl(r.Tanggal) }, { k: 'Kegiatan', l: 'Kegiatan' }, { k: 'Persentase_Progres', l: 'Progres %', num: 1 }, { k: 'Status_Verifikasi', l: 'Verifikasi', r: r => badge(r.Status_Verifikasi) }], rows: d.logbook, cari: false, unduh: false, per: 5 });
      tabel($('#pLap', b), { cols: [{ k: 'Jenis', l: 'Jenis' }, { k: 'Periode', l: 'Periode' }, { k: 'Status', l: 'Status', r: r => badge(r.Status) }, { k: 'Catatan_Admin', l: 'Catatan' }], rows: d.laporan, cari: false, unduh: false, aksi: r => (r.ID_File ? '<button class="btn out xs" data-a="dl">' + ms('download') + '</button> ' : '') + (adm && r.Status === 'Diajukan' ? '<button class="btn ok xs" data-a="ok">Setujui</button> <button class="btn warn xs" data-a="rev">Revisi</button>' : ''), onAksi: (a, r) => aksiLaporan(a, r, muat) });
      tabel($('#pLua', b), { cols: [{ k: 'Jenis', l: 'Jenis' }, { k: 'Judul', l: 'Judul' }, { k: 'Tahun', l: 'Tahun' }, { k: 'Status_Verifikasi', l: 'Verifikasi', r: r => badge(r.Status_Verifikasi) }], rows: d.luaran, cari: false, unduh: false });
      tabel($('#pMon', b), { cols: [{ k: 'Tgl_Monev', l: 'Tanggal', r: r => fmt.tgl(r.Tgl_Monev) }, { k: 'Metode', l: 'Metode' }, { k: 'petugas', l: 'Petugas' }, { k: 'Skor_Monev', l: 'Skor' }, { k: 'Status', l: 'Status', r: r => badge(r.Status) }], rows: d.monev, cari: false, unduh: false });
    }
  });
}
async function aksiLaporan(a, r, segar) {
  if (a === 'dl') return unduh(r.ID_File);
  if (a === 'ok') { if (hasil(await api('laporan.setujui', { id: r.ID, status: 'Disetujui' }))) segar(); }
  if (a === 'rev') { const v = await isian('Laporan perlu revisi', [{ k: 'catatan', label: 'Catatan revisi', type: 'textarea', req: true }]); if (v && hasil(await api('laporan.setujui', { id: r.ID, status: 'Perlu Revisi', catatan: v.catatan }))) segar(); }
}
async function koreksiSkor(idPlot, d, segar) {
  const rv = d.review.find(r => r.ID_Plot === idPlot);
  const fields = d.rubrik.map(r => ({ k: r.ID_Rubrik, label: r.Kriteria + ' (bobot ' + r.Bobot + ', maks ' + r.Skor_Maks + ')', type: 'number', val: ((rv.rinci || []).find(n => n.kriteria === r.Kriteria) || {}).skor }));
  const v = await isian('Koreksi skor · ' + rv.label, fields.concat([{ k: '_alasan', label: 'Alasan koreksi (tercatat di audit log)', type: 'textarea', req: true }]), { size: 'lg' });
  if (!v) return;
  const nilai = d.rubrik.map(r => ({ ID_Kriteria: r.ID_Rubrik, Skor: v[r.ID_Rubrik], Catatan_Per_Kriteria: ((rv.rinci || []).find(n => n.kriteria === r.Kriteria) || {}).catatan || '' }));
  if (hasil(await api('review.koreksi', { id: idPlot, nilai, catatanUmum: rv.catatan, rekomendasi: rv.rekomendasi, alasan: v._alasan }))) segar();
}

// ===================== REVIEW =====================
Router.add('/review', async (view) => {
  const hidup = stempel(view), rv = Sesi.me.role === 'RV';
  judul(view, { title: T('Review'), desc: rv ? 'Penugasan blind review Anda. Identitas pengusul disembunyikan.' : 'Ploting reviewer, beban kerja, dan progres penilaian.' });
  const host = document.createElement('div'); view.appendChild(host); host.innerHTML = kerangkaMuat(1);
  if (rv) {
    return swr('review.tugas', {}, (rows, c, err) => {
      if (!hidup()) return; if (err) { host.innerHTML = kosong('error', esc(err)); return; }
      host.innerHTML = '<div class="card"></div>';
      tabel($('.card', host), { rows, nama: 'Tugas_Review', filter: [{ k: 'Status_Review', l: 'Status', opts: Sesi.boot.opts.Status_Review }], cols: [{ k: 'ID_Proposal', l: 'Kode', r: r => '<span class="id">' + esc(r.ID_Proposal) + '</span>' }, { k: 'Judul', l: 'Judul', r: r => '<div class="ttl">' + esc(r.Judul) + '</div><div class="sub">' + esc((r.Nama_Skema || '') + ' · ' + (r.Bidang_Fokus || '')) + '</div>' }, { k: 'Tenggat_Review', l: 'Tenggat', r: r => fmt.tgl(r.Tenggat_Review) + (r.Status_Review !== 'Final' ? ' <span class="badge ' + (r.sisaHari < 0 ? 'b-bad' : r.sisaHari <= 3 ? 'b-warn' : 'b-info') + '">' + fmt.hari(r.sisaHari) + '</span>' : '') }, { k: 'Status_Review', l: 'Status', r: r => badge(r.Status_Review) }, { k: 'Skor_Total', l: 'Skor', num: 1 }], onRow: r => nav('review/' + r.ID_Plot), kosong: 'Belum ada penugasan.' });
    });
  }
  const [beban, prop] = await Promise.all([apiQ('plot.beban', {}), apiQ('proposal.list', {})]);
  if (!hidup()) return;
  const ps = prop.success ? prop.data : [];
  host.innerHTML = '<div class="grid g-main"><div class="grid"><div class="card"><div class="card-h"><div><h3>Perlu diplot</h3><p>Lolos verifikasi administrasi, reviewer belum cukup</p></div></div><div id="tPlot"></div></div><div class="card"><div class="card-h"><div><h3>Sedang direview</h3><p>Progres penilaian & keputusan</p></div></div><div id="tRev"></div></div></div><div class="card"><div class="card-h"><div><h3>Beban Reviewer</h3><p>Aktif / kuota</p></div></div><div id="tBeban"></div></div></div>';
  tabel($('#tPlot'), { rows: ps.filter(p => (p.Status === 'Verifikasi Admin' && p.Status_Verifikasi === 'Terverifikasi')), cari: false, unduh: false, cols: [{ k: 'Judul', l: 'Proposal', r: r => '<div class="ttl">' + esc(r.Judul) + '</div><div class="sub">' + esc(r.ID_Proposal + ' · ' + r.Bidang_Fokus) + '</div>' }, { k: 'reviewer', l: 'Reviewer', num: 1 }, { k: 'adaAnonim', l: 'Anonim', r: r => r.adaAnonim ? badge('Siap', 'b-ok') : badge('Belum', 'b-warn') }], aksi: r => '<a class="btn sm" href="#/plot/' + esc(r.ID_Proposal) + '">' + ms('group_add') + 'Plot</a>', kosong: 'Tidak ada proposal yang menunggu ploting.' });
  tabel($('#tRev'), { rows: ps.filter(p => p.Status === 'Dalam Review'), cari: false, cols: [{ k: 'Judul', l: 'Proposal', r: r => '<div class="ttl">' + esc(r.Judul) + '</div><div class="sub">' + esc(r.ID_Proposal) + '</div>' }, { k: 'reviewerFinal', l: 'Final', r: r => r.reviewerFinal + '/' + r.reviewer + '<div class="bar ' + (r.reviewerFinal === r.reviewer ? 'green' : '') + '" style="width:80px"><i style="width:' + (r.reviewer ? r.reviewerFinal / r.reviewer * 100 : 0) + '%"></i></div>' }, { k: 'Skor_Akhir', l: 'Rata-rata', num: 1 }, { k: 'Perlu_Review_Tambahan', l: 'Selisih', r: r => r.Perlu_Review_Tambahan === 'Ya' ? badge('Melebihi ambang', 'b-bad') : '-' }], onRow: r => nav('proposal/' + r.ID_Proposal), nama: 'Dalam_Review' });
  tabel($('#tBeban'), { rows: beban.success ? beban.data : [], cari: false, unduh: false, per: 20, cols: [{ k: 'nama', l: 'Reviewer', r: r => '<b>' + esc(r.nama) + '</b><div class="sub">' + esc(r.jenis + (r.bidang ? ' · ' + r.bidang : '')) + '</div>' }, { k: 'aktif', l: 'Aktif', r: r => r.aktif + '/' + r.kuota + (r.terlambat ? ' <span class="badge b-bad">' + r.terlambat + ' telat</span>' : '') }, { k: 'final', l: 'Final', num: 1 }] });
}, { roles: 'SA AD RV', menu: 'review' });

Router.add('/review/:id', async (view, params) => {
  const hidup = stempel(view);
  view.innerHTML = kerangkaMuat(1);
  const r = await api('review.buka', { id: params.id });
  if (!hidup()) return;
  if (!r.success) { view.innerHTML = kosong('lock', esc(r.message)); return; }
  const { plot, proposal: p, rubrik } = r.data, nilai = {};
  r.data.nilai.forEach(n => { nilai[n.ID_Kriteria] = n; });
  const umum = r.data.nilai[0] || {}, final = plot.Status_Review === 'Final';
  view.innerHTML = '';
  judul(view, { crumb: [['Review', 'review'], [p.ID_Proposal]], title: 'Penilaian proposal ' + p.ID_Proposal, desc: 'Blind review · tenggat ' + fmt.tgl(plot.Tenggat_Review) + ' · ' + badge(plot.Status_Review) });
  view.insertAdjacentHTML('beforeend', '<div class="two"><div class="grid"><div class="card"><div class="card-h"><div><h3>' + esc(p.Judul) + '</h3><p>' + esc(p.Nama_Skema + ' · ' + (p.Jenis || '') + ' · ' + (p.Bidang_Fokus || '')) + '</p></div></div><div class="note info">' + ms('visibility_off') + '<div>Identitas pengusul disembunyikan untuk menjaga objektivitas penilaian.</div></div>' +
    '<button class="btn" id="bPdf" style="margin:14px 0"' + (plot.ID_File_Anonim ? '' : ' disabled') + '>' + ms('picture_as_pdf') + 'Buka naskah (PDF anonim)</button><h4 style="margin:6px 0">Abstrak</h4><p style="white-space:pre-wrap;line-height:1.65;font-size:13.5px">' + esc(p.Abstrak || '-') + '</p><dl class="kv"><dt>Total RAB</dt><dd>' + fmt.rp(p.Total_RAB) + (p.Plafon ? ' / plafon ' + fmt.rp(p.Plafon) : '') + '</dd><dt>Target luaran wajib</dt><dd>' + esc(p.Target_Luaran_Wajib || '-') + '</dd></dl></div></div>' +
    '<div class="card" id="rForm"><div class="card-h"><div><h3>Rubrik penilaian</h3><p>Skor terbobot dihitung otomatis</p></div><div style="text-align:right"><small class="sub">Total</small><div id="rTot" style="font-size:30px;font-weight:800;color:var(--primary)">0</div></div></div>' +
    rubrik.map(k => '<div class="card flat" style="margin-bottom:10px;padding:14px"><div style="display:flex;justify-content:space-between;gap:10px"><b>' + esc(k.Kriteria) + '</b><span class="badge b-info">bobot ' + esc(k.Bobot) + '%</span></div><div style="display:flex;gap:10px;align-items:center;margin-top:8px"><input type="range" min="0" max="' + esc(k.Skor_Maks) + '" step="1" data-rg="' + esc(k.ID_Rubrik) + '" value="' + esc((nilai[k.ID_Rubrik] || {}).Skor || 0) + '" style="flex:1"' + (final ? ' disabled' : '') + '><input class="inp" type="number" min="0" max="' + esc(k.Skor_Maks) + '" data-sk="' + esc(k.ID_Rubrik) + '" value="' + esc((nilai[k.ID_Rubrik] || {}).Skor === undefined ? '' : nilai[k.ID_Rubrik].Skor) + '" style="width:80px"' + (final ? ' disabled' : '') + '><small>/ ' + esc(k.Skor_Maks) + '</small></div><textarea class="inp" data-ct="' + esc(k.ID_Rubrik) + '" rows="2" placeholder="Catatan untuk kriteria ini" style="margin-top:8px"' + (final ? ' disabled' : '') + '>' + esc((nilai[k.ID_Rubrik] || {}).Catatan_Per_Kriteria || '') + '</textarea></div>').join('') +
    '<div class="field"><label>Catatan umum untuk pengusul (min. 20 karakter)</label><textarea class="inp" id="rUmum" rows="4"' + (final ? ' disabled' : '') + '>' + esc(umum.Catatan_Umum || '') + '</textarea></div><div class="field" style="margin-top:10px"><label>Rekomendasi</label><select class="inp" id="rRek"' + (final ? ' disabled' : '') + '><option value="">— pilih —</option>' + Sesi.boot.opts.Rekomendasi.map(o => '<option' + (o === umum.Rekomendasi ? ' selected' : '') + '>' + o + '</option>').join('') + '</select></div>' +
    (final ? '<div class="note ok" style="margin-top:14px">' + ms('lock') + '<div>Penilaian sudah final dan terkunci.</div></div>' : '<div class="acts" style="margin-top:16px;display:flex;justify-content:flex-end"><button class="btn out" id="rDraf">' + ms('save') + 'Simpan draf</button><button class="btn ok" id="rKirim">' + ms('send') + 'Kirim final</button></div>') + '</div></div>');
  const hitung = () => { let t = 0; rubrik.forEach(k => { const v = Number($('[data-sk="' + k.ID_Rubrik + '"]').value); if (!isNaN(v)) t += Math.min(v, Number(k.Skor_Maks)) / (Number(k.Skor_Maks) || 100) * Number(k.Bobot); }); $('#rTot').textContent = Math.round(t * 100) / 100; };
  $$('[data-rg]').forEach(x => x.oninput = () => { $('[data-sk="' + x.dataset.rg + '"]').value = x.value; hitung(); });
  $$('[data-sk]').forEach(x => x.oninput = () => { $('[data-rg="' + x.dataset.sk + '"]').value = x.value; hitung(); });
  hitung();
  $('#bPdf').onclick = () => unduh(plot.ID_File_Anonim, 'Naskah_' + p.ID_Proposal + '.pdf');
  const data = () => ({ id: plot.ID_Plot, nilai: rubrik.map(k => ({ ID_Kriteria: k.ID_Rubrik, Skor: $('[data-sk="' + k.ID_Rubrik + '"]').value, Catatan_Per_Kriteria: $('[data-ct="' + k.ID_Rubrik + '"]').value })), catatanUmum: $('#rUmum').value, rekomendasi: $('#rRek').value });
  if ($('#rDraf')) $('#rDraf').onclick = async () => hasil(await api('review.simpan', data()));
  if ($('#rKirim')) $('#rKirim').onclick = async () => { if (!(await konfirmasi('Kirim penilaian final? Setelah dikirim, nilai <b>tidak dapat diubah</b>.', { ok: 'Kirim final' }))) return; if (hasil(await api('review.kirim', data()))) nav('review'); };
}, { roles: 'RV', menu: 'review' });

Router.add('/plot/:id', async (view, params) => {
  const hidup = stempel(view), id = params.id;
  view.innerHTML = kerangkaMuat(1);
  const [s, d] = await Promise.all([apiQ('plot.saran', { id }), apiQ('proposal.detail', { id })]);
  if (!hidup()) return;
  if (!s.success || !d.success) { view.innerHTML = kosong('error', esc((s.success ? d : s).message)); return; }
  const p = d.data.proposal, pilih = {}; s.data.saran.forEach(x => { pilih[x] = 1; });
  view.innerHTML = '';
  judul(view, { crumb: [['Review', 'review'], [p.ID_Proposal, 'proposal/' + p.ID_Proposal], ['Ploting']], title: 'Plot reviewer', desc: esc(p.Judul) + ' · bidang <b>' + esc(p.Bidang_Fokus || '-') + '</b> · minimal ' + s.data.min + ' reviewer' });
  const tg = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
  view.insertAdjacentHTML('beforeend', '<div class="card"><div class="note info" style="margin-bottom:12px">' + ms('auto_awesome') + '<div>Saran otomatis memilih reviewer tanpa konflik kepentingan, beban di bawah kuota, dan kecocokan bidang tertinggi. Reviewer berkonflik tidak dapat dipilih.</div></div><div id="tRv"></div><div class="toolbar" style="margin-top:14px"><div class="field" style="max-width:220px"><label>Tenggat review</label><input class="inp" type="date" id="pTg" value="' + tg + '" min="' + new Date().toISOString().slice(0, 10) + '"></div><span class="spacer"></span><button class="btn" id="pSimpan">' + ms('send') + 'Tugaskan reviewer terpilih</button></div></div>');
  tabel($('#tRv'), { rows: s.data.reviewer, cari: true, unduh: false, per: 25, cols: [{ k: 'pilih', l: '', nosort: 1, r: r => r.sudah ? badge('Ditugaskan', 'b-ok') : '<input type="checkbox" data-rv="' + esc(r.id) + '"' + (pilih[r.id] ? ' checked' : '') + (r.konflik ? ' disabled' : '') + '>' }, { k: 'nama', l: 'Reviewer', r: r => '<b>' + esc(r.nama) + '</b><div class="sub">' + esc(r.jenis + ' · ' + (r.prodi || '-')) + '</div>' }, { k: 'bidang', l: 'Bidang keahlian' }, { k: 'cocok', l: 'Kecocokan', r: r => '<div class="bar ' + (r.cocok >= 50 ? 'green' : r.cocok >= 20 ? '' : 'amber') + '" style="width:90px"><i style="width:' + r.cocok + '%"></i></div><small>' + r.cocok + '%</small>' }, { k: 'aktif', l: 'Beban', r: r => '<span class="badge ' + (r.aktif >= r.kuota ? 'b-bad' : 'b-gray') + '">' + r.aktif + '/' + r.kuota + '</span>' }, { k: 'konflik', l: 'Konflik', r: r => r.konflik ? badge(r.konflik, 'b-bad') : '-' }] });
  $('#tRv').addEventListener('change', e => { if (e.target.dataset.rv) pilih[e.target.dataset.rv] = e.target.checked; });
  $('#pSimpan').onclick = async () => { const ids = Object.keys(pilih).filter(k => pilih[k] && !s.data.reviewer.find(r => r.id === k).sudah); if (!ids.length) return toast('Pilih minimal satu reviewer.', 'warn'); const r = await api('plot.simpan', { id, reviewer: ids, tenggat: $('#pTg').value }); if (hasil(r)) nav('proposal/' + id); };
}, { roles: 'SA AD', menu: 'review' });

// ===================== KONTRAK & SURAT =====================
Router.add('/dokumen', async (view) => {
  const hidup = stempel(view), adm = Sesi.punya('SA AD'), sa = Sesi.punya('SA');
  judul(view, { title: T('Kontrak & Surat'), desc: 'Dokumen bernomor otomatis dengan QR verifikasi publik.', acts: adm ? '<button class="btn" id="bDok">' + ms('add') + 'Buat dokumen</button>' : '' });
  const host = document.createElement('div'); host.className = 'card'; view.appendChild(host);
  const tb = sa ? [{ k: 'dok', l: 'Dokumen', i: 'description' }, { k: 'tpl', l: 'Templat Docs', i: 'edit_document' }] : [{ k: 'dok', l: 'Dokumen', i: 'description' }];
  tabs(host, tb, async (k, b) => {
    const h2 = stempel(b);
    if (k === 'tpl') { const r = await api('dok.templat', {}); if (!h2()) return; b.innerHTML = r.success ? '<div class="note info" style="margin-bottom:12px">' + ms('info') + '<div>Ubah tata letak dokumen langsung di Google Docs. Placeholder seperti <code>{{NOMOR}}</code>, <code>{{JUDUL}}</code>, <code>{{KETUA}}</code>, <code>{{QR}}</code> akan diganti otomatis.</div></div><div class="list">' + r.data.map(t => '<div class="li">' + ms('article') + '<div class="grow"><b>' + esc(t.jenis) + '</b><small>' + (t.id ? 'Templat terpasang' : 'Belum ada — jalankan setup') + '</small></div>' + (t.url ? '<a class="btn out sm" target="_blank" rel="noopener" href="' + esc(t.url) + '">' + ms('open_in_new') + 'Buka</a>' : '') + '</div>').join('') + '</div>' : kosong('error', esc(r.message)); return; }
    const muat = (rows) => {
      if (!h2()) return;
      b.innerHTML = '';
      tabel(b, { rows, nama: 'Dokumen', filter: [{ k: 'Jenis_Dokumen', l: 'Jenis', opts: Sesi.boot.opts.Jenis_Dokumen }, { k: 'Status', l: 'Status', opts: Sesi.boot.opts.Status_Dokumen }], cols: [{ k: 'Jenis_Dokumen', l: 'Jenis' }, { k: 'Nomor_Surat', l: 'Nomor', r: r => r.Nomor_Surat ? '<span class="id">' + esc(r.Nomor_Surat) + '</span>' : '<span class="sub">belum bernomor</span>' }, { k: 'Judul', l: 'Kegiatan', r: r => '<div class="ttl">' + esc(r.Judul || '') + '</div><div class="sub">' + esc(r.ID_Proposal + (r.Ketua ? ' · ' + r.Ketua : '')) + '</div>' }, { k: 'Tgl_Terbit', l: 'Terbit', r: r => fmt.tgl(r.Tgl_Terbit) }, { k: 'Status', l: 'Status', r: r => badge(r.Status) }],
        aksi: r => (r.ID_File_PDF ? '<button class="btn out xs" data-a="dl" title="Unduh PDF">' + ms('download') + '</button> ' : '') + (r.url && r.Status === 'Terbit' ? '<button class="btn ghost xs" data-a="qr" title="Salin tautan verifikasi">' + ms('qr_code_2') + '</button> ' : '') + (sa && r.Status === 'Menunggu Pengesahan' ? '<button class="btn ok xs" data-a="sah">' + ms('verified') + 'Sahkan</button> ' : '') + (sa && r.Status === 'Terbit' ? '<button class="btn ghost xs" data-a="tarik" style="color:var(--bad)">Tarik</button>' : ''),
        onAksi: async (a, r) => {
          if (a === 'dl') unduh(r.ID_File_PDF);
          if (a === 'qr') { try { await navigator.clipboard.writeText(r.url); toast('Tautan verifikasi disalin.', 'ok'); } catch (e) { isian('Tautan verifikasi', [{ k: 'u', label: 'Salin tautan ini', val: r.url }]); } }
          if (a === 'sah' && await konfirmasi('Sahkan ' + esc(r.Jenis_Dokumen) + ' untuk <b>' + esc(r.Judul) + '</b>? Nomor surat, QR, dan tanda tangan elektronik akan dibubuhkan.', { ok: 'Sahkan' })) { if (hasil(await api('dok.sahkan', { id: r.ID }))) segar(); }
          if (a === 'tarik') { const v = await isian('Tarik dokumen', [{ k: 'alasan', label: 'Alasan penarikan', type: 'textarea', req: true }], { ok: 'Tarik', danger: true }); if (v && hasil(await api('dok.tarik', { id: r.ID, alasan: v.alasan }))) segar(); }
        }, kosong: 'Belum ada dokumen.'
      });
    };
    const segar = () => swr('dok.list', {}, (d, c, e) => e ? (b.innerHTML = kosong('error', esc(e))) : muat(d), { fresh: true });
    await swr('dok.list', {}, (d, c, e) => e ? (b.innerHTML = kosong('error', esc(e))) : muat(d));
  });
  if ($('#bDok')) $('#bDok').onclick = async () => {
    const ps = await Ref.get('proposal');
    const v = await isian('Buat dokumen', [{ k: 'proposal', label: 'Proposal', type: 'select', opts: ps.map(p => ({ v: p.id, l: p.id + ' · ' + p.nama + ' (' + p.sub + ')' })), req: true }, { k: 'jenis', label: 'Jenis dokumen', type: 'select', opts: Sesi.boot.opts.Jenis_Dokumen, req: true }], { note: 'Kontrak untuk proposal berstatus Diterima; surat lain setelah kontrak. Dokumen menunggu pengesahan Super Admin.' });
    if (v && hasil(await api('dok.buat', v))) Router.go();
  };
}, { roles: 'SA AD DS PM LPM', menu: 'dokumen' });

// ===================== LOGBOOK & LAPORAN =====================
Router.add('/logbook', async (view) => {
  const adm = Sesi.punya('SA AD');
  judul(view, { title: T('Logbook & Laporan'), desc: 'Catatan kegiatan, laporan kemajuan/akhir, dan repositori luaran.' });
  const host = document.createElement('div'); host.className = 'card'; view.appendChild(host);
  tabs(host, [{ k: 'log', l: 'Logbook', i: 'edit_note' }, { k: 'lap', l: 'Laporan', i: 'summarize' }, { k: 'lua', l: 'Luaran', i: 'workspace_premium' }], (k, b) => {
    if (k === 'log') crud(b, 'Logbook', { form: { wajib: 'ID_Proposal Tanggal Kegiatan Persentase_Progres', catatan: 'Isi minimal 2 minggu sekali. Unggah bukti (foto/dokumen) bila ada.' }, filter: [{ k: 'Status_Verifikasi', l: 'Verifikasi', opts: Sesi.boot.opts.Status_Verifikasi }] });
    if (k === 'lap') crud(b, 'Laporan', { form: { wajib: 'ID_Proposal Jenis ID_File', kecuali: adm ? [] : ['Status', 'Catatan_Admin'] }, filter: [{ k: 'Jenis', l: 'Jenis', opts: Sesi.boot.opts.Jenis_Laporan }, { k: 'Status', l: 'Status', opts: Sesi.boot.opts.Status_Laporan }], tanpaBulk: true, aksiTambahan: r => adm && r.Status === 'Diajukan' ? '<button class="btn ok xs" data-a="ok">Setujui</button> <button class="btn warn xs" data-a="rev">Revisi</button> ' : '', onAksi: (a, r, segar) => aksiLaporan(a, r, segar) });
    if (k === 'lua') crud(b, 'Luaran', { form: { wajib: 'Jenis Judul Tahun' }, filter: [{ k: 'Jenis', l: 'Jenis', opts: Sesi.boot.opts.Jenis_Luaran }, { k: 'Status_Verifikasi', l: 'Verifikasi', opts: Sesi.boot.opts.Status_Verifikasi }] });
  });
}, { roles: 'SA AD DS LPM PM', menu: 'logbook' });

// ===================== MONEV =====================
Router.add('/monev', async (view) => {
  judul(view, { title: T('Monev'), desc: 'Jadwal dan hasil monitoring & evaluasi kegiatan.' });
  const host = document.createElement('div'); host.className = 'card'; view.appendChild(host);
  crud(host, 'Monev', { form: { wajib: 'ID_Proposal Tgl_Monev Metode ID_Petugas' }, filter: [{ k: 'Status', l: 'Status', opts: Sesi.boot.opts.Status_Monev }, { k: 'Metode', l: 'Metode', opts: Sesi.boot.opts.Metode_Monev }] });
}, { menu: 'monev' });

// ===================== ANGGARAN & TERMIN =====================
Router.add('/anggaran', async (view) => {
  const hidup = stempel(view), adm = Sesi.punya('SA AD'), pm = Sesi.me.role === 'PM';
  judul(view, { title: T('Anggaran & Termin'), desc: 'Pencairan bertahap, SPJ, dan realisasi per butir RAB.' });
  const host = document.createElement('div'); host.className = 'card'; view.appendChild(host);
  tabs(host, [{ k: 'trm', l: 'Termin & Realisasi', i: 'account_balance_wallet' }].concat(pm ? [] : [{ k: 'spj', l: 'SPJ & Bukti', i: 'receipt_long' }]), async (k, b) => {
    const h2 = stempel(b);
    if (k === 'spj') return crud(b, 'SPJ_Bukti', { tanpaBulk: true, form: { wajib: 'ID_Proposal ID_Termin ID_RAB_Item Tgl_Transaksi Uraian Nominal ID_File_Kuitansi', kecuali: ['Status_Verifikasi', 'Catatan_Admin'] }, filter: [{ k: 'Status_Verifikasi', l: 'Status', opts: Sesi.boot.opts.Status_SPJ }],
      aksiTambahan: r => adm && r.Status_Verifikasi === 'Menunggu' ? '<button class="btn ok xs" data-a="terima">Terima</button> <button class="btn warn xs" data-a="tolak">Tolak</button> ' : '',
      onAksi: async (a, r, segar) => { if (a === 'terima') { if (hasil(await api('spj.verifikasi', { id: r.ID, status: 'Terverifikasi' }))) segar(); } if (a === 'tolak') { const v = await isian('Tolak SPJ', [{ k: 'catatan', label: 'Alasan / kekurangan', type: 'textarea', req: true }], { ok: 'Tolak', danger: true }); if (v && hasil(await api('spj.verifikasi', { id: r.ID, status: 'Ditolak', catatan: v.catatan }))) segar(); } } });
    const gambar = rows => {
      if (!h2()) return;
      if (!rows.length) { b.innerHTML = kosong('account_balance_wallet', 'Belum ada kegiatan berkontrak.'); return; }
      b.innerHTML = rows.map((p, i) => { const pc = p.Total_RAB ? Math.round(p.cair / p.Total_RAB * 100) : 0, rs = p.cair ? Math.round(p.totalRealisasi / p.cair * 100) : 0;
        return '<div class="card flat" style="margin-bottom:14px"><div class="card-h"><div><h3>' + esc(p.Judul) + '</h3><p>' + esc(p.ID_Proposal + ' · ' + p.Ketua + ' · ' + (p.Prodi_nama || '')) + '</p></div>' + badge(p.Status) + '</div><div class="grid g3"><div><small class="sub">Total kontrak</small><div style="font-size:20px;font-weight:800">' + fmt.rp(p.Total_RAB) + '</div></div><div><small class="sub">Sudah cair (' + pc + '%)</small><div style="font-size:20px;font-weight:800">' + fmt.rp(p.cair) + '</div><div class="bar teal"><i style="width:' + pc + '%"></i></div></div>' + (pm ? '' : '<div><small class="sub">Realisasi SPJ (' + rs + '% dari cair)</small><div style="font-size:20px;font-weight:800">' + fmt.rp(p.totalRealisasi) + '</div><div class="bar ' + (rs > 100 ? 'red' : 'green') + '"><i style="width:' + Math.min(100, rs) + '%"></i></div></div>') + '</div>' +
          (p.lebihPagu ? '<div class="note bad" style="margin-top:10px">' + ms('warning') + '<div>' + p.lebihPagu + ' butir RAB melebihi pagu.</div></div>' : '') + '<div id="trm' + i + '" style="margin-top:12px"></div>' + (pm ? '' : '<details style="margin-top:10px"><summary style="cursor:pointer;font-weight:600">Realisasi per butir RAB</summary><div id="rl' + i + '" style="margin-top:8px"></div></details>') + '</div>'; }).join('');
      rows.forEach((p, i) => {
        tabel($('#trm' + i, b), { rows: p.termin, cari: false, unduh: false, cols: [{ k: 'Termin_Ke', l: 'Termin' }, { k: 'Persentase', l: '%' }, { k: 'Nominal', l: 'Nominal', num: 1, r: r => fmt.rp(r.Nominal) }, { k: 'Syarat_Pencairan', l: 'Syarat' }, { k: 'Status', l: 'Status', r: r => badge(r.Status) }, { k: 'Tgl_Cair', l: 'Cair', r: r => r.Tgl_Cair ? fmt.tgl(r.Tgl_Cair) + '<div class="sub">' + esc(r.Nomor_Bukti_Cair || '') + '</div>' : '-' }],
          aksi: r => adm && r.Status === 'Siap Cair' ? '<button class="btn ok xs" data-a="cair">' + ms('payments') + 'Cairkan</button>' : '', onAksi: async (a, r) => { const v = await isian('Catat pencairan termin ' + r.Termin_Ke, [{ k: 'tanggal', label: 'Tanggal cair', type: 'date', val: new Date().toISOString().slice(0, 10), req: true }, { k: 'nomor', label: 'Nomor bukti pencairan', req: true }], { note: 'Nominal: <b>' + fmt.rp(r.Nominal) + '</b>' }); if (v && hasil(await api('termin.cair', { id: r.ID_Termin, tanggal: v.tanggal, nomor: v.nomor }))) segar(); } });
        if (!pm) tabel($('#rl' + i, b), { rows: p.realisasi, cari: false, nama: 'Realisasi_' + p.ID_Proposal, cols: [{ k: 'Kategori', l: 'Kategori' }, { k: 'Uraian', l: 'Uraian' }, { k: 'Pagu', l: 'Pagu', num: 1, r: r => fmt.rp(r.Pagu) }, { k: 'Realisasi', l: 'Realisasi', num: 1, r: r => '<span style="color:' + (r.Lebih ? 'var(--bad)' : 'inherit') + '">' + fmt.rp(r.Realisasi) + '</span>' }] });
      });
    };
    const segar = () => swr('termin.list', {}, (d, c, e) => e ? (b.innerHTML = kosong('error', esc(e))) : gambar(d), { fresh: true });
    await swr('termin.list', {}, (d, c, e) => e ? (b.innerHTML = kosong('error', esc(e))) : gambar(d));
  });
}, { roles: 'SA AD DS PM LPM', menu: 'anggaran' });
