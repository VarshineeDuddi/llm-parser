import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
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

// Client-side approximated sequence only -- the backend's /documents/upload
// call is a single synchronous request with no intermediate progress
// events, so this is not a claim of real per-stage backend progress.
const PROGRESS_LABELS = ["Uploading…", "Processing…"];
const PROGRESS_ROTATE_MS = 1200;

type FeedStatus = "success" | "warning" | "error" | "info";

interface FeedStep {
  key: string;
  status: FeedStatus;
  text: string;
}

const FEED_STATUS_COLOR: Record<FeedStatus, string> = {
  success: "success.main",
  warning: "warning.main",
  error: "error.main",
  info: "info.main",
};

function buildResultFeed(
  document: DocumentOut | null,
  fields: FieldResultOut[] | null,
  fieldsError: string | null,
): FeedStep[] {
  if (!document) return [];

  const steps: FeedStep[] = [
    {
      key: "uploaded",
      status: "success",
      text: `Uploaded successfully. Document ID: ${document.id} (status: ${document.status}).`,
    },
  ];

  if (document.extraction_status === "succeeded") {
    steps.push({ key: "extraction", status: "success", text: "Text extraction succeeded." });
  } else if (document.extraction_status === "failed") {
    steps.push({
      key: "extraction",
      status: "warning",
      text: `Text extraction failed${
        document.extraction_failure_reason ? `: ${document.extraction_failure_reason}` : "."
      }`,
    });
  }

  if (document.duplicate_of_id) {
    steps.push({
      key: "duplicate",
      status: "info",
      text: `This document is a duplicate of document ${document.duplicate_of_id}.`,
    });
  }

  if (fieldsError) {
    steps.push({ key: "fields", status: "error", text: fieldsError });
  } else if (fields !== null) {
    if (fields.length === 0) {
      steps.push({
        key: "fields",
        status: "info",
        text:
          document.extraction_status === "failed"
            ? "No fields are available because text extraction failed."
            : "No fields were extracted from this document.",
      });
    } else {
      const needsReviewCount = fields.filter((field) => field.needs_review).length;
      steps.push({
        key: "fields",
        status: needsReviewCount > 0 ? "warning" : "success",
        text:
          `${fields.length} field${fields.length === 1 ? "" : "s"} extracted` +
          (needsReviewCount > 0 ? `, ${needsReviewCount} needing review.` : "."),
      });
    }
  }

  return steps;
}

function ResultFeed({ steps }: { steps: FeedStep[] }) {
  if (steps.length === 0) return null;
  return (
    <List dense aria-label="Upload result feed" sx={{ py: 0 }}>
      {steps.map((step) => (
        <ListItem key={step.key} sx={{ py: 0.25 }}>
          <ListItemText primary={step.text} sx={{ color: FEED_STATUS_COLOR[step.status] }} />
        </ListItem>
      ))}
    </List>
  );
}

export function UploadPage({ onUnauthorized }: UploadPageProps) {
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [progressLabelIndex, setProgressLabelIndex] = useState(0);
  const [document, setDocument] = useState<DocumentOut | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [fields, setFields] = useState<FieldResultOut[] | null>(null);
  const [fieldsError, setFieldsError] = useState<string | null>(null);

  useEffect(() => {
    if (!submitting) {
      setProgressLabelIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setProgressLabelIndex((index) => (index + 1) % PROGRESS_LABELS.length);
    }, PROGRESS_ROTATE_MS);
    return () => clearInterval(interval);
  }, [submitting]);

  const selectFile = (selected: File | null) => {
    setFile(selected);
    setDocument(null);
    setErrorDetail(null);
    setFields(null);
    setFieldsError(null);
  };

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

  const resultFeed = buildResultFeed(document, fields, fieldsError);

  return (
    <Box sx={{ maxWidth: 480, mx: "auto", mt: 8, px: 2 }}>
      <Typography variant="h5" gutterBottom>
        Upload a document
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Supported formats: PDF, DOCX, PPTX, TXT
      </Typography>

      <Stack spacing={2} sx={{ mt: 3 }}>
        <Box
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            selectFile(event.dataTransfer.files?.[0] ?? null);
          }}
        >
          <Button variant="outlined" component="label" fullWidth>
            {file ? file.name : "Choose file or drag it here"}
            <input
              type="file"
              hidden
              onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
            />
          </Button>
        </Box>

        <Button
          variant="contained"
          disabled={!file || submitting}
          onClick={handleSubmit}
        >
          {submitting ? "Uploading…" : "Upload"}
        </Button>

        {submitting && (
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">
              {PROGRESS_LABELS[progressLabelIndex]}
            </Typography>
          </Stack>
        )}

        <ResultFeed steps={resultFeed} />

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
