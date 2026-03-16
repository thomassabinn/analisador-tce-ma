import React, { useState, useEffect, useRef } from 'react';
import { PdfIcon, MenuIcon, UserIcon, LogoutIcon } from './icons';

interface HeaderProps {
  currentFileName: string | null;
  onToggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentFileName, onToggleSidebar }) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuRef]);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-20 h-16 flex-shrink-0">
      <div className="container mx-auto px-4 h-full">
        <div className="flex justify-between items-center h-full">
          <div className="flex items-center min-w-0 flex-1">
            <button 
              onClick={onToggleSidebar} 
              className="lg:hidden mr-4 p-2 text-gray-500 rounded-md hover:bg-gray-50 transition-colors"
            >
              <MenuIcon className="h-5 w-5" />
            </button>
            
            <div className="flex items-center">
                <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center mr-3">
                    <PdfIcon className="h-5 w-5 text-brand-600" />
                </div>
                <div className="flex flex-col justify-center">
                    <h1 className="text-sm font-bold text-gray-900 tracking-tight leading-none">
                        Analisador TCE
                    </h1>
                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Enterprise</span>
                </div>
                
                {currentFileName && (
                    <div className="hidden md:flex items-center ml-6 pl-6 border-l border-gray-200">
                        <span className="text-sm font-medium text-gray-600 truncate max-w-xs" title={currentFileName}>
                            {currentFileName}
                        </span>
                    </div>
                )}
            </div>
          </div>

          <div className="flex items-center space-x-4 flex-shrink-0 ml-4">
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsUserMenuOpen(prev => !prev)}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors"
              >
                <UserIcon className="w-5 h-5 text-gray-500" />
              </button>

              {isUserMenuOpen && (
                <div 
                    className="origin-top-right absolute right-0 mt-2 w-48 rounded-lg shadow-float py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-30 border border-gray-100" 
                >
                  <a href="#" className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors" onClick={(e) => {e.preventDefault(); console.log('Sair'); setIsUserMenuOpen(false);}}>
                    <LogoutIcon className="w-4 h-4 mr-3 text-gray-400" />
                    <span>Sair</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;