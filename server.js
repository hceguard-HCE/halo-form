const express = require("express");
const fetch = require("node-fetch");
const app = express();
app.use(express.json());

const WEBHOOK_URL = process.env.WEBHOOK_URL; // Tu webhook seguro
const PORT = process.env.PORT || 3000;

// JSON local simulando aprobaciones
// En producción puedes reemplazarlo por un canal de Discord o base de datos
const aprobados = {}; // ejemplo: { "device-id-ejemplo": true }

app.post("/registro", async (req, res) => {
  const { nick, pais, servidores, prefJuego, motivo, deviceID } = req.body;

  // Enviar al webhook
  await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: `Nuevo registro:\nNick: ${nick}\nPaís: ${pais}\nServidores: ${servidores}\nPreferencia: ${prefJuego}\nMotivo: ${motivo}\nDeviceID: ${deviceID}`
    })
  });

  res.json({ ok: true });
});

// Endpoint para revisar si un deviceID está aprobado
app.get("/check/:deviceID", (req, res) => {
  const deviceID = req.params.deviceID;
  res.json({ aprobado: aprobados[deviceID] || false });
});

// Endpoint para aprobar manualmente desde un bot o admin (opcional)
app.post("/aprobar/:deviceID", (req, res) => {
  const deviceID = req.params.deviceID;
  aprobados[deviceID] = true;
  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
