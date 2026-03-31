"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

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

const SYSTEM_COLOR: Record<string, string> = {
  Ayurveda: "text-emerald-400",
  Siddha: "text-sky-400",
  Unani: "text-amber-400",
};

export default function ValidationQueue() {
  const router = useRouter();
  const [expert, setExpert] = useState("");
  const [token, setToken] = useState("");
  const [codes, setCodes] = useState<NAMASTECode[]>([]);
  const [selected, setSelected] = useState<NAMASTECode | null>(null);
  const [totalQueue, setTotalQueue] = useState(0);
  const [contributions, setContributions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState("");
  const [systemFilter, setSystemFilter] = useState("All");
  const [tm2Code, setTm2Code] = useState("");
  const [tm2Display, setTm2Display] = useState("");
  const [bioCode, setBioCode] = useState("");
  const [bioDisplay, setBioDisplay] = useState("");
  const [notes, setNotes] = useState("");
  const [whoSearch, setWhoSearch] = useState("");
  const [whoResults, setWhoResults] = useState<any[]>([]);
  const [whoLoading, setWhoLoading] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const t = localStorage.getItem("expert_token");
    const n = localStorage.getItem("expert_name");
    if (t === null) { router.push("/validate"); return; }
    setToken(t);
    setExpert(n || "Expert");
    fetchQueue(t);
  }, []);

  const fetchQueue = useCallback(async (t: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/validation/queue?limit=50`, {
        headers: { Authorization: `Bearer ${t}` }
      });
      const data = await res.json();
      if (res.status === 401) { router.push("/validate"); return; }
      setCodes(data.codes || []);
      setTotalQueue(data.total_queue);
      setContributions(data.your_contributions);
    } catch {}
    setLoading(false);
  }, []);

  const selectCode = (code: NAMASTECode) => {
    setSelected(code);
    setTm2Code(code.tm2_code || "");
    setTm2Display(code.tm2_display || "");
    setBioCode(code.icd_biomedicine_code || "");
    setBioDisplay(code.icd_biomedicine_display || "");
    setNotes("");
    setWhoSearch(code.term_original || code.term_english);
    setWhoResults([]);
  };

  const searchWHO = async (q: string) => {
    if (q.length < 2) { setWhoResults([]); return; }
    setWhoLoading(true);
    try {
      const res = await fetch(`${API}/namaste/search?q=${encodeURIComponent(q)}`);
      const icdRes = await fetch(
        `https://id.who.int/icd/release/11/2025-01/mms/search?q=${encodeURIComponent(q)}&flatResults=true&highlightingEnabled=false`,
        { headers: { "Accept": "application/json", "Accept-Language": "en", "API-Version": "v2" } }
      );
      if (icdRes.ok) {
        const icdData = await icdRes.json();
        setWhoResults(icdData.destinationEntities?.slice(0, 8) || []);
      }
    } catch {}
    setWhoLoading(false);
  };

  const applyWHOResult = (entity: any, type: "tm2" | "bio") => {
    const code = entity.theCode || "";
    const display = entity.title || "";
    if (type === "tm2") { setTm2Code(code); setTm2Display(display); }
    else { setBioCode(code); setBioDisplay(display); }
  };

  const submitDecision = async (decision: string) => {
    if (selected === null) return;
    setSubmitting(true);
    const params = new URLSearchParams({ decision });
    if (tm2Code) { params.set("tm2_code", tm2Code); params.set("tm2_display", tm2Display); }
    if (bioCode) { params.set("icd_biomedicine_code", bioCode); params.set("icd_biomedicine_display", bioDisplay); }
    if (notes) params.set("notes", notes);
    await fetch(`${API}/validation/decide/${selected.namaste_code}?${params}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
    setContributions(c => c + 1);
    setCodes(prev => prev.filter(c => c.namaste_code !== selected.namaste_code));
    setSelected(null);
    setToast(`${decision === "edited" ? "Mapping submitted" : decision === "rejected" ? "Rejected" : "Skipped"}`);
    setTimeout(() => setToast(""), 2500);
    setSubmitting(false);
  };

  const filtered = codes.filter(c => {
    const matchSystem = systemFilter === "All" || c.system === systemFilter;
    const matchFilter = filter === "" ||
      c.term_english.toLowerCase().includes(filter.toLowerCase()) ||
      c.namaste_code.toLowerCase().includes(filter.toLowerCase()) ||
      c.term_original.toLowerCase().includes(filter.toLowerCase());
    return matchSystem && matchFilter;
  });

  return (
    <main className="h-screen bg-[#080c0a] text-white flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="border-b border-gray-800/80 px-5 py-2.5 flex justify-between items-center shrink-0 bg-[#080c0a]">
        <div className="flex items-center gap-3">
          <span className="text-emerald-400 font-semibold text-sm tracking-tight">NAMASTE Validation</span>
          <span className="text-gray-700">·</span>
          <span className="text-gray-400 text-xs">{expert}</span>
        </div>
        <div className="flex items-center gap-5">
          {toast && <span className="text-xs text-emerald-400 animate-pulse">{toast}</span>}
          <span className="text-xs text-gray-500">{contributions} contributions</span>
          <span className="text-xs text-amber-500/80">{totalQueue.toLocaleString()} in queue</span>
          <button onClick={() => { localStorage.clear(); router.push("/validate"); }}
            className="text-xs text-gray-600 hover:text-gray-300 transition-colors">Logout</button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT — Code list */}
        <div className="w-80 border-r border-gray-800/60 flex flex-col shrink-0 bg-[#080c0a]">
          {/* Filters */}
          <div className="p-3 space-y-2 border-b border-gray-800/60">
            <input
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Search term, code..."
              className="w-full bg-gray-900 border border-gray-700/60 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-600/50"
            />
            <div className="flex gap-1">
              {["All", "Ayurveda", "Siddha", "Unani"].map(s => (
                <button key={s} onClick={() => setSystemFilter(s)}
                  className={`text-xs px-2 py-1 rounded-md transition-colors ${systemFilter === s ? "bg-emerald-800/50 text-emerald-300" : "text-gray-500 hover:text-gray-300"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-xs text-gray-600">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="p-4 text-xs text-gray-600">No codes match filter</div>
            ) : filtered.map(code => (
              <div
                key={code.namaste_code}
                onClick={() => selectCode(code)}
                className={`px-4 py-3 border-b border-gray-800/40 cursor-pointer transition-colors ${selected?.namaste_code === code.namaste_code ? "bg-emerald-950/40 border-l-2 border-l-emerald-600" : "hover:bg-gray-900/60"}`}
              >
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-emerald-400 font-mono text-xs">{code.namaste_code}</span>
                  <span className={`text-xs ${SYSTEM_COLOR[code.system] || "text-gray-500"}`}>{code.system[0]}</span>
                </div>
                <div className="text-xs text-gray-300 truncate">{code.term_english}</div>
                <div className="text-xs text-gray-600 truncate">{code.term_original}</div>
              </div>
            ))}
          </div>
          <div className="p-2 border-t border-gray-800/60 text-center">
            <button onClick={() => fetchQueue(token)} className="text-xs text-gray-600 hover:text-emerald-500 transition-colors">
              Load more codes
            </button>
          </div>
        </div>

        {/* RIGHT — Detail + mapping */}
        {selected === null ? (
          <div className="flex-1 flex items-center justify-center text-gray-700 text-sm">
            Select a code from the list to start mapping
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Code info */}
            <div className="bg-gray-900/60 border border-gray-700/40 rounded-xl p-5">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-emerald-400 font-mono text-xs">{selected.namaste_code}</span>
                    <span className={`text-xs ${SYSTEM_COLOR[selected.system]}`}>{selected.system}</span>
                    <span className="text-gray-600 text-xs">{selected.category}</span>
                  </div>
                  <h2 className="text-lg font-semibold text-white">{selected.term_english}</h2>
                  <p className="text-gray-500 text-sm mt-0.5 font-mono">{selected.term_original}</p>
                </div>
              </div>
              {selected.short_definition && selected.short_definition !== "-" && (
                <div className="mt-3 bg-gray-800/50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">Definition</div>
                  <div className="text-sm text-gray-300">{selected.short_definition}</div>
                </div>
              )}
            </div>

            {/* WHO ICD-11 Live Search */}
            <div className="bg-gray-900/60 border border-gray-700/40 rounded-xl p-5">
              <div className="text-xs text-gray-400 uppercase tracking-widest mb-3">Search WHO ICD-11</div>
              <div className="flex gap-2 mb-3">
                <input
                  value={whoSearch}
                  onChange={e => setWhoSearch(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && searchWHO(whoSearch)}
                  placeholder="Search ICD-11 terms..."
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-600/50"
                />
                <button onClick={() => searchWHO(whoSearch)} disabled={whoLoading}
                  className="bg-emerald-800/60 hover:bg-emerald-700/60 text-emerald-300 text-xs px-4 rounded-lg transition-colors">
                  {whoLoading ? "..." : "Search"}
                </button>
              </div>
              {whoResults.length > 0 && (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {whoResults.map((e, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-800/60 rounded-lg px-3 py-2 hover:bg-gray-700/60">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-xs font-mono text-emerald-400 shrink-0">{e.theCode}</span>
                        <span className="text-xs text-gray-300 truncate">{e.title}</span>
                        {e.chapter === "26" && <span className="text-xs text-amber-500/70 shrink-0">TM2</span>}
                      </div>
                      <div className="flex gap-1 ml-2 shrink-0">
                        <button onClick={() => applyWHOResult(e, "tm2")}
                          className="text-xs bg-emerald-900/50 text-emerald-400 px-2 py-0.5 rounded hover:bg-emerald-800/50 transition-colors">
                          TM2
                        </button>
                        <button onClick={() => applyWHOResult(e, "bio")}
                          className="text-xs bg-blue-900/50 text-blue-400 px-2 py-0.5 rounded hover:bg-blue-800/50 transition-colors">
                          Bio
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Mapping form */}
            <div className="bg-gray-900/60 border border-gray-700/40 rounded-xl p-5 space-y-3">
              <div className="text-xs text-gray-400 uppercase tracking-widest">Mapping</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">TM2 Code</label>
                  <input value={tm2Code} onChange={e => setTm2Code(e.target.value)}
                    placeholder="e.g. SP51"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-emerald-400 font-mono focus:outline-none focus:border-emerald-600/50" />
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">TM2 Display</label>
                  <input value={tm2Display} onChange={e => setTm2Display(e.target.value)}
                    placeholder="Fever disorder (TM2)"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-600/50" />
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Biomedicine Code</label>
                  <input value={bioCode} onChange={e => setBioCode(e.target.value)}
                    placeholder="e.g. MG26"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-blue-400 font-mono focus:outline-none focus:border-blue-600/50" />
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Biomedicine Display</label>
                  <input value={bioDisplay} onChange={e => setBioDisplay(e.target.value)}
                    placeholder="Fever of unknown origin"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-600/50" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Notes</label>
                <input value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Clinical reasoning or references..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-3 gap-3 pb-4">
              <button onClick={() => submitDecision("rejected")} disabled={submitting}
                className="bg-red-950/60 hover:bg-red-900/60 border border-red-800/30 text-red-400 rounded-xl py-3 text-sm font-medium transition-colors disabled:opacity-40">
                Reject
              </button>
              <button onClick={() => submitDecision("edited")} disabled={submitting}
                className="bg-blue-950/60 hover:bg-blue-900/60 border border-blue-800/30 text-blue-400 rounded-xl py-3 text-sm font-medium transition-colors disabled:opacity-40">
                Submit Mapping
              </button>
              <button onClick={() => submitDecision("approved")} disabled={submitting}
                className="bg-gray-800/60 hover:bg-gray-700/60 border border-gray-700/30 text-gray-400 rounded-xl py-3 text-sm font-medium transition-colors disabled:opacity-40">
                Skip
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
