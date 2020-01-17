export interface Message<Type = "", Data = {}, Metadata = { traceId: string }> {
  id: string;
  stream_name: string;
  type: Type;
  position: number;
  global_position: number;
  data: Data;
  metadata: Metadata;
  time: Date;
}

export type ISurvey = { id: string; name: string };
export type IQuestion = { id: string; body: string };
export type ISurveyQuestion = { questionId: string; id: string };

// Ctx Survey.
export type CreateSurvey = Message<"CREATE_SURVEY", ISurvey>;
export type SurveyCreated = Message<"SURVEY_CREATED", ISurvey>;
export type PublishSurvey = Message<"PUBLISH_SURVEY", { id: string }>;
export type SurveyPublished = Message<"SURVEY_PUBLISHED", { id: string }>;
export type SurveyCommands =
  | CreateSurvey
  | PublishSurvey
  | AddQuestionToSurvey
  | RemoveQuestionFromSurvey;
export type SurveyEvents =
  | SurveyCreated
  | SurveyPublished
  | QuestionRemovedFromSurvey
  | QuestionAddedToSurvey;

// Ctx Question.
export type CreateQuestion = Message<"CREATE_QUESTION", IQuestion>;
export type QuestionCreated = Message<"QUESTION_CREATED", IQuestion>;
export type EditQuestion = Message<"EDIT_QUESTION", IQuestion>;
export type QuestionUpdated = Message<"QUESTION_UPDATED", IQuestion>;
export type QuestionEvents = QuestionCreated | QuestionUpdated;

export type AddQuestionToSurvey = Message<
  "ADD_QUESTION_TO_SURVEY",
  ISurveyQuestion & { index: number }
>;

export type RemoveQuestionFromSurvey = Message<
  "REMOVE_QUESTION_FROM_SURVEY",
  ISurveyQuestion
>;

export type QuestionRemovedFromSurvey = Message<
  "QUESTION_REMOVED_FROM_SURVEY",
  ISurveyQuestion
>;

export type QuestionAddedToSurvey = Message<
  "QUESTION_ADDED_TO_SURVEY",
  ISurveyQuestion & { index: number }
>;

export type QuestionAlreadyAddedToSurvey = Message<
  "SURVEY_QUESTION_ALREADY_ADDED",
  ISurveyQuestion
>;
