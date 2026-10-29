const axios = require("axios");
const { cmd } = require('../leviano');
const { fakevCard } = require('../lib/fakevCard');

const API_URL = "https://zellrayy.com/download/instagram";
const HTTP_TIMEOUT = 30000;

const BRAND_CAPTION = `*_ɪɴsᴛᴀɢʀᴀᴍ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ_*

‎╔ஜ۩▒█ *ʟᴇᴠɪᴀɴᴏ X xᴅ* █▒۩ஜ╗
‎*|* 𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 *ʟᴇᴠɪᴀɴᴏ ꜱᴇʀ* 
‎*╰━━━━━━━━━━━━━━━━━━⊷*`;

// Finds the first Instagram link in any text and removes tracking params
function extractInstagramUrl(text) {
    if (!text) return null;
    const match = text.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/[^\s]+/i);
    if (!match) return null;
    let url = match[0];
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    return url.split("?")[0].split("#")[0].replace(/\/+$/, "") + "/";
}

// Pulls media URLs out of whichever response shape the API returns
function extractMedia(data) {
    if (!data) return [];

    if (Array.isArray(data.data)) {
        return data.data
            .filter(i => i && i.url)
            .map(i => ({ url: i.url, type: i.type === 'video' ? 'video' : 'image' }));
    }
    if (Array.isArray(data.result)) {
        return data.result
            .map(r => (typeof r === 'string' ? r : r?.url))
            .filter(Boolean)
            .map(url => ({ url, type: 'video' }));
    }
    if (Array.isArray(data.BK9)) {
        return data.BK9
            .filter(i => i && i.url)
            .map(i => ({ url: i.url, type: 'video' }));
    }
    return [];
}

// Calls the API once and returns { items, data }
async function fetchMedia(igUrl) {
    const apiUrl = `${API_URL}?url=${encodeURIComponent(igUrl)}`;
    const { data } = await axios.get(apiUrl, { timeout: HTTP_TIMEOUT });
    console.log("Instagram API response:", JSON.stringify(data).slice(0, 500));
    return { items: extractMedia(data), data };
}

cmd({
    pattern: "igdl",
    alias: ["instagram", "insta", "ig"],
    react: "⬇️",
    desc: "Download Instagram videos/reels",
    category: "downloader",
    use: ".igdl <Instagram URL>",
    filename: __filename
}, async (conn, mek, m, { from, reply, q }) => {
    try {
        const igUrl = extractInstagramUrl(q || m.quoted?.text);
        if (!igUrl) return reply("❌ Please provide/reply to an Instagram link");

        await conn.sendMessage(from, { react: { text: '⏳', key: m.key } });

        const { items } = await fetchMedia(igUrl);
        if (!items.length) {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return reply("Failed to fetch media. Invalid link or private content.");
        }

        for (const item of items) {
            await conn.sendMessage(from, {
                [item.type]: { url: item.url },
                caption: BRAND_CAPTION
            }, { quoted: fakevCard });
        }

        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });
    } catch (error) {
        console.error('IGDL Error:', error.message);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        reply("❌ Download failed. Try again later.");
    }
});

cmd({
    pattern: "igdl4",
    alias: ["instagram4", "insta4", "ig4", "igvideo4"],
    react: '📶',
    desc: "Download videos from Instagram (Alternative)",
    category: "download",
    use: ".igdl4 <Instagram URL>",
    filename: __filename
}, async (conn, mek, m, { from, reply, q }) => {
    try {
        const igUrl = extractInstagramUrl(q || m.quoted?.text);
        if (!igUrl) {
            return reply('❌ Please provide a valid Instagram URL.\n\nExample:\n.igdl4 https://instagram.com/reel/...');
        }

        await conn.sendMessage(from, { react: { text: '⏳', key: m.key } });

        const { items } = await fetchMedia(igUrl);
        if (!items.length) {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return reply('❌ Unable to fetch the video. Try .igdl2 for primary download.');
        }

        await conn.sendMessage(from, { react: { text: '📶', key: m.key } });

        const videoResponse = await axios.get(items[0].url, {
            responseType: 'arraybuffer',
            timeout: HTTP_TIMEOUT
        });

        await conn.sendMessage(from, {
            video: Buffer.from(videoResponse.data),
            caption: BRAND_CAPTION
        }, { quoted: fakevCard });

        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });
    } catch (error) {
        console.error('IGDL4 Error:', error.message);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        reply('❌ Download failed. Try .igdl for primary download.');
    }
});

cmd({
    pattern: "igdl2",
    alias: ["instagram2", "ig2", "instadl2"],
    react: '📥',
    desc: "Download reels from Instagram with metadata",
    category: "download",
    use: ".igdl2 <Instagram reel URL>",
    filename: __filename
}, async (conn, mek, m, { from, reply, q }) => {
    try {
        const igUrl = extractInstagramUrl(q || m.quoted?.text);
        if (!igUrl) {
            return reply('❌ Please provide a valid Instagram reel URL.\n\nExample:\n.igdl2 https://instagram.com/reel/...');
        }

        await conn.sendMessage(from, { react: { text: '⏳', key: m.key } });

        const { items, data } = await fetchMedia(igUrl);
        if (!items.length) {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return reply('❌ Unable to fetch the video. Please check the URL and try again.');
        }

        const metadata = data.metadata || {};
        const author = metadata.author || "Unknown";
        const caption = metadata.caption ? metadata.caption.slice(0, 300) + "..." : "No caption provided.";
        const likes = metadata.like || 0;
        const comments = metadata.comment || 0;

        await reply('ᴜᴘʟᴏᴀᴅɪɴɢ ʏᴏᴜʀ ᴠɪᴅᴇᴏ ᴡᴀɪᴛ...');

        await conn.sendMessage(from, {
            video: { url: items[0].url },
            caption: `📥 *Instagram Reel Downloader*\n👤 *Author:* ${author}\n💬 *Caption:* ${caption}\n❤️ *Likes:* ${likes} | 💭 *Comments:* ${comments}\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ☬༒ᴀʀꜱʟᴀɴ-ᴍᴅ༒☬`
        }, { quoted: fakevCard });

        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });
    } catch (error) {
        console.error('IGDL2 Error:', error.message);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        reply('❌ Failed to download the Instagram video. Please try again later.');
    }
});

cmd({
    pattern: "ig3",
    alias: ["insta3", "instagram3"],
    desc: "Download Instagram video",
    category: "downloader",
    react: "⤵️",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        const igUrl = extractInstagramUrl(q || m.quoted?.text);
        if (!igUrl) return reply("Please provide a valid Instagram video link.");

        await reply("Downloading video, please wait...");

        const apiUrl = `https://rest-lily.vercel.app/api/downloader/igdl?url=${encodeURIComponent(igUrl)}`;
        const { data } = await axios.get(apiUrl, { timeout: HTTP_TIMEOUT });

        const items = extractMedia(data);
        if (!items.length) return reply("Failed to fetch Instagram video.");

        await conn.sendMessage(from, {
            video: { url: items[0].url },
            caption: BRAND_CAPTION,
            contextInfo: { mentionedJid: [m.sender] }
        }, { quoted: fakevCard });
    } catch (e) {
        console.error("Error in ig3 command:", e.message);
        reply(`An error occurred: ${e.message}`);
    }
});
