'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const navItems = [
  { href: '/admin', label: '数据概览', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { href: '/admin/registrations', label: '报名管理', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
  { href: '/admin/questions', label: '题目编辑', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
  { href: '/admin/webhooks', label: 'Webhook', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Simple client-side auth check (sessionStorage)
  useEffect(() => {
    if (sessionStorage.getItem('admin_auth') === 'true') {
      setAuthenticated(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === (process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'icpc2024camp')) {
      sessionStorage.setItem('admin_auth', 'true');
      setAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('密码错误');
    }
  };

  // Auth screen
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-dot-grid flex items-center justify-center p-6">
        <div className="card-glow max-w-sm w-full p-8 animate-fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center font-display font-bold text-sm"
              style={{ background: 'linear-gradient(135deg, #00B8CC, #00E5FF)', color: '#0A0E17' }}>
              AD
            </div>
            <div>
              <h1 className="font-display text-lg font-bold" style={{ color: 'var(--accent)' }}>管理后台</h1>
              <p className="text-[10px] font-mono tracking-wider" style={{ color: 'var(--text-muted)' }}>
                ADMIN PANEL
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin}>
            <label className="block text-sm font-medium mb-1.5">管理密码</label>
            <input type="password" className="input-field mb-4" placeholder="请输入管理密码"
              value={password} onChange={e => setPassword(e.target.value)} autoFocus />
            {authError && (
              <p className="text-xs mb-3" style={{ color: 'var(--error)' }}>{authError}</p>
            )}
            <button type="submit" className="btn-primary w-full">进入后台</button>
          </form>

          <p className="text-[10px] text-center mt-6 font-mono" style={{ color: 'var(--text-muted)' }}>
            提示：默认密码为 icpc2024camp
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-deep)' }}>
      {/* Sidebar */}
      <aside className="w-60 border-r flex flex-col" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}>
        <div className="p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-display font-bold text-xs"
              style={{ background: 'linear-gradient(135deg, #00B8CC, #00E5FF)', color: '#0A0E17' }}>
              IC
            </div>
            <div>
              <h1 className="font-display text-sm font-bold">ICPC Camp</h1>
              <p className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>管理后台 v1.0</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => {
            const isActive = pathname === item.href;
            return (
              <button key={item.href} onClick={() => router.push(item.href)}
                className={`sidebar-link w-full ${isActive ? 'active' : ''}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.icon} />
                </svg>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <button className="sidebar-link w-full" onClick={() => { sessionStorage.removeItem('admin_auth'); setAuthenticated(false); }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>退出登录</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
