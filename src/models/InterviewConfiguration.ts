/**
 * Interview Configuration Model
 * Manages interview configurations for job rounds
 */

import { prisma } from '../lib/prisma';
import { InterviewFormat, ScoringMethod, PassCriteria, FailCriteria } from '@prisma/client';

export interface InterviewConfigurationData {
  id: string;
  jobRoundId: string;
  
  // Basic Settings
  enabled: boolean;
  autoSchedule: boolean;
  requireBeforeProgression: boolean;
  requireAllInterviewers: boolean;
  
  // Interview Format
  interviewFormat: InterviewFormat; // LIVE_VIDEO, PHONE, IN_PERSON, PANEL
  defaultDuration?: number | null;
  requiresInterviewer: boolean;
  
  // Scheduling
  autoScheduleWindowDays?: number | null;
  availableTimeSlots?: any;
  bufferTimeMinutes?: number | null;
  calendarIntegration?: string | null;
  autoRescheduleOnNoShow: boolean;
  autoRescheduleOnCancel: boolean;
  
  // Rating Criteria & Scoring
  useCustomCriteria: boolean;
  ratingCriteria?: any;
  passThreshold?: number | null;
  scoringMethod?: ScoringMethod | null;
  
  // Automated Progression
  autoMoveOnPass: boolean;
  passCriteria?: PassCriteria | null;
  nextRoundOnPassId?: string | null;
  autoRejectOnFail: boolean;
  failCriteria?: FailCriteria | null;
  rejectRoundId?: string | null;
  requiresManualReview: boolean;
  
  // Template
  templateId?: string | null;
  questions?: any;
  agenda?: string | null;
  assignedInterviewerIds?: string[];
  
  createdAt: Date;
  updatedAt: Date;
}

export class InterviewConfigurationModel {
  static async findByJobRoundId(jobRoundId: string): Promise<InterviewConfigurationData | null> {
    const config = await prisma.interviewConfiguration.findUnique({
      where: { job_round_id: jobRoundId },
    });

    if (!config) return null;
    return this.mapPrismaToConfig(config);
  }

  static async create(data: {
    jobRoundId: string;
    enabled?: boolean;
    autoSchedule?: boolean;
    requireBeforeProgression?: boolean;
    requireAllInterviewers?: boolean;
    interviewFormat?: InterviewFormat;
    defaultDuration?: number;
    requiresInterviewer?: boolean;
    autoScheduleWindowDays?: number;
    availableTimeSlots?: any;
    bufferTimeMinutes?: number;
    calendarIntegration?: string;
    autoRescheduleOnNoShow?: boolean;
    autoRescheduleOnCancel?: boolean;
    useCustomCriteria?: boolean;
    ratingCriteria?: any;
    passThreshold?: number;
    scoringMethod?: ScoringMethod;
    autoMoveOnPass?: boolean;
    passCriteria?: PassCriteria;
    nextRoundOnPassId?: string;
    autoRejectOnFail?: boolean;
    failCriteria?: FailCriteria;
    rejectRoundId?: string;
    requiresManualReview?: boolean;
    templateId?: string;
    questions?: any;
    agenda?: string;
    assignedInterviewerIds?: string[];
  }): Promise<InterviewConfigurationData> {
    const config = await prisma.interviewConfiguration.create({
      data: {
        job_round_id: data.jobRoundId,
        enabled: data.enabled ?? false,
        auto_schedule: data.autoSchedule ?? true,
        require_before_progression: data.requireBeforeProgression ?? false,
        require_all_interviewers: data.requireAllInterviewers ?? false,
        interview_format: data.interviewFormat ?? InterviewFormat.LIVE_VIDEO,
        default_duration: data.defaultDuration ?? 60,
        requires_interviewer: data.requiresInterviewer ?? true,
        auto_schedule_window_days: data.autoScheduleWindowDays,
        available_time_slots: data.availableTimeSlots,
        buffer_time_minutes: data.bufferTimeMinutes,
        calendar_integration: data.calendarIntegration,
        auto_reschedule_on_no_show: data.autoRescheduleOnNoShow ?? false,
        auto_reschedule_on_cancel: data.autoRescheduleOnCancel ?? false,
        use_custom_criteria: data.useCustomCriteria ?? false,
        rating_criteria: data.ratingCriteria,
        pass_threshold: data.passThreshold,
        scoring_method: data.scoringMethod || null,
        auto_move_on_pass: data.autoMoveOnPass ?? false,
        pass_criteria: data.passCriteria || null,
        next_round_on_pass_id: data.nextRoundOnPassId,
        auto_reject_on_fail: data.autoRejectOnFail ?? false,
        fail_criteria: data.failCriteria || null,
        reject_round_id: data.rejectRoundId,
        requires_manual_review: data.requiresManualReview ?? true,
        template_id: data.templateId,
        questions: data.questions,
        agenda: data.agenda,
        assigned_interviewer_ids: data.assignedInterviewerIds || [],
        updated_at: new Date(),
      },
    });

    return this.mapPrismaToConfig(config);
  }

  static async update(
    jobRoundId: string,
    data: Partial<Omit<InterviewConfigurationData, 'id' | 'jobRoundId' | 'createdAt' | 'updatedAt'>>
  ): Promise<InterviewConfigurationData | null> {
    const updateData: any = {};
    
    if (data.enabled !== undefined) updateData.enabled = data.enabled;
    if (data.autoSchedule !== undefined) updateData.auto_schedule = data.autoSchedule;
    if (data.requireBeforeProgression !== undefined) updateData.require_before_progression = data.requireBeforeProgression;
    if (data.requireAllInterviewers !== undefined) updateData.require_all_interviewers = data.requireAllInterviewers;
    if (data.defaultDuration !== undefined) updateData.default_duration = data.defaultDuration;
    if (data.requiresInterviewer !== undefined) updateData.requires_interviewer = data.requiresInterviewer;
    if (data.autoScheduleWindowDays !== undefined) updateData.auto_schedule_window_days = data.autoScheduleWindowDays;
    if (data.availableTimeSlots !== undefined) updateData.available_time_slots = data.availableTimeSlots;
    if (data.bufferTimeMinutes !== undefined) updateData.buffer_time_minutes = data.bufferTimeMinutes;
    if (data.calendarIntegration !== undefined) updateData.calendar_integration = data.calendarIntegration;
    if (data.autoRescheduleOnNoShow !== undefined) updateData.auto_reschedule_on_no_show = data.autoRescheduleOnNoShow;
    if (data.autoRescheduleOnCancel !== undefined) updateData.auto_reschedule_on_cancel = data.autoRescheduleOnCancel;
    if (data.useCustomCriteria !== undefined) updateData.use_custom_criteria = data.useCustomCriteria;
    if (data.ratingCriteria !== undefined) updateData.rating_criteria = data.ratingCriteria;
    if (data.passThreshold !== undefined) updateData.pass_threshold = data.passThreshold;
    if (data.autoMoveOnPass !== undefined) updateData.auto_move_on_pass = data.autoMoveOnPass;
    if (data.nextRoundOnPassId !== undefined) updateData.next_round_on_pass_id = data.nextRoundOnPassId;
    if (data.autoRejectOnFail !== undefined) updateData.auto_reject_on_fail = data.autoRejectOnFail;
    if (data.rejectRoundId !== undefined) updateData.reject_round_id = data.rejectRoundId;
    if (data.requiresManualReview !== undefined) updateData.requires_manual_review = data.requiresManualReview;
    if (data.templateId !== undefined) updateData.template_id = data.templateId;
    if (data.questions !== undefined) updateData.questions = data.questions;
    if (data.agenda !== undefined) updateData.agenda = data.agenda;
    if (data.assignedInterviewerIds !== undefined) updateData.assigned_interviewer_ids = data.assignedInterviewerIds;
    
    if (data.interviewFormat !== undefined) {
      updateData.interview_format = data.interviewFormat;
    }
    if (data.scoringMethod !== undefined) {
      updateData.scoring_method = data.scoringMethod || null;
    }
    if (data.passCriteria !== undefined) {
      updateData.pass_criteria = data.passCriteria || null;
    }
    if (data.failCriteria !== undefined) {
      updateData.fail_criteria = data.failCriteria || null;
    }
    
    updateData.updated_at = new Date();

    const config = await prisma.interviewConfiguration.update({
      where: { job_round_id: jobRoundId },
      data: updateData,
    });

    return this.mapPrismaToConfig(config);
  }

  static async delete(jobRoundId: string): Promise<void> {
    await prisma.interviewConfiguration.delete({
      where: { job_round_id: jobRoundId },
    });
  }

  private static mapPrismaToConfig(config: any): InterviewConfigurationData {
    return {
      id: config.id,
      jobRoundId: config.job_round_id,
      enabled: config.enabled,
      autoSchedule: config.auto_schedule,
      requireBeforeProgression: config.require_before_progression,
      requireAllInterviewers: config.require_all_interviewers,
      interviewFormat: config.interview_format,
      defaultDuration: config.default_duration,
      requiresInterviewer: config.requires_interviewer,
      autoScheduleWindowDays: config.auto_schedule_window_days,
      availableTimeSlots: config.available_time_slots,
      bufferTimeMinutes: config.buffer_time_minutes,
      calendarIntegration: config.calendar_integration,
      autoRescheduleOnNoShow: config.auto_reschedule_on_no_show,
      autoRescheduleOnCancel: config.auto_reschedule_on_cancel,
      useCustomCriteria: config.use_custom_criteria,
      ratingCriteria: config.rating_criteria,
      passThreshold: config.pass_threshold,
      scoringMethod: config.scoring_method,
      autoMoveOnPass: config.auto_move_on_pass,
      passCriteria: config.pass_criteria,
      nextRoundOnPassId: config.next_round_on_pass_id,
      autoRejectOnFail: config.auto_reject_on_fail,
      failCriteria: config.fail_criteria,
      rejectRoundId: config.reject_round_id,
      requiresManualReview: config.requires_manual_review,
      templateId: config.template_id,
      questions: config.questions,
      agenda: config.agenda,
      assignedInterviewerIds: config.assigned_interviewer_ids,
      createdAt: config.created_at,
      updatedAt: config.updated_at,
    };
  }
}
