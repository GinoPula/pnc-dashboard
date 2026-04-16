from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from datetime import datetime
import os, glob

DATA_DIR = os.getenv("DATA_DIR", "/app/data")

app = FastAPI(title="PNC Maquinarias API", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

def get_latest(prefix):
    f = os.path.join(DATA_DIR, f"{prefix}_latest.xlsx")
    if os.path.exists(f): return f
    files = sorted(glob.glob(os.path.join(DATA_DIR, f"{prefix}_*.xlsx")), reverse=True)
    return files[0] if files else None

def file_date(f):
    if not f or not os.path.exists(f): return None
    return datetime.fromtimestamp(os.path.getmtime(f)).strftime("%d/%m/%Y %H:%M")

@app.get("/api/health")
def health():
    f = get_latest("inter") or get_latest("intervenciones")
    return {"status":"ok","ultima_actualizacion": file_date(f) or "Sin datos"}

@app.get("/api/data/intervenciones")
def intervenciones():
    f = get_latest("inter") or get_latest("intervenciones")
    if not f: return {"error":"Sin datos"}
    return FileResponse(f, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

@app.get("/api/data/maquinaria")
def maquinaria():
    f = get_latest("estado_maquinaria")
    if not f: return {"error":"Sin datos"}
    return FileResponse(f, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")