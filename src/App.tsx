import { AppProvider, useApp } from './context/AppContext';
import { SignIn } from './components/SignIn';
import { Sidebar, Topbar, MainContent } from './components/Layout';
import { Dashboard } from './components/pages/Dashboard';
import { LeadManagement } from './components/pages/LeadManagement';
import { DealManagement } from './components/pages/DealManagement';
import { ActivityLog } from './components/pages/ActivityLog';
import { AIEmail } from './components/pages/AIEmail';
import { Reports } from './components/pages/Reports';
import { ProfileModal } from './components/modals/ProfileModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { NotificationsModal } from './components/modals/NotificationsModal';
import { LeadRulesModal } from './components/modals/LeadRulesModal';
import { ToastContainer } from './components/shared/Toast';
import { ActivityDrawer } from './components/shared/ActivityDrawer';

function AppContent() {
  const { currentUser, currentPage } = useApp();

  if (!currentUser) {
    return <SignIn />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'leads':
        return <LeadManagement />;
      case 'deals':
        return <DealManagement />;
      case 'activities':
        return <ActivityLog />;
      case 'ai-email':
        return <AIEmail />;
      case 'reports':
        return <Reports />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-bg-page dark:bg-bg-page transition-colors">
      <Sidebar />
      <Topbar />
      <MainContent>
        {renderPage()}
      </MainContent>

      {/* Modals */}
      <ProfileModal />
      <SettingsModal />
      <NotificationsModal />
      <LeadRulesModal />
      <ActivityDrawer />

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
