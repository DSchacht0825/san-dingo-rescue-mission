// PURE CLOUDINARY UPLOAD - Zero Firebase dependencies
// This file has NOTHING to do with Firebase

import React, { useState } from 'react';

export function CloudinaryUpload({ user, onSuccess, onClose }) {
  const [status, setStatus] = useState('ready');
  
  async function upload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    setStatus('uploading');
    
    // Create form data
    const data = new FormData();
    data.append('file', file);
    data.append('upload_preset', 'sdrm_profiles');
    
    try {
      // Direct HTTP call to Cloudinary
      const res = await fetch('https://api.cloudinary.com/v1_1/dbijh2a3u/image/upload', {
        method: 'POST',
        body: data
      });
      
      const json = await res.json();
      
      if (json.secure_url) {
        setStatus('success');
        onSuccess(json.secure_url);
        setTimeout(onClose, 1000);
      } else {
        setStatus('error');
      }
    } catch (err) {
      console.error('Cloudinary error:', err);
      setStatus('error');
    }
  }
  
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
      zIndex: 99999
    }}>
      <div style={{
        background: 'white',
        padding: '30px',
        borderRadius: '10px',
        width: '400px'
      }}>
        <h2>Upload Profile Picture</h2>
        <p>Status: {status}</p>
        
        <input
          type="file"
          accept="image/*"
          onChange={upload}
          disabled={status === 'uploading'}
        />
        
        <button onClick={onClose} style={{
          marginTop: '20px',
          padding: '10px 20px',
          background: '#F5A01D',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}>
          Close
        </button>
      </div>
    </div>
  );
}