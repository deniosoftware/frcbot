module.exports = (req, res) => {
  var pineappleCount = 5;
  var pineapples = "";

  if (
    !isNaN(req.body.text) &&
    parseInt(req.body.text) < 21 &&
    parseInt(req.body.text) > -21 &&
    parseInt(req.body.text) != 0
  ) {
    pineappleCount = Math.abs(parseInt(req.body.text));
  }

  for (i = 0; i < pineappleCount; i++) {
    var array = [];
    for (x = 0; x < i + 1; x++) {
      array.push(":pineapple:");
    }

    pineapples += array.join("") + "\n";
  }

  var isNegative = parseInt(req.body.text) < 0;

  // If the number was negative, reverse the 🍍s.
  if (isNegative) {
    pineapples = pineapples.split("\n").reverse().join("\n");
  }

  res.json({
    response_type: "in_channel",
    blocks: [
      ...(isNegative
        ? [
            {
              type: "context",
              elements: [
                {
                  type: "mrkdwn",
                  text: "ggeretsae# :egg:",
                },
              ],
            },
          ]
        : []),
      {
        type: "section",
        text: {
          type: "plain_text",
          emoji: true,
          text: pineapples,
        },
      },
      ...(!isNegative
        ? [
            {
              type: "context",
              elements: [
                {
                  type: "mrkdwn",
                  text: ":egg: #easteregg",
                },
              ],
            },
          ]
        : []),
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `You've found the sacred :pineapple: easter egg, <@${req.body.user_id}>`,
          },
        ],
      },
    ],
  });
};
