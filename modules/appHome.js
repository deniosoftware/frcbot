function appHome(events, team, years, defaultYear, subscribedEvents) {
  var options = years
    .map((item) => {
      return {
        text: {
          type: "plain_text",
          text: item.toString(),
        },
        value: item.toString(),
      };
    })
    .reverse();
  var defaultOption = defaultYear
    ? {
        text: {
          type: "plain_text",
          text: defaultYear.toString(),
        },
        value: defaultYear.toString(),
      }
    : options[0];

  var blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Your team:* ${team ? team.toString() : ""}`,
      },
      accessory: {
        type: "static_select",
        placeholder: {
          type: "plain_text",
          text: "Select a year",
        },
        action_id: "year_select",
        options: options,
        initial_option: defaultOption,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*Subscribed Events*",
      },
    },
    {
      type: "divider",
    },
    ...(subscribedEvents.length > 0
      ? subscribedEvents.map((item) => {
          return {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*<https://www.thebluealliance.com/event/${item.event}|${
                item.event_name || item.event
              }>* in <#${item.channel}>`,
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
      : [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text:
                "You're not subscribed to any events yet. You can subscribe in any public channel with `/frc watch <event code>`.",
            },
          },
        ]),
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*Your Events*",
      },
    },
    {
      type: "divider",
    },
  ];
  events.forEach((item) => {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `<https://www.thebluealliance.com/event/${item.code}|*${item.name}*> _(${item.type})_`,
      },
      fields: [
        {
          type: "mrkdwn",
          text: `:round_pushpin: ${item.location}`,
        },
        {
          type: "mrkdwn",
          text: `:date: ${item.dates}`,
        },
        ...(item.week
          ? [
              {
                type: "mrkdwn",
                text: item.week ? ":clock1: " + item.week : "",
              },
            ]
          : []),
      ],
      accessory: {
        type: "button",
        text: {
          type: "plain_text",
          text: "View on TBA",
          emoji: true,
        },
        style: "primary",
        value: "click_me_123",
        url: `https://www.thebluealliance.com/event/${item.code}`,
      },
    });
    blocks.push({
      type: "divider",
    });
  });
  blocks.push({
    type: "context",
    elements: [
      {
        type: "image",
        image_url: "https://the-blue-alliance-slack.appspot.com/img/tba.png",
        alt_text: "TBA Logo",
      },
      {
        type: "mrkdwn",
        text: "Data from <https://www.thebluealliance.com|The Blue Alliance>",
      },
    ],
  });

  return blocks;
}

module.exports = appHome;
