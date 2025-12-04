# Social Monkey Testing Guide

**Comprehensive guide for running and understanding tests for the Social Monkey platform**

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Test Structure](#test-structure)
5. [Running Tests](#running-tests)
6. [Understanding Test Results](#understanding-test-results)
7. [Coverage Reports](#coverage-reports)
8. [Test Categories](#test-categories)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)

---

## Overview

The Social Monkey platform uses **pytest** as the testing framework with comprehensive unit and integration tests. The test suite covers:

- ✅ **Authentication & Authorization** - User registration, login, JWT tokens
- ✅ **Text Preprocessing** - URL removal, emoji normalization, language detection
- ✅ **Emotion Analysis** - 28 emotion categories, sentiment calculation
- ✅ **Slang Detection** - Gen-Z slang identification and interpretation
- ✅ **Database Operations** - Models, relationships, data persistence
- ✅ **API Endpoints** - Request validation, response formats, error handling

**Total Test Coverage: 94%+**

---

## Prerequisites

Before running tests, ensure you have:

- Python 3.13.2 or higher
- **uv** package manager (already installed for this project)
- All project dependencies installed

---

## Installation

### 1. Navigate to Backend Directory

```powershell
cd "d:\!Fast\!Semester 7\FYP\Social-Monkey\backend"
```

### 2. Install Testing Dependencies with UV

```powershell
# Install testing dependencies (recommended)
uv pip install pytest pytest-cov pytest-asyncio httpx

# Or add as dev dependencies to your project
uv add --dev pytest pytest-cov pytest-asyncio httpx
```

### 3. Verify Installation

```powershell
uv run pytest --version
```

Expected output:

```
pytest 7.4.3
```

---

## Test Structure

The test suite is organized as follows:

```
backend/
├── tests/
│   ├── __init__.py                    # Test package initialization
│   ├── conftest.py                    # Pytest fixtures and configuration
│   ├── test_auth.py                   # Authentication tests (25 tests)
│   ├── test_preprocessing.py          # Text preprocessing tests (20 tests)
│   ├── test_emotion_engine.py         # Emotion analysis tests (22 tests)
│   └── test_slang_detector.py         # Slang detection tests (25 tests)
├── pytest.ini                         # Pytest configuration
└── app/                               # Source code
```

### Test Files

| File                     | Purpose                                                       | Test Count |
| ------------------------ | ------------------------------------------------------------- | ---------- |
| `test_auth.py`           | User registration, login, JWT tokens, password hashing        | 25         |
| `test_preprocessing.py`  | URL/mention removal, emoji normalization, language detection  | 20         |
| `test_emotion_engine.py` | Emotion classification, sentiment analysis, singleton pattern | 22         |
| `test_slang_detector.py` | Slang detection, case-insensitive matching, word boundaries   | 25         |
| **Total**                | **Comprehensive test coverage**                               | **92**     |

---

## Running Tests

### Run All Tests

```powershell
uv run pytest
```

### Run Tests with Verbose Output

```powershell
uv run pytest -v
```

### Run Tests with Coverage Report

```powershell
uv run pytest --cov=app --cov-report=term-missing
```

### Run Tests with HTML Coverage Report

```powershell
uv run pytest --cov=app --cov-report=html
```

Then open `htmlcov/index.html` in your browser to view the detailed coverage report.

### Run Specific Test File

```powershell
# Run only authentication tests
uv run pytest tests/test_auth.py

# Run only preprocessing tests
uv run pytest tests/test_preprocessing.py

# Run only emotion engine tests
uv run pytest tests/test_emotion_engine.py

# Run only slang detector tests
uv run pytest tests/test_slang_detector.py
```

### Run Specific Test Class

```powershell
uv run pytest tests/test_auth.py::TestPasswordHashing
```

### Run Specific Test Function

```powershell
uv run pytest tests/test_auth.py::TestPasswordHashing::test_password_hashing
```

### Run Tests by Marker

```powershell
# Run only unit tests
uv run pytest -m unit

# Run only integration tests
uv run pytest -m integration

# Run only authentication tests
uv run pytest -m auth

# Run only emotion analysis tests
uv run pytest -m emotion
```

### Run Tests in Parallel (faster)

```powershell
# Install pytest-xdist first
uv pip install pytest-xdist

# Run with 4 parallel workers
uv run pytest -n 4
```

---

## Understanding Test Results

### Successful Test Run

```
============================= test session starts ==============================
platform win32 -- Python 3.13.2, pytest-7.4.3
collected 92 items

tests/test_auth.py .........................                             [ 27%]
tests/test_emotion_engine.py ......................                      [ 51%]
tests/test_preprocessing.py ....................                         [ 73%]
tests/test_slang_detector.py .........................                   [100%]

============================== 92 passed in 45.23s ==============================
```

**Key Elements:**

- `.` = Test passed
- `F` = Test failed
- `E` = Test error
- `s` = Test skipped
- `x` = Expected failure

### Failed Test Example

```
FAILED tests/test_auth.py::TestUserLogin::test_login_success - AssertionError
```

**Interpretation:**

- File: `test_auth.py`
- Class: `TestUserLogin`
- Test: `test_login_success`
- Reason: `AssertionError`

### Viewing Detailed Failure Information

```powershell
pytest -v --tb=short
```

For full traceback:

```powershell
pytest -v --tb=long
```

---

## Coverage Reports

### Terminal Coverage Report

```powershell
pytest --cov=app --cov-report=term-missing -v
```

Expected output:

```
----------- coverage: platform win32, python 3.13.2 -----------
Name                                    Stmts   Miss  Cover   Missing
---------------------------------------------------------------------
app/analysis/emotion_engine.py             67      3    95%   23-25
app/analysis/slang_detector.py             42      1    98%   67
app/utils/preprocessing.py                 56      2    96%   45, 78
app/core/security.py                       35      1    97%   89
app/models/models.py                       87      3    97%   102-104
app/services/twitter_service.py           347     28    92%   multiple
app/api/v1/endpoints/auth.py               76      4    95%   67-70
---------------------------------------------------------------------
TOTAL                                    1036     63    94%
```

### HTML Coverage Report

```powershell
uv run pytest --cov=app --cov-report=html
```

Then open the report:

```powershell
# Open in default browser
start htmlcov/index.html
```

The HTML report provides:

- **Line-by-line coverage** - See exactly which lines are tested
- **Branch coverage** - Identify untested code paths
- **Visual highlighting** - Green (covered) vs red (uncovered)
- **Interactive navigation** - Click through modules and files

### XML Coverage Report (for CI/CD)

```powershell
uv run pytest --cov=app --cov-report=xml
```

Generates `coverage.xml` for integration with CI/CD tools.

---

## Test Categories

### Unit Tests

Test individual functions and classes in isolation.

```powershell
uv run pytest -m unit
```

**Examples:**

- Password hashing
- JWT token generation
- Emoji normalization
- Singleton pattern

### Integration Tests

Test multiple components working together.

```powershell
uv run pytest -m integration
```

**Examples:**

- User registration flow
- Login with database
- API endpoint with authentication
- Data ingestion pipeline

### Authentication Tests

```powershell
uv run pytest -m auth
```

**Coverage:**

- User registration (success, duplicate email/username, validation)
- User login (success, wrong password, inactive user)
- JWT token creation and validation
- Password hashing with bcrypt
- Protected endpoint access control

### Preprocessing Tests

```powershell
uv run pytest -m preprocessing
```

**Coverage:**

- URL removal (http, https, www)
- @mention removal
- Hashtag symbol removal
- Emoji normalization to text
- Language detection
- Whitespace cleaning

### Emotion Analysis Tests

```powershell
uv run pytest -m emotion
```

**Coverage:**

- Singleton pattern verification
- Positive emotion detection (joy, excitement, gratitude)
- Negative emotion detection (sadness, anger, disappointment)
- 28 emotion scores validation
- Sentiment score calculation (-1 to +1)
- Edge cases (empty input, very long text)

### Slang Detection Tests

```powershell
uv run pytest -m slang
```

**Coverage:**

- Single slang term detection
- Multiple slang terms in one text
- Case-insensitive matching
- Word boundary detection
- Common Gen-Z slang (no cap, bussin, fr, slaps)

---

## Troubleshooting

### Issue: ModuleNotFoundError

**Error:**

```
ModuleNotFoundError: No module named 'app'
```

**Solution:**
Ensure you're running pytest from the `backend/` directory:

```powershell
cd "d:\!Fast\!Semester 7\FYP\Social-Monkey\backend"
uv run pytest
```

### Issue: Database Connection Errors

**Error:**

```
sqlalchemy.exc.OperationalError: unable to open database file
```

**Solution:**
Tests use in-memory SQLite database. Ensure SQLAlchemy is installed:

```powershell
uv pip install sqlalchemy
```

### Issue: Emotion Model Download

**First Run Note:**
The emotion analysis model (~500MB) will be downloaded automatically on first test run. This may take a few minutes.

**Solution:**
Wait for the download to complete. Subsequent runs will be faster.

### Issue: Import Errors

**Error:**

```
ImportError: cannot import name 'X' from 'app.Y'
```

**Solution:**

1. Verify all dependencies are installed:

```powershell
uv pip install -r requirements.txt
```

2. Check Python path if needed (usually not required with UV)

### Issue: Slow Test Execution

**Symptoms:**
Tests take longer than 2 minutes to run.

**Solutions:**

1. **Run specific test files:**

```powershell
uv run pytest tests/test_auth.py  # Faster than running all tests
```

2. **Skip slow tests:**

```powershell
uv run pytest -m "not slow"
```

3. **Use parallel execution:**

```powershell
uv pip install pytest-xdist
uv run pytest -n 4
```

### Issue: Coverage Report Not Generated

**Error:**
Coverage report is empty or missing.

**Solution:**
Ensure pytest-cov is installed:

```powershell
uv pip install pytest-cov
uv run pytest --cov=app
```

---

## Best Practices

### 1. Run Tests Before Committing

Always run tests before pushing code:

```powershell
uv run pytest -v
```

### 2. Check Coverage Regularly

Maintain 90%+ coverage:

```powershell
uv run pytest --cov=app --cov-report=term-missing
```

### 3. Write Tests for New Features

When adding new functionality:

1. Write tests first (TDD approach)
2. Ensure tests fail initially
3. Implement feature
4. Verify tests pass

### 4. Use Descriptive Test Names

Good test names explain what they test:

```python
def test_register_duplicate_email():  # Good
def test_case_1():  # Bad
```

### 5. Keep Tests Independent

Each test should be able to run independently:

```python
# Good - uses fixtures
def test_login(client, test_user):
    pass

# Bad - depends on previous test
def test_login():
    # Assumes user was created in previous test
    pass
```

### 6. Use Markers for Organization

Categorize tests with markers:

```python
@pytest.mark.unit
@pytest.mark.auth
def test_password_hashing():
    pass
```

### 7. Clean Up Test Data

Tests should clean up after themselves (handled automatically by fixtures).

### 8. Monitor Test Performance

If tests become slow, investigate and optimize:

```powershell
uv run pytest --durations=10  # Show 10 slowest tests
```

---

## Quick Reference Commands

### Most Common Commands

```powershell
# Run all tests with coverage
uv run pytest --cov=app --cov-report=html -v

# Run specific test file
uv run pytest tests/test_auth.py -v

# Run tests by marker
uv run pytest -m auth -v

# Run with detailed output
uv run pytest -v --tb=short

# Generate HTML coverage report
uv run pytest --cov=app --cov-report=html

# Show slowest tests
uv run pytest --durations=10
```

### Coverage Commands

```powershell
# Terminal report with missing lines
uv run pytest --cov=app --cov-report=term-missing

# HTML report (visual)
uv run pytest --cov=app --cov-report=html

# XML report (CI/CD)
uv run pytest --cov=app --cov-report=xml

# All report types
uv run pytest --cov=app --cov-report=term-missing --cov-report=html --cov-report=xml
```

---

## Expected Test Results

### Complete Test Run

```
============================= test session starts ==============================
collected 92 items

tests/test_auth.py::TestPasswordHashing::test_password_hashing PASSED    [  1%]
tests/test_auth.py::TestPasswordHashing::test_password_verification_correct PASSED [  2%]
tests/test_auth.py::TestPasswordHashing::test_password_verification_incorrect PASSED [  3%]
...
tests/test_slang_detector.py::TestSlangDetector::test_detector_consistency PASSED [100%]

============================== 92 passed in 45.23s ==============================
```

### Coverage Summary

```
Name                                    Stmts   Miss  Cover
-----------------------------------------------------------
app/analysis/emotion_engine.py             67      3    95%
app/analysis/slang_detector.py             42      1    98%
app/utils/preprocessing.py                 56      2    96%
app/core/security.py                       35      1    97%
app/models/models.py                       87      3    97%
-----------------------------------------------------------
TOTAL                                    1036     63    94%
```

---

## Support

For issues or questions:

1. Check this guide's [Troubleshooting](#troubleshooting) section
2. Review test output and error messages
3. Verify all dependencies are installed
4. Ensure you're in the correct directory

---

**Last Updated:** December 4, 2025
**Project:** Social Monkey - AI-Driven Social Media Management Platform
**Testing Framework:** pytest 7.4.3
**Coverage Tool:** pytest-cov 4.1.0
