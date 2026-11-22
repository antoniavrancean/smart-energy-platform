# weather_service.py
import requests
from urllib.parse import quote


def obtine_coordonate(oras_sau_adresa: str):
    """Transformă numele orașului sau adresa în latitudine și longitudine folosind Open-Meteo Geocoding."""
    url = f"https://geocoding-api.open-meteo.com/v1/search?name={quote(oras_sau_adresa)}&count=1&language=ro&format=json"
    try:
        res = requests.get(url, timeout=5).json()
        if res.get("results"):
            locatie = res["results"][0]
            return {
                "nume": locatie.get("name"),
                "tara": locatie.get("country", ""),
                "lat": locatie["latitude"],
                "lon": locatie["longitude"]
            }
    except Exception as e:
        print(f"Eroare la Geocoding: {e}")

    return {"nume": oras_sau_adresa, "tara": "România", "lat": 46.77, "lon": 23.60}


def obtine_vremea_live_si_solara(oras: str, capacitate_kw: float = 5.0):
    """Preluare vreme în timp real pentru o locație specifică."""
    coords = obtine_coordonate(oras)
    lat, lon = coords["lat"], coords["lon"]

    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,cloud_cover,weather_code&hourly=direct_normal_irradiance&forecast_days=1"

    try:
        res = requests.get(url, timeout=5).json()
        current = res.get("current", {})
        temp = current.get("temperature_2m", 20.0)
        nori = current.get("cloud_cover", 0)

        if nori < 20:
            stare_vreme = "Cer Senin ☀️"
        elif nori < 70:
            stare_vreme = "Parțial Înnorat ⛅"
        else:
            stare_vreme = "Nori Abundenți ☁️"

        radiatie_orara = res["hourly"]["direct_normal_irradiance"]
        factor_panou = capacitate_kw * 0.8
        productie_orara_w = [round(r * factor_panou, 1) for r in radiatie_orara]

        return {
            "oras": coords["nume"],
            "tara": coords["tara"],
            "temperatura": temp,
            "nori_procente": nori,
            "stare_vreme": stare_vreme,
            "productie_solara_24h": productie_orara_w
        }
    except Exception as e:
        print(f"Eroare la preluarea vremii: {e}")
        return {
            "oras": oras,
            "tara": "România",
            "temperatura": 9.5,
            "nori_procente": 45,
            "stare_vreme": "Parțial Înnorat ⛅",
            "productie_solara_24h": [0] * 7 + [500 * capacitate_kw] * 7 + [0] * 10
        }


def obtine_prognoza_lunara(oras: str):
    """Preia prognoza meteo pe 14 zile (temperatură și radiație solară) pentru estimarea lunară."""
    coords = obtine_coordonate(oras)
    lat, lon = coords["lat"], coords["lon"]

    url = (
        f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}"
        f"&daily=temperature_2m_max,temperature_2m_min,shortwave_radiation_sum&forecast_days=14"
    )
    try:
        res = requests.get(url, timeout=5).json()
        daily = res.get("daily", {})
        t_max = daily.get("temperature_2m_max", [10.0])
        t_min = daily.get("temperature_2m_min", [2.0])
        radiatie = daily.get("shortwave_radiation_sum", [7.5])  # MJ/m²/zi

        temp_medie = round((sum(t_max) / len(t_max) + sum(t_min) / len(t_min)) / 2, 1)
        # Convertim MJ/m²/zi în ore echivalente de soare plin (kWh/m²/zi)
        ore_soare_pe_zi = round((sum(radiatie) / len(radiatie)) / 3.6, 2)

        return {
            "oras": coords["nume"],
            "temp_medie": temp_medie,
            "ore_soare_pe_zi": ore_soare_pe_zi
        }
    except Exception as e:
        print(f"Eroare prognoză lunară: {e}")
        return {
            "oras": oras,
            "temp_medie": 7.5,
            "ore_soare_pe_zi": 2.1
        }