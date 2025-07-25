import { useState } from "react";
import { Image, Download } from "lucide-react";

// Image Display Component for Messages
const ImageMessage = ({ message, isMyMsg, userData, API_BASE_URL, onViewImage, onImageError }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const imageUrl = message.localPreview || 
    `${API_BASE_URL}/messages/file/${message._id}?userId=${encodeURIComponent(userData.id || userData.email)}&t=${Date.now()}`;

  const handleImageClick = () => {
    if (!message.localPreview) {
      onViewImage(message._id);
    }
    setIsFullscreen(true);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
    if (onImageError) {
      onImageError(message._id);
    }
  };

  return (
    <>
      <div className="space-y-2">
        <div className="bg-gray-700/30 p-2 rounded-lg relative">
          {!imageLoaded && !imageError && (
            <div className="flex items-center justify-center h-32 bg-gray-800 rounded animate-pulse">
              <Image className="w-8 h-8 text-gray-400" />
            </div>
          )}
          
          {imageError ? (
            <div className="flex items-center justify-center h-32 bg-gray-800 rounded border-2 border-dashed border-gray-600">
              <div className="text-center">
                <Image className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-xs text-gray-500">Image not available</p>
                <button 
                  onClick={() => window.open(imageUrl, '_blank')}
                  className="text-xs text-blue-400 hover:underline mt-1"
                >
                  Try opening in new tab
                </button>
              </div>
            </div>
          ) : (
            <img
              src={imageUrl}
              alt="Shared image"
              className={`max-w-full max-h-64 object-contain rounded cursor-pointer transition-opacity duration-300 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onClick={handleImageClick}
              onLoad={handleImageLoad}
              onError={handleImageError}
              loading="lazy"
              style={{ display: imageLoaded || imageError ? 'block' : 'none' }}
            />
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <p className="text-xs opacity-60">
            📷 {isMyMsg ? 'Photo sent' : 'Photo received'}
          </p>
          
          {!message.localPreview && (
            <button
              onClick={() => window.open(imageUrl, '_blank')}
              className="text-xs text-blue-400 hover:underline flex items-center space-x-1"
            >
              <Download className="w-3 h-3" />
              <span>Download</span>
            </button>
          )}
        </div>
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setIsFullscreen(false)}
        >
          <div className="relative max-w-full max-h-full">
            <button
              onClick={() => setIsFullscreen(false)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
            >
              ✕ Close
            </button>   
            <img
              src={imageUrl}
              alt="Fullscreen view"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default ImageMessage;