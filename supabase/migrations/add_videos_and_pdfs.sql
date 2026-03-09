-- =============================================================================
-- WorldEd: Add Videos and PDF Resources to Calculus Modules
-- Migration: add_videos_and_pdfs.sql
-- Date: 2026-03-06
-- =============================================================================
--
-- This migration does two things:
--   1. Updates modules.youtube_url with the primary embedded video per module
--      (shown in the sidebar iframe on the module page)
--   2. Inserts additional YouTube videos + MIT OCW PDFs into the resources table
--      (shown on the /resources page, filterable by type)
--
-- HOW TO APPLY:
--   Supabase Dashboard → SQL Editor → paste this file → Run
--
-- SAFE TO RE-RUN:
--   UPDATE statements are idempotent.
--   INSERT statements use ON CONFLICT DO NOTHING to avoid duplicates.
--
-- =============================================================================


-- =============================================================================
-- PART 1: Update primary YouTube embed URL per module
-- These are used in the sidebar iframe on the module page (modules.youtube_url).
-- Must use embed format: https://www.youtube.com/embed/<videoId>
-- =============================================================================

-- Module 1: Limits and Continuity
UPDATE modules
SET youtube_url = 'https://www.youtube.com/embed/riXcZT2ICjA'
WHERE course_id = 'calculus'
  AND title ILIKE '%limits%';

-- Module 2: Power and Product Rules
UPDATE modules
SET youtube_url = 'https://www.youtube.com/embed/S2YqR0MKxg4'
WHERE course_id = 'calculus'
  AND title ILIKE '%power%';

-- Module 3: Optimization
UPDATE modules
SET youtube_url = 'https://www.youtube.com/embed/WC6cW1AZpIM'
WHERE course_id = 'calculus'
  AND title ILIKE '%optim%';

-- Module 4: Integration Basics
UPDATE modules
SET youtube_url = 'https://www.youtube.com/embed/rfG8ce4nNh0'
WHERE course_id = 'calculus'
  AND title ILIKE '%integr%';


-- =============================================================================
-- PART 2: Insert additional YouTube videos into resources table
-- These appear on the /resources page (type = 'video').
-- Use watch URLs (not embed) — these are external links, not iframes.
-- subject field identifies the module topic for filtering/display.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Module 1: Limits and Continuity — additional videos
-- ---------------------------------------------------------------------------
INSERT INTO resources (course_id, title, type, url, subject, content_summary)
VALUES
    (
        'calculus',
        'Limits by Direct Substitution',
        'video',
        'https://www.youtube.com/watch?v=YNstP0ESndU',
        'Limits and Continuity',
        'Evaluating limits using direct substitution method'
    ),
    (
        'calculus',
        'Continuity at a Point',
        'video',
        'https://www.youtube.com/watch?v=BRcpKTjLAAg',
        'Limits and Continuity',
        'Understanding continuity and types of discontinuities'
    )
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Module 2: Power and Product Rules — additional videos
-- ---------------------------------------------------------------------------
INSERT INTO resources (course_id, title, type, url, subject, content_summary)
VALUES
    (
        'calculus',
        'Product Rule',
        'video',
        'https://www.youtube.com/watch?v=H39Vwid-dWI',
        'Power and Product Rules',
        'Understanding the product rule with worked examples'
    ),
    (
        'calculus',
        'Quotient Rule',
        'video',
        'https://www.youtube.com/watch?v=7M3yeFv5FgA',
        'Power and Product Rules',
        'Applying the quotient rule to find derivatives'
    )
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Module 3: Optimization — additional videos
-- ---------------------------------------------------------------------------
INSERT INTO resources (course_id, title, type, url, subject, content_summary)
VALUES
    (
        'calculus',
        'Optimization: Maximum Area',
        'video',
        'https://www.youtube.com/watch?v=N9ag-P03fKk',
        'Optimization',
        'Real-world optimization example finding maximum enclosed area'
    )
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Module 4: Integration Basics — additional videos
-- ---------------------------------------------------------------------------
INSERT INTO resources (course_id, title, type, url, subject, content_summary)
VALUES
    (
        'calculus',
        'Indefinite Integrals',
        'video',
        'https://www.youtube.com/watch?v=rCWOdfQ3cwQ',
        'Integration Basics',
        'Introduction to antiderivatives and indefinite integrals'
    ),
    (
        'calculus',
        'Fundamental Theorem of Calculus',
        'video',
        'https://www.youtube.com/watch?v=Tqnq4jOhVBw',
        'Integration Basics',
        'Understanding the connection between derivatives and integrals'
    )
ON CONFLICT DO NOTHING;


-- =============================================================================
-- PART 3: Insert MIT OCW PDF resources
-- These appear on the /resources page (type = 'pdf').
-- URLs point to the MIT OCW lecture notes pages.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Module 1: Limits and Continuity — PDFs
-- ---------------------------------------------------------------------------
INSERT INTO resources (course_id, title, type, url, subject, content_summary)
VALUES
    (
        'calculus',
        'MIT OCW 18.01 — Lecture 2: Limits',
        'pdf',
        'https://ocw.mit.edu/courses/18-01sc-single-variable-calculus-fall-2010/resources/mit18_01scf10_lec02/',
        'Limits and Continuity',
        'MIT lecture notes introducing the formal definition of limits with worked examples'
    ),
    (
        'calculus',
        'MIT OCW 18.01 — Lecture 3: Continuity',
        'pdf',
        'https://ocw.mit.edu/courses/18-01sc-single-variable-calculus-fall-2010/resources/mit18_01scf10_lec03/',
        'Limits and Continuity',
        'MIT lecture notes covering continuity, types of discontinuities, and the Intermediate Value Theorem'
    )
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Module 2: Power and Product Rules — PDFs
-- ---------------------------------------------------------------------------
INSERT INTO resources (course_id, title, type, url, subject, content_summary)
VALUES
    (
        'calculus',
        'MIT OCW 18.01 — Lecture 6: Derivative Rules',
        'pdf',
        'https://ocw.mit.edu/courses/18-01sc-single-variable-calculus-fall-2010/resources/mit18_01scf10_lec06/',
        'Power and Product Rules',
        'MIT lecture notes on the product rule, quotient rule, and higher-order derivatives'
    ),
    (
        'calculus',
        'MIT OCW 18.01 — Lecture 7: Chain Rule',
        'pdf',
        'https://ocw.mit.edu/courses/18-01sc-single-variable-calculus-fall-2010/resources/mit18_01scf10_lec07/',
        'Power and Product Rules',
        'MIT lecture notes covering the chain rule for composite functions with examples'
    )
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Module 3: Optimization — PDFs
-- ---------------------------------------------------------------------------
INSERT INTO resources (course_id, title, type, url, subject, content_summary)
VALUES
    (
        'calculus',
        'MIT OCW 18.01 — Lecture 10: Optimization Problems',
        'pdf',
        'https://ocw.mit.edu/courses/18-01sc-single-variable-calculus-fall-2010/resources/mit18_01scf10_lec10/',
        'Optimization',
        'MIT lecture notes on setting up and solving optimization problems using calculus'
    ),
    (
        'calculus',
        'MIT OCW 18.01 — Lecture 11: Applied Optimization',
        'pdf',
        'https://ocw.mit.edu/courses/18-01sc-single-variable-calculus-fall-2010/resources/mit18_01scf10_lec11/',
        'Optimization',
        'MIT lecture notes applying optimization to real-world problems in geometry and physics'
    )
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Module 4: Integration Basics — PDFs
-- ---------------------------------------------------------------------------
INSERT INTO resources (course_id, title, type, url, subject, content_summary)
VALUES
    (
        'calculus',
        'MIT OCW 18.01 — Lecture 18: Antiderivatives',
        'pdf',
        'https://ocw.mit.edu/courses/18-01sc-single-variable-calculus-fall-2010/resources/mit18_01scf10_lec18/',
        'Integration Basics',
        'MIT lecture notes introducing antiderivatives and the indefinite integral with integration rules'
    ),
    (
        'calculus',
        'MIT OCW 18.01 — Lecture 19: Fundamental Theorem of Calculus',
        'pdf',
        'https://ocw.mit.edu/courses/18-01sc-single-variable-calculus-fall-2010/resources/mit18_01scf10_lec19/',
        'Integration Basics',
        'MIT lecture notes on the Fundamental Theorem of Calculus and the definite integral'
    )
ON CONFLICT DO NOTHING;


-- =============================================================================
-- PART 4: Fix any existing quiz_attempts with 133% scores (if applicable)
-- The double-counting bug produced scores > 100% on 3-question quizzes.
-- This caps any existing quizScore values at 100 in user_progress.
-- =============================================================================

UPDATE user_progress
SET quiz_score = 100
WHERE quiz_score > 100;


-- =============================================================================
-- VERIFICATION QUERIES
-- Run these after applying to confirm everything worked.
-- =============================================================================

-- Check module youtube_url updates:
-- SELECT title, youtube_url FROM modules WHERE course_id = 'calculus' ORDER BY order_index;
--
-- Expected:
--   Limits and Continuity   | https://www.youtube.com/embed/riXcZT2ICjA
--   Power and Product Rules | https://www.youtube.com/embed/S2YqR0MKxg4
--   Optimization            | https://www.youtube.com/embed/WC6cW1AZpIM
--   Integration Basics      | https://www.youtube.com/embed/rfG8ce4nNh0

-- Check resource inserts:
-- SELECT title, type, subject FROM resources WHERE course_id = 'calculus' ORDER BY subject, type;
--
-- Expected: 13 rows (5 videos + 8 PDFs) plus any pre-existing resources

-- Check no scores above 100 remain:
-- SELECT COUNT(*) FROM user_progress WHERE quiz_score > 100;
-- Expected: 0
