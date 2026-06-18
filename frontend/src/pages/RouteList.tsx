import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Route,
  Search,
  Filter,
  Plus,
  Palette,
  User,
  Calendar,
  Mountain,
} from 'lucide-react';
import Card from '@/components/UI/Card';
import Button from '@/components/UI/Button';
import { routeApi, wallApi } from '@/utils/api';
import { useGymStore } from '@/store/gym';
import type { Route as RouteType } from '@/types';

const routeTypeLabels: Record<string, string> = {
  boulder: '抱石',
  lead: '先锋',
  top_rope: '顶绳',
  speed: '速度',
};

const routeStatusColors: Record<string, string> = {
  open: 'bg-green-500/20 text-green-400 border-green-500/30',
  removed: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  drafting: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  removing: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

const routeStatusLabels: Record<string, string> = {
  open: '开放中',
  removed: '已拆除',
  drafting: '定线中',
  removing: '拆除中',
};

const colorOptions = [
  { value: 'all', label: '全部颜色', color: '' },
  { value: '#FF6B35', label: '橙色', color: '#FF6B35' },
  { value: '#22C55E', label: '绿色', color: '#22C55E' },
  { value: '#3B82F6', label: '蓝色', color: '#3B82F6' },
  { value: '#A855F7', label: '紫色', color: '#A855F7' },
  { value: '#EF4444', label: '红色', color: '#EF4444' },
  { value: '#F59E0B', label: '黄色', color: '#F59E0B' },
  { value: '#EC4899', label: '粉色', color: '#EC4899' },
  { value: '#06B6D4', label: '青色', color: '#06B6D4' },
];

export default function RouteList() {
  const { currentGym } = useGymStore();
  const [routes, setRoutes] = useState<RouteType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterGrade, setFilterGrade] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterColor, setFilterColor] = useState('all');
  const [walls, setWalls] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    const fetchWalls = async () => {
      if (currentGym) {
        const data = await wallApi.getWalls(currentGym.id);
        setWalls(data.map(w => ({ id: w.id, name: w.name })));
      }
    };
    fetchWalls();
  }, [currentGym]);

  useEffect(() => {
    const fetchRoutes = async () => {
      if (!currentGym) return;
      setIsLoading(true);
      try {
        const wallsData = await wallApi.getWalls(currentGym.id);
        const allRoutesPromises = wallsData.map(wall => {
          const filters: { type?: string; grade?: string; status?: string } = {};
          if (filterType !== 'all') filters.type = filterType;
          if (filterGrade !== 'all') filters.grade = filterGrade;
          if (filterStatus !== 'all') filters.status = filterStatus;
          return routeApi.getRoutes(wall.id, filters);
        });
        const routesByWall = await Promise.all(allRoutesPromises);
        let mergedRoutes = routesByWall.flat();

        if (filterGrade !== 'all') {
          mergedRoutes = mergedRoutes.filter(r => {
            const match = r.grade?.match(/V(\d+)/);
            const gradeNum = match ? parseInt(match[1], 10) : -1;
            if (filterGrade === 'V0') return gradeNum >= 0 && gradeNum <= 2;
            if (filterGrade === 'V3') return gradeNum >= 3 && gradeNum <= 5;
            if (filterGrade === 'V6') return gradeNum >= 6;
            return r.grade === filterGrade;
          });
        }

        if (filterColor !== 'all') {
          mergedRoutes = mergedRoutes.filter(r => r.color === filterColor);
        }
        if (searchQuery) {
          mergedRoutes = mergedRoutes.filter(
            r =>
              r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              r.setterName?.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }
        setRoutes(mergedRoutes);
      } catch (err) {
        console.error('Failed to fetch routes:', err);
        setRoutes([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoutes();
  }, [currentGym, filterType, filterGrade, filterStatus, filterColor]);

  const getWallName = (wallId: number) => {
    return walls.find(w => w.id === wallId)?.name || '未知岩壁';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">线路列表</h1>
          <p className="text-rock-light-500 mt-1">探索所有攀岩线路</p>
        </div>
        <Button>
          <Plus size={18} className="mr-2" />
          添加线路
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-rock-light-500" />
              <input
                type="text"
                placeholder="搜索线路名称、定线员..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-rock-dark-900 border border-rock-dark-700 rounded-lg text-white placeholder-rock-light-600 focus:outline-none focus:border-climbing-orange-500 transition-colors"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-rock-light-500" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-rock-dark-900 border border-rock-dark-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-climbing-orange-500"
              >
                <option value="all">全部类型</option>
                <option value="boulder">抱石</option>
                <option value="lead">先锋</option>
                <option value="top_rope">顶绳</option>
                <option value="speed">速度</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Route size={16} className="text-rock-light-500" />
              <select
                value={filterGrade}
                onChange={(e) => setFilterGrade(e.target.value)}
                className="bg-rock-dark-900 border border-rock-dark-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-climbing-orange-500"
              >
                <option value="all">全部定级</option>
                <option value="V0">初级 (V0-V2)</option>
                <option value="V3">中级 (V3-V5)</option>
                <option value="V6">高级 (V6+)</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-rock-dark-900 border border-rock-dark-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-climbing-orange-500"
              >
                <option value="all">全部状态</option>
                <option value="open">开放中</option>
                <option value="drafting">定线中</option>
                <option value="removing">拆除中</option>
                <option value="removed">已拆除</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Palette size={16} className="text-rock-light-500" />
              <select
                value={filterColor}
                onChange={(e) => setFilterColor(e.target.value)}
                className="bg-rock-dark-900 border border-rock-dark-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-climbing-orange-500"
              >
                {colorOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="overflow-hidden animate-pulse">
              <div className="h-3 bg-rock-dark-700" />
              <div className="p-5 space-y-3">
                <div className="flex justify-between">
                  <div className="h-5 bg-rock-dark-700 rounded w-2/3" />
                  <div className="h-5 bg-rock-dark-700 rounded w-12" />
                </div>
                <div className="flex gap-2">
                  <div className="h-5 bg-rock-dark-700 rounded w-12" />
                  <div className="h-5 bg-rock-dark-700 rounded w-12" />
                </div>
                <div className="h-4 bg-rock-dark-700 rounded w-1/2" />
                <div className="flex justify-between pt-3 border-t border-rock-dark-700">
                  <div className="h-4 bg-rock-dark-700 rounded w-16" />
                  <div className="h-4 bg-rock-dark-700 rounded w-20" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {routes.length === 0 ? (
            <Card className="p-12 text-center">
              <Mountain size={48} className="mx-auto text-rock-light-600 mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">暂无线路</h3>
              <p className="text-rock-light-500 mb-4">没有找到符合条件的线路</p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {routes.map((route) => (
                <Link
                  key={route.id}
                  to={`/routes/${route.id}`}
                  className="group block"
                >
                  <Card className="h-full overflow-hidden hover:border-rock-dark-600 transition-all hover:shadow-lg hover:-translate-y-1">
                    <div className="h-2 bg-rock-dark-700 relative">
                      <div
                        className="absolute inset-0 group-hover:opacity-80 transition-opacity"
                        style={{ backgroundColor: route.color }}
                      />
                    </div>
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <h3 className="font-semibold text-white line-clamp-1 group-hover:text-climbing-orange-400 transition-colors">
                          {route.name}
                        </h3>
                        <span className="px-2 py-0.5 bg-climbing-orange-500/20 text-climbing-orange-400 rounded text-xs font-bold whitespace-nowrap border border-climbing-orange-500/30">
                          {route.grade}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mb-4">
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs border border-blue-500/30">
                          {routeTypeLabels[route.type]}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs border ${routeStatusColors[route.status]}`}>
                          {routeStatusLabels[route.status]}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-rock-light-400">
                          <User size={14} />
                          <span>定线员：{route.setterName || '未知'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-rock-light-400">
                          <Mountain size={14} />
                          <span>{getWallName(route.wallId)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-rock-light-400">
                          <Calendar size={14} />
                          <span>{formatDate(route.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-rock-dark-700">
                        <span className="text-xs text-rock-light-500">
                          <Route size={12} className="inline mr-1" />
                          {route.ascentCount || 0} 次完攀
                        </span>
                        <span className="text-xs text-climbing-orange-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          查看详情 →
                        </span>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          <div className="pt-4 text-center">
            <span className="text-sm text-rock-light-500">
              共 {routes.length} 条线路
            </span>
          </div>
        </>
      )}
    </div>
  );
}
