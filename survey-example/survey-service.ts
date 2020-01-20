import { createSubscriber, createProjector } from "../subscriber";
import {
  CreateSurvey,
  PublishSurvey,
  AddQuestionToSurvey,
  RemoveQuestionFromSurvey,
  SurveyCreated,
  QuestionAddedToSurvey,
  SurveyPublished,
  QuestionRemovedFromSurvey,
  QuestionEvents,
  SurveyCommands,
  UpdateSurveyQuestion,
  SurveyQuestionUpdated,
  SurveyEvents
} from "./types";
import { createPublisher } from "../publisher";

type Messages =
  | CreateSurvey
  | PublishSurvey
  | AddQuestionToSurvey
  | UpdateSurveyQuestion
  | RemoveQuestionFromSurvey;

type Events =
  | SurveyCreated
  | QuestionAddedToSurvey
  | SurveyQuestionUpdated
  | QuestionRemovedFromSurvey
  | SurveyPublished;

const publisher = createPublisher();

const surveyProjector = createProjector((prev: any, next: Events) => {
  switch (next.type) {
    case "SURVEY_CREATED":
      return {
        id: next.data.id,
        name: next.data.name,
        lastProcessedAt: next.position,
        lastPublishedAt: null,
        version: 1,
        questions: []
      };
    case "QUESTION_ADDED_TO_SURVEY":
      const questions = [
        ...prev.questions.slice(0, next.data.index),
        next.data.questionId,
        ...prev.questions.slice(next.data.index)
      ];
      return { ...prev, lastProcessedAt: next.position, questions };

    case "QUESTION_REMOVED_FROM_SURVEY":
      return {
        ...prev,
        lastProcessedAt: next.position,
        questions: prev.questions.filter(id => next.data.questionId)
      };
    case "SURVEY_PUBLISHED":
      return {
        ...prev,
        lastPublishedAt: next.position,
        version: prev.version + 1
      };
  }
}, null);

async function handler(message: Messages) {
  const projection = await surveyProjector.run(`survey-${message.data.id}`);
  console.log(message, projection);

  switch (message.type) {
    case "CREATE_SURVEY":
      if (projection == null) {
        await publisher.emitEvent({
          event: "SURVEY_CREATED",
          category: "survey",
          id: message.data.id,
          data: message.data,
          metadata: message.metadata
        });
      }
      break;

    case "ADD_QUESTION_TO_SURVEY":
      if (projection != null && projection.lastProcessedAt < message.position) {
        await publisher.emitEvent({
          event: "QUESTION_ADDED_TO_SURVEY",
          category: "survey",
          id: message.data.id,
          data: message.data,
          metadata: message.metadata
        });
      }
      break;

    case "REMOVE_QUESTION_FROM_SURVEY":
      if (projection != null && projection.lastProcessedAt < message.position) {
        await publisher.emitEvent({
          event: "QUESTION_REMOVED_TO_SURVEY",
          category: "survey",
          id: message.data.id,
          data: message.data,
          metadata: message.metadata
        });
      }
      break;
    case "UPDATE_SURVEY_QUESTION":
      if (projection != null && projection.lastProcessedAt < message.position) {
        await publisher.emitEvent({
          event: "SURVEY_QUESTION_UDPATED",
          category: "survey",
          id: message.data.id,
          data: message.data,
          metadata: message.metadata
        });
      }
      break;

    case "PUBLISH_SURVEY":
      if (publisher != null && projection.lastPublishedAt < message.position) {
        // Do some validation...
        await publisher.emitEvent({
          event: "SURVEY_PUBLISHED",
          category: "survey",
          id: message.data.id,
          data: message.data,
          metadata: message.metadata
        });
      }
      break;
  }
}

const subscriber = createSubscriber<Messages>("survey:command", handler);
subscriber.run();

async function questionHandler(message: QuestionEvents) {
  const { id } = message.data;

  if (message.type !== "QUESTION_UPDATED") {
    return;
  }

  console.log("id", id);
  const questionListProjector = createProjector(
    (prev: string[], next: SurveyEvents) => {
      if (
        next.type === "QUESTION_ADDED_TO_SURVEY" &&
        next.data.questionId === id
      ) {
        return [...prev, next.data.id];
      } else if (
        next.type === "QUESTION_REMOVED_FROM_SURVEY" &&
        next.data.questionId === id
      ) {
        return prev.filter(surveyId => next.data.id !== surveyId);
      }
      return prev;
    },
    []
  );

  const surveyIds: string[] = await questionListProjector.run(
    "survey",
    message.global_position
  );

  await Promise.all(
    surveyIds.map(surveyId =>
      publisher.sendCommand({
        command: "UPDATE_SURVEY_QUESTION",
        category: "survey",
        id: surveyId,
        data: { id: surveyId, questionId: id },
        metadata: message.metadata
      })
    )
  );
}

const questionSubscriber = createSubscriber<QuestionEvents>(
  "question",
  questionHandler
);
questionSubscriber.run();
