import express from "express";
import path from "path";
import cors from "cors";
import { Client, GatewayIntentBits } from "discord.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(process.cwd(), "public")));

// Discord Bot
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Verifica si el usuario tiene el rol de aprobado
async function isAprobado(userId, guildId) {
  try {
    const guild = await client.guilds.fetch(guildId);
    const member = await guild.members.fetch(userId);
    return member.roles.cache.has(process.env.ROL_APROBADO);
  } catch {
    return false;
  }
}

// Endpoint para verificar si el usuario está aprobado
app.get("/check/:id", async (req, res) => {
  const userId = req.params.id;
  const aprobado = await isAprobado(userId, process.env.GUILD_ID);
  res.json({ aprobado });
});

// Endpoint para notificar conexión
app.post("/conectar", async (req, res) => {
  const { userId, nick, prefJuego } = req.body;
  if (!(await isAprobado(userId, process.env.GUILD_ID))) {
    return res.status(403).json({ ok: false, message: "Usuario no aprobado" });
  }

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

client.login(process.env.DISCORD_BOT_TOKEN);

app.get("/", (req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "index.html"));
});

app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));
