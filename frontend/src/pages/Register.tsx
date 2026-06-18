import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mountain, User, Mail, Phone, Lock, Eye, EyeOff, Check, ChevronRight } from 'lucide-react';
import Button from '@/components/UI/Button';
import useAuthStore from '@/store/auth';
import { cn } from '@/lib/utils';

type RegisterStep = 1 | 2;

interface FormData {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export default function Register() {
  const [step, setStep] = useState<RegisterStep>(1);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { register, loading, error, clearError, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const validateStep1 = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = '请输入姓名';
    } else if (formData.name.length < 1) {
      errors.name = '姓名至少1个字符';
    }

    if (!formData.email.trim() && !formData.phone.trim()) {
      errors.email = '邮箱或手机号至少填写一个';
      errors.phone = '邮箱或手机号至少填写一个';
    }

    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = '请输入正确的邮箱';
    }

    if (formData.phone.trim() && !/^1[3-9]\d{9}$/.test(formData.phone)) {
      errors.phone = '请输入正确的手机号';
    }

    if (!formData.password) {
      errors.password = '请输入密码';
    } else if (formData.password.length < 6) {
      errors.password = '密码长度不能少于6位';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = '请确认密码';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = '两次输入的密码不一致';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      clearError();
      setStep(2);
    }
  };

  const handlePrevStep = () => {
    setStep(1);
    setFormErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      handleNextStep();
      return;
    }

    try {
      await register({
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        password: formData.password,
      });
      navigate('/', { replace: true });
    } catch {
      // error handled in store
    }
  };

  const updateField = (field: keyof FormData, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (formErrors[field]) {
      setFormErrors({ ...formErrors, [field]: '' });
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
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 bg-climbing-orange-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-climbing-orange-500/30">
            <Mountain size={36} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">创建账号</h1>
          <p className="text-rock-light-500 mt-2">开始你的攀岩之旅</p>
        </div>

        <div className="flex items-center justify-center gap-3 mb-6">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300',
                  step >= s
                    ? 'bg-climbing-orange-500 text-white shadow-lg shadow-climbing-orange-500/30'
                    : 'bg-rock-dark-800 text-rock-light-500 border border-rock-dark-700'
                )}
              >
                {step > s ? <Check size={16} /> : s}
              </div>
              {s < 2 && (
                <div
                  className={cn(
                    'w-16 h-0.5 mx-2 transition-all duration-300',
                    step > s ? 'bg-climbing-orange-500' : 'bg-rock-dark-700'
                  )}
                />
              )}
            </div>
          ))}
        </div>

        <div className="backdrop-blur-xl bg-rock-dark-800/70 border border-rock-dark-600/50 rounded-2xl shadow-2xl overflow-hidden">
          {error && (
            <div className="mx-6 mt-4 p-3 bg-red-900/30 border border-red-800/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-6">
            {step === 1 ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-rock-light-300 mb-2">
                    姓名
                  </label>
                  <div className="relative">
                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-rock-light-500" />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      placeholder="请输入姓名"
                      className={cn(
                        'w-full pl-10 pr-4 py-3 bg-rock-dark-900/60 border rounded-lg text-white placeholder-rock-light-600 focus:outline-none focus:ring-1 transition-all duration-200',
                        formErrors.name
                          ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30'
                          : 'border-rock-dark-600/50 focus:border-climbing-orange-500 focus:ring-climbing-orange-500/30'
                      )}
                    />
                  </div>
                  {formErrors.name && (
                    <p className="mt-1.5 text-sm text-red-400">{formErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-rock-light-300 mb-2">
                    邮箱 <span className="text-rock-light-600 text-xs">(选填)</span>
                  </label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-rock-light-500" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateField('email', e.target.value)}
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
                    手机号 <span className="text-rock-light-600 text-xs">(选填)</span>
                  </label>
                  <div className="relative">
                    <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-rock-light-500" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => updateField('phone', e.target.value)}
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
                      value={formData.password}
                      onChange={(e) => updateField('password', e.target.value)}
                      placeholder="请输入密码（至少6位）"
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

                <div>
                  <label className="block text-sm font-medium text-rock-light-300 mb-2">
                    确认密码
                  </label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-rock-light-500" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => updateField('confirmPassword', e.target.value)}
                      placeholder="请再次输入密码"
                      className={cn(
                        'w-full pl-10 pr-12 py-3 bg-rock-dark-900/60 border rounded-lg text-white placeholder-rock-light-600 focus:outline-none focus:ring-1 transition-all duration-200',
                        formErrors.confirmPassword
                          ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30'
                          : 'border-rock-dark-600/50 focus:border-climbing-orange-500 focus:ring-climbing-orange-500/30'
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-rock-light-500 hover:text-rock-light-300 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {formErrors.confirmPassword && (
                    <p className="mt-1.5 text-sm text-red-400">{formErrors.confirmPassword}</p>
                  )}
                </div>

                <Button type="submit" fullWidth size="lg" className="mt-2">
                  下一步
                  <ChevronRight size={18} className="ml-1" />
                </Button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="text-center mb-2">
                  <h3 className="text-lg font-semibold text-white">确认注册信息</h3>
                  <p className="text-sm text-rock-light-500 mt-1">请确认以下信息无误</p>
                </div>

                <div className="space-y-3 p-4 bg-rock-dark-900/50 rounded-lg border border-rock-dark-700">
                  <div className="flex items-center gap-3">
                    <User size={16} className="text-rock-light-500" />
                    <span className="text-sm text-rock-light-400">姓名：</span>
                    <span className="text-sm text-white font-medium">{formData.name}</span>
                  </div>
                  {formData.email && (
                    <div className="flex items-center gap-3">
                      <Mail size={16} className="text-rock-light-500" />
                      <span className="text-sm text-rock-light-400">邮箱：</span>
                      <span className="text-sm text-white font-medium">{formData.email}</span>
                    </div>
                  )}
                  {formData.phone && (
                    <div className="flex items-center gap-3">
                      <Phone size={16} className="text-rock-light-500" />
                      <span className="text-sm text-rock-light-400">手机号：</span>
                      <span className="text-sm text-white font-medium">{formData.phone}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handlePrevStep}
                    className="flex-1"
                  >
                    上一步
                  </Button>
                  <Button type="submit" fullWidth isLoading={loading} className="flex-1">
                    完成注册
                  </Button>
                </div>
              </div>
            )}
          </form>

          <div className="px-6 pb-6">
            <p className="text-center text-sm text-rock-light-500">
              已有账号？{' '}
              <Link to="/login" className="text-climbing-orange-500 hover:text-climbing-orange-400 font-medium transition-colors">
                立即登录
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-rock-light-600 mt-6">
          注册即表示同意 <a href="#" className="text-climbing-orange-500 hover:underline">用户协议</a> 和{' '}
          <a href="#" className="text-climbing-orange-500 hover:underline">隐私政策</a>
        </p>
      </div>
    </div>
  );
}
