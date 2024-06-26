import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import fs from 'fs';

export default{
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
    async execute(interaction) {
        try {
            let data = fs.readFileSync('./database/notice.json');
            let notices = JSON.parse(data);
            let latest_notice = notices[notices.length - 1];

            const text = interaction.options.getString('type');

            const random_color = Math.floor(Math.random() * 16777215);

            if(text === 'notice') {
                const embed = new EmbedBuilder()
                    .setTitle(latest_notice.title)
                    .setDescription(latest_notice.desc)
                    .addFields(
                        { name: 'Published Date:', value: `${latest_notice.day} ${latest_notice.month} ${latest_notice.year}`}
                    )
                    .setColor(random_color)
                    .setURL(latest_notice.link)
                    .setTimestamp();
                
                const link_btn = new ActionRowBuilder()
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
}