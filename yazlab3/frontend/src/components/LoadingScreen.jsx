import React from 'react';
import { FaTruck } from 'react-icons/fa';
import '../App.css'; 

const LoadingScreen = ({ visible }) => {
  return (
    <div className={`loading-overlay ${visible ? 'active' : ''}`}>
      <div className="loader-container">
        
        <div className="loader-truck">
            <FaTruck />
        </div>

        <div className="loader-box box-anim box-1"></div>
        <div className="loader-box box-anim box-2"></div>
        <div className="loader-box box-anim box-3"></div>

      </div>
      
      <h3 style={{letterSpacing:'2px', fontWeight:'600', marginBottom:'5px'}}>SİSTEM HAZIRLANIYOR</h3>
    </div>
  );
};

export default LoadingScreen;