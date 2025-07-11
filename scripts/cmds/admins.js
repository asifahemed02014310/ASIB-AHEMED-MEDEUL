const { config } = global.GoatBot;
const { MongoClient } = require('mongodb');

// Database connection
let db;
async function connectDB() {
  if (!db) {
    const client = new MongoClient(config.uriMongodb);
    await client.connect();
    db = client.db();
  }
  return db;
}

// Get hidden admins from database
async function getHiddenAdmins() {
  try {
    const database = await connectDB();
    const collection = database.collection('hiddenAdmins');
    const result = await collection.findOne({ _id: 'hiddenAdminsList' });
    return result ? result.admins : [];
  } catch (error) {
    console.error('Error getting hidden admins:', error);
    return [];
  }
}

// Save hidden admins to database
async function saveHiddenAdmins(hiddenAdmins) {
  try {
    const database = await connectDB();
    const collection = database.collection('hiddenAdmins');
    await collection.replaceOne(
      { _id: 'hiddenAdminsList' },
      { _id: 'hiddenAdminsList', admins: hiddenAdmins },
      { upsert: true }
    );
  } catch (error) {
    console.error('Error saving hidden admins:', error);
  }
}

module.exports = {
  config: {
    name: "admin",
    version: "1.5",
    author: "Hamim",
    countDown: 2,
    role: 0,
    category: "𝗢𝗪𝗡𝗘𝗥 𝗜𝗡𝗙𝗢𝗥𝗠𝗔𝗧𝗜𝗢𝗡",
    guide: {
      en: "{pn}: Display the list of all bot admins\n{pn} -h/hide <uid/@tag>: Hide admin from list (Owner only)\n{pn} unhide <uid/@tag>: Unhide admin from list (Owner only)\n{pn} all: Show all admins including hidden ones (Owner only)\n{pn} hidden: Show only hidden admins (Owner only)"
    }
  },

  langs: {
    en: {
      listAdmin:
        "╔═━「 🛡️ 𝑽𝑰𝑿𝑨'𝒔 𝑨𝑫𝑴𝑰𝑵𝑺 」━═╗" +
        "\n\n✨ 𝑶𝒘𝒏𝒆𝒓 ~ 𝑯𝒂𝒎𝒊𝒎" +
        "\n\n%1" +
        "\n\n𝗙𝗕 : m.me/access.denied.1233"+
        "\n\n╚═━「 💌 𝑪𝒐𝒏𝒕𝒂𝒄𝒕 𝒇𝒐𝒓 𝒔𝒖𝒑𝒑𝒐𝒓𝒕 」━═╝",
      listAllAdmin:
        "╔═━「 🛡️ 𝑽𝑰𝑿𝑨'𝒔 𝑨𝑳𝑳 𝑨𝑫𝑴𝑰𝑵𝑺 」━═╗" +
        "\n\n✨ 𝑶𝒘𝒏𝒆𝒓 ~ 𝑯𝒂𝒎𝒊𝒎" +
        "\n\n%1" +
        "\n\n𝗙𝗕 : m.me/access.denied.1233"+
        "\n\n╚═━「 💌 𝑪𝒐𝒏𝒕𝒂𝒄𝒕 𝒇𝒐𝒓 𝒔𝒖𝒑𝒑𝒐𝒓𝒕 」━═╝",
      listHiddenAdmin:
        "╔═━「 🔒 𝑽𝑰𝑿𝑨'𝒔 𝑯𝑰𝑫𝑫𝑬𝑵 𝑨𝑫𝑴𝑰𝑵𝑺 」━═╗" +
        "\n\n✨ 𝑶𝒘𝒏𝒆𝒓 ~ 𝑯𝒂𝒎𝒊𝒎" +
        "\n\n%1" +
        "\n\n𝗙𝗕 : m.me/access.denied.1233"+
        "\n\n╚═━「 💌 𝑪𝒐𝒏𝒕𝒂𝒄𝒕 𝒇𝒐𝒓 𝒔𝒖𝒑𝒑𝒐𝒓𝒕 」━═╝",
      noAdmins: "⚠️ 𝙉𝙤 𝙖𝙙𝙢𝙞𝙣𝙨..!",
      adminHidden: "✅ Admin has been hidden from the list",
      adminUnhidden: "✅ Admin has been unhidden from the list",
      adminNotFound: "❌ Admin not found in the list",
      invalidUID: "❌ Invalid UID provided",
      noHiddenAdmins: "ℹ️ No hidden admins found",
      alreadyHidden: "⚠️ Admin is already hidden",
      notHidden: "⚠️ Admin is not hidden"
    }
  },

  onStart: async function ({ message, args, usersData, getLang, event }) {
    const senderID = event.senderID;
    const ownerIds = config.ownerBot || [];
    const isOwner = ownerIds.includes(senderID);

    const subCommand = args[0];
    
    // If non-owner tries to use owner-only commands, show normal admin list
    if (!isOwner && (subCommand === "-h" || subCommand === "hide" || subCommand === "unhide" || subCommand === "all" || subCommand === "hidden")) {
      return await showAdminList(message, usersData, getLang, false);
    }

    // Handle owner-only commands
    if (isOwner) {
      if (subCommand === "-h" || subCommand === "hide") {
        return await hideAdmin(message, args, usersData, getLang);
      }
      
      if (subCommand === "unhide") {
        return await unhideAdmin(message, args, usersData, getLang);
      }
      
      if (subCommand === "all") {
        return await showAdminList(message, usersData, getLang, true);
      }
      
      if (subCommand === "hidden") {
        return await showHiddenAdmins(message, usersData, getLang);
      }
    }

    // Default: show normal admin list
    return await showAdminList(message, usersData, getLang, false);

    // Helper function to show hidden admins only
    async function showHiddenAdmins(message, usersData, getLang) {
      const adminIds = config.adminBot || [];
      const hiddenAdmins = await getHiddenAdmins();

      if (hiddenAdmins.length === 0) {
        return message.reply(getLang("noHiddenAdmins"));
      }

      // Filter only hidden admins that are still in the admin list
      const validHiddenAdmins = hiddenAdmins.filter(id => adminIds.includes(id));

      if (validHiddenAdmins.length === 0) {
        return message.reply(getLang("noHiddenAdmins"));
      }

      const emojis = ["🔒", "🔐", "🗝️", "🔓", "🛡️", "🔑"];

      const adminNames = await Promise.all(
        validHiddenAdmins.map(async (uid, index) => {
          const name = await usersData.getName(uid);
          return `${emojis[index % emojis.length]} ${name} (Hidden)\n     ➥UID: (${uid})`;
        })
      );

      return message.reply(getLang("listHiddenAdmin", adminNames.join("\n\n")));
    }

    // Helper function to show admin list
    async function showAdminList(message, usersData, getLang, showAll) {
      const adminIds = config.adminBot || [];
      const hiddenAdmins = await getHiddenAdmins();

      if (adminIds.length === 0) {
        return message.reply(getLang("noAdmins"));
      }

      let visibleAdmins = adminIds;
      if (!showAll) {
        visibleAdmins = adminIds.filter(id => !hiddenAdmins.includes(id));
      }

      if (visibleAdmins.length === 0 && !showAll) {
        return message.reply(getLang("noAdmins"));
      }

      const emojis = ["🥇", "🥈", "🥉", "️🎖️", "🎀", "🌟"];

      const adminNames = await Promise.all(
        visibleAdmins.map(async (uid, index) => {
          const name = await usersData.getName(uid);
          const hiddenStatus = hiddenAdmins.includes(uid) ? " (Hidden)" : "";
          return `${emojis[index % emojis.length]} ${name}${hiddenStatus}\n     ➥UID: (${uid})`;
        })
      );

      const langKey = showAll ? "listAllAdmin" : "listAdmin";
      return message.reply(getLang(langKey, adminNames.join("\n\n")));
    }

    // Helper function to hide admin
    async function hideAdmin(message, args, usersData, getLang) {
      const targetUID = getUIDFromArgs(args.slice(1), message);
      if (!targetUID) {
        return message.reply(getLang("invalidUID"));
      }

      const adminIds = config.adminBot || [];
      if (!adminIds.includes(targetUID)) {
        return message.reply(getLang("adminNotFound"));
      }

      const hiddenAdmins = await getHiddenAdmins();
      
      if (hiddenAdmins.includes(targetUID)) {
        return message.reply(getLang("alreadyHidden"));
      }

      hiddenAdmins.push(targetUID);
      await saveHiddenAdmins(hiddenAdmins);

      return message.reply(getLang("adminHidden"));
    }

    // Helper function to unhide admin
    async function unhideAdmin(message, args, usersData, getLang) {
      const targetUID = getUIDFromArgs(args.slice(1), message);
      if (!targetUID) {
        return message.reply(getLang("invalidUID"));
      }

      const hiddenAdmins = await getHiddenAdmins();
      const index = hiddenAdmins.indexOf(targetUID);
      
      if (index === -1) {
        return message.reply(getLang("notHidden"));
      }

      hiddenAdmins.splice(index, 1);
      await saveHiddenAdmins(hiddenAdmins);

      return message.reply(getLang("adminUnhidden"));
    }

    // Helper function to extract UID from arguments
    function getUIDFromArgs(args, message) {
      if (args.length === 0) return null;

      const input = args.join(" ");
      
      // Check if it's a mention
      if (message.mentions && Object.keys(message.mentions).length > 0) {
        return Object.keys(message.mentions)[0];
      }

      // Check if it's a direct UID
      if (/^\d+$/.test(input)) {
        return input;
      }

      return null;
    }
  }
};
