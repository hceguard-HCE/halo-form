import express from "express";
import { Client, GatewayIntentBits } from "discord.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Discord Bot
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// IDs de canales
const CANAL_ENVIO = process.env.CANAL_ENVIO; // canal donde los usuarios envían deviceID:true/false
const CANAL_APROBACIONES = process.env.CANAL_APROVACIONES; // canal donde los admins aprueban/deniegan

// --- Endpoint para revisar estado ---
app.get("/check/:deviceID", async (req, res) => {
  const { deviceID } = req.params;

  try {
    const canal = await client.channels.fetch(CANAL_ENVIO);
    const mensajes = await canal.messages.fetch({ limit: 100 }); // últimos 100 mensajes
    let aprobado = false;

    mensajes.forEach((msg) => {
      if (msg.content.startsWith(deviceID)) {
        const valor = msg.content.split(":")[1]?.trim();
        if (valor === "true") aprobado = true;
      }
    });

    res.json({ aprobado });
  } catch (err) {
    console.error(err);
    res.status(500).json({ aprobado: false });
  }
});

// --- Endpoint para notificar conexión ---
app.post("/conectar", async (req, res) => {
  const { nick, prefJuego } = req.body;
  try {
    const canal = await client.channels.fetch(CANAL_ENVIO);
    if (canal) {
      const pref = prefJuego.includes("Pro") ? "Pro" : prefJuego;
      canal.send(`**${nick}** (${pref}) se ha conectado.`);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});

// --- Endpoint para notificar desconexión ---
app.post("/desconectar", async (req, res) => {
  const { nick } = req.body;
  try {
    const canal = await client.channels.fetch(CANAL_ENVIO);
    if (canal) canal.send(`**${nick}** se ha desconectado.`);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});

// --- Bot maneja aprobaciones ---
client.on("messageCreate", async (msg) => {
  if (msg.channel.id !== CANAL_APROBACIONES) return;

  const [cmd, deviceID] = msg.content.split(" ");
  if (!deviceID) return;

  const canalEnvio = await client.channels.fetch(CANAL_ENVIO);
  const mensajes = await canalEnvio.messages.fetch({ limit: 100 });
  const msgTarget = mensajes.find(m => m.content.startsWith(deviceID));

  if (cmd === "approve") {
    if (msgTarget) {
      const partes = msgTarget.content.split(":");
      partes[1] = "true";
      msgTarget.edit(partes.join(":"));
      msg.reply(`✅ El ID **${deviceID}** fue aprobado.`);
    }
  }

  if (cmd === "deny") {
    if (msgTarget) {
      const partes = msgTarget.content.split(":");
      partes[1] = "false";
      msgTarget.edit(partes.join(":"));
      msg.reply(`❌ El ID **${deviceID}** fue denegado.`);
    }
  }
});

// --- Servir frontend ---
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// --- Login bot y start server ---
client.login(process.env.DISCORD_BOT_TOKEN);
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));
