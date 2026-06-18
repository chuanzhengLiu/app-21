import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Plus,
  Filter,
  Mountain,
} from 'lucide-react';
import Card from '@/components/UI/Card';
import Button from '@/components/UI/Button';
import { wallApi, routeApi } from '@/utils/api';
import type { Wall, Route as RouteType } from '@/types';

const routeTypeLabels: Record<string, string> = {
  boulder: '抱石',
  lead: '先锋',
  top_rope: '顶绳',
  speed: '速度',
};

const routeStatusColors: Record<string, string> = {
  open: 'bg-green-500/20 text-green-400',
  removed: 'bg-gray-500/20 text-gray-400',
  drafting: 'bg-yellow-500/20 text-yellow-400',
  removing: 'bg-orange-500/20 text-orange-400',
};

const routeStatusLabels: Record<string, string> = {
  open: '开放中',
  removed: '已下架',
  drafting: '设定中',
  removing: '拆除中',
};

const mockRoutePoints = [
  { x: 20, y: 80, color: '#FF6B35' },
  { x: 45, y: 60, color: '#22C55E' },
  { x: 70, y: 75, color: '#3B82F6' },
  { x: 30, y: 40, color: '#A855F7' },
  { x: 60, y: 30, color: '#EF4444' },
  { x: 85, y: 55, color: '#F59E0B' },
  { x: 15, y: 65, color: '#06B6D4' },
  { x: 50, y: 85, color: '#EC4899' },
];

export default function WallDetail() {
  const { wallId } = useParams<{ wallId: string }>();
  const navigate = useNavigate();
  const [wall, setWall] = useState<Wall | null>(null);
  const [routes, setRoutes] = useState<RouteType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    const fetchData = async () => {
      if (!wallId) return;
      setIsLoading(true);
      try {
        const wallIdNum = Number(wallId);
        const [wallData, routesData] = await Promise.all([
          wallApi.getWallById(wallIdNum),
          routeApi.getRoutes(wallIdNum),
        ]);
        setWall(wallData);
        setRoutes(Array.isArray(routesData) ? routesData : []);
      } catch (err) {
        console.error('Failed to fetch wall data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [wallId]);

  const filteredRoutes = routes.filter((route) => {
    if (filterType !== 'all' && route.type !== filterType) return false;
    if (filterStatus !== 'all' && route.status !== filterStatus) return false;
    if (filterGrade !== 'all') {
      const match = route.grade?.match(/V(\d+)/);
      const gradeNum = match ? parseInt(match[1], 10) : -1;
      if (filterGrade === 'V0' && (gradeNum < 0 || gradeNum > 2)) return false;
      if (filterGrade === 'V3' && (gradeNum < 3 || gradeNum > 5)) return false;
      if (filterGrade === 'V6' && gradeNum < 6) return false;
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-12 bg-rock-dark-800 rounded-lg animate-pulse" />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-rock-dark-800 rounded-xl animate-pulse" />
          <div className="h-96 bg-rock-dark-800 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!wall) {
    return (
      <Card className="p-12 text-center">
        <Mountain size={48} className="mx-auto text-rock-light-600 mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">岩壁不存在</h3>
        <p className="text-rock-light-500 mb-4">请检查岩壁ID是否正确</p>
        <Button onClick={() => navigate('/walls')}>返回岩壁列表</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/walls')}
            className="p-2"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">{wall.name}</h1>
            <p className="text-rock-light-500 text-sm mt-1">{wall.description}</p>
          </div>
        </div>
        <Button variant="outline">
          <Edit size={16} className="mr-2" />
          编辑岩壁
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="overflow-hidden h-full">
            <div className="relative bg-gradient-to-b from-rock-dark-700 via-rock-dark-800 to-rock-dark-900 min-h-[500px]">
              <div className="absolute inset-0 opacity-30">
                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path
                    d="M0,30 Q25,20 50,35 T100,30 L100,100 L0,100 Z"
                    fill="currentColor"
                    className="text-rock-dark-600"
                  />
                  <path
                    d="M0,50 Q30,40 60,55 T100,50 L100,100 L0,100 Z"
                    fill="currentColor"
                    className="text-rock-dark-700"
                  />
                  <path
                    d="M0,70 Q20,60 40,75 T80,70 L100,75 L100,100 L0,100 Z"
                    fill="currentColor"
                    className="text-rock-dark-800"
                  />
                </svg>
              </div>
              <div className="relative w-full h-full min-h-[500px] p-6">
                {mockRoutePoints.map((point, index) => (
                  <div
                    key={index}
                    className="absolute w-5 h-5 rounded-full border-2 border-white/80 shadow-lg transform -translate-x-1/2 -translate-y-1/2 hover:scale-150 transition-transform cursor-pointer"
                    style={{
                      left: `${point.x}%`,
                      top: `${point.y}%`,
                      backgroundColor: point.color,
                    }}
                    title={`线路 ${index + 1}`}
                  />
                ))}
                <div className="absolute bottom-4 left-4 text-xs text-rock-light-500">
                  <p>岩壁ID: #{wall.id}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <div className="p-4 border-b border-rock-dark-700 flex items-center justify-between">
              <h3 className="font-semibold text-white">线路列表</h3>
              <Button size="sm">
                <Plus size={16} className="mr-1" />
                新增线路
              </Button>
            </div>

            <div className="p-4 space-y-3 border-b border-rock-dark-700">
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-rock-light-500" />
                <span className="text-xs text-rock-light-500">筛选</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="bg-rock-dark-900 border border-rock-dark-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-climbing-orange-500"
                >
                  <option value="all">全部类型</option>
                  <option value="boulder">抱石</option>
                  <option value="lead">先锋</option>
                  <option value="top_rope">顶绳</option>
                  <option value="speed">速度</option>
                </select>
                <select
                  value={filterGrade}
                  onChange={(e) => setFilterGrade(e.target.value)}
                  className="bg-rock-dark-900 border border-rock-dark-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-climbing-orange-500"
                >
                  <option value="all">全部定级</option>
                  <option value="V0">V0-V2</option>
                  <option value="V3">V3-V5</option>
                  <option value="V6">V6+</option>
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-rock-dark-900 border border-rock-dark-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-climbing-orange-500"
                >
                  <option value="all">全部状态</option>
                  <option value="open">开放中</option>
                  <option value="drafting">定线中</option>
                  <option value="removing">拆除中</option>
                  <option value="removed">已拆除</option>
                </select>
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {filteredRoutes.length === 0 ? (
                <div className="p-8 text-center">
                  <Mountain size={32} className="mx-auto text-rock-light-600 mb-3" />
                  <p className="text-sm text-rock-light-500">暂无线路</p>
                </div>
              ) : (
                <div className="divide-y divide-rock-dark-700">
                  {filteredRoutes.map((route) => (
                    <Link
                      key={route.id}
                      to={`/routes/${route.id}`}
                      className="block p-3 hover:bg-rock-dark-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-1.5 h-10 rounded-full flex-shrink-0"
                          style={{ backgroundColor: route.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-medium text-white text-sm truncate">{route.name}</h4>
                            <span className="px-1.5 py-0.5 bg-rock-dark-700 rounded text-xs font-bold text-climbing-orange-400 flex-shrink-0">
                              {route.grade}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
                              {routeTypeLabels[route.type]}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-xs ${routeStatusColors[route.status]}`}>
                              {routeStatusLabels[route.status]}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
