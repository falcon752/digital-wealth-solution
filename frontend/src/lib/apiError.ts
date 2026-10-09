export function getApiError(error: unknown, fallback: string) {
  const response = (error as {
    response?: { data?: { error?: string; errors?: Array<{ msg?: string }> } };
  })?.response;
  return response?.data?.error || response?.data?.errors?.[0]?.msg || fallback;
}
