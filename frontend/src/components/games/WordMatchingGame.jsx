import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, RotateCcw, Play, Pause, Trophy, Clock, Star } from 'lucide-react';

const WordMatchingGame = ({ onBack }) => {
  const [gameState, setGameState] = useState({
    currentLevel: 1,
    score: 0,
    matches: 0,
    totalMatches: 0,
    timeLeft: 60,
    gameRunning: false,
    gameStarted: false,
    gameOver: false,
    selectedWords: [],
    matchedPairs: [],
    difficulty: 'easy',
    streak: 0,
    bestStreak: 0
  });

  const [currentWords, setCurrentWords] = useState([]);
  const timerRef = React.useRef(null);

  const wordSets = {
    easy: [
      { word: 'Cat', match: 'Animal', category: 'Animals' },
      { word: 'Rose', match: 'Flower', category: 'Plants' },
      { word: 'Blue', match: 'Color', category: 'Colors' },
      { word: 'Apple', match: 'Fruit', category: 'Food' },
      { word: 'Car', match: 'Vehicle', category: 'Transport' },
      { word: 'Book', match: 'Reading', category: 'Education' },
      { word: 'Sun', match: 'Star', category: 'Space' },
      { word: 'Rain', match: 'Weather', category: 'Nature' },
      { word: 'Happy', match: 'Emotion', category: 'Feelings' },
      { word: 'House', match: 'Building', category: 'Architecture' }
    ],
    medium: [
      { word: 'Photosynthesis', match: 'Plant Process', category: 'Biology' },
      { word: 'Democracy', match: 'Government Type', category: 'Politics' },
      { word: 'Sonnet', match: 'Poetry Form', category: 'Literature' },
      { word: 'Molecule', match: 'Chemical Unit', category: 'Chemistry' },
      { word: 'Renaissance', match: 'Art Period', category: 'History' },
      { word: 'Algorithm', match: 'Code Logic', category: 'Technology' },
      { word: 'Metaphor', match: 'Figure of Speech', category: 'Language' },
      { word: 'Gravity', match: 'Force', category: 'Physics' },
      { word: 'Symphony', match: 'Musical Form', category: 'Music' },
      { word: 'Ecosystem', match: 'Environment', category: 'Ecology' }
    ],
    hard: [
      { word: 'Serendipity', match: 'Pleasant Surprise', category: 'Concepts' },
      { word: 'Ubiquitous', match: 'Everywhere', category: 'Adjectives' },
      { word: 'Ephemeral', match: 'Short-lived', category: 'Time' },
      { word: 'Cacophony', match: 'Harsh Sound', category: 'Audio' },
      { word: 'Juxtaposition', match: 'Side by Side', category: 'Art' },
      { word: 'Ambiguous', match: 'Unclear', category: 'Meaning' },
      { word: 'Melancholy', match: 'Sadness', category: 'Emotions' },
      { word: 'Quintessential', match: 'Perfect Example', category: 'Quality' },
      { word: 'Pneumonia', match: 'Lung Disease', category: 'Medicine' },
      { word: 'Perspicacious', match: 'Sharp Insight', category: 'Intelligence' }
    ]
  };

  const difficulties = {
    easy: { name: 'Easy', timeLimit: 90, pairsPerLevel: 4, scoreMultiplier: 1 },
    medium: { name: 'Medium', timeLimit: 75, pairsPerLevel: 5, scoreMultiplier: 2 },
    hard: { name: 'Hard', timeLimit: 60, pairsPerLevel: 6, scoreMultiplier: 3 }
  };

  // Initialize game
  const initializeGame = useCallback(() => {
    const config = difficulties[gameState.difficulty];
    const availableWords = wordSets[gameState.difficulty];
    
    // Randomly select pairs for this level
    const shuffledWords = [...availableWords].sort(() => Math.random() - 0.5);
    const selectedPairs = shuffledWords.slice(0, config.pairsPerLevel);
    
    // Create array of all words and matches, then shuffle
    const allItems = [];
    selectedPairs.forEach(pair => {
      allItems.push({ ...pair, type: 'word', id: `word-${pair.word}` });
      allItems.push({ 
        word: pair.match, 
        match: pair.word, 
        category: pair.category, 
        type: 'match', 
        id: `match-${pair.word}` 
      });
    });
    
    const shuffledItems = allItems.sort(() => Math.random() - 0.5);
    setCurrentWords(shuffledItems);
    
    setGameState(prev => ({
      ...prev,
      timeLeft: config.timeLimit,
      gameRunning: false,
      gameStarted: false,
      gameOver: false,
      selectedWords: [],
      matchedPairs: [],
      totalMatches: config.pairsPerLevel,
      matches: 0,
      score: prev.currentLevel === 1 ? 0 : prev.score, // Reset score only for new game
      streak: 0
    }));
  }, [gameState.difficulty, gameState.currentLevel]);

  // Start game
  const startGame = () => {
    setGameState(prev => ({
      ...prev,
      gameRunning: true,
      gameStarted: true
    }));
  };

  // Timer logic
  useEffect(() => {
    if (gameState.gameRunning && gameState.timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setGameState(prev => {
          if (prev.timeLeft <= 1) {
            return { ...prev, timeLeft: 0, gameRunning: false, gameOver: true };
          }
          return { ...prev, timeLeft: prev.timeLeft - 1 };
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [gameState.gameRunning, gameState.timeLeft]);

  // Handle word selection
  const handleWordClick = (clickedWord) => {
    if (!gameState.gameRunning || gameState.matchedPairs.includes(clickedWord.id)) {
      return;
    }

    setGameState(prev => {
      const newSelectedWords = [...prev.selectedWords];
      
      // If word is already selected, deselect it
      if (newSelectedWords.some(w => w.id === clickedWord.id)) {
        return {
          ...prev,
          selectedWords: newSelectedWords.filter(w => w.id !== clickedWord.id)
        };
      }

      // If we already have 2 words selected, clear and start fresh
      if (newSelectedWords.length >= 2) {
        newSelectedWords.length = 0;
      }

      newSelectedWords.push(clickedWord);

      // Check for match when we have 2 words
      if (newSelectedWords.length === 2) {
        const [first, second] = newSelectedWords;
        let isMatch = false;
        
        // Check if they match (word matches with its definition)
        if ((first.type === 'word' && second.type === 'match' && first.word === second.match) ||
            (first.type === 'match' && second.type === 'word' && first.match === second.word)) {
          isMatch = true;
        }

        if (isMatch) {
          const config = difficulties[prev.difficulty];
          const baseScore = 100 * config.scoreMultiplier;
          const timeBonus = Math.floor(prev.timeLeft / 10) * 10;
          const streakBonus = prev.streak * 25;
          const totalScore = baseScore + timeBonus + streakBonus;
          
          const newMatches = prev.matches + 1;
          const newStreak = prev.streak + 1;
          const newBestStreak = Math.max(prev.bestStreak, newStreak);
          
          // Check if level completed
          if (newMatches >= prev.totalMatches) {
            setTimeout(() => {
              setGameState(current => ({
                ...current,
                currentLevel: current.currentLevel + 1,
                gameRunning: false,
                gameStarted: false
              }));
              setTimeout(() => initializeGame(), 1000);
            }, 1500);
          }

          return {
            ...prev,
            selectedWords: [],
            matchedPairs: [...prev.matchedPairs, first.id, second.id],
            matches: newMatches,
            score: prev.score + totalScore,
            streak: newStreak,
            bestStreak: newBestStreak
          };
        } else {
          // Wrong match - clear selection after brief delay
          setTimeout(() => {
            setGameState(current => ({
              ...current,
              selectedWords: [],
              streak: 0
            }));
          }, 1000);
          
          return {
            ...prev,
            selectedWords: newSelectedWords,
            streak: 0
          };
        }
      }

      return { ...prev, selectedWords: newSelectedWords };
    });
  };

  // Reset game
  const resetGame = () => {
    setGameState(prev => ({
      ...prev,
      currentLevel: 1,
      score: 0,
      bestStreak: prev.bestStreak // Keep best streak
    }));
    setTimeout(() => initializeGame(), 100);
  };

  // Change difficulty
  const changeDifficulty = (newDifficulty) => {
    setGameState(prev => ({ 
      ...prev, 
      difficulty: newDifficulty,
      currentLevel: 1,
      score: 0
    }));
  };

  // Initialize game on component mount and difficulty change
  useEffect(() => {
    initializeGame();
  }, [gameState.difficulty]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (gameState.gameStarted && !gameState.gameOver) {
            setGameState(prev => ({ ...prev, gameRunning: !prev.gameRunning }));
          } else if (!gameState.gameStarted) {
            startGame();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState.gameStarted, gameState.gameRunning, gameState.gameOver]);

  const getWordStyle = (word) => {
    const isSelected = gameState.selectedWords.some(w => w.id === word.id);
    const isMatched = gameState.matchedPairs.includes(word.id);
    const isWrongSelection = gameState.selectedWords.length === 2 && 
                            gameState.selectedWords.some(w => w.id === word.id) && 
                            !isMatched;

    let baseStyle = "p-3 sm:p-4 rounded-lg cursor-pointer transition-all duration-300 text-center font-semibold text-sm sm:text-base border-2 ";
    
    if (isMatched) {
      return baseStyle + "bg-green-100 border-green-400 text-green-800 opacity-75 cursor-not-allowed";
    } else if (isWrongSelection && gameState.selectedWords.length === 2) {
      return baseStyle + "bg-red-100 border-red-400 text-red-800 animate-pulse";
    } else if (isSelected) {
      return baseStyle + "bg-blue-100 border-blue-400 text-blue-800 transform scale-105";
    } else if (word.type === 'word') {
      return baseStyle + "bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100 hover:border-purple-300 hover:transform hover:scale-105";
    } else {
      return baseStyle + "bg-orange-50 border-orange-200 text-orange-800 hover:bg-orange-100 hover:border-orange-300 hover:transform hover:scale-105";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-2 sm:p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl sm:rounded-2xl p-3 sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-3 sm:mb-6">
            <button 
              onClick={onBack}
              className="flex items-center gap-1 sm:gap-2 bg-white/20 text-white px-2 py-1 sm:px-4 sm:py-2 rounded-md sm:rounded-lg hover:bg-white/30 transition-colors text-sm sm:text-base"
            >
              <ArrowLeft size={16} className="sm:w-5 sm:h-5" />
              Back
            </button>
            <h1 className="text-xl sm:text-3xl font-bold text-white">🧩 Word Match</h1>
            <button 
              onClick={resetGame}
              className="flex items-center gap-1 sm:gap-2 bg-white/20 text-white px-2 py-1 sm:px-4 sm:py-2 rounded-md sm:rounded-lg hover:bg-white/30 transition-colors text-sm sm:text-base"
            >
              <RotateCcw size={16} className="sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">New Game</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>

          <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-6">
            {/* Difficulty Selection */}
            <div className="flex justify-center gap-1 sm:gap-2 mb-3 sm:mb-6">
              {Object.entries(difficulties).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => changeDifficulty(key)}
                  disabled={gameState.gameRunning}
                  className={`px-2 py-1 sm:px-4 sm:py-2 rounded-md sm:rounded-lg transition-colors text-xs sm:text-base ${
                    gameState.difficulty === key
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50'
                  }`}
                >
                  {config.name}
                </button>
              ))}
            </div>

            {/* Game Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-4 mb-3 sm:mb-6">
              <div className="bg-blue-100 rounded-lg p-2 sm:p-3 text-center">
                <div className="text-xs sm:text-sm font-semibold text-blue-700">Level</div>
                <div className="text-lg sm:text-xl font-bold text-blue-900">{gameState.currentLevel}</div>
              </div>
              <div className="bg-green-100 rounded-lg p-2 sm:p-3 text-center">
                <div className="text-xs sm:text-sm font-semibold text-green-700">Score</div>
                <div className="text-lg sm:text-xl font-bold text-green-900">{gameState.score.toLocaleString()}</div>
              </div>
              <div className="bg-orange-100 rounded-lg p-2 sm:p-3 text-center">
                <div className="text-xs sm:text-sm font-semibold text-orange-700 flex items-center justify-center gap-1">
                  <Clock size={12} />
                  Time
                </div>
                <div className="text-lg sm:text-xl font-bold text-orange-900">{gameState.timeLeft}s</div>
              </div>
              <div className="bg-purple-100 rounded-lg p-2 sm:p-3 text-center">
                <div className="text-xs sm:text-sm font-semibold text-purple-700">Matches</div>
                <div className="text-lg sm:text-xl font-bold text-purple-900">{gameState.matches}/{gameState.totalMatches}</div>
              </div>
              <div className="bg-yellow-100 rounded-lg p-2 sm:p-3 text-center col-span-2 sm:col-span-1">
                <div className="text-xs sm:text-sm font-semibold text-yellow-700 flex items-center justify-center gap-1">
                  <Star size={12} />
                  Streak
                </div>
                <div className="text-lg sm:text-xl font-bold text-yellow-900">{gameState.streak}</div>
                <div className="text-xs text-yellow-600">Best: {gameState.bestStreak}</div>
              </div>
            </div>

            {/* Game Controls */}
            <div className="flex justify-center gap-2 sm:gap-4 mb-3 sm:mb-6">
              <button
                onClick={gameState.gameStarted ? () => setGameState(prev => ({ ...prev, gameRunning: !prev.gameRunning })) : startGame}
                disabled={gameState.gameOver}
                className="flex items-center gap-1 sm:gap-2 bg-purple-500 disabled:bg-gray-400 text-white px-3 py-1 sm:px-6 sm:py-2 rounded-md sm:rounded-lg hover:bg-purple-600 transition-colors text-sm sm:text-base"
              >
                {!gameState.gameStarted ? <Play size={16} className="sm:w-5 sm:h-5" /> : gameState.gameRunning ? <Pause size={16} className="sm:w-5 sm:h-5" /> : <Play size={16} className="sm:w-5 sm:h-5" />}
                {!gameState.gameStarted ? 'Start' : gameState.gameRunning ? 'Pause' : 'Resume'}
              </button>
            </div>

            {/* Game Status Messages */}
            {!gameState.gameStarted && (
              <div className="text-center mb-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-blue-800 font-semibold">Match words with their definitions!</p>
                <p className="text-blue-600 text-sm mt-1">Click on a word, then click on its matching definition</p>
              </div>
            )}

            {gameState.gameOver && (
              <div className="text-center mb-4 p-4 bg-red-50 rounded-lg">
                <div className="flex items-center justify-center gap-2 text-red-800 font-bold text-lg mb-2">
                  <Trophy size={20} />
                  Game Over!
                </div>
                <p className="text-red-700">Final Score: {gameState.score.toLocaleString()}</p>
                <p className="text-red-600 text-sm">Best Streak: {gameState.bestStreak}</p>
              </div>
            )}

            {gameState.matches === gameState.totalMatches && gameState.gameStarted && !gameState.gameOver && (
              <div className="text-center mb-4 p-4 bg-green-50 rounded-lg">
                <div className="flex items-center justify-center gap-2 text-green-800 font-bold text-lg mb-2">
                  <Trophy size={20} />
                  Level {gameState.currentLevel} Complete!
                </div>
                <p className="text-green-700">Moving to next level...</p>
              </div>
            )}

            {/* Word Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 mb-4">
              {currentWords.map((word) => (
                <div
                  key={word.id}
                  onClick={() => handleWordClick(word)}
                  className={getWordStyle(word)}
                >
                  <div className="font-bold">{word.word}</div>
                  <div className="text-xs opacity-75 mt-1">{word.category}</div>
                </div>
              ))}
            </div>

            {/* Instructions */}
            <div className="text-center text-gray-600 text-xs sm:text-sm">
              <p className="mb-1">
                <strong>How to Play:</strong> Match each word with its correct definition
              </p>
              <p className="mb-1">
                <strong>Scoring:</strong> Base points + Time bonus + Streak bonus
              </p>
              <p>
                <strong>Controls:</strong> Click words to select, SPACE to pause/resume
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WordMatchingGame;