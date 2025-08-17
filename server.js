import express from "express";
import fetch from "node-fetch";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const WEBHOOK_URL = process.env.WEBHOOK_URL;

// Registro de formulario
app.post("/registro", async (req, res) => {
  const { nick, pais, servidores, prefJuego, motivo, deviceID } = req.body;

  try {
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({
        content: `Nuevo registro:\nNick: ${nick}\nPaís: ${pais}\nServidores: ${servidores}\nPreferencia: ${prefJuego}\nMotivo: ${motivo}\nDeviceID: ${deviceID}`
      })
    });
    res.json({ ok: true });
  } catch(err) {
    console.error(err);
    res.json({ ok: false });
  }
});

// Check si deviceID está aprobado
app.get("/check/:deviceID", (req, res)=>{
  const deviceID = req.params.deviceID;
  let aprobados = {};
  try { aprobados = JSON.parse(fs.readFileSync("aprobados.json")); } catch(err) {}
  res.json({ aprobado: aprobados[deviceID] || false });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log("Servidor corriendo en puerto " + PORT));
