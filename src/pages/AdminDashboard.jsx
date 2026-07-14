// src/pages/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
    // ================= STATE NAVIGASI =================
    const [activeMenu, setActiveMenu] = useState('reports'); 
    const navigate = useNavigate();

    // ================= STATE DATA =================
    const [reports, setReports] = useState([]);
    const [students, setStudents] = useState([]);
    const [vouchers, setVouchers] = useState([]);

    // ================= STATE FILTER & PENCARIAN =================
    const [reportFilter, setReportFilter] = useState('success'); 
    const [reportSearch, setReportSearch] = useState(''); // STATE PENCARIAN DI SINI

    const [studentFilter, setStudentFilter] = useState('all'); 
    const [studentSearch, setStudentSearch] = useState(''); // STATE PENCARIAN DI SINI

    const [voucherFilter, setVoucherFilter] = useState('all'); 
    const [voucherSearch, setVoucherSearch] = useState(''); // STATE PENCARIAN DI SINI

    // ================= STATE FORM & MODAL =================
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Delete voucher
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
    const [bulkDeleteForm, setBulkDeleteForm] = useState({ class: '', month: '', year: new Date().getFullYear() });

    // Modal Siswa
    const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
    const [isEditingStudent, setIsEditingStudent] = useState(false);
    const [studentForm, setStudentForm] = useState({ id: null, nis: '', name: '', class: '', phone: '' });

    // Modal Voucher Massal
    const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
    const [bulkForm, setBulkForm] = useState({ class: '', month: '', year: new Date().getFullYear(), amount: '', due_date: '' });

    // Modal Voucher Spesifik
    const [isSpecificVoucherModalOpen, setIsSpecificVoucherModalOpen] = useState(false);
    const [specificForm, setSpecificForm] = useState({ student_id: '', month: '', year: new Date().getFullYear(), amount: '', due_date: '' });

    // State Pencarian Spesifik (Saat Generate 1 Siswa)
    const [studentSearchTerm, setStudentSearchTerm] = useState('');
    const [showStudentDropdown, setShowStudentDropdown] = useState(false);
    const [selectedStudentName, setSelectedStudentName] = useState('');

    // Modal Password Admin
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ old_password: '', new_password: '', confirm_password: '' });
    const [pwdMessage, setPwdMessage] = useState('');
    const [pwdError, setPwdError] = useState('');
    const [pwdLoading, setPwdLoading] = useState(false);

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

    const uniqueClasses = [...new Set(students.map(s => s.class || s.Class).filter(Boolean))];

    useEffect(() => {
        if (activeMenu === 'reports') fetchReports();
        if (activeMenu === 'students') fetchStudents();
        if (activeMenu === 'vouchers') { fetchVouchers(); fetchStudents(); }
    }, [activeMenu]);

    // ================= LOGIKA FILTER & PENCARIAN =================
    const filteredReports = reports.filter(r => {
        const status = (r.status || r.Status || '').toLowerCase();
        let matchesStatus = true;
        if (reportFilter === 'success') matchesStatus = status === 'success' || status === 'settled' || status === 'capture';
        if (reportFilter === 'pending') matchesStatus = status === 'pending';
        
        const searchLower = reportSearch.toLowerCase();
        const studentName = (r.invoice?.student?.name || r.Invoice?.Student?.name || r.invoice?.Student?.name || '').toLowerCase();
        const matchesSearch = studentName.includes(searchLower);

        return matchesStatus && matchesSearch;
    });

    const filteredStudents = students.filter(s => {
        const studentClass = s.class || s.Class || '';
        const matchesClass = studentFilter === 'all' || studentClass === studentFilter;
        
        const searchLower = studentSearch.toLowerCase();
        const name = (s.name || s.Name || '').toLowerCase();
        const nis = (s.nis || s.Nis || '').toLowerCase();
        const matchesSearch = name.includes(searchLower) || nis.includes(searchLower);

        return matchesClass && matchesSearch;
    });

    const filteredVouchers = vouchers.filter(v => {
        const studentClass = v.student?.class || v.Student?.Class || '';
        const matchesClass = voucherFilter === 'all' || studentClass === voucherFilter;
        
        const searchLower = voucherSearch.toLowerCase();
        const code = (v.code || v.Code || '').toLowerCase();
        const studentName = (v.student?.name || v.Student?.Name || '').toLowerCase();
        const matchesSearch = code.includes(searchLower) || studentName.includes(searchLower);

        return matchesClass && matchesSearch;
    });

    // ================= FITUR EXPORT CSV =================
    const handleExportCSV = () => {
        if (filteredReports.length === 0) return alert("Tidak ada data untuk diexport!");
        const headers = ['Tanggal Transaksi', 'Nama Siswa', 'Kelas', 'Deskripsi Tagihan', 'Metode Pembayaran', 'Nominal (Rp)', 'Status'];
        const rows = filteredReports.map(r => [
            new Date(r.created_at || r.CreatedAt).toLocaleDateString('id-ID'),
            r.invoice?.student?.name || r.Invoice?.Student?.name || r.invoice?.Student?.name || '-',
            r.invoice?.student?.class || r.Invoice?.Student?.class || r.invoice?.Student?.class || '-',
            r.invoice?.description || r.Invoice?.Description || r.invoice?.Description || '-',
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
        if (!studentForm.nis || !studentForm.name || !studentForm.class || !studentForm.phone) return setError("Semua kolom wajib diisi!");
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

    const handleResetPassword = async (id) => {
        if (!window.confirm("Yakin ingin mereset password siswa ini ke 'siswa123'?")) return;
        try { await api.put(`/admin/students/${id}/reset-password`); alert("Password berhasil di-reset!"); } 
        catch (err) { alert("Gagal mereset password."); }
    };

    // ================= FITUR GENERATE & DELETE VOUCHER =================
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

    const handleGenerateSpecificVoucher = async () => {
        if (!specificForm.student_id || !specificForm.month || !specificForm.amount || !specificForm.due_date) return setError("Lengkapi semua form!");
        setIsLoading(true); setError('');
        try {
            const res = await api.post('/admin/generate-specific', {
                student_id: parseInt(specificForm.student_id), month: specificForm.month, 
                year: parseInt(specificForm.year), amount: parseFloat(specificForm.amount),
                due_date: specificForm.due_date + "T00:00:00Z"
            });
            setMessage(res.data.message || `Sukses generate tagihan spesifik!`);
            setIsSpecificVoucherModalOpen(false); 
            setSpecificForm({ student_id: '', month: '', year: new Date().getFullYear(), amount: '', due_date: '' });
            setStudentSearchTerm(''); setSelectedStudentName('');
            fetchVouchers(); setTimeout(() => setMessage(''), 4000);
        } catch (err) { setError(err.response?.data?.error || 'Gagal generate spesifik'); } finally { setIsLoading(false); }
    };

    const handleMarkVoucherPaid = async (id) => {
        if (!window.confirm("Tandai lunas offline (Tunai)?")) return;
        try { await api.put(`/admin/vouchers/${id}/mark-paid`); setMessage('Pembayaran tunai sukses!'); fetchVouchers(); setTimeout(() => setMessage(''), 3000); } 
        catch (err) { alert('Gagal update status pembayaran'); }
    };

    const handleDeleteSpecificVoucher = async (id, code) => {
        if (!window.confirm(`Apakah Anda yakin ingin menghapus tagihan dengan kode ${code}?\nTindakan ini akan menghapus invoice & voucher siswa secara permanen.`)) return;
        setIsLoading(true); setError(''); setMessage('');
        try {
            const res = await api.delete(`/admin/vouchers/${id}`);
            setMessage(res.data.message || "Tagihan berhasil dihapus!");
            fetchVouchers(); setTimeout(() => setMessage(''), 4000);
        } catch (err) {
            alert(err.response?.data?.error || "Gagal menghapus tagihan.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleBulkDeleteVoucher = async () => {
        if (!bulkDeleteForm.class || !bulkDeleteForm.month || !bulkDeleteForm.year) return setError("Lengkapi seluruh form!");
        if (!window.confirm(`PERINGATAN SISWATA!\nAnda akan menghapus seluruh tagihan kelas ${bulkDeleteForm.class} periode ${bulkDeleteForm.month} ${bulkDeleteForm.year}.\nLanjutkan?`)) return;
        
        setIsLoading(true); setError('');
        try {
            const res = await api.delete(`/admin/invoices/bulk`, {
                params: {
                    class: bulkDeleteForm.class,
                    month: bulkDeleteForm.month,
                    year: parseInt(bulkDeleteForm.year)
                }
            });
            setMessage(res.data.message || "Seluruh tagihan kelas berhasil dihapus!");
            setIsBulkDeleteModalOpen(false);
            setBulkDeleteForm({ class: '', month: '', year: new Date().getFullYear() });
            fetchVouchers(); setTimeout(() => setMessage(''), 4000);
        } catch (err) {
            setError(err.response?.data?.error || "Gagal menghapus tagihan masal.");
        } finally {
            setIsLoading(false);
        }
    };

    // ================= FITUR AUTH ADMIN =================
    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (passwordForm.new_password !== passwordForm.confirm_password) return setPwdError("Konfirmasi password tidak cocok!");
        setPwdLoading(true); setPwdError(''); setPwdMessage('');
        try {
            const res = await api.put('/admin/change-password', passwordForm);
            setPwdMessage(res.data.message); setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
            setTimeout(() => { setIsPasswordModalOpen(false); setPwdMessage(''); }, 3000);
        } catch (err) { setPwdError(err.response?.data?.error || "Gagal mengubah password."); } finally { setPwdLoading(false); }
    };
    const handleLogout = () => { localStorage.removeItem('token'); navigate('/login'); };

    const todayISOString = new Date().toISOString().split('T')[0];

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">
            
            {/* ================= SIDEBAR KIRI ================= */}
            <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl z-20 flex-shrink-0">
                <div className="p-6 border-b border-slate-800">
                    <h1 className="text-2xl font-extrabold tracking-wide text-white flex items-center gap-2">
                        <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                        Panel Admin
                    </h1>
                </div>
                
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    <p className="px-3 mb-2 text-xs font-bold tracking-wider text-slate-500 uppercase">Navigasi Utama</p>
                    
                    <button onClick={() => setActiveMenu('reports')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${activeMenu === 'reports' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Laporan Keuangan
                    </button>
                    <button onClick={() => setActiveMenu('students')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${activeMenu === 'students' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        Master Data Siswa
                    </button>
                    <button onClick={() => setActiveMenu('vouchers')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${activeMenu === 'vouchers' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
                        Manajemen Voucher
                    </button>
                </nav>

                <div className="p-4 border-t border-slate-800 space-y-3">
                    <button onClick={() => setIsPasswordModalOpen(true)} className="w-full flex items-center justify-center gap-2 p-2.5 text-sm bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 hover:text-white transition-colors border border-slate-700">
                        🔒 Ubah Password
                    </button>
                    <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 p-2.5 text-sm bg-red-600/90 text-white rounded-lg hover:bg-red-500 transition-colors shadow-sm">
                        Keluar
                    </button>
                </div>
            </aside>

            {/* ================= AREA KONTEN UTAMA ================= */}
            <main className="flex-1 overflow-y-auto bg-slate-50">
                <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-5">
                    <h2 className="text-xl font-bold text-slate-800 capitalize">
                        {activeMenu === 'reports' ? 'Dashboard Laporan' : activeMenu === 'students' ? 'Kelola Data Siswa' : 'Tagihan & Voucher'}
                    </h2>
                </header>

                <div className="p-8 max-w-7xl mx-auto">
                    {message && !isStudentModalOpen && !isVoucherModalOpen && !isSpecificVoucherModalOpen && (
                        <div className="p-4 mb-6 text-sm text-green-700 bg-green-100 border border-green-200 rounded-lg shadow-sm font-semibold">{message}</div>
                    )}

                    {/* --- KONTEN LAPORAN --- */}
                    {activeMenu === 'reports' && (
                        <div className="animate-fade-in-up">
                            <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                                    <h2 className="text-lg font-bold text-slate-800">Riwayat Transaksi Pembayaran</h2>
                                    <div className="flex flex-wrap items-center gap-3">
                                        
                                        <input 
                                            type="text" 
                                            placeholder="Cari Nama Siswa..." 
                                            value={reportSearch}
                                            onChange={(e) => setReportSearch(e.target.value)}
                                            className="p-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none w-48"
                                        />

                                        <select value={reportFilter} onChange={(e) => setReportFilter(e.target.value)} className="p-2 border border-slate-300 rounded-lg text-sm font-semibold bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none">
                                            <option value="success">✅ Lunas (Berhasil)</option>
                                            <option value="pending">⏳ Pending (Tertunda)</option>
                                            <option value="all">📁 Semua Transaksi</option>
                                        </select>
                                        <button onClick={handleExportCSV} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 shadow-sm transition-colors">
                                            📥 Export CSV
                                        </button>
                                    </div>
                                </div>
                                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-200">
                                                <th className="p-4 text-xs font-bold uppercase text-slate-500">Tanggal</th>
                                                <th className="p-4 text-xs font-bold uppercase text-slate-500">Siswa</th>
                                                <th className="p-4 text-xs font-bold uppercase text-slate-500">Kelas</th>
                                                <th className="p-4 text-xs font-bold uppercase text-slate-500">Deskripsi Tagihan</th>
                                                <th className="p-4 text-xs font-bold uppercase text-slate-500">Metode</th>
                                                <th className="p-4 text-xs font-bold uppercase text-slate-500">Nominal</th>
                                                <th className="p-4 text-xs font-bold uppercase text-slate-500">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filteredReports.length === 0 ? (
                                                <tr><td colSpan="7" className="p-8 text-center text-slate-500">Tidak ada data transaksi.</td></tr>
                                            ) : (
                                                filteredReports.map((report) => {
                                                    const student = report.invoice?.student || report.Invoice?.Student;
                                                    const status = (report.status || report.Status || '').toLowerCase();
                                                    let badgeClass = "bg-slate-100 text-slate-600"; let statusText = "UNKNOWN";
                                                    if (status === 'success' || status === 'settled' || status === 'capture') { badgeClass = "bg-green-100 text-green-700"; statusText = "BERHASIL ✓"; } 
                                                    else if (status === 'pending') { badgeClass = "bg-amber-100 text-amber-700"; statusText = "PENDING ⏳"; } 
                                                    else { badgeClass = "bg-red-100 text-red-700"; statusText = "GAGAL ❌"; }
                                                    return (
                                                        <tr key={report.id || report.ID} className="hover:bg-slate-50/80">
                                                            <td className="p-4 text-sm">{new Date(report.created_at || report.CreatedAt).toLocaleDateString('id-ID')}</td>
                                                            <td className="p-4 text-sm font-semibold text-slate-800">{student?.name || student?.Name || '-'}</td>
                                                            <td className="p-4 text-sm">{student?.class || student?.Class || '-'}</td>
                                                            <td className="p-4 text-sm text-slate-600">{report.invoice?.description || report.Invoice?.Description || report.invoice?.Description || '-'}</td>
                                                            <td className="p-4 text-sm font-mono uppercase">{report.payment_method || report.PaymentMethod || '-'}</td>
                                                            <td className="p-4 text-sm font-bold">Rp {(report.amount || report.Amount || 0).toLocaleString('id-ID')}</td>
                                                            <td className="p-4 text-sm"><span className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider ${badgeClass}`}>{statusText}</span></td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- KONTEN SISWA --- */}
                    {activeMenu === 'students' && (
                        <div className="animate-fade-in-up">
                            <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                                    <h2 className="text-lg font-bold text-slate-800">Direktori Siswa Aktif</h2>
                                    <div className="flex flex-wrap items-center gap-3">
                                        
                                        <input 
                                            type="text" 
                                            placeholder="Cari Nama atau NIS..." 
                                            value={studentSearch}
                                            onChange={(e) => setStudentSearch(e.target.value)}
                                            className="p-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none w-48"
                                        />

                                        <select value={studentFilter} onChange={(e) => setStudentFilter(e.target.value)} className="p-2 border border-slate-300 rounded-lg text-sm font-semibold bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none">
                                            <option value="all">📁 Semua Kelas</option>
                                            {uniqueClasses.map((cls, idx) => <option key={idx} value={cls}>Kelas {cls}</option>)}
                                        </select>
                                        <button onClick={openAddStudentModal} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-sm transition-colors">
                                            + Tambah Siswa
                                        </button>
                                    </div>
                                </div>
                                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-200">
                                                <th className="p-4 text-xs font-bold uppercase text-slate-500">NIS</th>
                                                <th className="p-4 text-xs font-bold uppercase text-slate-500">Nama Lengkap</th>
                                                <th className="p-4 text-xs font-bold uppercase text-slate-500">Kelas</th>
                                                <th className="p-4 text-xs font-bold uppercase text-slate-500">No. HP</th>
                                                <th className="p-4 text-xs font-bold uppercase text-slate-500 text-center">Tindakan</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filteredStudents.length === 0 ? (
                                                <tr><td colSpan="5" className="p-8 text-center text-slate-500">Tidak ada siswa ditemukan.</td></tr>
                                            ) : (
                                                filteredStudents.map((student) => (
                                                    <tr key={student.id || student.ID} className="hover:bg-slate-50/80">
                                                        <td className="p-4 text-sm font-mono text-slate-500">{student.nis || student.Nis}</td>
                                                        <td className="p-4 text-sm font-bold text-slate-800">{student.name || student.Name}</td>
                                                        <td className="p-4 text-sm">{student.class || student.Class}</td>
                                                        <td className="p-4 text-sm">{student.phone || student.Phone}</td>
                                                        <td className="p-4 text-sm text-center">
                                                            <div className="flex justify-center gap-2">
                                                                <button onClick={() => handleResetPassword(student.id || student.ID)} className="px-3 py-1 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded text-xs font-bold transition-colors">Reset Password</button>
                                                                <button onClick={() => openEditStudentModal(student)} className="px-3 py-1 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded text-xs font-bold transition-colors">Edit</button>
                                                                <button onClick={() => handleDeleteStudent(student.id || student.ID)} className="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded text-xs font-bold transition-colors">Hapus</button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- KONTEN VOUCHER --- */}
                    {activeMenu === 'vouchers' && (
                        <div className="animate-fade-in-up">
                            <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
                                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
                                    <h2 className="text-lg font-bold text-slate-800">Distribusi Tagihan & Voucher</h2>
                                    <div className="flex flex-wrap items-center gap-3">
                                        
                                        <input 
                                            type="text" 
                                            placeholder="Cari Kode/Nama..." 
                                            value={voucherSearch}
                                            onChange={(e) => setVoucherSearch(e.target.value)}
                                            className="p-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none w-48"
                                        />

                                        <select value={voucherFilter} onChange={(e) => setVoucherFilter(e.target.value)} className="p-2 border border-slate-300 rounded-lg text-sm font-semibold bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none">
                                            <option value="all">📁 Semua Kelas</option>
                                            {uniqueClasses.map((cls, idx) => <option key={idx} value={cls}>Kelas {cls}</option>)}
                                        </select>
                                        <button onClick={() => setIsSpecificVoucherModalOpen(true)} className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-bold hover:bg-amber-600 shadow-sm transition-colors">
                                            👤 Generate Spesifik
                                        </button>
                                        <button onClick={() => setIsVoucherModalOpen(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-sm transition-colors">
                                            🎟️ Generate Massal
                                        </button>
                                        <button onClick={() => { setError(''); setIsBulkDeleteModalOpen(true); }} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 shadow-sm transition-colors">
                                            🗑️ Hapus Masal Kelas
                                        </button>
                                    </div>
                                </div>
                                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-200">
                                                <th className="p-4 text-xs font-bold uppercase text-slate-500">Kode Voucher</th>
                                                <th className="p-4 text-xs font-bold uppercase text-slate-500">Siswa</th>
                                                <th className="p-4 text-xs font-bold uppercase text-slate-500">Kelas</th>
                                                <th className="p-4 text-xs font-bold uppercase text-slate-500">Nominal</th>
                                                <th className="p-4 text-xs font-bold uppercase text-slate-500">Status</th>
                                                <th className="p-4 text-xs font-bold uppercase text-slate-500 text-center">Aksi (Offline)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filteredVouchers.length === 0 ? (
                                                <tr><td colSpan="6" className="p-8 text-center text-slate-500">Tidak ada voucher ditemukan.</td></tr>
                                            ) : (
                                                filteredVouchers.map((v) => {
                                                    const isActive = (v.status || v.Status || '').toLowerCase() === 'active';
                                                    return (
                                                        <tr key={v.id || v.ID} className="hover:bg-slate-50/80">
                                                            <td className="p-4"><span className="px-3 py-1 bg-slate-100 border border-slate-200 font-mono font-bold rounded-lg text-sm text-slate-700">{v.code || v.Code}</span></td>
                                                            <td className="p-4 text-sm font-bold text-slate-800">{v.student?.name || v.Student?.Name || '-'}</td>
                                                            <td className="p-4 text-sm text-slate-500">{v.student?.class || v.Student?.Class || '-'}</td>
                                                            <td className="p-4 text-sm font-bold">Rp {(v.amount || v.Amount || 0).toLocaleString('id-ID')}</td>
                                                            <td className="p-4 text-sm">
                                                                {(() => {
                                                                    const status = (v.status || v.Status || '').toLowerCase();
                                                                    if (status === 'active') {
                                                                        return <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700">AKTIF</span>;
                                                                    } else if (status === 'used' || status === 'paid') {
                                                                        return <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700">LUNAS ✓</span>;
                                                                    } else {
                                                                        return <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700">DIBATALKAN ❌</span>;
                                                                    }
                                                                })()}
                                                            </td>
                                                            <td className="p-4 text-sm text-center">
                                                                {isActive ? (
                                                                    <div className="flex justify-center gap-2">
                                                                        <button onClick={() => handleMarkVoucherPaid(v.id || v.ID)} className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700 transition-colors shadow-sm">💵 Tunai</button>
                                                                        <button onClick={() => handleDeleteSpecificVoucher(v.id || v.ID, v.code || v.Code)} className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200 transition-colors">🗑️ Hapus</button>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-xs font-bold text-slate-400">Selesai ✓</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* ================= MODAL TAMBAH/EDIT SISWA ================= */}
            {isStudentModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in-up">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <h2 className="text-lg font-bold text-slate-800 mb-5">{isEditingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}</h2>
                        {error && <div className="mb-4 text-xs font-semibold text-red-600 p-3 bg-red-50 rounded-lg border border-red-200">{error}</div>}
                        
                        <div className="space-y-4 mb-6">
                            <div><label className="block text-xs font-bold text-slate-600 mb-1">Nomor Induk Siswa (NIS)</label><input type="text" value={studentForm.nis} onChange={e => setStudentForm({...studentForm, nis: e.target.value.replace(/\D/g, '')})} className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Masukkan NIS" /></div>
                            <div><label className="block text-xs font-bold text-slate-600 mb-1">Nama Lengkap</label><input type="text" value={studentForm.name} onChange={e => setStudentForm({...studentForm, name: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Nama Siswa" /></div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Kelas</label>
                                <select value={studentForm.class} onChange={e => setStudentForm({...studentForm, class: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                                    <option value="">-- Pilih Kelas --</option>
                                    <option value="7-A">7-A</option><option value="7-B">7-B</option><option value="7-C">7-C</option>
                                    <option value="8-A">8-A</option><option value="8-B">8-B</option><option value="8-C">8-C</option>
                                    <option value="9-A">9-A</option><option value="9-B">9-B</option><option value="9-C">9-C</option>
                                </select>
                            </div>
                            <div><label className="block text-xs font-bold text-slate-600 mb-1">No. HP (WhatsApp)</label><input type="text" value={studentForm.phone} onChange={e => setStudentForm({...studentForm, phone: e.target.value.replace(/\D/g, '')})} className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="08xxxx" /></div>
                        </div>
                        <div className="flex justify-end space-x-3 pt-2 border-t border-slate-100 mt-2">
                            <button onClick={() => setIsStudentModalOpen(false)} className="px-5 py-2 text-sm border border-slate-300 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors">Batal</button>
                            <button onClick={handleSaveStudent} disabled={isLoading} className="px-5 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-colors">{isLoading ? 'Menyimpan...' : 'Simpan Data'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= MODAL GENERATE MASSAL ================= */}
            {isVoucherModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in-up">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <h2 className="text-lg font-bold text-slate-800 mb-5">Generate Tagihan & Voucher (Massal)</h2>
                        {error && <div className="mb-4 text-xs font-semibold text-red-600 p-3 bg-red-50 rounded-lg border border-red-200">{error}</div>}
                        
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Target Kelas</label>
                                <select value={bulkForm.class} onChange={(e) => setBulkForm({...bulkForm, class: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                                    <option value="">-- Pilih Kelas --</option>
                                    {uniqueClasses.map((cls, idx) => <option key={idx} value={cls}>Kelas {cls}</option>)}
                                </select>
                            </div>
                            <div className="flex space-x-3">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Bulan</label>
                                    <select value={bulkForm.month} onChange={(e) => setBulkForm({...bulkForm, month: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                                        <option value="">-- Bulan --</option>
                                        {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div className="w-1/3">
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Tahun</label>
                                    <input type="number" value={bulkForm.year} onChange={(e) => setBulkForm({...bulkForm, year: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Nominal (Rp)</label>
                                <input type="number" value={bulkForm.amount} onChange={(e) => setBulkForm({...bulkForm, amount: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Contoh: 250000" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Batas Jatuh Tempo</label>
                                <input type="date" min={todayISOString} value={bulkForm.due_date} onChange={(e) => setBulkForm({...bulkForm, due_date: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700" />
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 pt-2 border-t border-slate-100 mt-2">
                            <button onClick={() => setIsVoucherModalOpen(false)} className="px-5 py-2 text-sm border border-slate-300 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors">Batal</button>
                            <button onClick={handleGenerateBulkVoucher} disabled={isLoading} className="px-5 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-colors">{isLoading ? 'Memproses...' : 'Generate Massal'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= MODAL GENERATE SPESIFIK ================= */}
            {isSpecificVoucherModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <h2 className="text-lg font-bold text-slate-800 mb-1">Generate Tagihan Spesifik</h2>
                        {error && <div className="mb-4 text-xs font-semibold text-red-600 p-3 bg-red-50 rounded-lg border border-red-200">{error}</div>}
                        
                        <div className="space-y-4 mb-6">
                            <div className="relative">
                                <label className="block text-xs font-bold text-slate-600 mb-1">Cari Siswa</label>
                                <input 
                                    type="text"
                                    value={showStudentDropdown ? studentSearchTerm : selectedStudentName}
                                    onChange={(e) => { setStudentSearchTerm(e.target.value); setShowStudentDropdown(true); }}
                                    onFocus={() => { setShowStudentDropdown(true); setStudentSearchTerm(''); }}
                                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="Ketik Nama Siswa..."
                                />
                                {showStudentDropdown && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-40 overflow-y-auto">
                                        {students.filter(s => (s.name || s.Name).toLowerCase().includes(studentSearchTerm.toLowerCase())).map(s => (
                                            <div key={s.id || s.ID} onClick={() => { setSpecificForm({...specificForm, student_id: s.id || s.ID}); setSelectedStudentName(`${s.name || s.Name} - ${s.class || s.Class}`); setShowStudentDropdown(false); }} className="p-3 hover:bg-indigo-50 cursor-pointer border-b text-sm">
                                                <p className="font-bold">{s.name || s.Name}</p>
                                                <p className="text-xs text-slate-400">NIS: {s.nis || s.Nis} • Kelas: {s.class || s.Class}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex space-x-3">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Bulan</label>
                                    <select value={specificForm.month} onChange={(e) => setSpecificForm({...specificForm, month: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-white">
                                        <option value="">-- Pilih --</option>
                                        {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div className="w-1/3">
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Tahun</label>
                                    <input type="number" value={specificForm.year} onChange={(e) => setSpecificForm({...specificForm, year: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-xl text-sm" />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Nominal (Rp)</label>
                                <input type="number" value={specificForm.amount} onChange={(e) => setSpecificForm({...specificForm, amount: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-xl text-sm font-bold" placeholder="250000" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Jatuh Tempo</label>
                                <input type="date" min={todayISOString} value={specificForm.due_date} onChange={(e) => setSpecificForm({...specificForm, due_date: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-xl text-sm" />
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 pt-2 border-t border-slate-100 mt-2">
                            <button onClick={() => setIsSpecificVoucherModalOpen(false)} className="px-5 py-2 text-sm border border-slate-300 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors">Batal</button>
                            <button onClick={handleGenerateSpecificVoucher} disabled={isLoading} className="px-5 py-2 text-sm bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-md transition-colors">{isLoading ? 'Memproses...' : 'Generate 1 Siswa'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= MODAL UBAH PASSWORD ADMIN ================= */}
            {isPasswordModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in-up">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <h2 className="text-lg font-bold text-slate-800 mb-2">Ubah Password Admin</h2>
                        
                        {pwdMessage && <div className="mb-3 text-xs text-green-700 p-3 bg-green-50 rounded-lg border border-green-200 font-semibold">{pwdMessage}</div>}
                        {pwdError && <div className="mb-3 text-xs text-red-600 p-3 bg-red-50 rounded-lg border border-red-200 font-semibold">{pwdError}</div>}
                        
                        <form onSubmit={handleChangePassword} className="space-y-4 mt-4">
                            <div><label className="block text-xs font-bold text-slate-600 mb-1">Password Saat Ini</label><input type="password" required value={passwordForm.old_password} onChange={e => setPasswordForm({...passwordForm, old_password: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="••••••••" /></div>
                            <div><label className="block text-xs font-bold text-slate-600 mb-1">Password Baru</label><input type="password" required value={passwordForm.new_password} onChange={e => setPasswordForm({...passwordForm, new_password: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Minimal 6 karakter" /></div>
                            <div><label className="block text-xs font-bold text-slate-600 mb-1">Konfirmasi Password Baru</label><input type="password" required value={passwordForm.confirm_password} onChange={e => setPasswordForm({...passwordForm, confirm_password: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ulangi password baru" /></div>
                            
                            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 mt-4">
                                <button type="button" onClick={() => { setIsPasswordModalOpen(false); setPwdError(''); setPwdMessage(''); }} className="px-5 py-2.5 text-sm border border-slate-300 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors">Batal</button>
                                <button type="submit" disabled={pwdLoading} className="px-5 py-2.5 text-sm bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md transition-colors">{pwdLoading ? 'Memproses...' : 'Simpan Password'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ================= MODAL HAPUS TAGIHAN MASAL ================= */}
            {isBulkDeleteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in-up">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <h2 className="text-lg font-bold text-red-700 mb-2">🗑️ Pembatalan & Hapus Tagihan Masal</h2>
                        <p className="text-xs text-slate-500 mb-4">Fitur ini digunakan jika admin salah input bulan/nominal saat melakukan generate per kelas.</p>
                        {error && <div className="mb-4 text-xs font-semibold text-red-600 p-3 bg-red-50 rounded-lg border border-red-200">{error}</div>}
                        
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Target Kelas</label>
                                <select value={bulkDeleteForm.class} onChange={(e) => setBulkDeleteForm({...bulkDeleteForm, class: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none bg-white">
                                    <option value="">-- Pilih Kelas --</option>
                                    {uniqueClasses.map((cls, idx) => <option key={idx} value={cls}>Kelas {cls}</option>)}
                                </select>
                            </div>
                            <div className="flex space-x-3">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Bulan</label>
                                    <select value={bulkDeleteForm.month} onChange={(e) => setBulkDeleteForm({...bulkDeleteForm, month: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none bg-white">
                                        <option value="">-- Bulan --</option>
                                        {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div className="w-1/3">
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Tahun</label>
                                    <input type="number" value={bulkDeleteForm.year} onChange={(e) => setBulkDeleteForm({...bulkDeleteForm, year: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none" />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 pt-2 border-t border-slate-100 mt-2">
                            <button onClick={() => setIsBulkDeleteModalOpen(false)} className="px-5 py-2 text-sm border border-slate-300 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors">Batal</button>
                            <button onClick={handleBulkDeleteVoucher} disabled={isLoading} className="px-5 py-2 text-sm bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md transition-colors">{isLoading ? 'Menghapus...' : 'Hapus Seluruh Tagihan'}</button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .animate-fade-in-up { animation: fadeInUp 0.3s ease-out forwards; }
                @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
}