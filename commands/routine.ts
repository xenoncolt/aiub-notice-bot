import { 
    ActionRowBuilder,
    AttachmentBuilder,
    AutocompleteInteraction,
    ButtonBuilder, 
    ButtonInteraction,
    ButtonStyle, 
    ChatInputCommandInteraction, 
    Client, 
    ContainerBuilder, 
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    MessageFlags, 
    ModalBuilder,
    ModalSubmitInteraction,
    SeparatorBuilder, 
    SeparatorSpacingSize, 
    StringSelectMenuBuilder,
    StringSelectMenuInteraction,
    TextDisplayBuilder,
    TextInputBuilder,
    TextInputStyle
} from "discord.js";
import { Command } from "../types/Command.js";
import { getScheduleByValues, CourseSchedule, findCourse, searchCourses } from "../utils/excelReader.js";
import { generateRoutineImage, generateBlankRoutineImage } from "../helper/routineImageGenerator.js";
import { routineDB, SavedCourse, cleanupExpiredRoutines } from "../schema/routineDB.js";

// Check for time clashes between courses
function checkTimeClash(schedules: CourseSchedule[]): { hasClash: boolean; clashes: string[] } {
    const clashes: string[] = [];
    
    const byDay = new Map<string, CourseSchedule[]>();
    for (const schedule of schedules) {
        if (!byDay.has(schedule.day)) {
            byDay.set(schedule.day, []);
        }
        byDay.get(schedule.day)!.push(schedule);
    }
    
    for (const [day, daySchedules] of byDay) {
        for (let i = 0; i < daySchedules.length; i++) {
            for (let j = i + 1; j < daySchedules.length; j++) {
                const a = daySchedules[i];
                const b = daySchedules[j];
                
                const parseTime = (time: string): number => {
                    const match = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
                    if (!match) return 0;
                    let hours = parseInt(match[1]);
                    const minutes = parseInt(match[2]);
                    const period = match[3].toUpperCase();
                    if (period === 'PM' && hours !== 12) hours += 12;
                    if (period === 'AM' && hours === 12) hours = 0;
                    return hours * 60 + minutes;
                };
                
                const aStart = parseTime(a.startTime);
                const aEnd = parseTime(a.endTime);
                const bStart = parseTime(b.startTime);
                const bEnd = parseTime(b.endTime);
                
                if (aStart < bEnd && aEnd > bStart) {
                    clashes.push(`**${day}:** "${a.courseTitle}" clashes with "${b.courseTitle}"`);
                }
            }
        }
    }
    
    return { hasClash: clashes.length > 0, clashes };
}

// Generate and send routine response
async function sendRoutineResponse(
    interaction: ChatInputCommandInteraction | ButtonInteraction | ModalSubmitInteraction | StringSelectMenuInteraction,
    userId: string,
    isUpdate: boolean = false, client: Client
): Promise<void> {
    const db = await routineDB();
    const savedCourses = await db.all<SavedCourse[]>(
        'SELECT * FROM user_routines WHERE user_id = ? ORDER BY course_title',
        [userId]
    );

    const container = new ContainerBuilder();
    let attachment: AttachmentBuilder;

    if (savedCourses.length === 0) {
        // No courses - show blank routine
        const imageBuffer = await generateBlankRoutineImage();
        attachment = new AttachmentBuilder(imageBuffer, { name: 'routine.png' });

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# Your Class Routine`)
        );

        container.addSeparatorComponents(
            new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
        );

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**No courses added yet!**\n\nUse the **Add Course** button below or \`/routine-add\` command to add courses.`)
        );

        container.addSeparatorComponents(
            new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
        );

        const mediaGallery = new MediaGalleryBuilder()
            .addItems(new MediaGalleryItemBuilder().setURL('attachment://routine.png'));
        container.addMediaGalleryComponents(mediaGallery);

    } else {
        // Has courses - generate routine image
        const courseValues = savedCourses.map(c => c.course_value);
        const schedules = getScheduleByValues(courseValues);

        const imageBuffer = await generateRoutineImage(schedules);
        attachment = new AttachmentBuilder(imageBuffer, { name: 'routine.png' });

        const { hasClash, clashes } = checkTimeClash(schedules);

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# Your Class Routine`)
        );

        container.addSeparatorComponents(
            new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
        );

        const courseList = savedCourses.map(c => `• ${c.course_title}`).join('\n');
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Courses (${savedCourses.length}):**\n${courseList}`)
        );

        if (hasClash) {
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`\n**Time Clashes:**\n${clashes.slice(0, 5).join('\n')}`)
            );
        }

        container.addSeparatorComponents(
            new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
        );

        const mediaGallery = new MediaGalleryBuilder()
            .addItems(new MediaGalleryItemBuilder().setURL('attachment://routine.png'));
        container.addMediaGalleryComponents(mediaGallery);

        const expiresAt = savedCourses[0]?.expires_at ? new Date(savedCourses[0].expires_at).toLocaleDateString() : 'N/A';
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`-# Expires: ${expiresAt}`)
        );
    }

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`-# Generated by AIUB Notice Bot\n-# If you face any issues, or picture is not correct, use this command to report: </report:${(await client.application?.commands.fetch())?.find(c => c.name === 'report')?.id}> `)
    );

    // Create action buttons
    const buttons: ButtonBuilder[] = [
        new ButtonBuilder()
            .setCustomId(`routine-add-${userId}`)
            .setLabel('Add Course')
            .setStyle(ButtonStyle.Primary)
    ];

    if (savedCourses.length > 0) {
        buttons.push(
            new ButtonBuilder()
                .setCustomId(`routine-remove-${userId}`)
                .setLabel('Remove Course')
                .setStyle(ButtonStyle.Danger)
        );
    }

    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);

    if (isUpdate) {
        await interaction.editReply({
            components: [container, buttonRow],
            files: [attachment],
            flags: MessageFlags.IsComponentsV2
        });
    } else {
        await (interaction as ChatInputCommandInteraction).reply({
            components: [container, buttonRow],
            files: [attachment],
            flags: MessageFlags.IsComponentsV2
        });
    }
}

export default {
    name: 'routine',
    type: 1,
    description: 'View and manage your class routine',

    async execute(interaction: ChatInputCommandInteraction, _client: Client) {
        try {
            // Clean up expired routines
            cleanupExpiredRoutines().catch(console.error);

            const userId = interaction.user.id;
            await sendRoutineResponse(interaction, userId, false, _client);

        } catch (error) {
            console.error('Error in routine command:', error);
            await interaction.reply({ 
                content: 'An error occurred. Please try again.',
                flags: MessageFlags.Ephemeral
            });
        }
    },

    async buttonClick(interaction: ButtonInteraction, _client: Client) {
        try {
            const userId = interaction.user.id;
            const customId = interaction.customId;

            if (!customId.endsWith(userId)) {
                await interaction.reply({
                    content: 'This button is not for you.',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            if (customId.startsWith('routine-add-')) {
                // Show modal to add course
                const modal = new ModalBuilder()
                    .setCustomId(`routine-add-modal-${userId}`)
                    .setTitle('Add Course');

                const nameInput = new TextInputBuilder()
                    .setCustomId('course-name')
                    .setLabel('Course Name')
                    .setPlaceholder('e.g., Introduction to Programming')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMaxLength(100);

                const sectionInput = new TextInputBuilder()
                    .setCustomId('course-section')
                    .setLabel('Section')
                    .setPlaceholder('e.g., A, B, C1, D2')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMaxLength(20);

                modal.addComponents(
                    new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput),
                    new ActionRowBuilder<TextInputBuilder>().addComponents(sectionInput)
                );

                await interaction.showModal(modal);

            } else if (customId.startsWith('routine-remove-')) {
                // Show select menu to remove courses
                const db = await routineDB();
                const savedCourses = await db.all<SavedCourse[]>(
                    'SELECT * FROM user_routines WHERE user_id = ?',
                    [userId]
                );

                if (savedCourses.length === 0) {
                    await interaction.reply({
                        content: 'No courses to remove.',
                        flags: MessageFlags.Ephemeral
                    });
                    return;
                }

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId(`routine-remove-select-${userId}`)
                    .setPlaceholder('Select courses to remove')
                    .setMinValues(1)
                    .setMaxValues(Math.min(savedCourses.length, 25))
                    .addOptions(
                        savedCourses.slice(0, 25).map(c => ({
                            label: `${c.course_title} [${c.section}]`.slice(0, 100),
                            value: c.course_value,
                            description: `Section ${c.section}`
                        }))
                    );

                const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

                await interaction.reply({
                    content: '**Select courses to remove:**',
                    components: [row],
                    flags: MessageFlags.Ephemeral
                });
            }

        } catch (error) {
            console.error('Error in routine buttonClick:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: 'An error occurred. Please try again.',
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    },

    async modalSubmit(interaction: ModalSubmitInteraction, _client: Client) {
        try {
            const userId = interaction.user.id;
            
            await interaction.deferUpdate();

            const courseName = interaction.fields.getTextInputValue('course-name').trim();
            const section = interaction.fields.getTextInputValue('course-section').trim().toUpperCase();

            // Find matching course
            let course = findCourse(courseName, section);
            
            // If not found exact, try searching
            if (!course) {
                const results = searchCourses(`${courseName} [${section}]`);
                if (results.length > 0) {
                    const exactMatch = results.find(r => 
                        r.section.toUpperCase() === section
                    );
                    course = exactMatch || results[0];
                }
            }

            if (!course) {
                await interaction.followUp({
                    content: `Could not find course: **${courseName} [${section}]**\n\n💡 Try using \`/routine-add\` with autocomplete for easier course selection.`,
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            // Save to database
            const db = await routineDB();
            await db.run(
                'INSERT OR REPLACE INTO user_routines (user_id, course_title, section, course_value) VALUES (?, ?, ?, ?)',
                [userId, course.courseTitle, course.section, course.value]
            );

            // Update the routine display
            await sendRoutineResponse(interaction, userId, true, _client);

        } catch (error) {
            console.error('Error in routine modalSubmit:', error);
            if (!interaction.replied) {
                await interaction.followUp({
                    content: 'An error occurred. Please try again.',
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    },

    async selectMenu(interaction: StringSelectMenuInteraction, _client: Client) {
        try {
            const userId = interaction.user.id;
            const customId = interaction.customId;

            if (!customId.endsWith(userId)) {
                await interaction.reply({
                    content: 'This menu is not for you.',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            await interaction.deferUpdate();

            const db = await routineDB();
            const valuesToRemove = interaction.values;

            for (const value of valuesToRemove) {
                await db.run(
                    'DELETE FROM user_routines WHERE user_id = ? AND course_value = ?',
                    [userId, value]
                );
            }

            // Delete the ephemeral message
            await interaction.deleteReply();

            // We need to update the original message - but we can't directly
            // So we'll send a follow up message with the updated routine
            await interaction.followUp({
                content: `Removed ${valuesToRemove.length} course${valuesToRemove.length > 1 ? 's' : ''}. Use \`/routine\` to see your updated routine.`,
                flags: MessageFlags.Ephemeral
            });

        } catch (error) {
            console.error('Error in routine selectMenu:', error);
        }
    }
} as Command;
