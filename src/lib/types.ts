import type { FieldConfig, FieldLogic, FieldType } from "@/lib/fields/types";

export type EventStatus = "draft" | "open" | "closed" | "published";
export type ScoreMethod = "average" | "sum" | "trimmed";

export interface Organizer {
  id: string;
  full_name: string;
  institution: string | null;
  email: string | null;
}

export interface EventRow {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  event_date: string | null;
  venue: string | null;
  logo_url: string | null;
  cover_url: string | null;
  primary_color: string;
  status: EventStatus;
  short_code: string;
  access_pin: string | null;
  score_method: ScoreMethod;
  podium_size: number;
  min_evaluations: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  event_id: string;
  name: string;
  position: number;
}

export interface Project {
  id: string;
  event_id: string;
  category_id: string | null;
  name: string;
  members: string[];
  description: string | null;
  image_url: string | null;
  stand: string | null;
  code: string;
  manual_tiebreak: number | null;
  created_at: string;
}

export interface FormRow {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  is_published: boolean;
  is_default: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface FormField {
  id: string;
  form_id: string;
  position: number;
  type: FieldType;
  label: string;
  help: string | null;
  required: boolean;
  scored: boolean;
  weight: number;
  config: FieldConfig;
  logic: FieldLogic | null;
}

export interface Evaluator {
  id: string;
  event_id: string;
  auth_user_id: string | null;
  name: string;
  email: string | null;
  institution: string | null;
  created_at: string;
}

export type Answers = Record<string, unknown>;

export interface Submission {
  id: string;
  event_id: string;
  evaluator_id: string;
  project_id: string;
  form_id: string;
  answers: Answers;
  status: "draft" | "submitted";
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string } | null;

/** Datos públicos del evento que ve el evaluador (función get_public_event). */
export interface PublicEvent {
  id: string;
  name: string;
  description: string | null;
  event_date: string | null;
  venue: string | null;
  logo_url: string | null;
  cover_url: string | null;
  primary_color: string;
  status: EventStatus;
  short_code: string;
  requires_pin: boolean;
}
