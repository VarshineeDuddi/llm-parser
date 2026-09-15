import { useState } from "react";
import { Link } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
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
import { ConfidenceIndicator } from "./ConfidenceIndicator";
import { getFieldOccurrences, type FieldResultWithDocumentOut } from "./api/documents";

const PAGE_SIZE = 10;

type SortOption = "none" | "value" | "confidence" | "needs_review";

function sortResults(
  results: FieldResultWithDocumentOut[],
  sortBy: SortOption,
): FieldResultWithDocumentOut[] {
  if (sortBy === "none") return results;
  const sorted = [...results];
  sorted.sort((a, b) => {
    if (sortBy === "value") return a.field_value.localeCompare(b.field_value);
    if (sortBy === "confidence") return a.confidence - b.confidence;
    return Number(a.needs_review) - Number(b.needs_review);
  });
  return sorted;
}

export function FieldExplorerPage() {
  const [fieldNameInput, setFieldNameInput] = useState("");
  const [searchedFieldName, setSearchedFieldName] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [results, setResults] = useState<FieldResultWithDocumentOut[] | null>(null);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState<SortOption>("none");
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const runSearch = (fieldName: string, searchOffset: number) => {
    setErrorDetail(null);
    setLoading(true);
    getFieldOccurrences(fieldName, { limit: PAGE_SIZE, offset: searchOffset }).then((result) => {
      if (result.ok) {
        setResults(result.page.items);
        setTotal(result.page.total);
      } else {
        setResults(null);
        setErrorDetail(result.detail);
      }
      setLoading(false);
    });
  };

  const handleSearch = () => {
    const fieldName = fieldNameInput.trim();
    if (!fieldName) return;
    setSearchedFieldName(fieldName);
    setOffset(0);
    setSortBy("none");
    runSearch(fieldName, 0);
  };

  const handlePageChange = (newOffset: number) => {
    if (!searchedFieldName) return;
    setOffset(newOffset);
    runSearch(searchedFieldName, newOffset);
  };

  const sortedResults = results ? sortResults(results, sortBy) : null;

  return (
    <Box sx={{ maxWidth: 960, mx: "auto", mt: 8, px: 2 }}>
      <Typography variant="h5" gutterBottom>
        Field Explorer
      </Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <TextField
          label="Field name"
          value={fieldNameInput}
          onChange={(event) => setFieldNameInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") handleSearch();
          }}
          size="small"
          fullWidth
        />
        <Button variant="contained" onClick={handleSearch} disabled={!fieldNameInput.trim()}>
          Search
        </Button>
      </Stack>

      {errorDetail && <Alert severity="error">{errorDetail}</Alert>}

      {loading && sortedResults === null && (
        <Stack spacing={1} aria-label="Loading field explorer results">
          <Skeleton variant="rectangular" height={40} />
          <Skeleton variant="rectangular" height={40} />
          <Skeleton variant="rectangular" height={40} />
        </Stack>
      )}

      {sortedResults !== null && sortedResults.length === 0 && (
        <Alert severity="info">No documents were found with this field.</Alert>
      )}

      {sortedResults !== null && sortedResults.length > 0 && (
        <>
          <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: "center" }}>
            <Typography variant="body2">Sort by:</Typography>
            <Select
              size="small"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortOption)}
            >
              <MenuItem value="none">None</MenuItem>
              <MenuItem value="value">Value</MenuItem>
              <MenuItem value="confidence">Confidence</MenuItem>
              <MenuItem value="needs_review">Needs review</MenuItem>
            </Select>
          </Stack>

          <TableContainer>
            <Table size="small" aria-label="Field explorer results">
              <TableHead>
                <TableRow>
                  <TableCell>Document</TableCell>
                  <TableCell>Value</TableCell>
                  <TableCell>Confidence</TableCell>
                  <TableCell>Review</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedResults.map((result) => (
                  <TableRow key={`${result.document_id}-${result.field_name}`}>
                    <TableCell>
                      <Link to={`/documents/${result.document_id}`}>{result.document_id}</Link>
                    </TableCell>
                    <TableCell>{result.field_value}</TableCell>
                    <TableCell>
                      <ConfidenceIndicator confidence={result.confidence} />
                    </TableCell>
                    <TableCell>
                      {result.needs_review ? (
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
