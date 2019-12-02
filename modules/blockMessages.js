module.exports = {
    team(number, name, rookie_year, hometown, isYourTeam) {
        var blocks = [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": `Team ${number}${name ? (" - *" + name + "*") : ""}`
                },
                "accessory": {
                    "type": "image",
                    "image_url": "https://the-blue-alliance-slack.appspot.com/avatar/" + number,
                    "alt_text": "Team avatar"
                },
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": `*Rookie Year*\n${(rookie_year ? rookie_year.toString() : "_<no rookie year>_")}`
                    },
                    {
                        "type": "mrkdwn",
                        "text": `*Hometown*\n${hometown}`
                    }
                ]
            },
            {
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {
                            "type": "plain_text",
                            "emoji": true,
                            "text": "View on TBA  :arrow_upper_right:"
                        },
                        "url": `https://www.thebluealliance.com/team/${number}`
                    }
                ]
            }
        ]

        if (isYourTeam) {
            blocks.push({
                type: "context",
                elements: [
                    {
                        type: "plain_text",
                        text: "This is your team! :tada:"
                    }
                ]
            })
        }

        return blocks;
    },
    help() {
        return [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: "Help is on the way!"
                }
            }
        ]
    },
    welcome() {
        return [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "*Welcome to TBA for Slack!*:wave: Here are some tips to get you started:"
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "*Set your team number:* Just type `/tba setteam <number>` to get personalized event results (and more cool stuff :sunglasses:)."
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "*Subscribe to an event:* Type `/tba watch <event code>` in any public channel to get notified when match schedules :calendar: and scores :trophy: are posted. You can find event codes at thebluealliance.com."
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "*Get team info:* Can't remember the rookie year of that one team? :thinking_face: Just type `/tba team <number>` to get info on any FRC team."
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "*What else?* Just say `/tba help` to show a list of possible commands."
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "*Need help?* Just shoot an e-mail to caleb@deniosoftware.com to report an issue (or suggest a feature)."
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "*_Happy Slacking!_* :wave:"
                }
            }
        ]
    }
}