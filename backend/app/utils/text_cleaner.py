import re

class TextCleaner:
    """Utility class for cleaning and normalizing text"""
    
    @staticmethod
    def clean_text(text: str) -> str:
        """Clean and normalize text for processing"""
        if not text:
            return ""
        
        # Convert to lowercase
        text = text.lower()
        
        # Remove URLs
        text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)
        
        # Remove email addresses
        text = re.sub(r'\S+@\S+', '', text)
        
        # Remove special characters but keep spaces and alphanumeric
        text = re.sub(r'[^a-z0-9\s\-_]', '', text)
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        return text
    
    @staticmethod
    def extract_keywords(text: str, min_length: int = 3) -> list:
        """Extract keywords from text"""
        if not text:
            return []
        
        # Clean text first
        cleaned = TextCleaner.clean_text(text)
        
        # Split into words and filter by length
        words = [word for word in cleaned.split() if len(word) >= min_length]
        
        return words
    
    @staticmethod
    def normalize_title(title: str) -> str:
        """Normalize issue title"""
        if not title:
            return ""
        
        # Remove test/debug prefixes
        prefixes = ['[test]', '[debug]', '[wip]', '[feature]', '[bug]']
        normalized = title.lower()
        for prefix in prefixes:
            if normalized.startswith(prefix):
                title = title[len(prefix):].strip()
        
        return title.strip()
