import { Heart } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-slate-900 border-t border-slate-700">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <Heart className="w-8 h-8 text-pink-500" />
            <span className="text-2xl font-bold text-white">CoupleCrypt</span>
          </div>
          <p className="text-slate-400 mb-6">Secure, private communication for couples</p>
          <div className="flex justify-center space-x-6 text-slate-400">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
export default Footer;