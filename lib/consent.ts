// Consent management for localStorage usage
export const CONSENT_KEY = 'favorites_consent_given';

export interface ConsentManager {
  hasConsent: () => boolean;
  giveConsent: () => void;
  revokeConsent: () => void;
  getFavorites: () => string[];
  setFavorites: (favorites: string[]) => void;
  addFavorite: (symbol: string) => void;
  removeFavorite: (symbol: string) => void;
  clearAllData: () => void;
}

export const consentManager: ConsentManager = {
  hasConsent: (): boolean => {
    try {
      return localStorage.getItem(CONSENT_KEY) === 'true';
    } catch {
      return false;
    }
  },

  giveConsent: (): void => {
    try {
      localStorage.setItem(CONSENT_KEY, 'true');
      // Dispatch event to notify components
      window.dispatchEvent(new CustomEvent('consentGiven'));
    } catch (error) {
      console.warn('Unable to store consent preference:', error);
    }
  },

  revokeConsent: (): void => {
    try {
      // Clear all favorites-related data
      localStorage.removeItem(CONSENT_KEY);
      localStorage.removeItem('cryptoFavorites');
      // Dispatch event to notify components
      window.dispatchEvent(new CustomEvent('consentRevoked'));
      window.dispatchEvent(new CustomEvent('favoritesChanged'));
    } catch (error) {
      console.warn('Unable to clear consent data:', error);
    }
  },

  getFavorites: (): string[] => {
    if (!consentManager.hasConsent()) return [];
    try {
      return JSON.parse(localStorage.getItem('cryptoFavorites') || '[]');
    } catch {
      return [];
    }
  },

  setFavorites: (favorites: string[]): void => {
    if (!consentManager.hasConsent()) return;
    try {
      localStorage.setItem('cryptoFavorites', JSON.stringify(favorites));
      window.dispatchEvent(new CustomEvent('favoritesChanged'));
    } catch (error) {
      console.warn('Unable to store favorites:', error);
    }
  },

  addFavorite: (symbol: string): void => {
    if (!consentManager.hasConsent()) return;
    const favorites = consentManager.getFavorites();
    if (!favorites.includes(symbol)) {
      consentManager.setFavorites([...favorites, symbol]);
    }
  },

  removeFavorite: (symbol: string): void => {
    if (!consentManager.hasConsent()) return;
    const favorites = consentManager.getFavorites();
    consentManager.setFavorites(favorites.filter(fav => fav !== symbol));
  },

  clearAllData: (): void => {
    try {
      localStorage.removeItem(CONSENT_KEY);
      localStorage.removeItem('cryptoFavorites');
      window.dispatchEvent(new CustomEvent('favoritesChanged'));
    } catch (error) {
      console.warn('Unable to clear data:', error);
    }
  }
};