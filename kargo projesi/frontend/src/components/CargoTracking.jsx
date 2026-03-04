import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaSearch, FaTruck, FaMapMarkedAlt, FaBoxOpen, FaCheckCircle, FaMapMarkerAlt, FaUniversity } from 'react-icons/fa';

const CargoTracking = ({ onShowOnMap }) => {
  const [stations, setStations] = useState([]); 
  const [selectedStation, setSelectedStation] = useState(''); 
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // İstasyonları Çek
  useEffect(() => {
    axios.get('http://127.0.0.1:8000/stations')
      .then(res => setStations(res.data))
      .catch(err => console.error(err));
  }, []);

  const handleSearch = () => {
    if (!selectedStation) {
      alert("Lütfen kargonuzu teslim ettiğiniz şubeyi seçiniz.");
      return;
    }
    setLoading(true);
    setResult(null);

    axios.post('http://127.0.0.1:8000/track', { station_name: selectedStation })
      .then((res) => {
        setLoading(false);
        setResult(res.data.data);
      })
      .catch((err) => {
        setLoading(false);
        alert(err.response?.data?.detail || "Bilgi bulunamadı.");
      });
  };

  return (
    <div style={{ padding: '10px' }}>
      <div style={{ 
        color: '#8e44ad', marginBottom: '20px', fontSize: '14px', 
        textAlign: 'center', fontWeight: '500' 
      }}>
        Kargonuzu teslim ettiğiniz şubeyi seçerek aracın durumunu sorgulayabilirsiniz.
      </div>
      <div style={{ 
        backgroundColor: 'white', padding: '25px', borderRadius: '15px', 
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #f0f0f0',
        marginBottom: '20px'
      }}>
        
        <label style={{
            fontSize:'12px', fontWeight:'bold', color:'#95a5a6', 
            textTransform:'uppercase', letterSpacing:'1px', marginBottom:'8px', display:'block'
        }}>
            KARGO ÇIKIŞ NOKTASI (ŞUBE)
        </label>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{position: 'relative', flex: 1}}>
                <select 
                    value={selectedStation}
                    onChange={(e) => setSelectedStation(e.target.value)}
                    style={{
                        width: '100%', padding: '14px', borderRadius: '8px', 
                        border: '1px solid #e0e0e0', outline: 'none', fontSize: '15px',
                        backgroundColor: '#fafafa', cursor: 'pointer', appearance: 'none',
                        color: '#2c3e50', fontWeight: '500'
                    }}
                >
                    <option value="">İstasyon Seçiniz...</option>
                    {stations.map(s => (
                        <option key={s.id} value={s.ad}>{s.ad}</option>
                    ))}
                </select>
                <div style={{position:'absolute', right:'15px', top:'18px', pointerEvents:'none', color:'#bdc3c7'}}>▼</div>
            </div>
            
            <button 
                onClick={handleSearch}
                disabled={loading}
                style={{
                    backgroundColor: '#8e44ad', color: 'white', border: 'none', 
                    padding: '0 30px', borderRadius: '8px', cursor: 'pointer', height: '50px',
                    fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px',
                    boxShadow: '0 4px 10px rgba(142, 68, 173, 0.3)', transition: 'transform 0.2s',
                    fontSize: '14px'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
                {loading ? <span className="fa-spin">⌛</span> : <FaSearch />} SORGULA
            </button>
        </div>
      </div>

      {/* --- SONUÇ KARTI --- */}
      {result && (
        <div style={{ 
          animation: 'fadeIn 0.5s',
          border: '1px solid #e1e1e1', borderRadius: '15px', overflow: 'hidden',
          backgroundColor: 'white', boxShadow: '0 10px 25px rgba(0,0,0,0.08)'
        }}>
          
          {/* Sonuç Başlığı */}
          <div style={{ 
            background: 'linear-gradient(to right, #2c3e50, #34495e)', color: 'white', padding: '15px 20px', 
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                <FaBoxOpen size={18} color="#f1c40f" />
                <span style={{fontWeight:'bold', letterSpacing:'1px', fontSize:'14px'}}>{result.id}</span>
            </div>
            <div style={{
                backgroundColor: 'rgba(46, 204, 113, 0.2)', color:'#2ecc71', padding: '5px 12px', borderRadius: '20px', 
                fontSize: '11px', fontWeight: 'bold', display:'flex', alignItems:'center', gap:'5px', border:'1px solid #2ecc71'
            }}>
                <FaCheckCircle /> {result.status}
            </div>
          </div>
          <div style={{ padding: '25px' }}>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'25px', padding:'0 10px'}}>
                <div style={{textAlign:'center'}}>
                    <div style={{color:'#8e44ad', fontWeight:'bold', fontSize:'14px'}}>{result.origin}</div>
                    <div style={{fontSize:'11px', color:'#95a5a6'}}>Çıkış Şubesi</div>
                </div>
                
                <div style={{flex:1, height:'2px', background:'#e0e0e0', margin:'0 15px', position:'relative'}}>
                    <div style={{
                        position:'absolute', top:'-12px', left:'50%', transform:'translateX(-50%)', 
                        background:'white', padding:'0 5px'
                    }}>
                        <FaTruck color="#e67e22"/>
                    </div>
                </div>

                <div style={{textAlign:'center'}}>
                    <div style={{color:'#2c3e50', fontWeight:'bold', fontSize:'14px'}}>Umuttepe</div>
                    <div style={{fontSize:'11px', color:'#95a5a6'}}>Teslimat Merkezi</div>
                </div>
            </div>

            {/* Bilgi Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '25px' }}>
                <div style={{background:'#f9f9f9', padding:'10px', borderRadius:'8px'}}>
                    <div style={{fontSize:'11px', color:'#95a5a6'}}>TAŞIYAN ARAÇ</div>
                    <div style={{fontWeight:'bold', color:'#2c3e50'}}>{result.vehicle_plate}</div>
                </div>
                <div style={{background:'#f9f9f9', padding:'10px', borderRadius:'8px'}}>
                    <div style={{fontSize:'11px', color:'#95a5a6'}}>TAHMİNİ VARIŞ</div>
                    <div style={{fontWeight:'bold', color:'#2c3e50'}}>{result.estimated}</div>
                </div>
            </div>

            {/* Aksiyon Butonu */}
            <button 
                onClick={() => onShowOnMap(result)}
                style={{
                    width: '100%', padding: '15px', 
                    background: 'linear-gradient(to right, #e67e22, #d35400)', color: 'white',
                    border: 'none', borderRadius: '10px', fontWeight: 'bold',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                    fontSize: '14px', boxShadow: '0 4px 15px rgba(230, 126, 34, 0.3)'
                }}
            >
                <FaMapMarkedAlt /> CANLI KONUMU GÖSTER
            </button>

          </div>
        </div>
      )}
    </div>
  );
};

export default CargoTracking;