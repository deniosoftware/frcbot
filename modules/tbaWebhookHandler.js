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
    switch (req.body.message_type) {
        case "match_score":
            var query = datastore.createQuery('subscriptions')
                .filter('event', req.body.message_data.match.event_key)
                .filter('match_score', true)

            datastore.runQuery(query, function (err, entities) {
                if (err) {
                    console.log(err.message)
                }
                else {
                    entities.forEach(item => {
                        data.getTeamNumber(item.team_id).then(team => {
                            if (item.type == "all") {
                                data.getToken(item.team_id).then(token => {
                                    slack.postMessage(blockMessages.matchJustPlayed({
                                        name: req.body.message_data.event_name,
                                        key: req.body.message_data.match.event_key
                                    },
                                        {
                                            name: compLevelToString(req.body.message_data.match.comp_level) + " " + req.body.message_data.match.match_number.toString(),
                                            key: req.body.message_data.match.key
                                        },
                                        req.body.message_data.match.alliances.red,
                                        req.body.message_data.match.alliances.blue,
                                        team), item.channel, token)
                                })
                            }
                            else if (item.type == "team") {
                                // Is their team in this match?
                                if (team && (req.body.message_data.match.alliances.red.teams.includes("frc" + team.toString()) || req.body.message_data.match.alliances.blue.teams.includes("frc" + team.toString()))) {
                                    data.getToken(item.team_id).then(token => {
                                        slack.postMessage(blockMessages.matchJustPlayed({
                                            name: req.body.message_data.event_name,
                                            key: req.body.message_data.match.event_key
                                        },
                                            {
                                                name: compLevelToString(req.body.message_data.match.comp_level) + " " + req.body.message_data.match.match_number.toString(),
                                                key: req.body.message_data.match.key
                                            },
                                            req.body.message_data.match.alliances.red,
                                            req.body.message_data.match.alliances.blue,
                                            team), item.channel, token)
                                    })
                                }
                            }
                        })
                    })
                }
            })
            break;
        case "upcoming_match":
            request(`https://www.thebluealliance.com/api/v3/match/${req.body.message_data.match_key}`, {
                headers: {
                    "X-TBA-Auth-Key": process.env.tbaApiKey
                }
            }, function (err, resp, body) {
                if (!err && resp.statusCode == 200) {
                    body = JSON.parse(body)

                    var query = datastore.createQuery('subscriptions')
                        .filter('event', body.event_key)
                        .filter('upcoming_match', true)
                    datastore.runQuery(query, function (err, entities) {
                        entities.forEach(item => {
                            data.getTeamNumber(item.team_id).then(number => {
                                if (item.type == "all") {
                                    data.getToken(item.team_id).then(token => {
                                        slack.postMessage(blockMessages.upcomingMatch({
                                            name: req.body.message_data.event_name,
                                            key: body.event_key
                                        }, {
                                            name: compLevelToString(body.comp_level) + " " + body.match_number.toString(),
                                            key: req.body.message_data.match_key
                                        }, req.body.message_data.team_keys, number), item.channel, token)
                                    })
                                }
                                else if (item.type == "team" && number && (req.body.message_data.team_keys.includes("frc" + number.toString()))) {
                                    data.getToken(item.team_id).then(token => {
                                        slack.postMessage(blockMessages.upcomingMatch({
                                            name: req.body.message_data.event_name,
                                            key: body.event_key
                                        }, {
                                            name: compLevelToString(body.comp_level) + " " + body.match_number.toString(),
                                            key: req.body.message_data.match_key
                                        }, req.body.message_data.team_keys, number), item.channel, token)
                                    })
                                }
                            })
                        })
                    })
                }
            })
            break;
        case "schedule_updated":
            // Get event info
            tbaClient.getEvent(req.body.message_data.event_key).then(event => {
                var query = datastore.createQuery('subscriptions')
                    .filter('event', req.body.message_data.event_key)
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
                                            text: `The match schedule for <https://www.thebluealliance.com/event/${req.body.message_data.event_key}|*${event.name} ${event.year.toString()}*> has been updated.`
                                        },
                                        accessory: {
                                            type: "button",
                                            text: {
                                                type: "plain_text",
                                                text: "View"
                                            },
                                            action_id: "schedule",
                                            value: req.body.message_data.event_key
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