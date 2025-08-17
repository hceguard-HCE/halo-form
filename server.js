import express from "express";
import path from "path";
import cors from "cors";
import { Client, GatewayIntentBits } from "discord.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(process.cwd(), "public")));

// Discord
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const CANAL_REGISTROS = process.env.CANAL_REGISTROS;       // donde llegan nuevos registros
const CANAL_APROBACIONES = process.env.CANAL_APROVACIONES; // donde se hace approve/deny
const CANAL_CONEXIONES = process.env.CANAL_CONEXIONES;     // canal de conexión/desconexión

// Memoria de registros
const registros = {}; // { deviceID: { nick, pais, servidores, prefJuego, motivo, aprobado } }

// Endpoint para recibir registro desde frontend
app.post("/registro", async (req, res) => {
  const { nick, pais, servidores, prefJuego, motivo, deviceID } = req.body;
  if (!deviceID) return res.status(400).json({ ok: false, error: "No hay deviceID" });

  registros[deviceID] = { nick, pais, servidores, prefJuego, motivo, aprobado: false };

  try {
    const canal = await client.channels.fetch(CANAL_REGISTROS);
    if (canal) {
      canal.send(`📋 Nuevo registro
Nick: ${nick}
País: ${pais}
Servidores: ${servidores}
Preferencia: ${prefJuego}
Motivo: ${motivo}
DeviceID: ${deviceID}
Estado: ❌ Pendiente`);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});

// Endpoint para verificar si está aprobado
app.get("/check/:id", (req, res) => {
  const id = req.params.id;
  const aprobado = registros[id]?.aprobado || false;
  res.json({ aprobado });
});

// Endpoint conectar
app.post("/conectar", async (req, res) => {
  const { nick, deviceID, prefJuego } = req.body;
  if (!registros[deviceID] || !registros[deviceID].aprobado)
    return res.status(403).json({ ok: false, error: "No aprobado" });

  try {
    const canal = await client.channels.fetch(CANAL_CONEXIONES);
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

// Endpoint desconectar
app.post("/desconectar", async (req, res) => {
  const { nick } = req.body;
  try {
    const canal = await client.channels.fetch(CANAL_CONEXIONES);
    if (canal) canal.send(`**${nick}** se ha desconectado.`);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});

// Bot escucha canal de aprobaciones
client.on("messageCreate", (msg) => {
  if (msg.channel.id !== CANAL_APROBACIONES) return;
  const [cmd, deviceID] = msg.content.split(" ");
  if (!deviceID || !registros[deviceID]) return;

  if (cmd === "approve") {
    registros[deviceID].aprobado = true;
    msg.reply(`✅ El registro de ${registros[deviceID].nick} fue aprobado.`);
    // Actualizar mensaje en #registros si quieres
  }
  if (cmd === "deny") {
    registros[deviceID].aprobado = false;
    msg.reply(`❌ El registro de ${registros[deviceID].nick} fue rechazado.`);
    // Actualizar mensaje en #registros si quieres
  }
});

// Login bot
client.login(process.env.DISCORD_BOT_TOKEN);

// Servir frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "index.html"));
});

// Iniciar servidor
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));
