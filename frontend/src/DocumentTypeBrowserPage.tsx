import { useState } from "react";
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
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { getDocumentsByType, type DocumentOut } from "./api/documents";
import { formatFileSize, formatStatusLabel, statusChipColor } from "./formatting";

const PAGE_SIZE = 10;

export function DocumentTypeBrowserPage() {
  const [typeInput, setTypeInput] = useState("");
  const [searchedType, setSearchedType] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [documents, setDocuments] = useState<DocumentOut[] | null>(null);
  const [total, setTotal] = useState(0);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const runSearch = (type: string, searchOffset: number) => {
    setErrorDetail(null);
    setLoading(true);
    getDocumentsByType(type, { limit: PAGE_SIZE, offset: searchOffset }).then((result) => {
      if (result.ok) {
        setDocuments(result.page.items);
        setTotal(result.page.total);
      } else {
        setDocuments(null);
        setErrorDetail(result.detail);
      }
      setLoading(false);
    });
  };

  const handleSearch = () => {
    const type = typeInput.trim();
    if (!type) return;
    setSearchedType(type);
    setOffset(0);
    runSearch(type, 0);
  };

  const handlePageChange = (newOffset: number) => {
    if (!searchedType) return;
    setOffset(newOffset);
    runSearch(searchedType, newOffset);
  };

  return (
    <Box sx={{ maxWidth: 960, mx: "auto", mt: 8, px: 2 }}>
      <Typography variant="h5" gutterBottom>
        Document Type Browser
      </Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <TextField
          label="Document type"
          value={typeInput}
          onChange={(event) => setTypeInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") handleSearch();
          }}
          size="small"
          fullWidth
        />
        <Button variant="contained" onClick={handleSearch} disabled={!typeInput.trim()}>
          Search
        </Button>
      </Stack>

      {errorDetail && <Alert severity="error">{errorDetail}</Alert>}

      {loading && documents === null && (
        <Stack spacing={1} aria-label="Loading document type results">
          <Skeleton variant="rectangular" height={40} />
          <Skeleton variant="rectangular" height={40} />
          <Skeleton variant="rectangular" height={40} />
        </Stack>
      )}

      {documents !== null && documents.length === 0 && (
        <Alert severity="info">No documents were found with this type.</Alert>
      )}

      {documents !== null && documents.length > 0 && (
        <>
          <TableContainer>
            <Table size="small" aria-label="Document type browser results">
              <TableHead>
                <TableRow>
                  <TableCell>Filename</TableCell>
                  <TableCell>Format</TableCell>
                  <TableCell>Size</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Extraction</TableCell>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              disabled={offset === 0}
              onClick={() => handlePageChange(Math.max(0, offset - PAGE_SIZE))}
            >
              Previous
            </Button>
            <Button
              variant="outlined"
              disabled={offset + PAGE_SIZE >= total}
              onClick={() => handlePageChange(offset + PAGE_SIZE)}
            >
              Next
            </Button>
          </Stack>
        </>
      )}
    </Box>
  );
}
