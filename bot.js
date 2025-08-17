import { Client, GatewayIntentBits, REST, Routes } from "discord.js";
import express from "express";

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID; // canal privado de aprobaciones
const PORT = process.env.PORT || 3001;

const app = express();

// Endpoint que el frontend consulta
app.get("/check/:deviceID", async (req, res) => {
  const deviceID = req.params.deviceID;
  const channel = await client.channels.fetch(CHANNEL_ID);
  const messages = await channel.messages.fetch({ limit: 100 });

  let aprobado = false;
  messages.forEach(msg => {
    if(msg.content.startsWith(deviceID + ":")) {
      const valor = msg.content.split(":")[1].trim();
      if(valor.toLowerCase() === "true") aprobado = true;
    }
  });

  res.json({ aprobado });
});

app.listen(PORT, () => console.log(`Bot API corriendo en puerto ${PORT}`));

client.once("ready", () => {
  console.log(`Bot listo! Logged in as ${client.user.tag}`);
});

client.login(DISCORD_TOKEN);
