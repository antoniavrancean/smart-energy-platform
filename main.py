# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from services import (
    adauga_gospodarie,
    obtine_gospodarii,
    adauga_dispozitiv_gospodarie,
    toggle_dispozitiv_gospodarie,
    sterge_dispozitiv_gospodarie,
    adauga_sursa_gospodarie,
    sterge_sursa_gospodarie,
    sterge_gospodarie,
    actualizeaza_panouri_gospodarie,
    obtine_sumar_facturi,
    adauga_factura_noua,
    sterge_factura,
    exporta_facturi_csv,
    estimeaza_factura_lunara
)
from weather_service import obtine_vremea_live_si_solara
import uvicorn

app = FastAPI(title="Energy Management API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class GospodarieSchema(BaseModel):
    nume: str
    adresa: str
    capacitate_kw: float


class DispozitivSchema(BaseModel):
    nume: str
    putere_w: float


class SursaSchema(BaseModel):
    tip: str
    capacitate_kw: float


class ActualizarePanouriSchema(BaseModel):
    panouri: int
    capacitate_kw: float


class FacturaSchema(BaseModel):
    luna: str
    kwh: float
    cost_ron: float


@app.get("/")
def acasa():
    return {"message": "API-ul Smart Energy rulează cu succes!"}


# --- GOSPODĂRII ---
@app.get("/api/gospodarii")
def get_gospodarii():
    return obtine_gospodarii()


@app.post("/api/gospodarii")
def post_gospodarie(data: GospodarieSchema):
    return adauga_gospodarie(data.nume, data.adresa, data.capacitate_kw)


@app.delete("/api/gospodarii/{house_id}")
def delete_gospodarie(house_id: str):
    return sterge_gospodarie(house_id)


@app.put("/api/gospodarii/{house_id}/panouri")
def put_panouri(house_id: str, data: ActualizarePanouriSchema):
    res = actualizeaza_panouri_gospodarie(house_id, data.panouri, data.capacitate_kw)
    return res or {"error": "Gospodăria nu a fost găsită"}


# --- DISPOZITIVE (ADĂUGARE, ON/OFF, ȘTERGERE) ---
@app.post("/api/gospodarii/{house_id}/dispozitive")
def post_dispozitiv(house_id: str, data: DispozitivSchema):
    res = adauga_dispozitiv_gospodarie(house_id, data.nume, data.putere_w)
    return res or {"error": "Gospodăria nu a fost găsită"}


@app.patch("/api/gospodarii/{house_id}/dispozitive/{index}/toggle")
def patch_toggle_dispozitiv(house_id: str, index: int):
    res = toggle_dispozitiv_gospodarie(house_id, index)
    return res or {"error": "Dispozitivul nu a fost găsit"}


@app.delete("/api/gospodarii/{house_id}/dispozitive/{index}")
def delete_dispozitiv(house_id: str, index: int):
    res = sterge_dispozitiv_gospodarie(house_id, index)
    return res or {"error": "Dispozitivul nu a fost găsit"}


# --- SURSE DE ENERGIE (ADĂUGARE & ȘTERGERE) ---
@app.post("/api/gospodarii/{house_id}/surse")
def post_sursa(house_id: str, data: SursaSchema):
    res = adauga_sursa_gospodarie(house_id, data.tip, data.capacitate_kw)
    return res or {"error": "Gospodăria nu a fost găsită"}


@app.delete("/api/gospodarii/{house_id}/surse/{index}")
def delete_sursa(house_id: str, index: int):
    res = sterge_sursa_gospodarie(house_id, index)
    return res or {"error": "Sursa nu a fost găsită"}


# --- VREME LIVE ---
@app.get("/api/vremea")
def get_vremea(oras: str = "Cluj-Napoca", capacitate_kw: float = 5.0):
    return obtine_vremea_live_si_solara(oras, capacitate_kw)


# --- FACTURI, EXPORT CSV & ESTIMARE WHAT-IF ---
@app.get("/api/gospodarii/{house_id}/facturi")
def get_facturi(house_id: str):
    return obtine_sumar_facturi(house_id)


@app.post("/api/gospodarii/{house_id}/facturi")
def post_factura(house_id: str, data: FacturaSchema):
    return adauga_factura_noua(house_id, data.luna, data.kwh, data.cost_ron)


@app.delete("/api/gospodarii/{house_id}/facturi/{factura_id}")
def delete_factura(house_id: str, factura_id: int):
    return sterge_factura(house_id, factura_id)


@app.get("/api/gospodarii/{house_id}/facturi/export")
def get_export_facturi(house_id: str):
    csv_content = exporta_facturi_csv(house_id)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=facturi_gospodarie_{house_id}.csv"}
    )


@app.get("/api/gospodarii/{house_id}/estimare")
def get_estimare(house_id: str, sezon: str = "live", grad_utilizare: int = 100):
    return estimeaza_factura_lunara(house_id, sezon, grad_utilizare)


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)