# Adjustable Difficulty MCQ Generator — AMC / INI-CET / NEET PG

Generated 2026-10-24. All three JSON files are standalone; upload any file to another model/app.

## Editable controls
In each JSON: difficulty_engine.config.difficulty_level
1 = Foundation | 2 = Standard | 3 = Hard | 4 = Very hard | 5 = Extreme

Optional: difficulty_engine.config.difficulty_intensity (0..100; finer adjustment within the chosen level).
mode = "exam_faithful" or "challenge" or "adaptive_practice"
topic = "mixed" or name a subject; question_count = how many; delivery = "one_by_one".

e.g. difficulty_level 5, difficulty_intensity 90, mode challenge, topic Cardiology, question_count 20.

## Read and enforce
The destination LLM should read `generator_instructions`, `exam_specific_constraints`,
`difficulty_engine.difficulty_levels`, `clinical_integrity_checks` and `generation_workflow`.
The actual exam has not been empirically calibrated from public recall archives.

## Hard format locks
AMC: 5 options, 1 best answer, 150 questions / 210 min; Australian context.
INI-CET: 200 questions, 4x50, 45 min per section; supports single and multiple correct.
NEET PG **2026**: 180 questions (NOT 200), 4 options, one best answer, 5x36 sections at 42 min each, +4/-1 scoring.

## Copy-paste prompt
Read the attached JSON as the controlling exam specification. Generate 10 original questions
at difficulty_level=5, difficulty_intensity=85, mode="challenge", topic="mixed".
Use the exam-specific official-safe format and exactly the allowed number of options.
One question at a time. Do not show the answer until I respond. Afterwards, explain
the correct answer, decisive discriminator, and why each other option is wrong.
Do not claim that any generated item is calibrated to the official exam.

## Quality warning
Public PYQs, self-labelled 'verified' keys and uploaded recalls can contain mistakes, duplication,
missing images and non-original practice questions. The difficulty levels are pedagogical,
not official psychometric measurements. Sources and uncertainty notes are in each JSON.
