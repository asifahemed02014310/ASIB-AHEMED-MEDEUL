module.exports = {
  config: {
    name: "fuck you",
    version: "1.0",
    author: "Nur Hamim",
    countDown: 0,
    role: 0,
    shortDescription: "no prefix",
    longDescription: "no prefix",
    category: "no prefix",
  },
  
  onStart: async function() {
    
  },

  onChat: async function ({ event, message }) {
    if (event.body && /f[\W_]*[u@]([\W_]*[c@])?[\W_]*k[\W_]*[y@]?[o0]?[u@]?/i.test(event.body)) {
      try {
        return await message.reply({
          body: "𝗙𝘂𝗰𝗸 𝘆𝗼𝘂 𝘁𝗼𝗼🖕",
          attachment: await global.utils.getStreamFromURL("https://i.ibb.co/sdx6kbgX/1747517965749-image.jpg")
        });
      } catch (err) {
        console.error("Error in fuck you module:", err);
        return message.reply("𝗙𝘂𝗰𝗸 𝘆𝗼𝘂 𝘁𝗼𝗼🖕");
      }
    }
  }
};
