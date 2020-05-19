var Discord = require('discord.js')
var discord = new Discord.Client()

const TBAClient = require('./tba')
const tbaClient = new TBAClient(process.env.tbaApiKey)

discord.on("message", m => {
    if (m.content.startsWith('!frc')) {
        const commandArgs = m.content.toLowerCase().split(' ')
        // Remove !frc
        commandArgs.shift()

        const command = commandArgs.shift()

        if (command == 'team') {
            if (commandArgs[0] && !isNaN(commandArgs[0])) {
                tbaClient.getTeam(commandArgs[0]).then(team => {
                    m.channel.send({
                        embed: {
                            title: `Team ${commandArgs[0]} - ${team.nickname}`,
                            thumbnail: {
                                url: `https://frcbot.deniosoftware.com/avatar/${commandArgs[0]}`
                            },
                            fields: [
                                {
                                    name: "Rookie Year",
                                    value: team.rookie_year || '_<No rookie year>_',
                                    inline: true
                                },
                                {
                                    name: "Hometown",
                                    value: team.hometown,
                                    inline: true
                                }
                            ],
                            provider: {
                                name: "The Blue Alliance",
                                url: "https://www.thebluealliance.com"
                            },
                            url: `https://www.thebluealliance.com/team/${commandArgs[0]}`
                        }
                    })
                })
            }
            else{
                m.reply("Hmm... :thinking: I'm not sure what you're trying to say. Try typing `!frc help` to see what I can do.")
            }
        }
    }
})

discord.login(process.env.discordToken)

module.exports = discord