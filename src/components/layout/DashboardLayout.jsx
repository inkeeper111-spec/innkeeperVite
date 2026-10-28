import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { AppFooter } from './AppFooter';

export const DashboardLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <Sidebar
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />
      <button
        type="button"
        aria-label="Close navigation"
        aria-hidden={!isMobileOpen}
        tabIndex={isMobileOpen ? 0 : -1}
        onClick={() => setIsMobileOpen(false)}
        className={`fixed inset-0 z-30 bg-orvelle-dark/50 backdrop-blur-[1px] md:hidden ${isMobileOpen ? 'block' : 'hidden'}`}
      />

      {/* Main Container */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          isCollapsed ? 'md:ml-20' : 'md:ml-64'
        }`}
      >
        <Header
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          setIsMobileOpen={setIsMobileOpen}
        />

        <main className="flex-1 min-w-0 w-full max-w-[1600px] mx-auto px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
        <AppFooter />
      </div>
    </div>
  );
};

