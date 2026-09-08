from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Vocalift API"
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    storage_root: Path = Path(__file__).resolve().parents[2] / "storage"
    max_upload_mb: int = 100
    allowed_extensions: set[str] = {
        ".wav",
        ".flac",
        ".aiff",
        ".aif",
        ".mp3",
        ".m4a",
        ".aac",
        ".caf",
    }


settings = Settings()
settings.storage_root.mkdir(parents=True, exist_ok=True)
(settings.storage_root / "uploads").mkdir(exist_ok=True)
(settings.storage_root / "processed").mkdir(exist_ok=True)
