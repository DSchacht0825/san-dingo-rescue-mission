import React, { useState, useEffect } from "react";
import { Heart, User, Mail, Lock, Eye, EyeOff, Send, Star, Users, BookOpen, MessageCircle, Reply, Camera, Shield, Megaphone, ArrowLeft, Search, Phone, Video, MoreHorizontal } from "lucide-react";
import { db } from "./firebase";
import { collection, addDoc, serverTimestamp, query, where, orderBy, getDocs } from "firebase/firestore";

function App() {
  const [currentView, setCurrentView] = useState("auth");
  const [authMode, setAuthMode] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showMessenger, setShowMessenger] = useState(false);
  const [currentChat, setCurrentChat] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showJournaling, setShowJournaling] = useState(false);
  const [currentJournalPrompt, setCurrentJournalPrompt] = useState(0);
  const [journalMode, setJournalMode] = useState("free"); // "free" or "guided"
  const [journalText, setJournalText] = useState("");
  const [newPostText, setNewPostText] = useState("");
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

  // Load statistics when user logs in
  useEffect(() => {
    if (currentView === "chat" && currentUser.email) {
      loadStatistics();
    }
  }, [currentView, currentUser.email]);

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


  // Save community post to Firestore
  const savePost = async () => {
    if (!newPostText.trim()) {
      alert("Please write something before posting.");
      return;
    }

    setSaving(true);
    try {
      await addDoc(collection(db, "posts"), {
        text: newPostText,
        userEmail: currentUser.email,
        userName: currentUser.name,
        timestamp: serverTimestamp(),
        createdAt: new Date(),
        type: "community_post",
        loved: false,
        replies: []
      });
      
      alert("Post shared successfully!");
      setNewPostText("");
    } catch (error) {
      console.error("Error saving post:", error);
      alert("Error saving post. Please try again.");
    } finally {
      setSaving(false);
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

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  // Community members with more detailed info
  const [communityMembers] = useState([
    { 
      id: 1, 
      name: "Sarah M.", 
      email: "sarah@example.com", 
      online: true, 
      lastSeen: "Active now",
      avatar: "bg-gradient-to-r from-pink-500 to-rose-500"
    },
    { 
      id: 2, 
      name: "David K.", 
      email: "david@example.com", 
      online: false, 
      lastSeen: "2 hours ago",
      avatar: "bg-gradient-to-r from-blue-500 to-cyan-500"
    },
    { 
      id: 3, 
      name: "Maria L.", 
      email: "maria@example.com", 
      online: true, 
      lastSeen: "Active now",
      avatar: "bg-gradient-to-r from-purple-500 to-violet-500"
    },
    { 
      id: 4, 
      name: "Pastor John", 
      email: "pastor@example.com", 
      online: true, 
      lastSeen: "Active now",
      avatar: "bg-gradient-to-r from-amber-500 to-orange-500"
    },
    { 
      id: 5, 
      name: "Rachel T.", 
      email: "rachel@example.com", 
      online: false, 
      lastSeen: "Yesterday",
      avatar: "bg-gradient-to-r from-emerald-500 to-teal-500"
    },
    { 
      id: 6, 
      name: "Michael C.", 
      email: "michael@example.com", 
      online: true, 
      lastSeen: "Active now",
      avatar: "bg-gradient-to-r from-indigo-500 to-purple-500"
    }
  ]);

  // Chat conversations with more realistic data
  const [chatConversations, setChatConversations] = useState({
    1: {
      messages: [
        { 
          id: 1, 
          sender: "Sarah M.", 
          message: "Hi there! 😊", 
          time: "10:30 AM", 
          isMe: false,
          timestamp: new Date(Date.now() - 3600000) // 1 hour ago
        },
        { 
          id: 2, 
          sender: "You", 
          message: "Hey Sarah! How are you doing?", 
          time: "10:32 AM", 
          isMe: true,
          timestamp: new Date(Date.now() - 3540000)
        },
        { 
          id: 3, 
          sender: "Sarah M.", 
          message: "I'm doing great! Thanks for your prayers yesterday 🙏 The job interview went really well!", 
          time: "10:35 AM", 
          isMe: false,
          timestamp: new Date(Date.now() - 3360000)
        },
        { 
          id: 4, 
          sender: "You", 
          message: "That's amazing news! I'm so happy for you. God is good! ✨", 
          time: "10:37 AM", 
          isMe: true,
          timestamp: new Date(Date.now() - 3240000)
        },
        { 
          id: 5, 
          sender: "Sarah M.", 
          message: "Yes, He really is! I felt such peace during the whole process. Thank you for being such a great prayer partner 💕", 
          time: "10:40 AM", 
          isMe: false,
          timestamp: new Date(Date.now() - 3000000)
        }
      ],
      lastMessage: "Yes, He really is! I felt such peace during the whole process. Thank you for being such a great prayer partner 💕",
      lastMessageTime: "10:40 AM",
      unread: 2
    },
    4: {
      messages: [
        { 
          id: 1, 
          sender: "Pastor John", 
          message: "Good morning! Hope you're having a blessed day 🌅", 
          time: "8:15 AM", 
          isMe: false,
          timestamp: new Date(Date.now() - 7200000)
        },
        { 
          id: 2, 
          sender: "You", 
          message: "Good morning Pastor! Yes, feeling very grateful today. How are the community outreach preparations going?", 
          time: "8:20 AM", 
          isMe: true,
          timestamp: new Date(Date.now() - 6900000)
        },
        { 
          id: 3, 
          sender: "Pastor John", 
          message: "They're going wonderfully! The community is so excited about our upcoming meal service. Your help with organizing has been such a blessing 🙏", 
          time: "8:25 AM", 
          isMe: false,
          timestamp: new Date(Date.now() - 6600000)
        }
      ],
      lastMessage: "They're going wonderfully! The community is so excited about our upcoming meal service.",
      lastMessageTime: "8:25 AM",
      unread: 0
    },
    3: {
      messages: [
        { 
          id: 1, 
          sender: "Maria L.", 
          message: "Hey! Did you see the community support request from David? 💙", 
          time: "Yesterday", 
          isMe: false,
          timestamp: new Date(Date.now() - 86400000)
        }
      ],
      lastMessage: "Hey! Did you see the community support request from David? 💙",
      lastMessageTime: "Yesterday",
      unread: 1
    }
  });
  
  const [messages, setMessages] = useState([
    {
      id: 1,
      user: "Sarah M.",
      message: "Good morning everyone! Starting my day with gratitude 🙏",
      time: "8:30 AM",
      type: "message",
      profilePicture: null,
      likes: 3,
      loved: false,
      replies: [],
      isAdmin: false
    },
    {
      id: 2,
      user: "David K.",
      message: "Please pray for my job interview today at 2 PM. I've been preparing for weeks and feeling nervous but trusting in God's plan.",
      time: "9:15 AM",
      type: "support_request",
      profilePicture: null,
      likes: 5,
      loved: false,
      replies: [
        {
          id: 1,
          user: "Maria L.",
          message: "Praying for you! You've got this! 💪",
          time: "9:18 AM",
          profilePicture: null
        }
      ],
      isAdmin: false
    },
    {
      id: 3,
      user: "Admin",
      message: "🌟 Welcome to San Diego Rescue Mission Community! This is a safe space for support, encouragement, and fellowship. Please be kind and supportive to one another.",
      time: "7:00 AM",
      type: "admin_announcement",
      profilePicture: null,
      likes: 8,
      loved: false,
      replies: [],
      isAdmin: true
    }
  ]);
  
  const [newMessage, setNewMessage] = useState("");
  const [messageType, setMessageType] = useState("post");
  const [adminMessage, setAdminMessage] = useState("");
  const [newChatMessage, setNewChatMessage] = useState("");

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

  const handleSendChatMessage = (e) => {
    e.preventDefault();
    if (newChatMessage.trim() && currentChat) {
      const newMsg = {
        id: Date.now(),
        sender: "You",
        message: newChatMessage,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isMe: true,
        timestamp: new Date()
      };
      
      setChatConversations(prev => ({
        ...prev,
        [currentChat]: {
          ...prev[currentChat],
          messages: [...(prev[currentChat]?.messages || []), newMsg],
          lastMessage: newChatMessage,
          lastMessageTime: newMsg.time
        }
      }));
      
      setNewChatMessage("");
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
      
      // Also add to local state for immediate display
      const message = {
        id: messages.length + 1,
        user: currentUser.name,
        message: newMessage,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: messageType,
        profilePicture: currentUser.profilePicture,
        likes: 0,
        loved: false,
        replies: [],
        isAdmin: currentUser.isAdmin
      };
      setMessages([...messages, message]);
      setNewMessage("");
      alert("Post shared successfully!");
      // Reload statistics after new post
      loadStatistics();
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

  const startChat = (memberId) => {
    setCurrentChat(memberId);
    // Mark messages as read
    if (chatConversations[memberId]) {
      setChatConversations(prev => ({
        ...prev,
        [memberId]: {
          ...prev[memberId],
          unread: 0
        }
      }));
    }
  };

  const filteredMembers = communityMembers.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedChats = Object.entries(chatConversations)
    .map(([id, chat]) => ({
      id: parseInt(id),
      ...chat,
      member: communityMembers.find(m => m.id === parseInt(id))
    }))
    .sort((a, b) => {
      const aTime = a.messages[a.messages.length - 1]?.timestamp || 0;
      const bTime = b.messages[b.messages.length - 1]?.timestamp || 0;
      return new Date(bTime) - new Date(aTime);
    });

  // Messenger Interface
  if (showMessenger) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #004990 0%, #F5A01D 100%)',
        color: 'white',
        display: 'flex'
      }}>
        {/* Sidebar - Chat List */}
        <div style={{
          width: '320px',
          background: 'rgba(0,0,0,0.3)',
          backdropFilter: 'blur(10px)',
          borderRight: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', margin: 0 }}>Messages</h1>
              <button
                onClick={() => setShowMessenger(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.6)',
                  cursor: 'pointer',
                  padding: '5px'
                }}
              >
                <ArrowLeft size={20} />
              </button>
            </div>
            
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search style={{
                position: 'absolute',
                left: '12px',
                top: '12px',
                width: '16px',
                height: '16px',
                color: 'rgba(255,255,255,0.4)'
              }} />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(100,100,100,0.3)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  paddingLeft: '40px',
                  paddingRight: '16px',
                  paddingTop: '10px',
                  paddingBottom: '10px',
                  color: 'white',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          {/* Chat List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {sortedChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => startChat(chat.id)}
                style={{
                  padding: '12px',
                  cursor: 'pointer',
                  transition: 'background-color 0.3s',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  backgroundColor: currentChat === chat.id ? 'rgba(255,255,255,0.1)' : 'transparent'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = currentChat === chat.id ? 'rgba(255,255,255,0.1)' : 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ position: 'relative' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      background: '#F5A01D',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <User size={24} color="white" />
                    </div>
                    {chat.member?.online && (
                      <div style={{
                        position: 'absolute',
                        bottom: '-2px',
                        right: '-2px',
                        width: '16px',
                        height: '16px',
                        background: '#10B981',
                        borderRadius: '50%',
                        border: '2px solid #1F2937'
                      }}></div>
                    )}
                  </div>
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <h3 style={{ fontWeight: '500', color: 'white', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chat.member?.name}</h3>
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{chat.lastMessageTime}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chat.lastMessage}</p>
                      {chat.unread > 0 && (
                        <span style={{
                          background: '#F5A01D',
                          color: 'white',
                          fontSize: '12px',
                          borderRadius: '50%',
                          padding: '2px 6px',
                          marginLeft: '8px'
                        }}>
                          {chat.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Chat Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {currentChat ? (
            <>
              {/* Chat Header */}
              <div style={{
                padding: '20px',
                background: 'rgba(0,0,0,0.2)',
                backdropFilter: 'blur(10px)',
                borderBottom: '1px solid rgba(255,255,255,0.1)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ position: 'relative' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        background: '#F5A01D',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <User size={20} color="white" />
                      </div>
                      {communityMembers.find(m => m.id === currentChat)?.online && (
                        <div style={{
                          position: 'absolute',
                          bottom: '-2px',
                          right: '-2px',
                          width: '12px',
                          height: '12px',
                          background: '#10B981',
                          borderRadius: '50%',
                          border: '2px solid #1F2937'
                        }}></div>
                      )}
                    </div>
                    <div>
                      <h2 style={{ fontWeight: '600', color: 'white', margin: 0 }}>{communityMembers.find(m => m.id === currentChat)?.name}</h2>
                      <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>{communityMembers.find(m => m.id === currentChat)?.lastSeen}</p>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button style={{ padding: '8px', background: 'none', border: 'none', borderRadius: '50%', cursor: 'pointer' }}>
                      <Phone size={20} color="rgba(255,255,255,0.4)" />
                    </button>
                    <button style={{ padding: '8px', background: 'none', border: 'none', borderRadius: '50%', cursor: 'pointer' }}>
                      <Video size={20} color="rgba(255,255,255,0.4)" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {(chatConversations[currentChat]?.messages || []).map((msg) => (
                  <div key={msg.id} style={{ display: 'flex', justifyContent: msg.isMe ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '70%',
                      padding: '12px 16px',
                      borderRadius: '18px',
                      background: msg.isMe ? '#F5A01D' : 'rgba(100,100,100,0.3)',
                      color: 'white'
                    }}>
                      <p style={{ fontSize: '14px', margin: 0, marginBottom: '4px' }}>{msg.message}</p>
                      <p style={{
                        fontSize: '12px',
                        margin: 0,
                        color: msg.isMe ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)'
                      }}>
                        {msg.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <div style={{
                padding: '20px',
                background: 'rgba(0,0,0,0.2)',
                backdropFilter: 'blur(10px)',
                borderTop: '1px solid rgba(255,255,255,0.1)'
              }}>
                <form onSubmit={handleSendChatMessage} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="text"
                    value={newChatMessage}
                    onChange={(e) => setNewChatMessage(e.target.value)}
                    placeholder={`Message ${communityMembers.find(m => m.id === currentChat)?.name}...`}
                    style={{
                      flex: 1,
                      background: 'rgba(100,100,100,0.3)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '12px',
                      padding: '12px',
                      color: 'white',
                      fontSize: '16px'
                    }}
                  />
                  <button 
                    type="submit"
                    style={{
                      background: '#F5A01D',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '12px',
                      cursor: 'pointer',
                      transition: 'background-color 0.3s'
                    }}
                  >
                    <Send size={16} color="white" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            // No chat selected
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <MessageCircle size={64} color="rgba(255,255,255,0.4)" style={{ marginBottom: '16px' }} />
                <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: 'white', marginBottom: '8px' }}>Select a conversation</h2>
                <p style={{ color: 'rgba(255,255,255,0.4)' }}>Choose from your existing conversations or start a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

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
            <div style={{
              width: '96px',
              height: '96px',
              background: '#F5A01D',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              cursor: 'pointer'
            }}>
              <User size={48} color="white" />
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
              {/* Messenger Button */}
              <button
                onClick={() => setShowMessenger(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  transition: 'background-color 0.3s',
                  cursor: 'pointer',
                  position: 'relative',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <MessageCircle size={16} color="white" />
                <span style={{ color: 'white', fontSize: '14px', display: window.innerWidth > 768 ? 'inline' : 'none' }}>Messages</span>
                {Object.values(chatConversations).reduce((total, chat) => total + chat.unread, 0) > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    background: '#EF4444',
                    color: 'white',
                    fontSize: '12px',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {Object.values(chatConversations).reduce((total, chat) => total + chat.unread, 0)}
                  </span>
                )}
              </button>

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
                  <Shield size={16} color="white" />
                  <span style={{ color: 'white', fontSize: '14px', display: window.innerWidth > 768 ? 'inline' : 'none' }}>Admin</span>
                </button>
              )}
              
              {/* User Profile */}
              <div 
                style={{
                  width: '40px',
                  height: '40px',
                  background: 'rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background-color 0.3s'
                }}
                onClick={() => setShowProfile(true)}
              >
                <User size={20} color="white" />
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
                      background: '#F5A01D',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <User size={20} color="white" />
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