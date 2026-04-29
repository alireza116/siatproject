import { notFound } from "next/navigation";
import { PublicSubmissionPageView } from "@/components/gallery/PublicSubmissionPageView";
import { loadPublicSubmissionPageData } from "@/lib/gallery-public-submission-page";

export default async function EmbedPublicSubmissionPage({
  params,
}: {
  params: Promise<{ classId: string; submissionId: string }>;
}) {
  const { classId, submissionId } = await params;
  const payload = await loadPublicSubmissionPageData(classId, submissionId);
  if (!payload) notFound();

  return (
    <PublicSubmissionPageView
      payload={payload}
      galleryBasePath="/embed/gallery"
      asideStickyClassName="lg:top-6"
      asideScrollMaxClassName="lg:max-h-[calc(100vh-3rem)]"
    />
  );
}
