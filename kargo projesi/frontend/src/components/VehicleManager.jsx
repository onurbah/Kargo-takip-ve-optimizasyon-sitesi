import { useState, useEffect } from 'react';
import axios from 'axios';
import { FaTruck, FaPlus, FaTrash, FaWeightHanging, FaTachometerAlt } from 'react-icons/fa';

const VehicleManager = () => {
  const [vehicles, setVehicles] = useState([]);
  const [newVehicle, setNewVehicle] = useState({ plaka: '', kapasite: '' });
  const fetchVehicles = () => {
    axios.get('http://127.0.0.1:8000/vehicles')
      .then(res => setVehicles(res.data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleAdd = () => {
    if (!newVehicle.plaka || !newVehicle.kapasite) return alert("Plaka ve Kapasite girin!");
    
    axios.post('http://127.0.0.1:8000/vehicles', newVehicle)
      .then(() => {
        setNewVehicle({ plaka: '', kapasite: '' });
        fetchVehicles();
      })
      .catch((err) => alert(err.response?.data?.detail || "Hata oluştu!"));
  };
  const handleDelete = (id) => {
    if(window.confirm("Bu aracı filodan çıkarmak istiyor musun?")) {
        axios.delete(`http://127.0.0.1:8000/vehicles/${id}`)
        .then(() => fetchVehicles())
        .catch(() => alert("Hata!"));
    }
  }

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif" }}>
      
      <div style={{ textAlign: 'center', marginBottom: '20px', color: '#7f8c8d' }}>
        <p style={{ margin: 0, fontSize: '14px' }}>
            Filodaki araçları yönetin. İhtiyaç durumunda <b>araç kiralayarak (ekleyerek)</b> filoyu büyütebilirsiniz.
        </p>
      </div>
      <div style={{ 
        display: 'flex', gap: '10px', marginBottom: '25px', padding: '15px', 
        backgroundColor: '#f8f9fa', borderRadius: '15px', border: '1px solid #e9ecef',
        alignItems: 'center'
      }}>
        <div style={{ flex: 2, position: 'relative' }}>
          <FaTruck style={{ position: 'absolute', left: '12px', top: '14px', color: '#b2bec3' }} />
          <input 
            placeholder="Plaka (Örn: 41 KOU 99)" 
            value={newVehicle.plaka}
            onChange={e => setNewVehicle({...newVehicle, plaka: e.target.value})}
            style={{ 
              width: '100%', padding: '12px 12px 12px 35px', borderRadius: '10px', 
              border: '1px solid #dfe6e9', outline: 'none', fontSize: '14px', boxSizing: 'border-box'
            }}
          />
        </div>
        <div style={{ flex: 1, position: 'relative' }}>
            <FaWeightHanging style={{ position: 'absolute', left: '12px', top: '14px', color: '#b2bec3' }} />
            <input 
            type="number"
            placeholder="Kapasite (kg)" 
            value={newVehicle.kapasite}
            onChange={e => setNewVehicle({...newVehicle, kapasite: e.target.value})}
            style={{ 
                width: '100%', padding: '12px 12px 12px 35px', borderRadius: '10px', 
                border: '1px solid #dfe6e9', outline: 'none', fontSize: '14px', boxSizing: 'border-box'
            }}
            />
        </div>
        <button 
          onClick={handleAdd} 
          style={{ 
            flex: 'none', backgroundColor: '#e67e22', color: 'white', border: 'none', 
            borderRadius: '10px', width: '50px', height: '42px', cursor: 'pointer', fontSize: '18px',
            boxShadow: '0 4px 6px rgba(230, 126, 34, 0.2)', transition: '0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <FaPlus />
        </button>
      </div>

      <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '5px' }}>
        {vehicles.map(v => (
            <div key={v.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                backgroundColor: 'white', padding: '15px', marginBottom: '10px',
                borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', border: '1px solid #ecf0f1'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ 
                        width: '40px', height: '40px', borderRadius: '10px', 
                        backgroundColor: '#fff3e0', color: '#e67e22', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' 
                    }}>
                        <FaTruck />
                    </div>
                    <div>
                        <div style={{ fontWeight: 'bold', color: '#2c3e50', fontSize: '15px' }}>{v.plaka}</div>
                        <div style={{ fontSize: '12px', color: '#95a5a6' }}>ID: #{v.id}</div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: '#34495e' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <FaWeightHanging style={{ color: '#7f8c8d' }} /> 
                        <b>{v.kapasite} kg</b>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <FaTachometerAlt style={{ color: '#7f8c8d' }} /> 
                        {v.hiz} km/s
                    </div>
                </div>

                <button 
                    onClick={() => handleDelete(v.id)} 
                    style={{ 
                        color: '#e74c3c', background: 'rgba(231, 76, 60, 0.1)', 
                        border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer' 
                    }}
                >
                    <FaTrash />
                </button>
            </div>
        ))}
      </div>

      {vehicles.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#bdc3c7' }}>
          Filoda araç yok.
        </div>
      )}

    </div>
  );
};

export default VehicleManager;