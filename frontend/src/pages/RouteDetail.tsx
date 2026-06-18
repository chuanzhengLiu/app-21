import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Plus,
  User,
  Calendar,
  Tag,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  Zap,
  Target,
  Award,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import Card from '@/components/UI/Card';
import Button from '@/components/UI/Button';
import WallCanvas, { RouteWithPoints, RoutePoint } from '@/components/WallCanvas/WallCanvas';
import RouteEditorPanel from '@/components/RouteEditor/RouteEditorPanel';
import { routeApi, ascentApi, voteApi } from '@/utils/api';
import { useAuthStore } from '@/store/auth';
import type { Route, Ascent, GradeVote } from '@/types';
import { cn } from '@/lib/utils';

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
  drafting: '设定中',
  removing: '拆除中',
};

const ascentTypeLabels: Record<string, string> = {
  flash: 'Flash',
  onsight: 'Onsight',
  redpoint: '红点',
  high_point: '高点',
  fall: '脱落',
};

const ascentTypeColors: Record<string, string> = {
  flash: 'text-yellow-400 bg-yellow-500/20',
  onsight: 'text-green-400 bg-green-500/20',
  redpoint: 'text-blue-400 bg-blue-500/20',
  high_point: 'text-gray-400 bg-gray-500/20',
  fall: 'text-purple-400 bg-purple-500/20',
};



const tagOptions = [
  { value: 'crimp', label: 'Crimp', color: 'bg-blue-500/20 text-blue-400' },
  { value: 'sloper', label: 'Sloper', color: 'bg-green-500/20 text-green-400' },
  { value: 'dyno', label: 'Dyno', color: 'bg-yellow-500/20 text-yellow-400' },
  { value: 'crack', label: 'Crack', color: 'bg-orange-500/20 text-orange-400' },
  { value: 'endurance', label: '耐力', color: 'bg-purple-500/20 text-purple-400' },
  { value: 'technical', label: '技术型', color: 'bg-cyan-500/20 text-cyan-400' },
  { value: 'powerful', label: '力量型', color: 'bg-red-500/20 text-red-400' },
  { value: 'balance', label: '平衡', color: 'bg-pink-500/20 text-pink-400' },
];

const boulderGrades = ['V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10', 'V11', 'V12', 'V13', 'V14', 'V15', 'V16', 'V17'];



export default function RouteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [route, setRoute] = useState<Route | null>(null);
  const [ascents, setAscents] = useState<Ascent[]>([]);
  const [votes, setVotes] = useState<GradeVote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [showAllAscents, setShowAllAscents] = useState(false);
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const routeId = Number(id);
        const [routeData, ascentsData, votesData] = await Promise.all([
          routeApi.getRouteById(routeId),
          ascentApi.getAscents({ route_id: routeId }),
          voteApi.getVotes(routeId),
        ]);
        setRoute(routeData);
        setAscents(ascentsData);
        setVotes(votesData);
      } catch (err) {
        console.error('Failed to fetch route data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    if (route) {
      const points: RoutePoint[] = (route.holds || []).map((hold) => ({
        x: hold.positionX || 0,
        y: hold.positionY || 0,
        type: hold.type === 'start' ? 'start' : hold.type === 'end' ? 'end' : 'hold',
      }));
      setRoutePoints(points);
    }
  }, [route]);

  const routesForCanvas: RouteWithPoints[] = useMemo(() => {
    if (!route) return [];
    return [{ ...route, points: routePoints }];
  }, [route, routePoints]);

  const gradeDistribution = useMemo(() => {
    const distribution: Record<string, number> = {};
    votes.forEach((vote) => {
      distribution[vote.suggestedGrade] = (distribution[vote.suggestedGrade] || 0) + 1;
    });
    
    return boulderGrades
      .filter((g) => {
        const gradeNum = parseInt(g.replace('V', ''));
        return gradeNum >= 2 && gradeNum <= 7;
      })
      .map((grade) => ({
        grade,
        count: distribution[grade] || 0,
      }));
  }, [votes]);

  const consensusGrade = useMemo(() => {
    if (votes.length === 0) return 'N/A';
    const gradeCounts: Record<string, number> = {};
    votes.forEach((v) => {
      gradeCounts[v.suggestedGrade] = (gradeCounts[v.suggestedGrade] || 0) + 1;
    });
    const sorted = Object.entries(gradeCounts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || 'N/A';
  }, [votes]);

  const isControversial = useMemo(() => {
    if (votes.length < 5) return false;
    const gradeValues = votes.map((v) => parseInt(v.suggestedGrade.replace('V', '')));
    const max = Math.max(...gradeValues);
    const min = Math.min(...gradeValues);
    return max - min >= 2;
  }, [votes]);

  const completionStats = useMemo(() => {
    const completed = ascents.filter(
      (a) => a.ascentType === 'flash' || a.ascentType === 'onsight' || a.ascentType === 'redpoint'
    ).length;
    const total = ascents.length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, rate };
  }, [ascents]);

  const displayedAscents = useMemo(() => {
    return showAllAscents ? ascents : ascents.slice(0, 5);
  }, [ascents, showAllAscents]);

  const handleRouteUpdate = (routeId: number, points: RoutePoint[]) => {
    setRoutePoints(points);
  };

  const handleSaveRoute = (routeData: Partial<Route>) => {
    if (route && id) {
      setRoute({ ...route, ...routeData });
    }
    setIsEditorOpen(false);
  };

  const handleVote = async (grade: string) => {
    if (!id || !user) return;
    try {
      const routeId = Number(id);
      const newVote = await voteApi.submitVote(routeId, grade);
      setVotes((prev) => {
        const existing = prev.findIndex((v) => v.userId === user.id);
        if (existing !== -1) {
          const updated = [...prev];
          updated[existing] = newVote;
          return updated;
        }
        return [...prev, newVote];
      });
      setSelectedGrade(grade);
    } catch (err) {
      console.error('Failed to submit vote:', err);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-16 bg-rock-dark-800 rounded-xl animate-pulse" />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-[600px] bg-rock-dark-800 rounded-xl animate-pulse" />
          <div className="space-y-6">
            <div className="h-64 bg-rock-dark-800 rounded-xl animate-pulse" />
            <div className="h-80 bg-rock-dark-800 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!route) {
    return (
      <Card className="p-12 text-center">
        <Target size={48} className="mx-auto text-rock-light-600 mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">线路不存在</h3>
        <p className="text-rock-light-500 mb-4">请检查线路ID是否正确</p>
        <Button onClick={() => navigate('/routes')}>返回线路列表</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to={`/walls/${route.wallId}`}
            className="p-2 text-rock-light-400 hover:text-white hover:bg-rock-dark-700 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: route.color }}
              />
              <h1 className="text-2xl font-bold text-white">{route.name}</h1>
              <span
                className={cn(
                  'px-3 py-1 rounded-full text-sm font-semibold border',
                  routeStatusColors[route.status]
                )}
              >
                {routeStatusLabels[route.status]}
              </span>
            </div>
            <p className="text-rock-light-500 text-sm mt-1">
              {route.grade} · {routeTypeLabels[route.type]}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setIsEditorOpen(true)}>
            <Edit size={16} className="mr-2" />
            编辑线路
          </Button>
          <Button>
            <Plus size={16} className="mr-2" />
            记录攀爬
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="overflow-hidden h-[600px]">
            <WallCanvas
              routes={routesForCanvas}
              selectedRouteId={route.id}
              onRouteUpdate={handleRouteUpdate}
              isEditable={isEditorOpen}
              wallWidth={800}
              wallHeight={600}
              className="w-full h-full"
            />
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <div className="p-5 border-b border-rock-dark-700">
              <h3 className="font-semibold text-white">基本信息</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-rock-light-500 flex items-center gap-2">
                  <Tag size={14} />
                  类型
                </span>
                <span className="text-white font-medium">
                  {routeTypeLabels[route.type]}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-rock-light-500 flex items-center gap-2">
                  <Award size={14} />
                  定级
                </span>
                <span className="text-climbing-orange-400 font-bold text-lg">
                  {route.grade}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-rock-light-500">颜色</span>
                <div className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 rounded-full border-2 border-rock-dark-600"
                    style={{ backgroundColor: route.color }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-rock-light-500 flex items-center gap-2">
                  <TrendingUp size={14} />
                  长度
                </span>
                <span className="text-white">12 米</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-rock-light-500 flex items-center gap-2">
                  <User size={14} />
                  定线员
                </span>
                <span className="text-white">{route.setterName || '未知'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-rock-light-500 flex items-center gap-2">
                  <Calendar size={14} />
                  开放日期
                </span>
                <span className="text-white">{formatDate(route.createdAt)}</span>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-5 border-b border-rock-dark-700">
              <h3 className="font-semibold text-white">标签</h3>
            </div>
            <div className="p-5">
              <div className="flex flex-wrap gap-2">
                {(route?.tags || []).map((tagValue) => {
                  const tag = tagOptions.find((t) => t.value === tagValue);
                  return tag ? (
                    <span
                      key={tagValue}
                      className={cn(
                        'px-3 py-1 rounded-full text-xs font-medium',
                        tag.color
                      )}
                    >
                      {tag.label}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-5 border-b border-rock-dark-700">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white">难度共识</h3>
                {isControversial && (
                  <span className="flex items-center gap-1 text-xs text-red-400 bg-red-500/20 px-2 py-1 rounded-full">
                    <AlertTriangle size={12} />
                    有争议
                  </span>
                )}
              </div>
            </div>
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-rock-dark-900 rounded-lg">
                  <p className="text-xs text-rock-light-500 mb-1">定线定级</p>
                  <p className="text-2xl font-bold text-climbing-orange-400">
                    {route.grade}
                  </p>
                </div>
                <div className="text-center p-3 bg-rock-dark-900 rounded-lg">
                  <p className="text-xs text-rock-light-500 mb-1">社区共识</p>
                  <p className="text-2xl font-bold text-green-400">
                    {consensusGrade}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-rock-light-400 mb-3">投票你的难度</p>
                <div className="flex flex-wrap gap-1.5">
                  {boulderGrades.slice(0, 10).map((grade) => (
                    <button
                      key={grade}
                      onClick={() => handleVote(grade)}
                      className={cn(
                        'px-2.5 py-1.5 rounded-md text-xs font-medium transition-all',
                        selectedGrade === grade
                          ? 'bg-climbing-orange-500 text-white'
                          : 'bg-rock-dark-700 text-rock-light-400 hover:text-white hover:bg-rock-dark-600'
                      )}
                    >
                      {grade}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={gradeDistribution}>
                    <XAxis
                      dataKey="grade"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#999', fontSize: 10 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#999', fontSize: 10 }}
                      width={20}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1a1a1a',
                        border: '1px solid #333',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                      cursor={{ fill: 'rgba(255, 107, 53, 0.1)' }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {gradeDistribution.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.grade === consensusGrade ? '#FF6B35' : '#666'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="text-center text-xs text-rock-light-500">
                共 {votes.length} 人投票
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-5 border-b border-rock-dark-700">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white">攀爬记录</h3>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 size={14} className="text-green-400" />
                  <span className="text-rock-light-400">
                    完攀率{' '}
                    <span className="text-white font-medium">
                      {completionStats.rate}%
                    </span>
                  </span>
                </div>
              </div>
              <p className="text-xs text-rock-light-500 mt-1">
                共 {completionStats.total} 条记录，{completionStats.completed} 条完成
              </p>
            </div>
            <div className="divide-y divide-rock-dark-700">
              {displayedAscents.length === 0 ? (
                <div className="p-8 text-center">
                  <Zap size={24} className="mx-auto text-rock-light-600 mb-2" />
                  <p className="text-sm text-rock-light-500">暂无攀爬记录</p>
                </div>
              ) : (
                displayedAscents.map((ascent) => (
                  <div key={ascent.id} className="p-4 hover:bg-rock-dark-700/30 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-rock-dark-700 rounded-full flex items-center justify-center">
                          <User size={14} className="text-rock-light-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {ascent.userName || '用户' + ascent.userId}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-rock-light-500">
                            <Clock size={10} />
                            {formatDateTime(ascent.createdAt)}
                          </div>
                        </div>
                      </div>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-xs font-medium',
                          ascentTypeColors[ascent.ascentType]
                        )}
                      >
                        {ascentTypeLabels[ascent.ascentType]}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-rock-light-400 ml-11">
                      <span>尝试 {ascent.attempts} 次</span>
                    </div>
                    {ascent.notes && (
                      <p className="text-xs text-rock-light-500 mt-2 ml-11">
                        "{ascent.notes}"
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
            {ascents.length > 5 && (
              <button
                onClick={() => setShowAllAscents(!showAllAscents)}
                className="w-full p-3 text-sm text-rock-light-400 hover:text-white hover:bg-rock-dark-700/30 flex items-center justify-center gap-1 transition-colors border-t border-rock-dark-700"
              >
                {showAllAscents ? (
                  <>
                    收起 <ChevronUp size={14} />
                  </>
                ) : (
                  <>
                    查看更多 <ChevronDown size={14} />
                  </>
                )}
              </button>
            )}
          </Card>
        </div>
      </div>

      <RouteEditorPanel
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleSaveRoute}
        route={route}
        wallId={route.wallId}
      />
    </div>
  );
}
