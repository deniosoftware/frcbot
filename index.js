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

const data = require('./modules/data')

const path = require('path')

const crypto = require('crypto')

app.set('view engine', 'ejs')
app.set('views', 'views')

app.use(require('body-parser').json({
    verify: (req, res, buf) => {
        req.rawBody = buf
    }
}))
app.use(require('body-parser').urlencoded({
    verify: (req, res, buf) => {
        req.rawBody = buf
    },
    extended: true
}))

app.get('/', (req, res) => {
    res.render('index', {
        redirect_uri: process.env.redirect_uri,
        client_id: process.env.client_id,
    })
})

app.use('/slack', require('./modules/verification/slackVerification'))

app.post('/tbaWebhook', require('./modules/verification/tbaVerification'))
app.post('/tbaWebhook', require('./modules/tbaWebhookHandler'))

app.get('/oauth/code', (req, res) => {
    request('https://slack.com/api/oauth.v2.access', {
        method: "POST",
        form: {
            client_id: process.env.client_id,
            client_secret: process.env.client_secret,
            code: req.query.code,
            redirect_uri: process.env.redirect_uri
        }
    }, (err, resp, body) => {
        if (err || resp.statusCode != 200) {
            console.log("Error: " + err.message)
            res.send("Something went wrong. Please try again.")
        }
        else {
            console.log(body)

            res.redirect('/')
            datastore.runQuery(datastore.createQuery('users').filter('team_id', JSON.parse(body).team.id), function (err, entities) {
                if (err) {
                    console.log(err)
                }
                else if (entities.length != 0) {
                    //Team already exists, so update token

                    entities[0].token = JSON.parse(body).access_token
                    entities[0].bot = JSON.parse(body).bot_user_id
                    datastore.save(entities[0])
                }
                else {
                    datastore.save({
                        key: datastore.key('users'),
                        data: {
                            token: JSON.parse(body).access_token,
                            team_id: JSON.parse(body).team.id,
                            bot: JSON.parse(body).bot_user_id,
                        }
                    })
                    slack.postMessage(blockMessages.welcome(), JSON.parse(body).authed_user.id, JSON.parse(body).access_token)
                }
            })
        }
    })
})

app.post('/slack/tba', (req, res) => {
    var parsed = parseSlashCommand(req.body.text)

    switch (parsed.command) {
        case "team":
            if (!parsed.params[0] || parsed.params[0] == "" || isNaN(parsed.params[0])) {
                data.getTeamNumber(req.body.team_id).then(result => {
                    if (!result) {
                        res.json({
                            text: "Please type `/tba team <number>` for this to work correctly."
                        })
                    }
                    else {
                        tbaClient.getTeam(result).then((teamInfo) => {
                            res.json({
                                response_type: "in_channel",
                                blocks: blockMessages.team(result, teamInfo.nickname, teamInfo.rookie_year, teamInfo.hometown, true)
                            })
                        }).catch(reason => {
                            res.json({
                                response_type: "in_channel",
                                text: reason == "404" ? "I couldn't find that team. :cry:" : "Something went wrong on our end. Please try again in a little bit."
                            })
                        })
                    }
                })
            }
            else {
                tbaClient.getTeam(parsed.params[0]).then((teamInfo) => {
                    data.getTeamNumber(req.body.team_id).then(result => {
                        var isYourTeam = false
                        if (result && result == parsed.params[0]) {
                            isYourTeam = true
                        }

                        res.json({
                            response_type: "in_channel",
                            blocks: blockMessages.team(parsed.params[0], teamInfo.nickname, teamInfo.rookie_year, teamInfo.hometown, isYourTeam)
                        })
                    })
                }).catch(reason => {
                    res.json({
                        response_type: "in_channel",
                        text: reason == "404" ? "I couldn't find that team." : "Something went wrong on our end. Please try again in a little bit."
                    })
                })
            }

            break;
        case "watch":
            if (!parsed.params[0] || parsed.params[0] == "") {
                data.getEventSubscriptions(req.body.team_id).then(subs => {
                    res.send(subs.length == 0 ? "You're not subscribed to any events. Try `/tba watch <event code>`." : subs.map(item => item.event + " <#" + item.channel + ">").join(', '))
                })
            }
            else if (!/^\d{4}\D{3,}$/.test(parsed.params[0])) {
                res.json({
                    text: "Please type `/tba watch <event code>` for this to work correctly.\nYour event code should look like `2019mabos`. You can get event codes on <https://www.thebluealliance.com|The Blue Alliance>."
                })
            }
            else {
                res.end()

                var event;
                var teams;
                var number;
                var key;

                tbaClient.getEvent(parsed.params[0]).then(_event => {
                    event = _event

                    return tbaClient.getEventTeams(parsed.params[0])
                }).then(_teams => {
                    teams = _teams

                    return data.getTeamNumber(req.body.team_id)
                }).then(_number => {
                    number = _number

                    return data.addEventWatch(parsed.params[0], req.body.channel_id, req.body.team_id)
                }).then(_key => {
                    key = _key
                    console.log(key)

                    return data.getToken(req.body.team_id)
                }).then(_token => {
                    return slack.selfJoinChannel(req.body.channel_name, _token)
                }).then(() => {
                    var isInEvent = teams.some(element => element.team_number == number)
                    slack.postToSlashCommand(req.body.response_url, blockMessages.newEventSubscription(event, req.body.channel_id, key, (number && isInEvent) ? number : null))
                }).catch(err => {
                    var text
                    if (err == "alreadysubscribed") {
                        text = `The channel <#${req.body.channel_id}> is already subscribed to an event.\nTry \`/tba unwatch\` to unsubscribe from that event.`
                    }
                    else if (err == "eventerr") {
                        text = "I couldn't find that event :cry:"
                    }
                    else {
                        text = "Something went wrong on our end. Please try again in a little bit."
                    }

                    request(req.body.response_url, {
                        method: "POST",
                        json: true,
                        body: {
                            response_type: "ephemeral",
                            text: text
                        }
                    })
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
                                    text: `Awesome! :tada: I've updated your team number to *${parsed.params[0]}*.\nYou can type \`/tba unsetteam\` to unset your team number.`
                                })
                            }
                        })
                    }
                })
            }
            break;
        case "unsetteam":
            data.deleteTeamNumber(req.body.team_id).then(() => {
                res.json({
                    response_type: "in_channel",
                    text: "I've successfully deleted your team number. :heavy_check_mark:"
                })
            })

            break;
        case "unwatch":
            data.unWatch(req.body.channel_id, req.body.team_id).then(() => {
                res.json({
                    response_type: "in_channel",
                    text: `I've successfully unsubscribed <#${req.body.channel_id}> from all events.`
                })
            })
            break;
        case "help":
        case null:
        case "":
            res.json({
                response_type: "in_channel",
                blocks: blockMessages.help()
            })
            break;
        default:
            res.json({
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
        case "app_home_opened":
            updateAppHome(req.body.event.user, req.body.team_id)
            break;
    }
})

app.post('/slack/interactivity', (req, res) => {
    var payload = JSON.parse(req.body.payload)

    switch (payload.type) {
        case "block_actions":
            res.end()
            switch (payload.actions[0].action_id) {
                case "year_select":
                    updateAppHome(payload.user.id, payload.team.id, payload.actions[0].selected_option.value)
                    break
                case "event_unwatch":
                    data.unWatch(payload.channel.id, payload.team.id).then(() => {
                        request(payload.response_url, {
                            method: "POST",
                            json: true,
                            body: {
                                text: `I've successfully unsubscribed <#${payload.channel.id}> from all events.`
                            }
                        })
                    })
                    break
                case "event_watch_team":
                    var array = payload.actions[0].selected_option.value.match(/(.+?)\-(all|team)/)
                    var key = array[1]
                    var type = array[2]

                    data.setSubType(key, type).then(() => {
                        console.log("Yay")
                    }).catch(() => {
                        request(payload.response_url, {
                            method: "POST",
                            json: true,
                            body: {
                                delete_original: "true"
                            }
                        })
                    })
                    
                    break
            }
            break
        default:
            res.end()
            break
    }
})

app.get('/avatar/:teamNumber', (req, res) => {
    tbaClient.getAvatar(req.params.teamNumber).then(avatar => {
        res.contentType('image/png').send(Buffer.from(avatar, 'base64'))
    }).catch(() => {
        res.contentType('image/png').sendFile(require('path').join(__dirname, "tba.png"))
    })
})

app.get('/logo', (req, res) => {
    res.sendFile(path.join(__dirname, 'tba.png'))
})

app.listen(process.env.PORT || 8080, () => {
    console.log("App started.")
})

/**
 * 
 * @param {String} user 
 * @param {String} workspace 
 * @param {number} [year]
 */
function updateAppHome(user, workspace, year) {
    var token;
    var team;
    var years;
    var events;

    data.getToken(workspace, true).then(_token => {
        token = _token
        return data.getTeamNumber(workspace)
    }).then(_number => {
        team = _number
        // If the workspace hasn't set a team, throw an error (caught below)
        return team ? tbaClient.getTeamYears(_number) : Promise.reject("nullteam")
    }).then(_years => {
        years = _years
        return tbaClient.getTeamEvents(team, year || _years[years.length - 1])
    }).then(_events => {
        events = _events

        events = events.sort((a, b) => {
            var week1 = a.week != null ? a.week + 1 : null
            var week2 = b.week != null ? b.week + 1 : null

            if (!week1 && !week2) {
                return 0
            }
            else if (week1 && week2) {
                return week1 - week2
            }
            else if (week1 && !week2) {
                return -1
            }
            else if (week2 && !week1) {
                return 1
            }
        })

        events = events.map(item => {
            var week = item.week + 1
            return {
                code: item.key,
                name: item.name,
                week: item.week != null ? "Week " + week.toString() : null,
                dates: item.start_date != item.end_date ? parseDate(new Date(item.start_date)) + " - " + parseDate(new Date(item.end_date)) : parseDate(new Date(item.start_date)),
                location: item.city + ", " + item.state_prov + ", " + item.country,
                type: item.event_type_string
            }
        })

        slack.setAppHome(user, blockMessages.appHome(events, team, years, year || null), token)
    }).catch((err) => {
        console.log("Error " + err)

        // Thrown above
        if (err == "nullteam") {
            slack.setAppHome(user, [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: "Please set a team number with `/tba setteam <number>` to view this."
                    }
                }
            ], token)
        }
        else {
            slack.setAppHome(user, [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `Something went wrong. Please check that your team (*${team}*) exists.`
                    }
                }
            ], token)
        }
    })
}

/**
 * 
 * @param {Date} date 
 */
function parseDate(date) {
    var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    return `${months[date.getUTCMonth()]} ${date.getUTCDate().toString()}, ${date.getUTCFullYear().toString()}`
}