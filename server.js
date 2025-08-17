import express from "express";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import { Client, GatewayIntentBits } from "discord.js";

// --- FIX __dirname para ES Modules ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- App Express ---
const app = express();
const PORT = process.env.PORT || 3000;

// Variables de entorno
const TOKEN = process.env.DISCORD_TOKEN;
const CANAL_CODIGOS = process.env.CANAL_CODIGOS;
const CANAL_REGISTROS = process.env.CANAL_REGISTROS;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// --- DISCORD BOT ---
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

let codigosDisponibles = new Set();

client.once("ready", async () => {
  console.log(`Bot listo como ${client.user.tag}`);

  // Cargar códigos del canal
  try {
    const channel = await client.channels.fetch(CANAL_CODIGOS);
    let lastId;
    while (true) {
      const options = { limit: 100 };
      if (lastId) options.before = lastId;

      const messages = await channel.messages.fetch(options);
      if (messages.size === 0) break;

      messages.forEach(msg => {
        const match = msg.content.match(/INVITE-CODE:\s*([A-Z0-9\-]+)/);
        if (match) codigosDisponibles.add(match[1]);
      });

      lastId = messages.last().id;
    }
    console.log("Códigos disponibles:", codigosDisponibles);
  } catch (err) {
    console.error("Error cargando códigos:", err);
  }
});

// --- RUTA REGISTRO ---
app.post("/registro", async (req, res) => {
  const { codigo, nick } = req.body;

  if (!codigo || !nick) return res.status(400).json({ message: "❌ Código y nick requeridos" });
  if (!codigosDisponibles.has(codigo)) return res.status(400).json({ message: "❌ Código inválido o ya usado" });

  codigosDisponibles.delete(codigo);

  // Mandar mensaje al canal de registros
  try {
    const canalReg = await client.channels.fetch(CANAL_REGISTROS);
    canalReg.send(`✅ Nuevo registro: **${nick}** con código ${codigo}`);
  } catch (err) {
    console.error("Error enviando registro a Discord:", err);
  }

  res.json({ message: "✅ Registro exitoso" });
});

// --- CONECTAR / DESCONECTAR SIMULADO ---
app.post("/discord/connect", (req, res) => res.json({ message: "🔌 Conectado al servidor" }));
app.post("/discord/disconnect", (req, res) => res.json({ message: "🔌 Desconectado del servidor" }));

// --- FRONTEND ---
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// --- LOGIN BOT DISCORD ---
client.login(TOKEN);

// --- INICIAR SERVIDOR ---
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));
