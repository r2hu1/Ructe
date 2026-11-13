import { ApiError } from "./types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export class ApiException extends Error {
  code: string;
  details?: Record<string, unknown>;
  statusCode: number;

  constructor(code: string, message: string, statusCode: number, details?: Record<string, unknown>) {
    super(message);
    this.name = "ApiException";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export async function apiClient<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const defaultHeaders: HeadersInit = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  let response: Response;
  try {
    response = await fetch(url, config);
  } catch (error) {
    throw new ApiException("NETWORK_ERROR", "Failed to connect to backend server", 0);
  }

  if (!response.ok) {
    let errPayload: { error?: ApiError } = {};
    try {
      errPayload = await response.json();
    } catch {
    }

    const code = errPayload.error?.code || `HTTP_${response.status}`;
    const message = errPayload.error?.message || `Request failed with status ${response.status}`;
    const details = errPayload.error?.details;

    throw new ApiException(code, message, response.status, details);
  }

  return response.json() as Promise<T>;
}
