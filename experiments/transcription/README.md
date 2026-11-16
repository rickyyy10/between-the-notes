# Audio-to-note transcription experiment

This directory preserves the two-recording experiment originally run on 15 November 2026. The script compares Basic Pitch with pYIN plus heuristic note segmentation. The outputs are automatic drafts, not verified scores or detected chord progressions.

The main website and the existing `/transcription/` page use the bundled files in `dist/`. **You do not need to install these Python dependencies or run this experiment to use or edit the demo.**

## Files

- `scripts/run_trial.py`: the original analysis and export code, with paths adjusted for this repository.
- `requirements-lock.txt`: the versions installed for the historical experiment.
- `input-sha256.json`: hashes of the two source recordings.
- `RESULTS.txt`: the recorded findings, methods and limitations from that run.

The script reads `dist/audio/ecura-0118.mp3` and `dist/audio/ecura-0119.mp3`. It resolves these paths relative to its own location, so the current working directory does not affect them. Intermediate model activations and library caches go into this directory's ignored `.cache/` folder.

## Reproduction boundary

The recorded run used Python 3.14.7, ONNX Runtime 1.32.0 and Basic Pitch 0.4.0's packaged ONNX model. Basic Pitch was installed with `--no-deps`; its optional macOS TensorFlow/CoreML dependencies were not installed. The remaining installed packages are recorded in the lock file.

That Python/librosa combination is outside Basic Pitch's advertised compatibility list. The original run completed for both recordings, but a fresh installation on a teammate's computer has not been verified. Keep this environment separate from the main audio-analysis environment in `scripts/`, which used different package versions. If recreating the historical setup, install Basic Pitch with `--no-deps` and exclude its line when installing the other locked packages with dependency resolution.

After preparing that separate environment, run from the repository root:

```sh
python experiments/transcription/scripts/run_trial.py
```

Use the Python executable from the experiment environment. **Running the script overwrites generated JSON, CSV, MIDI, WAV and comparison PNG files in `dist/transcription/`.** It leaves the viewer's HTML, CSS and JavaScript unchanged. Commit or back up any results you want to preserve before regenerating them.

The repository migration only changed file locations and intermediate-output paths. It did not rerun either model or update the recorded results.
