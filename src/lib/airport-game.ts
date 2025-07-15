export interface Airport {
  iata: string;
  name: string;
  city_name: string;
  country: string;
  country_code?: string;
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
  const toRad = (x: number) => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);

  // Compute both eastward and westward longitude differences
  const dLonEast = toRad(((lon2 - lon1 + 360) % 360));
  const dLonWest = toRad(((lon1 - lon2 + 360) % 360));

  // Haversine for eastward
  const aEast =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLonEast / 2) * Math.sin(dLonEast / 2);
  const cEast = 2 * Math.atan2(Math.sqrt(aEast), Math.sqrt(1 - aEast));
  const distEast = R * cEast;

  // Haversine for westward
  const aWest =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLonWest / 2) * Math.sin(dLonWest / 2);
  const cWest = 2 * Math.atan2(Math.sqrt(aWest), Math.sqrt(1 - aWest));
  const distWest = R * cWest;

  // Return the shorter distance
  return Math.min(distEast, distWest);
}

// Determine direction between two airports, matching the shortest path (east or west)
export function getDirection(lat1: number, lon1: number, lat2: number, lon2: number, useEast: boolean): { direction: string; icon: string } {
  const toRad = (x: number) => x * Math.PI / 180;
  const toDeg = (x: number) => x * 180 / Math.PI;
  const dLat = lat2 - lat1;
  let dLon;
  if (useEast) {
    dLon = ((lon2 - lon1 + 360) % 360);
    if (dLon > 180) dLon -= 360; // Normalize to [-180, 180]
  } else {
    dLon = -((lon1 - lon2 + 360) % 360);
    if (dLon < -180) dLon += 360;
  }
  // Calculate angle in degrees (bearing from guessed to target)
  const angle = toDeg(Math.atan2(toRad(dLon), toRad(dLat)));
  const normalizedAngle = (angle + 360) % 360;
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

// Process a guess and return distance and direction (matching shortest path)
export function processGuess(targetAirport: Airport, guessedAirport: Airport): GameGuess {
  const lat1 = targetAirport.latitude;
  const lon1 = targetAirport.longitude;
  const lat2 = guessedAirport.latitude;
  const lon2 = guessedAirport.longitude;
  const toRad = (x: number) => x * Math.PI / 180;
  const dLat = toRad(lat1 - lat2);
  // Compute both eastward and westward longitude differences
  const dLonEast = toRad(((lon1 - lon2 + 360) % 360));
  const dLonWest = toRad(((lon2 - lon1 + 360) % 360));
  // Haversine for eastward
  const aEast =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat2)) * Math.cos(toRad(lat1)) *
    Math.sin(dLonEast / 2) * Math.sin(dLonEast / 2);
  const cEast = 2 * Math.atan2(Math.sqrt(aEast), Math.sqrt(1 - aEast));
  const distEast = 6371 * cEast;
  // Haversine for westward
  const aWest =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat2)) * Math.cos(toRad(lat1)) *
    Math.sin(dLonWest / 2) * Math.sin(dLonWest / 2);
  const cWest = 2 * Math.atan2(Math.sqrt(aWest), Math.sqrt(1 - aWest));
  const distWest = 6371 * cWest;
  // Use the shorter path
  const useEast = distEast <= distWest;
  const distance = Math.round(Math.min(distEast, distWest));
  const { direction, icon } = getDirection(lat2, lon2, lat1, lon1, useEast);
  return {
    airport: guessedAirport,
    distance,
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

// Map direction to emoji
const directionToEmoji: Record<string, string> = {
  N: '⬆️',
  NE: '↗️',
  E: '➡️',
  SE: '↘️',
  S: '⬇️',
  SW: '↙️',
  W: '⬅️',
  NW: '↖️',
};

// Format distance for display (full value in miles, with thousands separator)
export function formatDistance(distance: number): string {
  if (distance === 0) return '0 mi';
  if (distance < 1) return '< 1 mi';
  const miles = Math.round(distance * 0.621371);
  return `${miles.toLocaleString()} mi`;
}

// Build share string for guesses with aligned columns (using emoji)
export function buildShareString(guesses: GameGuess[]): string {
  // Get max distance width
  const distStrings = guesses.map((guess) => guess.distance === 0 ? '' : formatDistance(guess.distance));
  const maxDistLen = Math.max(...distStrings.map(s => s.trim().length), 7);
  // Get max icon+dir width
  const iconDirStrings = guesses.map((guess) => guess.distance === 0 ? '' : `${directionToEmoji[guess.direction] || ''}${guess.direction}`);
  const maxIconDirLen = Math.max(...iconDirStrings.map(s => s.length), 4);

  return guesses
    .map((guess) => {
      if (guess.distance === 0) {
        // Pad left so green squares align with icon column
        return ' '.repeat(maxDistLen + 1) + '🟩🟩🟩';
      }
      const dist = formatDistance(guess.distance).trim().padEnd(maxDistLen, ' ');
      const icon = directionToEmoji[guess.direction] || '';
      const iconDir = (icon + guess.direction).padEnd(maxIconDirLen, ' ');
      return `${dist} ${iconDir}`;
    })
    .join('\n');
} 