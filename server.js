import fs from "fs";
import path from "path";
import express from "express";
import { Client, GatewayIntentBits } from "discord.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Archivo donde se guardan los aprobados
const filePath = path.join(process.cwd(), "aprobados.json");

// Asegurar que el archivo exista
if (!fs.existsSync(filePath)) {
  fs.writeFileSync(filePath, "{}");
}

// Leer aprobados
function getAprobados() {
  try {
    const data = fs.readFileSync("aprobados.json", "utf8");
    return data ? JSON.parse(data) : {};
  } catch (err) {
    return {}; // si no existe o está vacío
  }
}

// Guardar aprobados
function saveAprobados(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Express endpoint para revisar si está aprobado
app.get("/check/:id", (req, res) => {
  const aprobados = getAprobados();
  const id = req.params.id;
  res.json({ approved: !!aprobados[id] });
});

// Discord bot
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const CANAL_APROBACIONES = "1406465463591899267"; // 🔴 reemplaza con el ID real del canal

client.on("messageCreate", (msg) => {
  if (msg.channel.id !== CANAL_APROBACIONES) return;

  // El mensaje debe tener formato: approve 12345
  if (msg.content.startsWith("approve ")) {
    const id = msg.content.split(" ")[1];
    if (!id) {
      msg.reply("Debes poner un ID después de `approve`.");
      return;
    }

    const aprobados = getAprobados();
    aprobados[id] = true;
    saveAprobados(aprobados);

    msg.reply(`✅ El ID **${id}** fue aprobado.`);
  }

  // También podrías tener un comando para quitar aprobación
  if (msg.content.startsWith("deny ")) {
    const id = msg.content.split(" ")[1];
    if (!id) {
      msg.reply("Debes poner un ID después de `deny`.");
      return;
    }

    const aprobados = getAprobados();
    delete aprobados[id];
    saveAprobados(aprobados);

    msg.reply(`❌ El ID **${id}** fue eliminado de aprobados.`);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);

app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));


