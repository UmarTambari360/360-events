export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    requestId: string;
  };
}

export class ApiError extends Error {
  public code: string;
  public requestId: string;

  constructor(public response: ApiErrorResponse) {
    super(response.error.message);
    this.code = response.error.code;
    this.requestId = response.error.requestId;
  }
}

export const apiClient = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(`/api${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let errorData: ApiErrorResponse;
    try {
      errorData = await response.json() as ApiErrorResponse;
    } catch {
      throw new Error('An unexpected network error occurred.');
    }
    throw new ApiError(errorData);
  }

  return response.json() as Promise<T>;
};