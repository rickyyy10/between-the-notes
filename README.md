# Between the Notes / 听见之间

A bilingual, working midterm prototype for ARTS1422 Project 1. The website follows the supplied design: compare voices, reveal words, then add a personal accompaniment. It uses real course recordings and actual computed audio features.

## Run the demo

No build step or package installation is needed for playback.

```bash
cd /Users/luoguiqi/Desktop/26full/Visualization/DVproject/demo
python3 -m http.server 4187 --bind 127.0.0.1 --directory dist
```

Open http://127.0.0.1:4187. If that port is occupied, choose another port. A server is required; do not open `index.html` with a `file://` URL. The bundled D3 file and audio work without external CDNs once the page is served. Audio starts after an explicit click.

## Demonstration sequence

1. Use the language button to switch between English and Chinese.
2. Compare 118 and 119 without revealing the Chinese text. Listen to each recording.
3. Inspect the shared-scale pitch and energy plots. Click to seek or drag to audition a passage. Inspect the final 20% or use relative progress; actual seconds remain the default.
4. Add 116 as a related-text reference if useful. It is not part of the exact-text pair.
5. Reveal the Chinese words and the working English gloss. Save a brief perception response if desired.
6. Choose a vocal and add a soft tone, plucked tone or percussion. Change activity and presence. Toggle Original / My version without restarting the singer.
7. Save or download a listening note. Data stays in this browser; no participant results are pooled or invented.
8. Open Methods for data definitions, course connections and cited research.

## What is implemented

- Eight verified exact Chinese-text pairs, plus recording 116: 17 full original MP3 files.
- Real pYIN F0 estimates, relative RMS energy, waveform, duration and percentile pitch spans.
- Linked playback cursor, time selection, shared-scale small multiples and labeled transformations.
- Original Chinese text, provided Yi pronunciation, and clearly labeled working English glosses.
- Real Web Audio synthesis in a separate accompaniment bus. The original vocal is not regenerated or time-stretched.
- Three novice controls, original/arranged comparison, local note storage and JSON export.
- English/Chinese interface switching and responsive layout.

## Evidence boundaries

This is an exploratory prototype, not a validated listening experiment. No emotional classifier or generative music model is running. The accompaniment is simple deterministic synthesis, not a reconstruction of Yi instrumentation. Local pitch references are not a validated tonic, scale or chord progression.

Audio F0 estimates have not been manually corrected and may contain octave errors. Voicing probability is not pitch accuracy. Low-energy regions are threshold-derived, not syllables or annotated pauses. For 116, 118 and 119, the default threshold detects no internal low-energy interval; nonzero whole-record low-energy share is mainly at the recording edges.

Chinese-field equality does not prove identical Yi words or matched performance conditions. Source text can be a translation or summary and has no timestamp alignment. Sequentially revealing lyrics is a reader experience; repeated listening and order effects prevent causal claims about lyrics from this interaction alone.

## Files and reproduction

- `dist/`: complete buildless website, vendored D3, derived JSON and selected original MP3s.
- `scripts/analyze_audio.py`: reproducible processing. See `scripts/README.md` and dependency files.
- `dist/data/demo.json`: selected records, pair membership and algorithm parameters.
- `dist/data/catalog.json`: lightweight corpus metadata.
- `dist/data/analysis-summary.json`: data validation summary.
- `tests/` and `qa/`: implementation verification and screenshots when available.
- `.venv/`: local analysis environment, excluded from distribution and deployment.

Raw data remains at `../project-1-data`. Derived data and copies do not replace or alter the supplied originals.

## Course methods

Page numbers refer to PDF pages in the supplied course files.

- Lecture 4, pp.114–115: small multiples and 'Eyes Beat Memory'; shared scales support direct comparison.
- Lecture 11, pp.82–86: time-oriented visualization, linked views, TimeSearcher examples.
- Lecture 12, pp.39–41 and65: abstract/elaborate, progressive disclosure and brushing.
- Lecture 2, pp.115–121: clear encodings, avoid ambiguous cultural metaphors; evaluate interpretation.

Full review of all13 lectures: `../demo-research/course-notes.md`.

## Research references and exact applications

- Segel, E. & Heer, J. (2010). Narrative Visualization: Telling Stories with Data. https://doi.org/10.1109/TVCG.2010.179 . Applied as guided stages with local exploration; not evidence that this prototype improves understanding.
- Cannam, C., Landone, C. & Sandler, M. (2010). Sonic Visualiser: An Open Source Application for Viewing, Analysing, and Annotating Music Audio Files. https://doi.org/10.1145/1873951.1874248 . Applied as audio-aligned feature layers and replayable evidence.
- Louie, R., Coenen, A., Huang, C. Z., Terry, M. & Cai, C. J. (2020). Novice-AI Music Co-Creation via AI-Steering Tools for Deep Generative Models. https://doi.org/10.1145/3313831.3376739 . Inspires bounded controls and original/alternative comparison. Their AI system is not used here, and their participants' musical experience differs from a general novice population.
- Mauch, M. & Dixon, S. (2014). pYIN: A fundamental frequency estimator using probabilistic threshold distributions. https://doi.org/10.1109/ICASSP.2014.6853678 . Used through librosa0.11.0.

## Next pilot

Recruit a small, varied group of listeners, record self-reported music experience, and ask each to make one intended change, compare with the original and restore it. Observe completion without help, control confusion, and whether the result matches their stated intention. Select participant count and procedures before conducting a study. No pilot has been conducted in this deliverable.
