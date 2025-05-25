import { AutocompleteInteraction, Client, Interaction, ModalSubmitInteraction } from "discord.js";

export interface Command {
    name: string;
    description: string;
    options?: any[];
    execute: (interaction: Interaction, client: Client) => Promise<void>;
    autocomplete?: (interaction: AutocompleteInteraction, client: Client) => Promise<void>;
    modalSubmit?: (interaction: ModalSubmitInteraction, client: Client) => Promise<void>;
}