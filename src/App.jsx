import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { ThemeProvider } from './context/ThemeContext';
import { UserProvider } from './context/UserContext';
import { LanguageProvider } from './context/LanguageContext';
import { FinanceProvider } from './features/finance/context/FinanceContext';
import { TaskProvider } from './features/tasks/context/TaskContext';
import { MonthlyTrackerProvider } from './features/monthlyTracker/context/MonthlyTrackerContext';
import Auth from './features/auth/Auth';
import MainLayout from './layout/MainLayout';
import Dashboard from './features/dashboard/Dashboard';
import Goals from './features/goals/Goals';
import Fitness from './features/fitness/Fitness';
import Tasks from './features/tasks/Tasks';
import Finance from './features/finance/Finance';
import Profile from './features/profile/Profile';

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [loading, isAuthenticated, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-body)' }}>
        <div className="w-8 h-8 border-2 border-acid border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    );
  }

  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/finanzas" element={<Finance />} />
        <Route path="/metas" element={<Goals />} />
        <Route path="/habitos" element={<Fitness />} />
        <Route path="/tareas" element={<Tasks />} />
        <Route path="/perfil" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MainLayout>
  );
}

function App() {
  return (
    <ThemeProvider>
      <UserProvider>
        <LanguageProvider>
          <FinanceProvider>
            <TaskProvider>
              <MonthlyTrackerProvider>
                <AppRoutes />
              </MonthlyTrackerProvider>
            </TaskProvider>
          </FinanceProvider>
        </LanguageProvider>
      </UserProvider>
    </ThemeProvider>
  );
}

export default App;