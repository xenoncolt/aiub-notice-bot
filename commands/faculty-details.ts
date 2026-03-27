import axios from "axios";
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
    EmbedBuilder, 
    MessageFlags,
    ModalBuilder,
    ModalSubmitInteraction,
    SectionBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    TextDisplayBuilder,
    TextInputBuilder,
    TextInputStyle
} from "discord.js";
import config from "../config.json" with { type: "json" };
import { FacultyProfile, tempFP } from "../types/FacultyProfile.js";
import path, { resolve } from "path";
import { createWriteStream, mkdirSync } from "fs";
import { Command } from "../types/Command";
import { fileURLToPath } from "url";
import { downloadImage } from "../helper/downloadImage.js";
import { getCommentsByFaculty, addComment, getUserComment, getAllCommentsByFaculty, FacultyComment } from "../schema/facultyComments.js";


export default {
    name: 'faculty-details',
    type: 3,
    description: 'Get your faculty or Teacher\'s details using either Email or Name',
    options: [
        {
            type: 3,
            name: 'name',
            description: 'Write your faculty name (ex. Shahriar Haque)',
            required: false,
            autocomplete: true
        },
        {
            type: 3,
            name: 'email',
            description: 'Write your faculty email (ex. fac@aiub.edu)',
            required: false,
            autocomplete: true
        }
    ],

    async execute(interaction: ChatInputCommandInteraction) {
        try {
            const email = interaction.options.getString('email');
            const name = interaction.options.getString('name');

            if (!email && !name) {
                return interaction.reply({ content: 'Please provide either a email or name to search.', ephemeral: true });
            }

            const response = await axios.get(config.faculty_list);
            const profile_list: FacultyProfile[] = response.data.EmployeeProfileLightList;
            // const profile = profile_list.find(profile => profile.CvPersonal.Email === email);

            let profile: FacultyProfile | undefined;

            if (name) {
                profile = profile_list.find(profile => profile.CvPersonal.Name && profile.CvPersonal.Name.toUpperCase() === name.toUpperCase());
                // console.log(profile);
            }

            if (!profile && email) {
                profile = profile_list.find(profile => profile.CvPersonal.Email && profile.CvPersonal.Email.toLowerCase() === email.toLowerCase());
                // console.log(profile);
            }
            
            // temp fix
            const res = await axios.get(config.temp_f_de);
            // console.log(res.data);
            if (res.status === 200) {
                // console.log("OK");
                const temp_pfp_list: tempFP[] = res.data;
                const temp_pfp = temp_pfp_list.find(p => p.Email === profile!.CvPersonal.Email);
                if (temp_pfp?.["Room No"]) {
                    const room_no = temp_pfp["Room No"];
                    profile!.PersonalOtherInfo.RoomNo = room_no || profile?.PersonalOtherInfo.RoomNo;
                    const first_char = room_no.charAt(0);
                    profile!.PersonalOtherInfo.BuildingNo = first_char === 'D' ? 'D - Building' :
                        ['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(first_char) ? `ANNEX - ${first_char}` :
                        'Unknown Building';
                }
            }

            if (profile) {
                const { embed, attachment } = await getFacultyDetails(profile);
                const link_btn = new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel('Details')
                            .setStyle(ButtonStyle.Link)
                            .setURL('https://www.aiub.edu/faculty-list/faculty-profile#' + profile.CvPersonal.Email),
                        new ButtonBuilder()
                            .setCustomId(`faculty-comments_${profile.CvPersonal.Email}_1`)
                            .setLabel('Comments')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('💬')
                    );
                await interaction.reply({ embeds: [embed!], components: [link_btn], files: [attachment] });
            }else {
                await interaction.reply('Faculty or Teacher you are looking for is not found.\nPlease make sure your **Name** or **Email** is correct. It will also suggest some name where you can select one. You can use either **Name** or **Email** to search.');
            }
        } catch (error) {
            console.error(error);
            await interaction.reply('There was an error while executing this command!');
        }
    },

    async autocomplete(interaction: AutocompleteInteraction) {
        const focused_option = interaction.options.getFocused(true);
        const response = await axios.get(config.faculty_list);
        const profile_list: FacultyProfile[] = response.data.EmployeeProfileLightList;

        let filtered_profiles: FacultyProfile[] = [];

        if (focused_option.name === 'name') {
            const focused_value = focused_option.value.trim().toUpperCase();
            filtered_profiles = profile_list.filter(profile => {
                const name = profile.CvPersonal.Name;
                return name && name.trim().toUpperCase().includes(focused_value);
            });
        }

        if (focused_option.name === 'email') {
            const focused_value = focused_option.value.trim().toLowerCase();
            filtered_profiles = profile_list.filter(profile => {
                const email = profile.CvPersonal.Email;
                return email && email.startsWith(focused_value);
            });
        }

        await interaction.respond(
            filtered_profiles.slice(0, 25).map(profile => ({
                name: focused_option.name === 'name' ? profile.CvPersonal.Name : profile.CvPersonal.Email,
                value: focused_option.name === 'name' ? profile.CvPersonal.Name : profile.CvPersonal.Email
            }))
        );
    },

    async buttonClick(interaction: ButtonInteraction) {
        const customId = interaction.customId;
        
        // Handle comments button: faculty-comments_email_page
        // Email might contain underscores, so we need to extract carefully
        if (customId.startsWith('faculty-comments_')) {
            const parts = customId.split('_');
            // Last part is page number, everything between first and last is email
            const page = parseInt(parts[parts.length - 1]) || 1;
            const facultyEmail = parts.slice(1, -1).join('_');
            
            await showCommentsPage(interaction, facultyEmail, page);
            return;
        }
        
        // Handle add comment button: faculty-add-comment_email
        if (customId.startsWith('faculty-add-comment_')) {
            const facultyEmail = customId.replace('faculty-add-comment_', '');
            
            const modal = new ModalBuilder()
                .setCustomId(`faculty-details-modal_${facultyEmail}`)
                .setTitle('Leave a Comment');
            
            const existingComment = await getUserComment(facultyEmail, interaction.user.id);
            
            const commentInput = new TextInputBuilder()
                .setCustomId('comment_input')
                .setLabel('Your comment (max 200 characters)')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Share your honest thoughts about this faculty...')
                .setMaxLength(200)
                .setRequired(true);
            
            if (existingComment) {
                commentInput.setValue(existingComment.comment);
            }
            
            const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(commentInput);
            modal.addComponents(actionRow);
            
            await interaction.showModal(modal);
            return;
        }
    },

    async modalSubmit(interaction: ModalSubmitInteraction) {
        const customId = interaction.customId;
        
        if (customId.startsWith('faculty-details-modal_')) {
            const facultyEmail = customId.replace('faculty-details-modal_', '');
            const comment = interaction.fields.getTextInputValue('comment_input');
            
            const success = await addComment(
                facultyEmail,
                interaction.user.id,
                interaction.user.username,
                comment
            );
            
            if (success) {
                await interaction.reply({
                    content: 'Thank you for your honest feedback! Your comment has been saved! Click the Comments button again to see it.',
                    flags: MessageFlags.Ephemeral
                });
            } else {
                await interaction.reply({
                    content: 'Failed to save your comment. Please try again.',
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    }
} as Command;

// Character limit for Discord ComponentV2 text content (leaving buffer for other UI elements)
const COMMENT_CHAR_LIMIT = 3500;

function paginateComments(comments: FacultyComment[], page: number): { pageComments: FacultyComment[], totalPages: number, currentPage: number } {
    if (comments.length === 0) {
        return { pageComments: [], totalPages: 1, currentPage: 1 };
    }
    
    // Group comments into pages based on character limit
    const pages: FacultyComment[][] = [];
    let currentPageComments: FacultyComment[] = [];
    let currentLength = 0;
    
    for (const comment of comments) {
        const commentText = `**${comment.username}**: ${comment.comment}\n`;
        
        if (currentLength + commentText.length > COMMENT_CHAR_LIMIT && currentPageComments.length > 0) {
            pages.push(currentPageComments);
            currentPageComments = [];
            currentLength = 0;
        }
        
        currentPageComments.push(comment);
        currentLength += commentText.length;
    }
    
    if (currentPageComments.length > 0) {
        pages.push(currentPageComments);
    }
    
    const totalPages = pages.length;
    const validPage = Math.max(1, Math.min(page, totalPages));
    
    return {
        pageComments: pages[validPage - 1] || [],
        totalPages,
        currentPage: validPage
    };
}

async function showCommentsPage(interaction: ButtonInteraction, facultyEmail: string, page: number) {
    const allComments = await getAllCommentsByFaculty(facultyEmail);
    const { pageComments, totalPages, currentPage } = paginateComments(allComments, page);
    
    const container = new ContainerBuilder();
    
    // Title
    const titleText = new TextDisplayBuilder()
        .setContent(`## Comments for Faculty\n-# ${facultyEmail}`);
    container.addTextDisplayComponents(titleText);
    
    container.addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    );
    
    if (allComments.length === 0) {
        const noCommentsText = new TextDisplayBuilder()
            .setContent('*No comments yet. Click the "Add Comment" button below to share your thoughts!*');
        container.addTextDisplayComponents(noCommentsText);
    } else {
        // Build comments text
        let commentsContent = '';
        for (const comment of pageComments) {
            commentsContent += `**${comment.username}**: ${comment.comment}\n`;
        }
        
        const commentsText = new TextDisplayBuilder().setContent(commentsContent.trim());
        container.addTextDisplayComponents(commentsText);
        
        // Page info
        if (totalPages > 1) {
            const pageInfo = new TextDisplayBuilder()
                .setContent(`-# Page ${currentPage} of ${totalPages} (${allComments.length} total comments)`);
            container.addTextDisplayComponents(pageInfo);
        }
    }
    
    container.addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    );
    
    // Add Comment button section
    const addCommentBtn = new ButtonBuilder()
        .setCustomId(`faculty-add-comment_${facultyEmail}`)
        .setLabel('Add Comment')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('✏️');
    
    const addCommentSection = new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('-# Share your experience'))
        .setButtonAccessory(addCommentBtn);
    
    container.addSectionComponents(addCommentSection);
    
    // Pagination buttons - only show when there are multiple pages
    if (totalPages > 1) {
        container.addSeparatorComponents(
            new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small)
        );
        
        // Add Previous button section if not on first page
        if (currentPage > 1) {
            const prevBtn = new ButtonBuilder()
                .setCustomId(`faculty-comments_${facultyEmail}_${currentPage - 1}`)
                .setLabel('Previous')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('⬅️');
            
            const prevSection = new SectionBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Go to page ${currentPage - 1}`))
                .setButtonAccessory(prevBtn);
            
            container.addSectionComponents(prevSection);
        }
        
        // Add Next button section if not on last page
        if (currentPage < totalPages) {
            const nextBtn = new ButtonBuilder()
                .setCustomId(`faculty-comments_${facultyEmail}_${currentPage + 1}`)
                .setLabel('Next')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('➡️');
            
            const nextSection = new SectionBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Go to page ${currentPage + 1}`))
                .setButtonAccessory(nextBtn);
            
            container.addSectionComponents(nextSection);
        }
    }
    
    await interaction.reply({
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        components: [container]
    });
}

async function getFacultyDetails(profile: FacultyProfile): Promise<{ embed: EmbedBuilder, attachment: AttachmentBuilder }> {
    const image_path = await downloadImage(config.url + profile.PersonalOtherInfo.SecondProfilePhoto) as string;
    // const channel = client.channels.cache.get('1244675616306102402') as TextChannel;
    const att_name = profile.CvPersonal.Name.replace(/\s+/g, '-').toLowerCase();
    const attachment = new AttachmentBuilder(image_path, { name: `${att_name}.png` });

    // const sent_msg = await channel.send({ files: [attachment] });
    // const attachment_url = sent_msg.attachments.first()?.url;

    const embed = new EmbedBuilder()
        .setTitle(profile.CvPersonal.Name)
        .setColor('Random')
        .setThumbnail(`attachment://${att_name}.png`)
        .addFields(
            { name: 'Faculty:', value: profile.Faculty || 'Unavailable', inline: true },
            { name: 'Designation:', value: profile.Designation || 'Unavailable', inline: false },
            { name: 'Department:', value: profile.HrDepartment || 'Unavailable', inline: false },
            { name: 'Position:', value: profile.Position || 'Unavailable', inline: false },
            { name: 'Building:', value: profile.PersonalOtherInfo.BuildingNo || 'Unavailable, Check D-Building Notice Board', inline: true },
            { name: 'Room No:', value: profile.PersonalOtherInfo.RoomNo || 'Unavailable, Check D-Building Notice Board', inline: true }
        )
        .setFooter({ text: "Sometimes the data may not be accurate or up to date due to the nature of the source." });

    return { embed, attachment };
}