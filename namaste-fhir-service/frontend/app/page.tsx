"use client";
import { useState, useCallback, useEffect } from "react";

const API = "https://namaste-fhir-backend.onrender.com";

interface NAMASTECode {
  namaste_code: string;
  term_english: string;
  term_original: string;
  system: string;
  category: string;
  tm2_code: string | null;
  tm2_display: string | null;
  icd_biomedicine_code: string | null;
  icd_biomedicine_display: string | null;
  confidence_score: number | null;
  mapping_status: string;
}

interface Stats {
  total: number;
  mapping_status: {
    complete: number;
    partial: number;
    no_match: number;
    unmapped: number;
    auto_mapped_total: number;
    auto_mapped_pct: number;
  };
  by_system: {
    Ayurveda: { total: number; mapped: number; no_match: number };
    Siddha: { total: number; mapped: number; no_match: number };
    Unani: { total: number; mapped: number; no_match: number };
  };
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const duration = 1200;
    const steps = 40;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) { setDisplay(value); clearInterval(timer); }
      else setDisplay(Math.floor(current));
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);
  return <>{display.toLocaleString()}</>;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NAMASTECode[]>([]);
  const [selected, setSelected] = useState<NAMASTECode | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapping, setMapping] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch(`${API}/stats/`).then(r => r.json()).then(setStats).catch(() => {});
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/namaste/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch { setResults([]); }
    setLoading(false);
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    search(val);
  };

  const selectCode = (code: NAMASTECode) => {
    setSelected(code);
    setQuery(code.term_english);
    setResults([]);
  };

  const triggerMapping = async () => {
    if (!selected) return;
    setMapping(true);
    try {
      await fetch(`${API}/mapping/suggest/${selected.namaste_code}`, { method: "POST" });
      const updated = await fetch(`${API}/namaste/code/${selected.namaste_code}`);
      setSelected(await updated.json());
    } catch {}
    setMapping(false);
  };

  const statusColor = (status: string) => {
    if (status === "complete") return "bg-emerald-900/40 text-emerald-300 border border-emerald-700/50";
    if (status === "partial") return "bg-amber-900/40 text-amber-300 border border-amber-700/50";
    if (status === "no_match") return "bg-gray-800 text-gray-400 border border-gray-700";
    return "bg-red-900/40 text-red-300 border border-red-700/50";
  };

  const systemColor = (system: string) => {
    if (system === "Ayurveda") return "text-emerald-400";
    if (system === "Siddha") return "text-sky-400";
    return "text-amber-400";
  };

  return (
    <main className="min-h-screen bg-[#0a0f0d] text-white">
      {/* Header */}
      <div className="border-b border-gray-800/60 bg-[#0a0f0d]/80 backdrop-blur sticky top-0 z-20 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
            <span className="text-emerald-400 text-xs font-bold">N</span>
          </div>
          <span className="text-sm font-medium text-gray-200">NAMASTE FHIR Service</span>
          <span className="text-gray-600 text-xs">·</span>
          <span className="text-gray-500 text-xs">Ministry of Ayush · WHO ICD-11 · FHIR R4</span>
        </div>
        <span className="text-xs text-emerald-500/70 font-mono">v0.1.0</span>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Hero */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            <span className="text-emerald-400">NAMASTE</span>
            <span className="text-gray-300"> → ICD-11</span>
          </h1>
          <p className="text-gray-400 text-sm max-w-xl">
            Real-time mapping of India's 7,363 Ayush morbidity codes to WHO ICD-11 TM2 and biomedical equivalents. Built for ABDM compliance.
          </p>
        </div>

        {/* Stats Bar */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
              <div className="text-2xl font-bold text-white font-mono">
                <AnimatedNumber value={stats.total} />
              </div>
              <div className="text-xs text-gray-500 mt-1">Total NAMASTE Codes</div>
              <div className="text-xs text-gray-600 mt-0.5">Ayurveda · Siddha · Unani</div>
            </div>
            <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-4">
              <div className="text-2xl font-bold text-emerald-400 font-mono">
                <AnimatedNumber value={stats.mapping_status.auto_mapped_total} />
              </div>
              <div className="text-xs text-emerald-600 mt-1">Auto-Mapped to ICD-11</div>
              <div className="text-xs text-emerald-800 mt-0.5">{stats.mapping_status.auto_mapped_pct}% via WHO API</div>
            </div>
            <div className="bg-amber-950/30 border border-amber-800/30 rounded-xl p-4">
              <div className="text-2xl font-bold text-amber-400 font-mono">
                <AnimatedNumber value={stats.mapping_status.no_match} />
              </div>
              <div className="text-xs text-amber-600 mt-1">Pending Expert Review</div>
              <div className="text-xs text-amber-900 mt-0.5">Requires Ayush domain experts</div>
            </div>
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
              <div className="text-2xl font-bold text-sky-400 font-mono">
                <AnimatedNumber value={stats.mapping_status.complete} />
              </div>
              <div className="text-xs text-gray-500 mt-1">Dual Coded</div>
              <div className="text-xs text-gray-600 mt-0.5">TM2 + Biomedicine both found</div>
            </div>
          </div>
        )}

        {/* System breakdown */}
        {stats && (
          <div className="grid grid-cols-3 gap-3 mb-8">
            {(["Ayurveda", "Siddha", "Unani"] as const).map(sys => (
              <div key={sys} className="bg-gray-900/40 border border-gray-800/60 rounded-lg px-4 py-3">
                <div className={`text-xs font-semibold mb-2 ${systemColor(sys)}`}>{sys}</div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Total</span>
                  <span className="text-gray-300 font-mono">{stats.by_system[sys].total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-gray-500">Mapped</span>
                  <span className="text-emerald-400 font-mono">{stats.by_system[sys].mapped}</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1 mt-2">
                  <div
                    className="bg-emerald-500 h-1 rounded-full transition-all duration-1000"
                    style={{ width: `${(stats.by_system[sys].mapped / stats.by_system[sys].total * 100).toFixed(1)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="relative mb-8">
          <input
            type="text"
            value={query}
            onChange={handleInput}
            placeholder="Search by term or code — e.g. Jwara, Diabetes, AYU-0007, fever..."
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/60 text-sm transition-colors"
          />
          {loading && <div className="absolute right-4 top-4 text-gray-500 text-xs">searching...</div>}

          {results.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-gray-900 border border-gray-700/80 rounded-xl overflow-hidden shadow-2xl">
              {results.map((r) => (
                <div
                  key={r.namaste_code}
                  onClick={() => selectCode(r)}
                  className="px-4 py-3 hover:bg-gray-800/80 cursor-pointer border-b border-gray-800 last:border-0 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-400 text-xs font-mono">{r.namaste_code}</span>
                    <span className={`text-xs font-medium ${systemColor(r.system)}`}>{r.system}</span>
                  </div>
                  <div className="text-sm text-white mt-0.5">{r.term_english}</div>
                  <div className="text-xs text-gray-600 mt-0.5">{r.category}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected code detail */}
        {selected && (
          <div className="bg-gray-900/80 border border-gray-700/60 rounded-2xl p-6 space-y-5">
            <div className="flex justify-between items-start">
              <div>
                <span className={`text-xs font-semibold ${systemColor(selected.system)}`}>{selected.system}</span>
                <span className="text-gray-600 text-xs ml-2 font-mono">{selected.namaste_code}</span>
                <h2 className="text-xl font-semibold mt-1 text-white">{selected.term_english}</h2>
                <p className="text-gray-500 text-sm mt-0.5">{selected.term_original} · {selected.category}</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColor(selected.mapping_status)}`}>
                {selected.mapping_status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700/40">
                <div className="text-xs text-gray-500 mb-2 uppercase tracking-widest">ICD-11 TM2 · Chapter 26</div>
                {selected.tm2_code ? (
                  <>
                    <div className="text-emerald-400 font-mono font-bold text-lg">{selected.tm2_code}</div>
                    <div className="text-sm text-gray-300 mt-1">{selected.tm2_display}</div>
                  </>
                ) : (
                  <div className="text-gray-600 text-sm">No TM2 mapping found</div>
                )}
              </div>

              <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700/40">
                <div className="text-xs text-gray-500 mb-2 uppercase tracking-widest">ICD-11 Biomedicine</div>
                {selected.icd_biomedicine_code ? (
                  <>
                    <div className="text-sky-400 font-mono font-bold text-lg">{selected.icd_biomedicine_code}</div>
                    <div className="text-sm text-gray-300 mt-1">{selected.icd_biomedicine_display}</div>
                    {selected.confidence_score && (
                      <div className="text-xs text-gray-600 mt-1.5">
                        confidence {(selected.confidence_score * 100).toFixed(0)}%
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-gray-600 text-sm">No biomedicine mapping found</div>
                )}
              </div>
            </div>

            <button
              onClick={triggerMapping}
              disabled={mapping}
              className="w-full bg-emerald-700/80 hover:bg-emerald-600/80 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-xl py-2.5 text-sm font-medium transition-colors border border-emerald-600/30"
            >
              {mapping ? "Querying WHO ICD-11 API..." : "Re-run ICD-11 Mapping"}
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-800/60 flex justify-between items-center">
          <div className="text-xs text-gray-600">
            © 2026 NAMASTE FHIR Service
          </div>
          <div className="flex gap-4 text-xs text-gray-600">
            <a href="https://namaste.ayush.gov.in" target="_blank" className="hover:text-emerald-500 transition-colors">NAMASTE Portal</a>
            <a href="https://icd.who.int" target="_blank" className="hover:text-emerald-500 transition-colors">WHO ICD-11</a>
            <a href="https://abdm.gov.in" target="_blank" className="hover:text-emerald-500 transition-colors">ABDM</a>
          </div>
        </div>
      </div>
    </main>
  );
}
