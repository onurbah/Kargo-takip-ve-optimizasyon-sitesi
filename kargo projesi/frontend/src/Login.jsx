import { useState } from 'react';
import axios from 'axios';
import { FaTruckLoading, FaUser, FaLock } from 'react-icons/fa';

const Login = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    axios.post('http://127.0.0.1:8000/login', { username, password })
      .then(res => {
        if (res.data.status === 'success') {
          onLoginSuccess(res.data);
        } else {
          setError('Kullanıcı adı veya şifre hatalı!');
        }
      })
      .catch(() => setError('Sunucuya bağlanılamadı!'));
  };

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      background: 'linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)',
      fontFamily: '"Segoe UI", sans-serif'
    }}>
      <div style={{ 
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: '50px 40px', 
        borderRadius: '24px', 
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)', 
        width: '380px', 
        textAlign: 'center',
        border: '1px solid rgba(255, 255, 255, 0.5)'
      }}>
        
        {/* LOGO ALANI */}
        <div style={{ fontSize: '60px', color: '#2c3e50', marginBottom: '10px', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}>
          <FaTruckLoading />
        </div>
        
        <h2 style={{ 
          color: '#2c3e50', 
          margin: '0 0 5px 0', 
          fontSize: '24px', 
          fontWeight: '800', 
          letterSpacing: '1px' 
        }}>
          KOCAELİ <span style={{ color: '#e67e22' }}>KARGO</span>
        </h2>
        
        <p style={{ color: '#95a5a6', fontSize: '13px', marginBottom: '35px', marginTop: '5px' }}>
          Lojistik Yönetim Paneli Girişi
        </p>

        <div style={{ marginBottom: '20px', position: 'relative' }}>
          <FaUser style={{ position: 'absolute', left: '18px', top: '14px', color: '#b2bec3', fontSize: '14px' }} />
          <input 
            type="text" 
            placeholder="Kullanıcı Adı" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '12px 12px 12px 45px', 
              borderRadius: '12px', 
              border: '2px solid #ecf0f1', 
              backgroundColor: '#f8f9fa', 
              outline: 'none', 
              boxSizing: 'border-box',
              fontSize: '14px',
              color: '#2d3436',
              transition: 'all 0.3s ease'
            }}
            onFocus={(e) => { e.target.style.borderColor = '#3498db'; e.target.style.backgroundColor = 'white'; }}
            onBlur={(e) => { e.target.style.borderColor = '#ecf0f1'; e.target.style.backgroundColor = '#f8f9fa'; }}
          />
        </div>

        <div style={{ marginBottom: '25px', position: 'relative' }}>
          <FaLock style={{ position: 'absolute', left: '18px', top: '14px', color: '#b2bec3', fontSize: '14px' }} />
          <input 
            type="password" 
            placeholder="Şifre" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '12px 12px 12px 45px', 
              borderRadius: '12px', 
              border: '2px solid #ecf0f1', 
              backgroundColor: '#f8f9fa', 
              outline: 'none', 
              boxSizing: 'border-box',
              fontSize: '14px',
              color: '#2d3436',
              transition: 'all 0.3s ease'
            }}
            onFocus={(e) => { e.target.style.borderColor = '#3498db'; e.target.style.backgroundColor = 'white'; }}
            onBlur={(e) => { e.target.style.borderColor = '#ecf0f1'; e.target.style.backgroundColor = '#f8f9fa'; }}
          />
        </div>

        {error && (
          <div style={{ 
            color: '#e74c3c', 
            fontSize: '13px', 
            marginBottom: '20px', 
            backgroundColor: 'rgba(231, 76, 60, 0.1)', 
            padding: '10px', 
            borderRadius: '8px',
            fontWeight: 'bold'
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* GİRİŞ BUTONU */}
        <button 
          onClick={handleLogin}
          style={{ 
            width: '100%', 
            padding: '14px', 
            background: 'linear-gradient(90deg, #2c3e50 0%, #34495e 100%)', 
            color: 'white', 
            border: 'none', 
            borderRadius: '12px', 
            fontSize: '16px', 
            fontWeight: 'bold',
            cursor: 'pointer', 
            transition: 'all 0.3s ease',
            boxShadow: '0 5px 15px rgba(44, 62, 80, 0.3)'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(44, 62, 80, 0.4)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 5px 15px rgba(44, 62, 80, 0.3)';
          }}
        >
          Giriş Yap
        </button>

      </div>
    </div>
  );
};

export default Login;