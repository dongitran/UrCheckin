export const startHandler = (ctx) => {
  const username = ctx.from.username || ctx.from.first_name;
  const welcomeMessage = `
Hello ${username}! 👋
I'm a Checkin Management Bot. Use the following commands to interact:

/help - View all commands
/login <email> <password> - Login with your credentials
/request_off - Select a date to request off

🔒 Security Notice:
• Your information is securely encrypted and protected
• We use industry-standard encryption to safeguard your data
• Your credentials are stored in encrypted format only

⚠️ Disclaimer:
• This is a research project
• We are not responsible for any issues that may arise from using this bot
• Use at your own discretion
  `;

  return ctx.reply(welcomeMessage);
};

export const helpHandler = (ctx) => {
  const helpMessage = `
📌 Available Commands:

/start - Start using the bot
/help - View command list
/login <email> <password> - Login with your credentials
/request_off - Select a date to request off

Example: /login example@email.com yourpassword

🔒 Security Information:
• All user data is encrypted using AES-256 encryption
• Your credentials are never stored in plain text
• We prioritize the security of your information

⚠️ Important Notice:
• This bot is created for research purposes only
• We assume no liability for any issues or damages
• By using this bot, you acknowledge these terms

❓ Need help? Contact the administrator for support.
  `;

  return ctx.reply(helpMessage);
};
