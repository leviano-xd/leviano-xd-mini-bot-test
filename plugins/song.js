const { cmd } = require("../leviano");
const axios = require("axios");
const yts = require("yt-search");
const { fakevCard } = require("../lib/fakevCard");

const TIMEOUT = 60000;
// Set your real key here, or as the GTECH_API_KEY environment variable on Railway
const GTECH_API_KEY = process.env.GTECH_API_KEY || "https://api.nexray.eu.cc";

const isHttpUrl = (u) => typeof u === "string" && /^https?:\/\//i.test(u);

cmd({
    pattern: "song",
    alias: ["ytmp3", "play", "mp3", "gana", "music", "audio"],
    react: "🎵",
    desc: "YouTube search & MP3 play",
    category: "download",
    use: ".song <song name or link>",
    filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
    try {
        const query = args.join(" ");
        if (!query) return reply("❌ Please provide a song query or link");

        await conn.sendMessage(from, { react: { text: "⏳", key: m.key } });

        // Search YouTube for the first matching video
        const search = await yts(query);
        if (!search.videos?.length) return reply("❌ No result found");

        const video = search.videos[0];

        // Request the MP3 link for the video URL (encoded so it is sent safely)
        const apiUrl = `https://api.nexray.eu.cc/downloader/ytplay?q=${encodeURIComponent(video.url)}`;
        const { data } = await axios.get(apiUrl, { timeout: TIMEOUT });

        const dlUrl = data?.result?.download?.url;
        if (!data?.status || !isHttpUrl(dlUrl)) {
            await conn.sendMessage(from, { react: { text: "❌", key: m.key } });
            return reply("❌ Audio not generated");
        }

        const meta = data.result.metadata || {};
        const quality = data.result.download.quality || "128kbps";
        const title = meta.title || "Unknown Title";

        // Send the audio file with a preview card
        await conn.sendMessage(from, {
            audio: { url: dlUrl },
            mimetype: "audio/mpeg",
            ptt: false,
            fileName: `${title}.mp3`,
            caption: `🎵 *${title}*\n🎚️ Quality: ${quality}\n\n> © Leviano-XD`,
            contextInfo: {
                externalAdReply: {
                    title: title.substring(0, 40),
                    body: "▶︎ •၊၊||၊|။||||။‌‌‌‌‌၊|• ★彡ʟᴇᴠɪᴀɴᴏ-xᴅ-ʙᴇᴀᴛꜱ彡★",
                    thumbnailUrl: video.thumbnail,
                    sourceUrl: video.url,
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: fakevCard });

        await conn.sendMessage(from, { react: { text: "✅", key: m.key } });
    } catch (err) {
        console.error("SONG ERROR:", err.message);
        await conn.sendMessage(from, { react: { text: "❌", key: m.key } });
        reply("❌ Error found, please try later");
    }
});

cmd({
    pattern: "video1",
    alias: ["video", "vid", "ytv"],
    desc: "Download YouTube video",
    category: "downloader",
    react: "🪄",
    use: ".video1 <YouTube link or search>",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("Please provide a YouTube link or search query.\n\nExample: .video1 Pasoori");

        // Use the link directly if given, otherwise search YouTube for the first result
        let videoUrl;
        if (/youtube\.com|youtu\.be/i.test(q)) {
            videoUrl = q.trim();
        } else {
            const search = await yts(q);
            if (!search?.videos?.length) return reply("No results found.");
            videoUrl = search.videos[0].url;
        }

        const { data } = await axios.get("https://gtech-api-xtp1.onrender.com/api/video/yt", {
            params: { apikey: GTECH_API_KEY, url: videoUrl },
            timeout: TIMEOUT
        });

        if (!data?.status || !data.result?.media) return reply("Failed to fetch video.");

        // Prefer HD, fall back to SD if HD is not available
        const { video_url_hd, video_url_sd } = data.result.media;
        const dlUrl = [video_url_hd, video_url_sd].find(isHttpUrl);
        if (!dlUrl) return reply("No downloadable video found.");

        await conn.sendMessage(from, {
            video: { url: dlUrl },
            caption: "*❀༒★[ʟᴇᴠɪᴀɴᴏ-ᴍᴅ]★༒❀*"
        }, { quoted: fakevCard });
    } catch (err) {
        console.error("VIDEO1 ERROR:", err.message);
        reply("Error while fetching video.");
    }
});
