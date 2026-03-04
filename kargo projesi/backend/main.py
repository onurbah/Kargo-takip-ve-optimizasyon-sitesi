from fastapi import FastAPI, Depends, HTTPException # Depends ve HTTPException eklendi
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session 
from database import create_db, SessionLocal, User, Station, Distance, Vehicle, ExpeditionLog, Cargo
from contextlib import asynccontextmanager
import requests, time, json, socket, os, math

try:
    socket.getaddrinfo('aws-1-ap-northeast-2.pooler.supabase.com', 6543)
except socket.gaierror:
    print(">>> ⚠️ Ağ Uyumluluk Modu (IPv4) Devrede...")
    socket.getaddrinfo = lambda *args, **kwargs: socket.getaddrinfo(*args, **kwargs, family=socket.AF_INET)

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db() 
    init_data()
    yield

app = FastAPI(lifespan=lifespan)
LATEST_ROUTES = []
# --- CORS AYARI (Frontend erişimi için) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
create_db()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- BAŞLANGIÇ VERİLERİNİ EKLEME FONKSİYONU ---
def init_data():
    db = SessionLocal()
    
    # 1. ADMIN KONTROLÜ
    if not db.query(User).filter(User.username == "admin").first():
        print("Admin kullanıcısı oluşturuluyor...")
        admin_user = User(username="admin", password="1234", role="admin")
        normal_user = User(username="kullanici", password="1234", role="user")
        db.add(admin_user)
        db.add(normal_user)
        db.commit()
        print("Kullanıcılar eklendi.")

    # 2. ARAÇ KONTROLÜ (Proje Dökümanı: 500, 750, 1000 kg kapasiteli 3 araç)
    if db.query(Vehicle).count() == 0:
        print("Başlangıç araçları ekleniyor...")
        v1 = Vehicle(plaka="41 KOU 01", kapasite=500, hiz=1.0)
        v2 = Vehicle(plaka="41 KOU 02", kapasite=750, hiz=1.0)
        v3 = Vehicle(plaka="41 KOU 03", kapasite=1000, hiz=1.0)
        db.add_all([v1, v2, v3])
        db.commit()
        print("Araçlar filoya eklendi.")
    
    db.close()

# Kocaeli İlçeleri
ILCELER = [
    {"ad": "Basiskele", "lat": 40.7115, "lon": 29.9284},
    {"ad": "Cayirova", "lat": 40.8136, "lon": 29.3726},
    {"ad": "Darica", "lat": 40.7735, "lon": 29.4003},
    {"ad": "Derince", "lat": 40.7562, "lon": 29.8309},
    {"ad": "Dilovasi", "lat": 40.7875, "lon": 29.5445},
    {"ad": "Gebze", "lat": 40.8025, "lon": 29.4397},
    {"ad": "Golcuk", "lat": 40.7165, "lon": 29.8243},
    {"ad": "Kandira", "lat": 41.0706, "lon": 30.1534},
    {"ad": "Karamursel", "lat": 40.6917, "lon": 29.6163},
    {"ad": "Kartepe", "lat": 40.7533, "lon": 30.0217},
    {"ad": "Korfez", "lat": 40.7635, "lon": 29.7824},
    {"ad": "Izmit", "lat": 40.7654, "lon": 29.9406},
]

ARACLAR = [
    {"plaka": "41 BB 001", "kapasite": 500},
    {"plaka": "41 BB 002", "kapasite": 750},
    {"plaka": "41 BB 003", "kapasite": 1000},
]

@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    
    # 1. İstasyonları Ekle
    if db.query(Station).count() == 0:
        for ilce in ILCELER:
            db.add(Station(ad=ilce["ad"], lat=ilce["lat"], lon=ilce["lon"]))
        db.commit()
    
    # 2. Araçları Ekle
    if db.query(Vehicle).count() == 0:
        for arac in ARACLAR:
            db.add(Vehicle(plaka=arac["plaka"], kapasite=arac["kapasite"]))
        db.commit()

    # 3. Mesafeleri Hesapla (YENİ)
    fill_distances(db)
    
    db.close()

@app.get("/")
def read_root():
    return {"durum": "Kargo Sistemi Hazır", "not": "Veritabanı ve Mesafe Matrisi Yüklü"}

@app.get("/stations")
def get_stations(db: Session = Depends(get_db)):
    return db.query(Station).all()

class StationCreate(BaseModel):
    ad: str
    lat: float
    lon: float

@app.post("/stations")
def create_station(station: StationCreate, db: Session = Depends(get_db)):
    """
    Yeni bir istasyon ekler ve OTOMATİK olarak diğer istasyonlarla rotalarını hesaplar.
    """
    existing = db.query(Station).filter(Station.ad == station.ad).first()
    if existing:
        raise HTTPException(status_code=400, detail="Bu isimde bir istasyon zaten var.")

    # 2. İstasyonu Kaydet
    new_station = Station(ad=station.ad, lat=station.lat, lon=station.lon)
    db.add(new_station)
    db.commit()
    db.refresh(new_station)
    
    # 3. ROTA HESAPLAMA (Incremental)
    other_stations = db.query(Station).filter(Station.id != new_station.id).all()
    
    print(f">>> 🆕 Yeni İstasyon: {new_station.ad} için rotalar hesaplanıyor...")
    
    count = 0
    for other in other_stations:
        pairs = [(new_station, other), (other, new_station)]
        
        for s1, s2 in pairs:
            try:
                url = f"http://router.project-osrm.org/route/v1/driving/{s1.lon},{s1.lat};{s2.lon},{s2.lat}?overview=full&geometries=geojson"
                r = requests.get(url, timeout=2)
                
                if r.status_code == 200:
                    data = r.json()
                    route = data["routes"][0]
                    dist_km = route["distance"] / 1000.0
                    geo_json_data = route["geometry"] 

                    new_dist = Distance(
                        source_id=s1.id,
                        target_id=s2.id,
                        mesafe_km=dist_km,
                        geometry=geo_json_data 
                    )
                    db.add(new_dist)
                    count += 1
            except Exception as e:
                print(f"⚠️ Rota hatası ({s1.ad}->{s2.ad}): {e}")
    
    db.commit() 
    print(f">>> ✅ {new_station.ad} sisteme entegre edildi. {count} yeni rota eklendi.")

    return new_station

@app.delete("/stations/{station_id}")
def delete_station(station_id: int, db: Session = Depends(get_db)):
    """
    İstasyonu siler (Önce bağlı olduğu rotaları temizler).
    """
    station = db.query(Station).filter(Station.id == station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail="İstasyon bulunamadı")
    
    db.query(Distance).filter(
        (Distance.source_id == station_id) | (Distance.target_id == station_id)
    ).delete()

    db.delete(station)
    db.commit()
    
    return {"message": "İstasyon ve bağlı rotaları başarıyla silindi"}

@app.get("/distances")
def get_distances(db: Session = Depends(get_db)):
    return db.query(Distance).all()

class LoginRequest(BaseModel):
    username: str
    password: str

# --- YENİ LOGIN FONKSİYONU (VERİTABANLI) ---
@app.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == request.username).first()
    if not user:
        return {"status": "error", "message": "Kullanıcı bulunamadı!"}
    if user.password != request.password:
        return {"status": "error", "message": "Şifre hatalı!"}
    return {
        "status": "success", 
        "role": user.role, 
        "ad": user.username.upper() 
    }

@app.get("/force-reset-routes")
def force_reset_routes(db: Session = Depends(get_db)):
    """
    Bu endpoint veritabanındaki bozuk veya boş rota verilerini siler
    ve OSRM'den 132 rotayı sıfırdan çeker.
    """
    import requests
    import time
    import json

    print(">>> ⚠️ ACİL DURUM: Tüm eski rotalar siliniyor...")
    db.query(Distance).delete()
    db.commit()
    print(">>> ✅ Tablo temizlendi.")
    
    # 2. İstasyonları al
    stations = db.query(Station).all()
    if not stations:
        return {"status": "error", "message": "Önce istasyonları eklemelisin!"}

    print(">>> 🔄 OSRM Hesaplaması Başlatılıyor (Lütfen terminali izleyin)...")
    count = 0
    total = len(stations) * (len(stations) - 1)
    basarili_sayisi = 0

    for s1 in stations:
        for s2 in stations:
            if s1.id == s2.id: continue
            
            # OSRM İsteği
            url = f"http://router.project-osrm.org/route/v1/driving/{s1.lon},{s1.lat};{s2.lon},{s2.lat}?overview=full&geometries=geojson"
            
            try:
                r = requests.get(url, timeout=4) 
                
                if r.status_code == 200:
                    data = r.json()
                    route = data["routes"][0]
                    dist_km = route["distance"] / 1000.0
                    geo_json = json.dumps(route["geometry"])

                    # Veritabanına Ekle
                    new_dist = Distance(
                        source_id=s1.id,
                        target_id=s2.id,
                        mesafe_km=dist_km, 
                        geometry=geo_json
                    )
                    db.add(new_dist)
                    db.commit() 
                    
                    basarili_sayisi += 1
                    print(f"✅ [{basarili_sayisi}/{total}] Eklendi: {s1.ad} -> {s2.ad}")
                else:
                    print(f"❌ OSRM Vermedi: {s1.ad}-{s2.ad}")
                
                time.sleep(0.1)

            except Exception as e:
                print(f"⚠️ Hata: {s1.ad}-{s2.ad} -> {e}")
                db.rollback()

    return {"status": "success", "message": f"{basarili_sayisi} adet rota başarıyla oluşturuldu!"}

class VehicleCreate(BaseModel):
    plaka: str
    kapasite: int

@app.get("/vehicles")
def get_vehicles(db: Session = Depends(get_db)):
    """
    Filodaki tüm araçları listeler.
    """
    return db.query(Vehicle).all()

@app.post("/vehicles")
def create_vehicle(vehicle: VehicleCreate, db: Session = Depends(get_db)):
    """
    Yeni araç kiralar (Filoya ekler).
    """
    existing = db.query(Vehicle).filter(Vehicle.plaka == vehicle.plaka).first()
    if existing:
        raise HTTPException(status_code=400, detail="Bu plaka zaten filoda mevcut.")

    new_vehicle = Vehicle(
        plaka=vehicle.plaka, 
        kapasite=vehicle.kapasite, 
        hiz=1.0 
    )
    db.add(new_vehicle)
    db.commit()
    db.refresh(new_vehicle)
    return new_vehicle

@app.delete("/vehicles/{vehicle_id}")
def delete_vehicle(vehicle_id: int, db: Session = Depends(get_db)):
    """
    Aracı filodan çıkarır.
    """
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Araç bulunamadı")
    
    db.delete(vehicle)
    db.commit()
    return {"message": "Araç filodan çıkarıldı"}

# Kargo Ekleme Modeli (Gelen Veri)
class CargoCreate(BaseModel):
    source_id: int    
    target_id: int    
    agirlik: int     
    adet: int = 1
    gonderim_tarihi: str 

@app.get("/cargos")
def get_cargos(db: Session = Depends(get_db)):
    """
    Sistemdeki tüm kargoları listeler.
    """
    return db.query(Cargo).all()

@app.post("/cargos")
def create_cargo(cargo: CargoCreate, db: Session = Depends(get_db)):
    """
    Yeni kargo girişi yapar.
    """
    if cargo.source_id == cargo.target_id:
        raise HTTPException(status_code=400, detail="Giriş ve Çıkış istasyonları aynı olamaz!")

    new_cargo = Cargo(
        source_id=cargo.source_id,
        target_id=cargo.target_id,
        agirlik=cargo.agirlik,
        adet=cargo.adet,
        gonderim_tarihi=cargo.gonderim_tarihi,
        durum="Bekliyor" 
    )
    db.add(new_cargo)
    db.commit()
    db.refresh(new_cargo)
    return new_cargo

@app.delete("/cargos/{cargo_id}")
def delete_cargo(cargo_id: int, db: Session = Depends(get_db)):
    """
    Kargoyu siler.
    """
    cargo = db.query(Cargo).filter(Cargo.id == cargo_id).first()
    if not cargo:
        raise HTTPException(status_code=404, detail="Kargo bulunamadı")
    
    db.delete(cargo)
    db.commit()
    return {"message": "Kargo silindi"}

@app.post("/scenarios/load/{scenario_id}")
def load_scenario(scenario_id: int, db: Session = Depends(get_db)):
    """
    Seçilen senaryoyu yükler (1, 2, 3 veya 4).
    Önce sistemi temizler (Reset), sonra verileri basar.
    """
    print(f">>> 🔄 Senaryo {scenario_id} yükleme işlemi başlatıldı...")

    db.query(Cargo).delete()
    
    default_plates = ["41 KOU 01", "41 KOU 02", "41 KOU 03", "41 BB 001", "41 BB 002", "41 BB 003"]
    db.query(Vehicle).filter(Vehicle.plaka.notin_(default_plates)).delete()
    
    db.commit()

    target_station = db.query(Station).filter(Station.ad == "Umuttepe").first()
    if not target_station:
        target_station = db.query(Station).filter((Station.ad == "Izmit") | (Station.ad == "İzmit")).first()
    
    if not target_station:
        raise HTTPException(status_code=404, detail="Merkez istasyon (Umuttepe) bulunamadı!")
    
    target_id = target_station.id

    scenario_data = []

    if scenario_id == 1:
        scenario_data = [
            ("Basiskele", 10, 120), ("Cayirova", 8, 80), ("Darica", 15, 200),
            ("Derince", 10, 150), ("Dilovasi", 12, 180), ("Gebze", 5, 70),
            ("Golcuk", 7, 90), ("Kandira", 6, 60), ("Karamursel", 9, 110),
            ("Kartepe", 11, 130), ("Korfez", 6, 75), ("Izmit", 14, 160)
        ]
    elif scenario_id == 2:
        scenario_data = [
            ("Basiskele", 40, 200), ("Cayirova", 35, 175), ("Darica", 10, 150),
            ("Derince", 5, 100), ("Gebze", 8, 120), ("Izmit", 20, 160)
        ]
    elif scenario_id == 3:
        scenario_data = [
            ("Cayirova", 3, 700), ("Dilovasi", 4, 800), ("Gebze", 5, 900), ("Izmit", 5, 300)
        ]
    elif scenario_id == 4:
        scenario_data = [
            ("Basiskele", 30, 300), ("Golcuk", 15, 220), ("Kandira", 5, 250),
            ("Karamursel", 20, 180), ("Kartepe", 10, 200), ("Korfez", 8, 400)
        ]
    else:
         raise HTTPException(status_code=404, detail="Geçersiz Senaryo ID")

    added_count = 0
    for ilce_adi, adet_sayisi, toplam_agirlik in scenario_data:
        station = db.query(Station).filter(Station.ad == ilce_adi).first()
        
        if not station:
            tr_map = {"Basiskele": "Başiskele", "Cayirova": "Çayırova", "Darica": "Darıca", "Dilovasi": "Dilovası", "Golcuk": "Gölcük", "Kandira": "Kandıra", "Karamursel": "Karamürsel", "Korfez": "Körfez", "Izmit": "İzmit"}
            if ilce_adi in tr_map:
                station = db.query(Station).filter(Station.ad == tr_map[ilce_adi]).first()

        if station:
            new_cargo = Cargo(
                source_id=station.id,
                target_id=target_id,
                agirlik=toplam_agirlik,
                adet=adet_sayisi,
                gonderim_tarihi="2025-12-10", 
                durum="Bekliyor"
            )
            db.add(new_cargo)
            added_count += 1
    db.commit()
    return {"status": "success", "message": f"Senaryo {scenario_id} başarıyla yüklendi! ({added_count} bölge güncellendi)"}

# --- ROTA OPTİMİZASYON ALGORİTMASI ---

def get_distance_matrix(db: Session):
    """Veritabanındaki mesafe tablosunu Python sözlüğüne çevirir: {(id1, id2): km}"""
    distances = db.query(Distance).all()
    dist_matrix = {}
    for d in distances:
        dist_matrix[(d.source_id, d.target_id)] = d.mesafe_km
        dist_matrix[(d.target_id, d.source_id)] = d.mesafe_km 
    return dist_matrix
def calculate_priority_score(dist_to_center, load_weight):
    return (dist_to_center * 0.6) + (load_weight * 0.4)

@app.post("/optimize")
def optimize_routes(db: Session = Depends(get_db)):
    print(">>> 🧠 Paralel Rota Algoritması (Split Delivery) Başlatıldı...")
    
    # 1. VERİLERİ HAZIRLA
    cargos = db.query(Cargo).filter(Cargo.durum == "Bekliyor").all()
    if not cargos:
        return {"status": "error", "message": "Taşınacak kargo bulunamadı!"}

    dist_matrix = get_distance_matrix(db)
    target_st = db.query(Station).filter(Station.ad == "Umuttepe").first()
    if not target_st: 
        target_st = db.query(Station).filter(Station.ad.ilike("%Izmit%")).first()
    center_id = target_st.id

    station_status = {}
    for c in cargos:
        if c.source_id not in station_status:
            station_status[c.source_id] = {"total_kg": 0, "cargos": []}
        
        weight = c.agirlik
        station_status[c.source_id]["total_kg"] += weight
        station_status[c.source_id]["cargos"].append({
            "id": c.id,
            "weight": weight,
            "original_obj": c
        })

    active_stations = list(station_status.keys())

    db_vehicles = db.query(Vehicle).all()
    fleet = sorted(db_vehicles, key=lambda x: x.kapasite, reverse=True)
    
    active_fleet = []
    for v in fleet:
        active_fleet.append({
            "vehicle": v,
            "current_location": None, 
            "remaining_cap": v.kapasite,
            "route_path": [], 
            "cargo_ids": [], 
            "is_rental": False,
            "closed": False 
        })

    for fleet_vehicle in active_fleet:
        if not active_stations: break 

        best_start = None
        max_score = -1

        for st_id in active_stations:
            dist = dist_matrix.get((st_id, center_id), 0)
            load = station_status[st_id]["total_kg"]
            score = calculate_priority_score(dist, load)
            
            if score > max_score:
                max_score = score
                best_start = st_id
        
        if best_start:
            fleet_vehicle["current_location"] = best_start
            fleet_vehicle["route_path"].append(best_start)
            st_data = station_status[best_start]
            current_cargos = list(st_data["cargos"])
            
            for cargo_item in current_cargos:
                if fleet_vehicle["remaining_cap"] <= 0: break
                
                can_take = min(fleet_vehicle["remaining_cap"], cargo_item["weight"])
                fleet_vehicle["remaining_cap"] -= can_take
                cargo_item["weight"] -= can_take
                st_data["total_kg"] -= can_take
                fleet_vehicle["cargo_ids"].append(cargo_item["id"])
                
                if cargo_item["weight"] <= 0:
                     st_data["cargos"].remove(cargo_item)

            if st_data["total_kg"] <= 0:
                active_stations.remove(best_start)
                del station_status[best_start]


    # 3. PARALEL ROTA DÖNGÜSÜ (Nearest Neighbor Yarışı)
    while active_stations:
        best_move = None 
        min_move_dist = float('inf')
        available_vehicles = [v for v in active_fleet if not v["closed"] and v["remaining_cap"] > 0]
        
        if not available_vehicles and active_stations:
             rental_idx = len(active_fleet)
             new_rental_db = Vehicle(id=9000 + rental_idx, plaka=f"KIRALIK-{rental_idx+1}", kapasite=500, hiz=1.0)
             
             rental_v_data = {
                "vehicle": new_rental_db,
                "current_location": None,
                "remaining_cap": 500,
                "route_path": [],
                "cargo_ids": [],
                "is_rental": True,
                "closed": False
             }
             active_fleet.append(rental_v_data)
             
             bs, ms = None, -1
             for s in active_stations:
                 d = dist_matrix.get((s, center_id), 0)
                 l = station_status[s]["total_kg"]
                 sc = calculate_priority_score(d, l)
                 if sc > ms: ms=sc; bs=s
             
             if bs:
                 rental_v_data["current_location"] = bs
                 rental_v_data["route_path"].append(bs)
                 
                 st_d = station_status[bs]
                 c_cargos = list(st_d["cargos"])
                 for ci in c_cargos:
                     if rental_v_data["remaining_cap"] <= 0: break
                     take = min(rental_v_data["remaining_cap"], ci["weight"])
                     rental_v_data["remaining_cap"] -= take
                     ci["weight"] -= take
                     st_d["total_kg"] -= take
                     rental_v_data["cargo_ids"].append(ci["id"])
                     if ci["weight"] <= 0: st_d["cargos"].remove(ci)
                 
                 if st_d["total_kg"] <= 0:
                     active_stations.remove(bs)
                     del station_status[bs]
                 
                 continue

        for v_idx, v_data in enumerate(active_fleet):
            if v_data["closed"] or v_data["remaining_cap"] <= 0: continue
            
            current_loc = v_data["current_location"]
            if current_loc is None: continue 

            for st_id in active_stations:
                dist = dist_matrix.get((current_loc, st_id), 1000.0)
                
                if dist < min_move_dist:
                    min_move_dist = dist
                    best_move = {"v_idx": v_idx, "target": st_id, "dist": dist}
        
        if not best_move:
            break

        chosen_vehicle = active_fleet[best_move["v_idx"]]
        target = best_move["target"]
        
        chosen_vehicle["current_location"] = target
        chosen_vehicle["route_path"].append(target)
        
        st_data = station_status[target]
        current_cargos = list(st_data["cargos"])
        
        for cargo_item in current_cargos:
            if chosen_vehicle["remaining_cap"] <= 0: break
            
            can_take = min(chosen_vehicle["remaining_cap"], cargo_item["weight"])
            chosen_vehicle["remaining_cap"] -= can_take
            
            cargo_item["weight"] -= can_take
            st_data["total_kg"] -= can_take
            chosen_vehicle["cargo_ids"].append(cargo_item["id"])
            
            if cargo_item["weight"] <= 0:
                 st_data["cargos"].remove(cargo_item)
        
        if st_data["total_kg"] <= 0:
            active_stations.remove(target)
            del station_status[target]
    
    # 4. SONUÇLARI KAYDET VE HESAPLA (GÜNCELLENDİ: Geometri Verisi Eklendi)
    final_results = []
    
    import json 

    for v_data in active_fleet:
        if not v_data["route_path"]: continue 
        
        final_route = list(v_data["route_path"])
        if final_route[-1] != center_id:
            final_route.append(center_id)
            
        total_km = 0
        route_names = []
        route_geometries = []
        
        for rid in final_route:
            st = db.query(Station).filter(Station.id == rid).first()
            if st: route_names.append(st.ad)
            
        for i in range(len(final_route) - 1):
            u = final_route[i]
            v = final_route[i+1]
            
            dist_obj = db.query(Distance).filter(
                ((Distance.source_id == u) & (Distance.target_id == v)) |
                ((Distance.source_id == v) & (Distance.target_id == u))
            ).first()

            if dist_obj:
                total_km += dist_obj.mesafe_km
                geo_data = dist_obj.geometry
                
                if isinstance(geo_data, str):
                    try:
                        import json
                        geo_data = json.loads(geo_data)
                    except:
                        geo_data = None 

                if geo_data:
                    route_geometries.append(geo_data)
                
            else:
                pass

        cost = total_km * 1.0
        if v_data["is_rental"]:
            cost += 200.0 
            
        db_veh_id = v_data["vehicle"].id if not v_data["is_rental"] else None
        
        log = ExpeditionLog(
            arac_id=db_veh_id if db_veh_id else 0, 
            rota_bilgisi=" -> ".join(route_names),
            toplam_maliyet=cost,
            tarih="2025-12-25" 
        )
        db.add(log)
        
        if v_data["cargo_ids"]:
            unique_ids = list(set(v_data["cargo_ids"]))
            db.query(Cargo).filter(Cargo.id.in_(unique_ids)).update(
                {"durum": f"Dağıtımda ({v_data['vehicle'].plaka})"}, 
                synchronize_session=False
            )
            
        final_results.append({
            "arac_plaka": v_data["vehicle"].plaka,
            "rota_isimleri": route_names,
            "rota_idleri": final_route,
            "rota_geometrileri": route_geometries, 
            "toplam_km": round(total_km, 2),
            "maliyet": cost,
            "doluluk_orani": round(((v_data["vehicle"].kapasite - v_data["remaining_cap"]) / v_data["vehicle"].kapasite) * 100, 1),
            "kapasite": v_data["vehicle"].kapasite,
            "color": "red" if v_data["is_rental"] else "blue"
        })
        global LATEST_ROUTES
        LATEST_ROUTES = final_results

    db.commit()
    return {"status": "success", "results": final_results}

# --- SİMÜLASYONU SIFIRLA (TEMİZ SAYFA) ---
@app.post("/reset")
def reset_simulation(db: Session = Depends(get_db)):
    try:
        db.query(Cargo).delete()
        db.query(ExpeditionLog).delete()
        db.commit()
        return {"status": "success", "message": "Sistem tamamen sıfırlandı."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    
# --- KARGO TAKİP ENDPOINT'İ (GÜNCELLENMİŞ) ---
@app.post("/track")
async def track_cargo(data: dict):
    origin_station = data.get("station_name", "").strip()
    
    if not LATEST_ROUTES:
        raise HTTPException(status_code=404, detail="Henüz sisteme yüklenmiş ve planlanmış bir rota yok.")

    if not origin_station:
        raise HTTPException(status_code=400, detail="Lütfen kargonuzu teslim ettiğiniz şubeyi seçiniz.")

    found_vehicle = None
    for route in LATEST_ROUTES:
        route_stops_normalized = [r.upper().replace("İ", "I") for r in route["rota_isimleri"]]
        target_normalized = origin_station.upper().replace("İ", "I")

        if target_normalized in route_stops_normalized:
            found_vehicle = route
            break
    
    if found_vehicle:
        fake_tracking_code = f"TR-{origin_station.upper()}-KOU"
        
        return {
            "status": "success",
            "data": {
                "id": fake_tracking_code,
                "status": "Transfer Aşamasında",
                "vehicle_plate": found_vehicle["arac_plaka"],
                "route": found_vehicle["rota_isimleri"],
                "origin": origin_station,
                "destination": "Kocaeli Üniversitesi (Umuttepe)", 
                "estimated": "Bugün Teslimat",
                "geometry": found_vehicle["rota_geometrileri"]
            }
        }
    else:
        raise HTTPException(status_code=404, detail=f"'{origin_station}' şubesinden alım yapan bir araç planlanmadı.")