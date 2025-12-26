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
  interviewFormat: string; // LIVE_VIDEO, PHONE, IN_PERSON, PANEL
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
  scoringMethod?: string | null;
  
  // Automated Progression
  autoMoveOnPass: boolean;
  passCriteria?: string | null;
  nextRoundOnPassId?: string | null;
  autoRejectOnFail: boolean;
  failCriteria?: string | null;
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
      where: { jobRoundId },
    });

    return config;
  }

  static async create(data: {
    jobRoundId: string;
    enabled?: boolean;
    autoSchedule?: boolean;
    requireBeforeProgression?: boolean;
    requireAllInterviewers?: boolean;
    interviewFormat?: string;
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
    scoringMethod?: string;
    autoMoveOnPass?: boolean;
    passCriteria?: string;
    nextRoundOnPassId?: string;
    autoRejectOnFail?: boolean;
    failCriteria?: string;
    rejectRoundId?: string;
    requiresManualReview?: boolean;
    templateId?: string;
    questions?: any;
    agenda?: string;
    assignedInterviewerIds?: string[];
  }): Promise<InterviewConfigurationData> {
    const config = await prisma.interviewConfiguration.create({
      data: {
        jobRoundId: data.jobRoundId,
        enabled: data.enabled ?? false,
        autoSchedule: data.autoSchedule ?? true,
        requireBeforeProgression: data.requireBeforeProgression ?? false,
        requireAllInterviewers: data.requireAllInterviewers ?? false,
        interviewFormat: (data.interviewFormat ?? 'LIVE_VIDEO') as InterviewFormat,
        defaultDuration: data.defaultDuration ?? 60,
        requiresInterviewer: data.requiresInterviewer ?? true,
        autoScheduleWindowDays: data.autoScheduleWindowDays,
        availableTimeSlots: data.availableTimeSlots,
        bufferTimeMinutes: data.bufferTimeMinutes,
        calendarIntegration: data.calendarIntegration,
        autoRescheduleOnNoShow: data.autoRescheduleOnNoShow ?? false,
        autoRescheduleOnCancel: data.autoRescheduleOnCancel ?? false,
        useCustomCriteria: data.useCustomCriteria ?? false,
        ratingCriteria: data.ratingCriteria,
        passThreshold: data.passThreshold,
        scoringMethod: data.scoringMethod ? (data.scoringMethod as ScoringMethod) : null,
        autoMoveOnPass: data.autoMoveOnPass ?? false,
        passCriteria: data.passCriteria ? (data.passCriteria as PassCriteria) : null,
        nextRoundOnPassId: data.nextRoundOnPassId,
        autoRejectOnFail: data.autoRejectOnFail ?? false,
        failCriteria: data.failCriteria ? (data.failCriteria as FailCriteria) : null,
        rejectRoundId: data.rejectRoundId,
        requiresManualReview: data.requiresManualReview ?? true,
        templateId: data.templateId,
        questions: data.questions,
        agenda: data.agenda,
        assignedInterviewerIds: data.assignedInterviewerIds || [],
      },
    });

    return config;
  }

  static async update(
    jobRoundId: string,
    data: Partial<Omit<InterviewConfigurationData, 'id' | 'jobRoundId' | 'createdAt' | 'updatedAt'>>
  ): Promise<InterviewConfigurationData | null> {
    // Type cast enum fields for Prisma - handle them separately
    const updateData: any = {};
    
    // Copy all fields except enums
    if (data.enabled !== undefined) updateData.enabled = data.enabled;
    if (data.autoSchedule !== undefined) updateData.autoSchedule = data.autoSchedule;
    if (data.requireBeforeProgression !== undefined) updateData.requireBeforeProgression = data.requireBeforeProgression;
    if (data.requireAllInterviewers !== undefined) updateData.requireAllInterviewers = data.requireAllInterviewers;
    if (data.defaultDuration !== undefined) updateData.defaultDuration = data.defaultDuration;
    if (data.requiresInterviewer !== undefined) updateData.requiresInterviewer = data.requiresInterviewer;
    if (data.autoScheduleWindowDays !== undefined) updateData.autoScheduleWindowDays = data.autoScheduleWindowDays;
    if (data.availableTimeSlots !== undefined) updateData.availableTimeSlots = data.availableTimeSlots;
    if (data.bufferTimeMinutes !== undefined) updateData.bufferTimeMinutes = data.bufferTimeMinutes;
    if (data.calendarIntegration !== undefined) updateData.calendarIntegration = data.calendarIntegration;
    if (data.autoRescheduleOnNoShow !== undefined) updateData.autoRescheduleOnNoShow = data.autoRescheduleOnNoShow;
    if (data.autoRescheduleOnCancel !== undefined) updateData.autoRescheduleOnCancel = data.autoRescheduleOnCancel;
    if (data.useCustomCriteria !== undefined) updateData.useCustomCriteria = data.useCustomCriteria;
    if (data.ratingCriteria !== undefined) updateData.ratingCriteria = data.ratingCriteria;
    if (data.passThreshold !== undefined) updateData.passThreshold = data.passThreshold;
    if (data.autoMoveOnPass !== undefined) updateData.autoMoveOnPass = data.autoMoveOnPass;
    if (data.nextRoundOnPassId !== undefined) updateData.nextRoundOnPassId = data.nextRoundOnPassId;
    if (data.autoRejectOnFail !== undefined) updateData.autoRejectOnFail = data.autoRejectOnFail;
    if (data.rejectRoundId !== undefined) updateData.rejectRoundId = data.rejectRoundId;
    if (data.requiresManualReview !== undefined) updateData.requiresManualReview = data.requiresManualReview;
    if (data.templateId !== undefined) updateData.templateId = data.templateId;
    if (data.questions !== undefined) updateData.questions = data.questions;
    if (data.agenda !== undefined) updateData.agenda = data.agenda;
    if (data.assignedInterviewerIds !== undefined) updateData.assignedInterviewerIds = data.assignedInterviewerIds;
    
    // Handle enum fields with proper type casting
    if (data.interviewFormat !== undefined) {
      updateData.interviewFormat = data.interviewFormat as InterviewFormat;
    }
    if (data.scoringMethod !== undefined) {
      updateData.scoringMethod = data.scoringMethod ? (data.scoringMethod as ScoringMethod) : null;
    }
    if (data.passCriteria !== undefined) {
      updateData.passCriteria = data.passCriteria ? (data.passCriteria as PassCriteria) : null;
    }
    if (data.failCriteria !== undefined) {
      updateData.failCriteria = data.failCriteria ? (data.failCriteria as FailCriteria) : null;
    }
    
    updateData.updatedAt = new Date();

    const config = await prisma.interviewConfiguration.update({
      where: { jobRoundId },
      data: updateData,
    });

    return config;
  }

  static async delete(jobRoundId: string): Promise<void> {
    await prisma.interviewConfiguration.delete({
      where: { jobRoundId },
    });
  }
}
