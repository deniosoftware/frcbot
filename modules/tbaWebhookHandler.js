const { Datastore } = require('@google-cloud/datastore')
const datastore = new Datastore()

const data = require('./data')
const slack = require('./slack')

const blockMessages = require('./blockMessages')

module.exports = (req, res) => {
    res.end()
    switch (req.body.message_type) {
        case "match_score":
            var query = datastore.createQuery('subscriptions')
                .filter('event', req.body.message_data.match.event_key)

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
                            else if(item.type == "team"){
                                // Is their team in this match?
                                if(team && (req.body.message_data.match.alliances.red.teams.includes("frc" + team.toString()) || req.body.message_data.match.alliances.blue.teams.includes("frc" + team.toString()))){
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
            break
    }
}

function compLevelToString(comp_level){
    switch(comp_level){
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