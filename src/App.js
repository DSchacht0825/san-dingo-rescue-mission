/*
 * San Diego Rescue Mission Web Application
 * Copyright © 2025 Daniel Schacht and San Diego Rescue Mission
 * All Rights Reserved
 * 
 * This file contains the main React application component for the
 * San Diego Rescue Mission community platform.
 * 
 * Author: Daniel Schacht
 * Created: 2025
 * License: See LICENSE.md for usage terms
 */

import React, { useState, useEffect } from "react";
import { Heart, User, Eye, EyeOff, Send, Star, Users, BookOpen, MessageCircle, Reply, Shield, Megaphone, Camera } from "lucide-react";
import { db } from "./firebase";
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy } from "firebase/firestore";
import AdminDashboard from "./AdminDashboard";

function App() {
  const [currentView, setCurrentView] = useState("auth");
  const [authMode, setAuthMode] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [showJournaling, setShowJournaling] = useState(false);
  const [currentJournalPrompt, setCurrentJournalPrompt] = useState(0);
  const [journalMode, setJournalMode] = useState("free"); // "free" or "guided"
  const [journalText, setJournalText] = useState("");
  const [saving, setSaving] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [journalEntries, setJournalEntries] = useState([]);
  const [showPastEntries, setShowPastEntries] = useState(false);
  
  // Statistics state
  const [statistics, setStatistics] = useState({
    supportRequests: 0,
    victoryReports: 0,
    activeMembers: 0
  });
  
  // Debug state initialization
  console.log("App component rendered, showPastEntries state:", showPastEntries);
  
  // Admin emails
  const adminEmails = [
    "schacht.dan@gmail.com",
    "daniel@sdrescuemission.org"
  ];

  // Daily Bible verses
  const dailyVerses = [
    {
      text: "Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.",
      reference: "Joshua 1:9"
    },
    {
      text: "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.",
      reference: "Proverbs 3:5-6"
    },
    {
      text: "I can do all this through him who gives me strength.",
      reference: "Philippians 4:13"
    },
    {
      text: "And we know that in all things God works for the good of those who love him, who have been called according to his purpose.",
      reference: "Romans 8:28"
    },
    {
      text: "Cast all your anxiety on him because he cares for you.",
      reference: "1 Peter 5:7"
    },
    {
      text: "The Lord your God is with you, the Mighty Warrior who saves. He will take great delight in you; in his love he will no longer rebuke you, but will rejoice over you with singing.",
      reference: "Zephaniah 3:17"
    },
    {
      text: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, to give you hope and a future.",
      reference: "Jeremiah 29:11"
    }
  ];

  // Journal prompts about God
  const journalPrompts = [
    "How did you experience God's presence in your life today?",
    "What is God teaching you about yourself through your current circumstances?",
    "Write a prayer of gratitude for how God has provided for you recently.",
    "In what ways have you seen God's faithfulness in your recovery journey?",
    "How is God calling you to trust Him more deeply today?",
    "Describe a moment when you felt God's love surrounding you.",
    "What Bible verse has God used to speak to your heart lately?",
    "How is God using your struggles to shape you into who He wants you to be?",
    "What prayers has God answered in your life that you can celebrate?",
    "How is God calling you to show His love to others today?"
  ];

  const getTodaysVerse = () => {
    const today = new Date();
    // Calculate day of year more reliably
    const start = new Date(today.getFullYear(), 0, 0);
    const diff = today - start;
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    // Use day of year to select verse, ensuring it changes daily
    const verseIndex = dayOfYear % dailyVerses.length;
    return dailyVerses[verseIndex];
  };

  const todaysVerse = getTodaysVerse();

  // Load journal entries from Firestore
  const loadJournalEntries = async () => {
    try {
      console.log("Loading journal entries for user:", currentUser.email);
      
      if (!currentUser.email) {
        console.error("No user email found, cannot load entries");
        return;
      }

      // First try to get all entries to debug what's in the database
      const allEntriesQuery = query(collection(db, "journalEntries"));
      const allSnapshot = await getDocs(allEntriesQuery);
      console.log(`Total entries in database: ${allSnapshot.size}`);
      
      // Log all entries to see what emails they have
      allSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log("Found entry with email:", data.userEmail, "current user:", currentUser.email);
      });

      // Then try to get user-specific entries
      const q = query(
        collection(db, "journalEntries"), 
        where("userEmail", "==", currentUser.email)
      );
      
      const querySnapshot = await getDocs(q);
      console.log(`Found ${querySnapshot.size} entries for user ${currentUser.email}`);
      
      const entries = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log("Entry data:", data);
        entries.push({ id: doc.id, ...data });
      });
      
      // Sort entries by date (most recent first)
      entries.sort((a, b) => {
        const dateA = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt)) : new Date();
        const dateB = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt)) : new Date();
        return dateB - dateA;
      });
      
      setJournalEntries(entries);
      console.log(`Successfully loaded ${entries.length} journal entries:`, entries);
    } catch (error) {
      console.error("Error loading journal entries:", error);
      console.error("Error details:", error.message);
    }
  };

  // Save journal entry to Firestore
  const saveJournalEntry = async () => {
    if (!journalText.trim()) {
      alert("Please write something before saving.");
      return;
    }

    setSaving(true);
    try {
      await addDoc(collection(db, "journalEntries"), {
        text: journalText,
        mode: journalMode,
        prompt: journalMode === 'guided' ? journalPrompts[currentJournalPrompt] : null,
        userEmail: currentUser.email,
        userName: currentUser.name,
        timestamp: serverTimestamp(),
        createdAt: new Date()
      });
      
      alert("Journal entry saved successfully!");
      setJournalText("");
      setShowJournaling(false);
    } catch (error) {
      console.error("Error saving journal entry:", error);
      console.error("Error details:", error.message);
      alert(`Error saving journal entry: ${error.message}. Please check the console for details.`);
    } finally {
      setSaving(false);
    }
  };



  // Load posts from Firestore
  const loadPosts = async () => {
    try {
      console.log("Loading posts from Firestore...");
      
      const q = query(
        collection(db, "posts"),
        orderBy("createdAt", "asc")
      );
      
      const querySnapshot = await getDocs(q);
      const posts = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const post = {
          id: doc.id,
          user: data.userName || "Unknown User",
          message: data.text || "",
          time: data.createdAt ? new Date(data.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Unknown",
          type: data.type || "post",
          profilePicture: null,
          likes: data.likes || 0,
          loved: data.loved || false,
          replies: data.replies || [],
          isAdmin: data.isAdmin || false
        };
        posts.push(post);
      });
      
      console.log(`Loaded ${posts.length} posts from Firestore:`, posts);
      setMessages(posts);
    } catch (error) {
      console.error("Error loading posts:", error);
      // Set some default posts if there's an error loading
      setMessages([
        {
          id: "default-1",
          user: "Admin",
          message: "🌟 Welcome to San Diego Rescue Mission Community! This is a safe space for support, encouragement, and fellowship. Please be kind and supportive to one another.",
          time: "Today",
          type: "admin_announcement",
          profilePicture: null,
          likes: 0,
          loved: false,
          replies: [],
          isAdmin: true
        }
      ]);
    }
  };

  // Load statistics from Firestore
  const loadStatistics = async () => {
    try {
      // Count support requests (prayer_request type posts)
      const supportRequestsQuery = query(
        collection(db, "posts"),
        where("type", "==", "prayer_request")
      );
      const supportRequestsSnapshot = await getDocs(supportRequestsQuery);
      const supportRequestsCount = supportRequestsSnapshot.size;

      // Count victory reports (praise_report type posts)
      const victoryReportsQuery = query(
        collection(db, "posts"),
        where("type", "==", "praise_report")
      );
      const victoryReportsSnapshot = await getDocs(victoryReportsQuery);
      const victoryReportsCount = victoryReportsSnapshot.size;

      // Count active members (unique users who have posted)
      const allPostsQuery = query(collection(db, "posts"));
      const allPostsSnapshot = await getDocs(allPostsQuery);
      const uniqueUsers = new Set();
      allPostsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.userEmail) {
          uniqueUsers.add(data.userEmail);
        }
      });
      const activeMembersCount = uniqueUsers.size;

      setStatistics({
        supportRequests: supportRequestsCount,
        victoryReports: victoryReportsCount,
        activeMembers: activeMembersCount
      });

      console.log("Statistics loaded:", {
        supportRequests: supportRequestsCount,
        victoryReports: victoryReportsCount,
        activeMembers: activeMembersCount
      });
    } catch (error) {
      console.error("Error loading statistics:", error);
    }
  };

  
  const [currentUser, setCurrentUser] = useState({
    name: "You",
    email: "",
    profilePicture: null,
    isAdmin: false,
    bio: ""
  });

  // Image resizing function
  const resizeImage = (file, maxWidth = 150, maxHeight = 150, quality = 0.8) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        const resizedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(resizedDataUrl);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  // Handle profile picture upload
  const handleProfilePictureUpload = async (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      try {
        const resizedImage = await resizeImage(file);
        setCurrentUser({ ...currentUser, profilePicture: resizedImage });
      } catch (error) {
        console.error('Error resizing image:', error);
        alert('Error processing image. Please try again.');
      }
    } else {
      alert('Please select a valid image file.');
    }
  };

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  // Load posts and statistics when user logs in
  useEffect(() => {
    if (currentView === "chat" && currentUser.email) {
      loadPosts();
      loadStatistics();
    }
  }, [currentView, currentUser.email]);


  
  const [messages, setMessages] = useState([]);
  
  const [newMessage, setNewMessage] = useState("");
  const [messageType, setMessageType] = useState("post");
  const [adminMessage, setAdminMessage] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const email = e.target.email ? e.target.email.value : formData.email;
    const isUserAdmin = adminEmails.includes(email.toLowerCase());
    
    setCurrentUser({
      ...currentUser,
      name: formData.name || "Community Member",
      email: email,
      isAdmin: isUserAdmin
    });
    
    if (isUserAdmin) {
      alert("Welcome back, Daniel! You have full admin access to San Diego Rescue Mission Community.");
    } else {
      alert("Welcome to San Diego Rescue Mission Community! Enjoy connecting with your support community.");
    }
    
    // Load user's journal entries after login
    setTimeout(() => {
      loadJournalEntries();
    }, 1000);
    
    setCurrentView("chat");
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };


  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) {
      alert("Please write something before posting.");
      return;
    }

    setSaving(true);
    try {
      await addDoc(collection(db, "posts"), {
        text: newMessage,
        userEmail: currentUser.email,
        userName: currentUser.name,
        timestamp: serverTimestamp(),
        createdAt: new Date(),
        type: messageType,
        loved: false,
        likes: 0,
        replies: [],
        isAdmin: currentUser.isAdmin
      });
      
      // Reload posts and statistics after new post
      loadPosts();
      loadStatistics();
      setNewMessage("");
      alert("Post shared successfully!");
    } catch (error) {
      console.error("Error saving post:", error);
      console.error("Error details:", error.message);
      alert(`Error saving post: ${error.message}. Please check the console for details.`);
    } finally {
      setSaving(false);
    }
  };


  const handleLikeMessage = (messageId) => {
    setMessages(messages.map(msg => {
      if (msg.id === messageId) {
        return {
          ...msg,
          likes: msg.loved ? msg.likes - 1 : msg.likes + 1,
          loved: !msg.loved
        };
      }
      return msg;
    }));
  };

  const handleReply = (messageId) => {
    setReplyingTo(messageId);
  };

  const handleSendReply = (messageId) => {
    if (replyText.trim()) {
      const newReply = {
        id: Date.now(),
        user: currentUser.name,
        message: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        profilePicture: currentUser.profilePicture
      };

      setMessages(messages.map(msg => {
        if (msg.id === messageId) {
          return { ...msg, replies: [...msg.replies, newReply] };
        }
        return msg;
      }));

      setReplyText("");
      setReplyingTo(null);
    }
  };

  const handleSendAdminMessage = (e) => {
    e.preventDefault();
    if (adminMessage.trim()) {
      const message = {
        id: messages.length + 1,
        user: "Admin",
        message: `🌟 Community Announcement: ${adminMessage}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: "admin_announcement",
        profilePicture: currentUser.profilePicture,
        likes: 0,
        loved: false,
        replies: [],
        isAdmin: true
      };
      setMessages([...messages, message]);
      setAdminMessage("");
      setShowAdminPanel(false);
    }
  };



  // Profile Modal
  if (showProfile) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #004990 0%, #F5A01D 100%)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          maxWidth: '400px',
          width: '100%',
          background: 'rgba(0,0,0,0.2)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.1)',
          padding: '30px'
        }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white', marginBottom: '20px', textAlign: 'center' }}>Your Profile</h2>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: '20px' }}>
              <div 
                onClick={() => document.getElementById('profilePictureInput').click()}
                style={{
                  width: '96px',
                  height: '96px',
                  background: currentUser.profilePicture ? 'transparent' : '#F5A01D',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  border: '3px solid rgba(255,255,255,0.2)',
                  transition: 'transform 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
              >
                {currentUser.profilePicture ? (
                  <img 
                    src={currentUser.profilePicture} 
                    alt="Profile" 
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <User size={48} color="white" />
                )}
              </div>
              <div style={{
                position: 'absolute',
                bottom: '0',
                right: '0',
                width: '28px',
                height: '28px',
                background: '#F5A01D',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                border: '2px solid white',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
              }}
              onClick={() => document.getElementById('profilePictureInput').click()}
              >
                <Camera size={14} color="white" />
              </div>
              <input
                id="profilePictureInput"
                type="file"
                accept="image/*"
                onChange={handleProfilePictureUpload}
                style={{ display: 'none' }}
              />
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '600', color: 'white', margin: 0, marginBottom: '4px' }}>{currentUser.name}</h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', margin: 0 }}>{currentUser.email}</p>
            {currentUser.isAdmin && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: 'rgba(245, 158, 11, 0.2)',
                padding: '4px 8px',
                borderRadius: '50px',
                marginTop: '8px'
              }}>
                <Shield size={12} color="#F59E0B" />
                <span style={{ color: '#F59E0B', fontSize: '12px' }}>Community Admin</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input
              type="text"
              value={currentUser.name}
              onChange={(e) => setCurrentUser({...currentUser, name: e.target.value})}
              style={{
                width: '100%',
                background: 'rgba(100,100,100,0.3)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                padding: '12px',
                color: 'white',
                fontSize: '16px'
              }}
              placeholder="Your name"
            />
            <textarea
              value={currentUser.bio}
              onChange={(e) => setCurrentUser({...currentUser, bio: e.target.value})}
              placeholder="Share a little about yourself..."
              style={{
                width: '100%',
                background: 'rgba(100,100,100,0.3)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                padding: '12px',
                color: 'white',
                fontSize: '16px',
                height: '80px',
                resize: 'none'
              }}
            />
            <button
              onClick={() => setShowProfile(false)}
              style={{
                width: '100%',
                background: '#F5A01D',
                border: 'none',
                borderRadius: '12px',
                padding: '12px',
                color: 'white',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Admin Dashboard
  if (showAdminDashboard && currentUser.isAdmin) {
    return (
      <AdminDashboard 
        userEmail={currentUser.email}
        onClose={() => setShowAdminDashboard(false)}
      />
    );
  }

  // Admin Panel Modal
  if (showAdminPanel && currentUser.isAdmin) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #004990 0%, #F5A01D 100%)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          maxWidth: '400px',
          width: '100%',
          background: 'rgba(0,0,0,0.2)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.1)',
          padding: '30px'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Shield size={24} color="#F59E0B" />
              <h2 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white', margin: 0 }}>Admin Panel</h2>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.6)' }}>Send a message to all community members</p>
          </div>

          <form onSubmit={handleSendAdminMessage} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <textarea
              value={adminMessage}
              onChange={(e) => setAdminMessage(e.target.value)}
              placeholder="Write your announcement to the community..."
              style={{
                width: '100%',
                background: 'rgba(100,100,100,0.3)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                padding: '12px',
                color: 'white',
                fontSize: '16px',
                height: '120px',
                resize: 'none'
              }}
              required
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="submit"
                style={{
                  flex: 1,
                  background: '#F5A01D',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Megaphone size={16} />
                <span>Send to Everyone</span>
              </button>
              <button
                type="button"
                onClick={() => setShowAdminPanel(false)}
                style={{
                  padding: '12px 24px',
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.6)',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (currentView === "chat") {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #004990 0%, #F5A01D 100%)',
        color: 'white'
      }}>
        <header style={{
          position: 'sticky',
          top: 0,
          background: 'linear-gradient(90deg, #004990 0%, #F5A01D 100%)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255,255,255,0.2)',
          padding: '20px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
          zIndex: 50
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Logo Section */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '100px',
                height: '100px',
                background: 'white',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}>
                <img 
                  src="/SDRMLogo2016-3.svg" 
                  alt="SDRM Logo" 
                  style={{
                    width: '80px',
                    height: '80px',
                    objectFit: 'contain'
                  }}
                />
              </div>
              <div>
                <h1 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'white', margin: 0, textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
                  SAN DIEGO RESCUE MISSION
                </h1>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', margin: 0 }}>
                  One Life at a Time
                </p>
              </div>
            </div>
            
            {/* Right Side Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>

              {/* Journal Button */}
              <button
                onClick={() => {
                  setShowJournaling(!showJournaling);
                  if (!showJournaling) {
                    loadJournalEntries(); // Refresh entries when opening
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: showJournaling ? 'rgba(245, 160, 29, 0.3)' : 'rgba(255,255,255,0.2)',
                  border: 'none',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'background-color 0.3s',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <BookOpen size={16} color="white" />
                <span style={{ color: 'white', fontSize: '14px', display: window.innerWidth > 768 ? 'inline' : 'none' }}>Journal</span>
              </button>

              {currentUser.isAdmin && (
                <>
                  <button
                    onClick={() => setShowAdminDashboard(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'linear-gradient(45deg, #F5A01D, #FDB44B)',
                      border: '2px solid rgba(255,255,255,0.3)',
                      padding: '10px 16px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      backdropFilter: 'blur(10px)',
                      boxShadow: '0 4px 15px rgba(245, 160, 29, 0.3)'
                    }}
                  >
                    <Shield size={16} color="white" />
                    <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold', display: window.innerWidth > 768 ? 'inline' : 'none' }}>Admin Dashboard</span>
                  </button>
                  <button
                    onClick={() => setShowAdminPanel(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'rgba(255,255,255,0.2)',
                      border: 'none',
                      padding: '10px 16px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    <Megaphone size={16} color="white" />
                    <span style={{ color: 'white', fontSize: '14px', display: window.innerWidth > 768 ? 'inline' : 'none' }}>Announce</span>
                  </button>
                </>
              )}
              
              {/* User Profile */}
              <div 
                style={{
                  width: '40px',
                  height: '40px',
                  background: currentUser.profilePicture ? 'transparent' : 'rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background-color 0.3s',
                  overflow: 'hidden',
                  border: currentUser.profilePicture ? '2px solid rgba(255,255,255,0.3)' : 'none'
                }}
                onClick={() => setShowProfile(true)}
              >
                {currentUser.profilePicture ? (
                  <img 
                    src={currentUser.profilePicture} 
                    alt="Profile" 
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <User size={20} color="white" />
                )}
              </div>
              
              {/* Sign Out Button */}
              <button 
                onClick={() => setCurrentView("auth")}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'white',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background-color 0.3s',
                  backdropFilter: 'blur(10px)'
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
          {/* Daily Encouragement Section */}
          <div style={{
            marginBottom: '20px',
            background: 'linear-gradient(90deg, rgba(245, 160, 29, 0.3) 0%, rgba(0, 73, 144, 0.3) 100%)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            border: '1px solid rgba(245, 160, 29, 0.2)',
            padding: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <BookOpen size={24} color="#F5A01D" style={{ marginTop: '4px' }} />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <h3 style={{ fontWeight: '600', color: '#F5A01D', margin: 0 }}>Daily Encouragement</h3>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </span>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.9)', fontStyle: 'italic', marginBottom: '8px', margin: 0 }}>"{todaysVerse.text}"</p>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: 0 }}>- {todaysVerse.reference}</p>
              </div>
            </div>
          </div>

          {/* Community Sharing Section */}
          <div style={{
            marginBottom: '20px',
            background: 'rgba(0,0,0,0.2)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '30px'
          }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: 'white', marginBottom: '20px' }}>Share with the Community</h2>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>What would you like to share?</span>
              <select
                value={messageType}
                onChange={(e) => setMessageType(e.target.value)}
                style={{
                  background: 'rgba(100,100,100,0.3)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  padding: '4px 8px',
                  color: 'white',
                  fontSize: '14px'
                }}
              >
                <option value="post">💬 Post</option>
                <option value="prayer_request">🙏 Prayer Request</option>
                <option value="praise_report">⭐ Praise Report</option>
                <option value="encouragement">💝 Encouragement</option>
              </select>
            </div>

            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px' }}>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={
                  messageType === "prayer_request" 
                    ? "Share what you need prayer for..."
                    : messageType === "praise_report"
                    ? "Share how God has blessed you..."
                    : messageType === "encouragement"
                    ? "Share some encouragement with the community..."
                    : "What's on your heart today? Share with your community..."
                }
                style={{
                  flex: 1,
                  background: 'rgba(100,100,100,0.3)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  padding: '12px',
                  color: 'white',
                  fontSize: '16px',
                  resize: 'none',
                  height: '80px'
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
              />
              <button 
                type="submit"
                disabled={saving}
                style={{
                  background: saving ? 'rgba(245, 160, 29, 0.5)' : '#F5A01D',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  alignSelf: 'flex-end'
                }}
              >
                <Send size={16} color="white" />
              </button>
            </form>
          </div>

          <div style={{
            background: 'rgba(0,0,0,0.2)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '30px'
          }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: 'white', marginBottom: '20px' }}>Community Support</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '30px', maxHeight: '400px', overflowY: 'auto' }}>
              {messages.map((msg) => (
                <div key={msg.id} style={{
                  borderRadius: '12px',
                  padding: '20px',
                  background: msg.type === "support_request" 
                    ? 'linear-gradient(90deg, rgba(0, 73, 144, 0.3) 0%, rgba(245, 160, 29, 0.3) 100%)'
                    : msg.type === "admin_announcement"
                    ? 'linear-gradient(90deg, rgba(245, 158, 11, 0.3) 0%, rgba(245, 160, 29, 0.3) 100%)'
                    : 'rgba(100,100,100,0.3)',
                  borderLeft: msg.type === "support_request" ? '4px solid #F5A01D' : msg.type === "admin_announcement" ? '4px solid #F59E0B' : 'none'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      background: (msg.user === currentUser.name && currentUser.profilePicture) ? 'transparent' : '#F5A01D',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden'
                    }}>
                      {(msg.user === currentUser.name && currentUser.profilePicture) ? (
                        <img 
                          src={currentUser.profilePicture} 
                          alt="Profile" 
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <User size={20} color="white" />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '500', color: 'white' }}>{msg.user}</span>
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{msg.time}</span>
                        {msg.isAdmin && (
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'rgba(245, 158, 11, 0.2)',
                            padding: '2px 6px',
                            borderRadius: '50px'
                          }}>
                            <Shield size={12} color="#F59E0B" />
                            <span style={{ color: '#F59E0B', fontSize: '12px' }}>Admin</span>
                          </div>
                        )}
                        {msg.type === "support_request" && <Heart size={16} color="#F5A01D" />}
                        {msg.type === "admin_announcement" && <Megaphone size={16} color="#F59E0B" />}
                      </div>
                      <p style={{ color: 'rgba(255,255,255,0.9)', marginBottom: '12px', margin: 0 }}>{msg.message}</p>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button
                          onClick={() => handleLikeMessage(msg.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '14px',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'color 0.3s',
                            color: msg.loved ? "#F5A01D" : "rgba(255,255,255,0.4)"
                          }}
                        >
                          <Heart size={16} fill={msg.loved ? "#F5A01D" : "none"} />
                          <span>{msg.likes > 0 ? msg.likes : "Support"}</span>
                        </button>
                        
                        <button
                          onClick={() => handleReply(msg.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '14px',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'rgba(255,255,255,0.4)',
                            transition: 'color 0.3s'
                          }}
                        >
                          <MessageCircle size={16} />
                          <span>Reply</span>
                        </button>
                        
                        {msg.replies.length > 0 && (
                          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
                            {msg.replies.length} {msg.replies.length === 1 ? "reply" : "replies"}
                          </span>
                        )}
                      </div>

                      {msg.replies.length > 0 && (
                        <div style={{ marginTop: '12px', marginLeft: '16px', borderLeft: '2px solid rgba(100,100,100,0.3)', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {msg.replies.map((reply) => (
                            <div key={reply.id} style={{ background: 'rgba(100,100,100,0.2)', borderRadius: '8px', padding: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                <div style={{
                                  width: '24px',
                                  height: '24px',
                                  background: '#004990',
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  <User size={12} color="white" />
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <span style={{ fontWeight: '500', color: 'white', fontSize: '14px' }}>{reply.user}</span>
                                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{reply.time}</span>
                                  </div>
                                  <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', margin: 0 }}>{reply.message}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {replyingTo === msg.id && (
                        <div style={{ marginTop: '12px', marginLeft: '16px', borderLeft: '2px solid #F5A01D', paddingLeft: '16px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                              type="text"
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Write a reply..."
                              style={{
                                flex: 1,
                                background: 'rgba(100,100,100,0.3)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: '8px',
                                padding: '8px 12px',
                                color: 'white',
                                fontSize: '14px'
                              }}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  handleSendReply(msg.id);
                                }
                              }}
                            />
                            <button
                              onClick={() => handleSendReply(msg.id)}
                              style={{
                                background: '#F5A01D',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '8px 12px',
                                cursor: 'pointer'
                              }}
                            >
                              <Reply size={16} color="white" />
                            </button>
                            <button
                              onClick={() => setReplyingTo(null)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'rgba(255,255,255,0.4)',
                                cursor: 'pointer',
                                padding: '8px'
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>

          <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={{
              background: 'rgba(0,0,0,0.2)',
              backdropFilter: 'blur(10px)',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid rgba(255,255,255,0.1)',
              textAlign: 'center'
            }}>
              <Heart size={24} color="#F5A01D" style={{ marginBottom: '8px' }} />
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white', margin: 0 }}>{statistics.supportRequests}</p>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: 0 }}>Support Requests</p>
            </div>
            
            <div style={{
              background: 'rgba(0,0,0,0.2)',
              backdropFilter: 'blur(10px)',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid rgba(255,255,255,0.1)',
              textAlign: 'center'
            }}>
              <Star size={24} color="#F59E0B" style={{ marginBottom: '8px' }} />
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white', margin: 0 }}>{statistics.victoryReports}</p>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: 0 }}>Victory Reports</p>
            </div>
            
            <div style={{
              background: 'rgba(0,0,0,0.2)',
              backdropFilter: 'blur(10px)',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid rgba(255,255,255,0.1)',
              textAlign: 'center'
            }}>
              <Users size={24} color="#F5A01D" style={{ marginBottom: '8px' }} />
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white', margin: 0 }}>{statistics.activeMembers}</p>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: 0 }}>Active Members</p>
            </div>
          </div>
        </div>

        {/* Journal Modal Overlay */}
        {showJournaling && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(10px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(0, 73, 144, 0.9), rgba(245, 160, 29, 0.9))',
              borderRadius: '20px',
              padding: '30px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <BookOpen size={28} color="white" />
                  <div>
                    <h2 style={{ color: 'white', margin: 0, fontSize: '1.5rem', fontWeight: '600' }}>Private Journal</h2>
                    <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '14px' }}>
                      {journalMode === 'free' ? 'Free writing and personal reflection' : 'Daily prompts for spiritual reflection'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowJournaling(false)}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    color: 'white',
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    fontSize: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ×
                </button>
              </div>

              {/* Journal Mode Toggle */}
              <div style={{ 
                display: 'flex', 
                gap: '8px', 
                marginBottom: '20px',
                padding: '4px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '8px'
              }}>
                <button
                  onClick={() => setJournalMode('free')}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    background: journalMode === 'free' ? 'rgba(255,255,255,0.9)' : 'transparent',
                    color: journalMode === 'free' ? '#004990' : 'rgba(255,255,255,0.8)',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Free Journal
                </button>
                <button
                  onClick={() => setJournalMode('guided')}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    background: journalMode === 'guided' ? 'rgba(255,255,255,0.9)' : 'transparent',
                    color: journalMode === 'guided' ? '#004990' : 'rgba(255,255,255,0.8)',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Guided Prompts
                </button>
              </div>

              {journalMode === 'guided' && (
                <div style={{ 
                  background: 'rgba(255,255,255,0.15)', 
                  borderRadius: '12px', 
                  padding: '20px',
                  marginBottom: '20px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.9)', margin: 0, fontWeight: '500' }}>
                      Today's Prompt ({currentJournalPrompt + 1} of {journalPrompts.length})
                    </p>
                    <button
                      onClick={() => setCurrentJournalPrompt((currentJournalPrompt + 1) % journalPrompts.length)}
                      style={{
                        background: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        border: '1px solid rgba(255,255,255,0.3)',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '14px',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                    >
                      Next Prompt
                    </button>
                  </div>
                  <p style={{ 
                    color: 'white', 
                    fontStyle: 'italic',
                    margin: 0,
                    fontSize: '18px',
                    lineHeight: '1.4'
                  }}>
                    "{journalPrompts[currentJournalPrompt]}"
                  </p>
                </div>
              )}

              {journalMode === 'free' && (
                <div style={{ 
                  background: 'rgba(255,255,255,0.15)', 
                  borderRadius: '12px', 
                  padding: '20px',
                  marginBottom: '20px',
                  textAlign: 'center'
                }}>
                  <p style={{ 
                    color: 'white', 
                    margin: 0,
                    fontSize: '16px',
                    lineHeight: '1.4'
                  }}>
                    ✍️ Write freely about whatever is on your heart today
                  </p>
                </div>
              )}
              
              <textarea 
                value={journalText}
                onChange={(e) => setJournalText(e.target.value)}
                placeholder={journalMode === 'free' ? "Write about whatever is on your heart today..." : "Reflect on the prompt above and write your thoughts and prayers here..."}
                style={{
                  width: '100%',
                  minHeight: '200px',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  fontSize: '16px',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  marginBottom: '20px'
                }}
              />
              
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button 
                  onClick={saveJournalEntry}
                  disabled={saving}
                  style={{
                    background: saving ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.9)',
                    color: '#004990',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontSize: '16px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    flex: '1',
                    minWidth: '120px'
                  }}
                >
                  {saving ? 'Saving...' : 'Save Entry'}
                </button>
                <button 
                  onClick={() => {
                    console.log("View Past Entries clicked, current state:", showPastEntries);
                    setShowPastEntries(!showPastEntries);
                    if (!showPastEntries) {
                      console.log("Loading journal entries...");
                      loadJournalEntries();
                    }
                  }}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.3)',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontSize: '16px',
                    cursor: 'pointer',
                    fontWeight: '500',
                    flex: '1',
                    minWidth: '120px'
                  }}>
                  {showPastEntries ? 'Hide Past Entries' : 'View Past Entries'}
                </button>
              </div>
              
              {/* Past Entries Section */}
              {showPastEntries && (
                <div style={{
                  marginTop: '20px',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '20px',
                  maxHeight: '400px',
                  overflowY: 'auto'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <h3 style={{ color: 'white', margin: 0 }}>
                      Your Past Journal Entries ({journalEntries.length})
                    </h3>
                    <button
                      onClick={() => {
                        console.log("Manual refresh clicked");
                        loadJournalEntries();
                      }}
                      style={{
                        background: '#F5A01D',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      Refresh
                    </button>
                  </div>
                  
                  {journalEntries.length === 0 ? (
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', margin: 0 }}>
                      No journal entries found. Start writing to see your entries here!
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {journalEntries.map((entry, index) => (
                        <div key={entry.id || index} style={{
                          background: 'rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                          padding: '16px',
                          border: '1px solid rgba(255,255,255,0.2)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ 
                              fontSize: '12px', 
                              color: 'rgba(255,255,255,0.6)',
                              textTransform: 'capitalize'
                            }}>
                              {entry.mode || 'free'} journal • {entry.createdAt ? new Date(entry.createdAt.toDate?.() || entry.createdAt).toLocaleDateString() : 'Recent'}
                            </span>
                          </div>
                          
                          {entry.prompt && (
                            <p style={{ 
                              fontSize: '14px', 
                              color: 'rgba(255,255,255,0.8)', 
                              fontStyle: 'italic',
                              marginBottom: '8px',
                              margin: '0 0 8px 0'
                            }}>
                              Prompt: "{entry.prompt}"
                            </p>
                          )}
                          
                          <p style={{ 
                            color: 'white', 
                            margin: 0,
                            fontSize: '15px',
                            lineHeight: '1.4'
                          }}>
                            {entry.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #004990 0%, #F5A01D 100%)',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{ maxWidth: '400px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: '120px',
            height: '120px',
            background: 'white',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
          }}>
            <img 
              src="/SDRMLogo2016-3.svg" 
              alt="San Diego Rescue Mission Logo" 
              style={{
                width: '90px',
                height: '90px',
                objectFit: 'contain'
              }}
            />
          </div>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '10px',
            textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
          }}>
            SAN DIEGO RESCUE MISSION
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.8)' }}>
            One Life at a Time
          </p>
        </div>

        <div style={{
          background: 'rgba(0,0,0,0.2)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.1)',
          padding: '30px'
        }}>
          <div style={{ display: 'flex', marginBottom: '30px' }}>
            <button
              onClick={() => setAuthMode("login")}
              style={{
                flex: 1,
                padding: '10px 20px',
                borderRadius: '10px',
                border: 'none',
                background: authMode === "login" ? '#F5A01D' : 'transparent',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => setAuthMode("signup")}
              style={{
                flex: 1,
                padding: '10px 20px',
                borderRadius: '10px',
                border: 'none',
                background: authMode === "signup" ? '#F5A01D' : 'transparent',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
            >
              Join Us
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {authMode === "signup" && (
              <input 
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Full Name" 
                style={{
                  width: '100%',
                  background: 'rgba(100,100,100,0.3)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  padding: '15px',
                  color: 'white',
                  fontSize: '16px'
                }}
                required 
              />
            )}
            <input 
              type="email" 
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Email" 
              style={{
                width: '100%',
                background: 'rgba(100,100,100,0.3)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                padding: '15px',
                color: 'white',
                fontSize: '16px'
              }}
              required 
            />
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Password" 
                style={{
                  width: '100%',
                  background: 'rgba(100,100,100,0.3)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  padding: '15px',
                  paddingRight: '50px',
                  color: 'white',
                  fontSize: '16px'
                }}
                required 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '15px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.6)',
                  cursor: 'pointer'
                }}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <button 
              type="submit"
              style={{
                width: '100%',
                background: '#F5A01D',
                border: 'none',
                borderRadius: '12px',
                padding: '15px',
                color: 'white',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
            >
              {authMode === "login" ? "Sign In" : "Join San Diego Rescue Mission"}
            </button>
          </form>
          
          <div style={{
            marginTop: '20px',
            padding: '15px',
            background: 'rgba(100,100,100,0.2)',
            borderRadius: '10px',
            border: '1px solid rgba(100,100,100,0.3)'
          }}>
            <p style={{
              fontSize: '12px',
              color: 'rgba(255,255,255,0.7)',
              textAlign: 'center',
              margin: 0
            }}>
              Admin access: schacht.dan@gmail.com or daniel@sdrescuemission.org
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;