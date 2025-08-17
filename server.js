import express from "express";
import fs from "fs";
import path from "path";
import { Client, GatewayIntentBits } from "discord.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Directorio persistente en Render: "disk" es la carpeta que mantienes en Persisted Disk
const FILE = path.join(process.cwd(), "disk", "aprobados.json");

// Asegurar directorio y archivo
if (!fs.existsSync(path.dirname(FILE))) fs.mkdirSync(path.dirname(FILE), { recursive: true });
if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, "{}");

// Funciones de lectura/escritura
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

// Endpoint para chequear estado
app.get("/check/:id", (req, res) => {
  const aprobados = getAprobados();
  const id = req.params.id;
  res.json({ aprobado: !!aprobados[id] });
});

// Endpoint para notificar conexión
app.post("/conectar", express.json(), async (req, res) => {
  const { nick } = req.body;
  try {
    const canal = await client.channels.fetch(process.env.CANAL_CONEXIONES);
    if (canal) {
      canal.send(`**${nick}** **${Preferencia}** se ha conectado.`);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});

// Endpoint para notificar conexión
app.post("/desconectar", express.json(), async (req, res) => {
  const { nick } = req.body;
  try {
    const canal = await client.channels.fetch(process.env.CANAL_CONEXIONES);
    if (canal) {
      canal.send(`🔴 **${nick}** se ha desconectado.`);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});

// Servir front
app.use(express.static(path.join(process.cwd(), "public")));

// Discord Bot
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// ID del canal de aprobaciones
const CANAL_APROBACIONES = process.env.CANAL_APROVACIONES;

client.on("messageCreate", (msg) => {
  if (msg.channel.id !== CANAL_APROBACIONES) return;

  const [cmd, deviceID] = msg.content.split(" ");

  if (cmd === "approve" && deviceID) {
    const aprobados = getAprobados();
    aprobados[deviceID] = true;
    saveAprobados(aprobados);
    msg.reply(`✅ El ID **${deviceID}** fue aprobado.`);
  }

  if (cmd === "deny" && deviceID) {
    const aprobados = getAprobados();
    delete aprobados[deviceID];
    saveAprobados(aprobados);
    msg.reply(`❌ El ID **${deviceID}** fue eliminado de aprobados.`);
  }
});

// Login bot
client.login(process.env.DISCORD_BOT_TOKEN);

// Start server
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));



