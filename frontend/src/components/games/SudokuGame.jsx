import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, RotateCcw, Clock, Target, Lightbulb, Play, Pause, Trophy, Star } from 'lucide-react';

const SudokuGame = ({ onBack }) => {
  const [grid, setGrid] = useState(Array(9).fill().map(() => Array(9).fill(0)));
  const [initialGrid, setInitialGrid] = useState(Array(9).fill().map(() => Array(9).fill(0)));
  const [selectedCell, setSelectedCell] = useState({ row: -1, col: -1 });
  const [time, setTime] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gamePaused, setGamePaused] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [difficulty, setDifficulty] = useState('easy');
  const [mistakes, setMistakes] = useState(0);
  const [hints, setHints] = useState(3);
  const [score, setScore] = useState(0);
  const [bestTimes, setBestTimes] = useState({ easy: null, medium: null, hard: null });

  const difficulties = {
    easy: { cellsToRemove: 40, maxHints: 5, name: 'Easy', color: 'green' },
    medium: { cellsToRemove: 50, maxHints: 3, name: 'Medium', color: 'yellow' },
    hard: { cellsToRemove: 60, maxHints: 1, name: 'Hard', color: 'red' }
  };

  useEffect(() => {
    generateNewGame();
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

  const generateSudoku = useCallback(() => {
    const grid = Array(9).fill().map(() => Array(9).fill(0));
    
    const isValid = (grid, row, col, num) => {
      for (let i = 0; i < 9; i++) {
        if (grid[row][i] === num || grid[i][col] === num) return false;
      }
      
      const boxRow = Math.floor(row / 3) * 3;
      const boxCol = Math.floor(col / 3) * 3;
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          if (grid[boxRow + i][boxCol + j] === num) return false;
        }
      }
      return true;
    };

    const solve = (grid) => {
      for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
          if (grid[row][col] === 0) {
            const numbers = [1,2,3,4,5,6,7,8,9].sort(() => Math.random() - 0.5);
            for (let num of numbers) {
              if (isValid(grid, row, col, num)) {
                grid[row][col] = num;
                if (solve(grid)) return true;
                grid[row][col] = 0;
              }
            }
            return false;
          }
        }
      }
      return true;
    };

    solve(grid);
    return grid;
  }, []);

  const removeCells = useCallback((grid, count) => {
    const newGrid = JSON.parse(JSON.stringify(grid));
    const cells = [];
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        cells.push([i, j]);
      }
    }
    
    cells.sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < count; i++) {
      const [row, col] = cells[i];
      newGrid[row][col] = 0;
    }
    
    return newGrid;
  }, []);

  const generateNewGame = useCallback(() => {
    const newGrid = generateSudoku();
    const puzzle = removeCells(newGrid, difficulties[difficulty].cellsToRemove);
    setGrid(puzzle);
    setInitialGrid(JSON.parse(JSON.stringify(puzzle)));
    setSelectedCell({ row: -1, col: -1 });
    setTime(0);
    setGameStarted(false);
    setGamePaused(false);
    setGameCompleted(false);
    setMistakes(0);
    setHints(difficulties[difficulty].maxHints);
    setScore(0);
  }, [difficulty, generateSudoku, removeCells]);

  const isValidMove = (row, col, num) => {
    const testGrid = [...grid];
    testGrid[row][col] = 0; // Temporarily remove current value
    
    for (let i = 0; i < 9; i++) {
      if (testGrid[row][i] === num || testGrid[i][col] === num) return false;
    }
    
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (testGrid[boxRow + i][boxCol + j] === num) return false;
      }
    }
    return true;
  };

  const handleCellClick = (row, col) => {
    if (initialGrid[row][col] !== 0) return;
    setSelectedCell({ row, col });
    if (!gameStarted) setGameStarted(true);
  };

  const handleNumberInput = (num) => {
    if (selectedCell.row === -1 || selectedCell.col === -1) return;
    
    const { row, col } = selectedCell;
    if (initialGrid[row][col] !== 0) return;

    const newGrid = [...grid];
    
    if (newGrid[row][col] === num) {
      newGrid[row][col] = 0;
    } else {
      if (newGrid[row][col] !== 0 && !isValidMove(row, col, num)) {
        setMistakes(prev => prev + 1);
      }
      newGrid[row][col] = num;
      
      if (isValidMove(row, col, num)) {
        setScore(prev => prev + 10);
      }
    }
    
    setGrid(newGrid);
    checkCompletion(newGrid);
  };

  const checkCompletion = (grid) => {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col] === 0) return false;
        
        // Check if current placement is valid
        const testGrid = [...grid];
        const currentValue = testGrid[row][col];
        testGrid[row][col] = 0;
        
        for (let i = 0; i < 9; i++) {
          if (testGrid[row][i] === currentValue || testGrid[i][col] === currentValue) return false;
        }
        
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            if (testGrid[boxRow + i][boxCol + j] === currentValue) return false;
          }
        }
      }
    }
    
    // Game completed successfully
    setGameCompleted(true);
    setGameStarted(false);
    
    // Calculate final score
    const timeBonus = Math.max(0, 3600 - time); // Bonus for faster completion
    const mistakesPenalty = mistakes * 50;
    const finalScore = score + timeBonus - mistakesPenalty;
    setScore(finalScore);
    
    // Update best time
    if (!bestTimes[difficulty] || time < bestTimes[difficulty]) {
      setBestTimes(prev => ({ ...prev, [difficulty]: time }));
    }
    
    return true;
  };

  const getHint = () => {
    if (hints <= 0) return;
    
    const emptyCells = [];
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col] === 0) {
          emptyCells.push([row, col]);
        }
      }
    }
    
    if (emptyCells.length === 0) return;
    
    const [row, col] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    for (let num = 1; num <= 9; num++) {
      if (isValidMove(row, col, num)) {
        const newGrid = [...grid];
        newGrid[row][col] = num;
        setGrid(newGrid);
        setHints(prev => prev - 1);
        setScore(prev => prev - 20); // Penalty for using hint
        break;
      }
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

  const getCellStyle = (row, col) => {
    const isSelected = selectedCell.row === row && selectedCell.col === col;
    const isInitial = initialGrid[row][col] !== 0;
    const isInvalid = grid[row][col] !== 0 && !isValidMove(row, col, grid[row][col]);
    
    let className = "w-8 h-8 border border-gray-300 flex items-center justify-center text-sm font-bold cursor-pointer transition-all ";
    
    if (isSelected) {
      className += "bg-blue-200 border-blue-500 ring-2 ring-blue-300 ";
    } else if (isInitial) {
      className += "bg-gray-100 text-gray-800 ";
    } else if (isInvalid) {
      className += "bg-red-100 text-red-600 animate-pulse ";
    } else {
      className += "bg-white hover:bg-blue-50 ";
    }
    
    if (row % 3 === 0) className += "border-t-2 border-t-gray-800 ";
    if (col % 3 === 0) className += "border-l-2 border-l-gray-800 ";
    if (row === 8) className += "border-b-2 border-b-gray-800 ";
    if (col === 8) className += "border-r-2 border-r-gray-800 ";
    
    return className;
  };

  const getDifficultyColor = (level) => {
    const colors = {
      easy: 'text-green-600 bg-green-100',
      medium: 'text-yellow-600 bg-yellow-100',
      hard: 'text-red-600 bg-red-100'
    };
    return colors[level] || 'text-gray-600 bg-gray-100';
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
            <h1 className="text-lg font-bold text-white">🧩 Sudoku</h1>
            <button 
              onClick={generateNewGame}
              className="flex items-center gap-1 bg-white/20 text-white px-2 py-1 rounded-md hover:bg-white/30 transition-colors text-xs"
            >
              <RotateCcw size={14} />
              New
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
            <div className="grid grid-cols-4 gap-2 mb-3 text-center">
              <div className="bg-blue-50 rounded-md p-2">
                <Clock size={12} className="mx-auto mb-1 text-blue-600" />
                <div className="text-xs font-bold text-blue-800">{formatTime(time)}</div>
              </div>
              <div className="bg-red-50 rounded-md p-2">
                <Target size={12} className="mx-auto mb-1 text-red-600" />
                <div className="text-xs font-bold text-red-800">{mistakes}</div>
              </div>
              <div className="bg-yellow-50 rounded-md p-2">
                <Lightbulb size={12} className="mx-auto mb-1 text-yellow-600" />
                <div className="text-xs font-bold text-yellow-800">{hints}</div>
              </div>
              <div className="bg-green-50 rounded-md p-2">
                <Star size={12} className="mx-auto mb-1 text-green-600" />
                <div className="text-xs font-bold text-green-800">{score}</div>
              </div>
            </div>

            {/* Game Controls */}
            <div className="flex gap-2 mb-3">
              <button 
                onClick={togglePause}
                disabled={!gameStarted}
                className="flex items-center gap-1 bg-blue-500 disabled:bg-gray-400 text-white px-3 py-1 rounded-md hover:bg-blue-600 transition-colors text-xs flex-1"
              >
                {gamePaused ? <Play size={12} /> : <Pause size={12} />}
                {gamePaused ? 'Resume' : 'Pause'}
              </button>
              <button
                onClick={getHint}
                disabled={hints <= 0 || !gameStarted}
                className="bg-yellow-500 disabled:bg-gray-400 text-white px-3 py-1 rounded-md hover:bg-yellow-600 transition-colors text-xs"
              >
                Hint ({hints})
              </button>
            </div>

            {gameCompleted && (
              <div className="text-center mb-3 p-2 bg-green-100 rounded-md">
                <div className="text-green-600 text-sm font-bold">🎉 Completed!</div>
                <div className="text-green-700 text-xs">Score: {score} | Time: {formatTime(time)}</div>
              </div>
            )}

            {gamePaused && gameStarted && (
              <div className="text-center mb-3 p-2 bg-blue-100 rounded-md">
                <div className="text-blue-600 text-sm font-bold">⏸️ Game Paused</div>
              </div>
            )}

            {/* Game Board */}
            <div className="flex justify-center mb-3">
              <div className={`grid grid-cols-9 gap-0 border-2 border-gray-800 bg-white rounded-md overflow-hidden ${gamePaused ? 'opacity-30' : ''}`}>
                {grid.map((row, rowIndex) =>
                  row.map((cell, colIndex) => (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      className={getCellStyle(rowIndex, colIndex)}
                      onClick={() => !gamePaused && handleCellClick(rowIndex, colIndex)}
                    >
                      {cell !== 0 ? cell : ''}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Number Pad */}
            <div className="grid grid-cols-5 gap-1 mb-3">
              {[1,2,3,4,5,6,7,8,9,0].map(num => (
                <button
                  key={num}
                  onClick={() => handleNumberInput(num)}
                  disabled={gamePaused}
                  className={`h-8 bg-gray-100 disabled:bg-gray-200 disabled:text-gray-400 text-gray-800 rounded-md hover:bg-gray-200 transition-colors text-sm font-bold ${
                    num === 0 ? 'col-span-1 bg-red-100 hover:bg-red-200 text-red-600' : ''
                  }`}
                >
                  {num === 0 ? '×' : num}
                </button>
              ))}
            </div>

            {/* Best Times */}
            {bestTimes[difficulty] && (
              <div className="text-center text-xs text-gray-600">
                <Trophy size={12} className="inline mr-1" />
                Best {difficulties[difficulty].name}: {formatTime(bestTimes[difficulty])}
              </div>
            )}

            {/* Instructions */}
            <div className="text-center text-gray-600 text-xs mt-2">
              <p>Fill each row, column, and 3×3 box with numbers 1-9</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SudokuGame;