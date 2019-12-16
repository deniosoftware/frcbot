var request = require('request')

module.exports = {
    /**
     * Post a message
     * @param {Array} blocks 
     * @param {String} channel - Channel ID or name
     * @param {String} token - OAuth token
     */
    postMessage(blocks, channel, token) {
        request('https://slack.com/api/chat.postMessage', {
            method: "POST",
            json: true,
            body: {
                channel: channel,
                blocks: blocks
            },
            auth: {
                bearer: token
            }
        }, (err, resp, body) => {
            if (body.ok == false && body.error == "not_in_channel") {
                // Self join channel
                this.channelInfo(token, channel).then(info => {
                    return this.selfJoinChannel(info.channel.name, token)
                }).then(() => {
                    request('https://slack.com/api/chat.postMessage', {
                        method: "POST",
                        json: true,
                        body: {
                            channel: channel,
                            blocks: blocks
                        },
                        auth: {
                            bearer: token
                        }
                    })
                }).catch(() => {
                    console.log("Error")
                })
            }
        })
    },
    postToSlashCommand(url, blocks) {
        request(url, {
            json: true,
            method: "POST",
            body: {
                response_type: "in_channel",
                blocks: blocks
            }
        }, (err, resp, body) => {
            console.log(body)
        })
    },
    setAppHome(user, blocks, token) {
        console.log("Setting app home...")
        return new Promise((resolve, reject) => {
            request('https://slack.com/api/views.publish', {
                json: true,
                method: "POST",
                body: {
                    user_id: user,
                    view: {
                        type: "home",
                        blocks: blocks
                    }
                },
                auth: {
                    bearer: token
                }
            }, (err, resp, body) => {
                if (err || resp.statusCode != 200) {
                    reject(err)
                }
                else {
                    resolve(body)
                }
            })
        })
    },
    selfJoinChannel(channelName, token) {
        return new Promise((resolve, reject) => {
            request('https://slack.com/api/channels.join', {
                json: true,
                method: "POST",
                body: {
                    name: channelName
                },
                auth: {
                    bearer: token
                }
            }, (err, resp, body) => {
                if (err || resp.statusCode != 200) {
                    reject()
                }
                else {
                    resolve()
                }
            })
        })
    },
    openModal(trigger_id, view, token) {
        return new Promise((resolve, reject) => {
            request("https://slack.com/api/views.open", {
                auth: {
                    bearer: token
                },
                method: "POST",
                json: true,
                body: {
                    trigger_id,
                    view
                }
            }, (err, resp, body) => {
                if (err || resp.statusCode != 200) {
                    reject()
                    console.log(body)
                }
                else {
                    resolve()
                }
            })
        })
    },
    channelInfo(token, channel) {
        return new Promise((resolve, reject) => {
            request("https://slack.com/api/channels.info", {
                qs: {
                    token,
                    channel
                }
            }, (err, resp, body) => {
                if (err || resp.statusCode != 200) {
                    reject(err || null)
                }
                else {
                    resolve(JSON.parse(body))
                }
            })
        })
    }
}