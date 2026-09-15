import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { getNeedsReviewQueue, type FieldResultWithDocumentOut } from "./api/documents";
import { formatDate } from "./formatting";

const PAGE_SIZE = 10;

export function NeedsReviewQueuePage() {
  const [offset, setOffset] = useState(0);
  const [results, setResults] = useState<FieldResultWithDocumentOut[] | null>(null);
  const [total, setTotal] = useState(0);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setErrorDetail(null);
    setLoading(true);
    getNeedsReviewQueue({ limit: PAGE_SIZE, offset }).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setResults(result.page.items);
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
      <Typography variant="h5" gutterBottom>
        Needs-Review Queue
      </Typography>

      {errorDetail && <Alert severity="error">{errorDetail}</Alert>}

      {loading && results === null && (
        <Stack spacing={1} aria-label="Loading needs-review queue">
          <Skeleton variant="rectangular" height={40} />
          <Skeleton variant="rectangular" height={40} />
          <Skeleton variant="rectangular" height={40} />
        </Stack>
      )}

      {results !== null && results.length === 0 && (
        <Alert severity="info">Nothing needs review right now.</Alert>
      )}

      {results !== null && results.length > 0 && (
        <>
          <TableContainer>
            <Table size="small" aria-label="Needs-review queue">
              <TableHead>
                <TableRow>
                  <TableCell>Document</TableCell>
                  <TableCell>Field</TableCell>
                  <TableCell>Value</TableCell>
                  <TableCell>Confidence</TableCell>
                  <TableCell>Flagged</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {results.map((result) => (
                  <TableRow key={`${result.document_id}-${result.field_name}`}>
                    <TableCell>
                      <Link to={`/documents/${result.document_id}`}>{result.document_id}</Link>
                    </TableCell>
                    <TableCell>{result.field_name}</TableCell>
                    <TableCell>{result.field_value}</TableCell>
                    <TableCell>{result.confidence}</TableCell>
                    <TableCell>{formatDate(result.created_at)}</TableCell>
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
