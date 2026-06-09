import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import type { Page } from '../types';

const NAV_ITEMS: { id: Page; label: string; icon: string; badge?: number }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-pie' },
  { id: 'leads', label: 'Lead Management', icon: 'fa-users', badge: 0 },
  { id: 'deals', label: 'Deal Management', icon: 'fa-handshake' },
  { id: 'activities', label: 'Activity Log', icon: 'fa-clock-rotate-left' },
  { id: 'ai-email', label: 'AI Email', icon: 'fa-wand-magic-sparkles' },
  { id: 'reports', label: 'Report', icon: 'fa-chart-bar' },
];

export function Sidebar() {
  const { currentUser, currentPage, setCurrentPage, leads, sidebarCollapsed, setSidebarCollapsed } = useApp();
  const prospectingCount = leads.filter(l => l.stage === 'Prospecting').length;

  const navItemsWithBadge = NAV_ITEMS.map(item =>
    item.id === 'leads' ? { ...item, badge: prospectingCount } : item
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`fixed left-0 top-0 h-full bg-bg-sidebar z-40 transition-all duration-300 hidden md:block ${sidebarCollapsed ? 'w-20' : 'w-60'}`}>
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink- flex-shrink-0">
                <i className="fa-solid fa-bolt text-accent"></i>
              </div>
              {!sidebarCollapsed && (
                <div>
                  <h1 className="font-bold text-white">SalesTrack</h1>
                  <p className="text-xs text-text-muted">CRM Platform</p>
                </div>
              )}
            </div>
          </div>

          {/* User Info */}
          {currentUser && !sidebarCollapsed && (
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                  style={{ backgroundColor: currentUser.color }}
                >
                  {currentUser.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{currentUser.name}</p>
                  <p className="text-xs text-text-muted truncate">{currentUser.email}</p>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mt-1 ${
                    currentUser.role === 'manager' ? 'bg-amber-500/20 text-amber-400' : 'bg-accent/20 text-accent'
                  }`}>
                    {currentUser.role === 'manager' ? 'Manager' : 'Sales'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
            {navItemsWithBadge.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  currentPage === item.id
                    ? 'bg-accent text-white shadow-lg shadow-accent/25'
                    : 'text-text-muted hover:bg-white/5 hover:text-white'
                }`}
              >
                <i className={`fa-solid ${item.icon} w-5 text-center ${sidebarCollapsed ? 'mx-auto' : ''}`}></i>
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-medium">
                        {item.badge}
                      </span>
                    )}
                    {item.id === 'ai-email' && (
                      <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 text-xs font-medium">
                        AI
                      </span>
                    )}
                  </>
                )}
              </button>
            ))}
          </nav>

          {/* Footer */}
          {!sidebarCollapsed && (
            <div className="p-4 border-t border-white/10">
              <p className="text-xs text-text-muted text-center">SalesTrack v1.0 - 2026</p>
            </div>
          )}

          {/* Collapse Toggle */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute -right-3 top-24 w-6 h-6 bg-bg-sidebar rounded-full border border-white/10 flex items-center justify-center text-text-muted hover:text-white transition-colors hidden lg:flex"
          >
            <i className={`fa-solid fa-chevron-${sidebarCollapsed ? 'right' : 'left'} text-xs`}></i>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {!sidebarCollapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={`fixed left-0 top-0 h-full w-60 bg-bg-sidebar z-40 transition-transform duration-300 md:hidden ${sidebarCollapsed ? '-translate-x-full' : 'translate-x-0'}`}>
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0">
                <i className="fa-solid fa-bolt text-accent"></i>
              </div>
              <div>
                <h1 className="font-bold text-white">SalesTrack</h1>
                <p className="text-xs text-text-muted">CRM Platform</p>
              </div>
            </div>
          </div>

          {/* User Info */}
          {currentUser && (
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                  style={{ backgroundColor: currentUser.color }}
                >
                  {currentUser.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{currentUser.name}</p>
                  <p className="text-xs text-text-muted truncate">{currentUser.email}</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
            {navItemsWithBadge.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentPage(item.id);
                  setSidebarCollapsed(true);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  currentPage === item.id
                    ? 'bg-accent text-white shadow-lg shadow-accent/25'
                    : 'text-text-muted hover:bg-white/5 hover:text-white'
                }`}
              >
                <i className={`fa-solid ${item.icon} w-5 text-center`}></i>
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-medium">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-white/10">
            <p className="text-xs text-text-muted text-center">SalesTrack v1.0 - 2026</p>
          </div>
        </div>
      </aside>
    </>
  );
}

export function Topbar() {
  const { currentUser, darkMode, toggleDarkMode, notifications, setShowNotificationsModal, setShowProfileModal, setShowSettingsModal, signOut, currentPage, sidebarCollapsed, setSidebarCollapsed, selectedMemberId, setSelectedMemberId, teamMembers } = useApp();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const pageLabels: Record<Page, string> = {
    'dashboard': 'Dashboard',
    'leads': 'Lead Management',
    'deals': 'Deal Management',
    'activities': 'Activity Log',
    'ai-email': 'AI Email',
    'reports': 'Report',
  };

  return (
    <header className="fixed top-0 right-0 h-[60px] bg-bg-card dark:bg-bg-card border-b border-border dark:border-border z-30 transition-all duration-300"
      style={{ left: sidebarCollapsed ? 0 : undefined }}
    >
      <div className="h-full px-4 md:px-6 flex items-center justify-between" style={{ marginLeft: sidebarCollapsed ? 0 : undefined }}>
        <div className="flex items-center gap-4">
          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors md:hidden"
          >
            <i className={`fa-solid ${sidebarCollapsed ? 'fa-bars' : 'fa-xmark'} text-text-secondary dark:text-text-muted`}></i>
          </button>

          <div className="hidden md:block">
            <h1 className="text-lg font-bold text-text-primary dark:text-white">{pageLabels[currentPage]}</h1>
            <p className="text-xs text-text-muted">SalesTrack &gt; {pageLabels[currentPage]}</p>
          </div>

          {/* Member Filter - Manager Only */}
          {currentUser?.role === 'manager' && (
            <div className="hidden lg:flex items-center gap-2 ml-4">
              <i className="fa-solid fa-users text-text-muted text-sm"></i>
              <select
                id="act-member-filter"
                value={selectedMemberId || 'all'}
                onChange={(e) => setSelectedMemberId(e.target.value === 'all' ? null : e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="all">All Members</option>
                {teamMembers.filter(m => m.role === 'member').map(member => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <i className={`fa-solid ${darkMode ? 'fa-sun text-amber-400' : 'fa-moon text-text-secondary'} `}></i>
          </button>

          {/* Notifications */}
          <button
            onClick={() => setShowNotificationsModal(true)}
            className="p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative"
          >
            <i className="fa-solid fa-bell text-text-secondary dark:text-text-muted"></i>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Account Dropdown */}
          {currentUser && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div
                  className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                  style={{ backgroundColor: currentUser.color }}
                >
                  {currentUser.initials}
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-sm font-medium text-text-primary dark:text-white">{currentUser.name}</p>
                  <p className="text-xs text-text-muted capitalize">{currentUser.role}</p>
                </div>
                <i className={`fa-solid fa-chevron-down text-text-muted text-xs hidden lg:block transition-transform ${showDropdown ? 'rotate-180' : ''}`}></i>
              </button>

              {showDropdown && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-bg-card dark:bg-bg-card rounded-xl shadow-xl border border-border dark:border-border overflow-hidden animate-fade-in">
                  <button
                    onClick={() => {
                      setShowProfileModal(true);
                      setShowDropdown(false);
                    }}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                  >
                    <i className="fa-solid fa-user text-text-muted w-5"></i>
                    <span className="text-text-primary dark:text-white">My Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowSettingsModal(true);
                      setShowDropdown(false);
                    }}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                  >
                    <i className="fa-solid fa-gear text-text-muted w-5"></i>
                    <span className="text-text-primary dark:text-white">Settings</span>
                  </button>
                  <div className="border-t border-border dark:border-border"></div>
                  <button
                    onClick={() => {
                      signOut();
                      setShowDropdown(false);
                    }}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
                  >
                    <i className="fa-solid fa-right-from-bracket text-red-500 w-5"></i>
                    <span className="text-red-500">Sign out</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export function MainContent({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useApp();

  return (
    <main
      className={`min-h-screen pt-[60px] transition-all duration-300 bg-bg-page dark:bg-bg-page`}
      style={{
        marginLeft: typeof window !== 'undefined' && window.innerWidth >= 768 ? (sidebarCollapsed ? 80 : 240) : 0
      }}
    >
      <div className="p-4 md:p-6 lg:p-7">
        {children}
      </div>
    </main>
  );
}
