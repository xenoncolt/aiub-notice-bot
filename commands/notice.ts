import { ActionRowBuilder, APISelectMenuOption, AutocompleteInteraction, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, MessageFlags, SelectMenuComponentOptionData, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import notices from "../database/notice.json" with { type: "json" };
import config from "../config.json" with { type: "json" };
import { Command } from "../types/Command";
import { noticeComponentV2 } from "../helper/convertComponentV2.js";

export default {
    name: 'notice',
    type: 3,
    description: 'Search for notices using their title name',
    options: [
        {
            type: 3,
            name: 'search',
            description: 'Write a title name and select one from search',
            required: true,
            autocomplete: true
        }
    ],

    async execute (interaction: ChatInputCommandInteraction) {
        try {
            const searched_title = interaction.options.getString('search');

            const notice = notices.find(notice => {
                const truncate_title = notice.title.length > 100 ? notice.title.slice(0, 97) + '...' : notice.title;
                return truncate_title.toUpperCase() === searched_title?.toUpperCase();                
            });

            if (!notice) await interaction.reply({ content: "Notice not Found!", ephemeral: true });

            const link_url = notice?.link_info.startsWith(config.url) ? notice.link_info : config.url+notice?.link_info;

            // const embed = new EmbedBuilder()
            //     .setTitle(notice?.title as string)
            //     .setDescription(notice?.full_desc ||notice?.desc as string)
            //     .setColor('Random')
            //     .addFields(
            //         {
            //             name: 'Published Date:',
            //             value: `${notice?.day} ${notice?.month} ${notice?.year}`
            //         }
            //     )
            //     .setURL(link_url as string)
            //     .setTimestamp();

            //     if (notice?.img_urls?.length as number > 0) {
            //         for (const img_url of notice!.img_urls!) {
            //             embed.setImage(img_url);
            //         }
            //     }

            const container = noticeComponentV2(notice!.title, notice!.desc, notice?.full_desc, notice!.img_urls as string[], `${notice?.day} ${notice?.month} ${notice?.year}`);

            const link_btn = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('Details')
                        .setStyle(ButtonStyle.Link)
                        .setURL(link_url as string)
                );

            if (notice?.pdf_options?.length as number > 0 && notice?.pdf_options) {
                const select_menu = new StringSelectMenuBuilder()
                    .setCustomId('select-pdf')
                    .setPlaceholder('Select a PDF to send to your DM')
                    .addOptions(
                        notice?.pdf_options?.map((option: SelectMenuComponentOptionData | APISelectMenuOption | undefined) => new StringSelectMenuOptionBuilder(option)) as []
                    );

                const menu = new ActionRowBuilder<StringSelectMenuBuilder>()
                    .addComponents(select_menu);
                
                await interaction.reply({ components: [container, link_btn, menu], flags: MessageFlags.IsComponentsV2 });
            } else {
                await interaction.reply({ components: [container, link_btn], flags: MessageFlags.IsComponentsV2 });
            }
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Error occurred while fetching the data. Contact with `xenoncolt`.', ephemeral: true });
        }
    },

    async autocomplete(interaction: AutocompleteInteraction) {
        const focused_option = interaction.options.getFocused();

        const reverse_notices = notices.reverse();

        // Split the user's input into individual keywords
        const keywords = focused_option.split(/\s+/).map(k => k.toUpperCase());

        const titles = reverse_notices.filter(notice => keywords.every(keyword => notice.title.toUpperCase().includes(keyword))).slice(0, 25);

        

        await interaction.respond(
            titles.map(t => {
                const limit_title = t.title.length > 100 ? t.title.slice(0, 97) + '...' : t.title;
                return {
                    name: limit_title,
                    value: limit_title
            }})
        );
    }
} as Command;