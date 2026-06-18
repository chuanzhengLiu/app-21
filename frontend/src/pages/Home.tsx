import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Mountain,
  Route,
  TrendingUp,
  Users,
  ChevronRight,
  MapPin,
  Calendar,
  BarChart3,
  Plus,
  Zap,
  Target,
  Activity,
} from 'lucide-react';
import Card from '@/components/UI/Card';
import { useGymStore } from '@/store/gym';
import { wallApi, routeApi, ascentApi } from '@/utils/api';
import type { Route as RouteType, Wall, Ascent } from '@/types';

const quickEntries = [
  { label: '岩壁管理', icon: Mountain, path: '/walls', color: 'text-climbing-orange-500', bgColor: 'bg-climbing-orange-500/10' },
  { label: '线路列表', icon: Route, path: '/routes', color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  { label: '攀爬记录', icon: Activity, path: '/ascents', color: 'text-green-400', bgColor: 'bg-green-500/10' },
  { label: '个人分析', icon: BarChart3, path: '/analytics', color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
  { label: '运营数据', icon: TrendingUp, path: '/dashboard', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' },
];

const routeTypeLabels: Record<string, string> = {
  boulder: '抱石',
  lead: '先锋',
  top_rope: '顶绳',
  speed: '速度',
};

const routeStatusColors: Record<string, string> = {
  open: 'bg-green-500/20 text-green-400',
  drafting: 'bg-yellow-500/20 text-yellow-400',
  removing: 'bg-red-500/20 text-red-400',
  removed: 'bg-gray-500/20 text-gray-400',
};

const routeStatusLabels: Record<string, string> = {
  open: '开放中',
  drafting: '定线中',
  removing: '拆除中',
  removed: '已拆除',
};

export default function Home() {
  const { currentGym, gyms, fetchGyms, setCurrentGym } = useGymStore();
  const [showGymDropdown, setShowGymDropdown] = useState(false);
  const [recentRoutes, setRecentRoutes] = useState<RouteType[]>([]);
  const [walls, setWalls] = useState<Wall[]>([]);
  const [allRoutes, setAllRoutes] = useState<RouteType[]>([]);
  const [ascents, setAscents] = useState<Ascent[]>([]);

  useEffect(() => {
    fetchGyms();
  }, [fetchGyms]);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentGym) return;
      try {
        const wallsData = await wallApi.getWalls(currentGym.id);
        setWalls(wallsData);

        const allRoutesPromises = wallsData.map(wall =>
          routeApi.getRoutes(wall.id)
        );
        const routesByWall = await Promise.all(allRoutesPromises);
        const mergedRoutes = routesByWall.flat();
        setAllRoutes(mergedRoutes);

        const openRoutes = mergedRoutes.filter(r => r.status === 'open');
        setRecentRoutes(openRoutes.slice(0, 5));

        const ascentsData = await ascentApi.getAscents();
        setAscents(Array.isArray(ascentsData) ? ascentsData : []);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setRecentRoutes([]);
        setAllRoutes([]);
        setAscents([]);
      }
    };
    fetchData();
  }, [currentGym]);

  const statsData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const openRoutesCount = allRoutes.filter(r => r.status === 'open').length;

    const newRoutesThisWeek = allRoutes.filter(r => {
      const createdDate = new Date(r.createdAt);
      return createdDate >= weekAgo;
    }).length;

    const todayAscents = ascents.filter(a => {
      const ascentDate = new Date(a.createdAt);
      return ascentDate >= today;
    });
    const uniqueClimbersToday = new Set(todayAscents.map(a => a.userId)).size;

    const monthAscents = ascents.filter(a => {
      const ascentDate = new Date(a.createdAt);
      return ascentDate >= monthStart;
    });
    const completedAscents = monthAscents.filter(a =>
      a.ascentType === 'flash' || a.ascentType === 'redpoint' || a.ascentType === 'onsight'
    ).length;
    const completionRate = monthAscents.length > 0
      ? `${Math.round((completedAscents / monthAscents.length) * 100)}%`
      : '-';

    return [
      { label: '今日开放线路数', value: String(openRoutesCount), icon: Zap, color: 'text-climbing-orange-500', bgColor: 'bg-climbing-orange-500/10' },
      { label: '本周新增线路数', value: String(newRoutesThisWeek), icon: Plus, color: 'text-green-400', bgColor: 'bg-green-500/10' },
      { label: '本月完攀率', value: completionRate, icon: Target, color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
      { label: '今日攀爬人数', value: uniqueClimbersToday > 0 ? String(uniqueClimbersToday) : String(todayAscents.length), icon: Users, color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
    ];
  }, [allRoutes, ascents]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">欢迎回来 👋</h1>
          <p className="text-rock-light-500 mt-1">今天想要爬什么线路？</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowGymDropdown(!showGymDropdown)}
            className="flex items-center gap-2 px-4 py-2 bg-rock-dark-800 border border-rock-dark-700 rounded-lg hover:border-rock-dark-600 transition-colors"
          >
            <MapPin size={18} className="text-climbing-orange-500" />
            <span className="text-white font-medium">{currentGym?.name || '选择岩馆'}</span>
            <ChevronRight size={16} className={`text-rock-light-500 transition-transform ${showGymDropdown ? 'rotate-90' : ''}`} />
          </button>
          {showGymDropdown && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-rock-dark-800 border border-rock-dark-700 rounded-lg shadow-xl z-50 overflow-hidden">
              {gyms.map((gym) => (
                <button
                  key={gym.id}
                  onClick={() => {
                    setCurrentGym(gym);
                    setShowGymDropdown(false);
                  }}
                  className={`w-full px-4 py-3 text-left hover:bg-rock-dark-700 transition-colors ${
                    currentGym?.id === gym.id ? 'bg-rock-dark-700' : ''
                  }`}
                >
                  <p className="font-medium text-white">{gym.name}</p>
                  <p className="text-sm text-rock-light-500 truncate">{gym.address}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsData.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="p-5 hover:border-rock-dark-600 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
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

      <Card>
        <div className="p-5 border-b border-rock-dark-700">
          <h2 className="text-lg font-semibold text-white">快速入口</h2>
        </div>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {quickEntries.map((entry, index) => {
            const Icon = entry.icon;
            return (
              <Link
                key={index}
                to={entry.path}
                className="flex flex-col items-center gap-3 p-4 bg-rock-dark-900 rounded-xl hover:bg-rock-dark-800 transition-all hover:scale-105 group"
              >
                <div className={`p-3 rounded-xl ${entry.bgColor} group-hover:scale-110 transition-transform`}>
                  <Icon size={24} className={entry.color} />
                </div>
                <span className="text-sm font-medium text-white">{entry.label}</span>
              </Link>
            );
          })}
        </div>
      </Card>

      <Card>
        <div className="p-5 border-b border-rock-dark-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">最近开放线路</h2>
          {walls.length > 0 && (
            <Link to="/routes" className="text-sm text-climbing-orange-500 hover:text-climbing-orange-400 transition-colors flex items-center gap-1">
              查看全部
              <ChevronRight size={14} />
            </Link>
          )}
        </div>
        <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {recentRoutes.map((route) => (
            <Link
              key={route.id}
              to={`/routes/${route.id}`}
              className="group"
            >
              <Card className="h-full overflow-hidden hover:border-rock-dark-600 transition-all hover:shadow-lg">
                <div className="h-3 bg-rock-dark-700 relative">
                  <div
                    className="absolute inset-0 group-hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: route.color }}
                  />
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-white line-clamp-1">{route.name}</h3>
                    <span className="px-2 py-0.5 bg-rock-dark-700 rounded text-xs font-bold text-climbing-orange-400 whitespace-nowrap">
                      {route.grade}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
                      {routeTypeLabels[route.type] || route.type}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs ${routeStatusColors[route.status] || ''}`}>
                      {routeStatusLabels[route.status] || route.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-3 text-xs text-rock-light-500">
                    <Calendar size={12} />
                    <span>{formatDate(route.createdAt)}</span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
          {recentRoutes.length === 0 && (
            <div className="col-span-full text-center py-8 text-rock-light-500">
              暂无线路数据
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
