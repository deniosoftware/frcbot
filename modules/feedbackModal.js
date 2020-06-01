module.exports = {
  type: "modal",
  callback_id: "feedback",
  title: {
    type: "plain_text",
    text: "Submit Feedback",
    emoji: true,
  },
  submit: {
    type: "plain_text",
    text: "Submit",
    emoji: true,
  },
  close: {
    type: "plain_text",
    text: "Cancel",
    emoji: true,
  },
  blocks: [
    {
      type: "section",
      text: {
        type: "plain_text",
        text:
          "Having trouble? Just fill out this form to report a bug or request a feature.",
      },
    },
    {
      type: "input",
      element: {
        type: "plain_text_input",
        placeholder: {
          type: "plain_text",
          text: "e.g. severus@hogwarts.edu",
        },
        action_id: "email",
      },
      label: {
        type: "plain_text",
        text: "Email",
        emoji: true,
      },
      hint: {
        type: "plain_text",
        text:
          "Please provide an email if you'd like to be contacted about your feedback.",
      },
      optional: true,
      block_id: "email",
    },
    {
      type: "input",
      element: {
        type: "static_select",
        options: [
          {
            value: "bug",
            text: {
              type: "plain_text",
              text: "I found a bug",
            },
          },
          {
            value: "feature",
            text: {
              type: "plain_text",
              text: "I have a feature request",
            },
          },
          {
            value: "feedback",
            text: {
              type: "plain_text",
              text: "I have other feedback",
            },
          },
        ],
        placeholder: {
          type: "plain_text",
          text: "Select an option",
        },
        action_id: "type",
      },
      label: {
        type: "plain_text",
        text: "What would you like to report?",
      },
      block_id: "type",
    },
    {
      type: "input",
      element: {
        type: "plain_text_input",
        multiline: true,
        placeholder: {
          type: "plain_text",
          text: "Describe your issue or feature idea",
        },
        action_id: "description",
      },
      label: {
        type: "plain_text",
        text: "What's up?",
      },
      block_id: "description",
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text:
            ":information_source: Your workspace domain will be logged when this form is submitted.",
        },
      ],
    },
    {
      type: "context",
      elements: [
        {
          type: "image",
          image_url:
            "https://the-blue-alliance-slack.appspot.com/img/github.png",
          alt_text: "GitHub logo",
        },
        {
          type: "mrkdwn",
          text:
            "<https://github.com/deniosoftware/frcbot/issues/new|Open an issue> on <https://github.com/deniosoftware/frcbot|GitHub> for a faster response.",
        },
      ],
    },
  ],
};
