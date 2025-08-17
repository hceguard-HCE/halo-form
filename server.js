import express from "express";
import fs from "fs";
import path from "path";
import { Client, GatewayIntentBits } from "discord.js";
import cors from "cors";




const app = express();
const PORT = process.env.PORT || 3000;

// Verificar variables de entorno
const {
  DISCORD_BOT_TOKEN,
  CANAL_REGISTROS,
  CANAL_APROBACIONES,
  CANAL_CONEXIONES
} = process.env;

if (!DISCORD_BOT_TOKEN || !CANAL_REGISTROS || !CANAL_APROBACIONES || !CANAL_CONEXIONES) {
  console.error("❌ Faltan variables de entorno necesarias.");
  process.exit(1);
}

// Middlewares
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(process.cwd(), "public")));

// Discord Bot
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Archivo para persistencia
const FILE = path.join(process.cwd(), "disk", "registros.json");
if (!fs.existsSync(path.dirname(FILE))) fs.mkdirSync(path.dirname(FILE), { recursive: true });
if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, "{}");

function loadRegistros() {
  try {
    const data = fs.readFileSync(FILE, "utf8");
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}
function saveRegistros(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

let registros = loadRegistros();
let botReady = false;

client.on("ready", () => {
  console.log(`🤖 Bot listo como ${client.user.tag}`);
  botReady = true;
});

// Registro desde frontend
app.post("/registro", async (req, res) => {
  if (!botReady) return res.status(503).json({ ok: false, error: "Bot no listo" });

  const { nick, pais, servidores, prefJuego, motivo, deviceID } = req.body;
  if (!deviceID) return res.status(400).json({ ok: false, error: "Falta deviceID" });
  if (!/^[a-zA-Z0-9_]+$/.test(nick)) return res.status(400).json({ ok: false, error: "Nick inválido" });

  registros[deviceID] = { nick, pais, servidores, prefJuego, motivo, aprobado: false };
  saveRegistros(registros);

  try {
    const canal = await client.channels.fetch(CANAL_REGISTROS);
    if (!canal) return res.status(500).json({ ok: false, error: "Canal de registros no encontrado" });

    await canal.send(`📋 Nuevo registro
Nick: ${nick}
País: ${pais}
Servidores: ${servidores}
Preferencia: ${prefJuego}
Motivo: ${motivo}
DeviceID: ${deviceID}`);

    res.json({ ok: true });
  } catch (err) {
    console.error("Error al enviar registro:", err);
    res.status(500).json({ ok: false });
  }
});

// Verificar aprobación
app.get("/check/:id", (req, res) => {
  const id = req.params.id;
  const aprobado = registros[id]?.aprobado || false;
  res.json({ aprobado });
});

// Conexión
app.post("/conectar", async (req, res) => {
  if (!botReady) return res.status(503).json({ ok: false, error: "Bot no listo" });
  const { nick, prefJuego } = req.body;
  try {
    const canal = await client.channels.fetch(CANAL_CONEXIONES);
    if (!canal) return res.status(500).json({ ok: false, error: "Canal de conexiones no encontrado" });

    const pref = prefJuego.includes("Pro") ? "Pro" : prefJuego;
    await canal.send(`**${nick}** (${pref}) se ha conectado.`);
    res.json({ ok: true });
  } catch (err) {
    console.error("Error al conectar:", err);
    res.status(500).json({ ok: false });
  }
});

// Desconexión
app.post("/desconectar", async (req, res) => {
  if (!botReady) return res.status(503).json({ ok: false, error: "Bot no listo" });
  const { nick } = req.body;
  try {
    const canal = await client.channels.fetch(CANAL_CONEXIONES);
    if (!canal) return res.status(500).json({ ok: false, error: "Canal de conexiones no encontrado" });

    await canal.send(`**${nick}** se ha desconectado.`);
    res.json({ ok: true });
  } catch (err) {
    console.error("Error al desconectar:", err);
    res.status(500).json({ ok: false });
  }
});

// Aprobaciones desde Discord
client.on("messageCreate", (msg) => {
  if (msg.channel.id !== CANAL_APROBACIONES) return;

  const [cmd, deviceID] = msg.content.trim().split(" ");
  if (!deviceID || !registros[deviceID]) return;

  if (cmd === "approve") {
    registros[deviceID].aprobado = true;
    saveRegistros(registros);
    msg.reply(`✅ El registro de ${registros[deviceID].nick} fue aprobado.`);
  }

  if (cmd === "deny") {
    registros[deviceID].aprobado = false;
    saveRegistros(registros);
    msg.reply(`❌ El registro de ${registros[deviceID].nick} fue rechazado.`);
  }
});

// Login del bot
client.login(DISCORD_BOT_TOKEN);

// Servir index
app.get("/", (req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "index.html"));
});

// Iniciar servidor
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`));

