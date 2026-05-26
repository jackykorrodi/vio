import { redirect } from "next/navigation";

interface Props {
  searchParams: Promise<{ resume?: string }>;
}

export default async function KonfiguratorPage({ searchParams }: Props) {
  const params = await searchParams;
  const resumeId = params.resume;

  const target = resumeId
    ? `/campaign?type=politik&resume=${encodeURIComponent(resumeId)}`
    : `/campaign?type=politik`;

  redirect(target);
}
