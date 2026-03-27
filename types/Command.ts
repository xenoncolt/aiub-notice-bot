import { AutocompleteInteraction, ButtonInteraction, Client, Interaction, ModalSubmitInteraction, StringSelectMenuInteraction } from "discord.js";

export interface Command {
    name: string;
    description: string;
    options?: any[];
    execute: (interaction: Interaction, client: Client) => Promise<void>;
    autocomplete?: (interaction: AutocompleteInteraction, client: Client) => Promise<void>;
    modalSubmit?: (interaction: ModalSubmitInteraction, client: Client) => Promise<void>;
    buttonClick?: (interaction: ButtonInteraction, client: Client) => Promise<void>;
    selectMenu?: (interaction: StringSelectMenuInteraction, client: Client) => Promise<void>;
}