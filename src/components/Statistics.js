import React from 'react';
import { Heart, Star, Users } from 'lucide-react';

const Statistics = ({ statistics }) => {
  return (
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
        <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white', margin: 0 }}>
          {statistics.supportRequests}
        </p>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: 0 }}>
          Support Requests
        </p>
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
        <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white', margin: 0 }}>
          {statistics.victoryReports}
        </p>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: 0 }}>
          Victory Reports
        </p>
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
        <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white', margin: 0 }}>
          {statistics.activeMembers}
        </p>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: 0 }}>
          Active Members
        </p>
      </div>
    </div>
  );
};

export default Statistics;