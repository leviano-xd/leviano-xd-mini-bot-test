const { cmd } = require("../leviano");
const yts = require("yt-search");
const axios = require("axios");
const { fakevCard } = require('../lib/fakevCard');

const UA = "Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36";

/* YouTube video ID edukkunnu */
const getYtId = (text) => {
  const m = text.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/);
  return m ? m[1] : null;
};

/* File buffer aayi download cheyyunnu */
const getBuffer = async (url) => {
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 120000,
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    headers: { "User-Agent": UA }
  });
  return Buffer.from(res.data);
};

/* Link fail aayal adutha source try cheyyum */
const downloadAudio = async (videoUrl, firstUrl) => {
  const sources = [
    async () => firstUrl,
    async () => {
      const r = await axios.get("https://api.nexray.eu.cc/downloader/ytmp3", {
        params: { url: videoUrl }, timeout: 60000, headers: { "User-Agent": UA }
      });
      return r.data?.result?.url;
    },
    async () => {
      const r = await axios.get("https://www.neoapis.xyz/api/downloader/ytdl", {
        params: { url: videoUrl, type: "Mp3" }, timeout: 60000, headers: { "User-Agent": UA }
      });
      return r.data?.data?.download;
    }
  ];

  for (const getUrl of sources) {
    try {
      const url = await getUrl();
      if (!url) continue;
      return await getBuffer(url);
    } catch (e) {
      console.log("AUDIO SOURCE FAIL:", e.message);
    }
  }
  return null;
};

cmd({
  pattern: "song",
  alias: ["ytmp3", "play", "mp3", "gana", "music", "audio"],
  react: "🎵",
  desc: "YouTube search & MP3 play",
  category: "download",
  use: ".song <name or link>",
  filename: __filename
},
async (conn, mek, m, { from, args, reply }) => {
  try {
    const query = args.join(" ").trim();
    if (!query) return reply("❌ Please Provide Me A song Query or Link");

    await conn.sendMessage(from, { react: { text: "⏳", key: m.key } });

    let title, dlUrl, thumbnail, videoUrl;
    const id = getYtId(query);

    if (id) {
      /* 🔗 Link aanenkil: ytmp3 API */
      videoUrl = `https://youtu.be/${id}`;
      const res = await axios.get("https://api.nexray.eu.cc/downloader/ytmp3", {
        params: { url: videoUrl },
        timeout: 60000,
        headers: { "User-Agent": UA }
      });

      if (!res.data?.status || !res.data?.result?.url) {
        return reply("❌ Audio Not Generated");
      }

      title = res.data.result.title;
      dlUrl = res.data.result.url;
      thumbnail = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
    } else {
      /* 🔍 Name aanenkil: ytplay API */
      const res = await axios.get("https://api.nexray.eu.cc/downloader/ytplay", {
        params: { q: query },
        timeout: 60000,
        headers: { "User-Agent": UA }
      });

      if (!res.data?.status || !res.data?.result?.download_url) {
        return reply("❌ No result Found");
      }

      title = res.data.result.title;
      dlUrl = res.data.result.download_url;
      thumbnail = res.data.result.thumbnail;
      videoUrl = res.data.result.url;
    }

    /* ⬇️ MP3 download (fallback sources) */
    const audioBuffer = await downloadAudio(videoUrl, dlUrl);

    /* 🎵 SEND AUDIO */
    await conn.sendMessage(from, {
      audio: audioBuffer || { url: dlUrl },
      mimetype: "audio/mpeg",
      ptt: false,
      fileName: `${title || "song"}.mp3`,
      contextInfo: {
        externalAdReply: {
          title: title ? title.substring(0, 40) : "YouTube Song",
          body: "▶︎ •၊၊||၊|။||||။‌‌‌‌‌၊|• ★彡ʟᴇᴠɪᴀɴᴏ-xᴅ-ʙᴇᴀᴛꜱ彡★",
          thumbnailUrl: thumbnail,
          sourceUrl: videoUrl,
          mediaType: 1,
          renderLargerThumbnail: true
        }
      }
    }, { quoted: fakevCard });

    await conn.sendMessage(from, { react: { text: "✅", key: m.key } });

  } catch (err) {
    console.error("PLAY ERROR:", err.message, err.response?.status, err.response?.data);
    reply("❌ Error Found Please Try Later");
    await conn.sendMessage(from, { react: { text: "❌", key: m.key } });
  }
});


cmd({
  pattern: "video1",
  alias: ["vid", "ytv"],
  desc: "Download YouTube Video",
  category: "downloader",
  react: "🪄",
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) {
      return reply("Please provide a YouTube link or search query.\n\nExample: .video Pasoori");
    }

    await conn.sendMessage(from, { react: { text: "⏳", key: m.key } });

    let videoUrl;
    if (q.includes("youtube.com") || q.includes("youtu.be")) {
      videoUrl = q;
    } else {
      const search = await yts(q);
      if (!search?.videos?.length) {
        return reply("No results found.");
      }
      videoUrl = search.videos[0].url;
    }

    const res = await axios.get("https://www.neoapis.xyz/api/downloader/ytdl", {
      params: { url: videoUrl, type: "Mp4" },
      timeout: 60000,
      headers: { "User-Agent": UA }
    });

    if (!res.data?.status || !res.data?.data?.download) {
      return reply("Failed to fetch video.");
    }

    const dlUrl = res.data.data.download;

    /* Buffer aayi download cheyyan nokkum, fail aayal direct link kodukkum */
    let videoData;
    try {
      videoData = await getBuffer(dlUrl);
    } catch (e) {
      console.log("VIDEO BUFFER FAIL:", e.message);
      videoData = { url: dlUrl };
    }

    await conn.sendMessage(from, {
      video: videoData,
      mimetype: "video/mp4",
      caption: `*❀༒★[ʟᴇᴠɪᴀɴᴏ-ᴍᴅ]★༒❀*\n\n🎬 ${res.data.data.title || ""}`
    }, { quoted: fakevCard });

    await conn.sendMessage(from, { react: { text: "✅", key: m.key } });

  } catch (err) {
    console.error("VIDEO ERROR:", err.message, err.response?.status, err.response?.data);
    reply("Error while fetching video.");
  }
});
