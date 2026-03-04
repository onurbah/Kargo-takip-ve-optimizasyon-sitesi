// frontend/src/components/Modal.jsx
import React from 'react';
import { FaTimes } from 'react-icons/fa';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.6)', 
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 2000, backdropFilter: 'blur(3px)' 
    }}>
      <div style={{
        backgroundColor: 'white',
        width: '600px',
        borderRadius: '15px',
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
        animation: 'fadeIn 0.3s ease'
      }}>
        {/* BAŞLIK KISMI */}
        <div style={{
          backgroundColor: '#2c3e50', color: 'white', padding: '15px 20px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: '4px solid #e67e22' 
        }}>
          <h3 style={{ margin: 0, fontSize: '18px' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }}>
            <FaTimes />
          </button>
        </div>

        {/* İÇERİK KISMI */}
        <div style={{ padding: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;