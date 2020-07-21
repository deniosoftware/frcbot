require("dotenv").config();

var express = require("express");
var app = express();

var request = require("request");

var TBAClient = require("./modules/tba");
var tbaClient = new TBAClient(process.env.tbaApiKey);

var parseSlashCommand = require("./modules/slashCommandParser");

var blockMessages = require("./modules/blockMessages");

var slack = require("./modules/slack");

const { Datastore } = require("@google-cloud/datastore");
const datastore = new Datastore();

const data = require("./modules/data");

const path = require("path");

const sharp = require("sharp");

const ordinal = require("ordinal");

const regex = {
  event_code: /^\d{4}.{3,}$/,
};

app.set("view engine", "ejs");
app.set("views", "views");

app.use(express.static("public"));

app.use(
  require("body-parser").json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(
  require("body-parser").urlencoded({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
    extended: true,
  })
);

app.get("/", (req, res) => {
  res.render("index", {
    redirect_uri: process.env.redirect_uri,
    client_id: process.env.client_id,
    scopes: process.env.botScopes,
  });
});

app.get("/privacy", (req, res) => {
  res.render("privacy");
});
app.get("/support", (req, res) => {
  res.render("support");
});
app.get("/welcome", (req, res) => {
  res.render("welcome");
});

app.get("/install", (req, res) => {
  res.redirect(
    `https://slack.com/oauth/v2/authorize?client_id=${process.env.client_id}&scope=${process.env.botScopes}&redirect_uri=${process.env.redirect_uri}`
  );
});

app.use("/slack", require("./modules/verification/slackVerification"));

app.post("/tbaWebhook", require("./modules/verification/tbaVerification"));
app.post("/tbaWebhook", require("./modules/tbaWebhookHandler"));

app.get("/oauth/code", (req, res) => {
  if (req.query.code) {
    request(
      "https://slack.com/api/oauth.v2.access",
      {
        method: "POST",
        form: {
          client_id: process.env.client_id,
          client_secret: process.env.client_secret,
          code: req.query.code,
          redirect_uri: process.env.redirect_uri,
        },
      },
      (err, resp, body) => {
        if (err || resp.statusCode != 200) {
          console.log("Error: " + err.message);
          res.send("Something went wrong. Please try again.");
        } else {
          res.redirect("/welcome");
          datastore.runQuery(
            datastore
              .createQuery("users")
              .filter("team_id", JSON.parse(body).team.id),
            function (err, entities) {
              if (err) {
                console.log(err);
              } else if (entities.length != 0) {
                //Team already exists, so update token

                entities[0].token = JSON.parse(body).access_token;
                entities[0].bot = JSON.parse(body).bot_user_id;
                datastore.save(entities[0]);
              } else {
                datastore.save({
                  key: datastore.key("users"),
                  data: {
                    token: JSON.parse(body).access_token,
                    team_id: JSON.parse(body).team.id,
                    bot: JSON.parse(body).bot_user_id,
                  },
                });
                //This no longer happens
                //slack.postMessage(blockMessages.welcome(), JSON.parse(body).authed_user.id, JSON.parse(body).access_token)
              }
            }
          );
        }
      }
    );
  } else if (req.query.error) {
    res.redirect("/");
  } else {
    res.redirect("/");
  }
});

app.post("/slack/tba", (req, res) => {
  var parsed = parseSlashCommand(req.body.text);

  switch (parsed.command) {
    case "team":
      if (
        !parsed.params[0] ||
        parsed.params[0] == "" ||
        isNaN(parsed.params[0])
      ) {
        data.getTeamNumber(req.body.team_id).then((result) => {
          if (!result) {
            res.json({
              text:
                "Please type `/frc team <number>` for this to work correctly.",
            });
          } else {
            tbaClient
              .getTeam(result)
              .then((teamInfo) => {
                res.json({
                  response_type: "in_channel",
                  blocks: blockMessages.team(
                    result,
                    teamInfo.nickname,
                    teamInfo.rookie_year,
                    teamInfo.hometown,
                    true
                  ),
                });
              })
              .catch((reason) => {
                res.json({
                  response_type: "ephemeral",
                  text:
                    reason == "404"
                      ? "I couldn't find that team. :cry:"
                      : "Something went wrong on our end. Please try again in a little bit.",
                });
              });
          }
        });
      } else {
        tbaClient
          .getTeam(parsed.params[0])
          .then((teamInfo) => {
            data.getTeamNumber(req.body.team_id).then((result) => {
              var isYourTeam = false;
              if (result && result == parsed.params[0]) {
                isYourTeam = true;
              }

              res.json({
                response_type: "in_channel",
                blocks: blockMessages.team(
                  parsed.params[0],
                  teamInfo.nickname,
                  teamInfo.rookie_year,
                  teamInfo.hometown,
                  isYourTeam
                ),
              });
            });
          })
          .catch((reason) => {
            res.json({
              response_type: "ephemeral",
              text:
                reason == "404"
                  ? "I couldn't find that team. :cry:"
                  : "Something went wrong on our end. Please try again in a little bit.",
            });
          });
      }

      break;
    case "watch":
      if (!parsed.params[0] || parsed.params[0] == "") {
        data.getEventSubscriptions(req.body.team_id).then((subs) => {
          res.json({
            response_type: "ephemeral",
            blocks: blockMessages.subscriptionList(
              subs.map((item) => {
                item.keyId = item[datastore.KEY].id;
                return item;
              })
            ),
          });
        });
      } else if (!regex.event_code.test(parsed.params[0])) {
        res.json({
          text:
            "Please type `/frc watch <event code>` for this to work correctly.\nYour event code should look like `2019mabos`. You can get event codes on <https://www.thebluealliance.com|The Blue Alliance>.",
        });
      } else if (req.body.channel_id.charAt(0).toLowerCase() != "c") {
        res.json({
          text: "Sadly, this only works in public channels :shrug:",
        });
      } else {
        res.end();

        var event;
        var teams;
        var number;
        var key;

        tbaClient
          .getEvent(parsed.params[0])
          .then((_event) => {
            event = _event;

            return tbaClient.getEventTeams(parsed.params[0]);
          })
          .then((_teams) => {
            teams = _teams;

            return data.getTeamNumber(req.body.team_id);
          })
          .then((_number) => {
            number = _number;

            return data.addEventWatch(
              parsed.params[0],
              event.name + " " + event.year.toString(),
              req.body.channel_id,
              req.body.team_id
            );
          })
          .then((_key) => {
            key = _key;
            console.log(key);

            return data.getToken(req.body.team_id);
          })
          .then((_token) => {
            return slack.selfJoinChannel(req.body.channel_id, _token);
          })
          .then(() => {
            var isInEvent = teams.some(
              (element) => element.team_number == number
            );
            slack.postToSlashCommand(
              req.body.response_url,
              blockMessages.newEventSubscription(
                event,
                req.body.channel_id,
                key,
                number && isInEvent ? number : null,
                req.body.user_id
              )
            );
          })
          .catch((err) => {
            var text;
            if (err == "alreadysubscribed") {
              text = `The channel <#${req.body.channel_id}> is already subscribed to the event \`${parsed.params[0]}\`.\nTry \`/frc unwatch\` to unsubscribe from that event.`;
            } else if (err == "eventerr") {
              text = "I couldn't find that event :cry:";
            } else {
              text =
                "Something went wrong on our end. Please try again in a little bit.";
            }

            request(req.body.response_url, {
              method: "POST",
              json: true,
              body: {
                response_type: "ephemeral",
                text: text,
              },
            });
          });
      }

      break;
    case "setteam":
      if (
        !parsed.params[0] ||
        parsed.params[0] == "" ||
        isNaN(parsed.params[0])
      ) {
        res.json({
          response_type: "ephemeral",
          text:
            "Please type `/frc setteam <number>` for this to work correctly.",
        });
      } else {
        var query = datastore
          .createQuery("users")
          .filter("team_id", req.body.team_id);
        datastore.runQuery(query, (err, entities) => {
          if (err) {
            res.send(err);
          } else if (entities.length == 0) {
            res.json({
              response_type: "ephemeral",
              text:
                "Hmm... I can't find your Slack workspace. Please try reinstalling FRCBot.",
            });
          } else {
            entities[0].team_number = parseInt(parsed.params[0]);
            datastore.update(entities[0], (err) => {
              if (err) {
                res.send(err.message);
              } else {
                res.json({
                  response_type: "ephemeral",
                  text: `Awesome! :tada: I've updated your team number to *${parsed.params[0]}*.\nYou can type \`/frc unsetteam\` to unset your team number.`,
                });
              }
            });
          }
        });
      }
      break;
    case "unsetteam":
      data.deleteTeamNumber(req.body.team_id).then(() => {
        res.json({
          response_type: "ephemeral",
          text:
            "I've successfully deleted your team number. :heavy_check_mark:",
        });
      });

      break;
    case "unwatch":
      data.unWatch(req.body.channel_id, req.body.team_id).then(() => {
        res.json({
          response_type: "in_channel",
          text: `I've successfully unsubscribed <#${req.body.channel_id}> from all events.`,
        });
      });
      break;
    case "schedule":
      if (!parsed.params[0] || parsed.params[0] == "") {
        res.send("Please type `/frc schedule <event code>` for this to work.");
      } else if (!regex.event_code.test(parsed.params[0])) {
        res.json({
          text:
            "Please type `/frc schedule <event code>` for this to work correctly.\nYour event code should look like `2019mabos`. You can get event codes on <https://www.thebluealliance.com|The Blue Alliance>.",
        });
      } else {
        tbaClient
          .getEvent(parsed.params[0])
          .then((event) => {
            res.json({
              response_type: "in_channel",
              blocks: [
                {
                  type: "section",
                  text: {
                    type: "mrkdwn",
                    text: `Please click here to view the match schedule for <https://www.thebluealliance.com/event/${
                      parsed.params[0]
                    }|*${event.name} ${event.year.toString()}*>.`,
                  },
                  accessory: {
                    type: "button",
                    text: {
                      type: "plain_text",
                      text: "View",
                    },
                    action_id: "schedule",
                    value: parsed.params[0],
                  },
                },
              ],
            });
          })
          .catch(() => {
            res.json({
              text: "I couldn't find that event :cry:",
            });
          });
      }
      break;
    case "rankings":
      if (!parsed.params[0] || parsed.params[0] == "") {
        res.send("Please type `/frc rankings <event code>` for this to work.");
      } else if (!regex.event_code.test(parsed.params[0])) {
        res.json({
          text:
            "Please type `/frc rankings <event code>` for this to work correctly.\nYour event code should look like `2019mabos`. You can get event codes on <https://www.thebluealliance.com|The Blue Alliance>.",
        });
      } else {
        var event;
        var rankings;

        tbaClient
          .getEvent(parsed.params[0])
          .then((_event) => {
            event = _event;

            return tbaClient.getRankings(parsed.params[0]);
          })
          .then((_rankings) => {
            rankings = _rankings.rankings;

            return data.getTeamNumber(req.body.team_id);
          })
          .then((number) => {
            var rankObj = rankings
              ? rankings.find(
                  (item) => item.team_key.replace(/^frc/, "") == number
                )
              : null;
            var text = "";
            var btnText = "View Full Rankings";
            var response_type = "in_channel";

            if (rankObj) {
              text = `Your team (*${number.toString()}*) is currently ranked *${ordinal(
                rankObj.rank
              )}* in *<https://www.thebluealliance.com/event/${
                parsed.params[0]
              }|${event.name}>*.`;
            } else if (rankings) {
              text = `Please click here to view the qualification rankings for *<https://www.thebluealliance.com/event/${parsed.params[0]}|${event.name}>*.`;
              btnText = "View";
            } else {
              text = `There aren't any rankings for *<https://www.thebluealliance.com/event/${parsed.params[0]}|${event.name}>* right now. Check back later!`;
              response_type = "ephemeral";
            }

            res.json({
              response_type,
              blocks: [
                {
                  type: "section",
                  text: {
                    type: "mrkdwn",
                    text,
                  },
                  accessory: {
                    type: "button",
                    text: {
                      type: "plain_text",
                      text: btnText,
                    },
                    action_id: "rankings",
                    value: parsed.params[0],
                  },
                },
              ],
            });
          })
          .catch((err) => {
            console.log(err);
            if (err == "eventerr" || err == "rankingserr") {
              res.json({
                text: "I couldn't find that event :cry:",
              });
            } else {
              res.json({
                text:
                  "Something went wrong on our end. :cry: Please try again later, and contact us <https://frcbot.deniosoftware.com/support|here> if the problem persists.",
              });
            }
          });
      }
      break;
    case "feedback":
      data
        .getToken(req.body.team_id)
        .then((token) => {
          return slack.openModal(
            req.body.trigger_id,
            require("./modules/feedbackModal"),
            token
          );
        })
        .then(() => {
          console.log("Modal success");
          res.send();
        })
        .catch((err) => {
          console.log(err);
          res.json({
            text:
              "Hmm... :thinking_face: ironically, something went wrong while trying to submit a bug.\nPlease try again, or contact caleb@deniosoftware.com if the problem isn't fixed.",
          });
        });
      break;
    case "help":
    case null:
    case "":
      res.json({
        response_type: "ephemeral",
        blocks: blockMessages.help(),
      });
      break;
    default:
      res.json({
        text:
          "Hmm... :thinking_face: I don't recognize that command. Try `/frc help` to list all of the possible commands.",
      });
      break;
  }
});

app.post("/slack/pineapple", require("./modules/pineapple"));

app.post("/slack/events", (req, res) => {
  if (req.body.challenge) {
    res.send(req.body.challenge);
    return;
  }

  res.end();
  switch (req.body.event.type) {
    case "app_uninstalled":
      console.log("Uninstalling...");
      datastore.runQuery(
        datastore.createQuery("users").filter("team_id", req.body.team_id),
        function (err, entities) {
          if (err) {
            console.log(err.message);
          } else {
            datastore.runQuery(
              datastore
                .createQuery("subscriptions")
                .filter("team_id", req.body.team_id),
              function (err2, entities2) {
                if (err2) {
                  console.log(err2.message);
                } else {
                  datastore.runQuery(
                    datastore
                      .createQuery("app_home_visits")
                      .filter("team_id", req.body.team_id),
                    function (err3, entities3) {
                      if (err3) {
                        console.log(err3);
                      } else {
                        var array = entities.concat(entities2, entities3);

                        datastore.delete(
                          array.map((item) => item[datastore.KEY]),
                          function (err4) {
                            if (err4) {
                              console.log(err4.message);
                            } else {
                              console.log("Success.");
                            }
                          }
                        );
                      }
                    }
                  );
                }
              }
            );
          }
        }
      );
      break;
    case "app_home_opened":
      //               |
      // Defined below v
      updateAppHome(req.body.event.user, req.body.team_id);

      // Has this user visited the App Home before?
      data
        .getUserVisitedAppHome(req.body.event.user, req.body.team_id)
        .then((visited) => {
          // They haven't.
          if (!visited) {
            // Tell us not to do this again
            data
              .setUserVisitedAppHome(req.body.event.user, req.body.team_id)
              .catch((err) => {
                console.log("Ahh!! " + err.message);
              });

            // Send them a welcoming message
            data.getToken(req.body.team_id).then((token) => {
              slack.postMessage(
                blockMessages.welcome(),
                req.body.event.user,
                token
              );
            });
          }
        })
        .catch((err) => {
          console.log("Ahh!! " + err.message);
        });
      break;
    case "tokens_revoked":
      console.log("revoked");
      break;
  }
});

app.post("/slack/interactivity", (req, res) => {
  var payload = JSON.parse(req.body.payload);

  switch (payload.type) {
    case "block_actions":
      res.end();
      switch (payload.actions[0].action_id) {
        case "year_select":
          updateAppHome(
            payload.user.id,
            payload.team.id,
            payload.actions[0].selected_option.value
          );
          break;
        case "event_unwatch":
          data.unWatch(payload.channel.id, payload.team.id).then(() => {
            request(payload.response_url, {
              method: "POST",
              json: true,
              body: {
                text: `I've successfully unsubscribed <#${payload.channel.id}> from all events.`,
              },
            });
          });
          break;
        case "event_watch_team":
          var array = payload.actions[0].selected_option.value.match(
            /(.+?)\-(all|team)/
          );
          var key = array[1];
          var type = array[2];

          data
            .setSubType(key, type)
            .then(() => {
              console.log("Yay");
            })
            .catch(() => {
              request(payload.response_url, {
                method: "POST",
                json: true,
                body: {
                  delete_original: "true",
                },
              });
            });

          break;
        case "schedule":
          data.getToken(payload.team.id).then((token) => {
            var event;
            tbaClient
              .getEvent(payload.actions[0].value)
              .then((_event) => {
                event = _event;
                return tbaClient.getEventSchedule(payload.actions[0].value);
              })
              .then((schedule) => {
                data.getTeamNumber(payload.team.id).then((team) => {
                  slack.openModal(
                    payload.trigger_id,
                    require("./modules/scheduleModal")(
                      schedule,
                      {
                        name: event.name + " " + event.year.toString(),
                        key: payload.actions[0].value,
                      },
                      team ? team.toString() : null
                    ),
                    token
                  );
                });
              });
          });
          break;
        case "rankings":
          var token;
          var rankings;

          data
            .getToken(payload.team.id)
            .then((_token) => {
              token = _token;
              return tbaClient.getRankings(payload.actions[0].value);
            })
            .then((_rankings) => {
              rankings = _rankings;
              return data.getTeamNumber(payload.team.id);
            })
            .then((number) => {
              return slack.openModal(
                payload.trigger_id,
                {
                  type: "modal",
                  title: {
                    type: "plain_text",
                    text: "Qualification Rankings",
                  },
                  blocks: [
                    ...(rankings.rankings
                      ? rankings.rankings.map((item) => {
                          team = item.team_key.replace(/^frc/, "");
                          number = number ? number.toString() : null;
                          var isTeam = number && number == team;

                          var medal;
                          switch (item.rank) {
                            case 1:
                              medal = ":first_place_medal:";
                              break;
                            case 2:
                              medal = ":second_place_medal:";
                              break;
                            case 3:
                              medal = ":third_place_medal:";
                              break;
                            default:
                              medal = "";
                          }
                          return {
                            type: "section",
                            text: {
                              type: "mrkdwn",
                              text:
                                ordinal(item.rank) +
                                ": " +
                                (isTeam ? "*" : "") +
                                `<https://thebluealliance.com/team/${item.team_key.replace(
                                  /^frc/,
                                  ""
                                )}|${item.team_key.replace(/^frc/, "")}>${
                                  isTeam ? "*" : ""
                                }` +
                                medal +
                                (isTeam ? ":star:" : ""),
                            },
                          };
                        })
                      : [
                          {
                            type: "section",
                            text: {
                              type: "mrkdwn",
                              text:
                                "There aren't any rankings for this event yet. Maybe check back later?",
                            },
                          },
                        ]),
                  ],
                },
                token
              );
            });
          break;
        case "event_options":
          data.getToken(payload.team.id).then((token) => {
            datastore.get(
              datastore.key([
                "subscriptions",
                parseInt(payload.actions[0].value),
              ]),
              function (err, entity) {
                if (!entity) {
                  slack.openModal(
                    payload.trigger_id,
                    {
                      type: "modal",
                      title: {
                        type: "plain_text",
                        text: "Event Options",
                      },
                      blocks: [
                        {
                          type: "section",
                          text: {
                            type: "mrkdwn",
                            text:
                              "This subscription doesn't exist. :cry: Type `/frc watch` to view all of your event subscriptions.",
                          },
                        },
                      ],
                    },
                    token
                  );
                } else {
                  slack.openModal(
                    payload.trigger_id,
                    require("./modules/eventOptionsModal")(
                      entity,
                      entity[datastore.KEY]
                    ),
                    token
                  );
                }
              }
            );
          });
          break;
        case "modal_unsubscribe":
          data.getToken(payload.team.id).then((token) => {
            datastore.get(
              datastore.key([
                "subscriptions",
                parseInt(payload.view.private_metadata),
              ]),
              function (err, entity) {
                datastore.delete(
                  datastore.key([
                    "subscriptions",
                    parseInt(payload.view.private_metadata),
                  ]),
                  function (err, resp) {
                    updateAppHome(payload.user.id, payload.team.id);
                    if (err) {
                      console.log(err.message);
                    } else {
                      slack.updateModal(payload.view.id, token, {
                        type: "modal",
                        title: {
                          type: "plain_text",
                          text: "Event Options",
                        },
                        close: {
                          type: "plain_text",
                          text: "Close",
                        },
                        blocks: [
                          {
                            type: "section",
                            text: {
                              type: "mrkdwn",
                              text: `I've successfully unsubscribed <#${
                                entity.channel
                              }> from <https://www.thebluealliance.com/event/${
                                entity.event
                              }|${entity.event_name || entity.event}>.`,
                            },
                          },
                        ],
                      });
                    }
                  }
                );
              }
            );
          });
          break;
      }
      break;
    case "view_submission":
      if (payload.view.callback_id == "feedback") {
        var values = payload.view.state.values;

        request(process.env.feedbackUrl, {
          method: "POST",
          headers: {
            "Content-type": "application/json",
            Accept: "application/json",
          },
          json: true,
          body: {
            message: values.description.description.value,
            type: values.type.type.selected_option.value,
            email: values.email.email.value,
            workspace: payload.team.domain,
            team_id: payload.team.id,
            user: payload.user.id,
          },
        });
        res.json({
          response_action: "update",
          view: {
            type: "modal",
            title: {
              type: "plain_text",
              text: "Submit Feedback",
            },
            close: {
              type: "plain_text",
              text: "Close",
            },
            blocks: [
              {
                type: "section",
                text: {
                  type: "plain_text",
                  text:
                    "Your feedback has been successfully sent. :heavy_check_mark: Thanks!",
                  emoji: true,
                },
              },
            ],
          },
        });
      } else if (payload.view.callback_id == "event_options") {
        var additional_teams = payload.view.state.values.additional_teams
          .additional_teams.value
          ? payload.view.state.values.additional_teams.additional_teams.value.split(
              /\,\s*/
            )
          : [];

        if (!additional_teams.every((i) => /^\d+$/.test(i))) {
          res.send({
            response_action: "errors",
            errors: {
              additional_teams:
                "Please make sure you've entered a comma-seperated list of team numbers.",
            },
          });
        } else {
          datastore.get(
            datastore.key([
              "subscriptions",
              parseInt(payload.view.private_metadata),
            ]),
            function (err, entity) {
              if (err) {
                console.log(err.message);
              } else {
                entity.type =
                  payload.view.state.values.type.type.selected_option.value;

                entity.upcoming_match = payload.view.state.values.notification_types.notification_types.selected_options.some(
                  (item) => item.value == "upcoming_match"
                );
                entity.match_score = payload.view.state.values.notification_types.notification_types.selected_options.some(
                  (item) => item.value == "match_score"
                );
                entity.event_schedule = payload.view.state.values.notification_types.notification_types.selected_options.some(
                  (item) => item.value == "event_schedule"
                );

                entity.additional_teams = JSON.stringify(additional_teams);

                datastore.save(entity);
              }
            }
          );
          res.send();
        }
      }
      break;
    default:
      res.end();
      break;
  }
});

app.get("/avatar/:teamNumber", (req, res) => {
  var blue = {
    r: 72,
    g: 127,
    b: 204,
  };
  var red = {
    r: 218,
    g: 52,
    b: 52,
  };

  var bgColor;

  if (!req.query.color || req.query.color == "blue") {
    bgColor = blue;
  } else if (req.query.color == "red") {
    bgColor = red;
  } else {
    colorType = 6;
  }

  tbaClient
    .getAvatar(req.params.teamNumber)
    .then((avatar) => {
      res.contentType("image/png");
      sharp(Buffer.from(avatar, "base64"))
        .resize(200, 200, {
          kernel: sharp.kernel.nearest,
        })
        .flatten({
          background: bgColor,
        })
        .toBuffer()
        .then((buffer) => {
          res.send(buffer);
        });
    })
    .catch(() => {
      res
        .contentType("image/png")
        .sendFile(
          require("path").join(__dirname, "public", "img", "first.png")
        );
    });
});

app.get("/logo", (req, res) => {
  res.sendFile(path.join(__dirname, "tba.png"));
});

app.listen(process.env.PORT || 8080, () => {
  console.log("App started.");
});

/**
 *
 * @param {String} user
 * @param {String} workspace
 * @param {number} [year]
 */
function updateAppHome(user, workspace, year) {
  console.log("Updating...");
  var token;
  var team;
  var years;
  var events;

  data
    .getToken(workspace, true)
    .then((_token) => {
      token = _token;
      return data.getTeamNumber(workspace);
    })
    .then((_number) => {
      team = _number;
      // If the workspace hasn't set a team, throw an error (caught below)
      return team
        ? tbaClient.getTeamYears(_number)
        : Promise.reject("nullteam");
    })
    .then((_years) => {
      years = _years;
      return tbaClient.getTeamEvents(team, year || _years[years.length - 1]);
    })
    .then((_events) => {
      events = _events;

      events = events.sort((a, b) => {
        var week1 = a.week != null ? a.week + 1 : null;
        var week2 = b.week != null ? b.week + 1 : null;

        /*if (!week1 && !week2) {
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
            else{*/
        return (
          new Date(a.start_date + " 00:00").getTime() -
          new Date(b.start_date + " 00:00").getTime()
        );
        //}
      });

      events = events.map((item) => {
        var week = item.week + 1;
        return {
          code: item.key,
          name: item.name,
          week: item.week != null ? "Week " + week.toString() : null,
          dates:
            item.start_date != item.end_date
              ? parseDate(new Date(item.start_date)) +
                " - " +
                parseDate(new Date(item.end_date))
              : parseDate(new Date(item.start_date)),
          location: item.city + ", " + item.state_prov + ", " + item.country,
          type: item.event_type_string,
        };
      });

      return data.getEventSubscriptions(workspace);
    })
    .then((subscribedEvents) => {
      subscribedEvents = subscribedEvents.map((item) => {
        item.keyId = item[datastore.KEY].id;
        return item;
      });

      return slack.setAppHome(
        user,
        require("./modules/appHome")(
          events,
          team,
          years,
          year || null,
          subscribedEvents
        ),
        token
      );
    })
    .catch((err) => {
      console.log("Error " + JSON.stringify(err));

      // Thrown above
      if (err == "nullteam") {
        slack.setAppHome(
          user,
          [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text:
                  "Please set a team number with `/frc setteam <number>` to view this.",
              },
            },
          ],
          token
        );
      } else {
        slack.setAppHome(
          user,
          [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `Something went wrong. Please check that your team (*${team}*) exists.`,
              },
            },
          ],
          token
        );
      }
    });
}

/**
 *
 * @param {Date} date
 */
function parseDate(date) {
  var months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${
    months[date.getUTCMonth()]
  } ${date.getUTCDate().toString()}, ${date.getUTCFullYear().toString()}`;
}
