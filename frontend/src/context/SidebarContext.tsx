'use client';

import { createContext, useContext, useState } from 'react';

interface SidebarContextType {
  sidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType>({
  sidebarOpen: false,
  openSidebar: () => {},
  closeSidebar: () => {},
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <SidebarContext.Provider value={{
      sidebarOpen,
      openSidebar: () => setSidebarOpen(true),
      closeSidebar: () => setSidebarOpen(false),
    }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}
