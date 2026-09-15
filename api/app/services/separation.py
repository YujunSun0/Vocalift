"""음원 분리 서비스 (Vocals / Instrumental MR 분리)."""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

import numpy as np
import soundfile as sf


def _resolve_demucs() -> str:
    """demucs 실행 파일 경로 확인."""
    found = shutil.which("demucs")
    if found:
        return found
    raise RuntimeError(
        "Demucs not found. Install with: pip install demucs"
    )


def separate_vocals(
    input_path: Path,
    output_dir: Path,
    model: str = "htdemucs",
    device: str = "cpu",
) -> tuple[Path, Path]:
    """
    음원을 vocals와 instrumental(no_vocals)로 분리.

    Args:
        input_path: 입력 오디오 파일 경로
        output_dir: 출력 디렉토리
        model: demucs 모델 (기본: htdemucs)
        device: cpu 또는 cuda

    Returns:
        (vocals_path, instrumental_path) 튜플

    Raises:
        RuntimeError: demucs 실행 실패 시
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    demucs_cmd = _resolve_demucs()

    # --two-stems vocals: vocals와 no_vocals 만 출력 (4-stem보다 빠름)
    # -o: 출력 디렉토리
    # -n: 모델명
    # -d: 디바이스 (cpu/cuda)
    cmd = [
        demucs_cmd,
        "-o", str(output_dir),
        "-n", model,
        "-d", device,
        "--two-stems", "vocals",
        str(input_path),
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        detail = (result.stderr or result.stdout or "unknown error").strip()
        raise RuntimeError(f"Demucs separation failed: {detail[-800:]}")

    # Demucs 출력 구조: output_dir / model / input_stem / vocals.wav, no_vocals.wav
    stem = input_path.stem
    sep_dir = output_dir / model / stem
    vocals_path = sep_dir / "vocals.wav"
    instrumental_path = sep_dir / "no_vocals.wav"

    if not vocals_path.exists() or not instrumental_path.exists():
        raise RuntimeError(
            f"Demucs output missing. Expected {vocals_path} and {instrumental_path}"
        )

    return vocals_path, instrumental_path


def analyze_separation_result(
    vocals_path: Path, instrumental_path: Path
) -> dict[str, dict]:
    """분리된 파일들의 기본 분석 정보 반환."""

    def _analyze_file(path: Path) -> dict:
        data, sr = sf.read(str(path), always_2d=True, dtype="float32")
        peak = float(np.max(np.abs(data)))
        rms = float(np.sqrt(np.mean(data**2)))
        peak_db = 20 * np.log10(peak) if peak > 0 else -120.0
        rms_db = 20 * np.log10(rms) if rms > 0 else -120.0

        return {
            "sample_rate": int(sr),
            "channels": data.shape[1] if data.ndim > 1 else 1,
            "duration_sec": float(len(data) / sr),
            "peak_db": round(peak_db, 2),
            "rms_db": round(rms_db, 2),
        }

    return {
        "vocals": _analyze_file(vocals_path),
        "instrumental": _analyze_file(instrumental_path),
    }
