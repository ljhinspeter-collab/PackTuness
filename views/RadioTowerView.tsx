import React, { useState, useContext, useMemo } from 'react';
import { UserContext } from '../contexts/UserContext';
import type { User, Mixtape } from '../types';
import { RadioPlayerModal } from '../components/RadioPlayerModal';
import { BroadcastIcon } from '../components/icons';
import { GlobalActivityFeed } from '../components/GlobalActivityFeed';
import { EventsView } from './EventsView';

type ActivityTab = 'feed' | 'wars' | 'radio';

const RadioStationCard: React.FC<{
    stationOwner: User;
    mixtape: Mixtape;
    onTuneIn: () => void;
    onViewProfile: () => void;
}> = ({ stationOwner, mixtape, onTuneIn, onViewProfile }) => {
    return (
        <div className="bg-gray-800/70 p-4 rounded-lg border border-gray-700 flex items-center gap-4">
            <button onClick={onViewProfile}>
                <img src={stationOwner.pfpUrl} alt={stationOwner.name} className="w-16 h-16 rounded-full object-cover border-2 border-gray-600" />
            </button>
            <div className="flex-grow">
                <p className="font-bold text-lg text-white">{mixtape.name}</p>
                <button onClick={onViewProfile} className="text-sm text-gray-400 hover:underline">Hosted by {stationOwner.name}</button>
                <p className="text-xs text-gray-500">{mixtape.songIds.length} tracks</p>
            </div>
            <button onClick={onTuneIn} className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-md font-semibold transition-colors flex-shrink-0">
                Tune In
            </button>
        </div>
    );
};

const RadioStationsView: React.FC = () => {
    const { users, setViewingUser } = useContext(UserContext)!;
    const [playingStation, setPlayingStation] = useState<{ user: User, mixtape: Mixtape } | null>(null);

    const activeStations = useMemo(() => {
        const stations: { user: User, mixtape: Mixtape }[] = [];
        users.forEach(user => {
            if (user.featuredMixtapeId) {
                const mixtape = user.mixtapes.find(m => m.id === user.featuredMixtapeId);
                if (mixtape) {
                    stations.push({ user, mixtape });
                }
            }
        });
        return stations;
    }, [users]);
    
    return (
        <div>
             <div className="text-center mb-8">
                <BroadcastIcon className="w-12 h-12 text-green-400 mx-auto mb-2" />
                <h2 className="text-3xl font-bold">Live Radio Tower</h2>
                <p className="text-gray-400 max-w-lg mx-auto">Discover what other collectors are listening to. Tune in to their featured radio stations.</p>
            </div>

            {activeStations.length > 0 ? (
                <div className="space-y-4">
                    {activeStations.map(({ user, mixtape }) => (
                        <RadioStationCard 
                            key={user.id}
                            stationOwner={user}
                            mixtape={mixtape}
                            onTuneIn={() => setPlayingStation({ user, mixtape })}
                            onViewProfile={() => setViewingUser(user)}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center text-gray-400 py-16 border-2 border-dashed border-gray-700 rounded-lg">
                    <p className="text-lg font-semibold">The airwaves are quiet...</p>
                    <p className="mt-1">No one is broadcasting right now. Why not be the first?</p>
                </div>
            )}
            
            {playingStation && (
                <RadioPlayerModal 
                    key={playingStation.mixtape.id}
                    mixtape={playingStation.mixtape}
                    user={playingStation.user}
                    onClose={() => setPlayingStation(null)}
                />
            )}
        </div>
    );
}


export const ActivityView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<ActivityTab>('feed');

    const renderContent = () => {
        switch (activeTab) {
            case 'feed':
                return <GlobalActivityFeed />;
            case 'wars':
                return <EventsView />;
            case 'radio':
                return <RadioStationsView />;
            default:
                return <GlobalActivityFeed />;
        }
    };
    
    return (
        <div>
            <div className="flex justify-center border-b border-gray-700 mb-6">
                 <button 
                    onClick={() => setActiveTab('feed')}
                    className={`px-6 py-3 font-semibold text-sm transition-colors ${activeTab === 'feed' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    Global Feed
                </button>
                 <button 
                    onClick={() => setActiveTab('wars')}
                    className={`px-6 py-3 font-semibold text-sm transition-colors ${activeTab === 'wars' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    Label Wars
                </button>
                 <button 
                    onClick={() => setActiveTab('radio')}
                    className={`px-6 py-3 font-semibold text-sm transition-colors ${activeTab === 'radio' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    Radio Stations
                </button>
            </div>
            {renderContent()}
        </div>
    );
};