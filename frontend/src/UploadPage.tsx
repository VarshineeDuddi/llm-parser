import { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { uploadDocument, type DocumentOut } from "./api/documents";

export function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [document, setDocument] = useState<DocumentOut | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!file) return;
    setSubmitting(true);
    setDocument(null);
    setErrorDetail(null);
    try {
      const result = await uploadDocument(file);
      if (result.ok) {
        setDocument(result.document);
      } else {
        setErrorDetail(result.detail);
      }
    } catch {
      setErrorDetail("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 480, mx: "auto", mt: 8, px: 2 }}>
      <Typography variant="h5" gutterBottom>
        Upload a document
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Supported formats: PDF, DOCX, PPTX, TXT
      </Typography>

      <Stack spacing={2} sx={{ mt: 3 }}>
        <Button variant="outlined" component="label">
          {file ? file.name : "Choose file"}
          <input
            type="file"
            hidden
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setDocument(null);
              setErrorDetail(null);
            }}
          />
        </Button>

        <Button
          variant="contained"
          disabled={!file || submitting}
          onClick={handleSubmit}
        >
          {submitting ? "Uploading…" : "Upload"}
        </Button>

        {document && (
          <>
            <Alert severity="success">
              Uploaded successfully. Document ID: {document.id} (status:{" "}
              {document.status})
            </Alert>
            {document.extraction_status === "succeeded" && (
              <Alert severity="success">Text extraction succeeded.</Alert>
            )}
            {document.extraction_status === "failed" && (
              <Alert severity="warning">
                Text extraction failed
                {document.extraction_failure_reason
                  ? `: ${document.extraction_failure_reason}`
                  : "."}
              </Alert>
            )}
          </>
        )}

        {errorDetail && <Alert severity="error">{errorDetail}</Alert>}
      </Stack>
    </Box>
  );
}
