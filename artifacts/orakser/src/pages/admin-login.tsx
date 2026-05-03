import { useState } from "react";
import { Shield, Eye, EyeOff, Lock } from "lucide-react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

export default function AdminLogin() {
  const { login, isLoading } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    const { error: err } = await login(email, password);
    if (err) setError(err);
    setLoading(false);
  }

  const busy = loading || isLoading;

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div
          className="w-[700px] h-[700px] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(201,168,76,0.12) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Login card */}
      <div className="relative z-10 w-full max-w-[420px] mx-5">
        <div
          className="rounded-2xl p-10"
          style={{
            background: "rgba(255,255,255,0.025)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(201,168,76,0.2)",
            boxShadow:
              "0 0 80px rgba(201,168,76,0.08), 0 32px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
        >
          {/* Logo / Branding */}
          <div className="text-center mb-10">
            <div
              className="inline-flex items-center justify-center w-[72px] h-[72px] rounded-full mb-6"
              style={{
                background: "rgba(201,168,76,0.1)",
                border: "1px solid rgba(201,168,76,0.3)",
                boxShadow: "0 0 30px rgba(201,168,76,0.15)",
              }}
            >
              <Shield className="w-8 h-8" style={{ color: "#C9A84C" }} />
            </div>
            <h1
              className="text-[22px] font-bold tracking-[0.15em] text-white uppercase"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Orakzai Group
            </h1>
            <div className="flex items-center justify-center gap-3 mt-3">
              <div
                className="h-px w-12"
                style={{ background: "rgba(201,168,76,0.3)" }}
              />
              <p
                className="text-[10px] tracking-[0.35em] uppercase"
                style={{ color: "rgba(201,168,76,0.6)" }}
              >
                Command Center
              </p>
              <div
                className="h-px w-12"
                style={{ background: "rgba(201,168,76,0.3)" }}
              />
            </div>
          </div>

          {/* Error state */}
          {error && (
            <div
              className="mb-6 flex items-start gap-3 rounded-xl px-4 py-3 text-sm"
              style={{
                background: "rgba(201,168,76,0.08)",
                border: "1px solid rgba(201,168,76,0.25)",
                color: "#C9A84C",
              }}
            >
              <Lock className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                className="block text-[11px] font-semibold tracking-[0.2em] uppercase mb-2"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@orakzaigroup.com"
                autoComplete="email"
                required
                disabled={busy}
                className="w-full rounded-xl px-4 py-3.5 text-sm text-white placeholder-white/20 outline-none transition-all disabled:opacity-50"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
                onFocus={(e) => {
                  e.target.style.border = "1px solid rgba(201,168,76,0.5)";
                  e.target.style.boxShadow = "0 0 0 3px rgba(201,168,76,0.06)";
                }}
                onBlur={(e) => {
                  e.target.style.border = "1px solid rgba(255,255,255,0.1)";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            <div>
              <label
                className="block text-[11px] font-semibold tracking-[0.2em] uppercase mb-2"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                  disabled={busy}
                  className="w-full rounded-xl px-4 py-3.5 pr-12 text-sm text-white placeholder-white/20 outline-none transition-all disabled:opacity-50"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                  onFocus={(e) => {
                    e.target.style.border = "1px solid rgba(201,168,76,0.5)";
                    e.target.style.boxShadow =
                      "0 0 0 3px rgba(201,168,76,0.06)";
                  }}
                  onBlur={(e) => {
                    e.target.style.border = "1px solid rgba(255,255,255,0.1)";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 transition-opacity hover:opacity-100 opacity-40"
                  tabIndex={-1}
                >
                  {showPw ? (
                    <EyeOff className="w-4 h-4 text-white" />
                  ) : (
                    <Eye className="w-4 h-4 text-white" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={busy || !email || !password}
              className="w-full rounded-xl py-4 text-sm font-bold tracking-[0.15em] uppercase transition-all mt-2 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: busy ? "#C9A84C" : "linear-gradient(135deg, #C9A84C 0%, #FFD700 100%)",
                color: "#050505",
                boxShadow: busy
                  ? "none"
                  : "0 0 30px rgba(201,168,76,0.3), 0 4px 20px rgba(0,0,0,0.4)",
              }}
              onMouseEnter={(e) => {
                if (!busy) {
                  (e.target as HTMLButtonElement).style.boxShadow =
                    "0 0 50px rgba(255,215,0,0.4), 0 4px 20px rgba(0,0,0,0.4)";
                  (e.target as HTMLButtonElement).style.transform =
                    "translateY(-1px)";
                }
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.boxShadow =
                  "0 0 30px rgba(201,168,76,0.3), 0 4px 20px rgba(0,0,0,0.4)";
                (e.target as HTMLButtonElement).style.transform =
                  "translateY(0)";
              }}
            >
              {busy ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                  Verifying…
                </span>
              ) : (
                "Enter Command Center"
              )}
            </button>
          </form>

          {/* Footer */}
          <p
            className="text-center text-[11px] mt-8 tracking-wide"
            style={{ color: "rgba(255,255,255,0.2)" }}
          >
            Authorized Personnel Only · Orakzai Group © 2025
          </p>
        </div>
      </div>
    </div>
  );
}
