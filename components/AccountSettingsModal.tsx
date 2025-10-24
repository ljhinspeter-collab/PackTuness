import React, { useContext } from 'react';
import { UserContext } from '../contexts/UserContext';

export const AccountSettingsModal: React.FC<{ onClose: () => void; }> = ({ onClose }) => {
    const { signOut } = useContext(UserContext)!;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content w-full max-w-md bg-gray-800 rounded-lg p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <h3 className="text-2xl font-bold mb-6">Account Settings</h3>
                
                <div className="space-y-6">
                     {/* Sign Out */}
                     <div>
                         <h4 className="text-lg font-semibold mb-3 text-gray-300">Authentication</h4>
                          <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                             <p className="text-sm text-gray-400 mb-3">Sign out of your current account.</p>
                             <button onClick={signOut} className="w-full py-2 bg-red-600/80 hover:bg-red-700 rounded-md font-semibold transition-colors">
                                Sign Out
                             </button>
                         </div>
                    </div>
                </div>

                <div className="flex justify-end mt-8">
                     <button onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md">Close</button>
                </div>
            </div>
        </div>
    );
};