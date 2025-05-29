import React, { useState, useEffect } from 'react';
import { Shield, Lock, Users, Star, ArrowRight, Play } from 'lucide-react';

const HomePage = () => {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % 3);
    }, 4000);
    
    return () => clearInterval(interval);
  }, []);

  const testimonials = [
    { text: "This app transformed our communication completely!", author: "Sarah & Mike", rating: 5 },
    { text: "Finally, a truly private space for couples", author: "Emma & Jake", rating: 5 },
    { text: "Simple, secure, and exactly what we needed", author: "Lisa & Tom", rating: 5 }
  ];

  const features = [
    {
      icon: <Shield className="w-8 h-8 text-blue-500" />,
      title: "End-to-End Encryption",
      description: "Your messages are protected with military-grade encryption that only you and your partner can access"
    },
    {
      icon: <Lock className="w-8 h-8 text-green-500" />,
      title: "Complete Privacy",
      description: "No data collection, no ads, no third-party access. Your conversations stay between you two"
    },
    {
      icon: <Users className="w-8 h-8 text-purple-500" />,
      title: "Couple-Focused",
      description: "Designed specifically for couples with features that strengthen your connection and communication"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <section className="pt-20 pb-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-slate-800 border border-slate-700 mb-8">
            <Shield className="w-4 h-4 text-blue-400 mr-2" />
            <span className="text-sm text-slate-300">Secure & Private</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Private Chat for
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500"> Couples</span>
          </h1>
          
          <p className="text-xl text-slate-300 mb-12 max-w-2xl mx-auto leading-relaxed">
            Connect with your partner through secure, encrypted messaging designed specifically for couples. 
            No ads, no tracking, just pure privacy.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 mb-16">
            <button className="px-8 py-4 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg font-semibold hover:from-pink-700 hover:to-purple-700 transition-all flex items-center">
              Get Started Free
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
            
            <button className="px-8 py-4 border border-slate-600 text-slate-300 rounded-lg font-semibold hover:bg-slate-800 transition-all flex items-center">
              <Play className="w-5 h-5 mr-2" />
              Watch Demo
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">50K+</div>
              <div className="text-slate-400">Happy Couples</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">100%</div>
              <div className="text-slate-400">Private</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">24/7</div>
              <div className="text-slate-400">Available</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Why Choose CoupleCrypt?</h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Built from the ground up with privacy and couples in mind
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="p-8 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-slate-600 transition-all">
                <div className="mb-6">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-4">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-16">What Couples Say</h2>
          
          <div className="relative h-48">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className={`absolute inset-0 transition-all duration-500 ${
                  index === currentTestimonial ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <div className="p-8 rounded-xl bg-slate-800/50 border border-slate-700">
                  <div className="flex justify-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-lg text-slate-300 mb-4 italic">"{testimonial.text}"</p>
                  <p className="text-slate-400 font-semibold">{testimonial.author}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="p-12 rounded-xl bg-slate-800/50 border border-slate-700">
            <h2 className="text-4xl font-bold text-white mb-4">
              Ready to Connect Privately?
            </h2>
            <p className="text-xl text-slate-400 mb-8 max-w-2xl mx-auto">
              Join thousands of couples who trust CoupleCrypt for their private conversations.
            </p>
            <button className="px-12 py-4 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg text-lg font-semibold hover:from-pink-700 hover:to-purple-700 transition-all">
              Start Your Private Chat
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;