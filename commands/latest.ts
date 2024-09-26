import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import config from "../config.json" assert { type: "json" };
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


            if (text === 'notice') {
                const embed = new EmbedBuilder()
                    .setTitle(latest_notice.title)
                    .setDescription(latest_notice.desc)
                    .addFields(
                        { name: 'Published Date:', value: `${latest_notice.day} ${latest_notice.month} ${latest_notice.year}` }
                    )
                    .setColor('Random')
                    .setURL(config.url+latest_notice.link)
                    .setTimestamp();

                const link_btn = new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel('Details')
                            .setStyle(ButtonStyle.Link)
                            .setURL(config.url+latest_notice.link)
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