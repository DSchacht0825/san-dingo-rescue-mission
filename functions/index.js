/*
 * San Diego Rescue Mission - Cloud Functions
 * Copyright © 2025 Daniel Schacht and San Diego Rescue Mission
 * Backend logic for admin features and reporting
 */

const {onCall, onRequest, HttpsError} = require('firebase-functions/v2/https');
const {onSchedule} = require('firebase-functions/v2/scheduler');
const {initializeApp} = require('firebase-admin/app');
const {getFirestore} = require('firebase-admin/firestore');
const {logger} = require('firebase-functions');

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

// Admin email list - same as frontend
const ADMIN_EMAILS = [
  'schacht.dan@gmail.com',
  'daniel@sdrescuemission.org',
  'dschacht@sdrescue.org'
];

// Helper function to check if user is admin
const isAdmin = (email) => {
  return ADMIN_EMAILS.includes(email.toLowerCase());
};

// Generate comprehensive admin reports
exports.generateAdminReport = onCall(async (request) => {
  const { userEmail } = request.data;
  
  // Check admin privileges
  if (!userEmail || !isAdmin(userEmail)) {
    throw new HttpsError('permission-denied', 'Admin access required');
  }

  try {
    logger.info('Generating admin report for:', userEmail);

    // Get all posts
    const postsSnapshot = await db.collection('posts').get();
    const posts = postsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Get all journal entries (count only for privacy)
    const journalSnapshot = await db.collection('journalEntries').get();

    // Get unique users from posts
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

      // Recent activity (last 10 posts)
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

    // Calculate engagement metrics
    const totalPosts = posts.length;
    const activeUsers = uniqueUsers.size;
    const postsPerUser = activeUsers > 0 ? (totalPosts / activeUsers).toFixed(1) : 0;

    // Get date range for activity
    const dates = Object.keys(postsByDay).sort();
    const activityData = dates.slice(-30).map(date => ({
      date,
      posts: postsByDay[date] || 0
    }));

    const report = {
      generatedAt: new Date().toISOString(),
      generatedBy: userEmail,
      
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

    logger.info('Admin report generated successfully');
    return report;

  } catch (error) {
    logger.error('Error generating admin report:', error);
    throw new HttpsError('internal', 'Failed to generate report');
  }
});

// Get user list for admin management
exports.getUserList = onCall(async (request) => {
  const { userEmail } = request.data;
  
  if (!userEmail || !isAdmin(userEmail)) {
    throw new HttpsError('permission-denied', 'Admin access required');
  }

  try {
    logger.info('Getting user list for admin:', userEmail);

    // Get unique users from posts and journal entries
    const [postsSnapshot, journalSnapshot] = await Promise.all([
      db.collection('posts').get(),
      db.collection('journalEntries').get()
    ]);

    const userStats = new Map();

    // Process posts
    postsSnapshot.docs.forEach(doc => {
      const post = doc.data();
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

    // Process journal entries
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
    const users = Array.from(userStats.values())
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

    logger.info(`Retrieved ${users.length} users for admin management`);
    return { users };

  } catch (error) {
    logger.error('Error getting user list:', error);
    throw new HttpsError('internal', 'Failed to get user list');
  }
});

// Export data for admin (CSV format)
exports.exportData = onCall(async (request) => {
  const { userEmail, dataType } = request.data;
  
  if (!userEmail || !isAdmin(userEmail)) {
    throw new HttpsError('permission-denied', 'Admin access required');
  }

  try {
    logger.info(`Exporting ${dataType} data for admin:`, userEmail);

    let csvData = '';

    if (dataType === 'posts') {
      const snapshot = await db.collection('posts').orderBy('createdAt', 'desc').get();
      csvData = 'Date,User,Email,Type,Message,Likes\n';
      
      snapshot.docs.forEach(doc => {
        const post = doc.data();
        const date = post.createdAt?.toDate?.() || new Date(post.createdAt);
        const csvRow = [
          date.toISOString().split('T')[0],
          `"${(post.userName || 'Unknown').replace(/"/g, '""')}"`,
          post.userEmail || '',
          post.type || 'post',
          `"${(post.text || '').replace(/"/g, '""').substring(0, 200)}"`,
          post.likes || 0
        ].join(',');
        csvData += csvRow + '\n';
      });
    }

    if (dataType === 'users') {
      // Generate user export similar to getUserList but in CSV format
      const [postsSnapshot, journalSnapshot] = await Promise.all([
        db.collection('posts').get(),
        db.collection('journalEntries').get()
      ]);

      csvData = 'Name,Email,Posts,Journal Entries,Last Activity,Is Admin\n';
      
      const userStats = new Map();
      
      // Process posts and journal entries (similar to getUserList)
      postsSnapshot.docs.forEach(doc => {
        const post = doc.data();
        if (post.userEmail) {
          if (!userStats.has(post.userEmail)) {
            userStats.set(post.userEmail, {
              name: post.userName || 'Unknown',
              email: post.userEmail,
              posts: 0,
              journalEntries: 0,
              lastActivity: null
            });
          }
          userStats.get(post.userEmail).posts += 1;
        }
      });

      journalSnapshot.docs.forEach(doc => {
        const entry = doc.data();
        if (entry.userEmail) {
          if (!userStats.has(entry.userEmail)) {
            userStats.set(entry.userEmail, {
              name: entry.userName || 'Unknown',
              email: entry.userEmail,
              posts: 0,
              journalEntries: 0,
              lastActivity: null
            });
          }
          userStats.get(entry.userEmail).journalEntries += 1;
        }
      });

      userStats.forEach(user => {
        const csvRow = [
          `"${user.name.replace(/"/g, '""')}"`,
          user.email,
          user.posts,
          user.journalEntries,
          user.lastActivity ? user.lastActivity.split('T')[0] : '',
          isAdmin(user.email) ? 'Yes' : 'No'
        ].join(',');
        csvData += csvRow + '\n';
      });
    }

    logger.info(`Data export completed for ${dataType}`);
    return { csvData, fileName: `sdrm-${dataType}-${new Date().toISOString().split('T')[0]}.csv` };

  } catch (error) {
    logger.error('Error exporting data:', error);
    throw new HttpsError('internal', 'Failed to export data');
  }
});

// Moderate content (admin only)
exports.moderateContent = onCall(async (request) => {
  const { userEmail, action, contentId, contentType } = request.data;
  
  if (!userEmail || !isAdmin(userEmail)) {
    throw new HttpsError('permission-denied', 'Admin access required');
  }

  try {
    logger.info(`Admin ${userEmail} performing ${action} on ${contentType} ${contentId}`);

    const collection = contentType === 'post' ? 'posts' : 'journalEntries';
    const docRef = db.collection(collection).doc(contentId);
    
    if (action === 'delete') {
      await docRef.delete();
      logger.info(`Content deleted: ${contentType} ${contentId}`);
    } else if (action === 'hide') {
      await docRef.update({ isHidden: true, hiddenBy: userEmail, hiddenAt: new Date() });
      logger.info(`Content hidden: ${contentType} ${contentId}`);
    } else if (action === 'unhide') {
      await docRef.update({ isHidden: false, unhiddenBy: userEmail, unhiddenAt: new Date() });
      logger.info(`Content unhidden: ${contentType} ${contentId}`);
    }

    return { success: true, action, contentId, contentType };

  } catch (error) {
    logger.error('Error moderating content:', error);
    throw new HttpsError('internal', 'Failed to moderate content');
  }
});

// Scheduled function to generate daily statistics (optional)
exports.generateDailyStats = onSchedule('0 6 * * *', async (event) => {
  logger.info('Running daily statistics generation');
  
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Get posts from yesterday
    const postsSnapshot = await db.collection('posts')
      .where('createdAt', '>=', yesterday)
      .where('createdAt', '<', today)
      .get();
    
    // Get journal entries from yesterday  
    const journalSnapshot = await db.collection('journalEntries')
      .where('createdAt', '>=', yesterday)
      .where('createdAt', '<', today)
      .get();

    const dailyStats = {
      date: yesterday.toISOString().split('T')[0],
      posts: postsSnapshot.size,
      journalEntries: journalSnapshot.size,
      uniqueUsers: new Set([
        ...postsSnapshot.docs.map(doc => doc.data().userEmail),
        ...journalSnapshot.docs.map(doc => doc.data().userEmail)
      ].filter(Boolean)).size,
      generatedAt: new Date()
    };

    // Store daily stats
    await db.collection('dailyStats').doc(dailyStats.date).set(dailyStats);
    
    logger.info('Daily statistics generated:', dailyStats);
    
  } catch (error) {
    logger.error('Error generating daily statistics:', error);
  }
});