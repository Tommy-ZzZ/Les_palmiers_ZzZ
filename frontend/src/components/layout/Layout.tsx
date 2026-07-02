// components/layout/Layout.tsx
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
      
      {/* Header avec ajustement dynamique */}
      <Header isSidebarCollapsed={isSidebarCollapsed} />
      
      {/* Contenu principal avec ajustement dynamique */}
      <main 
        className={`
          transition-all duration-300 ease-in-out
          ${isSidebarCollapsed ? 'ml-16' : 'ml-64'}
          mt-16
          p-6
          min-h-screen
        `}
      >
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}