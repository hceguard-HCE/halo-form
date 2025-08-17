import express from "express";
import fs from "fs";
import path from "path";
import { Client, GatewayIntentBits } from "discord.js";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

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

const CANAL_REGISTROS = process.env.CANAL_REGISTROS;
const CANAL_APROBACIONES = process.env.CANAL_APROVACIONES;
const CANAL_CONEXIONES = process.env.CANAL_CONEXIONES;

// Archivo para persistencia
const FILE = path.join(process.cwd(), "disk", "registros.json");
if (!fs.existsSync(path.dirname(FILE))) fs.mkdirSync(path.dirname(FILE), { recursive: true });
if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, "{}");

// Cargar registros
function loadRegistros() {
  try {
    const data = fs.readFileSync(FILE, "utf8");
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

// Guardar registros
function saveRegistros(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

// En memoria
let registros = loadRegistros();

// Endpoint para recibir registros
app.post("/registro", async (req, res) => {
  const { nick, pais, servidores, prefJuego, motivo, deviceID } = req.body;
  if (!deviceID) return res.status(400).json({ ok: false, error: "No hay deviceID" });

  registros[deviceID] = { nick, pais, servidores, prefJuego, motivo, aprobado: false };
  saveRegistros(registros);

  try {
    const canal = await client.channels.fetch(CANAL_REGISTROS);
    if (canal) {
      canal.send(`📋 Nuevo registro
Nick: ${nick}
País: ${pais}
Servidores: ${servidores}
Preferencia: ${prefJuego}
Motivo: ${motivo}
DeviceID: ${deviceID}`);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});

// Endpoint para revisar si está aprobado
app.get("/check/:id", (req, res) => {
  const id = req.params.id;
  const aprobado = registros[id]?.aprobado || false;
  res.json({ aprobado });
});

// Conectar / Desconectar
app.post("/conectar", async (req, res) => {
  const { nick, prefJuego } = req.body;
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

// Canal de aprobaciones
client.on("messageCreate", (msg) => {
  if (msg.channel.id !== CANAL_APROBACIONES) return;

  const [cmd, deviceID] = msg.content.split(" ");
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

// Login bot
client.login(process.env.DISCORD_BOT_TOKEN);

// Servir index
app.get("/", (req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "index.html"));
});

// Iniciar servidor
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));
