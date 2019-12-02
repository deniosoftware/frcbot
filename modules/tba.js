var request = require('request')

/**
 * Class for interacting with The Blue Alliance
 * @class
 * @param {String} token - TBA auth token
 */
function tbaClient(token) {
    this.token = token
}

/**
 * @callback getTeamCallback
 * @param {Error} err
 * @param {team} teamInfo - Team info
 */

/**
 * @typedef {Object} team
 * @property {String} nickname
 * @property {String} rookie_year
 */

/**
 * 
 * @param {number} teamNumber
 * @param {getTeamCallback} callback
 */
tbaClient.prototype.getTeam = function (teamNumber, callback) {
    request(`https://www.thebluealliance.com/api/v3/team/frc${teamNumber.toString()}`, {
        headers: {
            "X-TBA-Auth-Key": this.token
        }
    }, (err, resp, body) => {
        if (err) {
            callback(err, null)
        }
        else if (resp.statusCode == 404) {
            callback(Error('404'), null)
        }
        else if (resp.statusCode != 200) {
            callback(Error('TBA Error'), null)
        }
        else {
            callback(null, {
                nickname: JSON.parse(body).nickname,
                rookie_year: JSON.parse(body).rookie_year
            })
        }
    })
}

tbaClient.prototype.getAvatar = function (teamNumber, callback) {
    request(`https://www.thebluealliance.com/api/v3/team/frc${teamNumber.toString()}/media/${new Date().getFullYear().toString()}`, {
        headers: {
            "X-TBA-Auth-Key": this.token
        }
    }, (err, resp, body) => {
        if (!err && resp.statusCode == 200) {
            var parsedBody = JSON.parse(body)

            var base64Obj = parsedBody.find(item => {
                return (item.type.toLowerCase() == "avatar")
            })
            var base64 = null
            if (base64Obj) {
                base64 = base64Obj.details.base64Image
            }

            callback(base64)
        }
        else {
            callback(null)
        }
    })
}

tbaClient.prototype.getEvent = function (eventCode, callback) {
    request(`https://www.thebluealliance.com/api/v3/event/${eventCode}`, {
        headers: {
            "X-TBA-Auth-Key": this.token
        }
    }, (err, resp, body) => {
        if(err || resp.statusCode != 200){
            callback(Error(), null)
        }
        else{
            callback(null, JSON.parse(body))
        }
    })
}

module.exports = tbaClient