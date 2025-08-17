import express from "express";
import { Client, GatewayIntentBits } from "discord.js";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Discord Bot
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const CANAL_REGISTRO = process.env.CANAL_REGISTRO; // Canal donde llegan los formularios
const CANAL_APROBACIONES = process.env.CANAL_APROBACIONES; // Canal donde admins aprueban/deniegan

// Endpoint para registrar
app.post("/registro", async (req, res) => {
  const { nick, pais, servidores, prefJuego, motivo, deviceID } = req.body;

  try {
    const canal = await client.channels.fetch(CANAL_REGISTRO);
    if (canal) {
      canal.send(
        `📋 **Nuevo registro**\n` +
        `Nick: ${nick}\n` +
        `País: ${pais}\n` +
        `Servidores: ${servidores}\n` +
        `Preferencia: ${prefJuego}\n` +
        `Motivo: ${motivo}\n` +
        `DeviceID: \`${deviceID}\``
      );
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});

// Endpoint para verificar
app.get("/check/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const canal = await client.channels.fetch(CANAL_APROBACIONES);
    if (!canal) return res.json({ aprobado: false });

    const mensajes = await canal.messages.fetch({ limit: 100 });
    const aprobado = mensajes.some(msg =>
      msg.content.includes(`approve ${id}`)
    );

    res.json({ aprobado });
  } catch (err) {
    console.error(err);
    res.status(500).json({ aprobado: false });
  }
});

// Discord: manejar comandos approve/deny
client.on("messageCreate", (msg) => {
  if (msg.channel.id !== CANAL_APROBACIONES) return;

  const [cmd, deviceID] = msg.content.split(" ");
  if (!deviceID) return;

  if (cmd === "approve") {
    msg.reply(`✅ El ID **${deviceID}** fue aprobado.`);
  }

  if (cmd === "deny") {
    msg.reply(`❌ El ID **${deviceID}** fue denegado.`);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);

app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));
