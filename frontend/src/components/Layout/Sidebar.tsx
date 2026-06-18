import { NavLink } from 'react-router-dom';
import {
  Home,
  Mountain,
  Route,
  ListTodo,
  BarChart3,
  User,
  LayoutDashboard,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { path: '/', label: '首页', icon: Home },
  { path: '/walls', label: '岩壁', icon: Mountain },
  { path: '/routes', label: '线路', icon: Route },
  { path: '/ascents', label: '攀爬记录', icon: ListTodo },
  { path: '/analytics', label: '个人分析', icon: BarChart3 },
  { path: '/profile', label: '个人中心', icon: User },
  { path: '/dashboard', label: '运营数据', icon: LayoutDashboard, adminOnly: true },
  { path: '/admin/users', label: '用户管理', icon: Users, adminOnly: true },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full w-64 bg-rock-dark-900 border-r border-rock-dark-800 z-40 transition-transform duration-300 flex flex-col',
        !isOpen && '-translate-x-full lg:translate-x-0'
      )}
    >
      <div className="p-6 border-b border-rock-dark-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-climbing-orange-500 rounded-lg flex items-center justify-center">
            <Mountain size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">攀岩</h1>
            <p className="text-xs text-rock-light-500">Climbing App</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-climbing-orange-500/10 text-climbing-orange-500 border-l-2 border-climbing-orange-500'
                    : 'text-rock-light-400 hover:bg-rock-dark-800 hover:text-white'
                )
              }
              onClick={onClose}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-rock-dark-800">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-rock-dark-800">
          <div className="w-10 h-10 bg-rock-dark-700 rounded-full flex items-center justify-center">
            <User size={20} className="text-rock-light-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">用户名</p>
            <p className="text-xs text-rock-light-500 truncate">user@example.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
