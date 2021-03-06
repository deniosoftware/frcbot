module.exports = {
  team(number, name, rookie_year, hometown, isYourTeam) {
    var blocks = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Team ${number}${name ? " - *" + name + "*" : ""}`,
        },
        accessory: {
          type: "image",
          image_url:
            "https://the-blue-alliance-slack.appspot.com/avatar/" + number,
          alt_text: "Team avatar",
        },
        fields: [
          {
            type: "mrkdwn",
            text: `*Rookie Year*\n${
              rookie_year ? rookie_year.toString() : "_<no rookie year>_"
            }`,
          },
          {
            type: "mrkdwn",
            text: `*Hometown*\n${hometown}`,
          },
        ],
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              emoji: true,
              text: "View on TBA  :arrow_upper_right:",
            },
            url: `https://www.thebluealliance.com/team/${number}`,
          },
        ],
      },
    ];

    if (isYourTeam) {
      blocks.push({
        type: "context",
        elements: [
          {
            type: "plain_text",
            text: "This is your team! :tada:",
          },
        ],
      });
    }

    return blocks;
  },
  help() {
    return [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "`/frc team <number>`: Get info on the given FRC team.",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            "`/frc setteam <number>`: Set your team number.\nUse `/frc unsetteam` to unset this.",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            "`/frc watch <event code>`: Subscribe the current channel to match notifications for the given event. Event codes look like `2019mabos` and can be found on <https://www.thebluealliance.com|The Blue Alliance>.\nUse `/frc unwatch` in the same channel to unsubscribe, and `/frc watch` to view all of your subscriptions.",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            "`/frc schedule <event code>`: Display the match schedule for the given event. This will highlight your team, as set with `/frc setteam`.",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            "`/frc rankings <event code>`: Display the qualification rankings for the given event. This will highlight your team, as set with `/frc setteam`.",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            "`/frc feedback`: Report a bug, suggest a feature, or let us know how much you love FRCBot :grin:",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            "`/frc help`: Show the message you're looking at right now :wink:",
        },
      },
    ];
  },
  welcome() {
    return [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            "*Welcome to FRCBot!*:wave: Here are some tips to get you started: :robot_face:",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            "*Set your team number:* Just type `/frc setteam <number>` to get personalized event results (and more cool stuff :sunglasses:).",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            "*Subscribe to an event:* Type `/frc watch <event code>` in any public channel to get notified when match scores :trophy: are posted. You can find event codes at thebluealliance.com.",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            "*Get team info:* Can't remember the name of that one team? :thinking_face: Just type `/frc team <number>` to get info on any FRC team.",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            "*What else?* Just say `/frc help` to show a list of possible commands.",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            "*Need help?* Just type `/frc feedback` in any channel to report an issue (or suggest a feature).",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*_Happy Slacking!_* :wave:",
        },
      },
    ];
  },
  /**
   *
   * @param {String} event
   * @param {String} channel
   * @param {String} key
   * @param {String|null} team
   */
  newEventSubscription(event, channel, key, team, user) {
    var blocks = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Fantastic!* :tada: I've just subscribed the channel <#${channel}> to the event <https://www.thebluealliance.com/event/${event.key}|${event.name} ${event.year}>. Now, you'll receive notifications for match scores :trophy:.`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            "By default, you're subscribed to *Match Score* notifications for *all matches*. To unsubscribe :no_entry:, or manage your subscription preferences :gear:, click or tap the *Options* button.",
        },
        accessory: {
          type: "button",
          text: {
            type: "plain_text",
            text: "Options",
          },
          action_id: "event_options",
          value: key,
          style: "primary",
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Setup by <@${user}>`,
          },
        ],
      },
    ];

    return blocks;
  },
  /**
   *
   * @param {*} event
   * @param {*} match
   * @param {*} red
   * @param {*} blue
   * @param {*} [team]
   * @param {String[]} teamsToHighlight
   */
  matchJustPlayed(event, match, red, blue, team, teamsToHighlight) {
    red.teams = red.teams.map((item) => item.replace("frc", ""));
    blue.teams = blue.teams.map((item) => item.replace("frc", ""));

    // null - not in match, true - won match, false - lost match
    var status;
    if (
      team &&
      red.teams.includes(team.toString()) &&
      red.score >= blue.score
    ) {
      status = true;
    } else if (
      team &&
      blue.teams.includes(team.toString()) &&
      blue.score >= red.score
    ) {
      status = true;
    } else if (
      !team ||
      (!blue.teams.includes(team.toString()) &&
        !red.teams.includes(team.toString()))
    ) {
      status = null;
    } else {
      // Lost match
      status = false;
    }

    var blocks = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `A match was just played in <https://www.thebluealliance.com/event/${event.key}|*${event.name}*>:\n<https://www.thebluealliance.com/match/${match.key}|*${match.name}*>`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `:red_circle: *Teams*: ${red.teams
            .map((item) =>
              teamsToHighlight.includes(item)
                ? `:star:<https://www.thebluealliance.com/team/${item}|*` +
                  item.toString() +
                  "*>"
                : `<https://www.thebluealliance.com/team/${item}|` +
                  item.toString() +
                  ">"
            )
            .join(", ")} | *Score*: ${red.score.toString()} ${
            red.score >= blue.score ? ":trophy:" : ""
          }\n:large_blue_circle: *Teams*: ${blue.teams
            .map((item) =>
              teamsToHighlight.includes(item)
                ? `:star:<https://www.thebluealliance.com/team/${item}|*` +
                  item.toString() +
                  "*>"
                : `<https://www.thebluealliance.com/team/${item}|` +
                  item.toString() +
                  ">"
            )
            .join(", ")} | *Score*: ${blue.score.toString()} ${
            blue.score >= red.score ? ":trophy:" : ""
          }`,
        },
      },
      ...(status != null
        ? [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `Your team (*${team}*) ${
                  status == true
                    ? "won this match! :tada:"
                    : "lost this match. :cry:"
                }`,
              },
            },
          ]
        : []),
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text:
              "Use `/frc unwatch` to unsubscribe from future notifications in this channel, or `/frc watch` to manage your subscriptions.",
          },
        ],
      },
    ];
    return blocks;
  },
  subscriptionList(events) {
    if (events.length == 0) {
      return [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text:
              "You're not subscribed to any events. Try `/frc watch <event code>`.",
          },
        },
      ];
    } else {
      var blocks = [
        {
          type: "section",
          text: {
            type: "plain_text",
            text: `You're subscribed to ${events.length.toString()} event${
              events.length == 1 ? "" : "s"
            }:`,
          },
        },
      ];

      blocks.push(
        ...events.map((item) => {
          return {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `<https://www.thebluealliance.com/event/${item.event}|${
                item.event_name || item.event
              }> in <#${item.channel}>`,
            },
            accessory: {
              type: "button",
              text: {
                type: "plain_text",
                text: "Options",
              },
              style: "primary",
              action_id: "event_options",
              value: item.keyId.toString(),
            },
          };
        })
      );

      return blocks;
    }
  },
  upcomingMatch(event, match, teams, team, teamsToHighlight) {
    return [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `There's an upcoming match in *<https://www.thebluealliance.com/event/${event.key}|${event.name}>*:\n*<https://www.thebluealliance.com/match/${match.key}|${match.name}>*`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Teams:*\n${teams
            .map((item) => item.replace("frc", ""))
            .map((item) =>
              teamsToHighlight.includes(item)
                ? `:star:<https://www.thebluealliance.com/team/${item}|*${item}*>`
                : `<https://www.thebluealliance.com/team/${item}|${item}>`
            )
            .join(", ")}`,
        },
      },
      ...(team &&
      teams.map((item) => item.replace("frc", "")).includes(team.toString())
        ? [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `:warning: Your team (*${team}*) is in this match.`,
              },
            },
          ]
        : []),
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text:
              "Use `/frc unwatch` to unsubscribe from future notifications in this channel, or `/frc watch` to manage your subscriptions.",
          },
        ],
      },
    ];
  },
};
