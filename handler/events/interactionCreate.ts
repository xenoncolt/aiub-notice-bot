import { AttachmentBuilder, EmbedBuilder, Events, Interaction } from "discord.js";
import { ExtendedClient } from "../../types/ExtendedClient.js";
import config from "../../config.json" with { type: "json" };
import { convertPDFToImages, downloadPDF } from "../../utils/noticeFetch.js";
import { unlinkSync } from "fs";

export default {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction: Interaction, client: ExtendedClient) {
        if(!interaction.isChatInputCommand() && !interaction.isStringSelectMenu() && !interaction.isAutocomplete()) return;

        if (interaction.isChatInputCommand()) {
            const cmd = client.commands.get(interaction.commandName);
            if(!cmd) return;
            
            try {
                await cmd.execute(interaction, client);
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true});
                await client.users.cache.get(config.owner)?.send({ content: `Something wrong with your code, Error: \n\`\`\`cmd\n${error}\`\`\``});
            }
        } else if (interaction.isStringSelectMenu()) {
            // this need to be change later
            const pdf_url = interaction.values[0];

            const pdf_name = pdf_url.split('/').pop()?.replace('.pdf', '').replaceAll('-', ' ');
            const google_viewer_url = `${config.google_viewer}${config.url}${pdf_url}&embedded=true`;

            const embed = new EmbedBuilder()
                    .setTitle(`${pdf_name}`)
                    .setURL(google_viewer_url)
                    .setColor('Random')

            try {
                await interaction.deferReply({ ephemeral: true });

                const pdf_path = await downloadPDF(`${config.url}${pdf_url}`);
                const images = await convertPDFToImages(pdf_path);

                if (typeof images === 'string') {
                    await interaction.user.send({ content: 'Downloading a notice PDF just to view it is unnecessary. Instead, click below (Blue text) to view it online', embeds: [embed] });
                } else {
                    for (const image_path of images) {
                        const attachment = new AttachmentBuilder(image_path);
                        await interaction.user.send({ files: [attachment] });
                        unlinkSync(image_path);
                    }
                    await interaction.user.send({ content: `This will also help you if you want to view raw pdf or have a link in PDF\n -# Note: click the blue text`, embeds: [embed] });
                }

                unlinkSync(pdf_path);
                await interaction.editReply({ content: 'The PDF Images has been sent to your DMs'});
            } catch (error) {
                console.error('Failed to send PDF image to user:', error);
                await interaction.editReply({ content: 'Failed to send the PDF images to yours DMs. Please make sure you `ADD APP` as `User` and try again.\n\n You can also view by clicking below link.', embeds: [embed] });
            }
        } else if (interaction.isAutocomplete()) {
            const cmd = client.commands.get(interaction.commandName);
            if (!cmd || !cmd.autocomplete) return;

            try {
                await cmd.autocomplete(interaction, client);
            } catch (error) {
                console.error('Error handling autocomplete interaction: ', error);
            }
        }
    }
}