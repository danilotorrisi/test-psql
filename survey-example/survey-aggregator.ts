import { createSubscriber, createProjector } from "../subscriber";
import { SurveyEvents, QuestionEvents, QuestionUpdated } from "./types";

let fakeLiveDb: any = {};
let fakeDirtyDb: any = {};

const projector = createProjector(
  (prev: any, next: QuestionEvents) => ({
    ...next.data,
    lastProcessedAt: next.global_position
  }),
  {}
);

async function projectQuestion(questionId: string, untilPosition?: number) {
  return await projector.run(`question-${questionId}`, untilPosition);
}

async function handler(message: SurveyEvents) {
  const id = message.data.id;
  const prev = fakeDirtyDb[id] ?? {};
  console.log(message);

  switch (message.type) {
    case "SURVEY_CREATED":
      fakeDirtyDb[id] = { ...message.data, questions: [] };
      break;
    case "QUESTION_ADDED_TO_SURVEY":
      const question = await projectQuestion(message.data.questionId);

      fakeDirtyDb[id] = {
        ...prev,
        questions: [
          ...prev.questions.slice(0, message.data.index),
          { ...question },
          ...prev.questions.slice(message.data.index)
        ]
      };

      break;
    case "QUESTION_REMOVED_FROM_SURVEY":
      fakeDirtyDb[id] = {
        ...prev,
        questions: prev.questions.filter(q => q.id !== message.data.questionId)
      };

      break;
    case "SURVEY_PUBLISHED":
      const survey = fakeDirtyDb[id];
      const questions = await Promise.all(
        survey.questions.map(({ id }) =>
          projectQuestion(id, message.global_position)
        )
      );

      fakeLiveDb[id] = {
        ...survey,
        questions
      };
      break;
    case "SURVEY_QUESTION_UPDATED": {
      const { id, questionId } = message.data;

      const survey = fakeDirtyDb[id];
      const questions = await Promise.all(
        survey.questions.map(question =>
          question.id === questionId
            ? projectQuestion(id, message.global_position)
            : Promise.resolve(question)
        )
      );
      fakeDirtyDb[id] = { ...survey, questions };
    }
  }
  console.log("SURVEY ======");
  console.log(JSON.stringify(fakeDirtyDb));
  console.log(JSON.stringify(fakeLiveDb));
}

const surveySubscriber = createSubscriber<SurveyEvents>("survey", handler);
surveySubscriber.run();
