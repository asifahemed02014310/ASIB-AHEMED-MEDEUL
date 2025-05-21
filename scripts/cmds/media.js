const axios = require("axios");
const mongoose = require("mongoose");

// MongoDB connection string - replace with your actual MongoDB URI
const MONGODB_URI = "mongodb+srv://username:password@cluster.mongodb.net/mediaDB";

// Create the MongoDB schema for media
let mediaSchema;
let Media;

// Connect to MongoDB and initialize model
const connectToDatabase = async () => {
  try {
    if (!mongoose.connection.readyState) {
      await mongoose.connect(MONGODB_URI);
      console.log("Connected to MongoDB for media storage");
    }
    
    // Define schema if not already defined
    if (!mediaSchema) {
      mediaSchema = new mongoose.Schema({
        url: { type: String, required: true },
        name: { type: String, required: true },
        uploadedBy: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
      });
      
      try {
        Media = mongoose.model("Media");
      } catch (e) {
        Media = mongoose.model("Media", mediaSchema);
      }
    }
    
    return true;
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    return false;
  }
};

// Upload file to Imgur via API
const uploadToImgur = async (url) => {
  try {
    // Download the media
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    
    // For Node.js environment, use FormData from form-data package
    const FormData = require('form-data');
    const formData = new FormData();
    
    // Append the buffer directly
    formData.append('image', Buffer.from(response.data), {
      filename: 'image.jpg',
      contentType: 'image/jpeg',
    });
    
    // Send request to the Imgur API service
    const imgurResponse = await axios.post("https://nur-s-api.onrender.com/Nurimg", formData, {
      headers: {
        ...formData.getHeaders()
      }
    });
    
    if (imgurResponse.data && imgurResponse.data.success) {
      return imgurResponse.data.data.url; // Return the direct image URL
    } else {
      throw new Error("Upload failed");
    }
  } catch (error) {
    console.error("Error uploading to Imgur:", error);
    throw error;
  }
};

module.exports = {
  config: {
    name: "media",
    aliases: ["exposs", "joss", "hot"],
    version: "3.0",
    author: "Alamin + ChatGPT + Claude",
    role: 0,
    shortDescription: { en: "Manage images with MongoDB" },
    category: "media",
    guide: {
      en: `{prefix}media => Send random image (no repeat)
{prefix}media add <name> => Reply to an image with a name to add instantly
{prefix}media remove => Reply to an image to remove
{prefix}media list => Show all images with numbers
Reply with number after list to get that image
{prefix}media <name> => Send image by name`
    }
  },

  onStart: async function ({ event, message, args, api }) {
    // Connect to MongoDB
    const dbConnected = await connectToDatabase();
    if (!dbConnected) {
      return message.reply("⚠️ Failed to connect to database. Please try again later.");
    }
    
    // Get media from MongoDB
    let mediaList = [];
    try {
      mediaList = await Media.find({}).lean();
    } catch (error) {
      console.error("Error fetching media:", error);
      return message.reply("⚠️ Error accessing database. Please try again later.");
    }
    
    const { senderID, messageReply, messageID } = event;
    const command = args[0]?.toLowerCase();

    // === .media add <name> ===
    if (command === "add") {
      if (!messageReply?.attachments?.length)
        return message.reply("❗ Reply to an image to add.");
      
      const attachment = messageReply.attachments[0];
      // Check if it's an image
      if (attachment.type !== "photo")
        return message.reply("❗ Only images are supported.");
      
      const name = args.slice(1).join(" ").trim();
      if (!name) return message.reply("❗ Please provide a name after 'add'.");
      
      const url = attachment.url;
      
      try {
        // Check if media already exists
        const existingMedia = await Media.findOne({ name });
        if (existingMedia) return message.reply(`⚠️ Image with name "${name}" already exists.`);
        
        // Upload to Imgur
        message.reply("⏳ Uploading image to storage...");
        const imgurUrl = await uploadToImgur(url);
        
        // Save to MongoDB
        const newMedia = {
          url: imgurUrl,
          name: name,
          uploadedBy: senderID,
          createdAt: new Date()
        };
        
        await new Media(newMedia).save();
        
        api.setMessageReaction("☠️", messageID, () => {}, true);
        return message.reply(`✅ Image saved as "${name}" successfully.`);
      } catch (error) {
        console.error("Error adding image:", error);
        return message.reply("❌ Failed to add image: " + error.message);
      }
    }

    // === .media remove ===
    if (command === "remove") {
      const nameToRemove = args.slice(1).join(" ").trim();
      
      if (messageReply?.attachments?.length) {
        const url = messageReply.attachments[0].url;
        try {
          const result = await Media.findOneAndDelete({ url });
          if (!result) return message.reply("⚠️ Image not found in database.");
          
          api.setMessageReaction("☠️", messageID, () => {}, true);
          return message.reply("✅ Image removed successfully.");
        } catch (error) {
          console.error("Error removing image:", error);
          return message.reply("❌ Failed to remove image: " + error.message);
        }
      } else if (nameToRemove) {
        try {
          const result = await Media.findOneAndDelete({ name: nameToRemove });
          if (!result) return message.reply(`⚠️ Image named "${nameToRemove}" not found.`);
          
          api.setMessageReaction("☠️", messageID, () => {}, true);
          return message.reply(`✅ Image "${nameToRemove}" removed successfully.`);
        } catch (error) {
          console.error("Error removing image by name:", error);
          return message.reply("❌ Failed to remove image: " + error.message);
        }
      } else {
        return message.reply("❗ Either reply to an image or specify a name to remove.");
      }
    }

    // === .media list ===
    if (command === "list") {
      if (mediaList.length === 0) return message.reply("❌ No images found.");
      
      const page = parseInt(args[1]) || 1;
      const itemsPerPage = 10;
      const startIdx = (page - 1) * itemsPerPage;
      const endIdx = startIdx + itemsPerPage;
      const totalPages = Math.ceil(mediaList.length / itemsPerPage);
      
      // Sort media alphabetically by name
      const sortedMedia = [...mediaList].sort((a, b) => a.name.localeCompare(b.name));
      const pageMedia = sortedMedia.slice(startIdx, endIdx);
      
      let listMsg = `📄 Image List (Page ${page}/${totalPages}):\n`;
      pageMedia.forEach((m, i) => {
        listMsg += `${startIdx + i + 1}. ${m.name}\n`;
      });
      
      if (totalPages > 1) {
        listMsg += `\nUse "{prefix}media list ${page + 1}" for next page`;
      }
      
      return message.reply(listMsg, (err, info) => {
        global.GoatBot.onReply.set(info.messageID, {
          commandName: "media",
          type: "sendMediaByNumber",
          author: senderID,
          mediaList: sortedMedia
        });
      });
    }

    // === .media <name> ===
    if (command && command !== "add" && command !== "remove" && command !== "list") {
      const searchName = args.join(" ").toLowerCase();
      
      try {
        // Try exact match
        let media = await Media.findOne({
          name: { $regex: new RegExp(`^${searchName}$`, 'i') }
        });
        
        // If no exact match, try similar
        if (!media) {
          media = await Media.findOne({
            name: { $regex: new RegExp(searchName, 'i') }
          });
        }
        
        if (media) {
          try {
            const isExact = media.name.toLowerCase() === searchName;
            await message.send({
              body: isExact 
                ? `🖼️ Image: ${media.name}` 
                : `⚠️ No exact match found. Sending similar: ${media.name}`,
              attachment: await global.utils.getStreamFromURL(media.url)
            });
            api.setMessageReaction("☠️", messageID, () => {}, true);
          } catch (e) {
            console.error("Error sending image:", e);
            return message.reply("⚠️ Failed to send image. The URL might be invalid or expired.");
          }
        } else {
          return message.reply(`❌ No image found with name "${searchName}".`);
        }
      } catch (error) {
        console.error("Error searching image:", error);
        return message.reply("❌ Failed to search image: " + error.message);
      }
    }

    // === default .media ===
    if (!command) {
      if (mediaList.length === 0) return message.reply("❌ No images saved yet.");
      
      let used = global._mediaUsed || {};
      if (!used[senderID]) used[senderID] = [];
      
      // Get media not used yet
      const allMedia = mediaList;
      let remaining = allMedia.filter(m => !used[senderID].includes(m.url));
      
      // Reset if all media have been used
      if (remaining.length === 0) {
        used[senderID] = [];
        remaining = [...allMedia];
      }

      const chosen = remaining[Math.floor(Math.random() * remaining.length)];
      used[senderID].push(chosen.url);
      global._mediaUsed = used;

      try {
        await message.send({
          body: `🖼️ Random image: ${chosen.name}`,
          attachment: await global.utils.getStreamFromURL(chosen.url)
        });
        api.setMessageReaction("☠️", messageID, () => {}, true);
      } catch (e) {
        console.error("Error sending random image:", e);
        api.setMessageReaction("💀", messageID, () => {}, true);
        return message.reply("⚠️ Failed to send image. The URL might be invalid or expired.");
      }
    }
  },

  onReply: async function ({ event, message, api, Reply }) {
    const { senderID, body, messageID } = event;
    if (Reply.author !== senderID) return;

    if (Reply.type === "sendMediaByNumber") {
      const num = parseInt(body);
      const mediaList = Reply.mediaList;
      if (isNaN(num) || num < 1 || num > mediaList.length)
        return message.reply("❗ Please send a valid number.");

      const media = mediaList[num - 1];
      try {
        await message.send({
          body: `🖼️ Image #${num}: ${media.name}`,
          attachment: await global.utils.getStreamFromURL(media.url)
        });
        api.setMessageReaction("☠️", messageID, () => {}, true);
      } catch (e) {
        console.error("Error sending image by number:", e);
        api.setMessageReaction("💀", messageID, () => {}, true);
        return message.reply("⚠️ Failed to send image. The URL might be invalid or expired.");
      }
    }
  }
};
