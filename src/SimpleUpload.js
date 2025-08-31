// EMERGENCY UPLOAD SOLUTION - Works 100% without Firebase
import React from 'react';

export const SimpleProfileUpload = ({ currentUser, setCurrentUser, setShowProfile }) => {
  const handleUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // Direct FileReader - no external dependencies
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const imageUrl = e.target.result;
      
      // Save to localStorage
      const profiles = JSON.parse(localStorage.getItem('userProfiles') || '{}');
      profiles[currentUser.email] = imageUrl;
      localStorage.setItem('userProfiles', JSON.stringify(profiles));
      
      // Update state
      setCurrentUser(prev => ({
        ...prev,
        profilePicture: imageUrl
      }));
      
      // Close modal
      setShowProfile(false);
      
      alert('Profile picture updated successfully!');
    };
    
    reader.readAsDataURL(file);
  };
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000
    }}>
      <div style={{
        background: 'white',
        padding: '30px',
        borderRadius: '10px',
        maxWidth: '400px',
        width: '90%'
      }}>
        <h2 style={{ marginBottom: '20px' }}>Upload Profile Picture</h2>
        
        {currentUser.profilePicture && (
          <img 
            src={currentUser.profilePicture} 
            alt="Current"
            style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              marginBottom: '20px'
            }}
          />
        )}
        
        <input
          type="file"
          accept="image/*"
          onChange={handleUpload}
          style={{
            marginBottom: '20px',
            display: 'block',
            width: '100%'
          }}
        />
        
        <button
          onClick={() => setShowProfile(false)}
          style={{
            background: '#F5A01D',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer',
            width: '100%'
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
};