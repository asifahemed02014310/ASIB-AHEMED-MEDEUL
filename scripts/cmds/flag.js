const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const PREMIUM_CONFIG = {
  baseCoinReward: 500,
  baseExpReward: 250,
  streakMultiplier: 1.5,
  maxStreak: 5,
  penalty: 200,
  premiumCost: 5000,
  dailyBonus: 1000,
  jackpotChance: 0.1,
  jackpotMultiplier: 10
};

const activeGames = new Map();

module.exports = {
  config: {
    name: "flag",
    aliases: ["flagGame", "premiumflag"],
    version: "1.0",
    author: "ShAn",
    countDown: 0,
    role: 0,
    description: {
      en: "Flag guessing game (only starter can answer)"
    },
    category: "game",
    guide: {
      en: "{pn} - play game\n{pn} premium - activate premium\n{pn} list - leaderboard\n{pn} stats - your stats"
    },
  },

  onReply: async function ({ api, event, Reply, usersData, threadsData }) {
    if (event.senderID !== Reply.starterID) {
      return api.sendMessage("❌ Only the game starter can answer!", event.threadID, event.messageID);
    }

    const { country, attempts, isPremium, streak = 0 } = Reply;
    const userData = await usersData.get(event.senderID);
    
    if (attempts >= 3) {
      activeGames.delete(event.threadID);
      await api.sendMessage(
        `🚫 Game over! Correct answer: ${country}` + 
        (isPremium ? `\nYou lost ${PREMIUM_CONFIG.penalty} coins.` : ""),
        event.threadID
      );
      
      if (isPremium) {
        await usersData.set(event.senderID, {
          money: Math.max(0, userData.money - PREMIUM_CONFIG.penalty),
          exp: userData.exp,
          data: userData.data
        });
      }
      return;
    }

    const userAnswer = event.body.toLowerCase();
    
    if (userAnswer === country.toLowerCase()) {
      try {
        await api.unsendMessage(Reply.messageID);
        activeGames.delete(event.threadID);
        
        let coinReward = isPremium ? PREMIUM_CONFIG.baseCoinReward : 200;
        let expReward = isPremium ? PREMIUM_CONFIG.baseExpReward : 100;
        
        const currentStreak = Math.min(streak + 1, PREMIUM_CONFIG.maxStreak);
        const streakBonus = isPremium ? Math.pow(PREMIUM_CONFIG.streakMultiplier, currentStreak) : 1;
        
        coinReward = Math.floor(coinReward * streakBonus);
        expReward = Math.floor(expReward * streakBonus);
        
        let jackpotWin = 0;
        if (isPremium && Math.random() < PREMIUM_CONFIG.jackpotChance) {
          jackpotWin = coinReward * PREMIUM_CONFIG.jackpotMultiplier;
          coinReward += jackpotWin;
        }
        
        const now = new Date();
        const lastWinDate = userData.data.lastFlagWin ? new Date(userData.data.lastFlagWin) : null;
        let dailyBonus = 0;
        
        if (!lastWinDate || now.toDateString() !== lastWinDate.toDateString()) {
          dailyBonus = isPremium ? PREMIUM_CONFIG.dailyBonus : 500;
          coinReward += dailyBonus;
        }
        
        await usersData.set(event.senderID, {
          money: userData.money + coinReward,
          exp: userData.exp + expReward,
          data: {
            ...userData.data,
            lastFlagWin: now.toISOString(),
            flagStreak: currentStreak,
            flagWins: (userData.data.flagWins || 0) + 1,
            flagJackpots: (userData.data.flagJackpots || 0) + (jackpotWin > 0 ? 1 : 0)
          }
        });
        
        const threadData = await threadsData.get(event.threadID);
        if (!threadData.data.flagWins) threadData.data.flagWins = {};
        threadData.data.flagWins[event.senderID] = (threadData.data.flagWins[event.senderID] || 0) + 1;
        await threadsData.set(event.threadID, threadData);
        
        let winMessage = `🎉 Correct! +${coinReward} coins & ${expReward} EXP\n` +
                        `Streak: ${currentStreak}x (+${Math.round((streakBonus - 1) * 100)}%)`;
        
        if (dailyBonus > 0) winMessage += `\n✨ Daily bonus: +${dailyBonus} coins`;
        if (jackpotWin > 0) winMessage += `\n💰 JACKPOT! +${jackpotWin} coins`;
        if (isPremium) winMessage += `\n💎 Premium active`;
        
        await api.sendMessage(winMessage, event.threadID);
        
      } catch (error) {
        console.error("Reward error:", error);
        await api.sendMessage("✅ Correct! (Reward processing failed)", event.threadID);
      }
    } else {
      Reply.attempts += 1;
      global.GoatBot.onReply.set(Reply.messageID, Reply);
      
      await api.sendMessage(
        `❌ Wrong! ${3 - Reply.attempts} attempts left\n` +
        `💡 Hint: ${generateHint(country, Reply.attempts)}`,
        event.threadID
      );
    }
  },

  onStart: async function ({ api, args, event, threadsData, usersData }) {
    try {
      const subCommand = args[0]?.toLowerCase();
      const userData = await usersData.get(event.senderID);
      
      if (subCommand === "premium") {
        if (userData.money < PREMIUM_CONFIG.premiumCost) {
          return api.sendMessage(
            `🚫 Need ${PREMIUM_CONFIG.premiumCost} coins for premium`,
            event.threadID
          );
        }
        
        await usersData.set(event.senderID, {
          money: userData.money - PREMIUM_CONFIG.premiumCost,
          exp: userData.exp,
          data: {
            ...userData.data,
            flagPremium: true,
            flagPremiumExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          }
        });
        
        return api.sendMessage(
          `💎 Premium activated for 7 days!\n` +
          `• ${PREMIUM_CONFIG.baseCoinReward} base coins\n` +
          `• Up to ${PREMIUM_CONFIG.maxStreak}x streaks\n` +
          `• ${PREMIUM_CONFIG.jackpotChance * 100}% jackpot chance\n` +
          `• Daily ${PREMIUM_CONFIG.dailyBonus} coin bonus`,
          event.threadID
        );
      }
      
      if (subCommand === "stats") {
        const stats = userData.data || {};
        const premiumStatus = stats.flagPremiumExpires && new Date(stats.flagPremiumExpires) > new Date() 
          ? `Active (until ${new Date(stats.flagPremiumExpires).toLocaleDateString()})` 
          : "Inactive";
        
        const message = [
          "📊 Your Flag Stats:",
          `🏆 Wins: ${stats.flagWins || 0}`,
          `🔥 Streak: ${stats.flagStreak || 0}`,
          `💰 Jackpots: ${stats.flagJackpots || 0}`,
          `💎 Premium: ${premiumStatus}`,
          `📅 Last win: ${stats.lastFlagWin ? new Date(stats.lastFlagWin).toLocaleString() : "Never"}`
        ].join("\n");
        
        return api.sendMessage(message, event.threadID);
      }
      
      // Leaderboard
      if (subCommand === "list") {
        const threadData = await threadsData.get(event.threadID);
        const flagWins = threadData.data?.flagWins || {};
        
        if (Object.keys(flagWins).length === 0) {
          return api.sendMessage("No records yet in this thread", event.threadID);
        }
        
        const leaderboard = await Promise.all(
          Object.entries(flagWins)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(async ([userID, wins], index) => {
              const userName = await usersData.getName(userID);
              return `${index + 1}. ${userName}: ${wins} wins ${getTrophyIcon(index)}`;
            })
        );
        
        return api.sendMessage(
          "🏆 Flag Leaderboard:\n\n" + leaderboard.join("\n"),
          event.threadID
        );
      }
      
      const isPremium = userData.data?.flagPremium && 
                       new Date(userData.data.flagPremiumExpires) > new Date();
      
      const apiBase = await axios.get("https://raw.githubusercontent.com/EwrShAn25/ShAn.s-Api/main/Api.json")
        .then(res => res.data.shan);
      
      const response = await axios.get(`${apiBase}/ShAn/flag`);
      const { image, country } = response.data;
      
      const message = await api.sendMessage(
        {
          body: `Guess the country (${isPremium ? "💎 PREMIUM" : "Normal"})\n` +
                `Rewards: ${isPremium ? "500-2500" : "200-1000"} coins\n` +
                `Attempts: 3 | ${isPremium ? "Streaks active" : "No streaks"}`,
          attachment: await global.utils.getStreamFromURL(image)
        },
        event.threadID
      );
      
      activeGames.set(event.threadID, true);
      
      global.GoatBot.onReply.set(message.messageID, {
        commandName: this.config.name,
        type: "reply",
        messageID: message.messageID,
        author: event.senderID,
        starterID: event.senderID,
        link: image,
        country,
        attempts: 0,
        isPremium,
        streak: userData.data?.flagStreak || 0
      });
      
    } catch (error) {
      console.error("Flag error:", error);
      await api.sendMessage("🚫 Error loading flag game", event.threadID);
    }
  }
};

function generateHint(country, attempt) {
  const hints = [
    `First letter: ${country[0].toUpperCase()}`,
    `Last letter: ${country.slice(-1).toUpperCase()}`,
    `Length: ${country.length} letters`
  ];
  return hints[attempt - 1] || hints[0];
}

function getTrophyIcon(position) {
  return ["🥇", "🥈", "🥉"][position] || "🏅";
                                                 }
