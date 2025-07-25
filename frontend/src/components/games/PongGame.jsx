import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, RotateCcw, Play, Pause } from 'lucide-react';

const PongGame = ({ onBack }) => {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState({
    ball: { x: 400, y: 200, dx: 4, dy: 4, speed: 4 },
    playerPaddle: { x: 20, y: 160, width: 15, height: 80, speed: 6 },
    aiPaddle: { x: 765, y: 160, width: 15, height: 80, speed: 4 },
    score: { player: 0, ai: 0 },
    gameRunning: false,
    gameStarted: false,
    difficulty: 'medium'
  });
  
  const [keys, setKeys] = useState({ up: false, down: false });
  const gameLoopRef = useRef(null);
  
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 400;
  const BALL_SIZE = 10;
  const WIN_SCORE = 10;

  const difficulties = {
    easy: { aiSpeed: 2.5, ballSpeed: 3, name: 'Easy' },
    medium: { aiSpeed: 4, ballSpeed: 4, name: 'Medium' },
    hard: { aiSpeed: 5.5, ballSpeed: 5.5, name: 'Hard' },
    insane: { aiSpeed: 7, ballSpeed: 7, name: 'Insane' }
  };

  // Initialize game
  const initializeGame = useCallback(() => {
    const difficulty = difficulties[gameState.difficulty];
    setGameState(prev => ({
      ...prev,
      ball: { 
        x: CANVAS_WIDTH / 2, 
        y: CANVAS_HEIGHT / 2, 
        dx: Math.random() > 0.5 ? difficulty.ballSpeed : -difficulty.ballSpeed, 
        dy: (Math.random() - 0.5) * difficulty.ballSpeed,
        speed: difficulty.ballSpeed
      },
      playerPaddle: { ...prev.playerPaddle, y: CANVAS_HEIGHT / 2 - 40 },
      aiPaddle: { ...prev.aiPaddle, y: CANVAS_HEIGHT / 2 - 40, speed: difficulty.aiSpeed },
      score: { player: 0, ai: 0 },
      gameRunning: false,
      gameStarted: false
    }));
  }, [gameState.difficulty]);

  // Reset ball position
  const resetBall = useCallback((winner) => {
    const difficulty = difficulties[gameState.difficulty];
    setGameState(prev => ({
      ...prev,
      ball: {
        x: CANVAS_WIDTH / 2,
        y: CANVAS_HEIGHT / 2,
        dx: winner === 'player' ? difficulty.ballSpeed : -difficulty.ballSpeed,
        dy: (Math.random() - 0.5) * difficulty.ballSpeed,
        speed: difficulty.ballSpeed
      }
    }));
  }, [gameState.difficulty]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          setKeys(prev => ({ ...prev, up: true }));
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          setKeys(prev => ({ ...prev, down: true }));
          break;
        case ' ':
          e.preventDefault();
          if (gameState.gameStarted) {
            setGameState(prev => ({ ...prev, gameRunning: !prev.gameRunning }));
          } else {
            startGame();
          }
          break;
      }
    };

    const handleKeyUp = (e) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          setKeys(prev => ({ ...prev, up: false }));
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          setKeys(prev => ({ ...prev, down: false }));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState.gameStarted, gameState.gameRunning]);

  // Start game
  const startGame = () => {
    setGameState(prev => ({
      ...prev,
      gameRunning: true,
      gameStarted: true
    }));
  };

  // Game logic
  const updateGame = useCallback(() => {
    setGameState(prev => {
      if (!prev.gameRunning) return prev;

      const newState = { ...prev };
      const { ball, playerPaddle, aiPaddle } = newState;

      // Move player paddle
      if (keys.up && playerPaddle.y > 0) {
        playerPaddle.y -= playerPaddle.speed;
      }
      if (keys.down && playerPaddle.y < CANVAS_HEIGHT - playerPaddle.height) {
        playerPaddle.y += playerPaddle.speed;
      }

      // AI paddle movement (improved AI)
      const ballCenterY = ball.y + BALL_SIZE / 2;
      const aiPaddleCenterY = aiPaddle.y + aiPaddle.height / 2;
      const aiPaddleSpeed = aiPaddle.speed;
      
      // Only move AI paddle when ball is coming towards it
      if (ball.dx > 0) {
        if (ballCenterY < aiPaddleCenterY - 10 && aiPaddle.y > 0) {
          aiPaddle.y -= aiPaddleSpeed;
        } else if (ballCenterY > aiPaddleCenterY + 10 && aiPaddle.y < CANVAS_HEIGHT - aiPaddle.height) {
          aiPaddle.y += aiPaddleSpeed;
        }
      }

      // Move ball
      ball.x += ball.dx;
      ball.y += ball.dy;

      // Ball collision with top and bottom walls
      if (ball.y <= 0 || ball.y >= CANVAS_HEIGHT - BALL_SIZE) {
        ball.dy = -ball.dy;
      }

      // Ball collision with player paddle
      if (
        ball.x <= playerPaddle.x + playerPaddle.width &&
        ball.y + BALL_SIZE >= playerPaddle.y &&
        ball.y <= playerPaddle.y + playerPaddle.height &&
        ball.dx < 0
      ) {
        // Calculate hit position on paddle (for angle variation)
        const hitPos = (ball.y + BALL_SIZE / 2 - playerPaddle.y) / playerPaddle.height;
        const angle = (hitPos - 0.5) * Math.PI / 3; // Max 60 degree angle
        
        ball.dx = Math.abs(ball.dx);
        ball.dy = ball.speed * Math.sin(angle);
        
        // Increase ball speed slightly on each hit
        ball.speed = Math.min(ball.speed * 1.02, 8);
        ball.dx = ball.speed * Math.cos(angle);
      }

      // Ball collision with AI paddle
      if (
        ball.x + BALL_SIZE >= aiPaddle.x &&
        ball.y + BALL_SIZE >= aiPaddle.y &&
        ball.y <= aiPaddle.y + aiPaddle.height &&
        ball.dx > 0
      ) {
        // Calculate hit position on paddle
        const hitPos = (ball.y + BALL_SIZE / 2 - aiPaddle.y) / aiPaddle.height;
        const angle = (hitPos - 0.5) * Math.PI / 3;
        
        ball.dx = -Math.abs(ball.dx);
        ball.dy = ball.speed * Math.sin(angle);
        
        // Increase ball speed slightly
        ball.speed = Math.min(ball.speed * 1.02, 8);
        ball.dx = -ball.speed * Math.cos(angle);
      }

      // Score points
      if (ball.x < 0) {
        newState.score.ai++;
        resetBall('ai');
        return newState;
      }
      
      if (ball.x > CANVAS_WIDTH) {
        newState.score.player++;
        resetBall('player');
        return newState;
      }

      // Check for game end
      if (newState.score.player >= WIN_SCORE || newState.score.ai >= WIN_SCORE) {
        newState.gameRunning = false;
      }

      return newState;
    });
  }, [keys, resetBall]);

  // Game loop
  useEffect(() => {
    if (gameState.gameRunning) {
      gameLoopRef.current = setInterval(updateGame, 1000 / 60); // 60 FPS
    } else {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    }

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [gameState.gameRunning, updateGame]);

  // Draw game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw center line
    ctx.setLineDash([10, 15]);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2, 0);
    ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw paddles
    ctx.fillStyle = '#fff';
    ctx.fillRect(gameState.playerPaddle.x, gameState.playerPaddle.y, gameState.playerPaddle.width, gameState.playerPaddle.height);
    ctx.fillRect(gameState.aiPaddle.x, gameState.aiPaddle.y, gameState.aiPaddle.width, gameState.aiPaddle.height);

    // Draw ball
    ctx.fillStyle = '#fff';
    ctx.fillRect(gameState.ball.x, gameState.ball.y, BALL_SIZE, BALL_SIZE);

    // Draw scores
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(gameState.score.player.toString(), CANVAS_WIDTH / 4, 60);
    ctx.fillText(gameState.score.ai.toString(), (3 * CANVAS_WIDTH) / 4, 60);

    // Draw game status
    if (!gameState.gameStarted) {
      ctx.font = 'bold 24px Arial';
      ctx.fillText('Press SPACE or click START to begin', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);
    } else if (!gameState.gameRunning && (gameState.score.player < WIN_SCORE && gameState.score.ai < WIN_SCORE)) {
      ctx.font = 'bold 24px Arial';
      ctx.fillText('PAUSED - Press SPACE to continue', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);
    }

    // Draw game over screen
    if (gameState.score.player >= WIN_SCORE || gameState.score.ai >= WIN_SCORE) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 36px Arial';
      const winner = gameState.score.player >= WIN_SCORE ? 'PLAYER WINS!' : 'AI WINS!';
      ctx.fillText(winner, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      
      ctx.font = 'bold 20px Arial';
      ctx.fillText('Click NEW GAME to play again', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
    }
  });

  // Mouse controls for mobile
  const handleCanvasClick = (e) => {
    if (!gameState.gameStarted) {
      startGame();
    } else if (!gameState.gameRunning && gameState.score.player < WIN_SCORE && gameState.score.ai < WIN_SCORE) {
      setGameState(prev => ({ ...prev, gameRunning: true }));
    }
  };

  const handleCanvasMouseMove = (e) => {
    if (!gameState.gameRunning) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    const canvasMouseY = (mouseY / rect.height) * CANVAS_HEIGHT;
    
    setGameState(prev => ({
      ...prev,
      playerPaddle: {
        ...prev.playerPaddle,
        y: Math.max(0, Math.min(CANVAS_HEIGHT - prev.playerPaddle.height, canvasMouseY - prev.playerPaddle.height / 2))
      }
    }));
  };

  // Touch controls
  const handleTouchMove = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touchY = touch.clientY - rect.top;
    const canvasTouchY = (touchY / rect.height) * CANVAS_HEIGHT;
    
    setGameState(prev => ({
      ...prev,
      playerPaddle: {
        ...prev.playerPaddle,
        y: Math.max(0, Math.min(CANVAS_HEIGHT - prev.playerPaddle.height, canvasTouchY - prev.playerPaddle.height / 2))
      }
    }));
  };

  const changeDifficulty = (newDifficulty) => {
    setGameState(prev => ({ ...prev, difficulty: newDifficulty }));
  };

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 p-2 sm:p-4">
      <div className="max-w-4xl mx-auto">
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
            <h1 className="text-xl sm:text-3xl font-bold text-white">🏓 Pong</h1>
            <button 
              onClick={initializeGame}
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
                  className={`px-2 py-1 sm:px-4 sm:py-2 rounded-md sm:rounded-lg transition-colors text-xs sm:text-base ${
                    gameState.difficulty === key
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {config.name}
                </button>
              ))}
            </div>

            {/* Game Controls */}
            <div className="flex justify-center gap-2 sm:gap-4 mb-3 sm:mb-6">
              <button
                onClick={gameState.gameStarted ? () => setGameState(prev => ({ ...prev, gameRunning: !prev.gameRunning })) : startGame}
                disabled={gameState.score.player >= WIN_SCORE || gameState.score.ai >= WIN_SCORE}
                className="flex items-center gap-1 sm:gap-2 bg-blue-500 disabled:bg-gray-400 text-white px-3 py-1 sm:px-6 sm:py-2 rounded-md sm:rounded-lg hover:bg-blue-600 transition-colors text-sm sm:text-base"
              >
                {!gameState.gameStarted ? <Play size={16} className="sm:w-5 sm:h-5" /> : gameState.gameRunning ? <Pause size={16} className="sm:w-5 sm:h-5" /> : <Play size={16} className="sm:w-5 sm:h-5" />}
                {!gameState.gameStarted ? 'Start' : gameState.gameRunning ? 'Pause' : 'Resume'}
              </button>
            </div>

            {/* Game Canvas */}
            <div className="flex justify-center mb-3 sm:mb-6">
              <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                className="border-2 sm:border-4 border-gray-400 rounded-md sm:rounded-lg cursor-crosshair max-w-full h-auto"
                onClick={handleCanvasClick}
                onMouseMove={handleCanvasMouseMove}
                onTouchMove={handleTouchMove}
              />
            </div>

            {/* Mobile Controls */}
            <div className="flex justify-center gap-2 sm:gap-4 mb-3 sm:mb-6 sm:hidden">
              <button
                onTouchStart={() => setKeys(prev => ({ ...prev, up: true }))}
                onTouchEnd={() => setKeys(prev => ({ ...prev, up: false }))}
                onMouseDown={() => setKeys(prev => ({ ...prev, up: true }))}
                onMouseUp={() => setKeys(prev => ({ ...prev, up: false }))}
                className="bg-blue-500 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-md sm:rounded-lg text-lg sm:text-xl font-bold"
              >
                ↑
              </button>
              <button
                onTouchStart={() => setKeys(prev => ({ ...prev, down: true }))}
                onTouchEnd={() => setKeys(prev => ({ ...prev, down: false }))}
                onMouseDown={() => setKeys(prev => ({ ...prev, down: true }))}
                onMouseUp={() => setKeys(prev => ({ ...prev, down: false }))}
                className="bg-blue-500 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-md sm:rounded-lg text-lg sm:text-xl font-bold"
              >
                ↓
              </button>
            </div>

            {/* Score Display */}
            <div className="flex justify-center gap-4 sm:gap-8 mb-3 sm:mb-6">
              <div className="text-center bg-blue-100 rounded-md sm:rounded-lg p-2 sm:p-4">
                <div className="text-sm sm:text-lg font-bold text-blue-700">Player</div>
                <div className="text-xl sm:text-3xl font-bold text-blue-900">{gameState.score.player}</div>
              </div>
              <div className="text-center bg-red-100 rounded-md sm:rounded-lg p-2 sm:p-4">
                <div className="text-sm sm:text-lg font-bold text-red-700">AI</div>
                <div className="text-xl sm:text-3xl font-bold text-red-900">{gameState.score.ai}</div>
              </div>
            </div>

            {/* Instructions */}
            <div className="text-center text-gray-600">
              <p className="mb-1 sm:mb-2 text-sm sm:text-base">
                <strong>Goal:</strong> First to {WIN_SCORE} points wins!
              </p>
              <div className="text-xs sm:text-sm">
                <p className="mb-1">
                  <strong>Desktop:</strong> Use ↑↓ arrow keys or W/S keys, or move your mouse
                </p>
                <p className="mb-1">
                  <strong>Mobile:</strong> Touch and drag on the game area or use the buttons
                </p>
                <p>
                  <strong>Controls:</strong> SPACE to start/pause, click on game area to start
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PongGame;