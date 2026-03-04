from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, Text, Boolean, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.sql import func 

DATABASE_URL = "postgresql://postgres.cpdiacadhjldljhshgbe:YazlabProje@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?sslmode=require"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# 1. İstasyon Tablosu
class Station(Base):
    __tablename__ = "stations"
    id = Column(Integer, primary_key=True, index=True)
    ad = Column(String, unique=True, index=True)
    lat = Column(Float)
    lon = Column(Float)
    is_merkez = Column(Boolean, default=False)

# 2. Araç Tablosu
class Vehicle(Base):
    __tablename__ = "vehicles"
    id = Column(Integer, primary_key=True, index=True)
    plaka = Column(String, unique=True)
    kapasite = Column(Integer)
    hiz = Column(Float, default=1.0)

# 3. Mesafe Tablosu
class Distance(Base):
    __tablename__ = "distances"
    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(Integer, ForeignKey("stations.id")) 
    target_id = Column(Integer, ForeignKey("stations.id")) 
    mesafe_km = Column(Float)
    geometry = Column(JSON)

# 4. Kullanıcılar Tablosu (Giriş İçin)
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password = Column(String)
    role = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# 5. Sefer Logları
class ExpeditionLog(Base):
    __tablename__ = "expedition_logs"
    id = Column(Integer, primary_key=True, index=True)
    arac_id = Column(Integer)
    rota_bilgisi = Column(String)
    toplam_maliyet = Column(Float)
    tarih = Column(DateTime(timezone=True), server_default=func.now())

class Cargo(Base):
    __tablename__ = "cargos"
    
    id = Column(Integer, primary_key=True, index=True)
    gonderim_tarihi = Column(String) 
    agirlik = Column(Integer)
    adet = Column(Integer, default=1)  
    durum = Column(String, default="Bekliyor")
    
    source_id = Column(Integer, ForeignKey("stations.id"))
    target_id = Column(Integer, ForeignKey("stations.id"))

def create_db():
    Base.metadata.create_all(bind=engine)