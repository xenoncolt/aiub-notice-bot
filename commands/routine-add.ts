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
import { 
    getScheduleByValues, 
    CourseSchedule, 
    searchCourses
} from "../utils/excelReader.js";
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
    name: 'routine-add',
    type: 1,
    description: 'Add a course to your routine with autocomplete',
    options: [
        {
            type: 3, // STRING
            name: 'course',
            description: 'Course name with section (e.g., "Data Structures [A]")',
            required: true,
            autocomplete: true
        }
    ],

    async execute(interaction: ChatInputCommandInteraction, _client: Client) {
        try {
            cleanupExpiredRoutines().catch(console.error);

            const userId = interaction.user.id;
            const courseValue = interaction.options.getString('course', true);

            // Parse the course value (format: "courseTitle||section")
            const [courseTitle, section] = courseValue.split('||');

            if (!courseTitle || !section) {
                await interaction.reply({
                    content: `Invalid course selection.\n\n💡 Please select a course from the autocomplete suggestions.`,
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            // Save to database
            const db = await routineDB();
            await db.run(
                'INSERT OR REPLACE INTO user_routines (user_id, course_title, section, course_value) VALUES (?, ?, ?, ?)',
                [userId, courseTitle, section, courseValue]
            );

            // Send routine response
            await sendRoutineResponse(interaction, userId, false, _client);

        } catch (error) {
            console.error('Error in routine-add command:', error);
            await interaction.reply({ 
                content: 'An error occurred. Please try again.',
                flags: MessageFlags.Ephemeral
            });
        }
    },

    async autocomplete(interaction: AutocompleteInteraction, _client: Client) {
        try {
            const query = interaction.options.getFocused();
            const results = searchCourses(query);

            await interaction.respond(
                results.map(r => ({ 
                    name: r.label.slice(0, 100), 
                    value: r.value 
                }))
            );

        } catch (error: any) {
            // Only log if it's not an "already acknowledged" error
            if (error?.code !== 40060) {
                console.error('Error in routine-add autocomplete:', error);
                try {
                    await interaction.respond([]);
                } catch {
                    // Ignore - interaction already acknowledged
                }
            }
        }
    },

    async buttonClick(interaction: ButtonInteraction, _client: Client) {
        // Re-use the same button handlers from /routine command
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
            console.error('Error in routine-add buttonClick:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: 'An error occurred. Please try again.',
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    }
} as Command;
