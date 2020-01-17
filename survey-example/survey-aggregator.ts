import { createSubscriber, createProjector } from "../subscriber";
import { SurveyEvents, QuestionEvents, QuestionUpdated } from "./types";

let fakeSurveyQuestions: any = {};
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

      const prevSurveyQuestion =
        fakeSurveyQuestions[message.data.questionId] ?? [];
      fakeSurveyQuestions[message.data.questionId] = [
        ...prevSurveyQuestion,
        message.data.id
      ];

      break;
    case "QUESTION_REMOVED_FROM_SURVEY":
      fakeDirtyDb[id] = {
        ...prev,
        questions: prev.questions.filter(q => q.id !== message.data.questionId)
      };

      fakeSurveyQuestions[message.data.questionId] = fakeSurveyQuestions[
        message.data.questionId
      ].filter(id => id !== message.data.id);
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
  }
  console.log("SURVEY ======");
  console.log(JSON.stringify(fakeDirtyDb));
  console.log(JSON.stringify(fakeLiveDb));
}

async function questionHandler(message: QuestionEvents) {
  console.log(message);
  const { id, body } = message.data;
  const surveyIds = fakeSurveyQuestions[id] ?? [];
  if (message.type === "QUESTION_UPDATED") {
    await Promise.all(
      surveyIds.map(async surveyId => {
        const survey = fakeDirtyDb[surveyId];
        const questions = await Promise.all(
          survey.questions.map(question => {
            if (id === question.id) {
              return projectQuestion(id);
            } else {
              return Promise.resolve(question);
            }
          })
        );
        fakeDirtyDb[surveyId] = { ...survey, questions };
      })
    );
  }

  console.log("QUESTION ======");
  console.log(JSON.stringify(fakeDirtyDb));
  console.log(JSON.stringify(fakeLiveDb));
}

const surveySubscriber = createSubscriber<SurveyEvents>("survey", handler);
surveySubscriber.run();

const questionSubscriber = createSubscriber<QuestionEvents>(
  "question",
  questionHandler
);
questionSubscriber.run();
