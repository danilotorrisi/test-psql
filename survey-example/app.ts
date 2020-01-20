import { createPublisher } from "../publisher";
import { v4 } from "uuid";

const publisher = createPublisher();

export const delay = async (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  // await publisher.sendCommand({
  //   category: "survey",
  //   id: "abc",
  //   command: "CREATE_SURVEY",
  //   data: { id: "abc", name: "My First Survey" },
  //   metadata: { traceId: v4() }
  // });
  // await delay(3000);

  // await publisher.sendCommand({
  //   category: "question",
  //   id: "abc",
  //   command: "CREATE_QUESTION",
  //   data: { id: "abc", body: "Come ti chiami!?" },
  //   metadata: { traceId: v4() }
  // });
  // await delay(3000);

  // await publisher.sendCommand({
  //   category: "survey",
  //   id: "abc",
  //   command: "ADD_QUESTION_TO_SURVEY",
  //   data: { id: "abc", questionId: "abc", index: 1 },
  //   metadata: { traceId: v4() }
  // });
  // await delay(3000);

  // await publisher.sendCommand({
  //   category: "survey",
  //   id: "abc",
  //   command: "PUBLISH_SURVEY",
  //   data: { id: "abc" },
  //   metadata: { traceId: v4() }
  // });
  // await delay(3000);

  await publisher.sendCommand({
    category: "question",
    id: "abc",
    command: "EDIT_QUESTION",
    data: { id: "abc", body: "Come ti chiami cazzu cazzu?" },
    metadata: { traceId: v4() }
  });
  // await publisher.sendCommand({
  //   category: "question",
  //   id: "def",
  //   command: "CREATE_QUESTION",
  //   data: { id: "toq", body: "Numero di Telefono" },
  //   metadata: { traceId: v4() }
  // });

  // await publisher.sendCommand({
  //   category: "survey",
  //   id: "abc",
  //   command: "ADD_QUESTION_TO_SURVEY",
  //   data: { id: "abc", questionId: "def", index: 0 },
  //   metadata: { traceId: v4() }
  // });

  // await publisher.sendCommand({
  //   category: "question",
  //   id: "abc",
  //   command: "EDIT_QUESTION",
  //   data: { id: "abc", body: "Nome" },
  //   metadata: { traceId: v4() }
  // });
}

run();
