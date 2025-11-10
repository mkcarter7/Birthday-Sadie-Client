// Party configuration
// This file centralizes all party-related settings for easy customization
// To customize for a new party, simply update the values below

export const PARTY_CONFIG = {
  // ===== REQUIRED SETTINGS =====
  // Party ID - hardcoded to 1 for single-party template
  id: '1',

  // ===== PARTY DETAILS =====
  // Basic party information
  name: process.env.NEXT_PUBLIC_PARTY_NAME || 'Sadies 6th Birthday',
  date: process.env.NEXT_PUBLIC_PARTY_DATE || 'Aug 15, 2025',
  time: process.env.NEXT_PUBLIC_PARTY_TIME || '7:00 PM - 11:00 PM',
  location: process.env.NEXT_PUBLIC_PARTY_LOCATION || '274 Minkslide Rd, Bell Buckle, TN 37020',
  theme: process.env.NEXT_PUBLIC_PARTY_THEME || '6 Years Later',

  // ===== SOCIAL LINKS =====
  facebookLive: process.env.NEXT_PUBLIC_FACEBOOK_LIVE_URL || 'https://fb.me/1QpPJy5bhsaiawb',
  venmoUsername: process.env.NEXT_PUBLIC_VENMO_USERNAME || 'isabellaCarter_18',

  // ===== MAP COORDINATES =====
  latitude: process.env.NEXT_PUBLIC_PARTY_LATITUDE || '35.50000000000001',
  longitude: process.env.NEXT_PUBLIC_PARTY_LONGITUDE || '-86.39999999999999',

  // ===== BACKGROUNDS =====
  backgroundImage: process.env.NEXT_PUBLIC_BACKGROUND_IMAGE || '/images/gary-background.jpg',
  loggedInBackgroundImage: process.env.NEXT_PUBLIC_LOGGED_IN_BACKGROUND_IMAGE || '/images/member-background.jpg',

  // ===== THEME CUSTOMIZATION =====
  // Colors and styling - customize these for each party
  primaryColor: process.env.NEXT_PUBLIC_PRIMARY_COLOR || '#3B82F6', // Main brand color
  secondaryColor: process.env.NEXT_PUBLIC_SECONDARY_COLOR || '#8B5CF6', // Secondary brand color
  accentColor: process.env.NEXT_PUBLIC_ACCENT_COLOR || '#F59E0B', // Accent/highlight color

  // ===== FEATURES =====
  // Enable/disable features
  enablePhotos: process.env.NEXT_PUBLIC_ENABLE_PHOTOS !== 'false',
  enableRSVP: process.env.NEXT_PUBLIC_ENABLE_RSVP !== 'false',
  enableGames: process.env.NEXT_PUBLIC_ENABLE_GAMES !== 'false',
  enableGifts: process.env.NEXT_PUBLIC_ENABLE_GIFTS !== 'false',
  enableGuestbook: process.env.NEXT_PUBLIC_ENABLE_GUESTBOOK !== 'false',
  enableTimeline: process.env.NEXT_PUBLIC_ENABLE_TIMELINE !== 'false',

  // ===== MESSAGING =====
  // Custom messages
  welcomeMessage: process.env.NEXT_PUBLIC_WELCOME_MESSAGE || 'Join us for an unforgettable celebration!',
  rsvpMessage: process.env.NEXT_PUBLIC_RSVP_MESSAGE || 'Please let us know if you can make it!',
  giftMessage: process.env.NEXT_PUBLIC_GIFT_MESSAGE || "Your presence is the greatest gift, but if you'd like to contribute...",
  thankYouTitle: process.env.NEXT_PUBLIC_THANK_YOU_TITLE || 'Thank You!',
  thankYouMessage: process.env.NEXT_PUBLIC_THANK_YOU_MESSAGE || "Ivy's 2nd birthday party was absolutely magical thanks to all of you! Your presence, gifts, and memories made this celebration unforgettable.",
  thankYouSubmessage: process.env.NEXT_PUBLIC_THANK_YOU_SUBMESSAGE || 'Photos and memories from the party are now available in the gallery.',
};

// Validation
export const validatePartyConfig = () => {
  const errors = [];

  if (!PARTY_CONFIG.id) {
    errors.push('NEXT_PUBLIC_PARTY_ID is required in .env.local');
  }
  // Only warn if name is missing entirely; allow default name without warning
  if (!PARTY_CONFIG.name) {
    errors.push('Please set PARTY_CONFIG.name');
  }

  if (!PARTY_CONFIG.location || PARTY_CONFIG.location.includes('274 Minkslide Rd')) {
    errors.push('Consider customizing PARTY_CONFIG.location for your party');
  }

  return errors;
};

// Helper functions
export const getPartyDisplayName = () => PARTY_CONFIG.name;
export const getPartyDate = () => `${PARTY_CONFIG.date} · ${PARTY_CONFIG.time}`;
export const getPartyLocation = () => PARTY_CONFIG.location;
export const getPartyTheme = () => PARTY_CONFIG.theme;
