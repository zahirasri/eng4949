
export interface ScheduleEntry {
  id: string;
  studentName: string;
  supervisor: string;
  examiner1: string;
  examiner2: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  projectTitle?: string;
}

export interface LecturerStats {
  totalPresentations: number;
  roles: {
    supervisor: number;
    examiner: number;
  };
  locations: string[];
}

export enum AppView {
  LANDING = 'LANDING',
  DASHBOARD = 'DASHBOARD',
  ADMIN = 'ADMIN'
}
