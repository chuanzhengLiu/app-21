import {
  MousePointer2,
  Pencil,
  CircleDot,
  Flag,
  Target,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToolType = 'select' | 'draw' | 'hold' | 'start' | 'end';

interface WallCanvasToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  onDelete: () => void;
  onUndo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  canUndo: boolean;
  canDelete: boolean;
}

const tools: { id: ToolType; icon: typeof MousePointer2; label: string }[] = [
  { id: 'select', icon: MousePointer2, label: '选择' },
  { id: 'draw', icon: Pencil, label: '绘制线路' },
  { id: 'hold', icon: CircleDot, label: '添加手点' },
  { id: 'start', icon: Flag, label: '添加起点' },
  { id: 'end', icon: Target, label: '添加终点' },
];

export default function WallCanvasToolbar({
  activeTool,
  onToolChange,
  onDelete,
  onUndo,
  onZoomIn,
  onZoomOut,
  canUndo,
  canDelete,
}: WallCanvasToolbarProps) {
  return (
    <div className="flex items-center gap-1 p-2 bg-rock-dark-800/90 backdrop-blur-sm rounded-xl border border-rock-dark-700 shadow-xl">
      {tools.map((tool) => {
        const Icon = tool.icon;
        return (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            title={tool.label}
            className={cn(
              'p-2.5 rounded-lg transition-all duration-200',
              activeTool === tool.id
                ? 'bg-climbing-orange-500 text-white shadow-lg shadow-climbing-orange-500/30'
                : 'text-rock-light-400 hover:text-white hover:bg-rock-dark-700'
            )}
          >
            <Icon size={18} />
          </button>
        );
      })}

      <div className="w-px h-6 bg-rock-dark-600 mx-1" />

      <button
        onClick={onUndo}
        disabled={!canUndo}
        title="撤销"
        className={cn(
          'p-2.5 rounded-lg transition-all duration-200',
          canUndo
            ? 'text-rock-light-400 hover:text-white hover:bg-rock-dark-700'
            : 'text-rock-dark-600 cursor-not-allowed'
        )}
      >
        <Undo2 size={18} />
      </button>

      <button
        onClick={onDelete}
        disabled={!canDelete}
        title="删除"
        className={cn(
          'p-2.5 rounded-lg transition-all duration-200',
          canDelete
            ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
            : 'text-rock-dark-600 cursor-not-allowed'
        )}
      >
        <Trash2 size={18} />
      </button>

      <div className="w-px h-6 bg-rock-dark-600 mx-1" />

      <button
        onClick={onZoomOut}
        title="缩小"
        className="p-2.5 rounded-lg text-rock-light-400 hover:text-white hover:bg-rock-dark-700 transition-all duration-200"
      >
        <ZoomOut size={18} />
      </button>

      <button
        onClick={onZoomIn}
        title="放大"
        className="p-2.5 rounded-lg text-rock-light-400 hover:text-white hover:bg-rock-dark-700 transition-all duration-200"
      >
        <ZoomIn size={18} />
      </button>
    </div>
  );
}
