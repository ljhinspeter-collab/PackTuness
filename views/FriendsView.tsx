import React, { useState, useContext, useMemo } from 'react';
import { UserContext } from '../contexts/UserContext';
import type { User } from '../types';
import { SearchBar } from '../components/SearchBar';
import { UsersIcon, UserPlusIcon, UserMinusIcon } from '../components/icons';


const FriendCard: React.FC<{ user: User, onRemove: () => void, onViewProfile: () => void }> = ({ user, onRemove, onViewProfile }) => (
    <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700">
        <button onClick={onViewProfile} className="flex items-center gap-3 text-left">
            <img src={user.pfpUrl} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
            <p className="font-semibold">{user.name}</p>
        </button>
        <button 
            onClick={onRemove}
            className="p-2 text-gray-400 hover:text-red-400 transition-colors rounded-full hover:bg-red-500/10"
            title={`Remove ${user.name} from friends`}
        >
            <UserMinusIcon className="w-5 h-5" />
        </button>
    </div>
);

const UserSearchResultCard: React.FC<{ user: User, onAdd: () => void }> = ({ user, onAdd }) => (
    <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700">
        <div className="flex items-center gap-3">
            <img src={user.pfpUrl} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
            <p className="font-semibold">{user.name}</p>
        </div>
        <button 
            onClick={onAdd}
            className="p-2 text-gray-400 hover:text-green-400 transition-colors rounded-full hover:bg-green-500/10"
            title={`Add ${user.name} as a friend`}
        >
            <UserPlusIcon className="w-5 h-5" />
        </button>
    </div>
);

export const FriendsView: React.FC = () => {
    const { currentUser, users, addFriend, removeFriend, setViewingUser } = useContext(UserContext)!;
    const [query, setQuery] = useState('');

    const friends = useMemo(() => {
        const friendIds = new Set(currentUser!.friendIds);
        return users.filter(user => friendIds.has(user.id));
    }, [currentUser, users]);

    const searchResults = useMemo(() => {
        if (!query.trim()) return [];
        const lowerCaseQuery = query.toLowerCase();
        const friendIds = new Set(currentUser!.friendIds);
        return users.filter(user => 
            user.id !== currentUser!.id && 
            !friendIds.has(user.id) &&
            user.name.toLowerCase().includes(lowerCaseQuery)
        );
    }, [query, users, currentUser]);

    return (
        <div className="max-w-3xl mx-auto">
            <div className="mb-8">
                <h3 className="text-xl font-bold mb-4">Find New Friends</h3>
                <SearchBar 
                    query={query}
                    setQuery={setQuery}
                    onSearch={() => {}}
                    isLoading={false}
                    placeholder="Search for other collectors..."
                />

                {query.trim() && (
                    <div className="mt-4 space-y-2 max-h-60 overflow-y-auto pr-2">
                        {searchResults.length > 0 ? (
                            searchResults.map(user => <UserSearchResultCard key={user.id} user={user} onAdd={() => addFriend(user.id)} />)
                        ) : (
                            <p className="text-center text-gray-400 p-4">No users found.</p>
                        )}
                    </div>
                )}
            </div>

            <div>
                <h3 className="text-xl font-bold mb-4">Your Friends ({friends.length})</h3>
                {friends.length > 0 ? (
                    <div className="space-y-3">
                        {friends.map(friend => <FriendCard key={friend.id} user={friend} onRemove={() => removeFriend(friend.id)} onViewProfile={() => setViewingUser(friend)} />)}
                    </div>
                ) : (
                    <div className="text-center text-gray-400 py-10 border-2 border-dashed border-gray-700 rounded-lg">
                        <UsersIcon className="w-12 h-12 mx-auto text-gray-600 mb-2"/>
                        <p>You haven't added any friends yet.</p>
                        <p className="text-sm mt-1">Use the search bar above to find people!</p>
                    </div>
                )}
            </div>
        </div>
    );
};