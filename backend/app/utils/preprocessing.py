import re
import emoji
from langdetect import detect, LangDetectException
from typing import Optional


class TextPreprocessor:
    """Utility class for preprocessing social media text"""
    
    # Common slang dictionary (expandable)
    SLANG_DICT = {
        "lol": "laughing out loud",
        "omg": "oh my god",
        "btw": "by the way",
        "tbh": "to be honest",
        "imo": "in my opinion",
        "imho": "in my humble opinion",
        "brb": "be right back",
        "gtg": "got to go",
        "idk": "i don't know",
        "smh": "shaking my head",
        "fyi": "for your information",
        "dm": "direct message",
        "rt": "retweet",
        "icymi": "in case you missed it",
    }
    
    def normalize_emoji(self, text: str) -> str:
        """Convert emojis to textual descriptions"""
        return emoji.demojize(text, delimiters=(" ", " "))
    
    def expand_slang(self, text: str) -> str:
        """Expand common slang terms"""
        words = text.lower().split()
        expanded_words = [self.SLANG_DICT.get(word, word) for word in words]
        return " ".join(expanded_words)
    
    def clean_text(self, text: str) -> str:
        """Clean text by removing extra whitespace and special characters"""
        # Remove URLs
        text = re.sub(r'http\S+|www.\S+', '', text)
        # Remove mentions and hashtags (keep the text)
        text = re.sub(r'@\w+', '', text)
        text = re.sub(r'#', '', text)
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        return text.strip()
    
    def detect_language(self, text: str) -> Optional[str]:
        """Detect the language of the text"""
        try:
            return detect(text)
        except LangDetectException:
            return None
    
    def preprocess(self, text: str) -> tuple[str, Optional[str]]:
        """
        Full preprocessing pipeline
        
        Returns:
            tuple: (preprocessed_text, detected_language)
        """
        # Handle None input
        if text is None:
            return "", None
        
        # Step 1: Normalize emojis
        text = self.normalize_emoji(text)
        
        # Step 2: Detect language (before further processing)
        language = self.detect_language(text)
        
        # Step 3: Clean text
        text = self.clean_text(text)
        
        # Step 4: Expand slang
        text = self.expand_slang(text)
        
        return text, language


# Global instance
text_preprocessor = TextPreprocessor()
