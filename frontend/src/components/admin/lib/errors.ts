import { getApiError } from "@/lib/apiError";

/** The API's message for a failed request, or a plain fallback. */
export function errorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (!error) return fallback;
  const fromApi = getApiError(error, "");
  if (fromApi) return fromApi;
  if (error instanceof Error && error.message && !/status code/i.test(error.message)) return error.message;
  return fallback;
}
