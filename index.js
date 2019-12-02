require('dotenv').config()

var express = require('express')
var app = express()

var request = require('request')

var TBAClient = require('./modules/tba')
var tbaClient = new TBAClient(process.env.tbaApiKey)

var parseSlashCommand = require('./modules/slashCommandParser')

var blockMessages = require('./modules/blockMessages')

var slack = require('./modules/slack')

const { Datastore } = require('@google-cloud/datastore')
const datastore = new Datastore()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))


app.get('/', (req, res) => {
    res.sendFile("index.html", {
        root: "views/"
    })
})
app.all('/teaminfo', (req, res) => {
    res.send("Coming soon...")
})

app.post('/tbaWebhook', (req, res) => {
    console.log(req.body)
    res.end()
})

app.post('/testing', (req, res) => {
    res.end("Moo")
    datastore.save({
        key: datastore.key('users'),
        data: {
            name: req.body.name
        }
    }, function (err, resp) {
        if (err) {
            console.log("Error: " + err.message)
        }
        else {
            console.log(resp)
        }
    })
})

app.get('/testing', (req, res) => {
    datastore.runQuery(datastore.createQuery('users'), function (err, resp) {
        if (err) {
            res.status(500).send(err.message)
        }
        else {
            res.send(resp.toString())
        }
    })
})

app.get('/oauth/code', (req, res) => {
    request('https://slack.com/api/oauth.access', {
        method: "POST",
        form: {
            client_id: process.env.client_id,
            client_secret: process.env.client_secret,
            code: req.query.code,
            redirect_uri: process.env.redirect_uri
        }
    }, (err, resp, body) => {
        res.redirect('/')
        if (err) {
            console.log("Error: " + err.message)
        }
        else {
            datastore.runQuery(datastore.createQuery('users').filter('team_id', JSON.parse(body).team_id), function (err, entities) {
                if (err) {
                    console.log(err)
                }
                else if (entities.length != 0) {
                    //Team already exists, so update token

                    entities[0].token = JSON.parse(body).access_token
                    datastore.save(entities[0])
                }
                else {
                    datastore.save({
                        key: datastore.key('users'),
                        data: {
                            token: JSON.parse(body).access_token,
                            team_id: JSON.parse(body).team_id
                        }
                    })
                }

                slack.postMessage(blockMessages.welcome(), "#general", JSON.parse(body).access_token)
            })
        }
    })
})

app.post('/slack/tba', (req, res) => {
    var parsed = parseSlashCommand(req.body.text)

    switch (parsed.command) {
        case "team":
            if (!parsed.params[0] || parsed.params[0] == "" || isNaN(parsed.params[0])) {
                res.json({
                    response_type: "in_channel",
                    text: "Please type `/tba team <number>` for this to work correctly."
                })
            }
            else {
                tbaClient.getTeam(parsed.params[0], (err, teamInfo) => {
                    if (err && err.message == "404") {
                        res.json({
                            response_type: "in_channel",
                            text: "I couldn't find that team."
                        })
                    }
                    else if (err) {
                        res.json({
                            response_type: "in_channel",
                            text: "Something went wrong on our end. Please try again in a little bit."
                        })
                    }
                    else {
                        datastore.runQuery(datastore.createQuery('users').filter('team_id', req.body.team_id), function (err, entities) {
                            var isYourTeam = false
                            if (entities[0]['team_number'] && entities[0]['team_number'] == parsed.params[0]) {
                                isYourTeam = true
                            }

                            res.json({
                                response_type: "in_channel",
                                blocks: blockMessages.team(parsed.params[0], teamInfo.nickname, teamInfo.rookie_year, "Test", isYourTeam)
                            })
                        })
                    }
                })
            }

            break;
        case "watch":
            if (!parsed.params[0] || parsed.params[0] == "" || !/^\d{4}\D{3,}$/.test(parsed.params[0])) {
                res.send("Invalid syntax.")
            }
            else {
                tbaClient.getEvent(parsed.params[0], (err, event) => {
                    if(err){
                        res.send("Error")
                    }
                    else{
                        res.send(event.name)
                    }
                })
            }

            break;
        case "setteam":
            if (!parsed.params[0] || parsed.params[0] == "" || isNaN(parsed.params[0])) {
                res.json({
                    response_type: "in_channel",
                    text: "Please type `/tba setteam <number>` for this to work correctly."
                })
            }
            else {
                var query = datastore.createQuery('users').filter('team_id', req.body.team_id)
                datastore.runQuery(query, (err, entities) => {
                    if (err) {
                        res.send(err)
                    }
                    else if (entities.length == 0) {
                        res.json({
                            response_type: "in_channel",
                            text: "Hmm... I can't find your Slack workspace. Please try reinstalling TBA for Slack."
                        })
                    }
                    else {
                        entities[0].team_number = parseInt(parsed.params[0])
                        datastore.update(entities[0], err => {
                            if (err) {
                                res.send(err.message)
                            }
                            else {
                                res.json({
                                    response_type: "in_channel",
                                    text: `Awesome! :tada: I've updated your team number to *${parsed.params[0]}*.`
                                })
                            }
                        })
                    }
                })
            }
            break;
        case "help":
            res.json({
                response_type: "in_channel",
                blocks: blockMessages.help()
            })
            break;
        default:
            res.json({
                response_type: "in_channel",
                text: "Hmm... :thinking_face: I don't recognize that command. Try `/tba help` to list all of the possible commands."
            })
            break;
    }
})

app.post('/slack/events', (req, res) => {
    if (req.body.challenge) {
        res.send(req.body.challenge)
    }

    res.end()
    switch (req.body.event.type) {
        case "app_uninstalled":
            datastore.runQuery(datastore.createQuery('users').filter('team_id', req.body.team_id), function (err, entities) {
                if (err) {
                    console.log(err.message)
                }
                else {
                    datastore.delete(entities[0][datastore.KEY], function (err) {
                        if (err) {
                            console.log(err.message)
                        }
                        else {
                            console.log("Success.")
                        }
                    })
                }
            })
            break;
        default:
            break;
    }
})

app.get('/avatar/:teamNumber', (req, res) => {
    tbaClient.getAvatar(req.params.teamNumber, avatar => {
        if (avatar) {
            res.contentType('image/png').send(Buffer.from(avatar, 'base64'))
        }
        else {
            res.contentType('image/png').sendFile(require('path').join(__dirname, "tba.png"))
        }
    })
})

app.listen(process.env.PORT || 8080, () => {
    console.log("App started.")
})