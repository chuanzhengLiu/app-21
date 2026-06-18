import { useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, Rect, Line, Circle, Group, FabricObject, Gradient } from 'fabric';
import { cn } from '@/lib/utils';
import WallCanvasToolbar, { ToolType } from './WallCanvasToolbar';
import type { Route } from '@/types';

export interface RoutePoint {
  x: number;
  y: number;
  type: 'start' | 'hold' | 'end';
}

export interface RouteWithPoints extends Omit<Route, 'holds'> {
  points: RoutePoint[];
}

interface FabricObjectWithData extends FabricObject {
  data?: Record<string, unknown>;
}

interface WallCanvasProps {
  wallId?: number;
  routes: RouteWithPoints[];
  selectedRouteId?: number | null;
  onRouteSelect?: (routeId: number | null) => void;
  onRouteUpdate?: (routeId: number, points: RoutePoint[]) => void;
  isEditable?: boolean;
  wallWidth?: number;
  wallHeight?: number;
  className?: string;
}

const HOLD_RADIUS = 8;
const START_COLOR = '#22C55E';
const END_COLOR = '#EF4444';
const HOLD_STROKE_COLOR = '#ffffff';
const HOLD_STROKE_WIDTH = 2;
const LINE_WIDTH = 3;
const LINE_OPACITY = 0.8;

export default function WallCanvas({
  routes,
  selectedRouteId,
  onRouteSelect,
  onRouteUpdate,
  isEditable = false,
  wallWidth = 800,
  wallHeight = 600,
  className,
}: WallCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [zoom, setZoom] = useState(1);
  const [history, setHistory] = useState<RoutePoint[][]>([]);
  const [editingRouteId, setEditingRouteId] = useState<number | null>(null);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const routeGroupsRef = useRef<Map<number, Group>>(new Map());
  const routeIdMapRef = useRef<Map<Group, number>>(new Map());
  const pendingEditRouteIdRef = useRef<number | null>(null);

  const getEditingPoints = useCallback((): RoutePoint[] => {
    if (!editingRouteId) return [];
    const route = routes.find(r => r.id === editingRouteId);
    return route ? [...route.points] : [];
  }, [editingRouteId, routes]);

  const initCanvas = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = new Canvas(canvasRef.current, {
      width: wallWidth,
      height: wallHeight,
      backgroundColor: '#1a1a1a',
      selection: isEditable,
      preserveObjectStacking: true,
    });

    const gradient = new Rect({
      left: 0,
      top: 0,
      width: wallWidth,
      height: wallHeight,
      selectable: false,
      evented: false,
      fill: new Gradient({
        type: 'linear',
        coords: { x1: 0, y1: 0, x2: 0, y2: wallHeight },
        colorStops: [
          { offset: 0, color: '#2d2d2d' },
          { offset: 0.5, color: '#1f1f1f' },
          { offset: 1, color: '#141414' },
        ],
      }),
    });
    canvas.add(gradient);

    const gridSize = 50;
    for (let x = 0; x <= wallWidth; x += gridSize) {
      const line = new Line([x, 0, x, wallHeight], {
        stroke: '#333333',
        strokeWidth: 1,
        selectable: false,
        evented: false,
      });
      canvas.add(line);
    }
    for (let y = 0; y <= wallHeight; y += gridSize) {
      const line = new Line([0, y, wallWidth, y], {
        stroke: '#333333',
        strokeWidth: 1,
        selectable: false,
        evented: false,
      });
      canvas.add(line);
    }

    fabricCanvasRef.current = canvas;
  }, [wallWidth, wallHeight, isEditable]);

  const createRouteGroup = useCallback((route: RouteWithPoints, isSelected: boolean): Group => {
    const objects: FabricObject[] = [];

    if (route.points.length > 1) {
      for (let i = 0; i < route.points.length - 1; i++) {
        const p1 = route.points[i];
        const p2 = route.points[i + 1];
        const line = new Line([p1.x, p1.y, p2.x, p2.y], {
          stroke: route.color,
          strokeWidth: isSelected ? LINE_WIDTH + 2 : LINE_WIDTH,
          opacity: isSelected ? 1 : LINE_OPACITY,
          selectable: false,
          evented: false,
          strokeLineCap: 'round',
          strokeLineJoin: 'round',
        });
        objects.push(line);
      }
    }

    route.points.forEach((point, index) => {
      let color = route.color;
      if (point.type === 'start') color = START_COLOR;
      else if (point.type === 'end') color = END_COLOR;

      const circle = new Circle({
        left: point.x - HOLD_RADIUS,
        top: point.y - HOLD_RADIUS,
        radius: HOLD_RADIUS,
        fill: color,
        stroke: isSelected ? '#fff' : HOLD_STROKE_COLOR,
        strokeWidth: isSelected ? HOLD_STROKE_WIDTH + 1 : HOLD_STROKE_WIDTH,
        selectable: isEditable,
        hasControls: false,
        hasBorders: false,
      }) as FabricObjectWithData;

      circle.data = {
        routeId: route.id,
        pointIndex: index,
        pointType: point.type,
      };

      if (isSelected) {
        const outerCircle = new Circle({
          left: point.x - HOLD_RADIUS - 4,
          top: point.y - HOLD_RADIUS - 4,
          radius: HOLD_RADIUS + 4,
          fill: 'transparent',
          stroke: '#FF6B35',
          strokeWidth: 2,
          strokeDashArray: [4, 4],
          selectable: false,
          evented: false,
        });
        objects.push(outerCircle);
      }

      objects.push(circle);
    });

    const group = new Group(objects, {
      selectable: false,
      evented: true,
    });

    return group;
  }, [isEditable]);

  const renderRoutes = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    routeGroupsRef.current.forEach((group) => {
      canvas.remove(group);
    });
    routeGroupsRef.current.clear();
    routeIdMapRef.current.clear();

    routes.forEach((route) => {
      const isSelected = route.id === selectedRouteId;
      const group = createRouteGroup(route, isSelected);
      routeGroupsRef.current.set(route.id, group);
      routeIdMapRef.current.set(group, route.id);
      canvas.add(group);
    });

    canvas.renderAll();
  }, [routes, selectedRouteId, createRouteGroup]);

  const handleCanvasClick = useCallback((options: any) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const pointer = canvas.getPointer(options.e);

    if (activeTool === 'select') {
      if (options.target) {
        const targetData = (options.target as FabricObjectWithData).data;
        if (targetData?.routeId) {
          onRouteSelect?.(targetData.routeId as number);
        } else {
          const group = options.target.group;
          if (group) {
            const routeId = routeIdMapRef.current.get(group);
            if (routeId) {
              onRouteSelect?.(routeId);
            } else {
              onRouteSelect?.(null);
            }
          } else {
            onRouteSelect?.(null);
          }
        }
      } else {
        onRouteSelect?.(null);
      }
      return;
    }

    if (!editingRouteId && selectedRouteId) {
      setEditingRouteId(selectedRouteId);
      pendingEditRouteIdRef.current = selectedRouteId;
    }

    const effectiveEditingRouteId = editingRouteId || pendingEditRouteIdRef.current;

    if (!effectiveEditingRouteId) {
      return;
    }

    const currentPoints = getEditingPoints();
    const newPoint: RoutePoint = {
      x: pointer.x,
      y: pointer.y,
      type: activeTool === 'start' ? 'start' : activeTool === 'end' ? 'end' : 'hold',
    };

    let newPoints: RoutePoint[];
    if (activeTool === 'start') {
      const hasStart = currentPoints.some(p => p.type === 'start');
      if (hasStart) {
        newPoints = currentPoints.map(p => p.type === 'start' ? newPoint : p);
      } else {
        newPoints = [newPoint, ...currentPoints.filter(p => p.type !== 'start')];
      }
    } else if (activeTool === 'end') {
      const hasEnd = currentPoints.some(p => p.type === 'end');
      if (hasEnd) {
        newPoints = currentPoints.map(p => p.type === 'end' ? newPoint : p);
      } else {
        newPoints = [...currentPoints.filter(p => p.type !== 'end'), newPoint];
      }
    } else {
      newPoints = [...currentPoints, newPoint];
    }

    setHistory(prev => [...prev, currentPoints]);
    onRouteUpdate?.(effectiveEditingRouteId, newPoints);
  }, [activeTool, editingRouteId, selectedRouteId, getEditingPoints, onRouteSelect, onRouteUpdate]);

  const handleDelete = useCallback(() => {
    if (!editingRouteId && !selectedRouteId) return;
    
    const routeId = editingRouteId || selectedRouteId || 0;
    const currentPoints = getEditingPoints();
    
    if (selectedPointIndex !== null) {
      setHistory(prev => [...prev, currentPoints]);
      const newPoints = currentPoints.filter((_, i) => i !== selectedPointIndex);
      onRouteUpdate?.(routeId, newPoints);
      setSelectedPointIndex(null);
    }
  }, [editingRouteId, selectedRouteId, selectedPointIndex, getEditingPoints, onRouteUpdate]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const previousPoints = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    onRouteUpdate?.(editingRouteId || selectedRouteId || 0, previousPoints);
  }, [history, editingRouteId, selectedRouteId, onRouteUpdate]);

  const handleZoomIn = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const newZoom = Math.min(zoom * 1.2, 3);
    setZoom(newZoom);
    canvas.setZoom(newZoom);
  }, [zoom]);

  const handleZoomOut = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const newZoom = Math.max(zoom / 1.2, 0.3);
    setZoom(newZoom);
    canvas.setZoom(newZoom);
  }, [zoom]);

  const handleToolChange = useCallback((tool: ToolType) => {
    setActiveTool(tool);
    if (tool !== 'select' && selectedRouteId && !editingRouteId) {
      setEditingRouteId(selectedRouteId);
      pendingEditRouteIdRef.current = selectedRouteId;
    }
  }, [selectedRouteId, editingRouteId]);

  useEffect(() => {
    initCanvas();

    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
    };
  }, [initCanvas]);

  useEffect(() => {
    renderRoutes();
  }, [renderRoutes]);

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.on('mouse:down', handleCanvasClick);

    return () => {
      canvas.off('mouse:down', handleCanvasClick);
    };
  }, [handleCanvasClick]);

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    let isDragging = false;
    let lastPosX = 0;
    let lastPosY = 0;

    const handleMouseDown = (opt: any) => {
      if (opt.e.button === 1 || (opt.e.button === 0 && opt.e.shiftKey)) {
        isDragging = true;
        lastPosX = opt.e.clientX;
        lastPosY = opt.e.clientY;
        canvas.discardActiveObject();
        canvas.renderAll();
      }
    };

    const handleMouseMove = (opt: any) => {
      if (isDragging) {
        const deltaX = opt.e.clientX - lastPosX;
        const deltaY = opt.e.clientY - lastPosY;
        const vpt = canvas.viewportTransform;
        if (vpt) {
          vpt[4] += deltaX;
          vpt[5] += deltaY;
        }
        lastPosX = opt.e.clientX;
        lastPosY = opt.e.clientY;
        canvas.requestRenderAll();
      }
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:up', handleMouseUp);

    return () => {
      canvas.off('mouse:down', handleMouseDown);
      canvas.off('mouse:move', handleMouseMove);
      canvas.off('mouse:up', handleMouseUp);
    };
  }, []);

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const handleWheel = (opt: any) => {
      opt.e.preventDefault();
      opt.e.stopPropagation();

      const delta = opt.e.deltaY;
      let currentZoom = canvas.getZoom();
      currentZoom *= 0.999 ** delta;
      currentZoom = Math.max(0.3, Math.min(3, currentZoom));
      
      const point = canvas.getPointer(opt.e);
      canvas.zoomToPoint(point, currentZoom);
      setZoom(currentZoom);
    };

    canvas.on('mouse:wheel', handleWheel);

    return () => {
      canvas.off('mouse:wheel', handleWheel);
    };
  }, []);

  return (
    <div className={cn('relative w-full h-full', className)}>
      {isEditable && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
          <WallCanvasToolbar
            activeTool={activeTool}
            onToolChange={handleToolChange}
            onDelete={handleDelete}
            onUndo={handleUndo}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            canUndo={history.length > 0}
            canDelete={selectedPointIndex !== null}
          />
        </div>
      )}

      <div className="w-full h-full overflow-hidden bg-rock-dark-900 rounded-xl">
        <canvas ref={canvasRef} />
      </div>

      <div className="absolute bottom-4 right-4 text-xs text-rock-light-500 bg-rock-dark-800/80 px-3 py-1.5 rounded-lg">
        {Math.round(zoom * 100)}%
      </div>

      {!isEditable && routes.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-rock-dark-800/90 backdrop-blur-sm rounded-lg p-3 border border-rock-dark-700">
          <div className="flex items-center gap-2 text-xs text-rock-light-400 mb-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>起点</span>
            <div className="w-3 h-3 rounded-full bg-red-500 ml-2" />
            <span>终点</span>
          </div>
          <p className="text-xs text-rock-light-500">滚轮缩放 · Shift+拖拽平移</p>
        </div>
      )}
    </div>
  );
}

export { WallCanvasToolbar };
