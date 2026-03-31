"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

const API = "https://namaste-fhir-backend.onrender.com";

interface NAMASTECode {
  namaste_code: string;
  term_english: string;
  term_original: string;
  system: string;
  short_definition: string;
  tm2_code: string | null;
  tm2_display: string | null;
  icd_biomedicine_code: string | null;
  icd_biomedicine_display: string | null;
}

export default function ValidationQueue() {
  const router = useRouter();
  const [expert, setExpert] = useState("");
  const [token, setToken] = useState("");
  const [codes, setCodes] = useState<NAMASTECode[]>([]);
  const [current, setCurrent] = useState(0);
  const [totalQueue, setTotalQueue] = useState(0);
  const [contributions, setContributions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tm2Code, setTm2Code] = useState("");
  const [tm2Display, setTm2Display] = useState("");
  const [bioCode, setBioCode] = useState("");
  const [bioDisplay, setBioDisplay] = useState("");
  const [notes, setNotes] = useState("");
  const [lastDecision, setLastDecision] = useState("");

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
      const res = await fetch(`${API}/validation/queue?limit=5`, {
        headers: { Authorization: `Bearer ${t}` }
      });
      const data = await res.json();
      if (res.status === 401) { router.push("/validate"); return; }
      setCodes(data.codes || []);
      setTotalQueue(data.total_queue);
      setContributions(data.your_contributions);
      setCurrent(0);
      clearForm();
    } catch {}
    setLoading(false);
  }, []);

  const clearForm = () => {
    setTm2Code(""); setTm2Display(""); setBioCode(""); setBioDisplay(""); setNotes("");
  };

  const submitDecision = async (decision: string) => {
    if (codes.length === 0) return;
    setSubmitting(true);
    const code = codes[current];
    const params = new URLSearchParams({ decision });
    if (tm2Code) { params.set("tm2_code", tm2Code); params.set("tm2_display", tm2Display); }
    if (bioCode) { params.set("icd_biomedicine_code", bioCode); params.set("icd_biomedicine_display", bioDisplay); }
    if (notes) params.set("notes", notes);
    await fetch(`${API}/validation/decide/${code.namaste_code}?${params}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
    setLastDecision(decision);
    setContributions(c => c + 1);
    if (current + 1 < codes.length) {
      setCurrent(c => c + 1);
      clearForm();
    } else {
      fetchQueue(token);
    }
    setSubmitting(false);
  };

  if (loading) return (
    <main className="min-h-screen bg-[#0a0f0d] flex items-center justify-center">
      <div className="text-emerald-400 text-sm">Loading queue...</div>
    </main>
  );

  const code = codes[current];

  return (
    <main className="min-h-screen bg-[#0a0f0d] text-white">
      <div className="border-b border-gray-800 px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="text-emerald-400 font-medium text-sm">NAMASTE Expert Validation</span>
          <span className="text-gray-600 text-xs">·</span>
          <span className="text-gray-400 text-xs">{expert}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-500">{contributions} contributions</span>
          <span className="text-xs text-amber-500">{totalQueue.toLocaleString()} remaining</span>
          <button onClick={() => { localStorage.clear(); router.push("/validate"); }} className="text-xs text-gray-600 hover:text-gray-400">Logout</button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {lastDecision && (
          <div className="mb-4 text-xs px-3 py-2 rounded-lg bg-emerald-900/30 text-emerald-400">
            Decision recorded: {lastDecision}
          </div>
        )}

        {code === undefined ? (
          <div className="text-center text-gray-500 py-20">No more codes in queue.</div>
        ) : (
          <div className="space-y-5">
            <div className="bg-gray-900 border border-gray-700/60 rounded-2xl p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-emerald-400 font-mono text-xs">{code.namaste_code}</span>
                  <h2 className="text-xl font-semibold mt-1">{code.term_english}</h2>
                  <p className="text-gray-500 text-sm mt-0.5">{code.term_original}</p>
                </div>
                <span className="text-xs text-gray-600 bg-gray-800 px-2 py-1 rounded">{current + 1}/{codes.length}</span>
              </div>
              {code.short_definition && code.short_definition !== "-" && (
                <div className="bg-gray-800/60 rounded-lg p-3 mb-4">
                  <div className="text-xs text-gray-500 mb-1">Definition</div>
                  <div className="text-sm text-gray-300">{code.short_definition}</div>
                </div>
              )}
              <a href={`https://icd.who.int/browse/2025-01/mms/en`} target="_blank" className="text-xs text-emerald-600 hover:text-emerald-400 underline">
                Open WHO ICD-11 Browser
              </a>
            </div>

            <div className="bg-gray-900 border border-gray-700/60 rounded-2xl p-6 space-y-4">
              <div className="text-xs text-gray-400 uppercase tracking-widest">Your Mapping</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">TM2 Code</label>
                  <input value={tm2Code} onChange={e => setTm2Code(e.target.value)} placeholder="e.g. SP51"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-emerald-400 font-mono focus:outline-none focus:border-emerald-600" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">TM2 Display</label>
                  <input value={tm2Display} onChange={e => setTm2Display(e.target.value)} placeholder="Fever disorder (TM2)"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-600" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">ICD-11 Biomedicine Code</label>
                  <input value={bioCode} onChange={e => setBioCode(e.target.value)} placeholder="e.g. MG26"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-blue-400 font-mono focus:outline-none focus:border-blue-600" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Biomedicine Display</label>
                  <input value={bioDisplay} onChange={e => setBioDisplay(e.target.value)} placeholder="Fever of unknown origin"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-600" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Notes</label>
                <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Clinical reasoning..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <button onClick={() => submitDecision("rejected")} disabled={submitting}
                className="bg-red-900/30 hover:bg-red-900/50 border border-red-800/40 text-red-400 rounded-xl py-3 text-sm font-medium transition-colors">
                Reject
              </button>
              <button onClick={() => submitDecision("edited")} disabled={submitting}
                className="bg-blue-900/30 hover:bg-blue-900/50 border border-blue-800/40 text-blue-400 rounded-xl py-3 text-sm font-medium transition-colors">
                Submit Mapping
              </button>
              <button onClick={() => submitDecision("approved")} disabled={submitting}
                className="bg-emerald-900/30 hover:bg-emerald-900/50 border border-emerald-800/40 text-emerald-400 rounded-xl py-3 text-sm font-medium transition-colors">
                Skip
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
