// src/pages/StudentDashboard.jsx
import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';

export default function StudentDashboard() {
    const navigate = useNavigate();

    // State Navigasi Sidebar
    const [activeMenu, setActiveMenu] = useState('dashboard');

    // Data State
    const [invoices, setInvoices] = useState([]);
    const [vouchers, setVouchers] = useState([]);
    const [studentProfile, setStudentProfile] = useState(null);
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [voucherCode, setVoucherCode] = useState('');

    // Status State
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Rubah password State
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ old_password: '', new_password: '', confirm_password: '' });
    const [pwdMessage, setPwdMessage] = useState('');
    const [pwdError, setPwdError] = useState('');
    const [pwdLoading, setPwdLoading] = useState(false);

    // Fungsi rubah password
    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (passwordForm.new_password !== passwordForm.confirm_password) {
            return setPwdError("Konfirmasi password tidak cocok!");
        }
        
        setPwdLoading(true);
        setPwdError('');
        setPwdMessage('');
        
        try {
            const res = await api.put('/student/change-password', passwordForm);
            setPwdMessage(res.data.message);
            setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
            setTimeout(() => {
                setIsPasswordModalOpen(false);
                setPwdMessage('');
            }, 3000);
        } catch (err) {
            setPwdError(err.response?.data?.error || "Gagal mengubah password.");
        } finally {
            setPwdLoading(false);
        }
    };
    
    // Fungsi Logout
    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    // Ambil Data Tagihan
    const fetchInvoices = async () => {
        try {
            const response = await api.get('/student/invoices');
            const data = response.data.data || response.data || [];
            setInvoices(data);
            
            if (data.length > 0) {
                const profile = data[0].Student || data[0].student;
                if (profile) setStudentProfile(profile);
            }
        } catch (err) {
            console.error('Gagal memuat tagihan:', err);
        }
    };

    // Ambil Data Voucher
    const fetchVouchers = async () => {
        try {
            const response = await api.get('/student/vouchers');
            setVouchers(response.data.data || response.data || []);
        } catch (err) {
            console.error('Gagal memuat voucher:', err);
        }
    };

    // Buka Modal Pembayaran
    const openPaymentModal = (invoice) => {
        setSelectedInvoice(invoice);
        setVoucherCode(''); 
        setIsModalOpen(true);
        setMessage('');
        setError('');
    };

    // Tutup Modal Pembayaran
    const closePaymentModal = () => {
        setIsModalOpen(false);
        setSelectedInvoice(null);
        setVoucherCode('');
    };

    // Copy Voucher
    const handleCopyVoucher = async (code) => {
        try {
            await navigator.clipboard.writeText(code);
            setMessage(`Berhasil disalin! Silakan paste kode ${code} saat konfirmasi pembayaran.`);
            setTimeout(() => setMessage(''), 4000); 
        } catch (err) {
            console.error("Gagal menyalin ke clipboard: ", err);
            setMessage(`Silakan ketik manual kode ${code} saat pembayaran.`);
        }
    };

    // Proses Pembayaran
    const handleProcessPayment = async () => {
        if (!selectedInvoice) return;
        
        setIsLoading(true);
        setMessage('');
        setError('');

        try {
            const response = await api.post('/student/checkout', {
                invoice_id: selectedInvoice.id,
                voucher_code: voucherCode
            });
            
            setIsModalOpen(false);

            if (window.snap) {
                window.snap.pay(response.data.token, {
                    onSuccess: function(result){
                        alert("Pembayaran Berhasil!");
                        fetchInvoices();
                        fetchVouchers(); 
                        setVoucherCode(''); 
                    },
                    onPending: function(result){
                        alert("Menunggu Pembayaran...");
                        fetchInvoices();
                    },
                    onError: function(result){
                        alert("Pembayaran Gagal!");
                    }
                });
            } else {
                setError('Midtrans Snap SDK tidak terdeteksi.');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Gagal memproses checkout pembayaran');
        } finally {
            setIsLoading(false);
        }
    };

    // Batal Pending
    const handleCancelPending = async () => {
        if (!selectedInvoice) return;
        if (!window.confirm("Apakah Anda yakin ingin mereset/mengganti metode pembayaran? Transaksi sebelumnya akan dibatalkan.")) return;
        
        setIsLoading(true);
        setError('');
        
        try {
            const res = await api.put(`/student/invoices/${selectedInvoice.id}/cancel-payment`);
            setMessage(res.data.message);
            setTimeout(() => setMessage(''), 4000);
        } catch (err) {
            setError(err.response?.data?.error || "Gagal membatalkan transaksi.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
        fetchVouchers();
    }, []);

    const unpaidInvoices = invoices.filter(item => {
        const status = item.status || item.Status || '';
        return status.toLowerCase() !== 'paid';
    });

    const paidInvoices = invoices.filter(item => {
        const status = item.status || item.Status || '';
        return status.toLowerCase() === 'paid';
    });

    const activeVouchers = vouchers.filter(item => {
        const status = item.status || item.Status || '';
        return status.toLowerCase() === 'active' || status.toLowerCase() === 'aktif';
    });

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">
            
            {/* ================= SIDEBAR KIRI ================= */}
            <aside className="w-64 bg-blue-900 text-white flex flex-col shadow-xl z-20 flex-shrink-0">
                <div className="p-6 border-b border-blue-800">
                    <h1 className="text-2xl font-extrabold tracking-wide">Portal Siswa</h1>
                    {studentProfile && (
                        <div className="mt-4 p-3 bg-blue-800/50 rounded-lg">
                            <p className="text-[10px] text-blue-300 uppercase tracking-wider mb-1">Masuk Sebagai</p>
                            <p className="font-semibold text-sm truncate">{studentProfile.name}</p>
                            <p className="text-xs text-blue-200 mt-0.5">Kelas: {studentProfile.class}</p>
                        </div>
                    )}
                </div>
                
                {/* Navigasi Menu */}
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    <p className="px-3 mb-2 text-xs font-semibold tracking-wider text-blue-400 uppercase">Menu Utama</p>
                    
                    <button 
                        onClick={() => setActiveMenu('dashboard')}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${activeMenu === 'dashboard' ? 'bg-blue-600 text-white shadow-md' : 'text-blue-200 hover:bg-blue-800 hover:text-white'}`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                        Beranda & Voucher
                    </button>
                    
                    <button 
                        onClick={() => setActiveMenu('tagihan')}
                        className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${activeMenu === 'tagihan' ? 'bg-blue-600 text-white shadow-md' : 'text-blue-200 hover:bg-blue-800 hover:text-white'}`}
                    >
                        <div className="flex items-center gap-3">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            Tagihan Aktif
                        </div>
                        {unpaidInvoices.length > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{unpaidInvoices.length}</span>
                        )}
                    </button>
                    
                    <button 
                        onClick={() => setActiveMenu('riwayat')}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${activeMenu === 'riwayat' ? 'bg-blue-600 text-white shadow-md' : 'text-blue-200 hover:bg-blue-800 hover:text-white'}`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                        Riwayat Lunas
                    </button>
                </nav>

                {/* Footer Sidebar */}
                <div className="p-4 border-t border-blue-800 space-y-3">
                    <button 
                        onClick={() => setIsPasswordModalOpen(true)} 
                        className="w-full flex items-center justify-center gap-2 p-2.5 text-sm bg-blue-800/80 text-blue-100 rounded-lg hover:bg-blue-700 hover:text-white transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        Ubah Password
                    </button>
                    <button 
                        onClick={handleLogout} 
                        className="w-full flex items-center justify-center gap-2 p-2.5 text-sm bg-red-600/90 text-white rounded-lg hover:bg-red-500 transition-colors shadow-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        Keluar
                    </button>
                </div>
            </aside>

            {/* ================= AREA KONTEN UTAMA ================= */}
            <main className="flex-1 overflow-y-auto bg-slate-50 relative">
                
                {/* Header Dinamis */}
                <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-5">
                    <h2 className="text-xl font-bold text-slate-800 capitalize">
                        {activeMenu === 'dashboard' ? 'Ringkasan & Voucher' : activeMenu === 'tagihan' ? 'Tagihan Tertunda' : 'Riwayat Pembayaran'}
                    </h2>
                </header>

                <div className="p-8 max-w-5xl mx-auto">
                    
                    {/* Pesan Global */}
                    {message && !isModalOpen && <div className="p-4 mb-6 text-sm text-green-700 bg-green-100 border border-green-200 rounded-lg shadow-sm flex items-center gap-3"><svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>{message}</div>}
                    {error && !isModalOpen && <div className="p-4 mb-6 text-sm text-red-700 bg-red-100 border border-red-200 rounded-lg shadow-sm flex items-center gap-3"><svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>{error}</div>}

                    {/* --- KONTEN BERANDA & VOUCHER --- */}
                    {activeMenu === 'dashboard' && (
                        <div className="animate-fade-in-up">
                            <div className="p-8 bg-white border border-slate-200 rounded-2xl shadow-sm bg-gradient-to-br from-blue-50/50 to-indigo-50/30">
                                <h2 className="mb-2 text-base font-bold text-slate-800 flex items-center gap-2">
                                    🎟️ List Voucher Pembayaran Anda
                                </h2>
                                <p className="mb-6 text-sm text-slate-500">Klik tombol di bawah ini untuk menyalin kode voucher yang aktif.</p>
                                
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {activeVouchers.length === 0 ? (
                                        <div className="col-span-full p-6 text-center border-2 border-dashed border-slate-200 rounded-xl">
                                            <p className="text-sm text-slate-400">Belum ada voucher pembayaran aktif yang tersedia saat ini.</p>
                                        </div>
                                    ) : (
                                        activeVouchers.map((voucher) => (
                                            <div 
                                                key={voucher.id} 
                                                onClick={() => handleCopyVoucher(voucher.code)}
                                                className="p-4 border border-slate-200 rounded-xl bg-white shadow-sm flex flex-col justify-center items-center cursor-pointer hover:border-blue-500 hover:shadow-md transition-all group relative overflow-hidden"
                                            >
                                                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 transform -translate-x-full group-hover:translate-x-0 transition-transform"></div>
                                                <span className="px-4 py-2 bg-slate-50 text-slate-700 text-sm font-mono font-bold border border-dashed border-slate-300 rounded group-hover:bg-blue-50 group-hover:text-blue-700 group-hover:border-blue-300 transition-colors">
                                                    {voucher.code}
                                                </span>
                                                <p className="mt-3 text-[11px] text-slate-400 group-hover:text-blue-600 font-bold uppercase tracking-widest flex items-center gap-1.5">
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                    Salin Kode
                                                </p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- KONTEN TAGIHAN TERTUNDA --- */}
                    {activeMenu === 'tagihan' && (
                        <div className="animate-fade-in-up">
                            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                    <h2 className="text-lg font-bold text-slate-800">Menunggu Pembayaran</h2>
                                    <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold shadow-sm">
                                        {unpaidInvoices.length} Tagihan Aktif
                                    </span>
                                </div>
                                
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50">
                                                <th className="p-4 text-xs font-bold uppercase text-slate-500 border-b border-slate-200">Bulan & Tahun</th>
                                                <th className="p-4 text-xs font-bold uppercase text-slate-500 border-b border-slate-200">Keterangan</th>
                                                <th className="p-4 text-xs font-bold uppercase text-slate-500 border-b border-slate-200">Nominal</th>
                                                <th className="p-4 text-xs font-bold uppercase text-slate-500 border-b border-slate-200 text-center">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {unpaidInvoices.length === 0 ? (
                                                <tr>
                                                    <td colSpan="4" className="p-12 text-sm text-center text-slate-500">
                                                        <div className="flex flex-col items-center justify-center">
                                                            <span className="text-4xl mb-3">🎉</span>
                                                            <p className="font-medium text-slate-700">Hore! Semua tagihan SPP Anda telah lunas.</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                unpaidInvoices.map((invoice) => (
                                                    <tr key={invoice.id} className="hover:bg-slate-50/80 transition-colors">
                                                        <td className="p-4 text-sm font-bold text-slate-800">{invoice.month} {invoice.year}</td>
                                                        <td className="p-4 text-sm text-slate-500">{invoice.description || 'SPP Reguler Bulanan'}</td>
                                                        <td className="p-4 text-sm text-red-600 font-bold">Rp {invoice.amount.toLocaleString('id-ID')}</td>
                                                        <td className="p-4 text-center">
                                                            <button 
                                                                onClick={() => openPaymentModal(invoice)} 
                                                                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 hover:shadow-md transition-all whitespace-nowrap"
                                                            >
                                                                Bayar Sekarang
                                                            </button>
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

                    {/* --- KONTEN RIWAYAT LUNAS --- */}
                    {activeMenu === 'riwayat' && (
                        <div className="animate-fade-in-up">
                            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                                    <h2 className="text-lg font-bold text-slate-800">Daftar Transaksi Selesai</h2>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50">
                                                <th className="p-4 text-xs font-bold uppercase text-slate-500 border-b border-slate-200">Bulan & Tahun</th>
                                                <th className="p-4 text-xs font-bold uppercase text-slate-500 border-b border-slate-200">Keterangan</th>
                                                <th className="p-4 text-xs font-bold uppercase text-slate-500 border-b border-slate-200">Nominal Lunas</th>
                                                <th className="p-4 text-xs font-bold uppercase text-slate-500 border-b border-slate-200 text-center">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {paidInvoices.length === 0 ? (
                                                <tr>
                                                    <td colSpan="4" className="p-12 text-sm text-center text-slate-400">
                                                        Belum ada riwayat pembayaran yang diselesaikan.
                                                    </td>
                                                </tr>
                                            ) : (
                                                paidInvoices.map((invoice) => (
                                                    <tr key={invoice.id} className="bg-green-50/20 hover:bg-green-50/50 transition-colors">
                                                        <td className="p-4 text-sm font-semibold text-slate-700">{invoice.month} {invoice.year}</td>
                                                        <td className="p-4 text-sm text-slate-500">{invoice.description || 'SPP Reguler'}</td>
                                                        <td className="p-4 text-sm text-green-600 font-bold">Rp {invoice.amount.toLocaleString('id-ID')}</td>
                                                        <td className="p-4 text-center">
                                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-extrabold shadow-sm">
                                                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                                                LUNAS
                                                            </span>
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
                </div>
            </main>

            {/* ================= MODAL PEMBAYARAN ================= */}
            {isModalOpen && selectedInvoice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 animate-fade-in-up">
                        <div className="px-6 py-5 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-blue-900">Konfirmasi Pembayaran</h3>
                            <button onClick={closePaymentModal} className="text-blue-400 hover:text-blue-700">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="mb-5 p-5 bg-slate-50 border border-slate-200 rounded-xl shadow-inner">
                                <div className="flex justify-between items-end mb-3">
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1 font-medium">Tagihan Bulan</p>
                                        <p className="text-base font-bold text-slate-800">{selectedInvoice.month} {selectedInvoice.year}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-500 mb-1 font-medium">Total Dibayar</p>
                                        <p className="text-xl font-black text-red-600">Rp {selectedInvoice.amount.toLocaleString('id-ID')}</p>
                                    </div>
                                </div>
                            </div>

                            {error && <div className="p-3 mb-4 text-xs font-semibold text-red-700 bg-red-100 rounded-lg border border-red-200">{error}</div>}

                            <div className="mb-2">
                                <label className="block text-sm font-bold text-slate-700 mb-2">
                                    Masukkan Kode Voucher
                                </label>
                                <input 
                                    type="text" 
                                    value={voucherCode}
                                    onChange={(e) => setVoucherCode(e.target.value)}
                                    placeholder="Contoh: SPP-JULI2026-NIS"
                                    className="w-full p-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono uppercase tracking-widest text-slate-800 transition-all outline-none shadow-sm bg-white"
                                />
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
                            <button 
                                onClick={handleCancelPending}
                                disabled={isLoading}
                                className="text-xs font-bold text-red-500 hover:text-red-700 px-2 py-2 rounded transition-colors disabled:text-red-300 disabled:bg-transparent hover:bg-red-50"
                            >
                                Ganti Metode Pembayaran
                            </button>

                            <div className="flex space-x-3 w-full sm:w-auto justify-end">
                                <button 
                                    onClick={closePaymentModal}
                                    disabled={isLoading}
                                    className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors"
                                >
                                    Batal
                                </button>
                                <button 
                                    onClick={handleProcessPayment}
                                    disabled={isLoading}
                                    className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-md hover:shadow-lg disabled:bg-blue-400 flex items-center transition-all"
                                >
                                    {isLoading ? 'Memproses...' : 'Lanjutkan Pembayaran'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= MODAL UBAH PASSWORD ================= */}
            {isPasswordModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-7 animate-fade-in-up">
                        <h2 className="text-xl font-bold text-slate-800 mb-1">Ubah Password Akun</h2>
                        <p className="text-sm text-slate-500 mb-6">Amankan akun Anda dengan password baru.</p>
                        
                        {pwdMessage && <div className="mb-4 text-xs text-green-700 p-3 bg-green-50 rounded-lg border border-green-200 font-semibold">{pwdMessage}</div>}
                        {pwdError && <div className="mb-4 text-xs text-red-600 p-3 bg-red-50 rounded-lg border border-red-200 font-semibold">{pwdError}</div>}
                        
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">Password Saat Ini</label>
                                <input 
                                    type="password" 
                                    required
                                    value={passwordForm.old_password} 
                                    onChange={e => setPasswordForm({...passwordForm, old_password: e.target.value})} 
                                    className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" 
                                    placeholder="••••••••" 
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">Password Baru</label>
                                <input 
                                    type="password" 
                                    required
                                    value={passwordForm.new_password} 
                                    onChange={e => setPasswordForm({...passwordForm, new_password: e.target.value})} 
                                    className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" 
                                    placeholder="Minimal 6 karakter" 
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">Konfirmasi Password Baru</label>
                                <input 
                                    type="password" 
                                    required
                                    value={passwordForm.confirm_password} 
                                    onChange={e => setPasswordForm({...passwordForm, confirm_password: e.target.value})} 
                                    className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" 
                                    placeholder="Ulangi password baru" 
                                />
                            </div>
                            
                            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 mt-6">
                                <button 
                                    type="button"
                                    onClick={() => { setIsPasswordModalOpen(false); setPwdError(''); setPwdMessage(''); }} 
                                    className="px-5 py-2.5 text-sm border border-slate-300 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                                >
                                    Batal
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={pwdLoading} 
                                    className="px-5 py-2.5 text-sm bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
                                >
                                    {pwdLoading ? 'Menyimpan...' : 'Simpan Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Styling tambahan untuk animasi smooth */}
            <style jsx>{`
                .animate-fade-in-up {
                    animation: fadeInUp 0.3s ease-out forwards;
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}