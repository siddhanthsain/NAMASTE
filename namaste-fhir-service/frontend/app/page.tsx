"use client";
import { useState, useCallback } from "react";

const API = "https://curly-capybara-qwg7jj7g759cgg-8000.app.github.dev";

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

export default function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NAMASTECode[]>([]);
  const [selected, setSelected] = useState<NAMASTECode | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapping, setMapping] = useState(false);

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
      const res = await fetch(`${API}/mapping/suggest/${selected.namaste_code}`, { method: "POST" });
      const data = await res.json();
      const updated = await fetch(`${API}/namaste/code/${selected.namaste_code}`);
      setSelected(await updated.json());
    } catch {}
    setMapping(false);
  };

  const statusColor = (status: string) => {
    if (status === "complete") return "bg-green-100 text-green-800";
    if (status === "partial") return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-emerald-400 mb-1">NAMASTE FHIR Service</h1>
          <p className="text-gray-400 text-sm">NAMASTE → ICD-11 TM2 + Biomedicine Mapping</p>
          <p className="text-gray-600 text-xs mt-1">Ministry of Ayush · WHO ICD-11 · FHIR R4</p>
        </div>

        <div className="relative mb-8">
          <input
            type="text"
            value={query}
            onChange={handleInput}
            placeholder="Search NAMASTE code or term (e.g. Jwara, Diabetes, AYU-0007)"
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-sm"
          />
          {loading && <div className="absolute right-4 top-3.5 text-gray-400 text-xs">searching...</div>}

          {results.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-gray-900 border border-gray-700 rounded-xl overflow-hidden shadow-xl">
              {results.map((r) => (
                <div
                  key={r.namaste_code}
                  onClick={() => selectCode(r)}
                  className="px-4 py-3 hover:bg-gray-800 cursor-pointer border-b border-gray-800 last:border-0"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-400 text-xs font-mono">{r.namaste_code}</span>
                    <span className="text-xs text-gray-500">{r.system}</span>
                  </div>
                  <div className="text-sm text-white mt-0.5">{r.term_english}</div>
                  <div className="text-xs text-gray-500">{r.category}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 space-y-5">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-emerald-400 font-mono text-sm">{selected.namaste_code}</span>
                <h2 className="text-xl font-semibold mt-1">{selected.term_english}</h2>
                <p className="text-gray-400 text-sm">{selected.term_original} · {selected.system} · {selected.category}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(selected.mapping_status)}`}>
                {selected.mapping_status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800 rounded-xl p-4">
                <div className="text-xs text-gray-400 mb-2 uppercase tracking-wide">ICD-11 TM2 (Chapter 26)</div>
                {selected.tm2_code ? (
                  <>
                    <div className="text-emerald-400 font-mono font-bold">{selected.tm2_code}</div>
                    <div className="text-sm text-gray-300 mt-1">{selected.tm2_display}</div>
                  </>
                ) : (
                  <div className="text-gray-500 text-sm">No TM2 mapping</div>
                )}
              </div>

              <div className="bg-gray-800 rounded-xl p-4">
                <div className="text-xs text-gray-400 mb-2 uppercase tracking-wide">ICD-11 Biomedicine</div>
                {selected.icd_biomedicine_code ? (
                  <>
                    <div className="text-blue-400 font-mono font-bold">{selected.icd_biomedicine_code}</div>
                    <div className="text-sm text-gray-300 mt-1">{selected.icd_biomedicine_display}</div>
                    {selected.confidence_score && (
                      <div className="text-xs text-gray-500 mt-1">confidence: {(selected.confidence_score * 100).toFixed(0)}%</div>
                    )}
                  </>
                ) : (
                  <div className="text-gray-500 text-sm">No biomedicine mapping</div>
                )}
              </div>
            </div>

            <button
              onClick={triggerMapping}
              disabled={mapping}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
            >
              {mapping ? "Fetching from WHO ICD-11 API..." : "Re-run ICD-11 Mapping"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
