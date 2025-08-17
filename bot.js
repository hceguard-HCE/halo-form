import { Client, GatewayIntentBits } from "discord.js";
import fs from "fs";

const client = new Client({ intents: [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent
]});

// ---- CONFIG ----
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN; // tu token del bot
const CANAL_APROBACIONES = "1406465463591899267"; // reemplaza con el ID real
const JSON_PATH = "aprobados.json";

// Cargar aprobaciones existentes
let aprobados = {};
try {
  aprobados = JSON.parse(fs.readFileSync(JSON_PATH));
} catch(err) {
  console.log("No existe aprobados.json, se creará al actualizar");
}

// Evento al iniciar el bot
client.once("ready", () => {
  console.log(`Bot conectado como ${client.user.tag}`);
});

// Evento al recibir mensajes
client.on("messageCreate", (message) => {
  // Ignorar mensajes de otros canales o del propio bot
  if (message.channel.id !== CANAL_APROBACIONES) return;
  if (message.author.bot) return;

  console.log(`Mensaje recibido en canal de aprobaciones: "${message.content}"`);

  // Parsear mensajes tipo deviceID: true o false
  const match = message.content.match(/^([\w-]+):\s*(true|false)$/i);
  if (!match) return;

  const deviceID = match[1];
  const estado = match[2].toLowerCase() === "true";

  // Actualizar objeto y archivo JSON
  aprobados[deviceID] = estado;
  fs.writeFileSync(JSON_PATH, JSON.stringify(aprobados, null, 2));

  console.log(`DeviceID ${deviceID} actualizado a ${estado}`);
});

// Iniciar bot
client.login(DISCORD_BOT_TOKEN);
