import { v4 } from "uuid";
import { Pool } from "pg";

const pool = new Pool({
  user: "message_store",
  database: "message_store"
});

interface EmitEventOptions {
  event: string;
  category: string;
  data?: {};
  metadata?: {};
  id?: string;
  expectedVersion?: number;
}

interface SendCommandOptions {
  command: string;
  category: string;
  data?: {};
  metadata?: {};
  id?: string;
  expectedVersion?: number;
}

interface PublishOptions {
  type: string;
  stream_name: string;
  data?: {};
  metadata?: {};
  expectedVersion?: number;
}

export function createPublisher() {
  async function publish(options: PublishOptions): Promise<string> {
    const message_id = v4();
    const sql = "SELECT write_message($1,$2,$3,$4,$5,$6)";
    // Send the query.
    return pool
      .query(sql, [
        message_id,
        options.stream_name,
        options.type,
        options.data ?? {},
        options.metadata ?? {},
        options.expectedVersion
      ])
      .then(res => {
        const { write_message } = res.rows[0];
        return write_message;
      });
  }
  return {
    publish,
    sendCommand(options: SendCommandOptions) {
      return publish({
        type: options.command,
        stream_name:
          options.id != null
            ? `${options.category}:command-${options.id}`
            : `${options.category}:command`,
        data: options.data,
        metadata: options.metadata,
        expectedVersion: options.expectedVersion
      });
    },

    emitEvent(options: EmitEventOptions) {
      return publish({
        type: options.event,
        stream_name:
          options.id != null
            ? `${options.category}-${options.id}`
            : options.category,
        data: options.data,
        metadata: options.metadata,
        expectedVersion: options.expectedVersion
      });
    }
  };
}
