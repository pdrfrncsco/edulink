export interface AdminUserProfile {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: 'PLATFORM_ADMIN' | 'SCHOOL_SECRETARY' | 'TEACHER' | 'STUDENT';
  school: string | null;
  school_name: string | null;
  school_domain: string | null;
  user_is_active: boolean;
  created_at: string;
}
