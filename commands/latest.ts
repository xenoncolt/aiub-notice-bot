import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { readFileSync } from "fs";
import { Command } from "../types/Command";

export default {
    name: 'latest',
    type: 3,
    description: 'Get the latest notice or news',
    options: [
        {
            type: 3,
            name: 'type',
            description: 'Choose between notice or news',
            required: true,
            choices: [
                {
                    name: 'Notice',
                    value: 'notice'
                },
                {
                    name: 'News',
                    value: 'news'
                }
            ]
        }
    ],
    async execute(interaction: ChatInputCommandInteraction) {
        try {
            let data = readFileSync('./database/notice.json');
            let notices = JSON.parse(data.toString());
            let latest_notice = notices[notices.length - 1];

            const text = interaction.options.getString('type');

            // Validate type is one of 'notice', 'news', or 'aiub_cc'
            const valid_types = ['notice', 'news', 'aiub_cc'];
            if (text === null || !valid_types.includes(text)) {
                await interaction.editReply(`Invalid type selected. Please choose either 'notice', 'news', or 'aiub_cc'.`);
                return;
            }

            if (text === 'notice') {
                const embed = new EmbedBuilder()
                    .setTitle(latest_notice.title)
                    .setDescription(latest_notice.desc)
                    .addFields(
                        { name: 'Published Date:', value: `${latest_notice.day} ${latest_notice.month} ${latest_notice.year}` }
                    )
                    .setColor('Random')
                    .setURL(latest_notice.link)
                    .setTimestamp();

                const link_btn = new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel('Details')
                            .setStyle(ButtonStyle.Link)
                            .setURL(latest_notice.link)
                    );

                await interaction.reply({ embeds: [embed], components: [link_btn] });
            } else if (text === 'news') {
                await interaction.reply('News is not available yet.');
            }
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Error occurred while fetching the data.', ephemeral: true });
        }
    }
} as Command;