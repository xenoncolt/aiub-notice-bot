import { APIContainerComponent, AttachmentBuilder, ButtonInteraction, ButtonStyle, ChannelType, ContainerBuilder, EmbedBuilder, Events, Interaction, MessageFlags, PermissionFlagsBits, SectionBuilder, TextDisplayBuilder, ThumbnailBuilder } from "discord.js";
import { ExtendedClient } from "../../types/ExtendedClient.js";
import config from "../../config.json" with { type: "json" };
import { convertPDFToImages, downloadPDF } from "../../utils/noticeFetch.js";
import { unlinkSync } from "fs";
import { noticeDB } from "../../schema/aiubNotics.js";

export default {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction: Interaction, client: ExtendedClient) {
        if(!interaction.isChatInputCommand() && !interaction.isStringSelectMenu() && !interaction.isAutocomplete() && !interaction.isButton() && !interaction.isModalSubmit()) return;

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
        } else if (interaction.isButton()) {
            const buttonId = interaction.customId;

            switch (buttonId) {
                case 'autoSetupNotice':
                    await handleAutoSetupNotice(interaction as ButtonInteraction);
                    break;
                default:
                    console.log(`Unknown button interaction: ${buttonId}`);
            }
        } else if (interaction.isModalSubmit()) {
            const modal_cmds = Array.from(client.commands.values()).find(cmd => 
                interaction.customId.startsWith(cmd.name) && cmd.modalSubmit
            );

            if (!modal_cmds) {
                console.warn(`No command found for modal submit with customId: ${interaction.customId}`);
                await interaction.reply({
                    content: `This modal is not recognized.`, ephemeral: true
                });
                return;
            }

            if (modal_cmds && modal_cmds.modalSubmit) {
                try {
                    await modal_cmds.modalSubmit(interaction, client);
                } catch (error) {
                    console.error(`Error executing modal submit for command ${modal_cmds.name}:`, error);
                    await interaction.reply({
                        content: `There was an error while executing this modal submit command!`, ephemeral: true
                    });
                }
            }
        }
    }
}

async function handleAutoSetupNotice(interaction: ButtonInteraction) {
    if (!interaction.guild?.members.me?.permissions.has(PermissionFlagsBits.ManageChannels)) return interaction.reply({ 
        content: 'I need `Manage Channel` permission to create channel. Please give me this permission and try again.',
        ephemeral: true
    });

    try {
        const category = await interaction.guild?.channels.create({
            name: 'AIUB Notices',
            type: ChannelType.GuildCategory,
            permissionOverwrites: [
                {
                    id: interaction.guild.roles.everyone,
                    allow: [PermissionFlagsBits.ViewChannel],
                    deny: [PermissionFlagsBits.SendMessages]
                },
                {
                    id: interaction.guild.members.me?.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels]
                }
            ]
        });

        const newChannel = await interaction.guild?.channels.create({
            name: 'AIUB-Notice',
            type: ChannelType.GuildText,
            parent: category?.id,
            topic: 'This channel is for AIUB Notices only. New notice will be post here.',
            permissionOverwrites: [
                {
                    id: interaction.guild.roles.everyone,
                    allow: [PermissionFlagsBits.ViewChannel],
                    deny: [PermissionFlagsBits.SendMessages]
                },
                {
                    id: interaction.guild.members.me?.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages]
                }
            ]
        });

        const notice_db = await noticeDB();

        await notice_db.run('INSERT OR IGNORE INTO channel (guild_id, channel_id) VALUES (?, ?)', [newChannel?.guildId, newChannel?.id]);

        const text = new TextDisplayBuilder().setContent(`New Notice will be post here.\nPlease wait for that.\nDon't delete this channel. Deleting this channel means stop posting notice in this channel.\nDon't change any permission of this channel. Change when you have knowledge about channel management.`)
        
        const pepeAsThumbnail = new ThumbnailBuilder().setURL('https://media.tenor.com/Lf2JYGN_5L8AAAAi/pepe.gif');

        const section = new SectionBuilder().addTextDisplayComponents(text).setThumbnailAccessory(pepeAsThumbnail);
        const container = new ContainerBuilder().addSectionComponents(section);

        await newChannel?.send({ 
            flags: MessageFlags.IsComponentsV2,
            components: [container]
        });

        if (interaction.message) {
            try {
                const container = interaction.message.components[0].toJSON() as APIContainerComponent;
                const newContainer = new ContainerBuilder(container);
        
                for (const component of newContainer.components) {
                    
                    if (component instanceof SectionBuilder && 
                        component.accessory && 
                        'data' in component.accessory && 
                        'custom_id' in component.accessory.data && 
                        component.accessory.data.custom_id === 'autoSetupNotice') {
                        
                        component.accessory.data.disabled = true;
                        component.accessory.data.label = 'Setup Complete';
                        component.accessory.data.style = ButtonStyle.Success;
                        break;
                    }
                }
                
                await interaction.update({
                    flags: MessageFlags.IsComponentsV2,
                    components: [newContainer]
                });
            } catch (err) {
                console.error('Error editing button:', err);
            }
        } 
    } catch (err) {
        console.error('Error creating channel:', err);
        interaction.reply({ content: 'Failed to create channel. Try to manual setup.' });
    }
}
