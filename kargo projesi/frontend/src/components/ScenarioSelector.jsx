import { useState } from 'react';
import axios from 'axios';
import { FaLayerGroup, FaTruckLoading, FaExclamationTriangle, FaChartLine, FaTrashAlt, FaRedo } from 'react-icons/fa';

const ScenarioSelector = ({ onScenarioLoaded, setGlobalLoading }) => {
  const [loading, setLoading] = useState(false);

  // --- 1. BELİRLİ BİR SENARYOYU YÜKLEME ---
  const handleSelect = (id) => {
    setLoading(true);
    
    if (setGlobalLoading) setGlobalLoading(true);

    axios.post(`http://127.0.0.1:8000/scenarios/load/${id}`)
      .then(() => {
        if (setGlobalLoading) {
            setTimeout(() => {
                setGlobalLoading(false);
            }, 1500);
        }
        setLoading(false);
        if (onScenarioLoaded) onScenarioLoaded(); 
      })
      .catch((err) => {
        if (setGlobalLoading) setGlobalLoading(false);
        
        console.error(err);
        alert("Hata: " + (err.response?.data?.detail || "Bağlantı hatası"));
        setLoading(false);
      });
  };
  // --- 2. SADECE SIFIRLAMA (TEMİZ SAYFA) ---
  const handleReset = () => {
    setLoading(true);
    if (setGlobalLoading) setGlobalLoading(true);
    
    axios.post('http://127.0.0.1:8000/reset')
      .then(() => { 
        if (setGlobalLoading) {
            setTimeout(() => {
                setGlobalLoading(false);
            }, 1000); 
        }
        
        if (onScenarioLoaded) onScenarioLoaded(); 
        setLoading(false);
      })
      .catch((err) => {
        if (setGlobalLoading) setGlobalLoading(false);
        
        console.error(err);
        alert("Sıfırlama sırasında hata oluştu.");
        setLoading(false);
      });
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', padding: '10px' }}>
      
      <ScenarioButton 
        id={1} title="Senaryo 1" desc="Genel Test" 
        color="#3498db" icon={<FaLayerGroup />}
        onClick={() => handleSelect(1)} disabled={loading}
      />

      <ScenarioButton 
        id={2} title="Senaryo 2" desc="Yoğunluk Testi" 
        color="#9b59b6" icon={<FaTruckLoading />}
        onClick={() => handleSelect(2)} disabled={loading}
      />

      <ScenarioButton 
        id={3} title="Senaryo 3" desc="Kiralık Araç" 
        color="#e67e22" icon={<FaExclamationTriangle />}
        onClick={() => handleSelect(3)} disabled={loading}
      />

      <ScenarioButton 
        id={4} title="Senaryo 4" desc="Maliyet Analizi" 
        color="#2ecc71" icon={<FaChartLine />}
        onClick={() => handleSelect(4)} disabled={loading}
      />
      <div style={{ gridColumn: 'span 2', borderTop: '1px dashed #bdc3c7', margin: '5px 0' }}></div>

      <button 
        onClick={handleReset}
        disabled={loading}
        style={{
          gridColumn: 'span 2',
          padding: '15px',
          backgroundColor: '#fff5f5', 
          border: '2px solid #e74c3c',
          color: '#c0392b',
          borderRadius: '12px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontWeight: 'bold',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
          transition: '0.2s',
          fontSize: '14px'
        }}
        onMouseOver={(e) => !loading && (e.currentTarget.style.backgroundColor = '#e74c3c', e.currentTarget.style.color = 'white')}
        onMouseOut={(e) => !loading && (e.currentTarget.style.backgroundColor = '#fff5f5', e.currentTarget.style.color = '#c0392b')}
      >
        {loading ? <FaRedo className="fa-spin" /> : <FaTrashAlt />}
        SİSTEMİ TAMAMEN SIFIRLA (TEMİZLE)
      </button>

    </div>
  );
};

const ScenarioButton = ({ title, desc, color, icon, onClick, disabled }) => (
    <button 
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '15px', border: `1px solid ${color}`, borderRadius: '10px',
        backgroundColor: 'white', cursor: disabled ? 'not-allowed' : 'pointer',
        transition: '0.2s', opacity: disabled ? 0.6 : 1,
        boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
        height: '100%' 
      }}
      onMouseOver={(e) => !disabled && (e.currentTarget.style.backgroundColor = `${color}10`)} 
      onMouseOut={(e) => !disabled && (e.currentTarget.style.backgroundColor = 'white')}
    >
      <div style={{ fontSize: '20px', color: color, marginBottom: '5px' }}>{icon}</div>
      <div style={{ fontWeight: 'bold', color: '#2c3e50', fontSize: '13px' }}>{title}</div>
      <div style={{ fontSize: '10px', color: '#7f8c8d' }}>{desc}</div>
    </button>
);

export default ScenarioSelector;