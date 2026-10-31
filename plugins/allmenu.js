const { cmd, commands } = require("../leviano");
const moment = require("moment-timezone");
const { fakevCard } = require('../lib/fakevCard');

cmd({
    pattern: "menu",
    alias: ["commandlist", "allmenu", "help"],
    desc: "Fetch and display all available bot commands",
    category: "system",
    filename: __filename,
}, async (conn, mek, m, { reply, config }) => {
    try {
        // Dynamic values (changed by .setbotname / .setbotimage)
        const botName = config?.BOT_NAME || "Leviano XD Mini";
        const botImage = config?.IMAGE_PATH || "https://levianoxd.orionbey76.workers.dev/f/Img-1793369696735.jpg";

        let totalCommands = 0;
        let grouped = {};

        // Group commands by category
        for (const cmd of commands) {
            if (!cmd.pattern || !cmd.category) continue;

            totalCommands++;
            if (!grouped[cmd.category]) grouped[cmd.category] = [];
            grouped[cmd.category].push(cmd.pattern);
        }

        let menuText = "";
        for (const cat in grouped) {
            menuText += `\n➥❮ *${cat.toUpperCase()}*\n`;
            menuText += grouped[cat].map(c => `🍒 ${c}`).join("\n") + "\n";
        }

        const time = moment().tz("Africa/Kampala").format("HH:mm:ss");
        const date = moment().tz("Africa/Kampala").format("dddd, MMMM Do YYYY");

        const caption = `
╭━━━《 *${botName}* 》━━━┈⊷
┃ ✦╭─────────────┈⊷
┃ ✦│▸ Total Commands : *${totalCommands}*
┃ ✦│▸ Time           : ${time}
┃ ✦│▸ Date           : ${date}
┃ ✦│▸ Platform       : whoismonjannick.com
┃ ✦╰─────────────┈⊷
╰━━━━━━━━━━━━┈⊷
${menuText}
`.trim();

        await conn.sendMessage(m.chat, {
            image: { url: botImage },
            caption,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                mentionedJid: [m.sender],
                forwardedNewsletterMessageInfo: {
                    newsletterJid: "120363407983133153@newsletter",
                    newsletterName: botName,
                    serverMessageId: 2,
                },
            },
        }, { quoted: fakevCard });

    } catch (err) {
        console.error("AllMenu Error:", err);
        reply("❌ Error while generating menu.");
    }
});
