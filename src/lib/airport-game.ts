export interface Airport {
  iata: string;
  name: string;
  city_name: string;
  country: string;
  latitude: number;
  longitude: number;
}

export interface GameGuess {
  airport: Airport;
  distance: number;
  direction: string;
  directionIcon: string;
}

// Calculate distance between two airports using Haversine formula
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Determine direction between two airports
export function getDirection(lat1: number, lon1: number, lat2: number, lon2: number): { direction: string; icon: string } {
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  
  // Calculate angle in degrees
  const angle = Math.atan2(dLon, dLat) * 180 / Math.PI;
  
  // Normalize angle to 0-360
  const normalizedAngle = (angle + 360) % 360;
  
  // Map to 8 directions
  const directions = [
    { direction: 'N', icon: '⬆️' },    // 0°
    { direction: 'NE', icon: '↗️' },   // 45°
    { direction: 'E', icon: '➡️' },    // 90°
    { direction: 'SE', icon: '↘️' },   // 135°
    { direction: 'S', icon: '⬇️' },    // 180°
    { direction: 'SW', icon: '↙️' },   // 225°
    { direction: 'W', icon: '⬅️' },    // 270°
    { direction: 'NW', icon: '↖️' }    // 315°
  ];
  
  const index = Math.round(normalizedAngle / 45) % 8;
  return directions[index];
}

// Process a guess and return distance and direction
export function processGuess(targetAirport: Airport, guessedAirport: Airport): GameGuess {
  const distance = calculateDistance(
    targetAirport.latitude,
    targetAirport.longitude,
    guessedAirport.latitude,
    guessedAirport.longitude
  );
  
  const { direction, icon } = getDirection(
    guessedAirport.latitude,
    guessedAirport.longitude,
    targetAirport.latitude,
    targetAirport.longitude
  );
  
  return {
    airport: guessedAirport,
    distance: Math.round(distance),
    direction,
    directionIcon: icon
  };
}

// Check if the game is won
export function isGameWon(guesses: GameGuess[]): boolean {
  return guesses.some(guess => guess.distance === 0);
}

// Check if the game is over (8 tries used)
export function isGameOver(guesses: GameGuess[]): boolean {
  return guesses.length >= 8;
}

// Get game status
export function getGameStatus(guesses: GameGuess[]): 'playing' | 'won' | 'lost' {
  if (isGameWon(guesses)) return 'won';
  if (isGameOver(guesses)) return 'lost';
  return 'playing';
}

// Map direction to Discord-style icon
const directionToIcon: Record<string, string> = {
  N: ':arrow_up:',
  NE: ':arrow_upper_right:',
  E: ':arrow_right:',
  SE: ':arrow_lower_right:',
  S: ':arrow_down:',
  SW: ':arrow_lower_left:',
  W: ':arrow_left:',
  NW: ':arrow_upper_left:',
};

// Format distance for display (full value in km, with thousands separator)
export function formatDistance(distance: number): string {
  if (distance === 0) return '0 km';
  if (distance < 1) return '< 1 km';
  return `${distance.toLocaleString()} km`;
}

// Build share string for guesses with aligned columns
export function buildShareString(guesses: GameGuess[]): string {
  // Get max distance width
  const distStrings = guesses.map((guess) => guess.distance === 0 ? '' : formatDistance(guess.distance));
  const maxDistLen = Math.max(...distStrings.map(s => s.trim().length), 7);
  // Get max icon+dir width
  const iconDirStrings = guesses.map((guess) => guess.distance === 0 ? '' : `${directionToIcon[guess.direction] || ''}${guess.direction}`);
  const maxIconDirLen = Math.max(...iconDirStrings.map(s => s.length), 16);

  return guesses
    .map((guess) => {
      if (guess.distance === 0) {
        // Pad left so green squares align with icon column
        return ' '.repeat(maxDistLen + 1) + ':green_square::green_square::green_square:';
      }
      const dist = formatDistance(guess.distance).trim().padEnd(maxDistLen, ' ');
      const icon = directionToIcon[guess.direction] || '';
      const iconDir = (icon + guess.direction).padEnd(maxIconDirLen, ' ');
      return `${dist} ${iconDir}`;
    })
    .join('\n');
} 