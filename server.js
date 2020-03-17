let express = require(`express`)
let Discord = require(`discord.js`)
let client = new Discord.Client();
let rsa = require(`js-crypto-rsa`)
let fs = require('fs')
let aesjs = require(`aes-js`)
let JSOB = require('javascript-obfuscator')
let app = express()
let config = require(`config-yml`)
let sqlite3 = require(`sqlite3`).verbose()
let embedColor = config.DISCORD.COLOR
let PORT = config.SERVER.PORT
let mediaFire = config.DISCORD.MEDIAFIRE



client.login(config.DISCORD.TOKEN)
client.on(`ready`, () => {
	console.log(`Logged in as ${client.user.tag}`)
	console.log()
})




let db = new sqlite3.Database(`database.db`, (err) => {
	if (err) return console.error(err.message)
	console.log("Connected to SQLite database!")
})




db.serialize(function() {
	db.run("CREATE TABLE IF NOT EXISTS users (discord_id TEXT, ip TEXT, token TEXT, products TEXT)");
	db.run("CREATE TABLE IF NOT EXISTS blacklistedIps (discord_id TEXT, ip TEXT)");
});




function addToDB(obj) {
	db.all(`SELECT * FROM users WHERE discord_id = '${obj.id}'`, function(err, row) {
		if (row.length == 0) {
			db.serialize(function() {
				db.run(`INSERT INTO users(discord_id, ip, token, products) VALUES ('${obj.id}','${obj.ip}', '${obj.token}', '${obj.product}')`);
			})
		} else {
			if (searchInArray(config.PRODUCTS, obj.product)) {
				let newProducts = row[0].products + "," + obj.product
				db.serialize(function() {
					db.run(`DELETE FROM users WHERE discord_id = ${obj.id}`)
					db.run(`INSERT INTO users(discord_id, ip, token, products) VALUES ('${obj.id}','${row[0].ip}', '${row[0].token}', '${newProducts}')`);
				})
			}
		}
	})

}




function delRow(id) {
	db.serialize(function() {
		db.run(`DELETE FROM users WHERE discord_id = ${id}`)
	})
}




function searchInArray(array, value) {
	for (i = 0; i < array.length; i++) {
		if (array[i] == value) {
			return true
		}
	}
	return false
}





function encryptAES(key, text) {
	let aesKey = aesjs.utils.utf8.toBytes(key)
	let textBytes = aesjs.utils.utf8.toBytes(text)
	let aesCtr = new aesjs.ModeOfOperation.ctr(aesKey, new aesjs.Counter(5))
	let encrypted = aesCtr.encrypt(textBytes)

	return aesjs.utils.hex.fromBytes(encrypted)
}




function createToken(length) { //creates unique token (checks to make sure its unique)  ADD CHECK FOR TOKENS DUMBASS
	let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let cache = [];
	while (cache.length < length) cache.push(characters[Math.floor((Math.random() * characters.length - 1) + 1)])
	return cache.join("")
}




function hasRole(member, name) {
	if (member.roles.find(r => r.name == name)) {
		return true
	} else {
		return false
	}
}




function insufficientPerms(channel) {
	let embed = new Discord.RichEmbed()
		.setDescription(`:x: inefficient permissions`)
		.setColor("#FF0000")
	channel.send(embed)
}




client.on(`message`, msg => {
	if (!msg.content.startsWith(config.DISCORD.PREFIX)) return;
	let args = msg.content.split(/\ +/);
	let cmd = args.shift().slice(config.DISCORD.PREFIX.length).toLowerCase();
	if (msg.author.bot) return;

	switch (cmd) {
		case "give": 
			if (hasRole(msg.member, config.DISCORD.MANAGERROLE)) {
				if (!args[0]) return msg.channel.send(":x: Invalid args!")
				let token = createToken(16)
				if (searchInArray(config.PRODUCTS, args[1].toLowerCase())) {
					db.all(`SELECT * FROM users WHERE discord_id = '${msg.mentions.members.first().id}'`, function(err, row) {
						console.log(`${msg.author.tag} gave ${msg.mentions.members.first().user.tag} a ${args[1]}`)
						if (row.length == 0) {
							let embed = new Discord.RichEmbed()
								.setTitle(`🎉 ${msg.mentions.members.first().user.tag} you have recieved a ${args[1]}! 🎉`)
								.setColor(embedColor)
								.setDescription(`Your token is \`${token}\`\nTo use it, download the base client:\n ${mediaFire}`)
							msg.mentions.members.first().send(embed)
							addToDB({
								id: msg.mentions.members.first().id.toString(),
								token: token,
								ip: "null",
								product: args[1].toLowerCase()
							})
							} else {
							let embed = new Discord.RichEmbed()
								.setTitle(`🎉 ${msg.mentions.members.first().user.tag} you have recieved a ${args[1]}! 🎉`)
								.setDescription("To use it, login with your token etc etc etc...")
								.setColor(embedColor)
							msg.mentions.members.first().send(embed)
							addToDB({
								id: msg.mentions.members.first().id.toString(),
								token: token,
								ip: "null",
								product: args[1].toLowerCase()
							})
						}

					})


				} else {
					msg.channel.send(`Uknown product, please select one of the following: \`${config.PRODUCTS}\``)
				}
			} else {
				insufficientPerms(msg.channel)
			}
			break;
			// case "remove":
			// 	if (hasRole(msg.member, config.DISCORD.MANAGERROLE)) {
			// 		if (!args[0]) return msg.channel.send(":x: Invalid args!")
			// 		let token = createToken(16)
			// 		if (searchInArray(config.PRODUCTS, args[1].toLowerCase())) {
			// 			db.all(`SELECT * FROM users WHERE discord_id = '${msg.mentions.members.first().id}'`, function(err, row) {
			// 				console.log(`${msg.author.tag} took away ${args[1]} from ${msg.mentions.members.first().user.tag}}`)



			// 					db.all(`SELECT * FROM users WHERE discord_id = '${obj.id}'`, function(err, row) {
			// 						if (row.length == 0) {
			// 							db.serialize(function() {
			// 								db.run(`INSERT INTO users(discord_id, ip, token, products) VALUES ('${obj.id}','${obj.ip}', '${obj.token}', '${obj.product}')`);
			// 							})
			// 						} else {
			// 							if (searchInArray(config.PRODUCTS, obj.product)) {
			// 								let newProducts = row[0].products + "," + obj.product
			// 								db.serialize(function() {
			// 									db.run(`DELETE FROM users WHERE discord_id = ${obj.id}`)
			// 									db.run(`INSERT INTO users(discord_id, ip, token, products) VALUES ('${obj.id}','${row[0].ip}', '${row[0].token}', '${newProducts}')`);
			// 								})
			// 							}
			// 						}
			// 					})



								

			// 			})
	
	
			// 		} else {
			// 			msg.channel.send(`Uknown product, please select one of the following: \`${config.PRODUCTS}\``)
			// 		}
			// 	} else {
			// 		insufficientPerms(msg.channel)
			// 	}
	
			// break;
		case "blacklist":
				if (hasRole(msg.member, config.DISCORD.MANAGERROLE)) {
			if (!args[0]) return msg.channel.send(":x: Invalid args!")
			switch (args[0]) {
				case "add":
					db.all(`SELECT * FROM users WHERE discord_id = '${msg.mentions.members.first().id.toString()}'`, function(err, row) {
						let embed = new Discord.RichEmbed()
							.setTitle(`${msg.mentions.members.first().user.tag} has been blacklisted!`)
							.setColor(embedColor)
						msg.channel.send(embed)
						db.run(`INSERT INTO blacklistedIps(discord_id, ip) VALUES ('${row[0].discord_id}', '${row[0].ip}')`);
					})
					break;
				case "remove":
					db.serialize(function() {
						db.run(`DELETE FROM blacklistedIps WHERE discord_id = ${msg.mentions.members.first().id.toString()}`)

						let embed = new Discord.RichEmbed()
							.setTitle(`${msg.mentions.members.first().user.tag} has been removed from the blacklist!`)
							.setColor(embedColor)
						msg.channel.send(embed)
					})
				break;
				default:
					let embed = new Discord.RichEmbed()
						.setDescription(`:x: Invalid args!`)
						.setColor("#FF0000")
					msg.channel.send(embed)
				break;

			}
				} else {
					insufficientPerms(msg.channel)
				}
			break;
		case "delete":
			if (!args[0]) return msg.channel.send(":x: Invalid args!")
			break;
		case "help":
				let embed = new Discord.RichEmbed()
					.setTitle(`Commands:`)
					.setDescription(`Commands: \`\`\`xml\n
${config.DISCORD.PREFIX}help (shows all available commands)
${config.DISCORD.PREFIX}give <@user> <product> (gives the specified user access to the product)
${config.DISCORD.PREFIX}blacklist add/remove <@user/id> (adds or removes user from blacklist)
${config.DISCORD.PREFIX}reset ip/token (resets the user's token or ip)\`\`\``)
					.setColor(embedColor)
				msg.channel.send(embed)
			break;
		case "reload":
			if (!args[0]) return msg.channel.send(":x: Invalid args!")
			break;
		case "reset":
				if (hasRole(msg.member, config.DISCORD.MANAGERROLE)) {
					if (!args[0]) return msg.channel.send(":x: Invalid args!")
					switch(args[0]) {
						case "ip":
								db.each(`SELECT * FROM users WHERE discord_id = ${msg.mentions.members.first().id}`, function(err, row) {
									let embed = new Discord.RichEmbed()
										.setTitle(`${msg.mentions.members.first().user.tag}'s IP has been reset!`)
										.setColor(embedColor)
									msg.channel.send(embed)
									db.run(`DELETE FROM users WHERE discord_id = ${msg.mentions.members.first().id}`)
									db.run(`INSERT INTO users(discord_id, ip, token, products) VALUES ('${row.discord_id}','null', '${row.token}', '${row.products}')`);
								})
						break;
						case "token":
							let token = createToken(16)
								db.each(`SELECT * FROM users WHERE discord_id = ${msg.mentions.members.first().id}`, function(err, row) {
									let embed = new Discord.RichEmbed()
										.setTitle(`${msg.mentions.members.first().user.tag}'s token has been reset!`)
										.setColor(embedColor)
									msg.channel.send(embed)
									db.run(`DELETE FROM users WHERE discord_id = ${msg.mentions.members.first().id}`)
									db.run(`INSERT INTO users(discord_id, ip, token, products) VALUES ('${row.discord_id}','${row.ip}', '${token}', '${row.products}')`);
									embed = new Discord.RichEmbed()
										.setTitle(`Your new token is \`${token}\``)
										.setColor(embedColor)
									msg.mentions.members.first().send(embed)
								})
						break;
						default:
							let embed = new Discord.RichEmbed()
								.setDescription(`:x: Invalid args!`)
								.setColor("#FF0000")
							msg.channel.send(embed)
						break;
					}
				} else {
					insufficientPerms(msg.channel)
				}
			break;
		case "get":
				if (hasRole(msg.member, config.DISCORD.MANAGERROLE)) {
			if (!args[0]) return msg.channel.send(":x: Invalid args!")
			db.all(`SELECT * FROM users WHERE discord_id = ${msg.mentions.members.first().id}`, function(err, row) {
				msg.channel.send(JSON.stringify(row))
			})
				} else {
					insufficientPerms(msg.channel)
				}
			break;

	}
})




app.get(`/index.html`, function(req, res) {
	res.sendFile(__dirname + "/" + "index.html")
})




app.get(`/user`, function(req, res) {

	if (req.query.hasOwnProperty("KEY") && req.query.hasOwnProperty("TOKEN") && req.query.hasOwnProperty("TYPE")) {
		AESKEY = createToken(32)
		IP = req.socket.remoteAddress.substring(7, req.socket.remoteAddress.length)
		TOKEN = req.query.TOKEN
		TYPE = req.query.TYPE.toLowerCase()
		console.log(req.query.SIZE)
		db.all(`SELECT * FROM blacklistedIps WHERE ip = '${IP}'`, function(err, row) {
			if (row.length == 0) {
				db.each(`SELECT * FROM users WHERE (token = '${TOKEN}') OR (ip = '${IP}')`, function(err, row) {
					if (row.token == TOKEN) {
						if (config.FILESIZE == req.query.SIZE) {
							if (row.ip == 'null' || row.ip == IP) {
								if (row.ip == 'null') {
									delRow(row.discord_id)
									db.serialize(function() {
										db.run(`INSERT INTO users(discord_id, ip, token, products) VALUES ('${row.discord_id}','${IP}', '${req.query.TOKEN}', '${row.products}')`);
									})
								}

								if (searchInArray(config.PRODUCTS, TYPE)) {
									if (searchInArray(row.products.toLowerCase().split(","), TYPE)) {

										RSAKEY = {
											kty: 'RSA',
											n: req.query.KEY.split("").reverse().join(""),
											e: `AQAB`
										}
										fs.readFile(`Files/${TYPE}.js`, `utf8`, function(err, data) {
											function obfuscate(txt, controlFlowFlattening) {
												let obfuscated = JSOB.obfuscate(txt, {
													compact: true,
													controlFlowFlattening: controlFlowFlattening,
													controlFlowFlatteningThreshold: 1,
													deadCodeInjection: true,
													deadCodeInjectionThreshold: 1,
													debugProtection: true,
													debugProtectionInterval: true,
													disableConsoleOutput: false,
													domainLock: [],
													identifierNamesGenerator: 'hexadecimal',
													identifiersDictionary: [],
													identifiersPrefix: '',
													inputFileName: '',
													log: false,
													renameGlobals: true,
													reservedNames: [],
													reservedStrings: [],
													rotateStringArray: true,
													seed: 0,
													selfDefending: false,
													sourceMap: false,
													sourceMapBaseUrl: '',
													sourceMapFileName: '',
													sourceMapMode: 'separate',
													splitStrings: true,
													splitStringsChunkLength: 10,
													stringArray: true,
													stringArrayEncoding: `rc4`,
													stringArrayThreshold: 1,
													target: 'node',
													transformObjectKeys: false,
													unicodeEscapeSequence: false

												})
												return obfuscated._obfuscatedCode
											}
											let ob1 = obfuscate(`request=require("request");config=require("config-yml");sha256=require('sha256-file');request(\`http://${config.SERVER.HOST}:${config.SERVER.PORT}/user?TOKEN=\${config.Client.token}&SIZE=\${sha256(__filename)}&TYPE=\${config.Client.type}\`,{json:!0},(e,o,t)=>{if(e)return console.log("[ERROR] ECONNREFUSED");if(1==o.body.AUTH){${data}}});`, true)

											encob = encryptAES(AESKEY, ob1) + encryptAES(AESKEY.split("").reverse().join(""), createToken(1024))
											rsa.encrypt(aesjs.utils.utf8.toBytes(AESKEY), RSAKEY).then((encrypted) => {
												response = {
													KEY: aesjs.utils.hex.fromBytes(encrypted).split("").reverse().join(""),
													DATA: `${encob.split("").reverse().join("")}|${encryptAES(AESKEY, ob1).length}`
												}

												res.end(JSON.stringify(response))
												console.log(`${IP} successfully logged in (${TYPE})!`)
												let embed = new Discord.RichEmbed()
													.setDescription(`:white_check_mark: **${IP}** successfully logged in!`)
													.setColor("#09D609")
												client.guilds.get(config.DISCORD.GUILDID).channels.find(x => x.id == config.DISCORD.notificationChannel).send(embed)
											})
										})
									} else {
										res.end(JSON.stringify({
											MSG: `console.log('You do not have ${TYPE.toLowerCase()}. Please use one of the following: | ${row.products.toLowerCase()} |')`
										}))
									}

								} else {
									res.end(JSON.stringify({
										MSG: `console.log('Unknown product. Please use one of the following: | ${config.PRODUCTS} |')`
									}))
								}

							} else {
								let embed = new Discord.RichEmbed()
									.setDescription(`:warning: **${IP}** attempted to log in with an invalid IP!`)
									.setColor("#FFBE00")
								client.guilds.get(config.DISCORD.GUILDID).channels.find(x => x.id == config.DISCORD.notificationChannel).send(embed)
								res.end(JSON.stringify({
									MSG: "console.log('Invalid IP, please contact an administrator to reset it!')"
								}))
							}
						} else {
							let embed = new Discord.RichEmbed()
								.setDescription(`:exclamation: **${IP}** was blacklisted for attempting to edit the source code!`)
								.setColor("#FF0000")
							client.guilds.get(config.DISCORD.GUILDID).channels.find(x => x.id == config.DISCORD.notificationChannel).send(embed)
							console.log(`${IP} Was blacklisted for attempting to edit the source code!`)
							db.run(`INSERT INTO blacklistedIps(discord_id, ip) VALUES ('${row.discord_id}', '${IP}')`);
							res.end(JSON.stringify({
								MSG: "console.log(`OI, DON'T MESS WITH OUR SHIT! (You have been blacklisted!)`)"
							}))
						}
					} else {
						let embed = new Discord.RichEmbed()
							.setDescription(`:warning: **${IP}** attempted to log in with an invalid token!`)
							.setColor("#FFBE00")
						console.log(`${IP} attempted to log in with an invalid token!`)
						client.guilds.get(config.DISCORD.GUILDID).channels.find(x => x.id == config.DISCORD.notificationChannel).send(embed)
						res.end(JSON.stringify({
							MSG: "console.log('Invalid token, please input a valid token!')"
						}))
					}

				})


			} else {
				let embed = new Discord.RichEmbed()
					.setDescription(`:exclamation:  **${IP}** attempted to log in while blacklisted!`)
					.setColor("#FF0000")
				client.guilds.get(config.DISCORD.GUILDID).channels.find(x => x.id == config.DISCORD.notificationChannel).send(embed)
				console.log("Someone attempted to log in with blacklisted ip")
				res.end(JSON.stringify({
					MSG: "console.log(`You are blacklisted for attempting to edit the source code! Please contact an administrator if you feel like this was a mistake.`)"
				}))

			}
		})

	} else if (!req.query.hasOwnProperty("KEY") && req.query.hasOwnProperty("TOKEN") && req.query.hasOwnProperty("TYPE")) {
		AESKEY = createToken(32)
		IP = req.socket.remoteAddress.substring(7, req.socket.remoteAddress.length)
		TOKEN = req.query.TOKEN
		TYPE = req.query.TYPE.toLowerCase()
		db.all(`SELECT * FROM blacklistedIps WHERE ip = '${IP}'`, function(err, brow) {
			if (brow.length == 0) {
				db.each(`SELECT * FROM users WHERE (token = '${TOKEN}') OR (ip = '${IP}')`, function(err, row) {
					if (config.FILESIZE == req.query.SIZE) {
						if (row.token == TOKEN) {
							if (row.ip == IP) {
								res.end(JSON.stringify({
									AUTH: true
								}))
							} else {
								let embed = new Discord.RichEmbed()
									.setDescription(`:warning: **${IP}** attempted to log in with an invalid IP!`)
									.setColor("#FFBE00")
								client.guilds.get(config.DISCORD.GUILDID).channels.find(x => x.id == config.DISCORD.notificationChannel).send(embed)
							}
						} else {
							let embed = new Discord.RichEmbed()
								.setDescription(`:warning: **${IP}** attempted to log in with an invalid token!`)
								.setColor("#FFBE00")
							client.guilds.get(config.DISCORD.GUILDID).channels.find(x => x.id == config.DISCORD.notificationChannel).send(embed)
						}
					} else {
						let embed = new Discord.RichEmbed()
							.setDescription(`:exclamation: **${IP}** was blacklisted for attempting to edit the source code!`)
							.setColor("#FF0000")
						client.guilds.get(config.DISCORD.GUILDID).channels.find(x => x.id == config.DISCORD.notificationChannel).send(embed)
						console.log(`${IP} Was blacklisted for attempting to edit the source code!`)
						db.run(`INSERT INTO blacklistedIps(discord_id, ip) VALUES ('${row.discord_id}', '${IP}')`);
					}

				})
			} else {
				let embed = new Discord.RichEmbed()
					.setDescription(`:exclamation:  **${IP}** attempted to log in while blacklisted!`)
					.setColor("#FF0000")
				client.guilds.get(config.DISCORD.GUILDID).channels.find(x => x.id == config.DISCORD.notificationChannel).send(embed)
				console.log("Someone attempted to log in with blacklisted ip")
			}
		})

	}





})




let server = app.listen(PORT, function() {
	let host = server.address().address;
	let port = server.address().port;
	console.log(`Connectted to http://%s:%s`, host, port)
})
