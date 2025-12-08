# Models Directory

This directory contains the fine-tuned emotion analysis models used by Social Monkey.

## 📦 BERTweet GoEmotions Model

**Location:** `bertweet_goemotions/`

### Model Details

- **Base Model:** BERTweet (vinai/bertweet-base)
- **Fine-tuned on:** GoEmotions dataset (27 emotions)
- **Training:** Kaggle GPU notebook
- **Performance:** Macro F1 ~0.45-0.48 on test set

### Required Files

The following files must be present in `bertweet_goemotions/`:

- ✅ `model.safetensors` (500+ MB) - Main model weights
- ✅ `config.json` - Model configuration
- ✅ `vocab.txt` - BERTweet vocabulary
- ✅ `bpe.codes` - Byte-pair encoding codes
- ✅ `added_tokens.json` - Additional tokens
- ✅ `final_metrics.json` - Performance metrics
- ✅ `per_emotion_results.csv` - Detailed emotion scores

### Usage in Code

```python
from app.analysis.emotion_engine import analyze_emotion

# Analyze text
result = analyze_emotion("I'm so excited about this project!")

# Result:
# {
#     'scores': {'joy': 0.92, 'excitement': 0.87, ...},
#     'dominant': 'joy',
#     'sentiment_score': 0.85
# }
```

### Configuration

Model path is configured in `app/core/config.py`:

- `EMOTION_MODEL_PATH`: Path to model directory (default: `./models/bertweet_goemotions`)
- `EMOTION_MODEL_THRESHOLD`: Minimum confidence threshold (default: 0.3)
- `EMOTION_MODEL_MAX_LENGTH`: Max sequence length in tokens (default: 128)

### Switching Models

To use a different model (e.g., from Hugging Face Hub), update `.env`:

```env
EMOTION_MODEL_PATH=your-username/bertweet-goemotions
```

## 📚 Additional Resources

- Training notebook: `backend/fine-tune-bert-on-goemotions.ipynb`
- Integration guide: `BERTWEET_INTEGRATION_GUIDE.md`
- Analysis: `bertweet_goemotions_complete_analysis.md`

## ⚠️ Note

Model files are **not tracked by Git** due to their large size (500+ MB).
Download from Kaggle or Hugging Face Hub as needed.
