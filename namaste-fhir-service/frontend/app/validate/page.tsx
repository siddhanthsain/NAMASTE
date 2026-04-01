"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const API = "https://namaste-fhir-backend.onrender.com";

export default function ValidateLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const login = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/auth/login?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Login failed"); setLoading(false); return; }
      localStorage.setItem("expert_token", data.token);
      localStorage.setItem("expert_name", data.name);
      window.location.href = "/validate/queue";
    } catch {
      setError("Connection failed");
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-[#0a0f0d] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto mb-4">
            <span className="text-emerald-400 text-xl font-bold">N</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Expert Validation Portal</h1>
          <p className="text-gray-500 text-sm mt-1">NAMASTE ICD-11 Mapping · Layer 2</p>
        </div>

        <div className="bg-gray-900 border border-gray-700/60 rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500/60"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && login()}
              placeholder="••••••••"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500/60"
            />
          </div>
          {error && <div className="text-red-400 text-xs">{error}</div>}
          <button
            onClick={login}
            disabled={loading}
            className="w-full bg-emerald-700 hover:bg-emerald-600 disabled:bg-gray-700 text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </div>
        <p className="text-center text-gray-600 text-xs mt-4">Invite-only access · Contact CCRAS-NIIMH Hyderabad</p>
        <p className="text-center mt-3"><a href="/" className="text-emerald-600 text-xs hover:text-emerald-400">← Back to public demo</a></p>
      </div>
    </main>
  );
}

export const dynamic = 'force-dynamic';
