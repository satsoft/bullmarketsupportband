import React, { createContext, useContext, useState, useCallback } from 'react';
import { ConsentPopup } from './ConsentPopup';
import { consentManager } from '../../lib/consent';

interface ConsentContextType {
  showConsentPopup: (position: { top: number; left: number }, onAccept: () => void) => void;
  hideConsentPopup: () => void;
}

const ConsentContext = createContext<ConsentContextType | null>(null);

export const useConsentPopup = () => {
  const context = useContext(ConsentContext);
  if (!context) {
    throw new Error('useConsentPopup must be used within ConsentProvider');
  }
  return context;
};

interface ConsentProviderProps {
  children: React.ReactNode;
}

export const ConsentProvider: React.FC<ConsentProviderProps> = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [onAcceptCallback, setOnAcceptCallback] = useState<(() => void) | null>(null);

  const showConsentPopup = useCallback((pos: { top: number; left: number }, onAccept: () => void) => {
    // Check if we're on mobile and adjust positioning
    const isMobile = window.innerWidth < 768;
    
    if (isMobile) {
      // Center the popup on mobile screens
      setPosition({
        top: window.innerHeight / 2 - 100, // Center vertically, accounting for popup height
        left: window.innerWidth / 2 // Center horizontally
      });
    } else {
      setPosition(pos);
    }
    
    setOnAcceptCallback(() => onAccept);
    setIsVisible(true);
  }, []);

  const hideConsentPopup = useCallback(() => {
    setIsVisible(false);
    setOnAcceptCallback(null);
  }, []);

  const handleAccept = useCallback(() => {
    consentManager.giveConsent();
    if (onAcceptCallback) {
      onAcceptCallback();
    }
    hideConsentPopup();
  }, [onAcceptCallback, hideConsentPopup]);

  const handleDecline = useCallback(() => {
    hideConsentPopup();
  }, [hideConsentPopup]);

  return (
    <ConsentContext.Provider value={{ showConsentPopup, hideConsentPopup }}>
      {children}
      <ConsentPopup
        isVisible={isVisible}
        onAccept={handleAccept}
        onDecline={handleDecline}
        position={position}
      />
    </ConsentContext.Provider>
  );
};