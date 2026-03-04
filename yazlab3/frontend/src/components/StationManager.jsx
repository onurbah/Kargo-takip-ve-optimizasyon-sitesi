import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FaMapMarkerAlt,
  FaPlus,
  FaTrash,
  FaCity,
  FaMapMarkedAlt
} from 'react-icons/fa';

const StationManager = ({ selectedLocation, onSelectRequest, setIsProcessing }) => {
  const [stations, setStations] = useState([]);
  const [newStation, setNewStation] = useState({ ad: '' });
  const lat = selectedLocation?.lat || '';
  const lon = selectedLocation?.lon || '';

  const fetchStations = () => {
    axios
      .get('http://127.0.0.1:8000/stations')
      .then(res => setStations(res.data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchStations();
  }, []);

  const handleAdd = () => {
    if (!newStation.ad || !lat || !lon) {
      return alert("Lütfen istasyon adı girin ve haritadan konum seçin!");
    }
    setIsProcessing(true);

    axios
      .post('http://127.0.0.1:8000/stations', {
        ad: newStation.ad,
        lat,
        lon
      })
      .then(() => {
        setNewStation({ ad: '' });
        fetchStations();
      })
      .catch((err) => {
        console.error(err);
        alert("Hata oluştu: " + (err.response?.data?.detail || "Bilinmeyen hata"));
      })
      .finally(() => {
        setIsProcessing(false);
      });
  };

  const handleDelete = id => {
    if (window.confirm("Silmek istediğine emin misin?")) {
      axios
        .delete(`http://127.0.0.1:8000/stations/${id}`)
        .then(() => fetchStations())
        .catch(() => alert("Hata!"));
    }
  };

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif" }}>
      <div
        style={{
          textAlign: 'center',
          marginBottom: '20px',
          color: '#7f8c8d'
        }}
      >
        <p style={{ margin: 0, fontSize: '14px' }}>
          Yeni bir istasyon eklemek için adını girin ve{' '}
          <b>haritadan konum seçin.</b>
        </p>
      </div>
      <div style={{ 
        display: 'flex', gap: '10px', marginBottom: '25px', padding: '15px', 
        backgroundColor: '#f8f9fa', borderRadius: '15px', border: '1px solid #e9ecef',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.03)', alignItems: 'center' 
      }}>
        <div style={{ flex: 1, position: 'relative', minWidth: 0 }}> 
          <FaCity style={{ position: 'absolute', left: '12px', top: '14px', color: '#b2bec3' }} />
          <input 
            placeholder="İstasyon Adı (Örn: İzmit)" 
            value={newStation.ad}
            onChange={e => setNewStation({...newStation, ad: e.target.value})}
            style={{ 
              width: '100%', padding: '12px 12px 12px 35px', borderRadius: '10px', 
              border: '1px solid #dfe6e9', outline: 'none', fontSize: '14px', boxSizing: 'border-box'
            }}
          />
        </div>
        
        <button 
            onClick={onSelectRequest}
            style={{ 
                flex: 'none', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '12px 20px', borderRadius: '10px', border: '1px solid #3498db', 
                backgroundColor: newStation.lat ? '#e1f0ff' : 'white', 
                color: '#3498db', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold',
                whiteSpace: 'nowrap' 
            }}
        >
            <FaMapMarkedAlt />
            {newStation.lat ? "Seçildi" : "Haritadan Konum Seç"}
        </button>
        
        {/* EKLE BUTONU */}
        <button 
          onClick={handleAdd} 
          style={{ 
            flex: 'none', 
            backgroundColor: '#27ae60', color: 'white', border: 'none', 
            borderRadius: '10px', width: '50px', height: '42px', cursor: 'pointer', fontSize: '18px',
            boxShadow: '0 4px 6px rgba(39, 174, 96, 0.2)', transition: '0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <FaPlus />
        </button>
      </div>

      {/* LİSTE */}
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: '0 8px'
          }}
        >
          <thead>
            <tr
              style={{
                color: '#7f8c8d',
                fontSize: '12px',
                textTransform: 'uppercase'
              }}
            >
              <th style={{ textAlign: 'left' }}>
                İstasyon Adı
              </th>
              <th style={{ textAlign: 'right' }}>
                İşlem
              </th>
            </tr>
          </thead>
          <tbody>
            {stations.map(s => (
              <tr
                key={s.id}
                style={{
                  backgroundColor: 'white',
                  boxShadow:
                    '0 2px 5px rgba(0,0,0,0.05)'
                }}
              >
                <td style={{ padding: '15px' }}>
                  <FaMapMarkerAlt /> {s.ad}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    onClick={() =>
                      handleDelete(s.id)
                    }
                    style={{
                      color: '#e74c3c',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {stations.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '40px',
              color: '#bdc3c7'
            }}
          >
            Henüz istasyon eklenmemiş.
          </div>
        )}
      </div>
    </div>
  );
};

export default StationManager;