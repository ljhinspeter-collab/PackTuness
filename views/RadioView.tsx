import React, { useState, useContext, useMemo, useRef, useEffect } from 'react';
import { UserContext } from '../contexts/UserContext';
import type { CollectedSong, Mixtape } from '../types';
import { SearchBar } from '../components/SearchBar';
import { BroadcastIcon, XCircleIcon } from '../components/icons';

const SongSelectItem: React.FC<{
    song: CollectedSong;
    isSelected: boolean;
    onToggle: () => void;
}> = ({ song, isSelected, onToggle }) => (
    <button 
        onClick={onToggle}
        className={`w-full text-left p-2 rounded-md flex items-center gap-2 transition-colors ${isSelected ? 'bg-indigo-600/50 ring-2 ring-indigo-500' : 'bg-gray-700/50 hover:bg-gray-700'}`}
    >
        <img src={song.song.albumArtUrl} alt={song.song.album.title} className="w-10 h-10 rounded-sm object-cover flex-shrink-0" />
        <div className="flex-grow truncate">
            <p className="font-semibold text-white truncate text-sm">{song.song.title}</p>
            <p className="text-xs text-gray-400 truncate">{song.song.artist.name}</p>
        </div>
    </button>
);

const MixtapeSongItem: React.FC<{
    song: CollectedSong;
    onRemove: () => void;
    index: number;
    onDragStart: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
    onDragEnter: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
    onDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
    draggedOverIndex: number | null;
}> = ({ song, onRemove, index, onDragStart, onDragEnter, onDragEnd, draggedOverIndex }) => {
    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, index)}
            onDragEnter={(e) => onDragEnter(e, index)}
            onDragEnd={onDragEnd}
            onDragOver={(e) => e.preventDefault()}
            className={`p-2 rounded-md flex items-center gap-2 bg-gray-700/50 cursor-grab transition-shadow ${draggedOverIndex === index ? 'drag-over-hint' : ''}`}
        >
            <img src={song.song.albumArtUrl} alt={song.song.album.title} className="w-10 h-10 rounded-sm object-cover flex-shrink-0" />
            <div className="flex-grow truncate">
                <p className="font-semibold text-white truncate text-sm">{song.song.title}</p>
                <p className="text-xs text-gray-400 truncate">{song.song.artist.name}</p>
            </div>
            <button onClick={onRemove} className="p-1 text-gray-400 hover:text-red-400 transition-colors">
                <XCircleIcon className="w-5 h-5" />
            </button>
        </div>
    );
};

export const RadioView: React.FC = () => {
    const { currentUser, currentUserCollection, createMixtape, updateMixtape, deleteMixtape, setFeaturedMixtape } = useContext(UserContext)!;
    const [selectedMixtapeId, setSelectedMixtapeId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    
    // State for inline editing
    const [editingName, setEditingName] = useState('');
    const [editingDesc, setEditingDesc] = useState('');

    const mixtapeSongsContainerRef = useRef<HTMLDivElement>(null);
    const draggedItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);
    const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null);
    
    const selectedMixtape = useMemo(() => {
        return currentUser!.mixtapes.find(m => m.id === selectedMixtapeId) || null;
    }, [selectedMixtapeId, currentUser!.mixtapes]);

    // Effect to update editing state when a new mixtape is selected
    useEffect(() => {
        if (selectedMixtape) {
            setEditingName(selectedMixtape.name);
            setEditingDesc(selectedMixtape.description || '');
        }
    }, [selectedMixtape]);

    const handleCreateMixtape = () => {
        if (!newName.trim()) return;
        createMixtape(newName, newDesc);
        setNewName('');
        setNewDesc('');
        setIsCreating(false);
    };

    const handleSongToggle = (songId: string) => {
        if (!selectedMixtape) return;
        const currentSongIds = selectedMixtape.songIds || [];
        const isAdding = !currentSongIds.includes(songId);

        const newSongIds = isAdding
            ? [...currentSongIds, songId]
            : currentSongIds.filter(id => id !== songId);
        
        updateMixtape(selectedMixtape.id, { songIds: newSongIds });

        if(isAdding) {
            setTimeout(() => {
                mixtapeSongsContainerRef.current?.scrollTo({ 
                    top: mixtapeSongsContainerRef.current.scrollHeight, 
                    behavior: 'smooth' 
                });
            }, 100);
        }
    };
    
    const handleDeleteMixtape = () => {
        if (!selectedMixtape || !window.confirm('Are you sure you want to delete this mixtape?')) return;
        deleteMixtape(selectedMixtape.id);
        setSelectedMixtapeId(null);
    };

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        draggedItem.current = index;
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        dragOverItem.current = index;
        setDraggedOverIndex(index);
    };

    const handleDragEnd = () => {
        if (draggedItem.current === null || dragOverItem.current === null || !selectedMixtape) return;

        const newSongIds = [...(selectedMixtape.songIds || [])];
        const draggedSongId = newSongIds.splice(draggedItem.current, 1)[0];
        newSongIds.splice(dragOverItem.current, 0, draggedSongId);
        
        updateMixtape(selectedMixtape.id, { songIds: newSongIds });
        
        draggedItem.current = null;
        dragOverItem.current = null;
        setDraggedOverIndex(null);
    };
    
    const filteredCollection = useMemo(() => {
        return currentUserCollection.filter(cs => 
            cs.song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            cs.song.artist.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [currentUserCollection, searchQuery]);

    const songsInMixtape = useMemo(() => {
        if (!selectedMixtape) return [];
        const songMap = new Map(currentUserCollection.map(cs => [cs.id, cs]));
        return selectedMixtape.songIds.map(id => songMap.get(id)).filter(Boolean) as CollectedSong[];
    }, [selectedMixtape, currentUserCollection]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column: Mixtape List */}
            <div className="md:col-span-1 bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                <h3 className="text-xl font-bold mb-4">Your Mixtapes</h3>
                <div className="space-y-2 mb-4">
                    {currentUser!.mixtapes.map(mixtape => (
                        <button 
                            key={mixtape.id} 
                            onClick={() => setSelectedMixtapeId(mixtape.id)}
                            className={`w-full text-left p-3 rounded-lg transition-colors ${selectedMixtapeId === mixtape.id ? 'bg-indigo-600/50' : 'bg-gray-700/50 hover:bg-gray-700'}`}
                        >
                           <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-semibold">{mixtape.name}</p>
                                    <p className="text-xs text-gray-400">{mixtape.songIds.length} songs</p>
                                </div>
                                {currentUser!.featuredMixtapeId === mixtape.id && (
                                    <div title="Featured Radio Station">
                                        <BroadcastIcon className="w-5 h-5 text-green-400 flex-shrink-0" />
                                    </div>
                                )}
                           </div>
                        </button>
                    ))}
                </div>
                 <button onClick={() => setIsCreating(true)} className="w-full py-2 bg-green-600 hover:bg-green-500 rounded-md font-semibold">+ New Mixtape</button>
                 {isCreating && (
                    <div className="mt-4 p-3 bg-gray-700 rounded-lg space-y-2">
                        <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Mixtape Name" className="w-full bg-gray-800 border-gray-600 rounded px-2 py-1.5" />
                        <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description (optional)" className="w-full bg-gray-800 border-gray-600 rounded px-2 py-1.5" rows={2}></textarea>
                        <div className="flex gap-2">
                           <button onClick={() => setIsCreating(false)} className="w-full py-1.5 bg-gray-600 hover:bg-gray-500 rounded-md text-sm">Cancel</button>
                           <button onClick={handleCreateMixtape} className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-md text-sm">Create</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Right Column: Mixtape Editor */}
            <div className="md:col-span-2 bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                {selectedMixtape ? (
                    <div>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                            <div className="flex-grow">
                                <input
                                    type="text"
                                    value={editingName}
                                    onChange={(e) => setEditingName(e.target.value)}
                                    onBlur={() => {
                                        if (selectedMixtape && editingName.trim() && selectedMixtape.name !== editingName) {
                                            updateMixtape(selectedMixtape.id, { name: editingName.trim() });
                                        } else if (selectedMixtape && !editingName.trim()) {
                                            // Revert if name is cleared
                                            setEditingName(selectedMixtape.name);
                                        }
                                    }}
                                    className="text-2xl font-bold text-white bg-transparent focus:bg-gray-700/50 rounded-md px-2 -mx-2 outline-none focus:ring-2 focus:ring-indigo-500 w-full"
                                    aria-label="Mixtape Name"
                                />
                                <textarea
                                    value={editingDesc}
                                    onChange={(e) => setEditingDesc(e.target.value)}
                                    onBlur={() => {
                                        if (selectedMixtape && selectedMixtape.description !== editingDesc) {
                                            updateMixtape(selectedMixtape.id, { description: editingDesc });
                                        }
                                    }}
                                    className="text-gray-400 bg-transparent focus:bg-gray-700/50 rounded-md px-2 -mx-2 outline-none focus:ring-2 focus:ring-indigo-500 w-full mt-1 resize-none"
                                    rows={1}
                                    placeholder="Add a description..."
                                    aria-label="Mixtape Description"
                                />
                            </div>
                            <div className="flex gap-2 mt-2 sm:mt-0 flex-shrink-0">
                                <button
                                    onClick={() => setFeaturedMixtape(currentUser?.featuredMixtapeId === selectedMixtape.id ? null : selectedMixtape.id)}
                                    className={`px-3 py-1.5 rounded-md text-sm font-semibold flex items-center gap-1.5 transition-colors ${currentUser?.featuredMixtapeId === selectedMixtape.id ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-600 hover:bg-gray-500'}`}
                                >
                                    <BroadcastIcon className="w-4 h-4" />
                                    {currentUser?.featuredMixtapeId === selectedMixtape.id ? 'Broadcasting' : 'Set as Radio'}
                                </button>
                                <button onClick={handleDeleteMixtape} className="px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded-md text-sm font-semibold">Delete</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* Song Browser */}
                            <div className="bg-gray-900/50 p-2 rounded-lg">
                                <p className="font-semibold text-sm mb-2 px-1">Add Songs from Your Collection</p>
                                <div className="mb-2"><SearchBar query={searchQuery} setQuery={setSearchQuery} onSearch={()=>{}} isLoading={false} placeholder="Search songs..." /></div>
                                <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                                    {filteredCollection.map(cs => (
                                        <SongSelectItem 
                                            key={cs.id}
                                            song={cs}
                                            isSelected={(selectedMixtape.songIds || []).includes(cs.id)}
                                            onToggle={() => handleSongToggle(cs.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                            {/* Current Mixtape Songs */}
                             <div className="bg-gray-900/50 p-2 rounded-lg">
                                <p className="font-semibold text-sm mb-2 px-1">Songs in Mixtape ({songsInMixtape.length})</p>
                                <div ref={mixtapeSongsContainerRef} className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                                    {songsInMixtape.length > 0 ? songsInMixtape.map((cs, index) => (
                                         <MixtapeSongItem
                                            key={cs.id}
                                            song={cs}
                                            onRemove={() => handleSongToggle(cs.id)}
                                            index={index}
                                            onDragStart={handleDragStart}
                                            onDragEnter={handleDragEnter}
                                            onDragEnd={handleDragEnd}
                                            draggedOverIndex={dragOverItem.current}
                                        />
                                    )) : <p className="text-center text-gray-500 p-4">Add songs from the left.</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-gray-400 py-20">
                        <p>Select a mixtape to edit, or create a new one.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
