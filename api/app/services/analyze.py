from __future__ import annotations

import numpy as np
import pyloudnorm as pyln

from app.core.schemas import AudioAnalysis
from app.services.audio_io import to_mono


def analyze_audio(data: np.ndarray, sample_rate: int) -> AudioAnalysis:
    mono = to_mono(data)
    peak = float(np.max(np.abs(mono)) + 1e-12)
    rms = float(np.sqrt(np.mean(mono**2)) + 1e-12)
    peak_db = 20.0 * np.log10(peak)
    rms_db = 20.0 * np.log10(rms)

    meter = pyln.Meter(sample_rate)
    try:
        lufs = float(meter.integrated_loudness(mono))
        if not np.isfinite(lufs):
            lufs = rms_db
    except Exception:
        lufs = rms_db

    # Simple dynamic range proxy: peak - RMS
    dynamic_range_db = float(peak_db - rms_db)

    return AudioAnalysis(
        sample_rate=sample_rate,
        channels=1 if data.ndim == 1 else data.shape[1],
        duration_sec=float(len(mono) / sample_rate),
        peak_db=round(peak_db, 2),
        rms_db=round(rms_db, 2),
        lufs=round(lufs, 2),
        dynamic_range_db=round(dynamic_range_db, 2),
    )
