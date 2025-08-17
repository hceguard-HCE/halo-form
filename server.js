// server.js
import express from "express";
import fs from "fs";
import path from "path";
import { Client, GatewayIntentBits } from "discord.js";

const app = express();
const PORT = process.env.PORT || 3000;
const FILE = path.join(process.cwd(), "aprobados.json");

// Middleware
app.use(express.json());

// Asegurar que exista el archivo de aprobados
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

// Endpoint para chequear estado de un DeviceID
app.get("/check/:id", (req, res) => {
  const aprobados = getAprobados();
  const id = req.params.id;
  res.json({ aprobado: !!aprobados[id] });
});

// Servir index.html desde la carpeta public
app.use(express.static(path.join(process.cwd(), "public")));

// Discord Bot
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// REEMPLAZA este ID con el ID real del canal de aprobaciones
const CANAL_APROBACIONES = "1406465463591899267";

client.on("messageCreate", (msg) => {
  if (msg.channel.id !== CANAL_APROBACIONES) return;

  const [cmd, deviceID] = msg.content.split(" ");

  if (cmd === "approve") {
    if (!deviceID) return msg.reply("Debes poner un ID después de `approve`.");
    const aprobados = getAprobados();
    aprobados[deviceID] = true;
    saveAprobados(aprobados);
    msg.reply(`✅ El ID **${deviceID}** fue aprobado.`);
  }

  if (cmd === "deny") {
    if (!deviceID) return msg.reply("Debes poner un ID después de `deny`.");
    const aprobados = getAprobados();
    delete aprobados[deviceID];
    saveAprobados(aprobados);
    msg.reply(`❌ El ID **${deviceID}** fue eliminado de aprobados.`);
  }
});

// Login del bot con token
client.login(process.env.DISCORD_BOT_TOKEN);

// Iniciar servidor
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
