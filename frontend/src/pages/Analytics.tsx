import { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Target,
  Calendar,
  Trophy,
  Activity,
  Layers,
  Loader2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ReferenceLine,
  Cell,
} from 'recharts';
import Card from '@/components/UI/Card';
import type { Ascent } from '@/types';
import { ascentApi, profileApi } from '@/utils/api';
import { useAuthStore } from '@/store/auth';

const gradeColors: Record<string, string> = {
  'V0': '#22C55E', 'V1': '#4ADE80', 'V2': '#84CC16',
  'V3': '#FACC15', 'V4': '#F59E0B', 'V5': '#F97316',
  'V6': '#EF4444', 'V7': '#DC2626', 'V8': '#B91C1C',
  'V9': '#991B1B', 'V10': '#7F1D1D',
};

function getGradeColor(grade: string): string {
  return gradeColors[grade] || '#6B7280';
}

function parseGrade(grade: string): number {
  const match = grade.match(/V(\d+)/);
  return match ? parseInt(match[1]) : -1;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number | string; color: string }[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-rock-dark-800 border border-rock-dark-700 rounded-lg p-3 shadow-xl">
        <p className="text-sm font-medium text-white mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Analytics() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'pyramid' | 'progress' | 'style'>('pyramid');
  const [ascents, setAscents] = useState<Ascent[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetGrade, setTargetGrade] = useState<string>('V7');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [ascentData] = await Promise.all([
          ascentApi.getAscents(),
        ]);
        setAscents(ascentData);
      } catch (err) {
        console.error('获取分析数据失败:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const completedAscents = useMemo(() => {
    return ascents.filter((a) =>
      a.ascentType === 'flash' || a.ascentType === 'redpoint' || a.ascentType === 'onsight'
    );
  }, [ascents]);

  const pyramidData = useMemo(() => {
    const gradeCount: Record<string, number> = {};
    completedAscents.forEach((ascent) => {
      if (ascent.routeGrade) {
        gradeCount[ascent.routeGrade] = (gradeCount[ascent.routeGrade] || 0) + 1;
      }
    });
    const sortedGrades = Object.keys(gradeCount).sort((a, b) => parseGrade(a) - parseGrade(b));
    return sortedGrades.map((grade) => ({
      grade,
      count: gradeCount[grade],
      fill: getGradeColor(grade),
    }));
  }, [completedAscents]);

  const pyramidStats = useMemo(() => {
    let beginner = 0, intermediate = 0, advanced = 0;
    pyramidData.forEach((item) => {
      const g = parseGrade(item.grade);
      if (g <= 2) beginner += item.count;
      else if (g <= 5) intermediate += item.count;
      else advanced += item.count;
    });
    return { beginner, intermediate, advanced };
  }, [pyramidData]);

  const progressData = useMemo(() => {
    const monthly: Record<string, { maxGrade: number; total: number; sum: number }> = {};
    completedAscents.forEach((ascent) => {
      if (!ascent.routeGrade) return;
      const date = new Date(ascent.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const gradeNum = parseGrade(ascent.routeGrade);
      if (gradeNum < 0) return;
      if (!monthly[monthKey]) {
        monthly[monthKey] = { maxGrade: gradeNum, total: 0, sum: 0 };
      }
      monthly[monthKey].maxGrade = Math.max(monthly[monthKey].maxGrade, gradeNum);
      monthly[monthKey].total += 1;
      monthly[monthKey].sum += gradeNum;
    });
    const sortedMonths = Object.keys(monthly).sort();
    return sortedMonths.map((month) => ({
      month,
      maxGrade: monthly[month].maxGrade,
      avgGrade: Number((monthly[month].sum / monthly[month].total).toFixed(1)),
    }));
  }, [completedAscents]);

  const monthLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    progressData.forEach((item) => {
      const [year, month] = item.month.split('-');
      labels[item.month] = `${parseInt(month)}月`;
    });
    return labels;
  }, [progressData]);

  const progressStats = useMemo(() => {
    if (progressData.length === 0) {
      return { currentMax: '-', target: targetGrade, halfYearProgress: '-', months: 0 };
    }
    const currentMax = progressData[progressData.length - 1].maxGrade;
    const targetNum = parseGrade(targetGrade);
    const sixMonthsAgo = progressData.length > 6 ? progressData[progressData.length - 7].maxGrade : progressData[0].maxGrade;
    return {
      currentMax: `V${currentMax}`,
      target: targetGrade,
      halfYearProgress: `+${currentMax - sixMonthsAgo} 级`,
      months: progressData.length,
    };
  }, [progressData, targetGrade]);

  const styleData = useMemo(() => {
    const tagStats: Record<string, { completed: number; total: number }> = {};
    const defaultStyles = [
      { style: 'crimp', label: '捏点' },
      { style: 'sloper', label: '摩擦点' },
      { style: 'dyno', label: '动态' },
      { style: 'crack', label: '裂缝' },
      { style: 'endurance', label: '耐力' },
    ];
    defaultStyles.forEach((s) => {
      tagStats[s.style] = { completed: 0, total: 0 };
    });
    ascents.forEach((ascent) => {
      defaultStyles.forEach((s) => {
        tagStats[s.style].total += 1;
        if (ascent.ascentType === 'flash' || ascent.ascentType === 'redpoint' || ascent.ascentType === 'onsight') {
          tagStats[s.style].completed += 1;
        }
      });
    });
    return defaultStyles.map((s) => {
      const stats = tagStats[s.style];
      const rate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
      return {
        style: s.style,
        label: s.label,
        value: rate || 50,
        fullMark: 100,
      };
    });
  }, [ascents]);

  const strongestStyle = useMemo(() => {
    return styleData.reduce((prev, curr) => (curr.value > prev.value ? curr : prev));
  }, [styleData]);

  const weakestStyle = useMemo(() => {
    return styleData.reduce((prev, curr) => (curr.value < prev.value ? curr : prev));
  }, [styleData]);

  const statsData = useMemo(() => {
    const thisMonth = new Date();
    const thisMonthKey = `${thisMonth.getFullYear()}-${String(thisMonth.getMonth() + 1).padStart(2, '0')}`;
    const monthlyAscents = completedAscents.filter((a) => {
      const d = new Date(a.createdAt);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === thisMonthKey;
    });
    const climbingDays = new Set(
      ascents.map((a) => a.createdAt.split('T')[0])
    ).size;
    const maxGradeNum = completedAscents.length > 0
      ? Math.max(...completedAscents.map((a) => parseGrade(a.routeGrade || '')).filter((g) => g >= 0))
      : -1;
    return [
      { label: '总完攀线路', value: String(completedAscents.length), icon: Target, color: 'text-climbing-orange-500', bgColor: 'bg-climbing-orange-500/20' },
      { label: '本月完攀', value: String(monthlyAscents.length), icon: Layers, color: 'text-green-400', bgColor: 'bg-green-500/20' },
      { label: '最高难度', value: maxGradeNum >= 0 ? `V${maxGradeNum}` : '-', icon: Trophy, color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
      { label: '攀岩天数', value: String(climbingDays), icon: Calendar, color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
    ];
  }, [ascents, completedAscents]);

  const tabs = [
    { key: 'pyramid' as const, label: '完攀金字塔', icon: Trophy },
    { key: 'progress' as const, label: '进步曲线', icon: TrendingUp },
    { key: 'style' as const, label: '风格分析', icon: Activity },
  ];

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
        <h1 className="text-2xl font-bold text-white">个人进度分析</h1>
        <p className="text-rock-light-500 mt-1">追踪你的攀岩进步历程</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsData.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="p-5 hover:border-rock-dark-600 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <Icon size={24} className={stat.color} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-sm text-rock-light-500">{stat.label}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-1">
        <div className="flex">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-climbing-orange-500/20 text-climbing-orange-400'
                    : 'text-rock-light-400 hover:text-white hover:bg-rock-dark-700/50'
                }`}
              >
                <Icon size={18} />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {activeTab === 'pyramid' && (
        <Card>
          <div className="p-5 border-b border-rock-dark-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">完攀金字塔</h3>
                <p className="text-sm text-rock-light-500 mt-1">各难度等级完攀数量分布</p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-rock-light-400">入门</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="text-rock-light-400">进阶</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-rock-light-400">高阶</span>
                </div>
              </div>
            </div>
          </div>
          <div className="p-5">
            {pyramidData.length > 0 ? (
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[...pyramidData].reverse()}
                    layout="vertical"
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={true} vertical={false} />
                    <XAxis type="number" stroke="#999" tick={{ fill: '#999', fontSize: 12 }} />
                    <YAxis
                      dataKey="grade"
                      type="category"
                      stroke="#999"
                      tick={{ fill: '#ccc', fontSize: 12, fontWeight: 500 }}
                      width={40}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="完攀数量" radius={[0, 4, 4, 0]}>
                      {[...pyramidData].reverse().map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-96 flex items-center justify-center">
                <p className="text-rock-light-500">暂无完攀数据</p>
              </div>
            )}
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-rock-dark-700">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400">V0-V2</p>
                <p className="text-sm text-rock-light-500 mt-1">入门级 · {pyramidStats.beginner} 条</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-400">V3-V5</p>
                <p className="text-sm text-rock-light-500 mt-1">进阶级 · {pyramidStats.intermediate} 条</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-400">V6+</p>
                <p className="text-sm text-rock-light-500 mt-1">高阶级 · {pyramidStats.advanced} 条</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'progress' && (
        <Card>
          <div className="p-5 border-b border-rock-dark-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">进步曲线</h3>
                <p className="text-sm text-rock-light-500 mt-1">最高完攀难度随时间变化</p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-climbing-orange-500" />
                  <span className="text-rock-light-400">最高难度</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-blue-400" />
                  <span className="text-rock-light-400">平均难度</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 border-t-2 border-dashed border-green-500" />
                  <span className="text-rock-light-400">目标</span>
                </div>
              </div>
            </div>
          </div>
          <div className="p-5">
            {progressData.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={progressData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis
                      dataKey="month"
                      stroke="#999"
                      tick={{ fill: '#999', fontSize: 12 }}
                      tickFormatter={(value) => monthLabels[value] || value}
                      interval={Math.max(0, Math.floor(progressData.length / 6) - 1)}
                    />
                    <YAxis
                      stroke="#999"
                      tick={{ fill: '#999', fontSize: 12 }}
                      domain={[0, 'auto']}
                      tickFormatter={(value) => `V${value}`}
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                      formatter={(value: number) => [`V${value}`, '难度']}
                      labelFormatter={(label) => monthLabels[label as string] || label}
                    />
                    <ReferenceLine
                      y={parseGrade(targetGrade)}
                      stroke="#22C55E"
                      strokeDasharray="5 5"
                      strokeWidth={2}
                      label={{ value: `目标 ${targetGrade}`, fill: '#22C55E', fontSize: 12, position: 'right' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="maxGrade"
                      name="最高难度"
                      stroke="#FF6B35"
                      strokeWidth={3}
                      dot={{ fill: '#FF6B35', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="avgGrade"
                      name="平均难度"
                      stroke="#60A5FA"
                      strokeWidth={2}
                      dot={false}
                      strokeDasharray="3 3"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center">
                <p className="text-rock-light-500">暂无进度数据</p>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-rock-dark-700">
              <div className="text-center p-3 bg-rock-dark-900/50 rounded-lg">
                <p className="text-lg font-bold text-climbing-orange-500">{progressStats.currentMax}</p>
                <p className="text-xs text-rock-light-500 mt-1">当前最高</p>
              </div>
              <div className="text-center p-3 bg-rock-dark-900/50 rounded-lg">
                <p className="text-lg font-bold text-green-400">{progressStats.target}</p>
                <p className="text-xs text-rock-light-500 mt-1">目标难度</p>
              </div>
              <div className="text-center p-3 bg-rock-dark-900/50 rounded-lg">
                <p className="text-lg font-bold text-blue-400">{progressStats.halfYearProgress}</p>
                <p className="text-xs text-rock-light-500 mt-1">近半年进步</p>
              </div>
              <div className="text-center p-3 bg-rock-dark-900/50 rounded-lg">
                <p className="text-lg font-bold text-purple-400">{progressStats.months} 个月</p>
                <p className="text-xs text-rock-light-500 mt-1">追踪时长</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'style' && (
        <Card>
          <div className="p-5 border-b border-rock-dark-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">风格分析</h3>
                <p className="text-sm text-rock-light-500 mt-1">不同攀岩风格的完攀率分析</p>
              </div>
            </div>
          </div>
          <div className="p-5">
            <div className="flex flex-col lg:flex-row gap-8 items-center">
              <div className="w-full lg:w-1/2 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={styleData}>
                    <PolarGrid stroke="#444" />
                    <PolarAngleAxis
                      dataKey="label"
                      tick={{ fill: '#ccc', fontSize: 12 }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 100]}
                      tick={{ fill: '#666', fontSize: 10 }}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Radar
                      name="完攀率"
                      dataKey="value"
                      stroke="#FF6B35"
                      fill="#FF6B35"
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                      formatter={(value: number) => [`${value}%`, '完攀率']}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full lg:w-1/2 space-y-4">
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy size={18} className="text-green-400" />
                    <span className="font-medium text-green-400">擅长项</span>
                  </div>
                  <p className="text-white font-semibold">{strongestStyle.label}</p>
                  <p className="text-sm text-rock-light-500 mt-1">
                    完攀率 {strongestStyle.value}%，是你最擅长的风格
                  </p>
                </div>
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 size={18} className="text-red-400" />
                    <span className="font-medium text-red-400">薄弱项</span>
                  </div>
                  <p className="text-white font-semibold">{weakestStyle.label}</p>
                  <p className="text-sm text-rock-light-500 mt-1">
                    完攀率 {weakestStyle.value}%，需要多加练习
                  </p>
                </div>
                <div className="space-y-3 pt-2">
                  {styleData.map((item) => (
                    <div key={item.style} className="flex items-center gap-3">
                      <span className="w-16 text-sm text-rock-light-400">{item.label}</span>
                      <div className="flex-1 h-2 bg-rock-dark-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${item.value}%`,
                            backgroundColor: item.value >= 70 ? '#22C55E' : item.value >= 50 ? '#F59E0B' : '#EF4444',
                          }}
                        />
                      </div>
                      <span className="w-12 text-sm text-right text-rock-light-300">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
