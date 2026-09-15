import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { getDocuments, type DocumentOut } from "./api/documents";

const PAGE_SIZE = 10;

export function DocumentLibraryPage() {
  const [offset, setOffset] = useState(0);
  const [documents, setDocuments] = useState<DocumentOut[] | null>(null);
  const [total, setTotal] = useState(0);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setErrorDetail(null);
    getDocuments(PAGE_SIZE, offset).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setDocuments(result.page.items);
        setTotal(result.page.total);
      } else {
        setErrorDetail(result.detail);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [offset]);

  return (
    <Box sx={{ maxWidth: 960, mx: "auto", mt: 8, px: 2 }}>
      <Stack direction="row" sx={{ mb: 3, justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h5">Document Library</Typography>
        <Button variant="contained" component={Link} to="/upload">
          Upload a document
        </Button>
      </Stack>

      {errorDetail && <Alert severity="error">{errorDetail}</Alert>}

      {documents !== null && documents.length === 0 && (
        <Alert severity="info">No documents have been uploaded yet.</Alert>
      )}

      {documents !== null && documents.length > 0 && (
        <>
          <TableContainer>
            <Table size="small" aria-label="Document library">
              <TableHead>
                <TableRow>
                  <TableCell>Filename</TableCell>
                  <TableCell>Format</TableCell>
                  <TableCell>Size</TableCell>
                  <TableCell>Uploaded</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Extraction</TableCell>
                  <TableCell>Duplicate</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {documents.map((document) => (
                  <TableRow key={document.id}>
                    <TableCell>
                      <Link to={`/documents/${document.id}`}>{document.original_filename}</Link>
                    </TableCell>
                    <TableCell>{document.format}</TableCell>
                    <TableCell>{document.size_bytes}</TableCell>
                    <TableCell>{new Date(document.created_at).toLocaleString()}</TableCell>
                    <TableCell>{document.status}</TableCell>
                    <TableCell>{document.extraction_status}</TableCell>
                    <TableCell>{document.duplicate_of_id ? "Yes" : "No"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            >
              Previous
            </Button>
            <Button
              variant="outlined"
              disabled={offset + PAGE_SIZE >= total}
              onClick={() => setOffset(offset + PAGE_SIZE)}
            >
              Next
            </Button>
          </Stack>
        </>
      )}
    </Box>
  );
}
