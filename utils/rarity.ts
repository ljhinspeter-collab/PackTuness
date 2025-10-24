import { Rarity } from '../types';

export const getRarityStyles = (rarity: Rarity) => {
  switch (rarity) {
    case Rarity.Jailbroken:
      return {
        textColor: 'text-gray-200',
        borderColor: 'border-gray-500',
        bgColor: 'bg-black/50',
        shadow: 'shadow-white/20',
        textGradient: 'bg-clip-text text-transparent bg-gradient-to-r from-gray-400 via-white to-gray-300'
      };
    case Rarity.Mythic:
      return {
        textColor: 'text-purple-400',
        borderColor: 'border-purple-500',
        bgColor: 'bg-purple-900/50',
        shadow: 'shadow-purple-500/50',
        textGradient: 'bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-purple-500 to-pink-500'
      };
    case Rarity.Rare:
      return {
        textColor: 'text-blue-400',
        borderColor: 'border-blue-400',
        bgColor: 'bg-blue-900/50',
        shadow: 'shadow-blue-500/50',
        textGradient: ''
      };
    case Rarity.Uncommon:
      return {
        textColor: 'text-green-400',
        borderColor: 'border-green-400',
        bgColor: 'bg-green-900/50',
        shadow: 'shadow-green-500/50',
        textGradient: ''
      };
    case Rarity.Common:
    default:
      return {
        textColor: 'text-gray-400',
        borderColor: 'border-gray-600',
        bgColor: 'bg-gray-800/50',
        shadow: 'shadow-gray-500/50',
        textGradient: ''
      };
  }
};