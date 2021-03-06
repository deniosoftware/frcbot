const { Datastore } = require("@google-cloud/datastore");
const datastore = new Datastore();

module.exports = {
  getTeamNumber(workspace) {
    return new Promise((resolve, reject) => {
      datastore.runQuery(
        datastore.createQuery("users").filter("team_id", workspace),
        function (err, entities) {
          if (err) {
            reject();
          } else if (entities[0]["team_number"]) {
            resolve(entities[0]["team_number"]);
          } else {
            resolve(null);
          }
        }
      );
    });
  },
  getToken(workspace, bot) {
    return new Promise((resolve, reject) => {
      datastore.runQuery(
        datastore.createQuery("users").filter("team_id", workspace),
        function (err, entities) {
          if (err || entities.length == 0) {
            reject();
          } else {
            resolve(entities[0].token);
          }
        }
      );
    });
  },
  deleteTeamNumber(workspace) {
    return new Promise((resolve, reject) => {
      datastore.runQuery(
        datastore.createQuery("users").filter("team_id", workspace),
        function (err, entities) {
          if (err) {
            reject();
          } else if (!entities[0]["team_number"]) {
            // No team number, no need to delete
            resolve();
          } else {
            delete entities[0].team_number;

            datastore.save(entities[0], function (err, resp) {
              if (err) {
                reject();
              } else {
                resolve();
              }
            });
          }
        }
      );
    });
  },
  /**
   *
   * @param {String} event - The event key to watch
   * @param {String} workspace - The workspace ID to watch
   */
  addEventWatch(event, event_name, channel, workspace) {
    var key = datastore.key("subscriptions");

    return new Promise((resolve, reject) => {
      datastore.runQuery(
        datastore
          .createQuery("subscriptions")
          .filter("team_id", workspace)
          .filter("event", event)
          .filter("channel", channel),
        function (err, entities) {
          if (err) {
            reject(err);
          } else if (entities && entities.length > 0) {
            reject("alreadysubscribed");
          } else {
            datastore.save(
              {
                key: key,
                data: {
                  team_id: workspace,
                  event,
                  event_name,
                  channel,
                  type: "all",
                  match_score: true,
                  upcoming_match: false,
                  event_schedule: false,
                  additional_teams: JSON.stringify([]),
                },
              },
              function (err, resp) {
                if (err) {
                  reject(err);
                } else {
                  resolve(key.id);
                }
              }
            );
          }
        }
      );
    });
  },
  unWatch(channel, workspace) {
    return new Promise((resolve, reject) => {
      datastore.runQuery(
        datastore
          .createQuery("subscriptions")
          .filter("team_id", workspace)
          .filter("channel", channel),
        function (err, entities) {
          if (err) {
            reject();
          } else {
            datastore.delete(
              entities.map((item) => item[datastore.KEY]),
              function () {
                if (err) {
                  reject();
                } else {
                  resolve();
                }
              }
            );
          }
        }
      );
    });
  },
  /**
   *
   * @param {String} workspace
   * @param {String} [channel]
   */
  getEventSubscriptions(workspace, channel) {
    return new Promise((resolve, reject) => {
      var query = datastore
        .createQuery("subscriptions")
        .filter("team_id", workspace);
      if (channel) {
        query.filter("channel", channel);
      }
      datastore.runQuery(query, function (err, entities) {
        if (err) {
          reject(err);
        } else {
          resolve(entities);
        }
      });
    });
  },
  setSubType(key, type) {
    return new Promise((resolve, reject) => {
      datastore.get(datastore.key(["subscriptions", parseInt(key)]), function (
        err,
        entity
      ) {
        if (err) {
          reject(err);
        } else if (!entity) {
          reject();
        } else {
          entity.type = type;
          datastore.save(entity, function (err) {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        }
      });
    });
  },
  /**
   * Mark a user as having visited the App Home
   * @param {String} user
   * @param {String} workspace
   */
  setUserVisitedAppHome(user, workspace) {
    return new Promise((resolve, reject) => {
      datastore.save(
        {
          key: datastore.key("app_home_visits"),
          data: {
            user,
            team_id: workspace,
          },
        },
        function (err, resp) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  },
  getUserVisitedAppHome(user, workspace) {
    return new Promise((resolve, reject) => {
      datastore.runQuery(
        datastore
          .createQuery("app_home_visits")
          .filter("user", user)
          .filter("team_id", workspace),
        function (err, entities) {
          if (err) {
            reject(err);
          } else {
            resolve(entities.length > 0);
          }
        }
      );
    });
  },
};
