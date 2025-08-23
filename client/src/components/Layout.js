import React, { useState, useEffect } from 'react';
import { Home, LibraryBig, Settings, PanelLeftOpen, X } from 'lucide-react';

const Layout = ({ children, currentPage, onNavigate }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Effect to handle the CSS variable for viewport height
  useEffect(() => {
    const setVh = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    // Set the value on initial load
    setVh();

    // Add event listener for window resize
    window.addEventListener('resize', setVh);

    // Cleanup function to remove the event listener
    return () => {
      window.removeEventListener('resize', setVh);
    };
  }, []); // Empty dependency array means this effect runs once on mount and cleanup on unmount

  const handleLinkClick = (page) => {
    onNavigate(page);
    setIsSidebarOpen(false); // Close sidebar on mobile after navigation
  };

  const getLinkClass = (pageName) => {
    return `flex items-center p-2 text-base font-normal text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 ${
      currentPage === pageName ? 'bg-gray-100 dark:bg-gray-700' : ''
    }`;
  };

  const SidebarContent = () => (
    <>
      <div className="flex items-center mb-8">
        <LibraryBig className="h-8 w-8 text-blue-500" />
        <h1 className="ml-3 text-2xl font-bold">Usei Reader</h1>
      </div>
      <nav>
        <ul>
          <li className="mb-2">
            <button onClick={() => handleLinkClick('dashboard')} className={`w-full text-left ${getLinkClass('dashboard')}`}>
              <Home className="w-6 h-6 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white" />
              <span className="ml-3">Dashboard</span>
            </button>
          </li>
          <li className="mb-2">
            <button onClick={() => handleLinkClick('settings')} className={`w-full text-left ${getLinkClass('settings')}`}>
              <Settings className="w-6 h-6 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white" />
              <span className="ml-3">Settings</span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );

  return (
    <div className="min-h-screen w-full bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Mobile Header with Hamburger Menu */}
      <header className="md:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center">
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          <PanelLeftOpen className="h-6 w-6" />
        </button>
        <div className="flex-grow text-center">
          <h1 className="text-xl font-bold">Usei Reader</h1>
        </div>
        <div className="w-6"></div> {/* Spacer to balance the layout */}
      </header>

      <div className="flex">
        {/* Sidebar */}
        {/* Mobile Sidebar (Overlay) */}
        <div
          className={`fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden transition-opacity ${
            isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={() => setIsSidebarOpen(false)}
        ></div>
        <aside
          className={`fixed top-0 left-0 w-64 h-screen bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 z-50 transform transition-transform md:translate-x-0 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="absolute top-4 right-4 md:hidden"
          >
            <X className="h-6 w-6" />
          </button>
          <SidebarContent />
        </aside>

        {/* Desktop Sidebar (Static) */}
        <aside className="hidden md:block w-64 h-screen bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 fixed">
          <SidebarContent />
        </aside>

        {/* Main Content */}
        <main className="flex-1 md:ml-64 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
