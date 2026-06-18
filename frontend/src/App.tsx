import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from '@/components/Layout/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import WallList from '@/pages/WallList';
import WallDetail from '@/pages/WallDetail';
import RouteList from '@/pages/RouteList';
import RouteDetail from '@/pages/RouteDetail';
import Ascents from '@/pages/Ascents';
import Analytics from '@/pages/Analytics';
import Profile from '@/pages/Profile';
import Dashboard from '@/pages/Dashboard';
import AdminUsers from '@/pages/AdminUsers';

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <MainLayout>{children}</MainLayout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/"
          element={
            <ProtectedLayout>
              <Home />
            </ProtectedLayout>
          }
        />
        <Route
          path="/walls"
          element={
            <ProtectedLayout>
              <WallList />
            </ProtectedLayout>
          }
        />
        <Route
          path="/walls/:wallId"
          element={
            <ProtectedLayout>
              <WallDetail />
            </ProtectedLayout>
          }
        />
        <Route
          path="/routes"
          element={
            <ProtectedLayout>
              <RouteList />
            </ProtectedLayout>
          }
        />
        <Route
          path="/routes/:id"
          element={
            <ProtectedLayout>
              <RouteDetail />
            </ProtectedLayout>
          }
        />
        <Route
          path="/ascents"
          element={
            <ProtectedLayout>
              <Ascents />
            </ProtectedLayout>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedLayout>
              <Analytics />
            </ProtectedLayout>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedLayout>
              <Profile />
            </ProtectedLayout>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedLayout>
              <Dashboard />
            </ProtectedLayout>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedLayout>
              <AdminUsers />
            </ProtectedLayout>
          }
        />
      </Routes>
    </Router>
  );
}
