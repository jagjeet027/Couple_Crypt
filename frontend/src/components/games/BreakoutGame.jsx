import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, RotateCcw, Trophy, Play, Pause } from 'lucide-react';

const BreakoutGame = ({ onBack }) => {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('menu'); // 'menu', 'playing', 'paused', 'gameOver'
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [highScore, setHighScore] = useState(0);
  
  // Game objects
  const gameObjects = useRef({
    ball: { x: 400, y: 300, dx: 4, dy: -4, radius: 8 },
    paddle: { x: 350, y: 550, width: 100, height: 15, speed: 8 },
    bricks: [],
    keys: {}
  });

  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;
  const BRICK_ROWS = 6;
  const BRICK_COLS = 10;
  const BRICK_WIDTH = 70;
  const BRICK_HEIGHT = 20;
  const BRICK_PADDING = 5;

  // Initialize bricks
  const initializeBricks = useCallback(() => {
    const bricks = [];
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
    
    for (let row = 0; row < BRICK_ROWS; row++) {
      for (let col = 0; col < BRICK_COLS; col++) {
        bricks.push({
          x: col * (BRICK_WIDTH + BRICK_PADDING) + 35,
          y: row * (BRICK_HEIGHT + BRICK_PADDING) + 50,
          width: BRICK_WIDTH,
          height: BRICK_HEIGHT,
          color: colors[row],
          visible: true,
          points: (BRICK_ROWS - row) * 10
        });
      }
    }
    gameObjects.current.bricks = bricks;
  }, []);

  // Reset game
  const resetGame = useCallback(() => {
    gameObjects.current.ball = { x: 400, y: 300, dx: 4 * level, dy: -4 * level, radius: 8 };
    gameObjects.current.paddle = { x: 350, y: 550, width: 100, height: 15, speed: 8 };
    initializeBricks();
    setLives(3);
    setScore(0);
    setLevel(1);
  }, [level, initializeBricks]);

  // Draw functions
  const drawBall = (ctx, ball) => {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#FFD93D';
    ctx.fill();
    ctx.strokeStyle = '#FF6B35';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const drawPaddle = (ctx, paddle) => {
    const gradient = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x, paddle.y + paddle.height);
    gradient.addColorStop(0, '#4ECDC4');
    gradient.addColorStop(1, '#44A08D');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
    ctx.strokeStyle = '#2C3E50';
    ctx.lineWidth = 2;
    ctx.strokeRect(paddle.x, paddle.y, paddle.width, paddle.height);
  };

  const drawBricks = (ctx, bricks) => {
    bricks.forEach(brick => {
      if (brick.visible) {
        const gradient = ctx.createLinearGradient(brick.x, brick.y, brick.x, brick.y + brick.height);
        gradient.addColorStop(0, brick.color);
        gradient.addColorStop(1, brick.color + '80');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
        ctx.strokeStyle = '#2C3E50';
        ctx.lineWidth = 1;
        ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);
      }
    });
  };

  const drawUI = (ctx) => {
    ctx.fillStyle = '#2C3E50';
    ctx.font = '20px Arial';
    ctx.fillText(`Score: ${score}`, 20, 30);
    ctx.fillText(`Lives: ${lives}`, 200, 30);
    ctx.fillText(`Level: ${level}`, 350, 30);
    ctx.fillText(`High Score: ${highScore}`, 500, 30);
  };

  // Collision detection
  const ballBrickCollision = (ball, brick) => {
    return ball.x + ball.radius > brick.x &&
           ball.x - ball.radius < brick.x + brick.width &&
           ball.y + ball.radius > brick.y &&
           ball.y - ball.radius < brick.y + brick.height;
  };

  const ballPaddleCollision = (ball, paddle) => {
    return ball.x + ball.radius > paddle.x &&
           ball.x - ball.radius < paddle.x + paddle.width &&
           ball.y + ball.radius > paddle.y &&
           ball.y - ball.radius < paddle.y + paddle.height;
  };

  // Game loop
  const gameLoop = useCallback(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const { ball, paddle, bricks, keys } = gameObjects.current;

    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Move paddle
    if (keys['ArrowLeft'] && paddle.x > 0) {
      paddle.x -= paddle.speed;
    }
    if (keys['ArrowRight'] && paddle.x < CANVAS_WIDTH - paddle.width) {
      paddle.x += paddle.speed;
    }

    // Move ball
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Ball collision with walls
    if (ball.x + ball.radius > CANVAS_WIDTH || ball.x - ball.radius < 0) {
      ball.dx = -ball.dx;
    }
    if (ball.y - ball.radius < 0) {
      ball.dy = -ball.dy;
    }

    // Ball collision with paddle
    if (ballPaddleCollision(ball, paddle)) {
      ball.dy = -ball.dy;
      // Add angle based on where ball hits paddle
      const hitPos = (ball.x - paddle.x) / paddle.width;
      ball.dx = 8 * (hitPos - 0.5);
    }

    // Ball collision with bricks
    bricks.forEach(brick => {
      if (brick.visible && ballBrickCollision(ball, brick)) {
        brick.visible = false;
        ball.dy = -ball.dy;
        setScore(prev => prev + brick.points);
      }
    });

    // Check if ball is out of bounds
    if (ball.y > CANVAS_HEIGHT) {
      setLives(prev => {
        const newLives = prev - 1;
        if (newLives <= 0) {
          setGameState('gameOver');
          setHighScore(prev => Math.max(prev, score));
        } else {
          // Reset ball position
          ball.x = 400;
          ball.y = 300;
          ball.dx = 4 * level;
          ball.dy = -4 * level;
        }
        return newLives;
      });
    }

    // Check if all bricks are destroyed
    const visibleBricks = bricks.filter(brick => brick.visible);
    if (visibleBricks.length === 0) {
      setLevel(prev => {
        const newLevel = prev + 1;
        // Increase ball speed and reset
        ball.x = 400;
        ball.y = 300;
        ball.dx = 4 * newLevel;
        ball.dy = -4 * newLevel;
        initializeBricks();
        return newLevel;
      });
    }

    // Draw everything
    drawBall(ctx, ball);
    drawPaddle(ctx, paddle);
    drawBricks(ctx, bricks);
    drawUI(ctx);
  }, [gameState, score, level, lives, highScore, initializeBricks]);

  // Event handlers
  useEffect(() => {
    const handleKeyDown = (e) => {
      gameObjects.current.keys[e.key] = true;
      if (e.key === ' ') {
        e.preventDefault();
        if (gameState === 'playing') {
          setGameState('paused');
        } else if (gameState === 'paused') {
          setGameState('playing');
        }
      }
    };

    const handleKeyUp = (e) => {
      gameObjects.current.keys[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  // Game loop
  useEffect(() => {
    const interval = setInterval(gameLoop, 16); // ~60fps
    return () => clearInterval(interval);
  }, [gameLoop]);

  const startGame = () => {
    resetGame();
    setGameState('playing');
  };

  const pauseGame = () => {
    setGameState(gameState === 'playing' ? 'paused' : 'playing');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-800 to-indigo-900 p-4">
      <div className="max-w-6xl mx-auto">
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
            <h1 className="text-3xl font-bold text-white">🧱 Breakout</h1>
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
                onClick={resetGame}
                className="flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors"
              >
                <RotateCcw size={20} />
                Reset
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6">
            {/* Game Canvas */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  width={CANVAS_WIDTH}
                  height={CANVAS_HEIGHT}
                  className="border-4 border-gray-400 rounded-lg bg-gradient-to-b from-sky-400 to-sky-600"
                  style={{ display: gameState === 'menu' ? 'none' : 'block' }}
                />
                
                {/* Menu Overlay */}
                {gameState === 'menu' && (
                  <div className="w-[800px] h-[600px] border-4 border-gray-400 rounded-lg bg-gradient-to-b from-sky-400 to-sky-600 flex items-center justify-center">
                    <div className="text-center text-white">
                      <h2 className="text-4xl font-bold mb-4">🧱 BREAKOUT</h2>
                      <p className="text-xl mb-6">Break all the bricks to win!</p>
                      <button
                        onClick={startGame}
                        className="flex items-center gap-2 bg-green-500 text-white px-8 py-4 rounded-lg text-xl font-bold hover:bg-green-600 transition-colors mx-auto"
                      >
                        <Play size={24} />
                        Start Game
                      </button>
                      <div className="mt-6 text-sm">
                        <p>Use ← → arrows to move paddle</p>
                        <p>Press SPACEBAR to pause/resume</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pause Overlay */}
                {gameState === 'paused' && (
                  <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
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
                  <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                    <div className="text-center text-white">
                      <Trophy size={48} className="mx-auto mb-4 text-yellow-400" />
                      <h3 className="text-2xl font-bold mb-4">GAME OVER</h3>
                      <p className="text-xl mb-2">Final Score: {score}</p>
                      <p className="text-lg mb-6">High Score: {highScore}</p>
                      <button
                        onClick={startGame}
                        className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors mr-4"
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
                )}
              </div>
            </div>

            {/* Instructions */}
            <div className="text-center text-gray-600">
              <p className="mb-2">
                <strong>How to play:</strong> Use left and right arrow keys to move the paddle and bounce the ball to break all the bricks!
              </p>
              <p className="text-sm">
                <strong>Controls:</strong> ← → Arrow Keys to move | SPACEBAR to pause/resume
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BreakoutGame;