# app/database.py
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")
if not SQLALCHEMY_DATABASE_URL:
  raise RuntimeError("DATABASE_URL no está configurada")

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,
    pool_size=3,        # 👈 pocas conexiones por proceso
    max_overflow=0,     # 👈 no permitas “extra” conexiones
    pool_recycle=180,   # 👈 recicla conexiones viejas
    connect_args={"sslmode": "require"},  # 👈 Supabase (Postgres) suele requerir SSL
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
