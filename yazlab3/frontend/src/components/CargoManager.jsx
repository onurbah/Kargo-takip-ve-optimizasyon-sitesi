import { useState, useEffect } from 'react';
import axios from 'axios';
import { FaBoxOpen, FaPlus, FaTrash, FaWeightHanging, FaUniversity, FaMapPin } from 'react-icons/fa';

const CargoManager = () => {
  const [cargos, setCargos] = useState([]);
  const [stations, setStations] = useState([]); 
  const [merkezId, setMerkezId] = useState(null);
  const [newCargo, setNewCargo] = useState({
    source_id: '',
    target_id: '',
    agirlik: '',
    adet: '',
    gonderim_tarihi: ''
  });

  // 1. Kargo ve İstasyon verilerini çek
  const fetchData = () => {
    // Kargoları çek
    axios.get('http://127.0.0.1:8000/cargos')
      .then(res => setCargos(res.data))
      .catch(err => console.error(err));

    // İstasyonları çek (Dropdown doldurmak için)
    axios.get('http://127.0.0.1:8000/stations')
      .then(res => {
        setStations(res.data);
        const merkez = res.data.find(s => s.ad === "Umuttepe");
        if(merkez) setMerkezId(merkez.id);
      })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 2. Kargo Ekleme Fonksiyonu
  const handleAdd = () => {
    if (!newCargo.source_id || !newCargo.agirlik || !newCargo.adet || !newCargo.gonderim_tarihi) {
      return alert("Lütfen tüm alanları doldurun!");
    }
    
    if (!merkezId) {
        return alert("Sistem hatası: 'Umuttepe' istasyonu bulunamadı! Lütfen yönetici panelinden ekleyin.");
    }

    if (newCargo.source_id === merkezId) {
        return alert("Kargo zaten Umuttepe'de! Başka bir çıkış noktası seçin.");
    }
    const payload = {
        ...newCargo,
        target_id: merkezId 
    };

    axios.post('http://127.0.0.1:8000/cargos', payload)
      .then(() => {
        setNewCargo({ source_id: '', target_id: '', agirlik: '', gonderim_tarihi: '' });
        fetchData(); 
      })
      .catch((err) => alert("Hata: " + (err.response?.data?.detail || "Sunucu hatası")));
  };

  // 3. Silme Fonksiyonu
  const handleDelete = (id) => {
    if(window.confirm("Bu kargoyu silmek istediğine emin misin?")) {
        axios.delete(`http://127.0.0.1:8000/cargos/${id}`)
        .then(() => fetchData())
        .catch(() => alert("Hata!"));
    }
  }
  const getStationName = (id) => {
      const st = stations.find(s => s.id === id);
      return st ? st.ad : 'Bilinmiyor';
  };

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif" }}>
      
      <div style={{ textAlign: 'center', marginBottom: '20px', color: '#8e44ad' }}>
        <p style={{ margin: 0, fontSize: '14px' }}>
            Taşınacak kargoları sisteme girin. Algoritma bu yükleri en uygun araçlara dağıtacaktır.
        </p>
      </div>

      {/* --- EKLEME FORMU (Grid Yapısı) --- */}
      <div style={{ 
        display: 'flex', flexDirection: 'column', gap: '15px', 
        marginBottom: '25px', padding: '20px', 
        backgroundColor: '#fff', 
        borderRadius: '16px', 
        border: '1px solid #e0e0e0',
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)' 
      }}>
        
        {/* 1. SATIR: İSTASYON SEÇİMİ */}
        <div>
            <label style={{display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold', color: '#7f8c8d'}}>ÇIKIŞ NOKTASI</label>
            <select 
                value={newCargo.source_id}
                onChange={e => setNewCargo({...newCargo, source_id: parseInt(e.target.value)})}
                style={{ 
                    width: '100%', padding: '12px', borderRadius: '8px', 
                    border: '1px solid #dfe6e9', fontSize: '14px', outline: 'none',
                    backgroundColor: '#fdfdfd'
                }}
            >
                <option value="">İstasyon Seçiniz...</option>
                {stations.map(s => (
                    <option key={s.id} value={s.id}>{s.ad}</option>
                ))}
            </select>
        </div>

        {/* 2. SATIR: KG ve ADET (Yan Yana) */}
        <div style={{ display: 'flex', gap: '15px' }}>
            <div style={{ flex: 1 }}>
                <input 
                    type="number" 
                    placeholder="Ağırlık (kg)"
                    value={newCargo.agirlik}
                    onChange={e => setNewCargo({...newCargo, agirlik: parseInt(e.target.value)})}
                    style={{ 
                        width: '100%', padding: '12px', borderRadius: '8px', 
                        border: '1px solid #dfe6e9', outline: 'none', boxSizing: 'border-box'
                    }}
                />
            </div>
            <div style={{ flex: 1 }}>
                <input 
                    type="number" 
                    placeholder="Adet" 
                    value={newCargo.adet}
                    onChange={e => setNewCargo({...newCargo, adet: parseInt(e.target.value)})}
                    style={{ 
                        width: '100%', padding: '12px', borderRadius: '8px', 
                        border: '1px solid #dfe6e9', outline: 'none', boxSizing: 'border-box'
                    }}
                />
            </div>
        </div>

        {/* 3. SATIR: TARİH ve BUTON */}
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <input 
                type="date"
                value={newCargo.gonderim_tarihi}
                onChange={e => setNewCargo({...newCargo, gonderim_tarihi: e.target.value})}
                style={{ 
                    flex: 1, padding: '11px', borderRadius: '8px', 
                    border: '1px solid #dfe6e9', outline: 'none', color: '#636e72',
                    fontFamily: 'inherit'
                }}
            />
            
            <button 
              onClick={handleAdd} 
              style={{ 
                padding: '12px 30px', 
                backgroundColor: '#8e44ad', 
                color: 'white', border: 'none', 
                borderRadius: '8px', cursor: 'pointer',
                fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px',
                transition: '0.2s', boxShadow: '0 4px 6px rgba(142, 68, 173, 0.2)'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <FaPlus /> EKLE
            </button>
        </div>
      </div>

      {/* --- KARGO LİSTESİ --- */}
      <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '5px' }}>
        {cargos.map(c => (
            <div key={c.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                backgroundColor: 'white', padding: '15px', marginBottom: '10px',
                borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', border: '1px solid #f3e5f5'
            }}>
                {/* SOL TARAF: ROTA */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 2 }}>
                  <div style={{ 
                      width: '40px', height: '40px', borderRadius: '50%', 
                      backgroundColor: '#f3e5f5', color: '#8e44ad', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center' 
                  }}>
                      <FaMapPin /> 
                  </div>
                  <div>
                      <div style={{ fontWeight: 'bold', color: '#2c3e50', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {getStationName(c.source_id)} 
                          <span style={{color:'#bdc3c7', fontSize:'12px'}}>➔</span> 
                          <span style={{display:'flex', alignItems:'center', gap:'4px', color:'#8e44ad'}}>
                              <FaUniversity size={14}/> KOÜ Umuttepe
                          </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#95a5a6' }}>
                          {c.gonderim_tarihi} • <span style={{ color: c.durum === 'Bekliyor' ? '#f39c12' : '#27ae60' }}>{c.durum}</span>
                      </div>
                  </div>
              </div>

                {/* SAĞ TARAF: AĞIRLIK VE SİL */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ fontWeight: 'bold', color: '#34495e', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <FaWeightHanging color="#7f8c8d"/> {c.agirlik} kg
                    </div>
                    <button 
                        onClick={() => handleDelete(c.id)} 
                        style={{ 
                            color: '#e74c3c', background: 'rgba(231, 76, 60, 0.1)', 
                            border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' 
                        }}
                    >
                        <FaTrash />
                    </button>
                </div>
            </div>
        ))}
      </div>
      
      {cargos.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#bdc3c7' }}>
          Henüz kargo girişi yapılmamış.
        </div>
      )}

    </div>
  );
};

export default CargoManager;