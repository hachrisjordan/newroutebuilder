'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Airport, GameGuess, processGuess, getGameStatus, formatDistance, buildShareString } from '@/lib/airport-game';
import { AirportGameSearch } from '@/components/airport-game-search';

const MODES = [
  { label: 'Daily', value: 'daily' },
  { label: 'Practice', value: 'practice' },
];

type Mode = 'daily' | 'practice';

function getSecondsUntilMidnightUTC() {
  const now = new Date();
  const nextMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  return Math.floor((nextMidnight.getTime() - now.getTime()) / 1000);
}

function formatCountdown(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function FindAirportPage() {
  const [mode, setMode] = useState<Mode>('daily');
  const [targetAirport, setTargetAirport] = useState<Airport | null>(null);
  const [guesses, setGuesses] = useState<GameGuess[]>([]);
  const [codeLetters, setCodeLetters] = useState(['', '', '']);
  const [selectedAirport, setSelectedAirport] = useState<Airport | null>(null);
  const [gameStatus, setGameStatus] = useState<'loading' | 'playing' | 'won' | 'lost'>('loading');
  const [error, setError] = useState<string>('');
  const [airportsCache, setAirportsCache] = useState<Record<string, Airport>>({});
  const [copied, setCopied] = useState(false);
  const inputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const [countdown, setCountdown] = useState(getSecondsUntilMidnightUTC());

  // Local storage key based on airport and date
  const getStorageKey = (airport: Airport | null) => {
    if (!airport) return '';
    const today = new Date().toISOString().split('T')[0];
    return `airport-game-${airport.iata}-${today}`;
  };

  // Restore state from localStorage (only in daily mode)
  useEffect(() => {
    if (mode !== 'daily') return;
    if (!targetAirport) return;
    const key = getStorageKey(targetAirport);
    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setGuesses(parsed.guesses || []);
        setCodeLetters(parsed.codeLetters || ['', '', '']);
      } catch {}
    }
  }, [targetAirport, mode]);

  // Save state to localStorage after each guess (only in daily mode)
  useEffect(() => {
    if (mode !== 'daily') return;
    if (!targetAirport) return;
    const key = getStorageKey(targetAirport);
    localStorage.setItem(key, JSON.stringify({ guesses, codeLetters }));
  }, [guesses, codeLetters, targetAirport, mode]);

  // Countdown timer to midnight UTC
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(getSecondsUntilMidnightUTC());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch the target airport on component mount or mode change
  useEffect(() => {
    fetchTargetAirport();
    // Preload all airports for code validation
    fetchAllAirports();
    // Reset state on mode change
    setGuesses([]);
    setCodeLetters(['', '', '']);
    setSelectedAirport(null);
    setGameStatus('loading');
    setError('');
  }, [mode]);

  // Update game status when guesses change
  useEffect(() => {
    if (targetAirport && guesses.length > 0) {
      const status = getGameStatus(guesses);
      setGameStatus(status);
    }
  }, [guesses, targetAirport]);

  // If an airport is selected from search, fill the code boxes
  useEffect(() => {
    if (selectedAirport) {
      setCodeLetters(selectedAirport.iata.toUpperCase().split(''));
    }
  }, [selectedAirport]);

  const fetchTargetAirport = async () => {
    try {
      setError('');
      let url = '/api/airport-game';
      if (mode === 'practice') {
        url += '?practice=1';
      }
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch target airport');
      }
      const data = await response.json();
      const backendAirport = data.airport;
      setTargetAirport(backendAirport);
      setGameStatus('playing');

      if (mode === 'daily') {
        // --- True reset logic ---
        const today = new Date().toISOString().split('T')[0];
        const localKey = `airport-game-${backendAirport.iata}-${today}`;
        const allKeys = Object.keys(localStorage);
        // Find any airport-game-*-{today} key that does not match backendAirport.iata
        allKeys.forEach((key) => {
          if (key.startsWith('airport-game-') && key.endsWith(today) && key !== localKey) {
            localStorage.removeItem(key);
          }
        });
        // If the current localStorage key exists but is for a different airport, clear it
        const cached = localStorage.getItem(localKey);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed && parsed.guesses && parsed.guesses[0] && parsed.guesses[0].airport && parsed.guesses[0].airport.iata !== backendAirport.iata) {
              localStorage.removeItem(localKey);
              setGuesses([]);
              setCodeLetters(['', '', '']);
            }
          } catch {}
        }
        // --- End true reset logic ---
      }
    } catch (err) {
      setError('Failed to load the game. Please try again.');
      setGameStatus('playing'); // Allow retry
    }
  };

  // Preload all airports for code validation
  const fetchAllAirports = async () => {
    try {
      let page = 1;
      let allAirports: Airport[] = [];
      while (true) {
        const response = await fetch(`/api/airports?page=${page}&pageSize=100`);
        if (!response.ok) break;
        const data = await response.json();
        if (!data.airports || data.airports.length === 0) break;
        allAirports = allAirports.concat(data.airports);
        if (data.airports.length < 100) break;
        page++;
      }
      const cache: Record<string, Airport> = {};
      allAirports.forEach((a) => {
        cache[a.iata.toUpperCase()] = a;
      });
      setAirportsCache(cache);
    } catch (e) {
      // fallback: no validation
    }
  };

  const handleCodeInput = (idx: number, value: string) => {
    if (!/^[A-Za-z]?$/.test(value)) return;
    const newLetters = [...codeLetters];
    newLetters[idx] = value.toUpperCase();
    setCodeLetters(newLetters);
    setSelectedAirport(null); // manual typing clears selection
    setError('');
    // Auto-advance
    if (value && idx < 2) {
      inputRefs[idx + 1].current?.focus();
    }
    // Auto-submit if all filled and valid
    if (newLetters.every((l) => l.length === 1)) {
      const code = newLetters.join('').toUpperCase();
      if (airportsCache[code]) {
        setSelectedAirport(airportsCache[code]);
      }
    }
  };

  const handleCodeKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !codeLetters[idx] && idx > 0) {
      inputRefs[idx - 1].current?.focus();
    }
    // Submit on Enter/Return if all 3 letters are filled and code is valid
    if ((e.key === 'Enter' || e.key === 'Return') && codeLetters.every((l) => l.length === 1)) {
      const code = codeLetters.join('').toUpperCase();
      if (airportsCache[code]) {
        handleSubmit();
      }
    }
  };

  const handleSubmit = () => {
    const code = codeLetters.join('').toUpperCase();
    const airport = airportsCache[code];
    if (!airport) {
      setError('Not a valid airport code.');
      return;
    }
    if (!targetAirport) return;
    const guess = processGuess(targetAirport, airport);
    setGuesses((prev) => [...prev, guess]);
    setCodeLetters(['', '', '']);
    setSelectedAirport(null);
    setError('');
    inputRefs[0].current?.focus();
  };

  const handleReset = () => {
    setGuesses([]);
    setCodeLetters(['', '', '']);
    setSelectedAirport(null);
    setGameStatus('loading');
    setError('');
    fetchTargetAirport();
  };

  const handleShare = () => {
    if (!targetAirport) return;
    let result = buildShareString(guesses);
    result += '\n\nTry Find the Airport Game at https://bbairtools.com/find-airport';
    navigator.clipboard.writeText(result.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderGuessRow = (guess: GameGuess, index: number) => (
    <div key={index} className="flex items-center gap-2 p-2 border rounded-lg bg-muted/50">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-sm">
            {guess.airport.iata}
          </Badge>
          <span className="text-sm font-medium">{guess.airport.name}</span>
        </div>
        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          <span>{guess.airport.city_name}, {guess.airport.country}</span>
          {guess.airport.country_code && (
            <span className={`fi fi-${guess.airport.country_code.toLowerCase()}`} title={guess.airport.country_code} style={{ width: 18, height: 12, minWidth: 18, minHeight: 12, display: 'inline-block', borderRadius: 4, overflow: 'hidden' }}></span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{formatDistance(guess.distance)}</span>
        <span className="text-lg">{guess.directionIcon}</span>
        <span className="text-xs text-muted-foreground">{guess.direction}</span>
      </div>
    </div>
  );

  const renderEmptyRows = () => {
    const remainingRows = 8 - guesses.length;
    return Array.from({ length: remainingRows }, (_, index) => (
      <div key={`empty-${index}`} className="flex items-center gap-2 p-2 border rounded-lg bg-muted/20">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="w-12 h-6 bg-muted rounded animate-pulse"></div>
            <div className="h-4 bg-muted rounded animate-pulse flex-1"></div>
          </div>
          <div className="h-3 bg-muted rounded animate-pulse mt-1 w-2/3"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-16 h-4 bg-muted rounded animate-pulse"></div>
          <div className="w-6 h-6 bg-muted rounded animate-pulse"></div>
        </div>
      </div>
    ));
  };

  if (gameStatus === 'loading') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Find the Airport</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading today's airport...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex justify-center mb-4">
        <fieldset className="flex gap-4 items-center" aria-label="Game Mode">
          {MODES.map((m) => (
            <label key={m.value} className="flex items-center gap-1 cursor-pointer select-none">
              <input
                type="radio"
                name="game-mode"
                value={m.value}
                checked={mode === m.value}
                onChange={() => setMode(m.value as Mode)}
                className="accent-primary h-4 w-4 border-gray-300 focus:ring-primary"
                aria-checked={mode === m.value}
              />
              <span className={`text-sm font-medium ${mode === m.value ? 'text-primary' : 'text-muted-foreground'}`}>{m.label}</span>
            </label>
          ))}
        </fieldset>
      </div>
      <div className="text-center mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{mode === 'daily' ? 'Daily Mode' : 'Practice Mode'}</span>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Find the Airport</CardTitle>
          <p className="text-center text-muted-foreground">
            Guess the international airport in 8 tries. Each guess shows distance and direction.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          {/* Game Status */}
          {gameStatus === 'won' && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
              <p className="text-green-600 font-medium">🎉 Congratulations! You found the airport!</p>
              <p className="text-sm text-muted-foreground mt-1">
                The airport was: {targetAirport?.name} ({targetAirport?.iata})
              </p>
            </div>
          )}

          {gameStatus === 'lost' && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
              <p className="text-red-600 font-medium">Game Over!</p>
              <p className="text-sm text-muted-foreground mt-1">
                The airport was: {targetAirport?.name} ({targetAirport?.iata})
              </p>
            </div>
          )}

          {/* Input Section */}
          {gameStatus === 'playing' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 justify-center">
                {codeLetters.map((letter, idx) => (
                  <input
                    key={idx}
                    ref={inputRefs[idx]}
                    type="text"
                    maxLength={1}
                    value={letter}
                    onChange={(e) => handleCodeInput(idx, e.target.value)}
                    onKeyDown={(e) => handleCodeKeyDown(idx, e)}
                    className="w-12 h-12 text-2xl text-center font-mono border rounded focus:ring-2 focus:ring-primary bg-background uppercase mx-1"
                    autoFocus={idx === 0}
                  />
                ))}
                <Button
                  onClick={handleSubmit}
                  disabled={codeLetters.some((l) => l.length !== 1) || !airportsCache[codeLetters.join('').toUpperCase()]}
                  className="ml-4"
                >
                  Submit
                </Button>
              </div>
            </div>
          )}

          {/* Guesses Display */}
          <div className="space-y-2">
            <h3 className="font-medium">Your Guesses ({guesses.length}/8)</h3>
            {guesses.map(renderGuessRow)}
            {renderEmptyRows()}
          </div>

          {/* Share Button & Countdown */}
          {(gameStatus === 'won' || gameStatus === 'lost') && (
            <div className="text-center space-y-2">
              <Button onClick={handleShare} variant="secondary">
                {copied ? 'Copied!' : 'Share Results'}
              </Button>
              <div className="text-muted-foreground mt-2">
                Airport will be reset in <span className="font-mono">{formatCountdown(countdown)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 