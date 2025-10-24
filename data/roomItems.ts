import type { RoomItem } from '../types';

export const ALL_ROOM_ITEMS_MAP: Map<string, RoomItem> = new Map([
    // Backgrounds
    ['bg-sunset-pixel', {
        id: 'bg-sunset-pixel',
        name: 'Pixel Sunset',
        imageUrl: 'https://i.imgur.com/h5r5j2p.png',
        type: 'background',
        width: 2000,
        height: 600,
    }],
    ['bg-night-sky', {
        id: 'bg-night-sky',
        name: 'Night Sky',
        imageUrl: 'https://i.imgur.com/M8S9A48.png',
        type: 'background',
        width: 2000,
        height: 600,
    }],

    // Furniture
    ['item-frame-wood', {
        id: 'item-frame-wood',
        name: 'Wood Frame',
        imageUrl: 'https://i.imgur.com/3dZgqYx.png',
        type: 'furniture',
        width: 120,
        height: 120,
    }],
    ['item-shelf-wood', {
        id: 'item-shelf-wood',
        name: 'Wood Shelf',
        imageUrl: 'https://i.imgur.com/7p6bBvM.png',
        type: 'furniture',
        width: 150,
        height: 50,
    }],
    ['item-jukebox', {
        id: 'item-jukebox',
        name: 'Jukebox',
        imageUrl: 'https://i.imgur.com/Q6yH1tN.png',
        type: 'furniture',
        width: 100,
        height: 150,
    }],
    ['item-plant-1', {
        id: 'item-plant-1',
        name: 'Potted Plant',
        imageUrl: 'https://i.imgur.com/q2r5cO8.png',
        type: 'furniture',
        width: 60,
        height: 80,
    }],

    // New Furniture Items
    ['item-lava-lamp', {
        id: 'item-lava-lamp',
        name: 'Lava Lamp',
        imageUrl: 'https://i.imgur.com/jW1hZmP.png',
        type: 'furniture',
        width: 60,
        height: 120,
    }],
    ['item-gaming-chair', {
        id: 'item-gaming-chair',
        name: 'Gaming Chair',
        imageUrl: 'https://i.imgur.com/Bf9g1z5.png',
        type: 'furniture',
        width: 80,
        height: 130,
    }],
    ['item-poster-1', {
        id: 'item-poster-1',
        name: 'Synthwave Poster',
        imageUrl: 'https://i.imgur.com/k9Wq05D.png',
        type: 'furniture',
        width: 100,
        height: 140,
    }],
    ['item-beanbag', {
        id: 'item-beanbag',
        name: 'Bean Bag Chair',
        imageUrl: 'https://i.imgur.com/4qL6v1Y.png',
        type: 'furniture',
        width: 100,
        height: 80,
    }],
    ['item-pc-setup', {
        id: 'item-pc-setup',
        name: 'PC Setup',
        imageUrl: 'https://i.imgur.com/sY3bYtY.png',
        type: 'furniture',
        width: 150,
        height: 140,
    }],
]);