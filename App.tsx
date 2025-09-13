
import React, { useState, useCallback, useEffect } from 'react';
import Header from './components/Header';
import DashboardPage from './pages/DashboardPage';
import PricingPage from './pages/PricingPage';
import HomePage from './pages/HomePage';
import ModelDetailsPage from './pages/ModelDetailsPage';
import PendingApprovalPage from './pages/PendingApprovalPage';
import AggregationPage from './pages/AggregationPage';
import ProfilePage from './pages/ProfilePage';
import WorkspacePage from './pages/WorkspacePage';
import AdminPage from './pages/AdminPage';
import AuthPage from './pages/AuthPage';
import NotificationContainer from './components/NotificationContainer';
// FIX: Import PanelNotification and AIModel types
import { Page, Notification, NotificationType, Theme, User, PanelNotification, AIModel } from './types';
import * as api from './services/api';
// FIX: Import MODELS_DATA to initialize models state
import { MODELS_DATA } from './constants';


interface AppView {
  page: Page;
  modelId?: string;
  hash?: string;
}

const getInitialTheme = (): Theme => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const storedPrefs = window.localStorage.getItem('theme');
    if (typeof storedPrefs === 'string' && (storedPrefs === 'light' || storedPrefs === 'dark')) {
      return storedPrefs as Theme;
    }

    const userMedia = window.matchMedia('(prefers-color-scheme: dark)');
    if (userMedia.matches) {
      return 'dark';
    }
  }
  return 'dark'; // Default to dark theme
};


const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>({ page: 'home' });
  const [toasts, setToasts] = useState<Notification[]>([]);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  // FIX: Add state for models and provide an `addModel` function to update it.
  const [models, setModels] = useState<AIModel[]>(MODELS_DATA);
  const [notifications, setNotifications] = useState<PanelNotification[]>([
      { id: '1', read: false, message: 'Your model "QuantumLeap" has received enough votes and is now verified!', timestamp: '2 hours ago', page: 'modelDetails', modelId: '1' },
      { id: '2', read: true, message: 'Aggregation job "ImageNet-Fusion" completed successfully.', timestamp: '1 day ago', page: 'aggregation' },
      { id: '3', read: true, message: 'Welcome to Forkit.dev! Explore models to get started.', timestamp: '3 days ago', page: 'dashboard' },
  ]);

  const addModel = useCallback((newModel: AIModel) => {
    setModels(currentModels => [newModel, ...currentModels]);
  }, []);

  const markNotificationsAsRead = useCallback(() => {
    setNotifications(currentNotifications => 
        currentNotifications.map(n => ({ ...n, read: true }))
    );
  }, []);

  // Check for persisted session on initial load
  useEffect(() => {
    const token = localStorage.getItem('forkit_token');
    const userJson = localStorage.getItem('forkit_user');
    if (token && userJson) {
        try {
            const user = JSON.parse(userJson);
            setIsAuthenticated(true);
            setCurrentUser(user);
        } catch (e) {
            // Handle corrupted data in localStorage
            localStorage.clear();
        }
    }
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    const isDark = theme === 'dark';
    root.classList.toggle('dark', isDark);
    window.localStorage.setItem('theme', theme);

    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (favicon) {
      favicon.href = isDark ? '/assets/logo-dark.svg' : '/assets/logo-light.svg';
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  }, []);

  const handleLoginSuccess = useCallback((user: User, token: string) => {
    localStorage.setItem('forkit_token', token);
    localStorage.setItem('forkit_user', JSON.stringify(user));
    setIsAuthenticated(true);
    setCurrentUser(user);
    setCurrentView({ page: 'dashboard' }); 
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('forkit_token');
    localStorage.removeItem('forkit_user');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setCurrentView({ page: 'home' });
  }, []);

  const navigateTo = useCallback((page: Page, modelId?: string, hash?: string) => {
    const gatedPages: Page[] = ['workspace', 'profile', 'admin', 'aggregation', 'pendingApproval', 'dashboard'];
    if (gatedPages.includes(page) && !isAuthenticated) {
        addToast('Please log in to access this page.', 'info');
        setCurrentView({ page: 'auth' });
        return;
    }
    window.scrollTo(0, 0);
    setCurrentView({ page, modelId, hash });
  }, [isAuthenticated]);

  const addToast = useCallback((message: string, type: NotificationType) => {
    const id = Date.now().toString();
    const newToast: Notification = { id, message, type };
    setToasts(currentToasts => [...currentToasts, newToast]);
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(currentToasts => currentToasts.filter(toast => toast.id !== id));
  }, []);

  const renderPage = () => {
    switch (currentView.page) {
      case 'dashboard':
        // FIX: Pass 'models' and 'addModel' props to DashboardPage
        return <DashboardPage navigateTo={navigateTo} addToast={addToast} models={models} addModel={addModel} />;
      case 'pricing':
        // FIX: Added navigateTo prop to PricingPage call to match component definition
        return <PricingPage addToast={addToast} navigateTo={navigateTo}/>;
      case 'modelDetails':
        if (currentView.modelId) {
            // FIX: Pass 'addModel' prop to ModelDetailsPage
            return <ModelDetailsPage modelId={currentView.modelId} navigateTo={navigateTo} addToast={addToast} addModel={addModel} />;
        }
        // FIX: Pass 'models' and 'addModel' props to DashboardPage
        return <DashboardPage navigateTo={navigateTo} addToast={addToast} models={models} addModel={addModel} />;
      case 'pendingApproval':
        return <PendingApprovalPage navigateTo={navigateTo} addToast={addToast} />;
      case 'aggregation':
        return <AggregationPage addToast={addToast} navigateTo={navigateTo} />;
      case 'profile':
        // FIX: Pass 'models', 'addModel' and 'currentUser' props to ProfilePage
        return <ProfilePage navigateTo={navigateTo} addToast={addToast} currentUser={currentUser} models={models} addModel={addModel} />;
      case 'workspace':
        return <WorkspacePage addToast={addToast} />;
      case 'admin':
        // FIX: Added navigateTo prop to AdminPage call to match component definition
        return <AdminPage addToast={addToast} navigateTo={navigateTo} />;
      case 'home':
         return <HomePage navigateTo={navigateTo} theme={theme} toggleTheme={toggleTheme} />;
      case 'auth':
          // FIX: Pass 'onLoginSuccess' and 'navigateTo' props to AuthPage
          return <AuthPage onLoginSuccess={handleLoginSuccess} navigateTo={navigateTo} />;
      default:
        return <HomePage navigateTo={navigateTo} theme={theme} toggleTheme={toggleTheme} />;
    }
  };
  
  const isFullPage = ['home', 'auth'].includes(currentView.page);

  if (isFullPage) {
      return (
        <>
          <NotificationContainer toasts={toasts} removeToast={removeToast} />
          {renderPage()}
        </>
      );
  }

  return (
    <div className="min-h-screen flex flex-col bg-light-bg dark:bg-dark-bg font-sans">
      <NotificationContainer toasts={toasts} removeToast={removeToast} />
      
      <Header 
        navigateTo={navigateTo} 
        addToast={addToast} 
        theme={theme} 
        toggleTheme={toggleTheme}
        isAuthenticated={isAuthenticated}
        onLogout={handleLogout}
        // FIX: Pass 'currentUser', 'notifications', and 'markNotificationsAsRead' props to Header
        currentUser={currentUser}
        notifications={notifications}
        markNotificationsAsRead={markNotificationsAsRead}
      />
      
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderPage()}
      </main>
    </div>
  );
};

export default App;
