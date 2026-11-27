'use client';

import React from 'react';
import { LogOut, Menu, X } from 'lucide-react';
import { Button, Card, StatusBadge, cn } from '@/components/ui';
import type { AuthUser } from '@/lib/auth';
import type { NavItem, SectionKey } from './navigation';
import type { School } from './types';

interface AdminSidebarProps {
  authUser: AuthUser;
  activeSchool: School | null;
  effectiveHost: string;
  navItems: NavItem[];
  activeSection: SectionKey;
  isPlatformAdmin: boolean;
  mobileNavOpen: boolean;
  onToggleMobileNav: () => void;
  onNavigate: (section: SectionKey) => void;
  onLogout: () => void;
}

/** Responsive navigation sidebar separating Backoffice Ops and School Secretariat sections. */
export default function AdminSidebar({
  authUser,
  activeSchool,
  effectiveHost,
  navItems,
  activeSection,
  isPlatformAdmin,
  mobileNavOpen,
  onToggleMobileNav,
  onNavigate,
  onLogout,
}: AdminSidebarProps) {
  const currentNavMeta = navItems.find((i) => i.id === activeSection) || navItems[0];
  const opsItems = navItems.filter((i) => i.group === 'ops');
  const schoolItems = navItems.filter((i) => i.group === 'school');

  const renderNavContent = () => (
    <div className="space-y-5">
      {opsItems.length > 0 && (
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-amber-800">
            Backoffice EduLink
          </p>
          {opsItems.map((item) => {
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  'w-full text-left px-3 py-2.5 rounded-xl text-xs transition flex items-center justify-between gap-2 border',
                  active
                    ? 'bg-amber-100/80 text-amber-950 font-bold border-amber-300/70'
                    : 'text-stone-700 hover:bg-stone-100 font-medium border-transparent'
                )}
              >
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {schoolItems.length > 0 && (
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-stone-500">
            {isPlatformAdmin ? 'Gestão da Escola' : 'Painel da Instituição'}
          </p>
          {schoolItems.map((item) => {
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  'w-full text-left px-3 py-2.5 rounded-xl text-xs transition flex items-center justify-between gap-2 border',
                  active
                    ? 'bg-teal-50 text-teal-900 font-bold border-teal-200'
                    : 'text-stone-700 hover:bg-stone-100 font-medium border-transparent'
                )}
              >
                <span className="truncate">{item.label}</span>
                {item.badge && (
                  <StatusBadge tone="neutral" size="sm" className="px-1.5 py-0 text-[9px] uppercase">
                    {item.badge}
                  </StatusBadge>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="pt-4 border-t border-stone-200 space-y-2.5 px-1">
        <div className="px-2 space-y-1">
          <StatusBadge tone={isPlatformAdmin ? 'warning' : 'brand'} size="sm" className="uppercase">
            {isPlatformAdmin ? 'Operador EduLink' : 'Secretaria Escolar'}
          </StatusBadge>
          <p className="text-xs font-bold text-stone-900 truncate">{authUser.full_name}</p>
          <p className="text-[11px] font-mono text-stone-500 truncate">{authUser.email}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          fullWidth
          onClick={onLogout}
          leftIcon={<LogOut className="h-3.5 w-3.5" aria-hidden="true" />}
        >
          Terminar Sessão
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Header Bar */}
      <Card padding="none" className="lg:hidden flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
            {isPlatformAdmin ? 'Backoffice EduLink' : activeSchool?.name || 'Secretaria'}
          </p>
          <p className="text-sm font-bold text-stone-900 truncate">{currentNavMeta?.label}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-expanded={mobileNavOpen}
          aria-controls="mobile-admin-nav"
          onClick={onToggleMobileNav}
          leftIcon={
            mobileNavOpen ? (
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Menu className="h-3.5 w-3.5" aria-hidden="true" />
            )
          }
        >
          {mobileNavOpen ? 'Fechar Menu' : 'Menu'}
        </Button>
      </Card>

      {mobileNavOpen && (
        <aside id="mobile-admin-nav" className="lg:hidden bg-white border border-stone-200 rounded-2xl p-4 shadow-sm">
          {renderNavContent()}
        </aside>
      )}

      {/* Desktop Sticky Sidebar */}
      <aside
        aria-label="Navegação do painel administrativo"
        className="hidden lg:block sticky top-20 bg-white border border-stone-200 rounded-2xl p-4 shadow-sm"
      >
        {activeSchool && !isPlatformAdmin && (
          <div className="mb-4 pb-4 border-b border-stone-100 flex items-center gap-2.5 px-1">
            {activeSchool.logo_url ? (
              <img
                src={activeSchool.logo_url}
                alt={`Logótipo de ${activeSchool.name}`}
                className="w-8 h-8 rounded-lg object-cover border border-stone-200 shrink-0"
              />
            ) : (
              <span
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ backgroundColor: activeSchool.primary_color || '#0F766E' }}
              >
                {activeSchool.name.slice(0, 2).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold text-stone-900 truncate">{activeSchool.name}</p>
              <p className="text-[11px] font-mono text-stone-500 truncate">{effectiveHost}</p>
            </div>
          </div>
        )}
        {renderNavContent()}
      </aside>
    </>
  );
}
