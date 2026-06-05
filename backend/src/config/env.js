import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 5000),
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  groqApiKey: process.env.GROQ_API_KEY || "",
  groqModel: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  maxRepoFiles: Number(process.env.MAX_REPO_FILES || 80),
  maxFileBytes: Number(process.env.MAX_FILE_BYTES || 120000)
};
