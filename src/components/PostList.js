import React from 'react';
import { Heart, User, MessageCircle, Reply, Shield, Megaphone } from 'lucide-react';

const PostList = ({
  messages,
  currentUser,
  handleLikeMessage,
  handleReply,
  replyingTo,
  replyText,
  setReplyText,
  handleSendReply,
  setReplyingTo,
  hasMorePosts,
  loadMorePosts,
  loadingMore
}) => {
  return (
    <div style={{
      background: 'rgba(0,0,0,0.2)',
      backdropFilter: 'blur(10px)',
      borderRadius: '20px',
      border: '1px solid rgba(255,255,255,0.1)',
      padding: '30px'
    }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: 'white', marginBottom: '20px' }}>
        Community Support
      </h2>
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
                        onKeyDown={(e) => {
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
  );
};

export default PostList;