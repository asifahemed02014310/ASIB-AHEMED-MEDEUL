module.exports = {
	config: {
		name: "imgbb",
		aliases: ["i"],
		version: "1.1",
		author: "Nur",
		countDown: 1,
		role: 0,
		shortDescription: {
			en: "Upload images to imgbb"
		},
		description: {
			en: "Upload images to imgbb hosting service and get sharing links"
		},
		category: "tools",
		guide: {
			en: "{p}imgbb [reply to an image] - Upload the image to imgbb\n{p}imgbb url [image url] - Upload an image from URL to imgbb"
		} 
	},

	langs: {
		en: {
			missingImage: "Please reply to an image or provide an image URL to upload and get link",
			uploadSuccess: "✅ Upload successful\n \n️🔗 link: %1",
			uploadFailed: "❌ Failed to upload image: %1",
			invalidUrl: "Invalid URL. Please provide a valid image URL."
		}
	},

	onStart: async function ({ api, args, message, event, getLang }) {
		const axios = require("axios");
		const fs = require("fs");
		const path = require("path");
		const FormData = require('form-data');
		
		const apiEndpoint = "https://nur-s-api.onrender.com/Nurimg";
		let imageUrl;
		let imageBuffer;
		function isValidUrl(string) {
			try {
				new URL(string);
				return true;
			} catch (_) {
				return false;
			}
		}
		
		if (args[0] === "url" && args[1]) {
			imageUrl = args[1];
			
			if (!isValidUrl(imageUrl)) {
				return message.reply(getLang("invalidUrl"));
			}
		} 
		else if (event.messageReply && event.messageReply.attachments && event.messageReply.attachments[0] && event.messageReply.attachments[0].type === "photo") {
			imageUrl = event.messageReply.attachments[0].url;
		} 
		else {
			return message.reply(getLang("missingImage"));
		}
		
		try {
			const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
			imageBuffer = Buffer.from(response.data);
			
			const formData = new FormData();
			formData.append("image", imageBuffer, {
				filename: "image.jpg",
				contentType: "image/jpeg"
			});
			
			const uploadResponse = await axios.post(apiEndpoint, formData, {
				headers: {
					...formData.getHeaders()
				}
			});
			
			if (uploadResponse.data && uploadResponse.data.success) {
				const result = uploadResponse.data.data;
				const directUrl = result.image?.url || result.display_url;
				message.reply(getLang("uploadSuccess", directUrl));
			} else {
				message.reply(getLang("uploadFailed", "Unknown error"));
			}
		} catch (error) {
			message.reply(getLang("uploadFailed", error.message));
		}
	}
};
