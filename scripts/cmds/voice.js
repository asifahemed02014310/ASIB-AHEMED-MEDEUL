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
      keywords: [{ type: String }], // Keywords that trigger this voice
      createdAt: { type: Date, default: Date.now }
    });
    
    settingsSchema = new mongoose.Schema({
      threadID: { type: String, required: true, unique: true },
      voiceMode: { type: Boolean, default: false },
      defaultVoice: { type: String, default: null },
      defaultKeywords: [{ type: String }], // Keywords for default voice
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

// Send voice clip as attachment
const sendVoiceClip = async (api, threadID, voiceUrl, voiceName = "") => {
  try {
    // Download voice file temporarily
    const tempDir = path.join(__dirname, "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const filename = `temp_voice_${Date.now()}.mp3`;
    const filepath = path.join(tempDir, filename);
    
    await downloadFile(voiceUrl, filepath);
    
    // Send as voice attachment
    const attachment = fs.createReadStream(filepath);
    await api.sendMessage({
      body: voiceName ? `🎵 ${voiceName}` : "",
      attachment: attachment
    }, threadID);
    
    // Clean up temp file
    setTimeout(() => {
      try {
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
      } catch (e) {
        console.error('Cleanup error:', e);
      }
    }, 1000);
    
  } catch (error) {
    console.error('Voice send error:', error);
    throw error;
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

// Animated loading messages
const loadingAnimation = ["⏳ Adding", "⏳ Adding.", "⏳ Adding..", "⏳ Adding..."];
let animationIndex = 0;

module.exports = {
  config: {
    name: "voice",
    version: "3.1",
    author: "nur",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Advanced voice clip manager with auto-response" },
    description: {
      en: "Manage voice clips with automatic voice responses and keyword detection"
    },
    category: "media",
    guide: {
      en: [
        `{prefix}voice add <name> => Reply to a voice message to save`,
        `{prefix}voice remove <name> => Remove a voice clip`,
        `{prefix}voice list => List all saved voice clips`,
        `{prefix}voice <name> => Send voice clip by name`,
        `{prefix}voice => Send a random voice clip`,
        `{prefix}voice set <name> <keywords> => Set voice to respond to keywords`,
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
      adding: "⏳ Adding",
      addingDone: "✅ Voice saved: **%1**",
      exists: "⚠️ A clip with name '%1' already exists. Use 'remove' first.",
      removed: "✅ Voice clip '%1' removed successfully!",
      notFound: "❌ No voice clip found with name '%1'.",
      listEmpty: "📝 No voice clips found in database.",
      listHeader: "🎵 Saved Voice Clips (%1 total):",
      listItem: "%2. **%1** (%3)",
      voiceSet: "🎯 Voice '%1' set to respond to keywords: %2",
      voiceUnset: "🔄 Default voice setting removed.",
      noKeywords: "❌ Please provide keywords after the voice name.",
      noVoicesAvailable: "❌ No voice clips available.",
      processingError: "❌ Error: %1",
      statusInfo: "🎵 **Voice Settings**\n📊 Total voices: %1\n🎯 Default voice: %2\n🔤 Keywords: %3"
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

          // Start animated loading
          const statusMsg = await message.reply(getLang("adding"));
          
          // Animate loading message
          const animationInterval = setInterval(async () => {
            animationIndex = (animationIndex + 1) % loadingAnimation.length;
            try {
              await api.editMessage(loadingAnimation[animationIndex], statusMsg.messageID);
            } catch (e) {
              clearInterval(animationInterval);
            }
          }, 500);

          // Create temp directory if it doesn't exist
          const tempDir = path.join(__dirname, "temp");
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }

          // Download the voice file
          const filename = `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp3`;
          const filepath = path.join(tempDir, filename);
          
          await downloadFile(attachment.url, filepath);
          
          // Get file info
          const fileInfo = getFileInfo(filepath);
          
          // Upload to Catbox
          const catboxUrl = await uploadToCatbox(filepath);
          
          if (!catboxUrl || !catboxUrl.startsWith('http')) {
            throw new Error('Invalid Catbox response');
          }

          // Save to database
          const newVoice = new Voice({ 
            name, 
            url: catboxUrl, 
            uploadedBy: senderID,
            fileSize: fileInfo.size,
            keywords: [name] // Default keyword is the voice name
          });
          await newVoice.save();
          
          // Clean up temp file
          cleanupFile(filepath);
          
          // Stop animation and show success
          clearInterval(animationInterval);
          await api.editMessage(getLang("addingDone", name), statusMsg.messageID);
          
          // Send the voice clip
          await sendVoiceClip(api, threadID, catboxUrl, name);
          
        } catch (err) {
          console.error('Voice add error:', err);
          return message.reply(getLang("processingError", err.message));
        }
      }

      // Remove a voice clip
      else if (cmd === "remove") {
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
      else if (cmd === "list") {
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

      // Set voice with keywords for auto-response
      else if (cmd === "set") {
        const params = args.slice(1).join(" ").trim();
        if (!params) return message.reply(getLang("noName"));
        
        const parts = params.split(" ");
        const voiceName = parts[0].toLowerCase();
        const keywords = parts.slice(1);
        
        if (!keywords.length) return message.reply(getLang("noKeywords"));

        try {
          const voice = await Voice.findOne({ name: voiceName });
          if (!voice) return message.reply(getLang("notFound", voiceName));

          // Update settings
          settings.defaultVoice = voiceName;
          settings.defaultKeywords = keywords.map(k => k.toLowerCase());
          settings.updatedAt = new Date();
          await settings.save();

          // Update voice keywords
          voice.keywords = [voiceName, ...keywords.map(k => k.toLowerCase())];
          await voice.save();

          return message.reply(getLang("voiceSet", voiceName, keywords.join(", ")));
        } catch (err) {
          console.error('Voice set error:', err);
          return message.reply(getLang("processingError", err.message));
        }
      }

      // Unset default voice
      else if (cmd === "unset") {
        settings.defaultVoice = null;
        settings.defaultKeywords = [];
        settings.updatedAt = new Date();
        await settings.save();
        return message.reply(getLang("voiceUnset"));
      }

      // Show status
      else if (cmd === "status") {
        try {
          const totalVoices = await Voice.countDocuments();
          const defaultVoice = settings.defaultVoice || "None";
          const keywords = settings.defaultKeywords?.join(", ") || "None";
          
          return message.reply(getLang("statusInfo", totalVoices, defaultVoice, keywords));
        } catch (err) {
          console.error('Voice status error:', err);
          return message.reply(getLang("processingError", err.message));
        }
      }

      // Get specific voice by name
      else if (cmd && !["list", "set", "unset", "status"].includes(cmd)) {
        const name = args.join(" ").toLowerCase();
        try {
          const clip = await Voice.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
          if (!clip) return message.reply(getLang("notFound", name));
          
          await sendVoiceClip(api, threadID, clip.url, clip.name);
        } catch (err) {
          console.error('Voice get error:', err);
          return message.reply(getLang("processingError", err.message));
        }
      }

      // Send random voice (no arguments)
      else if (!cmd) {
        try {
          const voices = await Voice.find({}).lean();
          if (!voices.length) return message.reply(getLang("noVoicesAvailable"));
          
          const randomVoice = voices[Math.floor(Math.random() * voices.length)];
          await sendVoiceClip(api, threadID, randomVoice.url, randomVoice.name);
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

  // Handle keyword detection for auto-response
  onChat: async function ({ event, api }) {
    try {
      await connectToDatabase();
      const threadID = event.threadID;
      const messageText = event.body?.toLowerCase() || "";

      // Skip if message is empty, too short, or is a command
      if (!messageText || messageText.length < 2 || messageText.startsWith('.') || messageText.startsWith('!')) return;

      // Get thread settings
      const settings = await VoiceSettings.findOne({ threadID });
      if (!settings || !settings.defaultVoice) return;

      // Check if message contains any keywords
      const hasKeyword = settings.defaultKeywords?.some(keyword => 
        messageText.includes(keyword.toLowerCase())
      );

      if (hasKeyword) {
        const voice = await Voice.findOne({ name: settings.defaultVoice });
        if (voice) {
          await sendVoiceClip(api, threadID, voice.url, voice.name);
        }
      }
    } catch (err) {
      console.error("Voice onChat error:", err);
    }
  }
};
