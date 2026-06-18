import { useState, useEffect } from 'react';
import {
  Search,
  Minus,
  Plus,
  Video,
  X,
  Zap,
  Target,
  Flag,
  Mountain,
  TrendingUp,
  TrendingDown,
  Minus as MinusIcon,
} from 'lucide-react';
import Modal from '@/components/UI/Modal';
import Button from '@/components/UI/Button';
import type { Route, AscentType } from '@/types';
import { routeApi, wallApi } from '@/utils/api';
import { useGymStore } from '@/store/gym';

interface AscentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (data: AscentFormData) => void;
}

export interface AscentFormData {
  routeId: number;
  routeName: string;
  routeGrade: string;
  routeColor?: string;
  type: AscentType;
  attempts: number;
  feelDifficulty: 'harder' | 'same' | 'easier';
  notes: string;
  videoUrl?: string;
}

const ascentTypes: { value: AscentType; label: string; icon: typeof Zap; color: string; bgColor: string }[] = [
  { value: 'flash', label: 'Flash', icon: Zap, color: 'text-yellow-400', bgColor: 'bg-yellow-500/20 border-yellow-500/50' },
  { value: 'onsight', label: 'Onsight', icon: Target, color: 'text-green-400', bgColor: 'bg-green-500/20 border-green-500/50' },
  { value: 'redpoint', label: 'Redpoint', icon: Flag, color: 'text-blue-400', bgColor: 'bg-blue-500/20 border-blue-500/50' },
  { value: 'high_point', label: 'High Point', icon: Mountain, color: 'text-purple-400', bgColor: 'bg-purple-500/20 border-purple-500/50' },
  { value: 'fall', label: '脱落', icon: X, color: 'text-red-400', bgColor: 'bg-red-500/20 border-red-500/50' },
];

const feelOptions = [
  { value: 'harder', label: '比定级难', icon: TrendingUp, color: 'text-red-400' },
  { value: 'same', label: '差不多', icon: MinusIcon, color: 'text-yellow-400' },
  { value: 'easier', label: '比定级简单', icon: TrendingDown, color: 'text-green-400' },
];

export default function AscentFormModal({ isOpen, onClose, onSave }: AscentFormModalProps) {
  const { currentGym } = useGymStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [ascentType, setAscentType] = useState<AscentType>('redpoint');
  const [attempts, setAttempts] = useState(1);
  const [feelDifficulty, setFeelDifficulty] = useState<'harder' | 'same' | 'easier'>('same');
  const [notes, setNotes] = useState('');
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRoutes = async () => {
      if (!isOpen || !currentGym) return;
      setLoading(true);
      try {
        const walls = await wallApi.getWalls(currentGym.id);
        const allRoutes: Route[] = [];
        for (const wall of walls) {
          const wallRoutes = await routeApi.getRoutes(wall.id);
          allRoutes.push(...wallRoutes);
        }
        setRoutes(allRoutes);
      } catch (err) {
        console.error('获取线路列表失败:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRoutes();
  }, [isOpen, currentGym]);

  const filteredRoutes = routes.filter(
    (route) =>
      route.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      route.grade.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRouteSelect = (route: Route) => {
    setSelectedRoute(route);
    setSearchQuery(route.name);
    setShowDropdown(false);
  };

  const handleSave = () => {
    if (!selectedRoute) return;
    onSave?.({
      routeId: selectedRoute.id,
      routeName: selectedRoute.name,
      routeGrade: selectedRoute.grade,
      routeColor: selectedRoute.color,
      type: ascentType,
      attempts,
      feelDifficulty,
      notes,
    });
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setSearchQuery('');
    setSelectedRoute(null);
    setAscentType('redpoint');
    setAttempts(1);
    setFeelDifficulty('same');
    setNotes('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="记录攀爬" size="lg">
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-rock-light-300 mb-2">
            选择线路
          </label>
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-rock-light-500"
            />
            <input
              type="text"
              placeholder="搜索线路名称或定级..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              className="w-full pl-10 pr-4 py-2.5 bg-rock-dark-900 border border-rock-dark-700 rounded-lg text-white placeholder-rock-light-600 focus:outline-none focus:border-climbing-orange-500 transition-colors"
            />
            {loading && (
              <div className="absolute z-10 w-full mt-1 bg-rock-dark-800 border border-rock-dark-700 rounded-lg shadow-xl p-4 text-center text-rock-light-500">
                加载中...
              </div>
            )}
            {showDropdown && !loading && filteredRoutes.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-rock-dark-800 border border-rock-dark-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                {filteredRoutes.map((route) => (
                  <button
                    key={route.id}
                    onClick={() => handleRouteSelect(route)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-rock-dark-700 transition-colors text-left"
                  >
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: route.color || '#666' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{route.name}</p>
                      <p className="text-xs text-rock-light-500">{route.grade} · {route.setterName || '未定线员'}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-climbing-orange-500/20 text-climbing-orange-400 rounded text-xs font-bold">
                      {route.grade}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {showDropdown && !loading && filteredRoutes.length === 0 && searchQuery && (
              <div className="absolute z-10 w-full mt-1 bg-rock-dark-800 border border-rock-dark-700 rounded-lg shadow-xl p-4 text-center text-rock-light-500">
                没有找到匹配的线路
              </div>
            )}
          </div>
          {selectedRoute && (
            <div className="mt-3 p-3 bg-rock-dark-900/50 rounded-lg border border-rock-dark-700">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg"
                  style={{ backgroundColor: selectedRoute.color || '#666' }}
                />
                <div>
                  <p className="font-medium text-white">{selectedRoute.name}</p>
                  <p className="text-xs text-rock-light-500">定级：{selectedRoute.grade}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-rock-light-300 mb-2">
            攀爬结果
          </label>
          <div className="grid grid-cols-5 gap-2">
            {ascentTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = ascentType === type.value;
              return (
                <button
                  key={type.value}
                  onClick={() => setAscentType(type.value)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${
                    isSelected
                      ? `${type.bgColor} border-2`
                      : 'bg-rock-dark-900 border-rock-dark-700 hover:border-rock-dark-600'
                  }`}
                >
                  <Icon size={20} className={isSelected ? type.color : 'text-rock-light-500'} />
                  <span className={`text-xs font-medium ${isSelected ? type.color : 'text-rock-light-400'}`}>
                    {type.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-rock-light-300 mb-2">
            尝试次数
          </label>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setAttempts(Math.max(1, attempts - 1))}
                className="w-10 h-10 flex items-center justify-center bg-rock-dark-900 border border-rock-dark-700 rounded-lg hover:border-climbing-orange-500 transition-colors text-rock-light-300 hover:text-white"
              >
                <Minus size={18} />
              </button>
              <span className="w-12 text-center text-2xl font-bold text-white">
                {attempts}
              </span>
              <button
                onClick={() => setAttempts(attempts + 1)}
                className="w-10 h-10 flex items-center justify-center bg-rock-dark-900 border border-rock-dark-700 rounded-lg hover:border-climbing-orange-500 transition-colors text-rock-light-300 hover:text-white"
              >
                <Plus size={18} />
              </button>
            </div>
            <span className="text-sm text-rock-light-500">次</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-rock-light-300 mb-2">
            体感难度
          </label>
          <div className="grid grid-cols-3 gap-2">
            {feelOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = feelDifficulty === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setFeelDifficulty(option.value as 'harder' | 'same' | 'easier')}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border transition-all ${
                    isSelected
                      ? 'bg-climbing-orange-500/20 border-climbing-orange-500 text-climbing-orange-400'
                      : 'bg-rock-dark-900 border-rock-dark-700 text-rock-light-400 hover:border-rock-dark-600'
                  }`}
                >
                  <Icon size={16} className={isSelected ? option.color : ''} />
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-rock-light-300 mb-2">
            心得笔记
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="记录一下这次攀爬的心得、技巧要点..."
            rows={4}
            className="w-full px-4 py-3 bg-rock-dark-900 border border-rock-dark-700 rounded-lg text-white placeholder-rock-light-600 focus:outline-none focus:border-climbing-orange-500 transition-colors resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-rock-light-300 mb-2">
            视频上传
          </label>
          <div className="flex items-center justify-center w-full h-24 border-2 border-dashed border-rock-dark-700 rounded-lg hover:border-climbing-orange-500 transition-colors cursor-pointer bg-rock-dark-900/50">
            <div className="flex flex-col items-center gap-2 text-rock-light-500">
              <Video size={24} />
              <span className="text-sm">点击或拖拽上传视频（可选）</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            取消
          </Button>
          <Button onClick={handleSave} className="flex-1" disabled={!selectedRoute}>
            保存记录
          </Button>
        </div>
      </div>
    </Modal>
  );
}
