"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi, removeToken } from "../../utils/api";
import { LogOut, Calendar, Clock, Award, Play, Eye, FileText, Loader2 } from "lucide-react";

interface ExamAssignment {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  status: "assigned" | "started" | "submitted" | "expired";
  score: number | null;
  started_at: string | null;
  submitted_at: string | null;
}

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [exams, setExams] = useState<ExamAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Load User
        const userData = await fetchApi("/api/auth/me");
        setUser(userData);

        // Load Exams
        const examsData = await fetchApi("/api/exams");
        setExams(examsData);
      } catch (err: any) {
        setError(err.message || "Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const handleLogout = () => {
    removeToken();
    router.push("/login");
  };

  const handleAction = async (exam: ExamAssignment) => {
    if (exam.status === "assigned") {
      const confirmStart = window.confirm(
        `Are you sure you want to start "${exam.title}"?\nYour timer of ${exam.duration_minutes} minutes will begin immediately.`
      );
      if (!confirmStart) return;

      try {
        await fetchApi(`/api/exams/${exam.id}/start`, { method: "POST" });
        router.push(`/exam/${exam.id}`);
      } catch (err: any) {
        alert(err.message || "Failed to start exam.");
      }
    } else if (exam.status === "started") {
      router.push(`/exam/${exam.id}`);
    } else {
      router.push(`/results/${exam.id}`);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-slate-950">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Loading dashboard data...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-lg">
              CE
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">CodeExamHub</h1>
              <p className="text-xs text-slate-500">Student Examination Portal</p>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-white">{user?.name || "Jane Student"}</p>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center space-x-2 text-slate-400 hover:text-red-400 text-sm px-3 py-1.5 rounded-lg border border-slate-800 hover:border-red-950 bg-slate-900/40 hover:bg-red-950/10 transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {error && (
          <div className="p-4 rounded-xl border border-red-900/50 bg-red-950/20 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white tracking-tight">Assigned Coding Exams</h2>
          <p className="text-sm text-slate-400">
            Select an exam to begin. Be sure to review the duration and instructions before starting.
          </p>
        </div>

        {exams.length === 0 ? (
          <div className="border border-slate-900 bg-slate-950/50 rounded-2xl p-12 text-center max-w-2xl mx-auto space-y-4">
            <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-white">No exams assigned</h3>
              <p className="text-sm text-slate-500">
                You do not have any exams assigned to you at the moment. Please contact your coordinator.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exams.map((exam) => {
              const isAssigned = exam.status === "assigned";
              const isStarted = exam.status === "started";
              const isSubmitted = exam.status === "submitted";
              const isExpired = exam.status === "expired";

              return (
                <div
                  key={exam.id}
                  className="glass-panel hover:border-slate-700/60 rounded-2xl p-6 flex flex-col justify-between hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 relative group"
                >
                  {/* Glowing hover accent */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-primary/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  
                  <div className="space-y-4 relative z-10">
                    <div className="flex items-start justify-between">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                          isAssigned
                            ? "bg-blue-950/40 text-blue-400 border-blue-900/60"
                            : isStarted
                            ? "bg-amber-950/40 text-amber-400 border-amber-900/60 glow-active"
                            : isSubmitted
                            ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/60"
                            : "bg-red-950/40 text-red-400 border-red-900/60"
                        }`}
                      >
                        {exam.status}
                      </span>
                      {isSubmitted && exam.score !== null && (
                        <div className="flex items-center space-x-1 text-emerald-400 text-sm font-semibold bg-emerald-950/20 border border-emerald-900/40 px-2 py-0.5 rounded-lg">
                          <Award className="w-4 h-4" />
                          <span>Score: {exam.score}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-white leading-snug group-hover:text-primary transition-colors duration-200">
                        {exam.title}
                      </h3>
                      <p className="text-sm text-slate-400 line-clamp-3 leading-relaxed">
                        {exam.description || "No description provided."}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-slate-900 flex items-center justify-between text-xs text-slate-500 relative z-10">
                    <div className="flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{exam.duration_minutes} mins</span>
                    </div>
                    
                    <button
                      onClick={() => handleAction(exam)}
                      className={`inline-flex items-center space-x-2 font-medium py-2 px-4 rounded-xl text-xs transition-all duration-200 ${
                        isAssigned
                          ? "bg-primary hover:bg-primary/95 text-white shadow-md shadow-primary/20 hover:shadow-primary/30"
                          : isStarted
                          ? "bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold shadow-md shadow-amber-500/20"
                          : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-850"
                      }`}
                    >
                      {isAssigned && (
                        <>
                          <span>Start Exam</span>
                          <Play className="w-3 h-3 fill-current" />
                        </>
                      )}
                      {isStarted && (
                        <>
                          <span>Resume</span>
                          <Play className="w-3 h-3 fill-current" />
                        </>
                      )}
                      {(isSubmitted || isExpired) && (
                        <>
                          <span>View Results</span>
                          <Eye className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
