import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { AppFooter } from './AppFooter';

export const DashboardLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="min-h-[100dvh] bg-orvelle-ivory flex">
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
        className={`fixed inset-0 z-30 bg-orvelle-dark/50 backdrop-blur-[2px] min-[1100px]:hidden ${isMobileOpen ? 'block' : 'hidden'}`}
      />

      {/* Main Container */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          isCollapsed ? 'min-[1100px]:ml-20' : 'min-[1100px]:ml-64'
        }`}
      >
        <Header
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          setIsMobileOpen={setIsMobileOpen}
        />

        <main className="mx-auto w-full max-w-[1600px] min-w-0 flex-1 px-3 py-4 sm:px-5 sm:py-5 xl:px-8 xl:py-7">
          <Outlet />
        </main>
        <AppFooter />
      </div>
    </div>
  );
};
