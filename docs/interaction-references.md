# Research and interaction notes for the Yi singing demo

Reviewed 2026-11-15. Source design: `initial-design.txt`, extracted from the user's five-page design PDF. The current demo is bilingual, preserving Chinese lyrics as source text. These are proposed design applications, not results from our own user study.

## Three verified primary references

1. **Edward Segel and Jeffrey Heer (2010). _Narrative Visualization: Telling Stories with Data._ IEEE Transactions on Visualization and Computer Graphics, 16(6), 1139–1148.** DOI: https://doi.org/10.1109/TVCG.2010.179 . Author PDF: https://vis.stanford.edu/files/2010-Narrative-InfoVis.pdf . Relevant location: PDF p. 8, sections 4.4.1–4.4.2. The paper distinguishes a guided beginning followed by exploration (martini glass) from an interactive slideshow with exploration inside each stage. **Application:** a guided sequence of listening, inspecting sound, revealing words, and making an accompaniment, with independent interaction within each stage. If the website lets users freely interact at every stage, describe it as an interactive narrative with guided stages, rather than a strict martini-glass implementation. This is a design framework, not experimental proof that this sequence improves comprehension.

2. **Chris Cannam, Christian Landone, and Mark Sandler (2010). _Sonic Visualiser: An Open Source Application for Viewing, Analysing, and Annotating Music Audio Files._ Proceedings of ACM Multimedia 2010, 1467–1468.** DOI: https://doi.org/10.1145/1873951.1874248 . Author PDF: https://sonicvisualiser.org/sv2010.pdf . Relevant location: PDF p. 1, sections 2.1–2.2; p. 2, section 3. The application aligns waveform, feature layers, and annotations on a common time axis. **Application:** waveform, estimated pitch, and low-energy bands share one time scale and one playback cursor. A user can replay the location behind a visual observation. Preserve separate units and show missing pitch as gaps. Do not attribute a specific chart design or our pitch-estimation accuracy to this paper.

3. **Ryan Louie, Andy Coenen, Cheng Zhi Huang, Michael Terry, and Carrie J. Cai (2020). _Novice-AI Music Co-Creation via AI-Steering Tools for Deep Generative Models._ Proceedings of CHI 2020, 1–13.** DOI: https://doi.org/10.1145/3313831.3376739 . Author PDF: https://youralien.github.io/files/cococo_chi2020_copy.pdf . Relevant location: PDF pp. 4–5 (Voice Lanes, Semantic Sliders, Audition Multiple Alternatives), p. 2 for the study scope. The study explored bounded generation, high-level steering, and comparison with an original version. **Application:** keep the original recording fixed, expose a few audible controls, and allow immediate original/arrangement comparison. Our first prototype uses deterministic synthesis, not their AI model. Their participants had instrumental experience but little composition experience; their findings do not establish usability for all people with no music training or validity for Yi music. Do not copy their major/happy and minor/sad mapping as a universal cultural model.

## Proposed novice interaction

The visitor's task: **“Make a version that expresses how you hear this phrase.”**

Use one short recording at a time. Display the original vocal waveform and a separate accompaniment lane. The recorded voice keeps its original timing and pitch. Do not ask the visitor to choose a key, chord progression, time signature, BPM, or MIDI notes in the first prototype.

Three controls:

| Visible label | Options or endpoints | What changes |
|---|---|---|
| **Texture** | **Soft bed / Light plucks / Wood taps** | Audible synthesized sound and envelope; these are creative starting points, not purported Yi instruments or authenticity labels |
| **Activity** | **Sparse / Balanced / Frequent** | Number of accompaniment accents; deterministic nested event sets keep the effect understandable |
| **Presence** | **Subtle — Forward** | Accompaniment gain relative to a fixed original vocal gain |

Use **“Original”** and **“My arrangement”** as the comparison buttons. Toggle accompaniment gain on the same transport position, with a brief ramp to avoid clicks. Do not restart or time-stretch the singer when toggling. Keep **“Start again”** available for whole-phrase comparisons. Change presets without mutating the original voice. Reset to a predictable initial state, and use text plus selection state rather than color alone.

Optional introductory presets can be phrased as intentions, such as **“Leave more space”** or **“Bring out the accents”**, but should simply set these three controls. Avoid labels such as “correct emotion,” “authentic,” “sadness score,” or “AI understands the song.”

## Implementation direction for Web Audio

- Use one audio clock for the original recording and accompaniment scheduling. A single `AudioBufferSourceNode` can preserve original timing; connect synthesized sounds through a separate gain bus.
- Prefer sparse events anchored to reviewed or explicitly estimated acoustic landmarks over a global fixed-BPM loop. If derived only from energy thresholds, call them **estimated sound regions**, not verified syllables or phrases. Detected onsets are not automatically beats.
- A soft sustained layer and filtered percussive taps need no chord inference. Pitch-based plucks can reference a valid local F0 region and must be labeled synthetic; low-confidence regions should not create a guessed note. A global median F0 is not proof of musical key.
- Initially render modest levels, smooth gain/envelope changes, and preserve headroom. A/B must retain the same vocal gain. Loudness may influence preference; the prototype's subjective comparisons should not be presented as a controlled causal experiment.
- Visual feedback: show accompaniment event marks in a distinct lane, and emphasize the currently sounding event. Show the original pitch curve unchanged when controls change. This lets the visitor connect an action with what was added.
- Any saved arrangement should retain record ID, control values, algorithm version, and local feedback. A “Save” that uses browser storage must say **“Saved on this device.”** Do not display aggregate results or participant counts unless collected.

## Lightweight feasibility evaluation

Demo question after a comparison: **“Did the controls help you make the change you wanted?”** Choices: **Yes / Partly / No / Not sure**. Optional free text: **“What were you trying to express?”** Allow skipping.

For a later pilot, recruit people with different self-reported music experience and ask them to make one intended change, compare with the original, and restore the original. Observe completion without help, confusion between controls, time to first deliberate change, and whether they can explain the result. This assesses interaction feasibility. It does not establish the singer's intent or a culture-wide emotional meaning.

The lyrics reveal step is a reader experience, not a controlled lyrics-effect experiment. A formal study would need alternate orders or conditions because repeated listening also changes judgments.

## Short reference labels for the demo

- **Guided storytelling:** Segel & Heer, 2010
- **Aligned audio views:** Cannam, Landone & Sandler, 2010
- **Bounded creative control:** Louie et al., 2020

Place these labels beside a short explanation in a methods/references panel; link to the primary sources above. The demo should explicitly distinguish **Measured audio features**, **Your listening response**, and **Your added accompaniment**.
