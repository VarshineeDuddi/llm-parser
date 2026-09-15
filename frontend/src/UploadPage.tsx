import { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import {
  getDocumentFields,
  uploadDocument,
  type DocumentOut,
  type FieldResultOut,
} from "./api/documents";
import { downloadFieldsAsCsv } from "./exportFields";

interface UploadPageProps {
  onUnauthorized: () => void;
}

export function UploadPage({ onUnauthorized }: UploadPageProps) {
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [document, setDocument] = useState<DocumentOut | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [fields, setFields] = useState<FieldResultOut[] | null>(null);
  const [fieldsError, setFieldsError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!file) return;
    setSubmitting(true);
    setDocument(null);
    setErrorDetail(null);
    setFields(null);
    setFieldsError(null);
    try {
      const result = await uploadDocument(file);
      if (result.ok) {
        setDocument(result.document);
        const fieldsResult = await getDocumentFields(result.document.id);
        if (fieldsResult.ok) {
          setFields(fieldsResult.fields);
        } else {
          setFieldsError(fieldsResult.detail);
        }
      } else if (result.unauthorized) {
        onUnauthorized();
      } else {
        setErrorDetail(result.detail);
      }
    } catch {
      setErrorDetail("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = () => {
    if (!fields || fields.length === 0 || !document) return;
    downloadFieldsAsCsv(fields, `${document.id}-fields.csv`);
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
              setFields(null);
              setFieldsError(null);
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
            {document.duplicate_of_id && (
              <Alert severity="info">
                This document is a duplicate of document{" "}
                {document.duplicate_of_id}.
              </Alert>
            )}
          </>
        )}

        {fieldsError && <Alert severity="error">{fieldsError}</Alert>}

        {fields !== null && fields.length === 0 && (
          <Alert severity="info">
            {document?.extraction_status === "failed"
              ? "No fields are available because text extraction failed."
              : "No fields were extracted from this document."}
          </Alert>
        )}

        {fields !== null && fields.length > 0 && (
          <>
            <TableContainer>
              <Table size="small" aria-label="Extracted fields">
                <TableHead>
                  <TableRow>
                    <TableCell>Field</TableCell>
                    <TableCell>Value</TableCell>
                    <TableCell>Review</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {fields.map((field) => (
                    <TableRow key={field.field_name}>
                      <TableCell>{field.field_name}</TableCell>
                      <TableCell>{field.field_value}</TableCell>
                      <TableCell>
                        {field.needs_review ? (
                          <Chip label="Needs review" color="warning" size="small" />
                        ) : (
                          <Chip label="Confirmed" color="success" size="small" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Button variant="outlined" onClick={handleExport}>
              Export as CSV
            </Button>
          </>
        )}

        {errorDetail && <Alert severity="error">{errorDetail}</Alert>}
      </Stack>
    </Box>
  );
}
