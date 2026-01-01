-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'USER', 'VISITOR');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING_VERIFICATION', 'INVITED');

-- CreateEnum
CREATE TYPE "CompanyVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CompanyProfileStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "CompanyProfileSection" AS ENUM ('BASIC_DETAILS', 'PRIMARY_LOCATION', 'PERSONAL_PROFILE', 'TEAM_MEMBERS', 'BILLING', 'BRANDING');

-- CreateEnum
CREATE TYPE "VerificationMethod" AS ENUM ('EMAIL_DOMAIN_CHECK', 'VERIFICATION_EMAIL', 'MANUAL_VERIFICATION');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "JobInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SignupRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'ON_HOLD', 'FILLED', 'TEMPLATE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "HiringMode" AS ENUM ('SELF_MANAGED', 'SHORTLISTING', 'FULL_SERVICE', 'EXECUTIVE_SEARCH');

-- CreateEnum
CREATE TYPE "WorkArrangement" AS ENUM ('ON_SITE', 'REMOTE', 'HYBRID');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'CASUAL');

-- CreateEnum
CREATE TYPE "TemplateCategory" AS ENUM ('ENGINEERING', 'PRODUCT', 'DESIGN', 'MARKETING', 'SALES', 'OPERATIONS', 'HR', 'FINANCE', 'EXECUTIVE', 'OTHER');

-- CreateEnum
CREATE TYPE "CandidateStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING_VERIFICATION');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('NEW', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ApplicationStage" AS ENUM ('NEW_APPLICATION', 'RESUME_REVIEW', 'PHONE_SCREEN', 'TECHNICAL_INTERVIEW', 'ONSITE_INTERVIEW', 'OFFER_EXTENDED', 'OFFER_ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('PENDING_INVITATION', 'INVITED', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AssessmentType" AS ENUM ('PERSONALITY', 'COGNITIVE', 'SKILLS_BASED', 'TECHNICAL', 'BEHAVIORAL');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('AVAILABLE', 'AT_CAPACITY', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('PLACEMENT', 'SUBSCRIPTION_SALE', 'RECRUITMENT_SERVICE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ConsultantRole" AS ENUM ('RECRUITER', 'SALES_AGENT', 'CONSULTANT_360');

-- CreateEnum
CREATE TYPE "ConsultantStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "HRM8UserRole" AS ENUM ('GLOBAL_ADMIN', 'REGIONAL_LICENSEE');

-- CreateEnum
CREATE TYPE "HRM8UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "InterviewStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'RESCHEDULED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "LicenseeStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "ManualScreeningStatus" AS ENUM ('PENDING', 'PASSED', 'FAILED');

-- CreateEnum
CREATE TYPE "RegionOwnerType" AS ENUM ('HRM8', 'LICENSEE');

-- CreateEnum
CREATE TYPE "RevenueStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PAID');

-- CreateEnum
CREATE TYPE "ScreeningResultStatus" AS ENUM ('PASSED', 'FAILED', 'PENDING', 'REVIEW_REQUIRED');

-- CreateEnum
CREATE TYPE "ScreeningStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ScreeningType" AS ENUM ('AUTOMATED', 'MANUAL');

-- CreateEnum
CREATE TYPE "VideoInterviewStatus" AS ENUM ('NOT_SCHEDULED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "VideoInterviewType" AS ENUM ('PHONE', 'VIDEO', 'IN_PERSON', 'TECHNICAL', 'PANEL');

-- CreateEnum
CREATE TYPE "JobRoundType" AS ENUM ('ASSESSMENT', 'INTERVIEW');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('JOB_ALERT', 'APPLICATION_UPDATE', 'INTERVIEW_SCHEDULED', 'MESSAGE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "JobAssignmentMode" AS ENUM ('AUTO_RULES_ONLY', 'MANUAL_ONLY');

-- CreateEnum
CREATE TYPE "AssignmentMode" AS ENUM ('AUTO', 'MANUAL');

-- CreateEnum
CREATE TYPE "AssignmentSource" AS ENUM ('AUTO_RULES', 'MANUAL_EMPLOYER', 'MANUAL_LICENSEE', 'MANUAL_HRM8');

-- CreateEnum
CREATE TYPE "ConversationChannelType" AS ENUM ('CANDIDATE_EMPLOYER', 'CANDIDATE_CONSULTANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "FailCriteria" AS ENUM ('SCORE_BELOW_THRESHOLD', 'RECOMMENDATION_NO', 'RATING_CRITERIA_FAIL', 'COMBINATION');

-- CreateEnum
CREATE TYPE "InterviewFormat" AS ENUM ('LIVE_VIDEO', 'PHONE', 'IN_PERSON', 'PANEL');

-- CreateEnum
CREATE TYPE "InterviewRecommendation" AS ENUM ('STRONG_YES', 'YES', 'MAYBE', 'NO', 'STRONG_NO');

-- CreateEnum
CREATE TYPE "MessageContentType" AS ENUM ('TEXT', 'FILE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ParticipantType" AS ENUM ('CANDIDATE', 'EMPLOYER', 'CONSULTANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "PassCriteria" AS ENUM ('SCORE_THRESHOLD', 'RECOMMENDATION', 'RATING_CRITERIA', 'COMBINATION');

-- CreateEnum
CREATE TYPE "ScoringMethod" AS ENUM ('AVERAGE', 'WEIGHTED', 'CONSENSUS');

-- CreateEnum
CREATE TYPE "PipelineStage" AS ENUM ('INTAKE', 'SOURCING', 'SCREENING', 'SHORTLIST_SENT', 'INTERVIEW', 'OFFER', 'PLACED', 'ON_HOLD', 'CLOSED');

-- CreateEnum
CREATE TYPE "AccountTeamRole" AS ENUM ('SALES_OWNER', 'RECRUITER_OWNER', 'REGION_OWNER');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('EMAIL', 'CALL', 'MEETING', 'NOTE', 'TASK', 'FOLLOW_UP');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('CONSULTANT', 'HRM8_USER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('QUALIFICATION', 'BACKGROUND_CHECK', 'NDA', 'IDENTITY', 'TAX', 'CONTRACT', 'BANKING', 'COMPLIANCE', 'INSURANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'REQUESTED', 'SUBMITTED', 'APPROVED', 'REJECTED', 'REVISION_REQUIRED');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ERROR', 'PENDING_CONFIG');

-- CreateEnum
CREATE TYPE "IntegrationType" AS ENUM ('JOB_POSTING_PLATFORM', 'ASSESSMENT_TOOL', 'ACCOUNTING_SYSTEM', 'EMAIL_PROVIDER', 'CALENDAR', 'OTHER');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('WEBSITE', 'MARKETING_CAMPAIGN', 'REFERRAL', 'PARTNER_IMPORT', 'MANUAL_ENTRY', 'EVENT', 'OTHER');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST', 'NURTURING');

-- CreateEnum
CREATE TYPE "NegotiationMessageType" AS ENUM ('EMPLOYER_PROPOSAL', 'CANDIDATE_COUNTER', 'EMPLOYER_REVISION', 'CANDIDATE_ACCEPTANCE', 'CANDIDATE_DECLINE');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'UNDER_NEGOTIATION', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "OpportunityStage" AS ENUM ('NEW', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST');

-- CreateEnum
CREATE TYPE "OpportunityType" AS ENUM ('SUBSCRIPTION', 'RECRUITMENT_SERVICE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "SubscriptionPlanType" AS ENUM ('FREE', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'TRIAL', 'SUSPENDED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('SENT', 'DELIVERED', 'OPENED', 'BOUNCED', 'FAILED');

-- CreateEnum
CREATE TYPE "EmailTemplateType" AS ENUM ('APPLICATION_CONFIRMATION', 'INTERVIEW_INVITATION', 'REJECTION', 'OFFER_EXTENDED', 'OFFER_ACCEPTED', 'STAGE_CHANGE', 'REMINDER', 'FOLLOW_UP', 'CUSTOM');

-- CreateEnum
CREATE TYPE "TriggerType" AS ENUM ('IMMEDIATE', 'SCHEDULED', 'CONDITIONAL');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "country_or_region" TEXT NOT NULL DEFAULT '',
    "accepted_terms" BOOLEAN NOT NULL DEFAULT false,
    "verificationStatus" "CompanyVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verificationMethod" "VerificationMethod",
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "gstNumber" TEXT,
    "registrationNumber" TEXT,
    "linkedInUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "region_id" TEXT,
    "job_assignment_mode" "JobAssignmentMode" NOT NULL DEFAULT 'AUTO_RULES_ONLY',
    "preferred_recruiter_id" TEXT,
    "created_by" TEXT,
    "licensee_id" TEXT,
    "region_owner_type" "RegionOwnerType" NOT NULL DEFAULT 'HRM8',
    "commission_status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "attribution_locked" BOOLEAN NOT NULL DEFAULT false,
    "attribution_locked_at" TIMESTAMP(3),
    "price_book_id" TEXT,
    "referred_by" TEXT,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyProfile" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "status" "CompanyProfileStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "completion_percentage" INTEGER NOT NULL DEFAULT 0,
    "completed_sections" "CompanyProfileSection"[] DEFAULT ARRAY[]::"CompanyProfileSection"[],
    "profile_data" JSONB,
    "last_reminder_at" TIMESTAMP(3),
    "skip_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "invited_by" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_role" "UserRole" NOT NULL,
    "email" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_activity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "requested_ip" TEXT,
    "requested_user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignupRequest" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "first_name" TEXT NOT NULL DEFAULT '',
    "last_name" TEXT NOT NULL DEFAULT '',
    "accepted_terms" BOOLEAN NOT NULL DEFAULT false,
    "password_hash" TEXT NOT NULL,
    "status" "SignupRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SignupRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "job_code" TEXT,
    "job_summary" VARCHAR(150),
    "category" TEXT,
    "number_of_vacancies" INTEGER NOT NULL DEFAULT 1,
    "department" TEXT,
    "location" TEXT NOT NULL,
    "employment_type" "EmploymentType" NOT NULL DEFAULT 'FULL_TIME',
    "work_arrangement" "WorkArrangement" NOT NULL DEFAULT 'ON_SITE',
    "salary_min" DOUBLE PRECISION,
    "salary_max" DOUBLE PRECISION,
    "salary_currency" TEXT NOT NULL DEFAULT 'USD',
    "salary_description" TEXT,
    "description" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'DRAFT',
    "stealth" BOOLEAN NOT NULL DEFAULT false,
    "posting_date" TIMESTAMP(3),
    "close_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiry_date" TIMESTAMP(3),
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "hiring_mode" "HiringMode" NOT NULL DEFAULT 'SELF_MANAGED',
    "promotional_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "requirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "responsibilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "terms_accepted" BOOLEAN NOT NULL DEFAULT false,
    "terms_accepted_at" TIMESTAMP(3),
    "terms_accepted_by" TEXT,
    "hiring_team" JSONB,
    "application_form" JSONB,
    "video_interviewing_enabled" BOOLEAN NOT NULL DEFAULT false,
    "alerts_enabled" JSONB,
    "jobtarget_approved" BOOLEAN NOT NULL DEFAULT false,
    "jobtarget_budget" DOUBLE PRECISION,
    "jobtarget_budget_spent" DOUBLE PRECISION DEFAULT 0,
    "jobtarget_channels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "jobtarget_promotion_id" TEXT,
    "jobtarget_status" TEXT,
    "referral_link" TEXT,
    "saved_as_template" BOOLEAN NOT NULL DEFAULT false,
    "share_link" TEXT,
    "template_id" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" TIMESTAMP(3),
    "archived_by" TEXT,
    "automated_screening_enabled" BOOLEAN NOT NULL DEFAULT false,
    "pre_interview_questionnaire_enabled" BOOLEAN NOT NULL DEFAULT false,
    "screening_criteria" JSONB,
    "screening_enabled" BOOLEAN NOT NULL DEFAULT false,
    "region_id" TEXT,
    "assigned_consultant_id" TEXT,
    "assignment_mode" "AssignmentMode" NOT NULL DEFAULT 'AUTO',
    "assignment_source" "AssignmentSource",
    "payment_status" "PaymentStatus" DEFAULT 'PENDING',
    "service_package" TEXT,
    "payment_amount" DOUBLE PRECISION,
    "payment_completed_at" TIMESTAMP(3),
    "payment_currency" TEXT,
    "payment_failed_at" TIMESTAMP(3),
    "stripe_payment_intent_id" TEXT,
    "stripe_session_id" TEXT,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "photo" TEXT,
    "linked_in_url" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT DEFAULT 'United States',
    "visa_status" TEXT,
    "work_eligibility" TEXT,
    "job_type_preference" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "salary_preference" JSONB,
    "relocation_willing" BOOLEAN DEFAULT false,
    "remote_preference" TEXT,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "status" "CandidateStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resume_url" TEXT,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateSession" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_activity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedJob" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_searched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "query" TEXT,

    CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobAlert" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "criteria" JSONB NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'DAILY',
    "channels" TEXT[] DEFAULT ARRAY['EMAIL']::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreferences" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "application_status_changes" BOOLEAN NOT NULL DEFAULT true,
    "interview_reminders" BOOLEAN NOT NULL DEFAULT true,
    "job_match_alerts" BOOLEAN NOT NULL DEFAULT true,
    "messages" BOOLEAN NOT NULL DEFAULT true,
    "system_updates" BOOLEAN NOT NULL DEFAULT true,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "in_app_enabled" BOOLEAN NOT NULL DEFAULT true,
    "reminder_hours_before" INTEGER NOT NULL DEFAULT 24,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "subject" TEXT,
    "jobId" TEXT,
    "candidateId" TEXT,
    "employerUserId" TEXT,
    "consultantId" TEXT,
    "channel_type" "ConversationChannelType" NOT NULL DEFAULT 'CANDIDATE_EMPLOYER',
    "last_message_id" TEXT,
    "last_message_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ConversationStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationParticipant" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "participant_type" "ParticipantType" NOT NULL,
    "participant_id" TEXT NOT NULL,
    "participant_email" TEXT NOT NULL,
    "displayName" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender_type" "ParticipantType" NOT NULL,
    "sender_id" TEXT NOT NULL,
    "sender_email" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "content_type" "MessageContentType" NOT NULL DEFAULT 'TEXT',
    "in_reply_to_message_id" TEXT,
    "read_by" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageAttachment" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateResume" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "file_type" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" TEXT,

    CONSTRAINT "CandidateResume_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateCoverLetter" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "file_url" TEXT,
    "file_name" TEXT,
    "file_size" INTEGER,
    "file_type" TEXT,
    "is_template" BOOLEAN NOT NULL DEFAULT false,
    "is_draft" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateCoverLetter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidatePortfolio" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "file_url" TEXT,
    "file_name" TEXT,
    "file_size" INTEGER,
    "file_type" TEXT,
    "external_url" TEXT,
    "platform" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidatePortfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'NEW',
    "stage" "ApplicationStage" NOT NULL DEFAULT 'NEW_APPLICATION',
    "applied_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resume_url" TEXT,
    "cover_letter_url" TEXT,
    "portfolio_url" TEXT,
    "linked_in_url" TEXT,
    "website_url" TEXT,
    "custom_answers" JSONB,
    "questionnaire_data" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "is_new" BOOLEAN NOT NULL DEFAULT true,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "added_at" TIMESTAMP(3),
    "added_by" TEXT,
    "manually_added" BOOLEAN NOT NULL DEFAULT false,
    "rank" INTEGER,
    "recruiter_notes" TEXT,
    "score" DOUBLE PRECISION,
    "shortlisted" BOOLEAN NOT NULL DEFAULT false,
    "shortlisted_at" TIMESTAMP(3),
    "shortlisted_by" TEXT,
    "assessment_results" JSONB,
    "automated_screening_score" DOUBLE PRECISION,
    "manual_screening_status" "ManualScreeningStatus",
    "screening_notes" TEXT,
    "screening_status" "ScreeningStatus" NOT NULL DEFAULT 'PENDING',
    "video_interview_status" "VideoInterviewStatus" NOT NULL DEFAULT 'NOT_SCHEDULED',
    "manual_screening_completed" BOOLEAN NOT NULL DEFAULT false,
    "manual_screening_date" TIMESTAMP(3),
    "manual_screening_score" DOUBLE PRECISION,
    "ai_analysis" JSONB,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobInvitation" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "candidate_id" TEXT,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" "JobInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "invited_by" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "application_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobTemplate" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "TemplateCategory" NOT NULL DEFAULT 'OTHER',
    "is_shared" BOOLEAN NOT NULL DEFAULT false,
    "source_job_id" TEXT,
    "job_data" JSONB NOT NULL,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "assessment_type" "AssessmentType" NOT NULL,
    "provider" TEXT,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'PENDING_INVITATION',
    "invited_by" TEXT NOT NULL,
    "invited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiry_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "results" JSONB,
    "pass_threshold" DOUBLE PRECISION,
    "cost" DOUBLE PRECISION DEFAULT 0,
    "payment_status" TEXT DEFAULT 'pending',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invitation_token" TEXT,
    "job_round_id" TEXT,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentQuestion" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "question_text" TEXT NOT NULL,
    "question_type" TEXT NOT NULL,
    "options" JSONB,
    "correct_answer" JSONB,
    "points" INTEGER NOT NULL DEFAULT 1,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssessmentQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentResponse" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "question_id" TEXT,
    "candidate_id" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "score" DOUBLE PRECISION,
    "answered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssessmentResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commission" (
    "id" TEXT NOT NULL,
    "consultant_id" TEXT NOT NULL,
    "region_id" TEXT NOT NULL,
    "job_id" TEXT,
    "subscription_id" TEXT,
    "type" "CommissionType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "rate" DOUBLE PRECISION,
    "description" TEXT,
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "confirmed_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "commission_expiry_date" TIMESTAMP(3),
    "payment_reference" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Commission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consultant" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "photo" TEXT,
    "role" "ConsultantRole" NOT NULL,
    "status" "ConsultantStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" TIMESTAMP(3),
    "address" TEXT,
    "availability" "AvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
    "average_days_to_fill" DOUBLE PRECISION,
    "city" TEXT,
    "commission_structure" TEXT,
    "country" TEXT,
    "current_employers" INTEGER NOT NULL DEFAULT 0,
    "current_jobs" INTEGER NOT NULL DEFAULT 0,
    "default_commission_rate" DOUBLE PRECISION,
    "industry_expertise" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "languages" JSONB,
    "max_employers" INTEGER NOT NULL DEFAULT 10,
    "max_jobs" INTEGER NOT NULL DEFAULT 20,
    "payment_method" JSONB,
    "pending_commissions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "region_id" TEXT NOT NULL,
    "resume_url" TEXT,
    "state_province" TEXT,
    "success_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tax_information" JSONB,
    "total_commissions_paid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_placements" INTEGER NOT NULL DEFAULT 0,
    "total_revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "current_leads" INTEGER NOT NULL DEFAULT 0,
    "max_leads" INTEGER NOT NULL DEFAULT 20,

    CONSTRAINT "Consultant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultantJobAssignment" (
    "id" TEXT NOT NULL,
    "consultant_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "assignment_source" "AssignmentSource",
    "pipeline_note" TEXT,
    "pipeline_progress" INTEGER NOT NULL DEFAULT 0,
    "pipeline_stage" "PipelineStage" NOT NULL DEFAULT 'INTAKE',
    "pipeline_updated_at" TIMESTAMP(3),
    "pipeline_updated_by" TEXT,

    CONSTRAINT "ConsultantJobAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultantSession" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "consultant_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_activity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultantSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HRM8Session" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "hrm8_user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_activity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HRM8Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HRM8User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "photo" TEXT,
    "role" "HRM8UserRole" NOT NULL,
    "status" "HRM8UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "licensee_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "HRM8User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreInterviewQuestionnaire" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "questions" JSONB NOT NULL,
    "auto_generated" BOOLEAN NOT NULL DEFAULT false,
    "generated_by" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreInterviewQuestionnaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionnaireResponse" (
    "id" TEXT NOT NULL,
    "questionnaire_id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "responses" JSONB NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "score" DOUBLE PRECISION,

    CONSTRAINT "QuestionnaireResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Region" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "state_province" TEXT,
    "city" TEXT,
    "boundaries" JSONB,
    "owner_type" "RegionOwnerType" NOT NULL DEFAULT 'HRM8',
    "licensee_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegionalLicensee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legal_entity_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "tax_id" TEXT,
    "agreement_start_date" TIMESTAMP(3) NOT NULL,
    "agreement_end_date" TIMESTAMP(3),
    "revenue_share_percent" DOUBLE PRECISION NOT NULL,
    "exclusivity" BOOLEAN NOT NULL DEFAULT false,
    "contract_file_url" TEXT,
    "manager_contact" TEXT NOT NULL,
    "finance_contact" TEXT,
    "compliance_contact" TEXT,
    "status" "LicenseeStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegionalLicensee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegionalRevenue" (
    "id" TEXT NOT NULL,
    "region_id" TEXT NOT NULL,
    "licensee_id" TEXT,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "total_revenue" DOUBLE PRECISION NOT NULL,
    "licensee_share" DOUBLE PRECISION NOT NULL,
    "hrm8_share" DOUBLE PRECISION NOT NULL,
    "status" "RevenueStatus" NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegionalRevenue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreeningCriteria" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "criteria_type" TEXT NOT NULL,
    "criteria_config" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" TEXT,
    "description" TEXT,
    "min_score" INTEGER,
    "name" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "weight" DOUBLE PRECISION,

    CONSTRAINT "ScreeningCriteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreeningResult" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "screening_type" "ScreeningType" NOT NULL,
    "status" "ScreeningResultStatus" NOT NULL DEFAULT 'PENDING',
    "score" DOUBLE PRECISION,
    "criteria_matched" JSONB,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criteria_id" TEXT,
    "passed" BOOLEAN,

    CONSTRAINT "ScreeningResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoInterview" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "scheduled_date" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 60,
    "meeting_link" TEXT,
    "status" "InterviewStatus" NOT NULL DEFAULT 'SCHEDULED',
    "type" "VideoInterviewType" NOT NULL DEFAULT 'VIDEO',
    "interviewer_ids" JSONB NOT NULL,
    "recording_url" TEXT,
    "transcript" JSONB,
    "feedback" JSONB,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancellation_reason" TEXT,
    "is_auto_scheduled" BOOLEAN NOT NULL DEFAULT false,
    "job_round_id" TEXT,
    "no_show_reason" TEXT,
    "overall_score" DOUBLE PRECISION,
    "rating_criteria_scores" JSONB,
    "recommendation" "InterviewRecommendation",
    "rescheduled_at" TIMESTAMP(3),
    "rescheduled_by" TEXT,
    "rescheduled_from" TEXT,

    CONSTRAINT "VideoInterview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateCertification" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuing_org" TEXT NOT NULL,
    "issue_date" TIMESTAMP(3),
    "expiry_date" TIMESTAMP(3),
    "credential_id" TEXT,
    "credential_url" TEXT,
    "does_not_expire" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateCertification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateEducation" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "degree" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "current" BOOLEAN NOT NULL DEFAULT false,
    "grade" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateEducation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateSkill" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateTraining" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "course_name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "completed_date" TIMESTAMP(3),
    "duration" TEXT,
    "description" TEXT,
    "certificate_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateTraining_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateWorkExperience" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "current" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "location" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateWorkExperience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationRoundProgress" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "job_round_id" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "assessment_id" TEXT,
    "video_interview_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationRoundProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentConfiguration" (
    "id" TEXT NOT NULL,
    "job_round_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "autoAssign" BOOLEAN NOT NULL DEFAULT true,
    "deadline_days" INTEGER,
    "time_limit_minutes" INTEGER,
    "pass_threshold" DOUBLE PRECISION,
    "provider" TEXT,
    "provider_config" JSONB,
    "assessment_template_id" TEXT,
    "questions" JSONB,
    "instructions" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssessmentConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanySettings" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "timezone" TEXT DEFAULT 'UTC',
    "workDays" TEXT[] DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday']::TEXT[],
    "startTime" TEXT DEFAULT '09:00',
    "endTime" TEXT DEFAULT '17:00',
    "lunchStart" TEXT,
    "lunchEnd" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobRound" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "type" "JobRoundType" NOT NULL,
    "isFixed" BOOLEAN NOT NULL DEFAULT false,
    "fixedKey" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewConfiguration" (
    "id" TEXT NOT NULL,
    "job_round_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "auto_schedule" BOOLEAN NOT NULL DEFAULT true,
    "require_before_progression" BOOLEAN NOT NULL DEFAULT false,
    "require_all_interviewers" BOOLEAN NOT NULL DEFAULT false,
    "interview_format" "InterviewFormat" NOT NULL DEFAULT 'LIVE_VIDEO',
    "default_duration" INTEGER DEFAULT 60,
    "requires_interviewer" BOOLEAN NOT NULL DEFAULT true,
    "auto_schedule_window_days" INTEGER,
    "available_time_slots" JSONB,
    "buffer_time_minutes" INTEGER,
    "calendar_integration" TEXT,
    "auto_reschedule_on_no_show" BOOLEAN NOT NULL DEFAULT false,
    "auto_reschedule_on_cancel" BOOLEAN NOT NULL DEFAULT false,
    "use_custom_criteria" BOOLEAN NOT NULL DEFAULT false,
    "rating_criteria" JSONB,
    "pass_threshold" DOUBLE PRECISION,
    "scoring_method" "ScoringMethod",
    "auto_move_on_pass" BOOLEAN NOT NULL DEFAULT false,
    "pass_criteria" "PassCriteria",
    "next_round_on_pass_id" TEXT,
    "auto_reject_on_fail" BOOLEAN NOT NULL DEFAULT false,
    "fail_criteria" "FailCriteria",
    "reject_round_id" TEXT,
    "requires_manual_review" BOOLEAN NOT NULL DEFAULT true,
    "template_id" TEXT,
    "questions" JSONB,
    "agenda" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_interviewer_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "InterviewConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewFeedback" (
    "id" TEXT NOT NULL,
    "video_interview_id" TEXT NOT NULL,
    "interviewer_id" TEXT,
    "interviewer_name" TEXT NOT NULL,
    "interviewer_email" TEXT,
    "rating_criteria_scores" JSONB,
    "overall_rating" DOUBLE PRECISION,
    "recommendation" "InterviewRecommendation",
    "strengths" TEXT,
    "concerns" TEXT,
    "notes" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountTeam" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "consultant_id" TEXT,
    "role" "AccountTeamRole" NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "lead_id" TEXT,
    "opportunity_id" TEXT,
    "type" "ActivityType" NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT,
    "created_by" TEXT NOT NULL,
    "actor_type" "ActorType" NOT NULL DEFAULT 'CONSULTANT',
    "scheduled_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "due_date" TIMESTAMP(3),
    "email_subject" TEXT,
    "email_body" TEXT,
    "call_duration" INTEGER,
    "meeting_link" TEXT,
    "tags" TEXT[],
    "attachments" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bill" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT,
    "company_id" TEXT NOT NULL,
    "bill_number" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "tax_amount" DOUBLE PRECISION DEFAULT 0,
    "total_amount" DOUBLE PRECISION NOT NULL,
    "status" "BillStatus" NOT NULL DEFAULT 'PENDING',
    "due_date" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "payment_method" TEXT,
    "payment_reference" TEXT,
    "line_items" JSONB,
    "accounting_ref" TEXT,
    "synced_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultantLeadAssignment" (
    "id" TEXT NOT NULL,
    "consultant_id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "assignment_source" "AssignmentSource",

    CONSTRAINT "ConsultantLeadAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "title" TEXT,
    "department" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "linked_in_url" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL,
    "company_id" TEXT,
    "type" "IntegrationType" NOT NULL,
    "name" TEXT NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'ACTIVE',
    "api_key" TEXT,
    "api_secret" TEXT,
    "login_url" TEXT,
    "username" TEXT,
    "password" TEXT,
    "config" JSONB,
    "last_sync_at" TIMESTAMP(3),
    "sync_status" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "website" TEXT,
    "country" TEXT NOT NULL,
    "city" TEXT,
    "state_province" TEXT,
    "region_id" TEXT,
    "assigned_consultant_id" TEXT,
    "assigned_at" TIMESTAMP(3),
    "assigned_by" TEXT,
    "assignment_mode" "AssignmentMode" NOT NULL DEFAULT 'AUTO',
    "assignment_source" "AssignmentSource",
    "created_by" TEXT,
    "referred_by" TEXT,
    "lead_source" "LeadSource" NOT NULL DEFAULT 'WEBSITE',
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "tags" TEXT[],
    "validated_by" TEXT,
    "validated_at" TIMESTAMP(3),
    "attribution_locked" BOOLEAN NOT NULL DEFAULT false,
    "converted_to_company_id" TEXT,
    "converted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferDocument" (
    "id" TEXT NOT NULL,
    "offer_id" TEXT NOT NULL,
    "application_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "DocumentCategory" NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "file_url" TEXT,
    "file_name" TEXT,
    "uploaded_date" TIMESTAMP(3),
    "uploaded_by" TEXT,
    "reviewed_by" TEXT,
    "reviewed_date" TIMESTAMP(3),
    "review_notes" TEXT,
    "expiry_date" TIMESTAMP(3),
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "template_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfferDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferLetter" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "template_id" TEXT,
    "offer_type" TEXT NOT NULL,
    "salary" DOUBLE PRECISION NOT NULL,
    "salary_currency" TEXT NOT NULL DEFAULT 'USD',
    "salary_period" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "benefits" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bonus_structure" TEXT,
    "equity_options" TEXT,
    "work_location" TEXT NOT NULL,
    "work_arrangement" TEXT NOT NULL,
    "probation_period" INTEGER,
    "vacation_days" INTEGER,
    "custom_terms" JSONB,
    "status" "OfferStatus" NOT NULL DEFAULT 'DRAFT',
    "approval_workflow" JSONB,
    "sent_date" TIMESTAMP(3),
    "expiry_date" TIMESTAMP(3),
    "responded_date" TIMESTAMP(3),
    "decline_reason" TEXT,
    "signed_document_url" TEXT,
    "generated_pdf_url" TEXT,
    "custom_message" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfferLetter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferNegotiation" (
    "id" TEXT NOT NULL,
    "offer_id" TEXT NOT NULL,
    "message_type" "NegotiationMessageType" NOT NULL,
    "message" TEXT NOT NULL,
    "proposed_changes" JSONB,
    "sender_id" TEXT NOT NULL,
    "sender_type" TEXT NOT NULL,
    "sender_name" TEXT NOT NULL,
    "sender_email" TEXT,
    "responded" BOOLEAN NOT NULL DEFAULT false,
    "response" TEXT,
    "response_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfferNegotiation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OpportunityType" NOT NULL,
    "stage" "OpportunityStage" NOT NULL DEFAULT 'NEW',
    "amount" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "probability" INTEGER NOT NULL DEFAULT 0,
    "expected_close_date" TIMESTAMP(3),
    "sales_agent_id" TEXT,
    "referred_by" TEXT,
    "description" TEXT,
    "tags" TEXT[],
    "lost_reason" TEXT,
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "planType" "SubscriptionPlanType" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "base_price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "billing_cycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "discount_percent" DOUBLE PRECISION DEFAULT 0,
    "custom_pricing" JSONB,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "renewal_date" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "sales_agent_id" TEXT,
    "referred_by" TEXT,
    "usage_data" JSONB,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentComment" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssessmentComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentGrade" (
    "id" TEXT NOT NULL,
    "assessment_response_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssessmentGrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailMessage" (
    "id" TEXT NOT NULL,
    "template_id" TEXT,
    "application_id" TEXT,
    "candidate_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "job_round_id" TEXT,
    "to" TEXT NOT NULL,
    "cc" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bcc" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'SENT',
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delivered_at" TIMESTAMP(3),
    "opened_at" TIMESTAMP(3),
    "bounced_at" TIMESTAMP(3),
    "error_message" TEXT,
    "sender_id" TEXT NOT NULL,
    "sender_email" TEXT NOT NULL,

    CONSTRAINT "EmailMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "job_id" TEXT,
    "job_round_id" TEXT,
    "name" TEXT NOT NULL,
    "type" "EmailTemplateType" NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "variables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_ai_generated" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplateTrigger" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "job_round_id" TEXT NOT NULL,
    "trigger_type" "TriggerType" NOT NULL,
    "trigger_condition" JSONB,
    "delay_days" INTEGER DEFAULT 0,
    "delay_hours" INTEGER DEFAULT 0,
    "scheduled_time" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailTemplateTrigger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResumeAnnotation" (
    "id" TEXT NOT NULL,
    "resume_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_name" TEXT NOT NULL,
    "user_color" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "comment" TEXT,
    "position" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResumeAnnotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceBook" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_global" BOOLEAN NOT NULL DEFAULT false,
    "region_id" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceBook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceTier" (
    "id" TEXT NOT NULL,
    "price_book_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "min_quantity" INTEGER NOT NULL DEFAULT 1,
    "max_quantity" INTEGER,
    "unit_price" DOUBLE PRECISION NOT NULL,
    "period" TEXT NOT NULL DEFAULT 'MONTHLY',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discountType" TEXT NOT NULL,
    "discount_value" DOUBLE PRECISION NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "max_uses" INTEGER,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalIntegration" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "api_key" TEXT,
    "api_secret" TEXT,
    "endpoint_url" TEXT,
    "config" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GlobalIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settlement" (
    "id" TEXT NOT NULL,
    "licensee_id" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "total_revenue" DOUBLE PRECISION NOT NULL,
    "licensee_share" DOUBLE PRECISION NOT NULL,
    "hrm8_share" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "payment_date" TIMESTAMP(3),
    "reference" TEXT,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DunningPolicy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "days_overdue" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "email_template" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DunningPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_domain_key" ON "Company"("domain");

-- CreateIndex
CREATE INDEX "Company_domain_idx" ON "Company"("domain");

-- CreateIndex
CREATE INDEX "Company_verificationStatus_idx" ON "Company"("verificationStatus");

-- CreateIndex
CREATE INDEX "Company_region_id_idx" ON "Company"("region_id");

-- CreateIndex
CREATE INDEX "Company_created_by_idx" ON "Company"("created_by");

-- CreateIndex
CREATE INDEX "Company_licensee_id_idx" ON "Company"("licensee_id");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyProfile_company_id_key" ON "CompanyProfile"("company_id");

-- CreateIndex
CREATE INDEX "CompanyProfile_company_id_idx" ON "CompanyProfile"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_company_id_idx" ON "User"("company_id");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");

-- CreateIndex
CREATE INDEX "Invitation_email_idx" ON "Invitation"("email");

-- CreateIndex
CREATE INDEX "Invitation_company_id_idx" ON "Invitation"("company_id");

-- CreateIndex
CREATE INDEX "Invitation_token_idx" ON "Invitation"("token");

-- CreateIndex
CREATE INDEX "Invitation_status_idx" ON "Invitation"("status");

-- CreateIndex
CREATE INDEX "Invitation_expires_at_idx" ON "Invitation"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "Session_session_id_key" ON "Session"("session_id");

-- CreateIndex
CREATE INDEX "Session_session_id_idx" ON "Session"("session_id");

-- CreateIndex
CREATE INDEX "Session_user_id_idx" ON "Session"("user_id");

-- CreateIndex
CREATE INDEX "Session_company_id_idx" ON "Session"("company_id");

-- CreateIndex
CREATE INDEX "Session_expires_at_idx" ON "Session"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_hash_key" ON "PasswordResetToken"("token_hash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_user_id_idx" ON "PasswordResetToken"("user_id");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expires_at_idx" ON "PasswordResetToken"("expires_at");

-- CreateIndex
CREATE INDEX "PasswordResetToken_token_hash_idx" ON "PasswordResetToken"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE INDEX "VerificationToken_company_id_idx" ON "VerificationToken"("company_id");

-- CreateIndex
CREATE INDEX "VerificationToken_email_idx" ON "VerificationToken"("email");

-- CreateIndex
CREATE INDEX "VerificationToken_token_idx" ON "VerificationToken"("token");

-- CreateIndex
CREATE INDEX "VerificationToken_expires_at_idx" ON "VerificationToken"("expires_at");

-- CreateIndex
CREATE INDEX "SignupRequest_email_idx" ON "SignupRequest"("email");

-- CreateIndex
CREATE INDEX "SignupRequest_company_id_idx" ON "SignupRequest"("company_id");

-- CreateIndex
CREATE INDEX "SignupRequest_status_idx" ON "SignupRequest"("status");

-- CreateIndex
CREATE INDEX "SignupRequest_created_at_idx" ON "SignupRequest"("created_at");

-- CreateIndex
CREATE INDEX "Job_company_id_idx" ON "Job"("company_id");

-- CreateIndex
CREATE INDEX "Job_created_by_idx" ON "Job"("created_by");

-- CreateIndex
CREATE INDEX "Job_status_idx" ON "Job"("status");

-- CreateIndex
CREATE INDEX "Job_hiring_mode_idx" ON "Job"("hiring_mode");

-- CreateIndex
CREATE INDEX "Job_expiry_date_idx" ON "Job"("expiry_date");

-- CreateIndex
CREATE INDEX "Job_region_id_idx" ON "Job"("region_id");

-- CreateIndex
CREATE INDEX "Job_assigned_consultant_id_idx" ON "Job"("assigned_consultant_id");

-- CreateIndex
CREATE INDEX "Job_assignment_source_idx" ON "Job"("assignment_source");

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_email_key" ON "Candidate"("email");

-- CreateIndex
CREATE INDEX "Candidate_email_idx" ON "Candidate"("email");

-- CreateIndex
CREATE INDEX "Candidate_status_idx" ON "Candidate"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateSession_session_id_key" ON "CandidateSession"("session_id");

-- CreateIndex
CREATE INDEX "CandidateSession_session_id_idx" ON "CandidateSession"("session_id");

-- CreateIndex
CREATE INDEX "CandidateSession_candidate_id_idx" ON "CandidateSession"("candidate_id");

-- CreateIndex
CREATE INDEX "CandidateSession_expires_at_idx" ON "CandidateSession"("expires_at");

-- CreateIndex
CREATE INDEX "SavedJob_candidate_id_idx" ON "SavedJob"("candidate_id");

-- CreateIndex
CREATE INDEX "SavedJob_job_id_idx" ON "SavedJob"("job_id");

-- CreateIndex
CREATE UNIQUE INDEX "SavedJob_candidate_id_job_id_key" ON "SavedJob"("candidate_id", "job_id");

-- CreateIndex
CREATE INDEX "SavedSearch_candidate_id_idx" ON "SavedSearch"("candidate_id");

-- CreateIndex
CREATE INDEX "SavedSearch_last_searched_at_idx" ON "SavedSearch"("last_searched_at");

-- CreateIndex
CREATE INDEX "JobAlert_candidate_id_idx" ON "JobAlert"("candidate_id");

-- CreateIndex
CREATE INDEX "JobAlert_is_active_idx" ON "JobAlert"("is_active");

-- CreateIndex
CREATE INDEX "Notification_candidate_id_idx" ON "Notification"("candidate_id");

-- CreateIndex
CREATE INDEX "Notification_read_idx" ON "Notification"("read");

-- CreateIndex
CREATE INDEX "Notification_created_at_idx" ON "Notification"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreferences_candidate_id_key" ON "NotificationPreferences"("candidate_id");

-- CreateIndex
CREATE INDEX "NotificationPreferences_candidate_id_idx" ON "NotificationPreferences"("candidate_id");

-- CreateIndex
CREATE INDEX "Conversation_candidateId_idx" ON "Conversation"("candidateId");

-- CreateIndex
CREATE INDEX "Conversation_employerUserId_idx" ON "Conversation"("employerUserId");

-- CreateIndex
CREATE INDEX "Conversation_consultantId_idx" ON "Conversation"("consultantId");

-- CreateIndex
CREATE INDEX "Conversation_jobId_idx" ON "Conversation"("jobId");

-- CreateIndex
CREATE INDEX "Conversation_last_message_at_idx" ON "Conversation"("last_message_at");

-- CreateIndex
CREATE INDEX "Conversation_status_idx" ON "Conversation"("status");

-- CreateIndex
CREATE INDEX "ConversationParticipant_conversation_id_idx" ON "ConversationParticipant"("conversation_id");

-- CreateIndex
CREATE INDEX "ConversationParticipant_participant_id_idx" ON "ConversationParticipant"("participant_id");

-- CreateIndex
CREATE INDEX "ConversationParticipant_participant_type_idx" ON "ConversationParticipant"("participant_type");

-- CreateIndex
CREATE INDEX "Message_conversation_id_idx" ON "Message"("conversation_id");

-- CreateIndex
CREATE INDEX "Message_created_at_idx" ON "Message"("created_at");

-- CreateIndex
CREATE INDEX "Message_sender_id_idx" ON "Message"("sender_id");

-- CreateIndex
CREATE INDEX "MessageAttachment_message_id_idx" ON "MessageAttachment"("message_id");

-- CreateIndex
CREATE INDEX "CandidateResume_candidate_id_idx" ON "CandidateResume"("candidate_id");

-- CreateIndex
CREATE INDEX "CandidateResume_is_default_idx" ON "CandidateResume"("is_default");

-- CreateIndex
CREATE INDEX "CandidateCoverLetter_candidate_id_idx" ON "CandidateCoverLetter"("candidate_id");

-- CreateIndex
CREATE INDEX "CandidatePortfolio_candidate_id_idx" ON "CandidatePortfolio"("candidate_id");

-- CreateIndex
CREATE INDEX "Application_candidate_id_idx" ON "Application"("candidate_id");

-- CreateIndex
CREATE INDEX "Application_job_id_idx" ON "Application"("job_id");

-- CreateIndex
CREATE INDEX "Application_status_idx" ON "Application"("status");

-- CreateIndex
CREATE INDEX "Application_stage_idx" ON "Application"("stage");

-- CreateIndex
CREATE INDEX "Application_applied_date_idx" ON "Application"("applied_date");

-- CreateIndex
CREATE INDEX "Application_score_idx" ON "Application"("score");

-- CreateIndex
CREATE INDEX "Application_shortlisted_idx" ON "Application"("shortlisted");

-- CreateIndex
CREATE INDEX "Application_screening_status_idx" ON "Application"("screening_status");

-- CreateIndex
CREATE UNIQUE INDEX "Application_candidate_id_job_id_key" ON "Application"("candidate_id", "job_id");

-- CreateIndex
CREATE UNIQUE INDEX "JobInvitation_token_key" ON "JobInvitation"("token");

-- CreateIndex
CREATE UNIQUE INDEX "JobInvitation_application_id_key" ON "JobInvitation"("application_id");

-- CreateIndex
CREATE INDEX "JobInvitation_email_idx" ON "JobInvitation"("email");

-- CreateIndex
CREATE INDEX "JobInvitation_job_id_idx" ON "JobInvitation"("job_id");

-- CreateIndex
CREATE INDEX "JobInvitation_candidate_id_idx" ON "JobInvitation"("candidate_id");

-- CreateIndex
CREATE INDEX "JobInvitation_token_idx" ON "JobInvitation"("token");

-- CreateIndex
CREATE INDEX "JobInvitation_status_idx" ON "JobInvitation"("status");

-- CreateIndex
CREATE INDEX "JobInvitation_expires_at_idx" ON "JobInvitation"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "JobInvitation_job_id_email_key" ON "JobInvitation"("job_id", "email");

-- CreateIndex
CREATE INDEX "JobTemplate_category_idx" ON "JobTemplate"("category");

-- CreateIndex
CREATE INDEX "JobTemplate_company_id_idx" ON "JobTemplate"("company_id");

-- CreateIndex
CREATE INDEX "JobTemplate_created_by_idx" ON "JobTemplate"("created_by");

-- CreateIndex
CREATE INDEX "JobTemplate_is_shared_idx" ON "JobTemplate"("is_shared");

-- CreateIndex
CREATE INDEX "JobTemplate_source_job_id_idx" ON "JobTemplate"("source_job_id");

-- CreateIndex
CREATE UNIQUE INDEX "Assessment_invitation_token_key" ON "Assessment"("invitation_token");

-- CreateIndex
CREATE INDEX "Assessment_application_id_idx" ON "Assessment"("application_id");

-- CreateIndex
CREATE INDEX "Assessment_assessment_type_idx" ON "Assessment"("assessment_type");

-- CreateIndex
CREATE INDEX "Assessment_candidate_id_idx" ON "Assessment"("candidate_id");

-- CreateIndex
CREATE INDEX "Assessment_job_id_idx" ON "Assessment"("job_id");

-- CreateIndex
CREATE INDEX "Assessment_status_idx" ON "Assessment"("status");

-- CreateIndex
CREATE INDEX "Assessment_invitation_token_idx" ON "Assessment"("invitation_token");

-- CreateIndex
CREATE INDEX "Assessment_job_round_id_idx" ON "Assessment"("job_round_id");

-- CreateIndex
CREATE INDEX "AssessmentQuestion_assessment_id_idx" ON "AssessmentQuestion"("assessment_id");

-- CreateIndex
CREATE INDEX "AssessmentQuestion_order_idx" ON "AssessmentQuestion"("order");

-- CreateIndex
CREATE INDEX "AssessmentResponse_assessment_id_idx" ON "AssessmentResponse"("assessment_id");

-- CreateIndex
CREATE INDEX "AssessmentResponse_candidate_id_idx" ON "AssessmentResponse"("candidate_id");

-- CreateIndex
CREATE INDEX "AssessmentResponse_question_id_idx" ON "AssessmentResponse"("question_id");

-- CreateIndex
CREATE INDEX "Commission_consultant_id_idx" ON "Commission"("consultant_id");

-- CreateIndex
CREATE INDEX "Commission_job_id_idx" ON "Commission"("job_id");

-- CreateIndex
CREATE INDEX "Commission_subscription_id_idx" ON "Commission"("subscription_id");

-- CreateIndex
CREATE INDEX "Commission_region_id_idx" ON "Commission"("region_id");

-- CreateIndex
CREATE INDEX "Commission_status_idx" ON "Commission"("status");

-- CreateIndex
CREATE INDEX "Commission_type_idx" ON "Commission"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Consultant_email_key" ON "Consultant"("email");

-- CreateIndex
CREATE INDEX "Consultant_email_idx" ON "Consultant"("email");

-- CreateIndex
CREATE INDEX "Consultant_region_id_idx" ON "Consultant"("region_id");

-- CreateIndex
CREATE INDEX "Consultant_role_idx" ON "Consultant"("role");

-- CreateIndex
CREATE INDEX "Consultant_status_idx" ON "Consultant"("status");

-- CreateIndex
CREATE INDEX "Consultant_availability_status_region_id_idx" ON "Consultant"("availability", "status", "region_id");

-- CreateIndex
CREATE INDEX "ConsultantJobAssignment_consultant_id_idx" ON "ConsultantJobAssignment"("consultant_id");

-- CreateIndex
CREATE INDEX "ConsultantJobAssignment_job_id_idx" ON "ConsultantJobAssignment"("job_id");

-- CreateIndex
CREATE INDEX "ConsultantJobAssignment_status_idx" ON "ConsultantJobAssignment"("status");

-- CreateIndex
CREATE INDEX "ConsultantJobAssignment_pipeline_stage_idx" ON "ConsultantJobAssignment"("pipeline_stage");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultantJobAssignment_consultant_id_job_id_key" ON "ConsultantJobAssignment"("consultant_id", "job_id");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultantSession_session_id_key" ON "ConsultantSession"("session_id");

-- CreateIndex
CREATE INDEX "ConsultantSession_consultant_id_idx" ON "ConsultantSession"("consultant_id");

-- CreateIndex
CREATE INDEX "ConsultantSession_expires_at_idx" ON "ConsultantSession"("expires_at");

-- CreateIndex
CREATE INDEX "ConsultantSession_session_id_idx" ON "ConsultantSession"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "HRM8Session_session_id_key" ON "HRM8Session"("session_id");

-- CreateIndex
CREATE INDEX "HRM8Session_expires_at_idx" ON "HRM8Session"("expires_at");

-- CreateIndex
CREATE INDEX "HRM8Session_hrm8_user_id_idx" ON "HRM8Session"("hrm8_user_id");

-- CreateIndex
CREATE INDEX "HRM8Session_session_id_idx" ON "HRM8Session"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "HRM8User_email_key" ON "HRM8User"("email");

-- CreateIndex
CREATE INDEX "HRM8User_email_idx" ON "HRM8User"("email");

-- CreateIndex
CREATE INDEX "HRM8User_licensee_id_idx" ON "HRM8User"("licensee_id");

-- CreateIndex
CREATE INDEX "HRM8User_role_idx" ON "HRM8User"("role");

-- CreateIndex
CREATE INDEX "HRM8User_status_idx" ON "HRM8User"("status");

-- CreateIndex
CREATE INDEX "PreInterviewQuestionnaire_job_id_idx" ON "PreInterviewQuestionnaire"("job_id");

-- CreateIndex
CREATE INDEX "QuestionnaireResponse_application_id_idx" ON "QuestionnaireResponse"("application_id");

-- CreateIndex
CREATE INDEX "QuestionnaireResponse_candidate_id_idx" ON "QuestionnaireResponse"("candidate_id");

-- CreateIndex
CREATE INDEX "QuestionnaireResponse_questionnaire_id_idx" ON "QuestionnaireResponse"("questionnaire_id");

-- CreateIndex
CREATE UNIQUE INDEX "Region_code_key" ON "Region"("code");

-- CreateIndex
CREATE INDEX "Region_is_active_idx" ON "Region"("is_active");

-- CreateIndex
CREATE INDEX "Region_licensee_id_idx" ON "Region"("licensee_id");

-- CreateIndex
CREATE INDEX "Region_owner_type_idx" ON "Region"("owner_type");

-- CreateIndex
CREATE INDEX "RegionalLicensee_email_idx" ON "RegionalLicensee"("email");

-- CreateIndex
CREATE INDEX "RegionalLicensee_status_idx" ON "RegionalLicensee"("status");

-- CreateIndex
CREATE INDEX "RegionalRevenue_licensee_id_idx" ON "RegionalRevenue"("licensee_id");

-- CreateIndex
CREATE INDEX "RegionalRevenue_region_id_idx" ON "RegionalRevenue"("region_id");

-- CreateIndex
CREATE INDEX "RegionalRevenue_status_idx" ON "RegionalRevenue"("status");

-- CreateIndex
CREATE INDEX "ScreeningCriteria_category_idx" ON "ScreeningCriteria"("category");

-- CreateIndex
CREATE INDEX "ScreeningCriteria_criteria_type_idx" ON "ScreeningCriteria"("criteria_type");

-- CreateIndex
CREATE INDEX "ScreeningCriteria_job_id_idx" ON "ScreeningCriteria"("job_id");

-- CreateIndex
CREATE INDEX "ScreeningResult_application_id_idx" ON "ScreeningResult"("application_id");

-- CreateIndex
CREATE INDEX "ScreeningResult_criteria_id_idx" ON "ScreeningResult"("criteria_id");

-- CreateIndex
CREATE INDEX "ScreeningResult_screening_type_idx" ON "ScreeningResult"("screening_type");

-- CreateIndex
CREATE INDEX "ScreeningResult_status_idx" ON "ScreeningResult"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ScreeningResult_application_id_criteria_id_key" ON "ScreeningResult"("application_id", "criteria_id");

-- CreateIndex
CREATE INDEX "VideoInterview_application_id_idx" ON "VideoInterview"("application_id");

-- CreateIndex
CREATE INDEX "VideoInterview_candidate_id_idx" ON "VideoInterview"("candidate_id");

-- CreateIndex
CREATE INDEX "VideoInterview_job_id_idx" ON "VideoInterview"("job_id");

-- CreateIndex
CREATE INDEX "VideoInterview_scheduled_date_idx" ON "VideoInterview"("scheduled_date");

-- CreateIndex
CREATE INDEX "VideoInterview_status_idx" ON "VideoInterview"("status");

-- CreateIndex
CREATE INDEX "VideoInterview_is_auto_scheduled_idx" ON "VideoInterview"("is_auto_scheduled");

-- CreateIndex
CREATE INDEX "VideoInterview_job_round_id_idx" ON "VideoInterview"("job_round_id");

-- CreateIndex
CREATE INDEX "CandidateCertification_candidate_id_idx" ON "CandidateCertification"("candidate_id");

-- CreateIndex
CREATE INDEX "CandidateCertification_expiry_date_idx" ON "CandidateCertification"("expiry_date");

-- CreateIndex
CREATE INDEX "CandidateEducation_candidate_id_idx" ON "CandidateEducation"("candidate_id");

-- CreateIndex
CREATE INDEX "CandidateSkill_candidate_id_idx" ON "CandidateSkill"("candidate_id");

-- CreateIndex
CREATE INDEX "CandidateTraining_candidate_id_idx" ON "CandidateTraining"("candidate_id");

-- CreateIndex
CREATE INDEX "CandidateWorkExperience_candidate_id_idx" ON "CandidateWorkExperience"("candidate_id");

-- CreateIndex
CREATE INDEX "ApplicationRoundProgress_application_id_idx" ON "ApplicationRoundProgress"("application_id");

-- CreateIndex
CREATE INDEX "ApplicationRoundProgress_job_round_id_idx" ON "ApplicationRoundProgress"("job_round_id");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationRoundProgress_application_id_job_round_id_key" ON "ApplicationRoundProgress"("application_id", "job_round_id");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentConfiguration_job_round_id_key" ON "AssessmentConfiguration"("job_round_id");

-- CreateIndex
CREATE INDEX "AssessmentConfiguration_job_round_id_idx" ON "AssessmentConfiguration"("job_round_id");

-- CreateIndex
CREATE INDEX "AssessmentConfiguration_provider_idx" ON "AssessmentConfiguration"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "CompanySettings_company_id_key" ON "CompanySettings"("company_id");

-- CreateIndex
CREATE INDEX "CompanySettings_company_id_idx" ON "CompanySettings"("company_id");

-- CreateIndex
CREATE INDEX "JobRound_isFixed_idx" ON "JobRound"("isFixed");

-- CreateIndex
CREATE INDEX "JobRound_job_id_idx" ON "JobRound"("job_id");

-- CreateIndex
CREATE INDEX "JobRound_order_idx" ON "JobRound"("order");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewConfiguration_job_round_id_key" ON "InterviewConfiguration"("job_round_id");

-- CreateIndex
CREATE INDEX "InterviewConfiguration_job_round_id_idx" ON "InterviewConfiguration"("job_round_id");

-- CreateIndex
CREATE INDEX "InterviewFeedback_interviewer_id_idx" ON "InterviewFeedback"("interviewer_id");

-- CreateIndex
CREATE INDEX "InterviewFeedback_submitted_at_idx" ON "InterviewFeedback"("submitted_at");

-- CreateIndex
CREATE INDEX "InterviewFeedback_video_interview_id_idx" ON "InterviewFeedback"("video_interview_id");

-- CreateIndex
CREATE INDEX "AccountTeam_company_id_idx" ON "AccountTeam"("company_id");

-- CreateIndex
CREATE INDEX "AccountTeam_consultant_id_idx" ON "AccountTeam"("consultant_id");

-- CreateIndex
CREATE UNIQUE INDEX "AccountTeam_company_id_consultant_id_role_key" ON "AccountTeam"("company_id", "consultant_id", "role");

-- CreateIndex
CREATE INDEX "Activity_company_id_idx" ON "Activity"("company_id");

-- CreateIndex
CREATE INDEX "Activity_created_by_idx" ON "Activity"("created_by");

-- CreateIndex
CREATE INDEX "Activity_lead_id_idx" ON "Activity"("lead_id");

-- CreateIndex
CREATE INDEX "Activity_opportunity_id_idx" ON "Activity"("opportunity_id");

-- CreateIndex
CREATE INDEX "Activity_scheduled_at_idx" ON "Activity"("scheduled_at");

-- CreateIndex
CREATE INDEX "Activity_type_idx" ON "Activity"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Bill_bill_number_key" ON "Bill"("bill_number");

-- CreateIndex
CREATE INDEX "Bill_company_id_idx" ON "Bill"("company_id");

-- CreateIndex
CREATE INDEX "Bill_due_date_idx" ON "Bill"("due_date");

-- CreateIndex
CREATE INDEX "Bill_status_idx" ON "Bill"("status");

-- CreateIndex
CREATE INDEX "Bill_subscription_id_idx" ON "Bill"("subscription_id");

-- CreateIndex
CREATE INDEX "ConsultantLeadAssignment_consultant_id_idx" ON "ConsultantLeadAssignment"("consultant_id");

-- CreateIndex
CREATE INDEX "ConsultantLeadAssignment_lead_id_idx" ON "ConsultantLeadAssignment"("lead_id");

-- CreateIndex
CREATE INDEX "ConsultantLeadAssignment_status_idx" ON "ConsultantLeadAssignment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultantLeadAssignment_consultant_id_lead_id_key" ON "ConsultantLeadAssignment"("consultant_id", "lead_id");

-- CreateIndex
CREATE INDEX "Contact_company_id_idx" ON "Contact"("company_id");

-- CreateIndex
CREATE INDEX "Contact_email_idx" ON "Contact"("email");

-- CreateIndex
CREATE INDEX "Integration_company_id_idx" ON "Integration"("company_id");

-- CreateIndex
CREATE INDEX "Integration_status_idx" ON "Integration"("status");

-- CreateIndex
CREATE INDEX "Integration_type_idx" ON "Integration"("type");

-- CreateIndex
CREATE INDEX "Lead_assigned_consultant_id_idx" ON "Lead"("assigned_consultant_id");

-- CreateIndex
CREATE INDEX "Lead_assignment_source_idx" ON "Lead"("assignment_source");

-- CreateIndex
CREATE INDEX "Lead_converted_to_company_id_idx" ON "Lead"("converted_to_company_id");

-- CreateIndex
CREATE INDEX "Lead_created_by_idx" ON "Lead"("created_by");

-- CreateIndex
CREATE INDEX "Lead_region_id_idx" ON "Lead"("region_id");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "OfferDocument_application_id_idx" ON "OfferDocument"("application_id");

-- CreateIndex
CREATE INDEX "OfferDocument_category_idx" ON "OfferDocument"("category");

-- CreateIndex
CREATE INDEX "OfferDocument_is_required_idx" ON "OfferDocument"("is_required");

-- CreateIndex
CREATE INDEX "OfferDocument_offer_id_idx" ON "OfferDocument"("offer_id");

-- CreateIndex
CREATE INDEX "OfferDocument_status_idx" ON "OfferDocument"("status");

-- CreateIndex
CREATE INDEX "OfferLetter_application_id_idx" ON "OfferLetter"("application_id");

-- CreateIndex
CREATE INDEX "OfferLetter_candidate_id_idx" ON "OfferLetter"("candidate_id");

-- CreateIndex
CREATE INDEX "OfferLetter_created_by_idx" ON "OfferLetter"("created_by");

-- CreateIndex
CREATE INDEX "OfferLetter_expiry_date_idx" ON "OfferLetter"("expiry_date");

-- CreateIndex
CREATE INDEX "OfferLetter_job_id_idx" ON "OfferLetter"("job_id");

-- CreateIndex
CREATE INDEX "OfferLetter_sent_date_idx" ON "OfferLetter"("sent_date");

-- CreateIndex
CREATE INDEX "OfferLetter_status_idx" ON "OfferLetter"("status");

-- CreateIndex
CREATE INDEX "OfferNegotiation_created_at_idx" ON "OfferNegotiation"("created_at");

-- CreateIndex
CREATE INDEX "OfferNegotiation_message_type_idx" ON "OfferNegotiation"("message_type");

-- CreateIndex
CREATE INDEX "OfferNegotiation_offer_id_idx" ON "OfferNegotiation"("offer_id");

-- CreateIndex
CREATE INDEX "OfferNegotiation_sender_id_idx" ON "OfferNegotiation"("sender_id");

-- CreateIndex
CREATE INDEX "Opportunity_company_id_idx" ON "Opportunity"("company_id");

-- CreateIndex
CREATE INDEX "Opportunity_sales_agent_id_idx" ON "Opportunity"("sales_agent_id");

-- CreateIndex
CREATE INDEX "Opportunity_stage_idx" ON "Opportunity"("stage");

-- CreateIndex
CREATE INDEX "Opportunity_type_idx" ON "Opportunity"("type");

-- CreateIndex
CREATE INDEX "Subscription_company_id_idx" ON "Subscription"("company_id");

-- CreateIndex
CREATE INDEX "Subscription_planType_idx" ON "Subscription"("planType");

-- CreateIndex
CREATE INDEX "Subscription_sales_agent_id_idx" ON "Subscription"("sales_agent_id");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE INDEX "AssessmentComment_assessment_id_idx" ON "AssessmentComment"("assessment_id");

-- CreateIndex
CREATE INDEX "AssessmentComment_user_id_idx" ON "AssessmentComment"("user_id");

-- CreateIndex
CREATE INDEX "AssessmentGrade_assessment_response_id_idx" ON "AssessmentGrade"("assessment_response_id");

-- CreateIndex
CREATE INDEX "AssessmentGrade_user_id_idx" ON "AssessmentGrade"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentGrade_assessment_response_id_user_id_key" ON "AssessmentGrade"("assessment_response_id", "user_id");

-- CreateIndex
CREATE INDEX "EmailMessage_application_id_idx" ON "EmailMessage"("application_id");

-- CreateIndex
CREATE INDEX "EmailMessage_candidate_id_idx" ON "EmailMessage"("candidate_id");

-- CreateIndex
CREATE INDEX "EmailMessage_job_id_idx" ON "EmailMessage"("job_id");

-- CreateIndex
CREATE INDEX "EmailMessage_job_round_id_idx" ON "EmailMessage"("job_round_id");

-- CreateIndex
CREATE INDEX "EmailMessage_sender_id_idx" ON "EmailMessage"("sender_id");

-- CreateIndex
CREATE INDEX "EmailMessage_sent_at_idx" ON "EmailMessage"("sent_at");

-- CreateIndex
CREATE INDEX "EmailMessage_status_idx" ON "EmailMessage"("status");

-- CreateIndex
CREATE INDEX "EmailTemplate_company_id_idx" ON "EmailTemplate"("company_id");

-- CreateIndex
CREATE INDEX "EmailTemplate_created_by_idx" ON "EmailTemplate"("created_by");

-- CreateIndex
CREATE INDEX "EmailTemplate_job_id_idx" ON "EmailTemplate"("job_id");

-- CreateIndex
CREATE INDEX "EmailTemplate_job_round_id_idx" ON "EmailTemplate"("job_round_id");

-- CreateIndex
CREATE INDEX "EmailTemplate_type_idx" ON "EmailTemplate"("type");

-- CreateIndex
CREATE INDEX "EmailTemplateTrigger_job_round_id_idx" ON "EmailTemplateTrigger"("job_round_id");

-- CreateIndex
CREATE INDEX "EmailTemplateTrigger_template_id_idx" ON "EmailTemplateTrigger"("template_id");

-- CreateIndex
CREATE INDEX "ResumeAnnotation_resume_id_idx" ON "ResumeAnnotation"("resume_id");

-- CreateIndex
CREATE UNIQUE INDEX "Product_code_key" ON "Product"("code");

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "Product"("category");

-- CreateIndex
CREATE INDEX "Product_isActive_idx" ON "Product"("isActive");

-- CreateIndex
CREATE INDEX "PriceBook_region_id_idx" ON "PriceBook"("region_id");

-- CreateIndex
CREATE INDEX "PriceBook_is_global_idx" ON "PriceBook"("is_global");

-- CreateIndex
CREATE INDEX "PriceTier_price_book_id_idx" ON "PriceTier"("price_book_id");

-- CreateIndex
CREATE INDEX "PriceTier_product_id_idx" ON "PriceTier"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "PromoCode_code_key" ON "PromoCode"("code");

-- CreateIndex
CREATE INDEX "PromoCode_code_idx" ON "PromoCode"("code");

-- CreateIndex
CREATE INDEX "PromoCode_is_active_idx" ON "PromoCode"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalIntegration_provider_key" ON "GlobalIntegration"("provider");

-- CreateIndex
CREATE INDEX "GlobalIntegration_provider_idx" ON "GlobalIntegration"("provider");

-- CreateIndex
CREATE INDEX "Settlement_licensee_id_idx" ON "Settlement"("licensee_id");

-- CreateIndex
CREATE INDEX "Settlement_status_idx" ON "Settlement"("status");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_price_book_id_fkey" FOREIGN KEY ("price_book_id") REFERENCES "PriceBook"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyProfile" ADD CONSTRAINT "CompanyProfile_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationToken" ADD CONSTRAINT "VerificationToken_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignupRequest" ADD CONSTRAINT "SignupRequest_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignupRequest" ADD CONSTRAINT "SignupRequest_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_assigned_consultant_id_fkey" FOREIGN KEY ("assigned_consultant_id") REFERENCES "Consultant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateSession" ADD CONSTRAINT "CandidateSession_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedJob" ADD CONSTRAINT "SavedJob_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedJob" ADD CONSTRAINT "SavedJob_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedSearch" ADD CONSTRAINT "SavedSearch_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobAlert" ADD CONSTRAINT "JobAlert_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreferences" ADD CONSTRAINT "NotificationPreferences_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageAttachment" ADD CONSTRAINT "MessageAttachment_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateResume" ADD CONSTRAINT "CandidateResume_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateCoverLetter" ADD CONSTRAINT "CandidateCoverLetter_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidatePortfolio" ADD CONSTRAINT "CandidatePortfolio_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobInvitation" ADD CONSTRAINT "JobInvitation_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobInvitation" ADD CONSTRAINT "JobInvitation_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobInvitation" ADD CONSTRAINT "JobInvitation_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobInvitation" ADD CONSTRAINT "JobInvitation_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobTemplate" ADD CONSTRAINT "JobTemplate_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobTemplate" ADD CONSTRAINT "JobTemplate_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobTemplate" ADD CONSTRAINT "JobTemplate_source_job_id_fkey" FOREIGN KEY ("source_job_id") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentQuestion" ADD CONSTRAINT "AssessmentQuestion_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentResponse" ADD CONSTRAINT "AssessmentResponse_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentResponse" ADD CONSTRAINT "AssessmentResponse_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "AssessmentQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "Consultant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultant" ADD CONSTRAINT "Consultant_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantJobAssignment" ADD CONSTRAINT "ConsultantJobAssignment_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "Consultant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantJobAssignment" ADD CONSTRAINT "ConsultantJobAssignment_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantSession" ADD CONSTRAINT "ConsultantSession_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "Consultant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HRM8Session" ADD CONSTRAINT "HRM8Session_hrm8_user_id_fkey" FOREIGN KEY ("hrm8_user_id") REFERENCES "HRM8User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreInterviewQuestionnaire" ADD CONSTRAINT "PreInterviewQuestionnaire_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionnaireResponse" ADD CONSTRAINT "QuestionnaireResponse_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionnaireResponse" ADD CONSTRAINT "QuestionnaireResponse_questionnaire_id_fkey" FOREIGN KEY ("questionnaire_id") REFERENCES "PreInterviewQuestionnaire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Region" ADD CONSTRAINT "Region_licensee_id_fkey" FOREIGN KEY ("licensee_id") REFERENCES "RegionalLicensee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegionalRevenue" ADD CONSTRAINT "RegionalRevenue_licensee_id_fkey" FOREIGN KEY ("licensee_id") REFERENCES "RegionalLicensee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegionalRevenue" ADD CONSTRAINT "RegionalRevenue_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningCriteria" ADD CONSTRAINT "ScreeningCriteria_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningResult" ADD CONSTRAINT "ScreeningResult_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningResult" ADD CONSTRAINT "ScreeningResult_criteria_id_fkey" FOREIGN KEY ("criteria_id") REFERENCES "ScreeningCriteria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningResult" ADD CONSTRAINT "ScreeningResult_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoInterview" ADD CONSTRAINT "VideoInterview_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoInterview" ADD CONSTRAINT "VideoInterview_job_round_id_fkey" FOREIGN KEY ("job_round_id") REFERENCES "JobRound"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateCertification" ADD CONSTRAINT "CandidateCertification_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateEducation" ADD CONSTRAINT "CandidateEducation_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateSkill" ADD CONSTRAINT "CandidateSkill_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateTraining" ADD CONSTRAINT "CandidateTraining_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateWorkExperience" ADD CONSTRAINT "CandidateWorkExperience_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationRoundProgress" ADD CONSTRAINT "ApplicationRoundProgress_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationRoundProgress" ADD CONSTRAINT "ApplicationRoundProgress_job_round_id_fkey" FOREIGN KEY ("job_round_id") REFERENCES "JobRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentConfiguration" ADD CONSTRAINT "AssessmentConfiguration_job_round_id_fkey" FOREIGN KEY ("job_round_id") REFERENCES "JobRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanySettings" ADD CONSTRAINT "CompanySettings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobRound" ADD CONSTRAINT "JobRound_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewConfiguration" ADD CONSTRAINT "InterviewConfiguration_job_round_id_fkey" FOREIGN KEY ("job_round_id") REFERENCES "JobRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewFeedback" ADD CONSTRAINT "InterviewFeedback_video_interview_id_fkey" FOREIGN KEY ("video_interview_id") REFERENCES "VideoInterview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountTeam" ADD CONSTRAINT "AccountTeam_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountTeam" ADD CONSTRAINT "AccountTeam_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "Consultant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantLeadAssignment" ADD CONSTRAINT "ConsultantLeadAssignment_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "Consultant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantLeadAssignment" ADD CONSTRAINT "ConsultantLeadAssignment_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Integration" ADD CONSTRAINT "Integration_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assigned_consultant_id_fkey" FOREIGN KEY ("assigned_consultant_id") REFERENCES "Consultant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_converted_to_company_id_fkey" FOREIGN KEY ("converted_to_company_id") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferDocument" ADD CONSTRAINT "OfferDocument_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferDocument" ADD CONSTRAINT "OfferDocument_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "OfferLetter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferLetter" ADD CONSTRAINT "OfferLetter_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferLetter" ADD CONSTRAINT "OfferLetter_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferLetter" ADD CONSTRAINT "OfferLetter_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferLetter" ADD CONSTRAINT "OfferLetter_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferNegotiation" ADD CONSTRAINT "OfferNegotiation_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "OfferLetter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_sales_agent_id_fkey" FOREIGN KEY ("sales_agent_id") REFERENCES "Consultant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_sales_agent_id_fkey" FOREIGN KEY ("sales_agent_id") REFERENCES "Consultant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentComment" ADD CONSTRAINT "AssessmentComment_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentComment" ADD CONSTRAINT "AssessmentComment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentGrade" ADD CONSTRAINT "AssessmentGrade_assessment_response_id_fkey" FOREIGN KEY ("assessment_response_id") REFERENCES "AssessmentResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentGrade" ADD CONSTRAINT "AssessmentGrade_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "EmailTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_job_round_id_fkey" FOREIGN KEY ("job_round_id") REFERENCES "JobRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailTemplateTrigger" ADD CONSTRAINT "EmailTemplateTrigger_job_round_id_fkey" FOREIGN KEY ("job_round_id") REFERENCES "JobRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailTemplateTrigger" ADD CONSTRAINT "EmailTemplateTrigger_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "EmailTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeAnnotation" ADD CONSTRAINT "ResumeAnnotation_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "CandidateResume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceBook" ADD CONSTRAINT "PriceBook_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceTier" ADD CONSTRAINT "PriceTier_price_book_id_fkey" FOREIGN KEY ("price_book_id") REFERENCES "PriceBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceTier" ADD CONSTRAINT "PriceTier_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_licensee_id_fkey" FOREIGN KEY ("licensee_id") REFERENCES "RegionalLicensee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

