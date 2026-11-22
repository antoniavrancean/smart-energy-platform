 import React, { useState, useEffect } from 'react';
import {
  House,
  Sun,
  Plug,
  Trash2,
  Zap,
  CloudSun,
  ArrowLeft,
  Plus,
  X,
  BatteryCharging,
  FileText,
  Coins,
  TrendingUp,
  RefreshCw,
  Pencil,
  Power,
  Download,
  Sliders,
  BarChart3
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';

const API_BASE = "http://127.0.0.1:8000";

export default function App() {
  const [gospodarii, setGospodarii] = useState([]);
  const [activeHouse, setActiveHouse] = useState(null);
  const [vreme, setVreme] = useState(null);
  const [apiError, setApiError] = useState(false);

  // Stări pentru Facturi & Estimare Lunară
  const [sumarFacturi, setSumarFacturi] = useState({ facturi: [], medie_kwh: 0, medie_pret_kwh: 0 });
  const [estimare, setEstimare] = useState(null);
  const [loadingEstimare, setLoadingEstimare] = useState(false);

  // Stări Simulator What-If
  const [sezonSimulare, setSezonSimulare] = useState("live");
  const [gradUtilizare, setGradUtilizare] = useState(100);

  // Stări pentru Modale ('house', 'device', 'source', 'invoice', 'edit-solar')
  const [modalType, setModalType] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchGospodarii();
  }, []);

  // Recalculează estimarea când se schimbă casa, sezonul sau gradul de utilizare
  useEffect(() => {
    if (!activeHouse?.id) return;
    const timer = setTimeout(() => {
      fetchEstimare(activeHouse.id, sezonSimulare, gradUtilizare);
    }, 200);
    return () => clearTimeout(timer);
  }, [activeHouse?.id, sezonSimulare, gradUtilizare]);

  const fetchGospodarii = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/gospodarii`);
      if (res.ok) {
        const data = await res.json();
        setGospodarii(Array.isArray(data) ? data : []);
        setApiError(false);
      } else {
        setApiError(true);
      }
    } catch (err) {
      console.error("Nu s-a putut conecta la FastAPI:", err);
      setApiError(true);
    }
  };

  const fetchFacturi = async (houseId) => {
    try {
      const res = await fetch(`${API_BASE}/api/gospodarii/${houseId}/facturi`);
      if (res.ok) {
        const data = await res.json();
        setSumarFacturi(data);
      }
    } catch (err) {
      console.error("Eroare preluare facturi:", err);
    }
  };

  const fetchEstimare = async (houseId, sezon = sezonSimulare, grad = gradUtilizare) => {
    setLoadingEstimare(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/gospodarii/${houseId}/estimare?sezon=${encodeURIComponent(sezon)}&grad_utilizare=${grad}`
      );
      if (res.ok) {
        const data = await res.json();
        setEstimare(data);
      }
    } catch (err) {
      console.error("Eroare preluare estimare:", err);
    } finally {
      setLoadingEstimare(false);
    }
  };

  const selectHouse = async (house) => {
    setSezonSimulare("live");
    setGradUtilizare(100);
    setActiveHouse(house);
    setSumarFacturi({ facturi: [], medie_kwh: 0, medie_pret_kwh: 0 });
    setEstimare(null);
    setVreme({ temperatura: "--", stare_vreme: "Se încarcă...", nori_procente: 0 });
    fetchFacturi(house.id);

    try {
      const res = await fetch(`${API_BASE}/api/vremea?oras=${encodeURIComponent(house.adresa)}&capacitate_kw=${house.capacitate_kw}`);
      if (res.ok) {
        const data = await res.json();
        setVreme(data);
      } else {
        setVreme({ temperatura: "--", stare_vreme: "Indisponibil", nori_procente: 0 });
      }
    } catch (err) {
      console.error("Eroare preluare vreme:", err);
      setVreme({ temperatura: "--", stare_vreme: "Offline", nori_procente: 0 });
    }
  };

  const stergeGospodarie = async (e, id) => {
    e.stopPropagation();
    if (window.confirm("Ștergi această gospodărie și toate facturile ei?")) {
      await fetch(`${API_BASE}/api/gospodarii/${id}`, { method: 'DELETE' });
      if (activeHouse?.id === id) setActiveHouse(null);
      fetchGospodarii();
    }
  };

  // --- ACȚIUNI DISPOZITIVE (ON/OFF & ȘTERGERE) ---
  const handleToggleDispozitiv = async (index) => {
    if (!activeHouse) return;
    const res = await fetch(`${API_BASE}/api/gospodarii/${activeHouse.id}/dispozitive/${index}/toggle`, {
      method: 'PATCH'
    });
    if (res.ok) {
      const updated = await res.json();
      setActiveHouse(updated);
      fetchGospodarii();
      fetchEstimare(activeHouse.id, sezonSimulare, gradUtilizare);
    }
  };

  const handleStergeDispozitiv = async (index) => {
    if (!activeHouse) return;
    const res = await fetch(`${API_BASE}/api/gospodarii/${activeHouse.id}/dispozitive/${index}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      const updated = await res.json();
      setActiveHouse(updated);
      fetchGospodarii();
      fetchEstimare(activeHouse.id, sezonSimulare, gradUtilizare);
    }
  };

  // --- ACȚIUNE ȘTERGERE SURSĂ ENERGIE ---
  const handleStergeSursa = async (index) => {
    if (!activeHouse) return;
    if (!window.confirm("Elimini această sursă de energie?")) return;
    const res = await fetch(`${API_BASE}/api/gospodarii/${activeHouse.id}/surse/${index}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      const updated = await res.json();
      setActiveHouse(updated);
      fetchGospodarii();
      fetchEstimare(activeHouse.id, sezonSimulare, gradUtilizare);
    }
  };

  // --- ACȚIUNE ȘTERGERE FACTURĂ ---
  const handleStergeFactura = async (facturaId) => {
    if (!activeHouse) return;
    if (!window.confirm("Ștergi această factură?")) return;
    const res = await fetch(`${API_BASE}/api/gospodarii/${activeHouse.id}/facturi/${facturaId}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      const updatedSumar = await res.json();
      setSumarFacturi(updatedSumar);
      fetchEstimare(activeHouse.id, sezonSimulare, gradUtilizare);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalType === 'house') {
        const res = await fetch(`${API_BASE}/api/gospodarii`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nume: formData.nume,
            adresa: formData.adresa,
            capacitate_kw: parseFloat(formData.kw || 0)
          })
        });
        if (!res.ok) return alert("Eroare la salvarea gospodăriei!");
        await fetchGospodarii();
      } else if (modalType === 'device' && activeHouse) {
        const res = await fetch(`${API_BASE}/api/gospodarii/${activeHouse.id}/dispozitive`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nume: formData.nume,
            putere_w: parseFloat(formData.putere || 0)
          })
        });
        if (!res.ok) return alert("Eroare la salvarea dispozitivului!");
        const updated = await res.json();
        setActiveHouse(updated);
        await fetchGospodarii();
        fetchEstimare(activeHouse.id, sezonSimulare, gradUtilizare);
      } else if (modalType === 'source' && activeHouse) {
        const res = await fetch(`${API_BASE}/api/gospodarii/${activeHouse.id}/surse`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tip: formData.tip || "Panouri Solare (Fotovoltaic)",
            capacitate_kw: parseFloat(formData.kw || 0)
          })
        });
        if (!res.ok) return alert("Eroare la salvarea sursei!");
        const updated = await res.json();
        setActiveHouse(updated);
        await fetchGospodarii();
        fetchEstimare(activeHouse.id, sezonSimulare, gradUtilizare);
      } else if (modalType === 'invoice' && activeHouse) {
        const res = await fetch(`${API_BASE}/api/gospodarii/${activeHouse.id}/facturi`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            luna: formData.luna,
            kwh: parseFloat(formData.kwh || 0),
            cost_ron: parseFloat(formData.cost_ron || 0)
          })
        });
        if (!res.ok) return alert("Eroare la salvarea facturii!");
        const updatedFacturi = await res.json();
        setSumarFacturi(updatedFacturi);
        fetchEstimare(activeHouse.id, sezonSimulare, gradUtilizare);
      } else if (modalType === 'edit-solar' && activeHouse) {
        const res = await fetch(`${API_BASE}/api/gospodarii/${activeHouse.id}/panouri`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            panouri: parseInt(formData.panouri || 0, 10),
            capacitate_kw: parseFloat(formData.kw || 0)
          })
        });
        if (!res.ok) return alert("Eroare la actualizarea panourilor!");
        const updated = await res.json();
        setActiveHouse(updated);
        await fetchGospodarii();
        fetchEstimare(activeHouse.id, sezonSimulare, gradUtilizare);
      }

      setModalType(null);
      setFormData({});
    } catch (err) {
      alert("Nu s-a putut contacta serverul Python!");
      console.error(err);
    }
  };

  // Statistici Globale (Ecran 1)
  const totalKwpGlobal = gospodarii.reduce((acc, g) => acc + (g.capacitate_kw || 0), 0).toFixed(1);
  const totalPanouriGlobal = gospodarii.reduce((acc, g) => acc + (g.panouri || 0), 0);
  const totalDispozitiveGlobal = gospodarii.reduce((acc, g) => acc + (g.dispozitive?.length || 0), 0);

  // Date pentru graficul de balanță energetică (Ecran 2)
  const dateGraficBalanta = estimare
    ? [
        { name: 'Consum Aparate', kwh: estimare.consum_estimat_kwh, color: '#3b82f6' },
        { name: 'Producție Solară', kwh: estimare.productie_solara_kwh, color: '#f59e0b' },
        { name: 'Tras din Rețea', kwh: estimare.energie_retea_kwh, color: '#94a3b8' },
        { name: 'Surplus Injectat', kwh: estimare.surplus_retea_kwh, color: '#10b981' }
      ]
    : [];

  // Date pentru graficul de istoric facturi (ordine cronologică)
  const dateGraficFacturi = [...sumarFacturi.facturi]
    .reverse()
    .map((f) => ({
      luna: f.luna,
      Consum_kWh: f.kwh,
      Cost_RON: f.cost_ron
    }));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6">

      {/* BANNER AVERTIZARE BACKEND OPRIT */}
      {apiError && (
        <div className="max-w-5xl mx-auto mb-6 bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-xs text-center font-semibold">
          Nu se poate conecta la serverul FastAPI (http://127.0.0.1:8000). Asigură-te că Python (main.py) rulează!
        </div>
      )}

      {/* ECRAN 1: SELECTARE CASĂ + STATISTICI GLOBALE */}
      {!activeHouse ? (
        <div className="max-w-4xl mx-auto pt-8 flex flex-col items-center">
          <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-2xl mb-4">
            <Zap size={40} />
          </div>
          <h1 className="text-3xl font-bold mb-2 text-white">Smart Energy Platform</h1>
          <p className="text-slate-400 mb-6">Alege gospodăria pe care dorești să o gestionezi</p>

          {/* STATISTICI GLOBALE PE TOATE PROPRIETĂȚILE */}
          {gospodarii.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mb-8">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center">
                <div className="text-xs text-slate-400">Gospodării Active</div>
                <div className="text-2xl font-bold text-white mt-1">{gospodarii.length}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center">
                <div className="text-xs text-slate-400">Capacitate Totală</div>
                <div className="text-2xl font-bold text-emerald-400 mt-1">{totalKwpGlobal} kWp</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center">
                <div className="text-xs text-slate-400">Total Panouri Solare</div>
                <div className="text-2xl font-bold text-amber-400 mt-1">{totalPanouriGlobal} buc.</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center">
                <div className="text-xs text-slate-400">Dispozitive Monitorizate</div>
                <div className="text-2xl font-bold text-blue-400 mt-1">{totalDispozitiveGlobal}</div>
              </div>
            </div>
          )}

          <button
            onClick={() => {
              setFormData({});
              setModalType('house');
            }}
            className="mb-8 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-5 py-3 rounded-xl text-sm flex items-center space-x-2 transition shadow-lg"
          >
            <Plus size={18} />
            <span>Adaugă Gospodărie Nouă</span>
          </button>

          {gospodarii.length === 0 ? (
            <div className="text-center p-8 border border-slate-800 rounded-2xl bg-slate-900/50 w-full">
              <p className="text-slate-400">Nicio gospodărie salvată în baza de date.</p>
              <p className="text-xs text-slate-500 mt-1">Apasă pe butonul de mai sus pentru a adăuga prima casă.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              {gospodarii.map((g) => (
                <div
                  key={g.id}
                  onClick={() => selectHouse(g)}
                  className="relative bg-slate-900 border border-slate-800 hover:border-emerald-500 p-6 rounded-2xl cursor-pointer transition-all duration-300 shadow-xl group"
                >
                  <button
                    onClick={(e) => stergeGospodarie(e, g.id)}
                    className="absolute top-4 right-4 text-slate-500 hover:text-red-400 p-2 transition"
                    title="Șterge"
                  >
                    <Trash2 size={18} />
                  </button>

                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl group-hover:bg-emerald-500 group-hover:text-slate-950 transition">
                      <House size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{g.nume}</h3>
                      <p className="text-xs text-slate-400">{g.adresa}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs text-slate-400 pt-4 border-t border-slate-800">
                    <span className="flex items-center"><Sun size={14} className="text-amber-400 mr-1"/> {g.capacitate_kw} kWp ({g.panouri} panouri)</span>
                    <span className="flex items-center"><Plug size={14} className="text-blue-400 mr-1"/> {g.dispozitive?.length || 0} Dispozitive</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (

        /* ECRAN 2: DASHBOARD */
        <div className="max-w-5xl mx-auto space-y-6 pt-4">

          {/* PANOU SUPERIOR: INFORMAȚII CASĂ, BUTOANE ACȚIUNE & VREME LIVE */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-slate-900 p-6 rounded-2xl border border-slate-800 gap-4">
            <div>
              <button
                onClick={() => setActiveHouse(null)}
                className="flex items-center space-x-2 text-xs text-slate-400 hover:text-white mb-2 transition"
              >
                <ArrowLeft size={14}/> <span>Schimbă Gospodăria</span>
              </button>
              <h1 className="text-2xl font-bold text-white">{activeHouse.nume}</h1>
              <p className="text-xs text-slate-400">
                {activeHouse.adresa} • {activeHouse.panouri} panouri • Sistem {activeHouse.capacitate_kw} kWp
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => {
                  setFormData({});
                  setModalType('device');
                }}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-3.5 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 transition shadow-md"
              >
                <Plus size={15}/> <span>Dispozitiv Nou</span>
              </button>

              <button
                onClick={() => {
                  setFormData({});
                  setModalType('source');
                }}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold px-3.5 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 transition"
              >
                <Sun size={15} className="text-amber-400"/> <span>Sursă Nouă</span>
              </button>

              <button
                onClick={() => {
                  setFormData({ panouri: activeHouse.panouri, kw: activeHouse.capacitate_kw });
                  setModalType('edit-solar');
                }}
                className="bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold px-3.5 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 transition"
              >
                <Pencil size={14}/> <span>Editează Panouri</span>
              </button>

              <button
                onClick={() => {
                  setFormData({});
                  setModalType('invoice');
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 transition"
              >
                <FileText size={15}/> <span>Factură Nouă</span>
              </button>

              {/* CASETĂ VREME LIVE (OPEN-METEO) */}
              <div className="flex items-center space-x-3 bg-gradient-to-br from-slate-800 to-slate-900 px-4 py-2 rounded-xl border border-slate-700/70 shadow-md">
                <CloudSun className="text-amber-400" size={26} />
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                    {vreme?.oras || activeHouse.adresa}
                  </div>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-base font-bold text-white">{vreme?.temperatura ?? "--"} °C</span>
                    <span className="text-xs text-emerald-400 font-medium">{vreme?.stare_vreme || "..."}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CARD ESTIMARE FACTURĂ + SIMULATOR WHAT-IF + GRAFIC BALANȚĂ */}
          <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 p-6 rounded-2xl space-y-5 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Estimare Factură • {estimare?.luna || "Noiembrie 2026"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Condiții simulate: {estimare?.temp_medie ?? "--"}°C medie, ~{estimare?.ore_soare_zi ?? "--"}h soare/zi • Mod Prosumator
                  </p>
                </div>
              </div>

              <button
                onClick={() => fetchEstimare(activeHouse.id, sezonSimulare, gradUtilizare)}
                disabled={loadingEstimare}
                className="self-start sm:self-auto flex items-center space-x-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 px-3 py-2 rounded-xl transition"
              >
                <RefreshCw size={13} className={loadingEstimare ? "animate-spin" : ""} />
                <span>Recalculează</span>
              </button>
            </div>

            {/* CONTROALE SIMULATOR WHAT-IF */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/70 border border-slate-800 p-4 rounded-xl">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 flex items-center mb-2">
                  <Sliders size={13} className="mr-1.5 text-emerald-400" /> Scenariu Meteo / Sezon
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "live", label: "Live (14 zile)" },
                    { id: "primavara", label: "Primăvară" },
                    { id: "vara", label: "Vară (Soare)" }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSezonSimulare(opt.id)}
                      className={`py-2 px-2.5 rounded-lg text-xs font-bold transition ${
                        sezonSimulare === opt.id
                          ? "bg-emerald-500 text-slate-950"
                          : "bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[11px] font-semibold text-slate-400">
                    Regim Ocupare / Utilizare Casă
                  </label>
                  <span className="text-xs font-bold text-emerald-400">
                    {gradUtilizare}% {gradUtilizare <= 35 ? "(Doar Weekend)" : gradUtilizare === 100 ? "(Permanent)" : ""}
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={gradUtilizare}
                  onChange={(e) => setGradUtilizare(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>10% (Vacanță)</span>
                  <span>30% (Weekend)</span>
                  <span>100% (Zilnic)</span>
                </div>
              </div>
            </div>

            {estimare && (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-950/80 border border-emerald-500/30 p-4 rounded-xl">
                    <span className="text-[11px] text-slate-400 block">Factură Estimată</span>
                    <span className="text-2xl font-extrabold text-emerald-400 mt-1 block">
                      {estimare.factura_estimata_ron} RON
                    </span>
                    {estimare.credit_urmator_ron > 0 ? (
                      <span className="text-[11px] text-emerald-300 font-semibold">
                        Surplus reportat: +{estimare.credit_urmator_ron} RON
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500">
                        După compensare prosumator
                      </span>
                    )}
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl">
                    <span className="text-[11px] text-slate-400 block">Consum Estimat Aparate</span>
                    <span className="text-xl font-bold text-white mt-1 block">
                      {estimare.consum_estimat_kwh} kWh
                    </span>
                    <span className="text-[11px] text-blue-400">
                      {estimare.dispozitive_active} / {estimare.dispozitive_totale} aparate pornite
                    </span>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl">
                    <span className="text-[11px] text-slate-400 block">Producție Panouri (30 zile)</span>
                    <span className="text-xl font-bold text-amber-400 mt-1 block">
                      {estimare.productie_solara_kwh} kWh
                    </span>
                    <span className="text-[11px] text-emerald-400">
                      Surplus injectat: {estimare.surplus_retea_kwh} kWh
                    </span>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl">
                    <span className="text-[11px] text-slate-400 block">Energie Trasă din Rețea</span>
                    <span className="text-xl font-bold text-slate-200 mt-1 block">
                      {estimare.energie_retea_kwh} kWh
                    </span>
                    <span className="text-[11px] text-amber-300">
                      Compensare: -{estimare.compensare_prosumator_ron} RON
                    </span>
                  </div>
                </div>

                {/* GRAFIC BALANȚĂ ENERGETICĂ (RECHARTS) */}
                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl">
                  <div className="text-xs font-semibold text-slate-300 mb-3 flex items-center">
                    <BarChart3 size={15} className="text-emerald-400 mr-1.5" /> Balanță Energetică Lunară (kWh)
                  </div>
                  <div className="h-52 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dateGraficBalanta} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#f8fafc' }}
                          formatter={(value) => [`${value} kWh`, 'Energie']}
                        />
                        <Bar dataKey="kwh" radius={[8, 8, 0, 0]}>
                          {dateGraficBalanta.map((entry, idx) => (
                            <Cell key={`cell-${idx}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* PANOURI MIJLOC: DISPOZITIVE (CU ON/OFF & DELETE) & SURSE DE ENERGIE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* PANOU DISPOZITIVE */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-white flex items-center">
                  <Plug className="text-blue-400 mr-2" size={18} /> Dispozitive Conectate
                </h3>
                <button
                  onClick={() => {
                    setFormData({});
                    setModalType('device');
                  }}
                  className="text-xs text-emerald-400 hover:underline"
                >
                  + Adaugă
                </button>
              </div>
              {(!activeHouse.dispozitive || activeHouse.dispozitive.length === 0) ? (
                <p className="text-xs text-slate-500 py-4">Niciun dispozitiv adăugat încă.</p>
              ) : (
                <div className="space-y-2.5">
                  {activeHouse.dispozitive.map((d, i) => {
                    const esteActiv = d.activ !== false;
                    return (
                      <div
                        key={i}
                        className={`flex justify-between items-center p-3.5 rounded-xl border text-sm transition ${
                          esteActiv
                            ? "bg-slate-950 border-slate-800"
                            : "bg-slate-950/40 border-slate-800/40 opacity-60"
                        }`}
                      >
                        <div className="flex items-center space-x-3 pr-2">
                          <button
                            onClick={() => handleToggleDispozitiv(i)}
                            title={esteActiv ? "Oprește dispozitivul" : "Pornește dispozitivul"}
                            className={`p-1.5 rounded-lg border transition ${
                              esteActiv
                                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30"
                                : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                            }`}
                          >
                            <Power size={15} />
                          </button>
                          <div>
                            <span className={`font-medium block ${esteActiv ? "text-slate-200" : "line-through text-slate-400"}`}>
                              {d.nume}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {esteActiv ? "Pornit • Inclus în consum" : "Oprit • Economisește energie"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg">
                            {d.putere_w} W
                          </span>
                          <button
                            onClick={() => handleStergeDispozitiv(i)}
                            className="text-slate-500 hover:text-red-400 p-1.5 transition"
                            title="Șterge dispozitivul"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* PANOU SURSE DE ENERGIE */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-white flex items-center">
                  <BatteryCharging className="text-amber-400 mr-2" size={18} /> Surse de Energie
                </h3>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => {
                      setFormData({ panouri: activeHouse.panouri, kw: activeHouse.capacitate_kw });
                      setModalType('edit-solar');
                    }}
                    className="text-xs text-amber-400 hover:underline"
                  >
                    Editează Panouri ({activeHouse.panouri} buc.)
                  </button>
                  <button
                    onClick={() => {
                      setFormData({});
                      setModalType('source');
                    }}
                    className="text-xs text-emerald-400 hover:underline"
                  >
                    + Adaugă
                  </button>
                </div>
              </div>
              {(!activeHouse.surse || activeHouse.surse.length === 0) ? (
                <p className="text-xs text-slate-500 py-4">Nicio sursă de energie adăugată încă.</p>
              ) : (
                <div className="space-y-2.5">
                  {activeHouse.surse.map((s, i) => (
                    <div key={i} className="flex justify-between items-center bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-sm">
                      <div className="flex items-center space-x-2.5">
                        <Sun size={18} className="text-amber-400" />
                        <div>
                          <span className="font-medium text-slate-200 block">{s.tip}</span>
                          {s.tip.toLowerCase().includes("panouri") && (
                            <span className="text-[11px] text-slate-500">{activeHouse.panouri} panouri instalate</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                          {s.capacitate_kw} kW
                        </span>
                        <button
                          onClick={() => handleStergeSursa(i)}
                          className="text-slate-500 hover:text-red-400 p-1.5 transition"
                          title="Elimină sursa"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* STATISTICI RAPIDE FACTURI ANTERIOARE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-medium">Consum Mediu Lunar (Istoric)</span>
                <div className="text-2xl font-bold text-white mt-1">{sumarFacturi.medie_kwh} kWh</div>
              </div>
              <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
                <Zap size={24} />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-medium">Preț Mediu / kWh (Istoric)</span>
                <div className="text-2xl font-bold text-amber-400 mt-1">{sumarFacturi.medie_pret_kwh} RON</div>
              </div>
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
                <Coins size={24} />
              </div>
            </div>
          </div>

          {/* PANOU INFERIOR: ISTORIC FACTURI + GRAFIC + EXPORT CSV */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-5">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <h3 className="text-lg font-bold text-white flex items-center">
                <FileText className="text-blue-400 mr-2" size={20} /> Istoric Facturi & Costuri ({activeHouse.nume})
              </h3>
              <div className="flex items-center space-x-3">
                {sumarFacturi.facturi.length > 0 && (
                  <a
                    href={`${API_BASE}/api/gospodarii/${activeHouse.id}/facturi/export`}
                    className="flex items-center space-x-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl transition"
                  >
                    <Download size={14} className="text-emerald-400" />
                    <span>Descarcă CSV</span>
                  </a>
                )}
                <button
                  onClick={() => {
                    setFormData({});
                    setModalType('invoice');
                  }}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1.5 rounded-xl transition"
                >
                  + Adaugă Factură
                </button>
              </div>
            </div>

            {sumarFacturi.facturi.length === 0 ? (
              <p className="text-xs text-slate-500 py-3">Nicio factură salvată încă pentru această gospodărie.</p>
            ) : (
              <>
                {/* GRAFIC EVOLUȚIE FACTURI */}
                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl">
                  <div className="text-xs font-semibold text-slate-300 mb-3">
                    Evoluție Consum (kWh) & Cost (RON)
                  </div>
                  <div className="h-52 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dateGraficFacturi} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="luna" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#f8fafc' }}
                        />
                        <Bar dataKey="Consum_kWh" name="Consum (kWh)" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="Cost_RON" name="Cost (RON)" fill="#10b981" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* TABEL FACTURI */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="text-xs text-slate-400 uppercase bg-slate-950">
                      <tr>
                        <th className="p-3 rounded-l-xl">Luna Facturată</th>
                        <th className="p-3">Consum (kWh)</th>
                        <th className="p-3">Total De Plată</th>
                        <th className="p-3">Cost mediu / kWh</th>
                        <th className="p-3 rounded-r-xl text-right">Acțiuni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sumarFacturi.facturi.map((f) => (
                        <tr key={f.id} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                          <td className="p-3 font-medium text-white">{f.luna}</td>
                          <td className="p-3">{f.kwh} kWh</td>
                          <td className="p-3 text-emerald-400 font-semibold">{f.cost_ron} RON</td>
                          <td className="p-3 text-slate-400">
                            {f.kwh > 0 ? (f.cost_ron / f.kwh).toFixed(2) : "0.00"} RON / kWh
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleStergeFactura(f.id)}
                              className="text-slate-500 hover:text-red-400 p-1.5 transition"
                              title="Șterge factura"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

        </div>
      )}

      {/* MODAL DIALOG PENTRU TOATE FORMULARELE */}
      {modalType && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">
                {modalType === 'house' && 'Adaugă Gospodărie Nouă'}
                {modalType === 'device' && 'Adaugă Dispozitiv Nou'}
                {modalType === 'source' && 'Adaugă Sursă de Energie'}
                {modalType === 'invoice' && `Adaugă Factură • ${activeHouse?.nume}`}
                {modalType === 'edit-solar' && `Editează Sistem Solar • ${activeHouse?.nume}`}
              </h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-white"><X size={20}/></button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {modalType === 'house' && (
                <>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Nume Gospodărie</label>
                    <input type="text" placeholder="ex: Casa de la Munte" required onChange={e => setFormData({...formData, nume: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-emerald-500"/>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Oraș / Adresă</label>
                    <input type="text" placeholder="ex: Cluj-Napoca" required onChange={e => setFormData({...formData, adresa: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-emerald-500"/>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Putere Panouri Solare (kWp)</label>
                    <input type="number" step="0.1" placeholder="ex: 5.0" required onChange={e => setFormData({...formData, kw: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-emerald-500"/>
                  </div>
                </>
              )}

              {modalType === 'device' && (
                <>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Nume Dispozitiv</label>
                    <input type="text" placeholder="ex: Frigider / Pompă Căldură" required onChange={e => setFormData({...formData, nume: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-emerald-500"/>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Putere (Wați)</label>
                    <input type="number" placeholder="ex: 1500" required onChange={e => setFormData({...formData, putere: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-emerald-500"/>
                  </div>
                </>
              )}

              {modalType === 'source' && (
                <>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Tip Sursă</label>
                    <select
                      defaultValue="Panouri Solare (Fotovoltaic)"
                      onChange={e => setFormData({...formData, tip: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-emerald-500"
                    >
                      <option value="Panouri Solare (Fotovoltaic)">Panouri Solare (Fotovoltaic)</option>
                      <option value="Baterie de Stocare">Baterie de Stocare</option>
                      <option value="Turbină Eoliană Mică">Turbină Eoliană Mică</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Capacitate (kW sau kWh)</label>
                    <input type="number" step="0.1" placeholder="ex: 4.5" required onChange={e => setFormData({...formData, kw: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-emerald-500"/>
                  </div>
                </>
              )}

              {modalType === 'edit-solar' && (
                <>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Număr Panouri Solare (buc.)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.panouri ?? ""}
                      required
                      onChange={e => setFormData({ ...formData, panouri: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Putere Totală / Producție Instalată (kWp)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={formData.kw ?? ""}
                      required
                      onChange={e => setFormData({ ...formData, kw: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-amber-500"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Orientativ: 1 panou modern produce ~0.45 kWp (ex: 10 panouri ≈ 4.5 kWp).
                    </p>
                  </div>
                </>
              )}

              {modalType === 'invoice' && (
                <>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Luna și Anul</label>
                    <input type="text" placeholder="ex: Noiembrie 2026" required onChange={e => setFormData({...formData, luna: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-emerald-500"/>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Consum Facturat (kWh)</label>
                    <input type="number" step="0.1" placeholder="ex: 250" required onChange={e => setFormData({...formData, kwh: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-emerald-500"/>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Valoare Totală (RON)</label>
                    <input type="number" step="0.01" placeholder="ex: 200.50" required onChange={e => setFormData({...formData, cost_ron: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-emerald-500"/>
                  </div>
                </>
              )}

              <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold p-3 rounded-xl text-sm transition">
                Salvează
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}