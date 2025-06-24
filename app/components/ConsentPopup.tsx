import React, { useState } from 'react';

interface ConsentPopupProps {
  isVisible: boolean;
  onAccept: () => void;
  onDecline: () => void;
  position: { top: number; left: number };
}

interface LearnMoreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LearnMoreModal: React.FC<LearnMoreModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000]">
      <div className="bg-gray-900 border border-gray-600 rounded-lg p-6 max-w-md mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Privacy Information</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="text-gray-300 text-sm space-y-3">
          <p>
            <strong className="text-white">What data do we store?</strong><br />
            We only store the ticker symbols of cryptocurrencies you mark as favorites (e.g., "BTC", "ETH").
          </p>
          
          <p>
            <strong className="text-white">Where is it stored?</strong><br />
            Your favorites are stored locally in your browser's localStorage. This data never leaves your device.
          </p>
          
          <p>
            <strong className="text-white">Why do we need consent?</strong><br />
            GDPR regulations require consent for any data storage, even when stored locally on your device.
          </p>
          
          <p>
            <strong className="text-white">Can I change my mind?</strong><br />
            Yes! You can revoke consent anytime by clearing your browser data or contacting us.
          </p>
          
          <p>
            <strong className="text-white">Is this data shared?</strong><br />
            No. Your favorites list is private and stored only on your device. We have no access to this information.
          </p>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export const ConsentPopup: React.FC<ConsentPopupProps> = ({ 
  isVisible, 
  onAccept, 
  onDecline, 
  position 
}) => {
  const [showLearnMore, setShowLearnMore] = useState(false);

  if (!isVisible) return null;

  const isMobile = window.innerWidth < 768;

  return (
    <>
      {/* Mobile backdrop */}
      {isMobile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[1400]" />
      )}
      
      <div 
        className="consent-popup-container fixed z-[1500] bg-gray-800 border border-gray-600 rounded-lg p-4 shadow-2xl max-w-sm mx-4"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          transform: isMobile ? 'translate(-50%, -50%)' : 'translateX(-50%)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-white text-sm mb-3">
          <div className="flex items-start space-x-2">
            <div className="w-4 h-4 bg-yellow-400 rounded-full flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-white mb-1">Store favorites locally?</p>
              <p className="text-gray-300 text-xs">
                We use browser storage to remember your favorites. This data stays on your device.
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowLearnMore(true)}
            className="text-blue-400 hover:text-blue-300 text-xs underline"
          >
            Learn more
          </button>
          
          <div className="flex space-x-2">
            <button
              onClick={onDecline}
              className="px-3 py-1 text-xs text-gray-400 hover:text-white border border-gray-600 rounded transition-colors"
            >
              No thanks
            </button>
            <button
              onClick={onAccept}
              className="px-3 py-1 text-xs bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-medium rounded transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      </div>
      
      <LearnMoreModal 
        isOpen={showLearnMore} 
        onClose={() => setShowLearnMore(false)} 
      />
    </>
  );
};