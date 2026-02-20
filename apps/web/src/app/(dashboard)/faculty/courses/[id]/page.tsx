"use client";

import { use } from "react";
import { FacultyCourseDetail } from "@web/components/course/faculty-course-detail";

// Next.js App Router requires default export for pages
export default function FacultyCourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return <FacultyCourseDetail courseId={id} />;
}
