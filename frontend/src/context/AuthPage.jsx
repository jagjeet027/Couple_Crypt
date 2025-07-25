import React, { useState } from 'react';
import { Eye, EyeOff, User, Mail, Lock, Upload, X } from 'lucide-react';

const AuthPage = ({ initialPage = 'signin', onNavigate, onAuthSuccess, pendingRedirect }) => {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // SignIn form state
  const [signInData, setSignInData] = useState({
    email: '',
    password: ''
  });
  
  // SignUp form state
  const [signUpData, setSignUpData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    gender: '',
    age: '',
    profileImage: null
  });
  
  const [imagePreview, setImagePreview] = useState(null);
  
  // API Base URL
  const API_BASE_URL = 'http://localhost:2004/api/auth';
  
  // Store authentication data
  const storeAuthData = (token, user) => {
    try {
      localStorage.setItem('authToken', token);
      localStorage.setItem('userData', JSON.stringify(user));
    } catch (error) {
      console.error('Error storing authentication data:', error);
    }
  };
  
  const handleAuthSuccess = (data, isSignUp = false) => {
  const actionType = isSignUp ? 'Account created' : 'Login';
  setMessage({ type: 'success', text: `${actionType} successfully! Redirecting...` });
  
  // Store authentication data
  if (data.data && data.data.token && data.data.user) {
    storeAuthData(data.data.token, data.data.user);
  } else {
    console.warn('Token or user data missing from response:', data);
  }
  
  // Clear forms
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
  
  // Trigger auth state change event
  window.dispatchEvent(new Event('authStateChanged'));
  
  // Use the parent component's navigation system
  setTimeout(() => {
    if (onAuthSuccess) {
      onAuthSuccess(data.data ? data.data.user : null);
    } else if (onNavigate) {
      onNavigate('/'); // Always redirect to home page after auth from header
    }
  }, 1500);
};
  
  // Handle image upload
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
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };
  
  // Remove image
  const removeImage = () => {
    setSignUpData({ ...signUpData, profileImage: null });
    setImagePreview(null);
  };
  
  const handleSignIn = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: '', text: '' });
    try {
      console.log('Making request to:', `${API_BASE_URL}/login`);
      
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(signInData),
      });
      console.log('Response status:', response.status);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error('Non-JSON response:', textResponse);
        throw new Error('Server returned non-JSON response. Check server logs.');
      }
      const data = await response.json();
      if (data.success) {
        handleAuthSuccess(data, false);
      } else {
        setMessage({ type: 'error', text: data.message || 'Login failed' });
      }
    } catch (error) {
      console.error('Login error:', error);
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setMessage({ type: 'error', text: 'Cannot connect to server. Please check if the server is running.' });
      } else if (error.message.includes('JSON')) {
        setMessage({ type: 'error', text: 'Server error. Please check server logs and try again.' });
      } else {
        setMessage({ type: 'error', text: error.message || 'Network error. Please try again.' });
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSignUp = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: '', text: '' });
    
    // Validation
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
    // Additional validation
    if (parseInt(signUpData.age) < 13) {
      setMessage({ type: 'error', text: 'You must be at least 13 years old to create an account' });
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
      console.log('Making request to:', `${API_BASE_URL}/signup`);
      
      const response = await fetch(`${API_BASE_URL}/signup`, {
        method: 'POST',
        body: formData,
      });
      console.log('Response status:', response.status);
      // Check if response is OK
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error('Non-JSON response:', textResponse);
        throw new Error('Server returned non-JSON response. Check server logs.');
      }
      const data = await response.json();
      console.log('Response data:', data);
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
      console.error('Signup error:', error);
      
      // More specific error messages
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setMessage({ type: 'error', text: 'Cannot connect to server. Please check if the server is running.' });
      } else if (error.message.includes('JSON')) {
        setMessage({ type: 'error', text: 'Server error. Please check server logs and try again.' });
      } else {
        setMessage({ type: 'error', text: error.message || 'Network error. Please try again.' });
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Clear message when switching between forms
  const switchPage = (page) => {
    setCurrentPage(page);
    setMessage({ type: '', text: '' });
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex bg-gray-100 rounded-lg p-1 mb-8">
          <button
            onClick={() => switchPage('signin')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              currentPage === 'signin'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => switchPage('signup')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              currentPage === 'signup'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Sign Up
          </button>
        </div>
        
        {/* Message Display */}
        {message.text && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${
            message.type === 'success' 
              ? 'bg-green-100 text-green-700 border border-green-200' 
              : 'bg-red-100 text-red-700 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}
        
        {/* Sign In Form */}
        {currentPage === 'signin' && (
          <form onSubmit={handleSignIn} className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Welcome Back</h2>
              <p className="text-gray-600 mt-2">Sign in to your account</p>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={signInData.email}
                    onChange={(e) => setSignInData({...signInData, email: e.target.value})}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={signInData.password}
                    onChange={(e) => setSignInData({...signInData, password: e.target.value})}
                    className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading || !signInData.email || !signInData.password}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </button>
            </div>
          </form>
        )}
        
        {/* Sign Up Form */}
        {currentPage === 'signup' && (
          <form onSubmit={handleSignUp} className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Create Account</h2>
              <p className="text-gray-600 mt-2">Join us today</p>
            </div>
            <div className="space-y-6">
              {/* Profile Image Upload */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Profile preview"
                        className="w-20 h-20 rounded-full object-cover border-4 border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                      <Upload className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                </div>
                <label className="mt-2 cursor-pointer text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors">
                  Upload Profile Picture
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={signUpData.username}
                      onChange={(e) => setSignUpData({...signUpData, username: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      placeholder="Username"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Age
                  </label>
                  <input
                    type="number"
                    min="13"
                    max="120"
                    value={signUpData.age}
                    onChange={(e) => setSignUpData({...signUpData, age: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Age"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={signUpData.email}
                    onChange={(e) => setSignUpData({...signUpData, email: e.target.value})}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender
                </label>
                <select
                  value={signUpData.gender}
                  onChange={(e) => setSignUpData({...signUpData, gender: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={signUpData.password}
                    onChange={(e) => setSignUpData({...signUpData, password: e.target.value})}
                    className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Create password (min 6 characters)"
                    required
                    minLength="6"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={signUpData.confirmPassword}
                    onChange={(e) => setSignUpData({...signUpData, confirmPassword: e.target.value})}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Confirm password"
                    required
                  />
                </div>
              </div>
              
              <button
                type="submit"
                disabled={isLoading || !signUpData.username || !signUpData.email || !signUpData.password || !signUpData.confirmPassword || !signUpData.gender || !signUpData.age}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AuthPage;