// Allowed airlines list
export const ALLOWED_AIRLINES = [
  'EI','LX','UX','WS','VJ','DE','4Y','WK','EW','FI','AZ','HO','VA','EN','CZ','DL','HA','B6','AA','UA','NK','F9','G4','AS','A3','NZ','OZ','MS','SA','TP','SN','AV','OU','MX','ME','KQ','MF','RO','AR','AM','SK','ZH','LA','AY','JX','FJ','KL','RJ','UL','AT','AC','LO','IB','CA','MU','TK','GA','MH','JL', 'NH', 'QR', 'AF', 'LH','BA','SQ','EK','KE','AI','EY','TG','QF','CX','VN','CI','BR','VS','SV','CM','ET','PR','OS'
];

// Month names array
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Day names for calendar
export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Calendar cell dimensions
export const CALENDAR_CELL_WIDTH = 190;
export const CALENDAR_CELL_MIN_HEIGHT = 150;

// Time periods for analysis
export const TIME_PERIODS = [
  { label: 'Last 3 days', days: 3 },
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 14 days', days: 14 },
  { label: 'Last 28 days', days: 28 },
  { label: 'Last 60 days', days: 60 },
  { label: 'Last 180 days', days: 180 },
  { label: 'Last 360 days', days: 360 }
];

// Status colors
export const STATUS_COLORS = {
  ON_TIME: '#4caf50',
  EARLY: '#4caf50',
  MINOR_DELAY: '#ffc107',
  MAJOR_DELAY: '#f44336',
  CANCELED: '#000000',
  DIVERTED: '#9c27b0',
  NO_INFO: '#9e9e9e'
} as const;