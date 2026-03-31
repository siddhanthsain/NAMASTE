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

interface WHOResult {
  theCode: string;
  title: string;
  chapter: string;
  score: number;
}

const SYSTEM_COLOR: Record<string, string> = {
  Ayurveda: "text-emerald-400 bg-emerald-950/40",
  Siddha: "text-sky-400 bg-sky-950/40",
  Unani: "text-amber-400 bg-amber-950/40",
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
  const [listSearch, setListSearch] = useState("");
  const [listSearching, setListSearching] = useState(false);
  const [tm2Code, setTm2Code] = useState("");
  const [tm2Display, setTm2Display] = useState("");
  const [bioCode, setBioCode] = useState("");
  const [bioDisplay, setBioDisplay] = useState("");
  const [notes, setNotes] = useState("");
  const [whoQuery, setWhoQuery] = useState("");
  const [whoResults, setWhoResults] = useState<WHOResult[]>([]);
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

  const searchList = useCallback(async (q: string) => {
    if (q.length < 2) { fetchQueue(token); return; }
    setListSearching(true);
    try {
      const res = await fetch(`${API}/namaste/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      const noMatch = (data.results || []).filter((c: NAMASTECode) => c.mapping_status === "no_match");
      setCodes(noMatch);
    } catch {}
    setListSearching(false);
  }, [token]);

  useEffect(() => {
    const t = setTimeout(() => searchList(listSearch), 400);
    return () => clearTimeout(t);
  }, [listSearch]);

  const selectCode = (code: NAMASTECode) => {
    setSelected(code);
    setTm2Code(code.tm2_code || "");
    setTm2Display(code.tm2_display || "");
    setBioCode(code.icd_biomedicine_code || "");
    setBioDisplay(code.icd_biomedicine_display || "");
    setNotes("");
    setWhoQuery(code.term_original && !code.term_original.includes("H") ? code.term_original : code.term_english.replace(/\(.*\)/, "").trim());
    setWhoResults([]);
  };

  const searchWHO = async () => {
    if (whoQuery.length < 2) return;
    setWhoLoading(true);
    setWhoResults([]);
    try {
      const res = await fetch(`${API}/namaste/search?q=${encodeURIComponent(whoQuery)}`);
      const data = await res.json();
      const mapped = (data.results || [])
        .filter((r: NAMASTECode) => r.icd_biomedicine_code || r.tm2_code)
        .slice(0, 5)
        .map((r: NAMASTECode) => ({
          theCode: r.icd_biomedicine_code || r.tm2_code || "",
          title: r.icd_biomedicine_display || r.tm2_display || r.term_english,
          chapter: r.tm2_code ? "26" : "bio",
          score: r.mapping_status === "complete" ? 1 : 0.8
        }));

      const whoRes = await fetch(
        `https://id.who.int/icd/release/11/2025-01/mms/search?q=${encodeURIComponent(whoQuery)}&flatResults=true&highlightingEnabled=false&chapterFilter=26`,
        { headers: { "Accept": "application/json", "Accept-Language": "en", "API-Version": "v2" } }
      );
      const bioRes = await fetch(
        `https://id.who.int/icd/release/11/2025-01/mms/search?q=${encodeURIComponent(whoQuery)}&flatResults=true&highlightingEnabled=false`,
        { headers: { "Accept": "application/json", "Accept-Language": "en", "API-Version": "v2" } }
      );

      const whoData = whoRes.ok ? await whoRes.json() : { destinationEntities: [] };
      const bioData = bioRes.ok ? await bioRes.json() : { destinationEntities: [] };

      const tm2Results = (whoData.destinationEntities || []).slice(0, 3).map((e: any) => ({
        theCode: e.theCode, title: e.title, chapter: "26", score: e.score
      }));
      const bioResults = (bioData.destinationEntities || []).slice(0, 3).map((e: any) => ({
        theCode: e.theCode, title: e.title, chapter: e.chapter, score: e.score
      }));

      setWhoResults([...tm2Results, ...bioResults, ...mapped].slice(0, 8));
    } catch (err) {
      console.error(err);
    }
    setWhoLoading(false);
  };

  const applyResult = (r: WHOResult, type: "tm2" | "bio") => {
    if (type === "tm2") { setTm2Code(r.theCode); setTm2Display(r.title); }
    else { setBioCode(r.theCode); setBioDisplay(r.title); }
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
    setTotalQueue(q => q - 1);
    setCodes(prev => prev.filter(c => c.namaste_code !== selected.namaste_code));
    setSelected(null);
    setWhoResults([]);
    const msg = decision === "edited" ? "Mapping submitted" : decision === "rejected" ? "Rejected" : "Skipped";
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
    setSubmitting(false);
  };

  return (
    <main className="h-screen bg-[#07090a] text-white flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="border-b border-white/5 px-5 py-2.5 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-emerald-400 font-semibold text-sm">NAMASTE Expert Validation</span>
          <span className="text-gray-700 text-xs">·</span>
          <span className="text-gray-500 text-xs">{expert}</span>
        </div>
        <div className="flex items-center gap-5">
          {toast && <span className="text-xs text-emerald-400">{toast}</span>}
          <span className="text-xs text-gray-600">{contributions} contributions</span>
          <span className="text-xs text-amber-500/70">{totalQueue.toLocaleString()} remaining</span>
          <a href="/" className="text-xs text-gray-600 hover:text-gray-400">← Public</a>
          <button onClick={() => { localStorage.clear(); router.push("/validate"); }} className="text-xs text-gray-600 hover:text-red-400">Logout</button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANEL — searchable list */}
        <div className="w-96 border-r border-white/5 flex flex-col shrink-0">
          <div className="p-3 border-b border-white/5 space-y-2">
            <input
              value={listSearch}
              onChange={e => setListSearch(e.target.value)}
              placeholder="Search by NAMASTE code, English term, Sanskrit..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-600/40"
            />
            <div className="text-xs text-gray-600">{codes.length} codes shown · {totalQueue.toLocaleString()} total unmapped</div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading || listSearching ? (
              <div className="p-4 text-xs text-gray-600">{listSearching ? "Searching..." : "Loading..."}</div>
            ) : codes.length === 0 ? (
              <div className="p-4 text-xs text-gray-600">No codes found</div>
            ) : codes.map(code => (
              <div
                key={code.namaste_code}
                onClick={() => selectCode(code)}
                className={`px-4 py-3 border-b border-white/5 cursor-pointer transition-all ${selected?.namaste_code === code.namaste_code ? "bg-emerald-950/50 border-l-2 border-l-emerald-500" : "hover:bg-white/5"}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-emerald-400 font-mono text-xs font-medium">{code.namaste_code}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded text-xs ${SYSTEM_COLOR[code.system] || "text-gray-500 bg-gray-800"}`}>{code.system}</span>
                </div>
                <div className="text-sm text-gray-200 leading-tight">{code.term_english}</div>
                <div className="text-xs text-gray-500 mt-0.5 font-mono">{code.term_original}</div>
              </div>
            ))}
          </div>

          <div className="p-2 border-t border-white/5">
            <button onClick={() => fetchQueue(token)} className="w-full text-xs text-gray-600 hover:text-emerald-500 py-1.5 transition-colors">
              Refresh queue
            </button>
          </div>
        </div>

        {/* RIGHT PANEL */}
        {selected === null ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-700">
            <div className="text-4xl">←</div>
            <div className="text-sm">Select a NAMASTE code to start mapping</div>
            <div className="text-xs text-gray-800">Search by code, English term, or Sanskrit term on the left</div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-5 max-w-3xl">
              {/* Code header */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-sm text-emerald-400 font-medium">{selected.namaste_code}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${SYSTEM_COLOR[selected.system]}`}>{selected.system}</span>
                  {selected.category && selected.category !== "-" && (
                    <span className="text-xs text-gray-600 bg-gray-800/60 px-2 py-0.5 rounded">{selected.category}</span>
                  )}
                </div>
                <h2 className="text-xl font-semibold text-white">{selected.term_english}</h2>
                <p className="text-gray-500 text-sm mt-1 font-mono">{selected.term_original}</p>
                {selected.short_definition && selected.short_definition !== "-" && (
                  <div className="mt-3 bg-black/30 rounded-lg p-3 border border-white/5">
                    <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Definition</div>
                    <div className="text-sm text-gray-300">{selected.short_definition}</div>
                  </div>
                )}
              </div>

              {/* WHO ICD-11 Search */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <div className="text-xs text-gray-400 uppercase tracking-widest mb-3">Search WHO ICD-11 · Find matching codes</div>
                <div className="flex gap-2 mb-3">
                  <input
                    value={whoQuery}
                    onChange={e => setWhoQuery(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && searchWHO()}
                    placeholder="Type Sanskrit term, English equivalent, or symptom..."
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-600/40"
                  />
                  <button onClick={searchWHO} disabled={whoLoading}
                    className="bg-emerald-800/60 hover:bg-emerald-700/60 disabled:opacity-40 text-emerald-300 text-sm px-5 rounded-lg transition-colors shrink-0">
                    {whoLoading ? "Searching..." : "Search"}
                  </button>
                </div>

                {whoResults.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-xs text-gray-600 mb-2">{whoResults.length} results — click TM2 or Bio to apply</div>
                    {whoResults.map((r, i) => (
                      <div key={i} className="flex items-center gap-3 bg-black/30 border border-white/5 rounded-lg px-3 py-2.5 hover:border-white/10 transition-all">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-emerald-400 shrink-0">{r.theCode}</span>
                            {r.chapter === "26" && <span className="text-xs text-amber-400 bg-amber-950/40 px-1.5 py-0.5 rounded shrink-0">TM2</span>}
                            {r.chapter !== "26" && <span className="text-xs text-blue-400 bg-blue-950/40 px-1.5 py-0.5 rounded shrink-0">Bio</span>}
                          </div>
                          <div className="text-xs text-gray-300 truncate mt-0.5">{r.title}</div>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button onClick={() => applyResult(r, "tm2")}
                            className="text-xs bg-emerald-900/60 text-emerald-400 hover:bg-emerald-800/60 px-2.5 py-1 rounded transition-colors">
                            → TM2
                          </button>
                          <button onClick={() => applyResult(r, "bio")}
                            className="text-xs bg-blue-900/60 text-blue-400 hover:bg-blue-800/60 px-2.5 py-1 rounded transition-colors">
                            → Bio
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Mapping form */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
                <div className="text-xs text-gray-400 uppercase tracking-widest">Your Mapping Decision</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">TM2 Code <span className="text-gray-700">(Chapter 26)</span></label>
                    <input value={tm2Code} onChange={e => setTm2Code(e.target.value)}
                      placeholder="e.g. SP51"
                      className="w-full bg-black/40 border border-emerald-900/40 rounded-lg px-3 py-2 text-sm text-emerald-400 font-mono focus:outline-none focus:border-emerald-600/60" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">TM2 Display Name</label>
                    <input value={tm2Display} onChange={e => setTm2Display(e.target.value)}
                      placeholder="e.g. Fever disorder (TM2)"
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-600/40" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">ICD-11 Biomedicine Code</label>
                    <input value={bioCode} onChange={e => setBioCode(e.target.value)}
                      placeholder="e.g. MG26"
                      className="w-full bg-black/40 border border-blue-900/40 rounded-lg px-3 py-2 text-sm text-blue-400 font-mono focus:outline-none focus:border-blue-600/60" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">Biomedicine Display Name</label>
                    <input value={bioDisplay} onChange={e => setBioDisplay(e.target.value)}
                      placeholder="e.g. Fever of other or unknown origin"
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-600/40" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">Clinical Notes <span className="text-gray-700">(reasoning, references)</span></label>
                  <input value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="e.g. Maps to fever category based on symptom overlap..."
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-3 gap-3 pb-6">
                <button onClick={() => submitDecision("rejected")} disabled={submitting}
                  className="bg-red-950/50 hover:bg-red-900/50 border border-red-800/30 text-red-400 rounded-xl py-3 text-sm font-medium transition-colors disabled:opacity-40">
                  Reject — No mapping exists
                </button>
                <button onClick={() => submitDecision("edited")} disabled={submitting}
                  className="bg-emerald-950/50 hover:bg-emerald-900/50 border border-emerald-800/30 text-emerald-400 rounded-xl py-3 text-sm font-medium transition-colors disabled:opacity-40">
                  Submit Mapping
                </button>
                <button onClick={() => submitDecision("approved")} disabled={submitting}
                  className="bg-gray-800/40 hover:bg-gray-700/40 border border-gray-700/30 text-gray-500 rounded-xl py-3 text-sm font-medium transition-colors disabled:opacity-40">
                  Skip for now
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
