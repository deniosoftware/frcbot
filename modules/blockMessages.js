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
    /**
     * 
     * @param {String} event 
     * @param {String} channel 
     * @param {String} key 
     * @param {String|null} team 
     */
    newEventSubscription(event, channel, key, team) {
        var blocks = [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": `*Fantastic!* :tada: I've just subscribed the channel <#${channel}> to the event <https://www.thebluealliance.com/event/${event.key}|${event.name} ${event.year}>. Now, you'll recieve notifications for things like match scores:trophy:.`
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
                        "text": "Unsubscribe"
                    },
                    "style": "danger",
                    "action_id": "event_unwatch",
                    "value": key
                }
            }
        ]

        if (team) {
            blocks.push({
                "block_id": "event_watch_team",
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
    appHome(events, team, years, defaultYear) {
        var options = years.map(item => {
            return {
                text: {
                    type: "plain_text",
                    text: item.toString()
                },
                value: item.toString()
            }
        }).reverse()
        var defaultOption = defaultYear ? ({
            text: {
                type: "plain_text",
                text: defaultYear.toString()
            },
            value: defaultYear.toString()
        }) : options[0]

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
                    options: options,
                    initial_option: defaultOption
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "*Your Events*"
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
                    "text": `<https://www.thebluealliance.com/event/${item.code}|*${item.name}*> _(${item.type})_\n\n:round_pushpin: ${item.location}\n\n:date: ${item.dates}${item.week ? "\n\n:clock1: " + item.week : ""}`
                },
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
        blocks.push({
            "type": "context",
            "elements": [
                {
                    "type": "image",
                    "image_url": "https://the-blue-alliance-slack.appspot.com/avatar/124",
                    "alt_text": "TBA Logo"
                },
                {
                    "type": "mrkdwn",
                    "text": "Data from <https://www.thebluealliance.com|The Blue Alliance>"
                }
            ]
        })

        return blocks
    },
    /**
     * 
     * @param {*} event 
     * @param {*} match 
     * @param {*} red 
     * @param {*} blue 
     * @param {*} [team] 
     */
    matchJustPlayed(event, match, red, blue, team) {
        red.teams = red.teams.map(item => item.replace('frc', ''))
        blue.teams = blue.teams.map(item => item.replace('frc', ''))

        // null - not in match, true - won match, false - lost match
        var status;
        if(red.teams.includes(team.toString()) && red.score >= blue.score){
            status = true;
        }
        else if(blue.teams.includes(team.toString()) && blue.score >= red.score){
            status = true;
        }
        else if(!blue.teams.includes(team.toString()) && !red.teams.includes(team.toString())){
            status = null;
        }
        else{
            // Lost match
            status = false;
        }

        var blocks = [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": `A match was just played in <https://www.thebluealliance.com/event/${event.key}|*${event.name}*>:\n<https://www.thebluealliance.com/match/${match.key}|*${match.name}*>`
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": `:red_circle: *Teams*: ${red.teams.map(item => item == team ? `<https://www.thebluealliance.com/team/${item}|*` + item.toString() + "*>" : `<https://www.thebluealliance.com/team/${item}|` + item.toString() + ">").join(', ')} | *Score*: ${red.score.toString()} ${red.score >= blue.score ? ":trophy:" : ""}\n:large_blue_circle: *Teams*: ${blue.teams.map(item => item == team ? `<https://www.thebluealliance.com/team/${item}|*` + item.toString() + "*>" : `<https://www.thebluealliance.com/team/${item}|` + item.toString() + ">").join(', ')} | *Score*: ${blue.score.toString()} ${blue.score >= red.score ? ":trophy:" : ""}`
                }
            },
            ...(status != null ? [{
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": `Your team (*${team}*) ${status == true ? "won this match! :tada:" : "lost this match. :cry:"}`
                }
            }] : []),
            {
                "type": "context",
                "elements": [
                    {
                        "type": "mrkdwn",
                        "text": "Use `/tba unwatch` to unsubscribe from future notifications in this channel."
                    }
                ]
            }
        ]
        return blocks
    }
}