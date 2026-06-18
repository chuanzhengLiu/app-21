import { useState, useEffect } from 'react';
import {
  Users,
  Search,
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  Award,
  Wrench,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import Card from '@/components/UI/Card';
import Button from '@/components/UI/Button';
import type { UserRole, User as UserType } from '@/types';
import { useGymStore } from '@/store/gym';
import { useAuthStore } from '@/store/auth';
import { userApi } from '@/utils/api';

type VerifyStatus = 'pending' | 'approved' | 'rejected' | 'none';

interface UserItem {
  id: number;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  role: UserRole;
  verifyStatus: VerifyStatus;
  verifiedAt?: string;
  createdAt: string;
  ascentCount: number;
}

const roleLabels: Record<UserRole, string> = {
  platform_admin: '平台管理员',
  gym_admin: '岩馆管理员',
  setter: '定线员',
  verified_climber: '认证攀岩者',
  guest: '游客',
};

const roleColors: Record<UserRole, string> = {
  platform_admin: 'bg-red-500/20 text-red-400 border-red-500/30',
  gym_admin: 'bg-green-500/20 text-green-400 border-green-500/30',
  setter: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  verified_climber: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  guest: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const verifyStatusConfig: Record<VerifyStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: '待审核', color: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30', icon: Clock },
  approved: { label: '已认证', color: 'text-green-400 bg-green-500/20 border-green-500/30', icon: CheckCircle },
  rejected: { label: '已拒绝', color: 'text-red-400 bg-red-500/20 border-red-500/30', icon: XCircle },
  none: { label: '未认证', color: 'text-gray-400 bg-gray-500/20 border-gray-500/30', icon: Shield },
};

function mapUserToItem(user: UserType, pendingIds: Set<number>): UserItem {
  let verifyStatus: VerifyStatus = 'none';
  if (user.verifiedAt) {
    verifyStatus = 'approved';
  } else if (pendingIds.has(user.id)) {
    verifyStatus = 'pending';
  }
  return {
    id: user.id,
    name: user.name,
    email: user.email || '',
    phone: user.phone || '',
    avatar: user.avatar,
    role: user.role,
    verifyStatus,
    verifiedAt: user.verifiedAt,
    createdAt: user.createdAt,
    ascentCount: 0,
  };
}

type TabKey = 'all' | 'pending' | 'setter' | 'certified';

const tabs: { key: TabKey; label: string; icon: typeof Users }[] = [
  { key: 'all', label: '全部用户', icon: Users },
  { key: 'pending', label: '待审核', icon: Clock },
  { key: 'setter', label: '定线员', icon: Wrench },
  { key: 'certified', label: '认证攀岩者', icon: Award },
];

const roleFilterOptions: { value: string; label: string }[] = [
  { value: 'all', label: '全部角色' },
  { value: 'platform_admin', label: '平台管理员' },
  { value: 'gym_admin', label: '岩馆管理员' },
  { value: 'setter', label: '定线员' },
  { value: 'verified_climber', label: '认证攀岩者' },
  { value: 'guest', label: '游客' },
];

const roleChangeOptions: { value: UserRole; label: string }[] = [
  { value: 'platform_admin', label: '平台管理员' },
  { value: 'gym_admin', label: '岩馆管理员' },
  { value: 'setter', label: '定线员' },
  { value: 'verified_climber', label: '认证攀岩者' },
  { value: 'guest', label: '游客' },
];

export default function AdminUsers() {
  const { currentGym } = useGymStore();
  const { user: authUser } = useAuthStore();

  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const pageSize = 8;

  const gymId = currentGym?.id || authUser?.gymId;

  const fetchUsers = async () => {
    if (!gymId) return;
    setLoading(true);
    try {
      const [allUsers, pendingUsers] = await Promise.all([
        userApi.getGymUsers(gymId),
        userApi.getPendingVerifications(gymId),
      ]);
      const pendingIds = new Set(pendingUsers.map((u) => u.id));
      const items = allUsers.map((u) => mapUserToItem(u, pendingIds));
      setUsers(items);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [gymId]);

  const filteredUsers = users.filter((user) => {
    if (activeTab === 'pending' && user.verifyStatus !== 'pending') return false;
    if (activeTab === 'setter' && user.role !== 'setter') return false;
    if (activeTab === 'certified' && user.verifyStatus !== 'approved') return false;

    if (filterRole !== 'all' && user.role !== filterRole) return false;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.phone.includes(query)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const paginatedUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize);

  const handleApprove = async (userId: number) => {
    try {
      await userApi.verifyUser(userId, true);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, verifyStatus: 'approved', verifiedAt: new Date().toISOString() } : u))
      );
    } catch (error) {
      console.error('Failed to approve user:', error);
    }
  };

  const handleReject = async (userId: number) => {
    try {
      await userApi.verifyUser(userId, false);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, verifyStatus: 'rejected' } : u))
      );
    } catch (error) {
      console.error('Failed to reject user:', error);
    }
  };

  const handleChangeRole = async (userId: number, newRole: UserRole) => {
    try {
      await userApi.changeUserRole(userId, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    } catch (error) {
      console.error('Failed to change user role:', error);
    }
  };

  const stats = {
    total: users.length,
    pending: users.filter((u) => u.verifyStatus === 'pending').length,
    certified: users.filter((u) => u.verifyStatus === 'approved').length,
    setters: users.filter((u) => u.role === 'setter').length,
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const maskPhone = (phone: string) => {
    if (!phone) return '';
    if (phone.length >= 11) {
      return phone.slice(0, 3) + '****' + phone.slice(7);
    }
    return phone;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">用户管理</h1>
          <p className="text-rock-light-500 mt-1">管理岩馆所有用户账号</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 hover:border-rock-dark-600 transition-colors cursor-pointer" onClick={() => setActiveTab('all')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-white">{stats.total}</p>
              <p className="text-sm text-rock-light-500 mt-1">全部用户</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/20">
              <Users size={24} className="text-blue-400" />
            </div>
          </div>
        </Card>
        <Card className={`p-5 hover:border-rock-dark-600 transition-colors cursor-pointer ${activeTab === 'pending' ? 'border-yellow-500/50' : ''}`} onClick={() => setActiveTab('pending')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-yellow-400">{stats.pending}</p>
              <p className="text-sm text-rock-light-500 mt-1">待审核</p>
            </div>
            <div className="p-3 rounded-xl bg-yellow-500/20">
              <Clock size={24} className="text-yellow-400" />
            </div>
          </div>
        </Card>
        <Card className={`p-5 hover:border-rock-dark-600 transition-colors cursor-pointer ${activeTab === 'certified' ? 'border-green-500/50' : ''}`} onClick={() => setActiveTab('certified')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-green-400">{stats.certified}</p>
              <p className="text-sm text-rock-light-500 mt-1">认证用户</p>
            </div>
            <div className="p-3 rounded-xl bg-green-500/20">
              <Award size={24} className="text-green-400" />
            </div>
          </div>
        </Card>
        <Card className={`p-5 hover:border-rock-dark-600 transition-colors cursor-pointer ${activeTab === 'setter' ? 'border-purple-500/50' : ''}`} onClick={() => setActiveTab('setter')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-purple-400">{stats.setters}</p>
              <p className="text-sm text-rock-light-500 mt-1">定线员</p>
            </div>
            <div className="p-3 rounded-xl bg-purple-500/20">
              <Wrench size={24} className="text-purple-400" />
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-1">
        <div className="flex">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setPage(1);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-climbing-orange-500/20 text-climbing-orange-400'
                    : 'text-rock-light-400 hover:text-white hover:bg-rock-dark-700/50'
                }`}
              >
                <Icon size={18} />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </Card>

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
                placeholder="搜索用户名、邮箱、手机号..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-rock-dark-900 border border-rock-dark-700 rounded-lg text-white placeholder-rock-light-600 focus:outline-none focus:border-climbing-orange-500 transition-colors"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-rock-light-500" />
            <select
              value={filterRole}
              onChange={(e) => {
                setFilterRole(e.target.value);
                setPage(1);
              }}
              className="bg-rock-dark-900 border border-rock-dark-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-climbing-orange-500"
            >
              {roleFilterOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-rock-dark-800/50">
              <tr>
                <th className="text-left px-5 py-3 text-sm font-medium text-rock-light-400">用户</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-rock-light-400">角色</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-rock-light-400">认证状态</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-rock-light-400">攀爬次数</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-rock-light-400">加入时间</th>
                <th className="text-right px-5 py-3 text-sm font-medium text-rock-light-400">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rock-dark-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-rock-light-500">
                    加载中...
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <Users size={48} className="mx-auto text-rock-light-600 mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">暂无用户</h3>
                    <p className="text-rock-light-500">没有找到符合条件的用户</p>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => {
                  const statusConfig = verifyStatusConfig[user.verifyStatus];
                  const StatusIcon = statusConfig.icon;
                  return (
                    <tr key={user.id} className="hover:bg-rock-dark-800/30 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-climbing-orange-400 to-climbing-orange-600 rounded-full flex items-center justify-center">
                            <User size={18} className="text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-white">{user.name}</p>
                            <div className="flex items-center gap-3 text-xs text-rock-light-500 mt-0.5">
                              {user.email && (
                                <span className="flex items-center gap-1">
                                  <Mail size={10} />
                                  {user.email}
                                </span>
                              )}
                              {user.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone size={10} />
                                  {maskPhone(user.phone)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`px-2.5 py-1 text-xs font-medium rounded-full border ${roleColors[user.role]}`}
                        >
                          {roleLabels[user.role]}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${statusConfig.color}`}
                        >
                          <StatusIcon size={12} />
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-white font-medium">{user.ascentCount}</span>
                        <span className="text-xs text-rock-light-500 ml-1">次</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-rock-light-400 flex items-center gap-1">
                          <Calendar size={12} />
                          {formatDate(user.createdAt)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {user.verifyStatus === 'pending' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleApprove(user.id)}
                                className="text-green-400 hover:text-green-300 hover:bg-green-500/10 text-xs px-3"
                              >
                                <CheckCircle size={14} className="mr-1" />
                                通过
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleReject(user.id)}
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs px-3"
                              >
                                <XCircle size={14} className="mr-1" />
                                拒绝
                              </Button>
                            </>
                          )}
                          <select
                            value={user.role}
                            onChange={(e) => handleChangeRole(user.id, e.target.value as UserRole)}
                            className="bg-rock-dark-900 border border-rock-dark-700 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-climbing-orange-500"
                          >
                            {roleChangeOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          <button className="p-1.5 hover:bg-rock-dark-700 rounded-lg transition-colors">
                            <MoreVertical size={16} className="text-rock-light-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-rock-dark-700">
            <span className="text-sm text-rock-light-500">
              共 {filteredUsers.length} 条记录
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-2"
              >
                <ChevronLeft size={16} />
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <Button
                    key={p}
                    variant={p === page ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setPage(p)}
                    className="w-8 h-8 p-0"
                  >
                    {p}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-2"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
