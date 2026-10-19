export type DownloaderPlatformId =
  | "youtube"
  | "tiktok"
  | "instagram"
  | "snackvideo"
  | "terabox";

export type DownloaderProviderStatus =
  | "connected"
  | "not_connected"
  | "disabled"
  | "error"
  | "rate_limited"
  | "untested";

export interface DownloaderStreamQuality {
  label: string; // e.g. "1080p FHD", "720p HD", "No Watermark HD", "Audio MP3"
  url: string; // Direct download link
  quality?: string;
  format?: string; // mp4, mp3, zip, etc.
  sizeFormatted?: string;
}

export interface DownloaderResult {
  success: boolean;
  platform: string;
  title: string;
  author?: string;
  thumbnail?: string;
  duration?: string | number;
  qualities: DownloaderStreamQuality[];
  audioUrl?: string;
  sourceUrl: string;
  fileName?: string;
  metadata?: Record<string, any>;
  error?: string;
}

export interface DownloaderProviderConfig {
  id: DownloaderPlatformId;
  name: string;
  platformName: string;
  enabled: boolean;
  apiKey: string; // Server-side plain key (Never sent to client)
  baseUrl: string;
  endpoint: string;
  authHeaderName: string; // e.g. "X-RapidAPI-Key", "Authorization", "x-api-key"
  authHeaderPrefix?: string; // e.g. "Bearer " or ""
  customHeaders?: Record<string, string>;
  status?: DownloaderProviderStatus;
  statusMessage?: string;
  lastTested?: number;
}

export interface ClientDownloaderProviderConfig {
  id: DownloaderPlatformId;
  name: string;
  platformName: string;
  enabled: boolean;
  hasKey: boolean;
  maskedKey: string; // e.g. "********"
  baseUrl: string;
  endpoint: string;
  authHeaderName: string;
  status: DownloaderProviderStatus;
  statusMessage: string;
  lastTested?: number;
}

export interface DownloaderAdapter {
  id: DownloaderPlatformId;
  name: string;
  platformName: string;
  defaultBaseUrl: string;
  defaultEndpoint: string;
  defaultAuthHeader: string;
  matchesUrl(url: string): boolean;
  testConnection(
    config: DownloaderProviderConfig
  ): Promise<{ status: DownloaderProviderStatus; message: string }>;
  resolve(url: string, config: DownloaderProviderConfig): Promise<DownloaderResult>;
}
