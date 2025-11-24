import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, User, Mail, Lock, Upload, X, ArrowLeft, CheckCircle, AlertCircle, Heart, Shield, Home } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

const AuthPage = ({ initialPage = 'signin', onNavigate, onAuthSuccess, pendingRedirect }) => {
  const [searchParams] = useSearchParams();
  const [currentPage, setCurrentPage] = useState(() => {
    const pageParam = searchParams.get('page');
    if (pageParam === 'resetpassword') return 'resetpassword';
    if (pageParam === 'signup') return 'signup';
    return initialPage;
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [signInData, setSignInData] = useState({
    email: '',
    password: ''
  });
  
  const [signUpData, setSignUpData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    gender: '',
    age: '',
    profileImage: null
  });
  
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  
  const [resetPasswordData, setResetPasswordData] = useState({
    token: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [imagePreview, setImagePreview] = useState(null);
  const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api/auth`;
  
  useEffect(() => {
    const token = searchParams.get('token');
    if (token && currentPage === 'resetpassword') {
      setResetPasswordData(prev => ({ ...prev, token }));
    }
  }, [searchParams, currentPage]);
  
  const storeAuthData = (token, user) => {
    try {
      localStorage.setItem('authToken', token);
      localStorage.setItem('userData', JSON.stringify(user));
      localStorage.setItem('tokenExpiry', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());
    } catch (error) {
      console.error('Error storing authentication data:', error);
    }
  };
  
  const handleAuthSuccess = (data, isSignUp = false) => {
    const actionType = isSignUp ? 'Account created' : 'Login';
    setMessage({ type: 'success', text: `${actionType} successfully! Redirecting...` });
    
    if (data.data && data.data.token && data.data.user) {
      storeAuthData(data.data.token, data.data.user);
    }
    
    if (isSignUp) {
      setSignUpData({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        gender: '',
        age: '',
        profileImage: null
      });
      setImagePreview(null);
    } else {
      setSignInData({ email: '', password: '' });
    }
    
    window.dispatchEvent(new Event('authStateChanged'));
    
    setTimeout(() => {
      if (onAuthSuccess) {
        onAuthSuccess(data.data ? data.data.user : null);
      } else if (onNavigate) {
        onNavigate('/');
      }
    }, 1500);
  };
  
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'File size must be less than 5MB' });
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        setMessage({ type: 'error', text: 'Only image files are allowed' });
        return;
      }
      setSignUpData({ ...signUpData, profileImage: file });
      
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };
  
  const removeImage = () => {
    setSignUpData({ ...signUpData, profileImage: null });
    setImagePreview(null);
  };
  
  const handleSignIn = async () => {
    setIsLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(signInData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }
      
      if (data.success) {
        handleAuthSuccess(data, false);
      } else {
        setMessage({ type: 'error', text: data.message || 'Login failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Network error. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSignUp = async () => {
    setIsLoading(true);
    setMessage({ type: '', text: '' });
    
    if (signUpData.password !== signUpData.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      setIsLoading(false);
      return;
    }
    if (signUpData.password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      setIsLoading(false);
      return;
    }
    if (parseInt(signUpData.age) < 13) {
      setMessage({ type: 'error', text: 'You must be at least 13 years old' });
      setIsLoading(false);
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append('username', signUpData.username);
      formData.append('email', signUpData.email);
      formData.append('password', signUpData.password);
      formData.append('gender', signUpData.gender);
      formData.append('age', signUpData.age);
      
      if (signUpData.profileImage) {
        formData.append('profileImage', signUpData.profileImage);
      }
      
      const response = await fetch(`${API_BASE_URL}/signup`, {
        method: 'POST',
        mode: 'cors',
        credentials: 'include',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Signup failed');
      }
      
      if (data.success) {
        handleAuthSuccess(data, true);
      } else {
        if (data.errors && Array.isArray(data.errors)) {
          setMessage({ type: 'error', text: data.errors.join(', ') });
        } else {
          setMessage({ type: 'error', text: data.message || 'Signup failed' });
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Network error. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleForgotPassword = async () => {
    setIsLoading(true);
    setMessage({ type: '', text: '' });
    
    if (!forgotPasswordEmail) {
      setMessage({ type: 'error', text: 'Please enter your email address' });
      setIsLoading(false);
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: forgotPasswordEmail }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }
      
      setMessage({ type: 'success', text: data.message });
      setForgotPasswordEmail('');
      
      setTimeout(() => {
        setCurrentPage('signin');
        setMessage({ type: '', text: '' });
      }, 4000);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Network error. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleResetPassword = async () => {
    setIsLoading(true);
    setMessage({ type: '', text: '' });
    
    if (!resetPasswordData.token) {
      setMessage({ type: 'error', text: 'Invalid reset link. Please request a new one.' });
      setIsLoading(false);
      return;
    }
    
    if (!resetPasswordData.newPassword || !resetPasswordData.confirmPassword) {
      setMessage({ type: 'error', text: 'All fields are required' });
      setIsLoading(false);
      return;
    }
    
    if (resetPasswordData.newPassword !== resetPasswordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      setIsLoading(false);
      return;
    }
    
    if (resetPasswordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      setIsLoading(false);
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: resetPasswordData.token,
          newPassword: resetPasswordData.newPassword,
          confirmPassword: resetPasswordData.confirmPassword
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Reset failed');
      }
      
      setMessage({ type: 'success', text: data.message });
      setResetPasswordData({ token: '', newPassword: '', confirmPassword: '' });
      
      setTimeout(() => {
        setCurrentPage('signin');
        setMessage({ type: '', text: '' });
      }, 3000);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Network error. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };
  
  const switchPage = (page) => {
    setCurrentPage(page);
    setMessage({ type: '', text: '' });
  };

  const goBack = () => {
    setCurrentPage('signin');
    setMessage({ type: '', text: '' });
  };

  const goHome = () => {
    if (onNavigate) {
      onNavigate('/');
    }
  };
  
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* ===== BACKGROUND IMAGE WITH OVERLAY ===== */}
      <div className="fixed inset-0 z-0">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><defs><linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:rgba(15,23,42,0.95);stop-opacity:1" /><stop offset="50%" style="stop-color:rgba(88,28,135,0.95);stop-opacity:1" /><stop offset="100%" style="stop-color:rgba(0,0,0,0.95);stop-opacity:1" /></linearGradient></defs><rect width="1200" height="800" fill="url(%23grad1)"/><circle cx="100" cy="100" r="150" fill="rgba(244,63,94,0.1)"/><circle cx="1100" cy="700" r="200" fill="rgba(168,85,247,0.1)"/><circle cx="600" cy="400" r="250" fill="rgba(236,72,153,0.05)"/></svg>')`
          }}
        ></div>

        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.05)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
        
        {/* Animated Blobs */}
        <div className="absolute top-0 left-0 w-64 sm:w-80 md:w-96 h-64 sm:h-80 md:h-96 bg-rose-500 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-pulse"></div>
        <div className="absolute top-0 right-0 w-64 sm:w-80 md:w-96 h-64 sm:h-80 md:h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute -bottom-8 left-10 sm:left-20 w-64 sm:w-80 md:w-96 h-64 sm:h-80 md:h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-pulse" style={{ animationDelay: '4s' }}></div>
        
        {/* Floating Elements */}
        <div className="absolute top-10 sm:top-20 left-5 sm:left-10 text-3xl sm:text-4xl opacity-20 animate-float">❤️</div>
        <div className="absolute top-1/4 right-5 sm:right-20 text-3xl sm:text-4xl opacity-20 animate-float" style={{ animationDelay: '1s' }}>🔐</div>
        <div className="absolute bottom-1/3 left-1/4 text-3xl sm:text-4xl opacity-20 animate-float" style={{ animationDelay: '2s' }}>💑</div>
        <div className="absolute bottom-10 sm:bottom-20 right-1/4 text-3xl sm:text-4xl opacity-20 animate-float" style={{ animationDelay: '3s' }}>✨</div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 py-4 sm:py-8">
        
        {/* ===== BACK TO HOME BUTTON ===== */}
        <button
          onClick={goHome}
          className="absolute top-4 left-4 sm:top-6 sm:left-6 p-2 sm:p-3 rounded-lg bg-slate-800/40 backdrop-blur-md border border-purple-500/30 hover:border-rose-500/50 transition-all hover:bg-slate-800/60 group"
          title="Back to Home"
        >
          <Home className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400 group-hover:text-rose-400 transition-colors" />
        </button>

        {/* ===== FORM CONTAINER ===== */}
        <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg xl:max-w-xl">
          
          {/* ===== BRAND HEADER ===== */}
          <div className="text-center mb-4 sm:mb-6 lg:mb-8 animate-fadeIn">
            <div className="inline-flex items-center justify-center gap-2 sm:gap-3 mb-2 sm:mb-4">
              <Heart className="w-6 h-6 sm:w-8 sm:h-8 text-rose-500 fill-rose-500 animate-pulse" />
              <span className="text-2xl sm:text-3xl lg:text-4xl font-black bg-gradient-to-r from-rose-400 via-purple-400 to-pink-400 bg-clip-text text-transparent tracking-tight">
                CoupletCrypt
              </span>
              <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400 animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
            <p className="text-xs sm:text-sm text-purple-300 font-mono tracking-wider">🔐 Secure Love Portal</p>
          </div>

          {/* ===== TAB NAVIGATION ===== */}
          {currentPage !== 'forgotpassword' && currentPage !== 'resetpassword' && (
            <div className="flex gap-2 mb-4 sm:mb-6 bg-slate-800/30 backdrop-blur-md rounded-xl p-1 sm:p-2 border border-purple-500/30 shadow-xl">
              <button
                onClick={() => switchPage('signin')}
                className={`flex-1 py-2 sm:py-3 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-bold transition-all duration-300 ${
                  currentPage === 'signin'
                    ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/50'
                    : 'text-purple-300 hover:text-purple-100 hover:bg-slate-700/30'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => switchPage('signup')}
                className={`flex-1 py-2 sm:py-3 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-bold transition-all duration-300 ${
                  currentPage === 'signup'
                    ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/50'
                    : 'text-purple-300 hover:text-purple-100 hover:bg-slate-700/30'
                }`}
              >
                Sign Up
              </button>
            </div>
          )}
          
          {/* ===== ALERT MESSAGE ===== */}
          {message.text && (
            <div className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl backdrop-blur-md border flex items-start gap-3 animate-slideDown text-xs sm:text-sm ${
              message.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-100' 
                : 'bg-rose-500/10 border-rose-500/30 text-rose-100'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{message.text}</span>
            </div>
          )}
          
          {/* ===== SIGN IN FORM ===== */}
          {currentPage === 'signin' && (
            <div className="bg-slate-800/40 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-5 sm:p-6 lg:p-8 shadow-2xl hover:border-purple-500/50 transition-all">
              <div className="text-center mb-5 sm:mb-6">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1 sm:mb-2">Welcome Back</h2>
                <p className="text-xs sm:text-sm text-purple-300">Unlock your encrypted love story</p>
              </div>
              
              <div className="space-y-3 sm:space-y-4 lg:space-y-5">
                {/* Email Field */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-purple-200 mb-1.5 sm:mb-2">Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-3 sm:left-4 top-3 sm:top-4 h-4 w-4 sm:h-5 sm:w-5 text-purple-400 group-focus-within:text-rose-400 transition-colors" />
                    <input
                      type="email"
                      value={signInData.email}
                      onChange={(e) => setSignInData({...signInData, email: e.target.value})}
                      className="w-full pl-9 sm:pl-12 pr-3 sm:pr-4 py-2 sm:py-3 bg-slate-700/50 border border-purple-500/30 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all text-white text-xs sm:text-sm placeholder-purple-400/50"
                      placeholder="your@email.com"
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-purple-200 mb-1.5 sm:mb-2">Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-3 sm:left-4 top-3 sm:top-4 h-4 w-4 sm:h-5 sm:w-5 text-purple-400 group-focus-within:text-rose-400 transition-colors" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={signInData.password}
                      onChange={(e) => setSignInData({...signInData, password: e.target.value})}
                      className="w-full pl-9 sm:pl-12 pr-9 sm:pr-12 py-2 sm:py-3 bg-slate-700/50 border border-purple-500/30 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all text-white text-xs sm:text-sm placeholder-purple-400/50"
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 sm:right-4 top-3 sm:top-4 text-purple-400 hover:text-rose-400 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                    </button>
                  </div>
                </div>

                {/* Sign In Button */}
                <button
                  onClick={handleSignIn}
                  disabled={isLoading || !signInData.email || !signInData.password}
                  className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 sm:py-3 px-3 sm:px-4 rounded-lg font-bold text-xs sm:text-base transition-all shadow-lg shadow-rose-500/50 hover:shadow-rose-500/75 duration-300"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Signing In...
                    </span>
                  ) : 'Sign In 🔓'}
                </button>

                {/* Forgot Password Link */}
                <button
                  onClick={() => switchPage('forgotpassword')}
                  className="w-full text-purple-300 hover:text-rose-400 text-xs sm:text-sm font-semibold transition-colors py-2"
                >
                  Forgot your password?
                </button>
              </div>
            </div>
          )}
          
          {/* ===== SIGN UP FORM ===== */}
          {currentPage === 'signup' && (
            <div className="bg-slate-800/40 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-5 sm:p-6 lg:p-8 shadow-2xl hover:border-purple-500/50 transition-all max-h-[calc(100vh-120px)] overflow-y-auto">
              <div className="text-center mb-5 sm:mb-6">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1 sm:mb-2">Create Your Account</h2>
                <p className="text-xs sm:text-sm text-purple-300">Start your secure love journey</p>
              </div>
              
              <div className="space-y-3 sm:space-y-4 lg:space-y-5">
                {/* Profile Image Upload */}
                <div className="flex flex-col items-center">
                  <div className="relative">
                    {imagePreview ? (
                      <div className="relative group">
                        <img
                          src={imagePreview}
                          alt="Profile preview"
                          className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-rose-500 shadow-lg shadow-rose-500/50 group-hover:shadow-rose-500/75 transition-all"
                        />
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1.5 sm:p-2 hover:bg-rose-600 transition-colors shadow-lg"
                        >
                          <X className="h-3 w-3 sm:h-4 sm:w-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-700/50 border-2 border-dashed border-purple-400 flex items-center justify-center hover:border-rose-400 hover:bg-slate-700/70 transition-all cursor-pointer">
                        <Upload className="h-7 w-7 sm:h-8 sm:w-8 text-purple-400" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                  <p className="mt-2 sm:mt-3 text-rose-400 hover:text-rose-300 text-xs sm:text-sm font-semibold transition-colors">
                    Upload Profile Picture
                  </p>
                </div>
                
                {/* Username & Age */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-purple-200 mb-1.5 sm:mb-2">Username</label>
                    <div className="relative group">
                      <User className="absolute left-3 sm:left-4 top-3 sm:top-4 h-4 w-4 sm:h-5 sm:w-5 text-purple-400 group-focus-within:text-rose-400 transition-colors" />
                      <input
                        type="text"
                        value={signUpData.username}
                        onChange={(e) => setSignUpData({...signUpData, username: e.target.value})}
                        className="w-full pl-9 sm:pl-12 pr-3 sm:pr-4 py-2 sm:py-3 bg-slate-700/50 border border-purple-500/30 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all text-white text-xs sm:text-sm placeholder-purple-400/50"
                        placeholder="YourName"
                        autoComplete="username"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-purple-200 mb-1.5 sm:mb-2">Age</label>
                    <input
                      type="number"
                      min="13"
                      max="120"
                      value={signUpData.age}
                      onChange={(e) => setSignUpData({...signUpData, age: e.target.value})}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-slate-700/50 border border-purple-500/30 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all text-white text-xs sm:text-sm placeholder-purple-400/50"
                      placeholder="25"
                    />
                  </div>
                </div>
                
                {/* Email Field */}
                {/* Email Field */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-purple-200 mb-1.5 sm:mb-2">Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-3 sm:left-4 top-3 sm:top-4 h-4 w-4 sm:h-5 sm:w-5 text-purple-400 group-focus-within:text-rose-400 transition-colors" />
                    <input
                      type="email"
                      value={signUpData.email}
                      onChange={(e) => setSignUpData({...signUpData, email: e.target.value})}
                      className="w-full pl-9 sm:pl-12 pr-3 sm:pr-4 py-2 sm:py-3 bg-slate-700/50 border border-purple-500/30 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all text-white text-xs sm:text-sm placeholder-purple-400/50"
                      placeholder="your@email.com"
                      autoComplete="email"
                    />
                  </div>
                </div>
                
                {/* Gender Field */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-purple-200 mb-1.5 sm:mb-2">Gender</label>
                  <select
                    value={signUpData.gender}
                    onChange={(e) => setSignUpData({...signUpData, gender: e.target.value})}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-slate-700/50 border border-purple-500/30 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all text-white text-xs sm:text-sm"
                  >
                    <option value="" className="text-slate-900">Select Gender</option>
                    <option value="male" className="text-slate-900">Male</option>
                    <option value="female" className="text-slate-900">Female</option>
                    <option value="other" className="text-slate-900">Other</option>
                  </select>
                </div>
                
                {/* Password Field */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-purple-200 mb-1.5 sm:mb-2">Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-3 sm:left-4 top-3 sm:top-4 h-4 w-4 sm:h-5 sm:w-5 text-purple-400 group-focus-within:text-rose-400 transition-colors" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={signUpData.password}
                      onChange={(e) => setSignUpData({...signUpData, password: e.target.value})}
                      className="w-full pl-9 sm:pl-12 pr-9 sm:pr-12 py-2 sm:py-3 bg-slate-700/50 border border-purple-500/30 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all text-white text-xs sm:text-sm placeholder-purple-400/50"
                      placeholder="Min 6 characters"
                      minLength="6"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 sm:right-4 top-3 sm:top-4 text-purple-400 hover:text-rose-400 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                    </button>
                  </div>
                </div>
                
                {/* Confirm Password Field */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-purple-200 mb-1.5 sm:mb-2">Confirm Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-3 sm:left-4 top-3 sm:top-4 h-4 w-4 sm:h-5 sm:w-5 text-purple-400 group-focus-within:text-rose-400 transition-colors" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={signUpData.confirmPassword}
                      onChange={(e) => setSignUpData({...signUpData, confirmPassword: e.target.value})}
                      className="w-full pl-9 sm:pl-12 pr-9 sm:pr-12 py-2 sm:py-3 bg-slate-700/50 border border-purple-500/30 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all text-white text-xs sm:text-sm placeholder-purple-400/50"
                      placeholder="Confirm password"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 sm:right-4 top-3 sm:top-4 text-purple-400 hover:text-rose-400 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                    </button>
                  </div>
                </div>
                
                {/* Sign Up Button */}
                <button
                  onClick={handleSignUp}
                  disabled={isLoading || !signUpData.username || !signUpData.email || !signUpData.password || !signUpData.confirmPassword || !signUpData.gender || !signUpData.age}
                  className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 sm:py-3 px-3 sm:px-4 rounded-lg font-bold text-xs sm:text-base transition-all shadow-lg shadow-rose-500/50 hover:shadow-rose-500/75 duration-300"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Creating Account...
                    </span>
                  ) : 'Create Account 💖'}
                </button>
              </div>
            </div>
          )}
          
          {/* ===== FORGOT PASSWORD FORM ===== */}
          {currentPage === 'forgotpassword' && (
            <div className="bg-slate-800/40 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-5 sm:p-6 lg:p-8 shadow-2xl hover:border-purple-500/50 transition-all">
              <button
                onClick={goBack}
                className="flex items-center text-rose-400 hover:text-rose-300 text-xs sm:text-sm font-semibold mb-5 sm:mb-8 transition-colors group"
              >
                <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                Back to Sign In
              </button>
              
              <div className="text-center mb-5 sm:mb-6">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1 sm:mb-2">Forgot Password?</h2>
                <p className="text-xs sm:text-sm text-purple-300">We'll send a reset link to your email</p>
              </div>
              
              <div className="space-y-3 sm:space-y-4 lg:space-y-5">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-purple-200 mb-1.5 sm:mb-2">Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-3 sm:left-4 top-3 sm:top-4 h-4 w-4 sm:h-5 sm:w-5 text-purple-400 group-focus-within:text-rose-400 transition-colors" />
                    <input
                      type="email"
                      value={forgotPasswordEmail}
                      onChange={(e) => setForgotPasswordEmail(e.target.value)}
                      className="w-full pl-9 sm:pl-12 pr-3 sm:pr-4 py-2 sm:py-3 bg-slate-700/50 border border-purple-500/30 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all text-white text-xs sm:text-sm placeholder-purple-400/50"
                      placeholder="your@email.com"
                      autoComplete="email"
                    />
                  </div>
                </div>
                
                <button
                  onClick={handleForgotPassword}
                  disabled={isLoading || !forgotPasswordEmail}
                  className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 sm:py-3 px-3 sm:px-4 rounded-lg font-bold text-xs sm:text-base transition-all shadow-lg shadow-rose-500/50 hover:shadow-rose-500/75 duration-300"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Sending...
                    </span>
                  ) : 'Send Reset Link 📧'}
                </button>
                
                <p className="text-purple-300 text-xs text-center leading-relaxed">
                  Check your email inbox and spam folder. Reset link expires in 24 hours.
                </p>
              </div>
            </div>
          )}
          
          {/* ===== RESET PASSWORD FORM ===== */}
          {currentPage === 'resetpassword' && (
            <div className="bg-slate-800/40 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-5 sm:p-6 lg:p-8 shadow-2xl hover:border-purple-500/50 transition-all">
              <div className="text-center mb-5 sm:mb-6">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1 sm:mb-2">Reset Your Password</h2>
                <p className="text-xs sm:text-sm text-purple-300">Create a strong new password</p>
              </div>
              
              <div className="space-y-3 sm:space-y-4 lg:space-y-5">
                {/* New Password Field */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-purple-200 mb-1.5 sm:mb-2">New Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-3 sm:left-4 top-3 sm:top-4 h-4 w-4 sm:h-5 sm:w-5 text-purple-400 group-focus-within:text-rose-400 transition-colors" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={resetPasswordData.newPassword}
                      onChange={(e) => setResetPasswordData({...resetPasswordData, newPassword: e.target.value})}
                      className="w-full pl-9 sm:pl-12 pr-9 sm:pr-12 py-2 sm:py-3 bg-slate-700/50 border border-purple-500/30 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all text-white text-xs sm:text-sm placeholder-purple-400/50"
                      placeholder="Min 6 characters"
                      minLength="6"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 sm:right-4 top-3 sm:top-4 text-purple-400 hover:text-rose-400 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                    </button>
                  </div>
                </div>
                
                {/* Confirm Password Field */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-purple-200 mb-1.5 sm:mb-2">Confirm Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-3 sm:left-4 top-3 sm:top-4 h-4 w-4 sm:h-5 sm:w-5 text-purple-400 group-focus-within:text-rose-400 transition-colors" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={resetPasswordData.confirmPassword}
                      onChange={(e) => setResetPasswordData({...resetPasswordData, confirmPassword: e.target.value})}
                      className="w-full pl-9 sm:pl-12 pr-9 sm:pr-12 py-2 sm:py-3 bg-slate-700/50 border border-purple-500/30 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all text-white text-xs sm:text-sm placeholder-purple-400/50"
                      placeholder="Confirm password"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 sm:right-4 top-3 sm:top-4 text-purple-400 hover:text-rose-400 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                    </button>
                  </div>
                </div>
                
                {/* Reset Button */}
                <button
                  onClick={handleResetPassword}
                  disabled={isLoading || !resetPasswordData.newPassword || !resetPasswordData.confirmPassword || !resetPasswordData.token}
                  className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 sm:py-3 px-3 sm:px-4 rounded-lg font-bold text-xs sm:text-base transition-all shadow-lg shadow-rose-500/50 hover:shadow-rose-500/75 duration-300"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Resetting...
                    </span>
                  ) : 'Reset Password 🔑'}
                </button>
                
                <p className="text-purple-300 text-xs text-center leading-relaxed">
                  After reset, you can login with your new password.
                </p>
              </div>
            </div>
          )}

          {/* ===== FOOTER ===== */}
          <div className="text-center mt-4 sm:mt-6 lg:mt-8">
            <p className="text-purple-400 text-xs font-mono tracking-wider">
              © 2025 CoupletCrypt • Your love, encrypted forever 💖
            </p>
          </div>
        </div>
      </div>

      {/* ===== CSS ANIMATIONS ===== */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
            opacity: 0.2;
          }
          50% {
            transform: translateY(-30px) translateX(15px);
            opacity: 0.4;
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out;
        }
        
        .animate-slideDown {
          animation: slideDown 0.4s ease-out;
        }

        /* Scrollbar styling for overflow content */
        .overflow-y-auto::-webkit-scrollbar {
          width: 6px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.3);
          border-radius: 10px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: rgba(168, 85, 247, 0.5);
          border-radius: 10px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: rgba(168, 85, 247, 0.7);
        }
      `}</style>
    </div>
  );
};

export default AuthPage;