import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, RotateCcw, Trophy, Play, Volume2, VolumeX, Star, Heart } from 'lucide-react';

const FlappyBirdGame = ({ onBack }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [gameState, setGameState] = useState('menu'); // 'menu', 'playing', 'gameOver'
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lives, setLives] = useState(3);
  const [powerUp, setPowerUp] = useState(null);
  const [powerUpTime, setPowerUpTime] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  
  // Game objects
  const gameObjects = useRef({
    bird: { x: 100, y: 250, velocity: 0, rotation: 0 },
    pipes: [],
    particles: [],
    powerUps: [],
    ground: { x: 0 }
  });

  // Calculate responsive canvas size
  const updateCanvasSize = useCallback(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      const containerWidth = container.offsetWidth - 32; // Account for padding
      const maxWidth = Math.min(containerWidth, 800);
      const maxHeight = Math.min(window.innerHeight - 250, 600);
      
      // Maintain aspect ratio
      const aspectRatio = 4 / 3;
      let width = maxWidth;
      let height = width / aspectRatio;
      
      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
      }
      
      // Minimum size constraints
      width = Math.max(width, 320);
      height = Math.max(height, 240);
      
      setCanvasSize({ width, height });
    }
  }, []);

  // Update canvas size on window resize
  useEffect(() => {
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [updateCanvasSize]);

  // Scale values based on canvas size
  const scale = canvasSize.width / 800;
  const BIRD_SIZE = 25 * scale;
  const PIPE_WIDTH = 70 * scale;
  const PIPE_GAP = 180 * scale;
  const GRAVITY = 0.5 * scale;
  const JUMP_STRENGTH = -11 * scale;
  const PIPE_SPEED = 2.5 * scale;

  // Initialize pipes with shorter height
  const createPipe = (x) => {
    const maxPipeHeight = canvasSize.height * 0.6;
    const minPipeHeight = 80 * scale;
    const topHeight = Math.random() * (maxPipeHeight - minPipeHeight) + minPipeHeight;
    
    return {
      x: x,
      topHeight: topHeight,
      bottomY: topHeight + PIPE_GAP,
      passed: false,
      hasGem: Math.random() < 0.3
    };
  };

  // Create power-ups
  const createPowerUp = (x, y) => ({
    x: x,
    y: y,
    type: Math.random() < 0.5 ? 'shield' : 'slowTime',
    collected: false,
    rotation: 0
  });

  // Initialize game
  const initializeGame = useCallback(() => {
    const birdStartX = 100 * scale;
    const birdStartY = canvasSize.height / 2;
    
    gameObjects.current.bird = { x: birdStartX, y: birdStartY, velocity: 0, rotation: 0 };
    gameObjects.current.pipes = [
      createPipe(canvasSize.width),
      createPipe(canvasSize.width + 300 * scale),
      createPipe(canvasSize.width + 600 * scale)
    ];
    gameObjects.current.particles = [];
    gameObjects.current.powerUps = [];
    gameObjects.current.ground = { x: 0 };
    setScore(0);
    setLives(3);
    setPowerUp(null);
    setPowerUpTime(0);
  }, [scale, canvasSize]);

  // Create particle effect
  const createParticles = (x, y, color = '#FFD93D', count = 8) => {
    const particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 12 * scale,
        vy: (Math.random() - 0.5) * 12 * scale,
        life: 40,
        maxLife: 40,
        color: color,
        size: (Math.random() * 4 + 2) * scale
      });
    }
    gameObjects.current.particles.push(...particles);
  };

  // Draw functions
  const drawBird = (ctx, bird) => {
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rotation);
    
    // Shield effect
    if (powerUp === 'shield') {
      ctx.strokeStyle = '#00FFFF';
      ctx.lineWidth = 3 * scale;
      ctx.beginPath();
      ctx.arc(0, 0, BIRD_SIZE + 8 * scale, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // Bird body with glow effect
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, BIRD_SIZE);
    gradient.addColorStop(0, '#FFE135');
    gradient.addColorStop(0.7, '#FF6B35');
    gradient.addColorStop(1, '#FF4757');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, BIRD_SIZE, 0, Math.PI * 2);
    ctx.fill();
    
    // Bird outline
    ctx.strokeStyle = '#2C3E50';
    ctx.lineWidth = 2 * scale;
    ctx.stroke();
    
    // Bird eye
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(8 * scale, -5 * scale, 7 * scale, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(10 * scale, -5 * scale, 4 * scale, 0, Math.PI * 2);
    ctx.fill();
    
    // Bird beak
    ctx.fillStyle = '#FF6B35';
    ctx.beginPath();
    ctx.moveTo((BIRD_SIZE - 5 * scale), 0);
    ctx.lineTo(BIRD_SIZE + 12 * scale, -3 * scale);
    ctx.lineTo(BIRD_SIZE + 12 * scale, 6 * scale);
    ctx.closePath();
    ctx.fill();
    
    // Wing
    ctx.fillStyle = '#FF4757';
    ctx.beginPath();
    ctx.ellipse(-5 * scale, 5 * scale, 15 * scale, 8 * scale, Math.sin(Date.now() * 0.01) * 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  };

  const drawPipe = (ctx, pipe) => {
    const gradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_WIDTH, 0);
    gradient.addColorStop(0, '#2ECC71');
    gradient.addColorStop(0.5, '#27AE60');
    gradient.addColorStop(1, '#2ECC71');
    
    const groundHeight = 100 * scale;
    
    // Top pipe
    ctx.fillStyle = gradient;
    ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
    ctx.strokeStyle = '#1E8449';
    ctx.lineWidth = 3 * scale;
    ctx.strokeRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
    
    // Top pipe cap
    const capHeight = 35 * scale;
    const capExtension = 8 * scale;
    ctx.fillRect(pipe.x - capExtension, pipe.topHeight - capHeight, PIPE_WIDTH + 2 * capExtension, capHeight);
    ctx.strokeRect(pipe.x - capExtension, pipe.topHeight - capHeight, PIPE_WIDTH + 2 * capExtension, capHeight);
    
    // Bottom pipe
    const bottomY = pipe.bottomY;
    const bottomPipeHeight = canvasSize.height - bottomY - groundHeight;
    ctx.fillRect(pipe.x, bottomY, PIPE_WIDTH, bottomPipeHeight);
    ctx.strokeRect(pipe.x, bottomY, PIPE_WIDTH, bottomPipeHeight);
    
    // Bottom pipe cap
    ctx.fillRect(pipe.x - capExtension, bottomY, PIPE_WIDTH + 2 * capExtension, capHeight);
    ctx.strokeRect(pipe.x - capExtension, bottomY, PIPE_WIDTH + 2 * capExtension, capHeight);
    
    // Bonus gem
    if (pipe.hasGem && !pipe.passed) {
      const gemX = pipe.x + PIPE_WIDTH / 2;
      const gemY = pipe.topHeight + PIPE_GAP / 2;
      
      ctx.save();
      ctx.translate(gemX, gemY);
      ctx.rotate(Date.now() * 0.005);
      
      const gemSize = 8 * scale;
      ctx.fillStyle = '#E74C3C';
      ctx.beginPath();
      ctx.moveTo(0, -gemSize);
      ctx.lineTo(gemSize * 0.75, -gemSize * 0.375);
      ctx.lineTo(gemSize * 0.75, gemSize * 0.375);
      ctx.lineTo(0, gemSize);
      ctx.lineTo(-gemSize * 0.75, gemSize * 0.375);
      ctx.lineTo(-gemSize * 0.75, -gemSize * 0.375);
      ctx.closePath();
      ctx.fill();
      
      ctx.strokeStyle = '#C0392B';
      ctx.lineWidth = 2 * scale;
      ctx.stroke();
      ctx.restore();
    }
  };

  const drawPowerUp = (ctx, powerUp) => {
    const { x, y, type, rotation } = powerUp;
    const radius = 12 * scale;
    
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    
    if (type === 'shield') {
      ctx.fillStyle = '#00FFFF';
      ctx.strokeStyle = '#0099CC';
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      ctx.fillStyle = 'white';
      ctx.font = `bold ${16 * scale}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('S', 0, 5 * scale);
    } else {
      ctx.fillStyle = '#9B59B6';
      ctx.strokeStyle = '#8E44AD';
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      ctx.fillStyle = 'white';
      ctx.font = `bold ${16 * scale}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('T', 0, 5 * scale);
    }
    
    ctx.restore();
  };

  const drawGround = (ctx, ground) => {
    const groundHeight = 100 * scale;
    const gradient = ctx.createLinearGradient(0, canvasSize.height - groundHeight, 0, canvasSize.height);
    gradient.addColorStop(0, '#8B4513');
    gradient.addColorStop(1, '#654321');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, canvasSize.height - groundHeight, canvasSize.width, groundHeight);
    
    // Ground pattern
    ctx.fillStyle = '#A0522D';
    const patternSize = 40 * scale;
    for (let i = 0; i < canvasSize.width + patternSize; i += patternSize) {
      const x = (i + ground.x) % (canvasSize.width + patternSize);
      ctx.fillRect(x, canvasSize.height - groundHeight + 10 * scale, 20 * scale, 10 * scale);
      ctx.fillRect(x + 10 * scale, canvasSize.height - groundHeight + 20 * scale, 15 * scale, 8 * scale);
    }
  };

  const drawClouds = (ctx) => {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    const clouds = [
      { x: 150 * scale, y: 80 * scale, size: 25 * scale },
      { x: 400 * scale, y: 60 * scale, size: 30 * scale },
      { x: 650 * scale, y: 100 * scale, size: 28 * scale },
      { x: 50 * scale, y: 120 * scale, size: 22 * scale }
    ];
    
    clouds.forEach(cloud => {
      if (cloud.x < canvasSize.width) {
        ctx.beginPath();
        ctx.arc(cloud.x, cloud.y, cloud.size, 0, Math.PI * 2);
        ctx.arc(cloud.x + 15 * scale, cloud.y, cloud.size * 0.8, 0, Math.PI * 2);
        ctx.arc(cloud.x + 30 * scale, cloud.y, cloud.size, 0, Math.PI * 2);
        ctx.fill();
      }
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

  const drawUI = (ctx) => {
    const fontSize = Math.max(24, 42 * scale);
    
    // Score
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3 * scale;
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.strokeText(score.toString(), canvasSize.width / 2, fontSize + 20 * scale);
    ctx.fillText(score.toString(), canvasSize.width / 2, fontSize + 20 * scale);
    
    // Lives
    const heartSize = 12 * scale;
    const heartSpacing = 40 * scale;
    for (let i = 0; i < lives; i++) {
      ctx.fillStyle = '#E74C3C';
      ctx.beginPath();
      ctx.arc(30 * scale + i * heartSpacing, 30 * scale, heartSize, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Power-up indicator
    if (powerUp && powerUpTime > 0) {
      const boxWidth = 140 * scale;
      const boxHeight = 40 * scale;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(canvasSize.width - boxWidth - 10 * scale, 10 * scale, boxWidth, boxHeight);
      
      ctx.fillStyle = 'white';
      ctx.font = `bold ${16 * scale}px Arial`;
      ctx.textAlign = 'left';
      const powerUpText = powerUp === 'shield' ? 'SHIELD' : 'SLOW TIME';
      ctx.fillText(powerUpText, canvasSize.width - boxWidth, 25 * scale);
      ctx.fillText(`${Math.ceil(powerUpTime / 60)}s`, canvasSize.width - boxWidth, 40 * scale);
    }
  };

  // Collision detection
  const checkCollision = (bird, pipes) => {
    const groundHeight = 100 * scale;
    
    // Ground collision
    if (bird.y + BIRD_SIZE > canvasSize.height - groundHeight || bird.y - BIRD_SIZE < 0) {
      return true;
    }

    // Pipe collision (ignore if shield is active)
    if (powerUp === 'shield') return false;
    
    for (let pipe of pipes) {
      if (bird.x + BIRD_SIZE > pipe.x && 
          bird.x - BIRD_SIZE < pipe.x + PIPE_WIDTH) {
        if (bird.y - BIRD_SIZE < pipe.topHeight || 
            bird.y + BIRD_SIZE > pipe.bottomY) {
          return true;
        }
      }
    }
    return false;
  };

  // Game loop
  const gameLoop = useCallback(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const { bird, pipes, particles, powerUps, ground } = gameObjects.current;

    // Clear canvas with sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvasSize.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#98FB98');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    // Update power-up timer
    if (powerUpTime > 0) {
      setPowerUpTime(prev => prev - 1);
      if (powerUpTime <= 1) {
        setPowerUp(null);
      }
    }

    // Update bird physics
    const currentGravity = powerUp === 'slowTime' ? GRAVITY * 0.5 : GRAVITY;
    bird.velocity += currentGravity;
    bird.y += bird.velocity;
    bird.rotation = Math.min(bird.velocity * 0.05, Math.PI / 4);

    // Update pipes
    const currentSpeed = powerUp === 'slowTime' ? PIPE_SPEED * 0.5 : PIPE_SPEED;
    pipes.forEach(pipe => {
      pipe.x -= currentSpeed;
      
      // Check if bird passed pipe
      if (!pipe.passed && bird.x > pipe.x + PIPE_WIDTH) {
        pipe.passed = true;
        setScore(prev => prev + 1);
        createParticles(bird.x, bird.y, '#FFD93D', 6);
        
        // Bonus points for gem
        if (pipe.hasGem) {
          setScore(prev => prev + 2);
          createParticles(bird.x, bird.y, '#E74C3C', 10);
        }
      }
    });

    // Add power-ups randomly
    if (Math.random() < 0.002 && powerUps.length < 2) {
      powerUps.push(createPowerUp(
        canvasSize.width + 50 * scale,
        100 * scale + Math.random() * (canvasSize.height - 300 * scale)
      ));
    }

    // Update power-ups
    powerUps.forEach((pu, index) => {
      pu.x -= currentSpeed;
      pu.rotation += 0.1;
      
      // Check collection
      const dx = bird.x - pu.x;
      const dy = bird.y - pu.y;
      if (Math.sqrt(dx * dx + dy * dy) < BIRD_SIZE + 12 * scale && !pu.collected) {
        pu.collected = true;
        setPowerUp(pu.type);
        setPowerUpTime(300); // 5 seconds at 60fps
        createParticles(pu.x, pu.y, '#9B59B6', 12);
        powerUps.splice(index, 1);
      }
    });

    // Remove off-screen power-ups
    for (let i = powerUps.length - 1; i >= 0; i--) {
      if (powerUps[i].x < -50 * scale) {
        powerUps.splice(i, 1);
      }
    }

    // Remove pipes that are off screen and add new ones
    if (pipes[0].x < -PIPE_WIDTH) {
      pipes.shift();
      pipes.push(createPipe(pipes[pipes.length - 1].x + 300 * scale));
    }

    // Update ground
    ground.x -= currentSpeed;
    if (ground.x <= -40 * scale) ground.x = 0;

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i];
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.3 * scale;
      particle.life--;
      
      if (particle.life <= 0) {
        particles.splice(i, 1);
      }
    }

    // Check collision
    if (checkCollision(bird, pipes)) {
      setLives(prev => {
        const newLives = prev - 1;
        if (newLives <= 0) {
          setGameState('gameOver');
          setHighScore(prev => Math.max(prev, score));
        }
        return newLives;
      });
      
      createParticles(bird.x, bird.y, '#FF6B6B', 15);
      
      // Reset bird position
      if (lives > 1) {
        gameObjects.current.bird = { 
          x: 100 * scale, 
          y: canvasSize.height / 2, 
          velocity: 0, 
          rotation: 0 
        };
      }
    }

    // Draw everything
    drawClouds(ctx);
    pipes.forEach(pipe => drawPipe(ctx, pipe));
    powerUps.forEach(pu => drawPowerUp(ctx, pu));
    drawGround(ctx, ground);
    drawBird(ctx, bird);
    drawParticles(ctx, particles);
    drawUI(ctx);
  }, [gameState, score, lives, powerUp, powerUpTime, canvasSize, scale]);

  // Event handlers
  useEffect(() => {
    const handleKeyPress = (e) => {
      if ((e.code === 'Space' || e.key === ' ') && gameState === 'playing') {
        e.preventDefault();
        gameObjects.current.bird.velocity = JUMP_STRENGTH;
      }
    };

    const handleClick = (e) => {
      if (gameState === 'playing') {
        e.preventDefault();
        gameObjects.current.bird.velocity = JUMP_STRENGTH;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    if (canvasRef.current) {
      canvasRef.current.addEventListener('click', handleClick);
      canvasRef.current.addEventListener('touchstart', handleClick);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      if (canvasRef.current) {
        canvasRef.current.removeEventListener('click', handleClick);
        canvasRef.current.removeEventListener('touchstart', handleClick);
      }
    };
  }, [gameState, JUMP_STRENGTH]);

  // Game loop
  useEffect(() => {
    const interval = setInterval(gameLoop, 16); // ~60fps
    return () => clearInterval(interval);
  }, [gameLoop]);

  const startGame = () => {
    initializeGame();
    setGameState('playing');
  };

  const restartGame = () => {
    initializeGame();
    setGameState('playing');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 p-2 sm:p-4">
      <div className="max-w-7xl mx-auto" ref={containerRef}>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl sm:rounded-2xl p-3 sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 sm:mb-6 flex-wrap gap-2">
            <button 
              onClick={onBack || (() => setGameState('menu'))}
              className="flex items-center gap-2 bg-white/20 text-white px-3 py-2 text-sm sm:px-4 sm:text-base rounded-lg hover:bg-white/30 transition-colors"
            >
              <ArrowLeft size={16} className="sm:w-5 sm:h-5" />
              Back
            </button>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">🐦 Enhanced Flappy Bird</h1>
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
            {/* Score Display */}
            <div className="flex justify-center gap-4 sm:gap-8 mb-4 sm:mb-6 flex-wrap">
              <div className="text-center">
                <div className="text-sm sm:text-xl font-bold text-blue-600">Score</div>
                <div className="text-xl sm:text-3xl font-bold">{score}</div>
              </div>
              <div className="text-center">
                <div className="text-sm sm:text-xl font-bold text-red-600">Lives</div>
                <div className="text-xl sm:text-3xl font-bold flex justify-center gap-1">
                  {Array.from({length: lives}, (_, i) => (
                    <Heart key={i} size={16} className="sm:w-6 sm:h-6 text-red-500 fill-current" />
                  ))}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm sm:text-xl font-bold text-yellow-600">Best</div>
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
                  className="border-4 border-gray-400 rounded-lg cursor-pointer touch-none max-w-full"
                  style={{ display: gameState === 'menu' ? 'none' : 'block' }}
                />
                
                {/* Menu Overlay */}
                {gameState === 'menu' && (
                  <div 
                    className="border-4 border-gray-400 rounded-lg bg-gradient-to-b from-purple-500 to-blue-600 flex items-center justify-center"
                    style={{ width: canvasSize.width, height: canvasSize.height }}
                  >
                    <div className="text-center text-white p-4">
                      <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold mb-2 sm:mb-4">🐦 ENHANCED FLAPPY</h2>
                      <div className="text-xs sm:text-sm lg:text-lg mb-3 sm:mb-6 space-y-1 sm:space-y-2">
                        <p>✨ New Features:</p>
                        <p>💎 Collect gems for bonus points</p>
                        <p>🛡️ Shield power-up for protection</p>
                        <p>⏰ Slow-time power-up</p>
                        <p>❤️ Multiple lives system</p>
                      </div>
                      <button
                        onClick={startGame}
                        className="flex items-center gap-2 bg-yellow-500 text-white px-4 py-2 sm:px-6 sm:py-3 lg:px-8 lg:py-4 rounded-lg text-sm sm:text-base lg:text-xl font-bold hover:bg-yellow-600 transition-colors mx-auto"
                      >
                        <Play size={16} className="sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                        Start Adventure
                      </button>
                      <div className="mt-3 sm:mt-6 text-xs sm:text-sm">
                        <p>Click/Tap or press SPACEBAR to flap</p>
                        <p>Collect power-ups and gems!</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Game Over Overlay */}
                {gameState === 'gameOver' && (
                  <div className="absolute inset-0 bg-black/70 rounded-lg flex items-center justify-center p-4">
                    <div className="text-center text-white bg-gradient-to-br from-red-600 to-purple-600 p-4 sm:p-6 rounded-xl max-w-sm w-full">
                      <div className="mb-4">
                        <Trophy size={48} className="mx-auto mb-2 text-yellow-400" />
                        <h2 className="text-2xl sm:text-3xl font-bold mb-2">Game Over!</h2>
                        <div className="space-y-2">
                          <p className="text-lg">Final Score: <span className="font-bold text-yellow-400">{score}</span></p>
                          {score === highScore && score > 0 && (
                            <div className="flex items-center justify-center gap-2 text-yellow-400">
                              <Star size={20} className="fill-current" />
                              <span className="font-bold">New High Score!</span>
                              <Star size={20} className="fill-current" />
                            </div>
                          )}
                          <p className="text-sm">High Score: {highScore}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <button
                          onClick={restartGame}
                          className="w-full bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                        >
                          <Play size={20} />
                          Play Again
                        </button>
                        <button
                          onClick={() => setGameState('menu')}
                          className="w-full bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-bold transition-colors"
                        >
                          Main Menu
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Instructions */}
            <div className="text-center text-gray-600 text-sm sm:text-base">
              <p className="mb-2">
                <strong>Controls:</strong> Click, tap, or press SPACEBAR to flap
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                <div className="bg-blue-50 p-2 rounded">
                  <span className="font-semibold text-blue-600">💎 Gems:</span> +3 points each
                </div>
                <div className="bg-cyan-50 p-2 rounded">
                  <span className="font-semibold text-cyan-600">🛡️ Shield:</span> Temporary protection
                </div>
                <div className="bg-purple-50 p-2 rounded">
                  <span className="font-semibold text-purple-600">⏰ Slow Time:</span> Reduces game speed
                </div>
                <div className="bg-red-50 p-2 rounded">
                  <span className="font-semibold text-red-600">❤️ Lives:</span> 3 chances to survive
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main App Component with fallback onBack
const App = () => {
  return <FlappyBirdGame onBack={() => console.log('Back button clicked')} />;
};

export default App;