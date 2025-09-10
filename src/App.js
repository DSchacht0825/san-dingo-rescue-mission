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
import { Eye, EyeOff, Bell, BellOff, Shield, Megaphone, User, Heart, MessageCircle, Reply, Star, Users, BookOpen, HelpCircle } from "lucide-react";
import { db } from "./firebase";
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, limit, startAfter, getDoc, doc } from "firebase/firestore";
import AdminDashboard from "./AdminDashboard";
import { PureUpload } from "./PureUpload";
import Header from "./components/Header";
import DailyVerse from "./components/DailyVerse";
import PostForm from "./components/PostForm";
import PostList from "./components/PostList";
import Statistics from "./components/Statistics";
import "./ResponsiveHeader.css";

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
  
  // Help modal state
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [helpMessage, setHelpMessage] = useState("");
  const [helpSubmitting, setHelpSubmitting] = useState(false);
  
  // Password reset modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);
  
  // Profile picture state
  const [uploading, setUploading] = useState(false);
  
  // PWA Installation state
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  
  // Push Notifications state
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  // const fileInputRef = useRef(null); // Removed - not needed with SimpleUpload
  
  // Statistics state
  const [statistics, setStatistics] = useState({
    supportRequests: 0,
    victoryReports: 0,
    activeMembers: 0
  });
  
  // Debug state initialization
  console.log("App component rendered, showPastEntries state:", showPastEntries);
  
  // Admin emails (super admins)
  const adminEmails = [
    "schacht.dan@gmail.com",
    "daniel@sdrescuemission.org",
    "dschacht@sdrescue.org"
  ];

  // Function to check if user is admin (checks both static and Firestore admin lists)
  const checkIsAdmin = async (email) => {
    // First check if user is a super admin
    if (adminEmails.includes(email.toLowerCase())) {
      return true;
    }

    // Then check Firestore admin list
    try {
      const adminDoc = await getDoc(doc(db, 'settings', 'admins'));
      if (adminDoc.exists()) {
        const adminData = adminDoc.data();
        const adminList = adminData.admins || [];
        return adminList.some(admin => admin.email.toLowerCase() === email.toLowerCase());
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
    }

    return false;
  };

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



  // Load posts from Firestore with pagination
  const loadPosts = async (loadMore = false) => {
    try {
      console.log(loadMore ? "Loading more posts..." : "Loading initial posts...");
      
      let q;
      if (loadMore && lastPostDoc) {
        // Load more posts starting after the last document
        q = query(
          collection(db, "posts"),
          orderBy("createdAt", "desc"),
          startAfter(lastPostDoc),
          limit(POSTS_PER_PAGE)
        );
      } else {
        // Load initial posts
        q = query(
          collection(db, "posts"),
          orderBy("createdAt", "desc"),
          limit(POSTS_PER_PAGE)
        );
      }
      
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
      
      // Update last document for pagination
      const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
      setLastPostDoc(lastVisible);
      
      // Check if there are more posts to load
      setHasMorePosts(querySnapshot.docs.length === POSTS_PER_PAGE);
      
      if (loadMore) {
        // Append new posts to existing ones
        setMessages(prevMessages => [...prevMessages, ...posts]);
        console.log(`Loaded ${posts.length} more posts. Total: ${messages.length + posts.length}`);
      } else {
        // Replace all posts (initial load)
        setMessages(posts);
        console.log(`Loaded ${posts.length} initial posts from Firestore`);
      }
      
    } catch (error) {
      console.error("Error loading posts:", error);
      if (!loadMore) {
        // Set default posts only on initial load error
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
    }
  };

  // Load more posts function
  const loadMorePosts = async () => {
    if (!hasMorePosts || loadingMore) return;
    
    setLoadingMore(true);
    await loadPosts(true);
    setLoadingMore(false);
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


  // Handle profile picture upload

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    subscribeNewsletter: true
  });

  // Load posts and statistics when user logs in
  useEffect(() => {
    if (currentView === "chat" && currentUser.email) {
      loadPosts();
      loadStatistics();
    }
  }, [currentView, currentUser.email]);

  // Session timeout - auto logout after 2 hours of inactivity
  useEffect(() => {
    if (currentView === "chat") {
      // Update activity timestamp on any user action
      const updateActivity = () => {
        localStorage.setItem('lastActivity', Date.now().toString());
      };
      
      // Set initial activity
      updateActivity();
      
      // Track user activity
      window.addEventListener('click', updateActivity);
      window.addEventListener('keydown', updateActivity);
      window.addEventListener('scroll', updateActivity);
      
      // Check for timeout every 5 minutes
      const timeoutCheck = setInterval(() => {
        const lastActivity = localStorage.getItem('lastActivity');
        const twoHours = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
        
        if (lastActivity && Date.now() - parseInt(lastActivity) > twoHours) {
          alert("Your session has expired for security. Please log in again.");
          setCurrentView("auth");
          // Clear user data
          setCurrentUser({
            name: "You",
            email: "",
            profilePicture: null,
            isAdmin: false,
            bio: ""
          });
        }
      }, 5 * 60 * 1000); // Check every 5 minutes
      
      // Cleanup
      return () => {
        window.removeEventListener('click', updateActivity);
        window.removeEventListener('keydown', updateActivity);
        window.removeEventListener('scroll', updateActivity);
        clearInterval(timeoutCheck);
      };
    }
  }, [currentView]);

  // PWA Installation setup
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowInstallButton(false);
      console.log('PWA was installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // For Safari/iOS - always show button since there's no beforeinstallprompt
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
    
    if (isIOS && !isInStandaloneMode) {
      setShowInstallButton(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Handle PWA installation
  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // For Chrome/Android - use the deferred prompt
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
        setDeferredPrompt(null);
        setShowInstallButton(false);
      }
    } else {
      // For Safari/iOS - show instructions
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        alert('To install this app on your iOS device:\n\n1. Tap the Share button (box with arrow)\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add" to confirm');
      } else {
        alert('To install this app:\n\nDesktop: Look for the install icon in your address bar\nMobile: Open in Chrome and look for "Add to Home Screen" in the menu');
      }
    }
  };

  // Push Notifications setup
  useEffect(() => {
    // Check if notifications are supported
    if ('Notification' in window && 'serviceWorker' in navigator) {
      // Check current permission status
      if (Notification.permission === 'granted') {
        setNotificationsEnabled(true);
        subscribeToNotifications();
      } else if (Notification.permission === 'default') {
        // Show prompt to user after they're logged in
        if (currentUser.email) {
          setTimeout(() => {
            setShowNotificationPrompt(true);
          }, 5000); // Show after 5 seconds of being logged in
        }
      }
    }
  }, [currentUser.email]);

  // Subscribe to push notifications
  const subscribeToNotifications = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: 'BEl62iUYgUivyDojlY_U5B7s-8jNxN7oYBQq1UuE2-7V3QqY8hQ6GGlYkHiSULNhgHa4s9rWVq8qRLyL5K8QhAA' // You'll need to generate this
      });

      console.log('Push subscription:', subscription);
      
      // Save subscription to Firestore for sending notifications
      await addDoc(collection(db, 'push_subscriptions'), {
        subscription: subscription.toJSON(),
        userEmail: currentUser.email,
        createdAt: serverTimestamp(),
        isActive: true
      });

      setNotificationsEnabled(true);
      setShowNotificationPrompt(false);
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
    }
  };

  // Request notification permission
  const requestNotificationPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        subscribeToNotifications();
      } else {
        setShowNotificationPrompt(false);
        console.log('Notification permission denied');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  // Send a test notification (for demo purposes)
  const sendTestNotification = () => {
    if (notificationsEnabled) {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification('SDRM Community', {
          body: 'Welcome to the San Diego Rescue Mission Community! 🙏',
          icon: '/sdrm-logo-192.png',
          badge: '/sdrm-logo-192.png',
          tag: 'welcome-notification'
        });
      });
    }
  };

  
  const [messages, setMessages] = useState([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [lastPostDoc, setLastPostDoc] = useState(null);
  const POSTS_PER_PAGE = 25;
  
  const [newMessage, setNewMessage] = useState("");
  const [messageType, setMessageType] = useState("post");
  const [adminMessage, setAdminMessage] = useState("");

  // Initialize user database from localStorage or use defaults
  const initializeUserDatabase = () => {
    const saved = localStorage.getItem('userDatabase');
    if (saved) {
      return JSON.parse(saved);
    }
    
    // Default accounts
    const defaultDB = {
      "schacht.dan@gmail.com": { 
        password: "admin123", 
        name: "Daniel Schacht",
        isAdmin: true 
      },
      "daniel@sdrescuemission.org": { 
        password: "mission2025", 
        name: "Daniel - SDRM",
        isAdmin: true 
      },
      "test@example.com": { 
        password: "test123", 
        name: "Test User",
        isAdmin: false 
      },
      "headshotwaco@gmail.com": { 
        password: "headshot123", 
        name: "Community Member",
        isAdmin: false 
      }
    };
    
    // Save defaults to localStorage
    localStorage.setItem('userDatabase', JSON.stringify(defaultDB));
    return defaultDB;
  };

  const [userDatabase, setUserDatabase] = useState(initializeUserDatabase);

  // Function to update current user's admin status in real-time
  const updateCurrentUserAdmin = (isAdmin) => {
    setCurrentUser(prevUser => ({
      ...prevUser,
      isAdmin: isAdmin
    }));
  };

  // Save userDatabase to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('userDatabase', JSON.stringify(userDatabase));
  }, [userDatabase]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const email = formData.email.toLowerCase();
    const password = formData.password;
    const name = formData.name;
    
    if (authMode === "signup") {
      // Handle signup
      console.log('Signup attempt:', { name, email, password: password ? 'provided' : 'missing' });
      
      if (!name || !email || !password) {
        alert("Please fill in all fields");
        return;
      }
      
      if (userDatabase[email]) {
        console.log('User already exists:', email);
        alert("User already exists. Please use a different email or sign in instead.");
        return;
      }
      
      // Check if new user should be admin
      const isNewUserAdmin = await checkIsAdmin(email);
      
      // Add new user to database (in production, hash the password)
      const newUserDatabase = {
        ...userDatabase,
        [email]: {
          password: password,
          name: name,
          isAdmin: isNewUserAdmin
        }
      };
      
      console.log('Creating new user:', email, 'Database size before:', Object.keys(userDatabase).length);
      setUserDatabase(newUserDatabase);
      console.log('Database size after:', Object.keys(newUserDatabase).length);
      
      // Save to newsletter list if subscribed
      if (formData.subscribeNewsletter) {
        try {
          await addDoc(collection(db, "newsletter_subscribers"), {
            email: email,
            name: name,
            subscribedAt: serverTimestamp(),
            createdAt: new Date(),
            isActive: true,
            source: "signup"
          });
          console.log('Added to newsletter list:', email);
        } catch (error) {
          console.error('Error adding to newsletter:', error);
          // Don't block signup if newsletter fails
        }
      }
      
      alert("Account created successfully! You can now sign in.");
      setAuthMode("login");
      setFormData({ name: "", email: "", password: "", confirmPassword: "", subscribeNewsletter: true });
      return;
    }
    
    // Handle login
    if (!email || !password) {
      alert("Please enter both email and password");
      return;
    }
    
    const user = userDatabase[email];
    if (!user || user.password !== password) {
      alert("Invalid email or password. Please try again.");
      return;
    }
    
    // Load user-specific profile picture
    const userProfiles = JSON.parse(localStorage.getItem('userProfiles') || '{}');
    const savedProfilePicture = userProfiles[email];
    
    // Check current admin status (from both static and Firestore)
    const isCurrentlyAdmin = await checkIsAdmin(email);
    
    // Successful login
    setCurrentUser({
      name: user.name,
      email: email,
      isAdmin: isCurrentlyAdmin,
      profilePicture: savedProfilePicture || null,
      bio: ""
    });
    
    if (isCurrentlyAdmin) {
      alert(`Welcome back, ${user.name}! You have full admin access to San Diego Rescue Mission Community.`);
    } else {
      alert(`Welcome to San Diego Rescue Mission Community, ${user.name}! Enjoy connecting with your support community.`);
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

  // Handle password reset
  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      alert("Please enter your email address");
      return;
    }

    setResetSubmitting(true);
    try {
      const email = resetEmail.toLowerCase();
      console.log('Looking for email:', email);
      console.log('Available emails:', Object.keys(userDatabase));
      
      const user = userDatabase[email];
      
      if (!user) {
        console.log('User not found for email:', email);
        alert("Email not found. Please check your email address or create an account.");
        return;
      }

      console.log('User found:', user);
      // In a real app, you'd send an email. For now, we'll show the password
      alert(`Password reset for ${email}\n\nYour password is: ${user.password}\n\n(In production, this would be sent via email)`);
      
      setResetEmail("");
      setShowResetModal(false);
      
    } catch (error) {
      console.error("Error resetting password:", error);
      alert("Sorry, there was an error resetting your password. Please try again.");
    } finally {
      setResetSubmitting(false);
    }
  };




  // COMMENTED OUT - Using SimpleUpload instead
  // const uploadProfilePicture = async (file) => { ... }
  // const handleFileSelect = (event) => { ... }


  // Handle help request submission
  const handleHelpSubmit = async (e) => {
    e.preventDefault();
    if (!helpMessage.trim()) {
      alert("Please enter a message");
      return;
    }

    setHelpSubmitting(true);
    try {
      // Save help request to Firestore
      await addDoc(collection(db, "help_requests"), {
        message: helpMessage,
        userEmail: currentUser.email,
        userName: currentUser.name,
        timestamp: serverTimestamp(),
        createdAt: new Date(),
        status: "pending",
        adminNotified: true
      });

      // Clear form and close modal
      setHelpMessage("");
      setShowHelpModal(false);
      
      // Show success message
      alert("Thank you for reaching out! A staff member will be in touch with you soon.");
    } catch (error) {
      console.error("Error submitting help request:", error);
      alert("Sorry, there was an error submitting your request. Please try again.");
    } finally {
      setHelpSubmitting(false);
    }
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
      
      // Reset pagination and reload posts after new post
      setLastPostDoc(null);
      setHasMorePosts(true);
      loadPosts(false); // Load initial posts (reset pagination)
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



  // Notification Permission Prompt
  if (showNotificationPrompt) {
    return (
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #8B5CF6, #A78BFA)',
          padding: '40px',
          borderRadius: '20px',
          maxWidth: '450px',
          width: '90%',
          textAlign: 'center',
          color: 'white',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
        }}>
          <Bell size={48} color="white" style={{ marginBottom: '20px' }} />
          <h2 style={{ margin: '0 0 20px 0', fontSize: '1.5rem' }}>
            Stay Connected with Your Community
          </h2>
          <p style={{ margin: '0 0 30px 0', fontSize: '16px', lineHeight: 1.5 }}>
            Get notified when there are new posts, prayer requests, or community updates. 
            You can change this setting anytime.
          </p>
          <div style={{ display: 'flex', gap: '15px', flexDirection: 'column' }}>
            <button
              onClick={requestNotificationPermission}
              style={{
                background: 'rgba(255,255,255,0.9)',
                color: '#8B5CF6',
                border: 'none',
                padding: '15px 30px',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              🔔 Enable Notifications
            </button>
            <button
              onClick={() => setShowNotificationPrompt(false)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                padding: '12px 30px',
                borderRadius: '10px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Profile Modal - Using PureUpload (ZERO Firebase)
  if (showProfile) {
    return <PureUpload 
      currentUser={currentUser}
      onSuccess={(url) => {
        // Update current user state
        setCurrentUser(prev => ({ ...prev, profilePicture: url }));
        setShowProfile(false);
      }}
      onClose={() => setShowProfile(false)}
    />;
  }
  

  // Admin Dashboard
  if (showAdminDashboard && currentUser.isAdmin) {
    return (
      <AdminDashboard 
        currentUser={currentUser}
        onClose={() => setShowAdminDashboard(false)}
        updateCurrentUserAdmin={updateCurrentUserAdmin}
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
        <Header 
          currentUser={currentUser}
          showInstallButton={showInstallButton}
          handleInstallClick={handleInstallClick}
          showJournaling={showJournaling}
          setShowJournaling={setShowJournaling}
          loadJournalEntries={loadJournalEntries}
          notificationsEnabled={notificationsEnabled}
          sendTestNotification={sendTestNotification}
          requestNotificationPermission={requestNotificationPermission}
          setShowHelpModal={setShowHelpModal}
          setShowAdminDashboard={setShowAdminDashboard}
          setShowAdminPanel={setShowAdminPanel}
          setShowProfile={setShowProfile}
          setCurrentView={setCurrentView}
        />

        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
          <DailyVerse todaysVerse={todaysVerse} />

          <PostForm
            messageType={messageType}
            setMessageType={setMessageType}
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            handleSendMessage={handleSendMessage}
            saving={saving}
          />

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

            {/* Load More Posts Button */}
            {hasMorePosts && (
              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <button
                  onClick={loadMorePosts}
                  disabled={loadingMore}
                  style={{
                    background: loadingMore ? 'rgba(245, 160, 29, 0.5)' : '#F5A01D',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px 24px',
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: loadingMore ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s'
                  }}
                >
                  {loadingMore ? 'Loading more posts...' : 'Load More Posts'}
                </button>
              </div>
            )}

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

        {/* Help Modal */}
        {showHelpModal && (
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
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.9), rgba(248, 113, 113, 0.9))',
              borderRadius: '20px',
              padding: '30px',
              maxWidth: '500px',
              width: '100%',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <HelpCircle size={28} color="white" />
                  <div>
                    <h2 style={{ color: 'white', margin: 0, fontSize: '1.5rem', fontWeight: '600' }}>Need Help?</h2>
                    <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '14px' }}>
                      We're here to support you
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowHelpModal(false);
                    setHelpMessage("");
                  }}
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

              <form onSubmit={handleHelpSubmit}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    color: 'rgba(255,255,255,0.9)', 
                    fontSize: '14px', 
                    fontWeight: '500',
                    display: 'block',
                    marginBottom: '8px'
                  }}>
                    How can we help you today?
                  </label>
                  <textarea
                    value={helpMessage}
                    onChange={(e) => setHelpMessage(e.target.value)}
                    placeholder="Please share what you need help with. Whether it's prayer, resources, or someone to talk to, we're here for you..."
                    required
                    style={{
                      width: '100%',
                      minHeight: '150px',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.2)',
                      background: 'rgba(255,255,255,0.1)',
                      color: 'white',
                      fontSize: '14px',
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                <div style={{ 
                  background: 'rgba(255,255,255,0.1)', 
                  borderRadius: '8px', 
                  padding: '12px',
                  marginBottom: '20px',
                  fontSize: '12px',
                  color: 'rgba(255,255,255,0.8)'
                }}>
                  <strong>Note:</strong> Your message will be sent directly to our administrative team. 
                  We treat all requests with confidentiality and care.
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="submit"
                    disabled={helpSubmitting}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: helpSubmitting ? 'rgba(255,255,255,0.3)' : 'white',
                      color: helpSubmitting ? 'rgba(239,68,68,0.5)' : '#EF4444',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: helpSubmitting ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s'
                    }}
                  >
                    {helpSubmitting ? 'Sending...' : 'Send Message'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowHelpModal(false);
                      setHelpMessage("");
                    }}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.3)',
                      background: 'transparent',
                      color: 'white',
                      fontSize: '16px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.3s'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
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
            
            {authMode === "login" && (
              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowResetModal(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: '14px',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Forgot Password?
                </button>
              </div>
            )}
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
              margin: 0,
              lineHeight: '1.4'
            }}>
              Need an account? Contact your administrator or use the "Join" option above.
            </p>
          </div>
        </div>
        
        {/* Password Reset Modal */}
        {showResetModal && (
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
              maxWidth: '400px',
              width: '100%',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ color: 'white', margin: 0, fontSize: '1.5rem', fontWeight: '600' }}>Reset Password</h2>
                  <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '14px' }}>
                    Enter your email to reset your password
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowResetModal(false);
                    setResetEmail("");
                  }}
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

              <form onSubmit={handlePasswordReset}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    color: 'rgba(255,255,255,0.9)', 
                    fontSize: '14px', 
                    fontWeight: '500',
                    display: 'block',
                    marginBottom: '8px'
                  }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="Enter your email address"
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.2)',
                      background: 'rgba(255,255,255,0.1)',
                      color: 'white',
                      fontSize: '16px',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                <div style={{ 
                  background: 'rgba(255,255,255,0.1)', 
                  borderRadius: '8px', 
                  padding: '12px',
                  marginBottom: '20px',
                  fontSize: '12px',
                  color: 'rgba(255,255,255,0.8)'
                }}>
                  <strong>Note:</strong> This will show your current password. In production, 
                  a reset link would be sent to your email.
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="submit"
                    disabled={resetSubmitting}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: resetSubmitting ? 'rgba(255,255,255,0.3)' : 'white',
                      color: resetSubmitting ? 'rgba(0,73,144,0.5)' : '#004990',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: resetSubmitting ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s'
                    }}
                  >
                    {resetSubmitting ? 'Resetting...' : 'Reset Password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowResetModal(false);
                      setResetEmail("");
                    }}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.3)',
                      background: 'transparent',
                      color: 'white',
                      fontSize: '16px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.3s'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;