import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json());

// Para poder usar __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Servir archivos estáticos desde "public"
app.use(express.static(path.join(__dirname, "public")));

const WEBHOOK_URL = process.env.WEBHOOK_URL;

// Endpoint para recibir registro
app.post("/registro", async (req, res) => {
  const { nick, pais, servidores, prefJuego, motivo, deviceID } = req.body;

  await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      content: `Nuevo registro:\nNick: ${nick}\nPaís: ${pais}\nServidores: ${servidores}\nPreferencia: ${prefJuego}\nMotivo: ${motivo}\nDeviceID: ${deviceID}`
    })
  });

  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
