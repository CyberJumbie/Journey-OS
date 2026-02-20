import type {
  FileUploadResponse,
  ImportPreview,
  ImportConfirmation,
  ImportJobStatus,
  MappingPreset,
  MappingPresetCreateInput,
  FieldMapping,
} from "@journey-os/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type ApiResponse<T> = { data?: T; error?: { code: string; message: string } };

function getAuthHeaders(): HeadersInit {
  if (typeof window === "undefined") return {};
  const token = document.cookie
    .split("; ")
    .find((c) => c.startsWith("sb-access-token="))
    ?.split("=")[1];
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function uploadImportFile(
  file: File,
): Promise<ApiResponse<FileUploadResponse>> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/api/v1/import/upload`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: formData,
  });

  return (await res.json()) as ApiResponse<FileUploadResponse>;
}

export async function getImportPreview(
  uploadId: string,
  previewRows: number = 5,
): Promise<ApiResponse<ImportPreview>> {
  const res = await fetch(`${API_URL}/api/v1/import/preview`, {
    method: "POST",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ upload_id: uploadId, preview_rows: previewRows }),
  });

  return (await res.json()) as ApiResponse<ImportPreview>;
}

export async function listMappingPresets(): Promise<
  ApiResponse<MappingPreset[]>
> {
  const res = await fetch(`${API_URL}/api/v1/import/presets`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  return (await res.json()) as ApiResponse<MappingPreset[]>;
}

export async function createMappingPreset(
  input: MappingPresetCreateInput,
): Promise<ApiResponse<MappingPreset>> {
  const res = await fetch(`${API_URL}/api/v1/import/presets`, {
    method: "POST",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return (await res.json()) as ApiResponse<MappingPreset>;
}

export async function deleteMappingPreset(
  presetId: string,
): Promise<{ error?: { code: string; message: string } }> {
  const res = await fetch(`${API_URL}/api/v1/import/presets/${presetId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (res.status === 204) return {};
  return (await res.json()) as { error?: { code: string; message: string } };
}

export async function confirmImport(
  uploadId: string,
  mappings: readonly FieldMapping[],
): Promise<ApiResponse<ImportConfirmation>> {
  const res = await fetch(`${API_URL}/api/v1/import/confirm`, {
    method: "POST",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ upload_id: uploadId, mappings }),
  });

  return (await res.json()) as ApiResponse<ImportConfirmation>;
}

export async function executeImport(
  uploadId: string,
  mappings: readonly FieldMapping[],
  courseId: string,
): Promise<ApiResponse<ImportJobStatus>> {
  const res = await fetch(`${API_URL}/api/v1/import/execute`, {
    method: "POST",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      upload_id: uploadId,
      mappings,
      course_id: courseId,
    }),
  });

  return (await res.json()) as ApiResponse<ImportJobStatus>;
}
