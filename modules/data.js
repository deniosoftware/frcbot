const { Datastore } = require('@google-cloud/datastore')
const datastore = new Datastore()

module.exports = {
    getTeamNumber(workspace, callback) {
        datastore.runQuery(datastore.createQuery('users').filter('team_id', workspace), function (err, entities) {
            if (err) {
                callback(err, null)
            }
            else if (entities[0]['team_number']) {
                callback(null, entities[0]['team_number'])
            }
            else {
                callback(null, null)
            }
        })
    },
    getToken(workspace, bot, callback) {
        datastore.runQuery(datastore.createQuery('users').filter('team_id', workspace), function (err, entities) {
            if (err) {
                callback(err, null)
            }
            else {
                callback(null, bot ? entities[0].bot_token : entities[0].token)
            }
        })
    },
    deleteTeamNumber(workspace, callback) {
        datastore.runQuery(datastore.createQuery('users').filter('team_id', workspace), function (err, entities) {
            if (err) {
                callback(err, null)
            }
            else if (!entities[0]['team_number']) {
                // No team number, no need to delete
                callback(null, null)
            }
            else {
                delete entities[0].team_number

                datastore.save(entities[0], function (err, resp) {
                    if (err) {
                        callback(err, null)
                    }
                    else {
                        callback(null, resp)
                    }
                })
            }
        })
    }
}