import React, { useState, useContext, useMemo, useEffect } from 'react';
import { VinylIcon, Cog6ToothIcon } from './components/icons';
import { BottomNavBar, Tab } from './components/BottomNavBar';
import { PacksView } from './views/PacksView';
import { ProfileView } from './views/CollectionView';
import { TradeHubView } from './views/TradeHubView';
import { LabelsView, UserProfileModal, ChatModal } from './views/LabelsView';
import { ActivityView } from './views/RadioTowerView';
import { HallOfFameView } from './views/HallOfFameView';
import { UserContext } from './contexts/UserContext';
import { LoginView } from './views/LoginView';
import { AccountSettingsModal } from './components/AccountSettingsModal';
import { ProfileFrame } from './components/ProfileFrame';
import { NotificationPopup } from './components/NotificationPopup';
import { RewardModal } from './components/RewardModal';
import DevToolsDetector from './components/DevToolsDetector';


const App: React.FC = () => {
  // --- All hooks called at the top level ---
  const [activeTab, setActiveTab] = useState<Tab>('packs');
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const userContext = useContext(UserContext);

  const activeChat = useMemo(() => {
    if (!userContext?.chats || !userContext.activeChatId) {
      return null;
    }
    return userContext.chats.find(c => c.id === userContext.activeChatId);
  }, [userContext?.chats, userContext?.activeChatId]);

  // --- Conditional rendering logic ---
  if (!userContext || userContext.isLoading) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400"></div>
            <p className="ml-4 text-lg">Connecting...</p>
        </div>
    );
  }
  
  const { 
    currentUser, 
    viewingUser, 
    isProfileModalOpen, 
    setViewingUser,
    setActiveChatId,
    rewardPack,
    setRewardPack,
  } = userContext;

  if (!currentUser) {
    return <LoginView />;
  }
  
  const renderActiveView = () => {
    switch (activeTab) {
      case 'packs':
        return <PacksView />;
      case 'profile':
        return <ProfileView user={currentUser} />;
      case 'hall':
        return <HallOfFameView />;
      case 'radio':
        return <ActivityView />;
      case 'trade':
        return <TradeHubView />;
      case 'labels':
        return <LabelsView />;
      default:
        return <PacksView />;
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans p-4 sm:p-6 lg:p-8">
      <DevToolsDetector />
      <NotificationPopup />
      <div className="max-w-7xl mx-auto">
        <header className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl flex items-center justify-center sm:justify-start gap-3">
              <VinylIcon className="w-10 h-10 text-indigo-400" />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                PackTunes
              </span>
            </h1>
            <p className="mt-3 text-lg text-gray-400">Build your ultimate music collection.</p>
          </div>
          <div className="flex items-center gap-3 p-2 bg-gray-800/80 rounded-lg border border-gray-700">
            {currentUser.activeProfileFrame ? (
                <ProfileFrame pfpUrl={currentUser.pfpUrl} frameUrl={currentUser.activeProfileFrame.albumArtUrl} size="sm" />
            ) : (
                <img src={currentUser.pfpUrl} crossOrigin="anonymous" alt={currentUser.name} className="w-10 h-10 rounded-full object-cover" />
            )}
             <div className="text-left">
                  <p className="font-semibold text-white">{currentUser.name}</p>
              </div>
              <button onClick={() => setIsAccountModalOpen(true)} className="p-2 text-gray-400 hover:text-white transition-colors">
                <Cog6ToothIcon className="w-6 h-6" />
              </button>
          </div>
        </header>

        <main>
          {renderActiveView()}
        </main>

        <BottomNavBar activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
      {isAccountModalOpen && <AccountSettingsModal onClose={() => setIsAccountModalOpen(false)} />}
      
      {/* Global Modals managed by UserContext */}
      {isProfileModalOpen && viewingUser && <UserProfileModal user={viewingUser} onClose={() => setViewingUser(null)} />}
      {activeChat && <ChatModal chat={activeChat} onClose={() => setActiveChatId(null)} />}
      {rewardPack && <RewardModal pack={rewardPack.pack} title={rewardPack.title} onClose={() => setRewardPack(null)} />}
    </div>
  );
};

export default App;