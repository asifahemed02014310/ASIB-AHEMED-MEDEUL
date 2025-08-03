module.exports = {
  config: {
    name: "propose",
    aliases: ["proposal"],
    version: "1.0",
    author: "Kenji",
    countDown: 10,
    role: 0,
    shortDescription: "কারো কাছে প্রপোজ করো",
    longDescription: "কাউকে প্রপোজাল পাঠাও, সে 'yes' বা 'no' (বা বাংলা সমতুল্য) বলতে পারবে",
    category: "love",
    guide: {
      en: "{pn} @mention",
      bn: "{pn} @mention"
    }
  },

  onStart: async function ({ event, api, args, usersData }) {
    const mention = Object.keys(event.mentions)[0];
    const senderID = event.senderID;

    if (!mention)
      return api.sendMessage("কাউকে মেনশন করো যাকে তুমি প্রপোজ করতে চাও!", event.threadID, event.messageID);

    if (mention === senderID)
      return api.sendMessage("❌ তুমি নিজেকেই প্রপোজ করতে পারো না! 🤭", event.threadID, event.messageID);

    const senderName = await usersData.getName(senderID);
    const receiverName = event.mentions[mention];

    const msg = 
`───────────────────
💌 ${senderName} তোমাকে প্রপোজ করছে, ${receiverName} 💗

✨ তুমি কি প্রপোজাল গ্রহণ করবে? 👀

───────────────────
🎀  Reply with '𝐘ᴇs' or '𝐍ᴏ' 🪶`;

    return api.sendMessage(msg, event.threadID, (err, info) => {
      global.GoatBot.onReply.set(info.messageID, {
        commandName: "propose",
        type: "proposal",
        senderID: senderID,
        receiverID: mention
      });
    });
  },

  onReply: async function ({ event, api, Reply, usersData }) {
    const { type, senderID, receiverID } = Reply;
    if (type !== "proposal") return;

    if (event.senderID !== receiverID)
      return api.sendMessage("thappor dibo tomake kotha bolte ke bolche 😾👋🏻", event.threadID, event.messageID);

    const replyText = event.body.toLowerCase();
    const senderName = await usersData.getName(senderID);
    const receiverName = await usersData.getName(receiverID);

    // Accept / Decline keywords
    const acceptWords = ["yes", "হ্যাঁ", "হ্যা", "humm", "hum"];
    const declineWords = ["no", "না", "নাহ", "na", "nah"];

    const isAccept = acceptWords.some(word => replyText.includes(word));
    const isDecline = declineWords.some(word => replyText.includes(word));

    // Message lists
    const acceptMessages = [
      `❤️ ${receiverName} রাজি হয়েছে! শুভকামনা ${senderName} ও ${receiverName} কে😉।`,
      `💕 She said yes! Congrats to the new couple 💑`,
      `💌 হ্যাঁ বলেছে ${receiverName}! তাদের যাত্রা শুরু হোক ভালোবাসার পথে। 🫂`,
      `✨ Yes! ${receiverName} ও ${senderName} এখন একসাথে 💖`,
      `💞 "Yes" এসেছে ${receiverName} এর কাছ থেকে! অভিনন্দন ${receiverName} ও ${senderName} কে 🌷`,
      `💖 ${receiverName} বলল “Yes”! তাদের ভালোবাসার গল্প শুরু হলো আজ থেকে। 💗`,
      `🎉 ${receiverName} রাজি! শুভকামনা ${senderName} ও ${receiverName} এর জন্য। 🌹`,
      `🌸 Yes! ${receiverName} ও ${senderName} এর মিলন হোক চিরস্থায়ী। 💫`,
      `💍 “Yes” – আজ থেকে তাদের প্রেমের যাত্রা নতুন গতি পাবে। 💞`,
      `🥂 ${receiverName} রাজি, ${senderName} ও ${receiverName} এর জন্য এক নতুন অধ্যায় শুরু! 🎀`
    ];

    const declineMessages = [
      ` ${receiverName} প্রপোজাল ফিরিয়ে দিয়েছে...`,
      `😞 ${receiverName} রাজি নয়, শক্ত থাকো ${senderName} 🥲`,
      `💔 ${receiverName} বলেছে "No"... হতাশ না হও, ${senderName}।`,
      `🕊️ প্রপোজাল ফিরিয়ে দিয়েছে ${receiverName}... 🥺।`
    ];

    const acceptGifs = [
      "https://i.postimg.cc/XJGqHdkw/7cd22b8dfbe0a4162f4542cead740c74.gif",
      "https://i.postimg.cc/jjjLfGW3/aesthetic-anime-wedding-5k5wfvexjmp35jpx.gif",
      "https://i.postimg.cc/Mp5nvWGj/Messenger-creation-1777529646178218.jpg",
      "https://i.postimg.cc/nLwMG0BF/tumblr-nwfxg0h-OFy1ujw7olo4-500.gif"
    ];

    const declineGifs = [
      "https://i.postimg.cc/jdxzdkx2/cat-kitty.gif",
      "https://i.postimg.cc/9Xtd2jjs/emote.gif",
      "https://i.postimg.cc/X7t7DpzW/animated-sad-image-0029.gif",
      "https://i.postimg.cc/2Sv8prsZ/eea143ba06f716e3b44ff5bb26d5e0d5.gif"
    ];

    if (isAccept) {
      const msg = {
        body: acceptMessages[Math.floor(Math.random() * acceptMessages.length)],
        attachment: await global.utils.getStreamFromURL(
          acceptGifs[Math.floor(Math.random() * acceptGifs.length)]
        )
      };
      return api.sendMessage(msg, event.threadID).catch(() =>
        api.sendMessage(msg.body, event.threadID)
      );
    } else if (isDecline) {
      const msg = {
        body: declineMessages[Math.floor(Math.random() * declineMessages.length)],
        attachment: await global.utils.getStreamFromURL(
          declineGifs[Math.floor(Math.random() * declineGifs.length)]
        )
      };
      return api.sendMessage(msg, event.threadID).catch(() =>
        api.sendMessage(msg.body, event.threadID)
      );
    } else {
      return api.sendMessage("'𝐘ᴇs' 😾 '𝐍ᴏ'", event.threadID, event.messageID);
    }
  }
};
