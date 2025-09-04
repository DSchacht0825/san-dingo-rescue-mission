import React from 'react';
import { Send } from 'lucide-react';

const PostForm = ({ 
  messageType, 
  setMessageType, 
  newMessage, 
  setNewMessage, 
  handleSendMessage, 
  saving 
}) => {
  return (
    <div style={{
      marginBottom: '20px',
      background: 'rgba(0,0,0,0.2)',
      backdropFilter: 'blur(10px)',
      borderRadius: '20px',
      border: '1px solid rgba(255,255,255,0.1)',
      padding: '30px'
    }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: 'white', marginBottom: '20px' }}>
        Share with the Community
      </h2>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>
          What would you like to share?
        </span>
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
          onKeyDown={(e) => {
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
  );
};

export default PostForm;