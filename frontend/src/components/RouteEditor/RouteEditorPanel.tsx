import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import Button from '@/components/UI/Button';
import type { Route, RouteType, RouteStatus } from '@/types';

interface RouteEditorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (routeData: Partial<Route>) => void;
  route?: Route | null;
  wallId?: number;
}

const routeTypes: { value: RouteType; label: string }[] = [
  { value: 'lead', label: '先锋' },
  { value: 'top_rope', label: '顶绳' },
  { value: 'boulder', label: '抱石' },
  { value: 'speed', label: '速度' },
];

const routeStatuses: { value: RouteStatus; label: string }[] = [
  { value: 'drafting', label: '设定中' },
  { value: 'open', label: '开放中' },
  { value: 'removed', label: '已拆除' },
];

const boulderGrades = ['V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10', 'V11', 'V12', 'V13', 'V14', 'V15', 'V16', 'V17'];

const ropeGrades = ['5.5', '5.6', '5.7', '5.8', '5.9', '5.10a', '5.10b', '5.10c', '5.10d', '5.11a', '5.11b', '5.11c', '5.11d', '5.12a', '5.12b', '5.12c', '5.12d', '5.13a', '5.13b', '5.13c', '5.13d', '5.14a', '5.14b', '5.14c', '5.14d', '5.15a', '5.15b', '5.15c', '5.15d'];

const colorPalette = [
  '#FF6B35', '#EF4444', '#F59E0B', '#EAB308',
  '#22C55E', '#10B981', '#06B6D4', '#3B82F6',
  '#6366F1', '#8B5CF6', '#A855F7', '#EC4899',
  '#F97316', '#84CC16', '#14B8A6', '#0EA5E9',
];

const tagOptions = [
  { value: 'crimp', label: 'Crimp' },
  { value: 'sloper', label: 'Sloper' },
  { value: 'dyno', label: 'Dyno' },
  { value: 'crack', label: 'Crack' },
  { value: 'endurance', label: '耐力' },
  { value: 'technical', label: '技术型' },
  { value: 'powerful', label: '力量型' },
  { value: 'balance', label: '平衡' },
];

export default function RouteEditorPanel({
  isOpen,
  onClose,
  onSave,
  route,
  wallId,
}: RouteEditorPanelProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<RouteType>('boulder');
  const [grade, setGrade] = useState('V3');
  const [color, setColor] = useState('#FF6B35');
  const [tags, setTags] = useState<string[]>([]);
  const [status, setStatus] = useState<RouteStatus>('drafting');
  const [teardownDate, setTeardownDate] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (route) {
      setName(route.name);
      setType(route.type);
      setGrade(route.grade);
      setColor(route.color);
      setTags(route.tags || []);
      setStatus(route.status);
      setDescription(route.description || '');
    } else {
      setName('');
      setType('boulder');
      setGrade('V3');
      setColor('#FF6B35');
      setTags([]);
      setStatus('drafting');
      setTeardownDate('');
      setDescription('');
    }
  }, [route, isOpen]);

  const grades = type === 'boulder' ? boulderGrades : ropeGrades;

  const handleTagToggle = (tag: string) => {
    if (tags.includes(tag)) {
      setTags(tags.filter(t => t !== tag));
    } else {
      setTags([...tags, tag]);
    }
  };

  const handleSave = () => {
    onSave({
      name,
      type,
      grade,
      color,
      tags,
      status,
      description,
      plannedRemoveDate: teardownDate || undefined,
      wallId,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-rock-dark-800 border-l border-rock-dark-700 shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between p-5 border-b border-rock-dark-700">
        <h2 className="text-lg font-semibold text-white">
          {route ? '编辑线路' : '新建线路'}
        </h2>
        <button
          onClick={onClose}
          className="p-2 text-rock-light-400 hover:text-white hover:bg-rock-dark-700 rounded-lg transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-rock-light-300">线路名称</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="输入线路名称"
            className="w-full px-4 py-2.5 bg-rock-dark-900 border border-rock-dark-600 rounded-lg text-white placeholder-rock-light-600 focus:outline-none focus:border-climbing-orange-500 transition-colors"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-rock-light-300">线路类型</label>
          <div className="grid grid-cols-4 gap-2">
            {routeTypes.map((rt) => (
              <button
                key={rt.value}
                onClick={() => setType(rt.value)}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm font-medium transition-all',
                  type === rt.value
                    ? 'bg-climbing-orange-500 text-white'
                    : 'bg-rock-dark-700 text-rock-light-400 hover:text-white hover:bg-rock-dark-600'
                )}
              >
                {rt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-rock-light-300">定级</label>
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="w-full px-4 py-2.5 bg-rock-dark-900 border border-rock-dark-600 rounded-lg text-white focus:outline-none focus:border-climbing-orange-500 transition-colors appearance-none cursor-pointer"
          >
            {grades.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-rock-light-300">颜色</label>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg border-2 border-rock-dark-600 flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            <div className="grid grid-cols-8 gap-1.5">
              {colorPalette.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-7 h-7 rounded-md transition-transform hover:scale-110',
                    color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-rock-dark-800' : ''
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-rock-light-300">标签</label>
          <div className="flex flex-wrap gap-2">
            {tagOptions.map((tag) => (
              <button
                key={tag.value}
                onClick={() => handleTagToggle(tag.value)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                  tags.includes(tag.value)
                    ? 'bg-climbing-orange-500/20 text-climbing-orange-400 border border-climbing-orange-500/50'
                    : 'bg-rock-dark-700 text-rock-light-400 border border-rock-dark-600 hover:border-rock-dark-500'
                )}
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-rock-light-300">状态</label>
          <div className="grid grid-cols-3 gap-2">
            {routeStatuses.map((rs) => (
              <button
                key={rs.value}
                onClick={() => setStatus(rs.value)}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm font-medium transition-all',
                  status === rs.value
                    ? 'bg-climbing-orange-500 text-white'
                    : 'bg-rock-dark-700 text-rock-light-400 hover:text-white hover:bg-rock-dark-600'
                )}
              >
                {rs.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-rock-light-300">计划拆除日期</label>
          <input
            type="date"
            value={teardownDate}
            onChange={(e) => setTeardownDate(e.target.value)}
            className="w-full px-4 py-2.5 bg-rock-dark-900 border border-rock-dark-600 rounded-lg text-white focus:outline-none focus:border-climbing-orange-500 transition-colors"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-rock-light-300">描述</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="输入线路描述..."
            rows={3}
            className="w-full px-4 py-2.5 bg-rock-dark-900 border border-rock-dark-600 rounded-lg text-white placeholder-rock-light-600 focus:outline-none focus:border-climbing-orange-500 transition-colors resize-none"
          />
        </div>
      </div>

      <div className="p-5 border-t border-rock-dark-700 flex gap-3">
        <Button variant="secondary" onClick={onClose} className="flex-1">
          取消
        </Button>
        <Button onClick={handleSave} className="flex-1">
          <Save size={16} className="mr-2" />
          保存
        </Button>
      </div>
    </div>
  );
}
