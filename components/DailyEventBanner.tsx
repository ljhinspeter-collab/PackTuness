import React, { useState, useEffect } from 'react';
import { getDailyEventState, HourlyEvent } from '../services/dailyEventService';
import { ClockIcon } from '../components/icons';

const formatTime = (ms: number): string => {
  if (ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const formatShortTime = (ms: number): string => {
  if (ms <= 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

const DailyEventBanner: React.FC = () => {
  const [state, setState] = useState<{
    activeEvent: HourlyEvent | null;
    countdownTarget: number | null;
    isEventActive: boolean;
  }>({ activeEvent: null, countdownTarget: null, isEventActive: false });
  
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    // This function checks the master state of the event (is it active? when's the next one?)
    const updateState = () => {
      const { activeEvent, nextEventTime, eventEndTime } = getDailyEventState();
      setState({
        activeEvent,
        countdownTarget: activeEvent ? eventEndTime : nextEventTime,
        isEventActive: !!activeEvent,
      });
    };

    updateState(); // Initial call
    // Re-check the event state periodically in case the tab is open when an event starts/ends
    const interval = setInterval(updateState, 15000); 
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // This effect runs a fast timer to update the countdown string every second
    if (state.countdownTarget === null) return;

    const timer = setInterval(() => {
        const now = Date.now();
        const difference = state.countdownTarget! - now;
        
        if (state.isEventActive) {
            setTimeLeft(formatShortTime(difference));
        } else {
            setTimeLeft(formatTime(difference));
        }
    }, 1000);

    return () => clearInterval(timer);
  }, [state.countdownTarget, state.isEventActive]);
  
  const { activeEvent, isEventActive } = state;

  if (isEventActive && activeEvent) {
    const EventIcon = activeEvent.icon;
    return (
      <div className="mb-6 p-4 rounded-lg border-2 border-yellow-400 bg-gradient-to-r from-yellow-900/80 via-purple-900/70 to-yellow-900/80 shadow-lg animate-pulse w-full max-w-3xl">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center bg-yellow-500/50 border-2 border-yellow-400">
            <EventIcon className="w-8 h-8 text-white" />
          </div>
          <div className="flex-grow text-center sm:text-left">
            <p className="text-xs font-bold uppercase tracking-wider text-yellow-300">DAILY EVENT LIVE!</p>
            <h3 className="text-xl font-bold text-white">{activeEvent.name}</h3>
            <p className="text-sm text-gray-300">{activeEvent.description}</p>
          </div>
          <div className="flex-shrink-0 text-center p-3 bg-black/30 rounded-lg">
            <p className="text-xs font-semibold text-gray-400">Ends In</p>
            <div className="flex items-center gap-1 font-mono text-xl font-bold text-white">
               <ClockIcon className="w-5 h-5 text-gray-400" />
              <span>{timeLeft}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render countdown to next event
  return (
    <div className="mb-6 p-4 rounded-lg border-2 border-indigo-500 bg-gradient-to-r from-indigo-900/80 via-purple-900/70 to-indigo-900/80 shadow-lg w-full max-w-3xl">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-center sm:text-left">
          <h3 className="text-xl font-bold text-white">The Airwaves Are Quiet... For Now</h3>
          <p className="text-sm text-gray-300">A new 15-minute pack bonus event happens at a random time each day.</p>
        </div>
        <div className="flex-shrink-0 text-center p-3 bg-black/30 rounded-lg">
          <p className="text-xs font-semibold text-gray-400">Next Event In</p>
          <div className="flex items-center gap-1 font-mono text-xl font-bold text-white">
             <ClockIcon className="w-5 h-5 text-gray-400" />
            <span>{timeLeft}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyEventBanner;
