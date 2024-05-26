import axios from "axios";
import { EmbedBuilder } from "discord.js";
import config from "../config.json" assert { type: "json" };

export default {
    name: 'faculty-details',
    type: 3,
    description: 'Get your faculty or Teacher\'s details using email',
    options: [
        {
            type: 3,
            name: 'email',
            description: 'Enter your faculty email',
            required: true
        }//,
        // {
        //     name: '@aiub.edu'
        // }
    ],

    async execute(interaction, client) {
        try {
            const email = interaction.options.getString('email');

            const response = await axios.get(config.faculty_list);
            const profile_list = response.data.EmployeeProfileLightList;
            const profile = profile_list.find(profile => profile.CvPersonal.Email === email);

            if (profile) {
                const embed = await getFacultyDetails(profile);
                await interaction.reply( { embeds: [embed] } );
            } else {
                await interaction.reply('Faculty or Teacher you are looking for is not found.\nPlease make sure your email is correct. Do not include any space.\nExample: \`/faculty-room this_part\`');
            }
        } catch (error) {
            console.error(error);
            await interaction.reply('There was an error while executing this command!');
        }
    }
}

async function getFacultyDetails(profile) {
    // const response = await axios.get(config.faculty_url+email);
    // const dom = new JSDOM(response.data);
    // const document = dom.window.document;

    // const full_name = document.querySelector('.faculty-title').textContent.trim();
    // const room_no = document.querySelector("[x-text='profileData.PersonalOtherInfo.RoomNo']").textContent.trim();
    // const building = document.querySelector("[x-text='profileData.PersonalOtherInfo.BuildingNo']").textContent.trim();
    // const pic_url = document.querySelector('.pro-pic').src;
    // const department = document.querySelector("[x-text='profileData.HrDepartment']").textContent.trim();
    // const faculty = document.querySelector("[x-text='profileData.Faculty']").textContent.trim();
    // const position = document.querySelector("[x-text='profileData.Position']").textContent.trim();

    const full_name = profile.CvPersonal.Name;
    const room_no = profile.PersonalOtherInfo.RoomNo || 'N/A';
    const building = profile.PersonalOtherInfo.BuildingNo || 'N/A';
    const pic_url = config.url+profile.PersonalOtherInfo.SecondProfilePhoto;
    const department = profile.HrDepartment;
    const faculty = profile.Faculty;
    const position = profile.Position;
    const working_as = profile.Designation;


    const random_color = Math.floor(Math.random() * 16777215);
    try{
    const embed = new EmbedBuilder()
        .setTitle(full_name)
        .setColor(random_color)
        .setThumbnail(attachment_url)
        .addFields(
            { name: 'Faculty:', value: faculty, inline: true},
            { name: 'Designation:', value: working_as, inline: false },
            { name: 'Department:', value: department, inline: false },
            { name: 'Position:', value: position, inline: false },
            { name: 'Building:', value: building, inline: true },
            { name: 'Room No:', value: room_no, inline: true }
        );

        return embed;
    } catch (e) {
        console.error(e);
    }
}
