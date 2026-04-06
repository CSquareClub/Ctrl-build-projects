import { User } from '@/types/user';

function intersection(a: string[], b: string[]) {
  return a.filter((x) => b.includes(x));
}

function union(a: string[], b: string[]) {
  return Array.from(new Set([...a, ...b]));
}

export function calculateMatch(userA: User, userB: User) {
  // skills = 50%
  const commonSkills = intersection(userA.skills, userB.skills);
  const allSkills = union(userA.skills, userB.skills);

  const skillScore =
    allSkills.length === 0 ? 0 : commonSkills.length / allSkills.length;

  const complement =
    allSkills.length === 0
      ? 0
      : (allSkills.length - commonSkills.length) / allSkills.length;

  const finalSkill = 0.7 * skillScore + 0.3 * complement;

  // experience = 20%
  const levels = ['beginner', 'intermediate', 'advanced'];

  const diff = Math.abs(
    levels.indexOf(userA.level) - levels.indexOf(userB.level),
  );

  let experienceScore = 0.4;
  if (diff === 0) experienceScore = 1;
  else if (diff === 1) experienceScore = 0.7;

  // interest = 15%
  const commonInterests = intersection(userA.interests, userB.interests);
  const allInterests = union(userA.interests, userB.interests);

  const interestScore =
    allInterests.length === 0
      ? 0
      : commonInterests.length / allInterests.length;

  const rawScore = finalSkill * 50 + experienceScore * 20 + interestScore * 15;

  const score = (rawScore / 85) * 100; // normalisise raw score since weight is 85 rn

  return {
    score: Math.round(score),
    reasons: generateReasons({
      commonSkills,
      commonInterests,
      experienceScore,
    }),
  };
}

function generateReasons(data: {
  commonSkills: string[];
  commonInterests: string[];
  experienceScore: number;
}) {
  const reasons: string[] = [];

  if (data.commonSkills.length > 0)
    reasons.push('You share key technical skills');

  if (data.commonInterests.length > 0)
    reasons.push('You have similar project interests');

  if (data.experienceScore === 1)
    reasons.push('You are at the same experience level');

  return reasons.slice(0, 3);
}
