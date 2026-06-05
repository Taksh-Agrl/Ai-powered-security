import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export async function scanPayload({ code, language, fileName, repoUrl, file, useAI }) {
  if (file) {
    const form = new FormData();
    form.append("file", file);
    form.append("language", language);
    form.append("useAI", String(useAI));

    const { data } = await axios.post(`${API_BASE_URL}/api/scan`, form);
    return data;
  }

  const { data } = await axios.post(`${API_BASE_URL}/api/scan`, {
    code,
    language,
    fileName,
    repoUrl,
    useAI
  });

  return data;
}
