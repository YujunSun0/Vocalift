from __future__ import annotations

import json
import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.core.config import settings
from app.core.schemas import MasteringParams, ProcessRequest, ProjectResponse
from app.services.analyze import analyze_audio
from app.services.audio_io import load_audio, save_wav
from app.services.mastering import master_audio, suggest_params

router = APIRouter(prefix="/projects", tags=["projects"])


def _project_dir(project_id: str) -> Path:
    return settings.storage_root / "uploads" / project_id


def _meta_path(project_id: str) -> Path:
    return _project_dir(project_id) / "meta.json"


def _read_meta(project_id: str) -> dict:
    path = _meta_path(project_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Project not found")
    return json.loads(path.read_text(encoding="utf-8"))


def _write_meta(project_id: str, meta: dict) -> None:
    _meta_path(project_id).write_text(
        json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8"
    )


@router.post("", response_model=ProjectResponse)
async def create_project(file: UploadFile = File(...)) -> ProjectResponse:
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

    project_id = uuid.uuid4().hex
    project_dir = _project_dir(project_id)
    project_dir.mkdir(parents=True, exist_ok=True)

    original_path = project_dir / f"original{suffix}"
    original_path.write_bytes(content)

    try:
        data, sr = load_audio(original_path)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to decode audio: {exc}") from exc

    # Normalize storage to wav for consistent processing/playback
    wav_original = project_dir / "original.wav"
    save_wav(wav_original, data, sr)

    analysis = analyze_audio(data, sr)
    params = suggest_params(analysis)

    processed, processed_analysis = master_audio(data, sr, params)
    preview_path = project_dir / "preview.wav"
    save_wav(preview_path, processed, sr)

    meta = {
        "project_id": project_id,
        "filename": file.filename,
        "sample_rate": sr,
        "params": params.model_dump(),
        "preview_version": "init",
    }
    _write_meta(project_id, meta)

    return ProjectResponse(
        project_id=project_id,
        filename=file.filename,
        analysis=analysis,
        params=params,
        original_url=f"/api/projects/{project_id}/original",
        preview_url=f"/api/projects/{project_id}/preview?v=init",
        processed_analysis=processed_analysis,
    )


@router.post("/{project_id}/process", response_model=ProjectResponse)
async def reprocess_project(project_id: str, body: ProcessRequest) -> ProjectResponse:
    meta = _read_meta(project_id)
    project_dir = _project_dir(project_id)
    original = project_dir / "original.wav"
    if not original.exists():
        raise HTTPException(status_code=404, detail="Original audio missing")

    data, sr = load_audio(original)
    analysis = analyze_audio(data, sr)
    params = body.params

    processed, processed_analysis = master_audio(data, sr, params)
    version = uuid.uuid4().hex[:10]
    versioned = project_dir / f"preview-{version}.wav"
    save_wav(versioned, processed, sr)

    # Prune older versioned previews (keep latest few)
    old = sorted(project_dir.glob("preview-*.wav"), key=lambda p: p.stat().st_mtime)
    for path in old[:-3]:
        path.unlink(missing_ok=True)

    meta["params"] = params.model_dump()
    meta["preview_version"] = version
    _write_meta(project_id, meta)

    return ProjectResponse(
        project_id=project_id,
        filename=meta["filename"],
        analysis=analysis,
        params=params,
        original_url=f"/api/projects/{project_id}/original",
        preview_url=f"/api/projects/{project_id}/preview?v={version}",
        processed_analysis=processed_analysis,
    )


@router.get("/{project_id}")
async def get_project(project_id: str) -> ProjectResponse:
    meta = _read_meta(project_id)
    project_dir = _project_dir(project_id)
    data, sr = load_audio(project_dir / "original.wav")
    analysis = analyze_audio(data, sr)
    params = MasteringParams(**meta["params"])

    preview = project_dir / "preview.wav"
    if preview.exists():
        processed, _ = load_audio(preview)
        processed_analysis = analyze_audio(processed, sr)
    else:
        processed, processed_analysis = master_audio(data, sr, params)
        save_wav(preview, processed, sr)

    return ProjectResponse(
        project_id=project_id,
        filename=meta["filename"],
        analysis=analysis,
        params=params,
        original_url=f"/api/projects/{project_id}/original",
        preview_url=f"/api/projects/{project_id}/preview",
        processed_analysis=processed_analysis,
    )


@router.get("/{project_id}/original")
async def get_original(project_id: str) -> FileResponse:
    path = _project_dir(project_id) / "original.wav"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Original not found")
    return FileResponse(path, media_type="audio/wav", filename="original.wav")


def _latest_preview_path(project_id: str) -> Path:
    project_dir = _project_dir(project_id)
    meta = _read_meta(project_id)
    version = meta.get("preview_version")
    if version and version != "init":
        versioned = project_dir / f"preview-{version}.wav"
        if versioned.exists():
            return versioned
    path = project_dir / "preview.wav"
    if path.exists():
        return path
    raise HTTPException(status_code=404, detail="Preview not found")


@router.get("/{project_id}/preview")
async def get_preview(project_id: str, v: str | None = None) -> FileResponse:
    project_dir = _project_dir(project_id)
    if v and v != "init":
        versioned = project_dir / f"preview-{v}.wav"
        if versioned.exists():
            return FileResponse(
                versioned, media_type="audio/wav", filename="mastered.wav"
            )
    path = _latest_preview_path(project_id)
    return FileResponse(path, media_type="audio/wav", filename="mastered.wav")


@router.get("/{project_id}/download")
async def download_preview(project_id: str) -> FileResponse:
    path = _latest_preview_path(project_id)
    meta = _read_meta(project_id)
    stem = Path(meta["filename"]).stem
    return FileResponse(
        path,
        media_type="audio/wav",
        filename=f"{stem}_vocalift_master.wav",
    )
