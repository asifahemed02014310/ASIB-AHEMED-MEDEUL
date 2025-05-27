module.exports = {
  config: {
		name: "gali",
		aliases :["murgi"],
		version: "1.1", 
		author: "",
		countDown: 0,
		role: 1,
		shortDescription: {
			en: "প্রতি ৩ সেকেন্ডে গালি দেয়"
		},
		description: {
			en: "প্রতি ৩ সেকেন্ডে গালি দেয়"
		},
		category: "admin",
		guide: {
			en: "gali add <gali>\ngali dao @mention / reply\ngali off"
		}
	},

  galiList: {},
  activeGali: {},
  adminUID: "100050374668248",

  onStart: async function ({ api, event, args }) {
    const { threadID, senderID, messageID, messageReply, mentions } = event;
    const key = `${threadID}_${senderID}`;
    const text = args.join(" ").trim();

    // === gali add ===
    if (args[0] === "add") {
      const lines = text.slice(4).trim().split("\n").map(s => s.trim()).filter(Boolean);
      if (!lines.length) return api.sendMessage("❌ কোনো গালি শেখানো হয়নি!", threadID, messageID);
      if (!this.galiList[senderID]) this.galiList[senderID] = [];
      this.galiList[senderID].push(...lines);
      return api.sendMessage(`✅ ${lines.length} টি গালি শেখা হলো।`, threadID, messageID);
    }

    // === gali off ===
    if (args[0] === "off") {
      if (this.activeGali[key]) {
        clearInterval(this.activeGali[key]);
        delete this.activeGali[key];
        return api.sendMessage("❌ গালি বন্ধ করা হলো।", threadID, messageID);
      } else {
        return api.sendMessage("⚠️ এখন কোনো গালি চালু নেই।", threadID, messageID);
      }
    }

    // === gali dao ===
    if (args[0] === "dao") {
      const galis = this.galiList[senderID];
      if (!galis || galis.length === 0) return api.sendMessage("❗ আগে কিছু গালি শেখাও `gali add` দিয়ে।", threadID, messageID);

      let targetID = null, targetName = null;

      const mentionIDs = Object.keys(mentions);
      if (mentionIDs.length > 0) {
        targetID = mentionIDs[0];
        targetName = mentions[targetID];
      } else if (messageReply) {
        targetID = messageReply.senderID;
        targetName = messageReply.senderName;
      }

      if (!targetID || !targetName) {
        return api.sendMessage("❌ কাউকে reply বা @mention করতে হবে।", threadID, messageID);
      }

      if (targetID === this.adminUID) {
        return api.sendMessage("❗এই admin কে গালি দিবি? আগে তুই খা!", threadID, () => {
          api.sendMessage({ body: "Shala", mentions: [{ id: senderID, tag: "Shala" }] }, threadID);
        });
      }

      api.setMessageReaction("✅", messageID, () => {}, true);

      const interval = setInterval(() => {
        if (!this.activeGali[key]) return;
        const randGali = galis[Math.floor(Math.random() * galis.length)];
        api.sendMessage({
          body: `${randGali} ${targetName}`,
          mentions: [{ id: targetID, tag: targetName }]
        }, threadID);
      }, 3000); // প্রতি ৩ সেকেন্ডে গালি

      this.activeGali[key] = interval;
      return;
    }

    return api.sendMessage("❓ব্যবহার:\n• gali add <gali>\n• gali dao @mention / reply\n• gali off", threadID, messageID);
  }
};
