import { ActionRowBuilder, ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, ContainerBuilder, GuildMember, MediaGalleryBuilder, MediaGalleryItemBuilder, MessageFlags, ModalActionRowComponentBuilder, ModalBuilder, ModalSubmitInteraction, SectionBuilder, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder, TextInputBuilder, TextInputStyle, ThumbnailBuilder, User } from "discord.js";
import { Command } from "../types/Command";
import config from "../config.json" with { type: "json" };

let replied_user : User | undefined;

export default {
    name: 'reply',
    description: 'Bot owner can reply to a user for a information',
    options: [
        {
            name: 'user_id',
            type: ApplicationCommandOptionType.String,
            description: 'User ID of the user to reply',
            required: true,
        }
    ],
    async execute(interaction: ChatInputCommandInteraction) : Promise<void> {
        // await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const replied_userId = interaction.options.getString('user_id');

        if (!replied_userId) {
            await interaction.reply({
                content: 'Please provide either a username or userId to reply.',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        if (interaction.user.id !== config.owner) {
            await interaction.reply({
                content: 'You do not have permission to use this command.',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }
        

        if (replied_userId) {
            replied_user = await interaction.client.users.fetch(replied_userId.toString());
        }

        if (!replied_user) {
            await interaction.reply({
                content: 'User not found. Please provide a valid username or userId.',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const modal = new ModalBuilder()
            .setCustomId('reply_a_user')
            .setTitle(`Reply/Send Message to ${replied_user.displayName}`)
            .addComponents(
                new ActionRowBuilder<ModalActionRowComponentBuilder>()
                    .addComponents(
                        new TextInputBuilder()
                            .setCustomId('reply_msg')
                            .setLabel(`Reply to ${replied_user.displayName} (${replied_user.username})`)
                            .setStyle(TextInputStyle.Paragraph)
                            .setPlaceholder(`What do you want to reply to ${replied_user.displayName}`)
                            .setRequired(true)
                    )
            );
        
        await interaction.showModal(modal);
    },
    async modalSubmit(interaction: ModalSubmitInteraction): Promise<void> {

        const msg = interaction.fields.getTextInputValue('reply_msg');

        // const interaction_container = formatContainer(msg);
        const interaction_container = new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(msg)
        ).addSeparatorComponents(
            new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
        ).addSectionComponents(
            new SectionBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`If you need any help, please join our support server: `)
            ).setButtonAccessory(
                new ButtonBuilder().setLabel('Support Server').setStyle(ButtonStyle.Link).setURL("https://discord.gg/xr6NpHfCFz")
            )
        );
        

        await replied_user?.send({
            flags: MessageFlags.IsComponentsV2,
            components: [interaction_container]
        });

        await interaction.reply({
            content: `Message sent to ${replied_user!.username} successfully!`,
            flags: MessageFlags.Ephemeral,
        });
    }
} as Command;

// function formatContainer(msg: string): ContainerBuilder {
//     const interactionContainer = new ContainerBuilder();
    
//     try {
        
//     );
//     } catch (error) {
//         console.error('Error formatting container:', error);
//         throw new Error('Failed to format container');
//     }

//     // const supportServerMsgSection = new SectionBuilder().addTextDisplayComponents(
//     //     new TextDisplayBuilder().setContent(`If you need any help, please join our support server: `)
//     // ).setButtonAccessory(
//     //     new ButtonBuilder().setLabel('Support Server').setStyle(ButtonStyle.Link).setURL("https://discord.gg/xr6NpHfCFz")
//     // );

//     // interactionContainer.addSeparatorComponents(
//     //     new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
//     // ).addSectionComponents(supportServerMsgSection);
    
//     return interactionContainer;
// }