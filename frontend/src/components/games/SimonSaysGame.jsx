import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, RotateCcw, Play, Pause, Volume2, VolumeX, Trophy, Star, Zap } from 'lucide-react';

const SimonSaysGame = ({ onBack }) => {
  const [gameSequence, setGameSequence] = useState([]);
  const [playerSequence, setPlayerSequence] = useState([]);
  const [isDisplaying, setIsDisplaying] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [gamePaused, setGamePaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [difficulty, setDifficulty] = useState('normal');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeButton, setActiveButton] = useState(null);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [perfectRounds, setPerfectRounds] = useState(0);

  const audioContextRef = useRef(null);
  const isPlayingRef = useRef(false);

  const difficulties = {
    easy: { speed: 800, name: 'Easy', color: 'green' },
    normal: { speed: 600, name: 'Normal', color: 'blue' },
    hard: { speed: 400, name: 'Hard', color: 'red' },
    expert: { speed: 250, name: 'Expert', color: 'purple' }
  };

  const colors = [
    { id: 0, name: 'red', bg: 'bg-red-500', active: 'bg-red-300', frequency: 329.63 },
    { id: 1, name: 'blue', bg: 'bg-blue-500', active: 'bg-blue-300', frequency: 261.63 },
    { id: 2, name: 'green', bg: 'bg-green-500', active: 'bg-green-300', frequency: 220.00 },
    { id: 3, name: 'yellow', bg: 'bg-yellow-500', active: 'bg-yellow-300', frequency: 174.61 }
  ];

  // Initialize audio context
  useEffect(() => {
    if (soundEnabled && !audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
  }, [soundEnabled]);

  const playSound = useCallback((frequency, duration = 300) => {
    if (!soundEnabled || !audioContextRef.current) return;

    try {
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + duration / 1000);
      
      oscillator.start(audioContextRef.current.currentTime);
      oscillator.stop(audioContextRef.current.currentTime + duration / 1000);
    } catch (error) {
      console.log('Audio playback failed:', error);
    }
  }, [soundEnabled]);

  const resetGame = useCallback(() => {
    setGameSequence([]);
    setPlayerSequence([]);
    setIsDisplaying(false);
    setGameStarted(false);
    setGamePaused(false);
    setGameOver(false);
    setCurrentLevel(1);
    setScore(0);
    setActiveButton(null);
    setStreak(0);
    setPerfectRounds(0);
    isPlayingRef.current = false;
  }, []);

  const startGame = useCallback(() => {
    if (gameOver) {
      resetGame();
    }
    setGameStarted(true);
    setGamePaused(false);
    nextRound();
  }, [gameOver, resetGame]);

  const nextRound = useCallback(() => {
    const nextColor = Math.floor(Math.random() * 4);
    const newSequence = [...gameSequence, nextColor];
    setGameSequence(newSequence);
    setPlayerSequence([]);
    setCurrentLevel(newSequence.length);
    
    // Calculate score for completing previous round
    if (gameSequence.length > 0) {
      const roundPoints = gameSequence.length * 10;
      const streakBonus = streak * 5;
      const difficultyMultiplier = { easy: 1, normal: 1.2, hard: 1.5, expert: 2 }[difficulty];
      const points = Math.floor((roundPoints + streakBonus) * difficultyMultiplier);
      setScore(prev => prev + points);
      
      setStreak(prev => prev + 1);
      setMaxStreak(prev => Math.max(prev, streak + 1));
      setPerfectRounds(prev => prev + 1);
    }
    
    setTimeout(() => {
      displaySequence(newSequence);
    }, 1000);
  }, [gameSequence, streak, difficulty]);

  const displaySequence = useCallback(async (sequence) => {
    setIsDisplaying(true);
    isPlayingRef.current = true;
    
    for (let i = 0; i < sequence.length; i++) {
      if (!isPlayingRef.current) break;
      
      await new Promise(resolve => {
        setTimeout(() => {
          setActiveButton(sequence[i]);
          playSound(colors[sequence[i]].frequency);
          resolve();
        }, i * difficulties[difficulty].speed);
      });
      
      await new Promise(resolve => {
        setTimeout(() => {
          setActiveButton(null);
          resolve();
        }, difficulties[difficulty].speed * 0.7);
      });
    }
    
    setIsDisplaying(false);
    isPlayingRef.current = false;
  }, [difficulty, playSound]);

  const handleColorClick = useCallback((colorId) => {
    if (isDisplaying || !gameStarted || gamePaused || gameOver) return;

    const newPlayerSequence = [...playerSequence, colorId];
    setPlayerSequence(newPlayerSequence);
    
    setActiveButton(colorId);
    playSound(colors[colorId].frequency, 200);
    setTimeout(() => setActiveButton(null), 200);

    // Check if the player's input is correct
    const currentIndex = newPlayerSequence.length - 1;
    if (newPlayerSequence[currentIndex] !== gameSequence[currentIndex]) {
      // Wrong input - game over
      setGameOver(true);
      setGameStarted(false);
      setStreak(0);
      
      // Update best score
      if (score > bestScore) {
        setBestScore(score);
      }
      
      // Play error sound
      playSound(150, 500);
      return;
    }

    // Check if the player completed the current sequence
    if (newPlayerSequence.length === gameSequence.length) {
      // Sequence completed correctly
      setTimeout(() => {
        nextRound();
      }, 1000);
    }
  }, [isDisplaying, gameStarted, gamePaused, gameOver, playerSequence, gameSequence, score, bestScore, playSound, nextRound]);

  const togglePause = () => {
    if (isDisplaying) {
      isPlayingRef.current = false;
      setIsDisplaying(false);
      setActiveButton(null);
    }
    setGamePaused(!gamePaused);
  };

  const getDifficultyColor = (level) => {
    const colors = {
      easy: 'text-green-600 bg-green-100',
      normal: 'text-blue-600 bg-blue-100',
      hard: 'text-red-600 bg-red-100',
      expert: 'text-purple-600 bg-purple-100'
    };
    return colors[level] || 'text-gray-600 bg-gray-100';
  };

  const getScoreMultiplier = () => {
    const multipliers = { easy: '1x', normal: '1.2x', hard: '1.5x', expert: '2x' };
    return multipliers[difficulty];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-800 to-pink-800 p-2">
      <div className="max-w-md mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <button 
              onClick={onBack}
              className="flex items-center gap-1 bg-white/20 text-white px-2 py-1 rounded-md hover:bg-white/30 transition-colors text-xs"
            >
              <ArrowLeft size={14} />
              Back
            </button>
            <h1 className="text-lg font-bold text-white">🎵 Simon Says</h1>
            <button 
              onClick={resetGame}
              className="flex items-center gap-1 bg-white/20 text-white px-2 py-1 rounded-md hover:bg-white/30 transition-colors text-xs"
            >
              <RotateCcw size={14} />
              Reset
            </button>
          </div>

          <div className="bg-white rounded-lg p-3">
            {/* Difficulty Selector */}
            <div className="grid grid-cols-2 gap-1 mb-3">
              {Object.entries(difficulties).map(([level, config]) => (
                <button
                  key={level}
                  onClick={() => setDifficulty(level)}
                  disabled={gameStarted && !gameOver}
                  className={`px-2 py-1 rounded-md text-xs font-medium transition-all disabled:opacity-50 ${
                    difficulty === level
                      ? `${getDifficultyColor(level)} shadow-md`
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {config.name} {getScoreMultiplier()}
                </button>
              ))}
            </div>

            {/* Stats Section */}
            <div className="grid grid-cols-5 gap-1 mb-3 text-center">
              <div className="bg-blue-50 rounded-md p-1">
                <div className="text-xs font-bold text-blue-600 mb-1">Level</div>
                <div className="text-sm font-bold text-blue-800">{currentLevel}</div>
              </div>
              <div className="bg-green-50 rounded-md p-1">
                <Star size={10} className="mx-auto mb-1 text-green-600" />
                <div className="text-xs font-bold text-green-800">{score}</div>
              </div>
              <div className="bg-purple-50 rounded-md p-1">
                <Zap size={10} className="mx-auto mb-1 text-purple-600" />
                <div className="text-xs font-bold text-purple-800">{streak}</div>
              </div>
              <div className="bg-yellow-50 rounded-md p-1">
                <Trophy size={10} className="mx-auto mb-1 text-yellow-600" />
                <div className="text-xs font-bold text-yellow-800">{maxStreak}</div>
              </div>
              <div className="bg-pink-50 rounded-md p-1">
                <div className="text-xs font-bold text-pink-600 mb-1">Perfect</div>
                <div className="text-xs font-bold text-pink-800">{perfectRounds}</div>
              </div>
            </div>

            {/* Game Controls */}
            <div className="flex gap-2 mb-3">
              {!gameStarted || gameOver ? (
                <button 
                  onClick={startGame}
                  className="flex items-center gap-1 bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600 transition-colors text-xs flex-1"
                >
                  <Play size={12} />
                  {gameOver ? 'Play Again' : 'Start Game'}
                </button>
              ) : (
                <button 
                  onClick={togglePause}
                  className="flex items-center gap-1 bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 transition-colors text-xs flex-1"
                >
                  {gamePaused ? <Play size={12} /> : <Pause size={12} />}
                  {gamePaused ? 'Resume' : 'Pause'}
                </button>
              )}
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`flex items-center gap-1 px-3 py-1 rounded-md transition-colors text-xs ${
                  soundEnabled 
                    ? 'bg-yellow-500 text-white hover:bg-yellow-600' 
                    : 'bg-gray-400 text-white hover:bg-gray-500'
                }`}
              >
                {soundEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
              </button>
            </div>

            {/* Status Messages */}
            {gameOver && (
              <div className="text-center mb-3 p-2 bg-red-100 rounded-md">
                <div className="text-red-600 text-sm font-bold">💥 Game Over!</div>
                <div className="text-red-700 text-xs">
                  Final Score: {score} | Level Reached: {currentLevel - 1}
                </div>
                {score > bestScore && (
                  <div className="text-green-600 text-xs font-bold">🏆 New Best Score!</div>
                )}
              </div>
            )}

            {gamePaused && gameStarted && (
              <div className="text-center mb-3 p-2 bg-blue-100 rounded-md">
                <div className="text-blue-600 text-sm font-bold">⏸️ Game Paused</div>
              </div>
            )}

            {isDisplaying && (
              <div className="text-center mb-3 p-2 bg-yellow-100 rounded-md">
                <div className="text-yellow-600 text-sm font-bold">👀 Watch the sequence...</div>
              </div>
            )}

            {gameStarted && !isDisplaying && !gamePaused && !gameOver && (
              <div className="text-center mb-3 p-2 bg-green-100 rounded-md">
                <div className="text-green-600 text-sm font-bold">
                  🎯 Your turn! ({playerSequence.length + 1}/{gameSequence.length})
                </div>
              </div>
            )}

            {streak > 2 && gameStarted && !gameOver && (
              <div className="text-center mb-2 p-1 bg-orange-100 rounded-md">
                <div className="text-orange-600 text-xs font-bold">🔥 {streak} Round Streak!</div>
              </div>
            )}

            {/* Game Board */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              {colors.map((color) => (
                <button
                  key={color.id}
                  onClick={() => handleColorClick(color.id)}
                  disabled={isDisplaying || !gameStarted || gamePaused || gameOver}
                  className={`
                    h-20 rounded-xl transition-all duration-150 shadow-lg
                    ${activeButton === color.id ? color.active : color.bg}
                    ${isDisplaying || !gameStarted || gamePaused || gameOver 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:opacity-80 active:scale-95 cursor-pointer'
                    }
                    ${activeButton === color.id ? 'scale-95 shadow-inner' : 'hover:shadow-xl'}
                  `}
                >
                  <div className="text-white font-bold text-lg capitalize">
                    {color.name}
                  </div>
                </button>
              ))}
            </div>

            {/* Progress Indicator */}
            {gameStarted && !gameOver && (
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{playerSequence.length}/{gameSequence.length}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${gameSequence.length > 0 ? (playerSequence.length / gameSequence.length) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Best Score Display */}
            {bestScore > 0 && (
              <div className="text-center text-xs text-gray-600 mb-2">
                <Trophy size={12} className="inline mr-1" />
                Best Score: {bestScore} points
              </div>
            )}

            {/* Instructions */}
            <div className="text-center text-gray-600 text-xs">
              <p>Watch the sequence, then repeat it by tapping the colors!</p>
              <p className="text-purple-600 font-medium">Build streaks for bonus points</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimonSaysGame;