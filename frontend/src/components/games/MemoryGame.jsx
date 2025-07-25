import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, RotateCcw, Trophy, Clock, Target, Star, Play, Pause, Zap } from 'lucide-react';

const MemoryGame = ({ onBack }) => {
  const [cards, setCards] = useState([]);
  const [flippedCards, setFlippedCards] = useState([]);
  const [matchedCards, setMatchedCards] = useState([]);
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gamePaused, setGamePaused] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [difficulty, setDifficulty] = useState('easy');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [bestScores, setBestScores] = useState({ easy: 0, medium: 0, hard: 0 });

  const difficulties = {
    easy: { pairs: 6, gridCols: 'grid-cols-3', name: 'Easy', color: 'green' },
    medium: { pairs: 8, gridCols: 'grid-cols-4', name: 'Medium', color: 'yellow' },
    hard: { pairs: 12, gridCols: 'grid-cols-4', name: 'Hard', color: 'red' }
  };

  const cardEmojis = [
    '🎮', '🎯', '🎲', '🎪', '🎨', '🎭', '🎸', '🎺', 
    '🎻', '🎹', '🎤', '🎧', '🎬', '🎼', '🎊', '🎉',
    '🚀', '⚡', '🌟', '🔥', '💎', '🎈', '🎁', '🏆'
  ];

  useEffect(() => {
    initializeGame();
  }, [difficulty]);

  useEffect(() => {
    let interval = null;
    if (gameStarted && !gamePaused && !gameCompleted) {
      interval = setInterval(() => {
        setTime(time => time + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameStarted, gamePaused, gameCompleted]);

  useEffect(() => {
    if (flippedCards.length === 2) {
      const timer = setTimeout(() => {
        checkForMatch();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [flippedCards]);

  useEffect(() => {
    if (matchedCards.length === difficulties[difficulty].pairs * 2 && gameStarted) {
      completeGame();
    }
  }, [matchedCards, difficulty, gameStarted]);

  const initializeGame = useCallback(() => {
    const numPairs = difficulties[difficulty].pairs;
    const selectedEmojis = cardEmojis.slice(0, numPairs);
    const gameCards = [...selectedEmojis, ...selectedEmojis]
      .map((emoji, index) => ({
        id: index,
        emoji,
        isFlipped: false,
        isMatched: false
      }))
      .sort(() => Math.random() - 0.5);

    setCards(gameCards);
    setFlippedCards([]);
    setMatchedCards([]);
    setMoves(0);
    setTime(0);
    setGameStarted(false);
    setGamePaused(false);
    setGameCompleted(false);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
  }, [difficulty]);

  const handleCardClick = (cardId) => {
    if (!gameStarted) setGameStarted(true);
    
    const card = cards.find(c => c.id === cardId);
    if (card.isFlipped || card.isMatched || flippedCards.length === 2 || gamePaused) return;

    const newFlippedCards = [...flippedCards, cardId];
    setFlippedCards(newFlippedCards);
    
    setCards(cards.map(c => 
      c.id === cardId ? { ...c, isFlipped: true } : c
    ));
  };

  const checkForMatch = () => {
    const [firstId, secondId] = flippedCards;
    const firstCard = cards.find(c => c.id === firstId);
    const secondCard = cards.find(c => c.id === secondId);

    setMoves(moves + 1);

    if (firstCard.emoji === secondCard.emoji) {
      // Match found
      setMatchedCards([...matchedCards, firstId, secondId]);
      setCards(cards.map(c => 
        c.id === firstId || c.id === secondId 
          ? { ...c, isMatched: true }
          : c
      ));
      
      // Update streak and score
      const newStreak = streak + 1;
      setStreak(newStreak);
      setMaxStreak(Math.max(maxStreak, newStreak));
      
      // Calculate score with streak bonus
      const basePoints = 100;
      const streakBonus = newStreak * 10;
      const timeBonus = Math.max(0, 10 - Math.floor(time / 30)); // Bonus for speed
      const points = basePoints + streakBonus + timeBonus;
      setScore(score + points);
      
    } else {
      // No match
      setCards(cards.map(c => 
        c.id === firstId || c.id === secondId 
          ? { ...c, isFlipped: false }
          : c
      ));
      setStreak(0); // Reset streak on miss
    }
    
    setFlippedCards([]);
  };

  const completeGame = () => {
    setGameCompleted(true);
    setGameStarted(false);
    
    // Calculate final score with completion bonus
    const completionBonus = 500;
    const moveEfficiencyBonus = Math.max(0, (difficulties[difficulty].pairs * 2 - moves) * 20);
    const finalScore = score + completionBonus + moveEfficiencyBonus;
    setScore(finalScore);
    
    // Update best score
    if (finalScore > bestScores[difficulty]) {
      setBestScores(prev => ({ ...prev, [difficulty]: finalScore }));
    }
  };

  const togglePause = () => {
    setGamePaused(!gamePaused);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDifficultyColor = (level) => {
    const colors = {
      easy: 'text-green-600 bg-green-100',
      medium: 'text-yellow-600 bg-yellow-100',
      hard: 'text-red-600 bg-red-100'
    };
    return colors[level] || 'text-gray-600 bg-gray-100';
  };

  const getCardAnimation = (card) => {
    if (card.isMatched) return 'animate-bounce';
    if (card.isFlipped) return 'animate-pulse';
    return '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-red-800 p-2">
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
            <h1 className="text-lg font-bold text-white">🧠 Memory</h1>
            <button 
              onClick={initializeGame}
              className="flex items-center gap-1 bg-white/20 text-white px-2 py-1 rounded-md hover:bg-white/30 transition-colors text-xs"
            >
              <RotateCcw size={14} />
              Reset
            </button>
          </div>

          <div className="bg-white rounded-lg p-3">
            {/* Difficulty Selector */}
            <div className="flex gap-1 mb-3">
              {Object.entries(difficulties).map(([level, config]) => (
                <button
                  key={level}
                  onClick={() => setDifficulty(level)}
                  className={`flex-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${
                    difficulty === level
                      ? `${getDifficultyColor(level)} shadow-md`
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {config.name}
                </button>
              ))}
            </div>

            {/* Stats Section */}
            <div className="grid grid-cols-5 gap-1 mb-3 text-center">
              <div className="bg-blue-50 rounded-md p-1">
                <Clock size={10} className="mx-auto mb-1 text-blue-600" />
                <div className="text-xs font-bold text-blue-800">{formatTime(time)}</div>
              </div>
              <div className="bg-orange-50 rounded-md p-1">
                <Target size={10} className="mx-auto mb-1 text-orange-600" />
                <div className="text-xs font-bold text-orange-800">{moves}</div>
              </div>
              <div className="bg-green-50 rounded-md p-1">
                <Star size={10} className="mx-auto mb-1 text-green-600" />
                <div className="text-xs font-bold text-green-800">{score}</div>
              </div>
              <div className="bg-purple-50 rounded-md p-1">
                <Zap size={10} className="mx-auto mb-1 text-purple-600" />
                <div className="text-xs font-bold text-purple-800">{streak}</div>
              </div>
              <div className="bg-pink-50 rounded-md p-1">
                <Trophy size={10} className="mx-auto mb-1 text-pink-600" />
                <div className="text-xs font-bold text-pink-800">{maxStreak}</div>
              </div>
            </div>

            {/* Game Controls */}
            <div className="flex gap-2 mb-3">
              <button 
                onClick={togglePause}
                disabled={!gameStarted}
                className="flex items-center gap-1 bg-purple-500 disabled:bg-gray-400 text-white px-3 py-1 rounded-md hover:bg-purple-600 transition-colors text-xs flex-1"
              >
                {gamePaused ? <Play size={12} /> : <Pause size={12} />}
                {gamePaused ? 'Resume' : 'Pause'}
              </button>
              <button
                onClick={initializeGame}
                className="bg-gray-500 text-white px-3 py-1 rounded-md hover:bg-gray-600 transition-colors text-xs"
              >
                New Game
              </button>
            </div>

            {/* Status Messages */}
            {gameCompleted && (
              <div className="text-center mb-3 p-2 bg-green-100 rounded-md">
                <div className="text-green-600 text-sm font-bold">🎉 Completed!</div>
                <div className="text-green-700 text-xs">
                  Score: {score} | Time: {formatTime(time)} | Moves: {moves}
                </div>
              </div>
            )}

            {gamePaused && gameStarted && (
              <div className="text-center mb-3 p-2 bg-blue-100 rounded-md">
                <div className="text-blue-600 text-sm font-bold">⏸️ Game Paused</div>
              </div>
            )}

            {streak > 2 && !gameCompleted && (
              <div className="text-center mb-2 p-1 bg-yellow-100 rounded-md">
                <div className="text-yellow-600 text-xs font-bold">🔥 {streak} Match Streak!</div>
              </div>
            )}

            {/* Game Board */}
            <div className="flex justify-center mb-3">
              <div className={`grid ${difficulties[difficulty].gridCols} gap-2 ${gamePaused ? 'opacity-30' : ''}`}>
                {cards.map((card) => (
                  <div
                    key={card.id}
                    onClick={() => handleCardClick(card.id)}
                    className={`
                      w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 
                      rounded-lg cursor-pointer transition-all duration-300 
                      hover:scale-105 hover:shadow-lg flex items-center justify-center 
                      text-2xl font-bold shadow-md
                      ${card.isFlipped || card.isMatched
                        ? 'bg-white text-gray-800 transform rotate-180'
                        : 'hover:from-purple-300 hover:to-pink-400'
                      }
                      ${getCardAnimation(card)}
                      ${card.isMatched ? 'ring-2 ring-green-400' : ''}
                    `}
                    style={{ 
                      transformStyle: 'preserve-3d',
                      transition: 'transform 0.3s ease-in-out'
                    }}
                  >
                    {card.isFlipped || card.isMatched ? (
                      <span className="animate-bounce">{card.emoji}</span>
                    ) : (
                      <span className="text-white/70">❓</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Progress</span>
                <span>{matchedCards.length / 2}/{difficulties[difficulty].pairs}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(matchedCards.length / (difficulties[difficulty].pairs * 2)) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Best Score Display */}
            {bestScores[difficulty] > 0 && (
              <div className="text-center text-xs text-gray-600 mb-2">
                <Trophy size={12} className="inline mr-1" />
                Best {difficulties[difficulty].name}: {bestScores[difficulty]} points
              </div>
            )}

            {/* Instructions */}
            <div className="text-center text-gray-600 text-xs">
              <p>Tap cards to flip them and find matching pairs!</p>
              <p className="text-purple-600 font-medium">Build streaks for bonus points</p>
            </div>
          </div>
        </div>
      </div>

      {/* Game Completed Modal */}
      {gameCompleted && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-xs w-full mx-4 text-center animate-bounce">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Amazing!
            </h2>
            <div className="space-y-2 text-gray-600 mb-4">
              <p><strong>Final Score:</strong> {score} points</p>
              <p><strong>Time:</strong> {formatTime(time)}</p>
              <p><strong>Moves:</strong> {moves}</p>
              <p><strong>Best Streak:</strong> {maxStreak}</p>
              {score > bestScores[difficulty] && (
                <p className="text-green-600 font-bold">🏆 New Best Score!</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={initializeGame}
                className="flex-1 bg-purple-500 text-white py-2 rounded-lg font-medium hover:bg-purple-600 transition-colors"
              >
                Play Again
              </button>
              <button
                onClick={onBack}
                className="flex-1 bg-gray-500 text-white py-2 rounded-lg font-medium hover:bg-gray-600 transition-colors"
              >
                Back to Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemoryGame;