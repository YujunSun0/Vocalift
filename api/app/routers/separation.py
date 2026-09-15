"""음원 분리(Vocal Remover) 라우터."""

from __future__ import annotations

import json
import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.core.config import settings
from app.core.schemas import SeparationResponse, StemAnalysis
from app.services.audio_io import load_audio
from app.services.separation import analyze_separation_result, separate_vocals

router = APIRouter(prefix="/separation", tags=["separation"])


def _separation_dir(separation_id: str) -> Path:
    return settings.storage_root / "separations" / separation_id


def _meta_path(separation_id: str) -> Path:
    return _separation_dir(separation_id) / "meta.json"


def _read_meta(separation_id: str) -> dict:
    path = _meta_path(separation_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Separation not found")
    return json.loads(path.read_text(encoding="utf-8"))


def _write_meta(separation_id: str, meta: dict) -> None:
    _meta_path(separation_id).write_text(
        json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8"
    )


@router.post("", response_model=SeparationResponse)
async def create_separation(file: UploadFile = File(...)) -> SeparationResponse:
    """
    업로드된 오디오를 vocals와 instrumental(MR)로 분리.

    CPU에서 실행되므로 3~4분 곡 기준 약 8분 소요 가능.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename required")

    suffix = Path(file.filename).suffix.lower()
    if suffix not in settings.allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format. Allowed: {', '.join(sorted(settings.allowed_extensions))}",
        )

    content = await file.read()
    max_bytes = settings.max_upload_mb * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=400, detail=f"File too large. Max {settings.max_upload_mb}MB"
        )

    separation_id = uuid.uuid4().hex
    separation_dir = _separation_dir(separation_id)
    separation_dir.mkdir(parents=True, exist_ok=True)

    original_path = separation_dir / f"original{suffix}"
    original_path.write_bytes(content)

    # 오디오 로드 검증
    try:
        load_audio(original_path)
    except Exception as exc:
        raise HTTPException(
            status_code=400, detail=f"Failed to decode audio: {exc}"
        ) from exc

    # Demucs 음원 분리 실행
    try:
        vocals_path, instrumental_path = separate_vocals(
            original_path,
            separation_dir,
            model="htdemucs",
            device="cpu",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Separation failed: {exc}",
        ) from exc

    # 최종 파일을 separation_dir 루트로 복사 (Demucs 출력 경로가 깊어서)
    final_vocals = separation_dir / "vocals.wav"
    final_instrumental = separation_dir / "instrumental.wav"
    final_vocals.write_bytes(vocals_path.read_bytes())
    final_instrumental.write_bytes(instrumental_path.read_bytes())

    # 분석 정보 생성
    analysis = analyze_separation_result(final_vocals, final_instrumental)

    meta = {
        "separation_id": separation_id,
        "filename": file.filename,
    }
    _write_meta(separation_id, meta)

    return SeparationResponse(
        separation_id=separation_id,
        filename=file.filename,
        vocals_url=f"/api/separation/{separation_id}/vocals",
        instrumental_url=f"/api/separation/{separation_id}/instrumental",
        vocals_analysis=StemAnalysis(**analysis["vocals"]),
        instrumental_analysis=StemAnalysis(**analysis["instrumental"]),
    )


@router.get("/{separation_id}")
async def get_separation(separation_id: str) -> SeparationResponse:
    """분리 결과 정보 조회."""
    meta = _read_meta(separation_id)
    separation_dir = _separation_dir(separation_id)

    vocals_path = separation_dir / "vocals.wav"
    instrumental_path = separation_dir / "instrumental.wav"

    if not vocals_path.exists() or not instrumental_path.exists():
        raise HTTPException(status_code=404, detail="Separation stems not found")

    analysis = analyze_separation_result(vocals_path, instrumental_path)

    return SeparationResponse(
        separation_id=separation_id,
        filename=meta["filename"],
        vocals_url=f"/api/separation/{separation_id}/vocals",
        instrumental_url=f"/api/separation/{separation_id}/instrumental",
        vocals_analysis=StemAnalysis(**analysis["vocals"]),
        instrumental_analysis=StemAnalysis(**analysis["instrumental"]),
    )


@router.get("/{separation_id}/vocals")
async def get_vocals(separation_id: str) -> FileResponse:
    """Vocals 스템 다운로드."""
    separation_dir = _separation_dir(separation_id)
    path = separation_dir / "vocals.wav"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Vocals not found")

    meta = _read_meta(separation_id)
    stem = Path(meta["filename"]).stem
    return FileResponse(
        path,
        media_type="audio/wav",
        filename=f"{stem}_vocals.wav",
    )


@router.get("/{separation_id}/instrumental")
async def get_instrumental(separation_id: str) -> FileResponse:
    """Instrumental (MR) 스템 다운로드."""
    separation_dir = _separation_dir(separation_id)
    path = separation_dir / "instrumental.wav"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Instrumental not found")

    meta = _read_meta(separation_id)
    stem = Path(meta["filename"]).stem
    return FileResponse(
        path,
        media_type="audio/wav",
        filename=f"{stem}_instrumental.wav",
    )
