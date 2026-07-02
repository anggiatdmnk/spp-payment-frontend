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
        <div className="flex items-center justify-center min-h-screen bg-slate-100">
            <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
                <h2 className="mb-6 text-2xl font-bold text-center text-slate-800">Sistem SPP Digital</h2>
                
                {errorMsg && (
                    <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded">
                        {errorMsg}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block mb-1 text-sm font-medium text-slate-700">Username</label>
                        <input 
                            type="text" 
                            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block mb-1 text-sm font-medium text-slate-700">Password</label>
                        <input 
                            type="password" 
                            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button 
                        type="submit" 
                        className="w-full p-2 text-white bg-blue-600 rounded hover:bg-blue-700 font-medium transition-colors"
                    >
                        Masuk
                    </button>
                </form>
            </div>
        </div>
    );
}