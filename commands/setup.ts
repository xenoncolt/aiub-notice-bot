import sqlite3 from "sqlite3";
import { Database, open } from "sqlite";
import { ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, Client, ContainerBuilder, GuildMember, MessageFlags, NewsChannel, PermissionFlagsBits, SectionBuilder, TextChannel, TextDisplayBuilder, ThumbnailBuilder } from "discord.js";
import { Command } from "../types/Command";
import { channelDB } from "../schema/aiubNews.js";

let db: Database;
(async () => {
    db = await open({
        filename: './database/channel.sqlite',
        driver: sqlite3.Database
    });
    
    await db.run(`
        CREATE TABLE IF NOT EXISTS channel (
            guild_id TEXT,
            channel_id TEXT,
            UNIQUE(guild_id, channel_id)
        )
    `);
})();

const channel_db = channelDB();

export default {
    name: 'setup',
    description: 'Setup a channel',
    options: [
        {
            name: 'notice',
            type: 1,
            description: 'Setup a channel for send new notice',
            options: [{
                name: 'channel',
                type: 7,
                description: 'Select a channel to setup',
                required: true,
            }],
        },
        {
            name: 'news',
            type: 1,
            description: 'Setup a news for send new News and Events',
            options: [{
                name: 'channel',
                type: 7,
                description: 'Select a channel to setup',
                required: true,
            }]
        }
    ],
    async execute(interaction: ChatInputCommandInteraction) {
        try {
            await interaction.deferReply();

            const sub_cmd = interaction.options.getSubcommand();
            const channel = interaction.options.getChannel('channel') as TextChannel | NewsChannel;
            const guild_id = interaction.guild?.id;
            const client = interaction.client as Client;
            const member = interaction.member as GuildMember;

            if (!channel || !guild_id || !channel.id) {
                await interaction.editReply('Invalid channel or guild.');
                return;
            }

            const permission = channel.permissionsFor(client.user!);

            if (!permission) {
                await interaction.editReply(`I don't have enough permissions to access <#${channel.id}> channel's.`)
                return;
            }

            if (sub_cmd === 'notice') {
                if (!member.permissions.has([PermissionFlagsBits.Administrator, PermissionFlagsBits.ManageChannels])) {
                    await interaction.editReply("You don't have enough permission to set up a **Notice** channel.");
                    return;
                }

                if (!(channel instanceof TextChannel) && !(channel instanceof NewsChannel)) {
                    await interaction.editReply('Channel is not a Text Channel Or Announcement Channel. Please select a text channel or announcement channel.');
                    return;
                }

                if (!permission.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageRoles])) {
                    await interaction.editReply(`I don\'t have permission to view or manage role in <#${channel.id}> channel. If you don\'t know how to give me that permission then just invite me again (Click to my profile -> Add App -> Add to server).`);
                    return;
                }

                if (permission.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles])) {
                    await channel.permissionOverwrites.create(client.user!, { SendMessages: true, EmbedLinks: true });
                    await channel.permissionOverwrites.create(channel.guild.roles.everyone, { SendMessages: false });
                }

                if ((await checkIfChannelExists('channel', channel.id))) {
                    await interaction.editReply(`You **already** set up <#${channel.id}> for notifications.`);
                    return;
                }

                await db.run('INSERT OR IGNORE INTO channel (guild_id, channel_id) VALUES (?, ?)', [guild_id, channel.id]);


                //  Success section
                const interactionContainer = new ContainerBuilder();
                const successInteractionSection = new SectionBuilder().addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`### Channel has been set! Please wait for the next notice.`)
                ).setThumbnailAccessory(
                    new ThumbnailBuilder().setURL('https://c.tenor.com/KMMqrCPegSUAAAAd/tenor.gif')
                );

                // Review section
                const reviewText = new TextDisplayBuilder().setContent(`Don't forget to review me.`);
                const reviewSection = new SectionBuilder().addTextDisplayComponents(reviewText).setButtonAccessory(
                    new ButtonBuilder()
                        .setLabel('Review')
                        .setStyle(ButtonStyle.Link)
                        .setURL('https://top.gg/bot/1123156043711651910#reviews')
                );


                interactionContainer.addSectionComponents(successInteractionSection, reviewSection);



                await interaction.editReply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [interactionContainer]
                });
                
                const text = new TextDisplayBuilder().setContent(`New Notice will be post here.\nPlease wait for that.\nDon't delete this channel. Deleting this channel means stop posting notice in this channel.\nDon't change any permission of this channel. Change when you have knowledge about channel management.`)
                const pepeAsThumbnail = new ThumbnailBuilder().setURL('https://media.tenor.com/Lf2JYGN_5L8AAAAi/pepe.gif');
                const section = new SectionBuilder().addTextDisplayComponents(text).setThumbnailAccessory(pepeAsThumbnail);
                const container = new ContainerBuilder().addSectionComponents(section);
        
                await channel.send({ 
                    flags: MessageFlags.IsComponentsV2,
                    components: [container]
                });

            } else if (sub_cmd === 'news') {
                if (!member.permissions.has([PermissionFlagsBits.Administrator, PermissionFlagsBits.ManageChannels])) {
                    await interaction.editReply("You don't have enough permission to set up **News & Events** channel.");
                    return;
                }

                if (!(channel instanceof TextChannel) && !(channel instanceof NewsChannel)) {
                    await interaction.editReply('Channel is not a Text Channel Or Announcement Channel. Please select a text channel or announcement channel.');
                    return;
                }

                if (!permission.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageRoles])) {
                    await interaction.editReply(`I don't have permission to view or manage role in ${channel.id} channel. If you don\'t know how to give me that permission then just invite me again (Click to my profile -> Add App -> Add to server).`);
                    return;
                }

                if (permission.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles])) {
                    await channel.permissionOverwrites.create(client.user!, { SendMessages: true, EmbedLinks: true });
                    await channel.permissionOverwrites.create(channel.guild.roles.everyone, { SendMessages: false });
                }

                if ((await checkIfChannelExists('aiubNewsChannel', channel.id))) {
                    await interaction.editReply(`You **already** set up <#${channel.id}> for notifications.`);
                    return;
                }

                (await channel_db).run('INSERT OR IGNORE INTO aiubNewsChannel (guild_id, channel_id) VALUES (?, ?)', guild_id, channel.id);

                // Success section
                const successInteractionSection = new SectionBuilder().addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## Channel has been set! Please wait for the next AIUB News & Events.`)
                ).setThumbnailAccessory(
                    new ThumbnailBuilder().setURL('https://c.tenor.com/KMMqrCPegSUAAAAd/tenor.gif')
                );

                // Review section
                const reviewSection = new SectionBuilder().addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`Please review me here.`)
                ).setButtonAccessory(
                    new ButtonBuilder()
                        .setLabel('Review')
                        .setStyle(ButtonStyle.Link)
                        .setURL('https://top.gg/bot/1123156043711651910#reviews')
                );

                
                const interactionContainer = new ContainerBuilder().addSectionComponents(successInteractionSection, reviewSection);

                await interaction.editReply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [interactionContainer]
                });
                

                
                const text = new TextDisplayBuilder().setContent(`New Notice will be post here.\nPlease wait for that.\nDon't delete this channel. Deleting this channel means stop posting notice in this channel.\nDon't change any permission of this channel. Change when you have knowledge about channel management.`)
                const pepeAsThumbnail = new ThumbnailBuilder().setURL('https://media.tenor.com/Lf2JYGN_5L8AAAAi/pepe.gif');
                const section = new SectionBuilder().addTextDisplayComponents(text).setThumbnailAccessory(pepeAsThumbnail);
                const container = new ContainerBuilder().addSectionComponents(section);
        
                await channel.send({ 
                    flags: MessageFlags.IsComponentsV2,
                    components: [container]
                });
            }
        } catch (error) {
            console.error('Something went wrong: ', error);
        }
    }
} as Command;

async function checkIfChannelExists(table: string, channel_id: string): Promise<boolean> {
    if (table === 'channel') {
        const exists = await db.get(`SELECT 1 FROM ${table} WHERE channel_id = ?`, [channel_id]);
        return exists ? true : false;
    } else if (table === 'aiubNewsChannel') {
        const exists = await (await channel_db).get(`SELECT 1 FROM ${table} WHERE channel_id = ?`, [channel_id]);
        return exists ? true : false;
    }
    return false;
}