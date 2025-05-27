const axios = require("axios");
const mongoose = require("mongoose");
const FormData = require("form-data");

const { MONGODB_URI } = require("./DB/Mongodb.json");

const separateMongoose = require('mongoose');

let mediaConnection;
let mediaSchema;
let settingsSchema;
let Media;
let MediaSettings;

const connectToDatabase = async () => {
  try {
    if (!mediaConnection || mediaConnection.readyState !== 1) {
      mediaConnection = separateMongoose.createConnection(MONGODB_URI, { 
        useNewUrlParser: true, 
        useUnifiedTopology: true
      });
      
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Database connection timeout'));
        }, 10000);
        
        mediaConnection.once('open', () => {
          clearTimeout(timeout);
          console.log('Media database connected successfully to:', MONGODB_URI.replace(/\/\/.*@/, '//***:***@'));
          resolve();
        });
        
        mediaConnection.once('error', (error) => {
          clearTimeout(timeout);
          console.error('Media database connection failed:', error);
          reject(error);
        });
      });
    }
    
    // Define schemas if not already defined
    if (!mediaSchema) {
      mediaSchema = new separateMongoose.Schema({
        url: { type: String, required: true },
        name: { type: String, required: true, unique: true },
        uploadedBy: { type: String, required: true },
        fileSize: { type: Number, default: 0 },
        keywords: [{ type: String }],
        createdAt: { type: Date, default: Date.now }
      });
      
      settingsSchema = new separateMongoose.Schema({
        threadID: { type: String, required: true, unique: true },
        usedMedia: [{ type: String }], // Array of media URLs that have been used
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
      });
      
      Media = mediaConnection.model("MediaClips", mediaSchema);
      MediaSettings = mediaConnection.model("MediaSettings", settingsSchema);
    }
    
    return true;
  } catch (error) {
    console.error('Media database connection error:', error);
    throw error;
  }
};

// Upload file to Imgur via API
const uploadToImgur = async (url) => {
  try {
    // Download the media
    const response = await axios.get(url, { 
      responseType: 'arraybuffer',
      timeout: 30000
    });
    
    const formData = new FormData();
    formData.append('image', Buffer.from(response.data), {
      filename: 'image.jpg',
      contentType: 'image/jpeg',
    });
    
    // Send request to the Imgur API service
    const imgurResponse = await axios.post("https://nur-s-api.onrender.com/Nurimg", formData, {
      headers: {
        ...formData.getHeaders()
      },
      timeout: 60000
    });
    
    if (imgurResponse.data && imgurResponse.data.success) {
      return imgurResponse.data.data.url;
    } else {
      throw new Error("Upload failed: Invalid response from Imgur API");
    }
  } catch (error) {
    console.error("Error uploading to Imgur:", error.message);
    throw new Error(`Upload failed: ${error.message}`);
  }
};

// Get file size info
const getFileSize = (buffer) => {
  const bytes = buffer.length;
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Get or create settings for thread
const getThreadSettings = async (threadID) => {
  let settings = await MediaSettings.findOne({ threadID });
  if (!settings) {
    settings = new MediaSettings({ threadID, usedMedia: [] });
    await settings.save();
  }
  return settings;
};

const loadingAnimation = ["⏳ Uploading", "⏳ Uploading.", "⏳ Uploading..", "⏳ Uploading..."];
let animationIndex = 0;

module.exports = {
  config: {
    name: "media",
    aliases: ["exposs", "joss", "hot"],
    version: "4.1",
    author: "Nur",
    role: 0,
    countDown: 1,
    shortDescription: { en: "Advanced image manager with MongoDB" },
    description: { en: "Manage images with automatic no-repeat random selection" },
    category: "media",
    guide: {
      en: [
        `{prefix}media => Send random image (no repeat until all used)`,
        `{prefix}media add <name> => Reply to an image with a name to add`,
        `{prefix}media remove <name> => Remove image by name`,
        `{prefix}media list [page] => Show all images with pagination`,
        `{prefix}media <name> => Send image by name (exact or similar match)`,
        `Reply to list message with number => Send specific image by number`
      ].join("\n")
    }
  },

  langs: {
    en: {
      noReply: "❗ Reply to an image to add it.",
      noImageAttachment: "❗ Only images are supported.",
      noName: "❗ Please provide a name after 'add'.",
      exists: "⚠️ Image with name '%1' already exists.",
      adding: "⏳ Uploading image to storage...",
      addSuccess: "✅ Image saved as '%1' successfully!",
      removeSuccess: "✅ Image '%1' removed successfully.",
      notFound: "❌ Image '%1' not found.",
      listEmpty: "❌ No images found in database.",
      listHeader: "📄 Image List (Page %1/%2) - Total: %3 images:\n\n",
      listItem: "%1. %2",
      listFooter: "\n\n💡 Reply with a number (1-%1) to send that image",
      randomSuccess: "🖼️ Random image: %1",
      imageSuccess: "🖼️ Image: %1",
      similarMatch: "⚠️ No exact match found. Sending similar: %1",
      noImages: "❌ No images saved yet.",
      processingError: "❌ Error: %1",
      sendError: "⚠️ Failed to send image. The URL might be invalid or expired.",
      dbError: "⚠️ Database connection failed. Please try again later.",
      invalidNumber: "❗ Please send a valid number between 1 and %1.",
      sendingImage: "🖼️ Image #%1: %2"
    }
  },

  onStart: async function ({ event, message, args, api, getLang }) {
    try {
      // Connect to database
      const dbConnected = await connectToDatabase();
      if (!dbConnected) {
        return message.reply(getLang("dbError"));
      }
      
      const { senderID, messageReply, messageID, threadID } = event;
      const command = args[0]?.toLowerCase();

      // === .media add <name> ===
      if (command === "add") {
        if (!messageReply?.attachments?.length) {
          return message.reply(getLang("noReply"));
        }
        
        const attachment = messageReply.attachments[0];
        if (attachment.type !== "photo") {
          return message.reply(getLang("noImageAttachment"));
        }
        
        const name = args.slice(1).join(" ").trim();
        if (!name) {
          return message.reply(getLang("noName"));
        }
        
        try {
          // Check if media already exists
          const existingMedia = await Media.findOne({ name });
          if (existingMedia) {
            return message.reply(getLang("exists", name));
          }
          
          // Show loading animation
          const statusMsg = await message.reply(getLang("adding"));
          const animationInterval = setInterval(async () => {
            animationIndex = (animationIndex + 1) % loadingAnimation.length;
            try {
              await api.editMessage(loadingAnimation[animationIndex], statusMsg.messageID);
            } catch (e) {
              clearInterval(animationInterval);
            }
          }, 500);
          
          // Download and get file info
          const response = await axios.get(attachment.url, { responseType: 'arraybuffer' });
          const fileSize = response.data.length;
          const fileSizeFormatted = getFileSize(response.data);
          
          // Upload to Imgur
          const imgurUrl = await uploadToImgur(attachment.url);
          
          // Save to MongoDB
          const newMedia = new Media({
            url: imgurUrl,
            name: name,
            uploadedBy: senderID,
            fileSize: fileSize,
            keywords: [name],
            createdAt: new Date()
          });
          
          await newMedia.save();
          
          clearInterval(animationInterval);
          await api.editMessage(getLang("addSuccess", name), statusMsg.messageID);
          api.setMessageReaction("✅", messageID, () => {}, true);
          
        } catch (error) {
          console.error("Error adding image:", error);
          return message.reply(getLang("processingError", error.message));
        }
      }

      // === .media remove <name> ===
      else if (command === "remove") {
        const nameToRemove = args.slice(1).join(" ").trim();
        if (!nameToRemove) {
          return message.reply(getLang("noName"));
        }
        
        try {
          const result = await Media.findOneAndDelete({ 
            name: { $regex: new RegExp(`^${nameToRemove}$`, 'i') }
          });
          
          if (!result) {
            return message.reply(getLang("notFound", nameToRemove));
          }
          
          api.setMessageReaction("✅", messageID, () => {}, true);
          return message.reply(getLang("removeSuccess", result.name));
          
        } catch (error) {
          console.error("Error removing image:", error);
          return message.reply(getLang("processingError", error.message));
        }
      }

      // === .media list [page] ===
      else if (command === "list") {
        try {
          const mediaList = await Media.find({}).sort({ name: 1 }).lean();
          if (mediaList.length === 0) {
            return message.reply(getLang("listEmpty"));
          }
          
          const page = parseInt(args[1]) || 1;
          const itemsPerPage = 30;
          const startIdx = (page - 1) * itemsPerPage;
          const endIdx = startIdx + itemsPerPage;
          const totalPages = Math.ceil(mediaList.length / itemsPerPage);
          
          const pageMedia = mediaList.slice(startIdx, endIdx);
          
          let listMsg = getLang("listHeader", page, totalPages, mediaList.length);
          pageMedia.forEach((m, i) => {
            const size = m.fileSize ? getFileSize(Buffer.alloc(m.fileSize)) : '0 B';
            listMsg += getLang("listItem", startIdx + i + 1, m.name, size) + "\n";
          });
          
          listMsg += getLang("listFooter", mediaList.length);
          
          if (page < totalPages) {
            listMsg += `\n📄 Use '{prefix}media list ${page + 1}' for next page`;
          }
          
          return message.reply(listMsg, (err, info) => {
            if (!err) {
              global.GoatBot.onReply.set(info.messageID, {
                commandName: "media",
                type: "sendMediaByNumber",
                author: senderID,
                mediaList: mediaList,
                page: page,
                totalItems: mediaList.length
              });
            }
          });
          
        } catch (error) {
          console.error("Error listing media:", error);
          return message.reply(getLang("processingError", error.message));
        }
      }

      // === .media <name> ===
      else if (command && !["add", "remove", "list"].includes(command)) {
        const searchName = args.join(" ").trim();
        
        try {
          // Try exact match first
          let media = await Media.findOne({
            name: { $regex: new RegExp(`^${searchName}$`, 'i') }
          });
          
          // If no exact match, try partial match
          if (!media) {
            media = await Media.findOne({
              name: { $regex: new RegExp(searchName, 'i') }
            });
          }
          
          if (!media) {
            return message.reply(getLang("notFound", searchName));
          }
          
          try {
            const isExact = media.name.toLowerCase() === searchName.toLowerCase();
            const bodyText = isExact 
              ? getLang("imageSuccess", media.name)
              : getLang("similarMatch", media.name);
              
            await message.send({
              body: bodyText,
              attachment: await global.utils.getStreamFromURL(media.url)
            });
            
            api.setMessageReaction("✅", messageID, () => {}, true);
            
          } catch (e) {
            console.error("Error sending image:", e);
            api.setMessageReaction("❌", messageID, () => {}, true);
            return message.reply(getLang("sendError"));
          }
          
        } catch (error) {
          console.error("Error searching image:", error);
          return message.reply(getLang("processingError", error.message));
        }
      }

      // === .media (random) ===
      else if (!command) {
        try {
          const allMedia = await Media.find({}).lean();
          if (allMedia.length === 0) {
            return message.reply(getLang("noImages"));
          }
          
          // Get thread settings
          const settings = await getThreadSettings(threadID);
          
          // Get unused media
          let availableMedia = allMedia.filter(m => !settings.usedMedia.includes(m.url));
          
          // Reset if all media have been used
          if (availableMedia.length === 0) {
            settings.usedMedia = [];
            await settings.save();
            availableMedia = [...allMedia];
          }

          // Select random media
          const chosen = availableMedia[Math.floor(Math.random() * availableMedia.length)];
          
          // Mark as used
          settings.usedMedia.push(chosen.url);
          settings.updatedAt = new Date();
          await settings.save();

          try {
            await message.send({
              body: getLang("randomSuccess", chosen.name),
              attachment: await global.utils.getStreamFromURL(chosen.url)
            });
            
            api.setMessageReaction("✅", messageID, () => {}, true);
            
          } catch (e) {
            console.error("Error sending random image:", e);
            api.setMessageReaction("❌", messageID, () => {}, true);
            return message.reply(getLang("sendError"));
          }
          
        } catch (error) {
          console.error("Error getting random image:", error);
          return message.reply(getLang("processingError", error.message));
        }
      }

    } catch (error) {
      console.error("Media command error:", error);
      return message.reply(getLang("processingError", error.message));
    }
  },

  onReply: async function ({ event, message, api, Reply, getLang }) {
    try {
      await connectToDatabase(); // Ensure database connection
      
      const { senderID, body, messageID } = event;
      
      // Check if the reply is from the same user who requested the list
      if (Reply.author !== senderID) return;

      if (Reply.type === "sendMediaByNumber") {
        const num = parseInt(body.trim());
        const mediaList = Reply.mediaList;
        const totalItems = Reply.totalItems || mediaList.length;
        
        // Validate the number
        if (isNaN(num) || num < 1 || num > totalItems) {
          return message.reply(getLang("invalidNumber", totalItems));
        }

        // Get the media item (arrays are 0-indexed)
        const media = mediaList[num - 1];
        
        if (!media) {
          return message.reply(getLang("invalidNumber", totalItems));
        }
        
        try {
          await message.send({
            body: getLang("sendingImage", num, media.name),
            attachment: await global.utils.getStreamFromURL(media.url)
          });
          
          api.setMessageReaction("✅", messageID, () => {}, true);
          
        } catch (e) {
          console.error("Error sending image by number:", e);
          api.setMessageReaction("❌", messageID, () => {}, true);
          return message.reply(getLang("sendError"));
        }
      }
      
    } catch (error) {
      console.error("Media onReply error:", error);
      return message.reply(getLang("processingError", error.message));
    }
  }
};
