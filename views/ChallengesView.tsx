import React, { useContext, useMemo } from 'react';
import { UserContext } from '../contexts/UserContext';
import { challenges } from '../services/challengeService';
import type { Challenge, ChallengeLevel } from '../types';
import { BadgeIcon } from '../components/Badge';
import { iconMap } from '../components/icons';

const ChallengeCard: React.FC<{ challenge: Challenge }> = ({ challenge }) => {
    const userContext = useContext(UserContext);
    const { currentUser, currentUserCollection } = userContext!;

    const { progress, currentLevel, nextLevel } = useMemo(() => {
        const progress = challenge.checkProgress(currentUser!, currentUserCollection);
        const levels = [...challenge.levels].sort((a,b) => a.threshold - b.threshold);
        let currentLevel: ChallengeLevel | null = null;
        let nextLevel: ChallengeLevel | null = null;

        for (const level of levels) {
            if (progress >= level.threshold) {
                currentLevel = level;
            } else {
                nextLevel = level;
                break;
            }
        }
        return { progress, currentLevel, nextLevel };
    }, [challenge, currentUser, currentUserCollection]);

    const progressPercentage = nextLevel ? (progress / nextLevel.threshold) * 100 : 100;
    const IconComponent = iconMap[challenge.iconName];

    return (
        <div className="p-4 rounded-lg border-2 bg-gray-800 border-gray-700 flex flex-col gap-4">
            <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center bg-gray-700">
                    {IconComponent && <IconComponent className="w-8 h-8 text-indigo-400" />}
                </div>
                <div>
                    <h3 className="font-bold text-lg text-white">{challenge.title}</h3>
                    <p className="text-sm text-gray-400">
                        {nextLevel ? nextLevel.description : (currentLevel ? currentLevel.description : 'No progress yet')}
                    </p>
                </div>
            </div>

            {/* Progress Bar and Text */}
            <div className="w-full">
                <div className="flex justify-between items-center mb-1 text-sm">
                    <span className="text-gray-300">
                        Progress: <strong>{progress} / {nextLevel ? nextLevel.threshold : (currentLevel ? currentLevel.threshold : 'N/A')}</strong>
                    </span>
                    {nextLevel && (
                        <div className="flex items-center gap-1.5" title={nextLevel.badge.description}>
                            <span className="font-semibold text-yellow-400">Next:</span>
                            <BadgeIcon badge={nextLevel.badge} level={nextLevel.level} size="sm" />
                        </div>
                    )}
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3.5">
                    <div 
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3.5 rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                    ></div>
                </div>
            </div>

            {/* Completed Badges */}
            {currentUser!.earnedBadges.length > 0 && (
                <div className="pt-3 border-t border-gray-700/50">
                    <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-xs font-semibold text-gray-400">EARNED:</span>
                        {challenge.levels.map(level => {
                            const isEarned = currentUser!.earnedBadges.some(b => b.name === level.badge.name);
                            if (isEarned) {
                                return (
                                    <BadgeIcon
                                        key={level.badge.name}
                                        badge={level.badge}
                                        level={level.level}
                                        size="sm"
                                    />
                                );
                            }
                            return null;
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export const ChallengesView: React.FC = () => {
    const userContext = useContext(UserContext);

    if (!userContext || !userContext.currentUser) {
        return <p>Loading...</p>;
    }

    return (
        <div>
            <h2 className="text-3xl font-bold mb-6 text-center">Challenges & Achievements</h2>
            
            <div className="max-w-3xl mx-auto space-y-4">
                {challenges.map(challenge => (
                    <ChallengeCard key={challenge.id} challenge={challenge} />
                ))}
            </div>
        </div>
    );
};