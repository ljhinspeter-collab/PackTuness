import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { Mixtape, CollectedSong, Song } from '../types';
import { getTrackDetails } from '../services/musicService';
import { PlayIcon, PauseIcon } from './icons';

const SkipNextIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24" fill="currentColor" className={className || "w-6 h-6"}>
        <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.985V5.653z" />
        <path d="M19.5 5.25a.75.75 0 0 0-.75.75v12a.75.75 0 0 0 1.5 0V6a.75.75 0 0 0-.75-.75z" />
    </svg>
);

const SkipPreviousIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24" fill="currentColor" className={className || "w-6 h-6"}>
        <path d="M18.75 18.347c0 .856-.917 1.398-1.667.986L5.54 13.003a1.125 1.125 0 0 1 0-1.972l11.54-6.347a1.125 1.125 0 0 1 1.667.985v12.678z" />
        <path d="M4.5 18.75a.75.75 0 0 0 .75-.75V6a.75.75 0 0 0-1.5 0v12a.75.75 0 0 0 .75-.75z" />
    </svg>
);

export const Jukebox: React.FC<{ mixtape: Mixtape; collection: CollectedSong[]; userPfpUrl: string }> = ({ mixtape, collection, userPfpUrl }) => {
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const wasPlayingRef = useRef(false);
    
    const [livePreviewUrl, setLivePreviewUrl] = useState<string | null>(null);
    const [isLoadingTrack, setIsLoadingTrack] = useState(true);
    
    const tracks = useMemo(() => {
        const songMap = new Map(collection.map(cs => [cs.id, cs]));
        return mixtape.songIds.map(id => songMap.get(id)).filter(Boolean) as CollectedSong[];
    }, [mixtape, collection]);

    const currentTrack = tracks[currentTrackIndex];

    const handleNext = useCallback(() => {
        if (tracks.length === 0) return;
        setCurrentTrackIndex(prev => (prev + 1) % tracks.length);
    }, [tracks.length]);

    const handlePrevious = useCallback(() => {
        if (tracks.length === 0) return;
        setCurrentTrackIndex(prev => (prev - 1 + tracks.length) % tracks.length);
    }, [tracks.length]);
    
    useEffect(() => {
        if (!currentTrack) return;
        let isMounted = true;
        setIsLoadingTrack(true);
        getTrackDetails(currentTrack.song.id).then(freshSong => {
            if (isMounted && freshSong) {
                setLivePreviewUrl(freshSong.previewUrl);
            }
            if (isMounted) {
                setIsLoadingTrack(false);
            }
        });
        return () => { isMounted = false; };
    }, [currentTrack]);
    
    useEffect(() => {
        if (!livePreviewUrl) return;
        const audio = new Audio(livePreviewUrl);
        audioRef.current = audio;
        audio.volume = 0.4;

        const handlers = {
            play: () => setIsPlaying(true),
            pause: () => setIsPlaying(false),
            ended: () => handleNext(),
            timeupdate: () => {
                if (!audio.duration) return;
                setProgress((audio.currentTime / audio.duration) * 100);
            },
        };

        Object.entries(handlers).forEach(([event, handler]) => audio.addEventListener(event, handler));

        if (wasPlayingRef.current) {
            audio.play().catch(() => wasPlayingRef.current = false);
        }
        setProgress(0);

        return () => {
            wasPlayingRef.current = !audio.paused;
            audio.pause();
            Object.entries(handlers).forEach(([event, handler]) => audio.removeEventListener(event, handler));
            audioRef.current = null;
        };
    }, [livePreviewUrl, handleNext]);

    const togglePlayPause = () => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.paused ? audio.play().catch(e => console.error("Playback error:", e)) : audio.pause();
    };

    if (tracks.length === 0) return null;

    return (
        <div className="w-full max-w-sm bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-700 shadow-2xl">
            <div className="relative w-56 h-56 mx-auto mb-6">
                <div className="absolute inset-0 bg-black rounded-full shadow-lg"></div>
                <img 
                    src={currentTrack.song.albumArtUrl} 
                    alt={currentTrack.song.album.title}
                    className={`absolute inset-4 w-48 h-48 rounded-full object-cover transition-transform duration-1000 ${isPlaying ? 'animate-[spin_10s_linear_infinite]' : ''}`}
                    style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}
                />
                <div className="absolute inset-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-gray-200 rounded-full border-4 border-gray-800 flex items-center justify-center">
                   <img src={userPfpUrl} alt="User PFP" className="w-full h-full object-cover rounded-full" />
                </div>
            </div>

            <div className="text-center">
                <p className="text-sm text-indigo-400 font-semibold truncate">{mixtape.name}</p>
                <h2 className="text-xl font-bold text-white truncate">{currentTrack.song.title}</h2>
                <p className="text-gray-300 truncate">{currentTrack.song.artist.name}</p>
            </div>

            <div className="my-4">
                {isLoadingTrack ? (
                    <div className="text-center text-gray-400 text-xs py-1">Loading...</div>
                ) : (
                    <div className="w-full bg-black/30 rounded-full h-1.5">
                        <div className="bg-white h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
                    </div>
                )}
            </div>

            <div className="flex items-center justify-center gap-6 text-white">
                <button onClick={handlePrevious} className="hover:text-indigo-400 transition-colors">
                    <SkipPreviousIcon className="w-8 h-8" />
                </button>
                <button onClick={togglePlayPause} disabled={isLoadingTrack} className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors disabled:opacity-50">
                    {isPlaying ? <PauseIcon className="w-10 h-10" /> : <PlayIcon className="w-10 h-10 pl-1" />}
                </button>
                <button onClick={handleNext} className="hover:text-indigo-400 transition-colors">
                    <SkipNextIcon className="w-8 h-8" />
                </button>
            </div>
        </div>
    );
};
