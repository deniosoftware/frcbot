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
    },
    newEventSubscription(event, channel, key, team) {
        var blocks = [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": `*Fantastic!* :tada: I've just subscribed the channel <#${channel}> to the event <https://www.thebluealliance.com/event/${event.key}|${event.name} ${event.year}>. Now, you'll recieve notifications for things such as match scores:trophy: and schedules :calendar:.`
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "To unsubscribe, just type `/tba unwatch` in this channel."
                },
                "accessory": {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "Unsubscribe",
                        "emoji": true
                    },
                    "style": "danger",
                    "action_id": "event_unwatch",
                    "value": key
                }
            }
        ]

        if (team) {
            blocks.push({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": `It looks like your team is at this event. If you want notifications for *team ${team.toString()} only*, please select the appropriate option.`
                },
                "accessory": {
                    "type": "static_select",
                    "placeholder": {
                        "type": "plain_text",
                        "text": "Select an item",
                        "emoji": true
                    },
                    "action_id": "event_watch_team",
                    "options": [
                        {
                            "text": {
                                "type": "plain_text",
                                "text": "All Matches"
                            },
                            "value": `${key}-all`
                        },
                        {
                            "text": {
                                "type": "plain_text",
                                "text": `Matches for team ${team.toString()}`,
                                "emoji": true
                            },
                            "value": `${key}-team`
                        }
                    ],
                    "initial_option": {
                        "text": {
                            "type": "plain_text",
                            "text": "All Matches"
                        },
                        "value": `${key}-all`
                    }
                }
            })
        }

        return blocks
    },
    appHome(events, team) {
        var blocks = [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": `*Your team:* ${team ? team.toString() : ""}`
                },
                "accessory": {
                    "type": "static_select",
                    placeholder: {
                        type: "plain_text",
                        text: "Select a year"
                    },
                    action_id: "year_select",
                    options: [
                        {
                            text: {
                                type: "plain_text",
                                text: "2019"
                            },
                            value: "2019"
                        },
                        {
                            text: {
                                type: "plain_text",
                                text: "2020"
                            },
                            value: "2020"
                        }
                    ]
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "*Upcoming Events*"
                }
            },
            {
                "type": "divider"
            }
        ]
        events.forEach(item => {
            blocks.push({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": `<https://www.thebluealliance.com/event/${item.code}|*${item.name}*>`
                },
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": `*Week*\n${item.week}`
                    },
                    {
                        "type": "mrkdwn",
                        "text": `*City*\n${item.city}`
                    }
                ],
                "accessory": {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "View on TBA",
                        "emoji": true
                    },
                    "style": "primary",
                    "value": "click_me_123",
                    "url": `https://www.thebluealliance.com/event/${item.code}`
                }
            })
            blocks.push({
                type: "divider"
            })
        })

        return blocks
    }
}