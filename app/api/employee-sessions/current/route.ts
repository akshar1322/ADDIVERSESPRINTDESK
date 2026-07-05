import { getPrisma } from "@/lib/prisma";
import { clearEmployeeSessionCookie, getEmployeeWorkspaceSession } from "@/server/employee-sessions";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const prisma = getPrisma();
  const session = await getEmployeeWorkspaceSession(prisma, request.headers.get("cookie"));

  if (!session) {
    return Response.json({ ok: true, session: null }, { headers: { "Set-Cookie": clearEmployeeSessionCookie() } });
  }

  return Response.json({ ok: true, session });
}

export async function DELETE(request: Request) {
  const prisma = getPrisma();
  const session = await getEmployeeWorkspaceSession(prisma, request.headers.get("cookie"));

  if (session) {
    await prisma.employeeSession.delete({ where: { sessionToken: session.employeeSession.sessionToken } });
  }

  return Response.json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": clearEmployeeSessionCookie(),
      },
    },
  );
}
