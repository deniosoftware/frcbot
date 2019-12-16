module.exports = function (matches, event, team) {
    var blocks = [
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: `Here's the schedule for <https://www.thebluealliance.com/event/${event.key}|*${event.name}*>:`
            }
        }
    ]

    blocks.push(...matches.filter(item => item.comp_level == "qm").sort((a, b) => a.match_number - b.match_number).map(item => {
        return {
            type: "section",
            text: {
                type: "mrkdwn",
                text: "*Quals " + item.match_number.toString() + "*"
            },
            fields: [
                {
                    type: "mrkdwn",
                    text: ":red_circle: " + item.alliances.red.team_keys.map(item => {
                        item = item.replace(/^frc/, "")
                        return item == team ? ":star:*" + item + "*" : item
                    }).join(', ')
                },
                {
                    type: "mrkdwn",
                    text: ":large_blue_circle: " + item.alliances.blue.team_keys.map(item => {
                        item = item.replace(/^frc/, "")
                        return item == team ? ":star:*" + item + "*" : item
                    }).join(', ')
                }
            ]
        }
    }))

    if(matches.length == 0){
        blocks.push({
            type: "section",
            text: {
                type: "plain_text",
                text: "There aren't any matches yet. Maybe check back later?"
            }
        })
    }

    var view = {
        type: "modal",
        title: {
            type: "plain_text",
            text: "Event Schedule"
        },
        blocks
    }

    return view
}