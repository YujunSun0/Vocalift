"""음원 분리 서비스 (Vocals / Instrumental MR 분리)."""

from __future__ import annotations

import os
import shutil
import ssl
import subprocess
from pathlib import Path

import numpy as np
import soundfile as sf


def _setup_ssl_context() -> None:
    """
    SSL 인증서 컨텍스트 설정 (macOS Python.org 설치본 문제 해결).
    
    certifi 패키지를 사용해 신뢰할 수 있는 CA 인증서 경로를 SSL 환경변수에 설정.
    """
    try:
        import certifi
        os.environ["SSL_CERT_FILE"] = certifi.where()
        os.environ["REQUESTS_CA_BUNDLE"] = certifi.where()
    except ImportError:
        pass


def _resolve_demucs() -> str:
    """demucs 실행 파일 경로 확인."""
    found = shutil.which("demucs")
    if found:
        return found
    raise RuntimeError(
        "Demucs not found. Install with: pip install demucs"
    )


def _is_ssl_error(error_output: str) -> bool:
    """에러 출력이 SSL 인증서 문제인지 확인."""
    ssl_keywords = [
        "CERTIFICATE_VERIFY_FAILED",
        "certificate verify failed",
        "SSL",
        "urlopen error",
        "_ssl.c:",
    ]
    return any(keyword in error_output for keyword in ssl_keywords)


def _format_ssl_error_message(original_error: str) -> str:
    """SSL 에러를 사용자 친화적인 메시지로 변환."""
    base_msg = (
        "Demucs 모델 다운로드 중 SSL 인증서 오류가 발생했습니다. "
        "이는 macOS에서 Python.org 설치본을 사용할 때 흔히 발생합니다.\n\n"
    )
    
    solutions = (
        "해결 방법:\n"
        "1. (권장) 다음 명령을 실행하세요:\n"
        "   /Applications/Python\\ 3.XX/Install\\ Certificates.command\n"
        "   (Python 버전에 맞게 경로 조정)\n\n"
        "2. 또는 certifi 재설치:\n"
        "   pip install --upgrade certifi\n\n"
        "3. 또는 모델을 수동 다운로드:\n"
        "   python -c \"import torch; from demucs import pretrained; pretrained.get_model('htdemucs')\"\n\n"
    )
    
    original_excerpt = f"원본 에러: {original_error[:200]}..."
    
    return base_msg + solutions + original_excerpt


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
    
    # SSL 컨텍스트 설정 (첫 실행 시 모델 다운로드용)
    _setup_ssl_context()
    
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
        error_output = (result.stderr or result.stdout or "unknown error").strip()
        
        # SSL 인증서 오류인 경우 친절한 메시지 제공
        if _is_ssl_error(error_output):
            raise RuntimeError(_format_ssl_error_message(error_output))
        
        # 일반 에러는 그대로 반환
        raise RuntimeError(f"Demucs separation failed: {error_output[-800:]}")

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
