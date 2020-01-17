import {
  createSubscriber,
  createProjector,
  readLastMessage
} from "../subscriber";
import { CreateQuestion, EditQuestion, Message } from "./types";
import { createPublisher } from "../publisher";

type Messages = CreateQuestion | EditQuestion;

const publisher = createPublisher();

async function handler(message: Messages) {
  const alreadyProcessedProjector = createProjector(
    (prev: boolean, next: Messages) =>
      prev || next.metadata.traceId === message.metadata.traceId,
    false
  );
  // Run the projector to check if the event is already procssed.
  const alreadyProcessed = await alreadyProcessedProjector.run(
    `question-${message.data.id}`
  );

  if (alreadyProcessed) {
    return;
  }

  switch (message.type) {
    case "CREATE_QUESTION":
      publisher.emitEvent({
        event: "QUESTION_CREATED",
        category: "question",
        id: message.data.id,
        data: message.data,
        metadata: message.metadata
      });
      break;

    case "EDIT_QUESTION":
      publisher.emitEvent({
        event: "QUESTION_UPDATED",
        category: "question",
        id: message.data.id,
        data: message.data,
        metadata: message.metadata
      });
      break;
  }
}

const subscriber = createSubscriber<Messages>("question:command", handler);
subscriber.run();
