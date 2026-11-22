# services.py
import csv
import io
import json
import uuid
import random
from database import get_db, init_db
from weather_service import obtine_prognoza_lunara

init_db()


def obtine_gospodarii():
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM gospodarii")
        rows = cursor.fetchall()

        gospodarii = []
        for r in rows:
            disp_raw = json.loads(r["dispozitive"]) if r["dispozitive"] else []
            # Ne asigurăm că fiecare dispozitiv are câmpul 'activ' (implicit True)
            disp = [
                {
                    "nume": d["nume"],
                    "putere_w": d["putere_w"],
                    "activ": d.get("activ", True)
                }
                for d in disp_raw
            ]
            surse = json.loads(r["surse"]) if r["surse"] else []

            gospodarii.append({
                "id": str(r["id"]),
                "nume": r["nume"],
                "adresa": r["adresa"],
                "capacitate_kw": r["capacitate_kw"] if r["capacitate_kw"] is not None else 5.0,
                "panouri": r["panouri"] if r["panouri"] is not None else 10,
                "dispozitive": disp,
                "surse": surse
            })
        return gospodarii
    finally:
        conn.close()


def adauga_gospodarie(nume: str, adresa: str, capacitate_kw: float):
    conn = get_db()
    try:
        cursor = conn.cursor()
        new_id = str(uuid.uuid4())[:8]
        panouri = int(capacitate_kw * 2.2)
        disp = json.dumps([])
        surse = json.dumps([{"tip": "Panouri Solare (Fotovoltaic)", "capacitate_kw": capacitate_kw}])

        cursor.execute(
            "INSERT INTO gospodarii VALUES (?, ?, ?, ?, ?, ?, ?)",
            (new_id, nume, adresa, capacitate_kw, panouri, disp, surse)
        )
        conn.commit()
        return {
            "id": new_id,
            "nume": nume,
            "adresa": adresa,
            "capacitate_kw": capacitate_kw,
            "panouri": panouri,
            "dispozitive": [],
            "surse": json.loads(surse)
        }
    finally:
        conn.close()


def adauga_dispozitiv_gospodarie(house_id: str, nume: str, putere_w: float):
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT dispozitive FROM gospodarii WHERE id = ?", (house_id,))
        row = cursor.fetchone()
        if row:
            dispozitive = json.loads(row["dispozitive"]) if row["dispozitive"] else []
            dispozitive.append({"nume": nume, "putere_w": putere_w, "activ": True})
            cursor.execute(
                "UPDATE gospodarii SET dispozitive = ? WHERE id = ?",
                (json.dumps(dispozitive, ensure_ascii=False), house_id)
            )
            conn.commit()
    finally:
        conn.close()
    return next((g for g in obtine_gospodarii() if g["id"] == house_id), None)


def toggle_dispozitiv_gospodarie(house_id: str, index: int):
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT dispozitive FROM gospodarii WHERE id = ?", (house_id,))
        row = cursor.fetchone()
        if row:
            dispozitive = json.loads(row["dispozitive"]) if row["dispozitive"] else []
            if 0 <= index < len(dispozitive):
                stare_curenta = dispozitive[index].get("activ", True)
                dispozitive[index]["activ"] = not stare_curenta
                cursor.execute(
                    "UPDATE gospodarii SET dispozitive = ? WHERE id = ?",
                    (json.dumps(dispozitive, ensure_ascii=False), house_id)
                )
                conn.commit()
    finally:
        conn.close()
    return next((g for g in obtine_gospodarii() if g["id"] == house_id), None)


def sterge_dispozitiv_gospodarie(house_id: str, index: int):
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT dispozitive FROM gospodarii WHERE id = ?", (house_id,))
        row = cursor.fetchone()
        if row:
            dispozitive = json.loads(row["dispozitive"]) if row["dispozitive"] else []
            if 0 <= index < len(dispozitive):
                dispozitive.pop(index)
                cursor.execute(
                    "UPDATE gospodarii SET dispozitive = ? WHERE id = ?",
                    (json.dumps(dispozitive, ensure_ascii=False), house_id)
                )
                conn.commit()
    finally:
        conn.close()
    return next((g for g in obtine_gospodarii() if g["id"] == house_id), None)


def adauga_sursa_gospodarie(house_id: str, tip: str, capacitate_kw: float):
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT surse, capacitate_kw, panouri FROM gospodarii WHERE id = ?", (house_id,))
        row = cursor.fetchone()
        if row:
            surse = json.loads(row["surse"]) if row["surse"] else []
            surse.append({"tip": tip, "capacitate_kw": capacitate_kw})
            cap_noua = (row["capacitate_kw"] or 0) + (capacitate_kw if "Panouri" in tip else 0)
            panouri_noi = (row["panouri"] or 0) + (int(capacitate_kw * 2.2) if "Panouri" in tip else 0)

            cursor.execute(
                "UPDATE gospodarii SET surse = ?, capacitate_kw = ?, panouri = ? WHERE id = ?",
                (json.dumps(surse, ensure_ascii=False), cap_noua, panouri_noi, house_id)
            )
            conn.commit()
    finally:
        conn.close()
    return next((g for g in obtine_gospodarii() if g["id"] == house_id), None)


def sterge_sursa_gospodarie(house_id: str, index: int):
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT surse, capacitate_kw, panouri FROM gospodarii WHERE id = ?", (house_id,))
        row = cursor.fetchone()
        if row:
            surse = json.loads(row["surse"]) if row["surse"] else []
            if 0 <= index < len(surse):
                sursa_stearsa = surse.pop(index)
                cap_noua = row["capacitate_kw"] or 0.0
                panouri_noi = row["panouri"] or 0

                if "panouri" in sursa_stearsa.get("tip", "").lower():
                    cap_noua = max(0.0, round(cap_noua - float(sursa_stearsa.get("capacitate_kw", 0)), 2))
                    if cap_noua == 0:
                        panouri_noi = 0

                cursor.execute(
                    "UPDATE gospodarii SET surse = ?, capacitate_kw = ?, panouri = ? WHERE id = ?",
                    (json.dumps(surse, ensure_ascii=False), cap_noua, panouri_noi, house_id)
                )
                conn.commit()
    finally:
        conn.close()
    return next((g for g in obtine_gospodarii() if g["id"] == house_id), None)


def actualizeaza_panouri_gospodarie(house_id: str, panouri: int, capacitate_kw: float):
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT surse FROM gospodarii WHERE id = ?", (house_id,))
        row = cursor.fetchone()
        if not row:
            return None

        surse = json.loads(row["surse"]) if row["surse"] else []
        actualizat = False
        for s in surse:
            if "panouri" in s.get("tip", "").lower():
                s["capacitate_kw"] = capacitate_kw
                actualizat = True
                break

        if not actualizat and capacitate_kw > 0:
            surse.insert(0, {"tip": "Panouri Solare (Fotovoltaic)", "capacitate_kw": capacitate_kw})

        cursor.execute(
            "UPDATE gospodarii SET panouri = ?, capacitate_kw = ?, surse = ? WHERE id = ?",
            (panouri, capacitate_kw, json.dumps(surse, ensure_ascii=False), house_id)
        )
        conn.commit()
    finally:
        conn.close()

    return next((g for g in obtine_gospodarii() if g["id"] == house_id), None)


def sterge_gospodarie(house_id: str):
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM gospodarii WHERE id = ?", (house_id,))
        cursor.execute("DELETE FROM facturi WHERE house_id = ?", (house_id,))
        conn.commit()
        return {"status": "success", "deleted_id": house_id}
    finally:
        conn.close()


# --- FACTURI SPECIFICE FIECĂREI GOSPODĂRII ---
def obtine_sumar_facturi(house_id: str):
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM facturi WHERE house_id = ? ORDER BY id DESC", (house_id,))
        rows = cursor.fetchall()
        facturi = [dict(r) for r in rows]

        if not facturi:
            return {"facturi": [], "medie_kwh": 0, "medie_pret_kwh": 0}

        total_kwh = sum(f["kwh"] for f in facturi)
        total_cost = sum(f["cost_ron"] for f in facturi)
        medie_kwh = round(total_kwh / len(facturi), 1)
        medie_pret = round(total_cost / total_kwh, 2) if total_kwh > 0 else 0

        return {
            "facturi": facturi,
            "medie_kwh": medie_kwh,
            "medie_pret_kwh": medie_pret
        }
    finally:
        conn.close()


def adauga_factura_noua(house_id: str, luna: str, kwh: float, cost_ron: float):
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO facturi (house_id, luna, kwh, cost_ron) VALUES (?, ?, ?, ?)",
            (house_id, luna, kwh, cost_ron)
        )
        conn.commit()
    finally:
        conn.close()
    return obtine_sumar_facturi(house_id)


def sterge_factura(house_id: str, factura_id: int):
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM facturi WHERE id = ? AND house_id = ?", (factura_id, house_id))
        conn.commit()
    finally:
        conn.close()
    return obtine_sumar_facturi(house_id)


def exporta_facturi_csv(house_id: str):
    sumar = obtine_sumar_facturi(house_id)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Luna Facturata", "Consum (kWh)", "Total De Plata (RON)", "Cost Mediu (RON/kWh)"])
    for f in sumar["facturi"]:
        tarif = round(f["cost_ron"] / f["kwh"], 2) if f["kwh"] > 0 else 0.0
        writer.writerow([f["id"], f["luna"], f["kwh"], f["cost_ron"], tarif])
    return output.getvalue()


# --- ESTIMARE FACTURĂ LUNARĂ + SIMULATOR WHAT-IF ---
def estimeaza_factura_lunara(house_id: str, sezon: str = "live", grad_utilizare: int = 100):
    casa = next((g for g in obtine_gospodarii() if g["id"] == house_id), None)
    if not casa:
        return {"error": "Gospodăria nu a fost găsită"}

    if sezon == "primavara":
        oras_afisat = casa["adresa"]
        temp_medie = 16.5
        ore_soare_zi = 4.2
        luna_afisata = "Simulare Primăvară / Toamnă"
    elif sezon == "vara":
        oras_afisat = casa["adresa"]
        temp_medie = 25.5
        ore_soare_zi = 6.2
        luna_afisata = "Simulare Vară (Soare Maxim)"
    else:
        prognoza = obtine_prognoza_lunara(casa["adresa"])
        oras_afisat = prognoza["oras"]
        temp_medie = prognoza["temp_medie"]
        ore_soare_zi = prognoza["ore_soare_pe_zi"]
        luna_afisata = "Noiembrie 2026 (Prognoză Live)"

    factor_utilizare = max(10, min(100, grad_utilizare)) / 100.0
    factor_frig = 1.25 if temp_medie < 8.0 else (1.10 if temp_medie < 14.0 else 0.90)

    dispozitive_totale = len(casa["dispozitive"])
    dispozitive_active_lista = [d for d in casa["dispozitive"] if d.get("activ", True)]
    dispozitive_active = len(dispozitive_active_lista)

    consum_zilnic_kwh = 1.0 * factor_utilizare
    for d in dispozitive_active_lista:
        nume_d = d["nume"].lower()
        kw_aparat = d["putere_w"] / 1000.0

        if any(k in nume_d for k in ["frigider", "combină", "combina", "congelator", "ladă", "lada", "router"]):
            # Electrocasnicele permanente merg continuu indiferent de gradul de ocupare
            ore_zi = 7.5
            consum_zilnic_kwh += kw_aparat * ore_zi
        elif any(k in nume_d for k in ["bec", "led", "iluminat"]):
            ore_zi = 5.5 * factor_utilizare
            consum_zilnic_kwh += kw_aparat * ore_zi
        elif any(k in nume_d for k in ["tv", "pc", "laptop"]):
            ore_zi = 6.0 * factor_utilizare
            consum_zilnic_kwh += kw_aparat * ore_zi
        elif any(k in nume_d for k in ["aeroterm", "șemineu", "semineu", "radiator"]):
            ore_zi = 3.2 * factor_frig * factor_utilizare
            consum_zilnic_kwh += kw_aparat * ore_zi
        elif any(k in nume_d for k in ["aer condiționat", "ac"]):
            factor_ac = 1.35 if temp_medie > 23.0 else (1.15 * factor_frig)
            ore_zi = 3.0 * factor_ac * factor_utilizare
            consum_zilnic_kwh += kw_aparat * ore_zi
        elif "boiler" in nume_d:
            ore_zi = 2.4 * factor_frig * factor_utilizare
            consum_zilnic_kwh += kw_aparat * ore_zi
        else:
            ore_zi = 0.65 * factor_utilizare
            consum_zilnic_kwh += kw_aparat * ore_zi

    consum_estimat_kwh = round(consum_zilnic_kwh * 30 * random.uniform(0.95, 1.05), 1)

    # Producție solară pe 30 de zile
    capacitate_kw = casa["capacitate_kw"]
    productie_solara_kwh = round(
        capacitate_kw * ore_soare_zi * 30 * 0.82 * random.uniform(0.94, 1.06), 1
    )

    are_baterie = any("baterie" in s["tip"].lower() for s in casa.get("surse", []))
    rata_autoconsum = 0.80 if are_baterie else 0.55

    energie_acoperita_solar = min(consum_estimat_kwh * 0.92, productie_solara_kwh * rata_autoconsum)
    energie_retea_kwh = round(max(0.0, consum_estimat_kwh - energie_acoperita_solar), 1)
    surplus_retea_kwh = round(max(0.0, productie_solara_kwh - energie_acoperita_solar), 1)

    sumar_existent = obtine_sumar_facturi(house_id)
    if sumar_existent["medie_pret_kwh"] > 0:
        tarif_ron = sumar_existent["medie_pret_kwh"]
    else:
        tarif_ron = 0.80 if energie_retea_kwh <= 255 else 1.18

    cost_brut_retea = energie_retea_kwh * tarif_ron
    compensare_prosumator_ron = round(surplus_retea_kwh * 0.62, 2)

    factura_estimata_ron = round(max(0.0, cost_brut_retea - compensare_prosumator_ron), 2)
    credit_urmator_ron = round(max(0.0, compensare_prosumator_ron - cost_brut_retea), 2)
    economie_solara_ron = round(energie_acoperita_solar * tarif_ron + compensare_prosumator_ron, 2)

    return {
        "luna": luna_afisata,
        "oras": oras_afisat,
        "temp_medie": temp_medie,
        "ore_soare_zi": ore_soare_zi,
        "dispozitive_active": dispozitive_active,
        "dispozitive_totale": dispozitive_totale,
        "consum_estimat_kwh": consum_estimat_kwh,
        "productie_solara_kwh": productie_solara_kwh,
        "energie_retea_kwh": energie_retea_kwh,
        "surplus_retea_kwh": surplus_retea_kwh,
        "tarif_ron": tarif_ron,
        "compensare_prosumator_ron": compensare_prosumator_ron,
        "factura_estimata_ron": factura_estimata_ron,
        "credit_urmator_ron": credit_urmator_ron,
        "economie_solara_ron": economie_solara_ron
    }