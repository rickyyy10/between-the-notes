#!/usr/bin/env python3
"""Build the demo's real, reproducible audio evidence from the course dataset.

Run from any directory:
  demo/.venv/bin/python demo/scripts/analyze_audio.py

Only selected comparison records are decoded and pitch-tracked. No emotion,
syllable, cultural-intent, or listener-preference labels are inferred.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
from collections import Counter, defaultdict
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
# Keep JIT cache within the project, including in restricted environments.
os.environ.setdefault("NUMBA_CACHE_DIR", str(ROOT / ".cache" / "numba"))

import librosa
import numpy as np

SR = 22050
FRAME_LENGTH = 2048
HOP_LENGTH = 256
PLOT_STRIDE = 4
VOICED_PROB_MIN = 0.10
LOW_ENERGY_DB = -35.0
MIN_LOW_ENERGY_SECONDS = 0.12
FMIN = float(librosa.note_to_hz("C2"))
FMAX = float(librosa.note_to_hz("C6"))


def dump(path: Path, obj: object) -> None:
    path.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":"), allow_nan=False), encoding="utf-8")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def low_energy_intervals(rms_db: np.ndarray, duration: float, threshold: float) -> list[list[float]]:
    """Contiguous low-RMS regions, with boundaries at frame-center midpoints."""
    low = rms_db < threshold
    padded = np.pad(low.astype(np.int8), (1, 1))
    starts = np.flatnonzero(np.diff(padded) == 1)
    ends = np.flatnonzero(np.diff(padded) == -1)
    step = HOP_LENGTH / SR
    out = []
    for start, end in zip(starts, ends):
        t0 = max(0.0, (start - 0.5) * step)
        t1 = min(duration, (end - 0.5) * step)
        if t1 - t0 >= MIN_LOW_ENERGY_SECONDS:
            out.append([round(t0, 4), min(round(t1, 4), round(duration, 5))])
    return out


def wave_bins(y: np.ndarray, count: int = 800) -> list[dict]:
    edges = np.linspace(0, len(y), count + 1, dtype=int)
    result = []
    for a, b in zip(edges[:-1], edges[1:]):
        if b <= a:
            continue
        result.append({"t": round((a + b) / (2 * SR), 4), "min": round(float(y[a:b].min()), 5), "max": round(float(y[a:b].max()), 5)})
    return result


def analyze(row: dict, data_root: Path, output: Path) -> dict:
    source = data_root / row["音频"]
    # soundfile/librosa preserves gapless decoded MP3 duration; no normalization
    # or denoising is applied to the source playback asset.
    y, _ = librosa.load(source, sr=SR, mono=True)
    duration = len(y) / SR
    f0, voiced_flag, voiced_prob = librosa.pyin(
        y, sr=SR, fmin=FMIN, fmax=FMAX,
        frame_length=FRAME_LENGTH, hop_length=HOP_LENGTH,
        center=True, fill_na=np.nan,
    )
    rms = librosa.feature.rms(y=y, frame_length=FRAME_LENGTH, hop_length=HOP_LENGTH, center=True)[0]
    rms_db = 20 * np.log10(np.maximum(rms, 1e-10) / max(float(rms.max()), 1e-10))
    rms_db = np.maximum(rms_db, -100)
    valid = voiced_flag & (voiced_prob >= VOICED_PROB_MIN) & np.isfinite(f0)
    # A voiced flag is NOT a silence detector. Keep RMS and F0 separate.
    f0 = np.where(valid, f0, np.nan)
    good = f0[np.isfinite(f0)]
    quantiles = np.quantile(good, [0.05, 0.5, 0.95]) if good.size else [None, None, None]
    q05, q50, q95 = [float(x) if x is not None else None for x in quantiles]
    intervals = low_energy_intervals(rms_db, duration, LOW_ENERGY_DB)
    low_duration = sum(b - a for a, b in intervals)
    times = librosa.frames_to_time(np.arange(len(rms)), sr=SR, hop_length=HOP_LENGTH)
    active = np.flatnonzero(rms_db >= LOW_ENERGY_DB)
    bounds = [max(0.0, (active[0] - .5) * HOP_LENGTH / SR), min(duration, (active[-1] + .5) * HOP_LENGTH / SR)] if active.size else [0.0, duration]
    internal_duration = sum(max(0, min(b, bounds[1]) - max(a, bounds[0])) for a, b in intervals)
    frames = []
    for i in range(0, min(len(rms), len(f0)), PLOT_STRIDE):
        if times[i] > duration:
            continue
        frames.append({
            "t": round(float(times[i]), 4),
            "f0": round(float(f0[i]), 3) if np.isfinite(f0[i]) else None,
            "voicedProb": round(float(voiced_prob[i]), 4),
            "rmsDb": round(float(rms_db[i]), 3),
        })
    name = row["id"] + ".mp3"
    shutil.copy2(source, output / "audio" / name)
    record = {
        "id": row["id"], "title": row["名称"],
        "label": row["名称"].split(" — ")[0],
        "chinese": row["中文词"], "ipa": row["彝语音标"],
        "notes": row["备注"], "source": row["来源"],
        "audio": "audio/" + name, "duration": round(duration, 5),
        "sha256": sha256(source),
        "decodedPcmSha256": hashlib.sha256(y.astype("<f4").tobytes()).hexdigest(),
        "waveform": wave_bins(y), "frames": frames,
        "lowEnergyIntervals": intervals,
        "metrics": {
            "pitchP05Hz": round(q05, 3) if q05 else None,
            "pitchMedianHz": round(q50, 3) if q50 else None,
            "pitchP95Hz": round(q95, 3) if q95 else None,
            "pitchRangeSemitones": round(float(12 * np.log2(q95 / q05)), 3) if q05 and q95 else None,
            "voicedFrameRatio": round(float(valid.mean()), 5),
            "lowEnergyRatio": round(low_duration / duration, 5),
            "lowEnergyDuration": round(low_duration, 4),
            "activeBounds": [round(x, 4) for x in bounds],
            "internalLowEnergyRatio": round(internal_duration / max(bounds[1] - bounds[0], 1e-6), 5),
            "lowEnergySensitivity": [
                {"thresholdDb": th, "ratio": round(sum(b-a for a,b in low_energy_intervals(rms_db, duration, th))/duration, 5)}
                for th in [-30.0, -35.0, -40.0]
            ],
        },
        "quality": {
            "status": "automatic_unreviewed",
            "note": "自动提取，未逐帧人工校正。音高缺失不等于停顿；低能量不等于无声；未标注音节、拖腔或情绪。",
        },
    }
    print(f"{row['id']}: {duration:.2f}s, pitch {record['metrics']['pitchRangeSemitones']}st, retained F0 {valid.mean():.0%}", flush=True)
    return record


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", type=Path, default=ROOT.parent / "project-1-data")
    parser.add_argument("--output", type=Path, default=ROOT / "dist")
    args = parser.parse_args()
    for part in ["data", "audio"]:
        (args.output / part).mkdir(parents=True, exist_ok=True)
    with (args.dataset / "dataset.csv").open(encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))
    traditional = [r for r in rows if r["id"].startswith("ecura")]
    by_text = defaultdict(list)
    for row in traditional:
        if row["中文词"].strip():
            by_text[row["中文词"].strip()].append(row)
    pairs = [{"id": f"pair-{i+1}", "recordIds": [r["id"] for r in group], "text": text,
              "basis": "传统记录中文字段仅去首尾空白后完全相同；不代表彝语原词或录音相同。"}
             for i, (text, group) in enumerate((t, g) for t, g in by_text.items() if len(g) > 1)]
    selected = {rid for pair in pairs for rid in pair["recordIds"]} | {"ecura-0116"}
    records = [analyze(r, args.dataset, args.output) for r in rows if r["id"] in selected]
    duplicates = []
    for key in ["sha256", "decodedPcmSha256"]:
        hashes = defaultdict(list)
        for record in records:
            hashes[record[key]].append(record["id"])
        duplicates += [{"method": key, "recordIds": ids} for ids in hashes.values() if len(ids) > 1]
    labels = Counter(r["名称"].split(" — ")[0] for r in traditional)
    corpus = {
        "total": len(rows), "traditional": len(traditional), "contemporary": len(rows)-len(traditional),
        "matchedGroups": len(pairs), "matchedRecords": sum(len(p["recordIds"]) for p in pairs),
        "analyzedRecords": len(records), "missingIpa": sum(not r["彝语音标"].strip() for r in rows),
        "missingAudio": sum(not (args.dataset/r["音频"]).is_file() for r in rows),
        "traditionalLabelCounts": [{"label": label, "count": count} for label,count in labels.most_common()],
        "comparisonScope": f"{len(pairs)}组同中文字段的传统记录是探索性案例，不代表全体彝族音乐。",
    }
    method = {
        "schemaVersion": 1, "algorithm": "librosa.pyin", "librosaVersion": librosa.__version__,
        "numpyVersion": np.__version__, "sampleRate": SR, "mono": True,
        "frameLength": FRAME_LENGTH, "hopLength": HOP_LENGTH, "plotStride": PLOT_STRIDE,
        "plotFrameSeconds": HOP_LENGTH*PLOT_STRIDE/SR, "fminHz": FMIN, "fmaxHz": FMAX,
        "voicedProbMin": VOICED_PROB_MIN,
        "rmsDbReference": "maximum RMS of this recording (0 dB); not calibrated loudness",
        "lowEnergyThresholdDb": LOW_ENERGY_DB, "minLowEnergySeconds": MIN_LOW_ENERGY_SECONDS,
        "pitchRangeDefinition": "12*log2(P95(F0)/P05(F0)), using all valid analysis frames before plot decimation",
        "lowEnergyRatioDefinition": "duration of contiguous below-threshold RMS intervals >=0.12s / decoded recording duration; includes leading/trailing regions",
        "internalLowEnergyRatioDefinition": "below-threshold interval duration within first-to-last above-threshold frame / that active-span duration",
        "pairingDefinition": "exact Unicode equality after .strip() on Chinese text among ecura IDs",
        "datasetCsvSha256": sha256(args.dataset / "dataset.csv"),
        "duplicateAudit": {"scope": "selected records only", "matches": duplicates, "limitation": "Byte/decoded-PCM hashes detect identical files only; not near-duplicates or overlapping source excerpts."},
        "limitations": [
            "pYIN为单基频估计，重叠人声、非周期音或录音噪声可能导致错误。",
            "voicedProb是发声概率，不是音高正确率；未逐帧人工核验。",
            "低能量区间是阈值派生，不能直接叫作停顿；音高缺失也不能当作静音。",
            "无音节边界真值，不输出拖音时长、音节速率或情绪评分。",
            "音频播放保留原文件；分析用单声道重采样版本。",
            "中文可能是译文或摘要，同中文字段不保证相同彝语原词。",
        ],
        "references": [
            {"title": "librosa pYIN documentation", "url": "https://librosa.org/doc/0.11.0/generated/librosa.pyin.html"},
            {"title": "Mauch & Dixon (2014). pYIN: A fundamental frequency estimator using probabilistic threshold distributions", "url": "https://doi.org/10.1109/ICASSP.2014.6853678"},
            {"title": "librosa RMS documentation", "url": "https://librosa.org/doc/0.11.0/generated/librosa.feature.rms.html"},
        ],
    }
    dump(args.output / "data" / "demo.json", {"records": records, "pairs": pairs, "corpus": corpus, "method": method})
    catalog = [{"id": r["id"], "title": r["名称"], "group": "traditional" if r["id"].startswith("ecura") else "contemporary",
                "chinese": r["中文词"], "hasIpa": bool(r["彝语音标"].strip()), "analyzed": r["id"] in selected}
               for r in rows]
    dump(args.output / "data" / "catalog.json", catalog)
    dump(args.output / "data" / "analysis-summary.json", {"corpus": corpus, "method": method,
         "records": [{k:r[k] for k in ["id","title","duration","sha256","decodedPcmSha256","metrics","quality"]} for r in records]})
    print(json.dumps({"corpus": corpus,"duplicates":duplicates},ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
