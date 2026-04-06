from sklearn.naive_bayes import MultinomialNB
from sklearn.feature_extraction.text import TfidfVectorizer
import numpy as np
from typing import List, Dict

class ClassifierService:
    """Service for classifying issues by priority"""
    
    def __init__(self):
        """Initialize classifier"""
        self.priority_classifier = None
        self.vectorizer = TfidfVectorizer(max_features=100, lowercase=True)
        self.priority_map = {0: 'low', 1: 'medium', 2: 'high', 3: 'critical'}
    
    def train(self, texts: List[str], labels: List[int]) -> bool:
        """Train the classifier on provided texts and labels"""
        try:
            if not texts or not labels or len(texts) != len(labels):
                return False
            
            X = self.vectorizer.fit_transform(texts)
            self.priority_classifier = MultinomialNB()
            self.priority_classifier.fit(X, labels)
            return True
        except Exception as e:
            print(f"Error training classifier: {e}")
            return False
    
    def classify_priority(self, text: str) -> str:
        """Classify priority of issue text"""
        if not self.priority_classifier or not text:
            return "medium"
        
        try:
            X = self.vectorizer.transform([text])
            prediction = self.priority_classifier.predict(X)[0]
            return self.priority_map.get(prediction, "medium")
        except Exception as e:
            print(f"Error classifying priority: {e}")
            return "medium"
    
    def classify_multiple(self, texts: List[str]) -> List[str]:
        """Classify priority for multiple texts"""
        return [self.classify_priority(text) for text in texts]
    
    def get_priority_scores(self, text: str) -> Dict[str, float]:
        """Get probability scores for each priority level"""
        if not self.priority_classifier or not text:
            return {p: 0.25 for p in self.priority_map.values()}
        
        try:
            X = self.vectorizer.transform([text])
            probabilities = self.priority_classifier.predict_proba(X)[0]
            
            scores = {}
            for idx, priority in self.priority_map.items():
                scores[priority] = float(probabilities[idx])
            
            return scores
        except Exception as e:
            print(f"Error getting priority scores: {e}")
            return {p: 0.25 for p in self.priority_map.values()}
    
    def is_trained(self) -> bool:
        """Check if classifier is trained"""
        return self.priority_classifier is not None
