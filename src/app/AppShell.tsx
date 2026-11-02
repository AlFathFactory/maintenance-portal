import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { env } from '../config/env';
import { useAuth } from '../features/auth/AuthProvider';
import { LoginModal } from '../features/auth/LoginModal';
import { useToast } from '../shared/ui/ToastProvider';

export function AppShell() {
  const [loginOpen, setLoginOpen] = useState(false);
  const { user, isAdmin, loading, error, signOut } = useAuth();
  const toast = useToast();
  const detail = useLocation().pathname.startsWith('/equipment/');

  async function logout() {
    try {
      await signOut();
      toast.show('تم تسجيل الخروج');
    } catch (cause) {
      toast.show(cause instanceof Error ? cause.message : 'تعذر تسجيل الخروج');
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link to="/" className="brand">
          <div className="brand-mark">M</div>
          <div>
            <strong>فتح الصناعية</strong>
            <small>قسم الصيانة</small>
          </div>
        </Link>
        <div className="side-label">القائمة الرئيسية</div>
        <nav aria-label="القائمة الرئيسية">
          <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            ▦ <span>لوحة المعدات</span>
          </NavLink>
          <Link className="nav-item" to="/?type=machine">
            ▤ <span>الماكينات</span>
          </Link>
          <Link className="nav-item" to="/?type=crane">
            ♜ <span>الأوناش</span>
          </Link>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="note-icon">▣</span>
            <strong>ملف لكل معدة</strong>
            <p>امسح رمز QR للوصول إلى بيانات المعدة مباشرة.</p>
          </div>
          <div className="side-foot">
            MAINTENANCE SYSTEM <span>2026</span>
          </div>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <div className="mobile-brand">
            <div className="brand-mark">F</div>
            <strong>قسم الصيانة</strong>
          </div>
          <div className="breadcrumb">
            قسم الصيانة <span>/</span> {detail ? 'تفاصيل المعدة' : 'لوحة المعدات'}
          </div>
          <div className="top-actions">
            {env.isDemo && <span className="demo-pill">نسخة تجريبية محلية</span>}
            {loading ? (
              <span className="account-chip">جارٍ التحقق...</span>
            ) : isAdmin ? (
              <>
                <span className="account-chip">{user?.email || 'وضع المسؤول التجريبي'}</span>
                {!env.isDemo && (
                  <button className="text-button" onClick={logout}>
                    خروج
                  </button>
                )}
              </>
            ) : user ? (
              <>
                <span className="account-chip">حساب غير مخوّل</span>
                <button className="text-button" onClick={logout}>
                  خروج
                </button>
              </>
            ) : (
              <button className="login-button" onClick={() => setLoginOpen(true)}>
                دخول مسؤول الصيانة
              </button>
            )}
          </div>
        </header>
        <main>
          {error && (
            <div className="error-banner" role="alert">
              تعذر التحقق من صلاحية الحساب: {error}
            </div>
          )}
          <Outlet />
        </main>
      </div>
      {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} />}
    </div>
  );
}
