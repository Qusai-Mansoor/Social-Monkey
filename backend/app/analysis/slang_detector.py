import re
from typing import List, Dict, Any

# Comprehensive Gen Z Slang Dictionary
# This can be updated dynamically or loaded from a JSON file in the future
GEN_Z_SLANG_DICT = {
    "no cap": "no lie/for real",
    "cap": "lie/false",
    "rizz": "charisma/charm",
    "bet": "yes/agreement/okay",
    "sus": "suspicious",
    "mid": "mediocre/average",
    "slay": "did a great job/killed it",
    "tea": "gossip/truth",
    "ick": "turn off/repulsion",
    "finna": "going to",
    "yeet": "throw/discard with force",
    "simp": "overly desperate for attention",
    "bussin": "delicious/really good",
    "sheesh": "disbelief/hype/surprise",
    "valid": "acceptable/reasonable/legitimate",
    "rent free": "obsessed with/thinking about constantly",
    "periodt": "end of discussion/emphasis",
    "facts": "true/agreement",
    "fr": "for real",
    "ngl": "not gonna lie",
    "tbh": "to be honest",
    "ong": "on god/swear",
    "deadass": "seriously/for real",
    "slaps": "really good (usually music/food)",
    "fire": "awesome/cool",
    "lit": "exciting/fun",
    "ate": "did really well",
    "served": "delivered perfectly (looks/outfit)",
    "understood the assignment": "did exactly what was needed",
    "main character": "confident/taking charge",
    "vibe": "mood/feeling",
    "vibes": "good feelings/atmosphere",
    "cringe": "embarrassing",
    "toxic": "harmful/negative behavior",
    "clown": "foolish person",
    "pressed": "upset/bothered",
    "salty": "bitter/upset",
    "ghosted": "cut off communication suddenly",
    "left on read": "ignored message",
    "glow up": "positive transformation",
    "gatekeep": "withhold information",
    "gaslight": "manipulate someone into questioning reality",
    "girlboss": "empowered woman (sometimes ironic)",
    "touch grass": "go outside/get a reality check",
    "based": "courageous/unique opinion",
    "ratio": "reply got more likes than original post",
    "stan": "obsessive fan",
    "w": "win/success",
    "l": "loss/failure",
    "caught in 4k": "caught red-handed with evidence",
    "down bad": "desperately attracted to someone",
    "iykyk": "if you know you know",
    "fomo": "fear of missing out",
    "yolo": "you only live once",
    "fam": "family/close friends",
    "squad": "group of friends",
    "goals": "aspirational",
    "mood": "relatable feeling",
    "same": "agreement/relatability",
    "shook": "shocked/surprised",
    "extra": "over the top/dramatic",
    "basic": "mainstream/unoriginal",
    "karen": "entitled/demanding person",
    "ok boomer": "dismissive of older generation",
    "cheugy": "outdated/trying too hard",
    "drip": "stylish outfit/style",
    "fit": "outfit",
    "flex": "show off",
    "lowkey": "secretly/slightly",
    "highkey": "openly/very",
    "hits different": "feels special/better",
    "living rent free": "thinking about constantly",
    "main character energy": "confident/center of attention",
    "sending me": "making me laugh hard",
    "sleeping on": "underestimating/ignoring",
    "snatched": "looking good/perfect",
    "vibe check": "assessing the mood/attitude",
    "we move": "keep going/carry on",
    "zesty": "energetic/lively (sometimes implies gay)",
    "delulu": "delusional",
    "solulu": "solution",
    "mathing": "making sense (usually negative: not mathing)",
    "brain rot": "content that makes you dumber",
    "doom scrolling": "endlessly scrolling bad news",
    "soft launch": "subtle reveal (usually relationship)",
    "hard launch": "obvious reveal",
    "era": "phase of life",
    "villain arc": "phase of becoming selfish/ruthless",
    "canon event": "unavoidable life event",
    "side eye": "judgmental look",
    "bombastic side eye": "very judgmental look",
    "let him cook": "let him do his thing",
    "rizzler": "person with rizz",
    "gyatt": "expression of surprise/admiration (often body)",
    "fanum tax": "taking a portion of food",
    "skibidi": "nonsense/filler word (very young Gen Alpha/Z)",
    "ohio": "weird/crazy (slang)",
    "sigma": "lone wolf/successful male",
    "mewing": "jawline exercise (slang)",
    "looksmaxxing": "improving appearance",
    "mogging": "looking better than someone else",
    "goated": "greatest of all time status",
}

class SlangDetector:
    """
    Service for detecting and interpreting Gen Z slang in text.
    Uses a curated dictionary for high-performance O(1) lookups.
    """
    
    def __init__(self):
        self.slang_dict = GEN_Z_SLANG_DICT
        # Pre-compile regex patterns for better performance if needed
        # For now, we'll do dynamic regex generation in detect() for simplicity
        
    def detect(self, text: str) -> List[Dict[str, str]]:
        """
        Detect slang terms in the given text.
        Returns a list of dictionaries with 'term' and 'meaning'.
        """
        if not text:
            return []
            
        found_slang = []
        text_lower = text.lower()
        
        # Sort keys by length (descending) to match longer phrases first ("no cap" before "cap")
        sorted_slang = sorted(self.slang_dict.keys(), key=len, reverse=True)
        
        for slang in sorted_slang:
            # Use regex to ensure we match whole words/phrases
            # \b matches word boundary. 
            # re.escape ensures special chars in slang don't break regex
            pattern = r'\b' + re.escape(slang) + r'\b'
            
            if re.search(pattern, text_lower):
                found_slang.append({
                    "term": slang,
                    "meaning": self.slang_dict[slang]
                })
                
        return found_slang

# Singleton instance
slang_detector = SlangDetector()
