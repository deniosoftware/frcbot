const { Datastore } = require('@google-cloud/datastore')
const datastore = new Datastore()

const data = require('./data')
const slack = require('./slack')

const blockMessages = require('./blockMessages')

const request = require('request')

const TBAClient = require('./tba')
const tbaClient = new TBAClient(process.env.tbaApiKey)

module.exports = (req, res) => {
    res.end()

    var message_data = req.body.message_data

    switch (req.body.message_type) {
        case "match_score":
            var blueTeams = message_data.match.alliances.blue.teams.map(item => item.replace(/^frc/, ""))
            var redTeams = message_data.match.alliances.red.teams.map(item => item.replace(/^frc/, ""))

            var allTeams = blueTeams.concat(redTeams)

            var query = datastore.createQuery('subscriptions')
                .filter('event', message_data.match.event_key)
                .filter('match_score', true)

            // Get all match score subscriptions for this event
            datastore.runQuery(query, function (err, entities) {
                // Loop over subscriptions
                entities.forEach(item => {
                    data.getTeamNumber(item.team_id).then(team => {
                        var additionalTeams;

                        try {
                            if (!item.additional_teams) {
                                throw new Error("woot")
                            }
                            additionalTeams = JSON.parse(item.additional_teams)
                        }
                        catch (e) {
                            // Not JSON
                            additionalTeams = null;
                        }

                        var subscribedTeams = [...(team ? [team.toString()] : []), ...(additionalTeams || [])]

                        var match_name = ""
                        
                        if(message_data.match.comp_level != "qm"){
                            match_name = compLevelToString(message_data.match.comp_level) + " " + message_data.match.set_number.toString() + " Match " + message_data.match.match_number.toString()
                        }
                        else{
                            match_name = compLevelToString(message_data.match.comp_level) + " " + message_data.match.match_number.toString()
                        }

                        if (item.type == "all" || (item.type == "team" && allTeams.some(item => subscribedTeams.includes(item)))) {
                            data.getToken(item.team_id).then(token => {
                                slack.postMessage(blockMessages.matchJustPlayed({
                                    name: message_data.event_name,
                                    key: message_data.match.event_key
                                },
                                    {
                                        name: match_name,
                                        key: message_data.match.key
                                    },
                                    message_data.match.alliances.red,
                                    message_data.match.alliances.blue,
                                    team, subscribedTeams), item.channel, token)
                            })
                        }
                    })
                })
            })
            break;
        case "upcoming_match":
            var allTeams = message_data.team_keys.map(item => item.replace('frc', ''))

            request(`https://www.thebluealliance.com/api/v3/match/${message_data.match_key}`, {
                headers: {
                    "X-TBA-Auth-Key": process.env.tbaApiKey
                }
            }, function (err, resp, body) {
                body = JSON.parse(body)

                var query = datastore.createQuery('subscriptions')
                    .filter('event', body.event_key)
                    .filter('upcoming_match', true)
                datastore.runQuery(query, function (err, entities) {
                    entities.forEach(item => {
                        data.getTeamNumber(item.team_id).then(team => {
                            var additionalTeams;

                            try {
                                if (!item.additional_teams) {
                                    throw new Error("woot")
                                }
                                additionalTeams = JSON.parse(item.additional_teams)
                            }
                            catch (e) {
                                // Not JSON
                                additionalTeams = null;
                            }

                            var subscribedTeams = [...(team ? [team.toString()] : []), ...(additionalTeams || [])]

                            if (item.type == "all" || (item.type == "team" && allTeams.some(item => subscribedTeams.includes(item)))) {
                                data.getToken(item.team_id).then(token => {
                                    slack.postMessage(blockMessages.upcomingMatch({
                                        name: message_data.event_name,
                                        key: body.event_key
                                    }, {
                                        name: compLevelToString(body.comp_level) + " " + body.match_number.toString(),
                                        key: message_data.match_key
                                    }, message_data.team_keys, team, subscribedTeams), item.channel, token)
                                })
                            }
                        })
                    })
                })
            })
            break;
        case "schedule_updated":
            // Get event info
            tbaClient.getEvent(message_data.event_key).then(event => {
                var query = datastore.createQuery('subscriptions')
                    .filter('event', message_data.event_key)
                    .filter('event_schedule', true)

                datastore.runQuery(query, function (err, entities) {
                    if (err) {
                        console.log(err.message)
                    }
                    else {
                        entities.forEach(item => {
                            data.getToken(item.team_id).then(token => {
                                slack.postMessage([
                                    {
                                        type: "section",
                                        text: {
                                            type: "mrkdwn",
                                            text: `The match schedule for <https://www.thebluealliance.com/event/${message_data.event_key}|*${event.name} ${event.year.toString()}*> has been updated.`
                                        },
                                        accessory: {
                                            type: "button",
                                            text: {
                                                type: "plain_text",
                                                text: "View"
                                            },
                                            action_id: "schedule",
                                            value: message_data.event_key
                                        }
                                    },
                                    {
                                        type: "context",
                                        elements: [
                                            {
                                                type: "mrkdwn",
                                                text: "Use `/frc unwatch` to unsubscribe from future notifications in this channel, or `/frc watch` to manage your subscriptions."
                                            }
                                        ]
                                    }
                                ], item.channel, token)
                            })
                        })
                    }
                })
            })
            break;
    }
}

function compLevelToString(comp_level) {
    switch (comp_level) {
        case "qm":
            return "Qualification"
        case "qf":
            return "Quarterfinals"
        case "sf":
            return "Semifinals"
        case "f":
            return "Finals"
        case "ef":
            return "Octofinals"
        default:
            return "Match"
    }
}