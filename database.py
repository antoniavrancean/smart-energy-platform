# database.py
import sqlite3
import json

DB_NAME = "energy_platform.db"

DISPOZITIVE_CASA_PRINCIPALA = [
    {"nume": "Becuri LED Living & Bucătărie (12 buc.)", "putere_w": 120},
    {"nume": "Combină Frigorifică No-Frost", "putere_w": 150},
    {"nume": "Congelator Vertical", "putere_w": 180},
    {"nume": "Aparat Aer Condiționat Living (Inverter)", "putere_w": 1200},
    {"nume": "Mașină de spălat rufe", "putere_w": 2000},
    {"nume": "Mașină de spălat vase", "putere_w": 1800},
    {"nume": "Cuptor Electric Incorporabil", "putere_w": 2400},
    {"nume": "Smart TV 4K & Router Wi-Fi", "putere_w": 140}
]

DISPOZITIVE_CASA_BISTRITA = [
    {"nume": "Becuri LED Interior & Curte (15 buc.)", "putere_w": 150},
    {"nume": "Frigider Side-by-Side", "putere_w": 220},
    {"nume": "Ladă Frigorifică (Congelator)", "putere_w": 200},
    {"nume": "Aparat Aer Condiționat Dormitor", "putere_w": 1000},
    {"nume": "Aerotermă Baie", "putere_w": 2000},
    {"nume": "Uscător de rufe cu pompă de căldură", "putere_w": 900},
    {"nume": "Espressor Cafea & Cuptor Microunde", "putere_w": 1450}
]

DISPOZITIVE_CABANA = [
    {"nume": "Becuri LED Cabană & Terasă (10 buc.)", "putere_w": 100},
    {"nume": "Șemineu Electric", "putere_w": 2000},
    {"nume": "Aerotermă Ceramică Dormitor", "putere_w": 1800},
    {"nume": "Boiler Electric Apă Caldă", "putere_w": 2200},
    {"nume": "Frigider Compact", "putere_w": 110},
    {"nume": "Plită Electrică cu Inducție", "putere_w": 2800},
    {"nume": "Radiator Electric Mansardă", "putere_w": 1500}
]


def init_db():
    """Creează tabelele în baza de date SQLite și populează dispozitive realiste."""
    conn = sqlite3.connect(DB_NAME, timeout=10)
    cursor = conn.cursor()

    # Tabel Gospodării
    cursor.execute("""
                   CREATE TABLE IF NOT EXISTS gospodarii
                   (
                       id TEXT PRIMARY KEY,
                       nume TEXT,
                       adresa TEXT,
                       capacitate_kw REAL,
                       panouri INTEGER,
                       dispozitive TEXT,
                       surse TEXT
                   )
                   """)

    # Tabel Facturi (legat de fiecare gospodărie prin house_id)
    cursor.execute("""
                   CREATE TABLE IF NOT EXISTS facturi
                   (
                       id INTEGER PRIMARY KEY AUTOINCREMENT,
                       house_id TEXT,
                       luna TEXT,
                       kwh REAL,
                       cost_ron REAL
                   )
                   """)

    # Migrare automată dacă tabelul vechi facturi nu avea coloana house_id
    cursor.execute("PRAGMA table_info(facturi)")
    coloane = [col[1] for col in cursor.fetchall()]
    if "house_id" not in coloane:
        cursor.execute("ALTER TABLE facturi ADD COLUMN house_id TEXT")
        cursor.execute("SELECT id FROM gospodarii LIMIT 1")
        prima_casa = cursor.fetchone()
        default_id = prima_casa[0] if prima_casa else "1"
        cursor.execute("UPDATE facturi SET house_id = ? WHERE house_id IS NULL", (default_id,))

    # Populăm gospodăriile dacă tabelul e complet gol
    cursor.execute("SELECT COUNT(*) FROM gospodarii")
    if cursor.fetchone()[0] == 0:
        surse_init = json.dumps([{"tip": "Panouri Solare (Fotovoltaic)", "capacitate_kw": 5.5}])
        cursor.execute(
            "INSERT INTO gospodarii VALUES (?, ?, ?, ?, ?, ?, ?)",
            ("1", "Casa Principală", "Cluj-Napoca", 5.5, 12,
             json.dumps(DISPOZITIVE_CASA_PRINCIPALA, ensure_ascii=False), surse_init)
        )

    # Populăm dispozitive realiste și variate pe casele existente care au <= 2 dispozitive
    cursor.execute("SELECT id, nume, adresa, dispozitive FROM gospodarii")
    preseturi = [DISPOZITIVE_CASA_PRINCIPALA, DISPOZITIVE_CASA_BISTRITA, DISPOZITIVE_CABANA]

    for idx, (house_id, nume, adresa, disp_json) in enumerate(cursor.fetchall()):
        disp_curente = json.loads(disp_json) if disp_json else []
        if len(disp_curente) <= 2:
            text_casa = f"{nume} {adresa}".lower()
            if "cabana" in text_casa or "paltinis" in text_casa or "păltiniș" in text_casa:
                lista_noua = DISPOZITIVE_CABANA
            elif "bistrit" in text_casa or "bistriț" in text_casa:
                lista_noua = DISPOZITIVE_CASA_BISTRITA
            else:
                lista_noua = preseturi[idx % len(preseturi)]

            cursor.execute(
                "UPDATE gospodarii SET dispozitive = ? WHERE id = ?",
                (json.dumps(lista_noua, ensure_ascii=False), house_id)
            )

    conn.commit()
    conn.close()


def get_db():
    conn = sqlite3.connect(DB_NAME, timeout=10)
    conn.row_factory = sqlite3.Row
    return conn