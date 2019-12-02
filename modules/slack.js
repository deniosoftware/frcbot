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
    }
}