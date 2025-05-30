import React, { useState, useEffect } from 'react';

const SecureRoomPortal = ({ onNavigateHome }) => {
  const [generatedCode, setGeneratedCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [isGlitching, setIsGlitching] = useState(false);

  const loveFeatures = [
    { icon: '💕', text: 'Private Love Notes' },
    { icon: '💖', text: 'Heartfelt Messages' },
    { icon: '🌹', text: 'Romantic Moments' },
    { icon: '💝', text: 'Love Encrypted' },
    { icon: '👫', text: 'Just for Two' },
    { icon: '💞', text: 'Forever Yours' }
  ];

  const generateCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
      if (i === 3 || i === 7) code += '-';
    }
    
    setGeneratedCode(code);
    setIsGlitching(true);
    setTimeout(() => setIsGlitching(false), 1000);
    
    showNotification('💕 Love room created • Hearts connected • Romance begins');
  };

  const joinRoom = () => {
    if (joinCode.length < 8) {
      showNotification('💔 Invalid love code • Try again, sweetheart');
      return;
    }
    
    showNotification('💖 Finding your love • Opening hearts...');
    setTimeout(() => {
      showNotification('💞 Hearts connected • Welcome to our secret garden');
    }, 2000);
  };

  const handleJoinCodeChange = (e) => {
    let value = e.target.value.toUpperCase().replace(/-/g, '');
    if (value.length > 4) value = value.slice(0, 4) + '-' + value.slice(4);
    if (value.length > 9) value = value.slice(0, 9) + '-' + value.slice(9);
    if (value.length <= 14) setJoinCode(value);
  };

  const showNotification = (message) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  useEffect(() => {
    const handleContextMenu = (e) => e.preventDefault();
    const handleKeyDown = (e) => {
      if (e.key === 'PrintScreen' || 
          (e.ctrlKey && e.shiftKey && e.key === 'S') ||
          (e.metaKey && e.shiftKey && e.key === '3') ||
          (e.metaKey && e.shiftKey && e.key === '4')) {
        e.preventDefault();
        showNotification('💕 Our moments are precious • Love protected');
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-indigo-950 text-pink-400 font-mono relative overflow-hidden">
      <div className="fixed inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0 bg-grid-pattern animate-matrix-move"></div>
      </div>
      
      {onNavigateHome && (
        <button
          onClick={onNavigateHome}
          className="fixed top-4 left-4 z-50 px-4 py-2 bg-gray-800/80 border border-pink-400 rounded-lg text-pink-400 hover:bg-pink-400/10 transition-all duration-300"
        >
          ← Back to Home
        </button>
      )}
      
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className="bg-pink-900/20 border-2 border-pink-400 rounded-lg px-4 py-3 text-pink-400 text-sm animate-slide-in"
          >
            {notification.message}
          </div>
        ))}
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        <header className="text-center mb-12">
          <h1 className="text-6xl md:text-7xl font-black text-pink-400 mb-4 tracking-wider animate-glow-pulse">
            LOVEVAULT
          </h1>
          <p className="text-xl text-gray-300 mb-8">Private • Romantic • Forever Yours</p>
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
          <div className="group bg-gradient-to-br from-pink-900/20 to-pink-800/10 border-2 border-pink-400 rounded-2xl p-8 text-center relative overflow-hidden hover:scale-105 hover:shadow-2xl hover:shadow-pink-400/30 transition-all duration-500 cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-pink-400/10 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            
            <div className="relative z-10">
              <div className="text-6xl mb-6 animate-float">💝</div>
              <h3 className="text-2xl font-bold text-pink-400 mb-4 uppercase tracking-wider">
                Create Love Room
              </h3>
              <p className="text-gray-300 mb-8 leading-relaxed">
                Generate a romantic space just for two hearts. Where love stories begin.
              </p>
              <button
                onClick={generateCode}
                className="bg-gradient-to-r from-pink-400 to-rose-500 text-white px-8 py-4 rounded-lg font-bold text-lg uppercase tracking-wider hover:from-pink-300 hover:to-rose-400 hover:-translate-y-1 hover:shadow-lg hover:shadow-pink-400/50 transition-all duration-300"
              >
                Create Love Code
              </button>
              
              {generatedCode && (
                <div className={`mt-6 bg-black/80 border-2 border-pink-400 rounded-lg p-6 text-2xl text-pink-400 tracking-[0.3em] font-bold ${isGlitching ? 'animate-glitch' : ''}`}>
                  {generatedCode}
                </div>
              )}
            </div>
          </div>

          <div className="group bg-gradient-to-br from-pink-900/20 to-pink-800/10 border-2 border-pink-400 rounded-2xl p-8 text-center relative overflow-hidden hover:scale-105 hover:shadow-2xl hover:shadow-pink-400/30 transition-all duration-500 cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-pink-400/10 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            
            <div className="relative z-10">
              <div className="text-6xl mb-6 animate-float">💕</div>
              <h3 className="text-2xl font-bold text-pink-400 mb-4 uppercase tracking-wider">
                Join Love Room
              </h3>
              <p className="text-gray-300 mb-8 leading-relaxed">
                Enter the love code to connect hearts and share beautiful moments.
              </p>
              <input
                type="text"
                value={joinCode}
                onChange={handleJoinCodeChange}
                placeholder="LOVE-CODE-HERE"
                className="w-full bg-black/70 border-2 border-pink-400 rounded-lg p-4 text-pink-400 text-xl text-center font-mono tracking-widest mb-6 focus:outline-none focus:border-pink-300 focus:shadow-lg focus:shadow-pink-400/30 transition-all duration-300"
                maxLength="14"
              />
              <button
                onClick={joinRoom}
                className="bg-gradient-to-r from-pink-400 to-rose-500 text-white px-8 py-4 rounded-lg font-bold text-lg uppercase tracking-wider hover:from-pink-300 hover:to-rose-400 hover:-translate-y-1 hover:shadow-lg hover:shadow-pink-400/50 transition-all duration-300"
              >
                Connect Hearts
              </button>
            </div>
          </div>
        </div>
        <div className="bg-rose-980/20 border-2 border-rose-400 rounded-2xl p-8 mb-12 shadow-2xl shadow-rose-400/20">
          <h2 className="text-2xl font-bold text-rose-400 text-center mb-8 tracking-widest uppercase">
            💖 Love Features Active 💖
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loveFeatures.map((feature, index) => (
              <div
                key={index}
                className="flex items-center bg-black/50 p-4 rounded-lg border-l-4 border-rose-400 hover:bg-rose-900/10 hover:translate-x-2 transition-all duration-300"
              >
                <span className="text-2xl mr-4 text-rose-400 animate-warning-blink">
                  {feature.icon}
                </span>
                <span className="text-white font-medium">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        <footer className="text-center mt-16 text-gray-500 text-sm">
          <p>💖 Where hearts meet in secret • Love stories written • Memories cherished forever 💖</p>
        </footer>
      </div>

      <style jsx>{`
        .bg-grid-pattern {
          background-image: 
            linear-gradient(90deg, transparent 98%, #f472b6 99%, #f472b6 100%),
            linear-gradient(0deg, transparent 98%, #f472b6 99%, #f472b6 100%);
          background-size: 50px 50px;
        }
        
        @keyframes matrix-move {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }
        
        @keyframes glow-pulse {
          0%, 100% { text-shadow: 0 0 20px #f472b6, 0 0 40px #f472b6; }
          50% { text-shadow: 0 0 30px #f472b6, 0 0 60px #f472b6, 0 0 80px #f472b6; }
        }
        
        @keyframes warning-blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0.3; }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes glitch {
          0% { transform: translate(0); }
          20% { transform: translate(-2px, 2px); }
          40% { transform: translate(-2px, -2px); }
          60% { transform: translate(2px, 2px); }
          80% { transform: translate(2px, -2px); }
          100% { transform: translate(0); }
        }
        
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        .animate-matrix-move { animation: matrix-move 20s linear infinite; }
        .animate-glow-pulse { animation: glow-pulse 2s ease-in-out infinite alternate; }
        .animate-warning-blink { animation: warning-blink 1.5s infinite; }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-glitch { animation: glitch 0.3s infinite; }
        .animate-slide-in { animation: slide-in 0.5s ease; }
      `}</style>
    </div>
  );
};

export default SecureRoomPortal;