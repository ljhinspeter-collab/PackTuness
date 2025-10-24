
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import type { Mixtape, User, CollectedSong } from '../types';
import { PlayIcon, PauseIcon } from './icons';
import { dataService } from '../services/dataService';
import { getTrackDetails } from '../services/musicService';


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


export const RadioPlayerModal: React.FC<{ mixtape: Mixtape, user: User, onClose: () => void }> = ({ mixtape, user, onClose }) => {
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const wasPlayingRef = useRef(false);

    const [tracks, setTracks] = useState<CollectedSong[]>([]);
    const [livePreviewUrl, setLivePreviewUrl] = useState<string | null>(null);
    const [isLoadingUrl, setIsLoadingUrl] = useState(true);

    useEffect(() => {
        dataService.getCollectionForUser(user.id).then(collection => {
            const songMap = new Map(collection.map(cs => [cs.id, cs]));
            const mixtapeTracks = mixtape.songIds.map(id => songMap.get(id)).filter(Boolean) as CollectedSong[];
            setTracks(mixtapeTracks);
        });
    }, [mixtape, user.id]);

    const currentTrack = tracks[currentTrackIndex];

    const handleNext = useCallback(() => {
        if (tracks.length === 0) return;
        setCurrentTrackIndex(prev => (prev + 1) % tracks.length);
    }, [tracks.length]);

    const handlePrevious = useCallback(() => {
        if (tracks.length === 0) return;
        setCurrentTrackIndex(prev => (prev - 1 + tracks.length) % tracks.length);
    }, [tracks.length]);

    // Effect to fetch live URL when track changes
    useEffect(() => {
        if (!currentTrack) {
            setIsPlaying(false);
            return;
        }

        let isMounted = true;
        setIsLoadingUrl(true);
        getTrackDetails(currentTrack.song.id).then(freshSong => {
            if (isMounted && freshSong) {
                setLivePreviewUrl(freshSong.previewUrl);
            }
             if (isMounted) {
                setIsLoadingUrl(false);
            }
        });

        return () => { isMounted = false; };
    }, [currentTrack]); 

     // Effect to manage audio element when live URL is ready
    useEffect(() => {
        if (!livePreviewUrl) return;
        
        const audio = new Audio(livePreviewUrl);
        audioRef.current = audio;
        audio.volume = 0.5;

        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        const handleEnded = () => handleNext();
        const handleTimeUpdate = () => {
             if (!audio.duration) return;
             setProgress((audio.currentTime / audio.duration) * 100);
        };

        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('timeupdate', handleTimeUpdate);
        
        if (wasPlayingRef.current) {
            audio.play().catch(e => {
                console.error("Failed to autoplay next track:", e.message);
                setIsPlaying(false);
                wasPlayingRef.current = false;
            });
        }
        setProgress(0);

        return () => {
            wasPlayingRef.current = !audio.paused;
            audio.pause();
            audio.removeEventListener('play', handlePlay);
            audio.removeEventListener('pause', handlePause);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audioRef.current = null;
        };
    }, [livePreviewUrl, handleNext]); 

    const togglePlayPause = () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (audio.paused) {
            audio.play().catch(e => console.error("Audio playback failed:", e.message));
        } else {
            audio.pause();
        }
    };
    
    if (tracks.length === 0) {
         return (
             <div className="modal-overlay" onClick={onClose}>
                <div className="modal-content w-full max-w-sm bg-gray-800 rounded-xl p-6 text-center" onClick={e => e.stopPropagation()}>
                    <h2 className="text-xl font-bold text-white mb-2">{mixtape.name}</h2>
                    <p className="text-gray-400">This mixtape is empty.</p>
                     <button onClick={onClose} className="absolute top-3 right-3 p-1.5 bg-black/50 rounded-full hover:bg-black/70 transition-colors z-10">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-white">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
         );
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content w-full max-w-sm bg-gray-800/80 backdrop-blur-lg rounded-xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
                <img 
                    src={currentTrack.song.albumArtUrl} 
                    alt={currentTrack.song.album.title}
                    className="w-48 h-48 rounded-lg object-cover mx-auto mb-6 shadow-lg"
                />

                <div className="text-center">
                    <p className="text-sm text-indigo-400 font-semibold">{mixtape.name}</p>
                    <h2 className="text-xl font-bold text-white truncate">{currentTrack.song.title}</h2>
                    <p className="text-gray-300">{currentTrack.song.artist.name}</p>
                    <p className="text-sm text-gray-400 truncate">{currentTrack.song.album.title}</p>
                </div>

                <div className="my-4">
                     {isLoadingUrl ? (
                        <div className="text-center text-gray-400 text-xs py-1">Loading Track...</div>
                    ) : (
                        <>
                            <div className="w-full bg-black/30 rounded-full h-1.5">
                                <div className="bg-white h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
                            </div>
                            <p className="text-xs text-gray-400 text-center mt-1">Track {currentTrackIndex + 1} of {tracks.length}</p>
                        </>
                    )}
                </div>

                <div className="flex items-center justify-center gap-6 text-white">
                    <button onClick={handlePrevious} className="hover:text-indigo-400 transition-colors">
                        <SkipPreviousIcon className="w-8 h-8" />
                    </button>
                    <button onClick={togglePlayPause} disabled={isLoadingUrl} className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {isPlaying ? <PauseIcon className="w-10 h-10" /> : <PlayIcon className="w-10 h-10 pl-1" />}
                    </button>
                    <button onClick={handleNext} className="hover:text-indigo-400 transition-colors">
                        <SkipNextIcon className="w-8 h-8" />
                    </button>
                </div>
                 <button onClick={onClose} className="absolute top-3 right-3 p-1.5 bg-black/50 rounded-full hover:bg-black/70 transition-colors z-10">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-white">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
};
