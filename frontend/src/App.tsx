import { useState } from "react";
import { getStoredApiKey } from "./apiKey";
import { RegistrationForm } from "./RegistrationForm";
import { UploadPage } from "./UploadPage";

function App() {
  const [hasKey, setHasKey] = useState(() => getStoredApiKey() !== null);

  if (!hasKey) {
    return <RegistrationForm onRegistered={() => setHasKey(true)} />;
  }

  return <UploadPage onUnauthorized={() => setHasKey(false)} />;
}

export default App;
