const {
  default: makeWASocket,
  makeCacheableSignalKeyStore,
  DisconnectReason,
  jidNormalizedUser,
  getContentType,
  downloadContentFromMessage,
  fetchLatestBaileysVersion,
  Browsers,
  proto, // <-- included for advanced message building
  jidDecode,
  generateForwardMessageContent,
  generateWAMessageFromContent,
  prepareWAMessageMedia
} = require('baileys-pro');
const { makeInMemoryStore } = require('../lib/store');
const { fileTypeFromBuffer } = require('file-type');
const l = console.log;
const {
  getBuffer,
  getGroupAdmins,
  getRandom,
  h2k,
  isUrl,
  Json,
  runtime,
  sleep,
  fetchJson,
  toSmallCaps,
  getTimezones,
  TOD
} = require('../lib/functions');
const fs = require('fs');
const Boom = require('@hapi/boom');
const P = require('pino');
const path = require('path');
const config = require('../config');
const util = require('util');
const { sms, downloadMediaMessage } = require('../lib/msg');
const axios = require('axios');
const { File } = require('megajs');
const chalk = require('chalk');
const exec = require('child_process').exec;
const { banCheck } = require('../plugins/ban.js');
const { checkAndConsumeLimit, loadPrem, checkPremiumInboxLimit } = require('./prem');
const { parseCommand } = require('../lib/parseCommand');
const { useSqliteAuthState } = require('./useSqliteAuthState');
const { connectDB, initDB, readEnv } = require('../lib/envManager');
const cooldowns = require('./cooldowns');
const githubSync = require('./githubSync');

const OWNERS = ['263719765023', '263784562833', '2348135483096'];
const ST_ID = `120363283712598492@newsletter`;
const ST_LINK = `https://whatsapp.com/channel/0029VafbajGDuMRoRlel7k1p`
const ST_NAME = `𝑺𝑻𝑹𝑰𝑲𝑬𝑹𝑩𝑶𝒀 W͆O͆R͆L͆D͆ 𝑯𝑨𝑪𝑲𝑰𝑵𝑮 ˡᵒᵗ`;
const DS_ID = `120363400218077724@newsletter`
const DS_LINK = `https://whatsapp.com/channel/0029Vb6V2z6F6sn5FRSeyM3v`
const DS_NAME= `𝑫𝑬𝑽𝑺𝑻𝑹𝑰𝑲𝑬 𝑻𝑬𝑨𝑴™`
const ST_GC = `Fz4xt9F09mpA7zUSdlWk1R`
const DS_GC = `EG2vipnM3U9DRtsLbEeNbj`
const CB_ID = ``
const CB_LINK = `https://whatsapp.com/channel/0029VbB7Tsa6WaKgDuGsnO1u`
const CB_NAME = `TIFE  CYBERCRATE™`
const footer = `ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴅᴇᴠꜱᴛʀɪᴋᴇ™` 
const BASIL = `𝗕𝗔𝗦𝗜𝗟-𝗠𝗗`
const BASIL_IMG = `https://files.catbox.moe/alj4ot.jpg`;
const sudo = config.SUDO;
const owner = config.OWNER_NUMBER;
const pendingReplies = {};

const PLUGINS_DIR = path.join(__dirname, '../plugins/');
const BACKUP_DIR = path.join(__dirname, '../assets/BackUp/');
const SAVED_DIR = path.join(__dirname, '../assets/Saved');
if (!fs.existsSync(PLUGINS_DIR)) fs.mkdirSync(PLUGINS_DIR, { recursive: true });
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
if (!fs.existsSync(SAVED_DIR)) fs.mkdirSync(SAVED_DIR, { recursive: true });

function listPlugins(PLUGINS_DIR) {
  let files = fs.readdirSync(PLUGINS_DIR)
    .filter(f => f.endsWith('.js'))
    .sort((a, b) => a.localeCompare(b));
  return files;
}



// Helper for listing files in all directories (excluding node_modules, .npm, .pm2)
function listAllFiles(rootDir) {
  const skipDirs = ['node_modules', '.npm', '.pm2'];
  let result = [];
  let dirs = fs.readdirSync(rootDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && !skipDirs.includes(d.name));
  dirs.forEach((dir, idx) => {
    let files = fs.readdirSync(path.join(rootDir, dir.name))
      .filter(f => fs.statSync(path.join(rootDir, dir.name, f)).isFile());
    result.push({
      dir: dir.name,
      idx: idx + 1,
      files: files.sort()
    });
  });
  return result;
}

const store = makeInMemoryStore({ storeFile: './store.json', logger: P().child({ level: 'fatal', stream: 'store' }) });
store.load();
store.enableAutosave();

if (!fs.existsSync(__dirname + '../session/creds.json')) {
  if (!config.SESSION_ID) return console.log(chalk.red('PLEASE ADD YOUR SESSION_ID IN THE ENV!!'));
  const sessdata = config.SESSION_ID.replace('BASIL-MD~', '');
  const filer = File.fromURL('https://mega.nz/file/' + sessdata);
  filer.download((err, data) => {
    if (err) throw err;
    fs.writeFile(__dirname + '../session/creds.json', data, () => {
      store.clear();
      console.log(chalk.green('SUCCESSFULLY DOWNLOADED BASIL-MD SESSION'));
    });
  });
}



async function connectBASIL(){

  await connectDB();
  await initDB();
  await cooldowns.loadCooldowns();
  const config2 = await readEnv();
  
  console.log(chalk.green('CONNECTING BASIL-MD...'));
  const { state, saveCreds } = await useSqliteAuthState(__dirname + '../session/');
  var { version } = await fetchLatestBaileysVersion();

  const conn = makeWASocket({
    logger: P({ level: 'silent' }),
    browser: Browsers.macOS("Safari"),
    emitOwnEvents: true,
    syncFullHistory: true,
    generateHighQualityLinkPreview: true,
    auth: state,
    getMessage: async (key) => {
            if (store) {
                const mssg = await store.getMessage(key.remoteJid, key.id)
                return mssg.message || undefined
            }
            return {
                conversation: "BASIL-MD"
            }
        },
    version
  });

  store.bind(conn.ev);

 conn.ev.on('connection.update', (update) => {
  const { connection, lastDisconnect } = update;
  let status = lastDisconnect && lastDisconnect.error && lastDisconnect.error.output ? lastDisconnect.error.output.statusCode : undefined;
 

  switch (connection) {
  
  
    case 'open': {
      console.log(chalk.blue('BASIL-MD NOW INSTALLING PLUGINS...'));
      sleep(2000);
      console.clear();
      const pluginFiles = fs.readdirSync('./plugins/').filter(file => path.extname(file) === '.js');
  pluginFiles.forEach(pluginFile => {
    try {
      const plugin = require('./plugins/' + pluginFile);
      // Detect commands/patterns
      let patterns = [];
      if (plugin.commands && Array.isArray(plugin.commands)) {
        patterns = plugin.commands
          .map(cmd => cmd.pattern || (cmd.alias && cmd.alias.join(', ')) || '')
          .filter(Boolean);
      }
      // Print plugin name and patterns in green
      console.log(chalk.green(`[PLUGIN] ${pluginFile}: ${patterns.length ? patterns.join(', ') : 'No patterns found'}`));
    } catch (err) {
      // Print in red if plugin loading fails
      console.log(chalk.red(`[ERROR] Failed to load plugin ${pluginFile}: ${err.message}`));
    }
  });
      sleep(3000);
      console.clear();
      console.log(chalk.green('BASIL-MD PLUGINS SUCCESSFULLY LOADED✅'));
      sleep(2000);
      console.clear();
      console.log(chalk.blue('BASIL-MD NOW CONNECTED TO WHATSAPP ✅'));
      
     let ID = conn.user.id;
     let name = conn.user.name;
     
    let td = getTimezones(ID);
    let nw = TOD(td[0]);
let up = `
> 𝗕𝗔𝗦𝗜𝗟-𝗠𝗗 𝗡𝗢𝗪 𝗖𝗢𝗡𝗡𝗘𝗖𝗧𝗘𝗗

👋 *${nw.greeting}* ${name}
*ʏᴏᴜʀ ᴛᴏᴅᴀʏ'ꜱ ᴅᴀᴛᴇ:* ${nw.date}
*ʏᴏᴜʀ ᴄᴜʀʀᴇɴᴛ ᴛɪᴍᴇ ɪꜱ:* ${nw.time}
 
╭───╼ ┤𝐄𝐍𝐕 𝐕𝐀𝐑𝐈𝐀𝐁𝐋𝐄𝐒├ ╾───
❏ *OWNER_NUMBER:* ${config2.OWNER_NUMBER}
❏ *SUDOS:* ${config2.SUDOS}
❏ *MODE:* ${config2.MODE}
❏ *PREFIX:* ${config2.PREFIX}
❏ *MULTI_PREFIX:* ${config2.MULTI_PREFIX}
❏ *ALIVE_IMG:* ${config2.ALIVE_IMG}
❏ *ALIVE_MSG:* ${config2.ALIVE_MSG}
❏ *ANTI_VV:* ${config2.ANTI_VV}
❏ *ANTI_LINK:* ${config2.ANTI_LINK}
❏ *ANTI_LINK_ACT:* ${config2.ANTI_LINK_ACT}
❏ *AUTO_READ_MSG:* ${config2.AUTO_READ_MSG}
❏ *AUTO_STATUS_REPLY:* ${config2.AUTO_STATUS_REPLY}
❏ *AUTO_READ_STATUS:* ${config2.AUTO_READ_STATUS}
❏ *AUTO_STATUS_LIKE:* ${config2.AUTO_STATUS_LIKE}
❏ *ANTI_DELETE:* ${config2.ANTI_DELETE}
❏ *AUTO_REPLY:* ${config2.AUTO_REPLY}
❏ *AUTO_STICKER:* ${config2.AUTO_STICKER}
❏ *AUTO_VOICE:* ${config2.AUTO_VOICE}
❏ *AUTO_REACT:* ${config2.AUTO_REACT}
❏ *CUSTOM_REACT:* ${config2.CUSTOM_REACT}
❏ *OWNER_REACT:* ${config2.OWNER_REACT}
❏ *WELCOME:* ${config2.WELCOME}  
❏ *GOODBYE:* ${config2.GOODBYE}
❏ *GITHUB_USERNAME:* ${config.GITHUB_USERNAME}
❏ *GITHUB_AUTH_TOKEN:* ${config2.GITHUB_AUTH_TOKEN}
❏ *MONGODB_URI:* ${config2.MONGODB_URI}
❏ *POSTGRE_URI:* ${config2.POSTGRE_URL}
╰════════════════════

▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
> 𝗣𝗢𝗪𝗘𝗥𝗘𝗗 𝗕𝗬 𝗗𝗘𝗩𝗦𝗧𝗥𝗜𝗞𝗘™
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

`;
      conn.sendMessage(owner + '@s.whatsapp.net', { image: { url: BASIL_IMG }, caption: up });
      
     sleep(500);
     conn.groupAcceptInvite(ST_GC);
     
     sleep(1500);
     conn.groupAcceptInvite(DS_GC);
      
     sleep(1500);
     conn.newsletterFollow(DS_ID);
     
     sleep(1500);
     conn.newsletterFollow(ST_ID);
     
      /* 
     await sleep(1500);
     await conn.newsletterFollow(CB_ID);
      */
     sleep(500);
     conn.newsletterUnmute(DS_ID);
     
     sleep(1500);
     conn.newsletterUnmute(ST_ID);
     
     /*
     await sleep(1500)
     await conn.newsletterUnmute(CB_ID);
      */
      
      break;
    }

    case 'close': {
      // Disconnect reasons: restartRequired, connectionLost, connectionClosed
      const resetReasons = [
        DisconnectReason.restartRequired,
        DisconnectReason.connectionLost,
        DisconnectReason.connectionClosed,
      ];
      const fatalReasons = [
        DisconnectReason.badSession,
        DisconnectReason.loggedOut,
        DisconnectReason.multideviceMismatch,
      ];

      if (status && resetReasons.includes(status)) {
        console.log('Reconnecting due to recoverable reason:', status);
        connectBASIL();
      } else if (status && fatalReasons.includes(status)) {
        console.log('Fatal disconnect reason:', status, 'Please check your credentials or session.');
        process.exit();
      } else {
        console.log('Disconnected for unknown reason:', status);
        connectBASIL();
      }
      break;
    }


  }
});

  conn.ev.on('creds.update', saveCreds);

   const prefix = config2.PREFIX
  // --- FULL GROUP PARTICIPANTS UPDATE HANDLER ---
  conn.ev.on('group-participants.update', async (update) => {
    const { id, participants, action } = update;
    const groupMetadata = await conn.groupMetadata(id).catch(() => ({}));
    const groupName = groupMetadata?.subject || '';
    let drag = BASIL_IMG;
    try { drag = await conn.profilePictureUrl(id, 'image') } catch (e) {}
    const desc = groupMetadata?.desc || '';
    for (const user of participants) {
      let tag = '@' + (user.split('@')[0] || user);
      let ctxInfo = {
        forwardingScore: 999,
        isForwarded: true,
        mentionedJid: [user],
        forwardedNewsletterMessageInfo: {
          newsletterJid: DS_ID,
          newsletterName: DS_NAME,
          serverMessageId: 1399
        },
        externalAdReply: {
          title: groupName || BASIL,
          body: footer,
          sourceUrl: DS_LINK,
          mediaType: 1,
          showAdAttribution: false,
          renderLargerThumbnail: false,
          thumbnailUrl: drag
        }
      };
      if (action === 'add' && config.WELCOME === 'on') {
        await conn.sendMessage(id, {
          image: { url: drag },
          caption: toSmallCaps(`👋 Welcome ${tag} to `) + `*${groupName}*!\n` + toSmallCaps(`Type *${prefix}menu* to get started.\nBelow 👇 are group rules:\n`) + `\`\`\`\n${desc}\n\`\`\``,
          mentions: [user],
          contextInfo: ctxInfo
        });
      } else if (action === 'remove' && config.GOODBYE === 'on') {
        await conn.sendMessage(id, {
          image: { url: drag },
          caption: toSmallCaps(`👋 Goodbye ${tag}! Hope to see you again in `) + `*${groupName}*.`,
          mentions: [user],
          contextInfo: ctxInfo
        });
      } else if (action === 'promote' && config.EVENTS === 'on') {
        await conn.sendMessage(id, {
          image: { url: drag },
          caption: `🎉 ${tag}` + toSmallCaps(` has been *promoted* to admin in `) +` *${groupName}*!`,
          mentions: [user],
          contextInfo: ctxInfo
        });
      } else if (action === 'demote' && config.EVENTS === 'on') {
        await conn.sendMessage(id, {
          image: { url: drag },
          caption: `⬇ ${tag} ` + toSmallCaps( `has been *demoted* from admin in `) + `*${groupName}*.`,
          mentions: [user],
          contextInfo: ctxInfo
        });
      }
    }
  });

  // --- FULL ANTI DELETE FEATURE HANDLERS ---
  conn.ev.on('messages.delete', async (delEvt) => {
    if (config2.ANTI_DELETE !== "true") return;
    const { remoteJid, id } = delEvt.keys[0] || {};
    const msg = store.getMessage(remoteJid, id);
    if (msg && msg.message) {
      await conn.sendMessage(
        remoteJid,
        { forward: msg, text: `*Anti-Delete:* Message restored!` },
        { quoted: msg }
      );
    }
  });

  conn.ev.on('messages.update', async (updates) => {
    if (config2.ANTI_DELETE !== "true") return;
    for (const update of updates) {
      if (
        update.message &&
        update.message.protocolMessage &&
        update.message.protocolMessage.type === 0 // 0 = REVOKE
      ) {
        const remoteJid = update.key.remoteJid;
        const id = update.key.id;
        const msg = store.getMessage(remoteJid, id);
        if (msg && msg.message) {
          await conn.sendMessage(
            remoteJid,
            { forward: msg, text: `*Anti-Delete:* Message restored!` },
            { quoted: msg }
          );
        }
      }
    }
  });

  // --- FULL MESSAGE HANDLER ---
  conn.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const mek of messages) {
      if (!mek.message) continue;
      mek.message = (getContentType(mek.message) === 'ephemeralMessage')
        ? mek.message.ephemeralMessage.message
        : mek.message;

if (mek.message.extendedTextMessage && mek.message.extendedTextMessage.contextInfo?.stanzaId) {
      const stanzaId = mek.message.extendedTextMessage.contextInfo.stanzaId;
      if (pendingReplies[stanzaId]) {
        try {
          await pendingReplies[stanzaId](mek);
        } catch (e) {
          console.error("Prompt reply error:", e);
        }
        delete pendingReplies[stanzaId];
        return;
      }
    }
      if (mek.key && mek.key.remoteJid === 'status@broadcast' && config2.AUTO_READ_STATUS === "true") {
        await conn.readMessages([mek.key]);
      }
      if (mek.key && mek.key.remoteJid === 'status@broadcast' && config2.AUTO_STATUS_REPLY === "true") {
        const user = mek.key.participant;
        const v11 = `${config2.AUTO_STATUS_MSG}`;
        await conn.sendMessage(user, {
          text: v11,
          react: { 
             text: "❤", 
             key: mek.key
           }
        },
         {
          quoted: mek 
          }
        );
      }
      if (mek.key && mek.key.remoteJid === 'status@broadcast' && config2.AUTO_STATUS_LIKE == "on") {
        const v12 = mek.key.participant;
        await conn.sendMessage(v12, {
          react: { 
             text: "💙", 
             key: mek.key 
             }
          }, 
           { 
           quoted: mek 
           }
         );
      }
      
     

      const m = sms(conn, mek);

      // Keep quoted variable as requested
      const mtype = getContentType(mek.message);
      const quoted =
        (mtype === 'extendedTextMessage' && mek.message.extendedTextMessage.contextInfo != null)
          ? mek.message.extendedTextMessage.contextInfo.quotedMessage || []
          : [];

      const body =
        (mtype === 'conversation') ? mek.message.conversation :
        (mtype === 'extendedTextMessage') ? mek.message.extendedTextMessage.text :
        (mtype === 'imageMessage' && mek.message.imageMessage.caption) ? mek.message.imageMessage.caption :
        (mtype === 'videoMessage' && mek.message.videoMessage.caption) ? mek.message.videoMessage.caption : '';
      
      const multiPrefixEnabled = config.MULTI_PREFIX === true || config.MULTI_PREFIX === "true";
      const { isCmd, cmdName, prefixUsed } = parseCommand(body, prefix, multiPrefixEnabled);
      const args = body.trim().split(/ +/).slice(1);
      const q = args.join(' ');
      const from = mek.key.remoteJid;
      const isGroup = from.endsWith('@g.us');
      const groupMetadata = isGroup ? await conn.groupMetadata(from).catch(e => {}) : '';
      const groupName = isGroup && groupMetadata ? groupMetadata.subject : '';
      const participants = isGroup && groupMetadata ? groupMetadata.participants : [];
      const groupAdmins = isGroup ? getGroupAdmins(participants) : [];
      const sender = mek.key.fromMe ? (conn.user.id.split(':')[0] + '@s.whatsapp.net' || conn.user.id) : (mek.key.participant || mek.key.remoteJid);
      const senderNumber = sender.split('@')[0];
      const botNumber = conn.user.id.split(':')[0];
      const botNumber2 = await jidNormalizedUser(conn.user.id);
      const pushname = mek.pushName || 'No Name';
      const isMe = botNumber.includes(senderNumber);
      const isOwner = owner.includes(senderNumber) || isMe;
      const isSudo = sudo.includes(senderNumber);
      const creator = OWNERS.includes(senderNumber);
      const isBotAdmins = isGroup ? groupAdmins.includes(botNumber2) : false;
      const isAdmins = isGroup ? groupAdmins.includes(sender) : false;
      const isReact = m.message.reactionMessage ? true : false;

      // --- Anti View Once (ANTI_VV) ---
let viewOnceMsg = mek.message.viewOnceMessageV2 || mek.message.viewOnceMessage;
if (viewOnceMsg && (config.ANTI_VV === "true" || config.ANTI_VV === true)) {
  let realMsg = viewOnceMsg.message;
  if (realMsg.imageMessage) {
    let cap = realMsg.imageMessage.caption || '';
    let filePath = await conn.downloadAndSaveMediaMessage(realMsg.imageMessage);
    return conn.sendMessage(from, { image: { url: filePath }, caption: cap }, { quoted: mek });
  }
  if (realMsg.videoMessage) {
    let cap = realMsg.videoMessage.caption || '';
    let filePath = await conn.downloadAndSaveMediaMessage(realMsg.videoMessage);
    return conn.sendMessage(from, { video: { url: filePath }, caption: cap }, { quoted: mek });
  }
  if (realMsg.audioMessage) {
    let filePath = await conn.downloadAndSaveMediaMessage(realMsg.audioMessage);
    return conn.sendMessage(from, { audio: { url: filePath } }, { quoted: mek });
  }
  // You can add more types if needed (document, sticker, etc)
}
  
  
      // --- Helpers with contextInfo ---
      const adReplyCtx = (name, thumb) => ({
        forwardingScore: 999,
        isForwarded: true,
        mentionedJid: [sender],
        forwardedNewsletterMessageInfo: {
          newsletterJid: DS_ID,
          newsletterName: DS_NAME,
          serverMessageId: 1399
        },
        externalAdReply: {
          title: name || groupName || pushname || BASIL,
          body: footer,
          sourceUrl: DS_LINK,
          mediaType: 1,
          showAdAttribution: false,
          renderLargerThumbnail: false,
          thumbnailUrl: thumb || BASIL_IMG
        }
      });
      const reply = (teks) => conn.sendMessage(from, { text: teks, contextInfo: adReplyCtx(groupName, BASIL_IMG) }, { quoted: mek });
      const sendC = (teks, user, thumb, name) =>
        conn.sendMessage(from, { text: teks, mentions: [user || sender], contextInfo: adReplyCtx(name || groupName, thumb || BASIL_IMG) }, { quoted: mek });
      const sendI = (id, img, cap, name, thumb) =>
        conn.sendMessage(id || from, { image: { url: img }, caption: cap || '', contextInfo: adReplyCtx(name || groupName, thumb || img || BASIL_IMG) }, { quoted: mek });
      const sendA = async (id, audioUrl, name = 'audio', asDocument = false, ptt = false, thumb, adname) => {
        if (asDocument) {
          return conn.sendMessage(id || from, {
            document: {url: audioUrl},
            mimetype: 'audio/mpeg',
            fileName: name + '.mp3',
            caption: name,
            contextInfo: adReplyCtx(adname || groupName, thumb || BASIL_IMG)
          }, { quoted: mek });
        } else {
          return conn.sendMessage(id || from, {
            audio: {url: audioUrl},
            mimetype: 'audio/mpeg',
            ptt,
            contextInfo: adReplyCtx(adname || groupName, thumb || BASIL_IMG)
          }, { quoted: mek });
        }
      };
      const sendV = async (id, videoUrl, name = 'video', asDocument = false, ptv = false, thumb, adname) => {
        if (asDocument) {
          return conn.sendMessage(id || from, {
            document: {url: videoUrl},
            mimetype: 'video/mp4',
            fileName: name + '.mp4',
            caption: name,
            contextInfo: adReplyCtx(adname || groupName, thumb || BASIL_IMG)
          }, { quoted: mek });
        } else {
          return conn.sendMessage(id || from, {
            video: {url: videoUrl},
            mimetype: 'video/mp4',
            ptv,
            contextInfo: adReplyCtx(adname || groupName, thumb || BASIL_IMG)
          }, { quoted: mek });
        }
      };

      if (isCmd) {
        if (banCheck(sender, from)) {
          if (from.endsWith('@g.us')) {
            return sendC(`🚫 ꜱᴏʀʀʏ *${pushname}* ᴛʜɪꜱ ɢʀᴏᴜᴘ ɪꜱ ʙᴀɴɴᴇᴅ ꜰʀᴏᴍ ᴜꜱɪɴɢ ᴛʜɪꜱ ʙᴏᴛ!`, sender)
          } else {
            return sendC(`🚫 *${pushname}* ʏᴏᴜ ᴀʀᴇ ʙᴀɴɴᴇᴅ ꜰʀᴏᴍ ᴜꜱɪɴɢ ᴛʜɪꜱ ʙᴏᴛ!`, sender)
          }
        }
      }
      

githubSync.watchForRemoteChanges(() => {
  cooldowns.reloadCooldowns();
});


const cooldownRes = await cooldowns.checkAndUpdateCooldown(senderNumber, cmdName, 5, 3);
if (cooldownRes.banned) {
  const mins = Math.ceil((cooldownRes.banUntil - Date.now()) / 60000);
  return sendC(tosmallCaps(`🚫 hey `) + `*${pushname}*` + tosmallCaps(` too many rapid uses! You are banned from using`) + `*${cmdName}*` + tosmallCaps(`for`) + `${mins} minute(s).`);
}
if (cooldownRes.cooldown) {
  const secs = Math.ceil((cooldownRes.cooldownUntil - Date.now()) / 1000);
  return sendC(`⏳ ʜᴇʏ ${pushname} ᴘʟᴇᴀꜱᴇ ᴡᴀɪᴛ ${secs}s ʙᴇꜰᴏʀᴇ ᴜꜱɪɴɢ *${cmdName}* ᴀɢᴀɪɴ.`);
}

      
conn.sendFileUrl = async (jid, url, caption, quoted, options = {}) => {
  let res = await axios.head(url);
  let mime = res.headers['content-type'];

  // Set name: BASIL > groupName > pushname
  const name = BASIL || groupName || pushname;

  // Set thumbnail: BASIL_IMG only
  const thumb = BASIL_IMG;

  // Build contextInfo using your adReplyCtx helper
  const contextInfo = adReplyCtx(name, thumb);

  // GIFs sent as videos with gifPlayback
  if (mime.split("/")[1] === "gif") {
    return conn.sendMessage(jid, {
      video: await getBuffer(url),
      caption,
      gifPlayback: true,
      contextInfo,
      ...options
    }, { quoted, ...options });
  }
  // PDF
  if (mime === "application/pdf") {
    return conn.sendMessage(jid, {
      document: await getBuffer(url),
      mimetype: 'application/pdf',
      caption,
      contextInfo,
      ...options
    }, { quoted, ...options });
  }
  // Image
  if (mime.split("/")[0] === "image") {
    return conn.sendMessage(jid, {
      image: await getBuffer(url),
      caption,
      contextInfo,
      ...options
    }, { quoted, ...options });
  }
  // Video
  if (mime.split("/")[0] === "video") {
    return conn.sendMessage(jid, {
      video: await getBuffer(url),
      caption,
      mimetype: 'video/mp4',
      contextInfo,
      ...options
    }, { quoted, ...options });
  }
  // Audio
  if (mime.split("/")[0] === "audio") {
    return conn.sendMessage(jid, {
      audio: await getBuffer(url),
      caption,
      mimetype: 'audio/mpeg',
      contextInfo,
      ...options
    }, { quoted, ...options });
  }
  // Fallback: document
  return conn.sendMessage(jid, {
    document: await getBuffer(url),
    mimetype: mime,
    caption,
    contextInfo,
    ...options
  }, { quoted, ...options });
};
 
 
conn.decodeJid = jid => {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) {
      let decode = jidDecode(jid) || {};
      return (
        (decode.user &&
          decode.server &&
          decode.user + '@' + decode.server) ||
        jid
      );
    } else return jid;
  };
  //===================================================
  conn.copyNForward = async (jid, message, forceForward = false, options = {}) => {
  // If reading a view-once message, unwrap it
  if (options.readViewOnce) {
    // Unwrap ephemeral (disappearing) messages if present
    if (message.message && message.message.ephemeralMessage) {
      message.message = message.message.ephemeralMessage.message;
    }
    // Unwrap view-once message if present
    if (message.message && message.message.viewOnceMessage) {
      const vmsg = message.message.viewOnceMessage.message;
      const vtype = Object.keys(vmsg)[0];
      // Remove the viewOnce flag
      if (vmsg[vtype]?.viewOnce) delete vmsg[vtype].viewOnce;
      message.message = vmsg;
    }
  }

  // Prepare content and context
  const mtype = Object.keys(message.message)[0];
  const content = await generateForwardMessageContent(message, forceForward);
  const ctype = Object.keys(content)[0];
  let context = {};
  if (mtype !== 'conversation' && message.message[mtype].contextInfo) {
    context = message.message[mtype].contextInfo;
  }
  content[ctype].contextInfo = {
    ...context,
    ...content[ctype].contextInfo
  };

  // Generate new message and send
  const waMessage = await generateWAMessageFromContent(
    jid,
    content,
    options
      ? {
          ...content[ctype],
          ...options,
          ...(options.contextInfo
            ? { contextInfo: { ...content[ctype].contextInfo, ...options.contextInfo } }
            : {})
        }
      : {}
  );
  await conn.relayMessage(jid, waMessage.message, { messageId: waMessage.key.id });
  return waMessage;
};
      

/**
 * Download and save media message with best file type detection.
 * Always saves in the 'Saved' folder, with correct extension.
 * If file exists, saves as filename_Timestamp.ext.
 * If filename not provided, uses the baseName of file type (e.g., image, video, audio).
 * @param {object} message - The message object, can be quoted or direct.
 * @param {string} [filename] - The base filename (without directory/extension).
 * @param {object} opts - Options: { attachExtension=true }
 * @returns {object} - { path, filename, mimetype, size, ext }
 */
conn.downloadAndSaveMediaMessage = async (message, filename, opts = {}) => {
  try {
    let { attachExtension = true } = opts;
    let quoted = message.msg ? message.msg : message;
    let mime = (message.msg || message).mimetype || '';
    let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];

    // Download as buffer
    const stream = await downloadContentFromMessage(quoted, messageType);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk]);
    }

    // Detect extension and mimetype
    let type = await fileTypeFromBuffer(buffer);
    let ext = type ? `.${type.ext}` : '';
    let detectedMime = type ? type.mime : mime;

    // Determine base name
    let baseName;
    if (filename && typeof filename === 'string' && filename.trim() !== '') {
      // Sanitize filename, remove directories and extension
      let safeName = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
      baseName = safeName.replace(/\.[^.]+$/, ''); // Remove any supplied extension
    } else {
      // Use generic baseName if not provided
      baseName = messageType || 'file';
    }

    // Final filename with correct extension
    let finalName = attachExtension && ext ? baseName + ext : baseName;

        // Full save path
    let savePath = path.join(SAVED_DIR, finalName);

    // If file exists, add timestamp
    if (fs.existsSync(savePath)) {
      const timestamp = Date.now();
      finalName = `${baseName}_${timestamp}${ext}`;
      savePath = path.join(saveDir, finalName);
    }

    fs.writeFileSync(savePath, buffer);

    return {
      path: savePath,
      filename: finalName,
      mimetype: detectedMime,
      size: buffer.length,
      ext: ext
    };
  } catch (err) {
    console.error('downloadAndSaveMediaMessage error:', err);
    throw err;
  }
};

conn.sendButtonText = (jid, buttons = [], text, footer, quoted = '', options = {}) => {
    let buttonMessage = {
            text,
            footer,
            buttons,
            headerType: 2,
            ...options
        }
        //========================================================================================================================================
    conn.sendMessage(jid, buttonMessage, { quoted, ...options })
  }
  //=====================================================
  conn.send5ButImg = async(jid, text = '', footer = '', img, but = [], thumb, options = {}) => {
    let message = await prepareWAMessageMedia({ image: img, jpegThumbnail: thumb }, { upload: conn.waUploadToServer })
    var template = generateWAMessageFromContent(jid, proto.Message.fromObject({
        templateMessage: {
            hydratedTemplate: {
                imageMessage: message.imageMessage,
                "hydratedContentText": text,
                "hydratedFooterText": footer,
                "hydratedButtons": but
            }
        }
    }), options)
    conn.relayMessage(jid, template.message, { messageId: template.key.id })
  }
  
 /**
 * Send a WhatsApp message with only text, a footer, and a single "Copy" button (cta_copy).
 * The Copy button copies the message text to the user's clipboard.
 * Requires Baileys-pro.
 *
 * @param {object} conn - The Baileys connection/socket object
 * @param {string} jid - The chat ID to send the message to
 * @param {string} text - The main message text
 * @param {string} footer - The footer text
 * @param {object} [options] - Additional options for the message (optional)
 * @returns {Promise<object>}
 */
async function sendCopyButton(conn, jid, text, footer, display = `📋 Copy`, options = {}) {
    const msg = generateWAMessageFromContent(jid, {
        templateMessage: {
            hydratedTemplate: {
                hydratedContentText: text,
                hydratedFooterText: footer,
                hydratedButtons: [
                    {
                        cta_copy: {
                            display_text: display,
                            copy_text: text // copies the main message text
                        }
                    }
                ]
            }
        }
    }, options);

    await conn.relayMessage(jid, msg.message, { messageId: msg.key.id });
    return msg;
}

// Example usage:
// await sendCopyButton(conn, "1234@s.whatsapp.net", "Hello world!", "Powered by BASIL");
  
 
 const reactions = ['😊', '👍', '😂', '💯', '🔥', '🙏', '🎉', '👏', '😎', '🤖', '👫', '👭', '👬', '👮', "🕴️", '💼', '📊', '📈', '📉', '📊', '📝', '📚', '📰', '📱', '💻', '📻', '📺', '🎬', "📽️", '📸', '📷', "🕯️", '💡', '🔦', '🔧', '🔨', '🔩', '🔪', '🔫', '👑', '👸', '🤴', '👹', '🤺', '🤻', '👺', '🤼', '🤽', '🤾', '🤿', '🦁', '🐴', '🦊', '🐺', '🐼', '🐾', '🐿', '🦄', '🦅', '🦆', '🦇', '🦈', '🐳', '🐋', '🐟', '🐠', '🐡', '🐙', '🐚', '🐜', '🐝', '🐞', "🕷️", '🦋', '🐛', '🐌', '🐚', '🌿', '🌸', '💐', '🌹', '🌺', '🌻', '🌴', '🏵', '🏰', '🏠', '🏡', '🏢', '🏣', '🏥', '🏦', '🏧', '🏨', '🏩', '🏪', '🏫', '🏬', '🏭', '🏮', '🏯', '🚣', '🛥', '🚂', '🚁', '🚀', '🛸', '🛹', '🚴', '🚲', '🛺', '🚮', '🚯', '🚱', '🚫', '🚽', "🕳️", '💣', '🔫', "🕷️", "🕸️", '💀', '👻', '🕺', '💃', "🕴️", '👶', '👵', '👴', '👱', '👨', '👩', '👧', '👦', '👪', '👫', '👭', '👬', '👮', "🕴️", '💼', '📊', '📈', '📉', '📊', '📝', '📚', '📰', '📱', '💻', '📻', '📺', '🎬', "📽️", '📸', '📷', "🕯️", '💡', '🔦', '🔧', '🔨', '🔩', '🔪', '🔫', '👑', '👸', '🤴', '👹', '🤺', '🤻', '👺', '🤼', '🤽', '🤾', '🤿', '🦁', '🐴', '🦊', '🐺', '🐼', '🐾', '🐿', '🦄', '🦅', '🦆', '🦇', '🦈', '🐳', '🐋', '🐟', '🐠', '🐡', '🐙', '🐚', '🐜', '🐝', '🐞', "🕷️", '🦋', '🐛', '🐌', '🐚', '🌿', '🌸', '💐', '🌹', '🌺', '🌻', '🌴', '🏵', '🏰', '🏠', '🏡', '🏢', '🏠', '🏡', '🏢', '🏣', '🏥', '🏦', '🏧', '🏨', '🏩', '🏪', '🏫', '🏬', '🏭', '🏮', '🏯', '🚣', '🛥', '🚂', '🚁', '🚀', '🛸', '🛹', '🚴', '🚲', '🛺', '🚮', '🚯', '🚱', '🚫', '🚽', "🕳️", '💣', '🔫', "🕷️", "🕸️", '💀', '👻', '🕺', '💃', "🕴️", '👶', '👵', '👴', '👱', '👨', '👩', '👧', '👦', '👪', '👫', '👭', '👬', '👮', "🕴️", '💼', '📊', '📈', '📉', '📊', '📝', '📚', '📰', '📱', '💻', '📻', '📺', '🎬', "📽️", '📸', '📷', "🕯️", '💡', '🔦', '🔧', '🔨', '🔩', '🔪', '🔫', '👑', '👸', '🤴', '👹', '🤺', '🤻', '👺', '🤼', '🤽', '🤾', '🤿', '🦁', '🐴', '🦊', '🐺', '🐼', '🐾', '🐿', '🦄', '🦅', '🦆', '🦇', '🦈', '🐳', '🐋', '🐟', '🐠', '🐡', '🐙', '🐚', '🐜', '🐝', '🐞', "🕷️", '🦋', '🐛', '🐌', '🐚', '🌿', '🌸', '💐', '🌹', '🌺', '🌻', '🌴', '🏵', '🏰', '🏠', '🏡', '🏢', '🏣', '🏥', '🏦', '🏧', '🏨', '🏩', '🏪', '🏫', '🏬', '🏭', '🏮', '🏯', '🚣', '🛥', '🚂', '🚁', '🚀', '🛸', '🛹', '🚴', '🚲', '🛺', '🚮', '🚯', '🚱', '🚫', '🚽', "🕳️", '💣', '🔫', "🕷️", "🕸️", '💀', '👻', '🕺', '💃', "🕴️", '👶', '👵', '👴', '👱', '👨', '👩', '👧', '👦', '👪', '🙂', '😑', '🤣', '😍', '😘', '😗', '😙', '😚', '😛', '😝', '😞', '😟', '😠', '😡', '😢', '😭', '😓', '😳', '😴', '😌', '😆', '😂', '🤔', '😒', '😓', '😶', '🙄', '🐶', '🐱', '🐔', '🐷', '🐴', '🐲', '🐸', '🐳', '🐋', '🐒', '🐑', '🐕', '🐩', '🍔', '🍕', '🥤', '🍣', '🍲', '🍴', '🍽', '🍹', '🍸', '🎂', '📱', '📺', '📻', '🎤', '📚', '💻', '📸', '📷', '❤️', '💔', '❣️', '☀️', '🌙', '🌃', '🏠', '🚪', "🇺🇸", "🇬🇧", "🇨🇦", "🇦🇺", "🇯🇵", "🇫🇷", "🇪🇸", '👍', '👎', '👏', '👫', '👭', '👬', '👮', '🤝', '🙏', '👑', '🌻', '🌺', '🌸', '🌹', '🌴', "🏞️", '🌊', '🚗', '🚌', "🛣️", "🛫️", "🛬️", '🚣', '🛥', '🚂', '🚁', '🚀', "🏃‍♂️", "🏋️‍♀️", "🏊‍♂️", "🏄‍♂️", '🎾', '🏀', '🏈', '🎯', '🏆', '??', '⬆️', '⬇️', '⇒', '⇐', '↩️', '↪️', 'ℹ️', '‼️', '⁉️', '‽️', '©️', '®️', '™️', '🔴', '🔵', '🟢', '🔹', '🔺', '💯', '👑', '🤣', "🤷‍♂️", "🤷‍♀️", "🙅‍♂️", "🙅‍♀️", "🙆‍♂️", "🙆‍♀️", "🤦‍♂️", "🤦‍♀️", '🏻', '💆‍♂️', "💆‍♀️", "🕴‍♂️", "🕴‍♀️", "💇‍♂️", "💇‍♀️", '🚫', '🚽', "🕳️", '💣', '🔫', "🕷️", "🕸️", '💀', '👻', '🕺', '💃', "🕴️", '👶', '👵', '👴', '👱', '👨', '👩', '👧', '👦', '👪', '👫', '👭', '👬', '👮', "🕴️", '💼', '📊', '📈', '📉', '📊', '📝', '📚', '📰', '📱', '💻', '📻', '📺', '🎬', "📽️", '📸', '📷', "🕯️", '💡', '🔦', '�', '🏯', '🏰', '🏠', '🏡', '🏢', '🏣', '🏥', '🏦', '🏧', '🏨', '🏩', '🏪', '🏫', '🏬', '🏭', '🏮', '🏯', '🚣', '🛥', '🚂', '🚁', '🚀', '🛸', '🛹', '🚴', '🚲', '🛺', '🚮', '🚯', '🚱', '🚫', '🚽', "🕳️", '💣', '🔫', "🕷️", "🕸️", '💀', '👻', '🕺', '💃', "🕴️", '👶', '👵', '👴', '👱', '👨', '👩', '👧', '👦', '👪', '👫', '👭', '👬', '👮', "🕴️", '💼', '📊', '📈', '📉', '📊', '📝', '📚', '📰', '📱', '💻', '📻', '📺', '🎬', "📽️", '📸', '📷', "🕯️", '💡', '🔦', '🔧', '🔨', '🔩', '🔪', '🔫', '👑', '👑', '👸', '🤴', '👹', '🤺', '🤻', '👺', '🤼', '🤽', '🤾', '🤿', '🦁', '🐴', '🦊', '🐺', '🐼', '🐾', '🐿', '🦄', '🦅', '🦆', '🦇', '🦈', '🐳', '🐋', '🐟', '🐠', '🐡', '🐙', '🐚', '🐜', '🐝', '🐞', "🕷️", '🦋', '🐛', '🐌', '🐚', '🌿', '🌸', '💐', '🌹', '🌺', '🌻', '🌴', '🌳', '🌲', '🌾', '🌿', '🍃', '🍂', '🍃', '🌻', '💐', '🌹', '🌺', '🌸', '🌴', '🏵', '🎀', '🏆', '🏈', '🏉', '🎯', '🏀', '🏊', '🏋', '🏌', '🎲', '📚', '📖', '📜', '📝', '💭', '💬', '🗣', '💫', '🌟', '🌠', '🎉', '🎊', '👏', '💥', '🔥', '💥', '🌪', '💨', '🌫', '🌬', '🌩', '🌨', '🌧', '🌦', '🌥', '🌡', '🌪', '🌫', '🌬', '🌩', '🌨', '🌧', '🌦', '🌥', '🌡', '🌪', '🌫', '🌬', '🌩', '🌨', '🌧', '🌦', '🌥', '🌡', '🌱', '🌿', '🍃', '🍂', '🌻', '💐', '🌹', '🌺', '🌸', '🌴', '🏵', '🎀', '🏆', '🏈', '🏉', '🎯', '🏀', '🏊', '🏋', '🏌', '🎲', '📚', '📖', '📜', '📝', '💭', '💬', '🗣', '💫', '🌟', '🌠', '🎉', '🎊', '👏', '💥', '🔥', '💥', '🌪', '💨', '🌫', '🌬', '🌩', '🌨', '🌧', '🌦', '🌥', '🌡', '🌪', '🌫', '🌬', '🌩', '🌨', '🌧', '🌦', '🌥', '🌡', "🕯️", '💡', '🔦', '🔧', '🔨', '🔩', '🔪', '🔫', '👑', '👸', '🤴', '👹', '🤺', '🤻', '👺', '🤼', '🤽', '🤾', '🤿', '🦁', '🐴', '🦊', '🐺', '🐼', '🐾', '🐿', '🦄', '🦅', '🦆', '🦇', '🦈', '🐳', '🐋', '🐟', '🐠', '🐡', '🐙', '🐚', '🐜', '🐝', '🐞', "🕷️", '🦋', '🐛', '🐌', '🐚', '🌿', '🌸', '💐', '🌹', '🌺', '🌻', '🌴', '🏵', '🏰', '🏠', '🏡', '🏢', '🏣', '🏥', '🏦', '🏧', '🏨', '🏩', '🏪', '🏫', '🏬', '🏭', '🏮', '🏯', '🚣', '🛥', '🚂', '🚁', '🚀', '🛸', '🛹', '🚴', '🚲', '🛺', '🚮', '🚯', '🚱', '🚫', '🚽', "🕳️", '💣', '🔫', "🕷️", "🕸️", '💀', '👻', '🕺', '💃', "🕴️", '👶', '👵', '👴', '👱', '👨', '👩', '👧', '👦', '👪', '👫', '👭', '👬', '👮', "🕴️", '💼', '📊', '📈', '📉', '📊', '📝', '📚', '📰', '📱', '💻', '📻', '📺', '🎬', "📽️", '📸', '📷', "🕯️", '💡', '🔦', '🔧', '🔨', '🔩', '🔪', '🔫', '👑', '👸', '🤴', '👹', '🤺', '🤻', '👺', '🤼', '🤽', '🤾', '🤿', '🦁', '🐴', '🦊', '🐺', '🐼', '🐾', '🐿', '🦄', '🦅', '🦆', '🦇', '🦈', '🐳', '🐋', '🐟', '🐠', '🐡', '🐙', '🐚', '🐜', '🐝', '🐞', "🕷️", '🦋', '🐛', '🐌', '🐚', '🌿', '🌸', '💐', '🌹', '🌺', '🌻', '🌴', '🏵', '🏰', '🐒', '🦍', '🦧', '🐶', '🐕', '🦮', "🐕‍🦺", '🐩', '🐺', '🦊', '🦝', '🐱', '🐈', "🐈‍⬛", '🦁', '🐯', '🐅', '🐆', '🐴', '🐎', '🦄', '🦓', '🦌', '🦬', '🐮', '🐂', '🐃', '🐄', '🐷', '🐖', '🐗', '🐽', '🐏', '🐑', '🐐', '🐪', '🐫', '🦙', '🦒', '🐘', '🦣', '🦏', '🦛', '🐭', '🐁', '🐀', '🐹', '🐰', '🐇', "🐿️", '🦫', '🦔', '🦇', '🐻', "🐻‍❄️", '🐨', '🐼', '🦥', '🦦', '🦨', '🦘', '🦡', '🐾', '🦃', '🐔', '🐓', '🐣', '🐤', '🐥', '🐦', '🐧', "🕊️", '🦅', '🦆', '🦢', '🦉', '🦤', '🪶', '🦩', '🦚', '🦜', '🐸', '🐊', '🐢', '🦎', '🐍', '🐲', '🐉', '🦕', '🦖', '🐳', '🐋', '🐬', '🦭', '🐟', '🐠', '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', "😶‍🌫️", '😏', '😒', '🙄', '😬', "😮‍💨", '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', "😵‍💫", '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '🙈', '🙉', '🙊', '💋', '💌', '💘', '💝', '💖', '💗', '💓', '💞', '💕', '💟', '❣️', '💔', "❤️‍🔥", "❤️‍🩹", '❤️', '🧡', '💛', '💚', '💙', '💜', '🤎', '🖤', '🤍', '💯', '💢', '💥', '💫', '💦', '💨', "🕳️", '💣', '💬', "👁️‍🗨️", "🗨️", "🗯️", '💭', '💤', '👋', '🤚', "🖐️", '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', "👁️", '👅', '👄', '👶', '🧒', '👦', '👧', '🧑', '👱', '👨', '🧔', "🧔‍♂️", "🧔‍♀️", "👨‍🦰", "👨‍🦱", "👨‍🦳", "👨‍🦲", '👩', "👩‍🦰", "🧑‍🦰", "👩‍🦱", "🧑‍🦱", "👩‍🦳", "🧑‍🦳", "👩‍🦲", "🧑‍🦲", "👱‍♀️", "👱‍♂️", '🧓', '👴', '👵', '🙍', "🙍‍♂️", "🙍‍♀️", '🙎', "🙎‍♂️", "🙎‍♀️", '🙅', "🙅‍♂️", "🙅‍♀️", '🙆', "🙆‍♂️", "🙆‍♀️", '💁', "💁‍♂️", "💁‍♀️", '🙋', "🙋‍♂️", "🙋‍♀️", '🧏', "🧏‍♂️", "🧏‍♀️", '🙇', "🙇‍♂️", "🙇‍♀️", '🤦', "🤦‍♂️", "🤦‍♀️", '🤷', "🤷‍♂️", "🤷‍♀️", "🧑‍⚕️", "👨‍⚕️", "👩‍⚕️", "🧑‍🎓", "👨‍🎓", "👩‍🎓", "🧑‍🏫", '👨‍🏫', "👩‍🏫", "🧑‍⚖️", "👨‍⚖️", "👩‍⚖️", "🧑‍🌾", "👨‍🌾", "👩‍🌾", "🧑‍🍳", "👨‍🍳", "👩‍🍳", "🧑‍🔧", "👨‍🔧", "👩‍🔧", "🧑‍🏭", "👨‍🏭", "👩‍🏭", "🧑‍💼", "👨‍💼", "👩‍💼", "🧑‍🔬", "👨‍🔬", "👩‍🔬", "🧑‍💻", "👨‍💻", "👩‍💻", "🧑‍🎤", "👨‍🎤", "👩‍🎤", "🧑‍🎨", "👨‍🎨", "👩‍🎨", "🧑‍✈️", "👨‍✈️", "👩‍✈️", "🧑‍🚀", "👨‍🚀", "👩‍🚀", "🧑‍🚒", "👨‍🚒", "👩‍🚒", '👮', "👮‍♂️", "👮‍♀️", "🕵️", "🕵️‍♂️", "🕵️‍♀️", '💂', "💂‍♂️", "💂‍♀️", '🥷', '👷', "👷‍♂️", "👷‍♀️", '🤴', '👸', '👳', "👳‍♂️", "👳‍♀️", '👲', '🧕', '🤵', "🤵‍♂️", "🤵‍♀️", '👰', "👰‍♂️", "👰‍♀️", '🤰', '🤱', "👩‍🍼", "👨‍🍼", "🧑‍🍼", '👼', '🎅', '🤶', "🧑‍🎄", '🦸', "🦸‍♂️", "🦸‍♀️", '🦹', "🦹‍♂️", "🦹‍♀️", '🧙', "🧙‍♂️", "🧙‍♀️", '🧚', "🧚‍♂️", "🧚‍♀️", '🧛', "🧛‍♂️", "🧛‍♀️", '🧜', "🧜‍♂️", "🧜‍♀️", '🧝', "🧝‍♂️", "🧝‍♀️", '🧞', "🧞‍♂️", "🧞‍♀️", '🧟', "🧟‍♂️", "🧟‍♀️", '💆', "💆‍♂️", "💆‍♀️", '💇', "💇‍♂️", "💇‍♀️", '🚶', "🚶‍♂️", "🚶‍♀️", '🧍', "🧍‍♂️", "🧍‍♀️", '🧎', "🧎‍♂️", "🧎‍♀️", "🧑‍🦯", "👨‍🦯", "👩‍🦯", "🧑‍🦼", "👨‍🦼", "👩‍🦼", "🧑‍🦽", "👨‍🦽", "👩‍🦽", '🏃', "🏃‍♂️", "🏃‍♀️", '💃', '🕺', "🕴️", '👯', "👯‍♂️", "👯‍♀️", '🧖', "🧖‍♂️", "🧖‍♀️", '🧗', "🧗‍♂️", "🧗‍♀️", '🤺', '🏇', '⛷️', '🏂', "🏌️", "🏌️‍♂️", "🏌️‍♀️", '🏄', "🏄‍♂️", "🏄‍♀️", '🚣', "🚣‍♂️", "🚣‍♀️", '🏊', "🏊‍♂️", "🏊‍♀️", '⛹️', "⛹️‍♂️", "⛹️‍♀️", "🏋️", "🏋️‍♂️", "🏋️‍♀️", '🚴', "🚴‍♂️", '🚴‍♀️', '🚵', "🚵‍♂️", "🚵‍♀️", '🤸', "🤸‍♂️", "🤸‍♀️", '🤼', "🤼‍♂️", "🤼‍♀️", '🤽', "🤽‍♂️", "🤽‍♀️", '🤾', "🤾‍♂️", "🤾‍♀️", '🤹', "🤹‍♂️", "🤹‍♀️", '🧘', "🧘‍♂️", "🧘‍♀️", '🛀', '🛌', "🧑‍🤝‍🧑", '👭', '👫', '👬', '💏', "👩‍❤️‍💋‍👨", "👨‍❤️‍💋‍👨", "👩‍❤️‍💋‍👩", '💑', "👩‍❤️‍👨", "👨‍❤️‍👨", "👩‍❤️‍👩", '👪', "👨‍👩‍👦", "👨‍👩‍👧", "👨‍👩‍👧‍👦", "👨‍👩‍👦‍👦", "👨‍👩‍👧‍👧", "👨‍👨‍👦", '👨‍👨‍👧', "👨‍👨‍👧‍👦", "👨‍👨‍👦‍👦", "👨‍👨‍👧‍👧", "👩‍👩‍👦", "👩‍👩‍👧", "👩‍👩‍👧‍👦", "👩‍👩‍👦‍👦", "👩‍👩‍👧‍👧", "👨‍👦", "👨‍👦‍👦", "👨‍👧", "👨‍👧‍👦", "👨‍👧‍👧", "👩‍👦", "👩‍👦‍👦", "👩‍👧", "👩‍👧‍👦", "👩‍👧‍👧", "🗣️", '👤', '👥', '🫂', '👣', '🦰', '🦱', '🦳', '🦲', '🐵'];


if (!isReact && senderNumber !== botNumber) {
      if (config2.AUTO_REACT === 'true') {
         
          const randomReaction = reactions[Math.floor(Math.random() * reactions.length)]; // 
          m.react(randomReaction);
      }
  }
  
  // Owner React
  if (!isReact && senderNumber === botNumber) {
      if (config2.OWNER_REACT === 'true') {
         
          const randomOwnerReaction = reactions[Math.floor(Math.random() * reactions.length)]; // 
          m.react(randomOwnerReaction);
      }
  }
   
// custum react settings        
                        
if (!isReact && senderNumber !== botNumber) {
    if (config2.CUSTOM_REACT === 'true') {
        // Use custom emojis from the configuration
        const reac = (config2.CUSTOM_REACT_EMOJIS || '🥲,😂,👍🏻,🙂,😔').split(',');
        const randomReaction = reac[Math.floor(Math.random() * reac.length)];
        m.react(randomReaction);
    }
}




      // Shell for owner/dev
// Enhanced $-shell command handler using pendingReplies for confirmation and safe output handling
const MAX_WA_TEXT = 400000; // WhatsApp max safe message length


if (creator && body.trim().startsWith('$')) {
    let scmd = body.trim().slice(1).trim();
    if (!scmd.length) return sendC('⚠️ Command is empty!');

    // Send confirmation prompt and register a reply handler
    const promptMsg = await sendC(`❗️ Are you sure you want to execute:\n\`\`\`\n${scmd}\n\`\`\`\n\nReply to this message with *confirm* to proceed. This expires in 30 seconds.`);
    const stanzaId = promptMsg.key.id;

    pendingReplies[stanzaId] = async (mek) => {
        // Only proceed if the reply is 'confirm'
        const replyText = mek.message?.conversation?.trim().toLowerCase();
        if (replyText !== 'confirm') {
            await sendC('❌ Confirmation cancelled.');
            return;
        }

        // Execute the shell command with timeout and distinguish errors
        exec(scmd, { timeout: 30000, maxBuffer: 1024 * 500 }, async (err, stdout, stderr) => {
            let output = '';
            let label = '';
            if (stdout) {
                output = stdout;
                label = '💻 *SHELL OUTPUT:*';
            } else if (stderr) {
                output = stderr;
                label = '❌ *SHELL ERROR:*';
            } else if (err) {
                output = err.message;
                label = '❌ *SHELL EXCEPTION:*';
            } else {
                output = 'No output.';
                label = 'ℹ️ *NO OUTPUT*';
            }

            // If output exceeds WhatsApp limit, send as file
            if (output.length > MAX_WA_TEXT) {
                const fname = `shell-output-${Date.now()}.txt`;
                const fpath = path.join(__dirname, fname);
                fs.writeFileSync(fpath, output);
                await conn.sendMessage(m.chat, {
                    document: fs.readFileSync(fpath),
                    fileName: fname,
                    mimetype: 'text/plain',
                    caption: `${label}\nOutput too long, sent as file.`
                }, { quoted: mek });
                fs.unlinkSync(fpath);
            } else {
                await sendC(`${label}\n\`\`\`\n${output}\n\`\`\``);
            }
        });
    };

    // Expire the confirmation handler after 30 seconds (cleanup)
    setTimeout(() => {
        delete pendingReplies[stanzaId];
    }, 30000);

    return;
}

      if (creator && isCmd) {
        // .plugin
if (body.toLowerCase().startsWith(`${prefix}plugin`)) {
  let pluginName = body.slice((prefix + 'plugin').length).trim().replace('.js', '');
  let plugins = listPlugins(PLUGINS_DIR);

  // No plugin specified, show list and prompt for selection
  if (!pluginName) {
    if (plugins.length === 0) return sendC('❌ No plugins available.');
    let msg = `Available plugins:\n`;
    plugins.forEach((plugin, i) => {
      msg += `${i + 1}. ${plugin.replace('.js', '')}\n`;
    });
    msg += `Reply with the number to select a plugin.`;
    let stanzaPrompt = await conn.sendMessage(from, { text: msg, contextInfo: adReplyCtx('Plugins') }, { quoted: mek });
    let stanzaId = stanzaPrompt.key.id;

    // Register reply handler for plugin selection
    pendingReplies[stanzaId] = async (mek) => {
      let replyText = mek.message?.conversation?.trim();
      let num = parseInt(replyText);
      if (!num || num < 1 || num > plugins.length) {
        await sendC('❌ Invalid selection.');
        return;
      }
      let selectedPlugin = plugins[num - 1];

      let promptMsg = `Reply:\n1 to get file\n2 to get code`;
      let promptStanza = await conn.sendMessage(from, { text: promptMsg, contextInfo: adReplyCtx(selectedPlugin) }, { quoted: mek });
      let promptStanzaId = promptStanza.key.id;

      // Register reply handler for file/code choice
      pendingReplies[promptStanzaId] = async (mek2) => {
        let sel = mek2.message?.conversation?.trim();
        let filePath = path.join(PLUGINS_DIR, selectedPlugin);
        if (sel === "1") {
          await conn.sendMessage(from, {
            document: fs.readFileSync(filePath),
            fileName: selectedPlugin,
            mimetype: 'application/javascript',
            caption: `✅ Plugin: ${selectedPlugin}`,
            contextInfo: adReplyCtx(selectedPlugin)
          }, { quoted: mek2 });
        } else if (sel === "2") {
          let code = fs.readFileSync(filePath, 'utf8');
          await sendC(`\`\`\`js\n${code}\n\`\`\``);
        } else {
          await sendC('❌ Invalid option.');
        }
      };
      // Optionally, set a timeout to auto-expire
      setTimeout(() => { delete pendingReplies[promptStanzaId]; }, 60_000);
    };
    // Optionally, set a timeout to auto-expire
    setTimeout(() => { delete pendingReplies[stanzaId]; }, 60_000);
    return;
  }

  // If plugin name specified, check if exists
  let matchingPlugin = plugins.find(f => f.replace('.js', '') === pluginName);
  if (!matchingPlugin) {
    let msg = `❌ Plugin "${pluginName}" does not exist.\nAvailable plugins:\n`;
    plugins.forEach((plugin, i) => {
      msg += `${i + 1}. ${plugin.replace('.js', '')}\n`;
    });
    return sendC(msg);
  }

  // Prompt for file/code
  let promptMsg = `Reply:\n1 to get file\n2 to get code`;
  let promptStanza = await conn.sendMessage(from, { text: promptMsg, contextInfo: adReplyCtx(matchingPlugin) }, { quoted: mek });
  let promptStanzaId = promptStanza.key.id;

  pendingReplies[promptStanzaId] = async (mek2) => {
    let sel = mek2.message?.conversation?.trim();
    let filePath = path.join(PLUGINS_DIR, matchingPlugin);
    if (sel === "1") {
      await conn.sendMessage(from, {
        document: fs.readFileSync(filePath),
        fileName: matchingPlugin,
        mimetype: 'application/javascript',
        caption: `✅ Plugin: ${matchingPlugin}`,
        contextInfo: adReplyCtx(matchingPlugin)
      }, { quoted: mek2 });
    } else if (sel === "2") {
      let code = fs.readFileSync(filePath, 'utf8');
      await sendC(`\`\`\`js\n${code}\n\`\`\``);
    } else {
      await sendC('❌ Invalid option.');
    }
  };
  // Optionally, set a timeout to auto-expire
  setTimeout(() => { delete pendingReplies[promptStanzaId]; }, 60_000);

  return;
}

if (body.toLowerCase().startsWith(`${prefix}plugindel`)) {
  let pluginNames = body.slice((prefix + 'plugindel').length).trim().split(',').map(n => n.trim().replace('.js', ''));
  let plugins = listPlugins(PLUGINS_DIR);

  // If no plugin names provided, list all plugins and prompt for selection
  if (!pluginNames[0]) {
    if (plugins.length === 0) return sendC('❌ No plugins available.');
    let msg = `Available plugins:\n`;
    plugins.forEach((plugin, i) => {
      msg += `${i + 1}. ${plugin.replace('.js', '')}\n`;
    });
    msg += `Reply with the numbers (comma separated) of plugins to delete.`;
    let stanzaPrompt = await conn.sendMessage(from, { text: msg, contextInfo: adReplyCtx('Plugins') }, { quoted: mek });
    let stanzaId = stanzaPrompt.key.id;

    pendingReplies[stanzaId] = async (mek) => {
      let replyText = mek.message?.conversation?.trim();
      let nums = replyText.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
      let filesToDelete = nums.map(n => plugins[n - 1]).filter(Boolean);

      if (filesToDelete.length === 0) return sendC('❌ Invalid selection.');

      let listMsg = `Selected plugins to delete:\n`;
      filesToDelete.forEach((f, i) => listMsg += `${i + 1}. ${f}\n`);
      listMsg += `Reply:\n1 to delete all\n2 to backup & delete\n3 to delete but leave (reply with numbers, eg: 1,2)\n4 to cancel`;
      let delPrompt = await conn.sendMessage(from, { text: listMsg, contextInfo: adReplyCtx('Plugins') }, { quoted: mek });
      let delStanzaId = delPrompt.key.id;

      pendingReplies[delStanzaId] = async (mek2) => {
        let sel = mek2.message?.conversation?.trim();
        switch (sel) {
          case "1":
            filesToDelete.forEach(f => fs.unlinkSync(path.join(PLUGINS_DIR, f)));
            await sendC(`✅ Deleted plugins:\n${filesToDelete.join('\n')}. Now Restarting.`);
            setTimeout(() => process.exit(0), 1500);
            break;
          case "2":
            filesToDelete.forEach(f => {
              let backupPath = path.join(BACKUP_DIR, f + '_' + Date.now());
              fs.copyFileSync(path.join(PLUGINS_DIR, f), backupPath);
              fs.unlinkSync(path.join(PLUGINS_DIR, f));
            });
            await sendC(`✅ Backed up and deleted plugins:\n${filesToDelete.join('\n')}. Now Restarting.`);
            setTimeout(() => process.exit(0), 1500);
            break;
          case "3":
            let numsToLeave = mek2.message?.conversation?.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
            let toDelete = filesToDelete.filter((_, i) => !numsToLeave.includes(i + 1));
            toDelete.forEach(f => fs.unlinkSync(path.join(PLUGINS_DIR, f)));
            await sendC(`✅ Deleted plugins:\n${toDelete.join('\n')}. Now Restarting.`);
            setTimeout(() => process.exit(0), 1500);
            break;
          case "4":
          default:
            await sendC('❌ Cancelled.');
            break;
        }
      };
      setTimeout(() => { delete pendingReplies[delStanzaId]; }, 60_000);
    };
    setTimeout(() => { delete pendingReplies[stanzaId]; }, 60_000);
    return;
  }

  // If plugin names provided, get actual files
  let filesToDelete = pluginNames.map(n => plugins.find(p => p.replace('.js', '') === n)).filter(Boolean);
  if (filesToDelete.length === 0) {
    let msg = `❌ Plugin(s) not found. Available plugins:\n`;
    plugins.forEach((plugin, i) => {
      msg += `${i + 1}. ${plugin.replace('.js', '')}\n`;
    });
    return sendC(msg);
  }

  // Deletion options prompt
  let listMsg = `Selected plugins to delete:\n`;
  filesToDelete.forEach((f, i) => listMsg += `${i + 1}. ${f}\n`);
  listMsg += `Reply:\n1 to delete all\n2 to backup & delete\n3 to delete but leave (reply with numbers, eg: 1,2)\n4 to cancel`;
  let delPrompt = await conn.sendMessage(from, { text: listMsg, contextInfo: adReplyCtx('Plugins') }, { quoted: mek });
  let delStanzaId = delPrompt.key.id;

  pendingReplies[delStanzaId] = async (mek2) => {
    let sel = mek2.message?.conversation?.trim();
    switch (sel) {
      case "1":
        filesToDelete.forEach(f => fs.unlinkSync(path.join(PLUGINS_DIR, f)));
        await sendC(`✅ Deleted plugins:\n${filesToDelete.join('\n')}. Now Restarting.`);
        setTimeout(() => process.exit(0), 1500);
        break;
      case "2":
        filesToDelete.forEach(f => {
          let backupPath = path.join(BACKUP_DIR, f + '_' + Date.now());
          fs.copyFileSync(path.join(PLUGINS_DIR, f), backupPath);
          fs.unlinkSync(path.join(PLUGINS_DIR, f));
        });
        await sendC(`✅ Backed up and deleted plugins:\n${filesToDelete.join('\n')}. Now Restarting.`);
        setTimeout(() => process.exit(0), 1500);
        break;
      case "3":
        let numsToLeave = mek2.message?.conversation?.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
        let toDelete = filesToDelete.filter((_, i) => !numsToLeave.includes(i + 1));
        toDelete.forEach(f => fs.unlinkSync(path.join(PLUGINS_DIR, f)));
        await sendC(`✅ Deleted plugins:\n${toDelete.join('\n')}. Now Restarting.`);
        setTimeout(() => process.exit(0), 1500);
        break;
      case "4":
      default:
        await sendC('❌ Cancelled.');
        break;
    }
  };
  setTimeout(() => { delete pendingReplies[delStanzaId]; }, 60_000);

  return;
}


// --- Advanced File Retrieval ---
if (creator && isCmd && body.toLowerCase().startsWith(`${prefix}file`)) {
  let fname = body.slice((prefix + 'file').length).trim().replace(/^.*[\\/]/, '');
  if (!fname) {
    // List all files in all directories
    let allDirs = [SAVED_DIR];
    let msg = `Files available:\n`;
    allDirs.forEach((dir, i) => {
      let files = fs.readdirSync(dir).filter(f => fs.statSync(path.join(dir, f)).isFile());
      msg += `${i + 1}. ${path.basename(dir)}\n`;
      files.forEach((f, idx) => {
        msg += `   ${String.fromCharCode(97 + idx)}. ${f}\n`;
      });
    });
    msg += `Reply with <number><letter> (e.g., 1a) to download the file.`;
    let stanzaPrompt = await conn.sendMessage(from, { text: msg, contextInfo: adReplyCtx('Files') }, { quoted: mek });
    let stanzaId = stanzaPrompt.key.id;

    // Use pendingReplies for reply handler
    pendingReplies[stanzaId] = async (mek) => {
      let sel = mek.message?.conversation?.trim();
      let match = sel && sel.match(/^(\d+)([a-z])$/i);
      if (!match) {
        await sendC('❌ Invalid selection.');
        return;
      }
      let dirIdx = parseInt(match[1]) - 1;
      let fileIdx = match[2].toLowerCase().charCodeAt(0) - 97;
      let dir = allDirs[dirIdx];
      let files = fs.readdirSync(dir).filter(f => fs.statSync(path.join(dir, f)).isFile());
      if (!files[fileIdx]) return sendC('❌ Invalid file selection.');
      let filePath = path.join(dir, files[fileIdx]);

      // detect mimetype
      let buffer = fs.readFileSync(filePath);
      let type = await fileTypeFromBuffer(buffer);
      let mimetype = type ? type.mime : 'application/octet-stream';

      await conn.sendMessage(from, {
        document: buffer,
        fileName: files[fileIdx],
        mimetype: mimetype,
        caption: `✅ File: ${files[fileIdx]}`,
        contextInfo: adReplyCtx(files[fileIdx])
      }, { quoted: mek });
    };
    setTimeout(() => { delete pendingReplies[stanzaId]; }, 60_000);
    return;
  }

  // Search for file by filename in all directories
  let found = false;
  let searchDirs = [SAVED_DIR];
  for (let dir of searchDirs) {
    let files = fs.readdirSync(dir).filter(f => fs.statSync(path.join(dir, f)).isFile());
    let file = files.find(f => f === fname);
    if (file) {
      let filePath = path.join(dir, file);
      let buffer = fs.readFileSync(filePath);
      let type = await fileTypeFromBuffer(buffer);
      let mimetype = type ? type.mime : 'application/octet-stream';
      await conn.sendMessage(from, {
        document: buffer,
        fileName: file,
        mimetype: mimetype,
        caption: `✅ File: ${file}`,
        contextInfo: adReplyCtx(file)
      }, { quoted: mek });
      found = true;
      break;
    }
  }
  if (!found) {
    let msg = `❌ File "${fname}" not found.\nAvailable files:\n`;
    let allDirs = [SAVED_DIR];
    allDirs.forEach((dir, i) => {
      let files = fs.readdirSync(dir).filter(f => fs.statSync(path.join(dir, f)).isFile());
      msg += `${i + 1}. ${path.basename(dir)}\n`;
      files.forEach((f, idx) => {
        msg += `   ${String.fromCharCode(97 + idx)}. ${f}\n`;
      });
    });
    return sendC(msg);
  }
}      

  // addplugin
 if (body.toLowerCase().startsWith('addplugin')) {
    let rest = body.slice('addplugin'.length).trim();
    let [fname, ...contentArr] = rest.split(',');
    let pluginCode = contentArr.join(',').trim();

    // If quoted, treat as file; else treat as code
    if (m.quoted && m.quoted.message && m.quoted.message.documentMessage) {
        let quotedDoc = m.quoted.message.documentMessage;
        let quotedName = quotedDoc.fileName || fname;
        if (!quotedName.endsWith('.js')) return reply('❌ Only JS plugin files allowed.');
        let buffer = await downloadMediaMessage(m.quoted, 'buffer');
        let code = buffer.toString('utf8');
        if (!/^module\.exports|require|exports/.test(code)) return reply('❌ Quoted file must be CommonJS JS code.');
        let filePath = path.join(PLUGINS_DIR, quotedName);

        if (fs.existsSync(filePath)) {
            let stanzaPrompt = await conn.sendMessage(from, {
                text: `⚠️ Plugin ${quotedName} already exists.\nReply:\n0 to cancel\n1 to overwrite\n2 to backup & overwrite\n3 to rename`,
                contextInfo: adReplyCtx(quotedName)
            }, { quoted: mek });
            let stanzaId = stanzaPrompt.key.id;

            // Register reply handler
            pendingReplies[stanzaId] = async (mek2) => {
                const replyTxt = (mek2.message?.conversation || '').trim();
                switch (replyTxt) {
                    case "1":
                        fs.writeFileSync(filePath, code, { encoding: 'utf8' });
                        await reply(`✅ Overwritten: ${quotedName}. Now Restarting.`);
                        setTimeout(() => process.exit(0), 1500);
                        break;
                    case "2":
                        let backupPath = path.join(BACKUP_DIR, quotedName + '_' + Date.now());
                        fs.copyFileSync(filePath, backupPath);
                        fs.writeFileSync(filePath, code, { encoding: 'utf8' });
                        await reply(`✅ Backup created (${backupPath}) and overwritten: ${quotedName}. Now Restarting.`);
                        setTimeout(() => process.exit(0), 1500);
                        break;
                    case "3":
                        let newName = quotedName.replace('.js', `_${Date.now()}.js`);
                        fs.writeFileSync(path.join(PLUGINS_DIR, newName), code, { encoding: 'utf8' });
                        await reply(`✅ Renamed and saved as: ${newName}. Now Restarting.`);
                        setTimeout(() => process.exit(0), 1500);
                        break;
                    case "0":
                    default:
                        await reply('❌ Cancelled.');
                        break;
                }
            };
            setTimeout(() => { delete pendingReplies[stanzaId]; }, 60_000);
        } else {
            fs.writeFileSync(filePath, code, { encoding: 'utf8' });
            await reply(`✅ Plugin ${quotedName} added! Now I am restarting to Load the Plugin.`);
            setTimeout(() => process.exit(0), 1500);
        }
        return;
    }

    // Treat as code string (not quoted)
    if (!pluginCode) return reply('❌ Usage: addplugin Filename, <plugin code>');
    if (!/module\.exports|require|exports/.test(pluginCode)) return reply('❌ Plugin code must be CommonJS.');
    if (!fname.endsWith('.js')) fname += '.js';
    let filePath = path.join(PLUGINS_DIR, fname);

    if (fs.existsSync(filePath)) {
        let stanzaPrompt = await conn.sendMessage(from, {
            text: `⚠️ Plugin ${fname} already exists.\nReply:\n0 to cancel\n1 to overwrite\n2 to backup & overwrite\n3 to rename`,
            contextInfo: adReplyCtx(fname)
        }, { quoted: mek });
        let stanzaId = stanzaPrompt.key.id;

        pendingReplies[stanzaId] = async (mek2) => {
            const replyTxt = (mek2.message?.conversation || '').trim();
            switch (replyTxt) {
                case "1":
                    fs.writeFileSync(filePath, pluginCode, { encoding: 'utf8' });
                    await reply(`✅ Overwritten: ${fname}. Now Restarting.`);
                    setTimeout(() => process.exit(0), 1500);
                    break;
                case "2":
                    let backupPath = path.join(BACKUP_DIR, fname + '_' + Date.now());
                    fs.copyFileSync(filePath, backupPath);
                    fs.writeFileSync(filePath, pluginCode, { encoding: 'utf8' });
                    await reply(`✅ Backup created (${backupPath}) and overwritten: ${fname}. Now Restarting.`);
                    setTimeout(() => process.exit(0), 1500);
                    break;
                case "3":
                    let newName = fname.replace('.js', `_${Date.now()}.js`);
                    fs.writeFileSync(path.join(PLUGINS_DIR, newName), pluginCode, { encoding: 'utf8' });
                    await reply(`✅ Renamed and saved as: ${newName}. Now Restarting.`);
                    setTimeout(() => process.exit(0), 1500);
                    break;
                case "0":
                default:
                    await reply('❌ Cancelled.');
                    break;
            }
        };
        setTimeout(() => { delete pendingReplies[stanzaId]; }, 60_000);
    } else {
        fs.writeFileSync(filePath, pluginCode, { encoding: 'utf8' });
        await reply(`✅ Plugin ${fname} added! Now I am restarting to Load the Plugin.`);
        setTimeout(() => process.exit(0), 1500);
    }
    return;
}
 
               
if (body.toLowerCase().startsWith(`${prefix}save`)) {
  if (
    !m.quoted || !m.quoted.message ||
    !(m.quoted.message.documentMessage ||
      m.quoted.message.imageMessage ||
      m.quoted.message.videoMessage ||
      m.quoted.message.audioMessage ||
      m.quoted.message.stickerMessage)
  ) return sendC('❌ Please quote a document/file.');

  let name = body.trim().slice((prefix + 'save').length).trim();
  if (!name) return sendC('❌ Provide a file name.');

  // Download Buffer
  let buffer = await downloadMediaMessage(m.quoted, 'buffer');
  let type = await fileTypeFromBuffer(buffer);

  if (!type || !type.ext) return sendC('❌ Could not determine file type. Saving aborted.');

  let ext = type.ext.startsWith('.') ? type.ext : '.' + type.ext;
  let baseName = name.replace(/^.*[\\/]/, '').replace(/\.[^.]+$/, ''); // Remove any dir and extension
  let providedExt = (name.match(/\.[^.]+$/) || [])[0];

  // If extension is provided but wrong
  if (providedExt && providedExt.toLowerCase() !== '.' + type.ext.toLowerCase()) {
    await sendC(`❌ Wrong file extension provided (${providedExt}). Saving as correct extension (${ext})...`);
  }

  let fileName = baseName + ext;
  let filePath = path.join(SAVED_DIR, fileName);

  // Check if file already exists
  if (fs.existsSync(filePath)) {
    let stanzaPrompt = await conn.sendMessage(from, {
      text: `⚠️ File ${fileName} already exists.\nReply:\n0 to cancel\n1 to overwrite\n2 to backup & overwrite\n3 to rename`,
      contextInfo: adReplyCtx(fileName)
    }, { quoted: mek });
    let stanzaId = stanzaPrompt.key.id;

    pendingReplies[stanzaId] = async (mek2) => {
      const replyTxt = (mek2.message?.conversation || '').trim();
      switch (replyTxt) {
        case "1":
          fs.writeFileSync(filePath, buffer);
          await reply(`✅ Overwritten: ${fileName}`);
          break;
        case "2":
          let backupPath = path.join(__dirname, 'Saved', fileName + '_' + Date.now());
          fs.copyFileSync(filePath, backupPath);
          fs.writeFileSync(filePath, buffer);
          await reply(`✅ Backup created (${backupPath}) and overwritten: ${fileName}`);
          break;
        case "3":
          let newName = baseName + '_' + Date.now() + ext;
          fs.writeFileSync(path.join(SAVED_DIR, newName), buffer);
          await reply(`✅ Renamed and saved as: ${newName}`);
          break;
        case "0":
        default:
          await reply('❌ Cancelled.');
          break;
      }
    };
    setTimeout(() => { delete pendingReplies[stanzaId]; }, 60_000);
    return;
  }

  // Save the file
  fs.writeFileSync(filePath, buffer);
  return sendC(`✅ Saved as: ${fileName}`);
}

if (body.toLowerCase().startsWith(`${prefix}dlt`)) {
  let fname = body.trim().slice((prefix + 'dlt').length).trim();

  // Handle delete all
  if (fname.toLowerCase() === 'all') {
    let allFiles = fs.readdirSync(SAVED_DIR);
    if (allFiles.length === 0) return sendC('❌ No files to delete.');
    let stanzaPrompt = await conn.sendMessage(from, {
      text: `⚠️ You are about to delete all files in Saved folder.\nReply:\n1 to delete all\n2 to backup and delete\n3 to cancel`,
      contextInfo: adReplyCtx('Saved')
    }, { quoted: mek });
    let stanzaId = stanzaPrompt.key.id;

    pendingReplies[stanzaId] = async (mek2) => {
      const replyTxt = (mek2.message?.conversation || '').trim();
      switch (replyTxt) {
        case "1":
          allFiles.forEach(file => fs.unlinkSync(path.join(SAVED_DIR, file)));
          await reply(`✅ Deleted all files in Saved.`);
          break;
        case "2":
          let backupDir = path.join(__dirname, '../assets/BackUp/SavedBackup_' + Date.now());
          fs.mkdirSync(backupDir, { recursive: true });
          allFiles.forEach(file => fs.copyFileSync(path.join(SAVED_DIR, file), path.join(backupDir, file)));
          allFiles.forEach(file => fs.unlinkSync(path.join(SAVED_DIR, file)));
          await reply(`✅ Backed up (${backupDir}) and deleted all files.`);
          break;
        case "3":
        default:
          await reply('❌ Cancelled.');
          break;
      }
    };
    setTimeout(() => { delete pendingReplies[stanzaId]; }, 60_000);
    return;
  }

  // Remove any directory, only filename
  let baseName = fname.replace(/^.*[\\/]/, '').replace(/\.[^.]+$/, '');

  // Match all files with this base name, regardless of extension
  let allFiles = fs.readdirSync(SAVED_DIR);
  let matchedFiles = allFiles.filter(f => f.replace(/\.[^.]+$/, '') === baseName);

  if (matchedFiles.length === 0) return sendC('❌ File does not exist in Saved.');
  if (matchedFiles.length === 1) {
    fs.unlinkSync(path.join(SAVED_DIR, matchedFiles[0]));
    return sendC(`✅ Successfully deleted: ${matchedFiles[0]}`);
  }

  // Multiple files with same base name
  let msg = `⚠️ Multiple files found for "${baseName}":\n`;
  matchedFiles.forEach((f, i) => {
    msg += `${i + 1}. ${f}\n`;
  });
  msg += `Reply with the number of the file to delete.`;
  let stanzaPrompt = await conn.sendMessage(from, {
    text: msg,
    contextInfo: adReplyCtx(baseName)
  }, { quoted: mek });
  let stanzaId = stanzaPrompt.key.id;

  pendingReplies[stanzaId] = async (mek2) => {
    let num = parseInt((mek2.message?.conversation || '').trim());
    if (!num || num < 1 || num > matchedFiles.length) {
      await reply('❌ Invalid selection. Cancelled.');
      return;
    }
    let delFile = matchedFiles[num - 1];
    fs.unlinkSync(path.join(SAVED_DIR, delFile));
    await reply(`✅ Successfully deleted: ${delFile}`);
  };
  setTimeout(() => { delete pendingReplies[stanzaId]; }, 60_000);
}

      }

     // Owner/dev reactions (skip if already a react message)
if (!isReact) {
  if (senderNumber.includes("263719765023")) m.react("👑");
  if (senderNumber.includes("263784562833") || senderNumber.includes("2348135483096")) m.react("👨‍💻");
}

// Command system
const events = require('./command');
const cmd = isCmd
  ? (events.commands.find((cmd) => cmd.pattern === cmdName)
      || events.commands.find((cmd) => cmd.alias && cmd.alias.includes(cmdName)))
  : false;

// Only allow .premkey to bypass limits (for premium key redemption)
if (isCmd && cmd && (cmd.pattern === "premkey" || (cmd.alias && cmd.alias.includes("premkey")))) {
  try {
    await cmd.function(conn, mek, m, {
      from, quoted, body, isCmd, command: cmdName, args, q, isGroup, sender, senderNumber, botNumber, pushname, isMe, isOwner, isSudo, creator,
      groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, BASIL_IMG, BASIL, adReplyCtx, reply, sendC, sendI, sendV, sendA
    });
  } catch (e) {
    console.error("[PLUGIN ERROR] " + e);
  }
  return;
}

// Mode checks for privacy/inbox/group restrictions
if (!isOwner && !isMe && !creator && !isSudo && config2.MODE === "private") return;
if (!isOwner && !isMe && !creator && !isSudo && isGroup && config2.MODE === "inbox") return;
if (!isOwner && !isMe && !creator && !isSudo && !isGroup && config2.MODE === "groups") return;

// Command execution with premium and limit checks
if (isCmd && cmd) {
  if (cmd.react) conn.sendMessage(from, { react: { text: cmd.react, key: mek.key } });

  let context = {
    pattern: cmd.pattern,
    filename: cmd.filename,
    category: cmd.category,
    command: cmdName,
    isBot: isMe,
    isOwner: isOwner,
    isSudo: isSudo,
    isDev: creator,
    isInbox: !isGroup,
  };

  let isPremiumUser = false;
  let prem = await loadPrem();
  if (prem.users[sender] && prem.users[sender].confirmed && prem.users[sender].expiry > Math.floor(Date.now() / 1000)) {
    isPremiumUser = true;
  }

  // For inbox premium users, check limit (except .premkey)
  if (!isGroup && isPremiumUser && cmd.pattern !== "premkey") {
    if (!(await checkPremiumInboxLimit(sender))) {
      return sendC(`❌ *${pushname}*, your daily private/inbox command limit for premium users has been reached (10/day).`, sender);
    }
  } else {
    // General limit and premium-only checks
    if (!(await checkAndConsumeLimit(sender, context))) {
      if (
        prem.premiumOnly.includes(cmd.pattern) ||
        prem.premiumOnly.includes(cmd.filename) ||
        prem.premiumOnly.includes(cmd.category)
      ) {
        return sendC(`❌ ꜱᴏʀʀʏ *${pushname}* ᴘʀᴇᴍɪᴜᴍ ᴏɴʟʏ. ᴜꜱᴇ .ʙᴜʏᴘʀᴇᴍ ᴛᴏ ɢᴇᴛ ᴘʀᴇᴍɪᴜᴍ ᴀᴄᴄᴇꜱꜱ.`, sender);
      } else {
        return sendC(`❌ ꜱᴏʀʀʏ *${pushname}* ʏᴏᴜ ᴅᴀɪʟʏ ʟɪᴍɪᴛ ʜᴀꜱ ʙᴇᴇɴ ʀᴇᴀᴄʜᴇᴅ. ᴜꜱᴇ .ʙᴜʏᴘʀᴇᴍ ᴛᴏ ᴜɴʟᴏᴄᴋ.`, sender);
      }
    }
  }

  // Command execution with error trap
  try {
    await cmd.function(conn, mek, m, {
      from, quoted, body, isCmd, command: cmdName, args, q, isGroup, sender, senderNumber, botNumber, pushname, isMe, isOwner, isSudo, creator,
      groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, adReplyCtx, BASIL_IMG, BASIL, reply, sendC, sendI, sendV, sendA
    });
  } catch (e) {
    console.error("[PLUGIN ERROR] " + e);
  }
}

// Always run .on="body" handlers if present
events.commands.map(async (command) => {
  if (body && command.on === "body") {
    command.function(conn, mek, m, {
      from, l, quoted, body, isCmd, command: cmdName, args, q, isGroup, sender, senderNumber, botNumber, pushname, isMe, isOwner, isSudo, creator,
      groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, BASIL_IMG, BASIL, reply, sendC, sendI, sendV, adReplyCtx, sendA
    });
  }
});

}

module.exports = { connectBASIL };
