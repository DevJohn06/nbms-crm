import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const verticals = sqliteTable('verticals', {
	id: text('id').primaryKey(), // slug format, e.g. 'mmj-dispensary'
	name: text('name').notNull(),
	slug: text('slug').notNull().unique(),
	description: text('description'),
	subdomain: text('subdomain'),
	themeColor: text('theme_color'),
	isDefault: integer('is_default').default(0),
	createdAt: text('created_at').notNull(),
	updatedAt: text('updated_at').notNull()
});

export const userVerticals = sqliteTable('user_verticals', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	verticalId: text('vertical_id').notNull().references(() => verticals.id, { onDelete: 'cascade' }),
	createdAt: text('created_at').notNull()
});

export const leads = sqliteTable('leads', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	verticalId: text('vertical_id').references(() => verticals.id),
	businessName: text('business_name').notNull(),
	email: text('email').notNull(),
	secondaryEmail: text('secondary_email'),
	phone: text('phone').notNull(),
	status: text('status').notNull().default('NEW'),
	notes: text('notes'),
	customFields: text('custom_fields'),
	createdAt: text('created_at').notNull(),
	updatedAt: text('updated_at').notNull()
});

export const emailTemplates = sqliteTable('email_templates', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	subject: text('subject').notNull(),
	bodyHtml: text('body_html').notNull(),
	triggerStage: text('trigger_stage'),
	createdAt: text('created_at').notNull()
});

export const emailLogs = sqliteTable('email_logs', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	leadId: integer('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
	templateId: integer('template_id').references(() => emailTemplates.id, { onDelete: 'set null' }),
	sender: text('sender').notNull(),
	recipient: text('recipient').notNull(),
	subject: text('subject').notNull(),
	bodyHtml: text('body_html').notNull(),
	status: text('status').notNull().default('SENT'),
	direction: text('direction').notNull().default('OUTBOUND'),
	sentAt: text('sent_at').notNull()
});

export const contracts = sqliteTable('contracts', {
	id: text('id').primaryKey(),
	leadId: integer('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
	clientName: text('client_name').notNull(),
	clientEmail: text('client_email').notNull(),
	servicePackage: text('service_package').notNull(),
	monthlyFee: text('monthly_fee').notNull(),
	contractTerms: text('contract_terms').notNull(),
	signatureData: text('signature_data'),
	pdfPath: text('pdf_path'),
	status: text('status').notNull().default('DRAFT'),
	createdAt: text('created_at').notNull(),
	signedAt: text('signed_at')
});

export const intakeCms = sqliteTable('intake_cms', {
	id: text('id').primaryKey(), // e.g. 'mmj-dispensary__hero' or legacy 'hero'
	verticalId: text('vertical_id').default('mmj-dispensary'),
	sectionId: text('section_id'),
	title: text('title').notNull(),
	subtitle: text('subtitle'),
	contentJson: text('content_json').notNull(),
	updatedAt: text('updated_at').notNull()
});

export const users = sqliteTable('users', {
	id: text('id').primaryKey(),
	email: text('email').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	name: text('name').notNull(),
	role: text('role').notNull().default('AGENT'), // 'SUPER_ADMIN' | 'ADMIN' | 'AGENT'
	createdAt: text('created_at').notNull(),
	updatedAt: text('updated_at').notNull()
});

export const sessions = sqliteTable('sessions', {
	id: text('id').primaryKey(),
	userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: integer('expires_at').notNull()
});

export const bookedCalls = sqliteTable('booked_calls', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	leadId: integer('lead_id').references(() => leads.id, { onDelete: 'cascade' }),
	verticalId: text('vertical_id').references(() => verticals.id),
	clientName: text('client_name').notNull(),
	clientEmail: text('client_email').notNull(),
	clientPhone: text('client_phone'),
	businessName: text('business_name'),
	callDate: text('call_date').notNull(),
	meetingType: text('meeting_type').notNull().default('Merchant Strategy Session'),
	notes: text('notes'),
	status: text('status').notNull().default('SCHEDULED'), // 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'
	createdAt: text('created_at').notNull()
});

