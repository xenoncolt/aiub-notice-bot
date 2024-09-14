import { Client, Collection } from "discord.js";
import { Command } from "./Command.js";


export interface ExtendedClient extends Client {
    commands: Collection<string, Command>;
}