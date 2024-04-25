import { SlackApp, SlackEdgeAppEnv } from "slack-cloudflare-workers";

export default {
  async fetch(
    request: Request,
    env: SlackEdgeAppEnv,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const app = new SlackApp({ env });

    app.event("app_mention", async ({ context }) => {
      await context.say({ text: "What's up?" });
    });

    // Receive a function_executed event from the automation platform
    app.function("hello", async ({ context, payload }) => {
      const { client } = context;
      try {
        const message =
          ":wave: Greetings, this is a message sent from a remote function deployed to Cloudflare Workers!";
        await client.chat.postMessage({
          channel: payload.inputs.user_id, // DM
          text: message,
          blocks: [
            {
              type: "section",
              text: { type: "mrkdwn", text: message },
              accessory: {
                type: "button",
                action_id: "remote-func-button",
                text: { type: "plain_text", text: "Open a modal" },
                value: "1",
              },
            },
          ],
        });
      } catch (e) {
        // Tell the failure of this step
        await client.functions.completeError({
          function_execution_id: context.functionExecutionId!,
          error: `Failed to handle function_executed event: ${e}`,
        });
      }
    });

    // Handle click events associated with the workflow
    app.action(
      "remote-func-button",
      async () => {}, // just ack
      async ({ context, payload }) => {
        const { client } = context;
        try {
          await client.views.open({
            trigger_id: context.triggerId!,
            view: {
              type: "modal",
              callback_id: "remote-func-modal",
              title: { type: "plain_text", text: "My Remote Function App" },
              submit: { type: "plain_text", text: "Submit" },
              blocks: [
                {
                  type: "input",
                  block_id: "b",
                  element: {
                    type: "plain_text_input",
                    action_id: "a",
                  },
                  label: { type: "plain_text", text: "Message" },
                },
              ],
            },
          });
          // Hide the button before it expires
          await client.chat.update({
            channel: payload.container.channel_id!,
            ts: payload.container.message_ts!,
            text: "Thank you!",
          });
        } catch (e) {
          // Tell the failure of this step
          await client.functions.completeError({
            function_execution_id: context.functionExecutionId!,
            error: `Failed to handle button click: ${e}`,
          });
        }
      },
    );

    app.view("remote-func-modal", async ({ payload, context }) => {
      const { client } = context;
      try {
        const message = payload.view.state.values.b.a.value!;
        if (message.length <= 5) {
          return {
            response_action: "errors",
            errors: { b: "The text must be longer than 5 characters" },
          };
        }
        // Tell the completion of this step
        await client.functions.completeSuccess({
          function_execution_id: context.functionExecutionId!,
          outputs: { user_id: payload.function_data!.inputs.user_id },
        });
      } catch (e) {
        // Tell the failure of this step
        await client.functions.completeError({
          function_execution_id: context.functionExecutionId!,
          error: `Failed to handle view submission: ${e}`,
        });
      }
      return;
    });

    return await app.run(request, ctx);
  },
};
