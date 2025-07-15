'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShortestRouteChallenge, ShortestRouteGuess } from '@/types/shortest-route';
import { Check, X } from 'lucide-react';

const MODES = [
  { label: 'Daily', value: 'daily' },
  { label: 'Practice', value: 'practice' },
];
// Remove STOP_MODES and stopCount selector
// Always use 2 stops

type Mode = 'daily' | 'practice';

export default function ShortestRoutePage() {
  const [mode, setMode] = useState<Mode>('daily');
  // Remove stopCount from state, always use 2
  const stopCount = 2;
  const [challenge, setChallenge] = useState<ShortestRouteChallenge | null>(null);
  const [guesses, setGuesses] = useState<ShortestRouteGuess[]>([]);
  // Instead of a single box per hub, use 3 boxes per hub (like Find Airport)
  const [hubInputs, setHubInputs] = useState([
    ['', '', ''], // hub1
    ['', '', ''], // hub2
  ]);
  const [error, setError] = useState('');
  const [gameStatus, setGameStatus] = useState<'loading' | 'playing' | 'won' | 'lost'>('loading');
  // Refs for all input boxes
  const inputRefs = [
    [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)],
    [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)],
  ];
  const [airportsCache, setAirportsCache] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const ALLIANCE_LABELS: Record<string, string> = {
    ST: 'SkyTeam',
    SA: 'Star Alliance',
    OW: 'Oneworld',
  };

  // Local storage key based on challenge and date
  const getStorageKey = (challenge: ShortestRouteChallenge | null) => {
    if (!challenge) return '';
    const today = new Date().toISOString().split('T')[0];
    return `shortest-route-${challenge.id}-${today}`;
  };

  // Helper to normalize hubInputs shape
  function normalizeHubInputs(input: any, stopCount: number) {
    return Array.from({ length: stopCount }).map((_, i) =>
      Array.isArray(input?.[i]) && input[i].length === 3
        ? input[i]
        : ['', '', '']
    );
  }

  // Restore state from localStorage (only in daily mode)
  useEffect(() => {
    if (mode !== 'daily') return;
    if (!challenge) return;
    const key = getStorageKey(challenge);
    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setGuesses(parsed.guesses || []);
        setHubInputs(normalizeHubInputs(parsed.hubInputs, challenge.stopCount));
      } catch {}
    }
  }, [challenge, mode]);

  // Save state to localStorage after each guess (only in daily mode)
  useEffect(() => {
    if (mode !== 'daily') return;
    if (!challenge) return;
    const key = getStorageKey(challenge);
    localStorage.setItem(key, JSON.stringify({ guesses, hubInputs }));
  }, [guesses, hubInputs, challenge, mode]);

  // Always reset to correct shape
  useEffect(() => {
    fetchChallenge();
    setGuesses([]);
    setHubInputs([['', '', ''], ['', '', '']]);
    setGameStatus('loading');
    setError('');
  }, [mode, stopCount]);

  // Preload all airports for code validation
  useEffect(() => {
    const fetchAllAirports = async () => {
      let page = 1;
      let allCodes: string[] = [];
      while (true) {
        const response = await fetch(`/api/airports?page=${page}&pageSize=100`);
        if (!response.ok) break;
        const data = await response.json();
        if (!data.airports || data.airports.length === 0) break;
        allCodes = allCodes.concat(data.airports.map((a: any) => a.iata.toUpperCase()));
        if (data.airports.length < 100) break;
        page++;
      }
      const cache: Record<string, boolean> = {};
      allCodes.forEach((iata) => {
        cache[iata] = true;
      });
      setAirportsCache(cache);
    };
    fetchAllAirports();
  }, []);

  // Countdown timer to midnight UTC (for daily mode)
  useEffect(() => {
    if (mode !== 'daily') return;
    const getSecondsUntilMidnightUTC = () => {
      const now = new Date();
      const nextMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
      return Math.floor((nextMidnight.getTime() - now.getTime()) / 1000);
    };
    setCountdown(getSecondsUntilMidnightUTC());
    const interval = setInterval(() => {
      setCountdown(getSecondsUntilMidnightUTC());
    }, 1000);
    return () => clearInterval(interval);
  }, [mode]);
  function formatCountdown(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  const fetchChallenge = async () => {
    setGameStatus('loading');
    setGuesses([]);
    setHubInputs([['', '', ''], ['', '', '']]);
    setError('');
    const params = new URLSearchParams({ mode, stopCount: String(stopCount) });
    const res = await fetch(`/api/shortest-route?${params}`);
    const data = await res.json();
    setChallenge(data.challenge);
    setGameStatus('playing');
  };

  const handleShare = () => {
    if (!challenge) return;
    let result = '';
    if (mode === 'practice') {
      // Show route for each guess
      result = guesses
        .map((g) =>
          [challenge.origin, ...g.hubs, challenge.destination].join('-') +
          ': ' +
          (g.isValid
            ? `${g.totalDistance} mi ${g.differenceFromShortest === 0 ? '0%' : (g.differenceFromShortest !== undefined ? `+${((g.differenceFromShortest / challenge.shortestDistance) * 100).toFixed(1)}%` : '')}`
            : g.error || '')
        )
        .join('\n');
    } else {
      // Daily mode: show emoji squares for each hub (green, yellow, red)
      const correctHubs = challenge.shortestRoute.slice(1, -1);
      result = guesses
        .map((g) => {
          // Compute feedback for each hub (same as UI)
          const matched = [false, false];
          const feedback: ("green" | "yellow" | "red")[] = g.hubs.map((hub, idx) => {
            if (hub === correctHubs[idx]) {
              matched[idx] = true;
              return "green";
            }
            return undefined as unknown as "green" | "yellow" | "red";
          });
          g.hubs.forEach((hub, idx) => {
            if (feedback[idx] === undefined) {
              const otherIdx = correctHubs.findIndex((h, j) => h === hub && !matched[j] && j !== idx);
              if (otherIdx !== -1) {
                matched[otherIdx] = true;
                feedback[idx] = "yellow";
              } else {
                feedback[idx] = "red";
              }
            }
          });
          return (
            feedback.map(f => f === 'green' ? '🟩' : f === 'yellow' ? '🟨' : '🟥').join('') +
            (g.isValid
              ? ` ${g.totalDistance} mi ${g.differenceFromShortest === 0 ? '0%' : (g.differenceFromShortest !== undefined ? `+${((g.differenceFromShortest / challenge.shortestDistance) * 100).toFixed(1)}%` : '')}`
              : ` ${g.error || ''}`)
          );
        })
        .join('\n');
    }
    result += '\n\nTry Shortest Route Game at https://bbairtools.com/shortest-route';
    navigator.clipboard.writeText(result.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const handleNewPracticeGame = () => {
    setGuesses([]);
    setHubInputs([['', '', ''], ['', '', '']]);
    setError('');
    setGameStatus('loading');
    fetchChallenge();
  };
  const handleGiveUp = () => {
    setGameStatus('lost');
  };

  // Handle input for each box
  const handleHubInput = (hubIdx: number, charIdx: number, value: string) => {
    if (!/^[A-Za-z]?$/.test(value)) return;
    const newInputs = hubInputs.map(arr => [...arr]);
    newInputs[hubIdx][charIdx] = value.toUpperCase();
    setHubInputs(newInputs);
    setError('');
    // Auto-advance
    if (value && charIdx < 2) {
      inputRefs[hubIdx][charIdx + 1].current?.focus();
    } else if (value && charIdx === 2 && hubIdx < (challenge?.stopCount === 2 ? 1 : 0)) {
      inputRefs[hubIdx + 1][0].current?.focus();
    }
  };
  const handleHubKeyDown = (hubIdx: number, charIdx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !hubInputs[hubIdx][charIdx] && charIdx > 0) {
      inputRefs[hubIdx][charIdx - 1].current?.focus();
    } else if (e.key === 'Backspace' && !hubInputs[hubIdx][charIdx] && charIdx === 0 && hubIdx > 0) {
      inputRefs[hubIdx - 1][2].current?.focus();
    }
    // Submit on Enter if all filled
    if ((e.key === 'Enter' || e.key === 'Return') && isReadyToSubmit()) {
      handleSubmit();
    }
  };
  const isReadyToSubmit = () => {
    if (!challenge) return false;
    // All boxes filled
    const allFilled = hubInputs.every((arr) => arr.every((c) => c.length === 1));
    if (!allFilled) return false;
    // All hubs are valid airport codes
    const allValid = hubInputs.every((arr) => airportsCache[arr.join('')]);
    return allValid;
  };
  const handleSubmit = async () => {
    if (!challenge) return;
    // Validate hubs
    const invalidIdx = hubInputs.findIndex((arr) => !airportsCache[arr.join('')]);
    if (invalidIdx !== -1) {
      return;
    }
    const hubs = hubInputs.map((arr) => arr.join(''));
    const res = await fetch('/api/shortest-route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hubs, challengeId: challenge.id }),
    });
    const data = await res.json();
    const guess: ShortestRouteGuess = data.guess;
    setError(guess.error || '');
    if (!guess.isValid) {
      // Do not add to guesses or clear input
      return;
    }
    setGuesses((prev) => [...prev, guess]);
    setHubInputs([['', '', ''], ['', '', '']]);
    // Win if minimal
    if (guess.differenceFromShortest === 0) {
      setGameStatus('won');
    } else if (guesses.length + 1 >= challenge.tries) {
      setGameStatus('lost');
    }
    inputRefs[0][0].current?.focus();
  };

  if (gameStatus === 'loading' || !challenge) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Shortest Route</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading challenge...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex justify-center mb-4 gap-8">
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
        {/* Remove stopCount selector from UI */}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Shortest Route</CardTitle>
          <p className="text-center text-muted-foreground">
            Find the shortest {challenge.stopCount}-stop route from <Badge>{challenge.origin}</Badge> to <Badge>{challenge.destination}</Badge> on <Badge>{ALLIANCE_LABELS[challenge.alliance] || challenge.alliance}</Badge>.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}
          {gameStatus === 'won' && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
              <p className="text-green-600 font-medium">🎉 You found the shortest route!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Route: {[challenge.origin, ...challenge.shortestRoute.slice(1, -1), challenge.destination].join(' - ')} ({challenge.shortestDistance} mi)
              </p>
            </div>
          )}
          {gameStatus === 'lost' && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
              <p className="text-red-600 font-medium">Game Over!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Shortest route was: {[challenge.origin, ...challenge.shortestRoute.slice(1, -1), challenge.destination].join(' - ')} ({challenge.shortestDistance} mi)
              </p>
            </div>
          )}
          {gameStatus === 'playing' && (
            <div className="space-y-4">
              <div
                className={
                  challenge.stopCount === 2
                    ? 'flex flex-col sm:flex-row items-center gap-2 justify-center'
                    : 'flex items-center gap-2 justify-center'
                }
              >
                {Array.from({ length: challenge.stopCount }).map((_, hubIdx) => (
                  <div key={hubIdx} className="flex items-center gap-1 mb-2 sm:mb-0">
                    {hubInputs[hubIdx].map((char, charIdx) => (
                      <input
                        key={charIdx}
                        ref={inputRefs[hubIdx][charIdx]}
                        type="text"
                        maxLength={1}
                        value={char}
                        onChange={(e) => handleHubInput(hubIdx, charIdx, e.target.value)}
                        onKeyDown={(e) => handleHubKeyDown(hubIdx, charIdx, e)}
                        className="w-12 h-12 text-2xl text-center font-mono border rounded focus:ring-2 focus:ring-primary bg-background uppercase mx-0.5"
                        autoFocus={hubIdx === 0 && charIdx === 0}
                      />
                    ))}
                    {hubIdx < challenge.stopCount - 1 && (
                      <span className="mx-1 text-xl font-bold hidden sm:inline">-</span>
                    )}
                  </div>
                ))}
                <Button
                  onClick={handleSubmit}
                  disabled={!isReadyToSubmit()}
                  className="ml-4"
                >
                  Submit
                </Button>
              </div>
              <p className="text-center text-xs text-muted-foreground mt-2">
                Each connection must be in a different continent from both the origin and the destination.
              </p>
            </div>
          )}
          {Array.from({ length: challenge.stopCount }).every((_, hubIdx) => hubInputs[hubIdx].every((c) => c.length === 1)) &&
            !Array.from({ length: challenge.stopCount }).every((_, hubIdx) => airportsCache[hubInputs[hubIdx].join('')]) &&
            !error && (
              <div className="text-center mt-2">
                <span className="text-destructive text-sm">Not a valid airport code.</span>
              </div>
            )}
          <div className="space-y-2">
            <h3 className="font-medium">Your Guesses ({guesses.length}/{challenge.tries})</h3>
            {guesses.map((g, i) => {
              // Compute feedback for each hub
              const correctHubs = challenge.shortestRoute.slice(1, -1); // [hub1, hub2]
              // Track which correct hubs have been matched (for yellow logic)
              const matched = [false, false];
              // First pass: mark greens
              const feedback: ("green" | "yellow" | "red")[] = g.hubs.map((hub, idx) => {
                if (hub === correctHubs[idx]) {
                  matched[idx] = true;
                  return "green";
                }
                return undefined as unknown as "green" | "yellow" | "red";
              });
              // Second pass: mark yellows
              g.hubs.forEach((hub, idx) => {
                if (feedback[idx] === undefined) {
                  // Find if this hub exists in correctHubs at a different index and not already matched
                  const otherIdx = correctHubs.findIndex((h, j) => h === hub && !matched[j] && j !== idx);
                  if (otherIdx !== -1) {
                    matched[otherIdx] = true;
                    feedback[idx] = "yellow";
                  } else {
                    feedback[idx] = "red";
                  }
                }
              });
              return (
                <div key={i} className="flex items-center gap-2 p-2 border rounded-lg bg-muted/50">
                  <div className="flex-1 flex gap-2 items-center">
                    <span className="font-mono text-sm font-normal">
                      {[challenge.origin, ...g.hubs, challenge.destination].join('-')}
                    </span>
                  </div>
                  {g.isValid ? (
                    <div className="flex items-center gap-2">
                      {g.hubs.map((hub, idx) =>
                        feedback[idx] === 'green' ? (
                          <Check key={idx} className="w-5 h-5 text-green-600" />
                        ) : feedback[idx] === 'yellow' ? (
                          <span key={idx} className="w-5 h-5 text-yellow-500 text-lg">🟨</span>
                        ) : (
                          <X key={idx} className="w-5 h-5 text-red-600" />
                        )
                      )}
                      <span className="text-sm font-medium">{g.totalDistance} mi</span>
                      <span className="text-xs text-muted-foreground">
                        {challenge.shortestDistance && g.differenceFromShortest !== undefined
                          ? `${g.differenceFromShortest === 0 ? '0%' : `+${((g.differenceFromShortest / challenge.shortestDistance) * 100).toFixed(1)}%`}`
                          : ''}
                      </span>
                    </div>
                  ) : (
                    <span className="text-destructive text-xs">{g.error}</span>
                  )}
                </div>
              );
            })}
            {/* Give Up button for practice mode, only if game is not finished */}
            {mode === 'practice' && gameStatus === 'playing' && (
              <div className="flex justify-center mt-4">
                <Button onClick={handleGiveUp} variant="destructive" size="sm">
                  Give Up
                </Button>
              </div>
            )}
          </div>
          {/* Share Button & Countdown */}
          {(gameStatus === 'won' || gameStatus === 'lost') && (
            <div className="text-center space-y-2">
              <div className="flex justify-center gap-2">
                <Button onClick={handleShare} variant="secondary">
                  {copied ? 'Copied!' : 'Share Results'}
                </Button>
                {mode === 'practice' && (
                  <Button onClick={handleNewPracticeGame} variant="outline">
                    New Game
                  </Button>
                )}
              </div>
              {mode === 'daily' && (
                <div className="text-muted-foreground mt-2">
                  Route will be reset in <span className="font-mono">{formatCountdown(countdown)}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 