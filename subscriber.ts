import { v4 } from "uuid";
import { Pool } from "pg";
import { createPublisher } from "./publisher";

const pool = new Pool({
  user: "message_store",
  database: "message_store"
});

export const delay = async (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));

export const serialPromises = <T>(fns: (() => Promise<T>)[]) =>
  fns.reduce(
    (promise, fn) => promise.then(results => fn().then(r => [...results, r])),
    Promise.resolve([] as T[])
  );

export type Projector<Output, Input> = (prev: Output, next: Input) => Output;
export type Handler<I = {}> = (next: I) => Promise<void> | void;
export interface ServiceOptions {
  subscriberId?: string;
  tickDelayMs?: number;
  lastPosition?: number;
  consumerGroupSize?: number;
  consumerGroupMember?: number;
  positionUpdateInterval?: number;
  idleUpdateInterval?: number;
}

function parseNumber(number: string) {
  return parseInt(number, 10);
}

function parseJSON(input: string) {
  let data = {};
  try {
    data = JSON.parse(input);
  } catch {}
  return data;
}

export function getStreamQuery(streamName: string): string {
  const isStream = streamName.indexOf("-") >= 0;
  return isStream
    ? "SELECT * FROM get_stream_messages($1,$2)"
    : "SELECT * FROM get_category_messages($1,$2,consumer_group_member => $3,consumer_group_size => $4)";
}

export function createProjector<Projection, Data = {}, Metadata = {}>(
  projector: Projector<Projection, Message<Data, Metadata>>,
  initialValue: Projection
) {
  async function run(streamName: string, untilGlobalPosition?: number) {
    const sql = getStreamQuery(streamName);
    const res = await pool.query(sql, [streamName, 0]);
    return res.rows
      .map(m => decodeMessage(m))
      .filter(
        m =>
          untilGlobalPosition == null ||
          m.global_position <= untilGlobalPosition
      )
      .reduce(projector, initialValue);
  }

  return { run };
}

export function decodeMessage(row: any) {
  const data = parseJSON(row.data);
  const metadata = parseJSON(row.metadata);
  const global_position = parseNumber(row.global_position);
  const position = parseNumber(row.position);
  return { ...row, data, metadata, global_position, position };
}

export async function readLastMessage<Message>(
  streamName: string
): Promise<Message | null> {
  const res = await pool.query("SELECT * FROM get_last_stream_message($1)", [
    streamName
  ]);

  const row = res.rows[0];
  if (row != null) {
    return decodeMessage(row);
  } else {
    return null;
  }
}

export function createSubscriber<M>(
  streamName: string,
  handler: Handler<M>,
  options?: ServiceOptions
) {
  let currentPosition = options?.lastPosition ?? 0;
  let currentIdlePosition = 0;
  let currentUpdatePosition = 0;

  const subscriberId = options?.subscriberId;
  const isDurable = subscriberId != null;
  const publisher = createPublisher();
  const durableStreamName = `subscriber-Position-${subscriberId}`;
  const consumerGroupMember = options?.consumerGroupMember ?? 0;
  const consumerGroupSize = options?.consumerGroupSize ?? 1;
  const positionUpdateInterval = options?.positionUpdateInterval ?? 100;
  const idleUpdateInterval = options?.idleUpdateInterval ?? 50;

  let shouldStop = false;
  let shouldKill = false;

  const tick = async () => {
    // Run the query.
    const sql = getStreamQuery(streamName);
    const res = await pool.query(sql, [
      streamName,
      currentPosition,
      consumerGroupMember,
      consumerGroupSize
    ]);

    await serialPromises(
      res.rows.map(row => {
        return async () => {
          if (row.global_position > currentPosition) {
            const message = decodeMessage(row);
            const maybePromise: any = handler(message);
            if (maybePromise != null && "then" in maybePromise) {
              await maybePromise;
            }
            currentPosition = parseNumber(row.global_position);
            currentUpdatePosition++;
          }
          return;
        };
      })
    );

    if (isDurable && currentUpdatePosition >= positionUpdateInterval) {
      await publisher.publish({
        stream_name: durableStreamName,
        type: "READ",
        data: { position: currentPosition }
      });
      currentUpdatePosition = 0;
    }

    return res.rowCount;
  };

  // Here's the internal run function.
  const run = async () => {
    // Only if the subscriber is durable, and the user has not passed a fixed last positionn.
    if (isDurable && options?.lastPosition == null) {
      const lastMessage = await readLastMessage<
        Message<"READ", { position: number }>
      >(durableStreamName);
      if (lastMessage != null) {
        currentPosition = lastMessage.data.position;
        console.log(
          `Starting subscriber ${subscriberId} from last position ${currentPosition}`
        );
      }
    }

    while (!shouldStop) {
      // Only if no rows are found, wait.
      const rows = await tick();

      if (rows === 0) {
        currentIdlePosition++;
        await delay(options?.tickDelayMs ?? 200);

        // // If waited without any message for more than idleUpdateINterval, also update the stream.
        // if (currentIdlePosition > idleUpdateInterval) {
        //   await publisher.publish({
        //     stream_name: durableStreamName,
        //     type: "READ",
        //     data: { position: currentPosition }
        //   });
        // }
      } else {
        currentIdlePosition = 0;
      }
    }

    if (shouldKill) {
      process.exit(0);
    }
  };

  // Stop on sigint.
  process.on("SIGINT", function() {
    shouldKill = true;
    stop();
  });

  function stop() {
    console.log("Stopping...");
    shouldStop = true;
  }

  return { run, stop };
}
