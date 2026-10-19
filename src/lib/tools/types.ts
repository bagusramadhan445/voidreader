export type ToolCategoryId =
  | "ai"
  | "downloader"
  | "scraper"
  | "forge"
  | "document"
  | "developer";

export type ToolStatus = "ready" | "api-required" | "client-side" | "beta" | "popular";

export interface ToolFieldDefinition {
  id: string;
  label: string;
  type: "text" | "textarea" | "select" | "number" | "file" | "boolean" | "json";
  placeholder?: string;
  defaultValue?: string | number | boolean;
  options?: { label: string; value: string }[];
  description?: string;
  required?: boolean;
}

export interface ToolOutputDefinition {
  type: "text" | "code" | "json" | "image" | "download" | "color" | "table" | "html";
  title?: string;
  language?: string;
}

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  longDescription?: string;
  categoryId: ToolCategoryId;
  iconName: string; // Lucide icon name
  status: ToolStatus;
  badge?: string;
  tags: string[];
  requiresApiKey?: "openai" | "gemini" | "openrouter" | "replicate" | "custom" | null;
  inputs?: ToolFieldDefinition[];
  outputType?: ToolOutputDefinition["type"];
  outputLanguage?: string;
  examples?: {
    title: string;
    input: Record<string, any>;
  }[];
  // Optional client-side execution function for instant browser execution
  clientExecute?: (
    params: Record<string, any>,
    apiKeys?: Record<string, string>
  ) => Promise<ToolExecutionResult> | ToolExecutionResult;
}

export interface ToolCategory {
  id: ToolCategoryId;
  name: string;
  subtitle: string;
  description: string;
  iconName: string;
  accentColor: string; // Tailwind color class or hex
  gradient: string;
  toolCount: number;
}

export interface ToolExecutionResult {
  success: boolean;
  output?: any;
  outputType?: ToolOutputDefinition["type"];
  outputLanguage?: string;
  error?: string;
  errorCode?:
    | "SUCCESS"
    | "NO_DATA"
    | "INVALID_INPUT"
    | "PROVIDER_ERROR"
    | "NETWORK_ERROR"
    | "TIMEOUT"
    | "PARSE_ERROR"
    | "AUTH_ERROR"
    | "CONFIG_ERROR";
  executionTimeMs?: number;
  metadata?: Record<string, any>;
}

export type ApiProviderStatus =
  | "connected"
  | "missing_key"
  | "error"
  | "rate_limited"
  | "untested";

export interface ApiProviderConfig {
  providerId:
    | "openai"
    | "gemini"
    | "openrouter"
    | "replicate"
    | "remove_bg"
    | "github"
    | "mangadex"
    | "anilist"
    | "jikan"
    | "custom"
    | string;
  providerName: string;
  apiKey: string;
  baseUrl?: string;
  model?: string;
  enabled: boolean;
  lastTested?: number;
  status?: ApiProviderStatus | "valid" | "invalid" | "untested";
}

export interface PublicApiProviderConfig {
  providerId: string;
  providerName: string;
  isConfigured: boolean;
  baseUrl?: string;
  model?: string;
  enabled: boolean;
  lastTested?: number;
  status?: ApiProviderStatus | "valid" | "invalid" | "untested";
}

export interface VoidToolsSettings {
  favoriteToolIds: string[];
  recentToolIds: string[];
  apiProviders: Record<string, ApiProviderConfig>;
  themeAccent: "cyan" | "purple" | "emerald" | "amber";
  autoCopyResults: boolean;
}

