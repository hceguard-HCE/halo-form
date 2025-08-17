const express = require("express");
const fetch = require("node-fetch");
const app = express();
app.use(express.json());

const WEBHOOK_URL = process.env.WEBHOOK_URL; // <-- tu webhook seguro

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
app.listen(PORT, ()=>console.log("Servidor corriendo"));
