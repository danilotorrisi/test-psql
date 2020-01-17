# Editor can create a survey with a name.

# Editor can add and remove questions to a survey.

# Editor can publish a survey.

# Editor can create a survey link.

# Editor can send a survey link via email.

# User can open a survey.

# User can reply to survey questions.

# User can close a suvey.

CREATE_SURVEY ( name: string )
-> SURVEY_CREATED

ADD_SURVEY_QUESTION ( body: string )
-> SURVEY_QUESTION_ADDED
-> SURVEY_QUESTION_ALREADY_ADDED

EDIT_SURVEY_QUESTION ( id: string, body: string )
-> SURVEY_QUESTION_UPDATED

REMOVE_SURVEY_QUESTION ( id: string )
-> SURVEY_QUESTION_REMOVED

PUBLISH_SURVEY ( id: string )
-> SURVEY_PUBLISHED

GENERATE_SURVEY_LINK ( id: string )
-> SURVEY_LINK_GENERATED

OPEN_SURVEY_SESSION ( id: string )
-> SURVEY_SESSION_OPENED
-> SURVEY_SESSION_NOT_FOUND

REPLY_SURVEY_QUESTION ( id: string )
-> SURVEY_QUESTION_REPLIED

CLOSE_SURVEY_SESSION ( id: string )

A. Sesso?

- Uomo
- Donna

Pubblico domanda A, questionario abc

A. Sesso?

- Donna
- Uomo
- Non specificato

Pubblico domanda A, questionario def.
