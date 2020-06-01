var request = require("request");

module.exports = {
  /**
   * Post a message
   * @param {Array} blocks
   * @param {String} channel - Channel ID or name
   * @param {String} token - OAuth token
   */
  postMessage(blocks, channel, token) {
    request(
      "https://slack.com/api/chat.postMessage",
      {
        method: "POST",
        json: true,
        body: {
          channel: channel,
          blocks: blocks,
        },
        auth: {
          bearer: token,
        },
      },
      (err, resp, body) => {
        if (body.ok == false && body.error == "not_in_channel") {
          // Self join channel
          this.selfJoinChannel(channel, token)
            .then(() => {
              request("https://slack.com/api/chat.postMessage", {
                method: "POST",
                json: true,
                body: {
                  channel: channel,
                  blocks: blocks,
                },
                auth: {
                  bearer: token,
                },
              });
            })
            .catch(() => {
              console.log("Error");
            });
        }
      }
    );
  },
  postToSlashCommand(url, blocks) {
    request(
      url,
      {
        json: true,
        method: "POST",
        body: {
          response_type: "in_channel",
          blocks: blocks,
        },
      },
      (err, resp, body) => {
        console.log(body);
      }
    );
  },
  setAppHome(user, blocks, token) {
    console.log("Setting app home...");
    return new Promise((resolve, reject) => {
      request(
        "https://slack.com/api/views.publish",
        {
          json: true,
          method: "POST",
          body: {
            user_id: user,
            view: {
              type: "home",
              blocks: blocks,
            },
          },
          auth: {
            bearer: token,
          },
        },
        (err, resp, body) => {
          if (err || resp.statusCode != 200 || !body.ok) {
            reject(body);
          } else {
            resolve(body);
          }
        }
      );
    });
  },
  selfJoinChannel(channel, token) {
    return new Promise((resolve, reject) => {
      request(
        "https://slack.com/api/conversations.join",
        {
          json: true,
          method: "POST",
          body: {
            channel,
          },
          auth: {
            bearer: token,
          },
        },
        (err, resp, body) => {
          if (err || resp.statusCode != 200) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  },
  openModal(trigger_id, view, token) {
    return new Promise((resolve, reject) => {
      request(
        "https://slack.com/api/views.open",
        {
          auth: {
            bearer: token,
          },
          method: "POST",
          json: true,
          body: {
            trigger_id,
            view,
          },
        },
        (err, resp, body) => {
          if (err || resp.statusCode != 200) {
            reject(err || body);
          } else {
            resolve();
          }
        }
      );
    });
  },
  updateModal(id, token, view) {
    return new Promise((resolve, reject) => {
      request(
        "https://slack.com/api/views.update",
        {
          method: "POST",
          auth: {
            bearer: token,
          },
          json: true,
          body: {
            view,
            view_id: id,
          },
        },
        (err, resp, body) => {
          if (err || resp.statusCode != 200) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  },
};
