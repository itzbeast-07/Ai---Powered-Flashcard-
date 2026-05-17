
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Brain, Timer, CheckCircle, Target, TrendingUp, RefreshCw } from 'lucide-react';
import { Layout } from './components/Layout';
import { AppState, Flashcard, DifficultyLevel, Question, TestResult, MLPrediction, QuestionSession } from './types';
import { generateFlashcards, generateDiagnosticQuestions } from './services/geminiService';
import { FlashcardItem } from './components/FlashcardItem';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.HOME);
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  
  // Diagnostic State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [reattempts, setReattempts] = useState(0);
  const [questionSessions, setQuestionSessions] = useState<QuestionSession[]>([]);
  const [timePerQuestion, setTimePerQuestion] = useState<number[]>([]);
  const totalStartTime = useRef<number>(0);
  const questionStartTime = useRef<number>(0);
  
  // Evaluation State
  const [testStats, setTestStats] = useState<TestResult | null>(null);
  const [mlResult, setMlResult] = useState<MLPrediction | null>(null);
  
  // Final Flashcards
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);

  const startDiagnostic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setLoading(true);
    setLoadingMsg(`AI is preparing a diagnostic test for "${topic}"...`);
    try {
      const generatedQuestions = await generateDiagnosticQuestions(topic);
      setQuestions(generatedQuestions);
      setAppState(AppState.DIAGNOSTIC);
      setCurrentQuestionIdx(0);
      setAnswers([]);
      setReattempts(0);
      setQuestionSessions([]);
      setTimePerQuestion([]);
      totalStartTime.current = Date.now();
      questionStartTime.current = Date.now();
    } catch (err) {
      console.error(err);
      alert("Failed to generate test. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (optionIdx: number) => {
    const newAnswers = [...answers];
    if (newAnswers[currentQuestionIdx] !== undefined) {
      setReattempts(prev => prev + 1);
    }
    newAnswers[currentQuestionIdx] = optionIdx;
    setAnswers(newAnswers);
  };

  const nextQuestion = () => {
    const timeSpentOnCurrent = (Date.now() - questionStartTime.current) / 1000;
    const currentQuestion = questions[currentQuestionIdx];
    
    const session: QuestionSession = {
      questionId: currentQuestion.id,
      timeSpent: timeSpentOnCurrent,
      expectedTime: currentQuestion.expectedTime || 30, // Fallback if AI missed it
      isCorrect: answers[currentQuestionIdx] === currentQuestion.correctAnswer
    };

    const updatedSessions = [...questionSessions, session];
    setQuestionSessions(updatedSessions);
    
    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
      questionStartTime.current = Date.now();
      // Temporary storage in state or local ref if needed, but we'll collect all at end
      setTimePerQuestion(prev => [...prev, timeSpentOnCurrent]);
    } else {
      submitTest([...timePerQuestion, timeSpentOnCurrent], updatedSessions);
    }
  };

  const submitTest = async (finalTimePerQuestion: number[], finalSessions: QuestionSession[]) => {
    setLoading(true);
    setLoadingMsg("Deep Learning model is evaluating your performance profile...");
    
    const timeTaken = (Date.now() - totalStartTime.current) / 1000;
    
    let score = 0;
    const topicErrors: string[] = [];
    const difficultyMetrics = { easyCorrect: 0, mediumCorrect: 0, hardCorrect: 0 };
    
    questions.forEach((q, idx) => {
      if (answers[idx] === q.correctAnswer) {
        score++;
        if (q.difficulty === 'Easy') difficultyMetrics.easyCorrect++;
        if (q.difficulty === 'Medium') difficultyMetrics.mediumCorrect++;
        if (q.difficulty === 'Hard') difficultyMetrics.hardCorrect++;
      } else {
        topicErrors.push(q.topicCategory);
      }
    });

    const performanceData: TestResult = {
      topic,
      score,
      totalQuestions: questions.length,
      timeTaken,
      reattempts,
      topicErrors: Array.from(new Set(topicErrors)),
      consistencyScore: score / questions.length,
      difficultyMetrics,
      questionSessions: finalSessions
    };

    setTestStats(performanceData);

    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(performanceData)
      });
      const prediction: MLPrediction = await response.json();
      setMlResult(prediction);
      setAppState(AppState.RESULTS);
    } catch (err) {
      console.error(err);
      const scorePercentage = (score / questions.length) * 100;
      let level: DifficultyLevel = 'Beginner';
      if (scorePercentage >= 80) level = 'Advanced';
      else if (scorePercentage >= 50) level = 'Intermediate';

      setMlResult({ 
        level, 
        reason: `Local analysis applied. You scored ${scorePercentage.toFixed(0)}%. ${scorePercentage < 50 ? "Focusing on fundamentals first." : "Continuing to build on your knowledge."}` 
      });
      setAppState(AppState.RESULTS);
    } finally {
      setLoading(false);
    }
  };

  const generateAIPath = async () => {
    if (!mlResult) return;
    setLoading(true);
    setLoadingMsg(`Gemini is synthesizing ${mlResult.level} level cognitive flashcards...`);
    try {
      const cards = await generateFlashcards(topic, mlResult.level);
      setFlashcards(cards);
      setAppState(AppState.FLASHCARDS);
    } catch (err) {
      console.error(err);
      alert("Flashcard generation failed.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setAppState(AppState.HOME);
    setTopic('');
    setQuestions([]);
    setFlashcards([]);
    setMlResult(null);
    setTestStats(null);
    setQuestionSessions([]);
    setTimePerQuestion([]);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    if (m > 0) return `${m} m ${s} sec`;
    return `${s} sec`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const actual = payload[0].value;
      const expected = payload[1].value;
      const diff = actual - expected;
      const diffColor = diff > 0 ? 'text-red-500' : 'text-green-500';
      
      return (
        <div className="bg-white p-4 rounded-2xl shadow-2xl border border-slate-100">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-700">Actual: <span className="font-black">{actual}s</span></p>
            <p className="text-sm font-bold text-slate-500">Expected: <span className="font-black">{expected}s</span></p>
            <div className="h-px bg-slate-100 my-2" />
            <p className={`text-xs font-black uppercase ${diffColor}`}>
              {diff > 0 ? `+${diff.toFixed(1)}s slower` : `${Math.abs(diff).toFixed(1)}s faster`}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const scoreData = useMemo(() => {
    if (!testStats) return [];
    return [
      { name: 'Correct', value: testStats.score },
      { name: 'Incorrect', value: testStats.totalQuestions - testStats.score }
    ];
  }, [testStats]);

  const timeData = useMemo(() => {
    if (!testStats) return [];
    return testStats.questionSessions.map((s, i) => {
      let color = '#22c55e'; // Green
      if (s.timeSpent > s.expectedTime * 1.5) {
        color = '#ef4444'; // Red
      } else if (s.timeSpent > s.expectedTime) {
        color = '#f59e0b'; // Orange
      }
      
      return {
        name: `Q${i + 1}`,
        Actual: Math.round(s.timeSpent),
        Expected: s.expectedTime,
        color
      };
    });
  }, [testStats]);

  const COLORS = ['#0ea5e9', '#cbd5e1'];

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
          <motion.div 
            animate={{ rotate: 360 }} 
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }} 
            className="w-24 h-24 border-t-4 border-sky-500 rounded-full mb-10 shadow-lg shadow-sky-100" 
          />
          <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tighter">Processing...</h2>
          <p className="text-slate-400 font-mono text-sm uppercase tracking-widest">{loadingMsg}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <AnimatePresence mode="wait">
        {appState === AppState.HOME && (
          <motion.div key="home" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center min-h-[70vh] text-center max-w-3xl mx-auto py-12 px-6">
            <div className="inline-block px-4 py-1.5 mb-6 rounded-full bg-sky-50 border border-sky-100 text-sky-600 text-xs font-black uppercase tracking-widest">
              Advanced Tutor
            </div>
            <h1 className="text-7xl font-black text-slate-900 mb-8 leading-[0.95] tracking-tighter">
              Level up your learning <br /> <span className="text-sky-500 underline decoration-sky-200 underline-offset-8">with Intelligence.</span>
            </h1>
            <p className="text-xl text-slate-500 mb-12 max-w-xl mx-auto leading-relaxed">
              Experience a diagnostic learning path that adapts to your unique performance. We generate tests, evaluate with ML, and study with AI.
            </p>
            <form onSubmit={startDiagnostic} className="w-full relative group">
              <div className="absolute -inset-2 bg-sky-500/10 blur-2xl rounded-[3rem] opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="What topic makes you curious?"
                className="w-full px-10 py-7 bg-white border-2 border-slate-100 rounded-full shadow-2xl text-2xl font-bold focus:border-sky-500 focus:ring-8 focus:ring-sky-50 outline-none transition-all pr-52 relative z-10"
                required
              />
              <button 
                type="submit" 
                className="absolute right-4 top-4 bottom-4 px-10 bg-sky-500 text-white font-black rounded-full hover:bg-slate-900 transition-all shadow-lg hover:shadow-sky-200 uppercase tracking-widest text-sm z-20"
              >
                Start Learning
              </button>
            </form>
          </motion.div>
        )}

        {appState === AppState.DIAGNOSTIC && questions[currentQuestionIdx] && (
          <motion.div key="diagnostic" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center justify-between px-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-sky-100 text-sky-600 rounded-lg">
                  <Brain className="w-5 h-5" />
                </div>
                <span className="text-sm font-black text-slate-900 uppercase tracking-widest">Question {currentQuestionIdx + 1} of {questions.length}</span>
              </div>
              <div className="flex gap-2">
                {questions.map((_, i) => (
                  <div key={i} className={`h-2 w-12 rounded-full transition-all duration-500 ${i <= currentQuestionIdx ? 'bg-sky-500' : 'bg-slate-200'}`} />
                ))}
              </div>
            </div>
            <div className="bg-white p-14 rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] space-y-12 border border-slate-50 relative overflow-hidden">
              <div className="absolute top-8 right-8 flex items-center gap-2 text-slate-300 font-mono text-xs">
                <Timer className="w-4 h-4" /> Expected: {questions[currentQuestionIdx].expectedTime}s
              </div>
              <h2 className="text-4xl font-black text-slate-900 leading-tight tracking-tight">{questions[currentQuestionIdx].question}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {questions[currentQuestionIdx].options.map((option, i) => (
                  <button
                    key={i}
                    onClick={() => handleAnswerSelect(i)}
                    className={`p-8 rounded-[2rem] text-left font-bold transition-all border-4 relative overflow-hidden group/opt ${
                      answers[currentQuestionIdx] === i 
                        ? 'bg-sky-50 border-sky-500 text-sky-900 shadow-xl scale-[1.02]' 
                        : 'bg-white border-slate-50 text-slate-600 hover:border-sky-200'
                    }`}
                  >
                    <div className={`absolute top-0 left-0 w-2 h-full transition-colors ${answers[currentQuestionIdx] === i ? 'bg-sky-500' : 'bg-transparent'}`} />
                    <span className={`inline-block w-10 h-10 rounded-xl mb-4 text-center leading-[2.5rem] text-sm transition-colors ${answers[currentQuestionIdx] === i ? 'bg-sky-500 text-white' : 'bg-slate-50 text-slate-400'}`}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <div className="text-lg leading-snug">{option}</div>
                  </button>
                ))}
              </div>
              <div className="flex justify-end pt-4">
                <button
                  disabled={answers[currentQuestionIdx] === undefined}
                  onClick={nextQuestion}
                  className="px-14 py-6 bg-slate-900 text-white font-extrabold rounded-2xl hover:bg-sky-500 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-xl flex items-center gap-3 uppercase tracking-widest text-sm"
                >
                  {currentQuestionIdx === questions.length - 1 ? 'Analyze Performance' : 'Next Step'}
                  <TrendingUp className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {appState === AppState.RESULTS && mlResult && testStats && (
          <motion.div key="results" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-6xl mx-auto space-y-10 py-10">
            <div className="text-center space-y-4">
              <motion.div 
                initial={{ scale: 0 }} 
                animate={{ scale: 1 }} 
                className="w-20 h-20 bg-sky-500 rounded-3xl mx-auto flex items-center justify-center text-white shadow-2xl mb-6 shadow-sky-200"
              >
                <CheckCircle className="w-10 h-10" />
              </motion.div>
              <h2 className="text-5xl font-black text-slate-900 uppercase tracking-tighter">Cognitive Profile Ready</h2>
              <p className="text-slate-400 font-medium max-w-lg mx-auto">Our Machine Learning Decision Tree has analyzed your diagnostic vectors.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4 bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-sky-500/20 blur-3xl rounded-full" />
                <div className="text-[10px] font-black text-sky-400 uppercase tracking-[0.2em] mb-12 flex items-center gap-2">
                  <Target className="w-4 h-4" /> ML Classifier
                </div>
                <div className="space-y-2 mb-12">
                  <div className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Classified Level</div>
                  <h3 className="text-5xl font-black tracking-tighter text-sky-400">{mlResult.level}</h3>
                </div>
                <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                  <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Engine Reasoning</div>
                  <p className="text-xs text-slate-300 font-medium leading-relaxed italic">"{mlResult.reason}"</p>
                </div>
                <button onClick={generateAIPath} className="w-full mt-12 py-5 bg-sky-500 text-white font-black rounded-2xl hover:bg-white hover:text-slate-900 transition-all shadow-lg flex items-center justify-center gap-2 uppercase tracking-widest text-xs">
                  Generate Flashcards<TrendingUp className="w-4 h-4" />
                </button>
              </div>

              <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Accuracy Distribution</h4>
                  <div className="w-full h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={scoreData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                          {scoreData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                        <Legend verticalAlign="bottom" height={36}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 text-center">
                    <div className="text-3xl font-black text-slate-900">{testStats.score}/{testStats.totalQuestions}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Correct Response Score</div>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 text-center">Time Efficiency (Actual vs Expected)</h4>
                  <div className="w-full flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={timeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} 
                        />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                        <Bar dataKey="Actual" radius={[4, 4, 0, 0]}>
                           {timeData.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={entry.color} />
                           ))}
                        </Bar>
                        <Bar dataKey="Expected" fill="#cbd5e1" radius={[4, 4, 0, 0]} opacity={0.3} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 flex justify-between items-end">
                    <div>
                      <div className="text-2xl font-black text-slate-900">{formatTime(testStats.timeTaken)}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Duration</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-black text-sky-500">{testStats.reattempts}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hesitation Index</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-sky-500/5 p-12 rounded-[3.5rem] border border-sky-100 flex flex-col md:flex-row items-center justify-between gap-10">
              <div className="text-center md:text-left space-y-4">
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Consistency Profile: {Math.round(testStats.consistencyScore * 100)}%</h3>
                <p className="text-slate-500 font-medium max-w-md italic">The model detected your cognitive state is highly aligned with {mlResult.level} expectations.</p>
              </div>
              <button 
                onClick={reset}
                className="group flex items-center gap-3 px-12 py-5 bg-white border-2 border-slate-200 text-slate-600 font-black rounded-[2rem] hover:border-sky-500 hover:text-sky-500 transition-all shadow-xl"
              >
                <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                Retest System
              </button>
            </div>
          </motion.div>
        )}

        {appState === AppState.FLASHCARDS && (
          <motion.div key="flashcards" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12 py-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-sky-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-sky-100">
                  <Target className="w-3 h-3" /> {mlResult?.level} Synthesis
                </div>
                <h2 className="text-6xl font-black text-slate-900 tracking-tighter leading-tight">Optimized Mastery Deck</h2>
                <p className="text-slate-400 font-medium italic text-lg">Curated intelligence for <span className="text-slate-900 font-bold not-italic">"{topic}"</span></p>
              </div>
              <button 
                onClick={reset} 
                className="flex items-center gap-3 px-10 py-5 bg-slate-900 text-white font-black rounded-[2rem] hover:bg-sky-500 transition-all shadow-2xl hover:shadow-sky-100 uppercase tracking-widest text-xs"
              >
                New Subject 
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {flashcards.map((card, idx) => (
                <motion.div key={card.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
                  <FlashcardItem card={card} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
};

export default App;
