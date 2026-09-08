from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

import numpy as np
import soundfile as sf

# Formats soundfile/libsndfile usually handle directly
DIRECT_READ_SUFFIXES = {".wav", ".flac", ".aiff", ".aif", ".ogg", ".oga"}
# Need FFmpeg (phone recordings, compressed)
FFMPEG_SUFFIXES = {".m4a", ".aac", ".mp3", ".mp4", ".caf", ".wma", ".webm"}


def _resolve_ffmpeg() -> str:
    found = shutil.which("ffmpeg")
    if found:
        return found
    try:
        from imageio_ffmpeg import get_ffmpeg_exe

        return get_ffmpeg_exe()
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError(
            "FFmpeg not found. Install ffmpeg or `pip install imageio-ffmpeg`."
        ) from exc


def ffmpeg_to_wav(src: Path, dst: Path) -> Path:
    """Decode any FFmpeg-supported audio to 24-bit PCM WAV."""
    dst.parent.mkdir(parents=True, exist_ok=True)
    ffmpeg = _resolve_ffmpeg()
    cmd = [
        ffmpeg,
        "-y",
        "-i",
        str(src),
        "-vn",
        "-acodec",
        "pcm_s24le",
        "-ar",
        "44100",
        str(dst),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0 or not dst.exists():
        detail = (result.stderr or result.stdout or "unknown error").strip()
        raise RuntimeError(f"FFmpeg decode failed: {detail[-500:]}")
    return dst


def load_audio(path: Path) -> tuple[np.ndarray, int]:
    """Load audio as float32 shaped (samples, channels).

    WAV/FLAC/AIFF go through soundfile. m4a/aac/mp3/etc. are converted via FFmpeg.
    """
    suffix = path.suffix.lower()
    read_path = path

    if suffix in FFMPEG_SUFFIXES or suffix not in DIRECT_READ_SUFFIXES:
        wav_path = path.with_name(f"{path.stem}.decoded.wav")
        ffmpeg_to_wav(path, wav_path)
        read_path = wav_path
    else:
        # Some MP3 builds of libsndfile work; if not, fall back to ffmpeg
        try:
            data, sr = sf.read(str(path), always_2d=True, dtype="float32")
            return data, int(sr)
        except Exception:
            wav_path = path.with_name(f"{path.stem}.decoded.wav")
            ffmpeg_to_wav(path, wav_path)
            read_path = wav_path

    data, sr = sf.read(str(read_path), always_2d=True, dtype="float32")
    return data, int(sr)


def save_wav(path: Path, data: np.ndarray, sample_rate: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    clipped = np.clip(data, -1.0, 1.0).astype(np.float32)
    sf.write(str(path), clipped, sample_rate, subtype="PCM_24")


def to_mono(data: np.ndarray) -> np.ndarray:
    if data.ndim == 1:
        return data
    return np.mean(data, axis=1)
