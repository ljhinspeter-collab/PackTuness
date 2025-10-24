import React, { useContext, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { UserContext } from '../contexts/UserContext';
import type { User, RoomLayout, PlacedItem, RoomItem } from '../types';
import { ALL_ROOM_ITEMS_MAP } from '../data/roomItems';
import { PencilIcon } from '../components/icons';

// --- Start of New Sub-components ---

const Avatar: React.FC<{ user: User, isOwner: boolean }> = ({ user, isOwner }) => (
    <div className="absolute bottom-4 left-4 flex flex-col items-center z-20 group" style={{ transform: `translateX(${isOwner ? 0 : 60}px)` }}>
        <img src={user.pfpUrl} crossOrigin="anonymous" alt={user.name} className="w-14 h-14 rounded-full object-cover border-4 border-gray-800" />
        <div className="mt-1 px-2 py-0.5 bg-black/50 rounded-full text-xs text-white font-semibold">
            {user.name}
        </div>
    </div>
);

const RoomEditor: React.FC<{ user: User, onPlaceItem: (item: RoomItem) => void }> = ({ user, onPlaceItem }) => {
    const userInventoryItems = useMemo(() => {
        return (user.inventory?.roomItemIds || [])
            .map(id => ALL_ROOM_ITEMS_MAP.get(id))
            .filter((item): item is RoomItem => !!item);
    }, [user.inventory?.roomItemIds]);
    
    return (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-2xl h-36 bg-gray-900/80 backdrop-blur-lg border border-gray-700 rounded-xl shadow-2xl z-40 p-3">
            <h3 className="text-sm font-bold mb-2 text-center text-gray-300">Your Items</h3>
            <div className="flex gap-3 overflow-x-auto pb-2">
                {userInventoryItems.filter(item => item.type === 'furniture').map(item => (
                    <button key={item.id} onClick={() => onPlaceItem(item)} title={`Place ${item.name}`} className="flex-shrink-0 w-24 h-24 bg-gray-800 p-2 rounded-lg border border-gray-600 flex items-center justify-center hover:bg-gray-700">
                        <img src={item.imageUrl} crossOrigin="anonymous" alt={item.name} className="max-w-full max-h-full object-contain" />
                    </button>
                ))}
            </div>
        </div>
    );
};

const PlacedObject: React.FC<{ item: PlacedItem, isEditing: boolean, onMove: (instanceId: string, newPos: {x: number, y: number}) => void }> = ({ item, isEditing, onMove }) => {
    const itemData = ALL_ROOM_ITEMS_MAP.get(item.itemId);
    const itemRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    
    useEffect(() => {
        if (!isEditing || !isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (itemRef.current?.parentElement && itemData) {
                const parentRect = itemRef.current.parentElement.getBoundingClientRect();
                const newX = e.clientX - parentRect.left - (itemData.width / 2);
                const newY = e.clientY - parentRect.top - (itemData.height / 2);
                onMove(item.instanceId, { x: newX, y: newY });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isEditing, onMove, item.instanceId, itemData]);

    if (!itemData) return null;

    return (
        <div
            ref={itemRef}
            onMouseDown={() => isEditing && setIsDragging(true)}
            style={{
                position: 'absolute',
                left: `${item.x}px`,
                top: `${item.y}px`,
                width: `${itemData.width}px`,
                height: `${itemData.height}px`,
                zIndex: item.z,
                cursor: isEditing ? 'grab' : 'default',
                userSelect: 'none',
            }}
            className={isEditing ? 'border-2 border-dashed border-indigo-400' : ''}
        >
            <img src={itemData.imageUrl} crossOrigin="anonymous" alt={itemData.name} className="w-full h-full object-contain pointer-events-none" />
        </div>
    );
};
// --- End of New Sub-components ---


export const RoomView: React.FC = () => {
    const { currentUser, viewingRoomForUser, setViewingRoomForUser, updateUserRoom } = useContext(UserContext)!;
    
    const userToShow = viewingRoomForUser || currentUser!;
    const isOwner = !viewingRoomForUser;

    const [isEditing, setIsEditing] = useState(false);
    const [layout, setLayout] = useState<RoomLayout>(userToShow.room || { backgroundId: 'bg-sunset-pixel', items: [] });
    const roomContainerRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        setLayout(userToShow.room || { backgroundId: 'bg-sunset-pixel', items: [] });
    }, [userToShow]);

    const handleToggleEdit = () => {
        if (isEditing) {
            // Save changes
            updateUserRoom(layout);
        }
        setIsEditing(!isEditing);
    };

    const handlePlaceItem = (itemToPlace: RoomItem) => {
        const roomRect = roomContainerRef.current?.getBoundingClientRect();
        if (!roomRect) return;

        // Place in the center of the current view
        const scrollLeft = roomContainerRef.current?.scrollLeft || 0;
        const x = scrollLeft + (roomRect.width / 2) - (itemToPlace.width / 2);
        const y = (roomRect.height / 2) - (itemToPlace.height / 2);

        const newPlacedItem: PlacedItem = {
            instanceId: `item-${Date.now()}`,
            itemId: itemToPlace.id,
            x: Math.round(x),
            y: Math.round(y),
            z: (layout.items.length || 0) + 1,
        };

        setLayout(prev => ({...prev, items: [...prev.items, newPlacedItem]}));
    };

    const handleMoveItem = useCallback((instanceId: string, newPos: {x: number, y: number}) => {
        setLayout(prev => {
            const newItems = prev.items.map(item => 
                item.instanceId === instanceId ? { ...item, x: Math.round(newPos.x), y: Math.round(newPos.y) } : item
            );
            return { ...prev, items: newItems };
        });
    }, []);

    const backgroundUrl = ALL_ROOM_ITEMS_MAP.get(layout.backgroundId)?.imageUrl;
    const roomStyle: React.CSSProperties = {
        width: '2000px',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
    };
    if (backgroundUrl) {
        roomStyle.backgroundImage = `url(${backgroundUrl})`;
    } else {
        roomStyle.backgroundColor = '#111827'; // Fallback to bg-gray-900
    }

    return (
        <div className="relative h-[calc(100vh-240px)] flex flex-col">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
                <h2 className="text-2xl font-bold">{isOwner ? "My Room" : `Visiting ${userToShow.name}'s Room`}</h2>
                <div className="flex gap-2">
                    {isOwner && (
                        <button onClick={handleToggleEdit} className={`px-4 py-2 rounded-md font-semibold flex items-center gap-2 ${isEditing ? 'bg-green-600' : 'bg-indigo-600'}`}>
                            <PencilIcon className="w-5 h-5"/>
                            {isEditing ? 'Save Room' : 'Edit Room'}
                        </button>
                    )}
                    {!isOwner && (
                        <button onClick={() => setViewingRoomForUser(null)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md font-semibold">
                            Back to My Room
                        </button>
                    )}
                </div>
            </div>

            <div 
                ref={roomContainerRef}
                className="flex-grow w-full border-2 border-gray-700 rounded-lg overflow-x-auto"
            >
                <div 
                    className="relative h-full"
                    style={roomStyle}
                >
                    {/* Render Placed Items */}
                    {layout.items.map(item => (
                        <PlacedObject key={item.instanceId} item={item} isEditing={isEditing} onMove={handleMoveItem} />
                    ))}

                    {/* Render Avatars */}
                    <Avatar user={currentUser!} isOwner={isOwner} />
                    {viewingRoomForUser && <Avatar user={viewingRoomForUser} isOwner={false} />}
                </div>
            </div>

            {isEditing && <RoomEditor user={currentUser!} onPlaceItem={handlePlaceItem} />}
        </div>
    );
};