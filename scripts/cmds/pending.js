const axios = require("axios");
const fs = require("fs");

module.exports = {
  config: {
    name: "pending",
    aliases: ["pen", "pend", "pe"],
    version: "1.6.9",
    author: "𝗡𝘂𝗿",
    countDown: 5,
    role: 2,
    shortDescription: "handle pending requests",
    longDescription: "Approve orreject pending users or group requests",
    category: "admin",
  },

  onReply: async function ({ message, api, event, Reply }) {
    const { author, pending, messageID } = Reply;
    if (String(event.senderID) !== String(author)) return;

    const { body, threadID } = event;

    if (body.trim().toLowerCase() === "c") {
      try {
        await api.unsendMessage(messageID);
        return api.sendMessage(
          ` Operation has been canceled!`,
          threadID
        );
      } catch {
        return;
      }
    }

    const indexes = body.split(/\s+/).map(Number);

    if (isNaN(indexes[0])) {
      return api.sendMessage(`⚠ Invalid input! Please try again.`, threadID);
    }

    let count = 0;

    for (const idx of indexes) {
 
      if (idx <= 0 || idx > pending.length) continue;

      const group = pending[idx - 1];

      try {
        await api.sendMessage(
          `✅𝗥𝗲𝗾𝘂𝗲𝘀𝘁 𝗮𝗽𝗽𝗿𝗼𝘃𝗲𝗱 𝗯𝘆 𝗡𝘂𝗿 𝗛𝗮𝗺𝗶𝗺 𝗕𝗮𝗱𝗵𝗼𝗻\n\n📜 𝗧𝘆𝗽𝗲 ${global.GoatBot.config.prefix}Help 𝘁𝗼 𝘃𝗶𝗲𝘄 𝗰𝗼𝗺𝗺𝗮𝗻𝗱𝘀`,
          group.threadID
        );

        await api.changeNickname(
          `${global.GoatBot.config.nickNameBot || ""}`,
          group.threadID,
          api.getCurrentUserID()
        );

        count++;
      } catch {
  
        count++;
      }
    }

    for (const idx of indexes.sort((a, b) => b - a)) {
      if (idx > 0 && idx <= pending.length) {
        pending.splice(idx - 1, 1);
      }
    }

    return api.sendMessage(
      `✅ | [ Successfully ] 🎉 Approved ${count} Groups✨!`,
      threadID
    );
  },

  onStart: async function ({ api, event, args, usersData }) {
    const { threadID, messageID } = event;
    const adminBot = global.GoatBot.config.adminBot;

    if (!adminBot.includes(event.senderID)) {
      return api.sendMessage(
        `⚠ you have no permission to use this command!`,
        threadID
      );
    }

    const type = args[0]?.toLowerCase();
    if (!type) {
      return api.sendMessage(
        `Usage: pending [user/thread/all]`,
        threadID
      );
    }

    let msg = "",
      index = 1;
    try {
      const spam = (await api.getThreadList(100, null, ["OTHER"])) || [];
      const pending = (await api.getThreadList(100, null, ["PENDING"])) || [];
      const list = [...spam, ...pending];

      let filteredList = [];
      if (type.startsWith("u")) filteredList = list.filter((t) => !t.isGroup);
      if (type.startsWith("t")) filteredList = list.filter((t) => t.isGroup);
      if (type === "all") filteredList = list;

      for (const single of filteredList) {
        const name =
          single.name || (await usersData.getName(single.threadID)) || "Unknown";

        msg += `[ ${index} ]  ${name}\n`;
        index++;
      }

      msg += `⚠️𝗥𝗲𝗽𝗹𝘆 𝘄𝗶𝘁𝗵 𝘁𝗵𝗲 𝗴𝗿𝗼𝘂𝗽 𝗻𝘂𝗺𝗯𝗲𝗿 𝘁𝗼 𝗮𝗽𝗽𝗿𝗼𝘃𝗲\n`;
      msg += `⚠️ 𝗥𝗲𝗽𝗹𝘆 𝘄𝗶𝘁𝗵 "c" 𝘁𝗼 𝗰𝗮𝗻𝗰𝗲𝗹.\n`;

      return api.sendMessage(
        `⚠️ | [𝗣𝗲𝗻𝗱𝗶𝗻𝗴 𝗚𝗿𝗼𝘂𝗽𝘀 & 𝗨𝘀𝗲𝗿𝘀 ${type
          .charAt(0)
          .toUpperCase()}${type.slice(1)} ]\n\n${msg}`,
        threadID,
        (error, info) => {
          global.GoatBot.onReply.set(info.messageID, {
            commandName: this.config.name,
            messageID: info.messageID,
            author: event.senderID,
            pending: filteredList,
          });
        },
        messageID
      );
    } catch (error) {
      return api.sendMessage(
        `⚠ Failed to retrieve pending list. Please try again later.`,
        threadID
      );
    }
  },
};
