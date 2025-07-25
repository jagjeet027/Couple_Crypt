import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, RotateCcw, Trophy, Target } from 'lucide-react';

const Game2048 = ({ onBack }) => {
  const [grid, setGrid] = useState([]);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [moveCount, setMoveCount] = useState(0);

  // Initialize empty grid
  const createEmptyGrid = () => {
    return Array(4).fill().map(() => Array(4).fill(0));
  };

  // Add random tile (2 or 4)
  const addRandomTile = useCallback((currentGrid) => {
    const newGrid = currentGrid.map(row => [...row]);
    const emptyCells = [];
    
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if (newGrid[i][j] === 0) {
          emptyCells.push([i, j]);
        }
      }
    }
    
    if (emptyCells.length > 0) {
      const [row, col] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      newGrid[row][col] = Math.random() < 0.9 ? 2 : 4;
    }
    
    return newGrid;
  }, []);

  // Initialize game
  const initializeGame = useCallback(() => {
    let newGrid = createEmptyGrid();
    newGrid = addRandomTile(newGrid);
    newGrid = addRandomTile(newGrid);
    
    setGrid(newGrid);
    setScore(0);
    setGameOver(false);
    setGameWon(false);
    setMoveCount(0);
  }, [addRandomTile]);

  // Initialize on component mount
  useEffect(() => {
    const savedBest = localStorage.getItem('2048-best-score');
    if (savedBest) {
      setBestScore(parseInt(savedBest));
    }
    initializeGame();
  }, [initializeGame]);

  // Update best score
  useEffect(() => {
    if (score > bestScore) {
      setBestScore(score);
      localStorage.setItem('2048-best-score', score.toString());
    }
  }, [score, bestScore]);

  // Move tiles left
  const moveLeft = (currentGrid) => {
    const newGrid = currentGrid.map(row => {
      // Filter out zeros and move tiles left
      const filteredRow = row.filter(cell => cell !== 0);
      const newRow = [...filteredRow];
      
      // Merge tiles
      for (let i = 0; i < newRow.length - 1; i++) {
        if (newRow[i] === newRow[i + 1]) {
          newRow[i] *= 2;
          newRow[i + 1] = 0;
          setScore(prev => prev + newRow[i]);
          
          // Check for 2048 tile
          if (newRow[i] === 2048 && !gameWon) {
            setGameWon(true);
          }
        }
      }
      
      // Filter again and pad with zeros
      const finalRow = newRow.filter(cell => cell !== 0);
      while (finalRow.length < 4) {
        finalRow.push(0);
      }
      
      return finalRow;
    });
    
    return newGrid;
  };

  // Rotate grid 90 degrees clockwise
  const rotateGrid = (currentGrid) => {
    const newGrid = createEmptyGrid();
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        newGrid[j][3 - i] = currentGrid[i][j];
      }
    }
    return newGrid;
  };

  // Move in any direction
  const move = (direction) => {
    if (gameOver) return;
    
    let newGrid = grid.map(row => [...row]);
    let rotations = 0;
    
    // Rotate grid to make all moves equivalent to moving left
    switch (direction) {
      case 'up':
        rotations = 3;
        break;
      case 'right':
        rotations = 2;
        break;
      case 'down':
        rotations = 1;
        break;
      default: // left
        rotations = 0;
    }
    
    // Rotate grid
    for (let i = 0; i < rotations; i++) {
      newGrid = rotateGrid(newGrid);
    }
    
    // Move left
    const movedGrid = moveLeft(newGrid);
    
    // Rotate back
    for (let i = 0; i < (4 - rotations) % 4; i++) {
      newGrid = rotateGrid(movedGrid);
    }
    if (rotations > 0) {
      newGrid = movedGrid;
      for (let i = 0; i < (4 - rotations) % 4; i++) {
        newGrid = rotateGrid(newGrid);
      }
    } else {
      newGrid = movedGrid;
    }
    
    // Check if grid changed
    const gridChanged = !gridsEqual(grid, newGrid);
    
    if (gridChanged) {
      const finalGrid = addRandomTile(newGrid);
      setGrid(finalGrid);
      setMoveCount(prev => prev + 1);
      
      // Check game over
      if (isGameOver(finalGrid)) {
        setGameOver(true);
      }
    }
  };

  // Check if two grids are equal
  const gridsEqual = (grid1, grid2) => {
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if (grid1[i][j] !== grid2[i][j]) {
          return false;
        }
      }
    }
    return true;
  };

  // Check if game is over
  const isGameOver = (currentGrid) => {
    // Check for empty cells
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if (currentGrid[i][j] === 0) {
          return false;
        }
      }
    }
    
    // Check for possible merges
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const current = currentGrid[i][j];
        if (
          (i < 3 && current === currentGrid[i + 1][j]) ||
          (j < 3 && current === currentGrid[i][j + 1])
        ) {
          return false;
        }
      }
    }
    
    return true;
  };

  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = (e) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          move('up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          move('down');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          move('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          move('right');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [grid, gameOver]);

  // Get tile color
  const getTileColor = (value) => {
    const colors = {
      0: 'bg-gray-200',
      2: 'bg-gray-100 text-gray-800',
      4: 'bg-gray-200 text-gray-800',
      8: 'bg-orange-200 text-white',
      16: 'bg-orange-300 text-white',
      32: 'bg-orange-400 text-white',
      64: 'bg-orange-500 text-white',
      128: 'bg-yellow-300 text-white text-3xl',
      256: 'bg-yellow-400 text-white text-3xl',
      512: 'bg-yellow-500 text-white text-3xl',
      1024: 'bg-red-400 text-white text-2xl',
      2048: 'bg-red-500 text-white text-2xl animate-pulse'
    };
    
    return colors[value] || 'bg-red-600 text-white text-xl';
  };

  // Touch handling for mobile
  const [touchStart, setTouchStart] = useState(null);
  
  const handleTouchStart = (e) => {
    setTouchStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    });
  };

  const handleTouchEnd = (e) => {
    if (!touchStart) return;
    
    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY
    };
    
    const diffX = touchStart.x - touchEnd.x;
    const diffY = touchStart.y - touchEnd.y;
    
    const minSwipeDistance = 50;
    
    if (Math.abs(diffX) > Math.abs(diffY)) {
      if (Math.abs(diffX) > minSwipeDistance) {
        move(diffX > 0 ? 'left' : 'right');
      }
    } else {
      if (Math.abs(diffY) > minSwipeDistance) {
        move(diffY > 0 ? 'up' : 'down');
      }
    }
    
    setTouchStart(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-900 via-red-800 to-pink-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={onBack}
              className="flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors"
            >
              <ArrowLeft size={20} />
              Back
            </button>
            <h1 className="text-3xl font-bold text-white">🔢 2048</h1>
            <button 
              onClick={initializeGame}
              className="flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors"
            >
              <RotateCcw size={20} />
              New Game
            </button>
          </div>

          <div className="bg-white rounded-xl p-6">
            {/* Score Section */}
            <div className="flex justify-center gap-8 mb-6">
              <div className="text-center bg-orange-100 rounded-lg p-4">
                <div className="text-lg font-bold text-orange-700">Score</div>
                <div className="text-2xl font-bold text-orange-900">{score}</div>
              </div>
              <div className="text-center bg-yellow-100 rounded-lg p-4">
                <div className="text-lg font-bold text-yellow-700">Best</div>
                <div className="text-2xl font-bold text-yellow-900">{bestScore}</div>
              </div>
              <div className="text-center bg-blue-100 rounded-lg p-4">
                <div className="text-lg font-bold text-blue-700">Moves</div>
                <div className="text-2xl font-bold text-blue-900">{moveCount}</div>
              </div>
            </div>

            {/* Game Won Modal */}
            {gameWon && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-2xl p-8 text-center max-w-md mx-4">
                  <div className="text-6xl mb-4">🎉</div>
                  <h2 className="text-3xl font-bold mb-4 text-yellow-600">You Win!</h2>
                  <p className="text-lg mb-6">You reached the 2048 tile!</p>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setGameWon(false)}
                      className="flex-1 bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 transition-colors"
                    >
                      Keep Playing
                    </button>
                    <button
                      onClick={initializeGame}
                      className="flex-1 bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 transition-colors"
                    >
                      New Game
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Game Over Modal */}
            {gameOver && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-2xl p-8 text-center max-w-md mx-4">
                  <div className="text-6xl mb-4">😔</div>
                  <h2 className="text-3xl font-bold mb-4 text-red-600">Game Over</h2>
                  <p className="text-lg mb-2">Final Score: <strong>{score}</strong></p>
                  <p className="text-sm text-gray-600 mb-6">Moves: {moveCount}</p>
                  <button
                    onClick={initializeGame}
                    className="w-full bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}

            {/* Game Board */}
            <div className="flex justify-center mb-6">
              <div 
                className="grid grid-cols-4 gap-3 bg-gray-300 p-4 rounded-xl"
                style={{ width: '320px', height: '320px' }}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                {grid.map((row, rowIndex) =>
                  row.map((cell, colIndex) => (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      className={`w-16 h-16 rounded-lg flex items-center justify-center font-bold text-lg transition-all duration-200 ${getTileColor(cell)}`}
                    >
                      {cell !== 0 && cell}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Mobile Controls */}
            <div className="flex flex-col items-center gap-2 mb-6">
              <button 
                onClick={() => move('up')}
                className="w-12 h-12 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-bold text-xl"
              >
                ↑
              </button>
              <div className="flex gap-2">
                <button 
                  onClick={() => move('left')}
                  className="w-12 h-12 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-bold text-xl"
                >
                  ←
                </button>
                <button 
                  onClick={() => move('right')}
                  className="w-12 h-12 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-bold text-xl"
                >
                  →
                </button>
              </div>
              <button 
                onClick={() => move('down')}
                className="w-12 h-12 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-bold text-xl"
              >
                ↓
              </button>
            </div>

            {/* Instructions */}
            <div className="text-center text-gray-600">
              <p className="mb-2">
                <strong>Goal:</strong> Combine tiles with the same number to reach 2048!
              </p>
              <div className="text-sm">
                <p className="mb-1">
                  <strong>Desktop:</strong> Use arrow keys to move tiles
                </p>
                <p>
                  <strong>Mobile:</strong> Swipe or use the direction buttons
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Game2048;