var request = require('request')

module.exports = {
    /**
     * Post a message
     * @param {Array} blocks 
     * @param {String} channel - Channel ID or name
     * @param {String} token - OAuth token
     */
    postMessage(blocks, channel, token){
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
            console.log(body)
        })
    },
    postToSlashCommand(url, blocks){
        request(url, {
            json: true,
            method: "POST",
            body: {
                response_type: "in_channel",
                blocks: blocks
            }
        })
    },
    setAppHome(user, blocks, token){
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
            console.log(body)
        })
    }
}