import { useState } from 'react';
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
import { useEffect } from 'react';

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState('home');

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

  const renderContent = () => {
    switch (currentTab) {
      case 'home': return <Dashboard />;
      case 'wallet': return <Finance />;
      case 'goals': return <Goals />;
      case 'fitness': return <Fitness />;
      case 'tasks': return <Tasks />;
      case 'profile': return <Profile />;
      default: return <Dashboard />;
    }
  };

  return (
    <MainLayout currentTab={currentTab} onTabChange={setCurrentTab}>
      {renderContent()}
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