AI Vocal Production Assistant — V0: 자동 마스터링 + 수치 조절 + Original/Mastered A/B

## 구조

```
Vocalift/
  web/   Next.js (UI)
  api/   FastAPI (분석 · DSP 마스터링)
```

## 요구 사항

- Node.js 20+
- Python 3.11+
- (권장) WAV / FLAC 업로드 — MP3·M4A(휴대폰 녹음)는 FFmpeg로 변환 지원
  - 시스템 `ffmpeg` 또는 `imageio-ffmpeg` 패키지 사용

## 실행

### API

```bash
cd api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Web

```bash
cd web
npm install
npm run dev
```

브라우저: http://localhost:3000

## V0 기능

- 트랙 업로드 → LUFS/Peak 분석
- Rule-based AI 초안 파라미터
- EQ / Compressor / Saturation / Limiter / Target LUFS / True Peak 전부 조절
- Original ↔ Mastered A/B 비교 청취
- AI 추천으로 되돌리기 + WAV 다운로드

## 로드맵

- V1 Vocal Mix (MR + Vocal)
- V2 Take Selection
- V3 AI Comping + Pitch/Timing
>>>>>>> 14eda4b (feat : 프로젝트 초기세팅 및 1단계 기능 구현)
