import TournamentAdmin from "./tournament-admin";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <TournamentAdmin id={(await params).id} />;
}
