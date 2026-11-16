# Course evidence for the Yi singing demo

Reviewed 2026-11-15. Sources: the 13 course lecture PDFs supplied in the course `ppt/` folder. Lecture files are kept outside this code repository.

All 13 PDF files were text-extracted (1,372 PDF pages in total). The lecture topics, relevant principle pages, and concluding example sections were inspected. Selected example pages were also rendered and visually inspected; the review images remain in the local research workspace. Video poster frames in PDFs do not establish the behavior of an embedded video; the video itself was not played.

**All page references below are one-based PDF page numbers, not necessarily the slide footer numbers.** This distinction matters especially in Lectures 5–13.

## Methods directly applicable to this demo

| Demo decision | Exact course evidence | Application and limit |
| --- | --- | --- |
| Begin with two recordings sharing Chinese text, then expose their evidence | L4 p123, “When to Use Bottom-up?”: starting small is useful for presentation and common in storytelling | Open with 118/119 and a listening task; provide corpus context afterward. The course does not require every narrative to open with a large dashboard. |
| Show both recordings at once | L4 p114–116, “Eyes Beat Memory”; p115 shows Cerebral small multiples. L7 p78–82 also teaches small multiples | Place pitch curves and temporal strips side by side or in aligned rows with matching scales. Playback switching can supplement, but not replace, visible comparison. |
| Encode the central quantitative variables with position | L4 p77–79: expressiveness, effectiveness, and spatial position ranking | Time on x; pitch on y; duration by interval length. Do not make emotional colors or decorative blob area carry the principal quantitative evidence. |
| Coordinate playback and visual evidence | L11 p82: familiar representations, small multiples, strong spatial position, explicit linking. L12 p62–66: connect and brushing | A selected time/interval updates the playhead, pitch/energy focus, and passage context. Preserve a full-recording overview while examining a local segment. |
| Use overview, filtering, then record details where exploration is needed | L4 p119–122; L12 p39–41, p47–59, p70–76 | A small paired-example selector or corpus list is sufficient for the midterm. Detail on demand includes source ID, translation status, audio boundaries, confidence and feature definitions. |
| Keep direct control responsive | L4 p125–126; L11 p83 | Precompute audio features; update highlighting without full redraw. Audio playback and accompaniment adjustment should not wait for an online model. |
| Distinguish real seconds from relative phrase position | L5 p3–4: normalization. L11 p69–72: time-series similarity and DTW | Default to seconds because duration is one of the research variables. If a relative-progress view is added, label 0–100% and retain original duration. Do not silently warp/synchronize different performances. |
| Preserve categorical identity and readable contrast | L3 p30, p92–95; L4 p84–96; L3 p104–107 final color examples | Use two stable, distinguishable recording colors plus explicit text/line labels. Do not rely on red vs green alone or use rainbow hue for ordered confidence. |
| Keep model-based evidence inspectable | L13 p10, p27–29, p57–59; final multimodal case p94–101 | Show confidence/quality flags and allow listening to suspicious regions. Predicted pitch is evidence to examine, not a ground-truth transcript or a direct measure of emotion. |
| Prefer a simple visual comparison when it answers the question | L13 p96 compares histogram/density/violin/beeswarm; p99 contrasts a simpler comparison with a cluttered Sankey | Use paired dots/bars for aggregate duration or energy measures and curves for temporal structure. Do not add a Sankey/radar/3D view merely to demonstrate techniques. |
| Start novice users with understandable choices; expose detail gradually | L2 p6–8 and final postcard case p115–121; L12 p39–41, p56; final support examples p133–137 and p148–149 | A few audible accompaniment starting points, then optional density/loudness controls and reset. These are transfers of interaction principles, not evidence that music novices will succeed. |

## Implemented exploration additions (2026-11-16)

- The eight paired miniature plots use common pitch and duration scales and select the detailed comparison. This applies the existing L4/L7 small-multiples and L12 overview-to-detail principles above.
- Brushing a recording opens a second, enlarged view while retaining its overview. The detail preserves the shared pitch domain and original seconds; playback and seeking are linked. This extends the L11/L12 linked-view application without time-warping performances.
- The words section retains the supplied Chinese text, a working English gloss and expandable original Yi pronunciation. The source has no verified time alignment, so this section presents text without line-to-audio associations.
- The accompaniment waveform and three sound lanes share original time. Event movement, duration edits, addition, deletion and undo make the proposed change visible and audible; switching to the original preserves the vocal transport. Novice usability still requires an actual pilot.

## Lecture-by-lecture coverage and concluding examples

| Lecture | Topic and concluding examples inspected | What can be applied / what should not be forced |
| --- | --- | --- |
| 1, 107 pages | Introduction; late real-world problem examples at p93–94 (VAST 2009 and ChinaVis 2019); p97–101 distinguishes technique, design-study, system, evaluation and theory work | Present this as a design-oriented prototype with a concrete listening problem, not a new audio model. The final pages p103–106 are course outline/tool overview, not an additional end-case study. |
| 2, 124 pages | User-centric design; final visual-metaphor/postcard case p110–121, specifically design goals p115, interpretation validation p116, context p117, small-sample evaluation p119 | Work from the listening task and intended novice users. Use semantic context alongside quantitative views. Avoid ambiguous cultural metaphors. A compact pilot can uncover usability issues but cannot prove general emotional effects. |
| 3, 108 pages | Perception and cognition; color guidelines p92–103; image-only final examples: scatterplot color assignment p104–105 and “Dynamic Color Assignment for Hierarchical Data” p107 | Keep recording colors consistent, use direct labels, ensure ordered measures are visually ordered. The hierarchical color example does not imply that this dataset needs a hierarchy. |
| 4, 127 pages | EDA and visual encoding; Cerebral small multiples p115; TreeVersity overview/zoom/filter p121–122; bottom-up story p123; responsiveness p125–126 | This is the strongest source for paired pitch curves, shared scales, small-multiple layout, a concrete-case opening and immediate interaction. |
| 5, 113 pages | Normalization/smoothing/sampling/binning/dimensionality reduction; final graph-sampling perception study roughly p83–112, with cluster-quality result at p106 and conclusion p112 | Explain transformations and sampling. Metrics retained by an algorithm may differ from what readers perceive. Do not claim a graph-sampling result directly validates audio sampling. Avoid smoothing away short pauses or pitch turns. |
| 6, 92 pages | Geographic data; SmartAdP p48–69, HomeFinder p70–80, final SEEVis evacuation storyboard p81–91; split-screen comparison at p90 | Borrow guided progression from overview to selected passage and side-by-side comparison. Do not add a geographic map unless verified geographic metadata answers a geographic question. |
| 7, 88 pages | High-dimensional visualization; small multiples p78–82; Dust & Magnet p83–85; final image-only posters: LineUp p86 and SkyLens p87 | Use a small sortable metric table and small multiples. Parallel coordinates, weighted rankings and dimensionality-reduction maps are optional future exploration, not necessary for three main cases. |
| 8, 58 pages | Hierarchical visualization; TreeEvo family-tree example p54–55; final p57 is a WeSeer demonstration poster | The transferable idea is selection in a summary exposing detail. Do not fabricate a parent-child taxonomy or make a treemap of music merely because hierarchy was taught. |
| 9, 101 pages | Cross-media/text visualization; feature-distribution views p61–67 (ConceptVector, SentenTree, Literature Fingerprinting, FeatureLens); final ImageVis p99–100 | Link aggregate patterns to original text/audio, retain context rather than relying on a word cloud. A similar Chinese translation is a retrieval cue, not proof of identical sung phonemes. |
| 10, 107 pages | Network/social-media visualization; final applications p97–101 include ScatterBlogs2 and WeiboEvents; challenges p102–105 | Link summary to source evidence and distinguish patterns from interpretation. Network or river views are not required without real relational/temporal data. Recording time inside a song is not the same as historical chronology. |
| 11, 89 pages | Temporal visualization; DTW p69–72; principles p82–83; final TimeSearcher 1.0/2.0/3.0 p84–86 | Directly relevant: temporal brush/selection, linked views, full context plus detail, and comparison. TimeSearcher 2.0 visually shows linked series and a lower overview window. |
| 12, 154 pages | Interaction taxonomy p9–68; overview/detail p70–76; later examples include ViSTAR p123–128 and CPR support p141–153 | Use select, abstract/elaborate, filter and connect as actual interactions. ViSTAR p126 shows side-by-side comparison and DTW; CPR p148–149 emphasizes in-context feedback and staged support. Apply the design idea cautiously, not its medical outcome claims. |
| 13, 104 pages | Explainability; ASight p60–82; final medical multimodal case p83–101, design alternatives p96/p99 | Keep derived measures traceable, show uncertainty, compare modalities without confusing prediction with explanation. The final case explicitly demonstrates that simpler charts can better serve comparison than a Sankey. |

## Concrete novice accompaniment proposal

1. Preserve the selected original vocal as an unchanged reference. Give a plainly visible “original vocal” toggle/reset.
2. Offer three or four **audible starting points**, named by sound construction (for example “long-tone layer”, “light pulse”, “plucked texture”), not by asserted cultural authenticity or guaranteed emotion.
3. A user first chooses a starting point and hears the change. Only then reveal optional controls such as “sparser / denser” and accompaniment level. Musical key, chord symbols and a full piano roll should not be prerequisites.
4. Put the feedback beside the manipulation: the timeline marks where accompaniment enters; active layers are visible; the original-vocal trace remains the stable reference.
5. Make all actions reversible. Store a local configuration only when the user chooses to keep it; “my interpretation” can be a short optional sentence.
6. Prefer short verified phrases. Free-rhythm singing may be better served by sustained tones or phrase-triggered sounds than by a rigid beat grid.
7. Validate this as an interaction, not as a proven music-education intervention: can someone with little musical training make a version, identify what changed, compare with the original, and reset without help?

This proposal uses L12 abstract/elaborate (p39–41), reversible exploration (p56), linked context (p62–66), and staged support (p148–149). The specific audio controls are a new project design choice, not an existing course method named “novice accompaniment.”

## Guardrails for the midpoint presentation

- Label the 116/118/119 observations as personal preliminary observations until measured and/or independently evaluated.
- Keep measured structure, listener feedback, and cultural interpretation in separate statements. A pitch range is not an emotion score.
- Mark auto-extracted pitch as estimated; break unreliable segments instead of connecting through them. Absence of a stable F0 is not equivalent to silence.
- If “long notes” are based only on continuous voiced segments, call them that. Sustained syllable duration requires a trustworthy segmentation or manual annotation.
- Reveal Chinese text as translation/meaning information, not exact aligned lyrics where alignment has not been verified.
- A before/after lyric reveal in the public demo illustrates the question. It does not isolate a causal lyric effect because repeated listening and ordering remain confounds.
- Show actual computed data and real playback in the demo. Empty feedback results must stay empty; do not invent participant counts or preference percentages.
- The accompaniment prototype can be rule-based / synthesized. State that model generation and cultural evaluation remain future work if they are not implemented.

## References that can be named precisely

These references are sources for design principles, not a claim to have independently reproduced their results. Primary author-hosted links below were checked where provided:

- Tamara Munzner, *Visualization Analysis and Design*. Course textbook and the source of several principles in L4.
- Ben Shneiderman (1996), [*The Eyes Have It: A Task by Data Type Taxonomy for Information Visualizations*](https://www.cs.umd.edu/users/ben/papers/Shneiderman1996eyes.pdf). Named on L4 p119; overview, zoom/filter, details on demand.
- Aaron Barsky, Tamara Munzner, Jennifer Gardy, Robert Kincaid (2008), [*Cerebral: Visualizing Multiple Experimental Conditions on a Graph with Biological Context*](https://www.cs.ubc.ca/labs/imager/tr/2008/cerebral/cerebral.pdf). Named and pictured on L4 p115; small-multiple comparison.
- Ji Soo Yi, Youn ah Kang, John T. Stasko, Julie A. Jacko (2007), [*Toward a Deeper Understanding of the Role of Interaction in Information Visualization*](https://faculty.cc.gatech.edu/~john.stasko/papers/infovis07-interaction.pdf). Independently checked the authors' hosted paper: its seven intent-based interaction categories match those listed on L12 p10. This supports selecting a few task-relevant interactions rather than adding interaction for its own sake.
- TimeSearcher 1.0/2.0/3.0: L11 p84–86. Cite the course for the screenshot/example unless the original paper is separately consulted.

## Source and render locations

- Source PDFs: `ppt/ARTS1422_Data_Visualization_1.pdf` through `ppt/ARTS1422_Data_Visualization_13.pdf`.
- Full extracted text: `DVproject/demo-research/course/lecture-1.txt` through `lecture-13.txt`.
- Representative rendered examples: `DVproject/demo-research/course/L<lecture>-p<PDF-page>.png`.
- Contact sheets: `DVproject/demo-research/course/montage-1.png`, `montage-2.png`.

The course PDFs and the user's original design PDF were not modified.

## Contour readability revision — 2026-11-16

The hero uses directly labeled, aligned small multiples on shared time and pitch scales (L4). Detailed views retain shared axes, a recording-end background, hover inspection, a moving pitch marker and time brushing (L11–12). Colored recording cards preserve identity without relying on color alone. At the user's request, added insight cards, reading instructions, mode controls and on-chart explanatory legends have been removed; the revision now focuses on appearance and existing interaction.

Display processing uses a three-sample median only within contiguous valid runs, with monotone interpolation between those samples. Solid lines and their area backgrounds stop at missing estimates. A separate dashed guide bridges endpoints only if separated by at most 0.30 s and four semitones. This is a display transformation, not recovered measurements, note transcription or a confidence interval (L5/L13). Source frames, all metrics and audio remain unchanged. Energy is normalized within each recording.

Geometry tests cover all 17 recordings and source immutability. Browser checks cover all eight pairs, optional reference, relative axes, brushing, playback, both languages and mobile width. Readability has been visually inspected but not evaluated in a participant study.
