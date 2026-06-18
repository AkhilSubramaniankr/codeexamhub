"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchApi } from "../../../utils/api";
import { 
  Award, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ArrowLeft, 
  Loader2, 
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from "lucide-react";

interface TestCaseResult {
  test_case_id: string | null;
  input: string;
  expected_output: string;
  actual_output: string | null;
  stdout: string | null;
  error: string | null;
  passed: boolean;
  is_hidden: boolean;
  time_taken_seconds: number;
}

interface QuestionResult {
  question_id: string;
  title: string;
  points_earned: number;
  max_points: number;
  test_cases: TestCaseResult[];
}

interface ExamResult {
  exam_id: string;
  assignment_id: string;
  status: string;
  total_score: number;
  max_score: number;
  submitted_at: string | null;
  questions: QuestionResult[];
}

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.id as string;

  const [results, setResults] = useState<ExamResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  useEffect(() => {
    const loadResults = async () => {
      try {
        const data = await fetchApi(`/api/exams/${examId}/results`);
        setResults(data);
        // Expand the first question by default
        if (data.questions && data.questions.length > 0) {
          setExpandedQuestionId(data.questions[0].question_id);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load exam results.");
      } finally {
        setLoading(false);
      }
    };

    loadResults();
  }, [examId]);

  const toggleExpand = (qId: string) => {
    setExpandedQuestionId(prev => prev === qId ? null : qId);
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-slate-950">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Grading evaluation report...</p>
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-slate-950 px-4">
        <div className="w-full max-w-md glass-panel p-8 rounded-2xl glow-active text-center space-y-5">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
          <h3 className="text-xl font-bold text-white">Results Unavailable</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            {error || "Your results are not ready yet, or you don't have access to them."}
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="inline-flex items-center space-x-2 bg-slate-900 border border-slate-800 text-slate-300 font-medium text-sm rounded-xl py-3 px-6 hover:bg-slate-850 active:scale-[0.98] transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go to Dashboard</span>
          </button>
        </div>
      </div>
    );
  }

  const percentage = results.max_score > 0 
    ? Math.round((results.total_score / results.max_score) * 100) 
    : 0;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-950">
      {/* Navigation Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push("/dashboard")}
            className="inline-flex items-center space-x-2 text-slate-400 hover:text-white text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Evaluation Report</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 space-y-8">
        
        {/* Score Summary Card */}
        <div className="glass-panel rounded-3xl p-8 shadow-2xl relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-emerald-500/5 pointer-events-none" />
          
          <div className="space-y-4 text-center sm:text-left relative z-10">
            <div className="inline-flex items-center space-x-1.5 text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-900/50 px-3 py-1 rounded-full uppercase tracking-wider font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Exam Submitted Successfully</span>
            </div>
            
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-white tracking-tight">Your Performance Report</h2>
              <p className="text-xs text-slate-400">
                Submitted at: {formatDate(results.submitted_at)}
              </p>
            </div>
          </div>

          {/* Large Circle Score Badge */}
          <div className="flex items-center space-x-6 relative z-10">
            <div className="relative w-28 h-28 flex items-center justify-center rounded-full border-4 border-slate-900 bg-slate-950 shadow-inner">
              <div 
                className="absolute inset-0 rounded-full border-4 border-primary/40 border-t-primary animate-spin" 
                style={{ animationDuration: "3s" }}
              />
              <div className="text-center">
                <span className="text-3xl font-extrabold text-white">{results.total_score}</span>
                <span className="text-slate-500 text-xs block border-t border-slate-900 pt-0.5 mt-0.5">
                  / {results.max_score}
                </span>
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="text-2xl font-extrabold text-primary">{percentage}%</div>
              <div className="text-xs text-slate-400 font-medium">Accuracy Rating</div>
            </div>
          </div>
        </div>

        {/* Detailed Breakdown Title */}
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-white tracking-tight">Question Breakdown</h3>
          <p className="text-xs text-slate-400">
            Review test case results and evaluation metrics for each code problem.
          </p>
        </div>

        {/* Questions Accordion */}
        <div className="space-y-4">
          {results.questions.map((q, qIdx) => {
            const isExpanded = expandedQuestionId === q.question_id;
            const passedTcs = q.test_cases.filter(tc => tc.passed).length;
            const totalTcs = q.test_cases.length;

            return (
              <div 
                key={q.question_id}
                className="border border-slate-900 rounded-2xl bg-slate-900/10 hover:border-slate-800 transition-all duration-200 overflow-hidden"
              >
                {/* Header Row */}
                <button
                  onClick={() => toggleExpand(q.question_id)}
                  className="w-full flex items-center justify-between p-5 text-left bg-slate-950/40 hover:bg-slate-950/70 transition-all"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-850 flex items-center justify-center font-bold text-xs text-slate-400">
                      {qIdx + 1}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white leading-none mb-1">{q.title}</h4>
                      <p className="text-[11px] text-slate-500">
                        {passedTcs} of {totalTcs} test cases passed
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <span className="text-sm font-bold text-emerald-400">{q.points_earned}</span>
                      <span className="text-slate-500 text-xs"> / {q.max_points} pts</span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                </button>

                {/* Expanded Details Body */}
                {isExpanded && (
                  <div className="p-5 border-t border-slate-900 bg-slate-950/20 space-y-4">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Test Evaluation Details
                    </div>

                    <div className="space-y-3">
                      {q.test_cases.map((tc, tcIdx) => (
                        <div 
                          key={tcIdx}
                          className="p-3.5 rounded-xl border border-slate-900 bg-slate-950/40 space-y-3"
                        >
                          {/* Case Header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 text-xs">
                              {tc.passed ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-400" />
                              )}
                              <span className="font-semibold text-slate-350">
                                Test Case {tcIdx + 1} 
                                {tc.is_hidden && <span className="text-[9px] text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded ml-2 uppercase font-bold tracking-wider">Hidden</span>}
                              </span>
                            </div>

                            <span className="text-[10px] text-slate-500 font-mono">
                              {tc.time_taken_seconds}s
                            </span>
                          </div>

                          {/* Error block if failed */}
                          {tc.error && (
                            <div className="border border-red-950 bg-red-950/10 text-red-400 p-2.5 rounded-lg whitespace-pre-wrap font-mono text-[10px] leading-normal">
                              {tc.error}
                            </div>
                          )}

                          {/* Stdin logs if success */}
                          {tc.stdout && (
                            <div className="space-y-1">
                              <span className="text-[9px] font-bold uppercase text-slate-600 block">Stdout Logs</span>
                              <pre className="bg-slate-900/60 p-2 rounded-lg border border-slate-900 font-mono text-slate-400 overflow-x-auto text-[10px]">
                                {tc.stdout}
                              </pre>
                            </div>
                          )}

                          {/* Inputs / outputs comparison */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[10px]">
                            <div className="space-y-1">
                              <span className="text-[9px] font-bold uppercase text-slate-600 block">Input Parameters</span>
                              <pre className="bg-slate-900/60 p-2 rounded-lg border border-slate-900 font-mono text-slate-300 overflow-x-auto select-all">
                                {tc.input}
                              </pre>
                            </div>
                            
                            {!tc.error && (
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <span className="text-[9px] font-bold uppercase text-slate-600 block">Expected Return</span>
                                  <pre className="bg-slate-900/60 p-2 rounded-lg border border-slate-900 font-mono text-slate-300 overflow-x-auto">
                                    {tc.expected_output}
                                  </pre>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[9px] font-bold uppercase text-slate-600 block">Actual Return</span>
                                  <pre className="bg-slate-900/60 p-2 rounded-lg border border-slate-900 font-mono text-slate-300 overflow-x-auto">
                                    {tc.actual_output || "N/A"}
                                  </pre>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
