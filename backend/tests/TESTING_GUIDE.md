# Social Monkey Testing Guide

Quick guide for running tests and generating presentation reports.

---

## Quick Start

### Run Tests with Coverage

```powershell
cd "d:\!Fast\!Semester 7\FYP\Social-Monkey\backend"
pytest --cov=app --cov-report=html --cov-report=term
```

### Generate Presentation Report

```powershell
cd tests
uv run python generate_presentation_report.py
```

---

## Test Overview

**83 Tests** covering:

- ✅ Authentication & Authorization (25 tests)
- ✅ Text Preprocessing (20 tests)
- ✅ Emotion Analysis (22 tests)
- ✅ Slang Detection (16 tests)

**Coverage: 46%** | **Execution Time: 28.26s**

---

## Prerequisites

- Python 3.13.2+
- **uv** package manager
- Dependencies: `pytest`, `pytest-cov`, `pytest-asyncio`

---

## Running Tests

### Run All Tests

```powershell
uv run pytest
```

### Run with Coverage

```powershell
uv run pytest --cov=app --cov-report=html --cov-report=term
```

### Run Specific Test File

```powershell
uv run pytest tests/test_auth.py
uv run pytest tests/test_emotion_engine.py
```

### Run Specific Test

```powershell
uv run pytest tests/test_auth.py::TestPasswordHashing::test_password_hashing
```

---

## Generating Presentation Reports

### Step 1: Run Tests with Coverage

```powershell
cd "d:\!Fast\!Semester 7\FYP\Social-Monkey\backend"
pytest --cov=app --cov-report=html --cov-report=term > tests/test_execution_report.txt
```

### Step 2: Generate Visual Report

```powershell
cd tests
uv run python generate_presentation_report.py
```

**Output:** `Tests_report.html` with interactive charts and metrics.

### Updating Reports

The report is **static** - to update with new tests:

1. Run tests with coverage (updates `htmlcov/` folder)
2. Re-run `generate_presentation_report.py`

---

## Test Structure

```
backend/
├── tests/
│   ├── test_auth.py                   # Authentication (25 tests)
│   ├── test_preprocessing.py          # Text preprocessing (20 tests)
│   ├── test_emotion_engine.py         # Emotion analysis (22 tests)
│   ├── test_slang_detector.py         # Slang detection (16 tests)
│   ├── generate_presentation_report.py # Report generator
│   └── conftest.py                    # Fixtures
├── htmlcov/                           # Coverage HTML files
└── pytest.ini                         # Pytest config
```

---

## Understanding Results

### Successful Run

```
============================= test session starts ==============================
collected 83 items
tests/test_auth.py .........................                        [ 30%]
tests/test_emotion_engine.py ......................                 [ 57%]
tests/test_preprocessing.py ....................                    [ 81%]
tests/test_slang_detector.py ................                      [100%]
============================== 83 passed in 28.26s =============================
```

### Symbols

- `.` = Passed
- `F` = Failed
- `E` = Error
- `s` = Skipped

---

## Coverage Reports

### HTML Report

```powershell
pytest --cov=app --cov-report=html
start htmlcov/index.html
```

### Terminal Report

```powershell
pytest --cov=app --cov-report=term-missing
```

**Current Coverage:**

- Total Statements: 1166
- Covered: 537
- Coverage: 46%

---

## Troubleshooting

### ModuleNotFoundError

Run from backend directory:

```powershell
cd "d:\!Fast\!Semester 7\FYP\Social-Monkey\backend"
```

### Slow Tests

Run specific files instead of all tests:

```powershell
uv run pytest tests/test_auth.py
```

### Report Generation Issues

Ensure `htmlcov/` exists:

```powershell
pytest --cov=app --cov-report=html
```

---

## Quick Reference

### Most Common Commands

```powershell
# Run all tests with coverage
pytest --cov=app --cov-report=html -v

# Generate presentation report
cd tests; uv run python generate_presentation_report.py

# Run specific tests
pytest tests/test_auth.py -v

# View coverage
start htmlcov/index.html
```

---

**Last Updated:** December 8, 2025  
**Project:** Social Monkey  
**Tests:** 83 | **Coverage:** 46% | **Framework:** pytest
