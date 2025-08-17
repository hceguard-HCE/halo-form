import { Client, GatewayIntentBits } from "discord.js";
import fs from "fs";

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CANAL_APROBACIONES = "aprobaciones"; // nombre del canal

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.once("ready", () => {
  console.log("Bot listo!");
});

client.on("messageCreate", (message) => {
  if(message.channel.name !== CANAL_APROBACIONES) return;

  const content = message.content.trim();
  const [deviceID, value] = content.split(":").map(s => s.trim());
  if(!deviceID || !value) return;

  let aprobados = {};
  try { aprobados = JSON.parse(fs.readFileSync("aprobados.json")); } catch(err) {}

  aprobados[deviceID] = value === "true";
  fs.writeFileSync("aprobados.json", JSON.stringify(aprobados, null, 2));
  console.log(`DeviceID ${deviceID} actualizado a ${value}`);
});

client.login(TOKEN);
