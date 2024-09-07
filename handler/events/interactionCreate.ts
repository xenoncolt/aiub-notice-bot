import { Events, Interaction } from "discord.js";
import { ExtendedClient } from "../../types/ExtendedClient";
import { owner } from "../../config.json";

export default {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction: Interaction, client: ExtendedClient) {
        if(!interaction.isChatInputCommand()) return;

        if (interaction.isChatInputCommand()) {
            const cmd = client.commands.get(interaction.commandName);
            if(!cmd) return;
            
            try {
                await cmd.execute(interaction, client);
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true});
                await client.users.cache.get(owner)?.send({ content: `Something wrong with your code, Error: \n\`\`\`cmd\n${error}\`\`\``});
            }
        }
    }
}