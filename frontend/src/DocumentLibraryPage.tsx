import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { getDocuments, type DocumentOut } from "./api/documents";
import { formatDate, formatFileSize, formatStatusLabel, statusChipColor } from "./formatting";

const PAGE_SIZE = 10;

export function DocumentLibraryPage() {
  const [offset, setOffset] = useState(0);
  const [documents, setDocuments] = useState<DocumentOut[] | null>(null);
  const [total, setTotal] = useState(0);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setErrorDetail(null);
    setLoading(true);
    getDocuments(PAGE_SIZE, offset).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setDocuments(result.page.items);
        setTotal(result.page.total);
      } else {
        setErrorDetail(result.detail);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [offset]);

  return (
    <Box sx={{ maxWidth: 960, mx: "auto", mt: 8, px: 2 }}>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Document Library
      </Typography>

      {errorDetail && <Alert severity="error">{errorDetail}</Alert>}

      {loading && documents === null && (
        <Stack spacing={1} aria-label="Loading document library">
          <Skeleton variant="rectangular" height={40} />
          <Skeleton variant="rectangular" height={40} />
          <Skeleton variant="rectangular" height={40} />
        </Stack>
      )}

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
                    <TableCell>{formatFileSize(document.size_bytes)}</TableCell>
                    <TableCell>{formatDate(document.created_at)}</TableCell>
                    <TableCell>
                      <Chip
                        label={formatStatusLabel(document.status)}
                        color={statusChipColor(document.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={formatStatusLabel(document.extraction_status)}
                        color={statusChipColor(document.extraction_status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {document.duplicate_of_id ? (
                        <Chip
                          component={Link}
                          to={`/documents/${document.duplicate_of_id}`}
                          clickable
                          label="Duplicate"
                          color="default"
                          size="small"
                        />
                      ) : (
                        <Typography component="span" variant="body2" sx={{ color: "text.secondary" }}>
                          —
                        </Typography>
                      )}
                    </TableCell>
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
