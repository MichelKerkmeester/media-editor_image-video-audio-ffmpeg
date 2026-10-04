---
title: "Rules - Human Voice - EN"
description: "English Human Voice hard blockers and structural rules every deliverable must pass with zero violations."
trigger_phrases:
  - "human voice rules"
  - "hard blockers"
  - "banned words"
  - "ai pattern detection"
  - "pre-publish checklist"
importance_tier: critical
contextType: general
version: 0.210.0.0
---

# Rules - Human Voice - EN


The Human Voice Rules (HVR) define the global linguistic standards that govern all AI-generated content across the ecosystem. These rules eliminate detectable AI patterns, enforce natural human writing conventions and ensure every piece of output reads as if written by a knowledgeable human professional. This document is the canonical, system-agnostic superset. Individual content systems inherit these rules and may extend them with system-specific overrides.

---

## 1. OVERVIEW

### Purpose

Defines the global Human Voice Rules: hard blockers, banned words and phrases, punctuation discipline, and AI-pattern detection that every English deliverable must pass with zero violations. It is the canonical, system-agnostic superset.

### When to Use

- Loading is decided by the system that reads this card, never by this card. Seven systems read this shared corpus through different routers, so any single loading rule stated here is wrong for some of them. Check the reading system's own routing contract.
- Checking output against hard blockers, banned words, and soft deductions
- Applying the rule-precedence model and the pre-publish checklist

---

## 2. VOICE DIRECTIVES

These directives define the target voice. They establish what to aim for before the remaining parts define what to avoid.

### 0.1 Voice Principles

```yaml
voice_directives:
  active_voice:
    directive: "Use active voice. Put the subject before the verb."
    example: { wrong: "The meeting was cancelled by management.", right: "Management cancelled the meeting." }

  direct_address:
    directive: "Address the reader directly using 'you' and 'your'."
    example: { wrong: "Users will find that the platform saves time.", right: "You'll find the platform saves time." }

  conciseness:
    directive: "Be direct. Cut fluff. Say it in fewer words."
    example: { wrong: "It is important to note that the deadline is on Friday.", right: "The deadline is Friday." }

  simple_language:
    directive: "Use common words. If a simpler word exists, use it."
    example: { wrong: "We need to facilitate the optimisation of our workflow processes.", right: "We need to fix how we work." }

  clarity:
    directive: "Focus on clarity. One idea per sentence when possible."

  conversational_tone:
    directive: "Write naturally. Read it aloud. If it sounds stiff, rewrite it."

  authenticity:
    directive: "Be honest. If something has problems, say so. No marketing spin."
    example: { wrong: "Our revolutionary solution transforms every aspect of your workflow.", right: "Our tool automates three manual steps in your invoicing process." }

  practical_focus:
    directive: "Focus on practical, actionable information. Back claims with data or examples."

  sentence_rhythm:
    directive: "Vary sentence lengths to create rhythm."
    guidance:
      - "Mix short sentences (under 8 words) with medium (8-15) and long (15-25)"
      - "Use a short sentence after a complex idea for impact"
```

### 0.2 Certainty Principle

```yaml
certainty_principle:
  directive: "Prefer certainty when facts support it"
  rationale: "Hedging weakens claims. When you know something is true, state it directly."
  examples:
    - { hedging: "This approach might improve results.", direct: "This approach improves results." }
    - { hedging: "Users could potentially save time.", direct: "Users save an average of 2 hours per week." }
  note: "Hedging is acceptable when genuine uncertainty exists. The rule targets unnecessary hedging."
```

### 0.3 Voice Personality

Avoiding AI patterns is only half the job. Sterile, voiceless writing that follows every rule can still read as AI-generated. Clean writing needs personality.

```yaml
voice_personality:
  directive: "Clean writing is not enough. Add personality."
  note: "Weighted lower than system-specific voice extensions. Systems requiring formal tone (DEAL, compliance) may suppress these."

  have_opinions:
    directive: "React to facts. Don't just report them neutrally."
    example: { flat: "The results were mixed.", voiced: "The results surprised me. Half the metrics improved while the others dropped." }

  acknowledge_complexity:
    directive: "Express mixed feelings. Real people don't sort everything into neat categories."

  controlled_imperfection:
    directive: "Perfect structure feels algorithmic. Allow occasional tangents and asides when they add authenticity."
    note: "Does not override conciseness or clarity. Means choosing natural flow over mechanical symmetry."

  emotional_specificity:
    directive: "Name specific feelings and images, not abstract labels."
    example: { abstract: "The results were disappointing.", specific: "We expected at least a 10% lift. We got 2%. That stings." }

  use_first_person:
    directive: "Use 'I' when appropriate. First person is honest, not unprofessional."
    note: "Not appropriate for all content types. Avoid in formal reports, legal content and compliance documentation."
```

---

## 3. HVR RUNTIME MODEL

All content generation, editing and review tasks must follow the two-pass self-audit loop. A single pass is not sufficient because first-pass rewrites routinely introduce new AI patterns while fixing old ones.

### 1.1 Two-Pass Self-Audit Loop

```yaml
hvr_runtime:
  execution_model: "two-pass-self-audit"

  phase_1_draft:
    description: "Generate or rewrite content applying all HVR rules (Sections 0-11)"
    apply: [voice_directives, punctuation_standards, structural_pattern_checks, content_pattern_detection, hard_blocker_checks, context_dependent_checks, soft_deduction_checks, context_flag_checks]
    output: draft_text

  phase_2_audit:
    description: "Audit draft for residual AI patterns that survived the first pass"
    prompt: "Read the draft as a skeptical human reader. What still sounds AI-generated?"
    focus_areas:
      - "Residual blocker words or phrases"
      - "Structural patterns (triads, 'not just X but Y', setup language, copula avoidance, synonym cycling)"
      - "Tonal flatness, excessive hedging or robotic cadence"
      - "Sentence rhythm monotony and generic claims"
      - "Significance inflation and generic positive conclusions"
      - "Formatting tells (emoji, title case, curly quotes, inline-header lists)"
      - "Voiceless writing that is technically clean but lacks personality (Section 2.3)"

  phase_3_final:
    description: "Rewrite draft using audit findings"
    constraints:
      - "Preserve all factual claims and meaning"
      - "Address every residual tell identified"
      - "Do not introduce new AI patterns while fixing existing ones"
      - "Do not add new dates, percentages or named entities not present in the source"
```

### 1.2 Runtime Constraints

```yaml
runtime_constraints:
  skip_conditions: "Phase 2 audit may be skipped ONLY for content under 2 sentences (e.g. subject lines, button labels)"
  token_budget: "Keep two-pass overhead under 20% of the single-pass token budget."
  observability: "When debugging, surface phase_1 draft and phase_2 residual_ai_tells as separate artifacts."
```

---

## 4. RULE PRECEDENCE MODEL

When a word or phrase appears in multiple rule categories, apply exactly one penalty using the hierarchy below.

### 2.1 Precedence Hierarchy

```yaml
rule_precedence:
  strategy: "first-match-wins"
  order:
    1: phrase_hard_blocker       # -5 per occurrence (Section 9)
    2: hard_word_blocker         # -5 per occurrence (Section 8)
    3: context_dependent_blocker # -5 when metaphorical, 0 when literal (Section 10)
    4: soft_deduction_minus_2    # -2 per occurrence (Section 11)
    5: soft_deduction_minus_1    # -1 per occurrence (Section 12)
    6: context_flag              # 0, advisory only (Section 13)
  notes:
    - "A term listed in both hard_blocker and soft_deduction is evaluated only as hard_blocker"
    - "Context-dependent blockers require context evaluation before scoring"
    - "If context evaluation clears a term (literal usage), no lower-tier penalty applies"
    - "cut_always directives (Section 7.3) are structural removals, not scored penalties — they apply independently"
```

### 2.2 Structural Directives vs Scored Penalties

Structural directives (Sections 3, 4, 5.3, 5.4) are remove/replace with no point penalty (compliance is binary). Scored penalties (Sections 6-10) assign explicit point deductions. A word in both categories is handled by the structural directive only.

### 2.3 Resolved Conflicts

Terms previously assigned to multiple categories are now in exactly one:

- **journey, ecosystem**: context_dependent only (Section 10). Metaphorical blocked at -5, literal allowed.
- **landscape**: context_dependent (Section 10) for the word. Phrase "the landscape of" stays in banned_metaphors (Section 7.1).
- **deep_dive**: context_dependent (Section 10) for noun. Verb "dive deep" remains hard_blocker (Section 8).
- **"You're not alone"**: phrase_hard_blocker only (Section 9). -5 takes precedence.
- **actually, basically, literally, essentially**: cut_always only (Section 7.3). Structural removal supersedes scoring.

---

## 5. PUNCTUATION & FORMATTING STANDARDS

All AI-generated content must follow these punctuation rules without exception.

```yaml
formatting_rules:
  em_dash:        { action: "NEVER use (—)", replace_with: "comma, full stop or colon" }
  semicolon:      { action: "NEVER use (;)", replace_with: "two sentences or conjunction" }
  oxford_comma:   { action: "NEVER use comma before 'and'/'or' in lists" }
  asterisk:       { action: "NEVER use for emphasis in output. OK in Markdown source files." }
  ellipsis:       { action: "Max 1 per piece. Trailing thought only. No dramatic pauses." }
  heading_case:   { action: "Sentence case only. Title case is an AI pattern." }
  emoji:          { action: "Max 1 per piece. Must add clarity or tone, not decoration." }
  quotation_marks: { action: "Straight quotes only (\"). Never curly quotes." }
```

---

## 6. AI STRUCTURAL PATTERNS TO AVOID

### 4.1 "Not Just X, But Also Y" Ban

Never use this construction or any variant.

```yaml
not_just_x_but_y:
  action: "NEVER use"
  banned_variants:
    - "Not just X, but also Y"
    - "Not just X, but Y"
    - "Not only X but Y"
    - "Not only X, but also Y"
    - "It's not X, it's Y"
    - "It's not just X, it's Y"
    - "It isn't just X, it's Y"
    - "More than just X"
  replacements: ["State X. State Y as separate sentence.", "Use 'and' to combine.", "Lead with the stronger point."]
```

### 4.2 Three-Item Enumeration Signal

AI defaults to lists of exactly three items. Vary enumerations.

```yaml
enumeration_rule:
  score: -1
  threshold: "Apply when 2+ triads appear per 150 words"
  preferred_counts: [2, 4, 5]
  exemptions: ["Legal/compliance lists with exactly 3 factual items", "Step-by-step procedures with exactly 3 steps", "Factual grouped data"]
  note: "A single natural triad is acceptable. Penalty targets the AI habit of defaulting to three items repeatedly."
```

### 4.3 Setup Language Removal

Remove filler phrases that signal what is coming next rather than stating it directly.

```yaml
banned_setup_phrases:
  - "In conclusion"
  - "In summary"
  - "It's worth noting"
  - "It's important to note"
  - "Let's explore"
  - "Let's dive in"
  - "Let's take a look"
  - "When it comes to"
  - "In the world of"
  - "In today's [X]"
  - "At its core"
  - "At the end of the day"
  - "Without further ado"
  - "As we all know"
  - "It goes without saying"
  - "First and foremost"
  - "Last but not least"
  - "With that in mind"
  - "On that note"
  - "That said"
```

### 4.4 Copula Avoidance Ban

When "is" or "are" works, use it. Don't substitute elaborate constructions.

```yaml
copula_avoidance:
  banned_substitutes:
    - "serves as"     # use "is"
    - "stands as"     # use "is"
    - "functions as"  # use "is"
    - "acts as"       # use "is" (when not literal acting)
    - "boasts"        # use "has"
    - "features"      # use "has" or "includes"
    - "offers"        # use "has" or "provides" (when describing attributes)
  note: "Acceptable when they add genuine meaning (e.g. 'The firewall acts as a barrier')."
```

### 4.5 Synonym Cycling

When referring to the same thing, use the same word. AI models cycle through synonyms due to repetition penalties. Signal: 3+ different words for the same entity in one piece. Natural variation (e.g. name and "she") is acceptable.

### 4.6 False Ranges

Remove "from X to Y" constructions where the endpoints are not on a meaningful scale. Genuine ranges with meaningful endpoints are acceptable (e.g. "temperatures from -10C to 40C").

### 4.7 Inline-Header Vertical Lists

Restructure bolded-header bullet lists (bold + colon pattern) into flowing prose or simpler lists. Acceptable for glossaries, API docs and config guides.

### 4.8 Generic Positive Conclusions

End with specifics, not sentiments. Banned: "The future looks bright", "Exciting times lie ahead", "This represents a major step forward", "The possibilities are endless", "We look forward to what's next", "This is just the beginning", "The best is yet to come", "continue their/our journey toward excellence".

### 4.9 Fragmented Headers

Remove generic sentences that restate the heading. Jump straight to substance.

---

## 7. CONTENT PATTERN DETECTION

### 5.1 Banned Metaphors and Cliches

```yaml
banned_metaphors:
  - "bridge the gap"             → "connect"
  - "tip of the iceberg"         → "one example"
  - "pave the way"               → "enable" or "make possible"
  - "a world where"              → remove or rephrase directly
  - "the landscape of"           → remove or use specific noun
  - "at the heart of"            → "central to" or state directly
  - "double-edged sword"         → "trade-off" or "has downsides"
  - "game-changer"               → state the specific change
  - "move the needle"            → state the specific metric improvement
  - "low-hanging fruit"          → "quick win" or state the specific action
  - "think outside the box"      → remove entirely
  - "raise the bar"              → "improve" or "set a higher standard"
  - "level the playing field"    → "equalise access" or state the change
  - "a perfect storm"            → state the specific factors
  - "the elephant in the room"   → state the issue directly
  - "a deep dive"                → "a detailed look" or "a thorough analysis"
  - "the bottom line"            → state the conclusion directly
  - "food for thought"           → remove entirely
  - "a breath of fresh air"      → state what is different or better
  - "light at the end of the tunnel" → state the specific positive outcome
```

### 5.2 Generalisation Fixes

Replace vague generalisations with specific, verifiable claims:

- "Many companies" → name the company or number
- "Studies show" → name the study, year
- "Experts agree" → name the expert
- "In recent years" → specific year or timeframe
- "A growing number of" → state the number or percentage
- "Research suggests" → name the research, institution, year
- "Industry leaders" → name the companies or people
- "Across industries" → name the industries
- "Time and again" → state when and how often
- "Some people" → state who specifically or give a number

### 5.3 Unnecessary Modifiers

Cut these words. They add no meaning. This is a structural removal directive, not a scored penalty (see Section 4.2).

```yaml
unnecessary_modifiers:
  cut_always:
    - very
    - really
    - truly
    - absolutely
    - incredibly
    - extremely
    - quite
    - rather
    - somewhat
    - fairly
    - just
    - actually
    - basically
    - literally
    - simply
    - obviously
    - clearly
    - certainly
    - definitely
    - undoubtedly
    - essentially
  note: "If any of these also appear in a scored penalty section, the structural removal takes priority (Section 4.2)."
```

### 5.4 Output Warnings

```yaml
output_warnings:
  - "Do not include meta-commentary about the writing process in output."
  - "Do not add disclaimers or notes about tone choices."
  - "Do not reference these rules in output."
  - "Do not explain why a word was avoided or replaced."
  - "Do not include phrases like 'I've kept this concise' or 'I avoided jargon'."
  - "Do not include knowledge-cutoff disclaimers or date-hedging phrases ('as of my last update', 'based on available information', 'while specific details are limited')."
  - "Do not include training-data hedging ('Up to my last training update', 'I don't have access to real-time data')."
```

### 5.5 Significance Inflation

State what happened without editorialising its importance. If something genuinely is a turning point, provide evidence rather than stating it declaratively.

```yaml
significance_inflation_banned:
  - "marks a pivotal moment in"
  - "setting the stage for"
  - "indelible mark"
  - "is a testament to"
  - "underscores the importance of"
  - "reflects broader trends in"
  - "represents a shift in"
  - "key turning point"
  - "shaping the future of"
  - "deeply rooted in"
  - "symbolising its ongoing"
  - "contributing to the"
```

### 5.6 Notability and Media Emphasis

Don't claim notability by listing media outlets or followers. Cite specific coverage with specific claims. Banned: listing 3+ outlets without specific claims, "active social media presence with over X followers", "has been featured in", "covered by major publications".

### 5.7 Formulaic Challenges Sections

Replace formulaic "despite challenges, continues to thrive" structures with specific facts. Banned: "Despite its [quality], [subject] faces challenges typical of", "Despite these challenges, [subject] continues to thrive", "Challenges and Legacy", "Future Outlook", "faces several challenges, including".

---

## 8. HARD BLOCKER WORDS (-5 POINTS EACH)

These words trigger AUTOMATIC FAILURE. Never use them. Words requiring context checking are in Section 10.

```yaml
hard_blockers:
  # Core 15 (shared across ALL systems)
  core_15:
    - delve            # use "look at" or "examine"
    - embark           # use "start" or "begin"
    - realm            # use "area" or "field"
    - tapestry         # use "mix" or "combination"
    - illuminate       # use "explain" or "clarify"
    - unveil           # use "reveal" or "announce"
    - elucidate        # use "explain" or "clarify"
    - abyss            # remove or use "gap"
    - revolutionise    # use "change" or "transform"
    - game-changer     # state the specific change
    - groundbreaking   # use "new" or "first"
    - cutting-edge     # use "latest" or "advanced"
    - ever-evolving    # use "changing" or remove
    - shed light       # use "explain" or "show"
    - dive deep        # use "examine" or "look closely at"

  # Extended blockers (union of all systems)
  # NOTE: journey, landscape and ecosystem moved to Section 10 (context-dependent)
  extended:
    - leverage       # use "use"
    - foster         # use "support" or "encourage"
    - nurture        # use "develop" or "grow"
    - resonate       # use "connect with" or "matter to"
    - empower        # use "enable" or "give [specific ability]"
    - disrupt        # use "change" or state the specific change
    - curate         # use "select" or "choose"
    - harness        # use "use"
    - elevate        # use "improve" or "raise"
    - robust         # use "strong" or "reliable"
    - seamless       # use "smooth" or describe the experience
    - holistic       # use "complete" or "whole"
    - synergy        # use "combined effect" or state what works together
    - unpack         # use "explain" or "break down"
    - paradigm       # use "model" or "approach"
    - enlightening   # use "helpful" or "informative"
    - esteemed       # use "respected" or remove
    - remarkable     # use "notable" or state the specific quality
    - skyrocket      # use "increase" or "grow" + specific number
    - skyrocketing   # use "increasing" or "growing" + specific number
    - utilize        # use "use"
    - utilizing      # use "using"
```

---

## 9. PHRASE HARD BLOCKERS (-5 POINTS EACH)

These phrases trigger AUTOMATIC FAILURE. Never use them.

```yaml
phrase_blockers:
  - "It's important to"
  - "It's worth noting"
  - "It goes without saying"
  - "At the end of the day"
  - "Moving forward"
  - "In today's world"
  - "In today's digital landscape"
  - "When it comes to"
  - "Dive into"
  - "I'd love to"
  - "Navigating the [X]"
  - "That being said"
  - "Having said that"
  - "Let me be clear"
  - "The reality is"
  - "Here's the thing"
  - "In a world where"
  - "You're not alone"
  # Persuasive tropes that frame ordinary claims as revelations
  - "The real question is"
  - "Here's what you need to know"
  - "What most people don't realise is"
  - "The truth is"
```

---

## 10. CONTEXT-DEPENDENT BLOCKERS

Words blocked in most contexts but acceptable in specific technical or literal usage. When literal usage is confirmed, no penalty applies (see Section 4.1).

```yaml
context_dependent:  # -5 when metaphorical, 0 when literal
  - "navigating"     # blocked: challenges, market | allowed: website, GPS
  - "landscape"      # blocked: marketing, competitive | allowed: photography, geography, orientation
  - "unlock"         # blocked: potential, growth | allowed: door, phone
  - "ecosystem"      # blocked: startup, partner | allowed: biological, environmental
  - "journey"        # blocked: customer, learning | allowed: literal travel
  - "deep dive"      # blocked: into analytics, as metaphor | allowed: scuba, submarine
```

---

## 11. SOFT DEDUCTIONS (-2 POINTS EACH)

Use sparingly or replace. Words resolved to a higher-priority category via precedence (Section 4) have been removed.

```yaml
soft_deductions_minus_2:
  - "craft / crafting"       # as verb for "create". OK as noun (craft beer)
  - "pivotal"                # use "important" or "key"
  - "intricate"              # use "complex" or "detailed"
  - "testament"              # use "proof" or "evidence"
  - "disruptive"             # use "new" or describe the specific change
  - "transformative"         # use "significant" or describe the specific effect
  - "innovative"             # use "new" or describe what is different
  - "strategic"              # filler adjective. OK in genuine strategy contexts
  - "impactful"              # use "effective" or "significant"
  - "scalable"               # buzzword. OK in genuine technical contexts
  - "actionable"             # buzzword. OK in genuine instruction contexts
  - "discover"               # when hype. OK in factual discovery contexts
  - "remains to be seen"     # AI hedging. Use "we don't know yet"
  - "glimpse into"           # use "look at" or "overview of"
```

---

## 12. SOFT DEDUCTIONS (-1 POINT EACH)

Words overlapping with cut_always (Section 7.3) have been removed because the structural removal takes priority.

```yaml
soft_deductions_minus_1:
  hedging:
    - "I think"
    - "I believe"
    - "perhaps"
    - "maybe"
    - "might"
    - "could potentially"
    - "probably"

  filler_words:
    # actually, basically, essentially, literally covered by cut_always (Section 7.3)
    - "honestly"
    - "frankly"

  unnecessary_transitions:
    - "however"        # max 2 per piece; penalty on 3rd+ occurrence
    - "furthermore"
    - "moreover"
    - "additionally"
    - "consequently"

  weak_adjectives: ["nice", "good", "great", "amazing", "awesome", "incredible", "fantastic", "wonderful"]
  weak_adjectives_contextual:
    - "stark"          # use "clear" or "sharp"
    - "powerful"       # when filler; use "effective" or state specific capability

  vague_verbs:         # replace with specific verbs
    - "get"            # obtain, receive, achieve
    - "do"             # complete, execute, perform
    - "make"           # build, create, produce
    - "put"            # place, position, invest
    - "take"           # accept, adopt, require
    - "opened up"      # created, enabled, started

  ai_phrases: ["I'd be happy to", "Great question", "That's a great point", "I appreciate you sharing", "Let me help you with that"]
  ai_phrases_contextual:
    - "imagine"        # as setup phrase. State directly instead
    - "exciting"       # AI enthusiasm. State specific reason for interest

  buzzwords: ["synergise", "operationalise", "incentivise", "circle back", "move the needle", "low-hanging fruit"]
  buzzwords_contextual:
    - "onboarding"     # OK once per piece in HR/SaaS context
    - "bandwidth"      # metaphorical only. OK in networking context
    - "boost"          # hype filler. Use "increase" or "improve"
    - "inquiries"      # use "questions"
```

---

## 13. CONTEXT-DEPENDENT FLAGS

Not penalised automatically but should be checked for clarity and precision.

```yaml
context_flags:
  - "it"        # check for clear antecedent; replace with specific noun if ambiguous
  - "this"      # check for clear referent; replace with "this [noun]" if vague
  - "things"    # replace with specific noun; almost always too vague
  - "stuff"     # replace with specific noun; OK only in very casual content
  - "solution"  # overused in B2B; replace with platform, tool, service
  - "excited"   # AI enthusiasm; replace with specific reason for interest
```

---

## 14. ✅ PRE-PUBLISH CHECKLIST

Run through this checklist before finalising any content.

```yaml
pre_publish_checklist:
  runtime:
    - "Two-pass self-audit loop completed (Section 3)"
    - "Phase 2 audit findings addressed in final output"
    - "No new AI patterns introduced during revision"

  punctuation_and_formatting:
    - "No em dashes, semicolons, Oxford commas, asterisk emphasis"
    - "Max 1 ellipsis per piece"
    - "Sentence case headings"
    - "Max 1 emoji per piece (must add clarity or tone, not decoration)"
    - "Straight quotation marks only"

  structure:
    - "No 'not just X, but also Y' patterns"
    - "No excessive three-item enumerations (2+ triads per 150 words)"
    - "No setup language (Section 6.3)"
    - "No copula avoidance ('serves as', 'stands as' — use 'is')"
    - "No synonym cycling (same entity = same word)"
    - "No false ranges, inline-header lists, generic conclusions or fragmented headers"

  content:
    - "No banned metaphors (Section 7.1)"
    - "No vague generalisations without specifics"
    - "No unnecessary modifiers (cut_always words removed)"
    - "No meta-commentary, knowledge-cutoff disclaimers or training-data hedging"
    - "No significance inflation, notability emphasis or formulaic challenges"

  words:
    - "No hard blocker words (Section 8) or phrase blockers (Section 9)"
    - "Context-dependent words checked (Section 10)"
    - "No scoring conflicts — each term penalised once per precedence model (Section 4)"

  clarity:
    - "Pronouns have clear antecedents"
    - "Every claim is specific, not vague"
    - "'This' always followed by a noun"

  voice:
    - "Active voice used throughout"
    - "Reader addressed directly where appropriate (you/your)"
    - "Sentences vary in length"
    - "No hedging when certainty is possible"
    - "Claims backed by data or examples where possible"
    - "Writing has personality, not just correctness (Section 2.3)"
    - "Opinions and reactions present where appropriate"
    - "Complexity acknowledged, not flattened into neat categories"
```