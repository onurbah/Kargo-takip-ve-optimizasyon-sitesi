import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaBox, FaCalendarAlt, FaWeightHanging, FaMapMarkerAlt, FaCheckCircle, FaClock, FaTruck } from 'react-icons/fa';

const UserPastShipments = () => {
  const [cargos, setCargos] = useState([]);
  const [stations, setStations] = useState({}); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('http://127.0.0.1:8000/stations')
      .then(res => {
        const stationMap = {};
        res.data.forEach(s => {
          stationMap[s.id] = s.ad;
        });
        setStations(stationMap);
        return axios.get('http://127.0.0.1:8000/cargos');
      })
      .then(res => {
        const sortedCargos = res.data.sort((a, b) => b.id - a.id);
        setCargos(sortedCargos);
        setLoading(false);
      })
      .catch(err => {
        console.error("Veri çekme hatası:", err);
        setLoading(false);
      });
  }, []);

  const getStatusBadge = (status) => {
    const s = status.toLowerCase();
    if (s.includes('teslim')) return { color: '#2ecc71', icon: <FaCheckCircle />, text: status };
    if (s.includes('yolda') || s.includes('dağıtım')) return { color: '#3498db', icon: <FaTruck />, text: status };
    if (s.includes('bekliyor')) return { color: '#f1c40f', icon: <FaClock />, text: status };
    return { color: '#95a5a6', icon: <FaBox />, text: status };
  };

  return (
    <div style={{ padding: '10px' }}>
      <div style={{ 
        marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', 
        borderRadius: '10px', borderLeft: '5px solid #8e44ad', color: '#2c3e50', fontSize: '14px'
      }}>
        <h4 style={{ margin: '0 0 5px 0', color: '#8e44ad' }}>📦 Gönderi Arşivi</h4>
        Sisteme kaydettiğiniz tüm kargo taleplerinin güncel durumlarını buradan takip edebilirsiniz.
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#bdc3c7' }}>
           <span className="fa-spin" style={{ fontSize: '24px' }}>⌛</span> <br/> Yükleniyor...
        </div>
      ) : cargos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#95a5a6', border: '2px dashed #ecf0f1', borderRadius: '10px' }}>
            <FaBox size={40} style={{ marginBottom: '10px', opacity: 0.5 }} />
            <div>Henüz hiç gönderiniz bulunmuyor.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {cargos.map((cargo) => {
            const badge = getStatusBadge(cargo.durum);
            const trackingCode = `TR-${cargo.id.toString().padStart(4, '0')}-25`;
            
            return (
              <div key={cargo.id} style={{
                backgroundColor: 'white', borderRadius: '12px', 
                boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid #eee',
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
                transition: 'transform 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{
                    padding: '12px 20px', backgroundColor: '#fcfcfc', borderBottom: '1px solid #f0f0f0',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div style={{display:'flex', alignItems:'center', gap:'8px', fontSize:'13px', color:'#7f8c8d'}}>
                        <FaCalendarAlt color="#8e44ad"/> {cargo.gonderim_tarihi || "25.12.2025"}
                        <span style={{color:'#bdc3c7'}}>|</span>
                        <span style={{fontWeight:'bold', color:'#2c3e50'}}>#{trackingCode}</span>
                    </div>
                    
                    <div style={{
                        backgroundColor: badge.color + '20', color: badge.color, 
                        padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold',
                        display: 'flex', alignItems: 'center', gap: '5px', border: `1px solid ${badge.color}`
                    }}>
                        {badge.icon} {badge.text.toUpperCase()}
                    </div>
                </div>
                <div style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{fontWeight:'bold', color:'#2c3e50', fontSize:'15px'}}>
                                {stations[cargo.source_id] || "Bilinmiyor"}
                            </div>
                            <div style={{fontSize:'11px', color:'#95a5a6'}}>Çıkış Şubesi</div>
                        </div>

                        <div style={{ color:'#bdc3c7', fontSize:'12px' }}>➔</div>

                        <div style={{ textAlign: 'center' }}>
                            <div style={{fontWeight:'bold', color:'#2c3e50', fontSize:'15px'}}>
                                {stations[cargo.target_id] || "Umuttepe"}
                            </div>
                            <div style={{fontSize:'11px', color:'#95a5a6'}}>Varış Merkezi</div>
                        </div>
                    </div>
                    <div style={{ width: '1px', height: '40px', backgroundColor: '#eee', margin: '0 20px' }}></div>
                    <div style={{ flex: 1, display: 'flex', gap: '20px', justifyContent: 'flex-end' }}>
                        <div style={{display:'flex', flexDirection:'column', alignItems:'center'}}>
                            <div style={{fontSize:'11px', color:'#95a5a6', marginBottom:'2px'}}>Ağırlık</div>
                            <div style={{fontWeight:'bold', color:'#e67e22', display:'flex', alignItems:'center', gap:'4px'}}>
                                <FaWeightHanging /> {cargo.agirlik} kg
                            </div>
                        </div>
                        <div style={{display:'flex', flexDirection:'column', alignItems:'center'}}>
                            <div style={{fontSize:'11px', color:'#95a5a6', marginBottom:'2px'}}>Adet</div>
                            <div style={{fontWeight:'bold', color:'#3498db'}}>
                                {cargo.adet} parça
                            </div>
                        </div>
                    </div>

                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UserPastShipments;