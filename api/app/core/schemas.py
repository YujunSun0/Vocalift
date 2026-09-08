from __future__ import annotations

from pydantic import BaseModel, Field


class MasteringParams(BaseModel):
    """조절 가능한 마스터링 체인 파라미터 (V0)."""

    # Tone EQ
    low_shelf_hz: float = Field(120.0, ge=40.0, le=400.0)
    low_shelf_db: float = Field(0.0, ge=-6.0, le=6.0)
    presence_hz: float = Field(3500.0, ge=1000.0, le=8000.0)
    presence_db: float = Field(0.0, ge=-6.0, le=6.0)
    presence_q: float = Field(0.9, ge=0.3, le=4.0)
    air_hz: float = Field(10000.0, ge=6000.0, le=16000.0)
    air_db: float = Field(0.0, ge=-6.0, le=6.0)

    # Glue compressor
    comp_threshold_db: float = Field(-18.0, ge=-40.0, le=-6.0)
    comp_ratio: float = Field(2.0, ge=1.1, le=8.0)
    comp_attack_ms: float = Field(20.0, ge=1.0, le=100.0)
    comp_release_ms: float = Field(180.0, ge=20.0, le=800.0)
    comp_makeup_db: float = Field(1.5, ge=0.0, le=12.0)

    # Saturation
    saturation: float = Field(0.15, ge=0.0, le=1.0)

    # Limiter / loudness
    target_lufs: float = Field(-14.0, ge=-24.0, le=-8.0)
    true_peak_db: float = Field(-1.0, ge=-3.0, le=-0.1)
    limiter_release_ms: float = Field(50.0, ge=10.0, le=200.0)


class AudioAnalysis(BaseModel):
    sample_rate: int
    channels: int
    duration_sec: float
    peak_db: float
    rms_db: float
    lufs: float
    dynamic_range_db: float


class ProjectResponse(BaseModel):
    project_id: str
    filename: str
    analysis: AudioAnalysis
    params: MasteringParams
    original_url: str
    preview_url: str
    processed_analysis: AudioAnalysis


class ProcessRequest(BaseModel):
    params: MasteringParams
