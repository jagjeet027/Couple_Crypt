
// import React, { useState } from 'react';
// import { Shield, Lock, Heart, Mail, Eye, EyeOff, ArrowRight, Sparkles, Users, MessageCircle, Star, Play, Zap, Compass, Map, Flame, Crown } from 'lucide-react';

// const Header = ({ onSignIn, onGetStarted }) => {
//   return (
//     <header className="bg-slate-900 shadow-lg border-b border-slate-700">
//       <div className="max-w-7xl mx-auto px-6 py-4">
//         <div className="flex items-center justify-between">
//           <div className="flex items-center space-x-3">
//             <div className="bg-gradient-to-br from-pink-600 to-purple-600 p-3 rounded-lg">
//               <Heart className="w-8 h-8 text-white" />
//             </div>
//             <div>
//               <h1 className="text-2xl font-bold text-white">LOVEVAULT</h1>
//               <p className="text-sm text-slate-400">Private Couple Chat</p>
//             </div>
//           </div>

//           {/* Navigation */}
//           <div className="hidden md:flex items-center space-x-8">
//             <nav className="flex items-center space-x-6">
//               <a href="#features" className="text-slate-300 hover:text-white transition-colors">
//                 Features
//               </a>
//               <a href="#about" className="text-slate-300 hover:text-white transition-colors">
//                 About
//               </a>
//               <a href="#testimonials" className="text-slate-300 hover:text-white transition-colors">
//                 Reviews
//               </a>
//             </nav>
            
//             <div className="flex items-center space-x-3">
//               <button 
//                 onClick={onSignIn}
//                 className="px-4 py-2 border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors rounded-lg"
//               >
//                 Sign In
//               </button>
//               <button 
//                 onClick={onGetStarted}
//                 className="px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white hover:from-pink-700 hover:to-purple-700 transition-all rounded-lg"
//               >
//                 Get Started
//               </button>
//             </div>
//           </div>

//           {/* Mobile Menu Button */}
//           <div className="md:hidden">
//             <button className="p-2 rounded-lg bg-slate-800 text-slate-300">
//               <MessageCircle className="w-6 h-6" />
//             </button>
//           </div>
//         </div>
//       </div>
//     </header>
//   );
// };
// export default Header;