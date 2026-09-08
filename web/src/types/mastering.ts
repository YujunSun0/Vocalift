export type AudioAnalysis = {
  sample_rate: number;
  channels: number;
  duration_sec: number;
  peak_db: number;
  rms_db: number;
  lufs: number;
  dynamic_range_db: number;
};

export type MasteringParams = {
  low_shelf_hz: number;
  low_shelf_db: number;
  presence_hz: number;
  presence_db: number;
  presence_q: number;
  air_hz: number;
  air_db: number;
  comp_threshold_db: number;
  comp_ratio: number;
  comp_attack_ms: number;
  comp_release_ms: number;
  comp_makeup_db: number;
  saturation: number;
  target_lufs: number;
  true_peak_db: number;
  limiter_release_ms: number;
};

export type ProjectResponse = {
  project_id: string;
  filename: string;
  analysis: AudioAnalysis;
  params: MasteringParams;
  original_url: string;
  preview_url: string;
  processed_analysis: AudioAnalysis;
};

export type UploadSource = "track" | "youtube" | "reference";
