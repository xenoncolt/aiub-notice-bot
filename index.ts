import { Client, Collection, Events, GatewayIntentBits } from "discord.js";


import "dotenv/config";
import { ExtendedClient } from "./types/ExtendedClient";
import { loadCommands, registerSlashCommands } from "./handler/slashCommandHandler.js";
import { loadEvents } from "./handler/eventHandler.js";
import { Command } from "./types/Command.js";


const client: ExtendedClient = new Client({
    intents:[
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.DirectMessageTyping
    ]
}) as ExtendedClient;

// const rest = new REST({ version: '10' }).setToken(process.env.TOKEN as string);

client.commands = new Collection<string, Command>();

loadCommands(client);
loadEvents(client);

client.once(Events.ClientReady, async () => {
    console.log(`Loading slashCommand for ${client.user!.tag}`);
    await registerSlashCommands(client);
});

client.login(process.env.TOKEN);