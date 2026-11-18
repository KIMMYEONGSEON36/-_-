# Design Flow --- Data Structure

## 1. Entities

MVP entities: - requests - ai_analyses - tasks - task_steps - time_logs

## 2. requests

-   id: UUID, primary key
-   request_number: text, unique
-   brand: text
-   store_name: text, nullable
-   requester_name: text
-   requester_contact: text, nullable
-   request_type: text
-   production_type: text, nullable
-   purpose: text, nullable
-   content: JSONB
-   usage_environment: text, nullable
-   size_info: JSONB, nullable
-   material_context: text, nullable
-   quantity: integer, nullable
-   requested_deadline: date, nullable
-   event_date: date, nullable
-   reference_info: JSONB, nullable
-   notes: text, nullable
-   status: text
-   submitted_at: timestamp
-   updated_at: timestamp

## 3. ai_analyses

-   id: UUID, primary key
-   request_id: UUID, foreign key
-   summary: text
-   task_type: text
-   difficulty: text
-   priority: text
-   estimated_total_minutes: integer
-   missing_information: JSONB
-   additional_questions: JSONB
-   recommended_steps: JSONB
-   deadline_recommendation: JSONB
-   deadline_risk: text
-   reasoning: text
-   model_name: text
-   created_at: timestamp

## 4. tasks

-   id: UUID, primary key
-   request_id: UUID, nullable foreign key
-   task_name: text
-   brand: text
-   task_type: text
-   priority: text
-   difficulty: text
-   estimated_minutes: integer
-   actual_minutes: integer, default 0
-   deadline: date, nullable
-   scheduled_date: date, nullable
-   status: text
-   notes: text, nullable
-   created_at: timestamp
-   updated_at: timestamp
-   completed_at: timestamp, nullable

## 5. task_steps

-   id: UUID, primary key
-   task_id: UUID, foreign key
-   step_name: text
-   description: text
-   sequence: integer
-   estimated_minutes: integer
-   actual_minutes: integer, default 0
-   status: text
-   completed_at: timestamp, nullable

## 6. time_logs

-   id: UUID, primary key
-   task_id: UUID, foreign key
-   task_step_id: UUID, nullable foreign key
-   started_at: timestamp, nullable
-   ended_at: timestamp, nullable
-   duration_minutes: integer
-   work_type: text
-   memo: text, nullable
-   created_at: timestamp

## 7. Suggested enums

request_type: - new_design - revision - reorder - consultation

request_status: - submitted - analyzing - needs_review - approved -
rejected - archived

task_status: - todo - in_progress - waiting - review - completed -
cancelled

priority: - low - normal - high - urgent

difficulty: - low - medium - high

work_type: - design - communication - revision - admin - waiting

## 8. Relationships

-   One request may have one or more AI analyses.
-   One request may generate one or more tasks.
-   One task has multiple task steps.
-   One task may have multiple time logs.
-   One task step may have multiple time logs.

## 9. Data principles

-   Keep original request immutable where practical.
-   Store AI analysis separately from user-approved task data.
-   Track changes to AI suggestions if feasible.
-   Do not store unnecessary personal data.
-   Use secure access policies.
-   Public requester cannot read designer workspace data.
-   Admin data must be protected by authentication and database access
    rules.
