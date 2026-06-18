import { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  ListTodo,
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Clock,
  Zap,
  Target,
  Flag,
  Mountain,
  X,
  TrendingUp,
  TrendingDown,
  Minus as MinusIcon,
  Loader2,
} from 'lucide-react';
import Card from '@/components/UI/Card';
import Button from '@/components/UI/Button';
import AscentFormModal from '@/components/AscentForm/AscentFormModal';
import type { AscentFormData } from '@/components/AscentForm/AscentFormModal';
import type { Ascent, AscentType } from '@/types';
import { ascentApi } from '@/utils/api';

const ascentTypeColors: Record<AscentType, string> = {
  flash: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30',
  onsight: 'text-green-400 bg-green-500/20 border-green-500/30',
  redpoint: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
  high_point: 'text-purple-400 bg-purple-500/20 border-purple-500/30',
  fall: 'text-red-400 bg-red-500/20 border-red-500/30',
};

const ascentTypeLabels: Record<AscentType, string> = {
  flash: 'Flash',
  onsight: 'Onsight',
  redpoint: 'Redpoint',
  high_point: 'High Point',
  fall: '脱落',
};

const ascentTypeIcons: Record<AscentType, typeof Zap> = {
  flash: Zap,
  onsight: Target,
  redpoint: Flag,
  high_point: Mountain,
  fall: X,
};

const feelLabels: Record<string, string> = {
  harder: '偏难',
  same: '正常',
  easier: '偏易',
};

const feelColors: Record<string, string> = {
  harder: 'text-red-400',
  same: 'text-yellow-400',
  easier: 'text-green-400',
};

const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

const gradeColors: Record<string, string> = {
  'V0': '#22C55E', 'V1': '#4ADE80', 'V2': '#84CC16',
  'V3': '#FACC15', 'V4': '#F59E0B', 'V5': '#F97316',
  'V6': '#EF4444', 'V7': '#DC2626', 'V8': '#B91C1C',
  'V9': '#991B1B', 'V10': '#7F1D1D',
};

function getGradeColor(grade: string): string {
  return gradeColors[grade] || '#666666';
}

function getDateFromAscent(ascent: Ascent): string {
  return ascent.createdAt.split('T')[0];
}

function getTimeFromAscent(ascent: Ascent): string {
  const date = new Date(ascent.createdAt);
  return date.toTimeString().slice(0, 5);
}

export default function Ascents() {
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [ascents, setAscents] = useState<Ascent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    fetchAscents();
  }, []);

  const fetchAscents = async () => {
    setLoading(true);
    try {
      const data = await ascentApi.getAscents();
      setAscents(data);
    } catch (err) {
      console.error('获取攀爬记录失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: (number | null)[] = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    const dateAscentMap: Record<string, Ascent[]> = {};
    ascents.forEach((ascent) => {
      const dateKey = getDateFromAscent(ascent);
      if (!dateAscentMap[dateKey]) {
        dateAscentMap[dateKey] = [];
      }
      dateAscentMap[dateKey].push(ascent);
    });

    return { days, dateAscentMap, year, month };
  }, [currentDate, ascents]);

  const filteredAscents = useMemo(() => {
    let result = [...ascents];
    if (searchQuery) {
      result = result.filter((a) =>
        (a.routeName || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (filterType !== 'all') {
      result = result.filter((a) => a.ascentType === filterType);
    }
    if (dateRange.start) {
      result = result.filter((a) => getDateFromAscent(a) >= dateRange.start);
    }
    if (dateRange.end) {
      result = result.filter((a) => getDateFromAscent(a) <= dateRange.end);
    }
    return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [ascents, searchQuery, filterType, dateRange]);

  const groupedAscents = useMemo(() => {
    const groups: Record<string, Ascent[]> = {};
    filteredAscents.forEach((ascent) => {
      const dateKey = getDateFromAscent(ascent);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(ascent);
    });
    return groups;
  }, [filteredAscents]);

  const formatDateKey = (day: number) => {
    const year = calendarData.year;
    const month = String(calendarData.month + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return `${year}-${month}-${dayStr}`;
  };

  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const yesterday = new Date(today.getTime() - 86400000).toISOString().split('T')[0];
    const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (dateStr === todayStr) return '今天';
    if (dateStr === yesterday) return '昨天';
    if (diffDays < 7) return `${diffDays}天前`;

    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDateClick = (day: number) => {
    const dateKey = formatDateKey(day);
    setSelectedDate(selectedDate === dateKey ? null : dateKey);
  };

  const handleSaveAscent = async (data: AscentFormData) => {
    try {
      const feltGradeMap: Record<string, string | undefined> = {
        harder: 'harder',
        same: 'same',
        easier: 'easier',
      };
      const newAscent = await ascentApi.createAscent({
        routeId: data.routeId,
        ascentType: data.type,
        attempts: data.attempts,
        feltGrade: feltGradeMap[data.feelDifficulty],
        notes: data.notes,
        videoUrl: data.videoUrl,
      });
      setAscents(prev => [newAscent, ...prev]);
    } catch (err) {
      console.error('创建攀爬记录失败:', err);
    }
  };

  const monthName = currentDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });

  const selectedDayAscents = selectedDate ? calendarData.dateAscentMap[selectedDate] || [] : [];

  const stats = useMemo(() => {
    const total = ascents.length;
    const flashCount = ascents.filter((a) => a.ascentType === 'flash').length;
    const redpointCount = ascents.filter((a) => a.ascentType === 'redpoint' || a.ascentType === 'onsight').length;
    const grades = ascents
      .filter((a) => a.routeGrade)
      .map((a) => {
        const match = (a.routeGrade || '').match(/V(\d+)/);
        return match ? parseInt(match[1]) : -1;
      })
      .filter((g) => g >= 0);
    const maxGrade = grades.length > 0 ? `V${Math.max(...grades)}` : '-';
    return { total, flashCount, redpointCount, maxGrade };
  }, [ascents]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-climbing-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">攀爬记录</h1>
          <p className="text-rock-light-500 mt-1">记录你的每一次攀爬</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 hover:border-rock-dark-600 transition-colors">
          <p className="text-3xl font-bold text-white">{stats.total}</p>
          <p className="text-sm text-rock-light-500 mt-1">总攀爬次数</p>
        </Card>
        <Card className="p-5 hover:border-rock-dark-600 transition-colors">
          <p className="text-3xl font-bold text-yellow-400">{stats.flashCount}</p>
          <p className="text-sm text-rock-light-500 mt-1">Flash</p>
        </Card>
        <Card className="p-5 hover:border-rock-dark-600 transition-colors">
          <p className="text-3xl font-bold text-climbing-orange-500">{stats.redpointCount}</p>
          <p className="text-sm text-rock-light-500 mt-1">完攀数</p>
        </Card>
        <Card className="p-5 hover:border-rock-dark-600 transition-colors">
          <p className="text-3xl font-bold text-purple-400">{stats.maxGrade}</p>
          <p className="text-sm text-rock-light-500 mt-1">最高难度</p>
        </Card>
      </div>

      <Card className="p-1">
        <div className="flex">
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg transition-all ${
              viewMode === 'calendar'
                ? 'bg-climbing-orange-500/20 text-climbing-orange-400'
                : 'text-rock-light-400 hover:text-white hover:bg-rock-dark-700/50'
            }`}
          >
            <Calendar size={18} />
            <span className="font-medium">日历视图</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg transition-all ${
              viewMode === 'list'
                ? 'bg-climbing-orange-500/20 text-climbing-orange-400'
                : 'text-rock-light-400 hover:text-white hover:bg-rock-dark-700/50'
            }`}
          >
            <ListTodo size={18} />
            <span className="font-medium">列表视图</span>
          </button>
        </div>
      </Card>

      {viewMode === 'calendar' ? (
        <Card>
          <div className="flex items-center justify-between p-4 border-b border-rock-dark-700">
            <button
              onClick={handlePrevMonth}
              className="p-2 hover:bg-rock-dark-700 rounded-lg transition-colors text-rock-light-400 hover:text-white"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-lg font-semibold text-white">{monthName}</h2>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-rock-dark-700 rounded-lg transition-colors text-rock-light-400 hover:text-white"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="grid grid-cols-7 border-b border-rock-dark-700">
            {weekDays.map((day) => (
              <div
                key={day}
                className="py-3 text-center text-sm font-medium text-rock-light-500"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {calendarData.days.map((day, index) => {
              if (day === null) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="aspect-square border-b border-r border-rock-dark-700/50 bg-rock-dark-900/30"
                  />
                );
              }

              const dateKey = formatDateKey(day);
              const dayAscents = calendarData.dateAscentMap[dateKey] || [];
              const hasAscents = dayAscents.length > 0;
              const isSelected = selectedDate === dateKey;
              const isToday = dateKey === new Date().toISOString().split('T')[0];

              return (
                <button
                  key={day}
                  onClick={() => hasAscents && handleDateClick(day)}
                  className={`aspect-square border-b border-r border-rock-dark-700/50 p-1 relative transition-all ${
                    hasAscents ? 'cursor-pointer hover:bg-rock-dark-700/30' : 'cursor-default'
                  } ${isSelected ? 'bg-climbing-orange-500/10' : ''}`}
                >
                  <span
                    className={`absolute top-1 left-1 w-6 h-6 flex items-center justify-center text-sm rounded-full ${
                      isToday
                        ? 'bg-climbing-orange-500 text-white font-bold'
                        : hasAscents
                        ? 'text-green-400 font-medium'
                        : 'text-rock-light-600'
                    }`}
                  >
                    {day}
                  </span>
                  {hasAscents && (
                    <div className="absolute bottom-1 left-1 right-1 flex gap-0.5 flex-wrap">
                      {dayAscents.slice(0, 3).map((ascent, i) => (
                        <div
                          key={i}
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: getGradeColor(ascent.routeGrade || '') }}
                        />
                      ))}
                      {dayAscents.length > 3 && (
                        <span className="text-xs text-rock-light-500">+{dayAscents.length - 3}</span>
                      )}
                    </div>
                  )}
                  {hasAscents && (
                    <div className="absolute bottom-1 right-1">
                      <span className="text-xs text-green-400 font-medium">
                        {dayAscents.length}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {selectedDate && (
            <div className="p-4 border-t border-rock-dark-700 bg-rock-dark-900/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white">
                  {formatDateDisplay(selectedDate)}
                </h3>
                <span className="text-sm text-rock-light-500">
                  {selectedDayAscents.length} 条记录
                </span>
              </div>
              {selectedDayAscents.length === 0 ? (
                <p className="text-center text-rock-light-500 py-4">当天没有攀爬记录</p>
              ) : (
                <div className="space-y-3">
                  {selectedDayAscents.map((ascent) => {
                    const TypeIcon = ascentTypeIcons[ascent.ascentType];
                    const routeColor = getGradeColor(ascent.routeGrade || '');
                    return (
                      <div
                        key={ascent.id}
                        className="flex items-center gap-4 p-3 bg-rock-dark-800 rounded-lg border border-rock-dark-700"
                      >
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: routeColor + '30' }}
                        >
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: routeColor }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-white truncate">{ascent.routeName || `线路 #${ascent.routeId}`}</h4>
                            <span className="px-2 py-0.5 bg-climbing-orange-500/20 text-climbing-orange-400 rounded text-xs font-bold">
                              {ascent.routeGrade}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-rock-light-500">
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {getTimeFromAscent(ascent)}
                            </span>
                            <span>{ascent.attempts} 次尝试</span>
                          </div>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${ascentTypeColors[ascent.ascentType]}`}
                        >
                          {TypeIcon && <TypeIcon size={12} />}
                          {ascentTypeLabels[ascent.ascentType]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </Card>
      ) : (
        <>
          <Card className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-rock-light-500"
                  />
                  <input
                    type="text"
                    placeholder="搜索线路名称..."
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
                    <option value="flash">Flash</option>
                    <option value="onsight">Onsight</option>
                    <option value="redpoint">Redpoint</option>
                    <option value="high_point">High Point</option>
                    <option value="fall">脱落</option>
                  </select>
                </div>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  placeholder="开始日期"
                  className="bg-rock-dark-900 border border-rock-dark-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-climbing-orange-500"
                />
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  placeholder="结束日期"
                  className="bg-rock-dark-900 border border-rock-dark-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-climbing-orange-500"
                />
              </div>
            </div>
          </Card>

          <div className="space-y-6">
            {Object.entries(groupedAscents).map(([date, dayAscents]) => (
              <div key={date}>
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-lg font-semibold text-white">
                    {formatDateDisplay(date)}
                  </h3>
                  <span className="text-sm text-rock-light-500">
                    {dayAscents.length} 条记录
                  </span>
                </div>
                <Card className="divide-y divide-rock-dark-700">
                  {dayAscents.map((ascent) => {
                    const TypeIcon = ascentTypeIcons[ascent.ascentType];
                    const routeColor = getGradeColor(ascent.routeGrade || '');
                    return (
                      <div
                        key={ascent.id}
                        className="p-4 flex items-center gap-4 hover:bg-rock-dark-800/50 transition-colors"
                      >
                        <div className="w-1 h-12 rounded-full flex-shrink-0" style={{ backgroundColor: routeColor }} />
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: routeColor + '20' }}
                        >
                          <div
                            className="w-5 h-5 rounded-full"
                            style={{ backgroundColor: routeColor }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-white">{ascent.routeName || `线路 #${ascent.routeId}`}</h4>
                            <span className="px-2 py-0.5 bg-climbing-orange-500/20 text-climbing-orange-400 rounded text-xs font-bold">
                              {ascent.routeGrade}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-rock-light-500">
                            <span className="flex items-center gap-1">
                              <Clock size={14} />
                              {getTimeFromAscent(ascent)}
                            </span>
                            <span>尝试 {ascent.attempts} 次</span>
                          </div>
                          {ascent.notes && (
                            <p className="text-sm text-rock-light-500 mt-2 line-clamp-1">
                              {ascent.notes}
                            </p>
                          )}
                        </div>
                        <span
                          className={`px-3 py-1.5 rounded-full text-sm font-medium border flex items-center gap-1.5 ${ascentTypeColors[ascent.ascentType]}`}
                        >
                          {TypeIcon && <TypeIcon size={14} />}
                          {ascentTypeLabels[ascent.ascentType]}
                        </span>
                      </div>
                    );
                  })}
                </Card>
              </div>
            ))}

            {filteredAscents.length === 0 && (
              <Card className="p-12 text-center">
                <ListTodo size={48} className="mx-auto text-rock-light-600 mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">暂无记录</h3>
                <p className="text-rock-light-500">没有找到符合条件的攀爬记录</p>
              </Card>
            )}
          </div>
        </>
      )}

      <button
        onClick={() => setShowFormModal(true)}
        className="fixed right-6 bottom-6 w-14 h-14 bg-climbing-orange-500 hover:bg-climbing-orange-600 text-white rounded-full shadow-lg shadow-climbing-orange-500/30 flex items-center justify-center transition-all hover:scale-105 z-40"
      >
        <Plus size={24} />
      </button>

      <AscentFormModal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSave={handleSaveAscent}
      />
    </div>
  );
}
