# 🤖 BERTweet Fine-Tuned Model Integration Guide

This guide explains how to integrate your fine-tuned BERTweet model into the Social Monkey project.

---

## 📋 Overview

Currently, the project uses `SamLowe/roberta-base-go_emotions` from Hugging Face Hub. You have three options to integrate your fine-tuned BERTweet model:

1. **Option 1**: Load from local directory (Recommended for development)
2. **Option 2**: Upload to Hugging Face Hub and load remotely
3. **Option 3**: Configure via environment variables for flexibility

---

## ✅ Option 1: Load from Local Directory (Recommended)

### Step 1: Save Your Fine-Tuned Model

After fine-tuning, save your model locally:

```python
# In your training script (e.g., Google Colab)
from transformers import AutoTokenizer, AutoModelForSequenceClassification

# After training is complete
model_path = "./bertweet_goemotions"
model.save_pretrained(model_path)
tokenizer.save_pretrained(model_path)

# Download the entire folder to your local machine
# Files should include:
# - pytorch_model.bin (543MB)
# - config.json
# - tokenizer_config.json
# - vocab.txt
# - special_tokens_map.json
# - etc.
```

### Step 2: Place Model in Project

Create a `models/` directory in your backend:

```
Social-Monkey/
├── backend/
│   ├── models/
│   │   └── bertweet_goemotions/
│   │       ├── pytorch_model.bin
│   │       ├── config.json
│   │       ├── tokenizer_config.json
│   │       ├── vocab.txt
│   │       └── ... (other files)
│   ├── app/
│   └── main.py
```

### Step 3: Update `emotion_engine.py`

Replace the model path in `backend/app/analysis/emotion_engine.py`:

```python
# OLD:
EmotionEngine._classifier = pipeline(
    "text-classification",
    model="SamLowe/roberta-base-go_emotions",  # ❌ RoBERTa model
    top_k=None
)

# NEW:
EmotionEngine._classifier = pipeline(
    "text-classification",
    model="./models/bertweet_goemotions",  # ✅ Your fine-tuned BERTweet
    top_k=None
)
```

### Step 4: Update `.gitignore`

Add the models directory to `.gitignore` (model files are too large for git):

```gitignore
# ML Models
backend/models/
*.bin
*.pt
*.pth
```

### Step 5: Test the Integration

```bash
cd backend
python -c "from app.analysis.emotion_engine import analyze_emotion; print(analyze_emotion('This is amazing! I love it!'))"
```

Expected output:

```python
{
    'scores': {
        'admiration': 0.85,
        'joy': 0.92,
        'love': 0.78,
        # ... other emotions
    },
    'dominant': 'joy',
    'sentiment_score': 0.85
}
```

---

## 🌐 Option 2: Upload to Hugging Face Hub

### Step 1: Create Hugging Face Account

1. Sign up at https://huggingface.co/
2. Create access token: Settings → Access Tokens → New Token

### Step 2: Upload Your Model

```python
from huggingface_hub import HfApi

# Login
from huggingface_hub import login
login(token="your_hf_token_here")

# Upload model
api = HfApi()
api.upload_folder(
    folder_path="./bertweet_goemotions",
    repo_id="your-username/bertweet-goemotions",
    repo_type="model"
)
```

### Step 3: Update `emotion_engine.py`

```python
EmotionEngine._classifier = pipeline(
    "text-classification",
    model="your-username/bertweet-goemotions",  # Your HF Hub model
    top_k=None
)
```

### Benefits:

- ✅ No need to store large model files locally
- ✅ Easy to share with team
- ✅ Automatic version control
- ✅ Works in production (Heroku, AWS, etc.)

---

## ⚙️ Option 3: Environment Variable Configuration (Best for Production)

### Step 1: Update `.env` File

Add model configuration to `backend/.env`:

```env
# Emotion Analysis Model
EMOTION_MODEL_PATH=./models/bertweet_goemotions
# Or for Hugging Face Hub:
# EMOTION_MODEL_PATH=your-username/bertweet-goemotions
# Or keep default:
# EMOTION_MODEL_PATH=SamLowe/roberta-base-go_emotions

# Model Settings
EMOTION_MODEL_THRESHOLD=0.3
EMOTION_MODEL_MAX_LENGTH=128
```

### Step 2: Update `backend/app/core/config.py`

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # ... existing settings ...

    # Emotion Analysis
    EMOTION_MODEL_PATH: str = "SamLowe/roberta-base-go_emotions"
    EMOTION_MODEL_THRESHOLD: float = 0.3
    EMOTION_MODEL_MAX_LENGTH: int = 128

    class Config:
        env_file = ".env"

settings = Settings()
```

### Step 3: Update `emotion_engine.py`

```python
from app.core.config import settings

class EmotionEngine:
    # ... existing code ...

    def __init__(self):
        if EmotionEngine._classifier is None:
            model_path = settings.EMOTION_MODEL_PATH
            logger.info(f"Loading Emotion Analysis Model ({model_path})...")
            try:
                EmotionEngine._classifier = pipeline(
                    "text-classification",
                    model=model_path,  # ✅ Configurable via .env
                    top_k=None
                )
                logger.info("Emotion Model loaded successfully.")
            except Exception as e:
                logger.error(f"Failed to load Emotion Model: {e}")
                raise e
```

### Benefits:

- ✅ Easy to switch between models (dev/staging/prod)
- ✅ No code changes needed
- ✅ Team members can use different models
- ✅ Best practice for production deployment

---

## 🔧 Advanced: Custom Threshold Configuration

Your fine-tuned model uses a **0.3 threshold** instead of the default 0.5. Update the analysis to use this:

### Update `emotion_engine.py`

```python
def analyze(self, text: str) -> Dict[str, Any]:
    """
    Analyze the emotion of the given text.
    Returns a dictionary with 'scores' (all emotions) and 'dominant' (top emotion).
    """
    if not text or not text.strip():
        return {
            "scores": {},
            "dominant": "neutral",
            "sentiment_score": 0.0
        }

    try:
        # Truncate to 128 tokens (BERTweet max sequence length)
        truncated_text = text[:500]  # Roughly 128 tokens

        results = EmotionEngine._classifier(truncated_text)

        # Apply custom threshold (0.3 for BERTweet fine-tuned model)
        threshold = getattr(settings, 'EMOTION_MODEL_THRESHOLD', 0.3)

        # Filter scores above threshold
        scores = {
            item['label']: float(item['score'])
            for item in results[0]
            if item['score'] >= threshold  # ✅ Apply threshold
        }

        # If no emotions above threshold, use neutral
        if not scores:
            scores = {'neutral': 0.5}

        # Find dominant emotion
        dominant = max(scores, key=scores.get)

        # Calculate sentiment score
        sentiment_score = self._calculate_sentiment_score(scores)

        return {
            "scores": scores,
            "dominant": dominant,
            "sentiment_score": sentiment_score
        }

    except Exception as e:
        logger.error(f"Error analyzing emotion: {e}")
        return {
            "scores": {},
            "dominant": "error",
            "sentiment_score": 0.0
        }
```

---

## 📊 Testing Your Integration

### 1. Unit Test

Create `backend/tests/test_bertweet_integration.py`:

```python
import pytest
from app.analysis.emotion_engine import EmotionEngine, analyze_emotion

def test_bertweet_loads():
    """Test that BERTweet model loads successfully"""
    engine = EmotionEngine.get_instance()
    assert engine._classifier is not None

def test_emotion_analysis_joy():
    """Test joy detection"""
    result = analyze_emotion("I'm so happy and excited about this!")
    assert 'scores' in result
    assert 'dominant' in result
    assert result['dominant'] in ['joy', 'excitement', 'admiration']
    assert result['sentiment_score'] > 0

def test_emotion_analysis_sadness():
    """Test negative emotion detection"""
    result = analyze_emotion("This is terrible and disappointing.")
    assert result['dominant'] in ['sadness', 'anger', 'disappointment']
    assert result['sentiment_score'] < 0

def test_multi_label_detection():
    """Test multi-label emotion detection"""
    result = analyze_emotion("I'm excited but also nervous about the exam")
    scores = result['scores']
    # Should detect both excitement and nervousness above threshold
    assert len(scores) >= 2
    assert any(emotion in ['excitement', 'nervousness'] for emotion in scores.keys())

def test_gen_z_slang():
    """Test Gen-Z slang with BERTweet"""
    result = analyze_emotion("no cap this is bussin fr fr")
    assert result['dominant'] in ['admiration', 'approval', 'joy']
```

Run tests:

```bash
cd backend
pytest tests/test_bertweet_integration.py -v
```

### 2. API Test

Start backend and test via API:

```bash
# Start server
uvicorn main:app --reload --port 8000

# Test in another terminal
curl -X POST http://localhost:8000/api/v1/ingest/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Dashboard Test

1. Open dashboard: `http://localhost:8000/templates/dashboard.html`
2. Connect Twitter account
3. Ingest posts
4. Check Emotion Analysis dashboard for results

---

## 🚀 Deployment Considerations

### Heroku

Add model files to your deployment:

```bash
# Option 1: Include in git (if < 500MB)
git lfs install
git lfs track "backend/models/**/*.bin"
git add .gitattributes
git add backend/models/
git commit -m "Add fine-tuned BERTweet model"

# Option 2: Download during build
# Add to Procfile:
web: python download_model.py && uvicorn main:app --host 0.0.0.0 --port $PORT
```

Create `backend/download_model.py`:

```python
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import os

model_name = os.getenv("EMOTION_MODEL_PATH", "SamLowe/roberta-base-go_emotions")

if not model_name.startswith("./"):
    # Download from Hugging Face
    print(f"Downloading model: {model_name}")
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForSequenceClassification.from_pretrained(model_name)

    # Save to cache
    save_path = f"./models/{model_name.split('/')[-1]}"
    os.makedirs(save_path, exist_ok=True)
    tokenizer.save_pretrained(save_path)
    model.save_pretrained(save_path)
    print(f"Model cached to: {save_path}")
```

### AWS/Azure

Use S3/Blob Storage for model files:

```python
import boto3
import os

def download_model_from_s3():
    s3 = boto3.client('s3')
    bucket = 'your-bucket'
    model_path = './models/bertweet_goemotions'

    os.makedirs(model_path, exist_ok=True)

    # Download all model files
    objects = s3.list_objects_v2(Bucket=bucket, Prefix='models/bertweet/')
    for obj in objects.get('Contents', []):
        key = obj['Key']
        local_file = key.replace('models/bertweet/', model_path + '/')
        s3.download_file(bucket, key, local_file)
```

---

## 📝 Summary & Recommendations

### ✅ Recommended Approach for Your Project

1. **Development**: Use Option 1 (Local Directory)

   - Fast loading
   - No internet dependency
   - Easy to test

2. **Production**: Use Option 2 or 3 (Hugging Face Hub + Env Vars)
   - Smaller deployment size
   - Easy team collaboration
   - Version control

### 🎯 Next Steps

1. ✅ Save your fine-tuned model from Colab
2. ✅ Place in `backend/models/bertweet_goemotions/`
3. ✅ Update `emotion_engine.py` with new model path
4. ✅ Add threshold configuration (0.3)
5. ✅ Test with unit tests
6. ✅ Test via dashboard
7. ✅ Update documentation

### 📚 Additional Resources

- [Hugging Face Model Hub](https://huggingface.co/models)
- [Transformers Pipeline Docs](https://huggingface.co/docs/transformers/main_classes/pipelines)
- [BERTweet Paper](https://aclanthology.org/2020.emnlp-demos.2/)

---

**Need Help?** Check the complete BERTweet analysis in `bertweet_goemotions_complete_analysis.md`
