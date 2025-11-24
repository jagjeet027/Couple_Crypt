import React, { useState } from 'react';
import { Gamepad2, Trophy, Star, Play, ArrowLeft, Home, Zap, Users } from 'lucide-react';

// Import your existing game components here
import SnakeGame from '../components/games/SnakeGame';
import TicTacToeGame from '../components/games/TicTacToe';
import MemoryGame from '../components/games/MemoryGame';
import Game2048 from '../components/games/Game2048';
import PongGame from '../components/games/PongGame';
import BreakoutGame from '../components/games/BreakoutGame';
import FlappyBirdGame from '../components/games/FlappyBirdsGame';
import SudokuGame from '../components/games/SudokuGame';
import TetrisGame from '../components/games/TetrisGame';
import WordGuessGame from '../components/games/WordMatchingGame';
import RockPaperScissorsGame from '../components/games/RockPaperScissors';
import SimonSaysGame from '../components/games/SimonSaysGame';

const GameCenter = ({ 
  userData = null, 
  roomData = null, 
  onNavigateBack, 
  onNavigateHome
}) => {
  const [currentView, setCurrentView] = useState('center');
  const [selectedGameId, setSelectedGameId] = useState(null);
  
  const gameList = [
    { 
      id: 'snake', 
      name: 'Snake Game', 
      icon: '🐍', 
      color: 'from-green-400 to-emerald-600',
      description: 'Classic snake game',
      difficulty: 'Easy',
      players: '1'
    },
    { 
      id: 'tictactoe', 
      name: 'Tic Tac Toe', 
      icon: '⭕', 
      color: 'from-blue-400 to-blue-600',
      description: 'Strategic board game',
      difficulty: 'Easy',
      players: '2'
    },
    { 
      id: 'memory', 
      name: 'Memory Cards', 
      icon: '🧠', 
      color: 'from-purple-400 to-purple-600',
      description: 'Test your memory',
      difficulty: 'Medium',
      players: '1'
    },
    { 
      id: '2048', 
      name: '2048 Puzzle', 
      icon: '🔢', 
      color: 'from-orange-400 to-orange-600',
      description: 'Number puzzle game',
      difficulty: 'Hard',
      players: '1'
    },
    { 
      id: 'pong', 
      name: 'Pong', 
      icon: '🏓', 
      color: 'from-red-400 to-red-600',
      description: 'Classic arcade game',
      difficulty: 'Medium',
      players: '2'
    },
    { 
      id: 'breakout', 
      name: 'Breakout', 
      icon: '🧱', 
      color: 'from-yellow-400 to-yellow-600',
      description: 'Brick breaker game',
      difficulty: 'Medium',
      players: '1'
    },
    { 
      id: 'flappybird', 
      name: 'Flappy Bird', 
      icon: '🐦', 
      color: 'from-cyan-400 to-cyan-600',
      description: 'Tap to fly',
      difficulty: 'Hard',
      players: '1'
    },
    { 
      id: 'sudoku', 
      name: 'Sudoku', 
      icon: '📋', 
      color: 'from-indigo-400 to-indigo-600',
      description: 'Number logic puzzle',
      difficulty: 'Hard',
      players: '1'
    },
    { 
      id: 'tetris', 
      name: 'Tetris', 
      icon: '🟦', 
      color: 'from-pink-400 to-pink-600',
      description: 'Stack the blocks',
      difficulty: 'Hard',
      players: '1'
    },
    { 
      id: 'wordguess', 
      name: 'Word Guess', 
      icon: '📝', 
      color: 'from-teal-400 to-teal-600',
      description: 'Guess the word',
      difficulty: 'Medium',
      players: '1'
    },
    { 
      id: 'rockpaper', 
      name: 'Rock Paper Scissors', 
      icon: '✂️', 
      color: 'from-gray-400 to-gray-600',
      description: 'Beat the computer',
      difficulty: 'Easy',
      players: '2'
    },
    { 
      id: 'simon', 
      name: 'Simon Says', 
      icon: '🎵', 
      color: 'from-emerald-400 to-emerald-600',
      description: 'Memory sequence game',
      difficulty: 'Medium',
      players: '1'
    }
  ];

  // Back to Game Center from Game
  const handleBackToGameCenter = () => {
    console.log('Back to Game Center clicked');
    setCurrentView('center');
    setSelectedGameId(null);
  };

  // Back to Previous View (Chat/Home)
  const handleBackFromGameCenter = () => {
    console.log('✅ Back Button Clicked');
    console.log('onNavigateBack type:', typeof onNavigateBack);
    onNavigateBack();
  };

  // Navigate to Home
  const handleNavigateHome = () => {
    console.log('✅ Home Button Clicked');
    console.log('onNavigateHome type:', typeof onNavigateHome);
    onNavigateHome();
  };

  // Select and play game
  const handleGameSelect = (gameId) => {
    console.log('Game selected:', gameId);
    setSelectedGameId(gameId);
    setCurrentView(gameId);
  };

  // Main render function
  const renderCurrentView = () => {
    // Game Center View
    if (currentView === 'center') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
          {/* ===== ANIMATED BACKGROUND ===== */}
          <div className="fixed inset-0 z-0">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.05)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
            
            {/* Animated Blobs */}
            <div className="absolute top-0 left-0 w-64 sm:w-80 md:w-96 h-64 sm:h-80 md:h-96 bg-rose-500 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-pulse"></div>
            <div className="absolute top-0 right-0 w-64 sm:w-80 md:w-96 h-64 sm:h-80 md:h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-pulse" style={{ animationDelay: '2s' }}></div>
            <div className="absolute bottom-0 left-1/3 w-64 sm:w-80 md:w-96 h-64 sm:h-80 md:h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-pulse" style={{ animationDelay: '4s' }}></div>
          </div>

          {/* ===== CONTENT ===== */}
          <div className="relative z-10 min-h-screen flex flex-col">
            {/* ===== HEADER ===== */}
            <div className="px-4 sm:px-6 lg:px-8 py-2 sm:py-3">
              <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2 sm:gap-3">
                <button 
                  onClick={handleBackFromGameCenter}
                  className="flex items-center gap-1 sm:gap-2 bg-slate-800/50 backdrop-blur-md text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg hover:bg-slate-700/50 active:bg-rose-500/30 transition-all border border-purple-500/30 hover:border-rose-500/50 group text-xs sm:text-sm font-semibold"
                >
                  <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                  Back
                </button>

                <button
                  onClick={handleNavigateHome}
                  className="flex items-center gap-1 sm:gap-2 bg-slate-800/50 backdrop-blur-md text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg hover:bg-slate-700/50 active:bg-rose-500/30 transition-all border border-purple-500/30 hover:border-rose-500/50 group text-xs sm:text-sm font-semibold"
                >
                  <Home size={14} className="group-hover:scale-110 transition-transform" />
                  Home
                </button>
              </div>

              {/* ===== TITLE SECTION ===== */}
              <div className="text-center mb-4 sm:mb-6">
                <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                  <Gamepad2 size={24} className="sm:w-8 sm:h-8 text-rose-400 animate-pulse" />
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-black bg-gradient-to-r from-rose-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Game Center
                  </h1>
                  <Zap size={24} className="sm:w-8 sm:h-8 text-yellow-400 animate-pulse" style={{ animationDelay: '0.5s' }} />
                </div>
                <p className="text-xs text-purple-300 font-semibold tracking-wide">
                  🎮 12+ Games • Fun & Skills 🎮
                </p>
              </div>

              {/* ===== STATS BAR ===== */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-4 sm:mb-6 max-w-4xl mx-auto">
                <div className="bg-slate-800/40 backdrop-blur-md border border-purple-500/30 rounded-lg p-1.5 sm:p-2 text-center hover:border-rose-500/50 transition-all">
                  <div className="text-lg sm:text-xl font-bold text-rose-400">12+</div>
                  <div className="text-xs text-purple-300">Games</div>
                </div>
                <div className="bg-slate-800/40 backdrop-blur-md border border-purple-500/30 rounded-lg p-1.5 sm:p-2 text-center hover:border-rose-500/50 transition-all">
                  <div className="text-lg sm:text-xl font-bold text-purple-400">∞</div>
                  <div className="text-xs text-purple-300">Fun</div>
                </div>
                <div className="bg-slate-800/40 backdrop-blur-md border border-purple-500/30 rounded-lg p-1.5 sm:p-2 text-center hover:border-rose-500/50 transition-all">
                  <div className="text-lg sm:text-xl font-bold text-pink-400">🏆</div>
                  <div className="text-xs text-purple-300">Offline</div>
                </div>
              </div>
            </div>

            {/* ===== GAMES GRID ===== */}
            <div className="flex-1 px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12">
              <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                  {gameList.map((game) => (
                    <div
                      key={game.id}
                      onClick={() => handleGameSelect(game.id)}
                      className="group cursor-pointer"
                    >
                      <div className="bg-slate-800/40 backdrop-blur-md border border-purple-500/30 rounded-2xl p-3 sm:p-4 lg:p-6 hover:border-rose-500/50 hover:bg-slate-800/60 transition-all duration-300 h-full flex flex-col justify-between transform hover:scale-105 hover:shadow-2xl hover:shadow-rose-500/20"
                      >
                        {/* Game Icon */}
                        <div className={`w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br ${game.color} rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 text-3xl sm:text-4xl shadow-lg transform group-hover:scale-110 transition-transform`}>
                          {game.icon}
                        </div>

                        {/* Game Name */}
                        <h3 className="text-sm sm:text-base lg:text-lg font-bold text-white mb-1 sm:mb-2 text-center line-clamp-2">
                          {game.name}
                        </h3>

                        {/* Description */}
                        <p className="text-xs sm:text-xs text-purple-300 text-center mb-2 sm:mb-3 line-clamp-1">
                          {game.description}
                        </p>

                        {/* Game Info */}
                        <div className="grid grid-cols-2 gap-1 sm:gap-2 mb-3 sm:mb-4 text-xs">
                          <div className="bg-slate-700/50 rounded-lg px-2 py-1 text-center">
                            <div className="text-purple-300 font-semibold">{game.difficulty}</div>
                          </div>
                          <div className="bg-slate-700/50 rounded-lg px-2 py-1 text-center flex items-center justify-center gap-1">
                            <Users size={12} className="text-rose-400" />
                            <div className="text-purple-300 font-semibold">{game.players}P</div>
                          </div>
                        </div>

                        {/* Play Button */}
                        <button className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white py-2 sm:py-2.5 rounded-lg font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1 sm:gap-2 shadow-lg"
                        >
                          <Play size={14} className="sm:w-4 sm:h-4" />
                          Play
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ===== FEATURES SECTION ===== */}
                <div className="mt-12 sm:mt-16 lg:mt-20">
                  <div className="bg-slate-800/40 backdrop-blur-md border border-purple-500/30 rounded-2xl p-6 sm:p-8 lg:p-12 hover:border-rose-500/50 transition-all">
                    <div className="text-center mb-8 sm:mb-10">
                      <Trophy className="mx-auto mb-3 sm:mb-4 text-yellow-400 w-8 h-8 sm:w-10 sm:h-10" />
                      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 sm:mb-3">
                        Why Play Here?
                      </h2>
                      <p className="text-purple-300 text-xs sm:text-sm">
                        Experience the ultimate gaming platform for couples
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                      <div className="bg-slate-700/30 rounded-xl p-4 sm:p-6 text-center hover:bg-slate-700/50 transition-all border border-purple-500/20">
                        <Star className="mx-auto mb-2 sm:mb-3 text-yellow-400 w-6 h-6 sm:w-8 sm:h-8" />
                        <h3 className="text-sm sm:text-base font-bold text-white mb-1 sm:mb-2">
                          Offline Gaming
                        </h3>
                        <p className="text-xs sm:text-sm text-purple-300">
                          Play anywhere, anytime
                        </p>
                      </div>

                      <div className="bg-slate-700/30 rounded-xl p-4 sm:p-6 text-center hover:bg-slate-700/50 transition-all border border-purple-500/20">
                        <Gamepad2 className="mx-auto mb-2 sm:mb-3 text-blue-400 w-6 h-6 sm:w-8 sm:h-8" />
                        <h3 className="text-sm sm:text-base font-bold text-white mb-1 sm:mb-2">
                          Cross Platform
                        </h3>
                        <p className="text-xs sm:text-sm text-purple-300">
                          Mobile & Desktop
                        </p>
                      </div>

                      <div className="bg-slate-700/30 rounded-xl p-4 sm:p-6 text-center hover:bg-slate-700/50 transition-all border border-purple-500/20">
                        <Trophy className="mx-auto mb-2 sm:mb-3 text-green-400 w-6 h-6 sm:w-8 sm:h-8" />
                        <h3 className="text-sm sm:text-base font-bold text-white mb-1 sm:mb-2">
                          Classic Games
                        </h3>
                        <p className="text-xs sm:text-sm text-purple-300">
                          12+ Games
                        </p>
                      </div>

                      <div className="bg-slate-700/30 rounded-xl p-4 sm:p-6 text-center hover:bg-slate-700/50 transition-all border border-purple-500/20">
                        <Zap className="mx-auto mb-2 sm:mb-3 text-purple-400 w-6 h-6 sm:w-8 sm:h-8" />
                        <h3 className="text-sm sm:text-base font-bold text-white mb-1 sm:mb-2">
                          No Ads
                        </h3>
                        <p className="text-xs sm:text-sm text-purple-300">
                          Pure gaming fun
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Individual games render
    switch (currentView) {
      case 'snake':
        return (
          <SnakeGame 
            onBack={handleBackToGameCenter}
            onNavigateHome={handleNavigateHome}
            onNavigateToChat={handleBackFromGameCenter}
            userData={userData}
            roomData={roomData}
          />
        );
        
      case 'tictactoe':
        return (
          <TicTacToeGame 
            onBack={handleBackToGameCenter}
            onNavigateHome={handleNavigateHome}
            onNavigateToChat={handleBackFromGameCenter}
            userData={userData}
            roomData={roomData}
          />
        );
        
      case 'memory':
        return (
          <MemoryGame 
            onBack={handleBackToGameCenter}
            onNavigateHome={handleNavigateHome}
            onNavigateToChat={handleBackFromGameCenter}
            userData={userData}
            roomData={roomData}
          />
        );
        
      case '2048':
        return (
          <Game2048 
            onBack={handleBackToGameCenter}
            onNavigateHome={handleNavigateHome}
            onNavigateToChat={handleBackFromGameCenter}
            userData={userData}
            roomData={roomData}
          />
        );
        
      case 'pong':
        return (
          <PongGame 
            onBack={handleBackToGameCenter}
            onNavigateHome={handleNavigateHome}
            onNavigateToChat={handleBackFromGameCenter}
            userData={userData}
            roomData={roomData}
          />
        );
        
      case 'breakout':
        return (
          <BreakoutGame 
            onBack={handleBackToGameCenter}
            onNavigateHome={handleNavigateHome}
            onNavigateToChat={handleBackFromGameCenter}
            userData={userData}
            roomData={roomData}
          />
        );
        
      case 'flappybird':
        return (
          <FlappyBirdGame 
            onBack={handleBackToGameCenter}
            onNavigateHome={handleNavigateHome}
            onNavigateToChat={handleBackFromGameCenter}
            userData={userData}
            roomData={roomData}
          />
        );
        
      case 'sudoku':
        return (
          <SudokuGame 
            onBack={handleBackToGameCenter}
            onNavigateHome={handleNavigateHome}
            onNavigateToChat={handleBackFromGameCenter}
            userData={userData}
            roomData={roomData}
          />
        );
        
      case 'tetris':
        return (
          <TetrisGame 
            onBack={handleBackToGameCenter}
            onNavigateHome={handleNavigateHome}
            onNavigateToChat={handleBackFromGameCenter}
            userData={userData}
            roomData={roomData}
          />
        );
        
      case 'wordguess':
        return (
          <WordGuessGame 
            onBack={handleBackToGameCenter}
            onNavigateHome={handleNavigateHome}
            onNavigateToChat={handleBackFromGameCenter}
            userData={userData}
            roomData={roomData}
          />
        );
        
      case 'rockpaper':
        return (
          <RockPaperScissorsGame 
            onBack={handleBackToGameCenter}
            onNavigateHome={handleNavigateHome}
            onNavigateToChat={handleBackFromGameCenter}
            userData={userData}
            roomData={roomData}
          />
        );
        
      case 'simon':
        return (
          <SimonSaysGame 
            onBack={handleBackToGameCenter}
            onNavigateHome={handleNavigateHome}
            onNavigateToChat={handleBackFromGameCenter}
            userData={userData}
            roomData={roomData}
          />
        );
        
      default:
        return (
          <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 sm:p-6 flex items-center justify-center">
            <div className="bg-slate-800/40 backdrop-blur-md border border-purple-500/30 rounded-2xl p-6 sm:p-8 text-center max-w-md">
              <div className="text-5xl mb-4">🎮</div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">Game not found</h1>
              <p className="text-purple-300 mb-6 text-sm sm:text-base">
                Please select a valid game to play
              </p>
              <button 
                onClick={handleBackToGameCenter}
                className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white px-6 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 mx-auto transition-all"
              >
                <ArrowLeft size={18} />
                Back to Games
              </button>
            </div>
          </div>
        );
    }
  };

  return renderCurrentView();
};

export default GameCenter;