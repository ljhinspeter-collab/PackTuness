import React, { useContext } from 'react';
import { UserContext } from '../contexts/UserContext';
import type { GlobalActivity } from '../types';
import { Rarity } from '../types';
import { getRarityStyles } from '../utils/rarity';
import { SparklesIcon, DiamondIcon, VinylIcon } from './icons';

const ActivityCard: React.FC<{ activity: GlobalActivity }> = ({ activity }) => {
    const { setViewingUser, users } = useContext(UserContext)!;

    const handleUserClick = () => {
        const user = users.find(u => u.id === activity.userId);
        if (user) {
            setViewingUser(user);
        }
    };
    
    const renderContent = () => {
        let icon: React.ReactNode;
        let message: React.ReactNode;
        const userNameSpan = <button onClick={handleUserClick} className="font-bold text-white hover:underline">{activity.userName}</button>;

        switch(activity.type) {
            case 'PULL_JAILBROKEN':
                icon = <div className="w-10 h-10 rounded-md jailbroken-glow jailbroken-border"><img src={activity.song!.albumArtUrl} className="w-full h-full object-cover rounded"/></div>;
                message = <>{userNameSpan} just pulled the <span className="font-bold text-gray-300 glitch-text" data-text="JAILBROKEN">JAILBROKEN</span> song "{activity.song!.title}"!</>;
                break;
            case 'PULL_MYTHIC':
                 icon = <div className="w-10 h-10 rounded-md mythic-glow mythic-border"><img src={activity.song!.albumArtUrl} className="w-full h-full object-cover rounded"/></div>;
                message = <>{userNameSpan} found a <span className="font-bold text-purple-400">Mythic</span> "{activity.song!.title}"!</>;
                break;
            case 'PULL_SHINY_RARE':
                 icon = <div className="w-10 h-10 rounded-md shiny-glow"><img src={activity.song!.albumArtUrl} className="w-full h-full object-cover rounded"/></div>;
                message = <>{userNameSpan} discovered a <span className="font-bold text-cyan-400">Shiny {activity.song!.rarity}</span> song!</>;
                break;
            case 'CRAFT_PRESTIGE':
                icon = <div className="w-10 h-10 rounded-md prestige-glow prestige-border"><img src={activity.song!.albumArtUrl} className="w-full h-full object-cover rounded"/></div>;
                message = <>{userNameSpan} crafted a <span className="font-bold text-yellow-300">Prestige</span> version of "{activity.song!.title}"!</>;
                break;
            case 'COMPLETE_VINYL':
                icon = <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center"><VinylIcon className="w-8 h-8 text-yellow-400"/></div>;
                message = <>{userNameSpan} completed the <span className="font-bold text-yellow-400">Golden Vinyl</span> for "{activity.vinyl!.albumName}"!</>;
                break;
            default:
                return null;
        }

        return (
            <div className="flex items-center gap-3">
                <div className="flex-shrink-0">{icon}</div>
                <p className="text-sm text-gray-300">{message}</p>
            </div>
        );
    }
    
    return (
        <div className="p-3 bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700/80 animate-fadeIn">
            {renderContent()}
        </div>
    )
}


export const GlobalActivityFeed: React.FC = () => {
    const { globalActivityFeed } = useContext(UserContext)!;

    return (
        <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700 h-96 flex flex-col">
            <h3 className="text-xl font-bold mb-4 text-center text-white">Global Activity</h3>
            {globalActivityFeed.length > 0 ? (
                <div className="space-y-3 overflow-y-auto flex-grow pr-2">
                    {globalActivityFeed.map(activity => (
                        <ActivityCard key={activity.id} activity={activity} />
                    ))}
                </div>
            ) : (
                <div className="flex-grow flex items-center justify-center text-center text-gray-500">
                    <p>The world is quiet... <br/> Be the first to make a legendary discovery!</p>
                </div>
            )}
        </div>
    );
};