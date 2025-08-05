import { ButtonBuilder, ButtonStyle, ChannelType, ContainerBuilder, EmbedBuilder, Events, Guild, MessageFlags, SectionBuilder, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder } from "discord.js";

export default {
    name: Events.GuildCreate,
    once: false,
    async execute(guild : Guild) {
        const user = await guild.client.users.fetch("709210314230726776");
        if (!user) return;

        // Auto Setup Implementation
        if (guild.channels.cache.filter(c => c.type === ChannelType.GuildAnnouncement).size < 2 || !guild.rulesChannel || guild.verificationLevel === 0) {
            const channel = guild.channels.cache.find(c => c.isTextBased() && c.isSendable());
            if (channel) {

                const container = new ContainerBuilder();
                
                const greetingTextComponent = new TextDisplayBuilder()
                    .setContent(`Hi there! Thank you for adding me to your server.`);
                
                container.addTextDisplayComponents(greetingTextComponent);

                const separator = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large);

                container.addSeparatorComponents(separator);

                const autoCompleteTextComponent = new TextDisplayBuilder().setContent(`If you **want me** to set up **notices** for you then click here ----> `);

                const autoCompleteButton = new ButtonBuilder()
                    .setLabel("Auto Setup")
                    .setStyle(ButtonStyle.Success)
                    .setCustomId('autoSetupNotice');
                
                const autoCompleteSection = new SectionBuilder().addTextDisplayComponents(autoCompleteTextComponent).setButtonAccessory(autoCompleteButton);

                container.addSectionComponents(autoCompleteSection).addSeparatorComponents(separator);

                const manualSetupTextComponent = new TextDisplayBuilder().setContent(`If you **want to** set up **notices** manually then click here ----> `);

                const manualSetupButton = new ButtonBuilder()
                    .setLabel("Manual Setup Docs")
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://github.com/xenoncolt/aiub-notice-bot/blob/main/README.md');
                
                const manualSetupSection = new SectionBuilder().addTextDisplayComponents(manualSetupTextComponent).setButtonAccessory(manualSetupButton);

                container.addSectionComponents(manualSetupSection);

                await channel.send({
                    flags: MessageFlags.IsComponentsV2,
                    components: [container],
                });
            }

        }

        const embed = new EmbedBuilder()
            .setTitle("Joined a new Server")
            .setDescription(`Guild Name: **${guild.name}**`)
            .setThumbnail(guild.iconURL())
            .setImage(guild.bannerURL())
            .setColor('Green')
            .addFields(
                {
                    name: "Guild Description",
                    value: guild.description || "No Description",
                    inline: false
                },
                {
                    name: "Guild Owner",
                    value: (await guild.fetchOwner()).user.tag || `<@${guild.ownerId}>`,
                    inline: true
                },
                {
                    name: "Guild Owner ",
                    value: (await guild.fetchOwner()).displayName,
                    inline: true
                },
                {
                    name: "Guild owner ID",
                    value: (await guild.fetchOwner()).id,
                    inline: true
                },
                {
                    name: "Guild Total Members",
                    value: guild.memberCount.toString(),
                    inline: false
                },
                {
                    name: "Guild Created",
                    value: `<t:${Math.floor(guild.createdAt.getTime() / 1000)}:R>`,
                    inline: false
                },
                {
                    name: "Guild Verification",
                    value: guild.verified ? "✅" : "❌",
                    inline: false
                }
            )
            .setTimestamp();

        user.send({ embeds: [embed] });
    }
}