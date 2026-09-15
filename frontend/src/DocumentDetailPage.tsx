import { useParams } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export function DocumentDetailPage() {
  const { id } = useParams();

  return (
    <Box sx={{ maxWidth: 480, mx: "auto", mt: 8, px: 2 }}>
      <Typography variant="h5" gutterBottom>
        Document detail
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Detail view for document {id} is coming soon.
      </Typography>
    </Box>
  );
}
