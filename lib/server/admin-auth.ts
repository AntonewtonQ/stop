import "server-only";

import { timingSafeEqual } from "node:crypto";

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
}

function isAuthorizedBy(request: Request, secrets: Array<string | undefined>) {
  const supplied = bearerToken(request);
  const availableSecrets = secrets.filter(
    (secret): secret is string => Boolean(secret),
  );

  if (!supplied || availableSecrets.length === 0) return false;

  const suppliedBuffer = Buffer.from(supplied);
  return availableSecrets.some((secret) => {
    const expectedBuffer = Buffer.from(secret);
    return (
      expectedBuffer.length === suppliedBuffer.length &&
      timingSafeEqual(expectedBuffer, suppliedBuffer)
    );
  });
}

export function isAuthorizedAdminRequest(request: Request) {
  return isAuthorizedBy(request, [
    process.env.ADMIN_PASSWORD,
    process.env.MAINTENANCE_SECRET,
  ]);
}

export function isAuthorizedMaintenanceRequest(request: Request) {
  return isAuthorizedBy(request, [
    process.env.MAINTENANCE_SECRET,
    process.env.CRON_SECRET,
  ]);
}
