const discord = require('discord.js');
const dotenv = require('dotenv');


const client = new discord.Client({
    intents: [
        discord.GatewayIntentBits.Guilds
    ]
});

client.once(discord.Events.ClientReady, bot => {
    console.log(`Logged in as ${bot.user.tag}`);
});


dotenv.config();
client.login(process.env.TOKEN);