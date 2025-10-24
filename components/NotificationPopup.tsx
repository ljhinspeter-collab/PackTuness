import React, { useEffect, useState } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { TrophyIcon, CrownIcon, VinylIcon } from './icons';

const iconMap = {
  challenge: <TrophyIcon className="w-6 h-6 text-yellow-300" />,
  mastery: <CrownIcon className="w-6 h-6 text-purple-400" />,
  vinyl: <VinylIcon className="w-6 h-6 text-yellow-300" />,
  generic: null,
};

const SingleNotification: React.FC<{
  message: string;
  type: 'challenge' | 'mastery' | 'vinyl' | 'generic';
  onDismiss: () => void;
}> = ({ message, type, onDismiss }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Animate in
    const inTimer = setTimeout(() => setVisible(true), 100);

    // Animate out and dismiss
    const outTimer = setTimeout(() => {
      setVisible(false);
      const dismissTimer = setTimeout(onDismiss, 300); // Wait for animation
      return () => clearTimeout(dismissTimer);
    }, 4000);

    return () => {
      clearTimeout(inTimer);
      clearTimeout(outTimer);
    };
  }, [onDismiss]);

  const Icon = iconMap[type];

  return (
    <div
      className={`relative w-full max-w-md mx-auto p-3 rounded-lg border-2 shadow-lg flex items-center gap-4 transition-transform duration-300 ease-out ${visible ? 'translate-y-0' : '-translate-y-20'}`}
      style={{
        background: 'rgba(23, 23, 37, 0.8)',
        backdropFilter: 'blur(10px)',
        borderColor: type === 'mastery' ? 'rgba(192, 132, 252, 0.5)' : 'rgba(252, 211, 77, 0.5)',
      }}
    >
      {Icon && <div className="flex-shrink-0">{Icon}</div>}
      <p className="font-semibold text-white">{message}</p>
    </div>
  );
};

export const NotificationPopup: React.FC = () => {
  const { notifications, removeNotification } = useNotification();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-24 left-0 right-0 z-[60] p-4 pointer-events-none">
        {/* We only render the first notification in the queue */}
        <SingleNotification
            key={notifications[0].id}
            message={notifications[0].message}
            type={notifications[0].type}
            onDismiss={() => removeNotification(notifications[0].id)}
        />
    </div>
  );
};
