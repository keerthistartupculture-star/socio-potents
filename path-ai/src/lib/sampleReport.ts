// Fixed example report used by the public /report/sample page and for previewing the PDF layout.
// Shaped exactly like the reportJson that reportService.generateReport persists.

export const SAMPLE_REPORT = {
  meta: {
    assessmentId: 'sample-0000-report',
    userId: 'sample',
    studentName: 'Aarav Sharma',
    assessmentDate: '2026-09-28T10:30:00.000Z',
    assessmentType: 'BIG_FIVE' as const,
    educationLevel: 'CLASS_10',
    reportVersion: '2.0.0',
    audience: 'PARENT' as const,
    isMinor: true,
  },
  executiveSummary:
    'In his answers, Aarav came across as curious and creative, and keen to understand how things work. He described being kind to friends and enjoying teamwork, and said he likes seeing ideas as pictures and diagrams. Career areas that draw on design, technology and science may be worth exploring.',
  personalityAnalysis:
    'Aarav usually asks lots of "why" and "how" questions and enjoys finding his own way to solve a problem. He gets along easily with classmates and is often the one who helps a friend who is stuck. He enjoys some time with people but also needs quiet time to recharge, especially after a busy school day. He can feel nervous before big exams, but he calms down once he has a plan.',
  personalityProfile: {
    framework: 'BIG_FIVE' as const,
    bigFive: {
      OPENNESS: { score: 84, confidence: 0.8 },
      CONSCIENTIOUSNESS: { score: 58, confidence: 0.7 },
      EXTRAVERSION: { score: 46, confidence: 0.7 },
      AGREEABLENESS: { score: 76, confidence: 0.75 },
      NEUROTICISM: { score: 44, confidence: 0.6 },
    },
    confidenceOverall: 0.71,
  },
  naturalStrengths: [
    'Creative ideas — described coming up with new ways to do school projects',
    'Curious — said he enjoys science experiments and figuring out how gadgets work',
    'Team player — described helping classmates and sharing ideas in group work',
    'Big-picture thinking — likes spotting how things connect',
  ],
  developmentAreas: [
    'Keeping a steady study routine instead of last-minute revision',
    'Staying calm before exams — a simple plan helps a lot',
    'Speaking up in larger groups to share his good ideas',
  ],
  learningStyle: {
    type: 'Study ideas to try',
    description:
      'Aarav said he enjoys seeing ideas as diagrams, mind-maps and videos, so those are good methods to try first. Writing short notes in his own words is worth trying too. Mixing methods usually works best, so these are starting points rather than rules.',
    study_tips: [
      'Turn each chapter into a mind-map or flowchart before memorising',
      'Watch a short explainer video, then redraw the idea from memory',
      'Write a 5-line summary in his own words after each chapter',
      'Study in 25-minute blocks with short movement breaks',
    ],
  },
  parentTips: [
    'Ask Aarav to draw or explain what he learned today — teaching it back helps it stick',
    'Keep a wall calendar for tests and homework so he can see what is coming',
    'Give him simple building or science kits instead of only books for gifts',
    'Before exams, help him make a small day-by-day plan — it reduces worry',
    'Praise his effort and creative ideas, not just his marks',
  ],
  workStudyStyle: {
    how_they_learn: 'Said he enjoys learning with pictures, diagrams and videos.',
    how_they_solve_problems: 'Tries creative ideas first, then checks what works.',
    how_they_communicate: 'Friendly and clear with small groups; quieter in big groups.',
    how_they_work_with_others: 'A helpful team member who keeps the group friendly.',
    how_they_make_decisions: 'Thinks about how choices affect others before deciding.',
  },
  careerMatches: [
    {
      careerId: 'c1',
      title: 'Product / UX Designer',
      category: 'Design & Creative',
      matchScore: 88,
      reasoning: { whyItFits: 'The answers showed a leaning towards curiosity and new ideas, and caring how people feel — both often used in design work.' },
      skillGaps: ['Sketching', 'Basic design tools'],
      educationPathway: [],
      entryLevelRoles: [],
    },
    {
      careerId: 'c2',
      title: 'Robotics Engineer',
      category: 'Science & Technology',
      matchScore: 82,
      reasoning: { whyItFits: 'Draws on the curiosity about how things work that came through in his answers.' },
      skillGaps: ['Maths practice', 'Basic coding'],
      educationPathway: [],
      entryLevelRoles: [],
    },
    {
      careerId: 'c3',
      title: 'Architect',
      category: 'Design & Creative',
      matchScore: 78,
      reasoning: { whyItFits: 'Draws on imagination and big-picture thinking, which came through in his answers.' },
      skillGaps: ['Drawing', 'Geometry'],
      educationPathway: [],
      entryLevelRoles: [],
    },
    {
      careerId: 'c4',
      title: 'Environmental Scientist',
      category: 'Science & Technology',
      matchScore: 72,
      reasoning: { whyItFits: 'Draws on curiosity and wanting to help others, both of which he described.' },
      skillGaps: ['Biology basics', 'Field projects'],
      educationPathway: [],
      entryLevelRoles: [],
    },
    {
      careerId: 'c5',
      title: 'Teacher / Educator',
      category: 'Education & Social',
      matchScore: 64,
      reasoning: { whyItFits: 'Draws on helping others and teamwork, which came through in his answers.' },
      skillGaps: ['Public speaking'],
      educationPathway: [],
      entryLevelRoles: [],
    },
  ],
  careerRoadmap: [
    'Class 10',
    'Pick a Class 11/12 stream that keeps these options open',
    'Relevant undergraduate degree',
    'Build core skills',
    'Internships',
    'First role in/around Product / UX Designer',
  ],
  suggestedSkills: ['Drawing & sketching', 'Basic coding', 'Maths confidence', 'Presenting ideas', 'Time planning'],
  suggestedActivities: [
    'Join the school science or robotics club',
    'Try a free beginner design course (e.g. making posters or app screens)',
    'Build a small model or Lego project and explain how it works',
    'Visit a design studio, lab or college open day',
  ],
  careerRisksConsiderations:
    'Aarav is still young and his interests will grow and change — that is completely normal. Keep options open in Class 11 by choosing subjects that support both design and science.',
  actionPlan: {
    day_30: ['Read about the top 3 career suggestions together', 'Set up a weekly study timetable'],
    day_60: ['Join one club or short course linked to design or science', 'Talk to someone who works in a suggested field'],
    day_90: ['Finish a small project to show at school', 'Discuss Class 11 subject choices with his teacher'],
  },
  disclaimer:
    'This report is a guide for exploring strengths and career interests. It is not a medical or psychological diagnosis, and it should be used alongside conversations with teachers, counsellors and your child.',
};
