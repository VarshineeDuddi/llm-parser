import { useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { getStoredApiKey } from "./apiKey";
import { AppShell } from "./AppShell";
import { DocumentDetailPage } from "./DocumentDetailPage";
import { DocumentLibraryPage } from "./DocumentLibraryPage";
import { DocumentTypeBrowserPage } from "./DocumentTypeBrowserPage";
import { FieldExplorerPage } from "./FieldExplorerPage";
import { NeedsReviewQueuePage } from "./NeedsReviewQueuePage";
import { RegistrationForm } from "./RegistrationForm";
import { theme } from "./theme";
import { UploadPage } from "./UploadPage";

function App() {
  const [hasKey, setHasKey] = useState(() => getStoredApiKey() !== null);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {!hasKey ? (
        <RegistrationForm onRegistered={() => setHasKey(true)} />
      ) : (
        <BrowserRouter>
          <AppShell>
            <Routes>
              <Route path="/" element={<DocumentLibraryPage />} />
              <Route
                path="/upload"
                element={<UploadPage onUnauthorized={() => setHasKey(false)} />}
              />
              <Route path="/documents/:id" element={<DocumentDetailPage />} />
              <Route path="/fields" element={<FieldExplorerPage />} />
              <Route path="/document-types" element={<DocumentTypeBrowserPage />} />
              <Route path="/needs-review" element={<NeedsReviewQueuePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppShell>
        </BrowserRouter>
      )}
    </ThemeProvider>
  );
}

export default App;
