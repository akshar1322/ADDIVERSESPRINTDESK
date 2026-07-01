export function jsonError(message: string, status = 400) {
  return Response.json({ ok: false, error: message }, { status });
}

export function requireCronSecret(request: Request) {
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    return false;
  }

  return request.headers.get("authorization") === `Bearer ${expectedSecret}`;
}
