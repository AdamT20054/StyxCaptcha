// @ts-check
console.clear();
var Discord = require('discord.js');
var client = new Discord.Client();
var fetch = require('node-fetch');
var fs = require('fs');

var config = getConfig();
var data = getSaveData();

if (config.token == "INSERT_TOKEN") {
	console.warn("A configuration file (config.json) has been generated, please set it up.\n\n[Alert] Closing in 5 seconds.");
	TIME_LEFT = 5;
	setInterval(() => {
		--TIME_LEFT;
		console.warn("[Alert]", "Closing in " + TIME_LEFT + ` second${(TIME_LEFT > 1) ? "s" : ""}.`);
		if (TIME_LEFT < 1) return process.exit(0);
	}, 1000);
}

var captcha = {
	create: async () => {
		return (await fetch(`https://captcha.manx7.net/insecure/new`,{headers:captcha.opt}).then(d => d.json()).catch(e => { console.error(e); return; }));
	},
	opt: { "captcha-length": config.captcha.length },
	limit: 3
};

var messages = {
	captchaTitle: "{GUILD_NAME} - Verification",
	captchaEmbed: "Well met Soul! We're sorry to give you this simple CAPTCHA in order to prove that you are not a bot!",
	captchaFooter: "Captcha Verification Level: " + gCD()
};

client.on('ready', () => {
	console.log(`Captcha client connected as ${client.user.tag}! for Nyx-Labs.`);
	client.user.setPresence({
    status: "dnd",
    activity: {
        name: "for *verify",
        type: "WATCHING"
    }
});
	check();
	setInterval(autoSave, 30000)
	messages.captchaTitle = messages.captchaTitle.replace(/\{GUILD\_NAME\}/gi, client.guilds.cache.get(config.guild).name);
	messages.captchaFooter = messages.captchaFooter.replace(/\{GUILD\_NAME\}/gi, client.guilds.cache.get(config.guild).name);
}).on('message', async (message) => {
	if (message.author.bot) return;
	switch(message.channel.type) {
		case "text":
			if (message.guild.id !== config.guild) return;
			if (!message.content.startsWith(config.prefix)) return;
			var args = message.content.slice(config.prefix.length).split(" ");
			switch(args[0]) {
				case "verify":
				case "recaptcha":
				case "captcha":
				case "iamhuman":
					if (message.member.roles.cache.map(r => { return r.id; }).includes(config.role)) {
						message.channel.send({embed: {
							color: 0xc97070, description: `You're already verified, <@!${message.author.id}>!`
						}}).catch(console.warn);
					} else {
						if (data[message.author.id]) {
							return message.channel.send({embed: {
								color: 0xc97070, description: `You have an open session already, <@!${message.author.id}>, check your DMs!`
							}}).catch(console.error);
						}
						captcha.create().then(res => {
							if (res.error) return console.error(res.error);
							res = res.response;
							message.author.send({embed:{
								color: 0xc5c970,
								title: messages.captchaTitle,
								description: messages.captchaEmbed.replace(/\{USER\_ID\}/gi, message.author.id),
								image: {url:res.image},
								footer: { text:messages.captchaFooter }
							}}).then(() => {
								data[message.author.id] = { code: res.code, attempt: 0 , image: res.image };
								console.log(`Captcha initiated by ${message.author.username}#${message.author.discriminator} (ID: ${message.author.id}) in Nyx-Labs.`)
								message.channel.send({embed: {
									color: 0xc97070, description: `I have sent you the captcha, check your Direct Messages, <@!${message.author.id}>!`}})
								}).catch(e => {
								console.log(`Unable to send captcha to ${message.author.username}#${message.author.discriminator} (ID: ${message.author.id}) because they have Direct Messages disabled in Nyx-Labs.`)
								message.channel.send({embed: {
									color: 0xc97070, description: `I can't send you messages, <@!${message.author.id}>, make sure your Direct Messages are open!`
								}}).catch(console.error);
							});
						}).catch(console.error);
					}
				break;
			}
		break;
		case "dm":
			if (!data[message.author.id]) {
				return message.channel.send({embed: {
					color: 0xc97070, description: `No session found, please create one by running \`${config.prefix}verify\` in ${client.guilds.cache.get(config.guild).name}!`
				}}).catch(() => {});
			} else {
				if (data[message.author.id].code == message.content) {
					client.guilds.cache.get(config.guild).members.fetch(message.author.id).then(member => {
						member.roles.add(config.role).then(() => {
							message.channel.send({embed: {
								color: 0x70c975, description: `Granted you the "Verified" role in ${client.guilds.cache.get(config.guild).name}!`
							}}).then(() => {
								member.roles.remove(config.removerole)
								message.channel.send({embed: {
								color: 0x70c975, description: `Removed your "Unverified" role in ${client.guilds.cache.get(config.guild).name}!`}})
							}).then(() => {
								const embed = new Discord.MessageEmbed()
                            		.setTitle(`Captcha complete!`)
                            		.setAuthor(`${message.author.username}#${message.author.discriminator}`, `${message.author.avatarURL()}`)
                            		.setColor(0x00FF29)
									.addFields(
										{ name: `User`, value: `${message.author.username}#${message.author.discriminator}`, inline: true },
										{ name: 'Looking for', value: `\`${data[message.author.id].code}\``, inline: true },
										{ name: 'Given', value: `\`${message.content}\``, inline: true },
									)
                            		.setFooter('Curated by Adam20054#0001', "https://i.imgur.com/CLAoaG9.png")
                            		.setImage(data[message.author.id].image)
                            		.setTimestamp()

								client.channels.cache.get(config.logchannel).send(embed)
								console.log(`Captcha completed by ${message.author.username}#${message.author.discriminator} (ID: ${message.author.id}) in Nyx-Labs`)
							}).then(() => {
								delete data[message.author.id];
							}).catch(() => {});
						}).catch(e => {
							message.channel.send("Something went wrong in me managing your roles. Try again or message Modmail to alert a staff member!").catch(() => {});
							console.error('=-=-=-=-=-=- Captcha Role Error in Nyx-Labs:',e);
						});
					}).catch(() => {
						message.channel.send({embed: {
							color: 0xc97070, description: `You don't appear to be in the ${client.guilds.cache.get(config.guild).name} server.`
						}}).catch(() => {});
					});
				} else {
					++data[message.author.id].attempt;
					message.channel.send({embed: {
						color: 0xc97070, description: `The code \`${message.content}\` is incorrect, you have \`${captcha.limit - data[message.author.id].attempt}\` attempts left.`
					}}).then(() => {
								//console.log(res.image);
								const embed2 = new Discord.MessageEmbed()
                            		.setTitle(`Attempt ${data[message.author.id].attempt}/3 failed`)
                            		.setAuthor(`${message.author.username}#${message.author.discriminator}`, `${message.author.avatarURL()}`)
                            		.setColor(0xFF0000)
									.addFields(
										{ name: `User`, value: `${message.author.username}#${message.author.discriminator}`, inline: true },
										{ name: 'Looking for', value: `\`${data[message.author.id].code}\``, inline: true },
										{ name: 'Given', value: `\`${message.content}\``, inline: true },
									)
                            		.setFooter('Curated by Adam20054#0001', "https://i.imgur.com/CLAoaG9.png")
                            		.setImage(data[message.author.id].image)
                            		.setTimestamp()

								client.channels.cache.get(config.logchannel).send(embed2)
								console.log(`Captcha attempt ${data[message.author.id].attempt}/3 failed by ${message.author.username}#${message.author.discriminator} (ID: ${message.author.id}) in Nyx-Labs.\n     Looking for: ${data[message.author.id].code}\n     Message given: ${message.content}`)
							}).catch(() => {});
					if (((captcha.limit > 0 ? captcha.limit : 3) - data[message.author.id].attempt) < 1) {
                        message.channel.send({embed: {
                            color: 0xc97070,
                            title: `Captcha failed.`,
                            description: `You are out of attempts, please create a new session by running \`${config.prefix}iamhuman\` in ${client.guilds.cache.get(config.guild).name}!`
                        }}).then(() => {
								//console.log(res.image);
								const embed = new Discord.MessageEmbed()
                            		.setTitle(`Captcha failed.`)
                            		.setAuthor(`${message.author.username}#${message.author.discriminator}`, `${message.author.avatarURL()}`)
                            		.setColor(0xFF0000)
									.addFields(
										{ name: `User`, value: `${message.author.username}#${message.author.discriminator}`, inline: true },
										{ name: 'Access to server', value: `\`Denied\``, inline: true },
									)
                            		.setFooter('Curated by Adam20054#0001', "https://i.imgur.com/CLAoaG9.png")
                            		.setTimestamp()

								client.channels.cache.get(config.logchannel).send(embed)
								console.log(`Captcha failed by ${message.author.username}#${message.author.discriminator} (ID: ${message.author.id}) in Nyx-Labs.\n      Looking for: ${data[message.author.id].code}`)

							}).then(() => {
								delete data[message.author.id];
							}).catch(() => {});
                    }
				}
			}
		break;
	}

});

if (config.token !== "INSERT_TOKEN") { client.login(config.token); }


function getConfig() { 
	if (fs.existsSync('./config.json')) { return JSON.parse(fs.readFileSync('./config.json', 'utf8'));  } else {
		var NC = { token: "INSERT_TOKEN", prefix: "!", guild: "GUILD_ID", captcha: { length: "LENGTH_OF_CAPTCHA" }, role: "VERIFIED_ROLE_ID",  };
		fs.writeFileSync("./config.json", JSON.stringify(NC,null,4)); return NC;
	}
}
function getSaveData() { if (fs.existsSync('./data.json')) { return JSON.parse(fs.readFileSync('./data.json', 'utf8')); } else { return {}; } }
function autoSave() { fs.writeFile('./data.json', JSON.stringify(data), (e) => {(e ? console.error("Autosave Error:",e) : "")}) }
function check() {
	if (((typeof(config.prefix) == 'string') ? config.prefix : '').length < 1) { console.error(`Prefix must be a string with at least one character.`); process.exit(1); }
	if (!client.guilds.cache.get(config.guild)) { console.error(`Guild not found: ${config.guild}`); process.exit(1); }
	if (isNaN(config.captcha.length)) { console.warn(`Captcha length is not a number, defaulting to ${config.captcha.length = "7"}`); }
	if (!client.guilds.cache.get(config.guild).roles.cache.get(config.role)) { console.warn(`Role ID ${config.role} was not found on ${client.guilds.cache.get(config.guild).name}, make sure it's up-to-date!`); }
}
function gCD() {
	var level = "Easy";
	if ((config.captcha.length > 80) || (config.captcha.length < 0)) { config.captcha.length = "7"; }
	if (config.captcha.length > 6) { level = "Normal"; }
	if (config.captcha.length > 9) { level = "Hard"; }
	if (config.captcha.length > 14) { level = "Impossible"; }
	if (config.captcha.length > 19) { level = "Literally Impossible"; }
	return level;
}