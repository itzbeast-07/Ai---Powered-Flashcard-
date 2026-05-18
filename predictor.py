import sys
import json
import os

def predict():
    try:
        # Read performance data from stdin
        input_data = json.load(sys.stdin)
        
        # Features mapping
        # App features: score, total, time, reattempts, topicErrors, consistency, difficultyMetrics
        
        # We need a fallback if model file doesn't exist yet
        model_path = 'decision_tree_model.pkl'
        
        # Normalize score to percentage (0-100) to match ML training data conventions
        raw_score = input_data.get('score', 0)
        total_questions = input_data.get('totalQuestions', 1)
        score_percentage = (raw_score / max(1, total_questions)) * 100
        
        # Determine prediction first using heuristic
        if score_percentage >= 80:
            prediction = "Advanced"
        elif score_percentage >= 50:
            prediction = "Intermediate"
        else:
            prediction = "Beginner"

        # Try to use the model if libraries and file exist
        try:
            if os.path.exists(model_path):
                import joblib
                import pandas as pd
                
                features = pd.DataFrame([{
                    'score': score_percentage,
                    'time_taken': input_data.get('timeTaken', 0),
                    'reattempts': input_data.get('reattempts', 0),
                    'topic_errors_count': len(input_data.get('topicErrors', [])),
                    'avg_difficulty_correct': (
                        (input_data['difficultyMetrics'].get('hardCorrect', 0) * 3) + 
                        (input_data['difficultyMetrics'].get('mediumCorrect', 0) * 2) + 
                        (input_data['difficultyMetrics'].get('easyCorrect', 0) * 1)
                    ) / max(1, raw_score),
                    'consistency': input_data.get('consistencyScore', 0)
                }])
                
                model = joblib.load(model_path)
                prediction = model.predict(features)[0]
        except ImportError:
            # Modules missing, stick with heuristic
            pass
        except Exception:
            # Model error, stick with heuristic
            pass

        # Safety Guard: Even if the model predicts Advanced due to fast time, 
        # we override if the score is too low.
        if score_percentage < 50 and prediction == "Advanced":
            prediction = "Beginner"
        elif score_percentage < 70 and prediction == "Advanced":
            prediction = "Intermediate"
        
        # Generate Reason
        reason = f"Classification based on {score_percentage:.0f}% accuracy."
        if prediction == "Advanced" and score_percentage < 90:
            reason += " Although speed was high, accuracy suggests fine-tuning needed for mastery."
        elif prediction == "Beginner" and score_percentage < 50:
            reason += " Score suggests starting with core definitions."
        
        if len(input_data.get('topicErrors', [])) > 0:
            reason += f" Review recommended for topics like: {', '.join(input_data['topicErrors'][:2])}."
        
        if input_data.get('timeTaken', 0) < 60:
            reason += " Completed very quickly, suggesting either mastery or rapid guessing."
        elif input_data.get('timeTaken', 0) > 180:
            reason += " Deliberate pacing observed."
        
        print(json.dumps({
            "level": prediction,
            "reason": reason
        }))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    predict()
