/*
 * San Diego Rescue Mission - Admin Dashboard Component
 * Copyright © 2025 Daniel Schacht and San Diego Rescue Mission
 * All Rights Reserved
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  MessageSquare, 
  Heart, 
  Star, 
  Download, 
  RefreshCw, 
  BarChart3,
  Calendar,
  TrendingUp,
  Eye,
  EyeOff,
  Trash2,
  Shield
} from 'lucide-react';
import { db } from './firebase';
import { collection, getDocs, query, where, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';

const AdminDashboard = ({ currentUser, onClose }) => {
  const [reports, setReports] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState('');
  
  // Admin management state
  const [adminList, setAdminList] = useState([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');

  // Hardcoded super admins (cannot be removed)
  const superAdmins = [
    "schacht.dan@gmail.com",
    "daniel@sdrescuemission.org",
    "dschacht@sdrescue.org"
  ];
  
  const isAdmin = (email) => {
    return superAdmins.includes(email.toLowerCase()) || 
           adminList.some(admin => admin.email.toLowerCase() === email.toLowerCase());
  };

  // Load admin list from Firestore
  const loadAdminList = async () => {
    try {
      const adminDoc = await getDoc(doc(db, 'settings', 'admins'));
      if (adminDoc.exists()) {
        const adminData = adminDoc.data();
        setAdminList(adminData.admins || []);
      }
    } catch (error) {
      console.error('Error loading admin list:', error);
    }
  };

  // Add new admin
  const addAdmin = async () => {
    if (!newAdminEmail.trim()) {
      setError('Please enter an email address');
      return;
    }

    const emailToAdd = newAdminEmail.toLowerCase().trim();
    
    // Check if already a super admin
    if (superAdmins.includes(emailToAdd)) {
      setError('This user is already a super admin');
      return;
    }

    // Check if already in admin list
    if (adminList.some(admin => admin.email.toLowerCase() === emailToAdd)) {
      setError('This user is already an admin');
      return;
    }

    try {
      setLoading(true);
      const newAdmin = {
        email: emailToAdd,
        addedBy: currentUser.email,
        addedAt: new Date().toISOString(),
        name: 'New Admin' // Will be updated when they login
      };

      const updatedAdmins = [...adminList, newAdmin];
      
      // Save to Firestore
      await setDoc(doc(db, 'settings', 'admins'), {
        admins: updatedAdmins,
        lastModified: new Date().toISOString(),
        modifiedBy: currentUser.email
      });

      setAdminList(updatedAdmins);
      setNewAdminEmail('');
      setError('');
      
    } catch (error) {
      setError(`Failed to add admin: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Remove admin
  const removeAdmin = async (emailToRemove) => {
    if (superAdmins.includes(emailToRemove.toLowerCase())) {
      setError('Cannot remove super admin');
      return;
    }

    if (emailToRemove.toLowerCase() === currentUser.email.toLowerCase()) {
      setError('Cannot remove yourself');
      return;
    }

    try {
      setLoading(true);
      const updatedAdmins = adminList.filter(admin => 
        admin.email.toLowerCase() !== emailToRemove.toLowerCase()
      );
      
      // Save to Firestore
      await setDoc(doc(db, 'settings', 'admins'), {
        admins: updatedAdmins,
        lastModified: new Date().toISOString(),
        modifiedBy: currentUser.email
      });

      setAdminList(updatedAdmins);
      setError('');
      
    } catch (error) {
      setError(`Failed to remove admin: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Load dashboard data directly from Firestore
  const loadDashboardData = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('Loading dashboard data for admin:', currentUser.email);
      
      // Check admin privileges
      if (!isAdmin(currentUser.email)) {
        throw new Error('Admin access required');
      }

      // Get all posts directly from Firestore
      const postsSnapshot = await getDocs(collection(db, 'posts'));
      const posts = postsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Get all journal entries (count only for privacy)
      const journalSnapshot = await getDocs(collection(db, 'journalEntries'));

      // Process data for reports
      const uniqueUsers = new Set();
      const postsByType = {};
      const postsByDay = {};
      const recentActivity = [];

      posts.forEach(post => {
        // Track unique users
        if (post.userEmail) {
          uniqueUsers.add(post.userEmail);
        }

        // Group by type
        const type = post.type || 'post';
        postsByType[type] = (postsByType[type] || 0) + 1;

        // Group by day for activity chart
        const date = post.createdAt?.toDate?.() || new Date(post.createdAt);
        const dayKey = date.toISOString().split('T')[0];
        postsByDay[dayKey] = (postsByDay[dayKey] || 0) + 1;

        // Recent activity
        recentActivity.push({
          id: post.id,
          user: post.userName || 'Unknown',
          type: type,
          message: post.text?.substring(0, 100) + (post.text?.length > 100 ? '...' : ''),
          createdAt: date.toISOString()
        });
      });

      // Sort recent activity by date
      recentActivity.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Calculate metrics
      const totalPosts = posts.length;
      const activeUsers = uniqueUsers.size;
      const postsPerUser = activeUsers > 0 ? (totalPosts / activeUsers).toFixed(1) : 0;

      // Get date range for activity
      const dates = Object.keys(postsByDay).sort();
      const activityData = dates.slice(-30).map(date => ({
        date,
        posts: postsByDay[date] || 0
      }));

      const reportData = {
        generatedAt: new Date().toISOString(),
        generatedBy: currentUser.email,
        
        // Overview stats
        overview: {
          totalPosts,
          activeUsers,
          totalJournalEntries: journalSnapshot.size,
          postsPerUser: parseFloat(postsPerUser)
        },

        // Post breakdown by type
        postTypes: {
          posts: postsByType.post || 0,
          prayerRequests: postsByType.prayer_request || 0,
          praiseReports: postsByType.praise_report || 0,
          encouragement: postsByType.encouragement || 0,
          adminAnnouncements: postsByType.admin_announcement || 0
        },

        // Activity over time (last 30 days)
        activityChart: activityData,

        // Recent activity
        recentActivity: recentActivity.slice(0, 10),

        // User engagement
        engagement: {
          averagePostsPerDay: totalPosts > 0 ? (totalPosts / Math.max(dates.length, 1)).toFixed(1) : 0,
          mostActiveDay: dates.length > 0 ? Object.keys(postsByDay).reduce((a, b) => postsByDay[a] > postsByDay[b] ? a : b) : null,
          peakActivity: Math.max(...Object.values(postsByDay))
        }
      };

      console.log('Admin report generated:', reportData);
      setReports(reportData);

      // Process users data
      const userStats = new Map();

      // Process posts for user stats
      posts.forEach(post => {
        if (post.userEmail) {
          if (!userStats.has(post.userEmail)) {
            userStats.set(post.userEmail, {
              email: post.userEmail,
              name: post.userName || 'Unknown',
              posts: 0,
              journalEntries: 0,
              lastActivity: null,
              isAdmin: isAdmin(post.userEmail)
            });
          }
          
          const user = userStats.get(post.userEmail);
          user.posts += 1;
          
          const postDate = post.createdAt?.toDate?.() || new Date(post.createdAt);
          if (!user.lastActivity || postDate > user.lastActivity) {
            user.lastActivity = postDate;
          }
        }
      });

      // Process journal entries for user stats
      journalSnapshot.docs.forEach(doc => {
        const entry = doc.data();
        if (entry.userEmail) {
          if (!userStats.has(entry.userEmail)) {
            userStats.set(entry.userEmail, {
              email: entry.userEmail,
              name: entry.userName || 'Unknown',
              posts: 0,
              journalEntries: 0,
              lastActivity: null,
              isAdmin: isAdmin(entry.userEmail)
            });
          }
          
          const user = userStats.get(entry.userEmail);
          user.journalEntries += 1;
          
          const entryDate = entry.createdAt?.toDate?.() || new Date(entry.createdAt);
          if (!user.lastActivity || entryDate > user.lastActivity) {
            user.lastActivity = entryDate;
          }
        }
      });

      // Convert to array and sort by last activity
      const usersData = Array.from(userStats.values())
        .map(user => ({
          ...user,
          lastActivity: user.lastActivity ? user.lastActivity.toISOString() : null,
          totalActivity: user.posts + user.journalEntries
        }))
        .sort((a, b) => {
          if (!a.lastActivity && !b.lastActivity) return 0;
          if (!a.lastActivity) return 1;
          if (!b.lastActivity) return -1;
          return new Date(b.lastActivity) - new Date(a.lastActivity);
        });

      console.log('User data processed:', usersData);
      setUsers(usersData);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError(`Failed to load dashboard data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Export data to CSV
  const handleExport = async (dataType) => {
    try {
      setLoading(true);
      let csvData = '';
      let fileName = '';

      if (dataType === 'users') {
        csvData = 'Name,Email,Posts,Journal Entries,Last Activity,Is Admin\n';
        users.forEach(user => {
          const lastActivity = user.lastActivity ? new Date(user.lastActivity).toLocaleDateString() : 'Never';
          csvData += `"${user.name}","${user.email}",${user.posts},${user.journalEntries},"${lastActivity}","${user.isAdmin ? 'Yes' : 'No'}"\n`;
        });
        fileName = `sdrm-users-${new Date().toISOString().split('T')[0]}.csv`;
      } 
      
      if (dataType === 'posts') {
        // Get fresh posts data
        const postsSnapshot = await getDocs(collection(db, 'posts'));
        const posts = postsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        csvData = 'Date,User,Email,Type,Message,Likes\n';
        posts.forEach(post => {
          const date = post.createdAt?.toDate?.() || new Date(post.createdAt);
          csvData += `"${date.toLocaleDateString()}","${(post.userName || 'Unknown').replace(/"/g, '""')}","${post.userEmail || ''}","${post.type || 'post'}","${(post.text || '').replace(/"/g, '""').substring(0, 200)}","${post.likes || 0}"\n`;
        });
        fileName = `sdrm-posts-${new Date().toISOString().split('T')[0]}.csv`;
      }

      // Create and download CSV file
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      alert(`${dataType} data exported successfully!`);
    } catch (error) {
      console.error('Export error:', error);
      alert(`Export failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadDashboardData();
    loadAdminList();
  }, [currentUser.email]);

  if (loading && !reports) {
    return (
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
        justifyContent: 'center'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(0, 73, 144, 0.9), rgba(245, 160, 29, 0.9))',
          borderRadius: '20px',
          padding: '40px',
          color: 'white',
          textAlign: 'center'
        }}>
          <RefreshCw size={32} className="animate-spin" style={{marginBottom: '16px'}} />
          <p style={{margin: 0, fontSize: '18px'}}>Loading Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      backdropFilter: 'blur(10px)',
      zIndex: 1000,
      padding: '20px',
      overflowY: 'auto'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        background: 'linear-gradient(135deg, rgba(0, 73, 144, 0.95), rgba(245, 160, 29, 0.95))',
        borderRadius: '20px',
        padding: '30px',
        color: 'white'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>Admin Dashboard</h1>
            <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0 }}>
              San Diego Rescue Mission Community Management
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={loadDashboardData}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '8px',
                color: 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              <RefreshCw size={16} style={{animation: loading ? 'spin 1s linear infinite' : 'none'}} />
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '20px'
              }}
            >
              ×
            </button>
          </div>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid rgba(239, 68, 68, 0.5)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '20px',
            color: 'white'
          }}>
            {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '30px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '8px',
          padding: '4px'
        }}>
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'activity', label: 'Activity', icon: TrendingUp },
            { id: 'export', label: 'Export', icon: Download },
            { id: 'admins', label: 'Admin Management', icon: Shield }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === tab.id ? 'rgba(255,255,255,0.9)' : 'transparent',
                color: activeTab === tab.id ? '#004990' : 'rgba(255,255,255,0.8)',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && reports && (
          <div>
            {/* Stats Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
              marginBottom: '30px'
            }}>
              <div style={{
                background: 'rgba(255,255,255,0.15)',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center'
              }}>
                <Users size={24} color="#F5A01D" style={{marginBottom: '8px'}} />
                <div style={{fontSize: '2rem', fontWeight: 'bold', margin: '8px 0'}}>{reports.overview.activeUsers}</div>
                <div style={{fontSize: '14px', opacity: 0.8}}>Active Users</div>
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.15)',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center'
              }}>
                <MessageSquare size={24} color="#F5A01D" style={{marginBottom: '8px'}} />
                <div style={{fontSize: '2rem', fontWeight: 'bold', margin: '8px 0'}}>{reports.overview.totalPosts}</div>
                <div style={{fontSize: '14px', opacity: 0.8}}>Total Posts</div>
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.15)',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center'
              }}>
                <Heart size={24} color="#ff6b6b" style={{marginBottom: '8px'}} />
                <div style={{fontSize: '2rem', fontWeight: 'bold', margin: '8px 0'}}>{reports.postTypes.prayerRequests}</div>
                <div style={{fontSize: '14px', opacity: 0.8}}>Prayer Requests</div>
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.15)',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center'
              }}>
                <Star size={24} color="#F59E0B" style={{marginBottom: '8px'}} />
                <div style={{fontSize: '2rem', fontWeight: 'bold', margin: '8px 0'}}>{reports.postTypes.praiseReports}</div>
                <div style={{fontSize: '14px', opacity: 0.8}}>Praise Reports</div>
              </div>
            </div>

            {/* Recent Activity */}
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '20px'
            }}>
              <h3 style={{margin: '0 0 20px 0', fontSize: '18px'}}>Recent Community Activity</h3>
              <div style={{display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto'}}>
                {reports.recentActivity.map((activity, index) => (
                  <div key={index} style={{
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '12px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px'
                  }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: activity.type === 'prayer_request' ? '#ff6b6b' : 
                                 activity.type === 'praise_report' ? '#F59E0B' : '#F5A01D',
                      marginTop: '6px'
                    }} />
                    <div style={{flex: 1}}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px'}}>
                        <span style={{fontWeight: '500', fontSize: '14px'}}>{activity.user}</span>
                        <span style={{fontSize: '12px', opacity: 0.6}}>
                          {new Date(activity.createdAt).toLocaleDateString()}
                        </span>
                        <span style={{
                          fontSize: '10px',
                          background: 'rgba(255,255,255,0.2)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          textTransform: 'capitalize'
                        }}>
                          {activity.type.replace('_', ' ')}
                        </span>
                      </div>
                      <p style={{margin: 0, fontSize: '13px', opacity: 0.9, lineHeight: '1.4'}}>
                        {activity.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <h3 style={{margin: '0 0 20px 0', fontSize: '18px'}}>Community Members ({users.length})</h3>
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '20px',
              maxHeight: '400px',
              overflowY: 'auto'
            }}>
              <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                {users.map((user, index) => (
                  <div key={index} style={{
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: user.isAdmin ? '#F59E0B' : '#F5A01D',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Users size={20} color="white" />
                      </div>
                      <div>
                        <div style={{fontWeight: '500', fontSize: '14px', marginBottom: '2px'}}>
                          {user.name}
                          {user.isAdmin && (
                            <span style={{
                              marginLeft: '8px',
                              fontSize: '10px',
                              background: '#F59E0B',
                              color: 'white',
                              padding: '2px 6px',
                              borderRadius: '4px'
                            }}>ADMIN</span>
                          )}
                        </div>
                        <div style={{fontSize: '12px', opacity: 0.7}}>{user.email}</div>
                      </div>
                    </div>
                    <div style={{textAlign: 'right'}}>
                      <div style={{fontSize: '14px', fontWeight: '500'}}>
                        {user.posts} posts • {user.journalEntries} journal entries
                      </div>
                      <div style={{fontSize: '12px', opacity: 0.7}}>
                        Last active: {user.lastActivity ? new Date(user.lastActivity).toLocaleDateString() : 'Never'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activity' && reports && (
          <div>
            <h3 style={{margin: '0 0 20px 0', fontSize: '18px'}}>Community Activity Trends</h3>
            
            {/* Engagement Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginBottom: '20px'
            }}>
              <div style={{
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center'
              }}>
                <div style={{fontSize: '1.5rem', fontWeight: 'bold'}}>{reports.engagement.averagePostsPerDay}</div>
                <div style={{fontSize: '12px', opacity: 0.8}}>Avg Posts/Day</div>
              </div>
              
              <div style={{
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center'
              }}>
                <div style={{fontSize: '1.5rem', fontWeight: 'bold'}}>{reports.overview.postsPerUser}</div>
                <div style={{fontSize: '12px', opacity: 0.8}}>Posts per User</div>
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center'
              }}>
                <div style={{fontSize: '1.5rem', fontWeight: 'bold'}}>{reports.engagement.peakActivity}</div>
                <div style={{fontSize: '12px', opacity: 0.8}}>Peak Daily Posts</div>
              </div>
            </div>

            {/* Post Types Breakdown */}
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '20px'
            }}>
              <h4 style={{margin: '0 0 16px 0'}}>Content Types</h4>
              <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                {Object.entries(reports.postTypes).map(([type, count]) => (
                  <div key={type} style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                    <div style={{minWidth: '120px', fontSize: '14px', textTransform: 'capitalize'}}>
                      {type.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </div>
                    <div style={{
                      flex: 1,
                      height: '20px',
                      background: 'rgba(255,255,255,0.2)',
                      borderRadius: '10px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        background: '#F5A01D',
                        width: `${(count / reports.overview.totalPosts) * 100}%`,
                        borderRadius: '10px'
                      }} />
                    </div>
                    <div style={{minWidth: '40px', textAlign: 'right', fontSize: '14px'}}>{count}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'export' && (
          <div>
            <h3 style={{margin: '0 0 20px 0', fontSize: '18px'}}>Data Export</h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '20px'
            }}>
              <div style={{
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center'
              }}>
                <MessageSquare size={32} color="#F5A01D" style={{marginBottom: '16px'}} />
                <h4 style={{margin: '0 0 8px 0'}}>Community Posts</h4>
                <p style={{fontSize: '14px', opacity: 0.8, margin: '0 0 16px 0'}}>
                  Export all community posts including prayer requests and praise reports
                </p>
                <button
                  onClick={() => handleExport('posts')}
                  disabled={loading}
                  style={{
                    background: '#F5A01D',
                    border: 'none',
                    color: 'white',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    margin: '0 auto'
                  }}
                >
                  <Download size={16} />
                  Export Posts CSV
                </button>
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center'
              }}>
                <Users size={32} color="#F5A01D" style={{marginBottom: '16px'}} />
                <h4 style={{margin: '0 0 8px 0'}}>User Directory</h4>
                <p style={{fontSize: '14px', opacity: 0.8, margin: '0 0 16px 0'}}>
                  Export user information and activity statistics
                </p>
                <button
                  onClick={() => handleExport('users')}
                  disabled={loading}
                  style={{
                    background: '#F5A01D',
                    border: 'none',
                    color: 'white',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    margin: '0 auto'
                  }}
                >
                  <Download size={16} />
                  Export Users CSV
                </button>
              </div>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '20px',
              marginTop: '20px'
            }}>
              <h4 style={{margin: '0 0 12px 0'}}>Export Information</h4>
              <ul style={{margin: 0, paddingLeft: '20px', fontSize: '14px', opacity: 0.8}}>
                <li>All exports are in CSV format for easy import into Excel or Google Sheets</li>
                <li>Personal journal entries are never included in exports to protect privacy</li>
                <li>User email addresses are included for administrative purposes only</li>
                <li>Files are named with current date for easy organization</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'admins' && (
          <div>
            <h3 style={{margin: '0 0 20px 0', fontSize: '18px'}}>Admin Management</h3>
            
            {/* Add New Admin */}
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px'
            }}>
              <h4 style={{margin: '0 0 16px 0', fontSize: '16px'}}>Add New Administrator</h4>
              <div style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                flexWrap: 'wrap'
              }}>
                <input
                  type="email"
                  placeholder="Enter email address"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  style={{
                    flex: '1',
                    minWidth: '250px',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.3)',
                    background: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    fontSize: '14px'
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && addAdmin()}
                />
                <button
                  onClick={addAdmin}
                  disabled={loading || !newAdminEmail.trim()}
                  style={{
                    padding: '12px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: newAdminEmail.trim() ? '#F5A01D' : 'rgba(255,255,255,0.3)',
                    color: 'white',
                    cursor: newAdminEmail.trim() ? 'pointer' : 'not-allowed',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Add Admin
                </button>
              </div>
              <p style={{
                fontSize: '12px',
                opacity: 0.8,
                margin: '8px 0 0 0'
              }}>
                New administrators will have full access to the admin dashboard and can manage users and content.
              </p>
            </div>

            {/* Current Admins List */}
            <div>
              <h4 style={{margin: '0 0 16px 0', fontSize: '16px'}}>Current Administrators</h4>
              
              {/* Super Admins */}
              <div style={{marginBottom: '20px'}}>
                <h5 style={{margin: '0 0 12px 0', fontSize: '14px', opacity: 0.8}}>Super Administrators (Cannot be removed)</h5>
                {superAdmins.map((email) => (
                  <div key={email} style={{
                    background: 'rgba(245,160,29,0.2)',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <strong>{email}</strong>
                      <span style={{
                        marginLeft: '8px',
                        fontSize: '12px',
                        padding: '2px 6px',
                        background: 'rgba(245,160,29,0.3)',
                        borderRadius: '4px'
                      }}>
                        SUPER ADMIN
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Added Admins */}
              {adminList.length > 0 && (
                <div>
                  <h5 style={{margin: '0 0 12px 0', fontSize: '14px', opacity: 0.8}}>Added Administrators</h5>
                  {adminList.map((admin) => (
                    <div key={admin.email} style={{
                      background: 'rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      padding: '12px',
                      marginBottom: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <strong>{admin.email}</strong>
                        <div style={{fontSize: '12px', opacity: 0.7, marginTop: '4px'}}>
                          Added by {admin.addedBy} on {new Date(admin.addedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        onClick={() => removeAdmin(admin.email)}
                        disabled={loading}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: 'none',
                          background: 'rgba(239,68,68,0.8)',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '12px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => e.target.style.background = 'rgba(239,68,68,1)'}
                        onMouseOut={(e) => e.target.style.background = 'rgba(239,68,68,0.8)'}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {adminList.length === 0 && (
                <div style={{
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '20px',
                  textAlign: 'center',
                  opacity: 0.8
                }}>
                  No additional administrators added yet.
                </div>
              )}
            </div>

            {/* Admin Management Info */}
            <div style={{
              background: 'rgba(59,130,246,0.2)',
              borderRadius: '8px',
              padding: '12px',
              marginTop: '20px',
              fontSize: '12px'
            }}>
              <strong>Note:</strong> Admin permissions are checked in real-time. New administrators will have immediate access to all admin features including user management, content moderation, and data export capabilities.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;