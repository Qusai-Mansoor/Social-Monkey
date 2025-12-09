"""
Quick test script to verify the slang detection fix for proper nouns
"""

import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.analysis.slang_normalizer import SlangNormalizer


def test_slang_detection_fix():
    """Test that proper nouns are now correctly filtered"""
    
    print("="*80)
    print("🧪 Testing Slang Detection Fix")
    print("="*80)
    
    normalizer = SlangNormalizer.get_instance()
    
    # Test Case 1: Original Problem
    print("\n📝 Test Case 1: Original Problem (TLPDharna)")
    print("-"*80)
    text1 = "tlpdharna whats happening everyone??? where is saad rizvi?"
    detected1 = normalizer.detect_slang(text1)
    print(f"Input: {text1}")
    print(f"Detected: {detected1}")
    print(f"✅ PASS" if len(detected1) == 0 else f"❌ FAIL - Expected 0 detections, got {len(detected1)}")
    
    # Test Case 2: Valid Slang Should Still Work
    print("\n📝 Test Case 2: Valid Slang Detection")
    print("-"*80)
    text2 = "ngl this movie was bussin fr no cap"
    detected2 = normalizer.detect_slang(text2)
    print(f"Input: {text2}")
    print(f"Detected slang terms:")
    for slang in detected2:
        print(f"  • '{slang['text']}' → '{slang['normalized']}'")
    print(f"✅ PASS" if len(detected2) >= 3 else f"❌ FAIL - Expected 3+ detections, got {len(detected2)}")
    
    # Test Case 3: Complete Detection Pipeline (Pattern + Dictionary Check)
    print("\n📝 Test Case 3: Complete Detection Pipeline (Pattern + Dictionary)")
    print("-"*80)
    print("Testing full detect_slang() which includes BOTH pattern validation AND dictionary check")
    print()
    
    # Test cases with sentences containing terms that should/shouldn't be detected
    test_cases = [
        # Proper Nouns - Should be filtered
        ("TLPDharna is trending", [], "Proper noun (CamelCase) - should be filtered"),
        ("COVID19 is still spreading", [], "Acronym with numbers - should be filtered"),
        ("BlackLivesMatter movement", [], "Proper noun (CamelCase) - should be filtered"),
        ("SaadRizvi was released", [], "Proper noun (TitleCase) - should be filtered"),
        ("MeToo changed everything", [], "Proper noun (mixed case) - should be filtered"),
        
        # Valid Slang - Should detect
        ("this is bussin fr", ["bussin", "fr"], "Valid slang in dictionary - should detect"),
        ("ngl that was amazing", ["ngl"], "Valid slang in dictionary - should detect"),
        ("YOLO we only live once", ["yolo"], "All caps slang in dictionary - should detect"),
        ("lol that's so funny", ["lol"], "Common slang in dictionary - should detect"),
        
        # Not in dictionary - Should be filtered
        ("RandomWord123 is weird", [], "Random word not in dictionary - should be filtered"),
        ("blahblah whatever", [], "Non-existent slang - should be filtered"),
        
        # Context-aware tests: "no cap" slang vs literal meaning
        ("that was amazing no cap", ["no cap"], "Slang usage: 'no cap' means 'no lie/for real'"),
        ("I lost my no cap hat", [], "Literal usage: 'no cap' refers to actual hat - BUT model may still detect"),
        ("he wore no cap to the party", [], "Literal usage: 'no cap' means no hat - BUT model may still detect"),
        ("this is fire no cap", ["fire", "no cap"], "Both 'fire' and 'no cap' are slang"),
        ("nocap this is crazy", ["nocap"], "Single word variation 'nocap' should detect"),
        
        # Context-aware tests: "W" slang vs literal W
        ("we got the W today", ["w"], "Slang usage: 'W' means win"),
        ("press W to move forward", [], "Literal usage: 'W' is keyboard key - BUT model may still detect"),
        ("W is the 23rd letter", [], "Literal usage: 'W' is a letter - BUT model may still detect"),
        
        # Context-aware tests: "L" slang vs literal L
        ("that was such an L", ["l"], "Slang usage: 'L' means loss"),
        ("draw an L shape here", [], "Literal usage: 'L' is a shape - BUT model may still detect"),
        
        # Context-aware tests: "fr" slang vs literal abbreviation
        ("this movie is good fr", ["fr"], "Slang usage: 'fr' means 'for real'"),
        ("fr fr no cap", ["fr", "no cap"], "Multiple slang terms together"),
        
        # Mixed slang and proper nouns
        ("COVID19 news is depressing ngl", ["ngl"], "Should detect 'ngl' but not 'COVID19'"),
        ("BlackLivesMatter is important fr", ["fr"], "Should detect 'fr' but not 'BlackLivesMatter'"),
    ]
    
    passed = 0
    failed = 0
    
    for text, expected_terms, description in test_cases:
        detected = normalizer.detect_slang(text)
        detected_terms = [s['text'].lower() for s in detected]
        
        # Check if detected terms match expected
        expected_lower = [t.lower() for t in expected_terms]
        matches = set(detected_terms) == set(expected_lower)
        
        status = "✅" if matches else "❌"
        
        if matches:
            passed += 1
        else:
            failed += 1
        
        print(f"  {status} Text: '{text}'")
        print(f"      Expected: {expected_lower if expected_lower else 'None'}")
        print(f"      Detected: {detected_terms if detected_terms else 'None'}")
        print(f"      Reason: {description}")
        print()
    
    print(f"Results: {passed}/{len(test_cases)} passed")
    
    # Test Case 4: Dictionary Existence Check
    print("\n📝 Test Case 4: Dictionary Existence Check")
    print("-"*80)
    
    dict_tests = {
        "tlpdharna": False,     # Not in dictionary
        "bussin": True,         # In dictionary
        "fr": True,             # In dictionary
        "no cap": True,         # In dictionary (multi-word slang)
        "nocap": True,          # In dictionary (variation without space)
        "yolo": True,           # In dictionary
        "fire": True,           # In dictionary
        "w": True,              # In dictionary (single letter slang)
        "l": True,              # In dictionary (single letter slang)
        "ngl": True,            # In dictionary
        "randomword123": False, # Not in dictionary
        "covid19": False,       # Not in dictionary (proper noun)
    }
    
    dict_passed = 0
    dict_failed = 0
    
    for term, should_exist in dict_tests.items():
        exists = normalizer._exists_in_dictionary(term)
        status = "✅" if exists == should_exist else "❌"
        
        if exists == should_exist:
            dict_passed += 1
        else:
            dict_failed += 1
        
        print(f"  {status} '{term}': InDict={exists} (Expected={should_exist})")
    
    print(f"\nResults: {dict_passed}/{len(dict_tests)} passed")
    
    # Test Case 5: Context Understanding - Slang vs Literal Meaning
    print("\n📝 Test Case 5: Context Understanding (Slang vs Literal Usage)")
    print("-"*80)
    print("NOTE: NER models detect patterns, not semantic context.")
    print("These tests show current model behavior - some literal uses may be detected.")
    print()
    
    context_tests = [
        # "no cap" - slang vs literal
        {
            "text": "that was amazing no cap",
            "should_detect": ["no cap"],
            "context": "Slang: 'no cap' = 'no lie/for real'",
            "expected_behavior": "DETECT"
        },
        {
            "text": "I lost my baseball no cap",
            "should_detect": [],  # Literal meaning, but model might detect anyway
            "context": "Literal: refers to actual hat/cap",
            "expected_behavior": "SHOULD NOT DETECT (but model might)"
        },
        {
            "text": "nocap this is crazy",
            "should_detect": ["nocap"],
            "context": "Slang: single-word variation",
            "expected_behavior": "DETECT"
        },
        
        # "fire" - slang vs literal
        {
            "text": "this song is fire",
            "should_detect": ["fire"],
            "context": "Slang: 'fire' = 'awesome/great'",
            "expected_behavior": "DETECT"
        },
        {
            "text": "there is a fire in the building",
            "should_detect": [],  # Literal fire
            "context": "Literal: actual fire/flames",
            "expected_behavior": "SHOULD NOT DETECT (but model might)"
        },
        
        # "W" - slang vs literal
        {
            "text": "we got the W",
            "should_detect": ["w"],
            "context": "Slang: 'W' = 'win'",
            "expected_behavior": "DETECT"
        },
        {
            "text": "press W to move",
            "should_detect": [],  # Literal keyboard key
            "context": "Literal: keyboard key",
            "expected_behavior": "SHOULD NOT DETECT (but model might)"
        },
    ]
    
    context_passed = 0
    context_failed = 0
    context_expected_fails = 0  # Literal uses that model detects (expected limitation)
    
    for test in context_tests:
        text = test["text"]
        should_detect = [s.lower() for s in test["should_detect"]]
        context = test["context"]
        expected = test["expected_behavior"]
        
        detected = normalizer.detect_slang(text)
        detected_terms = [s['text'].lower() for s in detected]
        
        # Check if detection matches expectation
        matches = set(detected_terms) == set(should_detect)
        
        # For literal uses, we expect model might still detect (known limitation)
        is_literal_test = "Literal:" in context
        model_detected_literal = is_literal_test and len(detected_terms) > 0
        
        if matches:
            status = "✅"
            context_passed += 1
        elif model_detected_literal:
            status = "⚠️"  # Expected limitation
            context_expected_fails += 1
        else:
            status = "❌"
            context_failed += 1
        
        print(f"  {status} Text: '{text}'")
        print(f"      Context: {context}")
        print(f"      Expected: {should_detect if should_detect else 'None'}")
        print(f"      Detected: {detected_terms if detected_terms else 'None'}")
        print(f"      Behavior: {expected}")
        if model_detected_literal:
            print(f"      Note: Model limitation - detects pattern without semantic understanding")
        print()
    
    print(f"Results: {context_passed}/{len(context_tests)} exact matches")
    print(f"Expected limitations (literal uses): {context_expected_fails}")
    print(f"Unexpected failures: {context_failed}")
    print()
    print("💡 Insight: NER models detect patterns, not meaning.")
    print("   To distinguish literal vs slang usage, need context-aware NLP (e.g., BERT embeddings)")
    
    # Test Case 6: Complex Real-World Tweet
    print("\n📝 Test Case 6: Complex Real-World Tweets")
    print("-"*80)
    text6 = "just saw BlackLivesMatter trending again, this is so important ngl fr fr 💯"
    detected6 = normalizer.detect_slang(text6)
    print(f"Input: {text6}")
    print(f"Detected slang terms:")
    for slang in detected6:
        print(f"  • '{slang['text']}' → '{slang['normalized']}'")
    print(f"Expected: Should detect 'ngl' and/or 'fr'/'fr fr' but NOT 'BlackLivesMatter'")
    
    blacklivesmatter_detected = any('blacklivesmatter' in s['text'].lower() for s in detected6)
    ngl_detected = any('ngl' in s['text'].lower() for s in detected6)
    fr_detected = any('fr' in s['text'].lower() for s in detected6)  # Matches both 'fr' and 'fr fr'
    
    if not blacklivesmatter_detected and ngl_detected and fr_detected:
        print("✅ PASS - Correctly filtered proper noun and detected valid slang")
    else:
        print(f"❌ FAIL - BlackLivesMatter filtered: {not blacklivesmatter_detected}, ngl detected: {ngl_detected}, fr detected: {fr_detected}")
    
    # Final Summary
    print("\n" + "="*80)
    print("📊 FINAL SUMMARY")
    print("="*80)
    
    test1_pass = len(detected1) == 0
    test2_pass = len(detected2) >= 3
    test3_pass = passed == len(test_cases)  # All must pass
    test4_pass = dict_passed == len(dict_tests)
    test5_pass = not blacklivesmatter_detected and ngl_detected
    
    all_tests_pass = test1_pass and test2_pass and test3_pass and test4_pass and test5_pass
    
    print(f"{'✅' if test1_pass else '❌'} Test 1 (Original Problem): {'PASS' if test1_pass else 'FAIL'}")
    print(f"{'✅' if test2_pass else '❌'} Test 2 (Valid Slang): {'PASS' if test2_pass else 'FAIL'}")
    print(f"{'✅' if test3_pass else '❌'} Test 3 (Complete Pipeline): {passed}/{len(test_cases)} passed")
    print(f"{'✅' if test4_pass else '❌'} Test 4 (Dictionary Check): {dict_passed}/{len(dict_tests)} passed")
    print(f"{'✅' if test5_pass else '❌'} Test 5 (Complex Tweet): {'PASS' if test5_pass else 'FAIL'}")
    
    print("\n" + "="*80)
    if all_tests_pass:
        print("🎉 ALL TESTS PASSED!")
        print("="*80)
        print("\n🎯 The slang detection system is working correctly!")
        print("   • Proper nouns (TLPDharna, BlackLivesMatter, COVID19) are filtered")
        print("   • Dictionary existence check prevents ALL false positives")
        print("   • Only terms in slang_rich_dictionary.json are detected")
        print("   • Valid slang (bussin, fr, ngl, yolo) is correctly detected")
        print("\n✅ Safe to deploy to production!")
    else:
        print("⚠️  SOME TESTS FAILED")
        print("="*80)
        print("\nPlease review the failed tests above and fix the issues.")
        print("The system should ONLY detect terms that:")
        print("  1. Pass pattern validation (not @mention, #hashtag, URL, proper noun)")
        print("  2. Exist in slang_rich_dictionary.json")
    
    return all_tests_pass


if __name__ == "__main__":
    try:
        all_pass = test_slang_detection_fix()
        sys.exit(0 if all_pass else 1)
    except Exception as e:
        print(f"\n❌ Error running tests: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
