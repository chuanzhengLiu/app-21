import { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  Calendar,
  Settings,
  LogOut,
  Edit,
  Ruler,
  Clock,
  Heart,
  Target,
  Gauge,
  ChevronRight,
  Award,
  TrendingUp,
  Info,
  Loader2,
} from 'lucide-react';
import Card from '@/components/UI/Card';
import Button from '@/components/UI/Button';
import useAuthStore from '@/store/auth';
import { useNavigate } from 'react-router-dom';
import type { UserRole } from '@/types';
import { profileApi, ascentApi } from '@/utils/api';

const roleLabels: Record<UserRole, string> = {
  platform_admin: '平台管理员',
  gym_admin: '岩馆管理员',
  setter: '定线员',
  verified_climber: '认证攀岩者',
  guest: '游客',
};

const roleColors: Record<UserRole, string> = {
  platform_admin: 'bg-red-500/20 text-red-400 border-red-500/30',
  gym_admin: 'bg-green-500/20 text-green-400 border-green-500/30',
  setter: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  verified_climber: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  guest: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const preferredStyles = [
  { label: '捏点', value: 'crimp' },
  { label: '动态', value: 'dyno' },
  { label: '耐力', value: 'endurance' },
];

function parseGrade(grade: string): number {
  const match = grade.match(/V(\d+)/);
  return match ? parseInt(match[1]) : -1;
}

const GOAL_KEY = 'climbingGoal';

function loadGoal(): { targetGrade: string; targetDate: string } {
  if (typeof window === 'undefined') return { targetGrade: 'V7', targetDate: '' };
  try {
    const raw = localStorage.getItem(GOAL_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        targetGrade: parsed.targetGrade || 'V7',
        targetDate: parsed.targetDate || '',
      };
    }
  } catch {
    // ignore parse error
  }
  return { targetGrade: 'V7', targetDate: '' };
}

function saveGoal(goal: { targetGrade: string; targetDate: string }): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GOAL_KEY, JSON.stringify(goal));
}

export default function Profile() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const initialGoal = loadGoal();
  const [targetGrade, setTargetGrade] = useState(initialGoal.targetGrade);
  const [targetDate, setTargetDate] = useState(initialGoal.targetDate);
  const [loading, setLoading] = useState(true);
  const [savingGoal, setSavingGoal] = useState(false);
  const [stats, setStats] = useState({
    totalAscents: 0,
    maxGrade: '-',
    climbingDays: 0,
    monthsClimbing: 0,
  });
  const [calibration, setCalibration] = useState<{
    avgDeviation: number;
    totalVotes: number;
    trend: 'tight' | 'accurate' | 'loose';
    distribution: number[];
  } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const [ascentData, calibrationData] = await Promise.all([
          ascentApi.getAscents(),
          profileApi.getCalibration(user.id).catch(() => null),
        ]);

        const completedAscents = ascentData.filter((a) =>
          a.ascentType === 'flash' || a.ascentType === 'redpoint' || a.ascentType === 'onsight'
        );
        const grades = completedAscents
          .map((a) => parseGrade(a.routeGrade || ''))
          .filter((g) => g >= 0);
        const maxGrade = grades.length > 0 ? `V${Math.max(...grades)}` : '-';
        const climbingDays = new Set(
          ascentData.map((a) => a.createdAt.split('T')[0])
        ).size;

        const startDate = ascentData.length > 0
          ? new Date(ascentData[ascentData.length - 1].createdAt)
          : new Date(user.createdAt);
        const now = new Date();
        const monthsClimbing = Math.max(
          1,
          (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth())
        );

        setStats({
          totalAscents: completedAscents.length,
          maxGrade,
          climbingDays,
          monthsClimbing,
        });

        if (calibrationData && typeof calibrationData === 'object') {
          const cal = calibrationData as Record<string, unknown>;
          const avgDev = typeof cal.avgDeviation === 'number' ? cal.avgDeviation : 0.3;
          setCalibration({
            avgDeviation: avgDev,
            totalVotes: typeof cal.totalVotes === 'number' ? cal.totalVotes : 0,
            trend: avgDev > 0.2 ? 'tight' : avgDev < -0.2 ? 'loose' : 'accurate',
            distribution: Array.isArray(cal.distribution)
              ? (cal.distribution as number[])
              : [5, 12, 18, 5, 2],
          });
        } else {
          setCalibration({
            avgDeviation: 0.3,
            totalVotes: 0,
            trend: 'accurate',
            distribution: [5, 12, 18, 5, 2],
          });
        }
      } catch (err) {
        console.error('获取用户数据失败:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/login');
    } finally {
      setLoggingOut(false);
    }
  };

  const handleSaveGoal = async () => {
    setSavingGoal(true);
    try {
      saveGoal({ targetGrade, targetDate });
      setIsEditingGoal(false);
    } catch (err) {
      console.error('保存目标失败:', err);
    } finally {
      setSavingGoal(false);
    }
  };

  const currentMaxGradeNum = parseGrade(stats.maxGrade);
  const targetGradeNum = parseGrade(targetGrade);
  const progressPercent = targetGradeNum > 0 && currentMaxGradeNum >= 0
    ? Math.min(100, Math.round((currentMaxGradeNum / targetGradeNum) * 100))
    : 0;

  const userRole: UserRole = (user?.role as UserRole) || 'guest';
  const calibrationTrend = calibration?.trend || 'accurate';
  const trendLabel = calibrationTrend === 'loose' ? '偏松' : calibrationTrend === 'tight' ? '偏紧' : '准确';
  const trendColor = calibrationTrend === 'loose' ? 'text-green-400' : calibrationTrend === 'tight' ? 'text-red-400' : 'text-yellow-400';
  const trendBgColor = calibrationTrend === 'loose' ? 'bg-green-500/20 border-green-500/50' : calibrationTrend === 'tight' ? 'bg-red-500/20 border-red-500/50' : 'bg-yellow-500/20 border-yellow-500/50';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-climbing-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">个人中心</h1>
        <p className="text-rock-light-500 mt-1">管理你的账户信息和攀岩目标</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="p-6">
              <div className="flex items-start gap-6">
                <div className="relative">
                  <div className="w-24 h-24 bg-gradient-to-br from-climbing-orange-400 to-climbing-orange-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg shadow-climbing-orange-500/30">
                    <User size={40} className="text-white" />
                  </div>
                  <button className="absolute bottom-0 right-0 w-7 h-7 bg-rock-dark-700 border-2 border-rock-dark-800 rounded-full flex items-center justify-center hover:bg-rock-dark-600 transition-colors">
                    <Edit size={12} className="text-rock-light-400" />
                  </button>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <h2 className="text-xl font-bold text-white">
                      {user?.name || '攀岩爱好者'}
                    </h2>
                    <span
                      className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${
                        roleColors[userRole]
                      }`}
                    >
                      {roleLabels[userRole]}
                    </span>
                    {userRole === 'verified_climber' && (
                      <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                        已认证
                      </span>
                    )}
                  </div>
                  <p className="text-rock-light-500">{user?.email || '未设置邮箱'}</p>
                  <p className="text-sm text-rock-light-600 mt-1">ID: {user?.id ?? '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-rock-dark-700">
                <div className="text-center p-3 bg-rock-dark-900/50 rounded-lg">
                  <p className="text-2xl font-bold text-climbing-orange-500">{stats.totalAscents}</p>
                  <p className="text-xs text-rock-light-500 mt-1">完攀线路</p>
                </div>
                <div className="text-center p-3 bg-rock-dark-900/50 rounded-lg">
                  <p className="text-2xl font-bold text-green-400">{stats.maxGrade}</p>
                  <p className="text-xs text-rock-light-500 mt-1">最高难度</p>
                </div>
                <div className="text-center p-3 bg-rock-dark-900/50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-400">{stats.climbingDays}</p>
                  <p className="text-xs text-rock-light-500 mt-1">攀岩天数</p>
                </div>
                <div className="text-center p-3 bg-rock-dark-900/50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-400">{stats.monthsClimbing}</p>
                  <p className="text-xs text-rock-light-500 mt-1">岩龄(月)</p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-5 border-b border-rock-dark-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-climbing-orange-500/20">
                  <Target size={20} className="text-climbing-orange-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">目标设定</h3>
                  <p className="text-xs text-rock-light-500">设定你的攀岩目标，追踪进步</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingGoal(!isEditingGoal)}
              >
                <Edit size={14} className="mr-1" />
                编辑目标
              </Button>
            </div>
            <div className="p-5">
              {isEditingGoal ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-rock-light-400 mb-1.5">目标难度</label>
                    <select
                      value={targetGrade}
                      onChange={(e) => setTargetGrade(e.target.value)}
                      className="w-full bg-rock-dark-900 border border-rock-dark-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-climbing-orange-500"
                    >
                      <option value="V3">V3</option>
                      <option value="V4">V4</option>
                      <option value="V5">V5</option>
                      <option value="V6">V6</option>
                      <option value="V7">V7</option>
                      <option value="V8">V8</option>
                      <option value="V9">V9</option>
                      <option value="V10">V10</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-rock-light-400 mb-1.5">目标截止日期</label>
                    <input
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      className="w-full bg-rock-dark-900 border border-rock-dark-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-climbing-orange-500"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setIsEditingGoal(false)}
                    >
                      取消
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleSaveGoal}
                      disabled={savingGoal}
                    >
                      {savingGoal ? '保存中...' : '保存'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-rock-light-400">当前目标</p>
                      <p className="text-2xl font-bold text-climbing-orange-500 mt-1">{targetGrade}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-rock-light-400">截止日期</p>
                      <p className="text-white font-medium mt-1">{targetDate || '未设定'}</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-rock-light-400">完成进度</span>
                      <span className="text-sm font-medium text-white">{progressPercent}%</span>
                    </div>
                    <div className="h-3 bg-rock-dark-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-climbing-orange-500 to-climbing-orange-400 rounded-full transition-all"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-rock-light-500">
                      <span>当前：{stats.maxGrade}</span>
                      <span>目标：{targetGrade}</span>
                    </div>
                  </div>

                  {progressPercent < 100 && (
                    <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <TrendingUp size={16} className="text-green-400 flex-shrink-0" />
                      <p className="text-sm text-green-400">
                        坚持训练，你一定可以达成目标！
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

          <Card>
            <div className="p-5 border-b border-rock-dark-700 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Gauge size={20} className="text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">难度校准</h3>
                <p className="text-xs text-rock-light-500">你的难度投票与官方定级的偏差分析</p>
              </div>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-6 mb-6">
                <div className="text-center">
                  <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center mx-auto ${trendBgColor}`}>
                    <Award size={28} className={trendColor} />
                  </div>
                  <p className={`font-semibold mt-2 ${trendColor}`}>{trendLabel}</p>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-rock-light-400">平均偏差</span>
                    <span className="text-lg font-bold text-white">
                      {calibration ? (calibration.avgDeviation >= 0 ? '+' : '') + calibration.avgDeviation.toFixed(1) : '-'} 级
                    </span>
                  </div>
                  <p className="text-sm text-rock-light-500">
                    基于你投票的 <span className="text-white font-medium">{calibration?.totalVotes ?? 0}</span> 条线路计算
                  </p>
                </div>
              </div>

              <div className="p-4 bg-rock-dark-900/50 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-rock-light-400 space-y-2">
                    <p>
                      你的定级投票平均比官方定级
                      <span className={`font-medium ${trendColor}`}>
                        {calibrationTrend === 'loose' ? '偏松 ' : calibrationTrend === 'tight' ? '偏紧 ' : '准确 '}
                        {calibration ? Math.abs(calibration.avgDeviation).toFixed(1) : '0'} 级
                      </span>
                      {calibrationTrend === 'loose' && '，说明你对难度的判断相对保守。'}
                      {calibrationTrend === 'tight' && '，说明你对难度的判断相对激进。'}
                      {calibrationTrend === 'accurate' && '，说明你对难度的判断非常准确。'}
                    </p>
                    <p>
                      系统会根据你的投票历史，在推荐线路时自动调整难度参考，帮助你找到更适合的挑战。
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-rock-light-500">投票分布</span>
                </div>
                <div className="flex items-end gap-1 h-16">
                  {(calibration?.distribution || [0, 0, 0, 0, 0]).map((value, i) => {
                    const maxValue = Math.max(...(calibration?.distribution || [1]));
                    const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
                    const colors = ['bg-red-400', 'bg-yellow-400', 'bg-green-400', 'bg-yellow-400', 'bg-red-400'];
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className={`w-full rounded-t ${colors[i]} transition-all`}
                          style={{ height: `${height}%` }}
                        />
                        <span className="text-xs text-rock-light-500">{value}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-xs text-rock-light-600 mt-1">
                  <span>偏紧</span>
                  <span>准确</span>
                  <span>偏松</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <div className="p-5 border-b border-rock-dark-700">
              <h3 className="font-semibold text-white">基本信息</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-rock-dark-700">
                  <User size={16} className="text-rock-light-400" />
                </div>
                <div>
                  <p className="text-xs text-rock-light-500">用户名</p>
                  <p className="text-white font-medium">{user?.name || '攀岩爱好者'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-rock-dark-700">
                  <Mail size={16} className="text-rock-light-400" />
                </div>
                <div>
                  <p className="text-xs text-rock-light-500">邮箱</p>
                  <p className="text-white font-medium">{user?.email || '未设置'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-rock-dark-700">
                  <Phone size={16} className="text-rock-light-400" />
                </div>
                <div>
                  <p className="text-xs text-rock-light-500">手机号</p>
                  <p className="text-white font-medium">{user?.phone || '未设置'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-rock-dark-700">
                  <Calendar size={16} className="text-rock-light-400" />
                </div>
                <div>
                  <p className="text-xs text-rock-light-500">加入时间</p>
                  <p className="text-white font-medium">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' }) : '-'}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-5 border-b border-rock-dark-700">
              <h3 className="font-semibold text-white">身体数据</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Ruler size={16} className="text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-rock-light-500">身高</p>
                  <p className="text-white font-medium">-- cm</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <Ruler size={16} className="text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-rock-light-500">臂展</p>
                  <p className="text-white font-medium">-- cm</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Clock size={16} className="text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-rock-light-500">岩龄</p>
                  <p className="text-white font-medium">
                    {stats.monthsClimbing >= 12
                      ? `${Math.floor(stats.monthsClimbing / 12)}年${stats.monthsClimbing % 12}个月`
                      : `${stats.monthsClimbing}个月`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/20">
                  <Heart size={16} className="text-red-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-rock-light-500">偏好风格</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {preferredStyles.map((style) => (
                      <span
                        key={style.value}
                        className="px-2 py-0.5 text-xs bg-climbing-orange-500/20 text-climbing-orange-400 rounded"
                      >
                        {style.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-5 border-b border-rock-dark-700">
              <h3 className="font-semibold text-white">设置</h3>
            </div>
            <div className="p-3">
              <button className="w-full flex items-center justify-between p-3 hover:bg-rock-dark-700 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <Settings size={18} className="text-rock-light-400" />
                  <span className="text-white">账号设置</span>
                </div>
                <ChevronRight size={16} className="text-rock-light-500" />
              </button>
              <button className="w-full flex items-center justify-between p-3 hover:bg-rock-dark-700 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <Bell size={18} className="text-rock-light-400" />
                  <span className="text-white">通知设置</span>
                </div>
                <ChevronRight size={16} className="text-rock-light-500" />
              </button>
              <button className="w-full flex items-center justify-between p-3 hover:bg-rock-dark-700 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <Shield size={18} className="text-rock-light-400" />
                  <span className="text-white">隐私安全</span>
                </div>
                <ChevronRight size={16} className="text-rock-light-500" />
              </button>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full flex items-center justify-between p-3 hover:bg-red-900/30 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <LogOut size={18} className="text-red-500" />
                  <span className="text-red-500">{loggingOut ? '退出中...' : '退出登录'}</span>
                </div>
                <ChevronRight size={16} className="text-red-500/50" />
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Bell({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function Shield({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
