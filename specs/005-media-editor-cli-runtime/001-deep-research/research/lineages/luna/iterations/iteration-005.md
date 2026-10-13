# Iteration 5: Naming and Placement Hardening

## Focus

Resolve the batch naming and placement failure, assess a size-target field and server guard, define Project and skill batch scenarios, and rank the four implementation phases with their file lists.

## Findings

1. The field descriptions make omission an ordinary successful path. The optional fileName says that an omitted value uses the input name plus operation, and optional subfolder says a single output goes to the root while several outputs get a folder at mcp server/src/server/field-schemas.ts:62-80. The registry adds both fields as optional placement arguments and passes them onto the tool context at mcp server/src/server/tool-registry.ts:91-123. That makes it possible to write a default name and default destination without a required decision in the arguments.

2. The Project gate is conditional on ambiguity, not on the first write. The kernel says to propose a name and apply it after confirmation at claude project/Custom Instructions.md:145, but its hard wait sits under ESCALATE IF the request is ambiguous at lines 181-182. Its strict sequence only says to propose and wait with tools at lines 192-196. A clear request can therefore bypass the only explicit question. For a batch, one question must list each proposed output name and ask for export-root versus one new numbered folder, even when the conversion task and filenames seem clear. Put this in the ALWAYS or delivery sequence rules and wait for the answer before any writing call.

3. The four-file failure follows from per-call placement. image_convert accepts one inputPath and builds one output plan at mcp server/src/tools/image/convert.ts:100-125,142-167. writeImageOutputs allocates one destination per call, then writes that call's plans into it at mcp server/src/tools/image/sharp-output.ts:492-512. allocateOutputFolder always creates a new numbered folder at mcp server/src/core/output-folder.ts:301-341. Thus four image_convert calls with subfolder true only on the first call cannot share one numbered folder. Later calls with omitted subfolder resolve to the root for their single output under tool-context.ts:290-322. This is the structural match for the supplied mixed-folder symptom.

4. Prefer one multi-input image_convert call for this batch over a caller-selected existing-folder path. Add an inputPaths array and one proposed file name per input, sharing format, quality, and an optional byte cap. Require an explicit subfolder choice for a two-or-more-input request. One handler call can create the chosen destination once and write all outputs there. This reuses the current one-call, many-plan design in sharp-output.ts:492-512 and the existing image_batch_resize pattern at mcp server/src/tools/image/batch-resize.ts:164-183. With subfolder true it creates one new numbered folder. With false it writes all named outputs in the export root. An existing-folder target remains a later option for mixed batches that need several handlers in one location. It needs safe resolution under the configured output root and cross-call lifecycle rules.

5. Add maxBytes to image_convert. The reported request had a strict size target, but image_convert currently accepts format and quality only and sends quality directly to the encoder at mcp server/src/tools/image/convert.ts:105-118,150-166. Quality is not a byte limit. A maxBytes argument is worth adding for formats with a controllable quality setting, including WebP. Define its unit convention, perform a bounded quality search at the original dimensions, and return an explicit structured failure if the cap cannot be met at the quality floor. Do not silently resize or return an oversized file as though the cap passed. Update image_convert output to report actual byte count and chosen quality. Do not add this field to the no-tool audio trim, loudness normalization, or CRF routes. Those remain hand-written ffmpeg per tools.md:180-189.

6. Do not add a server flag that claims a name was confirmed. dispatchToolCall receives a tool definition, context, and caller arguments at mcp server/src/server/tool-registry.ts:102-123. The current call boundary has no trusted user-answer signal. A model-supplied confirmed: true would only be another argument and would not prove a human answered. Keep the confirmation gate in the Project kernel and skill flow. Add structural validation for the multi-input call instead: require one fileNames entry per input and an explicit subfolder boolean, so omitted names and implicit batch placement fail before writes. That guard reduces accidental defaults but must not be described as proof of confirmation.

7. The paired interactive reference has a useful template but scopes the folder question too narrowly. Its comprehensive question offers a proposed name and a choice between a numbered folder and the export root at sk-media-editor/references/interactive-intelligence.md:84-114. However, direct commands ask about a folder only when one operation writes several files at lines 116-124. Four separate inputs can each write one file and evade that condition. Add a batch-specific template to this reference and its Project mirror. Trigger it when one request has two or more input files, regardless of how many files each tool call writes.

8. Add one batch scenario for each packaging. The existing readable-name scenario is one screenshot and one output at sk-media-editor/manual-testing-playbook/skill-export-delivery/readable-name-proposal.md:25-39. The playbook coverage note names SED-001 through SED-003 for ordinary naming and root-versus-folder behavior at manual-testing-playbook.md:24,87-99, and the existing Project route folder has connected-tools and no-tools scenarios rather than a batch naming case. Add paired scenarios with the same four-image prompt. The skill case should invoke the CLI once with the confirmed names and chosen location. The Desktop Project case should call MCP once for the multi-input operation. Both must prove no file appeared before confirmation, all outputs landed in the one selected place, names match the confirmed list, and each size is at or below maxBytes. If the API cannot meet the byte cap without changing dimensions, it must stop and explain that limit.

## Tested Proposal

I traced the current field schema through registry dispatch, per-call placement, folder allocation, and image writing. This confirms why a true subfolder on one call does not carry to later calls. The three shared reference pairs had already passed exact byte comparison in iteration 4. A multi-input image_convert with one allocation per invocation fits that writer structure better than selecting a destination path across several calls. These are static source checks and a mirror-byte check. I did not run tool tests or write media because no implementation changed and the lineage write scope excludes repository artifacts.

## Rejected Options

- Treat fileName omission as an acceptable batch default. Rejected because it produces input-derived names without asking, as field-schemas.ts:62-68 documents.
- Keep separate image_convert calls and pass subfolder true on every call. Rejected because every call allocates a fresh numbered folder at output-folder.ts:301-341.
- Add a caller-supplied confirmed boolean. Rejected because the server receives arguments, not a trusted user confirmation event, at tool-registry.ts:102-123.
- Add an arbitrary existing output path to every writing tool now. Rejected for the exact four-image conversion because one multi-input call can allocate once. Defer a cross-call folder handle until mixed-operation batches require it.
- Treat quality as equivalent to a maximum byte count. Rejected because the schema exposes a quality value but no byte limit at convert.ts:150-166.
- Silently downscale to meet maxBytes. Rejected because that changes dimensions beyond the explicit request. Return a failure or ask for approval for a resize.
- Add audio trim, loudness normalization, or CRF handlers. Rejected because the fixed decision keeps them on hand-written ffmpeg and the tool reference lists them as gaps at tools.md:180-189.

## Assessment

- newInfoRatio: 0.95
- Novelty justification: The pass connected optional field defaults to per-call folder allocation, selected a one-call batch API, and separated a meaningful structure guard from an untrustworthy confirmation flag.
- Confidence: High for the present schema and allocation behavior. Medium for the maxBytes encoder search because it requires implementation tests across formats and image content.

## Reflection

- What worked: Tracing image_convert, tool-registry, tool-context, output-folder, and sharp-output showed exactly where the mixed placement is selected and why multiple calls cannot reuse one new folder.
- What failed: The current playbook covers single-file naming and separate root requests, not multiple inputs from one request.
- Ruled out: A boolean confirmation flag, default names for batch inputs, repeated folder allocations, and silent downscaling.

## Recommended Next Focus

No further iteration. Synthesize the five passes and hand off the ranked four-phase design. The configured maximum is five iterations.

## Sources Consulted

- steer.md:1-22
- AI Systems/Media Editor/AGENTS.md:39-47,169
- AI Systems/Media Editor/README.md:69-76,104-134,253-270,305-343,564-579,603-637
- AI Systems/Media Editor/INSTALL-GUIDE.md:92-118,161-180,260-268
- AI Systems/Media Editor/USER-GUIDE.md:44-61,76-101
- AI Systems/Media Editor/claude project/Custom Instructions.md:143-149,157-177,181-196
- AI Systems/Media Editor/sk-media-editor/references/interactive-intelligence.md:43-67,84-124
- AI Systems/Media Editor/sk-media-editor/references/tools.md:70-80,180-189
- AI Systems/Media Editor/sk-media-editor/manual-testing-playbook/skill-export-delivery/readable-name-proposal.md:15-39,51-76
- AI Systems/Media Editor/sk-media-editor/manual-testing-playbook/manual-testing-playbook.md:22-24,81-99,138-149
- AI Systems/Media Editor/mcp server/src/server/field-schemas.ts:62-80
- AI Systems/Media Editor/mcp server/src/server/tool-registry.ts:91-123
- AI Systems/Media Editor/mcp server/src/server/tool-context.ts:290-322
- AI Systems/Media Editor/mcp server/src/core/output-folder.ts:301-341,501-539
- AI Systems/Media Editor/mcp server/src/tools/image/convert.ts:100-125,132-167
- AI Systems/Media Editor/mcp server/src/tools/image/sharp-output.ts:492-512
- AI Systems/Media Editor/mcp server/src/tools/image/batch-resize.ts:164-183
- AI Systems/Media Editor/mcp server/src/tools/media/rename.ts:138-169,181-196
- AI Systems/Media Editor/mcp server/tests/tools/image/convert.vitest.ts:251-284
- AI Systems/Media Editor/mcp server/tests/core/output-folder.vitest.ts:295-324
- AI Systems/Media Editor/SYNC.md:8-13,37
- AI Systems/z - Claude Project Sync Loop/systems.py:1248-1275,1280-1419,1679-1682
- AI Systems/Media Editor/benchmark/router/route_contract.py:87-95,215-225
- AI Systems/Media Editor/benchmark/router/differential.py:97-104,314-343
- AI Systems/Media Editor/benchmark/gates/rule_parity.py:71-117,245-265
- AI Systems/Media Editor/benchmark/grader/twin_divergence.py:10-18,155-163
- .skilled/skills/system-deep-loop/deep-research/SKILL.md:270-274,327-346
- .skilled/skills/system-deep-loop/deep-research/references/state/state-outputs.md:80-102
- .skilled/commands/deep/assets/deep-research-auto.yaml:149-169,2065-2179
