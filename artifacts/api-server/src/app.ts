import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Servir arquivos estáticos do web
const webDistPath = path.join(__dirname, "../../web/dist/public");
app.use(express.static(webDistPath));

// SPA fallback - qualquer rota que não seja API ou arquivo estático retorna index.html
app.get("*", (req, res) => {
  // Se for rota de API e não existir, retorna 404
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "API endpoint not found" });
  }
  
  // Se não for API, serve o index.html (SPA fallback)
  res.sendFile(path.join(webDistPath, "index.html"));
});

export default app;
