import React, { useState, useEffect, useRef } from 'react';
import { RotateCcw, Trophy, Volume2, VolumeX, Crown, Zap, Star, Settings, Target, Award, Timer, Sparkles } from 'lucide-react';

const RockPaperScissors = () => {
  const [playerChoice, setPlayerChoice] = useState(null);
  const [computerChoice, setComputerChoice] = useState(null);
  const [playerScore, setPlayerScore] = useState(0);
  const [computerScore, setComputerScore] = useState(0);
  const [gameResult, setGameResult] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [gameMode, setGameMode] = useState('classic');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [winStreak, setWinStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [particles, setParticles] = useState([]);
  const [gameHistory, setGameHistory] = useState([]);
  const [powerUps, setPowerUps] = useState({ shield: 0, insight: 0, luck: 0 });
  const [activePowerUp, setActivePowerUp] = useState(null);
  const [difficulty, setDifficulty] = useState('normal');
  const [tournamentMode, setTournamentMode] = useState(false);
  const [tournamentRound, setTournamentRound] = useState(1);
  const [tournamentWins, setTournamentWins] = useState(0);
  const [achievements, setAchievements] = useState([]);
  const [showAchievement, setShowAchievement] = useState(null);
  const [gameTimer, setGameTimer] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [comboMultiplier, setComboMultiplier] = useState(1);
  const [totalGamesPlayed, setTotalGamesPlayed] = useState(0);

  const choices = {
    classic: [
      { name: 'rock', emoji: '🪨', beats: ['scissors'], color: 'bg-gray-500' },
      { name: 'paper', emoji: '📄', beats: ['rock'], color: 'bg-blue-500' },
      { name: 'scissors', emoji: '✂️', beats: ['paper'], color: 'bg-red-500' }
    ],
    extended: [
      { name: 'rock', emoji: '🪨', beats: ['scissors', 'lizard'], color: 'bg-gray-500' },
      { name: 'paper', emoji: '📄', beats: ['rock', 'spock'], color: 'bg-blue-500' },
      { name: 'scissors', emoji: '✂️', beats: ['paper', 'lizard'], color: 'bg-red-500' },
      { name: 'lizard', emoji: '🦎', beats: ['spock', 'paper'], color: 'bg-green-500' },
      { name: 'spock', emoji: '🖖', beats: ['scissors', 'rock'], color: 'bg-purple-500' }
    ]
  };

  const currentChoices = choices[gameMode];

  // Achievement definitions
  const achievementList = [
    { id: 'first_win', name: 'First Victory', description: 'Win your first game', icon: '🏆', condition: (stats) => stats.playerScore >= 1 },
    { id: 'streak_3', name: 'Hat Trick', description: 'Win 3 games in a row', icon: '🔥', condition: (stats) => stats.winStreak >= 3 },
    { id: 'streak_5', name: 'Dominator', description: 'Win 5 games in a row', icon: '👑', condition: (stats) => stats.winStreak >= 5 },
    { id: 'perfectionist', name: 'Perfectionist', description: 'Win 10 games without losing', icon: '⭐', condition: (stats) => stats.winStreak >= 10 },
    { id: 'century', name: 'Century Club', description: 'Play 100 games', icon: '💯', condition: (stats) => stats.totalGamesPlayed >= 100 },
    { id: 'extended_master', name: 'Extended Master', description: 'Win with all 5 choices in extended mode', icon: '🎯', condition: (stats) => false }, // Custom logic needed
    { id: 'speed_demon', name: 'Speed Demon', description: 'Win a game in under 3 seconds', icon: '⚡', condition: (stats) => false }, // Custom logic needed
  ];

  // Timer effect
  useEffect(() => {
    let interval = null;
    if (isTimerActive) {
      interval = setInterval(() => {
        setGameTimer(timer => timer + 1);
      }, 1000);
    } else if (!isTimerActive && gameTimer !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerActive, gameTimer]);

  // Start timer on first game
  useEffect(() => {
    if (totalGamesPlayed === 1 && !isTimerActive) {
      setIsTimerActive(true);
    }
  }, [totalGamesPlayed]);

  // Particle system
  useEffect(() => {
    if (particles.length > 0) {
      const timer = setTimeout(() => {
        setParticles(prev => prev.filter(p => p.life > 0).map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.5,
          life: p.life - 1,
          opacity: p.life / p.maxLife
        })));
      }, 16);
      return () => clearTimeout(timer);
    }
  }, [particles]);

  // Check for achievements
  useEffect(() => {
    const stats = { playerScore, winStreak, totalGamesPlayed };
    achievementList.forEach(achievement => {
      if (!achievements.includes(achievement.id) && achievement.condition(stats)) {
        setAchievements(prev => [...prev, achievement.id]);
        setShowAchievement(achievement);
        setTimeout(() => setShowAchievement(null), 3000);
      }
    });
  }, [playerScore, winStreak, totalGamesPlayed]);

  const createParticles = (x, y, color = '#FFD700', count = 15) => {
    const newParticles = [];
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: Math.random(),
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10 - 5,
        life: 60,
        maxLife: 60,
        color: color,
        size: Math.random() * 6 + 2,
        opacity: 1
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
  };

  const getRandomChoice = () => {
    if (difficulty === 'easy') {
      // Easy mode: computer is more predictable
      return currentChoices[Math.floor(Math.random() * currentChoices.length)];
    } else if (difficulty === 'hard') {
      // Hard mode: computer tries to counter player's most common choice
      if (gameHistory.length >= 3) {
        const recentChoices = gameHistory.slice(0, 3).map(game => game.player.name);
        const mostCommon = recentChoices.reduce((a, b, i, arr) =>
          arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
        );
        const counter = currentChoices.find(choice => choice.beats.includes(mostCommon));
        if (counter && Math.random() > 0.3) return counter;
      }
    }
    return currentChoices[Math.floor(Math.random() * currentChoices.length)];
  };

  const determineWinner = (player, computer) => {
    if (activePowerUp === 'shield' && player.beats.includes(computer.name)) {
      setActivePowerUp(null);
      return 'player'; // Shield guarantees win if normally winning
    }
    
    if (activePowerUp === 'luck' && Math.random() > 0.5) {
      setActivePowerUp(null);
      return 'player'; // Luck gives 50% chance to win regardless
    }

    if (player.name === computer.name) {
      return 'tie';
    }
    return player.beats.includes(computer.name) ? 'player' : 'computer';
  };

  const playGame = (choice) => {
    if (isPlaying) return;

    setPlayerChoice(choice);
    setIsPlaying(true);
    setShowResult(false);
    setCountdown(3);
    setTotalGamesPlayed(prev => prev + 1);

    // Insight power-up reveals computer choice early
    if (activePowerUp === 'insight') {
      const compChoice = getRandomChoice();
      setComputerChoice(compChoice);
      setActivePowerUp(null);
    }

    const countdownTimer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownTimer);
          
          const compChoice = computerChoice || getRandomChoice();
          if (!computerChoice) setComputerChoice(compChoice);
          
          const result = determineWinner(choice, compChoice);
          setGameResult(result);
          
          // Update scores and streaks
          if (result === 'player') {
            const points = comboMultiplier;
            setPlayerScore(prev => prev + points);
            setWinStreak(prev => {
              const newStreak = prev + 1;
              setBestStreak(current => Math.max(current, newStreak));
              setComboMultiplier(Math.min(5, Math.floor(newStreak / 3) + 1));
              return newStreak;
            });
            
            // Earn power-ups
            if (Math.random() > 0.7) {
              const powerUpType = ['shield', 'insight', 'luck'][Math.floor(Math.random() * 3)];
              setPowerUps(prev => ({...prev, [powerUpType]: prev[powerUpType] + 1}));
            }
            
            setTimeout(() => createParticles(window.innerWidth / 2, 200, '#00FF00'), 500);
          } else if (result === 'computer') {
            setComputerScore(prev => prev + 1);
            setWinStreak(0);
            setComboMultiplier(1);
            setTimeout(() => createParticles(window.innerWidth / 2, 200, '#FF0000'), 500);
          } else {
            setTimeout(() => createParticles(window.innerWidth / 2, 200, '#FFFF00'), 500);
          }

          // Tournament mode logic
          if (tournamentMode) {
            if (result === 'player') {
              setTournamentWins(prev => prev + 1);
              if (tournamentWins + 1 >= 3) {
                setTournamentRound(prev => prev + 1);
                setTournamentWins(0);
              }
            } else if (result === 'computer') {
              // Tournament ends on loss
              setTournamentMode(false);
              setTournamentRound(1);
              setTournamentWins(0);
            }
          }

          setGameHistory(prev => [{
            player: choice,
            computer: compChoice,
            result: result,
            timestamp: new Date().toLocaleTimeString(),
            points: result === 'player' ? comboMultiplier : 0
          }, ...prev.slice(0, 9)]);

          setShowResult(true);
          setIsPlaying(false);
          
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const usePowerUp = (type) => {
    if (powerUps[type] > 0 && !activePowerUp) {
      setActivePowerUp(type);
      setPowerUps(prev => ({...prev, [type]: prev[type] - 1}));
    }
  };

  const startTournament = () => {
    resetGame();
    setTournamentMode(true);
    setTournamentRound(1);
    setTournamentWins(0);
  };

  const resetGame = () => {
    setPlayerChoice(null);
    setComputerChoice(null);
    setPlayerScore(0);
    setComputerScore(0);
    setGameResult('');
    setWinStreak(0);
    setCountdown(0);
    setShowResult(false);
    setGameHistory([]);
    setParticles([]);
    setActivePowerUp(null);
    setComboMultiplier(1);
    setGameTimer(0);
    setIsTimerActive(false);
  };

  const getResultMessage = () => {
    if (gameResult === 'player') {
      const messages = [
        "🎉 You Win!", 
        "🏆 Victory!", 
        "⭐ Excellent!", 
        "🔥 On Fire!",
        "💪 Well Played!",
        "🚀 Unstoppable!",
        "⚡ Lightning Fast!",
        "🎯 Perfect Shot!"
      ];
      return messages[Math.floor(Math.random() * messages.length)];
    } else if (gameResult === 'computer') {
      return "🤖 Computer Wins!";
    } else {
      return "🤝 It's a Tie!";
    }
  };

  const getResultColor = () => {
    switch (gameResult) {
      case 'player': return 'text-green-400';
      case 'computer': return 'text-red-400';
      default: return 'text-yellow-400';
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 p-2 sm:p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-10 -left-10 w-20 sm:w-40 h-20 sm:h-40 bg-white/10 rounded-full animate-pulse"></div>
        <div className="absolute top-1/4 -right-10 w-30 sm:w-60 h-30 sm:h-60 bg-white/5 rounded-full animate-bounce" style={{ animationDuration: '3s' }}></div>
        <div className="absolute bottom-1/4 left-1/4 w-16 sm:w-32 h-16 sm:h-32 bg-white/10 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Achievement Notification */}
      {showAchievement && (
        <div className="fixed top-4 right-4 z-50 bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-4 rounded-lg shadow-lg animate-slideIn">
          <div className="flex items-center gap-2">
            <span className="text-xl">{showAchievement.icon}</span>
            <div>
              <div className="font-bold">{showAchievement.name}</div>
              <div className="text-sm opacity-90">{showAchievement.description}</div>
            </div>
          </div>
        </div>
      )}

      {/* Particles */}
      {particles.map(particle => (
        <div
          key={particle.id}
          className="absolute pointer-events-none rounded-full z-20"
          style={{
            left: particle.x,
            top: particle.y,
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            opacity: particle.opacity,
            transform: 'translate(-50%, -50%)'
          }}
        />
      ))}

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl md:text-6xl font-bold text-white mb-2 sm:mb-4 drop-shadow-lg">
            🪨📄✂️ Rock Paper Scissors
          </h1>
          <p className="text-white/80 text-sm sm:text-lg">Choose your weapon and battle the computer!</p>
          
          {/* Game Timer & Tournament Info */}
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {isTimerActive && (
              <div className="bg-white/20 backdrop-blur-lg rounded-lg px-3 py-1 text-white flex items-center gap-2">
                <Timer size={16} />
                <span className="text-sm">{formatTime(gameTimer)}</span>
              </div>
            )}
            
            {tournamentMode && (
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg px-3 py-1 text-white flex items-center gap-2">
                <Crown size={16} />
                <span className="text-sm">Round {tournamentRound} • {tournamentWins}/3 wins</span>
              </div>
            )}
            
            {comboMultiplier > 1 && (
              <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-lg px-3 py-1 text-white flex items-center gap-2">
                <Zap size={16} />
                <span className="text-sm">{comboMultiplier}x Combo!</span>
              </div>
            )}
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-4 sm:mb-8">
          {/* Game Mode Toggle */}
          <div className="bg-white/20 backdrop-blur-lg rounded-xl p-1 sm:p-2 flex gap-1 sm:gap-2">
            <button
              onClick={() => setGameMode('classic')}
              className={`px-2 sm:px-4 py-1 sm:py-2 rounded-lg font-semibold transition-all text-xs sm:text-sm ${
                gameMode === 'classic' 
                ? 'bg-white text-purple-600 shadow-lg' 
                : 'text-white hover:bg-white/20'
              }`}
            >
              Classic (3)
            </button>
            <button
              onClick={() => setGameMode('extended')}
              className={`px-2 sm:px-4 py-1 sm:py-2 rounded-lg font-semibold transition-all text-xs sm:text-sm ${
                gameMode === 'extended' 
                ? 'bg-white text-purple-600 shadow-lg' 
                : 'text-white hover:bg-white/20'
              }`}
            >
              Extended (5)
            </button>
          </div>

          {/* Difficulty */}
          <div className="bg-white/20 backdrop-blur-lg rounded-xl p-1 sm:p-2 flex gap-1 sm:gap-2">
            {['easy', 'normal', 'hard'].map(diff => (
              <button
                key={diff}
                onClick={() => setDifficulty(diff)}
                className={`px-2 sm:px-3 py-1 sm:py-2 rounded-lg font-semibold transition-all text-xs sm:text-sm capitalize ${
                  difficulty === diff 
                  ? 'bg-white text-purple-600 shadow-lg' 
                  : 'text-white hover:bg-white/20'
                }`}
              >
                {diff}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="bg-white/20 backdrop-blur-lg text-white px-2 sm:px-4 py-1 sm:py-2 rounded-lg hover:bg-white/30 transition-colors flex items-center gap-2"
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            
            <button
              onClick={startTournament}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 sm:px-4 py-1 sm:py-2 rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
            >
              <Trophy size={16} />
              <span className="hidden sm:inline">Tournament</span>
            </button>
            
            <button
              onClick={resetGame}
              className="bg-white/20 backdrop-blur-lg text-white px-2 sm:px-4 py-1 sm:py-2 rounded-lg hover:bg-white/30 transition-colors flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
            >
              <RotateCcw size={16} />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-4 sm:gap-8">
          {/* Main Game Area */}
          <div className="lg:col-span-3">
            {/* Score Board */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-3 sm:p-6 mb-4 sm:mb-8">
              <div className="grid grid-cols-3 gap-3 sm:gap-6 text-center">
                <div className="bg-green-500/20 rounded-xl p-2 sm:p-4">
                  <h3 className="text-white font-semibold mb-1 sm:mb-2 flex items-center justify-center gap-1 sm:gap-2 text-sm sm:text-base">
                    <Crown className="text-yellow-400" size={16} />
                    You
                  </h3>
                  <div className="text-xl sm:text-3xl font-bold text-white">{playerScore}</div>
                  {winStreak > 0 && (
                    <div className="text-yellow-400 text-xs sm:text-sm mt-1 flex items-center justify-center gap-1">
                      <Zap size={12} />
                      {winStreak} streak
                    </div>
                  )}
                </div>
                
                <div className="bg-white/20 rounded-xl p-2 sm:p-4">
                  <h3 className="text-white font-semibold mb-1 sm:mb-2 text-sm sm:text-base">Match</h3>
                  <div className="text-sm sm:text-lg text-white/80">
                    {playerScore + computerScore} games
                  </div>
                  {bestStreak > 0 && (
                    <div className="text-yellow-400 text-xs sm:text-sm mt-1 flex items-center justify-center gap-1">
                      <Star size={12} />
                      Best: {bestStreak}
                    </div>
                  )}
                </div>
                
                <div className="bg-red-500/20 rounded-xl p-2 sm:p-4">
                  <h3 className="text-white font-semibold mb-1 sm:mb-2 flex items-center justify-center gap-1 sm:gap-2 text-sm sm:text-base">
                    <Trophy className="text-gray-400" size={16} />
                    Computer
                  </h3>
                  <div className="text-xl sm:text-3xl font-bold text-white">{computerScore}</div>
                </div>
              </div>
            </div>

            {/* Power-ups */}
            {(powerUps.shield > 0 || powerUps.insight > 0 || powerUps.luck > 0 || activePowerUp) && (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-3 sm:p-6 mb-4 sm:mb-8">
                <h3 className="text-white font-semibold mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
                  <Sparkles size={20} />
                  Power-ups
                  {activePowerUp && <span className="text-yellow-400 text-xs sm:text-sm">({activePowerUp} active!)</span>}
                </h3>
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  <button
                    onClick={() => usePowerUp('shield')}
                    disabled={powerUps.shield === 0 || activePowerUp}
                    className="bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg p-2 sm:p-3 transition-colors text-center"
                  >
                    <div className="text-lg sm:text-2xl mb-1">🛡️</div>
                    <div className="text-white text-xs sm:text-sm">Shield</div>
                    <div className="text-white/60 text-xs">x{powerUps.shield}</div>
                  </button>
                  
                  <button
                    onClick={() => usePowerUp('insight')}
                    disabled={powerUps.insight === 0 || activePowerUp}
                    className="bg-purple-500/20 hover:bg-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg p-2 sm:p-3 transition-colors text-center"
                  >
                    <div className="text-lg sm:text-2xl mb-1">👁️</div>
                    <div className="text-white text-xs sm:text-sm">Insight</div>
                    <div className="text-white/60 text-xs">x{powerUps.insight}</div>
                  </button>
                  
                  <button
                    onClick={() => usePowerUp('luck')}
                    disabled={powerUps.luck === 0 || activePowerUp}
                    className="bg-green-500/20 hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg p-2 sm:p-3 transition-colors text-center"
                  >
                    <div className="text-lg sm:text-2xl mb-1">🍀</div>
                    <div className="text-white text-xs sm:text-sm">Luck</div>
                    <div className="text-white/60 text-xs">x{powerUps.luck}</div>
                  </button>
                </div>
              </div>
            )}

            {/* Battle Arena */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 sm:p-8 mb-4 sm:mb-8">
              <div className="grid grid-cols-2 gap-4 sm:gap-8 items-center min-h-[150px] sm:min-h-[200px]">
                {/* Player Side */}
                <div className="text-center">
                  <h3 className="text-white font-semibold mb-2 sm:mb-4 text-sm sm:text-xl">Your Choice</h3>
                  <div className="bg-white/20 rounded-full w-20 h-20 sm:w-32 sm:h-32 mx-auto flex items-center justify-center text-3xl sm:text-6xl transform hover:scale-105 transition-transform">
                    {playerChoice ? playerChoice.emoji : '❓'}
                  </div>
                  <div className="mt-2 sm:mt-4 text-white/80 capitalize text-xs sm:text-base">
                    {playerChoice?.name || 'Make your choice'}
                  </div>
                </div>

                {/* VS Divider */}
                <div className="text-center">
                  {countdown > 0 ? (
                    <div className="text-3xl sm:text-6xl font-bold text-white animate-pulse">
                      {countdown}
                    </div>
                  ) : (
                    <div className="text-2xl sm:text-4xl font-bold text-white/60">VS</div>
                  )}
                </div>

                {/* Computer Side */}
                <div className="text-center">
                  <h3 className="text-white font-semibold mb-2 sm:mb-4 text-sm sm:text-xl">Computer's Choice</h3>
                  <div className="bg-white/20 rounded-full w-20 h-20 sm:w-32 sm:h-32 mx-auto flex items-center justify-center text-3xl sm:text-6xl transform hover:scale-105 transition-transform">
                    {isPlaying ? (
                      <div className="animate-spin">🎲</div>
                    ) : computerChoice ? (
                      computerChoice.emoji
                    ) : (
                      '❓'
                    )}
                  </div>
                  <div className="mt-2 sm:mt-4 text-white/80 capitalize text-xs sm:text-base">
                    {computerChoice?.name || 'Thinking...'}
                  </div>
                </div>
              </div>

              {/* Result Display */}
              {showResult && (
                <div className="text-center mt-4 sm:mt-8 animate-fadeIn">
                  <div className={`text-2xl sm:text-3xl font-bold mb-2 sm:mb-4 ${getResultColor()}`}>
                    {getResultMessage()}
                  </div>
                  {gameResult === 'player' && comboMultiplier > 1 && (
                    <div className="text-orange-400 text-sm sm:text-base mb-2">
                      +{comboMultiplier} points! 🔥
                    </div>
                  )}
                  {gameResult === 'player' && (
                    <div className="text-white/80 text-sm sm:text-base">
                      {playerChoice?.name} beats {computerChoice?.name}!
                    </div>
                  )}
                  {gameResult === 'computer' && (
                    <div className="text-white/80 text-sm sm:text-base">
                      {computerChoice?.name} beats {playerChoice?.name}!
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Choice Buttons */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-3 sm:p-6">
              <h3 className="text-white font-semibold mb-3 sm:mb-6 text-center text-sm sm:text-xl">Choose Your Weapon</h3>
              <div className={`grid ${gameMode === 'classic' ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-5'} gap-2 sm:gap-4`}>
                {currentChoices.map((choice) => (
                  <button
                    key={choice.name}
                    onClick={() => playGame(choice)}
                    disabled={isPlaying}
                    className="bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl p-3 sm:p-6 transition-all transform hover:scale-105 active:scale-95 group relative overflow-hidden"
                  >
                    <div className={`absolute inset-0 ${choice.color} opacity-10 group-hover:opacity-20 transition-opacity`}></div>
                    <div className="relative">
                      <div className="text-2xl sm:text-4xl mb-1 sm:mb-2 group-hover:animate-bounce">
                        {choice.emoji}
                      </div>
                      <div className="text-white font-medium capitalize text-xs sm:text-sm">
                        {choice.name}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              
              {gameMode === 'extended' && (
                <div className="mt-3 sm:mt-4 text-xs text-white/60 text-center">
                  Rock crushes Scissors & Lizard • Paper covers Rock & Spock • Scissors cuts Paper & Lizard • Lizard eats Paper & poisons Spock • Spock vaporizes Rock & smashes Scissors
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            {/* Game Stats */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-3 sm:p-6">
              <h3 className="text-white font-semibold mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
                <Trophy size={16} />
                Statistics
              </h3>
              <div className="space-y-2 sm:space-y-3 text-white/80 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span>Win Rate:</span>
                  <span className="font-semibold">
                    {playerScore + computerScore > 0 
                      ? Math.round((playerScore / (playerScore + computerScore)) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Current Streak:</span>
                  <span className="font-semibold text-yellow-400">{winStreak}</span>
                </div>
                <div className="flex justify-between">
                  <span>Best Streak:</span>
                  <span className="font-semibold text-yellow-400">{bestStreak}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Games:</span>
                  <span className="font-semibold">{totalGamesPlayed}</span>
                </div>
                <div className="flex justify-between">
                  <span>Session Score:</span>
                  <span className="font-semibold">{playerScore}-{computerScore}</span>
                </div>
                {isTimerActive && (
                  <div className="flex justify-between">
                    <span>Play Time:</span>
                    <span className="font-semibold">{formatTime(gameTimer)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Achievements */}
            {achievements.length > 0 && (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-3 sm:p-6">
                <h3 className="text-white font-semibold mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
                  <Award size={16} />
                  Achievements ({achievements.length})
                </h3>
                <div className="space-y-2 max-h-40 sm:max-h-60 overflow-y-auto">
                  {achievementList
                    .filter(achievement => achievements.includes(achievement.id))
                    .map((achievement) => (
                    <div key={achievement.id} className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg p-2 sm:p-3 text-xs sm:text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{achievement.icon}</span>
                        <span className="text-white font-semibold">{achievement.name}</span>
                      </div>
                      <div className="text-white/60 text-xs">{achievement.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Games */}
            {gameHistory.length > 0 && (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-3 sm:p-6">
                <h3 className="text-white font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Recent Games</h3>
                <div className="space-y-2 max-h-40 sm:max-h-60 overflow-y-auto">
                  {gameHistory.map((game, index) => (
                    <div key={index} className="bg-white/10 rounded-lg p-2 sm:p-3 text-xs sm:text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span>{game.player.emoji}</span>
                          <span className="text-white/60">vs</span>
                          <span>{game.computer.emoji}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {game.points > 0 && (
                            <span className="text-orange-400 font-semibold">+{game.points}</span>
                          )}
                          <span className={`font-semibold ${
                            game.result === 'player' ? 'text-green-400' :
                            game.result === 'computer' ? 'text-red-400' :
                            'text-yellow-400'
                          }`}>
                            {game.result === 'player' ? 'W' : game.result === 'computer' ? 'L' : 'T'}
                          </span>
                        </div>
                      </div>
                      <div className="text-white/40 text-xs">{game.timestamp}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Word Guessing Mini-Game */}
            <WordGuessingGame />

            {/* Quick Tips */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-3 sm:p-6">
              <h3 className="text-white font-semibold mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
                <Target size={16} />
                Quick Tips
              </h3>
              <div className="text-white/80 text-xs sm:text-sm space-y-2">
                <p>• Win streaks give combo multipliers</p>
                <p>• Earn power-ups by winning games</p>
                <p>• Try tournament mode for challenge</p>
                <p>• Hard difficulty adapts to your play</p>
                <p>• Unlock achievements for rewards</p>
                {gameMode === 'extended' && (
                  <p>• Extended mode has 5 weapons</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(100%); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

// Word Guessing Mini-Game Component
const WordGuessingGame = () => {
  const [currentWord, setCurrentWord] = useState('');
  const [guessedLetters, setGuessedLetters] = useState([]);
  const [wrongGuesses, setWrongGuesses] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [gameLost, setGameLost] = useState(false);
  const [showGame, setShowGame] = useState(false);

  const words = [
    'VICTORY', 'CHAMPION', 'BATTLE', 'WINNER', 'GAME', 'ROCK', 'PAPER', 
    'SCISSORS', 'COMPUTER', 'PLAYER', 'STREAK', 'COMBO', 'POWER', 'SHIELD'
  ];

  const maxWrongGuesses = 6;

  const startNewGame = () => {
    const word = words[Math.floor(Math.random() * words.length)];
    setCurrentWord(word);
    setGuessedLetters([]);
    setWrongGuesses(0);
    setGameWon(false);
    setGameLost(false);
    setShowGame(true);
  };

  const guessLetter = (letter) => {
    if (guessedLetters.includes(letter) || gameWon || gameLost) return;

    const newGuessedLetters = [...guessedLetters, letter];
    setGuessedLetters(newGuessedLetters);

    if (!currentWord.includes(letter)) {
      const newWrongGuesses = wrongGuesses + 1;
      setWrongGuesses(newWrongGuesses);
      if (newWrongGuesses >= maxWrongGuesses) {
        setGameLost(true);
      }
    } else {
      // Check if word is complete
      const isComplete = currentWord.split('').every(char => newGuessedLetters.includes(char));
      if (isComplete) {
        setGameWon(true);
      }
    }
  };

  const displayWord = () => {
    return currentWord.split('').map(letter => 
      guessedLetters.includes(letter) ? letter : '_'
    ).join(' ');
  };

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  if (!showGame) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-3 sm:p-6">
        <h3 className="text-white font-semibold mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
          🎯 Word Challenge
        </h3>
        <p className="text-white/80 text-xs sm:text-sm mb-3">
          Take a break with a quick word guessing game!
        </p>
        <button
          onClick={startNewGame}
          className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white py-2 rounded-lg hover:opacity-90 transition-opacity text-xs sm:text-sm font-semibold"
        >
          Start Word Game
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-3 sm:p-6">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="text-white font-semibold flex items-center gap-2 text-sm sm:text-base">
          🎯 Word Challenge
        </h3>
        <button
          onClick={() => setShowGame(false)}
          className="text-white/60 hover:text-white text-xs"
        >
          ✕
        </button>
      </div>

      <div className="text-center mb-3 sm:mb-4">
        <div className="text-lg sm:text-2xl font-mono text-white mb-2 tracking-widest">
          {displayWord()}
        </div>
        <div className="text-white/60 text-xs sm:text-sm">
          Wrong guesses: {wrongGuesses}/{maxWrongGuesses}
        </div>
      </div>

      {gameWon && (
        <div className="text-center mb-3 text-green-400 font-semibold text-sm">
          🎉 You won! The word was {currentWord}
        </div>
      )}

      {gameLost && (
        <div className="text-center mb-3 text-red-400 font-semibold text-sm">
          💀 Game over! The word was {currentWord}
        </div>
      )}

      <div className="grid grid-cols-6 sm:grid-cols-9 gap-1 mb-3">
        {alphabet.map(letter => (
          <button
            key={letter}
            onClick={() => guessLetter(letter)}
            disabled={guessedLetters.includes(letter) || gameWon || gameLost}
            className={`w-6 h-6 sm:w-8 sm:h-8 text-xs rounded border transition-colors ${
              guessedLetters.includes(letter)
                ? currentWord.includes(letter)
                  ? 'bg-green-500 text-white border-green-500'
                  : 'bg-red-500 text-white border-red-500'
                : 'bg-white/20 text-white border-white/30 hover:bg-white/30'
            } disabled:cursor-not-allowed`}
          >
            {letter}
          </button>
        ))}
      </div>

      {(gameWon || gameLost) && (
        <button
          onClick={startNewGame}
          className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white py-2 rounded-lg hover:opacity-90 transition-opacity text-xs sm:text-sm font-semibold"
        >
          New Word
        </button>
      )}
    </div>
  );
};

export default RockPaperScissors;