"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setToken, fetchApi } from "../../../utils/api";
import { Loader2, AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("No authentication token was provided.");
      return;
    }

    const verifyToken = async () => {
      try {
        const response = await fetchApi("/api/auth/verify", {
          method: "POST",
          body: JSON.stringify({ token }),
        });
        
        // Save the access token
        setToken(response.access_token);
        
        // Redirect to dashboard
        router.push("/dashboard");
      } catch (err: any) {
        setError(err.message || "Failed to authenticate. The link may have expired.");
      }
    };

    verifyToken();
  }, [token, router]);

  if (error) {
    return (
      <div className="w-full max-w-md glass-panel p-8 rounded-2xl glow-active shadow-2xl relative z-10 text-center space-y-6">
        <div className="flex justify-center">
          <AlertCircle className="w-12 h-12 text-red-400" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white">Authentication Failed</h3>
          <p className="text-sm text-slate-400 leading-relaxed">{error}</p>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center justify-center bg-primary hover:bg-primary/95 text-white font-medium text-sm rounded-xl py-3 px-6 shadow-lg transition-all duration-200 active:scale-[0.98]"
        >
          Return to Login
          <ArrowRight className="w-4 h-4 ml-2" />
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md glass-panel p-8 rounded-2xl glow-active shadow-2xl relative z-10 text-center space-y-4">
      <div className="flex justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
      <h3 className="text-lg font-semibold text-white">Verifying Magic Link</h3>
      <p className="text-sm text-slate-400">
        Please wait while we establish your secure session...
      </p>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 relative overflow-hidden bg-slate-950">
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />
      
      <Suspense fallback={
        <div className="w-full max-w-md glass-panel p-8 rounded-2xl glow-active shadow-2xl text-center space-y-4">
          <div className="flex justify-center">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </div>
          <h3 className="text-lg font-semibold text-white">Loading Auth Handler</h3>
          <p className="text-sm text-slate-400">Initializing Callback...</p>
        </div>
      }>
        <CallbackHandler />
      </Suspense>
    </div>
  );
}
