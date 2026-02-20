import type { UploadResponse } from "@journey-os/types";

interface UploadOptions {
  courseId: string;
  files: File[];
  token: string;
  onProgress: (fileIndex: number, progress: number) => void;
}

interface UploadResult {
  data: UploadResponse | null;
  error: { code: string; message: string } | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function uploadFiles({
  courseId,
  files,
  token,
  onProgress,
}: UploadOptions): Promise<UploadResult> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();

    for (const file of files) {
      formData.append("files", file);
    }

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        for (let i = 0; i < files.length; i++) {
          onProgress(i, pct);
        }
      }
    });

    xhr.addEventListener("load", () => {
      try {
        const body = JSON.parse(xhr.responseText) as UploadResult;
        resolve(body);
      } catch {
        resolve({
          data: null,
          error: {
            code: "PARSE_ERROR",
            message: "Failed to parse server response",
          },
        });
      }
    });

    xhr.addEventListener("error", () => {
      resolve({
        data: null,
        error: {
          code: "NETWORK_ERROR",
          message: "Network error during upload",
        },
      });
    });

    xhr.open("POST", `${API_BASE}/api/v1/courses/${courseId}/upload`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.send(formData);
  });
}
