"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Editor from "@monaco-editor/react";
import { fetchApi } from "../../../utils/api";
import { 
  Play, 
  Send, 
  Clock, 
  Save, 
  Terminal, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Loader2, 
  ArrowLeft,
  ChevronRight,
  Code
} from "lucide-react";

interface TestCase {
  id: string;
  input: string;
  expected_output: string;
}

interface Question {
  id: string;
  title: string;
  description: string;
  constraints: string | null;
  entry_point: string;
  difficulty: string;
  points: number;
  test_cases: TestCase[];
  saved_code: string | null;
}

interface ExamDetails {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  status: string;
  started_at: string;
  time_remaining_seconds: number;
  questions: Question[];
}

interface TestCaseResult {
  test_case_id: string | null;
  input: string;
  expected_output: string;
  actual_output: string | null;
  stdout: string | null;
  error: string | null;
  passed: boolean;
  time_taken_seconds: number;
}

export default function ExamWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.id as string;

  const [exam, setExam] = useState<ExamDetails | null>(null);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState<"saved" | "saving" | "error">("saved");
  
  // Execution states
  const [runningCode, setRunningCode] = useState(false);
  const [runResults, setRunResults] = useState<TestCaseResult[] | null>(null);
  const [runSummary, setRunSummary] = useState<string | null>(null);
  const [consoleTab, setConsoleTab] = useState<"results" | "stdout">("results");
  const [activeTestResultIndex, setActiveTestResultIndex] = useState(0);
  
  // Submit state
  const [submitting, setSubmitting] = useState(false);

  // Ref to prevent double saving or closing warnings
  const autosaveInterval = useRef<NodeJS.Timeout | null>(null);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);
  
  // Load exam details
  useEffect(() => {
    const loadExam = async () => {
      try {
        const data: ExamDetails = await fetchApi(`/api/exams/${examId}`);
        setExam(data);
        setTimeRemaining(data.time_remaining_seconds);
        
        // Populate initial code values
        const initialCodes: Record<string, string> = {};
        data.questions.forEach((q) => {
          // If student already has a saved snapshot, use it.
          // Otherwise, generate a clean starter template.
          initialCodes[q.id] = q.saved_code || generateStarterCode(q.entry_point);
        });
        setCodes(initialCodes);
      } catch (err: any) {
        setError(err.message || "Failed to load exam workspace.");
      } finally {
        setLoading(false);
      }
    };

    loadExam();

    // Prevent accidental window close
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Are you sure you want to leave? Your exam progress is autosaved, but you should submit it before exiting.";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (autosaveInterval.current) clearInterval(autosaveInterval.current);
      if (timerInterval.current) clearInterval(timerInterval.current);
    };
  }, [examId]);

  // Generate Python function template
  const generateStarterCode = (entryPoint: string): string => {
    // Basic argument guessing or general template
    if (entryPoint === "two_sum") {
      return "def two_sum(nums: list[int], target: int) -> list[int]:\n    # Write your code here\n    pass\n";
    } else if (entryPoint === "is_valid") {
      return "def is_valid(s: str) -> bool:\n    # Write your code here\n    pass\n";
    }
    return `def ${entryPoint}():\n    # Write your code here\n    pass\n`;
  };

  // Timer Countdown logic
  useEffect(() => {
    if (loading || error || !exam || timeRemaining <= 0) return;

    timerInterval.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerInterval.current!);
          // Trigger auto-submit when timer expires!
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerInterval.current) clearInterval(timerInterval.current);
    };
  }, [loading, error, exam]);

  // Autosave every 30 seconds
  useEffect(() => {
    if (loading || error || !exam) return;

    autosaveInterval.current = setInterval(() => {
      saveAllSnapshots();
    }, 30000);

    return () => {
      if (autosaveInterval.current) clearInterval(autosaveInterval.current);
    };
  }, [loading, error, exam, codes]);

  const saveAllSnapshots = async () => {
    if (!exam) return;
    setSavingStatus("saving");
    try {
      // Autosave each question code
      const promises = Object.entries(codes).map(([qId, code]) => {
        return fetchApi(`/api/exams/${exam.id}/snapshot`, {
          method: "POST",
          body: JSON.stringify({ question_id: qId, code }),
        });
      });
      await Promise.all(promises);
      setSavingStatus("saved");
    } catch (err) {
      console.error("Autosave failed:", err);
      setSavingStatus("error");
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    if (!exam || value === undefined) return;
    const activeQId = exam.questions[activeQuestionIndex].id;
    setCodes((prev) => ({
      ...prev,
      [activeQId]: value,
    }));
  };

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    const hStr = hrs > 0 ? `${hrs.toString().padStart(2, "0")}:` : "";
    const mStr = mins.toString().padStart(2, "0");
    const sStr = secs.toString().padStart(2, "0");
    
    return `${hStr}${mStr}:${sStr}`;
  };

  // Run visible test cases
  const handleRunCode = async () => {
    if (!exam || runningCode) return;
    const activeQ = exam.questions[activeQuestionIndex];
    const code = codes[activeQ.id];

    setRunningCode(true);
    setRunResults(null);
    setConsoleTab("results");
    
    try {
      const response = await fetchApi("/api/run", {
        method: "POST",
        body: JSON.stringify({
          question_id: activeQ.id,
          code,
        }),
      });
      setRunResults(response.results);
      setRunSummary(response.summary);
      setActiveTestResultIndex(0);
    } catch (err: any) {
      alert(err.message || "Failed to execute tests.");
    } finally {
      setRunningCode(false);
    }
  };

  // Submit Exam
  const handleSubmitExam = async (force: boolean = false) => {
    if (!exam || submitting) return;
    
    if (!force) {
      const confirmSubmit = window.confirm(
        "Are you sure you want to submit your exam? This action is final and will lock your assessment."
      );
      if (!confirmSubmit) return;
    }

    setSubmitting(true);
    try {
      // 1. Force save snapshots first
      await saveAllSnapshots();
      
      // 2. Submit exam to run all tests and grade
      await fetchApi(`/api/exams/${exam.id}/submit`, { method: "POST" });
      
      // Redirect to results
      router.push(`/results/${exam.id}`);
    } catch (err: any) {
      alert(err.message || "Failed to submit exam.");
      setSubmitting(false);
    }
  };

  const handleAutoSubmit = () => {
    console.log("Timer expired. Triggering auto-submit.");
    handleSubmitExam(true);
  };

  const activeQuestion = exam?.questions[activeQuestionIndex];
  const activeCode = activeQuestion ? codes[activeQuestion.id] || "" : "";

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-slate-950">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Entering Exam Workspace...</p>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-slate-950 px-4">
        <div className="w-full max-w-md glass-panel p-8 rounded-2xl glow-active text-center space-y-5">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
          <h3 className="text-xl font-bold text-white font-sans">Exam Room Error</h3>
          <p className="text-sm text-slate-400 leading-relaxed">{error || "Could not retrieve exam details."}</p>
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

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-950">
      {/* Workspace Header */}
      <header className="border-b border-slate-900 bg-slate-950 py-3 px-6 flex items-center justify-between z-40">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => {
              if (window.confirm("Do you want to return to the dashboard? Your exam timer will continue running.")) {
                router.push("/dashboard");
              }
            }}
            className="p-2 text-slate-400 hover:text-white rounded-lg border border-slate-900 hover:border-slate-800 bg-slate-950/50 hover:bg-slate-900 transition-all duration-200"
            title="Leave room (Timer runs)"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          
          <div>
            <h1 className="text-md font-bold text-white tracking-tight">{exam.title}</h1>
            <div className="flex items-center space-x-2 text-[10px] text-slate-500 mt-0.5">
              <span>Python assessment</span>
              <span className="w-1 h-1 rounded-full bg-slate-700" />
              <span>{exam.questions.length} questions</span>
            </div>
          </div>
        </div>

        {/* Question Selector Tabs in Header */}
        <div className="flex items-center space-x-1.5 bg-slate-900/40 border border-slate-900 p-1 rounded-xl">
          {exam.questions.map((q, idx) => (
            <button
              key={q.id}
              onClick={() => {
                setActiveQuestionIndex(idx);
                setRunResults(null);
                setRunSummary(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide flex items-center space-x-1.5 transition-all duration-200 ${
                activeQuestionIndex === idx
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Q{idx + 1}</span>
            </button>
          ))}
        </div>

        {/* Status Indicators, Timer and Submit */}
        <div className="flex items-center space-x-6">
          {/* Autosave Status */}
          <div className="flex items-center space-x-1.5 text-xs text-slate-500">
            {savingStatus === "saving" && (
              <>
                <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                <span>Saving...</span>
              </>
            )}
            {savingStatus === "saved" && (
              <>
                <Save className="w-3.5 h-3.5 text-slate-500" />
                <span>Saved</span>
              </>
            )}
            {savingStatus === "error" && (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span className="text-red-400">Save Error</span>
              </>
            )}
          </div>

          {/* Countdown Clock */}
          <div className={`flex items-center space-x-2 border rounded-xl px-3.5 py-1.5 bg-slate-900/40 text-sm font-bold tracking-wider ${
            timeRemaining <= 300 
              ? "text-red-400 border-red-950 bg-red-950/10 glow-active animate-pulse" 
              : "text-amber-400 border-slate-850"
          }`}>
            <Clock className="w-4 h-4" />
            <span>{formatTime(timeRemaining)}</span>
          </div>

          {/* Submit Button */}
          <button
            onClick={() => handleSubmitExam(false)}
            disabled={submitting}
            className="inline-flex items-center space-x-2 bg-primary hover:bg-primary/95 text-white font-medium text-xs rounded-xl py-2 px-4 shadow-md shadow-primary/20 hover:shadow-primary/30 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <span>Submit Exam</span>
                <Send className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Workspace Split Panels */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Question Description Panel (40%) */}
        <div className="w-[40%] border-r border-slate-900 flex flex-col bg-slate-950 overflow-y-auto">
          {activeQuestion && (
            <div className="p-6 space-y-6">
              {/* Question Meta Row */}
              <div className="flex items-center justify-between border-b border-slate-900 pb-4">
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    {activeQuestionIndex + 1}. {activeQuestion.title}
                  </h2>
                  <div className="flex items-center space-x-3 text-xs">
                    <span className={`font-semibold capitalize px-2 py-0.5 rounded-md text-[10px] ${
                      activeQuestion.difficulty === "easy"
                        ? "bg-emerald-950/40 text-emerald-400 border border-emerald-900/40"
                        : activeQuestion.difficulty === "medium"
                        ? "bg-amber-950/40 text-amber-400 border border-amber-900/40"
                        : "bg-red-950/40 text-red-400 border border-red-900/40"
                    }`}>
                      {activeQuestion.difficulty}
                    </span>
                    <span className="text-slate-500 font-medium">
                      Points: {activeQuestion.points}
                    </span>
                  </div>
                </div>
              </div>

              {/* Question Markdown Description */}
              <div className="text-slate-300 text-sm leading-relaxed space-y-4 whitespace-pre-wrap font-sans">
                {activeQuestion.description}
              </div>

              {/* Constraints Section */}
              {activeQuestion.constraints && (
                <div className="space-y-2 border-t border-slate-900 pt-5">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Constraints</h3>
                  <div className="text-slate-400 text-xs leading-relaxed whitespace-pre-wrap bg-slate-900/20 p-3 rounded-lg border border-slate-900">
                    {activeQuestion.constraints}
                  </div>
                </div>
              )}

              {/* Visible Sample Cases */}
              <div className="space-y-4 border-t border-slate-900 pt-5">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sample Test Cases</h3>
                <div className="space-y-4">
                  {activeQuestion.test_cases.map((tc, index) => (
                    <div key={tc.id} className="space-y-2">
                      <div className="text-xs font-semibold text-slate-300">Case {index + 1}</div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-slate-500">Input</span>
                          <pre className="bg-slate-900/70 border border-slate-900 p-2.5 rounded-lg overflow-x-auto text-slate-300 font-mono text-[11px] leading-normal">
                            {tc.input}
                          </pre>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-slate-500">Expected Output</span>
                          <pre className="bg-slate-900/70 border border-slate-900 p-2.5 rounded-lg overflow-x-auto text-slate-300 font-mono text-[11px] leading-normal">
                            {tc.expected_output}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Monaco Editor (Top) & Terminal Console (Bottom) (60%) */}
        <div className="w-[60%] flex flex-col bg-slate-950 overflow-hidden">
          {/* Editor Container (70%) */}
          <div className="h-[65%] border-b border-slate-900 flex flex-col relative">
            <div className="bg-slate-950 py-2.5 px-4 border-b border-slate-900/60 flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span className="flex items-center space-x-1.5 text-primary">
                <Code className="w-3.5 h-3.5" />
                <span>Python Compiler (3.12)</span>
              </span>
              <span className="text-[10px] text-slate-500">Auto-saves every 30s</span>
            </div>

            <div className="flex-1 bg-[#1e1e1e]">
              {activeQuestion && (
                <Editor
                  height="100%"
                  language="python"
                  theme="vs-dark"
                  value={activeCode}
                  onChange={handleEditorChange}
                  options={{
                    fontSize: 13,
                    fontFamily: "var(--font-geist-mono), Courier New, monospace",
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    lineNumbers: "on",
                    glyphMargin: false,
                    folding: true,
                    wordWrap: "on",
                    padding: { top: 10, bottom: 10 }
                  }}
                />
              )}
            </div>
          </div>

          {/* Console Output Panel (35%) */}
          <div className="h-[35%] flex flex-col bg-slate-950">
            {/* Console Control Row */}
            <div className="border-b border-slate-900 px-4 py-2 flex items-center justify-between bg-slate-950/60 text-xs">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setConsoleTab("results")}
                  className={`px-3 py-1.5 rounded-lg font-semibold flex items-center space-x-1.5 ${
                    consoleTab === "results"
                      ? "bg-slate-900 text-white border border-slate-850"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Test Results</span>
                </button>
              </div>

              <button
                onClick={handleRunCode}
                disabled={runningCode}
                className="inline-flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-850 text-slate-200 font-semibold border border-slate-800 rounded-xl px-4 py-1.5 hover:text-white transition-all disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]"
              >
                {runningCode ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Running...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 fill-current" />
                    <span>Run Code</span>
                  </>
                )}
              </button>
            </div>

            {/* Console Content Window */}
            <div className="flex-1 p-4 overflow-y-auto font-mono text-xs">
              {runningCode && (
                <div className="h-full flex flex-col justify-center items-center text-slate-500 space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span>Executing tests in a secure sandbox...</span>
                </div>
              )}

              {!runningCode && !runResults && (
                <div className="h-full flex items-center justify-center text-slate-500 italic text-center text-xs">
                  <span>Write your code above and click "Run Code" to evaluate it against visible test cases.</span>
                </div>
              )}

              {!runningCode && runResults && (
                <div className="space-y-4">
                  {/* Summary Bar */}
                  <div className="flex items-center justify-between bg-slate-900/50 border border-slate-900 p-2.5 rounded-xl">
                    <span className="font-semibold text-slate-300">Run Summary</span>
                    <span className={`font-bold ${runSummary?.includes("0/") ? "text-red-400" : "text-emerald-400"}`}>
                      {runSummary}
                    </span>
                  </div>

                  {/* Case detail splits */}
                  <div className="flex space-x-3 items-stretch h-[120px]">
                    {/* Left case tabs */}
                    <div className="w-[120px] flex flex-col space-y-1 overflow-y-auto border-r border-slate-900 pr-3">
                      {runResults.map((res, index) => (
                        <button
                          key={index}
                          onClick={() => setActiveTestResultIndex(index)}
                          className={`px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold flex items-center space-x-1.5 transition-all ${
                            activeTestResultIndex === index
                              ? "bg-slate-900 text-white border border-slate-850"
                              : "text-slate-500 hover:text-slate-400 hover:bg-slate-900/20"
                          }`}
                        >
                          {res.passed ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                          )}
                          <span className="truncate">Case {index + 1}</span>
                        </button>
                      ))}
                    </div>

                    {/* Right active case details */}
                    {runResults[activeTestResultIndex] && (
                      <div className="flex-1 overflow-y-auto space-y-3 pl-1 text-[11px] leading-normal text-slate-400">
                        {/* Error logging */}
                        {runResults[activeTestResultIndex].error && (
                          <div className="border border-red-950 bg-red-950/10 text-red-400 p-2.5 rounded-lg whitespace-pre-wrap font-mono text-[10px]">
                            {runResults[activeTestResultIndex].error}
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase text-slate-600 block">Input</span>
                            <pre className="bg-slate-900/60 p-2 rounded-lg border border-slate-900 font-mono text-slate-300 overflow-x-auto">
                              {runResults[activeTestResultIndex].input}
                            </pre>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase text-slate-600 block">Expected</span>
                            <pre className="bg-slate-900/60 p-2 rounded-lg border border-slate-900 font-mono text-slate-300 overflow-x-auto">
                              {runResults[activeTestResultIndex].expected_output}
                            </pre>
                          </div>
                        </div>

                        {!runResults[activeTestResultIndex].error && (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold uppercase text-slate-600 block">Actual</span>
                              <pre className="bg-slate-900/60 p-2 rounded-lg border border-slate-900 font-mono text-slate-300 overflow-x-auto">
                                {runResults[activeTestResultIndex].actual_output || "No output"}
                              </pre>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold uppercase text-slate-600 block">Performance</span>
                              <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-900 font-mono text-slate-300">
                                Time taken: {runResults[activeTestResultIndex].time_taken_seconds} seconds
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Stdout capture logs */}
                        {runResults[activeTestResultIndex].stdout && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase text-slate-600 block">Stdout logs</span>
                            <pre className="bg-slate-900/60 p-2 rounded-lg border border-slate-900 font-mono text-slate-400 overflow-x-auto whitespace-pre-wrap">
                              {runResults[activeTestResultIndex].stdout}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
