# 🤖 BERTweet Fine-Tuned Model Integration Guide

This guide explains how to integrate your fine-tuned BERTweet model (trained on Kaggle) into the Social Monkey project.

---

## 🚀 Quick Start (TL;DR)

**If you just want to get it working fast:**

1. **Download from Kaggle:**

   - Go to your Kaggle notebook output → Download `bertweet_goemotions` folder (ZIP)

2. **Extract to project:**

   ```powershell
   # Extract ZIP to: D:\!Fast\!Semester 7\FYP\Social-Monkey\backend\models\bertweet_goemotions\
   ```

3. **Install dependencies:**

   ```powershell
   cd "D:\!Fast\!Semester 7\FYP\Social-Monkey\backend"
   pip install safetensors>=0.3.0
   ```

4. **Update emotion_engine.py:**

   ```python
   # Change line ~30 in backend/app/analysis/emotion_engine.py:
   model="./models/bertweet_goemotions",  # Instead of "SamLowe/roberta-base-go_emotions"
   ```

5. **Test it:**
   ```powershell
   python -c "from app.analysis.emotion_engine import analyze_emotion; print(analyze_emotion('I love this!'))"
   ```

**Done!** ✅ Continue reading for detailed instructions and troubleshooting.

---

## 📋 Overview

Currently, the project uses `SamLowe/roberta-base-go_emotions` from Hugging Face Hub. You have three options to integrate your fine-tuned BERTweet model:

1. **Option 1**: Load from local directory (Recommended for development)
2. **Option 2**: Upload to Hugging Face Hub and load remotely
3. **Option 3**: Configure via environment variables for flexibility

---

## ✅ Option 1: Load from Local Directory (Recommended)

### Step 1: Download Your Fine-Tuned Model from Kaggle

After running your Kaggle notebook, download the **entire model folder** from Kaggle:

**In Kaggle:**

1. After Cell 10 completes, you'll see the output: `💾 Model saved to: /kaggle/working/bertweet_goemotions`
2. In the right sidebar, click **"Output"** tab
3. Find the `bertweet_goemotions` folder
4. Click the **3 dots** → **"Download"**

**Files you'll download (as a ZIP):**

- `model.safetensors` (500+ MB) - **Main model weights**
- `config.json` - Model configuration
- `tokenizer_config.json` - Tokenizer settings
- `vocab.txt` - BERTweet vocabulary
- `special_tokens_map.json` - Special tokens
- `training_args.bin` - Training arguments (optional)
- `final_metrics.json` - Performance metrics
- `per_emotion_results.csv` - Detailed emotion scores
- `emotion_classifier.py` - Production inference class

**Important:** Download the **entire folder**, not just `model.safetensors`. The model won't work without the tokenizer files.

### Step 2: Extract and Place Model in Project

**Extract the ZIP file** you downloaded from Kaggle, then place it in your backend:

```powershell
# Create models directory
cd D:\!Fast\!Semester 7\FYP\Social-Monkey\backend
mkdir models

# Extract the downloaded ZIP to this location
# Final structure should be:
```

```
Social-Monkey/
├── backend/
│   ├── models/
│   │   └── bertweet_goemotions/
│   │       ├── model.safetensors          (500+ MB) ← Main model
│   │       ├── config.json                 (Model config)
│   │       ├── tokenizer_config.json       (Tokenizer config)
│   │       ├── vocab.txt                   (Vocabulary)
│   │       ├── special_tokens_map.json     (Special tokens)
│   │       ├── final_metrics.json          (Performance metrics)
│   │       ├── per_emotion_results.csv     (Emotion scores)
│   │       └── emotion_classifier.py       (Production class)
│   ├── app/
│   └── main.py
```

**Verify the files are in place:**

```powershell
cd backend\models\bertweet_goemotions
dir
# You should see model.safetensors (500+ MB) and other files
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

Add the models directory to `.gitignore` (model files are too large for Git):

```gitignore
# ML Models (500+ MB files)
backend/models/
*.safetensors
*.bin
*.pt
*.pth

# Keep the directory structure but ignore model files
!backend/models/.gitkeep
```

**Create a `.gitkeep` file** to preserve the directory structure:

```powershell
cd backend\models
echo. > .gitkeep
```

**For version control**, add a `README.md` in `backend/models/`:

```markdown
# Models Directory

## BERTweet GoEmotions Model

Download the fine-tuned model from:

- Kaggle: [Your Kaggle Notebook Output]
- Or Hugging Face: [Your HF Hub Link]

Place the extracted `bertweet_goemotions` folder here.

Required files:

- model.safetensors (500+ MB)
- config.json
- tokenizer_config.json
- vocab.txt
- special_tokens_map.json
```

### Step 5: Install Required Dependencies

Your BERTweet model uses `safetensors` format. Update `requirements.txt`:

```powershell
cd backend
```

Add to `requirements.txt`:

```
# ML & NLP
transformers>=4.30.0
torch>=2.0.0
safetensors>=0.3.0  # Required for model.safetensors
```

Install dependencies:

```powershell
pip install -r requirements.txt
```

### Step 6: Test the Integration

```bash
cd backend
python -c "from app.analysis.emotion_engine import analyze_emotion; print(analyze_emotion('This is amazing! I love it!'))"
```

**If you get a `safetensors` error:**

```powershell
pip install --upgrade safetensors transformers
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

**Option A: Upload via Python**

```python
from huggingface_hub import HfApi, login

# Login with your token
login(token="your_hf_token_here")

# Upload the entire folder from Kaggle output
api = HfApi()
api.upload_folder(
    folder_path="./bertweet_goemotions",  # Path to extracted Kaggle output
    repo_id="your-username/bertweet-goemotions",
    repo_type="model"
)

# This will upload:
# - model.safetensors (500+ MB)
# - config.json
# - tokenizer files
# - metrics files
```

**Option B: Upload via Web Interface**

1. Go to https://huggingface.co/new
2. Create a new model repository: `your-username/bertweet-goemotions`
3. Upload files manually:
   - Drag and drop the `bertweet_goemotions` folder
   - Or use git-lfs for large files

**Option C: Upload via Git LFS (Recommended for large files)**

```powershell
# Install git-lfs
git lfs install

# Clone your HF repository
git clone https://huggingface.co/your-username/bertweet-goemotions
cd bertweet-goemotions

# Copy model files
cp -r ../bertweet_goemotions/* .

# Track large files with LFS
git lfs track "*.safetensors"
git add .gitattributes
git add .

# Commit and push
git commit -m "Add fine-tuned BERTweet model"
git push
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

**⚠️ Warning:** The `model.safetensors` file (500+ MB) exceeds Heroku's slug size limit (500 MB). Use one of these approaches:

**Option 1: Download model during deployment (Recommended)**

Create `backend/download_model.py`:

```python
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import os

def download_model():
    """Download model from Hugging Face during deployment"""
    model_name = os.getenv("EMOTION_MODEL_PATH", "your-username/bertweet-goemotions")

    if not os.path.exists("./models/bertweet_goemotions"):
        print(f"📥 Downloading model: {model_name}")

        tokenizer = AutoTokenizer.from_pretrained(model_name)
        model = AutoModelForSequenceClassification.from_pretrained(model_name)

        # Save to local cache
        save_path = "./models/bertweet_goemotions"
        os.makedirs(save_path, exist_ok=True)
        tokenizer.save_pretrained(save_path)
        model.save_pretrained(save_path)

        print(f"✅ Model cached to: {save_path}")
    else:
        print(f"✅ Model already exists at ./models/bertweet_goemotions")

if __name__ == "__main__":
    download_model()
```

Update `Procfile`:

```
web: cd backend && python download_model.py && uvicorn main:app --host 0.0.0.0 --port $PORT
```

**Option 2: Use Hugging Face Hub directly (Fastest)**

Just set the environment variable on Heroku:

```bash
heroku config:set EMOTION_MODEL_PATH=your-username/bertweet-goemotions
```

The model will be downloaded from HF Hub on first request (cached afterwards).

**Option 3: Use external storage**

Store model on S3/Google Cloud and download during deployment:

```python
# download_model_from_s3.py
import boto3
import os

s3 = boto3.client('s3')
bucket = 'your-bucket'

files = [
    'model.safetensors',
    'config.json',
    'tokenizer_config.json',
    'vocab.txt',
    'special_tokens_map.json'
]

os.makedirs('./models/bertweet_goemotions', exist_ok=True)

for file in files:
    s3.download_file(
        bucket,
        f'models/bertweet/{file}',
        f'./models/bertweet_goemotions/{file}'
    )
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

## 🔧 Troubleshooting

### Issue 1: `safetensors` not found

**Error:**

```
ImportError: cannot import name 'safe_open' from 'safetensors'
```

**Solution:**

```powershell
pip install --upgrade safetensors>=0.3.0
```

### Issue 2: Model file not found

**Error:**

```
OSError: ./models/bertweet_goemotions does not appear to have a file named config.json
```

**Solution:**
Make sure you downloaded the **entire folder** from Kaggle, not just `model.safetensors`. Required files:

- ✅ `model.safetensors`
- ✅ `config.json`
- ✅ `tokenizer_config.json`
- ✅ `vocab.txt`
- ✅ `special_tokens_map.json`

### Issue 3: Out of memory during model loading

**Error:**

```
RuntimeError: CUDA out of memory
```

**Solutions:**

```python
# Option 1: Force CPU
import os
os.environ["CUDA_VISIBLE_DEVICES"] = ""

# Option 2: Use 8-bit quantization (reduces memory by ~4x)
from transformers import BitsAndBytesConfig

quantization_config = BitsAndBytesConfig(load_in_8bit=True)
model = AutoModelForSequenceClassification.from_pretrained(
    "./models/bertweet_goemotions",
    quantization_config=quantization_config
)

# Option 3: Offload to CPU
model = AutoModelForSequenceClassification.from_pretrained(
    "./models/bertweet_goemotions",
    device_map="auto",  # Automatically manage device placement
    low_cpu_mem_usage=True
)
```

### Issue 4: Slow first prediction

**Explanation:** Model is loaded into memory on first use (can take 5-10 seconds).

**Solution:** Pre-warm the model on startup:

```python
# In main.py
from app.analysis.emotion_engine import EmotionEngine

@app.on_event("startup")
async def startup_event():
    # Pre-load model
    engine = EmotionEngine.get_instance()
    # Warm up with dummy prediction
    engine.analyze("Hello world")
    print("✅ Emotion model pre-loaded")
```

### Issue 5: Different results from Kaggle notebook

**Cause:** Threshold differences (Kaggle uses 0.3, default pipeline uses 0.5)

**Solution:** Ensure threshold is set correctly in `emotion_engine.py`:

```python
threshold = 0.3  # Match Kaggle notebook
scores = {
    item['label']: float(item['score'])
    for item in results[0]
    if item['score'] >= threshold
}
```

---

## 📝 Summary & Recommendations

### ✅ Recommended Approach for Your Project

1. **Development (Local Machine)**: Use Option 1 (Local Directory)

   - ✅ Fast loading (no download time)
   - ✅ No internet dependency
   - ✅ Easy to test and debug
   - ✅ Works offline
   - ⚠️ Requires 500+ MB disk space

2. **Production/Deployment**: Use Option 2 (Hugging Face Hub + Env Vars)

   - ✅ No need to store 500+ MB in Git
   - ✅ Easy team collaboration
   - ✅ Automatic version control
   - ✅ Works on Heroku/AWS/Azure
   - ⚠️ Requires internet on first load

3. **Best Practice**: Support both options via environment variable

   ```env
   # .env (local development)
   EMOTION_MODEL_PATH=./models/bertweet_goemotions

   # .env (production)
   EMOTION_MODEL_PATH=your-username/bertweet-goemotions
   ```

### 🎯 Integration Checklist

Follow these steps in order:

#### Phase 1: Download from Kaggle

- [ ] Run all cells in Kaggle notebook (Cell 1-15)
- [ ] Wait for Cell 10 to complete training
- [ ] Download `bertweet_goemotions` folder from Kaggle Output
- [ ] Verify you have `model.safetensors` (500+ MB) in the ZIP

#### Phase 2: Local Setup

- [ ] Extract ZIP to `backend/models/bertweet_goemotions/`
- [ ] Verify all files exist (model.safetensors, config.json, vocab.txt, etc.)
- [ ] Update `.gitignore` to exclude `*.safetensors`
- [ ] Add `safetensors>=0.3.0` to `requirements.txt`
- [ ] Run `pip install -r requirements.txt`

#### Phase 3: Code Integration

- [ ] Update `emotion_engine.py` model path to `./models/bertweet_goemotions`
- [ ] Set threshold to `0.3` (not 0.5)
- [ ] Add model pre-loading on startup (optional but recommended)
- [ ] Update `config.py` with `EMOTION_MODEL_PATH` setting

#### Phase 4: Testing

- [ ] Test model loads: `python -c "from transformers import pipeline; p = pipeline('text-classification', model='./models/bertweet_goemotions')"`
- [ ] Test emotion engine: `python -c "from app.analysis.emotion_engine import analyze_emotion; print(analyze_emotion('I love this!'))"`
- [ ] Run unit tests: `pytest tests/test_bertweet_integration.py`
- [ ] Test via API endpoint
- [ ] Test via dashboard

#### Phase 5: Production (Optional)

- [ ] Create Hugging Face account
- [ ] Upload model to HF Hub
- [ ] Update production `.env` with HF Hub path
- [ ] Test deployment on staging environment
- [ ] Deploy to production

### 📊 Quick Verification Commands

After integration, run these to verify everything works:

```powershell
# 1. Check files exist
cd backend\models\bertweet_goemotions
dir
# Should show model.safetensors (500+ MB)

# 2. Test model loading
cd ..\..
python -c "from transformers import AutoTokenizer; t = AutoTokenizer.from_pretrained('./models/bertweet_goemotions'); print('✅ Tokenizer loaded')"

# 3. Test emotion analysis
python -c "from app.analysis.emotion_engine import analyze_emotion; result = analyze_emotion('I am so excited about this project!'); print(result)"

# Expected output:
# {'scores': {'joy': 0.92, 'excitement': 0.87, ...}, 'dominant': 'joy', 'sentiment_score': 0.85}
```

### 📚 Additional Resources

- [Hugging Face Model Hub](https://huggingface.co/models)
- [Transformers Pipeline Docs](https://huggingface.co/docs/transformers/main_classes/pipelines)
- [BERTweet Paper](https://aclanthology.org/2020.emnlp-demos.2/)

---

**Need Help?** Check the complete BERTweet analysis in `bertweet_goemotions_complete_analysis.md`
