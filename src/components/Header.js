import React from 'react';
import { Download, BookOpen, Bell, BellOff, HelpCircle, Shield, Megaphone, User } from 'lucide-react';
import '../ResponsiveHeader.css';

const Header = ({
  currentUser,
  showInstallButton,
  handleInstallClick,
  showJournaling,
  setShowJournaling,
  loadJournalEntries,
  notificationsEnabled,
  sendTestNotification,
  requestNotificationPermission,
  setShowHelpModal,
  setShowAdminDashboard,
  setShowAdminPanel,
  setShowProfile,
  setCurrentView
}) => {
  return (
    <header className="header-container">
      <div className="header-content">
        {/* Logo Section */}
        <div className="logo-section">
          <div className="logo-circle">
            <img 
              src="/SDRMLogo2016-3.svg" 
              alt="SDRM Logo" 
              className="logo-image"
            />
          </div>
          <div className="logo-text">
            <h1>SAN DIEGO RESCUE MISSION</h1>
            <p>One Life at a Time</p>
          </div>
        </div>
        
        {/* Right Side Actions */}
        <div className="header-actions">

          {/* PWA Install Button */}
          {showInstallButton && (
            <button
              onClick={handleInstallClick}
              className="header-btn"
              style={{
                background: 'linear-gradient(45deg, #10B981, #34D399)',
                boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)'
              }}
            >
              <Download size={16} color="white" />
              <span className="header-btn-text">Install App</span>
            </button>
          )}

          {/* Journal Button */}
          <button
            onClick={() => {
              setShowJournaling(!showJournaling);
              if (!showJournaling) {
                loadJournalEntries(); // Refresh entries when opening
              }
            }}
            className="header-btn"
            style={{
              background: showJournaling ? 'rgba(245, 160, 29, 0.3)' : 'rgba(255,255,255,0.2)'
            }}
          >
            <BookOpen size={16} color="white" />
            <span className="header-btn-text">Journal</span>
          </button>

          {/* Notifications Button */}
          <button
            onClick={notificationsEnabled ? sendTestNotification : requestNotificationPermission}
            className="header-btn"
            style={{
              background: notificationsEnabled 
                ? 'linear-gradient(45deg, #8B5CF6, #A78BFA)' 
                : 'rgba(255,255,255,0.2)',
              boxShadow: notificationsEnabled ? '0 2px 10px rgba(139, 92, 246, 0.3)' : 'none'
            }}
            title={notificationsEnabled ? 'Send test notification' : 'Enable notifications'}
          >
            {notificationsEnabled ? <Bell size={16} color="white" /> : <BellOff size={16} color="white" />}
            <span className="header-btn-text">
              {notificationsEnabled ? 'Notifications' : 'Enable Alerts'}
            </span>
          </button>

          {/* Help Button for all users */}
          <button
            onClick={() => setShowHelpModal(true)}
            className="header-btn"
            style={{
              background: 'linear-gradient(45deg, #EF4444, #F87171)',
              boxShadow: '0 2px 10px rgba(239, 68, 68, 0.3)'
            }}
          >
            <HelpCircle size={16} color="white" />
            <span className="header-btn-text">Need Help?</span>
          </button>

          {currentUser.isAdmin && (
            <>
              <button
                onClick={() => setShowAdminDashboard(true)}
                className="header-btn"
                style={{
                  background: 'linear-gradient(45deg, #F5A01D, #FDB44B)',
                  border: '2px solid rgba(255,255,255,0.3)',
                  boxShadow: '0 4px 15px rgba(245, 160, 29, 0.3)'
                }}
              >
                <Shield size={16} color="white" />
                <span className="header-btn-text" style={{ fontWeight: 'bold' }}>Admin Dashboard</span>
              </button>
              <button
                onClick={() => setShowAdminPanel(true)}
                className="header-btn"
                style={{
                  background: 'rgba(255,255,255,0.2)'
                }}
              >
                <Megaphone size={16} color="white" />
                <span className="header-btn-text">Announce</span>
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
            className="header-btn sign-out-btn"
            style={{
              background: 'rgba(255,255,255,0.2)'
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;