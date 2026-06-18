"use client";

import React, { useState } from "react";
import { fetchApi } from "../../utils/api";
import { Mail, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);

    try {
      await fetchApi("/api/auth/magic-link", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to generate magic link. Please check that your email is registered.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 relative overflow-hidden bg-slate-950">
      {/* Background gradients */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md glass-panel p-8 rounded-2xl glow-active shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary mb-4">
            <Mail className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2 text-center">
            CodeExamHub
          </h1>
          <p className="text-sm text-slate-400 text-center">
            Secure Online Coding Assessment Platform
          </p>
        </div>

        {!success ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="student@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 pl-11 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all duration-200"
                />
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              </div>
            </div>

            {error && (
              <div className="text-xs text-red-400 bg-red-950/20 border border-red-900/50 px-4 py-2.5 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full flex items-center justify-center bg-primary hover:bg-primary/95 text-white font-medium text-sm rounded-xl py-3 px-4 shadow-lg shadow-primary/20 hover:shadow-primary/35 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Magic Link...
                </>
              ) : (
                <>
                  Send Magic Link
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="text-center space-y-5 py-4">
            <div className="flex justify-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-white">Magic Link Dispatched!</h3>
              <p className="text-sm text-slate-400">
                A passwordless magic login link has been generated.
              </p>
            </div>
            
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl text-left space-y-2">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Development Notice</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Since we are in local development mode, SMTP is disabled. 
                Please inspect your <strong className="text-primary">backend docker-compose console logs</strong> to click the magic login link:
              </p>
              <div className="text-[10px] font-mono bg-slate-950/80 p-2 rounded-lg text-primary overflow-x-auto select-all border border-slate-900">
                http://localhost:3000/auth/callback?token=...
              </div>
            </div>

            <button
              onClick={() => setSuccess(false)}
              className="text-xs text-slate-500 hover:text-slate-400 underline underline-offset-4"
            >
              Back to login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
