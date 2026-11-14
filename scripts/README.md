# Audio evidence for the midterm demo

The checked-in JSON files are computed from the original course recordings. They are not simulated examples. The web demo does not need Python: serve `../dist/` directly. Python is needed only to reproduce the analysis.

## Reproduce

Use Python 3.12. Create a virtual environment in `demo/.venv`, install `requirements-audio.txt` (or the full `requirements-audio-lock.txt`), then run:

```sh
demo/.venv/bin/python demo/scripts/analyze_audio.py
```

The defaults are resolved relative to this script, so the command may be run from any working directory with the corresponding script path. Optional arguments:

```sh
python analyze_audio.py --dataset /path/to/project-1-data --output /path/to/dist
```

The dataset directory must contain `dataset.csv` and `audio/`. The script does not modify either source. Playback assets are byte-identical copies; analytical signals are decoded to mono at 22,050 Hz.

## Outputs

- `dist/data/demo.json`: 17 analyzed recordings, eight matching-text groups, corpus counts and methods. Default comparison: `ecura-0118` and `ecura-0119`. The additional `ecura-0116` is a related case with different Chinese text, not an exact-text member of this pair.
- `dist/data/catalog.json`: lightweight title and text inventory of all 1,482 records. Only 17 records have audio features in this demo.
- `dist/data/analysis-summary.json`: per-record metrics and source hashes without large time series.
- `dist/audio/`: the 17 corresponding complete MP3 recordings.

## Definitions

- pYIN uses a 2,048-sample window and 256-sample hop. Display frames retain every fourth result (approximately 46.4 ms). Metrics use the full result, before display decimation.
- `f0` is in Hz. It is null when the algorithm does not retain a voiced estimate. `voicedProb` estimates whether the frame is voiced. It does not estimate the probability of a correct fundamental frequency.
- `rmsDb` is relative to the maximum RMS in each recording. It describes the local energy contour, not calibrated loudness or listener-perceived intensity.
- `pitchRangeSemitones` is `12 log2(P95(F0) / P05(F0))`. It describes the retained automatic estimates. It does not score musicality. `pitchMedianHz` is not a verified tonic or key.
- `lowEnergyIntervals` are regions below -35 dB relative RMS that persist for at least 120 ms. `lowEnergyRatio` includes leading/trailing regions. `internalLowEnergyRatio` uses only the span between the first and last above-threshold frames. These are threshold-derived low-energy measures, not annotated linguistic pauses.
- Sensitivity values at -30, -35 and -40 dB are provided. The three initial cases have no internal low-energy interval meeting the default threshold/duration rule. This does not mean they contain no perceived pause.
- Exact-text matches use only leading/trailing whitespace removal on the Chinese field of traditional (`ecura`) records. Shared Chinese text may be a translation or summary and does not prove identical original lyrics.
- File hashes and decoded-mono-PCM hashes identify exact duplicates among selected recordings. They cannot rule out overlapping or near-duplicate source material.

No syllable segmentation, duration of melisma, emotion prediction, listening-study response, or cultural claim is inferred. Pitch tracks remain automatically extracted and await manual correction against the recordings. Source uncertainty and the actual boundaries of the measures must remain visible in presentation copy.

Do not include `.venv/` or `.cache/` in a deployment or submission archive. These can be recreated from dependencies. Audio and JSON assets for the demo reside only in `dist/`.
