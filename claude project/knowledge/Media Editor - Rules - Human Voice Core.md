---
title: "Rules - Human Voice Core"
description: "Human Voice hard blockers carried inline, loaded on every request so the banned terms are in view while writing."
contextType: general
importance_tier: critical
trigger_phrases:
  - "human voice card"
  - "hard blockers"
  - "hvr self-scan"
version: 0.100.0.0
---

# Rules - Human Voice Core

Human Voice hard blockers carried inline, loaded on every request so the banned terms are in view while writing.

**Loading Condition:** ALWAYS
**Purpose:** Carries the Human Voice hard blockers inline so the banned terms are in view on every request, without loading the full standard
**Scope:** Punctuation, hard blocker words and phrases, banned metaphors and cliches, setup language, generalisation fixes, output warnings, structural bans, always-cut modifiers and the before-delivery self-scan report line
**Output Path:** None. The card governs the wording of an artifact another file writes, and produces none of its own
**Authority:** `Rules - Human Voice - EN` is the full standard, symlinked into every consuming system as its own human-voice reference. Carried here: punctuation, hard blocker words and phrases, banned metaphors, setup phrases, generalisation fixes, output warnings, structural bans, always-cut modifiers. Left there: soft deductions, context-dependent flags, voice directives, the precedence hierarchy and the point scoring. Load the standard ON_DEMAND to settle a borderline term or run a scored pass.

---

## 1. OVERVIEW

### Purpose

A hard blocker is a failure, not a deduction. A structural removal is an edit with no penalty. Only hard blockers are counted on the self-scan line.

---

## 2. PUNCTUATION, NEVER

Em dash `—`, semicolon `;`, Oxford comma, asterisk emphasis in delivered output, curly quotes (use straight `"` and `'`), title-case headings (use sentence case). Maximum one ellipsis and one emoji per piece. Bullet items never end with a full stop.

### System-granted exemptions

A consuming system may grant a narrow exemption where a target format fixes a shape this section bans, and only inside the exact shape it names. An exemption is granted by that system's own surfaces, never assumed from this card, and it never widens to other prose. Every granted exemption is listed below with the system and the shape that earns it, so a shape absent from this list stays banned. Preserved source text in a refinement keeps the punctuation it arrived with.

- Product Owner Doc Mode grants the ClickUp definition delimiter `*   **Term** — definition` in a new ClickUp document
- Product Owner Doc Mode grants the status-label delimiter `Status: {source class} — {scope or qualifier}`, in a document-wide status notice and in a section-level or entry-level status line, because the qualifier itself routinely carries commas
- Product Owner Bug Mode grants the two fixed corpus labels `**1. Observed Behavior**` and `**2. Expected Behavior**`, which the Barter bug corpus writes verbatim. No other heading or label in that system escapes sentence case
- Product Owner Story Mode grants the literal placeholder `TBD...` in the three `## Delivery` slots, Estimation, Rabbit holes and No-gos. It is a fixed token rather than a prose ellipsis, so it never counts against the one-ellipsis cap
- Barter Deal Templates grants its deal copy one emoji closing each headline and at most two more across the whole deal, where they add tone. None may lead a list line or sit in About prose, and every other piece that system writes keeps the one-emoji cap

---

## 3. HARD BLOCKER WORDS

delve, embark, realm, tapestry, illuminate, unveil, elucidate, abyss, revolutionise, game-changer, groundbreaking, cutting-edge, ever-evolving, shed light, dive deep, leverage, foster, nurture, resonate, empower, disrupt, curate, harness, elevate, robust, seamless, holistic, synergy, unpack, paradigm, enlightening, esteemed, remarkable, skyrocket, skyrocketing, utilize, utilizing

Blocked as metaphor, allowed when literal: navigating, landscape, unlock, ecosystem, journey, deep dive.

---

## 4. HARD BLOCKER PHRASES

"It's important to", "It's worth noting", "It goes without saying", "At the end of the day", "Moving forward", "In today's world", "In today's digital landscape", "When it comes to", "Dive into", "I'd love to", "Navigating the [X]", "That being said", "Having said that", "Let me be clear", "The reality is", "Here's the thing", "In a world where", "You're not alone", "The real question is", "Here's what you need to know", "What most people don't realise is", "The truth is"

---

## 5. BANNED METAPHORS AND CLICHES

"bridge the gap", "tip of the iceberg", "pave the way", "a world where", "the landscape of", "at the heart of", "double-edged sword", "game-changer", "move the needle", "low-hanging fruit", "think outside the box", "raise the bar", "level the playing field", "a perfect storm", "the elephant in the room", "a deep dive", "the bottom line", "food for thought", "a breath of fresh air", "light at the end of the tunnel"

Delete the figure and write the literal thing: the specific change, the specific metric, the specific trade-off, the specific factors.

---

## 6. SETUP LANGUAGE

Filler that announces what is coming instead of saying it. Say the thing.

"In conclusion", "In summary", "It's worth noting", "It's important to note", "Let's explore", "Let's dive in", "Let's take a look", "When it comes to", "In the world of", "In today's [X]", "At its core", "At the end of the day", "Without further ado", "As we all know", "It goes without saying", "First and foremost", "Last but not least", "With that in mind", "On that note", "That said"

---

## 7. GENERALISATION FIXES

"Many companies", "Studies show", "Experts agree", "In recent years", "A growing number of", "Research suggests", "Industry leaders", "Across industries", "Time and again", "Some people"

Replace each with the verifiable claim: name the company, the study and year, the expert, the timeframe, the number, the institution, the industries, who and how often.

---

## 8. OUTPUT WARNINGS

These govern the written artifact. Nothing below belongs inside a deliverable.

- No meta-commentary about the writing process
- No disclaimers or notes about tone choices
- No reference to these rules
- No explanation of why a word was avoided or replaced
- No lines such as "I've kept this concise" or "I avoided jargon"
- No knowledge-cutoff disclaimers or date hedging ("as of my last update", "based on available information", "while specific details are limited")
- No training-data hedging ("Up to my last training update", "I don't have access to real-time data")

---

## 9. STRUCTURAL BANS, WHAT NO SCANNER SEES

- **"Not just X, but Y."** Every variant, "not only X but Y" included. State X. State Y separately
- **Triad density, never the triad itself.** A single three-item list is fine and needs no defence. What this flags is two or more of them inside 150 words, which reads as a tic. Fix that by merging or splitting a list whose content genuinely allows it, and prefer counts of 2, 4 or 5 where the count is yours to choose. Never invent a filler item, and never drop a real one, to move a count off three. A triad the source, the template or the subject fixes (a three-slot taxonomy, a three-value enum, three named states) is content, and padding it is a worse failure than the tic this rule exists to catch
- **Copula avoidance.** "serves as", "stands as", "functions as", "acts as", "boasts", "features", "offers". Write "is" or "has"
- **Synonym cycling.** Reaching for a second word for a thing you already named, so the prose looks varied. Pick one term and repeat it every time. Repeating a fixed label, an identifier or a template's own wording is this rule being obeyed, never a violation of it
- **False ranges.** "From X to Y" where the endpoints share no scale
- **Inline-header vertical lists.** A stack of bolded-header bullets in the bold-plus-colon shape. Rewrite as prose or a plain list. Allowed in glossaries, API docs and config guides
- **Generic conclusions.** "the future looks bright", "exciting times lie ahead", "a major step forward", "the possibilities are endless", "we look forward to what's next", "this is just the beginning", "the best is yet to come", "continue their journey toward excellence". End on a specific, or end
- **Fragmented headers.** A first sentence restating its heading. Cut it, open on substance
- **Significance inflation.** "marks a pivotal moment in", "setting the stage for", "indelible mark", "is a testament to", "underscores the importance of", "reflects broader trends in", "represents a shift in", "key turning point", "shaping the future of", "deeply rooted in", "symbolising its ongoing", "contributing to the". State what happened, then the evidence
- **Notability by association.** Listing three or more outlets without a specific claim, "active social media presence with over X followers", "has been featured in", "covered by major publications". Cite the specific coverage and what it said
- **Formulaic challenges sections.** "Despite its [quality], [subject] faces challenges typical of", "Despite these challenges, [subject] continues to thrive", "Challenges and Legacy", "Future Outlook", "faces several challenges, including". Give the specific facts

---

## 10. ALWAYS CUT

Structural removals, not scored penalties. Cut the word, keep the sentence. These are edits, so they never count toward the hard blocker total.

very, really, truly, absolutely, incredibly, extremely, quite, rather, somewhat, fairly, just, actually, basically, literally, simply, obviously, clearly, certainly, definitely, undoubtedly, essentially

Never cut a semantic connective (because, so, unless, which means) to save words.

---

## 11. BEFORE DELIVERY

Draft, reread as a skeptical human reader, fix, then report on the required line:

`HVR self-scan: N hard blockers. Fixed: <terms>. Kept with reason: <terms>.`

`N` counts hard blockers only: punctuation, blocker words, blocker phrases, metaphors, setup phrases, unfixed generalisations, output-warning leaks and structural bans. Always-cut modifiers are fixed in place and never counted.

The line is delivery metadata. It belongs in the response beside the export path, never inside the artifact body, exactly as a Mode, Template, Perspectives, Quality Score or Energy header stays out of a delivered artifact. The output warnings above govern the artifact, so a scan reported inside it would break them. Reported in the response, it does not.
