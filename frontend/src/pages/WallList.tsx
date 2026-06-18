import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Mountain, Plus, Search, Edit, Trash2, Eye, Route } from 'lucide-react';
import Card from '@/components/UI/Card';
import Button from '@/components/UI/Button';
import { wallApi, routeApi } from '@/utils/api';
import { useGymStore } from '@/store/gym';
import type { Wall } from '@/types';

const wallGradients = [
  'from-orange-600 via-red-700 to-amber-900',
  'from-blue-600 via-indigo-700 to-purple-900',
  'from-green-600 via-teal-700 to-emerald-900',
  'from-purple-600 via-pink-700 to-rose-900',
];

export default function WallList() {
  const { currentGym } = useGymStore();
  const [walls, setWalls] = useState<Wall[]>([]);
  const [routeCounts, setRouteCounts] = useState<Record<number, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWalls = async () => {
      if (!currentGym?.id) return;
      setIsLoading(true);
      try {
        const data = await wallApi.getWalls(currentGym.id);
        setWalls(data);
        
        const routeResults = await Promise.all(
          data.map(wall =>
            routeApi.getRoutes(wall.id).catch(() => [])
          )
        );
        const counts: Record<number, number> = {};
        data.forEach((wall, index) => {
          const result = routeResults[index];
          counts[wall.id] = Array.isArray(result) ? result.length : 0;
        });
        setRouteCounts(counts);
      } catch (err) {
        console.error('Failed to fetch walls:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (currentGym) {
      fetchWalls();
    }
  }, [currentGym]);

  const filteredWalls = walls.filter(wall =>
    wall.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    wall.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = (wallId: number, wallName: string) => {
    if (confirm(`确定要删除岩壁「${wallName}」吗？`)) {
      setWalls(walls.filter(w => w.id !== wallId));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">岩壁列表</h1>
          <p className="text-rock-light-500 mt-1">管理岩馆的所有岩壁</p>
        </div>
        <Button>
          <Plus size={18} className="mr-2" />
          创建岩壁
        </Button>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-rock-light-500" />
          <input
            type="text"
            placeholder="搜索岩壁..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-rock-dark-900 border border-rock-dark-700 rounded-lg text-white placeholder-rock-light-600 focus:outline-none focus:border-climbing-orange-500 transition-colors"
          />
        </div>
      </Card>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden animate-pulse">
              <div className="h-40 bg-rock-dark-700" />
              <div className="p-5 space-y-3">
                <div className="h-5 bg-rock-dark-700 rounded w-3/4" />
                <div className="h-4 bg-rock-dark-700 rounded w-full" />
                <div className="h-8 bg-rock-dark-700 rounded w-1/2" />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredWalls.map((wall, index) => (
            <Card
              key={wall.id}
              className="overflow-hidden hover:border-rock-dark-600 transition-all hover:shadow-lg group"
            >
              <Link to={`/walls/${wall.id}`}>
                <div className={`h-40 bg-gradient-to-br ${wallGradients[index % wallGradients.length]} relative overflow-hidden`}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Mountain size={56} className="text-white/30" />
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-lg font-bold text-white drop-shadow-lg">{wall.name}</h3>
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                </div>
              </Link>
              <div className="p-5">
                <p className="text-sm text-rock-light-500 line-clamp-2 mb-4">{wall.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-rock-light-400">
                    <Route size={16} />
                    <span className="text-sm">
                      <span className="font-semibold text-climbing-orange-400">{routeCounts[wall.id] || 0}</span> 条线路
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link to={`/walls/${wall.id}`}>
                      <Button variant="ghost" size="sm" className="p-2">
                        <Eye size={16} />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="sm" className="p-2 text-blue-400 hover:text-blue-300">
                      <Edit size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-2 text-red-400 hover:text-red-300"
                      onClick={() => handleDelete(wall.id, wall.name)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && filteredWalls.length === 0 && (
        <Card className="p-12 text-center">
          <Mountain size={48} className="mx-auto text-rock-light-600 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">暂无岩壁</h3>
          <p className="text-rock-light-500 mb-4">点击上方按钮创建第一个岩壁</p>
          <Button>
            <Plus size={18} className="mr-2" />
            创建岩壁
          </Button>
        </Card>
      )}
    </div>
  );
}
