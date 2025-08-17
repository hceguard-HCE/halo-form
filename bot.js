import { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } from "discord.js";
import fetch from "node-fetch";

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN;
const BACKEND_KEY = process.env.ADMIN_KEY; 
const BACKEND_URL = "https://tu-proyecto.onrender.com/aprobar"; 

client.once(Events.ClientReady, () => console.log(`Bot listo!`));

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;

  const deviceID = interaction.customId.split("_")[1];

  try {
    const res = await fetch(BACKEND_URL, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ deviceID, key: BACKEND_KEY })
    });
    const json = await res.json();
    if(json.ok){
      await interaction.reply({ content:`Usuario aprobado! DeviceID: ${deviceID}`, ephemeral:true });
      const btn = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(interaction.customId)
          .setLabel("Aprobado ✅")
          .setStyle(ButtonStyle.Success)
          .setDisabled(true)
      );
      await interaction.message.edit({ components: [btn] });
    }
  } catch(err){
    console.error(err);
    await interaction.reply({ content:"Error al aprobar usuario.", ephemeral:true });
  }
});

client.login(DISCORD_TOKEN);
