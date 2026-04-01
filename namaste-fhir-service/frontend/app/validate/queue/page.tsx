"use client";
import { useState, useEffect, useCallback } from "react";

const API = "https://namaste-fhir-backend.onrender.com";

interface NAMASTECode {
  namaste_code: string;
  term_english: string;
  term_original: string;
  system: string;
  category: string;
  short_definition: string;
  tm2_code: string | null;
  tm2_display: string | null;
  icd_biomedicine_code: string | null;
  icd_biomedicine_display: string | null;
  mapping_status: string;
}

interface ICDResult {
  code: string;
  display: string;
  score: number;
  chapter: string;
}

const SYS: Record<string, string> = {
  Ayurveda: "bg-emerald-950 text-emerald-400 border-emerald-800",
  Siddha: "bg-sky-950 text-sky-400 border-sky-800",
  Unani: "bg-amber-950 text-amber-400 border-amber-800",
};

export const dynamic = "force-dynamic";

export default function ValidationQueue() {
  const [expert, setExpert] = useState("");
  const [token, setToken] = useState("");
  const [codes, setCodes] = useState<NAMASTECode[]>([]);
  const [selected, setSelected] = useState<NAMASTECode | null>(null);
  const [totalQueue, setTotalQueue] = useState(0);
  const [contributions, setContributions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [listSearch, setListSearch] = useState("");
  const [listSearching, setListSearching] = useState(false);
  const [systemFilter, setSystemFilter] = useState("All");
  const [tm2Code, setTm2Code] = useState("");
  const [tm2Display, setTm2Display] = useState("");
  const [bioCode, setBioCode] = useState("");
  const [bioDisplay, setBioDisplay] = useState("");
  const [notes, setNotes] = useState("");
  const [whoQuery, setWhoQuery] = useState("");
  const [whoTM2, setWhoTM2] = useState<ICDResult[]>([]);
  const [whoBio, setWhoBio] = useState<ICDResult[]>([]);
  const [whoLoading, setWhoLoading] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const t = localStorage.getItem("expert_token");
    const n = localStorage.getItem("expert_name");
    if (!t) { window.location.href = "/validate"; return; }
    setToken(t);
    setExpert(n || "Expert");
    fetchQueue(t);
  }, []);

  const fetchQueue = useCallback(async (t: string, system?: string) => {
    setLoading(true);
    try {
      const sys = system && system !== "All" ? `&system=${system}` : "";
      const res = await fetch(`${API}/validation/queue?limit=60${sys}`, {
        headers: { Authorization: `Bearer ${t}` }
      });
      if (res.status === 401) { window.location.href = "/validate"; return; }
      const data = await res.json();
      setCodes(data.codes || []);
      setTotalQueue(data.total_queue || 0);
      setContributions(data.your_contributions || 0);
    } catch {}
    setLoading(false);
  }, []);

  const searchList = useCallback(async (q: string) => {
    if (q.length < 2) { fetchQueue(token, systemFilter); return; }
    setListSearching(true);
    try {
      const res = await fetch(`${API}/namaste/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setCodes((data.results || []).filter((c: NAMASTECode) => c.mapping_status === "no_match"));
    } catch {}
    setListSearching(false);
  }, [token, systemFilter]);

  useEffect(() => {
    const t = setTimeout(() => { if (token) searchList(listSearch); }, 400);
    return () => clearTimeout(t);
  }, [listSearch]);

  const handleSystemFilter = (sys: string) => {
    setSystemFilter(sys);
    fetchQueue(token, sys);
  };

  const selectCode = (code: NAMASTECode) => {
    setSelected(code);
    setTm2Code(code.tm2_code || "");
    setTm2Display(code.tm2_display || "");
    setBioCode(code.icd_biomedicine_code || "");
    setBioDisplay(code.icd_biomedicine_display || "");
    setNotes("");
    setWhoTM2([]);
    setWhoBio([]);
    const q = code.term_original && code.term_original.length < 30 && !code.term_original.includes("H")
      ? code.term_original
      : code.term_english.replace(/\(.*\)/, "").trim();
    setWhoQuery(q);
  };

  const searchWHO = async () => {
    if (whoQuery.length < 2) return;
    setWhoLoading(true);
    setWhoTM2([]);
    setWhoBio([]);
    try {
      const [tm2Res, bioRes] = await Promise.all([
        fetch(`${API}/namaste/icd-search?q=${encodeURIComponent(whoQuery)}&chapter=26`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API}/namaste/icd-search?q=${encodeURIComponent(whoQuery)}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      if (tm2Res.ok) { const d = await tm2Res.json(); setWhoTM2(d.results || []); }
      if (bioRes.ok) { const d = await bioRes.json(); setWhoBio(d.results || []); }
    } catch {}
    setWhoLoading(false);
  };

  const submitDecision = async (decision: string) => {
    if (!selected) return;
    setSubmitting(true);
    const params = new URLSearchParams({ decision });
    if (tm2Code) { params.set("tm2_code", tm2Code); params.set("tm2_display", tm2Display); }
    if (bioCode) { params.set("icd_biomedicine_code", bioCode); params.set("icd_biomedicine_display", bioDisplay); }
    if (notes) params.set("notes", notes);
    await fetch(`${API}/validation/decide/${selected.namaste_code}?${params}`, {
      method: "POST", headers: { Authorization: `Bearer ${token}` }
    });
    setContributions(c => c + 1);
    setTotalQueue(q => q - 1);
    setCodes(prev => prev.filter(c => c.namaste_code !== selected.namaste_code));
    setSelected(null);
    setToast(decision === "edited" ? "✓ Mapping submitted" : decision === "rejected" ? "✗ Rejected" : "→ Skipped");
    setTimeout(() => setToast(""), 2500);
    setSubmitting(false);
  };

  const filtered = codes.filter(c =>
    systemFilter === "All" || c.system === systemFilter
  );

  return (
    <main className="h-screen bg-[#06080a] text-white flex flex-col overflow-hidden font-sans">
      {/* Header */}
      <header className="border-b border-white/[0.06] px-5 py-2.5 flex justify-between items-center shrink-0 bg-[#06080a]/90 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <span className="text-emerald-400 text-xs font-bold">N</span>
          </div>
          <span className="text-sm font-semibold text-white">Expert Validation</span>
          <span className="text-gray-700 text-xs">·</span>
          <span className="text-gray-500 text-xs">{expert}</span>
        </div>
        <div className="flex items-center gap-4">
          {toast && <span className="text-xs text-emerald-400 font-medium">{toast}</span>}
          <span className="text-xs text-gray-600">{contributions} contributions</span>
          <span className="text-xs font-medium text-amber-400">{(totalQueue || 0).toLocaleString()} remaining</span>
          <a href="/" className="text-xs text-gray-600 hover:text-gray-300 transition-colors">← Public</a>
          <button onClick={() => { localStorage.clear(); window.location.href = "/validate"; }}
            className="text-xs text-gray-600 hover:text-red-400 transition-colors">Logout</button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT — Code list */}
        <aside className="w-80 border-r border-white/[0.06] flex flex-col shrink-0 bg-[#07090b]">
          <div className="p-3 space-y-2 border-b border-white/[0.06]">
            <input
              value={listSearch}
              onChange={e => setListSearch(e.target.value)}
              placeholder="Search code, term, Sanskrit..."
              className="w-full bg-white/5 border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-600/50 transition-colors"
            />
            <div className="flex gap-1 flex-wrap">
              {["All", "Ayurveda", "Siddha", "Unani"].map(s => (
                <button key={s} onClick={() => handleSystemFilter(s)}
                  className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${systemFilter === s ? "bg-emerald-900/50 text-emerald-300 border-emerald-700/50" : "text-gray-500 border-transparent hover:text-gray-300"}`}>
                  {s}
                </button>
              ))}
            </div>
            <div className="text-xs text-gray-700">{filtered.length} shown · {(totalQueue || 0).toLocaleString()} total</div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading || listSearching ? (
              <div className="p-4 text-xs text-gray-600 animate-pulse">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="p-4 text-xs text-gray-600">No codes found</div>
            ) : filtered.map(code => (
              <div key={code.namaste_code} onClick={() => selectCode(code)}
                className={`px-3 py-3 border-b border-white/[0.04] cursor-pointer transition-all group ${selected?.namaste_code === code.namaste_code ? "bg-emerald-950/40 border-l-2 border-l-emerald-500" : "hover:bg-white/[0.03]"}`}>
                <div className="flex justify-between items-start mb-1">
                  <span className="font-mono text-xs text-emerald-400 font-medium">{code.namaste_code}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded border text-xs ${SYS[code.system] || "bg-gray-800 text-gray-500 border-gray-700"}`}>{code.system[0]}</span>
                </div>
                <div className="text-sm text-gray-200 leading-snug truncate">{code.term_english}</div>
                <div className="text-xs text-gray-600 font-mono truncate mt-0.5">{code.term_original}</div>
              </div>
            ))}
          </div>

          <div className="p-2 border-t border-white/[0.06]">
            <button onClick={() => fetchQueue(token, systemFilter)}
              className="w-full text-xs text-gray-600 hover:text-emerald-500 py-1.5 transition-colors">
              ↻ Refresh queue
            </button>
          </div>
        </aside>

        {/* RIGHT — Detail */}
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-800">
            <div className="text-3xl">←</div>
            <div className="text-sm">Select a code from the list</div>
            <div className="text-xs">Search by NAMASTE code, English term, or Sanskrit</div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="max-w-2xl space-y-4">

              {/* Code card */}
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="font-mono text-sm text-emerald-400 font-semibold">{selected.namaste_code}</span>
                  <span className={`text-xs px-2 py-0.5 rounded border ${SYS[selected.system]}`}>{selected.system}</span>
                  {selected.category && selected.category !== "-" &&
                    <span className="text-xs text-gray-600 bg-gray-800/60 px-2 py-0.5 rounded">{selected.category}</span>}
                </div>
                <h2 className="text-xl font-semibold text-white mb-1">{selected.term_english}</h2>
                <p className="text-sm font-mono text-gray-500">{selected.term_original}</p>
                {selected.short_definition && selected.short_definition !== "-" && (
                  <div className="mt-3 bg-black/20 border border-white/[0.05] rounded-lg p-3">
                    <div className="text-xs text-gray-600 uppercase tracking-wide mb-1">Definition</div>
                    <div className="text-sm text-gray-300">{selected.short_definition}</div>
                  </div>
                )}
              </div>

              {/* WHO ICD-11 Search */}
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs text-gray-500 uppercase tracking-widest">Search WHO ICD-11</div>
                  <div className="text-xs text-gray-700">Results auto-fill the mapping below</div>
                </div>
                <div className="flex gap-2 mb-4">
                  <input value={whoQuery} onChange={e => setWhoQuery(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && searchWHO()}
                    placeholder="Type Sanskrit term or English equivalent..."
                    className="flex-1 bg-black/30 border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-600/40 transition-colors" />
                  <button onClick={searchWHO} disabled={whoLoading}
                    className="bg-emerald-800/50 hover:bg-emerald-700/50 disabled:opacity-40 text-emerald-300 text-sm px-4 rounded-lg transition-colors border border-emerald-700/30 shrink-0">
                    {whoLoading ? "..." : "Search"}
                  </button>
                </div>

                {(whoTM2.length > 0 || whoBio.length > 0) && (
                  <div className="space-y-3">
                    {whoTM2.length > 0 && (
                      <div>
                        <div className="text-xs text-amber-500/70 mb-1.5 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span>
                          TM2 Matches (Chapter 26 — Traditional Medicine)
                        </div>
                        <div className="space-y-1">
                          {whoTM2.map((r, i) => (
                            <div key={i} className="flex items-center gap-3 bg-amber-950/20 border border-amber-900/30 rounded-lg px-3 py-2.5 hover:border-amber-700/40 transition-all">
                              <span className="font-mono text-sm text-amber-400 shrink-0 w-14">{r.code}</span>
                              <span className="text-xs text-gray-300 flex-1 truncate">{r.display}</span>
                              <button onClick={() => { setTm2Code(r.code); setTm2Display(r.display); }}
                                className="text-xs bg-amber-900/50 text-amber-400 hover:bg-amber-800/50 px-2.5 py-1 rounded transition-colors shrink-0">
                                Use as TM2
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {whoBio.length > 0 && (
                      <div>
                        <div className="text-xs text-blue-400/70 mb-1.5 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block"></span>
                          Biomedicine Matches (ICD-11 Standard Chapters)
                        </div>
                        <div className="space-y-1">
                          {whoBio.map((r, i) => (
                            <div key={i} className="flex items-center gap-3 bg-blue-950/20 border border-blue-900/30 rounded-lg px-3 py-2.5 hover:border-blue-700/40 transition-all">
                              <span className="font-mono text-sm text-blue-400 shrink-0 w-14">{r.code}</span>
                              <span className="text-xs text-gray-300 flex-1 truncate">{r.display}</span>
                              <button onClick={() => { setBioCode(r.code); setBioDisplay(r.display); }}
                                className="text-xs bg-blue-900/50 text-blue-400 hover:bg-blue-800/50 px-2.5 py-1 rounded transition-colors shrink-0">
                                Use as Bio
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Mapping form */}
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5 space-y-4">
                <div className="text-xs text-gray-500 uppercase tracking-widest">Your Mapping Decision</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-600 mb-1.5 block">TM2 Code <span className="text-gray-700">(Chapter 26)</span></label>
                    <input value={tm2Code} onChange={e => setTm2Code(e.target.value)} placeholder="e.g. SP51"
                      className="w-full bg-black/30 border border-amber-900/30 rounded-lg px-3 py-2 text-sm text-amber-400 font-mono focus:outline-none focus:border-amber-600/50 transition-colors" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 mb-1.5 block">TM2 Display Name</label>
                    <input value={tm2Display} onChange={e => setTm2Display(e.target.value)} placeholder="Fever disorder (TM2)"
                      className="w-full bg-black/30 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 mb-1.5 block">Biomedicine Code</label>
                    <input value={bioCode} onChange={e => setBioCode(e.target.value)} placeholder="e.g. MG26"
                      className="w-full bg-black/30 border border-blue-900/30 rounded-lg px-3 py-2 text-sm text-blue-400 font-mono focus:outline-none focus:border-blue-600/50 transition-colors" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 mb-1.5 block">Biomedicine Display</label>
                    <input value={bioDisplay} onChange={e => setBioDisplay(e.target.value)} placeholder="Fever of other or unknown origin"
                      className="w-full bg-black/30 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-1.5 block">Clinical Notes <span className="text-gray-700">(reasoning, references)</span></label>
                  <input value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="e.g. Maps to fever category based on primary symptom..."
                    className="w-full bg-black/30 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none transition-colors" />
                </div>

                {/* Preview */}
                {(tm2Code || bioCode) && (
                  <div className="bg-black/30 border border-white/[0.06] rounded-lg p-3 space-y-1">
                    <div className="text-xs text-gray-600 mb-2">Preview</div>
                    {tm2Code && <div className="text-xs text-gray-400"><span className="text-amber-400 font-mono">{tm2Code}</span> · {tm2Display} <span className="text-gray-600">(TM2)</span></div>}
                    {bioCode && <div className="text-xs text-gray-400"><span className="text-blue-400 font-mono">{bioCode}</span> · {bioDisplay} <span className="text-gray-600">(Biomedicine)</span></div>}
                    <div className="text-xs text-emerald-500 mt-1">Status: {tm2Code && bioCode ? "complete" : "partial"}</div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-3 gap-3 pb-6">
                <button onClick={() => submitDecision("rejected")} disabled={submitting}
                  className="bg-red-950/40 hover:bg-red-900/40 border border-red-800/30 text-red-400 rounded-xl py-3 text-sm font-medium transition-all disabled:opacity-40">
                  ✗ No Mapping
                </button>
                <button onClick={() => submitDecision("edited")} disabled={submitting}
                  className="bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-800/30 text-emerald-400 rounded-xl py-3 text-sm font-medium transition-all disabled:opacity-40">
                  ✓ Submit Mapping
                </button>
                <button onClick={() => submitDecision("approved")} disabled={submitting}
                  className="bg-gray-800/30 hover:bg-gray-700/30 border border-gray-700/30 text-gray-500 rounded-xl py-3 text-sm font-medium transition-all disabled:opacity-40">
                  → Skip
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
