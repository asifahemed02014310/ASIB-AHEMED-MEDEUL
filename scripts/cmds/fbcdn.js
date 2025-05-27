module.exports = {
	config: {
		name: "fbcdn",
		aliases: ["link", "l"],
		version: "1.1",
		author: "NUR",
		countDown: 1,
		role: 0,
		shortDescription: {
			en: "Extract direct download link from media messages"
		},
		description: {
			en: "Extract Facebook CDN direct download links from replied media messages (voice, image, or video). Reply to a media message with this command to get the download link."
		},
		category: "Tools",
		guide: {
			en: "Reply to a voice message, image, or video with '{pn}link' to get the direct download link"
		}
	},

	langs: {
		en: {
			noReply: "❌ Please reply to a media message (voice, image, or video) to extract the download link.",
			noMedia: "❌ The replied message doesn't contain any media attachments.",
			unsupportedMedia: "❌ Unsupported media type. This command only works with voice messages, images, and videos.",
			linkExtracted: "🔗 Direct download link:\n\n%1",
			processingError: "❌ An error occurred while processing the media. Please try again."
		}
	},

	onStart: async function ({ api, args, message, event, getLang }) {
		try {
			if (!event.messageReply) {
				return message.reply(getLang("noReply"));
			}
			const repliedMessage = event.messageReply;
			if (!repliedMessage.attachments || repliedMessage.attachments.length === 0) {
				return message.reply(getLang("noMedia"));
			}
			const mediaAttachments = repliedMessage.attachments.filter(att => 
				att.type === "photo" || att.type === "video" || att.type === "audio"
			);

			if (mediaAttachments.length === 0) {
				return message.reply(getLang("unsupportedMedia"));
			}
			const downloadLinks = [];
			for (const attachment of mediaAttachments) {
				let downloadUrl = "";
				switch (attachment.type) {
					case "photo":
						downloadUrl = attachment.largePreviewUrl || attachment.previewUrl || attachment.url || "";
						break;
					case "video":
					case "audio":
						downloadUrl = attachment.url || "";
						break;
				}

				if (downloadUrl) {
					const separator = downloadUrl.includes('?') ? '&' : '?';
					const finalUrl = `${downloadUrl}${separator}dl=1`;
					const mediaType = attachment.type === "audio" ? "🎵 Voice/Audio" : 
						attachment.type === "photo" ? "🖼️ Image" : "🎥 Video";
					downloadLinks.push(`${mediaType}: ${finalUrl}`);
				}
			}

			if (downloadLinks.length === 0) {
				return message.reply(getLang("processingError"));
			}
			return message.reply(getLang("linkExtracted", downloadLinks.join('\n\n')));
		} catch (error) {
			console.error("Error in link command:", error);
			return message.reply(getLang("processingError"));
		}
	}
};
