import axios from "axios";

export function getErrorMessage(error: unknown, fallback = "Une erreur est survenue"): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data && typeof data === "object") {
      if (typeof (data as { message?: unknown }).message === "string") {
        return (data as { message: string }).message;
      }
      if (typeof (data as { detail?: unknown }).detail === "string") {
        return (data as { detail: string }).detail;
      }
      if (typeof (data as { error?: unknown }).error === "string") {
        return (data as { error: string }).error;
      }
    }
    return error.message || fallback;
  }
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return fallback;
}

export function getErrorStatus(error: unknown): number | undefined {
  if (axios.isAxiosError(error)) return error.response?.status;
  return undefined;
}
