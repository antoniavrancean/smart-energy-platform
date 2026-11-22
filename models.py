# models.py

ELECTROCASNICE = {
    "mașină de spălat": {"putere_w": 2000, "durata_ore": 2},
    "cuptor": {"putere_w": 2500, "durata_ore": 1},
    "uscător de haine": {"putere_w": 2200, "durata_ore": 2},
    "încărcător ev": {"putere_w": 3500, "durata_ore": 4},
    "aspirator": {"putere_w": 1400, "durata_ore": 1}
}


# Gospodării cu liste proprii de dispozitive și surse
GOSPODARII_DB = [
    {
        "id": "1",
        "nume": "Casa Principală",
        "adresa": "Cluj-Napoca",
        "capacitate_kw": 5.5,
        "panouri": 12,
        "dispozitive": [
            {"nume": "Mașină de spălat rufe", "putere_w": 2000},
            {"nume": "Cuptor Electric", "putere_w": 2500}
        ],
        "surse": [
            {"tip": "Panouri Solare (Fotovoltaic)", "capacitate_kw": 5.5}
        ]
    },
    {
        "id": "2",
        "nume": "Cabana Munte",
        "adresa": "Belis",
        "capacitate_kw": 3.0,
        "panouri": 6,
        "dispozitive": [
            {"nume": "Aspirator", "putere_w": 1400}
        ],
        "surse": [
            {"tip": "Panouri Solare (Fotovoltaic)", "capacitate_kw": 3.0}
        ]
    }
]