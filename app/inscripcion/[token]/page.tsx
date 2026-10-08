import Registration from "./registration";
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  return <Registration token={(await params).token} />;
}
