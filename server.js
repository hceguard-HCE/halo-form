import express from "express";
import fs from "fs";
import path from "path";
import { Client, GatewayIntentBits } from "discord.js";
import cors from "cors";
import crypto from "crypto";

const app = express();
const PORT = process.env.PORT || 3000;

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

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(process.cwd(), "public")));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

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

app.post("/registro", async (req, res) => {
  if (!botReady) return res.status(503).json({ ok: false, error: "Bot no listo" });

  const { nick, pais, servidores, prefJuego, motivo } = req.body;
  if (!nick || !/^[a-zA-Z0-9_]+$/.test(nick)) return res.status(400).json({ ok: false, error: "Nick inválido" });

  const guid = crypto.randomUUID();
  registros[guid] = { guid, nick, pais, servidores, prefJuego, motivo, aprobado: false };
  saveRegistros(registros);

  try {
    const canal = await client.channels.fetch(CANAL_REGISTROS);
    await canal.send(`📋 Nuevo registro
Nick: ${nick}
País: ${pais}
Servidores: ${servidores}
Preferencia: ${prefJuego}
Motivo: ${motivo}
GUID: ${guid}`);
    res.json({ ok: true, guid });
  } catch (err) {
    console.error("Error al enviar registro:", err);
    res.status(500).json({ ok: false });
  }
});

app.get("/check/:guid", (req, res) => {
  const guid = req.params.guid;
  const registro = registros[guid];
  if (!registro) return res.status(404).json({ error: "GUID no encontrado" });
  res.json({ aprobado: registro.aprobado, nick: registro.nick });
});

app.post("/conectar", async (req, res) => {
  if (!botReady) return res.status(503).json({ ok: false, error: "Bot no listo" });
  const { guid } = req.body;
  const registro = registros[guid];
  if (!registro || !registro.aprobado) return res.status(403).json({ ok: false, error: "No aprobado" });

  try {
    const canal = await client.channels.fetch(CANAL_CONEXIONES);
    await canal.send(`✅ ${registro.nick} se ha conectado.`);
    res.json({ ok: true });
  } catch (err) {
    console.error("Error al conectar:", err);
    res.status(500).json({ ok: false });
  }
});

app.post("/desconectar", async (req, res) => {
  if (!botReady) return res.status(503).json({ ok: false, error: "Bot no listo" });
  const { guid } = req.body;
  const registro = registros[guid];
  if (!registro) return res.status(404).json({ ok: false });

  try {
    const canal = await client.channels.fetch(CANAL_CONEXIONES);
    await canal.send(`🔒 ${registro.nick} se ha desconectado.`);
    res.json({ ok: true });
  } catch (err) {
    console.error("Error al desconectar:", err);
    res.status(500).json({ ok: false });
  }
});

client.on("messageCreate", (msg) => {
  if (msg.channel.id !== CANAL_APROBACIONES) return;

  const [cmd, guid] = msg.content.trim().split(" ");
  const registro = registros[guid];
  if (!registro) return;

  if (cmd === "approve") {
    registro.aprobado = true;
    saveRegistros(registros);
    msg.reply(`✅ El registro de ${registro.nick} fue aprobado.`);
  }

  if (cmd === "deny") {
    registro.aprobado = false;
    saveRegistros(registros);
    msg.reply(`❌ El registro de ${registro.nick} fue rechazado.`);
  }
});

client.login(DISCORD_BOT_TOKEN);

app.get("/", (req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "index.html"));
});

app.listen(PORT, () => console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`));
