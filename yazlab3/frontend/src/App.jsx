import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMapEvents, Tooltip } from 'react-leaflet';
import axios from 'axios'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import Modal from './components/Modal';
import StationManager from './components/StationManager';
import VehicleManager from './components/VehicleManager';
import CargoManager from './components/CargoManager';
import ScenarioSelector from './components/ScenarioSelector';
import LoadingScreen from './components/LoadingScreen';
import CargoTracking from './components/CargoTracking';
import UserPastShipments from './components/UserPastShipments';
import Login from './Login';

// --- İKONLAR (react-icons) ---
import { FaTruckLoading, FaRoute, FaMapMarkedAlt, FaChartLine, FaBoxOpen, FaSearchLocation, FaSignOutAlt, FaRedo, FaSyncAlt, FaMoneyBillWave, FaGasPump, FaHistory} from 'react-icons/fa'
import { MdAdminPanelSettings, MdDashboard } from 'react-icons/md'

// --- LEAFLET İKON AYARLARI ---
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34]
});
L.Marker.prototype.options.icon = DefaultIcon;

let RedIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
import './App.css'

function App() {
const [globalLoading, setGlobalLoading] = useState(false);
const MapClickHandler = ({ onLocationSelect, isActive }) => {
    useMapEvents({
      click(e) {
        if (isActive) {
          onLocationSelect(e.latlng); 
        }
      },
    });
    return null;
  };
  const [isSelectingLocation, setIsSelectingLocation] = useState(false); 
  const [tempLocation, setTempLocation] = useState(null); 
  const startLocationSelection = () => {
    setActiveModal(null); 
    setIsSelectingLocation(true); 
    alert("Lütfen harita üzerinde istasyonun olacağı yere tıklayın.");
  };
  const handleMapClick = (latlng) => {
    setTempLocation({ lat: latlng.lat, lon: latlng.lng }); 
    setIsSelectingLocation(false); 
    setActiveModal('stations'); 
  };
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState('admin') 
  const [username, setUsername] = useState('');
  const [stations, setStations] = useState([])
  const [routes, setRoutes] = useState([])
  const [activeModal, setActiveModal] = useState(null);
  const [cargos, setCargos] = useState([]);
  const [plannedRoutes, setPlannedRoutes] = useState([]);
  const [showInfrastructure, setShowInfrastructure] = useState(false);
  const [focusedStations, setFocusedStations] = useState([]);
  const [userOrigin, setUserOrigin] = useState(null);
  const [isStationProcessing, setIsStationProcessing] = useState(false);

  const getRandomColor = () => {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  // --- VERİ ÇEKME FONKSİYONU ---
  const fetchMapData = () => {
    // 1. İstasyonları Çek
    axios.get('http://127.0.0.1:8000/stations')
      .then(res => setStations(res.data))
      .catch(err => console.error("İstasyon Hatası:", err));

    // 2. Yolları Çek
    axios.get('http://127.0.0.1:8000/distances')
      .then(res => {
        const parsedRoutes = res.data
          .map(route => {
            try {
              return {
                ...route,
                geometry: typeof route.geometry === 'string' 
                  ? JSON.parse(route.geometry) 
                  : (route.geometry || {}),
                color: getRandomColor()
              };
            } catch {
              console.warn("Bozuk Rota Atlandı:", route.id);
              return null;
            }
          })
          .filter(item => item !== null);

        setRoutes(parsedRoutes);
        console.log("Harita verileri güncellendi.");
      })
      .catch(err => console.error("Yol Hatası:", err));
      
    // 3. KARGOLARI ÇEK (YENİ KISIM)
    axios.get('http://127.0.0.1:8000/cargos')
      .then(res => {
        setCargos(res.data); 
        console.log("Kargolar yüklendi:", res.data.length);
      })
      .catch(err => console.error("Kargo Hatası:", err));
  };

  // --- SAYFA YÜKLENİNCE ÇALIŞACAK KISIM ---
  useEffect(() => {
    if(isLoggedIn) {
        fetchMapData();
    }
  }, [isLoggedIn]);

  // --- BUTON İÇİN GÜNCELLEME FONKSİYONU ---
  const handleRefresh = () => {
      fetchMapData(); 
      alert("Harita verileri güncellendi!");
  };

  // --- ROTA OPTİMİZASYON İSTEĞİ ---
  const handleOptimize = () => {
    setGlobalLoading(true);

    axios.post('http://127.0.0.1:8000/optimize')
      .then(res => {
        if(res.data.status === 'success') {
           const results = res.data.results;
           setPlannedRoutes(results); 
        } else {
            alert("Uyarı: " + res.data.message);
        }
      })
      .catch(err => {
        console.error(err);
        alert("Hata: " + (err.response?.data?.detail || "Algoritma çalıştırılamadı."));
      })
      .finally(() => {
        setTimeout(() => {
            setGlobalLoading(false);
        }, 1000); 
      });
  };

  // --- GİRİŞ EKRANI KONTROLÜ ---
  if (!isLoggedIn) {
    return (
      <Login 
        onLoginSuccess={(data) => {
          console.log("Giriş Yapıldı:", data);
          setUserRole(data.role);
          setUsername(data.ad);
          if (data.role === 'user') {
              setPlannedRoutes([]); 
              setCargos([]);       
          }
          setIsLoggedIn(true);
        }} 
      />
    );
  }
  // --- YOL ETKİLEŞİM FONKSİYONU ---
  const onEachRoute = (route, layer) => {
    const popupContent = `
      <div style="text-align: center; font-family: sans-serif;">
        <h3 style="margin: 0; color: #e67e22;">Rota Bilgisi</h3>
        <hr style="border: 0; border-top: 1px solid #ccc; margin: 5px 0;">
        <b>Mesafe:</b> ${route.mesafe_km} km<br/>
        <span style="font-size: 10px; color: gray;">Rota ID: ${route.id}</span>
      </div>
    `;
    layer.bindPopup(popupContent);

    // 2. Mouse Hareketleri (Hover Efektleri)
    layer.on({
      mouseover: (e) => {
        const targetLayer = e.target;
        targetLayer.setStyle({
          weight: 8,       
          opacity: 1,     
          color: '#e74c3c' 
        });
        targetLayer.openPopup(); 
      },
      mouseout: (e) => {
        const targetLayer = e.target;
        targetLayer.setStyle({
          weight: 4,
          opacity: 0.6,
          color: route.color 
        });
        targetLayer.closePopup(); 
      }
    });
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden', backgroundColor: '#ecf0f1' }}>
      <LoadingScreen visible={globalLoading} />

      <div style={{ 
      width: '280px', 
      height: 'calc(100% - 40px)', 
      margin: '30px 0 20px 20px',
      background: 'linear-gradient(180deg, #2c3e50 0%, #1a252f 100%)', 
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      borderRadius: '20px',
      overflow: 'hidden',
      boxShadow: '0 10px 30px rgba(0,0,0,0.3)', 
      zIndex: 1000,
      border: '1px solid rgba(255,255,255,0.1)' 
    }}>
      
      {/* 1. LOGO ALANI */}
      <div style={{ 
        padding: '30px 20px', 
        textAlign: 'center', 
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(0,0,0,0.2)'
      }}>
        <div style={{ fontSize: '45px', color: '#e67e22', marginBottom: '10px', filter: 'drop-shadow(0 0 10px rgba(230, 126, 34, 0.5))' }}>
          <FaTruckLoading />
        </div>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', letterSpacing: '1.5px', fontFamily: '"Segoe UI", sans-serif' }}>
          KOCAELİ<span style={{ color: '#e67e22' }}>KARGO</span>
        </h2>
        
        <div style={{ 
          marginTop: '15px', 
          padding: '8px', 
          backgroundColor: 'rgba(255,255,255,0.05)', 
          borderRadius: '10px',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
           <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2ecc71', boxShadow: '0 0 5px #2ecc71' }}></div>
           <span>Hoşgeldin, <b>{username}</b></span>
        </div>
      </div>

      {/* ROL GÖSTERGESİ */}
      <div style={{ 
        padding: '10px', 
        background: userRole === 'admin' ? 'linear-gradient(90deg, #c0392b, #e74c3c)' : 'linear-gradient(90deg, #27ae60, #2ecc71)',
        color: 'white', 
        fontSize: '11px', 
        fontWeight: 'bold', 
        textAlign: 'center',
        letterSpacing: '1px',
        textTransform: 'uppercase'
      }}>
        {userRole === 'admin' ? 'YÖNETİCİ PANELİ' : 'MÜŞTERİ PANELİ'}
      </div>

      {/* MENÜ LİSTESİ */}
      <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
        <div style={{ fontSize: '11px', color: '#7f8c8d', fontWeight: 'bold', marginLeft: '10px', marginBottom: '5px' }}>
          İŞLEMLER
        </div>
        
        {userRole === 'admin' && (
          <>
            <MenuButton icon={<FaMapMarkedAlt />} text="İstasyon Yönetimi" color="#3498db" onClick={() => setActiveModal('stations')} />
            <MenuButton icon={<FaRoute />} text="Rota Planlama" color="#e67e22" onClick={handleOptimize} />
            <MenuButton icon={<FaMapMarkedAlt />} text={showInfrastructure ? "Altyapıyı Gizle" : "Altyapıyı Göster"} color="#95a5a6" onClick={() => setShowInfrastructure(!showInfrastructure)} />
            <MenuButton icon={<FaChartLine />} text="Maliyet Analizi" color="#9b59b6" 
                onClick={() => { 
                    if(plannedRoutes.length === 0) {
                        alert("Analiz yapabilmek için önce 'Rota Planlama' işlemini çalıştırmalısınız.");
                        return;
                    }
                    setActiveModal('cost_analysis');}}/>
            <MenuButton icon={<MdAdminPanelSettings />} text="Araç Filosu" color="#1abc9c" onClick={() => setActiveModal('vehicles')} />
            
            {/* YENİ EKLENEN KRİTİK BUTON */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '10px 0' }}></div>
            <MenuButton icon={<FaRedo />} text="Yeni Senaryo (Sıfırla)" color="#e74c3c" onClick={() => setActiveModal('scenarios')} />
          </>
        )}

        {userRole === 'user' && (
          <>
            <MenuButton icon={<FaBoxOpen />} text="Kargo Gönder" color="#e67e22" onClick={() => setActiveModal('cargos')} />
            <MenuButton icon={<FaSearchLocation />} text="Kargo Takip" color="#3498db" onClick={() => setActiveModal('tracking')} />
            <MenuButton icon={<FaHistory />} text="Geçmiş Gönderiler" color="#95a5a6" onClick={() => setActiveModal('history')} />
          </>
        )}
      </div>

      {/* --- GÜVENLİ ÇIKIŞ BUTONU (FIX) --- */}
      <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 'auto' }}>
            <button 
                onClick={() => {
                    setPlannedRoutes([]); 
                    setCargos([]);
                    setStations([]); 
                    setFocusedStations([]);
                    setUserRole('guest');
                    setUsername('');
                    setActiveModal(null);
                    setIsLoggedIn(false);
                }}
                style={{ 
                    width: '100%', padding: '14px', 
                    backgroundColor: 'rgba(231, 76, 60, 0.1)', 
                    color: '#e74c3c', 
                    border: '1px solid rgba(231, 76, 60, 0.3)', 
                    borderRadius: '12px', 
                    cursor: 'pointer', 
                    display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px',
                    fontWeight: 'bold', transition: 'all 0.3s ease',
                    fontSize: '14px'
                }}
                onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#e74c3c';
                    e.currentTarget.style.color = 'white';
                }}
                onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(231, 76, 60, 0.1)';
                    e.currentTarget.style.color = '#e74c3c';
                }}
            >
                <FaSignOutAlt /> Güvenli Çıkış
            </button>
        </div>
      
      {/* ALT BİLGİ */}
      <div style={{ padding: '10px', textAlign: 'center', fontSize: '10px', color: '#576574' }}>
        • Yazlab Proje
      </div>
    </div>

      {/* --- SAĞ PANEL (HARİTA) --- */}
      <div style={{ flex: 1, padding: '30px 20px 20px 20px', position: 'relative' }}> 
        <div style={{ 
          height: '100%', 
          width: '100%', 
          borderRadius: '20px', 
          overflow: 'hidden', 
          boxShadow: '0 5px 15px rgba(0,0,0,0.1)', 
          border: '4px solid white',
          backgroundColor: 'white'
        }}>

        <button
          onClick={handleRefresh}
          style={{
            position: 'absolute',
            top: '34px',
            right: '15px',
            zIndex: 1000, 
            backgroundColor: 'white',
            border: 'none',
            padding: '10px 15px',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px',
            fontWeight: 'bold', color: '#2c3e50', fontSize: '13px',
            transition: '0.2s'
          }}
          onMouseOver={e => e.currentTarget.style.backgroundColor = '#f1f2f6'}
          onMouseOut={e => e.currentTarget.style.backgroundColor = 'white'}
        >
          <FaSyncAlt /> Haritayı Güncelle
        </button>

          <MapContainer 
            center={[40.7654, 29.9406]} 
            zoom={10} 
            preferCanvas={true} 
            style={{ height: "100%", width: "100%" }}
            zoomControl={false}
          >
            <MapClickHandler isActive={isSelectingLocation} onLocationSelect={handleMapClick} />

            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />

            {/* --- RENKLİ VE ETKİLEŞİMLİ YOLLAR --- */}
            {showInfrastructure && routes.map((route) => (
              <GeoJSON 
                key={route.id} 
                data={route.geometry} 
                style={{ 
                  color: route.color, 
                  weight: 4, 
                  opacity: 0.6 
                }} 
                onEachFeature={(feature, layer) => onEachRoute(route, layer)}
              />
             ))}
            {/* --- 2. HESAPLANAN ROTALAR (DÜZELTİLMİŞ HALİ) --- */}
            {plannedRoutes.map((route, routeIdx) => {
                console.log(`[Çizim] Araç: ${route.arac_plaka}`, route.rota_geometrileri);

                return (
                    <React.Fragment key={`route-${routeIdx}`}>
                        {route.rota_geometrileri && route.rota_geometrileri.map((rawGeoData, geoIdx) => {
                            
                            let finalGeoData = rawGeoData;
                            
                            if (typeof rawGeoData === 'string') {
                                try {
                                    finalGeoData = JSON.parse(rawGeoData);
                                } catch {
                                    return null; 
                                }
                            }
                            if (!finalGeoData) return null;

                            return (
                                <GeoJSON 
                                    key={`route-${routeIdx}-seg-${geoIdx}`}
                                    data={finalGeoData}
                                    style={{ 
                                        color: route.color === 'red' ? '#e74c3c' : '#3498db',
                                        weight: 6,
                                        opacity: 0.9,
                                        dashArray: route.color === 'red' ? '15, 15' : null
                                    }}
                                    onEachFeature={(feature, layer) => {
                                        layer.bindPopup(`
                                            <div style="text-align:center">
                                                <b style="color:#2c3e50; font-size:14px">${route.arac_plaka}</b>
                                                ${route.color === 'red' ? '<br/><span style="color:red; font-weight:bold; font-size:10px">(KİRALIK ARAÇ)</span>' : ''}
                                                <hr style="margin:5px 0; border-top:1px solid #eee"/>
                                                <div style="font-size:12px">
                                                    💰 <b>Maliyet:</b> ${route.maliyet} TL<br/>
                                                    📊 <b>Doluluk:</b> %${route.doluluk_orani}<br/>
                                                    🛣️ <b>Yol:</b> ${route.toplam_km} km
                                                </div>
                                            </div>
                                        `);
                                    }}
                                />
                            );
                        })}
                    </React.Fragment>
                );
            })}

            {/* --- İSTASYON MARKERLARI (KULLANICI/ADMİN AYRIMLI) --- */}
            {stations.map((station) => {
              
              const stationCargos = cargos.filter(c => c.source_id === station.id);
              const totalWeight = stationCargos.reduce((sum, c) => sum + c.agirlik, 0);
              const totalCount = stationCargos.reduce((sum, c) => sum + (c.adet || 1), 0);
              const hasCargo = totalWeight > 0;
              const isCenter = station.ad === "Umuttepe";
              const isFocused = focusedStations.includes(station.ad);

              let pinColor = '#3498db'; 
              let zIndexOffset = 0;
              let cssClass = 'modern-pin';

              if (isCenter) {
                  pinColor = '#9b59b6'; 
                  zIndexOffset = 1000;  
              } 
              else if (userRole === 'admin' && hasCargo) {
                  pinColor = '#e74c3c'; 
                  zIndexOffset = 500;
                  cssClass += ' pulse-glow';
              } 
              else if (userRole === 'user' && isFocused) {
                  pinColor = '#e74c3c'; 
                  zIndexOffset = 500;
                  cssClass += ' pulse-glow';
              }

              // SVG PİN TASARIMI
              const svgIcon = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36">
                  <path fill="${pinColor}" stroke="white" stroke-width="1.5" 
                    d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                  />
                </svg>
              `;

              const customIcon = L.divIcon({
                  className: cssClass,
                  html: svgIcon,
                  iconSize: [36, 36],
                  iconAnchor: [18, 36], 
                  popupAnchor: [0, -38] 
              });

              return (
                <Marker 
                  key={station.id} 
                  position={[station.lat, station.lon]}
                  icon={customIcon}
                  zIndexOffset={zIndexOffset}
                >
                  <Popup>
                    {userRole === 'admin' ? (
                        // --- ADMIN GÖRÜNÜMÜ (DETAYLI) ---
                        <div style={{ textAlign: 'center', fontFamily: 'sans-serif', minWidth:'140px' }}>
                          <b style={{ fontSize: '15px', color: '#2c3e50' }}>{station.ad}</b>
                          {isCenter && <div style={{fontSize:'10px', color:'#9b59b6', fontWeight:'bold', marginTop:'-2px'}}>DAĞITIM MERKEZİ</div>}
                          <hr style={{ margin: '6px 0', border: '0', borderTop: '1px solid #eee' }}/>
                          
                          {hasCargo ? (
                            <div style={{ color: '#c0392b', backgroundColor:'#fff5f5', padding:'5px', borderRadius:'4px', border:'1px solid #fab1a0' }}>
                              <span style={{fontWeight:'bold', fontSize:'14px'}}>📦 {totalWeight} kg</span><br/>
                              <span style={{ fontSize: '11px', color: '#7f8c8d' }}>
                                 {totalCount} parça bekliyor
                              </span>
                            </div>
                          ) : (
                            <div style={{ color: '#95a5a6', fontSize: '12px', fontStyle:'italic' }}>
                              Yük Yok
                            </div>
                          )}
                        </div>
                    ) : (
                        // --- KULLANICI GÖRÜNÜMÜ (SADE) ---
                        <div style={{ textAlign: 'center', fontFamily: 'sans-serif', minWidth:'100px', padding:'5px' }}>
                          <b style={{ fontSize: '15px', color: '#2c3e50' }}>{station.ad}</b>
                          <div style={{ fontSize: '11px', color: '#7f8c8d', marginTop:'2px', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                             {isCenter ? 'MERKEZİ DAĞITIM' : 'KARGO ŞUBESİ'}
                          </div>
                        </div>
                    )}
                  </Popup>
                </Marker>
              );
            })}
            {/* --- 3. ARAÇ BAŞLANGIÇ KONUMLARI (KULLANICI SEÇİMİNE GÖRE DİNAMİK) --- */}
            {plannedRoutes.map((route, idx) => {
               // --- KONUM BELİRLEME MANTIĞI (GÜNCELLENDİ) ---
                let targetStationName = route.rota_isimleri[0]; 
                if (userRole === 'user' && userOrigin) {
                    if (route.rota_isimleri.includes(userOrigin)) {
                        targetStationName = userOrigin; 
                    }
                }
                const startStation = stations.find(s => s.ad === targetStationName);

                if (!startStation) return null;
                const shiftDown = 0.001; 
                const offsetLon = (Math.random() - 0.5) * 0.003; 
                const vehiclePos = [
                    startStation.lat + shiftDown, 
                    startStation.lon + offsetLon
                ];

                // --- RENK VE İKON AYARLARI ---
                const isRental = route.color === 'red';
                const truckColor = isRental ? '#e74c3c' : '#1e3799'; 
                
                const svgContent = `
                    <path d="M624 352h-16V243.9c0-12.7-5.1-24.9-14.1-33.9L494 110.1c-9-9-21.2-14.1-33.9-14.1H416V48c0-26.5-21.5-48-48-48H112C85.5 0 64 21.5 64 48v48H8c-4.4 0-8 3.6-8 8v16c0 4.4 3.6 8 8 8h272c4.4 0 8 3.6 8 8v16c0 4.4-3.6 8-8 8H40c-4.4 0-8 3.6-8 8v16c0 4.4 3.6 8 8 8h208c4.4 0 8 3.6 8 8v16c0 4.4-3.6 8-8 8H8c-4.4 0-8 3.6-8 8v16c0 4.4 3.6 8 8 8h208c4.4 0 8 3.6 8 8v16c0 4.4-3.6 8-8 8H64v128c0 53 43 96 96 96s96-43 96-96h128c0 53 43 96 96 96s96-43 96-96h48c8.8 0 16-7.2 16-16v-32c0-8.8-7.2-16-16-16z" 
                          fill="none" stroke="white" stroke-width="60" stroke-linejoin="round" />
                    <path fill="${truckColor}" d="M624 352h-16V243.9c0-12.7-5.1-24.9-14.1-33.9L494 110.1c-9-9-21.2-14.1-33.9-14.1H416V48c0-26.5-21.5-48-48-48H112C85.5 0 64 21.5 64 48v48H8c-4.4 0-8 3.6-8 8v16c0 4.4 3.6 8 8 8h272c4.4 0 8 3.6 8 8v16c0 4.4-3.6 8-8 8H40c-4.4 0-8 3.6-8 8v16c0 4.4 3.6 8 8 8h208c4.4 0 8 3.6 8 8v16c0 4.4-3.6 8-8 8H8c-4.4 0-8 3.6-8 8v16c0 4.4 3.6 8 8 8h208c4.4 0 8 3.6 8 8v16c0 4.4-3.6 8-8 8H64v128c0 53 43 96 96 96s96-43 96-96h128c0 53 43 96 96 96s96-43 96-96h48c8.8 0 16-7.2 16-16v-32c0-8.8-7.2-16-16-16z"/>
                `;

                const vehicleIcon = L.divIcon({
                    className: 'truck-marker',
                    html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" width="34" height="34" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">${svgContent}</svg>`,
                    iconSize: [34, 34],
                    iconAnchor: [17, 0], 
                    tooltipAnchor: [0, -10]
                });

                return (
                    <Marker 
                        key={`vehicle-${idx}`}
                        position={vehiclePos}
                        icon={vehicleIcon}
                        zIndexOffset={2000}
                    >
                        <Tooltip 
                            direction="top" 
                            offset={[0, -5]} 
                            opacity={1}
                            className="custom-tooltip"
                        >
                            {userRole === 'admin' ? (
                                // --- ADMIN GÖRÜNÜMÜ (DETAYLI) ---
                                <div style={{textAlign:'center', lineHeight:'1.5', minWidth:'120px'}}>
                                    <div style={{fontSize:'13px', fontWeight:'bold', borderBottom:'1px solid rgba(255,255,255,0.2)', paddingBottom:'4px', marginBottom:'4px', color: '#ecf0f1'}}>
                                        {route.arac_plaka}
                                    </div>
                                    <div style={{display:'flex', alignItems:'center', gap:'8px', fontSize:'11px', marginBottom:'2px'}}>
                                        <span>Doluluk:</span>
                                        <span style={{color: route.doluluk_orani > 90 ? '#2ecc71' : '#f1c40f', fontWeight:'bold'}}>
                                            %{route.doluluk_orani}
                                        </span>
                                    </div>
                                    <div style={{fontSize:'11px'}}>
                                        ⚖️ Yük: <b>{(route.kapasite || (isRental ? 10000 : 5000)) * (route.doluluk_orani/100)} kg</b>
                                    </div>
                                    {isRental && (
                                        <div style={{marginTop:'4px', padding:'2px', background:'rgba(231, 76, 60, 0.2)', borderRadius:'4px', color:'#ff7675', fontSize:'10px', fontWeight:'bold'}}>
                                            KİRALIK
                                        </div>
                                    )}
                                </div>
                            ) : (
                                // --- KULLANICI GÖRÜNÜMÜ (SADE) ---
                                <div style={{textAlign:'center', padding:'5px', minWidth:'100px'}}>
                                    <div style={{
                                        fontSize:'14px', 
                                        fontWeight:'bold', 
                                        color: '#ecf0f1',
                                        marginBottom: '2px'
                                    }}>
                                        {route.arac_plaka}
                                    </div>
                                    <div style={{fontSize:'11px', color:'#bdc3c7'}}>
                                        {targetStationName === userOrigin ? 'Sizin Şubenizde' : 'Teslimat Aracı'}
                                    </div>
                                </div>
                            )}
                        </Tooltip>
                    </Marker>
                );
            })}
          </MapContainer>
        </div>
      </div>
      <Modal 
        isOpen={activeModal === 'stations'} 
        onClose={() => setActiveModal(null)} 
        title="İstasyon Yönetimi"
      >
        <StationManager 
          selectedLocation={tempLocation} 
          onSelectRequest={startLocationSelection}
          setIsProcessing={setIsStationProcessing} 
        />
      </Modal>
      <Modal 
        isOpen={activeModal === 'vehicles'} 
        onClose={() => setActiveModal(null)} 
        title="Araç Filosu Yönetimi"
      >
        <VehicleManager />
      </Modal>
      <Modal 
        isOpen={activeModal === 'cargos'} 
        onClose={() => setActiveModal(null)} 
        title="Kargo İşlemleri"
      >
        <CargoManager />
      </Modal>
      <Modal 
        isOpen={activeModal === 'scenarios'} 
        onClose={() => setActiveModal(null)} 
        title="Senaryo Yükle & Sıfırla"
      >
        <ScenarioSelector setGlobalLoading={setGlobalLoading}
        onScenarioLoaded={() => {
            setPlannedRoutes([]); 
            setCargos([]);       
            setActiveModal(null); 
            setTimeout(() => {
                fetchMapData(); 
            }, 500);
        }} />
      </Modal>
      {/* --- MALİYET ANALİZİ MODALI --- */}
      <Modal isOpen={activeModal === 'cost_analysis'} onClose={() => setActiveModal(null)} title="Maliyet ve Verimlilik Analizi">
         <CostAnalysis routes={plannedRoutes} />
      </Modal>
      {/* --- KARGO TAKİP PENCERESİ --- */}
      <Modal 
        isOpen={activeModal === 'tracking'} 
        onClose={() => setActiveModal(null)} 
        title="Kargo Takip Sistemi"
      >
        <CargoTracking 
            onShowOnMap={(cargoData) => {
                setActiveModal(null);
                setPlannedRoutes([]); 
                setFocusedStations([]); 
                setUserOrigin(null);
                
                setTimeout(() => {
                    const singleRoute = {
                        arac_plaka: cargoData.vehicle_plate,
                        rota_isimleri: cargoData.route,     
                        rota_geometrileri: cargoData.geometry, 
                        doluluk_orani: 0, 
                        kapasite: 0,
                        color: 'blue' 
                    };
                    setPlannedRoutes([singleRoute]); 
                    setFocusedStations(cargoData.route);
                    setUserOrigin(cargoData.origin);

                }, 200); 
            }}
        />
      </Modal>
      {/* --- GEÇMİŞ GÖNDERİLER PENCERESİ --- */}
      <Modal 
        isOpen={activeModal === 'history'} 
        onClose={() => setActiveModal(null)} 
        title="Geçmiş Gönderilerim"
      >
        <UserPastShipments />
      </Modal>
      <LoadingScreen 
        visible={isStationProcessing}  
        message="İSTASYON AĞA ENTEGRE EDİLİYOR" 
        subMessage="Yapay zeka, yeni istasyon ile diğer noktalar arasındaki tüm yolları hesaplıyor..."
      />
    </div>
  )
}
// --- ÖZEL BUTON BİLEŞENİ (Kod tekrarını önlemek için) ---
const MenuButton = ({ icon, text, color, onClick }) => (
  <button 
  onClick={onClick}
  style={{
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    padding: '12px 15px',
    backgroundColor: 'rgba(255,255,255,0.05)',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontSize: '14px',
    cursor: 'pointer',
    transition: '0.3s',
    textAlign: 'left',
    borderLeft: `4px solid ${color}` 
  }}
  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
  >
    <span style={{ fontSize: '18px', color: color }}>{icon}</span>
    {text}
  </button>
)
// --- MALİYET ANALİZİ BİLEŞENİ (GÜNCELLENMİŞ TASARIM) ---
const CostAnalysis = ({ routes }) => {
  const totalCost = routes.reduce((acc, curr) => acc + curr.maliyet, 0);
  const totalKm = routes.reduce((acc, curr) => acc + curr.toplam_km, 0);
  const totalVehicles = routes.length;
  const rentalCount = routes.filter(r => r.color === 'red').length;
  const fleetCount = totalVehicles - rentalCount;

  return (
      <div style={{ padding: '5px' }}>
          <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '15px', 
              marginBottom: '25px' 
          }}>
              <StatCard icon={<FaMoneyBillWave />} title="Toplam Maliyet" value={`${totalCost.toFixed(2)} TL`} color="#2c3e50" />
              <StatCard icon={<FaGasPump />} title="Toplam Yol" value={`${totalKm.toFixed(1)} km`} color="#e67e22" />
              <StatCard icon={<FaTruckLoading />} title="Filo Araçları" value={fleetCount} color="#3498db" />
              <StatCard icon={<FaRedo />} title="Kiralık Araç" value={rentalCount} color={rentalCount > 0 ? "#c0392b" : "#bdc3c7"} />
          </div>

          {/* 2. DETAYLI ARAÇ LİSTESİ */}
          <h3 style={{ 
              color: '#2c3e50', 
              borderBottom: '2px solid #e67e22',
              paddingBottom: '10px', 
              marginBottom: '15px',
              textTransform: 'uppercase',
              fontSize: '14px',
              letterSpacing: '1px'
          }}>
              Araç Bazlı Detaylar ve Verimlilik
          </h3>

          <div style={{ display: 'grid', gap: '15px', maxHeight: '400px', overflowY: 'auto', paddingRight: '5px' }}>
              {routes.map((route, idx) => (
                  <div key={idx} style={{ 
                      backgroundColor: '#fff', 
                      borderRadius: '8px', 
                      padding: '15px', 
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      borderLeft: `5px solid ${route.color === 'red' ? '#c0392b' : '#3498db'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                  }}>
                      {/* Sol Taraf: Araç Bilgisi */}
                      <div style={{ flex: 1.2 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                              <h4 style={{ margin: 0, color: '#2c3e50', fontSize: '16px' }}>{route.arac_plaka}</h4>
                              {route.color === 'red' && <span style={{ backgroundColor: '#c0392b', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 'bold' }}>KİRALIK</span>}
                          </div>
                          <div style={{ color: '#7f8c8d', fontSize: '11px', lineHeight: '1.4' }}>
                              {route.rota_isimleri.join(" ➔ ")}
                          </div>
                      </div>

                      {/* Orta Taraf: İstatistikler */}
                      <div style={{ flex: 1, display: 'flex', gap: '15px', justifyContent: 'center' }}>
                          <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: '10px', color: '#95a5a6', textTransform:'uppercase' }}>Maliyet</div>
                              <div style={{ fontWeight: 'bold', color: '#2c3e50', fontSize: '14px' }}>{Number(route.maliyet).toFixed(2)} TL</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: '10px', color: '#95a5a6', textTransform:'uppercase' }}>Mesafe</div>
                              <div style={{ fontWeight: 'bold', color: '#2c3e50', fontSize: '14px' }}>{route.toplam_km} km</div>
                          </div>
                      </div>

                      {/* Sağ Taraf: Doluluk Barı */}
                      <div style={{ flex: 1, paddingLeft: '15px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                              <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#7f8c8d' }}>Doluluk</span>
                              <span style={{ fontSize: '11px', fontWeight: 'bold', color: route.doluluk_orani > 90 ? '#27ae60' : '#e67e22' }}>%{route.doluluk_orani}</span>
                          </div>
                          <div style={{ width: '100%', height: '8px', backgroundColor: '#ecf0f1', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ 
                                  width: `${route.doluluk_orani}%`, 
                                  height: '100%', 
                                  backgroundColor: route.doluluk_orani > 90 ? '#27ae60' : (route.doluluk_orani > 50 ? '#f1c40f' : '#c0392b'),
                                  borderRadius: '4px'
                              }}></div>
                          </div>
                      </div>

                  </div>
              ))}
          </div>
      </div>
  );
};

// Yardımcı Kart Bileşeni
const StatCard = ({ icon, title, value, color }) => (
  <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '15px' }}>
      <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: `${color}20`, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
          {icon}
      </div>
      <div>
          <div style={{ fontSize: '12px', color: '#95a5a6', fontWeight: 'bold', textTransform: 'uppercase' }}>{title}</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2c3e50' }}>{value}</div>
      </div>
  </div>
);

export default App