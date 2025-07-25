import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, RotateCcw, Trophy, Play, Volume2, VolumeX, ArrowUp, ArrowDown, ArrowRight } from 'lucide-react';

const SnakeGame = ({ onBack }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [gameState, setGameState] = useState('menu'); // 'menu', 'playing', 'gameOver'
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [difficulty, setDifficulty] = useState('medium');
  const [gameMode, setGameMode] = useState('classic');
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  
  // Game objects
  const gameObjects = useRef({
    snake: [{ x: 10, y: 10 }],
    food: { x: 15, y: 15, type: 'normal' },
    direction: { x: 0, y: 0 },
    nextDirection: { x: 0, y: 0 },
    specialFoods: [],
    obstacles: [],
    particles: []
  });

  const GRID_SIZE = 20;
  const SPEEDS = {
    easy: 150,
    medium: 120,
    hard: 80,
    extreme: 50
  };

  const FOOD_TYPES = {
    normal: { color: '#E74C3C', points: 10 },
    golden: { color: '#F1C40F', points: 50 },
    speed: { color: '#9B59B6', points: 20 },
    shrink: { color: '#3498DB', points: 30 }
  };

  // Calculate responsive canvas size
  const updateCanvasSize = useCallback(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      const containerWidth = container.offsetWidth - 32; // Account for padding
      const maxWidth = Math.min(containerWidth, 800);
      const maxHeight = Math.min(window.innerHeight - 300, 600);
      
      // Maintain aspect ratio
      const aspectRatio = 4 / 3;
      let width = maxWidth;
      let height = width / aspectRatio;
      
      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
      }
      
      // Ensure dimensions are multiples of GRID_SIZE
      width = Math.floor(width / GRID_SIZE) * GRID_SIZE;
      height = Math.floor(height / GRID_SIZE) * GRID_SIZE;
      
      // Minimum size constraints
      width = Math.max(width, 400);
      height = Math.max(height, 300);
      
      setCanvasSize({ width, height });
    }
  }, []);

  // Update canvas size on window resize
  useEffect(() => {
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [updateCanvasSize]);

  const GRID_WIDTH = canvasSize.width / GRID_SIZE;
  const GRID_HEIGHT = canvasSize.height / GRID_SIZE;

  // Initialize game
  const initializeGame = useCallback(() => {
    gameObjects.current.snake = [
      { x: Math.floor(GRID_WIDTH / 2), y: Math.floor(GRID_HEIGHT / 2) }
    ];
    gameObjects.current.direction = { x: 1, y: 0 };
    gameObjects.current.nextDirection = { x: 1, y: 0 };
    gameObjects.current.specialFoods = [];
    gameObjects.current.obstacles = [];
    gameObjects.current.particles = [];
    
    // Generate obstacles for maze mode
    if (gameMode === 'maze') {
      generateMaze();
    }
    
    generateFood();
    setScore(0);
  }, [gameMode, GRID_WIDTH, GRID_HEIGHT]);

  // Generate random food position
  const generateFood = () => {
    let newFood;
    let attempts = 0;
    
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_WIDTH),
        y: Math.floor(Math.random() * GRID_HEIGHT),
        type: Math.random() < 0.8 ? 'normal' : 
              Math.random() < 0.6 ? 'golden' :
              Math.random() < 0.5 ? 'speed' : 'shrink'
      };
      attempts++;
    } while (isPositionOccupied(newFood.x, newFood.y) && attempts < 100);
    
    gameObjects.current.food = newFood;
  };

  // Generate special food occasionally
  const generateSpecialFood = () => {
    if (gameObjects.current.specialFoods.length < 2 && Math.random() < 0.3) {
      let newSpecialFood;
      let attempts = 0;
      
      do {
        newSpecialFood = {
          x: Math.floor(Math.random() * GRID_WIDTH),
          y: Math.floor(Math.random() * GRID_HEIGHT),
          type: Math.random() < 0.5 ? 'golden' : 'speed',
          lifetime: 300 // 5 seconds at 60fps
        };
        attempts++;
      } while (isPositionOccupied(newSpecialFood.x, newSpecialFood.y) && attempts < 50);
      
      if (attempts < 50) {
        gameObjects.current.specialFoods.push(newSpecialFood);
      }
    }
  };

  // Generate maze
  const generateMaze = () => {
    const obstacles = [];
    
    // Border walls
    for (let x = 0; x < GRID_WIDTH; x++) {
      obstacles.push({ x, y: 0 });
      obstacles.push({ x, y: GRID_HEIGHT - 1 });
    }
    for (let y = 0; y < GRID_HEIGHT; y++) {
      obstacles.push({ x: 0, y });
      obstacles.push({ x: GRID_WIDTH - 1, y });
    }
    
    // Internal walls (scaled to canvas size)
    const wallCount = Math.floor((GRID_WIDTH * GRID_HEIGHT) / 80);
    for (let i = 0; i < wallCount; i++) {
      const x = Math.floor(Math.random() * (GRID_WIDTH - 4)) + 2;
      const y = Math.floor(Math.random() * (GRID_HEIGHT - 4)) + 2;
      obstacles.push({ x, y });
    }
    
    gameObjects.current.obstacles = obstacles;
  };

  // Check if position is occupied
  const isPositionOccupied = (x, y) => {
    const { snake, obstacles } = gameObjects.current;
    
    // Check snake body
    if (snake.some(segment => segment.x === x && segment.y === y)) {
      return true;
    }
    
    // Check obstacles
    if (obstacles.some(obstacle => obstacle.x === x && obstacle.y === y)) {
      return true;
    }
    
    return false;
  };

  // Create particle effect
  const createParticles = (x, y, color = '#FFD93D', count = 8) => {
    const particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: x * GRID_SIZE + GRID_SIZE / 2,
        y: y * GRID_SIZE + GRID_SIZE / 2,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        life: 30,
        maxLife: 30,
        color: color,
        size: Math.random() * 4 + 2
      });
    }
    gameObjects.current.particles.push(...particles);
  };

  // Draw functions
  const drawGrid = (ctx) => {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    for (let x = 0; x <= canvasSize.width; x += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasSize.height);
      ctx.stroke();
    }
    
    for (let y = 0; y <= canvasSize.height; y += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasSize.width, y);
      ctx.stroke();
    }
  };

  const drawSnake = (ctx, snake) => {
    snake.forEach((segment, index) => {
      const x = segment.x * GRID_SIZE;
      const y = segment.y * GRID_SIZE;
      
      if (index === 0) {
        // Head
        const gradient = ctx.createRadialGradient(
          x + GRID_SIZE / 2, y + GRID_SIZE / 2, 0,
          x + GRID_SIZE / 2, y + GRID_SIZE / 2, GRID_SIZE / 2
        );
        gradient.addColorStop(0, '#2ECC71');
        gradient.addColorStop(1, '#27AE60');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x + 1, y + 1, GRID_SIZE - 2, GRID_SIZE - 2);
        
        // Eyes
        ctx.fillStyle = 'white';
        ctx.fillRect(x + 4, y + 4, 4, 4);
        ctx.fillRect(x + 12, y + 4, 4, 4);
        
        ctx.fillStyle = 'black';
        ctx.fillRect(x + 5, y + 5, 2, 2);
        ctx.fillRect(x + 13, y + 5, 2, 2);
      } else {
        // Body
        const gradient = ctx.createLinearGradient(x, y, x + GRID_SIZE, y + GRID_SIZE);
        gradient.addColorStop(0, '#52C67A');
        gradient.addColorStop(1, '#4ECDC4');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x + 2, y + 2, GRID_SIZE - 4, GRID_SIZE - 4);
        
        // Body pattern
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(x + 4, y + 4, GRID_SIZE - 8, GRID_SIZE - 8);
      }
      
      // Border
      ctx.strokeStyle = '#1E8449';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, GRID_SIZE - 2, GRID_SIZE - 2);
    });
  };

  const drawFood = (ctx, food) => {
    const x = food.x * GRID_SIZE;
    const y = food.y * GRID_SIZE;
    const foodConfig = FOOD_TYPES[food.type];
    
    ctx.save();
    ctx.translate(x + GRID_SIZE / 2, y + GRID_SIZE / 2);
    ctx.rotate(Date.now() * 0.005);
    
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, GRID_SIZE / 2);
    gradient.addColorStop(0, foodConfig.color);
    gradient.addColorStop(1, foodConfig.color + '80');
    
    ctx.fillStyle = gradient;
    
    if (food.type === 'golden') {
      // Star shape for golden food
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI) / 5;
        const x1 = Math.cos(angle) * 8;
        const y1 = Math.sin(angle) * 8;
        if (i === 0) ctx.moveTo(x1, y1);
        else ctx.lineTo(x1, y1);
      }
      ctx.closePath();
      ctx.fill();
    } else if (food.type === 'speed') {
      // Diamond shape for speed food
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(6, 0);
      ctx.lineTo(0, 8);
      ctx.lineTo(-6, 0);
      ctx.closePath();
      ctx.fill();
    } else if (food.type === 'shrink') {
      // Triangle for shrink food
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(7, 4);
      ctx.lineTo(-7, 4);
      ctx.closePath();
      ctx.fill();
    } else {
      // Circle for normal food
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  };

  const drawObstacles = (ctx, obstacles) => {
    obstacles.forEach(obstacle => {
      const x = obstacle.x * GRID_SIZE;
      const y = obstacle.y * GRID_SIZE;
      
      const gradient = ctx.createLinearGradient(x, y, x + GRID_SIZE, y + GRID_SIZE);
      gradient.addColorStop(0, '#34495E');
      gradient.addColorStop(1, '#2C3E50');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, GRID_SIZE, GRID_SIZE);
      
      ctx.strokeStyle = '#1B2631';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, GRID_SIZE, GRID_SIZE);
    });
  };

  const drawParticles = (ctx, particles) => {
    particles.forEach(particle => {
      const alpha = particle.life / particle.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  };

  const drawScore = (ctx) => {
    const fontSize = Math.max(16, Math.min(28, canvasSize.width / 30));
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'left';
    ctx.strokeText(`Score: ${score}`, 10, fontSize + 10);
    ctx.fillText(`Score: ${score}`, 10, fontSize + 10);
    
    ctx.textAlign = 'right';
    ctx.strokeText(`Best: ${highScore}`, canvasSize.width - 10, fontSize + 10);
    ctx.fillText(`Best: ${highScore}`, canvasSize.width - 10, fontSize + 10);
    
    // Snake length
    ctx.textAlign = 'center';
    ctx.strokeText(`Length: ${gameObjects.current.snake.length}`, canvasSize.width / 2, fontSize + 10);
    ctx.fillText(`Length: ${gameObjects.current.snake.length}`, canvasSize.width / 2, fontSize + 10);
  };

  // Game logic
  const moveSnake = () => {
    const { snake, direction, nextDirection } = gameObjects.current;
    
    // Update direction
    if (nextDirection.x !== 0 || nextDirection.y !== 0) {
      if (nextDirection.x !== -direction.x || nextDirection.y !== -direction.y) {
        gameObjects.current.direction = { ...nextDirection };
      }
    }
    
    // Move snake
    const head = { ...snake[0] };
    head.x += gameObjects.current.direction.x;
    head.y += gameObjects.current.direction.y;
    
    // Check wall collision
    if (gameMode === 'classic') {
      // Wrap around walls
      if (head.x < 0) head.x = GRID_WIDTH - 1;
      if (head.x >= GRID_WIDTH) head.x = 0;
      if (head.y < 0) head.y = GRID_HEIGHT - 1;
      if (head.y >= GRID_HEIGHT) head.y = 0;
    } else {
      // Hard walls
      if (head.x < 0 || head.x >= GRID_WIDTH || head.y < 0 || head.y >= GRID_HEIGHT) {
        return 'collision';
      }
    }
    
    // Check self collision
    if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
      return 'collision';
    }
    
    // Check obstacle collision
    if (gameObjects.current.obstacles.some(obstacle => obstacle.x === head.x && obstacle.y === head.y)) {
      return 'collision';
    }
    
    snake.unshift(head);
    
    // Check food collision
    const { food, specialFoods } = gameObjects.current;
    let ateFood = false;
    
    if (head.x === food.x && head.y === food.y) {
      const points = FOOD_TYPES[food.type].points;
      setScore(prev => prev + points);
      createParticles(head.x, head.y, FOOD_TYPES[food.type].color);
      
      if (food.type === 'shrink' && snake.length > 3) {
        // Remove tail segments
        snake.splice(-2, 2);
      }
      
      generateFood();
      ateFood = true;
    }
    
    // Check special food collision
    for (let i = specialFoods.length - 1; i >= 0; i--) {
      const specialFood = specialFoods[i];
      if (head.x === specialFood.x && head.y === specialFood.y) {
        const points = FOOD_TYPES[specialFood.type].points;
        setScore(prev => prev + points);
        createParticles(head.x, head.y, FOOD_TYPES[specialFood.type].color, 12);
        specialFoods.splice(i, 1);
        ateFood = true;
      }
    }
    
    if (!ateFood) {
      snake.pop();
    }
    
    return 'continue';
  };

  // Game loop
  const gameLoop = useCallback(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Clear canvas with gradient background
    const gradient = ctx.createLinearGradient(0, 0, canvasSize.width, canvasSize.height);
    gradient.addColorStop(0, '#0F3460');
    gradient.addColorStop(1, '#16213E');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    // Update game state
    const result = moveSnake();
    
    if (result === 'collision') {
      setGameState('gameOver');
      setHighScore(prev => Math.max(prev, score));
      createParticles(
        gameObjects.current.snake[0].x,
        gameObjects.current.snake[0].y,
        '#E74C3C',
        20
      );
      return;
    }

    // Generate special food occasionally
    generateSpecialFood();

    // Update special foods lifetime
    const { specialFoods, particles } = gameObjects.current;
    for (let i = specialFoods.length - 1; i >= 0; i--) {
      specialFoods[i].lifetime--;
      if (specialFoods[i].lifetime <= 0) {
        specialFoods.splice(i, 1);
      }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i];
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.2;
      particle.life--;
      
      if (particle.life <= 0) {
        particles.splice(i, 1);
      }
    }

    // Draw everything
    drawGrid(ctx);
    drawObstacles(ctx, gameObjects.current.obstacles);
    drawFood(ctx, gameObjects.current.food);
    specialFoods.forEach(food => drawFood(ctx, food));
    drawSnake(ctx, gameObjects.current.snake);
    drawParticles(ctx, particles);
    drawScore(ctx);
  }, [gameState, score, canvasSize]);

  // Controls
  const changeDirection = (newDirection) => {
    const { direction } = gameObjects.current;
    
    // Prevent immediate reverse
    if (newDirection.x === -direction.x && newDirection.y === -direction.y) {
      return;
    }
    
    gameObjects.current.nextDirection = newDirection;
  };

  // Event handlers
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (gameState !== 'playing') return;
      
      e.preventDefault();
      
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          changeDirection({ x: 0, y: -1 });
          break;
        case 'ArrowDown':
        case 's': 
        case 'S':
          changeDirection({ x: 0, y: 1 });
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          changeDirection({ x: -1, y: 0 });
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          changeDirection({ x: 1, y: 0 });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState]);

  // Touch controls
  const touchStart = useRef({ x: 0, y: 0 });
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e) => {
    if (gameState !== 'playing') return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (deltaX > 30) {
        changeDirection({ x: 1, y: 0 }); // Right
      } else if (deltaX < -30) {
        changeDirection({ x: -1, y: 0 }); // Left
      }
    } else {
      // Vertical swipe
      if (deltaY > 30) {
        changeDirection({ x: 0, y: 1 }); // Down
      } else if (deltaY < -30) {
        changeDirection({ x: 0, y: -1 }); // Up
      }
    }
  };

  // Game loop timer
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const interval = setInterval(gameLoop, SPEEDS[difficulty]);
    return () => clearInterval(interval);
  }, [gameLoop, difficulty, gameState]);

  const startGame = () => {
    initializeGame();
    setGameState('playing');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 p-2 sm:p-4">
      <div className="max-w-7xl mx-auto" ref={containerRef}>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl sm:rounded-2xl p-3 sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 sm:mb-6 flex-wrap gap-2">
            <button 
              onClick={onBack}
              className="flex items-center gap-2 bg-white/20 text-white px-3 py-2 text-sm sm:px-4 sm:text-base rounded-lg hover:bg-white/30 transition-colors"
            >
              <ArrowLeft size={16} className="sm:w-5 sm:h-5" />
              Back
            </button>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">🐍 Enhanced Snake</h1>
            <div className="flex gap-2">
              <button 
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="flex items-center gap-1 sm:gap-2 bg-white/20 text-white px-2 py-2 sm:px-4 rounded-lg hover:bg-white/30 transition-colors"
              >
                {soundEnabled ? <Volume2 size={16} className="sm:w-5 sm:h-5" /> : <VolumeX size={16} className="sm:w-5 sm:h-5" />}
                <span className="hidden sm:inline">Sound</span>
              </button>
              <button 
                onClick={initializeGame}
                className="flex items-center gap-1 sm:gap-2 bg-white/20 text-white px-2 py-2 sm:px-4 rounded-lg hover:bg-white/30 transition-colors"
              >
                <RotateCcw size={16} className="sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-6">
            {/* Game Settings */}
            {gameState === 'menu' && (
              <div className="mb-4 sm:mb-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
                  <div>
                    <label className="block text-base sm:text-lg font-bold mb-2 sm:mb-3">Difficulty:</label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.keys(SPEEDS).map(level => (
                        <button
                          key={level}
                          onClick={() => setDifficulty(level)}
                          className={`p-2 sm:p-3 rounded-lg transition-colors capitalize text-sm sm:text-base ${
                            difficulty === level 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-gray-200 hover:bg-gray-300'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-base sm:text-lg font-bold mb-2 sm:mb-3">Game Mode:</label>
                    <div className="space-y-2">
                      <button
                        onClick={() => setGameMode('classic')}
                        className={`w-full p-2 sm:p-3 rounded-lg transition-colors text-sm sm:text-base ${
                          gameMode === 'classic'
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-200 hover:bg-gray-300'
                        }`}
                      >
                        Classic (Wrap walls)
                      </button>
                      <button
                        onClick={() => setGameMode('maze')}
                        className={`w-full p-2 sm:p-3 rounded-lg transition-colors text-sm sm:text-base ${
                          gameMode === 'maze'
                            ? 'bg-purple-500 text-white'
                            : 'bg-gray-200 hover:bg-gray-300'
                        }`}
                      >
                        Maze Mode (Hard walls)
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Score Display */}
            <div className="flex justify-center gap-4 sm:gap-8 mb-4 sm:mb-6 flex-wrap">
              <div className="text-center">
                <div className="text-sm sm:text-xl font-bold text-blue-600">Current Score</div>
                <div className="text-xl sm:text-3xl font-bold">{score}</div>
              </div>
              <div className="text-center">
                <div className="text-sm sm:text-xl font-bold text-green-600">Snake Length</div>
                <div className="text-xl sm:text-3xl font-bold">{gameObjects.current.snake.length}</div>
              </div>
              <div className="text-center">
                <div className="text-sm sm:text-xl font-bold text-yellow-600">High Score</div>
                <div className="text-xl sm:text-3xl font-bold">{highScore}</div>
              </div>
            </div>

            {/* Game Canvas */}
            <div className="flex justify-center mb-4 sm:mb-6">
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  width={canvasSize.width}
                  height={canvasSize.height}
                  className="border-4 border-gray-400 rounded-lg touch-none max-w-full"
                  style={{ display: gameState === 'menu' ? 'none' : 'block' }}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                />
                
                {/* Menu Overlay */}
                {gameState === 'menu' && (
                  <div 
                    className="border-4 border-gray-400 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center"
                    style={{ width: canvasSize.width, height: canvasSize.height }}
                  >
                    <div className="text-center text-white p-4">
                      <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold mb-2 sm:mb-4">🐍 SNAKE GAME</h2>
                      <div className="text-xs sm:text-sm lg:text-lg mb-3 sm:mb-6 space-y-1 sm:space-y-2">
                        <p>🍎 Eat food to grow longer</p>
                        <p>⭐ Golden food = 50 points</p>
                        <p>💜 Speed boost food = 20 points</p>
                        <p>🔵 Shrink food = 30 points</p>
                        <p className="text-yellow-300">Difficulty: {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</p>
                        <p className="text-green-300">Mode: {gameMode === 'classic' ? 'Classic' : 'Maze'}</p>
                      </div>
                      <button
                        onClick={startGame}
                        className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 sm:px-6 sm:py-3 lg:px-8 lg:py-4 rounded-lg text-sm sm:text-base lg:text-xl font-bold hover:bg-green-600 transition-colors mx-auto"
                      >
                        <Play size={16} className="sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                        Start Game
                      </button>
                    </div>
                  </div>
                )}

                {/* Game Over Overlay */}
                {gameState === 'gameOver' && (
                  <div className="absolute inset-0 bg-black/70 rounded-lg flex items-center justify-center p-4">
                    <div className="text-center text-white bg-gradient-to-br from-red-600 to-purple-600 p-4 sm:p-6 lg:p-8 rounded-xl max-w-sm w-full">
                      <Trophy size={32} className="sm:w-10 sm:h-10 lg:w-12 lg:h-12 mx-auto mb-2 sm:mb-4 text-yellow-400" />
                      <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 sm:mb-4">GAME OVER!</h3>
                      <div className="space-y-1 sm:space-y-2 mb-4 sm:mb-6 text-sm sm:text-base lg:text-lg">
                        <p>Final Score: {score}</p>
                        <p>Snake Length: {gameObjects.current.snake.length}</p>
                        <p>Best Score: {highScore}</p>
                        {score === highScore && score > 0 && (
                          <p className="text-yellow-400 font-bold text-xs sm:text-sm lg:text-base">🎉 NEW HIGH SCORE! 🎉</p>
                        )}
                      </div>
                      <div className="flex gap-2 sm:gap-4 justify-center flex-col sm:flex-row">
                        <button
                          onClick={startGame}
                          className="bg-green-500 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg hover:bg-green-600 transition-colors text-sm sm:text-base"
                        >
                          Play Again
                        </button>
                        <button
                          onClick={() => setGameState('menu')}
                          className="bg-gray-500 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg hover:bg-gray-600 transition-colors text-sm sm:text-base"
                        >
                          Main Menu
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Controls */}
            {gameState === 'playing' && (
              <div className="sm:hidden">
                <div className="flex justify-center mb-4">
                  <button
                    onTouchStart={() => changeDirection({ x: 0, y: -1 })}
                    className="bg-blue-500 text-white p-3 rounded-lg active:bg-blue-600"
                  >
                    <ArrowUp size={20} />
                  </button>
                </div>
                <div className="flex justify-center gap-4 mb-4">
                  <button
                    onTouchStart={() => changeDirection({ x: -1, y: 0 })}
                    className="bg-blue-500 text-white p-3 rounded-lg active:bg-blue-600"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <button
                    onTouchStart={() => changeDirection({ x: 1, y: 0 })}
                    className="bg-blue-500 text-white p-3 rounded-lg active:bg-blue-600"
                  >
                    <ArrowRight size={20} />
                  </button>
                </div>
                <div className="flex justify-center">
                  <button
                    onTouchStart={() => changeDirection({ x: 0, y: 1 })}
                    className="bg-blue-500 text-white p-3 rounded-lg active:bg-blue-600"
                  >
                    <ArrowDown size={20} />
                  </button>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="text-center text-gray-600 text-xs sm:text-sm">
              <p className="mb-2">
                <strong>Desktop:</strong> Use Arrow Keys or WASD to control the snake
              </p>
              <p className="mb-2">
                <strong>Mobile:</strong> Swipe in any direction or use the control buttons above
              </p>
              <p className="text-xs">
                🍎 Red = 10pts | ⭐ Golden = 50pts | 💜 Speed = 20pts | 🔵 Shrink = 30pts
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SnakeGame;