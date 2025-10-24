import React from 'react';
import { PackageIcon, RectangleStackIcon, TrophyIcon, ChartBarIcon, BuildingLibraryIcon, ArrowPathIcon } from './icons';

export type Tab = 'packs' | 'profile' | 'hall' | 'radio' | 'trade' | 'labels';

interface NavItemProps {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ label, icon, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors duration-200 ${isActive ? 'text-indigo-400' : 'text-gray-400 hover:text-white'}`}
  >
    {icon}
    <span className="text-xs mt-1">{label}</span>
  </button>
);

interface BottomNavBarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'packs', label: 'Packs', icon: <PackageIcon className="w-6 h-6" /> },
    { id: 'profile', label: 'Profile', icon: <RectangleStackIcon className="w-6 h-6" /> },
    { id: 'hall', label: 'Hall', icon: <TrophyIcon className="w-6 h-6" /> },
    { id: 'radio', label: 'Activity', icon: <ChartBarIcon className="w-6 h-6" /> },
    { id: 'trade', label: 'Trade Hub', icon: <ArrowPathIcon className="w-6 h-6" /> },
    { id: 'labels', label: 'Social', icon: <BuildingLibraryIcon className="w-6 h-6" /> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-gray-800/80 backdrop-blur-sm border-t border-gray-700 flex justify-around items-center z-50">
      {navItems.map(item => (
        <NavItem
          key={item.id}
          label={item.label}
          icon={item.icon}
          isActive={activeTab === item.id}
          onClick={() => setActiveTab(item.id as Tab)}
        />
      ))}
    </nav>
  );
};