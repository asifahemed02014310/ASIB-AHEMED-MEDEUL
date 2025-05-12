module.exports = {
  config: {
    name: "spam",
    aliases : ["bolo","bol","b","s"],
    author: "nur",
    role: 2,
    shortDescription: "Spam messages with various options",
    longDescription: "Spam messages with customizable count and mentioning users",
    category: "owner",
    guide: "{pn} [amount] [message]\n{pn} [message] (defaults to 1 spam)"
  },

  onStart: async function ({ api, event, args }) {
    let amount = 1; 
    let message = '';
    let mentionTag = [];
    let targetThreadID = event.threadID;
    if (!isNaN(parseInt(args[0]))) {
      amount = parseInt(args[0]);
      message = args.slice(1).join(" ");
    } else {
      message = args.join(" ");
    }

    if (!message) {
      return api.sendMessage("Please provide a message to spam.", event.threadID);
    }

    if (event.mentions) {
      const mentions = Object.keys(event.mentions);
      if (mentions.length > 0) {
        mentionTag = mentions.map(mention => ({
          tag: event.mentions[mention],
          id: mention
        }));
      }
    }

    const messageOptions = {
      body: message,
      mentions: mentionTag.length > 0 ? mentionTag : undefined
    };

    for (let i = 0; i < amount; i++) {
      await api.sendMessage(messageOptions, targetThreadID);
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  },
};
