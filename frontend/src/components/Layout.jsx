import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3, Wallet, Target, Users, FileBarChart2, FileText, FileCheck2, Receipt,
  Truck, Megaphone, FlaskConical, CheckSquare, Layers, Briefcase,
  Settings, Menu, X, Sun, Moon, LogOut, Search, Sparkles, ChevronDown, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { gasCall } from '../lib/api';

const NAV_SECTIONS = [
  {
    groupKey: 'overview',
    items: [
      { to: '/dashboard', key: 'dashboard', icon: BarChart3, roles: ['ADMIN', 'ACCOUNTANT'] },
      { to: '/benefits', key: 'benefits', icon: Wallet, roles: ['ADMIN'] }
    ]
  },
  {
    groupKey: 'billing',
    items: [
      { to: '/invoices', key: 'invoices', icon: FileText, roles: ['ADMIN', 'ACCOUNTANT'] },
      { to: '/quotes', key: 'quotes', icon: FileCheck2, roles: ['ADMIN', 'ACCOUNTANT'] },
      { to: '/expenses', key: 'expenses', icon: Receipt, roles: ['ADMIN', 'ACCOUNTANT'] },
      { to: '/suppliers', key: 'suppliers', icon: Truck, roles: ['ADMIN', 'ACCOUNTANT'] }
    ]
  },
  {
    groupKey: 'crm',
    items: [
      { to: '/leads', key: 'leads', icon: Target, roles: ['ADMIN', 'ACCOUNTANT', 'MEDIA_BUYER'] },
      { to: '/clients', key: 'clients', icon: Users, roles: ['ADMIN', 'ACCOUNTANT', 'MEDIA_BUYER'] },
      { to: '/client-reports', key: 'clientReports', icon: FileBarChart2, roles: ['ADMIN', 'ACCOUNTANT', 'MEDIA_BUYER'] }
    ]
  },
  {
    groupKey: 'operations',
    items: [
      { to: '/adspend', key: 'adspend', icon: Megaphone, roles: ['ADMIN', 'ACCOUNTANT', 'MEDIA_BUYER'] },
      { to: '/testili', key: 'testili', icon: FlaskConical, roles: ['ADMIN', 'MEDIA_BUYER'] },
      { to: '/tasks', key: 'tasks', icon: CheckSquare, roles: ['ADMIN', 'ACCOUNTANT', 'MEDIA_BUYER', 'TEAM'] },
      { to: '/project-templates', key: 'templates', icon: Layers, roles: ['ADMIN', 'MEDIA_BUYER'] },
      { to: '/services', key: 'services', icon: Briefcase, roles: ['ADMIN', 'ACCOUNTANT'] }
    ]
  },
  {
    groupKey: 'system',
    items: [
      { to: '/settings', key: 'settings', icon: Settings, roles: ['ADMIN'] }
    ]
  }
];

export default function Layout() {
  const { user, settings, logout, demoMode, login } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(() => {
    try { return localStorage.getItem('adpowrs_sidebar_hidden') === 'true'; } catch (e) { return false; }
  });
  const [openGroups, setOpenGroups] = useState(() => {
    try {
      const saved = localStorage.getItem('adpowrs_nav_groups');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { overview: true, billing: true, crm: true, operations: false, system: false };
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchRes, setSearchRes] = useState(null);

  const visibleSections = NAV_SECTIONS.map((sec) => ({
    ...sec,
    items: sec.items.filter((item) => item.roles.includes(user?.role))
  })).filter((sec) => sec.items.length > 0);

  // Auto-open the section containing the current route
  useEffect(() => {
    const activeSec = NAV_SECTIONS.find((sec) =>
      sec.items.some((item) => location.pathname === item.to || location.pathname.startsWith(item.to + '/'))
    );
    if (activeSec) {
      setOpenGroups((prev) => {
        if (prev[activeSec.groupKey]) return prev;
        const next = { ...prev, [activeSec.groupKey]: true };
        try { localStorage.setItem('adpowrs_nav_groups', JSON.stringify(next)); } catch (e) {}
        return next;
      });
    }
  }, [location.pathname]);

  const toggleGroup = (groupKey) => {
    setOpenGroups((prev) => {
      const next = { ...prev, [groupKey]: !prev[groupKey] };
      try { localStorage.setItem('adpowrs_nav_groups', JSON.stringify(next)); } catch (e) {}
      return next;
    });
  };

  const toggleDesktopSidebar = () => {
    setSidebarHidden((prev) => {
      const next = !prev;
      try { localStorage.setItem('adpowrs_sidebar_hidden', String(next)); } catch (e) {}
      return next;
    });
  };

  const handleSearch = async (val) => {
    setSearchQuery(val);
    if (val.trim().length < 2) {
      setSearchRes(null);
      return;
    }
    try {
      const res = await gasCall('globalSearch', { q: val.trim() });
      setSearchRes(res);
    } catch (e) {}
  };

  const handleDemoRoleSwitch = async (email) => {
    const nextUser = await login(email, 'demo');
    navigate(nextUser.role === 'TEAM' ? '/tasks' : nextUser.role === 'MEDIA_BUYER' ? '/leads' : '/dashboard');
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-4 flex items-center gap-3 border-b border-[var(--border-subtle)]">
        {settings?.logoUrl ? (
          <img src={settings.logoUrl} alt={settings.agencyName} className="w-10 h-10 rounded-xl object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white font-extrabold text-lg shrink-0">
            A
          </div>
        )}
        <div className="min-w-0">
          <p className="font-extrabold text-sm truncate">{settings?.agencyName || t('brand')}</p>
          <p className="text-[11px] text-[var(--text-muted)] truncate">{t('erpSubtitle')}</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-2">
        {visibleSections.map((section) => {
          const isOpen = Boolean(openGroups[section.groupKey]);
          return (
            <div key={section.groupKey} className="space-y-1">
              <button
                type="button"
                onClick={() => toggleGroup(section.groupKey)}
                aria-expanded={isOpen}
                className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
              >
                <span>{t(`navGroups.${section.groupKey}`)}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90 rtl:rotate-90'}`} />
              </button>
              {isOpen && (
                <div className="space-y-0.5 ps-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setDrawerOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                            isActive
                              ? 'bg-[var(--brand-primary)] text-white shadow-sm'
                              : 'text-[var(--text-muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-main)]'
                          }`
                        }
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{t(`nav.${item.key}`)}</span>
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-3 border-t border-[var(--border-subtle)] space-y-2">
        <div className="px-3 py-2 rounded-xl bg-[var(--surface-subtle)]">
          <p className="text-xs font-bold truncate">{user?.name}</p>
          <p className="text-[11px] text-[var(--text-muted)]">{t(`roles.${user?.role}`)}</p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>{t('common.logout')}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh flex bg-[var(--surface-bg)] text-[var(--text-main)]">
      {/* Desktop Sidebar */}
      {!sidebarHidden && (
        <aside className="hidden lg:block w-64 shrink-0 border-e border-[var(--border-subtle)] bg-[var(--surface-card)] sticky top-0 h-dvh">
          {sidebarContent}
        </aside>
      )}

      {/* Mobile Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-72 max-w-[82vw] bg-[var(--surface-card)] h-full shadow-2xl relative z-10">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
              className="absolute top-3 end-3 p-1.5 rounded-lg hover:bg-[var(--surface-subtle)]"
            >
              <X className="w-5 h-5" />
            </button>
            {sidebarContent}
          </div>
          <div className="flex-1 bg-slate-950/60 backdrop-blur-xs" onClick={() => setDrawerOpen(false)} />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {demoMode && (
          <div className="bg-indigo-600 text-white px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>{t('common.demoBanner')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="opacity-80">Role:</span>
              {[
                { label: 'Admin', email: 'admin@adpowrs.com' },
                { label: 'Compta', email: 'compta@adpowrs.com' },
                { label: 'Ads', email: 'ads@adpowrs.com' },
                { label: 'Team', email: 'team@adpowrs.com' }
              ].map((r) => (
                <button
                  key={r.email}
                  type="button"
                  onClick={() => handleDemoRoleSwitch(r.email)}
                  className={`px-2 py-0.5 rounded-md font-semibold cursor-pointer ${
                    user?.email === r.email ? 'bg-white text-indigo-700' : 'bg-white/15 hover:bg-white/25'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <header className="sticky top-0 z-30 h-16 px-4 lg:px-6 border-b border-[var(--border-subtle)] bg-[var(--surface-card)]/90 backdrop-blur-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation"
              className="lg:hidden p-2 rounded-xl hover:bg-[var(--surface-subtle)] cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={toggleDesktopSidebar}
              aria-label={sidebarHidden ? 'Show sidebar' : 'Hide sidebar'}
              title={sidebarHidden ? 'إظهار القائمة' : 'إخفاء القائمة'}
              className="hidden lg:inline-flex p-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-bg)] hover:bg-[var(--surface-subtle)] cursor-pointer"
            >
              {sidebarHidden ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>

            {user?.role !== 'TEAM' && (
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[var(--text-muted)] absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  onBlur={() => setTimeout(() => setSearchRes(null), 200)}
                  placeholder={t('common.search')}
                  className="input-field ps-9 py-1.5 text-sm"
                />
                {searchRes && (
                  <div className="absolute top-full mt-2 start-0 end-0 card shadow-xl p-3 z-50 max-h-80 overflow-y-auto space-y-2 text-xs">
                    {searchRes.clients?.length > 0 && (
                      <div>
                        <p className="font-bold text-[var(--text-muted)] mb-1">Clients</p>
                        {searchRes.clients.map((c) => (
                          <Link
                            key={c.id}
                            to={`/clients/${c.id}`}
                            className="block px-2 py-1.5 rounded-lg hover:bg-[var(--surface-subtle)] font-semibold"
                          >
                            {c.company || c.name}
                          </Link>
                        ))}
                      </div>
                    )}
                    {searchRes.invoices?.length > 0 && (
                      <div>
                        <p className="font-bold text-[var(--text-muted)] mb-1">Invoices</p>
                        {searchRes.invoices.map((i) => (
                          <Link
                            key={i.id}
                            to="/invoices"
                            className="block px-2 py-1.5 rounded-lg hover:bg-[var(--surface-subtle)]"
                          >
                            {i.number || 'DRAFT'} — {i.status}
                          </Link>
                        ))}
                      </div>
                    )}
                    {searchRes.leads?.length > 0 && (
                      <div>
                        <p className="font-bold text-[var(--text-muted)] mb-1">Leads</p>
                        {searchRes.leads.map((l) => (
                          <Link key={l.id} to="/leads" className="block px-2 py-1.5 rounded-lg hover:bg-[var(--surface-subtle)]">
                            {l.company || l.name} ({l.stage})
                          </Link>
                        ))}
                      </div>
                    )}
                    {!searchRes.clients?.length && !searchRes.invoices?.length && !searchRes.leads?.length && (
                      <p className="text-[var(--text-muted)] py-1">{t('common.noData')}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-xl border border-[var(--border-subtle)] p-0.5 bg-[var(--surface-bg)]">
              {['ar', 'fr', 'en'].map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLang(code)}
                  className={`px-2 py-1 text-xs font-bold rounded-lg uppercase cursor-pointer ${
                    lang === code ? 'bg-[var(--brand-primary)] text-white' : 'text-[var(--text-muted)]'
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              className="p-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-bg)] hover:bg-[var(--surface-subtle)] cursor-pointer"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
