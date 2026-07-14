// src/pages/Login.jsx
import { useState } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setErrorMsg('');

        try {
            // Memanggil API Go backend Anda
            const response = await api.post('/login', {
                username,
                password
            });

            const token = response.data.token;
            
            // Simpan token ke LocalStorage
            localStorage.setItem('token', token);

            // Baca role dari token untuk menentukan halaman tujuan
            const decoded = jwtDecode(token);
            
            if (decoded.role === 'admin') {
                navigate('/admin/dashboard');
            } else {
                navigate('/student/dashboard');
            }
            
        } catch (error) {
            setErrorMsg(error.response?.data?.error || 'Login gagal, periksa kembali data Anda.');
        }
    };

    return (
    <div className="flex min-h-screen bg-blue-100"> 
        {/* Sisi Kiri: Gambar (Disembunyikan di layar HP, muncul di layar besar) */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-blue-900">
            <div className="absolute inset-0 bg-blue-900/40 z-10"></div> {/* Overlay gelap */}
            <img 
                src="https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=1000&auto=format&fit=crop" 
                alt="School Background" 
                className="absolute inset-0 object-cover w-full h-full"
            />
            <div className="absolute inset-0 z-20 flex flex-col justify-center px-16 text-white">
                <h1 className="text-5xl font-extrabold tracking-tight mb-4">Sistem Pembayaran SPP</h1>
                <p className="text-lg text-blue-100 max-w-md leading-relaxed">
                    Kelola tagihan dan pembayaran sekolah dengan lebih modern, transparan, dan terintegrasi secara real-time.
                </p>
            </div>
        </div>

        {/* Sisi Kanan: Form Login */}
        <div className="flex flex-col justify-center flex-1 w-full max-w-md px-6 mx-auto lg:w-1/2 lg:max-w-xl">
            <div className="w-full p-10 bg-white border border-slate-200 rounded-[2rem] shadow-2xl">
                <div className="mb-8 text-center">
                    <h2 className="text-3xl font-extrabold text-slate-800">Selamat Datang 👋</h2>
                    <p className="mt-2 text-sm text-slate-500 font-medium">Silakan login untuk mengakses portal Anda.</p>
                </div>
                
                {/* --- BLOK ERROR --- */}
                {errorMsg && (
                    <div className="mb-6 p-4 text-sm font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl animate-fade-in-up">
                        ⚠️ {errorMsg}
                    </div>
                )}
                
                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block mb-1.5 text-sm font-bold text-slate-700">Username</label>
                        <input 
                            type="text" 
                            className="w-full p-3.5 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-800 transition-all text-sm font-medium text-slate-800"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Masukkan username"
                            required
                        />
                    </div>
                    <div>
                        <label className="block mb-1.5 text-sm font-bold text-slate-700">Password</label>
                        <input 
                            type="password" 
                            className="w-full p-3.5 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-800 transition-all text-sm font-medium text-slate-800"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    <button 
                        type="submit" 
                        className="w-full p-3.5 mt-4 text-white bg-slate-800 rounded-xl hover:bg-slate-900 font-bold text-sm shadow-lg shadow-slate-900/20 transition-all active:scale-[0.98]"
                    >
                        Masuk ke Portal
                    </button>
                </form>
                
            </div>
        </div>
    </div>
    );
}