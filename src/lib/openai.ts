import OpenAI from "openai";

const openAiSecretKey = process.env.OPEN_AI_SECRET_KEY;

const openAiClient = new OpenAI({
  apiKey: openAiSecretKey,
});

//thread作成
export const createThread = async () => {
  try {
    const thread = await openAiClient.beta.threads.create();
    return {
      result: true,
      message: "success",
      threadId: thread.id,
    };
  } catch (error: unknown) {
    const err = error as Error;
    return {
      result: false,
      message: `Failed to create thread. ${err.message}`,
      threadId: "",
    };
  }
};

//thread削除
export const deleteThread = async ({ threadId }: { threadId: string }) => {
  try {
    await openAiClient.beta.threads.del(threadId);
    return {
      result: true,
      message: "success",
    };
  } catch (error: unknown) {
    const err = error as Error;
    return {
      result: false,
      message: `Failed to delete thread. ${err.message}`,
    };
  }
};

//メッセージ作成
export const createMessage = async ({
  threadId,
  content,
}: {
  threadId: string;
  content: string;
}) => {
  try {
    const message = await openAiClient.beta.threads.messages.create(threadId, {
      content,
      role: "user",
    });
    return {
      result: true,
      message: "success",
      messageId: message.id,
    };
  } catch (error: unknown) {
    const err = error as Error;
    return {
      result: false,
      message: `Failed to create message. ${err.message}`,
      messageId: "",
    };
  }
};

//Assistantの実行
export const runAssistant = async ({
  threadId,
  assistantId,
}: {
  threadId: string;
  assistantId: string;
}) => {
  try {
    const run = await openAiClient.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
    });
    return {
      result: true,
      message: "success",
      runId: run.id,
    };
  } catch (error: unknown) {
    const err = error as Error;
    return {
      result: false,
      message: `Failed to run assistant. ${err.message}`,
      runId: "",
    };
  }
};

//Runのステータスの確認
export const checkRunStateAndGetMessage = async ({
  threadId,
  runId,
}: {
  threadId: string;
  runId: string;
}): Promise<{ result: boolean; message: string; data: string | null }> => {
  try {
    const { status } = await openAiClient.beta.threads.runs.retrieve(
      threadId,
      runId
    );

    if (
      status === "failed" ||
      status === "requires_action" ||
      status === "cancelling" ||
      status === "cancelled" ||
      status === "incomplete" ||
      status === "expired"
    ) {
      throw new Error(`Run's status is ${status}`);
    }

    if (status !== "completed") {
      return {
        result: true,
        message: `Run's status is ${status}`,
        data: null,
      };
    }

    // メッセージの取得
    const messages = await openAiClient.beta.threads.messages.list(threadId);
    const messageContent = messages.data[0].content[0];
    if (messageContent.type !== "text") {
      throw new Error(`MessageContent's type is ${messageContent.type}`);
    }

    return {
      result: true,
      message: "success",
      data: messageContent.text.value,
    };
  } catch (error: unknown) {
    const err = error as Error;
    return {
      result: false,
      message: `Failed to check run status and get message. ${err.message}`,
      data: null,
    };
  }
};
