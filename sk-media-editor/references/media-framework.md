---
title: "Media Editor - Thinking - MEDIA Framework"
description: "MEDIA methodology (Measure, Evaluate, Decide, Implement, Analyze) with cognitive rigor, RICCE validation and quality gates for media optimization."
contextType: implementation
importance_tier: important
trigger_phrases:
  - "media framework"
  - "measure evaluate decide implement analyze"
  - "ricce validation"
  - "quality size optimization"
  - "media thinking"
version: 0.8.0.8
---

# Media Editor - Thinking - MEDIA Framework

A methodology combining systematic media analysis with automatic professional optimization for superior media processing deliverables.

---

## 1. OVERVIEW

### Purpose

Defines the MEDIA methodology (Measure, Evaluate, Decide, Implement, Analyze) for intelligent media optimization with quality assurance. It combines systematic media analysis with automatic professional optimization for superior processing deliverables.

### When to use

- Loaded always as the core thinking framework for any media operation
- Applying the MEDIA phases, cognitive rigor, RICCE validation and quality gates
- Deciding format, quality and compression trade-offs with the installed tools

---

## 2. FRAMEWORK OVERVIEW

**MEDIA** is Measure, Evaluate, Decide, Implement, Analyze. It acts as a media context assessor and optimization solution finder. It understands media intent, evaluates available processing capabilities and suggests optimal approaches through systematic analysis.

**Core philosophy:** Every media request contains context clues about what the user needs. MEDIA extracts these signals, matches them to optimal processing techniques (format, quality, compression) and proposes the best optimization path.

### Core capabilities

1. **Intelligent media context assessment:** extract user intent from minimal information, identify implicit requirements (quality preservation, size optimization, compatibility), recognize patterns from similar use cases, reality-check feasibility before committing
2. **Tool check first:** never process without confirming a route: the Media Editor tools when connected, otherwise ffmpeg on the path. Every image, video and audio operation runs through ffmpeg and ffprobe, the server's own or the installed one. Call `media_health` or pass the `ffmpeg -version` check before any processing
3. **Intelligent optimization finding:** evaluate multiple format and quality approaches, balance trade-offs (quality versus size, compatibility versus compression), provide reasoning, prepare backup plans
4. **Proactive guidance:** suggest improvements beyond the immediate request, recommend best practices, offer next steps, explain optimization approaches clearly

---

## 3. MEDIA PRINCIPLES

### M - Measure source media

Deeply understand media requirements and determine the optimal processing approach.

Core measurement skills: intent recognition, context extraction, capability mapping, feasibility check, alternative identification.

User-facing example: "Measure: 4K image detected, 8.5MB PNG, RGB. Intent: web display optimization. Optimal solution: WebP when the build encodes it, plus a 1080p resize. Why: scalable, quality preserved, large size reduction, wide browser support."

### E - Evaluate processing options

Evaluate multiple optimization solutions and select the best processing approach.

Core evaluation skills: multi-path evaluation, trade-off analysis, pattern matching, optimization logic, alternative preparation.

User-facing example: "Evaluate: analyzed three approaches. Selected WebP at 85% plus a 1080p resize when the build encodes WebP, JPEG at 80% otherwise. Reasoning: best for web display, wide compatibility, fast processing. Trade-off: lossy compression for large size savings, quality visually identical. Alternative: AVIF for smaller files when compatibility allows."

### D - Decide optimal strategy

Build the optimization pipeline from processing primitives in logical sequence.

User-facing example: "Decide: building pipeline. Source analyzed, format selected, quality determined, processing ready. The tool check passed."

Internal: operation ordering, processing primitive assembly, progress monitoring, error handling.

### I - Implement processing

Execute with monitoring and ensure quality against media optimization standards.

User-facing example: "Implement: standards validated. Format optimal, quality preserved, compatibility verified. FFmpeg operations successful."

Internal: format optimization validation, quality preservation check, compatibility verification, size reduction targets, processing time, FFmpeg operation success confirmation.

### A - Analyze results

Deliver the integrated optimized result with documentation.

User-facing example: "Analyze: optimization complete. Delivered WebP at 85%, 1080p, 425KB (95% reduction from 8.5MB). Quality confirmed. Next: batch processing available, consider AVIF for future projects."

Internal: integration validation, completeness check, results documentation, next-step identification, pattern learning.

---

## 4. COGNITIVE RIGOR FRAMEWORK

Tailored for media operations with focused analysis. Focus areas: quality versus size analysis, format selection, compression strategy, platform compatibility.

### Three core techniques

1. **Quality-size optimization (automatic):** analyze quality requirements, evaluate compression options, select the optimal balance, validate results
2. **Format selection analysis (automatic):** evaluate available formats, compare compression efficiency, check compatibility, select the optimal format
3. **Platform compatibility check (continuous):** identify target platform, validate format support, check quality requirements, flag compatibility issues

### Quality gates for cognitive rigor

Validate before processing and show a summary to the user.

Tool check:
- [ ] The Media Editor tools are connected and `media_health` answers, or ffmpeg is on the path and answers `ffmpeg -version`
- [ ] The build has the encoder for every promised output format
- [ ] Operations supported for the media type
- [ ] No capability over-promises

Media analysis:
- [ ] Media analyzed (format, resolution, quality, size)
- [ ] Use case identified (web, email, social, streaming)
- [ ] Processing requirements clear (quality, size, compatibility)
- [ ] Optimization strategy defined

Optimization pattern validation:
- [ ] Format patterns applied (WebP for web, PNG for email)
- [ ] Quality levels appropriate (85% web, 95% print)
- [ ] Compatibility requirements met
- [ ] Best practices followed

If any gate fails, address the issue, re-validate and show confirmation to the user.

### Handling ambiguous requests

1. When confident: propose optimization with reasoning, ask for confirmation
2. When uncertain: ask targeted questions to clarify context
3. When partially possible: explain what is doable with the installed tool, what is not, suggest alternatives
4. When impossible: explain why, suggest alternative approaches, educate on constraints
5. When a better approach exists: suggest the improvement over the stated request

---

## 5. THE MEDIA METHODOLOGY

### Phase breakdown

| Phase | Share | User update |
| --- | --- | --- |
| **M**easure | 20% | "Analyzing source (4K PNG, 8.5MB)" |
| **E**valuate | 30% | "Evaluating (WebP optimal)" |
| **D**ecide | 20% | "Deciding (85% quality, 1080p)" |
| **I**mplement | 10% | "Processing (95% reduction)" |
| **A**nalyze | 20% | "Complete (quality verified)" |

### Phase M - Measure

Analyze the source media and requirements: tool check, source properties (format, resolution, size, quality, metadata), use case identification, optimization strategy.

### Phase E - Evaluate

Analyze processing options: format evaluation across image and video formats, quality level analysis, compression strategy, platform compatibility.

### Phase D - Decide

Select the optimal strategy with clear reasoning: quality versus size decision matrix, format selection with a fallback, resolution optimization, compatibility validation, processing plan.

### Phase I - Implement

Execute with monitoring through installed ffmpeg: ordered operations, progress tracking, quality checkpoints, error handling.

### Phase A - Analyze

Verify results and document outcomes: size metrics, quality metrics, processing metrics, pattern learning and next suggestions.

### Two-layer transparency

MEDIA is the single thinking system: Measure, Evaluate, Decide, Implement, Analyze. Keep full analysis internal and show only the decisions, assumptions, commands and caveats the user needs to act.

| Step | Internal check | External result |
| --- | --- | --- |
| Measure | Identify source media type, known properties and target use case | State the relevant inputs and assumptions |
| Evaluate | Compare format, quality, size, compatibility and speed | Explain the trade-off in one or two lines |
| Decide | Choose the operation sequence | Name the ordered recipe |
| Implement | Run the decision through the Media Editor tools or FFmpeg commands | Report what ran, or give runnable commands when nothing can run |
| Analyze | Predict output quality, size and compatibility risks | Give expected result and verification guidance |

---

## 6. RICCE FRAMEWORK

RICCE is a structural validation framework ensuring every media operation contains the essential elements for complete processing.

- **R**ole: media requirements defined (media type, use case, target platform)
- **I**nstructions: processing steps clear (FFmpeg operations, parameters, sequence)
- **C**ontext: media properties comprehensive (source properties, target requirements, compatibility)
- **C**onstraints: quality metrics established (quality targets, size constraints, performance targets)
- **E**xamples: results validation included (expected outcomes, validation mechanisms, success criteria)

### RICCE-MEDIA integration

| MEDIA phase | RICCE element | Validation point |
| --- | --- | --- |
| **Measure (M)** | Role (R) | Media type, use case, platform identified |
| **Evaluate (E)** | Instructions (I) | Processing steps evaluated and selected |
| **Decide (D)** | Context (C) | Properties analyzed, constraints defined |
| **Implement (I)** | Constraints (C) | Quality metrics tracked during processing |
| **Analyze (A)** | Examples (E) | Results validated, metrics confirmed |

On any RICCE failure, return to the matching MEDIA phase before delivery (blocking).

---

## 7. TRANSPARENCY MODEL

Apply full optimization analysis internally while showing meaningful progress externally.

**Internal layer:** complete analysis, full format comparison, quality-size optimization matrix, compatibility checking, FFmpeg operation planning.

**External layer:** phase progression, key optimization decisions in one or two sentences, processing progress, results summary with metrics, next suggestions.

**Show users:** phase progression, selected format with reasoning, key trade-offs, processing status, final results, next-action suggestions.

**Keep internal:** detailed format comparison tables, internal optimization matrices, round-by-round analysis, full RICCE checks, FFmpeg parameter details, retry logs.

Decision rule: does this information help the user understand the outcome or make a decision? If yes, show it concisely. If no, keep it internal.

---

## 8. QUALITY ASSURANCE

### Quality metric targets

| Metric | Target | Threshold | Action if below |
| --- | --- | --- | --- |
| **SSIM (quality)** | 0.95+ | 0.90 | Increase quality level, adjust compression |
| **Size reduction** | Target% | 80% of target | Re-evaluate format or quality settings |
| **Processing time** | Under 2s | Under 5s | Optimize operation sequence |
| **Compatibility** | 95%+ | 90% | Provide fallback format |
| **Tool availability** | 100% | 100% | BLOCKING, check the tools then ffmpeg, advise with install guidance when neither answers |

### Improvement protocol

Trigger: any metric below threshold or no route that can run. Maximum three iterations. Blocking issues: an unsupported format and a turn where neither the Media Editor tools nor ffmpeg answers, which ends in advice with the exact command.

- Iteration 1: identify the issue, apply the optimization solution, re-validate
- Iteration 2: analyze remaining gaps, try an alternative format or quality, re-validate
- Iteration 3: use the fallback strategy, apply the best compromise, final validation

Show the user that optimization was applied to meet quality and size targets. Hide detailed iteration tracking and validation logs.

---

## 9. QUICK REFERENCE

### MEDIA phase summary

| Phase | Key actions | User sees |
| --- | --- | --- |
| **M**easure | tool check, media analyzed | "Measuring (4K PNG, 8.5MB, web target)" |
| **E**valuate | Optimization patterns selected | "Evaluating (WebP optimal for web)" |
| **D**ecide | Processing pipeline sequenced | "Deciding (resize, convert, optimize)" |
| **I**mplement | Best practices verified | "Implementing (quality standards met)" |
| **A**nalyze | Integration delivered | "Analyzing (95% reduction, preserved)" |

### Format and quality guidance

Select formats and quality by use case, then explain the trade-off briefly.

- Web images: WebP when the build encodes it, AVIF when compatibility allows, JPEG at quality 5 otherwise
- Email images: JPEG at 80% for universal client support, PNG when transparency matters
- Web video: H.264 MP4 for universal playback, H.265 or VP9 when size matters and support allows
- Streaming video: HLS multi-quality (1080p, 720p, 480p, 360p) for adaptive bandwidth delivery
- Podcast audio: MP3 at 192 kbps for universal playback, AAC for modern devices, FLAC for archival

### Tool reality check

**FFmpeg:** resize, convert (JPEG, PNG, WebP input, AVIF when the encoder is present), compress, crop, rotate, flip and batch image work. Transcode, trim, concatenate, speed, resolution, aspect ratio, fades, image overlays, audio extraction, audio conversion, normalization and silence removal for video and audio. HLS multi-quality streaming through the HLS conversion asset. Runs through the Media Editor tools when they are connected, which bring their own FFmpeg, and otherwise requires FFmpeg on the path.

**ffprobe:** dimensions, format, codec, duration and stream inspection.

**Never available:** AI content generation, complex editing (effects, advanced filters), real-time streaming, upload to external services, vector input such as SVG, text or subtitle burn-in without the matching optional filter.

### Must-have checklist

Before processing:
- [ ] The Media Editor tools answer `media_health`, or ffmpeg is on the path and responds to `ffmpeg -version` (required, blocking)
- [ ] MEDIA framework loaded
- [ ] RICCE validation enabled
- [ ] Two-layer transparency enabled

During processing:
- [ ] Tool capabilities verified (required, blocking)
- [ ] Source media analyzed (format, resolution, size, quality)
- [ ] Use case identified
- [ ] Format options evaluated
- [ ] Quality-size balance determined
- [ ] Compatibility validated

After processing:
- [ ] All quality gates passed
- [ ] Results validated and saved to `media files/export/`
- [ ] RICCE elements complete
- [ ] Next suggestions provided

---

*This framework is the foundation for all Media Editor operations. It ensures consistent optimization through systematic depth analysis and focused cognitive rigor while maintaining clarity through two-layer transparency. Check the tools first.*
