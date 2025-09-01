// ULTRA-CLEAN UPLOAD - NO FIREBASE ANYWHERE
import React, { useState } from 'react';

export function PureUpload({ onSuccess, onClose, currentUser }) {
  const [status, setStatus] = useState('ready');
  const [error, setError] = useState('');

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    console.log('=== PURE UPLOAD START ===');
    console.log('File:', file.name, file.size, 'bytes');
    console.log('NO FIREBASE CODE IN THIS FILE');
    
    setStatus('uploading');
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'sdrm_profiles');

      console.log('Uploading to Cloudinary directly...');
      const response = await fetch('https://api.cloudinary.com/v1_1/dbijh2a3u/image/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('Upload success:', result.secure_url);

      // Save to localStorage
      const profiles = JSON.parse(localStorage.getItem('userProfiles') || '{}');
      profiles[currentUser.email] = result.secure_url;
      localStorage.setItem('userProfiles', JSON.stringify(profiles));

      onSuccess(result.secure_url);
      setStatus('success');
      
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message);
      setStatus('error');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999
    }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(0, 73, 144, 0.95), rgba(245, 160, 29, 0.95))',
        padding: '40px',
        borderRadius: '20px',
        maxWidth: '500px',
        width: '90%',
        textAlign: 'center',
        boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
        border: '1px solid rgba(255,255,255,0.2)'
      }}>
        <h2 style={{ 
          color: 'white', 
          marginBottom: '30px',
          fontSize: '1.8rem',
          fontWeight: '600',
          textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
        }}>
          Profile Picture
        </h2>
        
        {currentUser.profilePicture && (
          <div style={{ marginBottom: '30px' }}>
            <img 
              src={currentUser.profilePicture} 
              alt="Current" 
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                border: '4px solid rgba(255,255,255,0.9)',
                boxShadow: '0 8px 20px rgba(0,0,0,0.3)'
              }}
            />
            <p style={{ 
              color: 'rgba(255,255,255,0.8)', 
              margin: '10px 0 0 0',
              fontSize: '14px'
            }}>
              Current Photo
            </p>
          </div>
        )}

        <div style={{
          background: 'rgba(255,255,255,0.15)',
          border: status === 'uploading' ? '2px solid rgba(255,255,255,0.4)' : '2px dashed rgba(255,255,255,0.4)',
          borderRadius: '15px',
          padding: '30px 20px',
          margin: '20px 0',
          cursor: status === 'uploading' ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={status === 'uploading'}
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: status === 'uploading' ? 'not-allowed' : 'pointer'
            }}
          />
          <div style={{ pointerEvents: 'none' }}>
            <div style={{ 
              fontSize: '3rem',
              marginBottom: '10px',
              opacity: status === 'uploading' ? 0.5 : 1
            }}>
              {status === 'uploading' ? '⬆️' : '📁'}
            </div>
            <p style={{ 
              color: 'white',
              fontSize: '16px',
              fontWeight: '500',
              margin: 0
            }}>
              {status === 'uploading' ? 'Uploading...' : 'Click to choose photo'}
            </p>
            <p style={{ 
              color: 'rgba(255,255,255,0.7)',
              fontSize: '14px',
              margin: '5px 0 0 0'
            }}>
              JPG, PNG or GIF
            </p>
          </div>
        </div>

        {status === 'uploading' && (
          <div style={{
            background: 'rgba(245, 160, 29, 0.9)',
            color: 'white',
            padding: '15px',
            borderRadius: '12px',
            margin: '20px 0',
            fontSize: '16px',
            fontWeight: '600',
            border: '1px solid rgba(255,255,255,0.3)'
          }}>
            🔄 Uploading to cloud storage...
          </div>
        )}

        {status === 'success' && (
          <div style={{
            background: 'rgba(34, 197, 94, 0.9)',
            color: 'white',
            padding: '15px',
            borderRadius: '12px',
            margin: '20px 0',
            fontSize: '16px',
            fontWeight: '600',
            border: '1px solid rgba(255,255,255,0.3)'
          }}>
            ✅ Photo uploaded successfully!
          </div>
        )}

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.9)',
            color: 'white',
            padding: '15px',
            borderRadius: '12px',
            margin: '20px 0',
            fontSize: '16px',
            fontWeight: '500',
            border: '1px solid rgba(255,255,255,0.3)'
          }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
          <button
            onClick={onClose}
            disabled={status === 'uploading'}
            style={{
              flex: 1,
              background: status === 'uploading' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.9)',
              color: status === 'uploading' ? 'rgba(255,255,255,0.5)' : '#004990',
              border: 'none',
              padding: '15px 20px',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: status === 'uploading' ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(10px)'
            }}
          >
            {status === 'uploading' ? 'Please wait...' : 'Done'}
          </button>
        </div>

        <div style={{
          marginTop: '20px',
          padding: '10px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '8px',
          fontSize: '12px',
          color: 'rgba(255,255,255,0.7)'
        }}>
          Secure cloud storage powered by Cloudinary
        </div>
      </div>
    </div>
  );
}