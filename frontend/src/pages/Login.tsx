import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mountain, Phone, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import Button from '@/components/UI/Button';
import useAuthStore from '@/store/auth';
import { cn } from '@/lib/utils';

type LoginTab = 'email' | 'phone';

export default function Login() {
  const [activeTab, setActiveTab] = useState<LoginTab>('email');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { loginWithPhone, loginWithEmail, loading, error, clearError, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    clearError();
    setFormErrors({});
  }, [activeTab, clearError]);

  const validatePhone = (value: string): string => {
    if (!value) return '请输入手机号';
    if (!/^1[3-9]\d{9}$/.test(value)) return '请输入正确的手机号';
    return '';
  };

  const validateEmail = (value: string): string => {
    if (!value) return '请输入邮箱';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return '请输入正确的邮箱';
    return '';
  };

  const validatePassword = (value: string): string => {
    if (!value) return '请输入密码';
    if (value.length < 6) return '密码长度不能少于6位';
    return '';
  };

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    const phoneError = validatePhone(phone);
    if (phoneError) errors.phone = phoneError;
    const passwordError = validatePassword(password);
    if (passwordError) errors.password = passwordError;

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      await loginWithPhone({ phone, password });
      navigate('/', { replace: true });
    } catch {
      // error handled in store
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    const emailError = validateEmail(email);
    if (emailError) errors.email = emailError;
    const passwordError = validatePassword(emailPassword);
    if (passwordError) errors.password = passwordError;

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      await loginWithEmail({ email, password: emailPassword });
      navigate('/', { replace: true });
    } catch {
      // error handled in store
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-rock-dark-950">
        <div className="absolute inset-0 bg-gradient-to-br from-rock-dark-900 via-rock-dark-950 to-rock-dark-900" />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23FF6B35' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-climbing-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-climbing-orange-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-climbing-orange-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-climbing-orange-500/30">
            <Mountain size={36} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">欢迎回来</h1>
          <p className="text-rock-light-500 mt-2">登录你的攀岩账号</p>
        </div>

        <div className="backdrop-blur-xl bg-rock-dark-800/70 border border-rock-dark-600/50 rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex border-b border-rock-dark-700/50">
            <button
              onClick={() => setActiveTab('email')}
              className={cn(
                'flex-1 py-4 text-sm font-medium transition-all duration-300 relative',
                activeTab === 'email'
                  ? 'text-climbing-orange-500'
                  : 'text-rock-light-500 hover:text-rock-light-300'
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <Mail size={16} />
                <span>邮箱登录</span>
              </div>
              {activeTab === 'email' && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-climbing-orange-500 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('phone')}
              className={cn(
                'flex-1 py-4 text-sm font-medium transition-all duration-300 relative',
                activeTab === 'phone'
                  ? 'text-climbing-orange-500'
                  : 'text-rock-light-500 hover:text-rock-light-300'
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <Phone size={16} />
                <span>手机号登录</span>
              </div>
              {activeTab === 'phone' && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-climbing-orange-500 rounded-full" />
              )}
            </button>
          </div>

          {error && (
            <div className="mx-6 mt-4 p-3 bg-red-900/30 border border-red-800/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {activeTab === 'email' ? (
            <form onSubmit={handleEmailLogin} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-rock-light-300 mb-2">
                  邮箱
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-rock-light-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (formErrors.email) setFormErrors({ ...formErrors, email: '' });
                    }}
                    placeholder="请输入邮箱"
                    className={cn(
                      'w-full pl-10 pr-4 py-3 bg-rock-dark-900/60 border rounded-lg text-white placeholder-rock-light-600 focus:outline-none focus:ring-1 transition-all duration-200',
                      formErrors.email
                        ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30'
                        : 'border-rock-dark-600/50 focus:border-climbing-orange-500 focus:ring-climbing-orange-500/30'
                    )}
                  />
                </div>
                {formErrors.email && (
                  <p className="mt-1.5 text-sm text-red-400">{formErrors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-rock-light-300 mb-2">
                  密码
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-rock-light-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={emailPassword}
                    onChange={(e) => {
                      setEmailPassword(e.target.value);
                      if (formErrors.password) setFormErrors({ ...formErrors, password: '' });
                    }}
                    placeholder="请输入密码"
                    className={cn(
                      'w-full pl-10 pr-12 py-3 bg-rock-dark-900/60 border rounded-lg text-white placeholder-rock-light-600 focus:outline-none focus:ring-1 transition-all duration-200',
                      formErrors.password
                        ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30'
                        : 'border-rock-dark-600/50 focus:border-climbing-orange-500 focus:ring-climbing-orange-500/30'
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-rock-light-500 hover:text-rock-light-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {formErrors.password && (
                  <p className="mt-1.5 text-sm text-red-400">{formErrors.password}</p>
                )}
              </div>

              <Button type="submit" fullWidth size="lg" isLoading={loading} className="mt-2">
                登录
              </Button>
            </form>
          ) : (
            <form onSubmit={handlePhoneLogin} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-rock-light-300 mb-2">
                  手机号
                </label>
                <div className="relative">
                  <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-rock-light-500" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (formErrors.phone) setFormErrors({ ...formErrors, phone: '' });
                    }}
                    placeholder="请输入手机号"
                    className={cn(
                      'w-full pl-10 pr-4 py-3 bg-rock-dark-900/60 border rounded-lg text-white placeholder-rock-light-600 focus:outline-none focus:ring-1 transition-all duration-200',
                      formErrors.phone
                        ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30'
                        : 'border-rock-dark-600/50 focus:border-climbing-orange-500 focus:ring-climbing-orange-500/30'
                    )}
                  />
                </div>
                {formErrors.phone && (
                  <p className="mt-1.5 text-sm text-red-400">{formErrors.phone}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-rock-light-300 mb-2">
                  密码
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-rock-light-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (formErrors.password) setFormErrors({ ...formErrors, password: '' });
                    }}
                    placeholder="请输入密码"
                    className={cn(
                      'w-full pl-10 pr-12 py-3 bg-rock-dark-900/60 border rounded-lg text-white placeholder-rock-light-600 focus:outline-none focus:ring-1 transition-all duration-200',
                      formErrors.password
                        ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30'
                        : 'border-rock-dark-600/50 focus:border-climbing-orange-500 focus:ring-climbing-orange-500/30'
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-rock-light-500 hover:text-rock-light-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {formErrors.password && (
                  <p className="mt-1.5 text-sm text-red-400">{formErrors.password}</p>
                )}
              </div>

              <Button type="submit" fullWidth size="lg" isLoading={loading} className="mt-2">
                登录
              </Button>
            </form>
          )}

          <div className="px-6 pb-6">
            <p className="text-center text-sm text-rock-light-500">
              还没有账号？{' '}
              <Link to="/register" className="text-climbing-orange-500 hover:text-climbing-orange-400 font-medium transition-colors">
                立即注册
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-rock-light-600 mt-6">
          登录即表示同意 <a href="#" className="text-climbing-orange-500 hover:underline">用户协议</a> 和{' '}
          <a href="#" className="text-climbing-orange-500 hover:underline">隐私政策</a>
        </p>
      </div>
    </div>
  );
}
