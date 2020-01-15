module.exports = (data, key) => {
    var initial_options = []
    if (data.match_score) {
        initial_options.push({
            text: {
                type: "plain_text",
                text: "Match Score"
            },
            value: "match_score"
        })
    }
    if (data.upcoming_match) {
        initial_options.push({
            text: {
                type: "plain_text",
                text: "Upcoming Match"
            },
            value: "upcoming_match"
        })
    }
    if (data.event_schedule) {
        initial_options.push({
            text: {
                type: "plain_text",
                text: "Event Schedule"
            },
            value: "event_schedule"
        })
    }

    return {
        type: "modal",
        callback_id: "event_options",
        private_metadata: key.id.toString(),
        title: {
            type: "plain_text",
            text: "Event Options"
        },
        submit: {
            type: "plain_text",
            text: "Save"
        },
        blocks: [
            {
                type: "input",
                label: {
                    type: "plain_text",
                    text: "Notification Types"
                },
                hint: {
                    type: "plain_text",
                    text: "Notifications may not arrive on time. FRCBot requires the event's FMS and The Blue Alliance to be online. Please don't depend on FRCBot to tell you when you are queued for a match."
                },
                block_id: "notification_types",
                element: {
                    action_id: "notification_types",
                    type: "multi_static_select",
                    placeholder: {
                        type: "plain_text",
                        text: "Select some..."
                    },
                    options: [
                        {
                            text: {
                                type: "plain_text",
                                text: "Match Score"
                            },
                            value: "match_score"
                        },
                        {
                            text: {
                                type: "plain_text",
                                text: "Upcoming Match"
                            },
                            value: "upcoming_match"
                        },
                        {
                            text: {
                                type: "plain_text",
                                text: "Event Schedule"
                            },
                            value: "event_schedule"
                        }
                    ],
                    initial_options
                }
            },
            {
                type: "input",
                block_id: "type",
                label: {
                    type: "plain_text",
                    text: "Matches"
                },
                hint: {
                    type: "plain_text",
                    text: "You can set your team number by typing /frc setteam <number>"
                },
                element: {
                    action_id: "type",
                    type: "static_select",
                    placeholder: {
                        type: "plain_text",
                        text: "Select One..."
                    },
                    options: [
                        {
                            text: {
                                type: "plain_text",
                                text: "All matches"
                            },
                            value: "all"
                        },
                        {
                            text: {
                                type: "plain_text",
                                text: "Just your team"
                            },
                            value: "team"
                        }
                    ],
                    initial_option: data.type == "team" ? {
                        text: {
                            type: "plain_text",
                            text: "Just your team"
                        },
                        value: "team"
                    } : {
                            text: {
                                type: "plain_text",
                                text: "All matches"
                            },
                            value: "all"
                        }
                }
            },
            {
                type: "divider"
            },
            {
                type: "actions",
                elements: [
                    {
                        type: "button",
                        text: {
                            type: "plain_text",
                            text: "Unsubscribe"
                        },
                        style: "danger",
                        action_id: "modal_unsubscribe",
                        confirm: {
                            title: {
                                type: "plain_text",
                                text: "Are you sure?"
                            },
                            text: {
                                type: "plain_text",
                                text: "Are you sure that you'd like to unsubscribe?"
                            },
                            confirm: {
                                type: "plain_text",
                                text: "Yes"
                            },
                            deny: {
                                type: "plain_text",
                                text: "No"
                            }
                        }
                    }
                ]
            }
        ]
    }
}