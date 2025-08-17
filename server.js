import express from "express";
import fs from "fs";
import path from "path";
import { Client, GatewayIntentBits } from "discord.js";

const app = express();
const PORT = process.env.PORT || 3000;


// Servir archivos estáticos
app.use(express.static(path.join(process.cwd(), "public")));

// Carpeta y archivo para aprobados
const FILE = path.join(process.cwd(), "disk", "aprobados.json");
if (!fs.existsSync(path.dirname(FILE))) fs.mkdirSync(path.dirname(FILE), { recursive: true });
if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, "{}");

// Funciones para leer/escribir aprobados
function getAprobados() {
  try {
    const data = fs.readFileSync(FILE, "utf8");
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function saveAprobados(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

// Middlewares
app.use(express.json());
import cors from "cors";
app.use(cors());

// Endpoint para revisar estado
app.get("/check/:id", (req, res) => {
  const aprobados = getAprobados();
  const id = req.params.id;
  res.json({ aprobado: !!aprobados[id] });
});

// Endpoint para notificar conexión
app.post("/conectar", async (req, res) => {
  const { nick, prefJuego } = req.body;
  try {
    const canal = await client.channels.fetch(process.env.CANAL_CONEXIONES);
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

// Endpoint para notificar desconexión
app.post("/desconectar", async (req, res) => {
  const { nick } = req.body;
  try {
    const canal = await client.channels.fetch(process.env.CANAL_CONEXIONES);
    if (canal) canal.send(`**${nick}** se ha desconectado.`);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});

// Servir frontend
app.use(express.static(path.join(process.cwd(), "public")));

// Discord Bot
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const CANAL_APROBACIONES = process.env.CANAL_APROVACIONES;

// Bot maneja aprobaciones
client.on("messageCreate", (msg) => {
  if (msg.channel.id !== CANAL_APROBACIONES) return;

  const [cmd, deviceID] = msg.content.split(" ");
  if (!deviceID) return;

  const aprobados = getAprobados();

  if (cmd === "approve") {
    aprobados[deviceID] = true;
    saveAprobados(aprobados);
    msg.reply(`✅ El ID **${deviceID}** fue aprobado.`);
  }

  if (cmd === "deny") {
    delete aprobados[deviceID];
    saveAprobados(aprobados);
    msg.reply(`❌ El ID **${deviceID}** fue eliminado de aprobados.`);
  }
});

// Login
client.login(process.env.DISCORD_BOT_TOKEN);

// Iniciar servidor
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));

app.get("/", (req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "index.html"));
});
