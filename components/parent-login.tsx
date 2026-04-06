'use client';

import { useState, useEffect } from 'react';
import { X, Lock, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ParentLoginProps {
  onClose: () => void;
}

export default function ParentLogin({ onClose }: ParentLoginProps) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSetup, setIsSetup] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSetup = async () => {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        setIsSetup(!data.hasPassword);
      } catch {
        setError('Bağlantı hatası');
      } finally {
        setLoading(false);
      }
    };
    checkSetup();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isSetup) {
      if (password.length < 4) {
        setError('Şifre en az 4 karakter olmalı');
        return;
      }
      if (password !== confirmPassword) {
        setError('Şifreler eşleşmiyor');
        return;
      }
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/parent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          action: isSetup ? 'setup' : 'login',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Bir hata oluştu');
        return;
      }

      sessionStorage.setItem('parentAuth', 'true');
      router.push('/parent');
    } catch {
      setError('Bağlantı hatası');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Lock className="w-5 h-5 text-indigo-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">
              {isSetup ? 'Ebeveyn Şifresi Oluştur' : 'Ebeveyn Girişi'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-all"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {loading && !error ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSetup && (
              <p className="text-sm text-gray-600 bg-amber-50 p-3 rounded-lg">
                🔐 Bu uygulamanın ayarlarına erişmek için bir ebeveyn şifresi oluşturun.
              </p>
            )}

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Şifre"
                className="w-full py-3 px-4 pr-12 rounded-xl border-2 border-gray-200 focus:border-indigo-400 transition-all"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5 text-gray-400" />
                ) : (
                  <Eye className="w-5 h-5 text-gray-400" />
                )}
              </button>
            </div>

            {isSetup && (
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Şifreyi Tekrarla"
                className="w-full py-3 px-4 rounded-xl border-2 border-gray-200 focus:border-indigo-400 transition-all"
              />
            )}

            {error && (
              <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50"
            >
              {loading ? 'Bekleyin...' : isSetup ? 'Şifre Oluştur' : 'Giriş Yap'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}