const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export interface DocumentOut {
  id: string;
  status: string;
  original_filename: string;
  format: string;
  size_bytes: number;
  created_at: string;
}

export interface UploadError {
  detail: string;
}

export type UploadResult =
  | { ok: true; document: DocumentOut }
  | { ok: false; detail: string };

export async function uploadDocument(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/documents/upload`, {
    method: "POST",
    body: formData,
  });

  if (response.ok) {
    const document = (await response.json()) as DocumentOut;
    return { ok: true, document };
  }

  const error = (await response.json()) as UploadError;
  return { ok: false, detail: error.detail ?? "Upload failed." };
}
