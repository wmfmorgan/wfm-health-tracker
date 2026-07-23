import { sqliteTable, text, real, integer, primaryKey } from "drizzle-orm/sqlite-core";

export const profile = sqliteTable("profile", {
  id: text("id").primaryKey(), // always "default"
  displayName: text("display_name"),
  dateOfBirth: text("date_of_birth"),
  sex: text("sex"),
  heightValue: real("height_value"),
  heightUnit: text("height_unit"), // cm | in
  weightValue: real("weight_value"),
  weightUnit: text("weight_unit"), // kg | lb
  bloodType: text("blood_type"),
  notes: text("notes"),
  preferredLengthUnit: text("preferred_length_unit").notNull().default("cm"),
  preferredWeightUnit: text("preferred_weight_unit").notNull().default("kg"),
  updatedAt: text("updated_at").notNull(),
});

export const allergies = sqliteTable("allergies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  reaction: text("reaction"),
  severity: text("severity"), // mild | moderate | severe | unknown
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const diagnoses = sqliteTable("diagnoses", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status").notNull(), // active | resolved | chronic
  diagnosedOn: text("diagnosed_on"),
  icdCode: text("icd_code"),
  clinician: text("clinician"),
  facility: text("facility"),
  notes: text("notes"),
  source: text("source").notNull().default("manual"), // manual | pdf_import
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const medications = sqliteTable("medications", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  dose: text("dose"),
  form: text("form"),
  route: text("route"),
  frequency: text("frequency"),
  prn: integer("prn", { mode: "boolean" }).notNull().default(false),
  startOn: text("start_on"),
  endOn: text("end_on"),
  status: text("status").notNull(), // active | stopped
  purpose: text("purpose"), // diagnosis name
  howItHelps: text("how_it_helps"), // plain-language benefit / what it does
  prescriber: text("prescriber"),
  notes: text("notes"),
  source: text("source").notNull().default("manual"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const supplements = sqliteTable("supplements", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  dose: text("dose"),
  form: text("form"),
  route: text("route"),
  frequency: text("frequency"),
  prn: integer("prn", { mode: "boolean" }).notNull().default(false),
  startOn: text("start_on"),
  endOn: text("end_on"),
  status: text("status").notNull(),
  purpose: text("purpose"), // diagnosis name
  howItHelps: text("how_it_helps"),
  prescriber: text("prescriber"), // provider who recommended (same role as meds)
  notes: text("notes"),
  source: text("source").notNull().default("manual"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const labPanels = sqliteTable("lab_panels", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  collectedOn: text("collected_on"),
  facility: text("facility"),
  status: text("status").notNull().default("final"), // pending | final
  notes: text("notes"),
  source: text("source").notNull().default("manual"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const labResults = sqliteTable("lab_results", {
  id: text("id").primaryKey(),
  panelId: text("panel_id")
    .notNull()
    .references(() => labPanels.id, { onDelete: "cascade" }),
  analyteName: text("analyte_name").notNull(),
  value: text("value"),
  unit: text("unit"),
  refLow: text("ref_low"),
  refHigh: text("ref_high"),
  flag: text("flag"), // normal | H | L | critical | unknown
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const tests = sqliteTable("tests", {
  id: text("id").primaryKey(),
  type: text("type").notNull(), // imaging | pathology | other
  name: text("name").notNull(),
  performedOn: text("performed_on"),
  facility: text("facility"),
  diagnosis: text("diagnosis"), // related diagnosis name
  summary: text("summary"),
  keyFindings: text("key_findings"),
  notes: text("notes"),
  source: text("source").notNull().default("manual"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const procedures = sqliteTable("procedures", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  performedOn: text("performed_on"),
  facility: text("facility"),
  clinician: text("clinician"),
  diagnosis: text("diagnosis"), // related diagnosis name
  outcome: text("outcome"),
  followUp: text("follow_up"),
  notes: text("notes"),
  source: text("source").notNull().default("manual"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(),
  originalFilename: text("original_filename").notNull(),
  contentType: text("content_type").notNull(),
  storagePath: text("storage_path").notNull(),
  byteSize: integer("byte_size").notNull(),
  checksum: text("checksum").notNull(),
  title: text("title"),
  description: text("description"),
  uploadedVia: text("uploaded_via").notNull(), // manual | ai_import
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});

/** entityType: diagnosis | medication | supplement | lab_panel | test | procedure */
export const documentLinks = sqliteTable(
  "document_links",
  {
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.documentId, t.entityType, t.entityId] }),
  }),
);

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

/** Care team / facilities referenced by clinical form dropdowns */
export const providers = sqliteTable("providers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  specialty: text("specialty"),
  organization: text("organization"), // facility / practice name
  phone: text("phone"),
  email: text("email"),
  notes: text("notes"),
  status: text("status").notNull().default("active"), // active | inactive
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/** Master list of lab analytes for consistent naming over time */
export const analytes = sqliteTable("analytes", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  defaultUnit: text("default_unit"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const importJobs = sqliteTable("import_jobs", {
  id: text("id").primaryKey(),
  documentId: text("document_id")
    .notNull()
    .references(() => documents.id),
  status: text("status").notNull(),
  // pending | awaiting_cloud_confirm | extracting | ready | failed | discarded | completed
  provider: text("provider").notNull(), // grok | ollama
  model: text("model").notNull(),
  errorMessage: text("error_message"),
  extractedCharCount: integer("extracted_char_count"),
  cloudConfirmedAt: text("cloud_confirmed_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const draftLabPanels = sqliteTable("draft_lab_panels", {
  id: text("id").primaryKey(),
  importJobId: text("import_job_id")
    .notNull()
    .references(() => importJobs.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull().default(0),
  name: text("name").notNull(),
  collectedOn: text("collected_on"),
  facility: text("facility"),
  status: text("status").notNull().default("final"),
  notes: text("notes"),
  reviewStatus: text("review_status").notNull().default("pending"),
  // pending | accepted | rejected
  committedEntityId: text("committed_entity_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const draftLabResults = sqliteTable("draft_lab_results", {
  id: text("id").primaryKey(),
  draftPanelId: text("draft_panel_id")
    .notNull()
    .references(() => draftLabPanels.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull().default(0),
  analyteName: text("analyte_name").notNull(),
  value: text("value"),
  unit: text("unit"),
  refLow: text("ref_low"),
  refHigh: text("ref_high"),
  flag: text("flag"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/** Clinical co-pilot personas (built-in + custom) */
export const personas = sqliteTable("personas", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  specialty: text("specialty"),
  description: text("description"),
  systemPromptDefault: text("system_prompt_default").notNull(),
  systemPromptOverride: text("system_prompt_override"),
  isBuiltin: integer("is_builtin", { mode: "boolean" }).notNull().default(false),
  isEnabled: integer("is_enabled", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/** Persona chart-brief views (draft → accepted / rejected / superseded) */
export const personaViews = sqliteTable("persona_views", {
  id: text("id").primaryKey(),
  personaId: text("persona_id")
    .notNull()
    .references(() => personas.id),
  status: text("status").notNull(), // draft | accepted | rejected | superseded
  version: integer("version").notNull().default(0),
  title: text("title"),
  bodyMd: text("body_md").notNull(),
  sectionsJson: text("sections_json"), // JSON string
  topicsJson: text("topics_json"),
  citationsJson: text("citations_json"),
  factOpinionJson: text("fact_opinion_json"),
  provider: text("provider"),
  model: text("model"),
  parentViewId: text("parent_view_id"),
  focusNote: text("focus_note"),
  createdAt: text("created_at").notNull(),
  acceptedAt: text("accepted_at"),
  updatedAt: text("updated_at").notNull(),
});

/** User-owned plan section (single default row) */
export const myPlan = sqliteTable("my_plan", {
  id: text("id").primaryKey(), // "default"
  bodyMd: text("body_md").notNull().default(""),
  updatedAt: text("updated_at").notNull(),
});

export const chatThreads = sqliteTable("chat_threads", {
  id: text("id").primaryKey(),
  title: text("title"),
  personaId: text("persona_id").references(() => personas.id),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const chatMessages = sqliteTable("chat_messages", {
  id: text("id").primaryKey(),
  threadId: text("thread_id")
    .notNull()
    .references(() => chatThreads.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // user | assistant | system
  content: text("content").notNull(),
  provider: text("provider"),
  model: text("model"),
  createdAt: text("created_at").notNull(),
});
