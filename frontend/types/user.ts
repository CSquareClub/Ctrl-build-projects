export interface User {
  id: string;
  name: string;
  gender: string;
  university: string;
  skills: string[];
  level: 'beginner' | 'intermediate' | 'advanced';
  interests: string[];
  linkedin: string;
  email: string;
}
