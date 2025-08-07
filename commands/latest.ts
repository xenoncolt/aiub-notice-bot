import { ActionRowBuilder, APISelectMenuOption, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, EmbedBuilder, MessageFlags, SelectMenuComponentOptionData, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import config from "../config.json" with { type: "json" };
import { readFileSync } from "fs";
import { Command } from "../types/Command";
import { noticeComponentV2 } from "../helper/convertComponentV2.js";
import { newsEventsDB } from "../schema/aiubNews.js";
import { title } from "process";

const news_db = await newsEventsDB();

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
                // const embed = new EmbedBuilder()
                //     .setTitle(latest_notice.title)
                //     .setDescription(latest_notice.full_desc || latest_notice.desc)
                //     .addFields(
                //         { name: 'Published Date:', value: `${latest_notice.day} ${latest_notice.month} ${latest_notice.year}` },
                //         { name: `Note`, value: `Please check our [Terms of Service](https://xenoncolt.github.io/file_storage/TERMS_OF_SERVICE) & [policy](https://xenoncolt.github.io/file_storage/PRIVACY_POLICY). Always verify information from official [sources](https://www.aiub.edu/category/notices)`}
                //     )
                //     .setColor('Random')
                //     .setURL(config.url+latest_notice.link_info)
                //     .setFooter({ text: 'Remember, this bot is not a replacement for official announcements.' })
                //     .setTimestamp();

                // if (latest_notice.img_urls.length > 0) {
                //     for (const img_url of latest_notice.img_urls) {
                //         embed.setImage(img_url);
                //     }
                // }

                const { container, attachment } = await noticeComponentV2(latest_notice.title, latest_notice.desc, latest_notice.full_desc, latest_notice.img_urls, `${latest_notice.day} ${latest_notice.month} ${latest_notice.year}`);

                const link_btn = new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel('Details')
                            .setStyle(ButtonStyle.Link)
                            .setURL(config.url+latest_notice.link_info)
                    );
                    
                if (latest_notice.pdf_options && latest_notice.pdf_options.length > 0) {
                    const select_menu = new StringSelectMenuBuilder()
                                        .setCustomId('select-pdf')
                                        .setPlaceholder('Select a PDF to send to your DM')
                                        .addOptions(
                                            latest_notice.pdf_options.map((option: APISelectMenuOption | SelectMenuComponentOptionData | undefined) => new StringSelectMenuOptionBuilder(option)) as []
                                        );
                    
                    const menu = new ActionRowBuilder<StringSelectMenuBuilder>()
                        .addComponents(select_menu);
                    if (attachment) await interaction.reply({ components: [container, link_btn, menu], flags: MessageFlags.IsComponentsV2, files: [attachment] });
                    else await interaction.reply({ components: [container, link_btn, menu], flags: MessageFlags.IsComponentsV2 });
                } else {
                    if (attachment) await interaction.reply({ components: [container, link_btn], flags: MessageFlags.IsComponentsV2, files: [attachment] });
                    else await interaction.reply({ components: [container, link_btn], flags: MessageFlags.IsComponentsV2 });
                }
            } else if (text === 'news') {
                // await interaction.reply('News is not available yet.');
                const latest_news = await news_db.get(`SELECT * FROM aiub ORDER BY ROWID DESC LIMIT 1`);

                if (latest_news) {
                    const { container, attachment } = await noticeComponentV2(latest_news.title, '', latest_news.desc, latest_news.img_urls, latest_news.published_date);

                    const link_btn = new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel('Details')
                            .setStyle(ButtonStyle.Link)
                            .setURL(config.url+latest_news.link_info)
                            .setEmoji("📰")
                    );

                    if (attachment) await interaction.reply({ components: [container, link_btn], flags: MessageFlags.IsComponentsV2, files: [attachment] });
                    else await interaction.reply({ components: [container, link_btn], flags: MessageFlags.IsComponentsV2 });
                }
            }
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Error occurred while fetching the data.', flags: MessageFlags.Ephemeral });
        }
    }
} as Command;