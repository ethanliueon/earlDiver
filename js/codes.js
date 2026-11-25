// (7.6.21, owner) codes to redeem in Settings: each once per diver. Add a code here (in capitals) with what it gives:
// pearls, cash, or an item id (and how many). Codes are matched without regard to case or spaces.
export const CODES = {
  WELCOME: { pearls: 10, say: '10 pearls' },
};
export const normCode = (s) => String(s || '').toUpperCase().replace(/\s+/g, '');
