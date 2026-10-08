import { NextRequest } from "next/server";
import { handleClub } from "../../../../lib/club-api";
export const dynamic = "force-dynamic";
async function handler(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return handleClub(request, (await context.params).path);
}
export { handler as GET, handler as POST };
