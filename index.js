

import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState
} from '@whiskeysockets/baileys';
import pino from 'pino';

async function startBot() {
  const { state, saveCreds } =
    await useMultiFileAuthState('auth_info');

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    browser: ['APEX-MX-BOT', 'Chrome', '1.0.0']
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('Scan the QR code to connect WhatsApp.');
    }

    if (connection === 'open') {
      console.log('APEX-MX-BOT is online!');
    }

    if (connection === 'close') {
      const status = lastDisconnect?.error?.output?.statusCode;

      if (status !== DisconnectReason.loggedOut) {
        startBot();
      } else {
        console.log('WhatsApp logged out. Reconnect manually.');
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const jid = msg.key.remoteJid;
      if (!jid || jid === 'status@broadcast') continue;

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text || '';

      const command = text.trim().toLowerCase();

      if (command === '.ping') {
        await sock.sendMessage(jid, { text: 'Pong! ⚡ APEX-MX-BOT is online.' });
      } else if (command === '.menu') {
        await sock.sendMessage(jid, {
          text: `🤖 APEX-MX-BOT

.ping — Check bot status
.menu — Show commands
.owner — Bot creator

Built by APEX ⚡`
        });
      } else if (command === '.owner') {
        await sock.sendMessage(jid, {
          text: 'Bot creator: APEX ⚡'
        });
      }
    }
  });
}

startBot().catch(console.error);
