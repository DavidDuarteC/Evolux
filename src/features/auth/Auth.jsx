import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { CheckCircle } from 'lucide-react';

export default function Auth() {
  const { login, register, error: authError, loading, isAuthenticated } = useAuth();
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
  const [localError, setLocalError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Redirect when authenticated (handled by onAuthStateChange)
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMessage(null);

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        setSuccessMessage(t('auth.sessionStarted'));
      } else {
        await register(formData.email, formData.password, formData.name);
        setSuccessMessage(t('auth.accountCreated'));
      }
      navigate('/', { replace: true });
    } catch (err) {
      setLocalError(err.message);
    }
  };

  const displayError = localError || authError;

  return (
    <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-black' : 'bg-[#f5f5f7]'}`}>
      <div className={`glass-card p-8 rounded-2xl w-full max-w-md mx-4 ${isDark ? 'bg-[#18181b]' : 'bg-white/70'}`}>
        <div className="text-center mb-8">
          <h1 className={`text-3xl font-bold font-display mb-2 ${isDark ? 'text-white' : 'text-[#1a1a2e]'}`}>
            Evolux
          </h1>
          <p className={`${isDark ? 'text-white/60' : 'text-[#6b7280]'}`}>
            {isLogin ? t('auth.welcomeBack') : t('auth.createAccount')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/80' : 'text-[#1a1a2e]/80'}`}>
                {t('auth.name')}
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-acid transition-all ${
                  isDark 
                    ? 'bg-white/5 text-white placeholder:text-white/30 border border-white/10' 
                    : 'bg-black/4 text-[#1a1a2e] placeholder:text-[#6b7280] border border-black/8'
                }`}
                placeholder={t('auth.yourName')}
                required={!isLogin}
              />
            </div>
          )}

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/80' : 'text-[#1a1a2e]/80'}`}>
              {t('auth.email')}
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={`w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-acid transition-all ${
                isDark 
                  ? 'bg-white/5 text-white placeholder:text-white/30 border border-white/10' 
                  : 'bg-black/4 text-[#1a1a2e] placeholder:text-[#6b7280] border border-black/8'
              }`}
              placeholder={t('auth.emailPlaceholder')}
              required
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/80' : 'text-[#1a1a2e]/80'}`}>
              {t('auth.password')}
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className={`w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-acid transition-all ${
                isDark 
                  ? 'bg-white/5 text-white placeholder:text-white/30 border border-white/10' 
                  : 'bg-black/4 text-[#1a1a2e] placeholder:text-[#6b7280] border border-black/8'
              }`}
              placeholder={t('auth.passwordPlaceholder')}
              required
            />
          </div>

          {displayError && (
            <div className={`px-4 py-3 rounded-xl text-sm ${
              isDark ? 'bg-red-500/10 border border-red-500/30 text-red-400' : 'bg-red-50 border border-red-200 text-red-600'
            }`}>
              {displayError}
            </div>
          )}

          {successMessage && (
            <div className={`px-4 py-3 rounded-xl text-sm flex items-center gap-2 ${
              isDark ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-green-50 border border-green-200 text-green-600'
            }`}>
              <CheckCircle size={18} />
              {successMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                {t('auth.processing')}
              </>
            ) : (
              isLogin ? t('auth.signIn') : t('auth.signUp')
            )}
          </button>

          {/* Google OAuth (Comentado para futura implementación)
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className={`w-full border-t ${isDark ? 'border-white/10' : 'border-black/10'}`}></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className={`px-2 ${isDark ? 'bg-[#18181b] text-white/40' : 'bg-white text-zinc-500'}`}>O</span>
            </div>
          </div>

          <button
            type="button"
            onClick={async () => {
              try {
                const { supabase } = await import('../../shared/services/supabase');
                await supabase.auth.signInWithOAuth({
                  provider: 'google',
                  options: { redirectTo: window.location.origin }
                });
              } catch (err) {
                setLocalError(err.message);
              }
            }}
            className={`w-full py-3 px-4 rounded-xl border text-sm font-medium flex items-center justify-center gap-3 transition-all ${
              isDark
                ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white'
                : 'bg-black/5 border-black/10 hover:bg-black/10 text-zinc-800'
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            Continuar con Google
          </button>
          */}
        </form>

        <p className={`mt-6 text-center text-sm ${isDark ? 'text-white/40' : 'text-[#6b7280]'}`}>
          {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setLocalError(null);
              setSuccessMessage(null);
            }}
            className="text-acid font-semibold ml-1 hover:underline"
          >
            {isLogin ? t('auth.signUp') : t('auth.signIn')}
          </button>
        </p>
      </div>
    </div>
  );
}