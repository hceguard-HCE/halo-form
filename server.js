import express from "express";
import fs from "fs";
import path from "path";
import { Client, GatewayIntentBits } from "discord.js";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

const {
  DISCORD_BOT_TOKEN,
  CANAL_CODIGOS,
  CANAL_REGISTROS,
  CANAL_APROBACIONES,
  CANAL_CONEXIONES
} = process.env;

if (!DISCORD_BOT_TOKEN || !CANAL_CODIGOS || !CANAL_REGISTROS || !CANAL_APROBACIONES || !CANAL_CONEXIONES) {
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
let codigosDisponibles = new Set();
let botReady = false;

client.on("ready", () => {
  console.log(`🤖 Bot listo como ${client.user.tag}`);
  botReady = true;
});

client.on("messageCreate", (msg) => {
  if (msg.channel.id === CANAL_CODIGOS) {
    const match = msg.content.match(/INVITE-CODE:\s*(\S+)/);
    if (match) {
      const codigo = match[1].trim();
      if (!registros[codigo]) {
        codigosDisponibles.add(codigo);
        msg.react("✅");
      } else {
        msg.react("⚠️");
      }
    }
  }

  if (msg.channel.id === CANAL_APROBACIONES) {
    const [cmd, codigo] = msg.content.trim().split(" ");
    const registro = registros[codigo];
    if (!registro) return;

    if (cmd === "approve") {
      registro.aprobado = true;
      saveRegistros(registros);
      msg.reply(`✅ El registro de ${registro.nick} fue aprobado.`);
    }

    if (cmd === "deny") {
      registro.aprobado = "rechazado";
      saveRegistros(registros);
      msg.reply(`❌ El registro de ${registro.nick} fue rechazado.`);
    }
  }
});

app.post("/registro", async (req, res) => {
  if (!botReady) return res.status(503).json({ ok: false, error: "Bot no listo" });

  const { codigo, nick, pais, servidores, prefJuego, motivo } = req.body;
  if (!codigo || !codigosDisponibles.has(codigo)) return res.status(400).json({ ok: false, error: "Código inválido o ya usado" });
  if (!nick || !/^[a-zA-Z0-9_]+$/.test(nick)) return res.status(400).json({ ok: false, error: "Nick inválido" });

  registros[codigo] = { codigo, nick, pais, servidores, prefJuego, motivo, aprobado: false };
  codigosDisponibles.delete(codigo);
  saveRegistros(registros);

  try {
    const canal = await client.channels.fetch(CANAL_REGISTROS);
    await canal.send(`📋 Nuevo registro
Nick: ${nick}
Código: ${codigo}
País: ${pais}
Servidores: ${servidores}
Preferencia: ${prefJuego}
Motivo: ${motivo}`);
    res.json({ ok: true });
  } catch (err) {
    console.error("Error al enviar registro:", err);
    res.status(500).json({ ok: false });
  }
});

app.get("/check/:codigo", (req, res) => {
  const registro = registros[req.params.codigo];
  if (!registro) return res.status(404).json({ error: "Código no encontrado" });
  res.json({ aprobado: registro.aprobado, ...registro });
});

app.post("/conectar", async (req, res) => {
  const { codigo } = req.body;
  const registro = registros[codigo];
  if (!registro || registro.aprobado !== true) return res.status(403).json({ ok: false });

  try {
    const canal = await client.channels.fetch(CANAL_CONEXIONES);
    await canal.send(`✅ ${registro.nick} se ha conectado.`);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ ok: false });
  }
});

app.post("/desconectar", async (req, res) => {
  const { codigo } = req.body;
  const registro = registros[codigo];
  if (!registro) return res.status(404).json({ ok: false });

  try {
    const canal = await client.channels.fetch(CANAL_CONEXIONES);
    await canal.send(`🔒 ${registro.nick} se ha desconectado.`);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ ok: false });
  }
});

client.login(DISCORD_BOT_TOKEN);

app.listen(PORT, () => console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`));
