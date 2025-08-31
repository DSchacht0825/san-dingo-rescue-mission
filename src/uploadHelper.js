// Completely isolated upload helper - NO Firebase imports at all
// This file has zero Firebase dependencies

export const uploadToCloudinary = async (file, userEmail) => {
  console.log('=== CLOUDINARY UPLOAD (No Firebase) ===');
  console.log('File:', file.name, 'User:', userEmail);
  
  // Validation
  if (!file.type.startsWith('image/')) {
    throw new Error('Please select an image file');
  }
  
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Please select a smaller image (max 10MB)');
  }
  
  // Create form data
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'sdrm_profiles');
  formData.append('public_id', `profile_${userEmail.replace('@', '_').replace('.', '_')}_${Date.now()}`);
  formData.append('folder', 'sdrm/profiles');
  
  // Upload to Cloudinary
  const CLOUD_NAME = 'dbijh2a3u';
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
  
  console.log('Uploading to:', url);
  
  const response = await fetch(url, {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Cloudinary error:', errorText);
    throw new Error(`Upload failed: ${response.status}`);
  }
  
  const result = await response.json();
  console.log('Upload successful:', result.secure_url);
  
  return result.secure_url;
};

export const saveToLocalStorage = async (file, userEmail) => {
  console.log('=== LOCAL STORAGE FALLBACK ===');
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const dataURL = e.target.result;
      
      // Save to localStorage
      const userProfiles = JSON.parse(localStorage.getItem('userProfiles') || '{}');
      userProfiles[userEmail] = dataURL;
      localStorage.setItem('userProfiles', JSON.stringify(userProfiles));
      
      console.log('Saved to localStorage for:', userEmail);
      resolve(dataURL);
    };
    
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};