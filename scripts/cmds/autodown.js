const axios = require("axios");

const dApi = async () => {
  const base = await axios.get(
    "https://raw.githubusercontent.com/Sh4nDev/ShAn.s-Api/refs/heads/main/Api.json"
  );
  return base.data.shan;
};

module.exports.config = {
  name: "autodl",
  version: "1.6.9",
  author: "ShAn",
  role: 0,
  description: "Automatically download videos from supported platforms!",
  category: "𝗠𝗘𝗗𝗜𝗔",
  countDown: 10,
  guide: {
    en: "Send a valid video link from supported platforms (TikTok, Facebook, YouTube, Twitter, Instagram, etc.), and the bot will download it automatically.",
  },
};
module.exports.onStart = ({}) => {};

const platforms = {
  TikTok: {
    regex: /(?:https?:\/\/)?(?:www\.)?tiktok\.com/,
    endpoint: "/ShAn-tikDL?url=",
  },
  Facebook: {
    regex: /(?:https?:\/\/)?(?:www\.)?(facebook\.com|fb\.watch|facebook\.com\/share\/v)/,
    endpoint: "/ShAn-fbDL?url=",
  },
  YouTube: {
    regex: /(?:https?:\/\/)?(?:www\.)?(youtube\.com|youtu\.be)/,
    endpoint: "/ShAn-ytDL?url=",
  },
  Twitter: {
    regex: /(?:https?:\/\/)?(?:www\.)?x\.com/,
    endpoint: "/ShAn-alldl?url=",
  },
  Instagram: {
    regex: /(?:https?:\/\/)?(?:www\.)?instagram\.com/,
    endpoint: "/ShAn-instaDL?url=",
  },
};

const detectPlatform = (url) => {
  for (const [platform, data] of Object.entries(platforms)) {
    if (data.regex.test(url)) {
      return { platform, endpoint: data.endpoint };
    }
  }
  return null;
};

const downloadVideo = async (apiUrl, url) => {
  const match = detectPlatform(url);
  if (!match) {
    throw new Error("No matching platform for the provided URL.");
  }

  const { platform, endpoint } = match;
  const endpointUrl = `${apiUrl}${endpoint}${encodeURIComponent(url)}`;
  console.log(`🔗 Fetching from: ${endpointUrl}`);

  try {
    const res = await axios.get(endpointUrl);
    console.log(`✅ API Response:`, res.data);

    // Updated to match the new API response format
    const videoUrl = res.data?.videoUrl;
    if (videoUrl) {
      return { 
        downloadUrl: videoUrl, 
        platform: res.data.platform || platform // Use API's platform if available
      };
    }
  } catch (error) {
    console.error(`❌ Error fetching data from ${endpointUrl}:`, error.message);
    throw new Error("Download link not found.");
  }
  throw new Error("No video URL found in the API response.");
};

module.exports.onChat = async ({ api, event }) => {
  const { body, threadID, messageID } = event;

  if (!body) return;

  const urlMatch = body.match(/https?:\/\/[^\s]+/);
  if (!urlMatch) return;
  
  const url = urlMatch[0];

  const platformMatch = detectPlatform(url);
  if (!platformMatch) return;
  try {
    const apiUrl = await dApi();
    const { downloadUrl, platform } = await downloadVideo(apiUrl, url);

    const videoStream = await axios.get(downloadUrl, { responseType: "stream" });
    api.sendMessage(
      {
        body: `✅ Successfully downloaded the video!\n🔖 Platform: ${platform}\n😜Power by Ew'r ShAn's😪`,
        attachment: [videoStream.data],
      },
      threadID,
      messageID
    );
  } catch (error) {
    console.error(`❌ Error while processing the URL:`, error.message);
  }
};
