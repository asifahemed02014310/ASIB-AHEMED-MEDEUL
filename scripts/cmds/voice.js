const axios = require("axios");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");

// Load MongoDB URI from config
const { MONGODB_URI } = require("./DB/Mongodb.json");

// Catbox configuration
const CATBOX_HASH = "9f09cd44af9d1d8b2197adf9f";
const CATBOX_UPLOAD_URL = "https://catbox.moe/user/api.php";

// Define schemas and models
let voiceSchema;
let settingsSchema;
let Voice;
let VoiceSettings;

// Connect to MongoDB
const connectToDatabase = async () => {
  if (!mongoose.connection.readyState) {
    await mongoose.connect(MONGODB_URI, { 
      useNewUrlParser: true, 
      useUnifiedTopology: true 
    });
  }
  
  if (!voiceSchema) {
    voiceSchema = new mongoose.Schema({
      name: { type: String, required: true, unique: true },
      url: { type: String, required: true },
      uploadedBy: { type: String, required: true },
      fileSize: { type: Number, default: 0 },
      duration: { type: Number, default: 0 },
      createdAt: { type: Date, default: Date.now }
    });
    
    settingsSchema = new mongoose.Schema({
      threadID: { type: String, required: true, unique: true },
      voiceMode: { type: Boolean, default: false },
      defaultVoice: { type: String, default: null },
      autoUpload: { type: Boolean, default: true },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    });
    
    try {
      Voice = mongoose.model("Voice");
      VoiceSettings = mongoose.model("VoiceSettings");
    } catch (e) {
      Voice = mongoose.model("Voice", voiceSchema);
      VoiceSettings = mongoose.model("VoiceSettings", settingsSchema);
    }
  }
};

// Download file from URL
const downloadFile = async (url, filepath) => {
  const response = await axios({
    method: 'GET',
    url: url,
    responseType: 'stream',
    timeout: 30000
  });
  
  const writer = fs.createWriteStream(filepath);
  response.data.pipe(writer);
  
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
};

// Upload file to Catbox
const uploadToCatbox = async (filepath) => {
  try {
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('userhash', CATBOX_HASH);
    form.append('fileToUpload', fs.createReadStream(filepath));
    
    const response = await axios.post(CATBOX_UPLOAD_URL, form, {
      headers: {
        ...form.getHeaders(),
      },
      timeout: 60000
    });
    
    return response.data.trim();
  } catch (error) {
    console.error('Catbox upload error:', error.message);
    throw new Error(`Upload failed: ${error.message}`);
  }
};

// Get file info
const getFileInfo = (filepath) => {
  try {
    const stats = fs.statSync(filepath);
    return {
      size: stats.size,
      sizeFormatted: formatFileSize(stats.size)
    };
  } catch {
    return { size: 0, sizeFormatted: '0 B' };
  }
};

// Format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Clean up temporary files
const cleanupFile = (filepath) => {
  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  } catch (error) {
    console.error('Cleanup error:', error.message);
  }
};

module.exports = {
  config: {
    name: "voice",
    version: "3.0",
    author: "nur",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Advanced voice clip manager with Catbox upload" },
    description: {
      en: "Manage voice clips with automatic Catbox upload and keyword detection"
    },
    category: "media",
    guide: {
      en: [
        `{prefix}voice add <name> => Reply to a voice message to upload and save`,
        `{prefix}voice remove <name> => Remove a voice clip`,
        `{prefix}voice list => List all saved voice clips`,
        `{prefix}voice <name> => Get voice clip by name`,
        `{prefix}voice => Send a random voice clip`,
        `{prefix}voice on => Enable keyword detection mode`,
        `{prefix}voice off => Disable keyword detection mode`,
        `{prefix}voice set <name> => Set default voice for auto-send`,
        `{prefix}voice unset => Remove default voice setting`,
        `{prefix}voice status => Show current settings`
      ].join("\n")
    }
  },

  langs: {
    en: {
      noReply: "❌ Please reply to a message containing a voice clip.",
      noName: "❌ Please provide a name after 'add'.",
      noVoiceAttachment: "❌ Reply must contain a voice message or audio attachment.",
      adding: "⏳ Processing voice clip...",
      downloading: "📥 Downloading voice file...",
      uploading: "☁️ Uploading to Catbox...",
      added: "✅ Voice clip '%1' saved successfully!\n📁 Size: %2\n🔗 URL: %3",
      exists: "⚠️ A clip with name '%1' already exists. Use 'remove' first.",
      removed: "✅ Voice clip '%1' removed successfully!",
      notFound: "❌ No voice clip found with name '%1'.",
      listEmpty: "📝 No voice clips found in database.",
      listHeader: "🎵 Saved Voice Clips (%1 total):",
      listItem: "%2. **%1** (%3)",
      voiceModeOn: "🔊 Voice mode enabled! Bot will respond to keywords automatically.",
      voiceModeOff: "🔇 Voice mode disabled.",
      voiceModeStatus: "🎵 Voice Mode: %1 | Default Voice: %2 | Auto Upload: %3",
      defaultVoiceSet: "🎯 Default voice set to: %1",
      defaultVoiceUnset: "🔄 Default voice setting removed.",
      randomVoice: "🎲 Random voice: **%1**",
      noVoicesAvailable: "❌ No voice clips available.",
      uploadError: "❌ Failed to upload voice clip: %1",
      downloadError: "❌ Failed to download voice file: %1",
      processingError: "❌ Error processing voice clip: %1"
    }
  },

  onStart: async function ({ event, args, message, getLang, api }) {
    try {
      await connectToDatabase();
      
      const cmd = args[0] && args[0].toLowerCase();
      const reply = event.messageReply;
      const threadID = event.threadID;
      const senderID = event.senderID;

      // Get or create thread settings
      let settings = await VoiceSettings.findOne({ threadID });
      if (!settings) {
        settings = new VoiceSettings({ threadID });
        await settings.save();
      }

      // Add a new voice clip
      if (cmd === "add") {
        const name = args.slice(1).join(" ").trim().toLowerCase();
        if (!reply) return message.reply(getLang("noReply"));
        if (!name) return message.reply(getLang("noName"));

        // Check if voice attachment exists
        const attachment = reply.attachments?.[0];
        if (!attachment || (attachment.type !== "audio" && attachment.type !== "voice")) {
          return message.reply(getLang("noVoiceAttachment"));
        }

        try {
          // Check if voice already exists
          const existing = await Voice.findOne({ name });
          if (existing) return message.reply(getLang("exists", name));

          // Send initial processing message
          message.reply(getLang("adding"));
          
          // Create temp directory if it doesn't exist
          const tempDir = path.join(__dirname, "temp");
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }

          // Download the voice file
          message.reply(getLang("downloading"));
          const filename = `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp3`;
          const filepath = path.join(tempDir, filename);
          
          await downloadFile(attachment.url, filepath);
          
          // Get file info
          const fileInfo = getFileInfo(filepath);
          
          // Upload to Catbox
          message.reply(getLang("uploading"));
          const catboxUrl = await uploadToCatbox(filepath);
          
          if (!catboxUrl || !catboxUrl.startsWith('http')) {
            throw new Error('Invalid Catbox response');
          }

          // Save to database
          const newVoice = new Voice({ 
            name, 
            url: catboxUrl, 
            uploadedBy: senderID,
            fileSize: fileInfo.size
          });
          await newVoice.save();
          
          // Clean up temp file
          cleanupFile(filepath);
          
          return message.reply(getLang("added", name, fileInfo.sizeFormatted, catboxUrl));
        } catch (err) {
          console.error('Voice add error:', err);
          return message.reply(getLang("processingError", err.message));
        }
      }

      // Remove a voice clip
      if (cmd === "remove") {
        const name = args.slice(1).join(" ").trim().toLowerCase();
        if (!name) return message.reply(getLang("noName"));

        try {
          const deleted = await Voice.findOneAndDelete({ name });
          if (!deleted) return message.reply(getLang("notFound", name));
          return message.reply(getLang("removed", name));
        } catch (err) {
          console.error('Voice remove error:', err);
          return message.reply(getLang("processingError", err.message));
        }
      }

      // List all clips
      if (cmd === "list") {
        try {
          const voices = await Voice.find({}).lean();
          if (!voices.length) return message.reply(getLang("listEmpty"));
          
          let text = getLang("listHeader", voices.length) + "\n\n";
          voices.forEach((voice, index) => {
            const size = formatFileSize(voice.fileSize || 0);
            text += getLang("listItem", voice.name, index + 1, size) + "\n";
          });
          
          return message.reply(text);
        } catch (err) {
          console.error('Voice list error:', err);
          return message.reply(getLang("processingError", err.message));
        }
      }

      // Show status
      if (cmd === "status") {
        const voiceMode = settings.voiceMode ? "ON" : "OFF";
        const defaultVoice = settings.defaultVoice || "None";
        const autoUpload = settings.autoUpload ? "ON" : "OFF";
        return message.reply(getLang("voiceModeStatus", voiceMode, defaultVoice, autoUpload));
      }

      // Enable voice mode
      if (cmd === "on") {
        settings.voiceMode = true;
        settings.updatedAt = new Date();
        await settings.save();
        return message.reply(getLang("voiceModeOn"));
      }

      // Disable voice mode
      if (cmd === "off") {
        settings.voiceMode = false;
        settings.updatedAt = new Date();
        await settings.save();
        return message.reply(getLang("voiceModeOff"));
      }

      // Set default voice
      if (cmd === "set") {
        const name = args.slice(1).join(" ").trim().toLowerCase();
        if (!name) return message.reply(getLang("noName"));

        const voice = await Voice.findOne({ name });
        if (!voice) return message.reply(getLang("notFound", name));

        settings.defaultVoice = name;
        settings.updatedAt = new Date();
        await settings.save();
        return message.reply(getLang("defaultVoiceSet", name));
      }

      // Unset default voice
      if (cmd === "unset") {
        settings.defaultVoice = null;
        settings.updatedAt = new Date();
        await settings.save();
        return message.reply(getLang("defaultVoiceUnset"));
      }

      // Get specific voice by name
      if (cmd && !["list", "on", "off", "set", "unset", "status"].includes(cmd)) {
        const name = args.join(" ").toLowerCase();
        try {
          const clip = await Voice.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
          if (!clip) return message.reply(getLang("notFound", name));
          return message.reply(`🎵 **${clip.name}**\n${clip.url}`);
        } catch (err) {
          console.error('Voice get error:', err);
          return message.reply(getLang("processingError", err.message));
        }
      }

      // Send random voice (no arguments)
      if (!cmd) {
        try {
          const voices = await Voice.find({}).lean();
          if (!voices.length) return message.reply(getLang("noVoicesAvailable"));
          
          const randomVoice = voices[Math.floor(Math.random() * voices.length)];
          return message.reply(`${getLang("randomVoice", randomVoice.name)}\n${randomVoice.url}`);
        } catch (err) {
          console.error('Voice random error:', err);
          return message.reply(getLang("processingError", err.message));
        }
      }
    } catch (error) {
      console.error('Voice command error:', error);
      return message.reply(getLang("processingError", error.message));
    }
  },

  // Handle keyword detection and default voice
  onChat: async function ({ event, message }) {
    try {
      await connectToDatabase();
      const threadID = event.threadID;
      const messageText = event.body?.toLowerCase() || "";

      // Skip if message is empty or too short
      if (!messageText || messageText.length < 2) return;

      // Get thread settings
      const settings = await VoiceSettings.findOne({ threadID });
      if (!settings) return;

      // Check for keyword detection mode
      if (settings.voiceMode) {
        const voices = await Voice.find({}).lean();
        
        // Sort by name length (longest first) to prioritize more specific matches
        voices.sort((a, b) => b.name.length - a.name.length);
        
        for (const voice of voices) {
          if (messageText.includes(voice.name.toLowerCase())) {
            return message.reply(`🎵 *${voice.name}*\n${voice.url}`);
          }
        }
      }

      // Check for default voice trigger (when voice mode is off but default is set)
      if (!settings.voiceMode && settings.defaultVoice) {
        // Trigger default voice on specific keywords
        const triggerWords = ['voice', 'audio', 'sound', 'play'];
        const shouldTrigger = triggerWords.some(word => messageText.includes(word));
        
        if (shouldTrigger) {
          const defaultVoice = await Voice.findOne({ name: settings.defaultVoice });
          if (defaultVoice) {
            return message.reply(`🎯 *${defaultVoice.name}* (default)\n${defaultVoice.url}`);
          }
        }
      }
    } catch (err) {
      console.error("Voice onChat error:", err);
    }
  }
};
