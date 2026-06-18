"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "../utils/api";
import { Terminal, Shield, Cpu, ArrowRight, Loader2 } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    // Check session
    const token = getToken();
    setIsLoggedIn(!!token);
  }, []);

  const handleCTA = () => {
    if (isLoggedIn) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 relative overflow-hidden bg-slate-950 text-white min-h-screen">
      {/* Dynamic ambient gradients */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[450px] h-[450px] bg-purple-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-4xl text-center space-y-8 relative z-10">
        {/* Logo badge */}
        <div className="inline-flex items-center space-x-2.5 bg-slate-900 border border-slate-800 rounded-full px-4.5 py-1.5 text-xs text-primary font-bold uppercase tracking-wider shadow-inner">
          <Terminal className="w-4 h-4" />
          <span>v1.0.0 Stable Release</span>
        </div>

        {/* Hero Title */}
        <div className="space-y-3">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
            CodeExamHub
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto font-light leading-relaxed">
            The modern, production-grade coding assessment platform for organizations, universities, and coding bootcamps.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto pt-6 text-left">
          <div className="glass-panel p-5 rounded-2xl space-y-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
              <Cpu className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-white">Docker Sandbox</h4>
            <p className="text-xs text-slate-400 leading-normal">
              User codes run inside isolated containerized environments with strict resource limits and no network.
            </p>
          </div>

          <div className="glass-panel p-5 rounded-2xl space-y-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Shield className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-white">Passwordless Magic</h4>
            <p className="text-xs text-slate-400 leading-normal">
              Secure magic links dispatched instantly to student inbox. Zero credentials overhead, zero password leaks.
            </p>
          </div>

          <div className="glass-panel p-5 rounded-2xl space-y-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Terminal className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-white">Monaco Editor</h4>
            <p className="text-xs text-slate-400 leading-normal">
              Power of VS Code editor built directly in the browser with full autocomplete, tabs, and error logs.
            </p>
          </div>
        </div>

        {/* CTA Button */}
        <div className="pt-6">
          {isLoggedIn === null ? (
            <div className="flex justify-center">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : (
            <button
              onClick={handleCTA}
              className="inline-flex items-center space-x-2 bg-primary hover:bg-primary/95 text-white font-semibold text-sm rounded-xl py-3.5 px-8 shadow-xl shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              <span>{isLoggedIn ? "Go to Student Dashboard" : "Enter Coding Portal"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
