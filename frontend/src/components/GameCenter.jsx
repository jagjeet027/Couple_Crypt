import React, { useState } from 'react';
import { Gamepad2, Trophy, Star, Play, ArrowLeft } from 'lucide-react';

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

const GameCenter = ({ userData, roomData, onNavigateBack, onNavigateHome }) => {
  const [currentView, setCurrentView] = useState('center'); // 'center' ya specific game id
  
  const gameList = [
    { id: 'snake', name: 'Snake Game', icon: '🐍', color: 'bg-green-500' },
    { id: 'tictactoe', name: 'Tic Tac Toe', icon: '⭕', color: 'bg-blue-500' },
    { id: 'memory', name: 'Memory Cards', icon: '🧠', color: 'bg-purple-500' },
    { id: '2048', name: '2048 Puzzle', icon: '🔢', color: 'bg-orange-500' },
    { id: 'pong', name: 'Pong', icon: '🏓', color: 'bg-red-500' },
    { id: 'breakout', name: 'Breakout', icon: '🧱', color: 'bg-yellow-500' },
    { id: 'flappybird', name: 'Flappy Bird', icon: '🐦', color: 'bg-cyan-500' },
    { id: 'sudoku', name: 'Sudoku', icon: '📋', color: 'bg-indigo-500' },
    { id: 'tetris', name: 'Tetris', icon: '🟦', color: 'bg-pink-500' },
    { id: 'wordguess', name: 'Word Guess', icon: '📝', color: 'bg-teal-500' },
    { id: 'rockpaper', name: 'Rock Paper Scissors', icon: '✂️', color: 'bg-gray-500' },
    { id: 'simon', name: 'Simon Says', icon: '🎵', color: 'bg-emerald-500' }
  ];

  // Game navigation functions
  const handleBackFromGameCenter = () => {
    if (onNavigateBack) {
      onNavigateBack();
    }
  };

  const handleGameSelect = (gameId) => {
    setCurrentView(gameId);
  };

  const handleBackToGameCenter = () => {
    setCurrentView('center');
  };

  // Main render function - yahan aap apne games ko render karenge
  const renderCurrentView = () => {
    // Agar Game Center view hai
    if (currentView === 'center') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4">
          <div className="max-w-6xl mx-auto">
            {/* Header with proper back button */}
            <div className="flex items-center justify-between mb-8">
              <button 
                onClick={handleBackFromGameCenter}
                className="flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors"
              >
                <ArrowLeft size={20} />
                {roomData ? 'Back to Chat' : 'Back'}
              </button>
              
              {userData && (
                <div className="text-white/80 text-sm">
                  Welcome, {userData.email}
                </div>
              )}
            </div>

            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Gamepad2 size={48} className="text-white" />
                <h1 className="text-5xl font-bold text-white">Game Center</h1>
              </div>
              <p className="text-xl text-white/80">Choose from 12+ offline games</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {gameList.map((game) => (
                <div
                  key={game.id}
                  className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 hover:bg-white/20 transition-all duration-300 cursor-pointer transform hover:scale-105"
                  onClick={() => handleGameSelect(game.id)}
                >
                  <div className="text-center">
                    <div className={`w-20 h-20 ${game.color} rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl`}>
                      {game.icon}
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{game.name}</h3>
                    <button className="bg-white/20 text-white px-6 py-2 rounded-lg hover:bg-white/30 transition-colors flex items-center gap-2 mx-auto">
                      <Play size={16} />
                      Play Now
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 bg-white/10 backdrop-blur-lg rounded-2xl p-8">
              <div className="text-center">
                <Trophy className="mx-auto mb-4 text-yellow-400" size={48} />
                <h2 className="text-3xl font-bold text-white mb-4">Features</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-white">
                  <div>
                    <Star className="mx-auto mb-2 text-yellow-400" size={24} />
                    <h3 className="text-lg font-semibold mb-2">Offline Gaming</h3>
                    <p className="text-white/80">Play anywhere without internet connection</p>
                  </div>
                  <div>
                    <Gamepad2 className="mx-auto mb-2 text-blue-400" size={24} />
                    <h3 className="text-lg font-semibold mb-2">Cross Platform</h3>
                    <p className="text-white/80">Works on Android, laptop, and desktop</p>
                  </div>
                  <div>
                    <Trophy className="mx-auto mb-2 text-green-400" size={24} />
                    <h3 className="text-lg font-semibold mb-2">12+ Games</h3>
                    <p className="text-white/80">Variety of classic and modern games</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Individual games render - yahan aapke game components render honge
    switch (currentView) {
      case 'snake':
        return (
          <SnakeGame 
            onBack={handleBackToGameCenter}
            onNavigateHome={onNavigateHome}
            onNavigateToChat={onNavigateBack}
            userData={userData}
            roomData={roomData}
          />
        );
        
      case 'tictactoe':
        return (
          <TicTacToeGame 
            onBack={handleBackToGameCenter}
            onNavigateHome={onNavigateHome}
            onNavigateToChat={onNavigateBack}
            userData={userData}
            roomData={roomData}
          />
        );
        
      case 'memory':
        return (
          <MemoryGame 
            onBack={handleBackToGameCenter}
            onNavigateHome={onNavigateHome}
            onNavigateToChat={onNavigateBack}
            userData={userData}
            roomData={roomData}
          />
        );
        
      case '2048':
        return (
          <Game2048 
            onBack={handleBackToGameCenter}
            onNavigateHome={onNavigateHome}
            onNavigateToChat={onNavigateBack}
            userData={userData}
            roomData={roomData}
          />
        );
        
      case 'pong':
        return (
          <PongGame 
            onBack={handleBackToGameCenter}
            onNavigateHome={onNavigateHome}
            onNavigateToChat={onNavigateBack}
            userData={userData}
            roomData={roomData}
          />
        );
        
      case 'breakout':
        return (
          <BreakoutGame 
            onBack={handleBackToGameCenter}
            onNavigateHome={onNavigateHome}
            onNavigateToChat={onNavigateBack}
            userData={userData}
            roomData={roomData}
          />
        );
        
      case 'flappybird':
        return (
          <FlappyBirdGame 
            onBack={handleBackToGameCenter}
            onNavigateHome={onNavigateHome}
            onNavigateToChat={onNavigateBack}
            userData={userData}
            roomData={roomData}
          />
        );
        
      case 'sudoku':
        return (
          <SudokuGame 
            onBack={handleBackToGameCenter}
            onNavigateHome={onNavigateHome}
            onNavigateToChat={onNavigateBack}
            userData={userData}
            roomData={roomData}
          />
        );
        
      case 'tetris':
        return (
          <TetrisGame 
            onBack={handleBackToGameCenter}
            onNavigateHome={onNavigateHome}
            onNavigateToChat={onNavigateBack}
            userData={userData}
            roomData={roomData}
          />
        );
        
      case 'wordguess':
        return (
          <WordGuessGame 
            onBack={handleBackToGameCenter}
            onNavigateHome={onNavigateHome}
            onNavigateToChat={onNavigateBack}
            userData={userData}
            roomData={roomData}
          />
        );
        
      case 'rockpaper':
        return (
          <RockPaperScissorsGame 
            onBack={handleBackToGameCenter}
            onNavigateHome={onNavigateHome}
            onNavigateToChat={onNavigateBack}
            userData={userData}
            roomData={roomData}
          />
        );
        
      case 'simon':
        return (
          <SimonSaysGame 
            onBack={handleBackToGameCenter}
            onNavigateHome={onNavigateHome}
            onNavigateToChat={onNavigateBack}
            userData={userData}
            roomData={roomData}
          />
        );
        
      default:
        return (
          <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-700 p-4">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <button 
                  onClick={handleBackToGameCenter}
                  className="flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors"
                >
                  <ArrowLeft size={20} />
                  Back to Games
                </button>
              </div>
              <div className="text-center">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-12">
                  <h1 className="text-4xl font-bold text-white mb-4">Game not found</h1>
                  <p className="text-white/80">Please select a valid game</p>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return renderCurrentView();
};

export default GameCenter;