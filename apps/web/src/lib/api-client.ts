import type { ApiErrorResponse } from '@360events/types';

const isApiErrorResponse = (value: unknown): value is ApiErrorResponse => {
  if (typeof value !== 'object' || value === null || !('error' in value)) {
    return false;
  }

  const { error } = value;
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && typeof error.code === 'string'
    && 'message' in error
    && typeof error.message === 'string'
    && 'requestId' in error
    && typeof error.requestId === 'string';
};

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
    let errorData: unknown;
    try {
      errorData = await response.json();
    } catch {
      throw new Error('An unexpected network error occurred.');
    }

    if (!isApiErrorResponse(errorData)) {
      throw new Error('An unexpected network error occurred.');
    }

    throw new ApiError(errorData);
  }

  return response.json() as Promise<T>;
};
