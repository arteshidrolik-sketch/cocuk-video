export interface VideoItem {
  videoId: string;
  title: string;
  channelId: string;
  channelName: string;
  thumbnailUrl: string;
  description?: string;
}

export interface AnalysisResult {
  decision: 'UYGUN' | 'UYGUN_DEGIL' | 'BELIRSIZ';
  reason: string;
  detectedIssues: string[];
}

export interface PredefinedFilters {
  violence: boolean;
  fear: boolean;
  profanity: boolean;
  adult: boolean;
}

export interface Settings {
  id: number;
  parentPasswordHash: string | null;
  ageGroup: string;
  predefinedFilters: PredefinedFilters;
  customKeywords: string[];
}

export interface ApprovedChannel {
  id: number;
  channelId: string;
  channelName: string;
  channelThumbnail: string | null;
  addedAt: Date;
}

export interface VideoHistory {
  id: number;
  videoId: string;
  videoTitle: string;
  channelId: string | null;
  channelName: string;
  thumbnailUrl: string | null;
  status: string;
  analysisResult: AnalysisResult | null;
  watchedAt: Date;
  approvedBy: string;
}

export interface PendingApproval {
  id: number;
  videoId: string;
  videoTitle: string;
  channelId: string | null;
  channelName: string;
  thumbnailUrl: string | null;
  analysisResult: AnalysisResult | null;
  requestedAt: Date;
}