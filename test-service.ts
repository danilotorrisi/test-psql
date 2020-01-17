import { createSubscriber, createProjector, delay } from "./subscriber";
import { createPublisher } from "./publisher";
import { v4 } from "uuid";

let fakeDb: any = {
  companies: {},
  vatNumbers: {}
};

type EventMessages =
  | Message<"COMPANY_CREATED", { id: string }>
  | Message<"COMPANY_NAME_SET", { id: string; name: string }>
  | Message<"COMPANY_VAT_SET", { id: string; vatNumber: string }>;

type CommandMessage =
  | Message<"CREATE_COMPANY", { id: string }>
  | Message<"SET_COMPANY_NAME", { id: string; name: string }>
  | Message<"SET_COMPANY_VAT", { id: string; vatNumber: string }>;

function aggregator(row: EventMessages) {
  console.log(row.stream_name);
  switch (row.type) {
    case "COMPANY_CREATED":
      fakeDb.companies[row.data.id] = { id: row.data.id };
      break;

    case "COMPANY_NAME_SET":
      fakeDb.companies[row.data.id] = {
        ...(fakeDb.companies[row.data.id] || {}),
        name: row.data.name
      };
      break;
    case "COMPANY_VAT_SET":
      {
        const prev = fakeDb.companies[row.data.id] || {};
        fakeDb.companies[row.data.id] = {
          ...prev,
          vatNumber: row.data.vatNumber
        };

        delete fakeDb.vatNumbers[prev];

        fakeDb.vatNumbers = {
          [row.data.vatNumber]: {
            id: row.data.id,
            name: prev.name
          }
        };
      }
      break;
  }
  console.log(fakeDb);
}

function checkAlreadyExists(
  prev: boolean,
  item: Message<string | "COMPANY_CREATED">
) {
  console.log("=>", item);
  return prev || item.type === "COMPANY_CREATED";
}

const publisher = createPublisher();

const projector = createProjector(checkAlreadyExists, false);
const alreadySentProjector = createProjector(
  (prev, next) => prev || next.type === "SEND_EMAIL_TO_COMPANY_WITHOUT_VAT",
  false
);

async function serviceHandler(row: CommandMessage) {
  const { id } = row.data;
  const companyAlreadyExists = await projector.run(`company-${id}`);

  switch (row.type) {
    case "CREATE_COMPANY":
      if (!companyAlreadyExists) {
        return publisher.emitEvent({
          event: "COMPANY_CREATED",
          category: "company",
          id,
          data: { id }
        });
      }
      break;

    case "SET_COMPANY_VAT":
      if (companyAlreadyExists) {
        // If already exists.
        if (fakeDb.vatNumbers[row.data.vatNumber]) {
          const match = fakeDb.vatNumbers[row.data.vatNumber];
          return publisher.emitEvent({
            event: "COMPANY_VAT_ALREADY_EXISTS",
            category: "company",
            id,
            data: {
              ...row.data,
              match
            }
          });
        } else {
          return publisher.emitEvent({
            event: "COMPANY_VAT_SET",
            category: "company",
            id,
            data: row.data
          });
        }
      }
      break;

    case "SET_COMPANY_NAME":
      if (companyAlreadyExists) {
        return publisher.emitEvent({
          event: "COMPANY_NAME_SET",
          category: "company",
          id,
          data: row.data
        });
      } else {
        // Ignore?!
        console.error("Company does not exists", id);
      }
  }
}

// // Service
// const service = createSubscriber("company:command", serviceHandler, {
//   lastPosition: 114
// });
// service.run();

// Read Model
const aggregation = createSubscriber(
  "company",
  async item => {
    await delay(4000);
    console.log("Item #0", item);
  },
  {
    subscriberId: "def"
  }
);
aggregation.run();

type EmailMessages =
  | Message
  | Message<"SEND_EMAIL_TO_COMPANIES_WITHOUT_VAT">
  | Message<"SEND_EMAIL_TO_COMPANY_WITHOUT_VAT">;

async function emailServiceHandler(msg: EmailMessages) {
  if (msg.type === "SEND_EMAIL_TO_COMPANIES_WITHOUT_VAT") {
    const companiesWithoutEmail = Object.values(fakeDb.companies).filter(
      f => f.vatNumber == null
    );

    const companiesWithResult = await Promise.all(
      companiesWithoutEmail.map(async ({ id, ...other }) => {
        const alreadySent = await alreadySentProjector.run(
          `company:command-${id}`
        );
        return { alreadySent, id, ...other };
      })
    );

    const companiesWithNoEmail = companiesWithResult.filter(
      ({ alreadySent }) => alreadySent === false
    );

    console.log("Found", companiesWithoutEmail);

    await Promise.all(
      companiesWithNoEmail.map(company => {
        publisher.sendCommand({
          command: "SEND_EMAIL_TO_COMPANY_WITHOUT_VAT",
          id: company.id,
          category: "company"
        });
      })
    );
  } else if (msg.type === "SEND_EMAIL_TO_COMPANY_WITHOUT_VAT") {
    await publisher.sendCommand({
      command: "SEND_EMAIL",
      category: "email"
    });
  }
}

// // SEND_EMAIL CMD
// // Send each monday, an email to all the companies without a VAT.
// const companyEmailService = createSubscriber(
//   "company:command",
//   emailServiceHandler,
//   { lastPosition: 142 }
// );
// companyEmailService.run();
