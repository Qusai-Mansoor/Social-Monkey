# Overview Dashboard Testing Guide

## Quick Start Testing

### 1. Start the Backend Server

```bash
cd "d:\!Fast\!Semester 7\FYP\Social-Monkey\backend"
python main.py
```

Expected output:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

### 2. Access the Dashboard

Open browser and navigate to:
```
http://localhost:8000/dashboard#overview
```

Or if using port 4000:
```
http://localhost:4000/dashboard#overview
```

### 3. Visual Verification Checklist

Print this checklist and mark off each item as you verify:

#### Header Section
- [ ] "Dashboard Overview" title visible
- [ ] "Track your social media performance" subtitle visible
- [ ] Refresh button present with icon
- [ ] "Run AI Analysis" button present (if applicable)

#### 4 Stat Cards (Top Row)
- [ ] **Total Posts** card shows number
- [ ] **Total Engagement** card shows number (with K/M suffix if applicable)
- [ ] **Avg Emotion Score** card shows percentage
- [ ] **Flagged Posts** card shows number
- [ ] All cards have icons displayed
- [ ] Hover effect works (slight lift)
- [ ] Cards arranged in grid (4 columns on desktop)

#### Quick Access Section
- [ ] "Quick Access" heading visible
- [ ] 3 navigation cards displayed

**Emotion Analytics Card:**
- [ ] Purple icon (smiley face)
- [ ] "Emotion Analytics" title
- [ ] "View detailed emotion breakdowns and trends" description
- [ ] Right arrow icon
- [ ] Hover effect works (lift + arrow slide)
- [ ] **TEST:** Click → should navigate to `#emotion-analysis`

**Negative Triggers Card:**
- [ ] Red icon (alert circle)
- [ ] "Negative Triggers" title
- [ ] "Identify and analyze negative sentiment triggers" description
- [ ] Right arrow icon
- [ ] Hover effect works
- [ ] **TEST:** Click → should navigate to `#negative-triggers`

**Content Heatmaps Card:**
- [ ] Cyan icon (grid)
- [ ] "Content Heatmaps" title
- [ ] "Discover optimal posting times and patterns" description
- [ ] Right arrow icon
- [ ] Hover effect works
- [ ] **TEST:** Click → should navigate to `#heatmap`

#### Charts Row
- [ ] Two chart cards displayed side by side

**Emotion Distribution Chart:**
- [ ] "Emotion Distribution" title
- [ ] "Last 30 days" period label
- [ ] Pie/doughnut chart rendered
- [ ] Chart shows emotion colors
- [ ] Legend visible (if applicable)

**Top Gen-Z Slang Terms Chart:**
- [ ] "Top Gen-Z Slang Terms" title
- [ ] "Most used" period label
- [ ] Bar chart rendered OR empty state ("No slang terms detected yet")
- [ ] If data exists: bars with labels

#### Top Performing Posts Section
- [ ] "Top Performing Posts" heading
- [ ] "View All" link on right
- [ ] Posts grid displayed

**For Each Post Card:**
- [ ] Platform badge (Twitter/Instagram)
- [ ] Post date (e.g., "2 days ago")
- [ ] Post content (truncated to 120 chars)

**Top 3 Emotions Section (if data exists):**
- [ ] "Top Emotions Detected:" label
- [ ] 3 emotion bars displayed
- [ ] Each bar has: icon + name + percentage
- [ ] Progress bars show correct width (matching percentage)
- [ ] Colors match emotion type

**Post Stats:**
- [ ] ❤️ Likes count
- [ ] 🔄 Retweets count
- [ ] 💬 Replies count

**Dominant Emotion (Bottom of Card):**
- [ ] "Dominant Emotion:" label
- [ ] Emotion badge with icon
- [ ] Emotion name capitalized
- [ ] Sentiment score percentage
- [ ] Badge color matches emotion

**Empty State (if no posts):**
- [ ] 📝 Icon displayed
- [ ] "No posts yet" message
- [ ] Description text
- [ ] "Connect Accounts" button

#### Bottom Stats Section
- [ ] 3 stat boxes displayed in row

**Slang Detected:**
- [ ] Purple icon (message bubble)
- [ ] Number value
- [ ] "Slang Detected" label

**Emoji Used:**
- [ ] Yellow icon (smiley)
- [ ] Number value
- [ ] "Emoji Used" label

**Active Alerts:**
- [ ] Red icon (warning triangle)
- [ ] Number value
- [ ] "Active Alerts" label

### 4. Interaction Testing

#### Navigation Cards
1. Click "Emotion Analytics"
   - [ ] URL changes to `#emotion-analysis`
   - [ ] Emotion dashboard loads
   - [ ] No errors in console

2. Navigate back to Overview (`#overview`)
   - [ ] Overview dashboard reloads
   - [ ] All components render again

3. Click "Negative Triggers"
   - [ ] URL changes to `#negative-triggers`
   - [ ] Negative Triggers dashboard loads

4. Navigate back and click "Content Heatmaps"
   - [ ] URL changes to `#heatmap`
   - [ ] Heatmap dashboard loads

#### Refresh Functionality
1. Click the Refresh button
   - [ ] Dashboard reloads
   - [ ] Data refreshes
   - [ ] No errors in console
   - [ ] All components re-render correctly

### 5. Data Validation Testing

#### Check Browser Console

Open Developer Tools (F12) → Console tab:

1. Look for data loading logs:
```
Overview data loaded: {total_posts: X, avg_engagement: Y, ...}
Emotion data loaded: {breakdown: {...}, avg_sentiment_score: Z}
```

2. Verify no errors (red text)

#### Validate Stat Card Values

**Total Posts:**
- [ ] Number matches data in console log
- [ ] Shows "0" if no data

**Total Engagement:**
- [ ] Number is formatted (e.g., "1.2K" for 1200)
- [ ] Shows "0.0" if no data

**Avg Emotion Score:**
- [ ] Percentage between 0-100%
- [ ] Color is:
  - Green if >= 70%
  - Yellow if >= 50%
  - Red if < 50%

**Flagged Posts:**
- [ ] Count equals sum of negative emotions
- [ ] Calculation: anger + annoyance + disappointment + disapproval + disgust + embarrassment + fear + grief + nervousness + remorse + sadness

#### Validate Bottom Stats

**Slang Detected:**
- [ ] Count matches `slangData.top_terms.length`
- [ ] Check in console: `slangData`

**Emoji Used:**
- [ ] Count matches total emojis in top posts
- [ ] Manually count emojis in post content to verify

**Active Alerts:**
- [ ] Same number as "Flagged Posts" stat card
- [ ] Represents negative emotion posts

#### Validate Top 3 Emotions

For each post with emotion data:

1. Open browser console
2. Run: `window.overviewDashboard.data.topPosts[0].emotion_scores`
3. Verify top 3 emotions match highest scores
4. Verify percentages are correct (score * 100)

### 6. Responsive Design Testing

#### Desktop (>1024px)
- [ ] Stats grid: 4 columns
- [ ] Navigation cards: 3 columns
- [ ] Charts row: 2 columns side-by-side
- [ ] Posts grid: 3 columns
- [ ] Bottom stats: 3 columns

#### Tablet (768px - 1024px)
- [ ] Stats grid: 2 columns
- [ ] Navigation cards: 2 columns (3rd wraps)
- [ ] Charts row: 2 columns
- [ ] Posts grid: 2 columns
- [ ] Bottom stats: 2 columns (3rd wraps)

#### Mobile (<768px)
- [ ] All grids: 1 column (stacked)
- [ ] Text remains readable
- [ ] Touch targets adequate (min 44px)
- [ ] Hover states work on tap
- [ ] Horizontal scroll not present

**Test on devices:**
- [ ] Chrome Desktop (F12 → Toggle Device Toolbar)
- [ ] Firefox Responsive Design Mode
- [ ] Safari (if available)
- [ ] Real mobile device (optional)

### 7. Performance Testing

#### Page Load Time
1. Open Network tab in DevTools
2. Hard refresh (Ctrl+Shift+R)
3. Check:
   - [ ] Total load time < 3 seconds
   - [ ] API calls complete < 1 second
   - [ ] Charts render smoothly

#### Animation Performance
- [ ] Hover effects smooth (no jank)
- [ ] Progress bars animate smoothly
- [ ] Navigation transitions smooth
- [ ] No layout shift during load

### 8. Edge Cases Testing

#### No Data Scenarios

**Test 1: Fresh Database**
1. Empty database (no posts)
2. Expected:
   - [ ] All stat cards show "0"
   - [ ] Empty state message in Top Posts
   - [ ] "No slang terms detected" in chart
   - [ ] Bottom stats all show "0"

**Test 2: Posts Without Emotions**
1. Posts exist but `emotion_scores` is null
2. Expected:
   - [ ] Post cards display without top 3 emotions section
   - [ ] Dominant emotion shows "neutral" or default

**Test 3: Very Large Numbers**
1. Mock data with large values
2. Expected:
   - [ ] Formats with K: 1,234 → "1.2K"
   - [ ] Formats with M: 1,234,567 → "1.2M"

#### Error Scenarios

**Test 1: API Failure**
1. Stop backend server
2. Refresh dashboard
3. Expected:
   - [ ] Error state displays
   - [ ] "Failed to Load Dashboard" message
   - [ ] Retry button present
   - [ ] No console errors crash page

**Test 2: Invalid Data**
1. Backend returns malformed JSON
2. Expected:
   - [ ] Graceful fallback to empty state
   - [ ] No JavaScript errors
   - [ ] Page remains functional

### 9. Browser Compatibility

Test on multiple browsers:

**Chrome (Latest):**
- [ ] All features work
- [ ] Animations smooth
- [ ] Charts render correctly

**Firefox (Latest):**
- [ ] All features work
- [ ] Emoji regex works
- [ ] CSS Grid layout correct

**Safari (if available):**
- [ ] All features work
- [ ] Icons display correctly
- [ ] Gradients render properly

**Edge (Latest):**
- [ ] All features work
- [ ] Performance good
- [ ] No compatibility warnings

### 10. Console Error Check

Final verification - check for ANY errors:

1. Open Console (F12)
2. Filter: All levels
3. Look for:
   - [ ] ❌ No red errors
   - [ ] ⚠️ No critical warnings
   - [ ] ℹ️ Info logs OK (data loaded logs expected)

### 11. Accessibility Testing

Basic accessibility checks:

- [ ] All interactive elements keyboard accessible (Tab navigation)
- [ ] Focus indicators visible
- [ ] Color contrast sufficient (text readable)
- [ ] Icons have semantic meaning (not just decorative)
- [ ] Alt text present where needed

### 12. Final Verification

#### Figma Design Match

Compare with Figma screenshots:

- [ ] Stat cards layout matches
- [ ] Navigation cards layout matches
- [ ] Top posts emotion display matches
- [ ] Bottom stats boxes match
- [ ] Colors match design
- [ ] Spacing and padding correct
- [ ] Typography matches

#### Feature Completeness

- [ ] ✅ 4 stat cards implemented
- [ ] ✅ 3 navigation cards implemented
- [ ] ✅ Top 3 emotions in posts
- [ ] ✅ Dominant emotion badge
- [ ] ✅ Bottom stats section
- [ ] ✅ Quick Actions removed
- [ ] ✅ All hover effects work
- [ ] ✅ Responsive design complete

## Debugging Tips

### Issue: Navigation cards not routing

**Check:**
```javascript
// In browser console:
document.getElementById('nav-emotion-analytics')
// Should return: <div class="nav-card emotion-analytics" id="nav-emotion-analytics">
```

**Fix:** Verify event listeners attached in `attachEventListeners()`

### Issue: Top 3 emotions not showing

**Check:**
```javascript
// In browser console:
const post = window.overviewDashboard.data.topPosts[0];
console.log(post.emotion_scores);
// Should show object with emotions and scores
```

**Fix:** Verify database has `emotion_scores` JSON field populated

### Issue: Flagged posts count wrong

**Verify calculation:**
```javascript
// In browser console:
const emotionData = window.overviewDashboard.data.emotionData;
const negatives = ['anger', 'annoyance', 'disappointment', /* ... */];
let sum = 0;
negatives.forEach(e => sum += emotionData.breakdown[e] || 0);
console.log('Expected flagged:', sum);
```

### Issue: CSS not loading

**Check file path:**
1. View page source
2. Find: `<link rel="stylesheet" href="/static/css/dashboard-components.css">`
3. Click link - should load CSS file
4. Verify new styles present at bottom

### Issue: Charts not rendering

**Check Chart.js loaded:**
```javascript
// In browser console:
console.log(typeof Chart);
// Should return: "function"
```

**Check canvas elements:**
```javascript
document.getElementById('emotionChart');
document.getElementById('slangChart');
// Should return canvas elements
```

## Success Criteria

✅ **PASS** if:
- All visual elements match Figma design
- All interactions work (clicks, hovers)
- Data displays correctly
- No console errors
- Responsive on all screen sizes
- Performance is smooth

❌ **FAIL** if:
- Missing any major component
- JavaScript errors in console
- Navigation not working
- Data calculation incorrect
- Broken on mobile/tablet

## Reporting Issues

If you find issues, document:

1. **What:** Description of the issue
2. **Where:** Which component/section
3. **Steps:** How to reproduce
4. **Expected:** What should happen
5. **Actual:** What actually happens
6. **Screenshots:** Visual evidence
7. **Console:** Any error messages

Example issue report:
```
ISSUE: Navigation card not routing
WHERE: Emotion Analytics card
STEPS:
  1. Load dashboard
  2. Click "Emotion Analytics" card
EXPECTED: Navigate to #emotion-analysis
ACTUAL: Nothing happens
CONSOLE: TypeError: Cannot read property 'hash' of undefined
```

## Testing Complete ✅

Date: _______________________

Tester: _____________________

Overall Status: ⬜ PASS  ⬜ FAIL

Notes:
_________________________________
_________________________________
_________________________________
