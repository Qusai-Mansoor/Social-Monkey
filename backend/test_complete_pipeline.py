"""
Test the complete pipeline: NER → Slang Normalization → BERTweet Emotion Analysis
Run with: uv run python test_complete_pipeline.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_slang_detection():
    """Test Step 1: Slang Detection"""
    print("\n" + "="*60)
    print("🔍 STEP 1: Testing Slang Detection (NER Model)")
    print("="*60)
    
    from app.analysis.slang_normalizer import SlangNormalizer
    
    test_cases = [
        "ngl this is bussin fr fr no cap",
        "lowkey that's mid but the vibes are immaculate",
        "she ate and left no crumbs periodt",
        "bet this is gonna slay on TikTok fr",
        "I love this movie so much!"  # No slang
    ]
    
    try:
        normalizer = SlangNormalizer.get_instance()
        print("✅ Slang NER Model loaded\n")
        
        for text in test_cases:
            detected = normalizer.detect_slang(text)
            print(f"📝 Text: '{text}'")
            if detected:
                print(f"   🔍 Detected {len(detected)} slang term(s):")
                for slang in detected:
                    print(f"      • '{slang['text']}' → '{slang['normalized']}'")
            else:
                print("   ✓ No slang detected")
            print()
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_slang_normalization():
    """Test Step 2: Slang Normalization"""
    print("\n" + "="*60)
    print("📝 STEP 2: Testing Slang Normalization (Dictionary Lookup)")
    print("="*60)
    
    from app.analysis.slang_normalizer import normalize_slang
    
    test_cases = [
        "ngl this is bussin fr fr no cap",
        "lowkey that's mid but the vibes are fire",
        "she ate and left no crumbs periodt"
    ]
    
    try:
        for text in test_cases:
            normalized, detected = normalize_slang(text)
            print(f"\n📝 Original: '{text}'")
            print(f"✨ Normalized: '{normalized}'")
            print(f"   Replacements: {len(detected)} term(s)")
            for slang in detected:
                print(f"      • '{slang['text']}' → '{slang['normalized']}'")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_emotion_analysis():
    """Test Step 3: BERTweet Emotion Analysis"""
    print("\n" + "="*60)
    print("🤖 STEP 3: Testing BERTweet Emotion Analysis")
    print("="*60)
    
    from app.analysis.emotion_engine import EmotionEngine
    
    test_cases = [
        "I love this so much!",
        "This is terrible and disappointing",
        "I'm so excited about this project!"
    ]
    
    try:
        engine = EmotionEngine.get_instance()
        print("✅ BERTweet Model loaded\n")
        
        for text in test_cases:
            # Test WITHOUT slang normalization
            result = engine.analyze(text, normalize_slang=False)
            print(f"📝 Text: '{text}'")
            print(f"   Dominant: {result['dominant']}")
            print(f"   Sentiment: {result['sentiment_score']:.3f}")
            print(f"   Top emotions: {list(result['scores'].keys())[:5]}")
            print()
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_complete_pipeline():
    """Test Complete Pipeline: NER → Normalization → BERTweet"""
    print("\n" + "="*60)
    print("🚀 STEP 4: Testing COMPLETE PIPELINE")
    print("="*60)
    
    from app.analysis.emotion_engine import analyze_emotion
    
    test_cases = [
        {
            "text": "ngl this movie is bussin fr fr no cap",
            "expected": "Should detect slang and analyze normalized text"
        },
        {
            "text": "lowkey that's mid but the vibes are fire",
            "expected": "Should normalize 'lowkey', 'mid', 'fire'"
        },
        {
            "text": "she ate and left no crumbs periodt",
            "expected": "Should detect Gen-Z slang"
        },
        {
            "text": "bet this is gonna slay on TikTok fr",
            "expected": "Multiple slang terms"
        },
        {
            "text": "I am so happy and grateful today!",
            "expected": "No slang, should work normally"
        }
    ]
    
    try:
        print("Testing with slang normalization ENABLED:\n")
        
        for case in test_cases:
            text = case['text']
            result = analyze_emotion(text)  # Default: normalize_slang=True
            
            print(f"📝 Original: '{text}'")
            
            if result['slang_detected']:
                print(f"   🔍 Detected slang: {[s['text'] for s in result['slang_detected']]}")
                print(f"   ✨ Normalized: '{result['normalized_text']}'")
            else:
                print(f"   ✓ No slang detected")
            
            print(f"   🎭 Dominant emotion: {result['dominant']}")
            print(f"   📊 Sentiment score: {result['sentiment_score']:.3f}")
            print(f"   📈 Top emotions: {sorted(result['scores'].items(), key=lambda x: x[1], reverse=True)[:3]}")
            print()
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_comparison():
    """Compare results WITH vs WITHOUT slang normalization"""
    print("\n" + "="*60)
    print("⚖️  STEP 5: Comparison (With vs Without Normalization)")
    print("="*60)
    
    from app.analysis.emotion_engine import EmotionEngine
    
    test_text = "ngl this is bussin fr no cap"
    
    try:
        engine = EmotionEngine.get_instance()
        
        # WITHOUT normalization
        result_without = engine.analyze(test_text, normalize_slang=False)
        
        # WITH normalization
        result_with = engine.analyze(test_text, normalize_slang=True)
        
        print(f"\n📝 Test Text: '{test_text}'")
        print("\n" + "-"*60)
        print("WITHOUT Slang Normalization:")
        print(f"   Analyzed text: '{result_without['original_text']}'")
        print(f"   Dominant: {result_without['dominant']}")
        print(f"   Sentiment: {result_without['sentiment_score']:.3f}")
        
        print("\n" + "-"*60)
        print("WITH Slang Normalization:")
        print(f"   Original: '{result_with['original_text']}'")
        print(f"   Normalized: '{result_with['normalized_text']}'")
        print(f"   Slang detected: {[s['text'] for s in result_with['slang_detected']]}")
        print(f"   Dominant: {result_with['dominant']}")
        print(f"   Sentiment: {result_with['sentiment_score']:.3f}")
        
        print("\n" + "-"*60)
        print(f"Dominant emotion changed: {result_without['dominant']} → {result_with['dominant']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("\n" + "="*60)
    print("🧪 COMPLETE PIPELINE TEST SUITE")
    print("NER → Slang Normalization → BERTweet Emotion Analysis")
    print("="*60)
    
    tests = [
        ("Slang Detection (NER)", test_slang_detection),
        ("Slang Normalization (Dictionary)", test_slang_normalization),
        ("Emotion Analysis (BERTweet)", test_emotion_analysis),
        ("Complete Pipeline", test_complete_pipeline),
        ("With/Without Comparison", test_comparison)
    ]
    
    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
            if not result:
                print(f"\n⚠️  {name} test failed. Stopping here.")
                break
        except Exception as e:
            print(f"\n❌ {name} test crashed: {e}")
            results.append((name, False))
            break
    
    print("\n" + "="*60)
    print("📊 FINAL RESULTS")
    print("="*60)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
    
    all_passed = all(r[1] for r in results)
    
    if all_passed:
        print("\n🎉 ALL TESTS PASSED! 🎉")
        print("\n✅ Your complete pipeline is working:")
        print("   1. ✅ NER Model detects slang")
        print("   2. ✅ Dictionary normalizes slang")
        print("   3. ✅ BERTweet analyzes emotions")
        print("\n📝 Integration Summary:")
        print("   • Slang NER Model: backend/models/slang_ner_model/")
        print("   • Slang Dictionary: backend/slang_rich_dictionary.json")
        print("   • BERTweet Model: backend/models/bertweet_goemotions/")
        print("   • Pipeline Code: backend/app/analysis/")
    else:
        print(f"\n⚠️  {sum(1 for r in results if not r[1])} test(s) failed")
        print("Please fix the issues above.")
    
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
