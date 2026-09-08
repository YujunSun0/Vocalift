from __future__ import annotations

import numpy as np
import pyloudnorm as pyln
from scipy.ndimage import maximum_filter1d
from scipy.signal import sosfilt, sosfilt_zi

from app.core.schemas import AudioAnalysis, MasteringParams
from app.services.analyze import analyze_audio
from app.services.audio_io import to_mono


def suggest_params(analysis: AudioAnalysis) -> MasteringParams:
    """Rule-based initial mastering parameters from analysis."""
    params = MasteringParams()

    if analysis.lufs < -20:
        params.comp_makeup_db = 3.0
        params.saturation = 0.22
    elif analysis.lufs > -12:
        params.comp_threshold_db = -14.0
        params.comp_ratio = 2.5

    if analysis.dynamic_range_db > 18:
        params.comp_ratio = 2.5
        params.comp_threshold_db = -16.0
        params.comp_makeup_db = 2.5
    elif analysis.dynamic_range_db < 8:
        params.comp_ratio = 1.4
        params.saturation = 0.08

    params.target_lufs = -14.0
    params.true_peak_db = -1.2 if analysis.peak_db > -1.5 else -1.0
    params.low_shelf_db = 0.4 if analysis.rms_db < -18 else -0.3
    params.presence_db = 0.8
    params.air_db = 0.6

    return params


def _db_to_lin(db: float) -> float:
    return float(10 ** (db / 20.0))


def _design_shelf(sr: int, freq: float, gain_db: float, shelf_type: str) -> np.ndarray:
    if abs(gain_db) < 1e-6:
        return np.array([[1.0, 0.0, 0.0, 1.0, 0.0, 0.0]], dtype=np.float64)

    A = 10 ** (gain_db / 40.0)
    w0 = 2 * np.pi * freq / sr
    cosw = np.cos(w0)
    sinw = np.sin(w0)
    S = 1.0
    alpha = sinw / 2.0 * np.sqrt((A + 1 / A) * (1 / S - 1) + 2)

    if shelf_type == "low":
        b0 = A * ((A + 1) - (A - 1) * cosw + 2 * np.sqrt(A) * alpha)
        b1 = 2 * A * ((A - 1) - (A + 1) * cosw)
        b2 = A * ((A + 1) - (A - 1) * cosw - 2 * np.sqrt(A) * alpha)
        a0 = (A + 1) + (A - 1) * cosw + 2 * np.sqrt(A) * alpha
        a1 = -2 * ((A - 1) + (A + 1) * cosw)
        a2 = (A + 1) + (A - 1) * cosw - 2 * np.sqrt(A) * alpha
    else:
        b0 = A * ((A + 1) + (A - 1) * cosw + 2 * np.sqrt(A) * alpha)
        b1 = -2 * A * ((A - 1) + (A + 1) * cosw)
        b2 = A * ((A + 1) + (A - 1) * cosw - 2 * np.sqrt(A) * alpha)
        a0 = (A + 1) - (A - 1) * cosw + 2 * np.sqrt(A) * alpha
        a1 = 2 * ((A - 1) - (A + 1) * cosw)
        a2 = (A + 1) - (A - 1) * cosw - 2 * np.sqrt(A) * alpha

    return np.array(
        [[b0 / a0, b1 / a0, b2 / a0, 1.0, a1 / a0, a2 / a0]], dtype=np.float64
    )


def _design_peak(sr: int, freq: float, gain_db: float, q: float) -> np.ndarray:
    if abs(gain_db) < 1e-6:
        return np.array([[1.0, 0.0, 0.0, 1.0, 0.0, 0.0]], dtype=np.float64)

    A = 10 ** (gain_db / 40.0)
    w0 = 2 * np.pi * freq / sr
    alpha = np.sin(w0) / (2 * q)
    cosw = np.cos(w0)

    b0 = 1 + alpha * A
    b1 = -2 * cosw
    b2 = 1 - alpha * A
    a0 = 1 + alpha / A
    a1 = -2 * cosw
    a2 = 1 - alpha / A

    return np.array(
        [[b0 / a0, b1 / a0, b2 / a0, 1.0, a1 / a0, a2 / a0]], dtype=np.float64
    )


def _apply_sos(data: np.ndarray, sos: np.ndarray) -> np.ndarray:
    out = np.empty_like(data, dtype=np.float64)
    for ch in range(data.shape[1]):
        zi = sosfilt_zi(sos) * float(data[0, ch])
        out[:, ch], _ = sosfilt(sos, data[:, ch], zi=zi)
    return out


def _apply_eq(data: np.ndarray, sr: int, params: MasteringParams) -> np.ndarray:
    y = data.astype(np.float64)
    y = _apply_sos(y, _design_shelf(sr, params.low_shelf_hz, params.low_shelf_db, "low"))
    y = _apply_sos(
        y, _design_peak(sr, params.presence_hz, params.presence_db, params.presence_q)
    )
    y = _apply_sos(y, _design_shelf(sr, params.air_hz, params.air_db, "high"))
    return y.astype(np.float32)


def _smooth_gain_db(
    gain_db: np.ndarray, sr: int, attack_ms: float, release_ms: float
) -> np.ndarray:
    """Asymmetric one-pole smoother (vectorized-friendly via numba-free loop on gain only)."""
    attack = np.exp(-1.0 / max(sr * (attack_ms / 1000.0), 1.0))
    release = np.exp(-1.0 / max(sr * (release_ms / 1000.0), 1.0))
    out = np.empty_like(gain_db)
    prev = 0.0
    # Operate on decimated envelope for speed, then interpolate
    hop = max(1, sr // 1000)  # ~1ms
    idx = np.arange(0, len(gain_db), hop)
    sparse = gain_db[idx]
    smooth = np.empty_like(sparse)
    for i, g in enumerate(sparse):
        coeff = attack if g < prev else release
        prev = coeff * prev + (1.0 - coeff) * g
        smooth[i] = prev
    out = np.interp(np.arange(len(gain_db)), idx, smooth)
    return out


def _apply_compressor(data: np.ndarray, sr: int, params: MasteringParams) -> np.ndarray:
    eps = 1e-12
    # Stereo-linked: use max abs across channels
    abs_x = np.max(np.abs(data), axis=1) + eps
    level_db = 20.0 * np.log10(abs_x)
    over = np.maximum(level_db - params.comp_threshold_db, 0.0)
    target_gain_db = -over * (1.0 - 1.0 / params.comp_ratio)
    env = _smooth_gain_db(
        target_gain_db, sr, params.comp_attack_ms, params.comp_release_ms
    )
    gain = (10 ** (env / 20.0)) * _db_to_lin(params.comp_makeup_db)
    return (data * gain[:, None]).astype(np.float32)


def _apply_saturation(data: np.ndarray, amount: float) -> np.ndarray:
    if amount <= 1e-6:
        return data
    drive = 1.0 + amount * 4.0
    wet = np.tanh(data * drive) / np.tanh(drive)
    mix = amount * 0.65
    return ((1.0 - mix) * data + mix * wet).astype(np.float32)


def _loudness_normalize(data: np.ndarray, sr: int, target_lufs: float) -> np.ndarray:
    mono = to_mono(data)
    meter = pyln.Meter(sr)
    try:
        loudness = meter.integrated_loudness(mono)
        if not np.isfinite(loudness):
            return data
        gain = float(np.clip(_db_to_lin(target_lufs - loudness), 0.05, 12.0))
        return (data * gain).astype(np.float32)
    except Exception:
        return data


def _limiter(
    data: np.ndarray, sr: int, ceiling_db: float, release_ms: float
) -> np.ndarray:
    ceiling = _db_to_lin(ceiling_db)
    abs_x = np.max(np.abs(data), axis=1)
    look = max(1, int(sr * 0.002))
    window_peak = maximum_filter1d(abs_x, size=look + 1, mode="nearest")

    needed = np.minimum(1.0, ceiling / (window_peak + 1e-12))
    release = np.exp(-1.0 / max(sr * (release_ms / 1000.0), 1.0))
    hop = max(1, sr // 2000)
    idx = np.arange(0, len(needed), hop)
    sparse = needed[idx]
    smooth = np.empty_like(sparse)
    prev = 1.0
    for i, n in enumerate(sparse):
        if n < prev:
            prev = n
        else:
            prev = release * prev + (1.0 - release) * n
        smooth[i] = prev
    gain = np.interp(np.arange(len(needed)), idx, smooth)
    return (data * gain[:, None]).astype(np.float32)


def master_audio(
    data: np.ndarray, sample_rate: int, params: MasteringParams
) -> tuple[np.ndarray, AudioAnalysis]:
    if data.ndim == 1:
        data = data[:, None]

    y = _apply_eq(data, sample_rate, params)
    y = _apply_compressor(y, sample_rate, params)
    y = _apply_saturation(y, params.saturation)
    y = _loudness_normalize(y, sample_rate, params.target_lufs)
    y = _limiter(y, sample_rate, params.true_peak_db, params.limiter_release_ms)

    peak = float(np.max(np.abs(y)) + 1e-12)
    ceiling = _db_to_lin(params.true_peak_db)
    if peak > ceiling:
        y = (y * (ceiling / peak)).astype(np.float32)

    return y, analyze_audio(y, sample_rate)
