# Vocalift API

FastAPI 기반 오디오 마스터링 및 음원 분리 API

## Features

- **Mastering**: 오디오 분석, DSP 파라미터 조정, LUFS 기반 마스터링
- **Vocal Remover**: AI 기반 보컬/반주(MR) 분리 (Demucs htdemucs 모델)

## Installation

### Requirements

- Python 3.10+
- FFmpeg (오디오 디코딩용)

### Setup

1. 가상환경 생성 및 활성화:

```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

2. 의존성 설치:

```bash
pip install -r requirements.txt
```

3. FFmpeg 설치 (시스템에 없는 경우):

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt update && sudo apt install ffmpeg

# Windows
# https://ffmpeg.org/download.html 에서 다운로드
```

4. Demucs 모델 다운로드:

첫 실행 시 Demucs가 자동으로 모델을 다운로드합니다 (~316MB).
수동으로 사전 다운로드하려면:

```bash
python -c "import torch; from demucs import pretrained; pretrained.get_model('htdemucs')"
```

## Running

개발 서버 실행:

```bash
cd api
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API는 http://localhost:8000 에서 접근 가능합니다.

- API Docs: http://localhost:8000/docs
- Health Check: http://localhost:8000/api/health

## API Endpoints

### Mastering

- `POST /api/projects` - 트랙 업로드 및 초기 마스터링
- `POST /api/projects/{id}/process` - 파라미터 재처리
- `GET /api/projects/{id}` - 프로젝트 정보 조회
- `GET /api/projects/{id}/original` - 원본 오디오
- `GET /api/projects/{id}/preview` - 마스터링된 오디오
- `GET /api/projects/{id}/download` - 최종 다운로드

### Vocal Remover

- `POST /api/separation` - 음원 분리 (vocals + instrumental)
- `GET /api/separation/{id}` - 분리 결과 정보
- `GET /api/separation/{id}/vocals` - 보컬 스템 다운로드
- `GET /api/separation/{id}/instrumental` - 반주(MR) 스템 다운로드

## Performance Notes

### Vocal Separation

Demucs htdemucs 모델은 CPU에서 실행됩니다:

- 3~4분 곡 기준: 약 8~12분 소요 (Intel i7 기준)
- GPU 사용 시 크게 단축 가능 (NVIDIA GPU + CUDA)

GPU 활성화 방법:

```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

그 후 `app/services/separation.py`의 `device="cpu"`를 `device="cuda"`로 변경.

## Storage

파일은 `storage/` 디렉토리에 저장됩니다:

```
storage/
├── uploads/         # 마스터링 프로젝트
└── separations/     # 음원 분리 결과
```

## Environment Variables

`.env` 파일에서 설정 가능:

```env
CORS_ORIGINS=["http://localhost:3000"]
MAX_UPLOAD_MB=100
```

## Troubleshooting

### Demucs 실행 실패

- `demucs` 명령어가 PATH에 있는지 확인
- 가상환경이 활성화되었는지 확인

### FFmpeg 관련 오류

- FFmpeg가 시스템에 설치되었는지 확인: `ffmpeg -version`
- 또는 Python 패키지 설치: `pip install imageio-ffmpeg`

### Out of Memory

- CPU 메모리 부족 시: 더 작은 파일로 테스트
- `htdemucs` 대신 더 가벼운 모델 사용 고려 (코드 수정 필요)
