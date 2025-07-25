import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, RotateCcw, Trophy, Play, Pause, RotateCw } from 'lucide-react';

const TetrisGame = ({ onBack }) => {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('menu'); // 'menu', 'playing', 'paused', 'gameOver'
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [highScore, setHighScore] = useState(0);
  
  // Game objects
  const gameObjects = useRef({
    board: Array(20).fill().map(() => Array(10).fill(0)),
    currentPiece: null,
    nextPiece: null,
    dropTime: 0,
    fallSpeed: 1000
  });

  const BOARD_WIDTH = 10;
  const BOARD_HEIGHT = 20;
  const BLOCK_SIZE = 30;
  
  // Tetris pieces (Tetrominoes)
  const PIECES = {
    I: { shape: [[1,1,1,1]], color: '#00FFFF' },
    O: { shape: [[1,1],[1,1]], color: '#FFFF00' },
    T: { shape: [[0,1,0],[1,1,1]], color: '#800080' },
    S: { shape: [[0,1,1],[1,1,0]], color: '#00FF00' },
    Z: { shape: [[1,1,0],[0,1,1]], color: '#FF0000' },
    J: { shape: [[1,0,0],[1,1,1]], color: '#0000FF' },
    L: { shape: [[0,0,1],[1,1,1]], color: '#FFA500' }
  };

  const PIECE_TYPES = Object.keys(PIECES);

  // Create random piece
  const createPiece = () => {
    const type = PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
    return {
      type,
      shape: PIECES[type].shape,
      color: PIECES[type].color,
      x: Math.floor(BOARD_WIDTH / 2) - Math.floor(PIECES[type].shape[0].length / 2),
      y: 0
    };
  };

  // Initialize game
  const initializeGame = useCallback(() => {
    gameObjects.current.board = Array(20).fill().map(() => Array(10).fill(0));
    gameObjects.current.currentPiece = createPiece();
    gameObjects.current.nextPiece = createPiece();
    gameObjects.current.dropTime = 0;
    gameObjects.current.fallSpeed = Math.max(50, 1000 - (level - 1) * 100);
    setScore(0);
    setLines(0);
    setLevel(1);
  }, [level]);

  // Rotate piece
  const rotatePiece = (piece) => {
    const rotated = piece.shape[0].map((_, i) =>
      piece.shape.map(row => row[i]).reverse()
    );
    return { ...piece, shape: rotated };
  };

  // Check if piece can be placed
  const canPlacePiece = (piece, board, dx = 0, dy = 0) => {
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const newX = piece.x + x + dx;
          const newY = piece.y + y + dy;
          
          if (newX < 0 || newX >= BOARD_WIDTH || 
              newY >= BOARD_HEIGHT || 
              (newY >= 0 && board[newY][newX])) {
            return false;
          }
        }
      }
    }
    return true;
  };

  // Place piece on board
  const placePiece = (piece, board) => {
    const newBoard = board.map(row => [...row]);
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const boardY = piece.y + y;
          const boardX = piece.x + x;
          if (boardY >= 0) {
            newBoard[boardY][boardX] = piece.color;
          }
        }
      }
    }
    return newBoard;
  };

  // Clear completed lines
  const clearLines = (board) => {
    let linesCleared = 0;
    const newBoard = [];
    
    for (let y = board.length - 1; y >= 0; y--) {
      if (board[y].every(cell => cell !== 0)) {
        linesCleared++;
      } else {
        newBoard.unshift(board[y]);
      }
    }
    
    // Add new empty lines at the top
    while (newBoard.length < BOARD_HEIGHT) {
      newBoard.unshift(Array(BOARD_WIDTH).fill(0));
    }
    
    return { board: newBoard, linesCleared };
  };

  // Draw functions
  const drawBlock = (ctx, x, y, color) => {
    const pixelX = x * BLOCK_SIZE;
    const pixelY = y * BLOCK_SIZE;
    
    // Main block
    ctx.fillStyle = color;
    ctx.fillRect(pixelX, pixelY, BLOCK_SIZE, BLOCK_SIZE);
    
    // Border
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.strokeRect(pixelX, pixelY, BLOCK_SIZE, BLOCK_SIZE);
    
    // Highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(pixelX + 2, pixelY + 2, BLOCK_SIZE - 8, 4);
    ctx.fillRect(pixelX + 2, pixelY + 2, 4, BLOCK_SIZE - 8);
  };

  const drawBoard = (ctx, board) => {
    // Draw background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, BOARD_WIDTH * BLOCK_SIZE, BOARD_HEIGHT * BLOCK_SIZE);
    
    // Draw grid
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    for (let x = 0; x <= BOARD_WIDTH; x++) {
      ctx.beginPath();
      ctx.moveTo(x * BLOCK_SIZE, 0);
      ctx.lineTo(x * BLOCK_SIZE, BOARD_HEIGHT * BLOCK_SIZE);
      ctx.stroke();
    }
    for (let y = 0; y <= BOARD_HEIGHT; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * BLOCK_SIZE);
      ctx.lineTo(BOARD_WIDTH * BLOCK_SIZE, y * BLOCK_SIZE);
      ctx.stroke();
    }
    
    // Draw placed blocks
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        if (board[y][x]) {
          drawBlock(ctx, x, y, board[y][x]);
        }
      }
    }
  };

  const drawPiece = (ctx, piece) => {
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          drawBlock(ctx, piece.x + x, piece.y + y, piece.color);
        }
      }
    }
  };

  const drawGhost = (ctx, piece, board) => {
    let ghostY = piece.y;
    while (canPlacePiece({ ...piece, y: ghostY + 1 }, board)) {
      ghostY++;
    }
    
    ctx.save();
    ctx.globalAlpha = 0.3;
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          drawBlock(ctx, piece.x + x, ghostY + y, piece.color);
        }
      }
    }
    ctx.restore();
  };

  const drawNextPiece = (ctx, piece, offsetX, offsetY) => {
    ctx.save();
    ctx.translate(offsetX, offsetY);
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          drawBlock(ctx, x, y, piece.color);
        }
      }
    }
    ctx.restore();
  };

  // Game controls
  const movePiece = (dx, dy = 0) => {
    const { currentPiece, board } = gameObjects.current;
    if (currentPiece && canPlacePiece(currentPiece, board, dx, dy)) {
      currentPiece.x += dx;
      currentPiece.y += dy;
    }
  };

  const rotatePieceInGame = () => {
    const { currentPiece, board } = gameObjects.current;
    if (currentPiece) {
      const rotated = rotatePiece(currentPiece);
      if (canPlacePiece(rotated, board)) {
        gameObjects.current.currentPiece = rotated;
      }
    }
  };

  const dropPiece = () => {
    const { currentPiece, board } = gameObjects.current;
    if (currentPiece) {
      let dropY = currentPiece.y;
      while (canPlacePiece({ ...currentPiece, y: dropY + 1 }, board)) {
        dropY++;
      }
      currentPiece.y = dropY;
    }
  };

  // Game loop
  const gameLoop = useCallback((timestamp) => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const { board, currentPiece, nextPiece } = gameObjects.current;

    // Update fall timer
    if (timestamp - gameObjects.current.dropTime > gameObjects.current.fallSpeed) {
      if (currentPiece && canPlacePiece(currentPiece, board, 0, 1)) {
        currentPiece.y++;
      } else if (currentPiece) {
        // Place piece
        const newBoard = placePiece(currentPiece, board);
        const { board: clearedBoard, linesCleared } = clearLines(newBoard);
        
        gameObjects.current.board = clearedBoard;
        gameObjects.current.currentPiece = nextPiece;
        gameObjects.current.nextPiece = createPiece();
        
        // Update score and lines
        if (linesCleared > 0) {
          const points = [0, 100, 300, 500, 800][linesCleared] * level;
          setScore(prev => prev + points);
          setLines(prev => {
            const newLines = prev + linesCleared;
            const newLevel = Math.floor(newLines / 10) + 1;
            if (newLevel > level) {
              setLevel(newLevel);
              gameObjects.current.fallSpeed = Math.max(50, 1000 - (newLevel - 1) * 100);
            }
            return newLines;
          });
        }
        
        // Check game over
        if (!canPlacePiece(gameObjects.current.currentPiece, gameObjects.current.board)) {
          setGameState('gameOver');
          setHighScore(prev => Math.max(prev, score));
        }
      }
      gameObjects.current.dropTime = timestamp;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw game
    drawBoard(ctx, board);
    if (currentPiece) {
      drawGhost(ctx, currentPiece, board);
      drawPiece(ctx, currentPiece);
    }
    
    // Draw next piece
    if (nextPiece) {
      drawNextPiece(ctx, nextPiece, BOARD_WIDTH * BLOCK_SIZE + 20, 50);
    }
  }, [gameState, level, score]);

  // Event handlers
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (gameState !== 'playing') return;
      
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          movePiece(-1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          movePiece(1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          movePiece(0, 1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          rotatePieceInGame();
          break;
        case ' ':
          e.preventDefault();
          dropPiece();
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          setGameState(gameState === 'playing' ? 'paused' : 'playing');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  // Animation frame
  useEffect(() => {
    let animationId;
    const animate = (timestamp) => {
      gameLoop(timestamp);
      animationId = requestAnimationFrame(animate);
    };
    
    if (gameState === 'playing') {
      animationId = requestAnimationFrame(animate);
    }
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [gameLoop, gameState]);

  const startGame = () => {
    initializeGame();
    setGameState('playing');
  };

  const pauseGame = () => {
    setGameState(gameState === 'playing' ? 'paused' : 'playing');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-800 to-blue-900 p-4">
      <div className="max-w-7xl mx-auto">
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
            <h1 className="text-3xl font-bold text-white">🧩 Tetris</h1>
            <div className="flex gap-2">
              {gameState === 'playing' && (
                <button 
                  onClick={pauseGame}
                  className="flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors"
                >
                  <Pause size={20} />
                  Pause
                </button>
              )}
              <button 
                onClick={initializeGame}
                className="flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors"
              >
                <RotateCcw size={20} />
                Reset
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6">
            <div className="flex justify-center gap-8">
              {/* Game Stats */}
              <div className="flex flex-col gap-4">
                <div className="bg-gray-100 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-700 mb-2">Score</h3>
                  <p className="text-2xl font-bold">{score}</p>
                </div>
                <div className="bg-gray-100 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-700 mb-2">Lines</h3>
                  <p className="text-2xl font-bold">{lines}</p>
                </div>
                <div className="bg-gray-100 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-700 mb-2">Level</h3>
                  <p className="text-2xl font-bold">{level}</p>
                </div>
                <div className="bg-gray-100 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-700 mb-2">High Score</h3>
                  <p className="text-xl font-bold text-yellow-600">{highScore}</p>
                </div>
              </div>

              {/* Game Canvas */}
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  width={BOARD_WIDTH * BLOCK_SIZE + 150}
                  height={BOARD_HEIGHT * BLOCK_SIZE}
                  className="border-4 border-gray-400 rounded-lg bg-black"
                  style={{ display: gameState === 'menu' ? 'none' : 'block' }}
                />
                
                {/* Menu Overlay */}
                {gameState === 'menu' && (
                  <div 
                    className="border-4 border-gray-400 rounded-lg bg-gradient-to-b from-purple-600 to-indigo-700 flex items-center justify-center"
                    style={{ width: BOARD_WIDTH * BLOCK_SIZE + 150, height: BOARD_HEIGHT * BLOCK_SIZE }}
                  >
                    <div className="text-center text-white">
                      <h2 className="text-4xl font-bold mb-4">🧩 TETRIS</h2>
                      <p className="text-xl mb-6">Clear lines by filling rows!</p>
                      <button
                        onClick={startGame}
                        className="flex items-center gap-2 bg-green-500 text-white px-8 py-4 rounded-lg text-xl font-bold hover:bg-green-600 transition-colors mx-auto"
                      >
                        <Play size={24} />
                        Start Game
                      </button>
                      <div className="mt-6 text-sm">
                        <p>← → Arrow Keys to move</p>
                        <p>↑ Arrow Key to rotate</p>
                        <p>↓ Arrow Key for soft drop</p>
                        <p>SPACEBAR for hard drop</p>
                        <p>P to pause</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pause Overlay */}
                {gameState === 'paused' && (
                  <div className="absolute inset-0 bg-black/70 rounded-lg flex items-center justify-center">
                    <div className="text-center text-white">
                      <Pause size={48} className="mx-auto mb-4" />
                      <h3 className="text-2xl font-bold mb-4">PAUSED</h3>
                      <button
                        onClick={pauseGame}
                        className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors"
                      >
                        Resume
                      </button>
                    </div>
                  </div>
                )}

                {/* Game Over Overlay */}
                {gameState === 'gameOver' && (
                  <div className="absolute inset-0 bg-black/70 rounded-lg flex items-center justify-center">
                    <div className="text-center text-white bg-red-600/80 p-8 rounded-xl">
                      <Trophy size={48} className="mx-auto mb-4 text-yellow-400" />
                      <h3 className="text-2xl font-bold mb-4">GAME OVER</h3>
                      <p className="text-xl mb-2">Final Score: {score}</p>
                      <p className="text-lg mb-2">Lines Cleared: {lines}</p>
                      <p className="text-lg mb-6">Level Reached: {level}</p>
                      <div className="flex gap-4 justify-center">
                        <button
                          onClick={startGame}
                          className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors"
                        >
                          Play Again
                        </button>
                        <button
                          onClick={() => setGameState('menu')}
                          className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors"
                        >
                          Main Menu
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Controls & Next Piece */}
              <div className="flex flex-col gap-4">
                <div className="bg-gray-100 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-700 mb-2">Next Piece</h3>
                  <div style={{ width: 120, height: 80 }} className="bg-black rounded border-2 border-gray-400"></div>
                </div>
                
                <div className="bg-gray-100 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-700 mb-2">Controls</h3>
                  <div className="text-sm space-y-1">
                    <div className="flex items-center gap-2">
                      <span>Move:</span>
                      <span className="bg-gray-300 px-2 py-1 rounded text-xs">← →</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Rotate:</span>
                      <span className="bg-gray-300 px-2 py-1 rounded text-xs">↑</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Soft Drop:</span>
                      <span className="bg-gray-300 px-2 py-1 rounded text-xs">↓</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Hard Drop:</span>
                      <span className="bg-gray-300 px-2 py-1 rounded text-xs">Space</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Pause:</span>
                      <span className="bg-gray-300 px-2 py-1 rounded text-xs">P</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="mt-6 text-center text-gray-600">
              <p className="mb-2">
                <strong>How to play:</strong> Arrange falling pieces to create complete horizontal lines. Complete lines disappear and earn points!
              </p>
              <p className="text-sm">
                <strong>Scoring:</strong> 1 line = 100 × level, 2 lines = 300 × level, 3 lines = 500 × level, 4 lines (Tetris) = 800 × level
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TetrisGame;