import { 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonInteraction, 
    ButtonStyle, 
    ChannelSelectMenuBuilder, 
    ChannelType, 
    ChatInputCommandInteraction, 
    Client, 
    ContainerBuilder, 
    GuildMember, 
    LabelBuilder, 
    MessageFlags, 
    ModalBuilder, 
    ModalSubmitInteraction, 
    PermissionFlagsBits, 
    RoleSelectMenuBuilder, 
    SectionBuilder, 
    TextChannel, 
    TextDisplayBuilder, 
    TextInputBuilder, 
    TextInputStyle,
    ThumbnailBuilder
} from "discord.js";
import { Command } from "../types/Command";
import { verificationDB } from "../schema/verification.js";
import { generateVerificationCode, sendVerificationEmail, validateStudentId } from "../utils/emailService.js";

export default {
    name: 'setup-verify',
    description: 'Setup a student email verification for the server',
    async execute(interaction: ChatInputCommandInteraction, _client: Client) {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
            await interaction.reply({ content: 'You don\'t have enough permission to setup student email verification.', flags: MessageFlags.Ephemeral });
            return;
        }

        // Check if already setup for this server
        const db = await verificationDB();
        const existing = await db.get('SELECT * FROM verification_config WHERE guild_id = ?', [interaction.guildId]);
        
        if (existing) {
            await interaction.reply({ 
                content: `Student verification is already set up in <#${existing.channel_id}>. Delete the verification message first to reconfigure.`, 
                flags: MessageFlags.Ephemeral 
            });
            return;
        }
        
        const modal = new ModalBuilder()
            .setCustomId('setup-verify_modal')
            .setTitle('Setup Student Email Verification')
            .addLabelComponents(
                new LabelBuilder()
                    .setLabel('Description')
                    .setDescription('Write a description so that users understand why they need to verify')
                    .setTextInputComponent(
                        new TextInputBuilder()
                            .setCustomId('setup-verify_desc')
                            .setMaxLength(1000)
                            .setRequired(false)
                            .setStyle(TextInputStyle.Paragraph)
                            .setPlaceholder('Write a description for student email verification (optional)')
                    ),
                    
                new LabelBuilder()
                    .setLabel('Verification Channel')
                    .setDescription('Select the channel where User will verify their student email')
                    .setChannelSelectMenuComponent(
                        new ChannelSelectMenuBuilder()
                            .setCustomId('setup-verify_channel')
                            .setRequired(true)
                            .setMaxValues(1)
                            .setPlaceholder('Select a channel')
                            .addChannelTypes(ChannelType.GuildText)
                    ),

                new LabelBuilder()
                    .setLabel('Role to assign')
                    .setDescription('Select the role to assign after verification')
                    .setRoleSelectMenuComponent(
                        new RoleSelectMenuBuilder()
                            .setCustomId('setup-verify_role')
                            .setRequired(true)
                            .setMaxValues(1)
                            .setPlaceholder('Select a role')
                    )
            );
        
        await interaction.showModal(modal);
    },

    async modalSubmit(interaction: ModalSubmitInteraction, _client: Client) {
        if (interaction.customId === 'setup-verify_modal') {
            await handleSetupModal(interaction, _client);
        } else if (interaction.customId === 'setup-verify_studentid_modal') {
            await handleStudentIdModal(interaction);
        } else if (interaction.customId.startsWith('setup-verify_code_modal_')) {
            await handleCodeModal(interaction);
        }
    },

    async buttonClick(interaction: ButtonInteraction, _client: Client) {
        if (interaction.customId === 'setup-verify_verify_btn') {
            await handleVerifyButton(interaction);
        }
    }
} as Command;

async function handleSetupModal(interaction: ModalSubmitInteraction, _client: Client) {
    await interaction.deferReply({ ephemeral: true });

    const description = interaction.fields.getTextInputValue('setup-verify_desc') || 'Verify your AIUB student email to access this server.';
    
    // Get selected channel and role using proper methods
    const selectedChannels = interaction.fields.getSelectedChannels('setup-verify_channel', true);
    const selectedRoles = interaction.fields.getSelectedRoles('setup-verify_role', true);
    
    const channelId = selectedChannels.first()?.id;
    const roleId = selectedRoles.first()?.id;

    if (!channelId) {
        await interaction.editReply({ content: 'Invalid channel selected.' });
        return;
    }

    const channel = interaction.guild?.channels.cache.get(channelId) as TextChannel;
    if (!channel) {
        await interaction.editReply({ content: 'Invalid channel selected.' });
        return;
    }

    if (!roleId) {
        await interaction.editReply({ content: 'Invalid role selected.' });
        return;
    }

    const role = interaction.guild?.roles.cache.get(roleId);
    if (!role) {
        await interaction.editReply({ content: 'Invalid role selected.' });
        return;
    }

    // Check bot permissions
    const botMember = interaction.guild?.members.me;
    if (!botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) {
        await interaction.editReply({ content: 'I need the `Manage Roles` permission to assign roles.' });
        return;
    }

    if (role.position >= botMember.roles.highest.position) {
        await interaction.editReply({ content: `I cannot assign the role <@&${roleId}> because it's higher than or equal to my highest role.` });
        return;
    }

    // Create the verification message with Components V2
    const container = new ContainerBuilder();
    
    const descSection = new SectionBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## 🎓 Student Verification\n\n${description}`)
        )
        .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(interaction.guild?.iconURL() || _client.user?.displayAvatarURL()!)
        );

    const infoSection = new SectionBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**How to verify:**\n1. Click the **Verify** button below\n2. Enter your AIUB student ID (e.g., 23-51730-2)\n3. Check your AIUB email for the verification code\n4. Enter the code to complete verification\n\n**Role you'll receive:** <@&${roleId}>`)
        )
        .setButtonAccessory(
            new ButtonBuilder()
                .setCustomId('setup-verify_verify_btn')
                .setLabel('Verify')
                .setStyle(ButtonStyle.Success)
        );

    container.addSectionComponents(descSection, infoSection);

    try {
        const message = await channel.send({
            flags: MessageFlags.IsComponentsV2,
            components: [container]
        });

        // Save to database
        const db = await verificationDB();
        await db.run(
            'INSERT OR REPLACE INTO verification_config (guild_id, channel_id, role_id, description, message_id) VALUES (?, ?, ?, ?, ?)',
            [interaction.guildId, channelId, roleId, description, message.id]
        );

        await interaction.editReply({ 
            content: `Student verification has been set up in <#${channelId}>!\n\nUsers will receive the <@&${roleId}> role after successful verification.` 
        });
    } catch (error) {
        console.error('Error setting up verification:', error);
        await interaction.editReply({ content: 'Failed to set up verification. Please check my permissions in the channel.' });
    }
}

async function handleVerifyButton(interaction: ButtonInteraction) {
    const db = await verificationDB();
    
    // Check if already verified
    const verified = await db.get(
        'SELECT * FROM verified_users WHERE guild_id = ? AND user_id = ?',
        [interaction.guildId, interaction.user.id]
    );
    
    if (verified) {
        await interaction.reply({ 
            content: 'You are already verified!', 
            flags: MessageFlags.Ephemeral 
        });
        return;
    }

    // Show modal to enter student ID
    const modal = new ModalBuilder()
        .setCustomId('setup-verify_studentid_modal')
        .setTitle('Student Verification')
        .addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                    .setCustomId('setup-verify_studentid')
                    .setLabel('Enter your Student ID')
                    .setPlaceholder('XX-XXXXX-X (e.g., 12-34567-2)')
                    .setStyle(TextInputStyle.Short)
                    .setMinLength(10)
                    .setMaxLength(10)
                    .setRequired(true)
            )
        );

    await interaction.showModal(modal);
}

async function handleStudentIdModal(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const studentId = interaction.fields.getTextInputValue('setup-verify_studentid').trim();

    // Validate student ID format
    if (!validateStudentId(studentId)) {
        await interaction.editReply({ 
            content: 'Invalid student ID format. Please use the format: **XX-XXXXX-X** (e.g., 12-34567-2)' 
        });
        return;
    }

    const db = await verificationDB();

    // Check if this student ID is already verified by someone else in this guild
    const existingUser = await db.get(
        'SELECT * FROM verified_users WHERE guild_id = ? AND student_id = ?',
        [interaction.guildId, studentId]
    );

    if (existingUser) {
        await interaction.editReply({ 
            content: 'This student ID is already verified by another user in this server.' 
        });
        return;
    }

    // Generate verification code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store pending verification
    await db.run(
        `INSERT OR REPLACE INTO pending_verification (guild_id, user_id, student_id, verification_code, expires_at) 
         VALUES (?, ?, ?, ?, ?)`,
        [interaction.guildId, interaction.user.id, studentId, code, expiresAt.toISOString()]
    );

    // Send email
    const emailSent = await sendVerificationEmail(studentId, code);

    if (!emailSent) {
        await interaction.editReply({ 
            content: 'Failed to send verification email. Please try again later.' 
        });
        return;
    }

    // Show modal to enter the code
    await interaction.editReply({ 
        content: `A verification code has been sent to **${studentId}@student.aiub.edu**!\n\nPlease check your email (including spam folder) and click the button below to enter your code.\n\n⏰ The code will expire in **10 minutes**.`,
        components: [
            new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId(`setup-verify_entercode_${interaction.user.id}`)
                    .setLabel('Enter Code')
                    .setStyle(ButtonStyle.Primary)
            )
        ]
    });

    // Set up collector for the Enter Code button
    const collector = interaction.channel?.createMessageComponentCollector({
        filter: (i) => i.customId === `setup-verify_entercode_${interaction.user.id}` && i.user.id === interaction.user.id,
        time: 10 * 60 * 1000, // 10 minutes
        max: 5 // Allow up to 5 attempts
    });

    collector?.on('collect', async (buttonInteraction: ButtonInteraction) => {
        const codeModal = new ModalBuilder()
            .setCustomId(`setup-verify_code_modal_${interaction.user.id}`)
            .setTitle('Enter Verification Code')
            .addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                    new TextInputBuilder()
                        .setCustomId('setup-verify_code')
                        .setLabel('Verification Code')
                        .setPlaceholder('Enter the 6-digit code from your email')
                        .setStyle(TextInputStyle.Short)
                        .setMinLength(6)
                        .setMaxLength(6)
                        .setRequired(true)
                )
            );

        await buttonInteraction.showModal(codeModal);
    });

    collector?.on('end', async () => {
        // Clean up expired verification
        await db.run(
            'DELETE FROM pending_verification WHERE guild_id = ? AND user_id = ? AND expires_at < ?',
            [interaction.guildId, interaction.user.id, new Date().toISOString()]
        );
    });
}

async function handleCodeModal(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const code = interaction.fields.getTextInputValue('setup-verify_code').trim();
    const db = await verificationDB();

    // Get pending verification
    const pending = await db.get(
        'SELECT * FROM pending_verification WHERE guild_id = ? AND user_id = ?',
        [interaction.guildId, interaction.user.id]
    );

    if (!pending) {
        await interaction.editReply({ 
            content: 'No pending verification found. Please start the verification process again.' 
        });
        return;
    }

    // Check if expired
    if (new Date(pending.expires_at) < new Date()) {
        await db.run(
            'DELETE FROM pending_verification WHERE guild_id = ? AND user_id = ?',
            [interaction.guildId, interaction.user.id]
        );
        await interaction.editReply({ 
            content: 'Your verification code has expired. Please start the verification process again.' 
        });
        return;
    }

    // Check code
    if (pending.verification_code !== code) {
        await interaction.editReply({ 
            content: 'Invalid verification code. Please try again.' 
        });
        return;
    }

    // Get config to find the role
    const config = await db.get(
        'SELECT * FROM verification_config WHERE guild_id = ?',
        [interaction.guildId]
    );

    if (!config) {
        await interaction.editReply({ 
            content: 'Verification is not configured for this server.' 
        });
        return;
    }

    // Assign role
    try {
        const member = interaction.member as GuildMember;
        await member.roles.add(config.role_id);

        // Save verified user
        await db.run(
            'INSERT INTO verified_users (guild_id, user_id, student_id) VALUES (?, ?, ?)',
            [interaction.guildId, interaction.user.id, pending.student_id]
        );

        // Delete pending verification
        await db.run(
            'DELETE FROM pending_verification WHERE guild_id = ? AND user_id = ?',
            [interaction.guildId, interaction.user.id]
        );

        await interaction.editReply({ 
            content: `**Verification successful!**\n\nYou have been verified as student **${pending.student_id}** and received the <@&${config.role_id}> role.` 
        });
    } catch (error) {
        console.error('Error assigning role:', error);
        await interaction.editReply({ 
            content: 'Failed to assign role. Please contact a server administrator.' 
        });
    }
}