import { Client, GatewayIntentBits } from "discord.js";
import express from "express";
import fetch from "node-fetch";

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;        // Para el check de deviceID
const WEBHOOK_URL = process.env.WEBHOOK_URL;      // Webhook de Discord para notificaciones
const PORT = process.env.PORT || 3001;

const app = express();
app.use(express.json());

// Endpoint que el frontend llama para enviar registro
app.post("/registro", async (req, res) => {
  const data = req.body;
  if (!data.deviceID) return res.status(400).json({ error: "Falta deviceID" });

  // Enviar al webhook
  await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: `Nuevo registro:\nNick: ${data.nick}\nPaís: ${data.pais}\nServidores: ${data.servidores}\nPreferencia: ${data.prefJuego}\nMotivo: ${data.motivo}\nDeviceID: ${data.deviceID}`
    })
  });

  res.json({ ok: true });
});

// Endpoint para que el frontend consulte si el deviceID está aprobado
app.get("/check/:deviceID", async (req, res) => {
  const deviceID = req.params.deviceID;
  const channel = await client.channels.fetch(CHANNEL_ID);
  const messages = await channel.messages.fetch({ limit: 100 });

  let aprobado = false;
  messages.forEach(msg => {
    if(msg.content.startsWith(deviceID + ":")) {
      const valor = msg.content.split(":")[1].trim();
      if(valor.toLowerCase() === "true") aprobado = true;
    }
  });

  res.json({ aprobado });
});

app.listen(PORT, () => console.log(`Bot API corriendo en puerto ${PORT}`));

client.once("ready", () => {
  console.log(`Bot listo! Logged in as ${client.user.tag}`);
});

client.login(DISCORD_TOKEN);
