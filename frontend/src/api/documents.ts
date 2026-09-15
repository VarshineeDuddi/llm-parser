import { getStoredApiKey } from "../apiKey";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export interface DocumentOut {
  id: string;
  status: string;
  original_filename: string;
  format: string;
  size_bytes: number;
  created_at: string;
  extraction_status: string;
  extraction_failure_reason: string | null;
  duplicate_of_id: string | null;
}

export interface UploadError {
  detail: string;
}

function authHeaders(): HeadersInit {
  const apiKey = getStoredApiKey();
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
}

export interface RegisterUserOut {
  id: string;
  name: string;
  api_key: string;
}

export type RegisterResult =
  | { ok: true; user: RegisterUserOut }
  | { ok: false; detail: string };

export async function registerUser(name: string): Promise<RegisterResult> {
  const response = await fetch(`${API_BASE_URL}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  if (response.ok) {
    const user = (await response.json()) as RegisterUserOut;
    return { ok: true, user };
  }

  const error = (await response.json()) as UploadError;
  return { ok: false, detail: error.detail ?? "Registration failed." };
}

export type UploadResult =
  | { ok: true; document: DocumentOut }
  | { ok: false; detail: string; unauthorized: boolean };

export async function uploadDocument(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/documents/upload`, {
    method: "POST",
    body: formData,
    headers: authHeaders(),
  });

  if (response.ok) {
    const document = (await response.json()) as DocumentOut;
    return { ok: true, document };
  }

  const error = (await response.json()) as UploadError;
  return {
    ok: false,
    detail: error.detail ?? "Upload failed.",
    unauthorized: response.status === 401,
  };
}

export type DocumentResult =
  | { ok: true; document: DocumentOut }
  | { ok: false; detail: string };

export async function getDocument(documentId: string): Promise<DocumentResult> {
  const response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
    headers: authHeaders(),
  });

  if (response.ok) {
    const document = (await response.json()) as DocumentOut;
    return { ok: true, document };
  }

  const error = (await response.json()) as UploadError;
  return { ok: false, detail: error.detail ?? "Could not load document." };
}

export interface ExtractionOut {
  document_id: string;
  status: string;
  extracted_text: string | null;
  failure_reason: string | null;
  extracted_at: string;
}

export type ExtractionResult =
  | { ok: true; extraction: ExtractionOut }
  | { ok: false; detail: string };

export async function getExtraction(documentId: string): Promise<ExtractionResult> {
  const response = await fetch(`${API_BASE_URL}/documents/${documentId}/extraction`, {
    headers: authHeaders(),
  });

  if (response.ok) {
    const extraction = (await response.json()) as ExtractionOut;
    return { ok: true, extraction };
  }

  const error = (await response.json()) as UploadError;
  return { ok: false, detail: error.detail ?? "Could not load extraction." };
}

export interface FieldResultOut {
  field_name: string;
  field_value: string;
  confidence: number;
  needs_review: boolean;
  created_at: string;
}

export type FieldsResult =
  | { ok: true; fields: FieldResultOut[] }
  | { ok: false; detail: string };

export async function getDocumentFields(documentId: string): Promise<FieldsResult> {
  const response = await fetch(`${API_BASE_URL}/documents/${documentId}/fields`, {
    headers: authHeaders(),
  });

  if (response.ok) {
    const fields = (await response.json()) as FieldResultOut[];
    return { ok: true, fields };
  }

  const error = (await response.json()) as UploadError;
  return { ok: false, detail: error.detail ?? "Could not load extracted fields." };
}
