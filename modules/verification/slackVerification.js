const crypto = require('crypto')

module.exports = (req, res, next) => {
    var slackHash = req.get('X-Slack-Signature')
    var slackTimestamp = req.get('X-Slack-Request-Timestamp')

    var concat = "v0:" + slackTimestamp + ":" + req.rawBody.toString()
    var computedHash = "v0=" + crypto.createHmac("sha256", process.env.slackSigningSecret).update(concat).digest("hex")

    if(crypto.timingSafeEqual(Buffer.from(slackHash), Buffer.from(computedHash))){
        next()
        console.log("Successfully validated Slack request.")
    }
    else{
        res.status(400).send("Error validating Slack request.")
    }
}