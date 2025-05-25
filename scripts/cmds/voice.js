const axios = require("axios");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");


const { MONGODB_URI } = require("./DB/Mongodb.json");

// Catbox
const CATBOX_HASH = "9f09cd44af9d1d8b2197adf9f";
const CATBOX_UPLOAD_URL = "https://catbox.moe/user/api.php";


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
      keywords: [{ type: String }],
      createdAt: { type: Date, default: Date.now }
    });
    
    settingsSchema = new mongoose.Schema({
      threadID: { type: String, required: true, unique: true },
      voiceMode: { type: Boolean, default: false },
      setKeywords: [{ 
        name: { type: String, required: true },
        voiceName: { type: String, required: true }
      }],
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
    const tempDir = path.join(__dirname, "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const filename = `temp_voice_${Date.now()}.mp3`;
    const filepath = path.join(tempDir, filename);
    
    await downloadFile(voiceUrl, filepath);
    
    const attachment = fs.createReadStream(filepath);
    await api.sendMessage({
      body: voiceName ? `🎵 ${voiceName}` : "",
      attachment: attachment
    }, threadID);
    
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

const cleanupFile = (filepath) => {
  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  } catch (error) {
    console.error('Cleanup error:', error.message);
  }
};

// Check if message contains voice clip keywords (for voice mode)
const findMatchingVoice = async (messageText) => {
  try {
    const voices = await Voice.find({}).lean();
    const words = messageText.toLowerCase().split(/\s+/);
    
    for (const voice of voices) {
      if (words.includes(voice.name.toLowerCase())) {
        return voice;
      }
    }
    
    for (const voice of voices) {
      if (voice.keywords && voice.keywords.length > 0) {
        for (const keyword of voice.keywords) {
          if (words.includes(keyword.toLowerCase())) {
            return voice;
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Voice matching error:', error);
    return null;
  }
};

// Check if message contains set keywords (works even when voice mode is off)
const findSetKeywordMatch = async (messageText, threadID) => {
  try {
    const settings = await VoiceSettings.findOne({ threadID });
    if (!settings) return null;
    
    // Initialize setKeywords if it doesn't exist
    if (!settings.setKeywords) {
      settings.setKeywords = [];
      await settings.save();
      return null;
    }
    
    if (settings.setKeywords.length === 0) {
      return null;
    }
    
    const words = messageText.toLowerCase().split(/\s+/);
    
    for (const setKeyword of settings.setKeywords) {
      if (setKeyword && setKeyword.name && words.includes(setKeyword.name.toLowerCase())) {
        const voice = await Voice.findOne({ name: setKeyword.voiceName });
        if (voice) {
          return voice;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Set keyword matching error:', error);
    return null;
  }
};

const loadingAnimation = ["⏳ Adding", "⏳ Adding.", "⏳ Adding..", "⏳ Adding..."];
let animationIndex = 0;

module.exports = {
  config: {
    name: "voice",
    version: "3.3",
    author: "nur",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Advanced voice clip manager with auto-response and set keywords" },
    description: {
      en: "Manage voice clips with automatic voice responses and custom keyword triggers"
    },
    category: "media",
    guide: {
      en: [
        `{prefix}voice add <name> => Reply to a voice message to save`,
        `{prefix}voice remove <name> => Remove a voice clip`,
        `{prefix}voice list => List all saved voice clips`,
        `{prefix}voice <name> => Send voice clip by name`,
        `{prefix}voice => Send a random voice clip`,
        `{prefix}voice on => Enable auto voice response mode`,
        `{prefix}voice off => Disable auto voice response mode`,
        `{prefix}voice set <keyword> <voice_name> => Set keyword to trigger specific voice`,
        `{prefix}voice set list => List all set keywords`,
        `{prefix}voice unset <keyword> => Remove set keyword`,
        `{prefix}voice reset => Reset all settings`,
        `{prefix}voice status => Show current settings`
      ].join("\n")
    }
  },

  langs: {
    en: {
      noReply: "❌ Please reply to a message containing a voice clip.",
      noName: "❌ Please provide a name after 'add'.",
      noVoiceAttachment: "❌ Reply to a voice ",
      adding: "⏳ Adding",
      addingDone: "✅ Voice saved: **%1**",
      exists: "⚠️ A clip with name '%1' already exists. Use 'remove' first.",
      removed: "✅ Voice clip '%1' removed successfully!",
      notFound: "❌ No voice clip found with name '%1'.",
      listEmpty: "📝 No voice clips found in database.",
      listHeader: "🎵 Saved Voice Clips (%1 total):",
      listItem: "%2. *%1* (%3)",
      voiceModeOn: "🔊 Voice mode enabled! Bot will now automatically send voice clips when keywords are detected in messages.",
      voiceModeOff: "🔇 Voice mode disabled! Auto voice responses are now turned off.",
      noVoicesAvailable: "❌ No voice clips available.",
      processingError: "❌ Error: %1",
      statusInfo: "🎵 **Voice Settings**\n📊 Total voices: %1\n🔊 Voice mode: %2\n🎯 Set keywords: %3",
      setKeywordAdded: "✅ Set keyword '%1' to trigger voice '%2'",
      setKeywordExists: "⚠️ Keyword '%1' already exists. Use 'unset' first to replace.",
      setKeywordRemoved: "✅ Set keyword '%1' removed successfully!",
      setKeywordNotFound: "❌ No set keyword found with name '%1'.",
      setListEmpty: "📝 No set keywords found.",
      setListHeader: "🎯 Set Keywords (%1 total):",
      setListItem: "%2. *%1* → %3",
      resetConfirm: "✅ All voice settings have been reset!",
      setUsage: "❌ Usage: voice set <keyword> <voice_name>",
      voiceNotFoundForSet: "❌ Voice clip '%1' not found. Please add it first."
    }
  },

  onStart: async function ({ event, args, message, getLang, api }) {
    try {
      await connectToDatabase();
      
      const cmd = args[0] && args[0].toLowerCase();
      const reply = event.messageReply;
      const threadID = event.threadID;
      const senderID = event.senderID;
      let settings = await VoiceSettings.findOne({ threadID });
      if (!settings) {
        settings = new VoiceSettings({ threadID, setKeywords: [] });
        await settings.save();
      } else if (!settings.setKeywords) {
        // Initialize setKeywords for existing records
        settings.setKeywords = [];
        await settings.save();
      }

      if (cmd === "add") {
        const name = args.slice(1).join(" ").trim().toLowerCase();
        if (!reply) return message.reply(getLang("noReply"));
        if (!name) return message.reply(getLang("noName"));

        const attachment = reply.attachments?.[0];
        if (!attachment || (attachment.type !== "audio" && attachment.type !== "voice")) {
          return message.reply(getLang("noVoiceAttachment"));
        }

        try {
          const existing = await Voice.findOne({ name });
          if (existing) return message.reply(getLang("exists", name));

          const statusMsg = await message.reply(getLang("adding"));
          
          const animationInterval = setInterval(async () => {
            animationIndex = (animationIndex + 1) % loadingAnimation.length;
            try {
              await api.editMessage(loadingAnimation[animationIndex], statusMsg.messageID);
            } catch (e) {
              clearInterval(animationInterval);
            }
          }, 500);

          const tempDir = path.join(__dirname, "temp");
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }

          const filename = `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp3`;
          const filepath = path.join(tempDir, filename);
          
          await downloadFile(attachment.url, filepath);
          
          const fileInfo = getFileInfo(filepath);
          
          const catboxUrl = await uploadToCatbox(filepath);
          
          if (!catboxUrl || !catboxUrl.startsWith('http')) {
            throw new Error('Invalid Catbox response');
          }

          const newVoice = new Voice({ 
            name, 
            url: catboxUrl, 
            uploadedBy: senderID,
            fileSize: fileInfo.size,
            keywords: [name] 
          });
          await newVoice.save();
          cleanupFile(filepath);
          
          clearInterval(animationInterval);
          await api.editMessage(getLang("addingDone", name), statusMsg.messageID);
          
          await sendVoiceClip(api, threadID, catboxUrl, name);
          
        } catch (err) {
          console.error('Voice add error:', err);
          return message.reply(getLang("processingError", err.message));
        }
      }

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

      else if (cmd === "set") {
        const subCmd = args[1] && args[1].toLowerCase();
        
        if (subCmd === "list") {
          try {
            // Ensure setKeywords exists
            if (!settings.setKeywords) {
              settings.setKeywords = [];
              await settings.save();
            }
            
            if (settings.setKeywords.length === 0) {
              return message.reply(getLang("setListEmpty"));
            }
            
            let text = getLang("setListHeader", settings.setKeywords.length) + "\n\n";
            settings.setKeywords.forEach((item, index) => {
              if (item && item.name && item.voiceName) {
                text += getLang("setListItem", item.name, index + 1, item.voiceName) + "\n";
              }
            });
            
            return message.reply(text);
          } catch (err) {
            console.error('Voice set list error:', err);
            return message.reply(getLang("processingError", err.message));
          }
        } else {
          const keyword = args[1];
          const voiceName = args.slice(2).join(" ").trim().toLowerCase();
          
          if (!keyword || !voiceName) {
            return message.reply(getLang("setUsage"));
          }
          
          try {
            // Ensure setKeywords exists
            if (!settings.setKeywords) {
              settings.setKeywords = [];
              await settings.save();
            }
            
            // Check if voice exists
            const voice = await Voice.findOne({ name: voiceName });
            if (!voice) {
              return message.reply(getLang("voiceNotFoundForSet", voiceName));
            }
            
            // Check if keyword already exists
            const existingKeyword = settings.setKeywords.find(k => k && k.name && k.name.toLowerCase() === keyword.toLowerCase());
            if (existingKeyword) {
              return message.reply(getLang("setKeywordExists", keyword));
            }
            
            // Add new set keyword
            settings.setKeywords.push({ name: keyword.toLowerCase(), voiceName: voiceName });
            settings.updatedAt = new Date();
            await settings.save();
            
            return message.reply(getLang("setKeywordAdded", keyword, voiceName));
          } catch (err) {
            console.error('Voice set error:', err);
            return message.reply(getLang("processingError", err.message));
          }
        }
      }

      else if (cmd === "unset") {
        const keyword = args.slice(1).join(" ").trim().toLowerCase();
        if (!keyword) {
          return message.reply("❌ Please provide a keyword to unset.");
        }
        
        try {
          // Ensure setKeywords exists
          if (!settings.setKeywords) {
            settings.setKeywords = [];
            await settings.save();
          }
          
          const keywordIndex = settings.setKeywords.findIndex(k => k && k.name && k.name.toLowerCase() === keyword);
          if (keywordIndex === -1) {
            return message.reply(getLang("setKeywordNotFound", keyword));
          }
          
          settings.setKeywords.splice(keywordIndex, 1);
          settings.updatedAt = new Date();
          await settings.save();
          
          return message.reply(getLang("setKeywordRemoved", keyword));
        } catch (err) {
          console.error('Voice unset error:', err);
          return message.reply(getLang("processingError", err.message));
        }
      }

      else if (cmd === "reset") {
        try {
          settings.voiceMode = false;
          settings.setKeywords = [];
          settings.updatedAt = new Date();
          await settings.save();
          
          return message.reply(getLang("resetConfirm"));
        } catch (err) {
          console.error('Voice reset error:', err);
          return message.reply(getLang("processingError", err.message));
        }
      }

      else if (cmd === "on") {
        settings.voiceMode = true;
        settings.updatedAt = new Date();
        await settings.save();
        return message.reply(getLang("voiceModeOn"));
      }

      else if (cmd === "off") {
        settings.voiceMode = false;
        settings.updatedAt = new Date();
        await settings.save();
        return message.reply(getLang("voiceModeOff"));
      }

      else if (cmd === "status") {
        try {
          const totalVoices = await Voice.countDocuments();
          const voiceMode = settings.voiceMode ? "Enabled" : "Disabled";
          const setKeywordsCount = (settings.setKeywords && Array.isArray(settings.setKeywords)) ? settings.setKeywords.length : 0;
          
          return message.reply(getLang("statusInfo", totalVoices, voiceMode, setKeywordsCount));
        } catch (err) {
          console.error('Voice status error:', err);
          return message.reply(getLang("processingError", err.message));
        }
      }

      else if (cmd && !["list", "on", "off", "status", "set", "unset", "reset"].includes(cmd)) {
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
    onChat: async function ({ event, api }) {
    try {
      await connectToDatabase();
      const threadID = event.threadID;
      const messageText = event.body?.toLowerCase() || "";

      // Skip if message is empty, too short, or starts with command prefixes
      if (!messageText || messageText.length < 2 || messageText.startsWith('.') || messageText.startsWith('!')) return;

      const settings = await VoiceSettings.findOne({ threadID });
      if (!settings) return;

      // First check for set keywords (works regardless of voice mode)
      const setKeywordMatch = await findSetKeywordMatch(messageText, threadID);
      if (setKeywordMatch) {
        await sendVoiceClip(api, threadID, setKeywordMatch.url, setKeywordMatch.name);
        return;
      }

      // Then check voice mode for general keyword matching
      if (settings.voiceMode) {
        const matchingVoice = await findMatchingVoice(messageText);
        if (matchingVoice) {
          await sendVoiceClip(api, threadID, matchingVoice.url, matchingVoice.name);
        }
      }
    } catch (err) {
      console.error("Voice onChat error:", err);
    }
  }
};
                                      
