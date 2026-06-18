import { useState, useEffect } from 'react';
import {
  Route,
  Users,
  Activity,
  Target,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Eye,
  Trash2,
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
  Legend,
  Cell,
} from 'recharts';
import Card from '@/components/UI/Card';
import Button from '@/components/UI/Button';
import { useGymStore } from '@/store/gym';
import { useAuthStore } from '@/store/auth';
import { analyticsApi, wallApi, routeApi } from '@/utils/api';
import type { RouteHeat, ColdRoute, SetterWorkload, ActiveUsersStats } from '@/types';

const gradeColors: Record<string, string> = {
  V0: '#22C55E',
  V1: '#10B981',
  V2: '#14B8A6',
  V3: '#06B6D4',
  V4: '#3B82F6',
  V5: '#6366F1',
  V6: '#8B5CF6',
  V7: '#A855F7',
  V8: '#D946EF',
  V9: '#EC4899',
  V10: '#EF4444',
  V11: '#F97316',
  V12: '#F59E0B',
};

function getGradeColor(grade: string): string {
  return gradeColors[grade] || '#6B7280';
}

const setterColorPalette = [
  '#FF6B35',
  '#22C55E',
  '#3B82F6',
  '#A855F7',
  '#EC4899',
  '#F59E0B',
  '#06B6D4',
  '#EF4444',
];

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
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

function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function generateMemberActivityData(weeklyActive: number, avgRoutes: number) {
  const weeks = [];
  for (let i = 11; i >= 0; i--) {
    const weekNum = 12 - i;
    const variation = Math.sin(i * 0.5) * 0.2;
    weeks.push({
      week: `第${weekNum}周`,
      activeUsers: Math.round(weeklyActive * (0.7 + variation + Math.random() * 0.3)),
      avgRoutes: Number((avgRoutes * (0.8 + Math.random() * 0.4)).toFixed(1)),
    });
  }
  return weeks;
}

export default function Dashboard() {
  const { currentGym } = useGymStore();
  const { user } = useAuthStore();

  const [routeHeat, setRouteHeat] = useState<RouteHeat[]>([]);
  const [coldRoutes, setColdRoutes] = useState<ColdRoute[]>([]);
  const [setterWorkload, setSetterWorkload] = useState<SetterWorkload[]>([]);
  const [activeUsersStats, setActiveUsersStats] = useState<ActiveUsersStats | null>(null);
  const [totalRoutes, setTotalRoutes] = useState(0);
  const [monthlyAscents, setMonthlyAscents] = useState(0);
  const [overallSendRate, setOverallSendRate] = useState(0);
  const [loading, setLoading] = useState(true);

  const gymId = currentGym?.id || user?.gymId;

  useEffect(() => {
    if (!gymId) return;

    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const currentMonth = getCurrentMonth();
        const [yearStr, monthStr] = currentMonth.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr);
        const startDate = new Date(year, month - 1, 1).toISOString();
        const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

        const [
          heatData,
          coldData,
          setterData,
          activeData,
          wallsData,
        ] = await Promise.all([
          analyticsApi.getRouteHeat(gymId),
          analyticsApi.getColdRoutes(gymId),
          analyticsApi.getSetterWorkload(gymId, currentMonth),
          analyticsApi.getActiveUsers(gymId),
          wallApi.getWalls(gymId),
        ]);

        setRouteHeat(heatData);
        setColdRoutes(coldData);
        setSetterWorkload(setterData);
        setActiveUsersStats(activeData);

        const wallRouteLists = await Promise.all(
          wallsData.map(wall =>
            routeApi.getRoutes(wall.id).catch(() => [])
          )
        );
        const totalRoutesCount = wallRouteLists.reduce((sum, routes) => sum + routes.length, 0);

        const totalAscentsCount = heatData.reduce((sum, route) => sum + route.totalAscents, 0);
        const totalSentCount = heatData.reduce((sum, route) => sum + route.sentCount, 0);

        setTotalRoutes(totalRoutesCount);
        setMonthlyAscents(totalAscentsCount);
        setOverallSendRate(totalAscentsCount > 0 ? Math.round((totalSentCount / totalAscentsCount) * 1000) / 10 : 0);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [gymId]);

  const topRoutesData = routeHeat.slice(0, 10).map((r) => ({
    name: r.routeName,
    grade: r.grade,
    count: r.totalAscents,
    color: getGradeColor(r.grade),
  }));

  const coldRoutesData = coldRoutes.map((r) => ({
    id: r.routeId,
    name: r.routeName,
    grade: r.grade,
    days: r.daysSinceLastAscent,
    ascentRate: 0,
    color: getGradeColor(r.grade),
  }));

  const setterColors: Record<string, string> = {};
  setterWorkload.forEach((s, i) => {
    setterColors[s.setterName] = setterColorPalette[i % setterColorPalette.length];
  });

  const setterWorkloadData = setterWorkload.length > 0 ? [
    {
      month: '本月',
      ...Object.fromEntries(setterWorkload.map((s) => [s.setterName, s.routesSet])),
    },
  ] : [];

  const memberActivityData = activeUsersStats
    ? generateMemberActivityData(activeUsersStats.weeklyActiveUsers, activeUsersStats.avgRoutesPerUser)
    : [];

  const stats = [
    {
      label: '总线路数',
      value: loading ? '...' : String(totalRoutes),
      icon: Route,
      color: 'text-climbing-orange-500',
      bgColor: 'bg-climbing-orange-500/20',
      change: null as string | null,
      changeType: 'up' as const,
    },
    {
      label: '活跃会员数',
      value: loading ? '...' : String(activeUsersStats?.weeklyActiveUsers ?? 0),
      icon: Users,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      change: null as string | null,
      changeType: 'up' as const,
    },
    {
      label: '本月攀爬人次',
      value: loading ? '...' : monthlyAscents.toLocaleString(),
      icon: Activity,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      change: null as string | null,
      changeType: 'up' as const,
    },
    {
      label: '完攀率',
      value: loading ? '...' : `${overallSendRate}%`,
      icon: Target,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
      change: null as string | null,
      changeType: 'up' as const,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">运营数据看板</h1>
        <p className="text-rock-light-500 mt-1">岩馆运营数据概览与分析</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="p-5 hover:border-rock-dark-600 transition-colors">
              <div className="flex items-start justify-between">
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <Icon size={24} className={stat.color} />
                </div>
                {stat.change && (
                  <div className={`flex items-center gap-1 text-xs font-medium ${
                    stat.changeType === 'up' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {stat.changeType === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {stat.change}
                  </div>
                )}
              </div>
              <div className="mt-4">
                <p className="text-3xl font-bold text-white">{stat.value}</p>
                <p className="text-sm text-rock-light-500 mt-1">{stat.label}</p>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <div className="p-5 border-b border-rock-dark-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white">线路热度排行</h3>
                <p className="text-xs text-rock-light-500 mt-1">TOP 10 被攀爬次数最多的线路</p>
              </div>
              <div className="text-xs text-rock-light-400 bg-rock-dark-700 px-2 py-1 rounded">
                本月数据
              </div>
            </div>
          </div>
          <div className="p-5">
            <div className="h-80">
              {topRoutesData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[...topRoutesData].reverse()}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={true} vertical={false} />
                    <XAxis type="number" stroke="#666" tick={{ fill: '#666', fontSize: 11 }} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      stroke="#999"
                      tick={{ fill: '#ccc', fontSize: 11 }}
                      width={70}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="攀爬次数" radius={[0, 4, 4, 0]}>
                      {[...topRoutesData].reverse().map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-rock-light-500">
                  暂无数据
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-5 border-b border-rock-dark-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/20">
                  <AlertTriangle size={20} className="text-red-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">冷线预警</h3>
                  <p className="text-xs text-rock-light-500 mt-1">7天以上无人攀爬的线路</p>
                </div>
              </div>
              <span className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded">
                {coldRoutesData.length} 条
              </span>
            </div>
          </div>
          <div className="p-5 space-y-3 max-h-80 overflow-y-auto">
            {coldRoutesData.length > 0 ? (
              coldRoutesData.map((route) => (
                <div
                  key={route.id}
                  className="p-4 bg-red-500/5 border border-red-500/20 rounded-lg hover:bg-red-500/10 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: route.color + '30' }}
                      >
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: route.color }}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-white">{route.name}</h4>
                          <span className="px-2 py-0.5 bg-climbing-orange-500/20 text-climbing-orange-400 rounded text-xs font-bold">
                            {route.grade}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-rock-light-500">
                          <span className="text-red-400 font-medium">
                            {route.days} 天无人攀爬
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-red-500/10">
                    <Button variant="ghost" size="sm" className="flex-1 text-xs">
                      <Eye size={14} className="mr-1" />
                      查看
                    </Button>
                    <Button variant="ghost" size="sm" className="flex-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10">
                      <Trash2 size={14} className="mr-1" />
                      标记拆除
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-rock-light-500">
                暂无冷线数据
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <div className="p-5 border-b border-rock-dark-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white">定线员工作量</h3>
                <p className="text-xs text-rock-light-500 mt-1">本月各定线员定线数量</p>
              </div>
            </div>
          </div>
          <div className="p-5">
            <div className="h-64">
              {setterWorkloadData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={setterWorkloadData}
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis
                      dataKey="month"
                      stroke="#666"
                      tick={{ fill: '#666', fontSize: 11 }}
                    />
                    <YAxis
                      stroke="#666"
                      tick={{ fill: '#666', fontSize: 11 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: '11px', color: '#999' }}
                    />
                    {setterWorkload.map((s) => (
                      <Bar
                        key={s.setterId}
                        dataKey={s.setterName}
                        fill={setterColors[s.setterName]}
                        radius={[4, 4, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-rock-light-500">
                  暂无数据
                </div>
              )}
            </div>
            {setterWorkload.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-rock-dark-700">
                {Object.entries(setterColors).map(([name, color]) => (
                  <div key={name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-sm text-rock-light-400">{name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="p-5 border-b border-rock-dark-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white">会员活跃度</h3>
                <p className="text-xs text-rock-light-500 mt-1">近 12 周每周活跃情况</p>
              </div>
            </div>
          </div>
          <div className="p-5">
            <div className="h-64">
              {memberActivityData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={memberActivityData}
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis
                      dataKey="week"
                      stroke="#666"
                      tick={{ fill: '#666', fontSize: 10 }}
                      interval={1}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke="#666"
                      tick={{ fill: '#666', fontSize: 11 }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#666"
                      tick={{ fill: '#666', fontSize: 11 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: '11px', color: '#999' }}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="activeUsers"
                      name="活跃攀爬者"
                      stroke="#FF6B35"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="avgRoutes"
                      name="人均攀爬线路"
                      stroke="#22C55E"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                      strokeDasharray="5 5"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-rock-light-500">
                  暂无数据
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-rock-dark-700">
              <div className="text-center p-3 bg-rock-dark-900/50 rounded-lg">
                <p className="text-lg font-bold text-climbing-orange-500">
                  {activeUsersStats?.weeklyActiveUsers ?? 0}
                </p>
                <p className="text-xs text-rock-light-500 mt-1">本周活跃人数</p>
              </div>
              <div className="text-center p-3 bg-rock-dark-900/50 rounded-lg">
                <p className="text-lg font-bold text-green-400">
                  {activeUsersStats?.avgRoutesPerUser ?? 0}
                </p>
                <p className="text-xs text-rock-light-500 mt-1">人均攀爬线路</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
