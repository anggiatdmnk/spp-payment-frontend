// src/pages/StudentDashboard.jsx
import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';

export default function StudentDashboard() {
    const navigate = useNavigate();

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

    // Buka Modal
    const openPaymentModal = (invoice) => {
        setSelectedInvoice(invoice);
        setVoucherCode(''); 
        setIsModalOpen(true);
        setMessage('');
        setError('');
    };

    // Tutup Modal
    const closePaymentModal = () => {
        setIsModalOpen(false);
        setSelectedInvoice(null);
        setVoucherCode('');
    };

    // Fungsi MURNI MENYALIN KODE ke Clipboard (Tanpa Auto-fill)
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

    // Fungsi untuk mereset metode pembayaran
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
        <div className="min-h-screen bg-slate-50 relative">
            <nav className="flex items-center justify-between p-4 text-white bg-blue-900 shadow-md">
                <div>
                    <h1 className="text-xl font-bold tracking-wide">Portal Siswa</h1>
                    {studentProfile && (
                        <p className="text-xs text-blue-200">
                            Siswa: <span className="font-semibold">{studentProfile.name}</span> | Kelas: {studentProfile.class}
                        </p>
                    )}
                </div>
                <div className="flex space-x-2">
                    <button 
                        onClick={() => setIsPasswordModalOpen(true)} 
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-800 border border-blue-700 rounded hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        🔒 Ubah Password
                    </button>
                    <button onClick={handleLogout} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors shadow-sm">
                        Keluar Aplikasi
                    </button>
                </div>
            </nav>

            <div className="max-w-4xl p-6 mx-auto mt-6">
                {message && !isModalOpen && <div className="p-4 mb-4 text-sm text-green-700 bg-green-100 border border-green-200 rounded-lg shadow-sm">{message}</div>}
                {error && !isModalOpen && <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 border border-red-200 rounded-lg shadow-sm">{error}</div>}

                {/* 1. DAFTAR VOUCHER PEMBAYARAN AKTIF */}
                <div className="p-6 mb-6 bg-white border border-slate-200 rounded-xl shadow-sm bg-gradient-to-r from-blue-50/40 to-indigo-50/20">
                    <h2 className="mb-1 text-sm font-bold text-slate-800 flex items-center">🎟️ List Voucher Pembayaran Anda</h2>
                    <p className="mb-4 text-xs text-slate-500">Klik tombol salin pada voucher yang aktif di bawah ini untuk menggunakannya.</p>
                    
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {activeVouchers.length === 0 ? (
                            <p className="text-xs text-slate-400 col-span-3 italic">Belum ada voucher pembayaran aktif yang tersedia.</p>
                        ) : (
                            activeVouchers.map((voucher) => (
                                <div 
                                    key={voucher.id} 
                                    onClick={() => handleCopyVoucher(voucher.code)}
                                    className="p-3 border border-slate-200 rounded-lg bg-white shadow-sm flex flex-col justify-center items-center cursor-pointer hover:border-blue-500 hover:shadow-md transition-all group"
                                >
                                    <span className="px-3 py-1 bg-slate-100 text-slate-700 text-sm font-mono font-bold border border-dashed border-slate-300 rounded group-hover:bg-blue-50 group-hover:text-blue-700 group-hover:border-blue-300 transition-colors">
                                        {voucher.code}
                                    </span>
                                    <p className="mt-2 text-[10px] text-slate-400 group-hover:text-blue-500 font-medium uppercase tracking-wider flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                        Salin Kode
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* 2. TAGIHAN BELUM DIBAYAR */}
                <div className="p-6 mb-6 bg-white border border-slate-200 rounded-xl shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-slate-800">⚠️ Tagihan Belum Dibayar</h2>
                        <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-bold">
                            {unpaidInvoices.length} Tagihan Aktif
                        </span>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50/70">
                                    <th className="p-3 text-xs font-bold uppercase text-slate-500">Bulan & Tahun</th>
                                    <th className="p-3 text-xs font-bold uppercase text-slate-500">Keterangan</th>
                                    <th className="p-3 text-xs font-bold uppercase text-slate-500">Nominal</th>
                                    <th className="p-3 text-xs font-bold uppercase text-slate-500 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {unpaidInvoices.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="p-6 text-sm text-center text-slate-500 bg-slate-50/30">
                                            Hore! Semua tagihan SPP Anda telah lunas. 🎉
                                        </td>
                                    </tr>
                                ) : (
                                    unpaidInvoices.map((invoice) => (
                                        <tr key={invoice.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                                            <td className="p-3 text-sm font-semibold text-slate-800">{invoice.month} {invoice.year}</td>
                                            <td className="p-3 text-sm text-slate-500">{invoice.description || 'SPP Reguler Bulanan'}</td>
                                            <td className="p-3 text-sm text-red-600 font-bold">Rp {invoice.amount.toLocaleString('id-ID')}</td>
                                            <td className="p-3 text-sm text-center">
                                                <button 
                                                    onClick={() => openPaymentModal(invoice)} 
                                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 shadow-sm transition-all whitespace-nowrap"
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

                {/* 3. RIWAYAT PEMBAYARAN LUNAS */}
                <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-slate-800">✅ Riwayat Pembayaran SPP (Lunas)</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50/70">
                                    <th className="p-3 text-xs font-bold uppercase text-slate-500">Bulan & Tahun</th>
                                    <th className="p-3 text-xs font-bold uppercase text-slate-500">Keterangan</th>
                                    <th className="p-3 text-xs font-bold uppercase text-slate-500">Nominal Lunas</th>
                                    <th className="p-3 text-xs font-bold uppercase text-slate-500 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paidInvoices.length === 0 ? (
                                    <tr><td colSpan="4" className="p-6 text-sm text-center text-slate-500">Belum ada riwayat lunas.</td></tr>
                                ) : (
                                    paidInvoices.map((invoice) => (
                                        <tr key={invoice.id} className="border-b border-slate-100 bg-green-50/5">
                                            <td className="p-3 text-sm font-medium text-slate-700">{invoice.month} {invoice.year}</td>
                                            <td className="p-3 text-sm text-slate-500">{invoice.description || 'SPP Reguler'}</td>
                                            <td className="p-3 text-sm text-green-600 font-semibold">Rp {invoice.amount.toLocaleString('id-ID')}</td>
                                            <td className="p-3 text-sm text-center">
                                                <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">LUNAS ✓</span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* MODAL PEMBAYARAN */}
            {isModalOpen && selectedInvoice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
                        <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
                            <h3 className="text-lg font-bold text-blue-900">Konfirmasi Pembayaran</h3>
                        </div>

                        <div className="p-6">
                            <div className="mb-5 p-4 bg-slate-50 border border-slate-100 rounded-lg">
                                <p className="text-xs text-slate-500 mb-1">Tagihan Bulan:</p>
                                <p className="text-sm font-bold text-slate-800 mb-3">{selectedInvoice.month} {selectedInvoice.year}</p>
                                <p className="text-xs text-slate-500 mb-1">Total Dibayar:</p>
                                <p className="text-lg font-bold text-red-600">Rp {selectedInvoice.amount.toLocaleString('id-ID')}</p>
                            </div>

                            {error && <div className="p-3 mb-4 text-xs text-red-700 bg-red-100 rounded border border-red-200">{error}</div>}

                            <div className="mb-2">
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Masukkan Voucher Pembayaran
                                </label>
                                <input 
                                    type="text" 
                                    value={voucherCode}
                                    onChange={(e) => setVoucherCode(e.target.value)}
                                    placeholder="Masukkan kode pembayaran"
                                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono uppercase tracking-widest text-slate-800 transition-all"
                                />
                            </div>
                        </div>

                        {/* FOOTER MODAL YANG SUDAH DILENGKAPI TOMBOL RESET CANCEL */}
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
                            <button 
                                onClick={handleCancelPending}
                                disabled={isLoading}
                                className="text-xs font-semibold text-red-500 hover:text-red-700 underline px-2 transition-colors disabled:text-red-300"
                            >
                                Ganti Metode / Ulangi Pembayaran
                            </button>

                            <div className="flex space-x-3 w-full sm:w-auto justify-end">
                                <button 
                                    onClick={closePaymentModal}
                                    disabled={isLoading}
                                    className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
                                >
                                    Batal
                                </button>
                                <button 
                                    onClick={handleProcessPayment}
                                    disabled={isLoading}
                                    className="px-5 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm disabled:bg-blue-400 flex items-center transition-all"
                                >
                                    {isLoading ? 'Memproses...' : 'Lanjut ke Pembayaran'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL UBAH PASSWORD */}
            {isPasswordModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                        <h2 className="text-lg font-bold text-slate-800 mb-2">Ubah Password Akun</h2>
                        <p className="text-xs text-slate-500 mb-4">Demi keamanan, pastikan password Anda tidak mudah ditebak orang lain.</p>
                        
                        {pwdMessage && <div className="mb-3 text-xs text-green-700 p-2.5 bg-green-50 rounded border border-green-200 font-semibold">{pwdMessage}</div>}
                        {pwdError && <div className="mb-3 text-xs text-red-600 p-2.5 bg-red-50 rounded border border-red-200 font-semibold">{pwdError}</div>}
                        
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Password Saat Ini</label>
                                <input 
                                    type="password" 
                                    required
                                    value={passwordForm.old_password} 
                                    onChange={e => setPasswordForm({...passwordForm, old_password: e.target.value})} 
                                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                                    placeholder="••••••••" 
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Password Baru</label>
                                <input 
                                    type="password" 
                                    required
                                    value={passwordForm.new_password} 
                                    onChange={e => setPasswordForm({...passwordForm, new_password: e.target.value})} 
                                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                                    placeholder="Minimal 6 karakter" 
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Konfirmasi Password Baru</label>
                                <input 
                                    type="password" 
                                    required
                                    value={passwordForm.confirm_password} 
                                    onChange={e => setPasswordForm({...passwordForm, confirm_password: e.target.value})} 
                                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                                    placeholder="Ulangi password baru" 
                                />
                            </div>
                            
                            <div className="flex justify-end space-x-2 pt-2">
                                <button 
                                    type="button"
                                    onClick={() => { setIsPasswordModalOpen(false); setPwdError(''); setPwdMessage(''); }} 
                                    className="px-4 py-2 text-sm border border-slate-300 rounded-lg font-semibold text-slate-600 hover:bg-slate-50"
                                >
                                    Batal
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={pwdLoading} 
                                    className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow transition-colors"
                                >
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