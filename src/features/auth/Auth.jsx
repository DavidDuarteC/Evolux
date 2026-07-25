import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { CheckCircle } from 'lucide-react';

export default function Auth() {
  const { login, register, error: authError, loading } = useAuth();
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
  const [localError, setLocalError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

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
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
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