
export interface Flashcard {
  id: number;
  front: string;
  back: string;
}

export enum AppState {
  HOME = 'HOME',
  DIAGNOSTIC = 'DIAGNOSTIC',
  RESULTS = 'RESULTS',
  FLASHCARDS = 'FLASHCARDS'
}

export interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topicCategory: string;
  expectedTime: number; // in seconds
}

export interface QuestionSession {
  questionId: number;
  timeSpent: number;
  expectedTime: number;
  isCorrect: boolean;
}

export interface TestResult {
  topic: string;
  score: number;
  totalQuestions: number;
  timeTaken: number; // in seconds
  reattempts: number;
  topicErrors: string[];
  consistencyScore: number;
  difficultyMetrics: {
    easyCorrect: number;
    mediumCorrect: number;
    hardCorrect: number;
  };
  questionSessions: QuestionSession[];
}

export interface MLPrediction {
  level: DifficultyLevel;
  reason: string;
}

export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export interface AIInsights {
  masteryPrediction: number; // 0-100
  suggestedFocus: string;
  topicComplexity: 'Low' | 'Medium' | 'High';
  estimatedLearningTime: string;
}
