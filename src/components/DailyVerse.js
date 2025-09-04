import React from 'react';
import { BookOpen } from 'lucide-react';

const DailyVerse = ({ todaysVerse }) => {
  return (
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
          <p style={{ color: 'rgba(255,255,255,0.9)', fontStyle: 'italic', marginBottom: '8px', margin: 0 }}>
            "{todaysVerse.text}"
          </p>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: 0 }}>
            - {todaysVerse.reference}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DailyVerse;