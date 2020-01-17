import { v4 } from "uuid";
import { Pool } from "pg";

const pool = new Pool({
  user: "message_store",
  database: "message_store"
});

const argv = require("yargs").argv;

const isCommand = argv.command != null;
const isEvent = argv.event != null;

if (!isCommand && !isEvent) {
  console.error("[ERROR]: Command or Event must be defined");
  console.log(
    'Example: sendCommand --command SOME_COMMAND --category identity --id abc --data {"hello":"world"}'
  );
  process.exit(-1);
}

if (argv.category == null) {
  console.error("[ERROR]: Category must be defined");
  console.log(
    'Example: sendCommand --command SOME_COMMAND --category identity --id abc --data {"hello":"world"}'
  );
  process.exit(-1);
}

const data = argv.data != null ? JSON.parse(argv.data) : {};
const metadata = argv.metadata != null ? JSON.parse(argv.metadata) : {};
const type = isCommand ? argv.command : argv.event;
const message_id = v4();
const sql = "SELECT write_message($1,$2,$3,$4,$5,$6)";
const stream_name =
  argv.id != null
    ? `${argv.category}${isCommand ? ":command" : ""}-${argv.id}`
    : `${argv.category}${isCommand ? ":command" : ""}`;

// Send the query.
pool
  .query(sql, [
    message_id,
    stream_name,
    type,
    data,
    metadata,
    argv.expectedVersion
  ])
  .then(res => {
    const { write_message } = res.rows[0];
    console.log(
      `${
        isCommand ? "Command" : "Event"
      } sent with local position ${write_message}`
    );
    process.exit(0);
  });
