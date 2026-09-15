import { useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { getStoredApiKey } from "./apiKey";
import { DocumentDetailPage } from "./DocumentDetailPage";
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
        <Route path="/" element={<UploadPage onUnauthorized={() => setHasKey(false)} />} />
        <Route path="/documents/:id" element={<DocumentDetailPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
