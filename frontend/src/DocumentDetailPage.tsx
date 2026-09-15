import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import {
  getDocument,
  getDocumentFields,
  getExtraction,
  type DocumentOut,
  type ExtractionOut,
  type FieldResultOut,
} from "./api/documents";

export function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [document, setDocument] = useState<DocumentOut | null>(null);
  const [extraction, setExtraction] = useState<ExtractionOut | null>(null);
  const [fields, setFields] = useState<FieldResultOut[] | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setErrorDetail(null);

    Promise.all([getDocument(id), getExtraction(id), getDocumentFields(id)]).then(
      ([documentResult, extractionResult, fieldsResult]) => {
        if (cancelled) return;

        if (documentResult.ok) {
          setDocument(documentResult.document);
        } else {
          setErrorDetail(documentResult.detail);
        }

        if (extractionResult.ok) {
          setExtraction(extractionResult.extraction);
        }

        if (fieldsResult.ok) {
          setFields(fieldsResult.fields);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (errorDetail) {
    return (
      <Box sx={{ maxWidth: 720, mx: "auto", mt: 8, px: 2 }}>
        <Alert severity="error">{errorDetail}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 720, mx: "auto", mt: 8, px: 2 }}>
      <Typography variant="h5" gutterBottom>
        {document?.original_filename ?? "Document detail"}
      </Typography>

      {document?.duplicate_of_id && (
        <Alert severity="info" sx={{ mb: 2 }}>
          This document is a duplicate of{" "}
          <Link to={`/documents/${document.duplicate_of_id}`}>
            document {document.duplicate_of_id}
          </Link>
          .
        </Alert>
      )}

      <Typography variant="h6" sx={{ mt: 3 }}>
        Extracted Text
      </Typography>
      {extraction?.status === "succeeded" ? (
        <Box
          component="pre"
          sx={{ whiteSpace: "pre-wrap", bgcolor: "action.hover", p: 2, borderRadius: 1 }}
        >
          {extraction.extracted_text}
        </Box>
      ) : (
        extraction && (
          <Alert severity="warning">
            No extracted text is available
            {extraction.failure_reason ? `: ${extraction.failure_reason}` : "."}
          </Alert>
        )
      )}

      <Typography variant="h6" sx={{ mt: 3 }}>
        Extracted Fields
      </Typography>
      {fields !== null && fields.length === 0 && (
        <Alert severity="info">
          {document?.extraction_status === "failed"
            ? "No fields are available because text extraction failed."
            : "No fields were extracted from this document."}
        </Alert>
      )}
      {fields !== null && fields.length > 0 && (
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
      )}
    </Box>
  );
}
