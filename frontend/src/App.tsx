import { useEffect } from 'react';
import { useAppStore } from './stores/appStore';
import { useAuthStore } from './stores/authStore';
import Navbar from './components/layout/Navbar';
import HomePage from './components/home/HomePage';
import ProductsPage from './components/product/ProductsPage';
import ProductDetailPage from './components/product/ProductDetailPage';
import BrowseByTypePage from './components/product/BrowseByTypePage';
import AdminPage from './components/admin/AdminPage';
import SuperAdminPage from './components/superadmin/SuperAdminPage';
import JiraPage from './components/jira/JiraPage';
import EmailPage from './components/email/EmailPage';
import SettingsPage from './components/settings/SettingsPage';
import ChatPanel from './components/chat/ChatPanel';
import Toast from './components/ui/Toast';
import LoginPage from './components/auth/LoginPage';

function MainContent() {
  const { view } = useAppStore();
  const { user } = useAuthStore();
  const role = user?.role || 'internal';

  switch (view) {
    case 'home': return <HomePage />;
    case 'products': return <ProductsPage />;
    case 'product': return <ProductDetailPage />;
    case 'browse-type': return <BrowseByTypePage />;
    case 'admin':
      if (role === 'superadmin') return <SuperAdminPage />;
      return <AdminPage />;
    case 'jira': return <JiraPage />;
    case 'email': return <EmailPage />;
    case 'settings': return <SettingsPage />;
    default: return <HomePage />;
  }
}

export default function App() {
  const { isAuthenticated, user } = useAuthStore();
  const setRole = useAppStore(s => s.setRole);

  // Sync authStore role → appStore role so filtering works
  useEffect(() => {
    if (user?.role) {
      setRole(user.role);
    }
  }, [user?.role, setRole]);

  // If not authenticated, show login page
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div style={{
      fontFamily: "'Manrope Variable', Manrope, sans-serif",
      background: 'var(--bg)',
      color: 'var(--t1)',
      borderRadius: 16,
      overflow: 'hidden',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      fontSize: 13,
      border: '1px solid var(--bd)',
    }}>
      <Navbar />
      <main style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
        <MainContent />
      </main>
      <ChatPanel />
      <Toast />
    </div>
  );
}
