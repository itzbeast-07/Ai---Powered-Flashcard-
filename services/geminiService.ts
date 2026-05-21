
import { GoogleGenAI, Type } from "@google/genai";
import { Flashcard, DifficultyLevel, AIInsights, Question } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateDiagnosticQuestions(topic: string): Promise<Question[]> {
  const prompt = `Generate a set of 5 diverse multiple-choice diagnostic questions for the topic "${topic}".
  The questions should range from Beginner to Intermediate difficulty levels.
  Each question must have:
  - id: unique number
  - question: the question text
  - options: exactly 4 choices
  - correctAnswer: index of the correct option (0-3)
  - explanation: brief explanation of why it is correct
  - difficulty: either 'Easy', 'Medium', or 'Hard'
  - topicCategory: a specific sub-topic name
  - expectedTime: estimated time in seconds to solve (e.g. 20, 30, 45)
  Return ONLY a valid JSON array matching this schema.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.INTEGER },
            question: { type: Type.STRING },
            options: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            correctAnswer: { type: Type.INTEGER },
            explanation: { type: Type.STRING },
            difficulty: { 
              type: Type.STRING,
              enum: ['Easy', 'Medium', 'Hard']
            },
            topicCategory: { type: Type.STRING },
            expectedTime: { type: Type.INTEGER }
          },
          required: ["id", "question", "options", "correctAnswer", "explanation", "difficulty", "topicCategory", "expectedTime"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Failed to parse diagnostic questions:", e);
    throw new Error("Invalid question format from AI");
  }
}

export async function generateFlashcards(topic: string, difficulty: DifficultyLevel): Promise<Flashcard[]> {
  const prompt = `Generate 10 high-quality learning flashcards about "${topic}". The difficulty level should be "${difficulty}". Provide concise, clear front and back content for active recall. Ensure the content covers a broad range of key concepts related to the topic at the specified difficulty.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.INTEGER },
            front: { type: Type.STRING },
            back: { type: Type.STRING }
          },
          required: ["id", "front", "back"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Failed to parse flashcards:", e);
    throw new Error("Invalid response format from AI");
  }
}

export async function generateStudyInsights(topic: string, difficulty: DifficultyLevel): Promise<AIInsights> {
  const prompt = `Act as a specialized Machine Learning Prediction model for education. Analyze the topic "${topic}" at level "${difficulty}". 
  Predict the following:
  1. Mastery Prediction (0-100 score of how quickly an average learner masters this).
  2. Suggested Focus Area (A specific technical sub-topic to prioritize).
  3. Topic Complexity (Low, Medium, High).
  4. Estimated Learning Time to reach basic proficiency.
  Return ONLY a JSON object matching the schema.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          masteryPrediction: { type: Type.NUMBER },
          suggestedFocus: { type: Type.STRING },
          topicComplexity: { 
            type: Type.STRING,
            enum: ['Low', 'Medium', 'High']
          },
          estimatedLearningTime: { type: Type.STRING }
        },
        required: ["masteryPrediction", "suggestedFocus", "topicComplexity", "estimatedLearningTime"]
      }
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse insights:", e);
    throw new Error("Invalid insights format from AI");
  }
}
