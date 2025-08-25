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
  Trash2
} from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

const AdminDashboard = ({ currentUser, onClose }) => {
  const [reports, setReports] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState('');

  // Initialize Cloud Functions
  const generateAdminReport = httpsCallable(functions, 'generateAdminReport');
  const getUserList = httpsCallable(functions, 'getUserList');
  const exportData = httpsCallable(functions, 'exportData');
  const moderateContent = httpsCallable(functions, 'moderateContent');

  // Load dashboard data
  const loadDashboardData = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('Loading dashboard data for admin:', currentUser.email);
      
      // Generate comprehensive report
      const reportResult = await generateAdminReport({ 
        userEmail: currentUser.email 
      });
      
      console.log('Admin report received:', reportResult.data);
      setReports(reportResult.data);
      
      // Get user list
      const usersResult = await getUserList({ 
        userEmail: currentUser.email 
      });
      
      console.log('User list received:', usersResult.data);
      setUsers(usersResult.data.users || []);
      
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
      const result = await exportData({ 
        userEmail: currentUser.email, 
        dataType 
      });
      
      // Create and download CSV file
      const blob = new Blob([result.data.csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = result.data.fileName;
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
            { id: 'export', label: 'Export', icon: Download }
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
      </div>
    </div>
  );
};

export default AdminDashboard;