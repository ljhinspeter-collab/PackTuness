import React, { useState, useEffect, useRef } from 'react';
import { ShieldExclamationIcon } from './icons';

const DevToolsDetector: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const threshold = 170; // Milliseconds threshold to detect debugger pause
    const intervalRef = useRef<number | null>(null);

    useEffect(() => {
        const check = () => {
            const startTime = performance.now();
            debugger; // This is the key part of the detection
            const endTime = performance.now();
            
            if (endTime - startTime > threshold) {
                // DevTools are likely open
                if (!isOpen) { // Only set state if it changes to prevent re-renders
                    setIsOpen(true);
                }
            } else {
                // DevTools are likely closed
                if (isOpen) {
                    setIsOpen(false);
                }
            }
        };
        
        // We want the interval to run regardless of the component's state
        intervalRef.current = window.setInterval(check, 1000);
        
        // Also, disable right-click context menu
        const handleContext = (e: MouseEvent) => e.preventDefault();
        document.addEventListener('contextmenu', handleContext);

        // Cleanup
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            document.removeEventListener('contextmenu', handleContext);
        };
    }, [isOpen]); // Depend on isOpen to update the internal state check

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black/95 flex flex-col items-center justify-center z-[9999] text-center p-4">
            <ShieldExclamationIcon className="w-24 h-24 text-red-500 mb-6 animate-pulse" />
            <h2 className="text-4xl font-black text-red-500 tracking-wider">ACCESS DENIED</h2>
            <h3 className="text-2xl font-bold text-white mt-4">Developer Tools Detected</h3>
            <p className="text-lg text-gray-300 mt-2 max-w-2xl">
                Interacting with the application's code is a violation of our terms of service and may result in a permanent account ban.
            </p>
            <p className="text-gray-400 mt-6 font-semibold">Please close the developer tools to continue using PackTunes.</p>
        </div>
    );
};

export default DevToolsDetector;
