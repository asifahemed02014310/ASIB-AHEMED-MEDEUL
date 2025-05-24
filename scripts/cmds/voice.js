const axios = require("axios");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");

// Load MongoDB URI from config
const { MONGODB_URI } = require("./DB/mongodb.json");

// Define schema and model
let voiceSchema;
let Voice;

// Connect to MongoDB
const connectToDatabase = async () => {
  if (!mongoose.connection.readyState) {
    await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  }
  if (!voiceSchema) {
    voiceSchema = new mongoose.Schema({
      name: { type: String, required: true, unique: true },
      url: { type: String, required: true },
      uploadedBy: { type: String, required: true },
      createdAt: { type: Date, default: Date.now }
    });
    try {
      Voice = mongoose.model("Voice");
    } catch (e) {
      Voice = mongoose.model("Voice", voiceSchema);
    }
  }
};

module.exports = {
  config: {
    name: "voice",
    version: "1.0",
    author: "nur",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Manage voice clips in MongoDB" },
    description: {
      en: "Add or list voice clips. Reply to a bot-uploaded URL to save a voice clip."
    },
    category: "media",
    guide: {
      en: [
        `{prefix}voice add <name> => Reply to a bot message that contains the voice URL and save it under <name>`,
        `{prefix}voice list => List all saved voice clips`,
        `{prefix}voice <name> => Get the URL of a saved voice clip by name`
      ].join("\n")
    }
  },

  langs: {
    en: {
      noReply: "Please reply to a bot message containing a voice URL.",
      noName: "Please provide a name after 'add'.",
      invalidURL: "Reply does not contain a valid URL.",
      adding: "⏳ Saving voice clip...",
      added: "✅ Voice clip '%1' saved: %2",
      exists: "⚠️ A clip with name '%1' already exists.",
      listEmpty: "❌ No voice clips found.",
      listHeader: "📄 Saved Voice Clips:",
      listItem: "- %1: %2",
      notFound: "❌ No voice clip found with name '%1'."
    }
  },

  onStart: async function ({ event, args, message, getLang }) {
    await connectToDatabase();
    const cmd = args[0] && args[0].toLowerCase();
    const reply = event.messageReply;

    // Add a new voice clip
    if (cmd === "add") {
      const name = args.slice(1).join(" ").trim();
      if (!reply) return message.reply(getLang("noReply"));
      if (!name) return message.reply(getLang("noName"));

      const url = reply.body?.trim();
      if (!url || !url.startsWith("http")) return message.reply(getLang("invalidURL"));

      try {
        const existing = await Voice.findOne({ name });
        if (existing) return message.reply(getLang("exists", name));

        message.reply(getLang("adding"));
        const newVoice = new Voice({ name, url, uploadedBy: event.senderID });
        await newVoice.save();
        return message.reply(getLang("added", name, url));
      } catch (err) {
        console.error(err);
        return message.reply(`❌ Error: ${err.message}`);
      }
    }

    // List all clips
    if (cmd === "list") {
      const all = await Voice.find({}).lean();
      if (!all.length) return message.reply(getLang("listEmpty"));
      let text = getLang("listHeader") + "\n";
      all.forEach(v => {
        text += getLang("listItem", v.name, v.url) + "\n";
      });
      return message.reply(text);
    }

    // Get a clip by name
    if (cmd) {
      const name = args.join(" ").toLowerCase();
      const clip = await Voice.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
      if (!clip) return message.reply(getLang("notFound", name));
      return message.reply(clip.url);
    }

    // Default
    return message.reply(getLang("listEmpty"));
  }
};
