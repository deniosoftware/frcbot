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
 * @typedef {Object} team
 * @property {String} nickname
 * @property {String} rookie_year
 */

/**
 * 
 * @param {number} teamNumber
 */
tbaClient.prototype.getTeam = function (teamNumber) {
    return new Promise((resolve, reject) => {
        request(`https://www.thebluealliance.com/api/v3/team/frc${teamNumber.toString()}`, {
            headers: {
                "X-TBA-Auth-Key": this.token
            }
        }, (err, resp, body) => {
            if (err || (resp.statusCode != 200 && resp.statusCode != 404)) {
                reject()
            }
            else if (resp.statusCode == 404) {
                reject("404")
            }
            else {
                resolve({
                    nickname: JSON.parse(body).nickname,
                    rookie_year: JSON.parse(body).rookie_year,
                    hometown: JSON.parse(body).city + ", " + JSON.parse(body).state_prov + ", " + JSON.parse(body).country
                })
            }
        })
    })
}

tbaClient.prototype.getAvatar = function (teamNumber) {
    return new Promise((resolve, reject) => {
        request(`https://www.thebluealliance.com/api/v3/team/frc${teamNumber.toString()}/media/${new Date().getFullYear().toString()}`, {
            headers: {
                "X-TBA-Auth-Key": this.token
            }
        }, (err, resp, body) => {
            if(err || (resp.statusCode != 200 && resp.statusCode != 304)){
                reject()
            }
            else {
                var parsedBody = JSON.parse(body)

                var base64Obj = parsedBody.find(item => {
                    return (item.type.toLowerCase() == "avatar")
                })
                var base64 = null
                if (base64Obj) {
                    base64 = base64Obj.details.base64Image
                    resolve(base64)
                }
                else{
                    reject();
                }
            }
        })
    })
}

tbaClient.prototype.getEvent = function (eventCode) {
    return new Promise((resolve, reject) => {
        request(`https://www.thebluealliance.com/api/v3/event/${eventCode}`, {
            headers: {
                "X-TBA-Auth-Key": this.token
            }
        }, (err, resp, body) => {
            if (err || (resp.statusCode != 200 && resp.statusCode != 304)) {
                console.log("eventerr")
                reject("eventerr")
            }
            else {
                resolve(JSON.parse(body))
            }
        })
    })
}

tbaClient.prototype.getEventTeams = function (eventCode) {
    return new Promise((resolve, reject) => {
        request(`https://www.thebluealliance.com/api/v3/event/${eventCode}/teams`, {
            headers: {
                "X-TBA-Auth-Key": this.token
            }
        }, (err, resp, body) => {
            if (err || (resp.statusCode != 200 && resp.statusCode != 304)) {
                reject()
            }
            else {
                resolve(JSON.parse(body))
            }
        })
    })
}

tbaClient.prototype.getTeamEvents = function (team, year) {
    return new Promise((resolve, reject) => {
        request(`https://www.thebluealliance.com/api/v3/team/frc${team}/events/${year.toString()}`, {
            headers: {
                "X-TBA-Auth-Key": this.token
            }
        }, (err, resp, body) => {
            if (err || (resp.statusCode != 200 && resp.statusCode != 304)) {
                reject()
            }
            else {
                resolve(JSON.parse(body))
            }
        })
    })
}

tbaClient.prototype.getTeamYears = function (team) {
    return new Promise((resolve, reject) => {
        request(`https://www.thebluealliance.com/api/v3/team/frc${team}/years_participated`, {
            headers: {
                "X-TBA-Auth-Key": this.token
            }
        }, (err, resp, body) => {
            if (err || (resp.statusCode != 200 && resp.statusCode != 304)) {
                reject()
            }
            else {
                resolve(JSON.parse(body))
            }
        })
    })
}

tbaClient.prototype.getEventSchedule = function(event_code){
    return new Promise((resolve, reject) => {
        request(`https://www.thebluealliance.com/api/v3/event/${event_code}/matches`, {
            headers: {
                "X-TBA-Auth-Key": this.token
            }
        }, (err, resp, body) => {
            if(err || (resp.statusCode != 200 && resp.statusCode != 304)){
                reject()
            }
            else{
                resolve(JSON.parse(body))
            }
        })
    })
}

tbaClient.prototype.getRankings = function(event_code){
    return new Promise((resolve, reject) => {
        request(`https://www.thebluealliance.com/api/v3/event/${event_code}/rankings`, {
            headers: {
                "X-TBA-Auth-Key": this.token
            }
        }, (err, resp, body) => {
            if(err || (resp.statusCode != 200 && resp.statusCode != 304)){
                reject("rankingserr")
                console.log("rankingserr")
            }
            else{
                resolve(JSON.parse(body))
            }
        })
    })
}

module.exports = tbaClient