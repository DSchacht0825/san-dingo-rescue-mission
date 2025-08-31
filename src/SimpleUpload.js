// PRODUCTION UPLOAD SOLUTION - Cloudinary ONLY, NO Firebase
import React, { useState } from 'react';

export const SimpleProfileUpload = ({ currentUser, setCurrentUser, setShowProfile }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  
  const handleUpload = async (event) => {
    console.log('=== UPLOAD HANDLER START ===');
    console.log('This is SimpleUpload.js - NO Firebase here');
    
    const file = event.target.files[0];
    if (!file) return;
    
    console.log('File selected:', file.name);
    setUploading(true);
    setError('');
    
    try {
      // CLOUDINARY UPLOAD - Direct, no Firebase involved
      console.log('Starting Cloudinary upload...');
      console.log('NO Firebase Auth is being called here');
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'sdrm_profiles');
      
      // Direct Cloudinary API call
      const response = await fetch(
        'https://api.cloudinary.com/v1_1/dbijh2a3u/image/upload',
        {
          method: 'POST',
          body: formData
        }
      );
      
      console.log('Cloudinary response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Cloudinary error:', errorData);
        throw new Error(`Cloudinary upload failed: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Upload successful! URL:', data.secure_url);
      
      // Save to localStorage for persistence
      const profiles = JSON.parse(localStorage.getItem('userProfiles') || '{}');
      profiles[currentUser.email] = data.secure_url;
      localStorage.setItem('userProfiles', JSON.stringify(profiles));
      
      // Update state with Cloudinary URL
      setCurrentUser(prev => ({
        ...prev,
        profilePicture: data.secure_url
      }));
      
      alert('Profile picture uploaded to cloud successfully!');
      setShowProfile(false);
      
    } catch (error) {
      console.error('Upload error:', error);
      setError(error.message);
      
      // Fallback to local storage if Cloudinary fails
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          const imageUrl = e.target.result;
          
          const profiles = JSON.parse(localStorage.getItem('userProfiles') || '{}');
          profiles[currentUser.email] = imageUrl;
          localStorage.setItem('userProfiles', JSON.stringify(profiles));
          
          setCurrentUser(prev => ({
            ...prev,
            profilePicture: imageUrl
          }));
          
          alert('Profile picture saved locally (cloud upload failed)');
          setShowProfile(false);
        };
        reader.readAsDataURL(file);
      } catch (localError) {
        setError('Both cloud and local storage failed');
      }
    } finally {
      setUploading(false);
    }
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
        <h2 style={{ marginBottom: '20px', color: '#333' }}>Upload Profile Picture</h2>
        
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          {currentUser.profilePicture && (
            <img 
              src={currentUser.profilePicture} 
              alt="Current"
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                marginBottom: '20px',
                border: '3px solid #F5A01D'
              }}
            />
          )}
        </div>
        
        <input
          type="file"
          accept="image/*"
          onChange={handleUpload}
          disabled={uploading}
          style={{
            marginBottom: '20px',
            display: 'block',
            width: '100%',
            padding: '10px',
            border: '2px dashed #ccc',
            borderRadius: '5px',
            cursor: uploading ? 'not-allowed' : 'pointer'
          }}
        />
        
        {uploading && (
          <div style={{
            background: '#F5A01D',
            color: 'white',
            padding: '10px',
            borderRadius: '5px',
            marginBottom: '10px',
            textAlign: 'center'
          }}>
            Uploading to Cloudinary...
          </div>
        )}
        
        {error && (
          <div style={{
            background: '#ff4444',
            color: 'white',
            padding: '10px',
            borderRadius: '5px',
            marginBottom: '10px'
          }}>
            {error}
          </div>
        )}
        
        <div style={{ fontSize: '12px', color: '#666', marginBottom: '20px' }}>
          <strong>Cloud Storage:</strong> Images are uploaded to Cloudinary<br/>
          <strong>Status:</strong> {uploading ? 'Uploading...' : 'Ready'}
        </div>
        
        <button
          onClick={() => setShowProfile(false)}
          disabled={uploading}
          style={{
            background: '#F5A01D',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: uploading ? 'not-allowed' : 'pointer',
            width: '100%',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          {uploading ? 'Please wait...' : 'Close'}
        </button>
      </div>
    </div>
  );
};