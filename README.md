# About AUIB Notice Bot

AUIB Notice Bot is a Discord bot that sends the latest notice from the [AUIB Website](https://www.aiub.edu) to a specified channel. The bot is written in TypeScript using the [Discord.js](https://discord.js.org) library. 

# Features
- [x] Auto send new notice
- [x] Embed Message
- [x] Slash Commands : Bot information, Search notice
- [x] Setup and Reset Channel
- [x] DM notice setup
- [x] Details Buttons
- [ ] News & Events
- [x] Show new notice on status
- [ ] Academic Calender
- [x] Faculty list : Room Number, Biography

# Installation
- Clone the repository
- Install the dependencies using `npm install`
- Rename the `example.env` file to `.env` and `example.config.json` to `config.json` and fill in the required values
- Run the bot using `npm run dev` for development
- Or `npm run build` and `npm run start` for production

# Configuration
- `BOT_TOKEN` : The token of the bot that you get from the [Discord Developer Portal](https://discord.com/developers/applications)
- `GUILD_ID` : The ID of the server where the bot will be used [Optional]


# How to use
If you don't want to host the bot yourself, you can use the hosted version of the bot.
- Add the bot to your server
- Set the channel where you want to get the notice
- Done!
Easy-psy Right!! 

For that you have to [Invite the bot](https://discord.com/oauth2/authorize?client_id=1123156043711651910&permissions=551903538257&scope=applications.commands%20bot)