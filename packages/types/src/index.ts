export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    requestId: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  metadata: {
    nextCursor: string | null;
    hasMore: boolean;
    totalCount?: number;
  };
}