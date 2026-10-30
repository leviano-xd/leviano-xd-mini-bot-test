const { cmd } = require('../leviano');
const { getBuffer } = require('../lib/functions');
const { spawn } = require('child_process');

const AUDIOS = [
    'https://galaxy.anuansad50.workers.dev/f/-1793084810671.galaxy-upload-1793084810583',
    'https://galaxy.anuansad50.workers.dev/f/-1793084817481.galaxy-upload-1793084817415',
    'https://galaxy.anuansad50.workers.dev/f/-1793084824776.galaxy-upload-1793084824729',
];

const IMAGES = [
    'https://galaxy.anuansad50.workers.dev/f/-1793085072726.galaxy-upload-1793085072674',
];

const TITLE = 'GALAXY-MD';
const BODY = 'ANSAD SER';
const SOURCE_URL = 'https://www.instagram.com/___ansad_';

const digits = (v) => String(v || '').split('@')[0].split(':')[0].replace(/\D/g, '');

const unwrapMessage = (message) => {
    let current = message || {};
    for (let i = 0; i < 6; i++) {
        const next = current.ephemeralMessage?.message ||
            current.viewOnceMessage?.message ||
            current.viewOnceMessageV2?.message ||
            current.viewOnceMessageV2Extension?.message ||
            current.documentWithCaptionMessage?.message;
        if (!next) break;
        current = next;
    }
    return current;
};

const getMentionedJids = (message) => {
    const msg = unwrapMessage(message);
    const contexts = [
        msg.extendedTextMessage?.contextInfo,
        msg.imageMessage?.contextInfo,
        msg.videoMessage?.contextInfo,
        msg.documentMessage?.contextInfo,
        msg.audioMessage?.contextInfo,
        msg.stickerMessage?.contextInfo,
        msg.messageContextInfo,
    ].filter(Boolean);
    return contexts.flatMap(c => Array.isArray(c.mentionedJid) ? c.mentionedJid : []);
};

const convertToVoiceNote = (inputBuffer) => new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
        '-hide_banner', '-loglevel', 'error', '-i', 'pipe:0',
        '-vn', '-c:a', 'libopus', '-application', 'voip',
        '-b:a', '32k', '-ar', '48000', '-ac', '1', '-f', 'ogg', 'pipe:1',
    ], { stdio: ['pipe', 'pipe', 'pipe'] });

    const chunks = [];
    const errors = [];
    ffmpeg.stdout.on('data', c => chunks.push(c));
    ffmpeg.stderr.on('data', c => errors.push(c));
    ffmpeg.on('error', e => reject(new Error('FFmpeg could not start: ' + e.message)));
    ffmpeg.on('close', code => {
        if (code !== 0) return reject(new Error('FFmpeg failed: ' + Buffer.concat(errors).toString().trim()));
        const out = Buffer.concat(chunks);
        if (!out.length) return reject(new Error('FFmpeg returned empty output'));
        resolve(out);
    });
    ffmpeg.stdin.on('error', e => { if (e.code !== 'EPIPE') reject(e); });
    ffmpeg.stdin.end(inputBuffer);
});

cmd({
    on: 'body'
},
async (conn, mek, m, { from, body, isGroup, botNumber, botNumber2, config }) => {
    try {
        if (!isGroup || mek.key.fromMe) return;

        // Bot numbers to match against
        const targets = [
            digits(botNumber),
            digits(botNumber2),
            digits(conn.user?.id),
            digits(conn.user?.lid),
        ].filter(Boolean);

        const mentioned = getMentionedJids(mek.message).map(digits).filter(Boolean);
        const byJid = mentioned.some(n => targets.includes(n));
        const byText = targets.some(n => String(body || '').includes('@' + n));
        if (!byJid && !byText) return;

        const audioUrl = AUDIOS[Math.floor(Math.random() * AUDIOS.length)];
        const imageUrl = IMAGES[Math.floor(Math.random() * IMAGES.length)];

        const [sourceAudio, thumbnail] = await Promise.all([
            getBuffer(audioUrl),
            getBuffer(imageUrl),
        ]);
        if (!sourceAudio || !sourceAudio.length) return;

        // Convert to voice note; if ffmpeg is missing, send the original audio
        let audio = sourceAudio;
        let mimetype = 'audio/mpeg';
        try {
            audio = await convertToVoiceNote(sourceAudio);
            mimetype = 'audio/ogg; codecs=opus';
        } catch (e) {
            console.log('[mention] ffmpeg unavailable, sending original audio:', e.message);
        }

        await conn.sendMessage(from, {
            audio,
            mimetype,
            ptt: true,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                externalAdReply: {
                    title: TITLE,
                    body: BODY,
                    mediaType: 1,
                    ...(thumbnail ? { thumbnail } : {}),
                    sourceUrl: SOURCE_URL,
                    showAdAttribution: true,
                    renderLargerThumbnail: true,
                },
            },
        }, { quoted: mek });
    } catch (e) {
        console.log('[mention] error:', e);
    }
});
