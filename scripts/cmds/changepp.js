const axios = require("axios");

module.exports = {
	config: {
		name: "changepp",
		aliases: ["changeavt", "setavatar","changepic", "cp", "change"],
		version: "1.4",
		author: "Nur",
		countDown: 5,
		role: 2,
		description: {
			vi: "Đổi avatar bot",
			en: "Change bot avatar"
		},
		category: "owner",
		guide: {
			vi: "   {pn} [<image url> | <phản hồi tin nhắn có ảnh>] [<caption> | để trống] [<expirationAfter (seconds)> | để trống]"
				+ "\nPhản hồi 1 tin nhắn có chứa ảnh với nội dung: {pn}"
				+ "\nGửi kèm 1 tin nhắn có chứa ảnh với nội dung: {pn}"
				+ "\n\nGhi chú:"
				+ "\n  + caption: caption sẽ đăng kèm khi đổi avatar"
				+ "\n  + expirationAfter: đặt chế độ ảnh đại diện tạm thời (hết hạn sau expirationAfter(seconds))"
				+ "\nVí dụ:"
				+ "\n   {pn} https://example.com/image.jpg: (đổi ảnh đại diện không caption, không hết hạn)"
				+ "\n   {pn} https://example.com/image.jpg Hello: (đổi ảnh đại diện với caption là \"Hello\", không hết hạn)"
				+ "\n   {pn} https://example.com/image.jpg Hello 3600: (đổi ảnh đại diện với caption là \"Hello\", đặt tạm thời 1h)"
				+ "\n   Reply to any image with just the word \"avatar\" to set it as the bot's profile picture"
		}
	},

	langs: {
		vi: {
			cannotGetImage: "❌ | Đã xảy ra lỗi khi truy vấn đến url hình ảnh",
			invalidImageFormat: "❌ | Định dạng hình ảnh không hợp lệ",
			changedAvatar: "✅ | Đã thay đổi avatar của bot thành công"
		},
		en: {
			cannotGetImage: "❌ | An error occurred while querying the image url",
			invalidImageFormat: "❌ | Invalid image format",
			changedAvatar: "✅ | Changed bot avatar successfully"
		}
	},

	onStart: async function ({ message, event, api, args, getLang }) {
		// Check if this is a simple reply with just the word "avatar" to an image
		const isQuickAvatarCommand = event.messageReply && 
									 event.messageReply.attachments && 
									 event.messageReply.attachments[0]?.type === "photo" &&
									 event.body.toLowerCase().trim() === "avatar";

		// If it's the quick avatar command, set the image as avatar without any caption or expiration
		if (isQuickAvatarCommand) {
			return this.setAvatar({
				api,
				message,
				imageURL: event.messageReply.attachments[0].url,
				caption: "",
				expirationAfter: null,
				getLang
			});
		}

		// Otherwise, handle the normal command syntax
		const imageURL = (args[0] || "").startsWith("http") ? args.shift() : event.attachments[0]?.url || event.messageReply?.attachments[0]?.url;
		const expirationAfter = !isNaN(args[args.length - 1]) ? args.pop() : null;
		const caption = args.join(" ");
		
		if (!imageURL)
			return message.SyntaxError();
		
		return this.setAvatar({
			api,
			message,
			imageURL,
			caption,
			expirationAfter: expirationAfter ? expirationAfter * 1000 : null,
			getLang
		});
	},

	// Separate method to handle avatar changing to avoid code duplication
	setAvatar: async function ({ api, message, imageURL, caption, expirationAfter, getLang }) {
		let response;
		try {
			response = (await axios.get(imageURL, {
				responseType: "stream"
			}));
		}
		catch (err) {
			return message.reply(getLang("cannotGetImage"));
		}
		
		if (!response.headers["content-type"].includes("image"))
			return message.reply(getLang("invalidImageFormat"));
		
		response.data.path = "avatar.jpg";

		return new Promise((resolve, reject) => {
			api.changeAvatar(response.data, caption, expirationAfter, (err) => {
				if (err) {
					message.err(err);
					return reject(err);
				}
				
				message.reply(getLang("changedAvatar"));
				return resolve();
			});
		});
	}
};
