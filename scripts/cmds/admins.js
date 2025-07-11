const { config } = global.GoatBot;

module.exports = {
  config: {
    name: "admin",
    version: "1.6",
    author: "Nur Hamim",
    countDown: 2,
    role: 0,
    category: "𝗢𝗪𝗡𝗘𝗥 𝗜𝗡𝗙𝗢𝗥𝗠𝗔𝗧𝗜𝗢𝗡",
    guide: {
      en: "{pn} [list | -l]: Display the list of all bot admins"
    }
  },

  langs: {
    en: {
      listAdmin:
        "╔═━「 🛡️ 𝑽𝑰𝑿𝑨'𝒔 𝑨𝑫𝑴𝑰𝑵𝑺 」━═╗" +
        "\n\n✨ 𝑶𝒘𝒏𝒆𝒓 ~ 𝑯𝒂𝒎𝒊𝒎" +
        "\n\n%1" +
        "\n\n𝗙𝗕 : 🤖🤖"+
        "\n\n╚═━「 💌 𝑪𝒐𝒏𝒕𝒂𝒄𝒕 𝒇𝒐𝒓 𝒔𝒖𝒑𝒑𝒐𝒓𝒕 」━═╝",
      noAdmins: "⚠️ 𝙉𝙤 𝙖𝙙𝙢𝙞𝙣𝙨..!",
      wrongCmd: "⚠️ 𝐖𝐫𝐨𝐧𝐠 𝐜𝐨𝐦𝐦𝐚𝐧𝐝..!\n𝐓𝐫𝐲:\nadmin list\nadmin -l"
    }
  },

  onStart: async function ({ message, args, usersData, getLang }) {
    const subCommand = args[0];
    if (!["list", "-l"].includes(subCommand)) {
      return message.reply(getLang("wrongCmd"));
    }

    // Get admins from database
    const allUsers = await usersData.getAll();
    const databaseAdmins = [];
    
    for (const [uid, userData] of allUsers) {
      if (userData.data && userData.data.isAdmin) {
        databaseAdmins.push(uid);
      }
    }

    // Get admins from config (for backward compatibility)
    const configAdmins = config.adminBot || [];
    
    // Combine both sources and remove duplicates
    const allAdmins = [...new Set([...databaseAdmins, ...configAdmins])];

    if (allAdmins.length === 0) {
      return message.reply(getLang("noAdmins"));
    }

    const emojis = ["🥇", "🥈", "🥉", "️🎖️", "🎀", "🌟"];

    const adminNames = await Promise.all(
      allAdmins.map(async (uid, index) => {
        const name = await usersData.getName(uid);
        const userData = await usersData.get(uid);
        const isDbAdmin = userData && userData.data && userData.data.isAdmin;
        const adminType = isDbAdmin ? "DB" : "config";
        
        return `${emojis[index % emojis.length]} ${name}\n     ➥UID: (${uid})\n     ➥Type: ${adminType}`;
      })
    );

    return message.reply(getLang("listAdmin", adminNames.join("\n\n")));
  }
};
