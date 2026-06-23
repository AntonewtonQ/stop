import "server-only";

import type { ServerErrorEvent } from "@/lib/admin/types";

const MAX_ERRORS = 40;

const globalAdminEvents = globalThis as typeof globalThis & {
  jogastopServerErrors?: ServerErrorEvent[];
};

function errorName(error: unknown) {
  return error instanceof Error ? error.name : typeof error;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown server error";
}

export function recordServerError(scope: string, error: unknown) {
  const errors = globalAdminEvents.jogastopServerErrors ?? [];
  errors.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    scope,
    name: errorName(error),
    message: errorMessage(error),
    occurredAt: Date.now(),
  });
  globalAdminEvents.jogastopServerErrors = errors.slice(0, MAX_ERRORS);
}

export function getRecentServerErrors() {
  return [...(globalAdminEvents.jogastopServerErrors ?? [])];
}
