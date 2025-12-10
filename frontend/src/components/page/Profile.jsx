import React, { useState, useEffect } from 'react';
import { User, Mail, Heart, Cake, Edit2, Upload, X, Save, ArrowLeft, AlertCircle } from 'lucide-react';

const Profile = () => {
  const [userData, setUserData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    gender: '',
    age: '',
  });
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);

  // Fetch user data on mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = localStorage.getItem('userData');
        const token = localStorage.getItem('authToken');

        if (!user || !token) {
          setError('Please login first');
          setLoading(false);
          return;
        }

        const parsedUser = JSON.parse(user);
        setUserData(parsedUser);
        setFormData({
          username: parsedUser.username,
          email: parsedUser.email,
          gender: parsedUser.gender,
          age: parsedUser.age,
        });
        setImagePreview(parsedUser.profileImage);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Failed to load profile');
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setError('Only image files are allowed (jpeg, jpg, png, gif, webp)');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }

      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      setError(null);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('No authentication token found. Please login again.');
        setSaving(false);
        return;
      }

      // Validate form data
      if (!formData.username || !formData.age || !formData.gender) {
        setError('All fields are required');
        setSaving(false);
        return;
      }

      const ageNum = parseInt(formData.age);
      if (isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
        setError('Age must be between 13 and 120');
        setSaving(false);
        return;
      }

      // Prepare form data for multipart request
      const updateFormData = new FormData();
      updateFormData.append('username', formData.username);
      updateFormData.append('age', formData.age);
      updateFormData.append('gender', formData.gender);
      
      if (profileImage) {
        updateFormData.append('profileImage', profileImage);
      }

      const response = await fetch('http://localhost:2004/api/auth/user/update-profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: updateFormData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        const updatedUser = data.data.user;
        
        // Update localStorage
        localStorage.setItem('userData', JSON.stringify(updatedUser));
        
        // Update state
        setUserData(updatedUser);
        setImagePreview(updatedUser.profileImage);
        setProfileImage(null);
        setIsEditing(false);
        setError(null);
      } else {
        throw new Error(data.message || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Error saving profile:', err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setProfileImage(null);
    setFormData({
      username: userData.username,
      email: userData.email,
      gender: userData.gender,
      age: userData.age,
    });
    setImagePreview(userData.profileImage);
    setError(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-red-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-400 mb-4">Unable to load profile</p>
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-4 max-w-md">
            <p className="text-sm text-red-300">{error}</p>
          </div>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-2 bg-gradient-to-r from-red-600 to-purple-600 text-white rounded-lg font-bold hover:from-red-700 hover:to-purple-700 transition-all"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const genderIcons = {
    male: '👨',
    female: '👩',
    other: '💜'
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 py-12 px-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="max-w-2xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => window.location.href = '/'}
            className="flex items-center space-x-2 text-gray-300 hover:text-red-400 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-pink-400 to-purple-400">
            Your Profile
          </h1>
          <div className="w-12"></div>
        </div>

        {/* Profile Card */}
        <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl border border-purple-500/30 shadow-2xl overflow-hidden">
          {/* Cover Section */}
          <div className="h-32 bg-gradient-to-r from-red-600/20 via-pink-600/20 to-purple-600/20 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-purple-500/5"></div>
          </div>

          {/* Profile Content */}
          <div className="px-8 pb-8">
            {/* Profile Image Section */}
            <div className="flex flex-col items-center -mt-16 mb-8">
              <div className="relative group mb-4">
                <div className="w-32 h-32 rounded-full border-4 border-purple-500 shadow-xl shadow-red-500/30 overflow-hidden bg-gradient-to-br from-purple-600 to-red-600 flex items-center justify-center">
                  {imagePreview && imagePreview.startsWith('data:image') ? (
                    <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
                  ) : imagePreview ? (
                    <img
                      src={`http://localhost:2004${imagePreview}`}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = '<div class="flex items-center justify-center w-full h-full"><span class="text-gray-300">📸</span></div>';
                      }}
                    />
                  ) : (
                    <User className="w-16 h-16 text-gray-300" />
                  )}
                </div>

                {isEditing && (
                  <label className="absolute bottom-0 right-0 bg-gradient-to-r from-red-600 to-pink-600 p-3 rounded-full cursor-pointer hover:from-red-700 hover:to-pink-700 transition-all transform hover:scale-110 shadow-lg">
                    <Upload className="w-5 h-5 text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Profile Info */}
            {!isEditing ? (
              <div className="space-y-6">
                <div className="bg-slate-700/50 rounded-lg p-4 border border-purple-500/20">
                  <div className="flex items-center space-x-3 mb-2">
                    <User className="w-5 h-5 text-purple-400" />
                    <span className="text-gray-400 text-sm">Username</span>
                  </div>
                  <p className="text-xl font-bold text-white ml-8">{userData.username}</p>
                </div>

                <div className="bg-slate-700/50 rounded-lg p-4 border border-purple-500/20">
                  <div className="flex items-center space-x-3 mb-2">
                    <Mail className="w-5 h-5 text-pink-400" />
                    <span className="text-gray-400 text-sm">Email</span>
                  </div>
                  <p className="text-xl font-bold text-white ml-8">{userData.email}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-700/50 rounded-lg p-4 border border-purple-500/20">
                    <div className="flex items-center space-x-3 mb-2">
                      <Cake className="w-5 h-5 text-yellow-400" />
                      <span className="text-gray-400 text-sm">Age</span>
                    </div>
                    <p className="text-xl font-bold text-white ml-8">{userData.age}</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4 border border-purple-500/20">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-2xl">{genderIcons[userData.gender]}</span>
                      <span className="text-gray-400 text-sm">Gender</span>
                    </div>
                    <p className="text-xl font-bold text-white ml-8 capitalize">{userData.gender}</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full mt-8 flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 text-white rounded-lg font-bold hover:from-red-700 hover:via-pink-700 hover:to-purple-700 transition-all shadow-lg shadow-red-500/50 hover:shadow-red-400/70 transform hover:scale-105"
                >
                  <Edit2 className="w-5 h-5" />
                  <span>Edit Profile</span>
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="block text-gray-300 text-sm font-semibold mb-2">Username</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-700 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-semibold mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full px-4 py-3 bg-slate-700/50 border border-purple-500/20 rounded-lg text-gray-400 cursor-not-allowed"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 text-sm font-semibold mb-2">Age</label>
                    <input
                      type="number"
                      name="age"
                      value={formData.age}
                      onChange={handleInputChange}
                      min="13"
                      max="120"
                      className="w-full px-4 py-3 bg-slate-700 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-red-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm font-semibold mb-2">Gender</label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-700 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-red-500 transition-colors capitalize"
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-8">
                  <button
                    onClick={handleCancel}
                    disabled={saving}
                    className="flex items-center justify-center space-x-2 px-6 py-3 bg-slate-700 text-gray-300 rounded-lg font-bold hover:bg-slate-600 transition-all disabled:opacity-50"
                  >
                    <X className="w-5 h-5" />
                    <span>Cancel</span>
                  </button>
                  <button
                    onClick={handleSaveChanges}
                    disabled={saving}
                    className="flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg font-bold hover:from-red-700 hover:to-pink-700 transition-all disabled:opacity-50 shadow-lg shadow-red-500/50"
                  >
                    <Save className="w-5 h-5" />
                    <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;