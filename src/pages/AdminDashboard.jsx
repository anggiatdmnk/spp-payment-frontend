// src/pages/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('reports'); 
    const navigate = useNavigate();

    const [reports, setReports] = useState([]);
    const [students, setStudents] = useState([]);
    const [vouchers, setVouchers] = useState([]);

    // ================= STATE FILTER =================
    const [reportFilter, setReportFilter] = useState('success'); 
    const [studentFilter, setStudentFilter] = useState('all'); 
    const [voucherFilter, setVoucherFilter] = useState('all'); 

    // ================= STATE FORM & MODAL =================
    const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
    const [bulkForm, setBulkForm] = useState({ class: '', month: '', year: new Date().getFullYear(), amount: '', due_date: '' });

    const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
    const [isEditingStudent, setIsEditingStudent] = useState(false);
    const [studentForm, setStudentForm] = useState({ id: null, nis: '', name: '', class: '', phone: '' });

    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // ================= STATE UBAH PASSWORD ADMIN =================
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ old_password: '', new_password: '', confirm_password: '' });
    const [pwdMessage, setPwdMessage] = useState('');
    const [pwdError, setPwdError] = useState('');
    const [pwdLoading, setPwdLoading] = useState(false);

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (passwordForm.new_password !== passwordForm.confirm_password) return setPwdError("Konfirmasi password tidak cocok!");
        
        setPwdLoading(true); setPwdError(''); setPwdMessage('');
        try {
            const res = await api.put('/admin/change-password', passwordForm);
            setPwdMessage(res.data.message);
            setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
            setTimeout(() => { setIsPasswordModalOpen(false); setPwdMessage(''); }, 3000);
        } catch (err) { setPwdError(err.response?.data?.error || "Gagal mengubah password."); } 
        finally { setPwdLoading(false); }
    };

    const handleLogout = () => { localStorage.removeItem('token'); navigate('/login'); };

    // ================= FUNGSI FETCH DATA =================
    const fetchReports = async () => {
        try { const res = await api.get('/admin/reports/payments'); setReports(res.data.data || res.data || []); } 
        catch (err) { console.error('Gagal memuat laporan', err); }
    };
    const fetchStudents = async () => {
        try { const res = await api.get('/admin/students'); setStudents(res.data.data || res.data || []); } 
        catch (err) { console.error('Gagal memuat data siswa', err); }
    };
    const fetchVouchers = async () => {
        try { const res = await api.get('/admin/vouchers'); setVouchers(res.data.data || res.data || []); } 
        catch (err) { console.error('Gagal memuat voucher', err); }
    };

    // Ekstrak daftar kelas yang unik untuk Dropdown
    const uniqueClasses = [...new Set(students.map(s => s.class || s.Class).filter(Boolean))];

    // ================= LOGIKA FILTER =================
    const filteredReports = reports.filter(r => {
        const status = (r.status || r.Status || '').toLowerCase();
        if (reportFilter === 'all') return true;
        if (reportFilter === 'success') return status === 'success' || status === 'settled' || status === 'capture';
        if (reportFilter === 'pending') return status === 'pending';
        return true;
    });

    const filteredStudents = students.filter(s => {
        if (studentFilter === 'all') return true;
        const studentClass = s.class || s.Class || '';
        return studentClass === studentFilter;
    });

    const filteredVouchers = vouchers.filter(v => {
        if (voucherFilter === 'all') return true;
        const studentClass = v.student?.class || v.Student?.Class || '';
        return studentClass === voucherFilter;
    });

    // ================= FITUR EXPORT CSV =================
    const handleExportCSV = () => {
        if (filteredReports.length === 0) return alert("Tidak ada data untuk diexport!");
        const headers = ['Tanggal Transaksi', 'Nama Siswa', 'Kelas', 'Metode Pembayaran', 'Nominal (Rp)', 'Status'];
        const rows = filteredReports.map(r => [
            new Date(r.created_at || r.CreatedAt).toLocaleDateString('id-ID'),
            r.invoice?.student?.name || r.Invoice?.Student?.name || r.invoice?.Student?.name || '-',
            r.invoice?.student?.class || r.Invoice?.Student?.class || r.invoice?.Student?.class || '-',
            r.payment_method || r.PaymentMethod || 'Belum Dipilih',
            r.amount || r.Amount || 0,
            (r.status || r.Status || '').toUpperCase()
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Laporan_Keuangan_SPP_${reportFilter}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    // ================= FITUR CRUD SISWA =================
    const openAddStudentModal = () => { setIsEditingStudent(false); setStudentForm({ id: null, nis: '', name: '', class: '', phone: '' }); setIsStudentModalOpen(true); };
    const openEditStudentModal = (student) => { 
        setIsEditingStudent(true); 
        setStudentForm({ id: student.id || student.ID, nis: student.nis || student.Nis || '', name: student.name || student.Name || '', class: student.class || student.Class || '', phone: student.phone || student.Phone || '' }); 
        setIsStudentModalOpen(true); 
    };

    const handleSaveStudent = async () => {
        if (!studentForm.nis || !studentForm.name || !studentForm.class || !studentForm.phone) return setError("Gagal: Semua kolom wajib diisi!");
        if (!/^\d+$/.test(studentForm.nis)) return setError("Gagal: NIS hanya boleh berisi angka!");
        if (!/^[A-Z0-9-]+$/.test(studentForm.class)) return setError("Gagal: Format kelas tidak valid! Contoh: 7-A");

        setIsLoading(true); setError('');
        try {
            if (isEditingStudent) await api.put(`/admin/students/${studentForm.id}`, studentForm);
            else await api.post('/admin/students', studentForm);
            
            setMessage(isEditingStudent ? 'Data siswa diperbarui!' : 'Siswa baru ditambahkan!');
            setIsStudentModalOpen(false); fetchStudents(); setTimeout(() => setMessage(''), 3000);
        } catch (err) { setError(err.response?.data?.error || 'Gagal menyimpan data.'); } finally { setIsLoading(false); }
    };

    const handleDeleteStudent = async (id) => {
        if (!window.confirm("Yakin hapus siswa ini permanen?")) return;
        try { await api.delete(`/admin/students/${id}`); setMessage('Data dihapus!'); fetchStudents(); setTimeout(() => setMessage(''), 3000); } 
        catch (err) { alert('Gagal menghapus siswa.'); }
    };

    // ================= FITUR GENERATE VOUCHER & TAGIHAN =================
    const handleGenerateBulkVoucher = async () => {
        if (!bulkForm.class || !bulkForm.month || !bulkForm.amount || !bulkForm.due_date) return setError("Lengkapi semua form!");
        
        setIsLoading(true); setError('');
        try {
            await api.post('/admin/invoices/bulk', {
                class: bulkForm.class, month: bulkForm.month, year: parseInt(bulkForm.year),
                amount: parseFloat(bulkForm.amount), description: `SPP Bulan ${bulkForm.month} ${bulkForm.year}`,
                due_date: bulkForm.due_date + "T00:00:00Z"
            });
            setMessage(`Sukses generate massal untuk kelas ${bulkForm.class}!`);
            setIsVoucherModalOpen(false); setBulkForm({ class: '', month: '', year: new Date().getFullYear(), amount: '', due_date: '' });
            fetchVouchers(); setTimeout(() => setMessage(''), 4000);
        } catch (err) { setError(err.response?.data?.error || 'Gagal generate massal'); } finally { setIsLoading(false); }
    };

    const handleMarkVoucherPaid = async (id) => {
        if (!window.confirm("Tandai lunas offline (Tunai)?")) return;
        try { await api.put(`/admin/vouchers/${id}/mark-paid`); setMessage('Pembayaran tunai sukses!'); fetchVouchers(); setTimeout(() => setMessage(''), 3000); } 
        catch (err) { alert('Gagal update status pembayaran'); }
    };

    // ================= Reset password siswa =================
    const handleResetPassword = async (id) => {
    if (!window.confirm("Yakin ingin mereset password siswa ini ke 'siswa123'?")) return;
    try {
        await api.put(`/admin/students/${id}/reset-password`);
        alert("Password berhasil di-reset!");
    } catch (err) {
        alert("Gagal mereset password.");
    }
    };

    useEffect(() => {
        if (activeTab === 'reports') fetchReports();
        if (activeTab === 'students') fetchStudents();
        if (activeTab === 'vouchers') { fetchVouchers(); fetchStudents(); }
    }, [activeTab]);

    return (
        <div className="min-h-screen bg-slate-50">
            <nav className="flex items-center justify-between p-4 text-white bg-slate-900 shadow-md">
                <h1 className="text-xl font-bold tracking-wide">Administrator Panel</h1>
                <div className="flex space-x-3">
                    <button onClick={() => setIsPasswordModalOpen(true)} className="px-4 py-2 text-sm font-medium bg-slate-700 rounded hover:bg-slate-600 transition-colors border border-slate-600">
                        🔒 Ubah Password
                    </button>
                    <button onClick={handleLogout} className="px-4 py-2 text-sm font-medium bg-red-600 rounded hover:bg-red-700 transition-colors">
                        Keluar Aplikasi
                    </button>
                </div>
            </nav>

            <div className="max-w-6xl p-6 mx-auto mt-4">
                {message && <div className="p-4 mb-4 text-sm font-bold text-green-700 bg-green-100 border border-green-300 rounded-lg shadow-sm">{message}</div>}

                <div className="flex mb-6 space-x-2 bg-slate-200 rounded-lg p-1.5 w-max">
                    <button onClick={() => setActiveTab('reports')} className={`px-5 py-2.5 text-sm font-bold rounded-md transition-colors ${activeTab === 'reports' ? 'bg-white text-slate-900 shadow' : 'text-slate-600 hover:text-slate-900'}`}>Laporan Keuangan</button>
                    <button onClick={() => setActiveTab('students')} className={`px-5 py-2.5 text-sm font-bold rounded-md transition-colors ${activeTab === 'students' ? 'bg-white text-slate-900 shadow' : 'text-slate-600 hover:text-slate-900'}`}>Kelola Data Siswa</button>
                    <button onClick={() => setActiveTab('vouchers')} className={`px-5 py-2.5 text-sm font-bold rounded-md transition-colors ${activeTab === 'vouchers' ? 'bg-white text-slate-900 shadow' : 'text-slate-600 hover:text-slate-900'}`}>Manajemen Voucher</button>
                </div>

                {/* TAB 1: LAPORAN KEUANGAN */}
                {activeTab === 'reports' && (
                    <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-slate-800">Laporan Transaksi Masuk</h2>
                            <div className="flex items-center space-x-3">
                                <select value={reportFilter} onChange={(e) => setReportFilter(e.target.value)} className="p-2 border border-slate-300 rounded-md text-sm font-semibold bg-slate-50 focus:ring-2 focus:ring-blue-500">
                                    <option value="success">✅ Transaksi Berhasil (Lunas)</option>
                                    <option value="pending">⏳ Menunggu Pembayaran (Pending)</option>
                                    <option value="all">📁 Tampilkan Semua Data</option>
                                </select>
                                <button onClick={handleExportCSV} className="px-4 py-2 bg-emerald-600 text-white rounded text-sm font-bold hover:bg-emerald-700 shadow-sm flex items-center">📥 Export (.csv)</button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b-2 bg-slate-50">
                                        <th className="p-3 text-sm text-slate-700">Tanggal</th><th className="p-3 text-sm text-slate-700">Siswa</th><th className="p-3 text-sm text-slate-700">Kelas</th><th className="p-3 text-sm text-slate-700">Metode</th><th className="p-3 text-sm text-slate-700">Nominal</th><th className="p-3 text-sm text-slate-700">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredReports.length === 0 ? (
                                        <tr><td colSpan="6" className="p-6 text-center text-slate-500 italic">Tidak ada data transaksi untuk filter ini.</td></tr>
                                    ) : (
                                        filteredReports.map((report) => {
                                            const invoice = report.invoice || report.Invoice;
                                            const student = invoice?.student || invoice?.Student;
                                            const status = (report.status || report.Status || '').toLowerCase();
                                            let badgeClass = "bg-slate-100 text-slate-600";
                                            let statusText = "TIDAK DIKETAHUI";
                                            
                                            if (status === 'success' || status === 'settled' || status === 'capture') { badgeClass = "bg-green-100 text-green-700 border border-green-200"; statusText = "BERHASIL ✓"; } 
                                            else if (status === 'pending') { badgeClass = "bg-amber-100 text-amber-700 border border-amber-200"; statusText = "PENDING ⏳"; } 
                                            else if (status === 'expire' || status === 'cancel' || status === 'deny') { badgeClass = "bg-red-100 text-red-700 border border-red-200"; statusText = "GAGAL / EXPIRED ❌"; }

                                            return (
                                                <tr key={report.id || report.ID} className="border-b hover:bg-slate-50">
                                                    <td className="p-3 text-sm">{new Date(report.created_at || report.CreatedAt).toLocaleDateString('id-ID')}</td>
                                                    <td className="p-3 text-sm font-medium">{student?.name || student?.Name || '-'}</td>
                                                    <td className="p-3 text-sm">{student?.class || student?.Class || '-'}</td>
                                                    <td className="p-3 text-sm font-mono uppercase">{report.payment_method || report.PaymentMethod || '-'}</td>
                                                    <td className="p-3 text-sm font-bold text-slate-800">Rp {(report.amount || report.Amount || 0).toLocaleString('id-ID')}</td>
                                                    <td className="p-3 text-sm"><span className={`px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider ${badgeClass}`}>{statusText}</span></td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TAB 2: MASTER DATA SISWA */}
                {activeTab === 'students' && (
                    <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-slate-800">Master Data Siswa</h2>
                            
                            <div className="flex items-center space-x-3">
                                <select value={studentFilter} onChange={(e) => setStudentFilter(e.target.value)} className="p-2 border border-slate-300 rounded-md text-sm font-semibold bg-slate-50 focus:ring-2 focus:ring-blue-500">
                                    <option value="all">📁 Semua Kelas</option>
                                    {uniqueClasses.map((cls, idx) => <option key={idx} value={cls}>Kelas {cls}</option>)}
                                </select>
                                <button onClick={openAddStudentModal} className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-bold hover:bg-blue-700 shadow-sm">+ Tambah Siswa Baru</button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b-2 bg-slate-50">
                                        <th className="p-3 text-sm text-slate-700">NIS</th><th className="p-3 text-sm text-slate-700">Nama Lengkap</th><th className="p-3 text-sm text-slate-700">Kelas</th><th className="p-3 text-sm text-slate-700">No. HP</th><th className="p-3 text-sm text-slate-700 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStudents.length === 0 ? (
                                        <tr><td colSpan="5" className="p-6 text-center text-slate-500 italic">Tidak ada siswa di kelas ini.</td></tr>
                                    ) : (
                                        filteredStudents.map((student) => (
                                            <tr key={student.id || student.ID} className="border-b hover:bg-slate-50">
                                                <td className="p-3 text-sm font-mono">{student.nis || student.Nis}</td>
                                                <td className="p-3 text-sm font-bold">{student.name || student.Name}</td>
                                                <td className="p-3 text-sm">{student.class || student.Class}</td>
                                                <td className="p-3 text-sm">{student.phone || student.Phone}</td>
                                                <td className="p-3 text-sm text-center space-x-3">
                                                    <button 
                                                        onClick={() => handleResetPassword(student.id || student.ID)} 
                                                        className="text-blue-600 font-semibold underline ml-2"
                                                    >
                                                        Reset Password
                                                    </button>
                                                    <button onClick={() => openEditStudentModal(student)} className="text-amber-600 font-semibold underline">Edit</button>
                                                    <button onClick={() => handleDeleteStudent(student.id || student.ID)} className="text-red-600 font-semibold underline">Hapus</button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TAB 3: MANAJEMEN VOUCHER TAGIHAN DENGAN FILTER */}
                {activeTab === 'vouchers' && (
                    <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-slate-800">Manajemen Voucher Tagihan</h2>
                            
                            <div className="flex items-center space-x-3">
                                <select 
                                    value={voucherFilter} 
                                    onChange={(e) => setVoucherFilter(e.target.value)}
                                    className="p-2 border border-slate-300 rounded-md text-sm font-semibold bg-slate-50 focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="all">📁 Semua Kelas</option>
                                    {uniqueClasses.map((cls, idx) => (
                                        <option key={idx} value={cls}>Kelas {cls}</option>
                                    ))}
                                </select>
                                <button onClick={() => setIsVoucherModalOpen(true)} className="px-4 py-2 bg-indigo-600 text-white rounded text-sm font-bold hover:bg-indigo-700 shadow-sm">
                                    🎟️ Generate Tagihan & Voucher (Massal)
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b-2 bg-slate-50">
                                        <th className="p-3 text-sm text-slate-700">Kode Voucher</th>
                                        <th className="p-3 text-sm text-slate-700">Siswa</th>
                                        <th className="p-3 text-sm text-slate-700">Kelas</th>
                                        <th className="p-3 text-sm text-slate-700">Status</th>
                                        <th className="p-3 text-sm text-slate-700 text-center">Aksi Offline</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredVouchers.length === 0 ? (
                                        <tr><td colSpan="5" className="p-6 text-center text-slate-500 italic">Tidak ada voucher untuk kelas ini.</td></tr>
                                    ) : (
                                        filteredVouchers.map((v) => {
                                            const isActive = (v.status || v.Status || '').toLowerCase() === 'active';
                                            return (
                                                <tr key={v.id || v.ID} className="border-b hover:bg-slate-50">
                                                    <td className="p-3"><span className="px-2 py-1 bg-slate-100 border font-mono font-bold rounded">{v.code || v.Code}</span></td>
                                                    <td className="p-3 text-sm font-medium">{v.student?.name || v.Student?.Name || '-'}</td>
                                                    <td className="p-3 text-sm text-slate-500">{v.student?.class || v.Student?.Class || '-'}</td>
                                                    <td className="p-3 text-sm">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isActive ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                                            {isActive ? 'Aktif (Belum Lunas)' : 'Terpakai (Lunas)'}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-sm text-center">
                                                        {isActive ? (
                                                            <button onClick={() => handleMarkVoucherPaid(v.id || v.ID)} className="px-3 py-1.5 bg-slate-800 text-white rounded text-xs font-bold hover:bg-slate-900 shadow-sm">💵 Bayar Tunai</button>
                                                        ) : (<span className="text-xs font-semibold text-slate-400">Selesai ✓</span>)}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL CRUD SISWA */}
            {isStudentModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                        <h2 className="text-lg font-bold mb-4">{isEditingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}</h2>
                        {error && <div className="mb-3 text-xs text-red-600 p-2 bg-red-50 rounded border border-red-200">{error}</div>}
                        
                        <div className="space-y-3 mb-5">
                            <input type="text" value={studentForm.nis} onChange={e => setStudentForm({...studentForm, nis: e.target.value.replace(/\D/g, '')})} className="w-full p-2 border rounded text-sm" placeholder="NIS" />
                            <input type="text" value={studentForm.name} onChange={e => setStudentForm({...studentForm, name: e.target.value})} className="w-full p-2 border rounded text-sm" placeholder="Nama" />
                            <input type="text" value={studentForm.class} onChange={e => setStudentForm({...studentForm, class: e.target.value.toUpperCase()})} className="w-full p-2 border rounded text-sm" placeholder="Kelas" />
                            <input type="text" value={studentForm.phone} onChange={e => setStudentForm({...studentForm, phone: e.target.value.replace(/\D/g, '')})} className="w-full p-2 border rounded text-sm" placeholder="No HP" />
                        </div>
                        <div className="flex justify-end space-x-2">
                            <button onClick={() => setIsStudentModalOpen(false)} className="px-4 py-2 text-sm border rounded">Batal</button>
                            <button onClick={handleSaveStudent} disabled={isLoading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded font-bold">{isLoading ? 'Menyimpan...' : 'Simpan Data'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL GENERATE TAGIHAN & VOUCHER MASSAL */}
            {isVoucherModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-lg font-bold text-slate-800 mb-4">Generate Tagihan & Voucher Massal</h2>
                        {error && <div className="mb-3 text-xs text-red-600 p-2 bg-red-50 rounded border border-red-200">{error}</div>}
                        
                        <div className="space-y-4 mb-5">
                            <select value={bulkForm.class} onChange={(e) => setBulkForm({...bulkForm, class: e.target.value})} className="w-full p-2 border rounded text-sm bg-slate-50">
                                <option value="">-- Pilih Kelas Target --</option>
                                {uniqueClasses.map((cls, idx) => <option key={idx} value={cls}>Kelas {cls}</option>)}
                            </select>
                            
                            <div className="flex space-x-3">
                                <select value={bulkForm.month} onChange={(e) => setBulkForm({...bulkForm, month: e.target.value})} className="w-full p-2 border rounded text-sm flex-1">
                                    <option value="">- Pilih Bulan -</option>
                                    {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <input type="number" value={bulkForm.year} onChange={(e) => setBulkForm({...bulkForm, year: e.target.value})} className="w-1/3 p-2 border rounded text-sm" />
                            </div>

                            <input type="number" value={bulkForm.amount} onChange={(e) => setBulkForm({...bulkForm, amount: e.target.value})} className="w-full p-2 border rounded text-sm font-bold" placeholder="Nominal (Contoh: 250000)" />
                            
                            <label className="block text-xs font-semibold text-slate-600">Jatuh Tempo (Expired Date)</label>
                            <input type="date" value={bulkForm.due_date} onChange={(e) => setBulkForm({...bulkForm, due_date: e.target.value})} className="w-full p-2 border rounded text-sm" />
                        </div>

                        <div className="flex justify-end space-x-2">
                            <button onClick={() => setIsVoucherModalOpen(false)} className="px-4 py-2 text-sm border rounded">Batal</button>
                            <button onClick={handleGenerateBulkVoucher} disabled={isLoading} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded font-bold">{isLoading ? 'Memproses...' : 'Generate'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL UBAH PASSWORD ADMIN */}
            {isPasswordModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                        <h2 className="text-lg font-bold text-slate-800 mb-2">Ubah Password Admin</h2>
                        <p className="text-xs text-slate-500 mb-4">Pastikan password baru Anda kuat dan tidak mudah ditebak.</p>
                        
                        {pwdMessage && <div className="mb-3 text-xs text-green-700 p-2.5 bg-green-50 rounded border border-green-200 font-semibold">{pwdMessage}</div>}
                        {pwdError && <div className="mb-3 text-xs text-red-600 p-2.5 bg-red-50 rounded border border-red-200 font-semibold">{pwdError}</div>}
                        
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Password Saat Ini</label>
                                <input type="password" required value={passwordForm.old_password} onChange={e => setPasswordForm({...passwordForm, old_password: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="••••••••" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Password Baru</label>
                                <input type="password" required value={passwordForm.new_password} onChange={e => setPasswordForm({...passwordForm, new_password: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Minimal 6 karakter" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Konfirmasi Password Baru</label>
                                <input type="password" required value={passwordForm.confirm_password} onChange={e => setPasswordForm({...passwordForm, confirm_password: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ulangi password baru" />
                            </div>
                            
                            <div className="flex justify-end space-x-2 pt-2">
                                <button type="button" onClick={() => { setIsPasswordModalOpen(false); setPwdError(''); setPwdMessage(''); }} className="px-4 py-2 text-sm border border-slate-300 rounded-lg font-semibold text-slate-600 hover:bg-slate-50">Batal</button>
                                <button type="submit" disabled={pwdLoading} className="px-4 py-2 text-sm bg-slate-900 hover:bg-black text-white font-bold rounded-lg shadow transition-colors">
                                    {pwdLoading ? 'Memproses...' : 'Simpan Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}