import { Client, Collection, Events, GatewayIntentBits } from "discord.js";
import { REST } from "@discordjs/rest";
import {  } from "discord-api-types/v10";
import sqlite3 from "sqlite3";
import { Database, open } from "sqlite";
import {  } from "jsdom";
import {  } from "url";
import {  } from "pdf-to-png-converter";
import fs from "fs";
import fetch from "node-fetch";
import path from "path";
import {  } from "./config.json";

import "dotenv/config";
import { ExtendedClient } from "./types/ExtendedClient";
import { loadCommands } from "./handler/slashCommandHandler";
import { loadEvents } from "./handler/eventHandler";
import { Command } from "./types/Command";


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

client.login(process.env.TOKEN);