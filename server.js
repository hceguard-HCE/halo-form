const express = require("express");
const fetch = require("node-fetch");
const path = require("path");
const app = express();

app.use(express.json());

// Servir archivos estáticos (HTML, CSS, JS)
app.use(express.static(path.join(__dirname)));

// Tu webhook seguro en Render → Environment Variables
const WEBHOOK_URL = process.env.WEBHOOK_URL;

// Puerto de Render
const PORT = process.env.PORT || 3000;

// JSON local simulando aprobaciones
const aprobados = {}; // ejemplo: { "device-id-ejemplo": true }

// Endpoint para recibir registro desde frontend
app.post("/registro", async (req, res) => {
  const { nick, pais, servidores, prefJuego, motivo, deviceID } = req.body;

  try {
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `Nuevo registro:\nNick: ${nick}\nPaís: ${pais}\nServidores: ${servidores}\nPreferencia: ${prefJuego}\nMotivo: ${motivo}\nDeviceID: ${deviceID}`
      })
    });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Error enviando webhook" });
  }
});

// Endpoint para revisar si un deviceID está aprobado
app.get("/check/:deviceID", (req, res) => {
  const deviceID = req.params.deviceID;
  res.json({ aprobado: aprobados[deviceID] || false });
});

// Endpoint opcional para aprobar manualmente un deviceID
app.post("/aprobar/:deviceID", (req, res) => {
  const deviceID = req.params.deviceID;
  aprobados[deviceID] = true;
  res.json({ ok: true });
});

// Iniciar servidor
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
