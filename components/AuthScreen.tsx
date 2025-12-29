import React, { useState } from 'react';
// Correct modular imports to fix compiler errors for missing members
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { auth } from '../services/firebase';
import { Icon } from './icons';

export const AuthScreen: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('phuochuynh@gmail.com');
  const [password, setPassword] = useState('Vietnam2k');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Explicitly set modular persistence before sign-in/sign-up
      await setPersistence(auth, browserLocalPersistence);
      
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (name) {
          await updateProfile(userCredential.user, { displayName: name });
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#09090b] font-sans overflow-hidden">
      {/* Visual Side */}
      <div className="hidden lg:block w-1/2 relative">
        <img 
          src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop" 
          className="absolute inset-0 w-full h-full object-cover grayscale opacity-40"
          alt="Modern Architecture"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#09090b] via-[#09090b]/60 to-transparent flex flex-col justify-end p-20">
          <div className="max-w-md">
            <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center mb-8 shadow-2xl shadow-orange-500/20">
              <Icon name="sparkles" className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-5xl font-black text-white tracking-tighter mb-4 uppercase italic">NamO Academy AI</h1>
            <p className="text-zinc-400 text-lg leading-relaxed font-medium">
              Sức mạnh AI thay đổi hoàn toàn quy trình thiết kế kiến trúc và nội thất chuyên nghiệp.
            </p>
          </div>
        </div>
      </div>

      {/* Form Side */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-[#09090b]">
        <div className="w-full max-w-md fade-in">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-white tracking-tight uppercase mb-2">
              {isLogin ? 'Chào mừng trở lại' : 'Tạo tài khoản'}
            </h2>
            <p className="text-zinc-500 font-medium">
              {isLogin ? 'Nhập thông tin để tiếp tục thiết kế' : 'Bắt đầu hành trình sáng tạo cùng AI ngay hôm nay'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-sm font-bold">
                <Icon name="x-circle" className="w-5 h-5" />
                <span>{error}</span>
              </div>
            )}

            {!isLogin && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Họ và tên</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-white font-bold focus:ring-1 focus:ring-orange-500 focus:border-orange-500 focus:outline-none transition-all placeholder:text-zinc-700"
                  placeholder="Vd: Nguyễn Văn A"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-white font-bold focus:ring-1 focus:ring-orange-500 focus:border-orange-500 focus:outline-none transition-all placeholder:text-zinc-700"
                placeholder="name@example.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Mật khẩu</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-white font-bold focus:ring-1 focus:ring-orange-500 focus:border-orange-500 focus:outline-none transition-all placeholder:text-zinc-700"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-4 px-6 rounded-xl transition-all shadow-xl shadow-orange-900/10 active:scale-95 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:shadow-none flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
            >
              {loading ? (
                <Icon name="sparkles" className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Icon name={isLogin ? 'key' : 'plus-circle'} className="w-5 h-5" />
                  <span>{isLogin ? 'Đăng nhập' : 'Đăng ký ngay'}</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm font-bold text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {isLogin ? 'Chưa có tài khoản? Đăng ký ngay' : 'Đã có tài khoản? Đăng nhập'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};