const path = require('path');
const fs = require('fs');
const os = require('os');

let qrcode, pino;
try {
  qrcode = require('qrcode');
} catch (e) {
  console.warn('⚠️ qrcode não carregado:', e.message);
}

try {
  pino = require('pino');
} catch (e) {
  console.warn('⚠️ pino não carregado:', e.message);
}

let makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers;
try {
  const baileys = require('@whiskeysockets/baileys');
  makeWASocket = baileys.default || baileys.makeWASocket;
  useMultiFileAuthState = baileys.useMultiFileAuthState;
  DisconnectReason = baileys.DisconnectReason;
  fetchLatestBaileysVersion = baileys.fetchLatestBaileysVersion;
  Browsers = baileys.Browsers;
} catch (e) {
  console.warn('⚠️ @whiskeysockets/baileys não carregado:', e.message);
}

const IS_VERCEL = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const AUTH_DIR = IS_VERCEL ? path.join(os.tmpdir(), 'sure_whatsapp_auth') : path.join(__dirname, 'data', 'whatsapp_auth');
const AVATAR_FILE = path.join(__dirname, 'data', 'sure_group_avatar.jpg');
const GENERAL_PHONE = '932022674'; // Conta Geral SURE: +351 932 022 674
const GENERAL_JID = '351932022674@s.whatsapp.net';

class WhatsAppService {
  constructor() {
    this.sock = null;
    this.qrCodeDataUrl = null;
    this.pairingCode = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.userNumber = null;
    this.generalNumber = '932 022 674';
    this.generalJid = GENERAL_JID;
    this.lastError = null;
  }

  formatPhoneJid(rawPhone) {
    if (!rawPhone) return null;
    let digits = String(rawPhone).replace(/\D/g, '');
    if (!digits) return null;

    if (digits.startsWith('00')) {
      digits = digits.substring(2);
    }

    if (digits.length === 9 && (digits.startsWith('9') || digits.startsWith('2') || digits.startsWith('3'))) {
      digits = '351' + digits;
    }

    return `${digits}@s.whatsapp.net`;
  }

  formatDisplayPhone(rawPhone) {
    if (!rawPhone) return '';
    const digits = String(rawPhone).replace(/\D/g, '');
    if (digits.length === 9) {
      return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    }
    if (digits.length === 12 && digits.startsWith('351')) {
      const p = digits.slice(3);
      return `+351 ${p.slice(0, 3)} ${p.slice(3, 6)} ${p.slice(6)}`;
    }
    return rawPhone;
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      qrCodeDataUrl: this.qrCodeDataUrl,
      pairingCode: this.pairingCode,
      userNumber: this.userNumber,
      generalNumber: this.generalNumber,
      generalJid: this.generalJid,
      lastError: this.lastError
    };
  }

  async _initSocket(forceClean = false) {
    if (!makeWASocket || !useMultiFileAuthState) {
      throw new Error('Módulo Baileys não disponível');
    }

    if (forceClean && fs.existsSync(AUTH_DIR)) {
      try {
        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
      } catch (e) {}
    }

    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    let version = [2, 3000, 1043857760];
    try {
      if (fetchLatestBaileysVersion) {
        const v = await fetchLatestBaileysVersion();
        if (v && v.version) version = v.version;
      }
    } catch (e) {}

    const browserTuple = Browsers ? Browsers.ubuntu('Chrome') : ['Ubuntu', 'Chrome', '22.04.4'];

    const sock = makeWASocket({
      version,
      auth: state,
      logger: pino ? pino({ level: 'silent' }) : undefined,
      printQRInTerminal: false,
      browser: browserTuple,
      syncFullHistory: false,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 25000
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          if (qrcode) {
            this.qrCodeDataUrl = await qrcode.toDataURL(qr, { margin: 2, scale: 8 });
          }
          this.isConnecting = true;
          console.log('⚡ Novo QR Code WhatsApp gerado pronto para leitura');
        } catch (qrErr) {
          console.error('Erro ao gerar QR Base64:', qrErr);
        }
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason?.loggedOut;
        this.isConnected = false;
        this.isConnecting = false;
        this.qrCodeDataUrl = null;
        this.pairingCode = null;
        this.userNumber = null;
        this.lastError = lastDisconnect?.error?.message || 'Conexão terminada';

        console.log(`⚠️ Conexão WhatsApp encerrada (code: ${statusCode}). Reconectar? ${shouldReconnect}`);

        if (statusCode === DisconnectReason?.loggedOut) {
          try {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
          } catch (e) {}
        }
      } else if (connection === 'open') {
        this.isConnected = true;
        this.isConnecting = false;
        this.qrCodeDataUrl = null;
        this.pairingCode = null;
        this.lastError = null;

        const userJid = sock.user?.id || '';
        this.userNumber = userJid.split(':')[0] || userJid.split('@')[0];
        console.log(`✅ WhatsApp conectado com sucesso! Número ativo: ${this.userNumber}`);
      }
    });

    this.sock = sock;
    return sock;
  }

  async connect(forceClean = false) {
    if (this.sock && this.isConnected) {
      return { success: true, message: 'Já conectado!', status: this.getStatus() };
    }

    this.isConnecting = true;
    this.lastError = null;
    this.pairingCode = null;

    await this._initSocket(forceClean);

    return { success: true, message: 'Processo de conexão iniciado.', status: this.getStatus() };
  }

  async requestPairingCode(phoneNumber = GENERAL_PHONE) {
    if (this.sock && this.isConnected) {
      return { success: true, message: 'Já conectado!', status: this.getStatus() };
    }

    let digits = String(phoneNumber || GENERAL_PHONE).replace(/\D/g, '');
    if (digits.startsWith('00')) digits = digits.substring(2);
    if (digits.length === 9 && (digits.startsWith('9') || digits.startsWith('2') || digits.startsWith('3'))) {
      digits = '351' + digits;
    }

    this.isConnecting = true;
    this.lastError = null;
    this.qrCodeDataUrl = null;

    if (!this.sock) {
      await this._initSocket(true);
    }

    await new Promise(r => setTimeout(r, 1500));

    try {
      const code = await this.sock.requestPairingCode(digits);
      const formattedCode = code ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
      this.pairingCode = formattedCode;
      console.log(`📲 Código de emparelhamento WhatsApp gerado para ${digits}: ${formattedCode}`);
      return {
        success: true,
        pairingCode: formattedCode,
        rawCode: code,
        phone: digits,
        status: this.getStatus()
      };
    } catch (err) {
      console.error('Erro ao pedir pairing code:', err);
      this.lastError = err.message;
      return {
        success: false,
        error: err.message,
        status: this.getStatus()
      };
    }
  }

  async disconnect() {
    if (this.sock) {
      try {
        await this.sock.logout();
      } catch (e) {}
      this.sock = null;
    }
    this.isConnected = false;
    this.isConnecting = false;
    this.qrCodeDataUrl = null;
    this.pairingCode = null;
    this.userNumber = null;
    try {
      if (fs.existsSync(AUTH_DIR)) {
        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
      }
    } catch (e) {}
    return { success: true, message: 'WhatsApp desconectado com sucesso.' };
  }

  async getGroupPicture(groupId) {
    if (!this.sock || !this.isConnected || !groupId) return null;
    try {
      const url = await this.sock.profilePictureUrl(groupId, 'image');
      return url;
    } catch (e) {
      return null;
    }
  }

  async createOrGetClientGroup(client, consultant, customClientPhone = null, customConsultantPhone = null) {
    if (!this.sock || !this.isConnected) {
      throw new Error('WhatsApp não está conectado. Conecte-o primeiro escaneando o QR Code ou inserindo o Código de Emparelhamento.');
    }

    const groupTitle = `[SURE] ${(client.name || 'Cliente').trim()}`.substring(0, 80);

    if (client.whatsapp_group_id) {
      try {
        const groupMeta = await this.sock.groupMetadata(client.whatsapp_group_id);
        if (groupMeta && groupMeta.id) {
          console.log(`Reutilizando grupo existente: ${groupMeta.subject} (${groupMeta.id})`);

          let groupPictureUrl = null;
          try {
            groupPictureUrl = await this.sock.profilePictureUrl(groupMeta.id, 'image');
          } catch (pErr) {}

          if (!groupPictureUrl && fs.existsSync(AVATAR_FILE)) {
            try {
              const avatarBuffer = fs.readFileSync(AVATAR_FILE);
              await this.sock.updateProfilePicture(groupMeta.id, avatarBuffer);
              groupPictureUrl = await this.sock.profilePictureUrl(groupMeta.id, 'image').catch(() => null);
            } catch (pSetErr) {}
          }

          let inviteLink = client.whatsapp_group_link;
          if (!inviteLink) {
            try {
              const code = await this.sock.groupInviteCode(groupMeta.id);
              inviteLink = `https://chat.whatsapp.com/${code}`;
            } catch (e) {}
          }

          return {
            groupId: groupMeta.id,
            groupTitle: groupMeta.subject,
            inviteLink: inviteLink || '',
            groupPictureUrl: groupPictureUrl || '/assets/sure_group_avatar.jpg',
            isNew: false
          };
        }
      } catch (e) {
        console.log('Grupo anterior não acessível, a criar um novo grupo...');
      }
    }

    const clientPhone = customClientPhone || client.phone;
    const consultantPhone = customConsultantPhone || (consultant && consultant.phone);

    const clientJid = this.formatPhoneJid(clientPhone);
    const consultantJid = this.formatPhoneJid(consultantPhone);
    const generalJid = this.generalJid;

    const participantsSet = new Set();

    const currentBotJid = this.formatPhoneJid(this.userNumber);
    if (generalJid && generalJid !== currentBotJid) {
      participantsSet.add(generalJid);
    }

    if (consultantJid && consultantJid !== currentBotJid) {
      participantsSet.add(consultantJid);
    }

    if (clientJid && clientJid !== currentBotJid) {
      participantsSet.add(clientJid);
    }

    const participants = Array.from(participantsSet);
    console.log(`Criando grupo "${groupTitle}" com participantes:`, participants);

    const group = await this.sock.groupCreate(groupTitle, participants);
    console.log(`✅ Grupo criado com sucesso! ID: ${group.id}`);

    let groupPictureUrl = null;
    if (fs.existsSync(AVATAR_FILE)) {
      try {
        const avatarBuffer = fs.readFileSync(AVATAR_FILE);
        await this.sock.updateProfilePicture(group.id, avatarBuffer);
        console.log('✅ Foto de perfil do grupo SURE definida com sucesso!');
        try {
          groupPictureUrl = await this.sock.profilePictureUrl(group.id, 'image');
        } catch (e) {}
      } catch (imgErr) {
        console.warn('Aviso ao definir foto de perfil do grupo:', imgErr.message);
      }
    }

    let inviteLink = '';
    try {
      const code = await this.sock.groupInviteCode(group.id);
      inviteLink = `https://chat.whatsapp.com/${code}`;
    } catch (invErr) {
      console.warn('Aviso ao obter link de convite:', invErr.message);
    }

    return {
      groupId: group.id,
      groupTitle,
      inviteLink,
      groupPictureUrl: groupPictureUrl || '/assets/sure_group_avatar.jpg',
      participants,
      isNew: true
    };
  }

  async sendApprovedOptions(groupId, client, listings, introText, consultant) {
    if (!this.sock || !this.isConnected) {
      throw new Error('WhatsApp não está conectado.');
    }
    if (!groupId) {
      throw new Error('ID do grupo WhatsApp não fornecido.');
    }
    if (!listings || listings.length === 0) {
      throw new Error('Nenhum imóvel selecionado para envio.');
    }

    const consultantName = (consultant && consultant.name) || 'Consultor SURE';

    const defaultIntro = `👋 Olá ${client.name}!\n\n` +
      `Criámos este grupo de acompanhamento com o seu consultor dedicado (*${consultantName}*) e a equipa *SURE. Real Estate*.\n\n` +
      `Selecionámos criteriosamente as melhores opções de imóveis de acordo com o que procura. Veja abaixo os detalhes e partilhe connosco o seu feedback:`;

    const finalIntro = introText && introText.trim() ? introText.trim() : defaultIntro;

    await this.sock.sendMessage(groupId, { text: finalIntro });

    await new Promise(r => setTimeout(r, 1500));

    const sentResults = [];
    for (let i = 0; i < listings.length; i++) {
      const l = listings[i];
      const indexNum = i + 1;

      const title = l.title || 'Imóvel em Destaque';
      const price = l.price || 'Consultar €';
      const location = l.location || client.location || 'Localização sob consulta';
      const typology = l.typology ? ` • ${l.typology.toUpperCase()}` : '';
      const area = l.area ? ` • ${l.area}` : '';
      const link = l.link || '';

      const caption = `🏡 *Opção ${indexNum}* — *${title}*\n\n` +
        `💰 *Preço:* ${price}\n` +
        `📍 *Localização:* ${location}${typology}${area}\n` +
        (l.specs && l.specs.length > 0 ? `✨ *Características:* ${l.specs.slice(0, 4).join(', ')}\n` : '') +
        (link ? `\n🔗 *Ver Anúncio Completo:* ${link}` : '');

      const photoUrl = (l.photos && l.photos.length > 0 ? l.photos[0] : null) || l.img || null;

      try {
        if (photoUrl && (photoUrl.startsWith('http://') || photoUrl.startsWith('https://'))) {
          await this.sock.sendMessage(groupId, {
            image: { url: photoUrl },
            caption: caption
          });
        } else {
          await this.sock.sendMessage(groupId, { text: caption });
        }
        sentResults.push({ id: l.id, success: true });
      } catch (sendErr) {
        console.warn(`Erro ao enviar imóvel ${l.id} com foto:`, sendErr.message);
        try {
          await this.sock.sendMessage(groupId, { text: caption });
          sentResults.push({ id: l.id, success: true, fallback: true });
        } catch (textErr) {
          sentResults.push({ id: l.id, success: false, error: textErr.message });
        }
      }

      if (i < listings.length - 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    return {
      success: true,
      totalSent: sentResults.filter(r => r.success).length,
      groupId,
      sentResults
    };
  }
}

const whatsappService = new WhatsAppService();

if (fs.existsSync(AUTH_DIR)) {
  const files = fs.readdirSync(AUTH_DIR);
  if (files.length > 0 && files.some(f => f.includes('creds.json'))) {
    whatsappService.connect().catch(err => {
      console.log('Aviso ao inicializar WhatsApp em background:', err.message);
    });
  }
}

module.exports = whatsappService;
