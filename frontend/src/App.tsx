import { useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { getStoredApiKey } from "./apiKey";
import { DocumentDetailPage } from "./DocumentDetailPage";
import { DocumentLibraryPage } from "./DocumentLibraryPage";
import { DocumentTypeBrowserPage } from "./DocumentTypeBrowserPage";
import { FieldExplorerPage } from "./FieldExplorerPage";
import { RegistrationForm } from "./RegistrationForm";
import { UploadPage } from "./UploadPage";

function App() {
  const [hasKey, setHasKey] = useState(() => getStoredApiKey() !== null);

  if (!hasKey) {
    return <RegistrationForm onRegistered={() => setHasKey(true)} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DocumentLibraryPage />} />
        <Route path="/upload" element={<UploadPage onUnauthorized={() => setHasKey(false)} />} />
        <Route path="/documents/:id" element={<DocumentDetailPage />} />
        <Route path="/fields" element={<FieldExplorerPage />} />
        <Route path="/document-types" element={<DocumentTypeBrowserPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
