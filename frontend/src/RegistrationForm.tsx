import { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { registerUser } from "./api/documents";
import { setStoredApiKey } from "./apiKey";

interface RegistrationFormProps {
  onRegistered: () => void;
}

export function RegistrationForm({ onRegistered }: RegistrationFormProps) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    setErrorDetail(null);
    try {
      const result = await registerUser(name.trim());
      if (result.ok) {
        setStoredApiKey(result.user.api_key);
        onRegistered();
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
        Register to get started
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Enter a name to create an account. You'll need this to upload and view
        documents.
      </Typography>

      <Stack spacing={2} sx={{ mt: 3 }}>
        <TextField
          label="Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Button
          variant="contained"
          disabled={!name.trim() || submitting}
          onClick={handleSubmit}
        >
          {submitting ? "Registering…" : "Register"}
        </Button>
        {errorDetail && <Alert severity="error">{errorDetail}</Alert>}
      </Stack>
    </Box>
  );
}
