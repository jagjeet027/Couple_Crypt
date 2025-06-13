import React, { useState, useEffect } from 'react';
import { Shield, Lock, Users, Star, ArrowRight, Play, Heart, MessageCircle, Eye, Code, Zap, Wifi, Terminal } from 'lucide-react';
import Header from './Header';

const HomePage = ({ onNavigateToSecureRoom }) => {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loveText, setLoveText] = useState('');
  const [showSecureRoom, setShowSecureRoom] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % 4);
    }, 4000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const slideInterval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % 3);
    }, 3000);
    
    return () => clearInterval(slideInterval);
  }, []);

  useEffect(() => {
    const messages = [
      'ENCRYPTING LOVE...',
      'SECURING HEARTS...',
      'CONNECTING SOULS...',
      'PROTECTING MEMORIES...'
    ];
    
    let messageIndex = 0;
    let charIndex = 0;
    
    const typeWriter = () => {
      if (charIndex < messages[messageIndex].length) {
        setLoveText(messages[messageIndex].substring(0, charIndex + 1));
        charIndex++;
        setTimeout(typeWriter, 100);
      } else {
        setTimeout(() => {
          charIndex = 0;
          messageIndex = (messageIndex + 1) % messages.length;
          setLoveText('');
          setTimeout(typeWriter, 500);
        }, 2000);
      }
    };
    
    typeWriter();
  }, []);

  const testimonials = [
    { text: "CoupletCrypt gave us the perfect private space for our love story!", author: "Alex & Sam", rating: 5, role: "Adventure Couple" },
    { text: "Finally, a secure way to share our most intimate moments and memories!", author: "Maya & Ryan", rating: 5, role: "Digital Nomads" },
    { text: "Our relationship reached new heights with this encrypted connection!", author: "Zoe & Chris", rating: 5, role: "Tech Lovers" },
    { text: "From messages to memories - this app understands our love perfectly!", author: "Jamie & Taylor", rating: 5, role: "Modern Romance" }
  ];

  const mobileSlides = [
    {
      title: "Secure Messaging",
      description: "End-to-end encrypted conversations",
      image: "💬",
      color: "from-pink-500 to-purple-500"
    },
    {
      title: "Memory Vault",
      description: "Protected photo & video storage",
      image: "📱",
      color: "from-purple-500 to-blue-500"
    },
    {
      title: "Adventure Mode",
      description: "Interactive couple experiences",
      image: "🎮",
      color: "from-blue-500 to-pink-500"
    }
  ];

  const features = [
    {
      icon: <Shield className="w-8 h-8 text-pink-400" />,
      title: "Military-Grade Protection",
      description: "AES-256 encryption safeguards your most precious moments. Your love deserves the ultimate security.",
      techSpecs: "RSA-4096 key exchange • Perfect forward secrecy • Zero-knowledge architecture"
    },
    {
      icon: <Eye className="w-8 h-8 text-purple-400" />,
      title: "Complete Privacy",
      description: "No tracking, no data collection, no third parties. Your love story remains yours alone.",
      techSpecs: "Anonymous connections • Decentralized nodes • Memory-safe protocols"
    },
    {
      icon: <Heart className="w-8 h-8 text-pink-500" />,
      title: "Romance-Focused Design",
      description: "Every feature crafted for couples. Share love notes, memories, and adventures securely.",
      techSpecs: "Couple-centric features • Romantic themes • Intuitive interface"
    },
    {
      icon: <Zap className="w-8 h-8 text-yellow-400" />,
      title: "Instant Connection",
      description: "Lightning-fast encrypted messaging. Connect with your partner at the speed of love.",
      techSpecs: "WebRTC protocols • Sub-100ms latency • Auto-sync across devices"
    },
    {
      icon: <MessageCircle className="w-8 h-8 text-green-400" />,
      title: "Adventure Mode",
      description: "Embark on digital adventures together. Games, challenges, and romantic quests await.",
      techSpecs: "Interactive experiences • Couple challenges • Memory creation tools"
    },
    {
      icon: <Lock className="w-8 h-8 text-cyan-400" />,
      title: "Secure Vaults",
      description: "Store photos, videos, and memories in encrypted vaults. Your digital love chest.",
      techSpecs: "End-to-end encryption • Secure storage • Multiple backup layers"
    }
  ];

  const securityFeatures = [
    "Zero-knowledge server architecture",
    "Perfect forward secrecy protocols",
    "Quantum-resistant encryption algorithms",
    "Disappearing messages with secure deletion",
    "Biometric authentication support",
    "Multi-device synchronization with E2E encryption"
  ];

  const handleGetStarted = () => {
    setShowSecureRoom(true);
    onNavigateToSecureRoom && onNavigateToSecureRoom();
  };

  const handleWatchDemo = () => {
    console.log('Starting romantic demonstration...');
  };


  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <Header onGetStarted={handleGetStarted} />

      <div className="fixed inset-0 opacity-20">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-purple-900"></div>
        <div className="absolute top-10 left-10 text-6xl text-pink-500 animate-float">💖</div>
        <div className="absolute top-20 right-20 text-4xl text-purple-400 animate-float-delayed">✨</div>
        <div className="absolute bottom-20 left-20 text-5xl text-pink-400 animate-float">💕</div>
        <div className="absolute bottom-10 right-10 text-3xl text-purple-300 animate-float-delayed">🌹</div>
        <div className="absolute top-1/2 left-1/4 text-4xl text-pink-300 animate-float">💝</div>
        <div className="absolute top-1/3 right-1/3 text-5xl text-purple-500 animate-float-delayed">👫</div>
        <div className="matrix-background"></div>
      </div>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r from-pink-900/50 to-purple-900/50 border border-pink-500/30 backdrop-blur-sm">
                <Heart className="w-5 h-5 text-pink-400 mr-3" />
                <span className="text-sm text-pink-300 font-mono">{loveText}</span>
                <span className="w-2 h-4 bg-pink-400 ml-1 animate-pulse"></span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-500 to-pink-600 leading-tight font-mono">
                LoveVault
              </h1>
              
              <p className="text-lg md:text-xl text-gray-300 leading-relaxed">
                <span className="text-pink-400 font-mono">// </span>
                Where couples embark on secure digital adventures. 
                <br />
                <span className="text-purple-400">Encrypt your love. Protect your memories. Begin your journey.</span>
              </p>

              <div className="flex flex-col sm:flex-row items-start space-y-4 sm:space-y-0 sm:space-x-6">
                <button 
                  onClick={handleGetStarted}
                  className="group px-10 py-5 bg-gradient-to-r from-pink-600 via-purple-600 to-pink-600 text-white rounded-lg font-bold text-lg hover:from-pink-700 hover:via-purple-700 hover:to-pink-700 transition-all flex items-center hover:scale-110 transform duration-300 shadow-2xl shadow-pink-500/25"
                >
                  <Heart className="w-6 h-6 mr-3 group-hover:animate-pulse" />
                  Get Started free
                  <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform" />
                </button>
                
                <button 
                  onClick={handleWatchDemo}
                  className="group px-10 py-5 border-2 border-purple-500/50 text-purple-300 rounded-lg font-bold text-lg hover:bg-purple-500/10 transition-all flex items-center hover:scale-110 transform duration-300 backdrop-blur-sm"
                >
                  <Play className="w-6 h-6 mr-3 group-hover:animate-pulse" />
                  WATCH DEMO
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-8">
                <div className="text-left group">
                  <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500 mb-2 group-hover:scale-110 transition-transform">50K+</div>
                  <div className="text-gray-400 font-mono text-sm">COUPLES_CONNECTED</div>
                </div>
                <div className="text-left group">
                  <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500 mb-2 group-hover:scale-110 transition-transform">256-BIT</div>
                  <div className="text-gray-400 font-mono text-sm">ENCRYPTION_STRENGTH</div>
                </div>
                <div className="text-left group">
                  <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500 mb-2 group-hover:scale-110 transition-transform">ZERO</div>
                  <div className="text-gray-400 font-mono text-sm">DATA_COLLECTED</div>
                </div>
                <div className="text-left group">
                  <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500 mb-2 group-hover:scale-110 transition-transform">24/7</div>
                  <div className="text-gray-400 font-mono text-sm">LOVE_PROTECTION</div>
                </div>
              </div>
            </div>
            <div className="flex justify-center lg:justify-end">
              <div className="relative">
                <div className="w-80 h-[580px] bg-gradient-to-br from-gray-900 to-black rounded-[3rem] p-4 border-4 border-gray-700 shadow-2xl">
                  <div className="w-full h-full bg-black rounded-[2.5rem] overflow-hidden relative">
                    {/* Status Bar */}
                    <div className="flex justify-between items-center px-6 py-3 bg-gradient-to-r from-gray-900 to-gray-800">
                      <div className="text-white text-sm font-mono">9:41</div>
                      <div className="flex space-x-1">
                        <div className="w-4 h-2 bg-green-400 rounded-sm"></div>
                        <div className="w-6 h-2 bg-white rounded-sm"></div>
                      </div>
                    </div>

                    {/* Slides Container */}
                    <div className="relative h-full overflow-hidden">
                      {mobileSlides.map((slide, index) => (
                        <div
                          key={index}
                          className={`absolute inset-0 transition-all duration-1000 transform ${
                            index === currentSlide 
                              ? 'opacity-100 translate-x-0' 
                              : index < currentSlide 
                                ? 'opacity-0 -translate-x-full' 
                                : 'opacity-0 translate-x-full'
                          }`}
                        >
                          <div className={`h-full bg-gradient-to-br ${slide.color} p-8 flex flex-col justify-center items-center text-center`}>
                            <div className="text-8xl mb-8 animate-pulse">{slide.image}</div>
                            <h3 className="text-2xl font-bold text-white mb-4 font-mono">{slide.title}</h3>
                            <p className="text-gray-100 text-lg leading-relaxed">{slide.description}</p>
                            
                            {/* Mock UI Elements */}
                            <div className="mt-8 w-full space-y-4">
                              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 bg-white/30 rounded-full"></div>
                                  <div className="flex-1">
                                    <div className="h-3 bg-white/40 rounded mb-2"></div>
                                    <div className="h-2 bg-white/30 rounded w-3/4"></div>
                                  </div>
                                </div>
                              </div>
                              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 bg-white/30 rounded-full"></div>
                                  <div className="flex-1">
                                    <div className="h-3 bg-white/40 rounded mb-2"></div>
                                    <div className="h-2 bg-white/30 rounded w-2/3"></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2">
                      {mobileSlides.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentSlide(index)}
                          className={`w-2 h-2 rounded-full transition-all duration-300 ${
                            index === currentSlide 
                              ? 'bg-white' 
                              : 'bg-white/50'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Floating Elements around Mobile */}
                <div className="absolute -top-4 -right-4 w-12 h-12 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center animate-bounce">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -bottom-4 -left-4 w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center animate-pulse">
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <div className="absolute top-1/2 -left-8 w-8 h-8 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full flex items-center justify-center animate-ping">
                  <Lock className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="relative z-10 py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
               <div className="text-center mb-12 sm:mb-16">
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-3 font-mono leading-tight">&lt;<span className="text-pink-500">COUPLE</span>_FEATURES/&gt;
                    </h2>
                    <p className="text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto px-2 sm:px-4">
                    <span className="text-purple-400 font-mono">/* </span>
                    Every feature designed for couples who value privacy and adventure.
                    <span className="text-purple-400 font-mono"> */</span>
                    </p>
              </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
      {features.map((feature, index) => (
        <div
          key={index}
          className="group p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-gray-900/60 to-purple-900/30 border border-pink-500/20 hover:border-pink-500/50 transition-all hover:scale-[1.03] transform duration-300 backdrop-blur-sm shadow-lg"
        >
          <div className="mb-5 sm:mb-6 group-hover:animate-pulse text-pink-400">
            {feature.icon}
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4 font-mono">
            {feature.title}
          </h3>
          <p className="text-sm sm:text-base text-gray-300 leading-relaxed mb-3 sm:mb-4">
            {feature.description}
          </p>
          <div className="text-xs sm:text-sm text-purple-400 font-mono opacity-80 border-t border-gray-800 pt-3">
            {feature.techSpecs}
          </div>
        </div>
      ))}
    </div>
  </div>
</section>
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-white mb-6 font-mono">
                MILITARY-GRADE
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">
                  LOVE PROTECTION
                </span>
              </h2>
              <p className="text-lg text-gray-400 mb-8 leading-relaxed">
                Your love deserves the highest level of security. Our encryption protocols protect your most 
                intimate moments with the same technology used to secure government communications.
              </p>
              
              <div className="space-y-4">
                {securityFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-3 group">
                    <div className="w-2 h-2 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full group-hover:scale-150 transition-transform"></div>
                    <span className="text-gray-300 font-mono text-sm group-hover:text-white transition-colors">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className="p-8 bg-gradient-to-br from-gray-900/50 to-purple-900/30 rounded-xl border border-pink-500/30 backdrop-blur-sm">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full mb-4">
                    <Shield className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white font-mono">PROTECTION STATUS</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 font-mono text-sm">LOVE ENCRYPTION:</span>
                    <span className="text-green-400 font-mono text-sm">ACTIVE</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 font-mono text-sm">HEART FIREWALL:</span>
                    <span className="text-green-400 font-mono text-sm">ENABLED</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 font-mono text-sm">MEMORY VAULT:</span>
                    <span className="text-green-400 font-mono text-sm">SECURED</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 font-mono text-sm">PRIVACY LEVEL:</span>
                    <span className="text-pink-400 font-mono text-sm">MAXIMUM</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-16 font-mono">
            &lt;<span className="text-pink-500">LOVE</span>_STORIES/&gt;
          </h2>
          
          <div className="relative h-64 overflow-hidden">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className={`absolute inset-0 transition-all duration-1000 transform ${
                  index === currentTestimonial 
                    ? 'opacity-100 translate-y-0' 
                    : index < currentTestimonial 
                      ? 'opacity-0 -translate-y-full' 
                      : 'opacity-0 translate-y-full'
                }`}
              >
                <div className="bg-gradient-to-r from-pink-900/30 to-purple-900/30 border border-pink-500/30 rounded-xl p-8 backdrop-blur-sm">
                  <div className="flex justify-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-6 h-6 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <blockquote className="text-xl text-gray-300 mb-6 italic leading-relaxed">
                    "{testimonial.text}"
                  </blockquote>
                  <div className="text-pink-400 font-mono">
                    <div className="font-bold">{testimonial.author}</div>
                    <div className="text-sm text-purple-400">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex justify-center space-x-2 mt-8">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentTestimonial(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentTestimonial 
                    ? 'bg-gradient-to-r from-pink-500 to-purple-500' 
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-pink-900/20 to-purple-900/20 border-2 border-pink-500/30 rounded-2xl p-12 backdrop-blur-sm">
            <h2 className="text-5xl font-bold text-white mb-6 font-mono">
              READY TO BEGIN YOUR
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">
                ENCRYPTED LOVE STORY?
              </span>
            </h2>
            <p className="text-xl text-gray-300 mb-12 leading-relaxed">
              Join thousands of couples who trust LoveVault to protect their most precious moments.
              <br />
              <span className="text-pink-400 font-mono">Your adventure awaits.</span>
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
              <button 
                onClick={handleGetStarted}
                className="group px-12 py-6 bg-gradient-to-r from-pink-600 via-purple-600 to-pink-600 text-white rounded-xl font-bold text-xl hover:from-pink-700 hover:via-purple-700 hover:to-pink-700 transition-all flex items-center hover:scale-110 transform duration-300 shadow-2xl shadow-pink-500/30"
              >
                <Heart className="w-7 h-7 mr-4 group-hover:animate-pulse" />
                START YOUR ADVENTURE
                <ArrowRight className="w-7 h-7 ml-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            
            <div className="mt-8 text-sm text-gray-500 font-mono">
              💖 Free forever • No credit card required • Instant setup 💖
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-12 px-6 border-t border-gray-800">
        <div className="max-w-6xl mx-auto">          
          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-gray-500 text-sm font-mono md:text-base">
              © 2025 LoveVault • Made with 💖 for couples everywhere • 
              <span className="text-pink-400"> Your love, encrypted forever</span>
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default HomePage;