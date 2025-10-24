import React from 'react';
import { Rarity } from '../types';

interface RarityFilterProps {
  activeFilter: Rarity | 'All';
  setFilter: (filter: Rarity | 'All') => void;
  hasJailbrokenSong?: boolean;
}

export const RarityFilter: React.FC<RarityFilterProps> = ({ activeFilter, setFilter, hasJailbrokenSong = false }) => {
  const filters: (Rarity | 'All')[] = ['All', Rarity.Common, Rarity.Uncommon, Rarity.Rare, Rarity.Mythic, Rarity.Jailbroken];
  
  return (
    <div className="flex justify-center gap-2 mb-6 flex-wrap">
      {filters.map(filter => {
        const isActive = activeFilter === filter;
        const buttonClasses = `px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${
          isActive
            ? 'bg-indigo-500 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`;

        if (filter === Rarity.Jailbroken) {
          if (hasJailbrokenSong) {
            return (
              <button key={filter} onClick={() => setFilter(filter)} className={buttonClasses}>
                <span className="glitch-text" data-text="Jailbroken">Jailbroken</span>
              </button>
            );
          }
          return (
             <button key={filter} onClick={() => setFilter(filter)} className={buttonClasses}>
              ?
            </button>
          );
        }

        return (
          <button
            key={filter}
            onClick={() => setFilter(filter)}
            className={buttonClasses}
          >
            {filter}
          </button>
        );
      })}
    </div>
  );
};