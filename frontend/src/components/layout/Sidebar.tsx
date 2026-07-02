// components/layout/Sidebar.tsx
import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, BedDouble, CalendarDays, Users, CreditCard,
  Calendar, Settings, LogOut, Palmtree, Bike, Star,
  ChevronLeft, ChevronRight, MessageSquare, Mail, FileText
} from 'lucide-react';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  roles?: string[];
  badge?: number;
}

const navItems: NavItem[] = [
  { to: '/dashboard', icon: <LayoutDashboard size={18} />, label: 'Tableau de bord' },
  { to: '/calendrier', icon: <Calendar size={18} />, label: 'Calendrier' },
  { to: '/reservations', icon: <CalendarDays size={18} />, label: 'Reservations' },
  { to: '/chambres', icon: <BedDouble size={18} />, label: 'Chambres' },
  { to: '/clients', icon: <Users size={18} />, label: 'Clients' },
  { to: '/paiements', icon: <CreditCard size={18} />, label: 'Paiements' },
  // ✅ NOUVEAU - Communication (§3.6)
  { to: '/communication', icon: <MessageSquare size={18} />, label: 'Communication' },
  { to: '/admin', icon: <Settings size={18} />, label: 'Administration', roles: ['GERANTE', 'RESPONSABLE_TECHNIQUE'] },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredItems = navItems.filter(item =>
    !item.roles || (user && item.roles.includes(user.role))
  );

  return (
    <>
      {/* Mobile overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 lg:hidden ${
          !isCollapsed ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`} 
        onClick={onToggle}
      ></div>

      <aside className={`
        fixed top-0 left-0 h-screen bg-palmier-900 text-white flex flex-col z-50
        transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-16' : 'w-64'}
        shadow-2xl
      `}>
        {/* Logo */}
        <div className={`px-4 py-5 border-b border-palmier-700 flex items-center gap-3 ${
          isCollapsed ? 'justify-center' : 'justify-between'
        }`}>
          {!isCollapsed ? (
            <>
              <div className="flex items-center gap-3">
                <Palmtree size={28} className="text-sable-300 flex-shrink-0" />
                <div>
                  <p className="font-bold text-base leading-tight">Les Palmiers</p>
                  <p className="text-palmier-300 text-xs">de l'Entre-Deux</p>
                </div>
              </div>
              <button
                onClick={onToggle}
                className="p-1 hover:bg-palmier-700 rounded-lg transition-colors"
                title="Réduire"
              >
                <ChevronLeft size={18} className="text-palmier-300" />
              </button>
            </>
          ) : (
            <button
              onClick={onToggle}
              className="p-1 hover:bg-palmier-700 rounded-lg transition-colors"
              title="Agrandir"
            >
              <Palmtree size={28} className="text-sable-300" />
            </button>
          )}
        </div>

        {/* Profil utilisateur */}
        <div className={`px-4 py-4 border-b border-palmier-700 ${
          isCollapsed ? 'flex justify-center' : ''
        }`}>
          {!isCollapsed ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-sable-500 flex items-center justify-center text-palmier-900 font-bold text-sm flex-shrink-0">
                {user ? `${user.prenom.charAt(0)}${user.nom.charAt(0)}` : '??'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight truncate">{user?.prenom} {user?.nom}</p>
                <p className="text-palmier-300 text-xs capitalize truncate">{user?.role?.toLowerCase()}</p>
              </div>
              {user?.role === 'GERANTE' && (
                <Star size={14} className="text-sable-300 flex-shrink-0" />
              )}
            </div>
          ) : (
            <div className="w-9 h-9 rounded-full bg-sable-500 flex items-center justify-center text-palmier-900 font-bold text-sm flex-shrink-0">
              {user ? `${user.prenom.charAt(0)}${user.nom.charAt(0)}` : '??'}
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {filteredItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-palmier-700 text-white font-medium'
                    : 'text-palmier-200 hover:bg-palmier-800 hover:text-white'
                } ${isCollapsed ? 'justify-center' : ''} relative`
              }
              title={isCollapsed ? item.label : ''}
            >
              {item.icon}
              {!isCollapsed && item.label}
              {/* Badge pour les messages non lus */}
              {item.badge && !isCollapsed && (
                <span className="ml-auto px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {item.badge}
                </span>
              )}
              {item.badge && isCollapsed && (
                <span className="absolute -top-1 -right-1 px-1 py-0.5 bg-red-500 text-white text-[10px] rounded-full">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className={`px-3 py-4 border-t border-palmier-700 space-y-1 ${
          isCollapsed ? 'flex flex-col items-center' : ''
        }`}>
          <NavLink
            to="/services-annexes"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-palmier-200 hover:bg-palmier-800 hover:text-white transition-colors ${
              isCollapsed ? 'justify-center' : ''
            }`}
            title={isCollapsed ? 'Vélos & Activités' : ''}
          >
            <Bike size={18} />
            {!isCollapsed && 'Velos & Activites'}
          </NavLink>
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-palmier-200 hover:bg-red-800 hover:text-white transition-colors ${
              isCollapsed ? 'justify-center' : ''
            }`}
            title={isCollapsed ? 'Déconnexion' : ''}
          >
            <LogOut size={18} />
            {!isCollapsed && 'Deconnexion'}
          </button>
        </div>
      </aside>
    </>
  );
}