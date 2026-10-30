import { PrismaClient, EducationLevel } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { seedPathways } from './seedPathways';

const prisma = new PrismaClient();

const COLLEGE_PLUS: EducationLevel[] = ['CLASS_12', 'DIPLOMA', 'UNDERGRADUATE', 'POSTGRADUATE', 'WORKING_PROFESSIONAL'];

// ─────────────────────────── Big Five questions (Class 10) ───────────────────────────
// 6 scenario questions per dimension = 30 total (spec §37 requires >= 30).

const bigFiveQuestions: { dimension: string; text: string }[] = [
  // OPENNESS
  { dimension: 'OPENNESS', text: 'Your school announces an elective where you can pick any topic to explore for a month. How do you decide what to choose?' },
  { dimension: 'OPENNESS', text: 'A friend suggests trying a completely new hobby you have never even heard of. What is your first reaction?' },
  { dimension: 'OPENNESS', text: 'Your teacher gives an assignment with no fixed format — you can present it however you like. What do you do?' },
  { dimension: 'OPENNESS', text: 'You are given the option to visit a place you have never been to instead of a familiar favourite spot on a school trip. Which do you pick, and why?' },
  { dimension: 'OPENNESS', text: 'While studying, you come across an idea that contradicts what you were taught earlier. How do you handle that?' },
  { dimension: 'OPENNESS', text: 'Describe a time you daydreamed about inventing or imagining something completely new. What was it?' },
  // CONSCIENTIOUSNESS
  { dimension: 'CONSCIENTIOUSNESS', text: 'You have three assignments due the same week. Walk me through how you would plan your days.' },
  { dimension: 'CONSCIENTIOUSNESS', text: 'You finish a project two days before the deadline. What do you typically do with that extra time?' },
  { dimension: 'CONSCIENTIOUSNESS', text: 'Your room or desk gets messy during exam season. How does that affect you, and what do you do about it?' },
  { dimension: 'CONSCIENTIOUSNESS', text: 'You promised to help a friend with notes but you are also behind on your own revision. What happens next?' },
  { dimension: 'CONSCIENTIOUSNESS', text: 'A teacher gives a long-term project with no reminders along the way. How do you make sure you do not forget it?' },
  { dimension: 'CONSCIENTIOUSNESS', text: 'You realize halfway through an exam that you misread the instructions. What do you do?' },
  // EXTRAVERSION
  { dimension: 'EXTRAVERSION', text: 'It is the first day at a new school and you do not know anyone. How do you spend the lunch break?' },
  { dimension: 'EXTRAVERSION', text: 'After a long, tiring week of classes and activities, how do you prefer to spend your weekend?' },
  { dimension: 'EXTRAVERSION', text: 'You are asked to present your project to the whole class instead of just your group. How do you feel about that?' },
  { dimension: 'EXTRAVERSION', text: 'A big group of classmates invites you to a spontaneous outing on a day you had planned to relax alone. What do you do?' },
  { dimension: 'EXTRAVERSION', text: 'During a class discussion, do you usually speak up first, wait and listen, or something in between? Describe a recent example.' },
  { dimension: 'EXTRAVERSION', text: 'You just had an exciting day. Who is the first person you want to tell about it, and how (call, text, in person)?' },
  // AGREEABLENESS
  { dimension: 'AGREEABLENESS', text: 'You have a school project and your teammates are not completing their work. What would you most likely do?' },
  { dimension: 'AGREEABLENESS', text: 'Two of your close friends are arguing and both want you to take their side. How do you respond?' },
  { dimension: 'AGREEABLENESS', text: 'A classmate you do not know well asks to copy your homework right before class. What do you say or do?' },
  { dimension: 'AGREEABLENESS', text: 'You strongly disagree with a decision your group made for a class project. How do you bring it up?' },
  { dimension: 'AGREEABLENESS', text: 'You notice a new student sitting alone during lunch. What, if anything, do you do?' },
  { dimension: 'AGREEABLENESS', text: 'A friend gives you feedback on your work that feels a bit harsh. How do you usually react?' },
  // NEUROTICISM (framed as emotional stability)
  { dimension: 'NEUROTICISM', text: 'You just got a lower grade than expected on a test you studied hard for. What goes through your mind right after?' },
  { dimension: 'NEUROTICISM', text: 'You have an important event tomorrow (exam, match, performance) and it is the night before. How are you feeling and what do you do?' },
  { dimension: 'NEUROTICISM', text: 'Something unexpected disrupts your plans for the day — like a cancelled class or a lost item. How do you usually react in the moment?' },
  { dimension: 'NEUROTICISM', text: 'A teacher publicly points out a mistake you made in front of the class. How do you feel for the rest of the day?' },
  { dimension: 'NEUROTICISM', text: 'You are waiting for exam results and you do not know how you did. How do you spend that waiting period?' },
  { dimension: 'NEUROTICISM', text: 'Think about the last time you felt really stressed about school. What helped you get through it, if anything?' },
];

// ─────────────────────────── MBTI questions (Class 12 / College / Professional) ───────────────────────────
// 10 scenario questions per dichotomy = 40 total (spec §37 requires >= 40).
// signalHint: which pole a "yes/typical" answer leans toward, used only as seed metadata for admins.

// audience: 'students' = school/college wording (Class 12 to postgraduate only); 'professionals' =
// the workplace version of such a question. No audience = suitable for everyone.
const STUDENT_LEVELS: EducationLevel[] = ['CLASS_12', 'DIPLOMA', 'UNDERGRADUATE', 'POSTGRADUATE'];
const mbtiQuestions: { dimension: string; text: string; audience?: 'students' | 'professionals' }[] = [
  // E / I
  { dimension: 'E_I', text: 'After a full day of classes or meetings, what genuinely recharges you — being around people, or having time alone?' },
  { dimension: 'E_I', text: 'You are assigned to a new group project team. Do you prefer to speak up early to get to know people, or observe first before contributing?' },
  { dimension: 'E_I', text: 'When you are stuck on a tough problem, do you usually think it through out loud with someone, or work it out silently first?' },
  { dimension: 'E_I', text: 'Describe your ideal Saturday — who is it with, and how much of it is planned versus spontaneous?' },
  { dimension: 'E_I', text: 'In a study group, are you more likely to lead the discussion or contribute when directly asked?', audience: 'students' },
  { dimension: 'E_I', text: 'You have been invited to two events on the same night — a large gathering, or a small get-together with 2-3 close friends. Which pulls you more, and why?' },
  { dimension: 'E_I', text: 'How do you feel after spending an entire day mostly by yourself — energized, neutral, or drained?' },
  { dimension: 'E_I', text: 'When you have exciting news, do you want to share it immediately with several people, or process it yourself first?' },
  { dimension: 'E_I', text: 'In class or meetings, do ideas tend to come to you as you speak, or after you have had quiet time to think?' },
  { dimension: 'E_I', text: 'If you had to choose a work style permanently, would you pick a bustling open office or a quiet independent setup? Why?' },
  // S / N
  { dimension: 'S_N', text: 'When learning something new, do you prefer concrete step-by-step instructions, or understanding the big-picture concept first?' },
  { dimension: 'S_N', text: 'You are reading a case study for class. Do you focus more on the specific facts and details, or on the underlying patterns and possibilities?', audience: 'students' },
  { dimension: 'S_N', text: 'When planning a project, do you trust past experience and proven methods, or are you drawn to trying a novel approach?' },
  { dimension: 'S_N', text: 'A professor asks a hypothetical "what if" question with no clear answer. How do you feel about engaging with it?', audience: 'students' },
  { dimension: 'S_N', text: 'Do you tend to notice small practical details others miss, or big-picture connections others miss? Give an example.' },
  { dimension: 'S_N', text: 'When giving directions or explaining something, do you give precise, literal steps, or a general sense/analogy?' },
  { dimension: 'S_N', text: 'You are choosing between two courses: one very structured with clear syllabus, one exploratory and open-ended. Which appeals more?', audience: 'students' },
  { dimension: 'S_N', text: 'When solving a problem, do you rely more on what has worked before, or on intuition about what might work?' },
  { dimension: 'S_N', text: 'Do you find yourself more interested in how things work in practice, or in the theory behind why they work?' },
  { dimension: 'S_N', text: 'Think of a recent decision — did you rely mainly on concrete facts and past data, or on a hunch/sense of where things were headed?' },
  // T / F
  { dimension: 'T_F', text: 'Two friends both want feedback on their work. One wants pure honesty, the other wants gentle encouragement. How do you handle giving feedback generally?' },
  { dimension: 'T_F', text: 'When making an important decision, do you rely more on logical analysis, or on how it will affect the people involved?' },
  { dimension: 'T_F', text: 'A teammate makes a mistake that costs the group marks. How do you address it with them?', audience: 'students' },
  { dimension: 'T_F', text: 'You disagree with a friend about something factual. Do you push to establish who is correct, or prioritize keeping the conversation comfortable?' },
  { dimension: 'T_F', text: 'When resolving a conflict, do you focus first on being fair and consistent, or on how each person feels?' },
  { dimension: 'T_F', text: 'A group needs to cut one member from a project team for performance reasons. How would you approach that conversation?' },
  { dimension: 'T_F', text: 'Do you find it easier to point out flaws in an argument, or to sense when someone is emotionally struggling? Which comes more naturally?' },
  { dimension: 'T_F', text: 'When you receive criticism, do you evaluate it mainly on its logical merit, or on the tone/intent behind it?' },
  { dimension: 'T_F', text: 'In a debate or discussion, are you more energized by finding the most logical position, or by making sure everyone feels heard?' },
  { dimension: 'T_F', text: 'You have to choose between a fair-but-unpopular decision and a popular-but-inconsistent one. Which way do you lean?' },
  // J / P
  { dimension: 'J_P', text: 'How far in advance do you usually plan for a big exam or deadline — weeks ahead, or closer to the date?', audience: 'students' },
  { dimension: 'J_P', text: 'Your schedule for the week just got disrupted by something unplanned. How does that make you feel, and what do you do?' },
  { dimension: 'J_P', text: 'Do you prefer having a clear to-do list and sticking to it, or keeping options open and deciding as you go?' },
  { dimension: 'J_P', text: 'When packing for a trip, do you plan and pack days ahead, or do it last minute and adapt as needed?' },
  { dimension: 'J_P', text: 'A project has a flexible deadline. Do you finish early to have it done, or use the full time available?' },
  { dimension: 'J_P', text: 'How do you feel when plans change at the last minute — mildly annoyed and needing to re-plan, or easily adaptable?' },
  { dimension: 'J_P', text: 'When starting a big assignment, do you outline the whole thing first, or dive in and figure it out as you go?', audience: 'students' },
  { dimension: 'J_P', text: 'Do you like closing out decisions quickly once you have enough information, or keep exploring options as long as possible?' },
  { dimension: 'J_P', text: 'Describe your workspace or bag right now — organized and put together, or more of a flexible, evolving mix?' },
  { dimension: 'J_P', text: 'When given open-ended free time, do you usually make a plan for it, or let it unfold spontaneously?' },
  // Workplace versions of the student-only questions above. Appended (not inserted) so existing
  // question codes keep pointing at the same questions.
  { dimension: 'E_I', text: 'In a team meeting, are you more likely to lead the discussion or contribute when directly asked?', audience: 'professionals' },
  { dimension: 'S_N', text: 'You are reading a report at work. Do you focus more on the specific facts and figures, or on the underlying patterns and possibilities?', audience: 'professionals' },
  { dimension: 'S_N', text: 'Your manager asks a hypothetical "what if" question with no clear answer. How do you feel about engaging with it?', audience: 'professionals' },
  { dimension: 'S_N', text: 'You are choosing between two roles: one with clearly defined responsibilities, one open-ended where you shape the job. Which appeals more?', audience: 'professionals' },
  { dimension: 'T_F', text: 'A colleague makes a mistake that delays a team deliverable. How do you address it with them?', audience: 'professionals' },
  { dimension: 'J_P', text: 'How far in advance do you usually plan for a big work deadline — weeks ahead, or closer to the date?', audience: 'professionals' },
  { dimension: 'J_P', text: 'When starting a big piece of work, do you outline the whole thing first, or dive in and figure it out as you go?', audience: 'professionals' },
];

// ─────────────────────────── Careers ───────────────────────────
// bigFive: ideal score 0-1 per dimension used for Class 10 matching.
// mbti: weight 0-1 per MBTI type used for Class 12+/College/Professional matching.

interface CareerSeed {
  category: string;
  title: string;
  description: string;
  bigFive: Record<string, number>;
  mbti: Record<string, number>;
  skillsRequired: string[];
  educationPathway: string[];
  entryLevelRoles: string[];
  growthPath: string[];
  workEnvironment: string;
  challenges: string;
  futureOutlook: string;
}

const careers: CareerSeed[] = [
  // Technology
  { category: 'Technology', title: 'Software Developer', description: 'Designs, builds, and maintains applications and systems.', bigFive: { OPENNESS: 0.75, CONSCIENTIOUSNESS: 0.7, EXTRAVERSION: 0.4, AGREEABLENESS: 0.55, NEUROTICISM: 0.3 }, mbti: { INTJ: 0.9, INTP: 0.9, ISTJ: 0.7, ENTP: 0.75 }, skillsRequired: ['Programming', 'Problem solving', 'Debugging', 'Version control'], educationPathway: ['Class 12 (PCM)', 'B.Tech/BCA/BSc CS', 'Coding bootcamp / self-study'], entryLevelRoles: ['Junior Developer', 'Software Engineer I'], growthPath: ['Senior Developer', 'Tech Lead', 'Engineering Manager / Staff Engineer'], workEnvironment: 'Office or remote, collaborative teams, sprint-based work.', challenges: 'Keeping up with fast-changing technologies; debugging complex systems.', futureOutlook: 'Strong demand, especially with AI-assisted development skills.' },
  { category: 'Technology', title: 'Data Analyst', description: 'Turns raw data into actionable insights through analysis and visualization.', bigFive: { OPENNESS: 0.65, CONSCIENTIOUSNESS: 0.75, EXTRAVERSION: 0.4, AGREEABLENESS: 0.5, NEUROTICISM: 0.3 }, mbti: { ISTJ: 0.85, INTJ: 0.8, ISTP: 0.7, ESTJ: 0.65 }, skillsRequired: ['SQL', 'Excel', 'Data visualization', 'Statistics'], educationPathway: ['Undergraduate in any quantitative field', 'Data analytics certification'], entryLevelRoles: ['Junior Data Analyst', 'Business Analyst'], growthPath: ['Senior Analyst', 'Analytics Manager', 'Data Scientist'], workEnvironment: 'Office/remote, cross-functional collaboration with business teams.', challenges: 'Working with messy or incomplete data; communicating findings clearly.', futureOutlook: 'Growing demand across nearly every industry.' },
  { category: 'Technology', title: 'Data Scientist', description: 'Builds statistical and machine learning models to solve business problems.', bigFive: { OPENNESS: 0.8, CONSCIENTIOUSNESS: 0.75, EXTRAVERSION: 0.35, AGREEABLENESS: 0.5, NEUROTICISM: 0.3 }, mbti: { INTJ: 0.9, INTP: 0.85, ENTJ: 0.6 }, skillsRequired: ['Python/R', 'Machine learning', 'Statistics', 'Data storytelling'], educationPathway: ['B.Tech/BSc + Master\'s (preferred)', 'Specialized ML certifications'], entryLevelRoles: ['Data Science Intern', 'Junior Data Scientist'], growthPath: ['Senior Data Scientist', 'ML Lead', 'Head of Data Science'], workEnvironment: 'Office/remote, research-oriented, cross-functional.', challenges: 'Model interpretability; translating technical results for non-technical stakeholders.', futureOutlook: 'High demand, especially with generative AI adoption.' },
  { category: 'Technology', title: 'AI/ML Engineer', description: 'Deploys and scales machine learning models into production systems.', bigFive: { OPENNESS: 0.8, CONSCIENTIOUSNESS: 0.75, EXTRAVERSION: 0.35, AGREEABLENESS: 0.45, NEUROTICISM: 0.3 }, mbti: { INTJ: 0.9, INTP: 0.85, ISTJ: 0.6 }, skillsRequired: ['Python', 'Deep learning frameworks', 'MLOps', 'System design'], educationPathway: ['B.Tech CS/AI', 'Specialization in ML/AI'], entryLevelRoles: ['ML Engineer I', 'Applied AI Engineer'], growthPath: ['Senior ML Engineer', 'AI Architect', 'Head of AI'], workEnvironment: 'Office/remote, fast-moving research-to-production teams.', challenges: 'Rapidly evolving field; production reliability of ML systems.', futureOutlook: 'Very high demand and rapid growth.' },
  { category: 'Technology', title: 'Cybersecurity Analyst', description: 'Protects systems and data from security threats and breaches.', bigFive: { OPENNESS: 0.6, CONSCIENTIOUSNESS: 0.85, EXTRAVERSION: 0.35, AGREEABLENESS: 0.4, NEUROTICISM: 0.25 }, mbti: { ISTJ: 0.85, INTJ: 0.8, ISTP: 0.75 }, skillsRequired: ['Network security', 'Risk assessment', 'Incident response', 'Ethical hacking'], educationPathway: ['B.Tech/BSc IT/CS', 'Security certifications (CEH, Security+)'], entryLevelRoles: ['SOC Analyst', 'Security Associate'], growthPath: ['Security Engineer', 'Security Architect', 'CISO'], workEnvironment: 'Office, often on-call for incident response.', challenges: 'High-stakes, constantly evolving threat landscape.', futureOutlook: 'Consistently strong demand as digital threats grow.' },
  { category: 'Technology', title: 'Cloud Engineer', description: 'Designs and manages cloud infrastructure and deployment pipelines.', bigFive: { OPENNESS: 0.65, CONSCIENTIOUSNESS: 0.75, EXTRAVERSION: 0.35, AGREEABLENESS: 0.45, NEUROTICISM: 0.3 }, mbti: { ISTJ: 0.8, INTJ: 0.8, ISTP: 0.7 }, skillsRequired: ['AWS/Azure/GCP', 'Infrastructure as code', 'Networking', 'Automation'], educationPathway: ['B.Tech/BCA', 'Cloud certifications'], entryLevelRoles: ['Cloud Support Engineer', 'DevOps Intern'], growthPath: ['Cloud Engineer', 'Cloud Architect', 'Head of Infrastructure'], workEnvironment: 'Office/remote, infrastructure and reliability focused.', challenges: 'Managing cost and reliability at scale.', futureOutlook: 'Strong ongoing demand as cloud adoption grows.' },
  { category: 'Technology', title: 'UI/UX Designer', description: 'Designs intuitive, user-centered digital product experiences.', bigFive: { OPENNESS: 0.85, CONSCIENTIOUSNESS: 0.6, EXTRAVERSION: 0.5, AGREEABLENESS: 0.6, NEUROTICISM: 0.3 }, mbti: { INFP: 0.8, ENFP: 0.8, ISFP: 0.75, INFJ: 0.7 }, skillsRequired: ['Wireframing', 'User research', 'Prototyping tools', 'Visual design'], educationPathway: ['Design degree or bootcamp', 'Portfolio-driven'], entryLevelRoles: ['Junior UX Designer', 'UI Designer'], growthPath: ['Senior Designer', 'Design Lead', 'Head of Design'], workEnvironment: 'Office/remote, close collaboration with product & engineering.', challenges: 'Balancing user needs with business/technical constraints.', futureOutlook: 'Steady demand as digital products proliferate.' },
  { category: 'Technology', title: 'Product Manager', description: 'Defines product vision and coordinates teams to build and ship it.', bigFive: { OPENNESS: 0.75, CONSCIENTIOUSNESS: 0.7, EXTRAVERSION: 0.65, AGREEABLENESS: 0.55, NEUROTICISM: 0.3 }, mbti: { ENTJ: 0.85, ENTP: 0.8, INTJ: 0.6, ESTJ: 0.6 }, skillsRequired: ['Prioritization', 'Stakeholder communication', 'Data-driven decision making', 'Roadmapping'], educationPathway: ['Any bachelor\'s degree', 'MBA (helpful, not required)'], entryLevelRoles: ['Associate Product Manager'], growthPath: ['Product Manager', 'Senior PM', 'VP Product'], workEnvironment: 'Office/remote, cross-functional leadership without direct authority.', challenges: 'Aligning competing stakeholder priorities.', futureOutlook: 'High demand across tech-enabled companies.' },
  { category: 'Technology', title: 'DevOps Engineer', description: 'Bridges development and operations to enable fast, reliable software delivery.', bigFive: { OPENNESS: 0.6, CONSCIENTIOUSNESS: 0.8, EXTRAVERSION: 0.4, AGREEABLENESS: 0.5, NEUROTICISM: 0.3 }, mbti: { ISTJ: 0.8, INTJ: 0.75, ISTP: 0.7 }, skillsRequired: ['CI/CD', 'Containerization', 'Scripting', 'Monitoring'], educationPathway: ['B.Tech/BCA', 'DevOps certifications'], entryLevelRoles: ['DevOps Intern', 'Build & Release Engineer'], growthPath: ['DevOps Engineer', 'SRE Lead', 'Head of Platform'], workEnvironment: 'Office/remote, on-call rotations for reliability.', challenges: 'Balancing speed of delivery with system stability.', futureOutlook: 'Strong and growing demand.' },

  // Business
  { category: 'Business', title: 'Business Analyst', description: 'Bridges business needs and technical solutions through analysis.', bigFive: { OPENNESS: 0.6, CONSCIENTIOUSNESS: 0.75, EXTRAVERSION: 0.55, AGREEABLENESS: 0.55, NEUROTICISM: 0.3 }, mbti: { ISTJ: 0.75, ENTJ: 0.7, ESTJ: 0.75 }, skillsRequired: ['Requirements gathering', 'Process mapping', 'Communication', 'Excel/SQL'], educationPathway: ['Bachelor\'s in business/commerce/engineering'], entryLevelRoles: ['Junior Business Analyst'], growthPath: ['Senior BA', 'Product Owner', 'BA Manager'], workEnvironment: 'Office/remote, liaison between business and tech teams.', challenges: 'Reconciling conflicting stakeholder requirements.', futureOutlook: 'Consistently in demand across industries.' },
  { category: 'Business', title: 'Marketing Manager', description: 'Plans and executes strategies to build brand and drive growth.', bigFive: { OPENNESS: 0.75, CONSCIENTIOUSNESS: 0.6, EXTRAVERSION: 0.75, AGREEABLENESS: 0.55, NEUROTICISM: 0.35 }, mbti: { ENFP: 0.85, ENTP: 0.8, ESFP: 0.6 }, skillsRequired: ['Campaign strategy', 'Content creation', 'Analytics', 'Branding'], educationPathway: ['Bachelor\'s in marketing/business', 'Digital marketing certifications'], entryLevelRoles: ['Marketing Associate'], growthPath: ['Marketing Manager', 'Head of Marketing', 'CMO'], workEnvironment: 'Office/remote, fast-paced, campaign-driven.', challenges: 'Proving ROI; keeping up with changing platforms/trends.', futureOutlook: 'Steady demand, shifting heavily toward digital.' },
  { category: 'Business', title: 'Sales Executive', description: 'Builds relationships and closes deals to drive revenue.', bigFive: { OPENNESS: 0.55, CONSCIENTIOUSNESS: 0.6, EXTRAVERSION: 0.85, AGREEABLENESS: 0.6, NEUROTICISM: 0.35 }, mbti: { ESFJ: 0.8, ESTP: 0.8, ENFJ: 0.7 }, skillsRequired: ['Negotiation', 'Relationship building', 'Persuasive communication', 'CRM tools'], educationPathway: ['Any bachelor\'s degree'], entryLevelRoles: ['Sales Development Representative'], growthPath: ['Account Executive', 'Sales Manager', 'VP Sales'], workEnvironment: 'Field/office/remote, target-driven.', challenges: 'Handling rejection; meeting quotas consistently.', futureOutlook: 'Consistently in demand across every industry.' },
  { category: 'Business', title: 'HR Manager', description: 'Manages recruitment, employee relations, and organizational culture.', bigFive: { OPENNESS: 0.6, CONSCIENTIOUSNESS: 0.7, EXTRAVERSION: 0.6, AGREEABLENESS: 0.8, NEUROTICISM: 0.3 }, mbti: { ESFJ: 0.85, ENFJ: 0.85, ISFJ: 0.7 }, skillsRequired: ['Recruitment', 'Conflict resolution', 'Employment law basics', 'Communication'], educationPathway: ['Bachelor\'s in HR/psychology/business', 'HR certifications'], entryLevelRoles: ['HR Executive'], growthPath: ['HR Manager', 'HR Business Partner', 'CHRO'], workEnvironment: 'Office, people-facing throughout the day.', challenges: 'Balancing employee advocacy with business needs.', futureOutlook: 'Steady demand as organizations grow.' },
  { category: 'Business', title: 'Finance Analyst', description: 'Analyzes financial data to guide business and investment decisions.', bigFive: { OPENNESS: 0.5, CONSCIENTIOUSNESS: 0.85, EXTRAVERSION: 0.4, AGREEABLENESS: 0.45, NEUROTICISM: 0.25 }, mbti: { ISTJ: 0.85, INTJ: 0.75, ESTJ: 0.7 }, skillsRequired: ['Financial modeling', 'Excel', 'Accounting principles', 'Analytical thinking'], educationPathway: ['B.Com/BBA', 'CFA/CA (advanced)'], entryLevelRoles: ['Finance Analyst I'], growthPath: ['Senior Analyst', 'Finance Manager', 'CFO'], workEnvironment: 'Office, deadline- and detail-driven.', challenges: 'High precision requirements; periods of high pressure (closings, audits).', futureOutlook: 'Stable, steady demand.' },
  { category: 'Business', title: 'Operations Manager', description: 'Ensures day-to-day business processes run efficiently.', bigFive: { OPENNESS: 0.5, CONSCIENTIOUSNESS: 0.85, EXTRAVERSION: 0.55, AGREEABLENESS: 0.55, NEUROTICISM: 0.3 }, mbti: { ESTJ: 0.85, ISTJ: 0.8, ENTJ: 0.6 }, skillsRequired: ['Process optimization', 'Team coordination', 'Problem solving', 'Vendor management'], educationPathway: ['Bachelor\'s in business/operations/engineering'], entryLevelRoles: ['Operations Associate'], growthPath: ['Operations Manager', 'Head of Operations', 'COO'], workEnvironment: 'Office/on-site, hands-on problem solving.', challenges: 'Firefighting unexpected disruptions.', futureOutlook: 'Consistently needed across all industries.' },
  { category: 'Business', title: 'Management Consultant', description: 'Advises organizations on strategy and performance improvement.', bigFive: { OPENNESS: 0.75, CONSCIENTIOUSNESS: 0.75, EXTRAVERSION: 0.65, AGREEABLENESS: 0.5, NEUROTICISM: 0.3 }, mbti: { ENTJ: 0.9, INTJ: 0.8, ENTP: 0.75 }, skillsRequired: ['Structured problem solving', 'Client communication', 'Data analysis', 'Presentation'], educationPathway: ['Bachelor\'s degree (top-tier preferred)', 'MBA (for senior roles)'], entryLevelRoles: ['Business Analyst (consulting)'], growthPath: ['Consultant', 'Engagement Manager', 'Partner'], workEnvironment: 'Client-facing, high travel, project-based.', challenges: 'Long hours; frequent context switching between clients.', futureOutlook: 'Strong demand, especially in digital transformation.' },
  { category: 'Business', title: 'Entrepreneur', description: 'Builds and runs an independent business venture.', bigFive: { OPENNESS: 0.85, CONSCIENTIOUSNESS: 0.65, EXTRAVERSION: 0.7, AGREEABLENESS: 0.45, NEUROTICISM: 0.3 }, mbti: { ENTP: 0.9, ENTJ: 0.85, ESTP: 0.7 }, skillsRequired: ['Risk management', 'Resourcefulness', 'Sales', 'Leadership'], educationPathway: ['Any background; business fundamentals helpful'], entryLevelRoles: ['Founder', 'Co-founder'], growthPath: ['Small business owner', 'Scaling venture', 'Serial entrepreneur'], workEnvironment: 'Highly variable, self-directed, often high pressure.', challenges: 'Financial uncertainty; wearing many hats at once.', futureOutlook: 'High variance, but growing support ecosystem (incubators, funding).' },

  // Creative
  { category: 'Creative', title: 'Graphic Designer', description: 'Creates visual content for brands, print, and digital media.', bigFive: { OPENNESS: 0.85, CONSCIENTIOUSNESS: 0.55, EXTRAVERSION: 0.45, AGREEABLENESS: 0.55, NEUROTICISM: 0.35 }, mbti: { ISFP: 0.85, INFP: 0.8, ENFP: 0.7 }, skillsRequired: ['Design software (Adobe suite)', 'Typography', 'Branding', 'Creativity'], educationPathway: ['Design degree/diploma', 'Portfolio-based hiring'], entryLevelRoles: ['Junior Graphic Designer'], growthPath: ['Senior Designer', 'Art Director', 'Creative Director'], workEnvironment: 'Studio/agency/remote, project- and deadline-driven.', challenges: 'Subjective client feedback; tight turnaround times.', futureOutlook: 'Steady demand, evolving with AI design tools.' },
  { category: 'Creative', title: 'Content Creator', description: 'Produces engaging content across social and digital platforms.', bigFive: { OPENNESS: 0.85, CONSCIENTIOUSNESS: 0.55, EXTRAVERSION: 0.7, AGREEABLENESS: 0.5, NEUROTICISM: 0.35 }, mbti: { ENFP: 0.85, ESFP: 0.8, ENTP: 0.7 }, skillsRequired: ['Storytelling', 'Video/photo editing', 'Platform trends', 'Personal branding'], educationPathway: ['Any background; self-taught common'], entryLevelRoles: ['Content Creator', 'Social Media Associate'], growthPath: ['Established creator', 'Multi-platform creator/brand'], workEnvironment: 'Independent/remote, self-directed schedule.', challenges: 'Inconsistent income; algorithm dependency.', futureOutlook: 'Rapidly growing creator economy.' },
  { category: 'Creative', title: 'Animator', description: 'Brings characters and stories to life through motion and design.', bigFive: { OPENNESS: 0.85, CONSCIENTIOUSNESS: 0.65, EXTRAVERSION: 0.4, AGREEABLENESS: 0.5, NEUROTICISM: 0.35 }, mbti: { ISFP: 0.8, INFP: 0.75, ISTP: 0.6 }, skillsRequired: ['2D/3D animation software', 'Storyboarding', 'Timing & motion', 'Patience for detail'], educationPathway: ['Animation degree/diploma', 'Portfolio-based hiring'], entryLevelRoles: ['Junior Animator'], growthPath: ['Animator', 'Lead Animator', 'Animation Director'], workEnvironment: 'Studio/remote, project-based with tight deadlines near release.', challenges: 'Long, detail-intensive production cycles.', futureOutlook: 'Growing with gaming, streaming, and AR/VR content.' },
  { category: 'Creative', title: 'Video Editor', description: 'Assembles and refines raw footage into polished final video.', bigFive: { OPENNESS: 0.75, CONSCIENTIOUSNESS: 0.7, EXTRAVERSION: 0.35, AGREEABLENESS: 0.5, NEUROTICISM: 0.3 }, mbti: { ISTP: 0.8, ISFP: 0.75, INTP: 0.6 }, skillsRequired: ['Editing software', 'Storytelling pacing', 'Color grading', 'Sound design basics'], educationPathway: ['Film/media diploma or self-taught with portfolio'], entryLevelRoles: ['Junior Video Editor'], growthPath: ['Senior Editor', 'Post-production Lead'], workEnvironment: 'Studio/freelance/remote, deadline-driven.', challenges: 'Repetitive revisions; tight release schedules.', futureOutlook: 'Strong demand driven by video-first content.' },
  { category: 'Creative', title: 'UX Writer', description: 'Crafts clear, user-friendly copy for digital products.', bigFive: { OPENNESS: 0.75, CONSCIENTIOUSNESS: 0.65, EXTRAVERSION: 0.4, AGREEABLENESS: 0.55, NEUROTICISM: 0.3 }, mbti: { INFP: 0.8, INFJ: 0.75, INTP: 0.6 }, skillsRequired: ['Writing clarity', 'User empathy', 'Collaboration with designers', 'Style guide adherence'], educationPathway: ['Any bachelor\'s degree with strong writing skills'], entryLevelRoles: ['Junior UX Writer', 'Content Designer'], growthPath: ['UX Writer', 'Content Design Lead'], workEnvironment: 'Office/remote, close work with product/design teams.', challenges: 'Balancing brand voice with usability.', futureOutlook: 'Growing as products prioritize user experience.' },
  { category: 'Creative', title: 'Writer / Author', description: 'Writes long- or short-form content, fiction, or journalism.', bigFive: { OPENNESS: 0.9, CONSCIENTIOUSNESS: 0.6, EXTRAVERSION: 0.35, AGREEABLENESS: 0.5, NEUROTICISM: 0.4 }, mbti: { INFP: 0.85, INFJ: 0.8, INTP: 0.6 }, skillsRequired: ['Writing craft', 'Research', 'Self-discipline', 'Editing'], educationPathway: ['Any background; writing portfolio matters most'], entryLevelRoles: ['Freelance Writer', 'Junior Copywriter'], growthPath: ['Established Writer', 'Editor', 'Published Author'], workEnvironment: 'Independent/remote, largely self-directed.', challenges: 'Inconsistent income; creative blocks.', futureOutlook: 'Stable niche demand, shifting with digital publishing.' },
  { category: 'Creative', title: 'Photographer', description: 'Captures visual stories for events, brands, or art.', bigFive: { OPENNESS: 0.85, CONSCIENTIOUSNESS: 0.55, EXTRAVERSION: 0.55, AGREEABLENESS: 0.5, NEUROTICISM: 0.35 }, mbti: { ISFP: 0.8, ESFP: 0.7, INFP: 0.65 }, skillsRequired: ['Camera/lighting technique', 'Photo editing', 'Client management', 'Visual composition'], educationPathway: ['Photography diploma or self-taught with portfolio'], entryLevelRoles: ['Assistant Photographer', 'Freelance Photographer'], growthPath: ['Established Photographer', 'Studio Owner'], workEnvironment: 'On-location/studio, variable schedule.', challenges: 'Inconsistent bookings; equipment costs.', futureOutlook: 'Steady niche demand, especially in events and content.' },

  // Science
  { category: 'Science', title: 'Research Scientist', description: 'Conducts original research to expand scientific knowledge.', bigFive: { OPENNESS: 0.9, CONSCIENTIOUSNESS: 0.8, EXTRAVERSION: 0.3, AGREEABLENESS: 0.45, NEUROTICISM: 0.3 }, mbti: { INTJ: 0.9, INTP: 0.9, ISTJ: 0.5 }, skillsRequired: ['Research methodology', 'Statistical analysis', 'Scientific writing', 'Domain expertise'], educationPathway: ['BSc', 'MSc/PhD in specialization'], entryLevelRoles: ['Research Assistant'], growthPath: ['Research Scientist', 'Principal Investigator', 'Lab Director'], workEnvironment: 'Lab/university/research institute.', challenges: 'Long research cycles; funding uncertainty.', futureOutlook: 'Steady demand in specialized/emerging fields.' },
  { category: 'Science', title: 'Biotechnologist', description: 'Applies biology and technology to develop products and processes.', bigFive: { OPENNESS: 0.8, CONSCIENTIOUSNESS: 0.8, EXTRAVERSION: 0.35, AGREEABLENESS: 0.5, NEUROTICISM: 0.3 }, mbti: { ISTJ: 0.75, INTJ: 0.8, ISTP: 0.6 }, skillsRequired: ['Lab techniques', 'Molecular biology', 'Data analysis', 'Regulatory knowledge'], educationPathway: ['BSc/B.Tech Biotechnology', 'MSc for advanced roles'], entryLevelRoles: ['Lab Technician', 'Research Associate'], growthPath: ['Biotechnologist', 'R&D Manager', 'Head of R&D'], workEnvironment: 'Lab/industrial R&D setting.', challenges: 'Long product development and approval cycles.', futureOutlook: 'Growing with healthcare/agri-tech innovation.' },
  { category: 'Science', title: 'Environmental Scientist', description: 'Studies environmental problems and develops solutions.', bigFive: { OPENNESS: 0.8, CONSCIENTIOUSNESS: 0.7, EXTRAVERSION: 0.4, AGREEABLENESS: 0.6, NEUROTICISM: 0.3 }, mbti: { INFJ: 0.75, INTJ: 0.75, ISFJ: 0.6 }, skillsRequired: ['Environmental analysis', 'Fieldwork', 'Data collection', 'Report writing'], educationPathway: ['BSc Environmental Science', 'MSc for specialization'], entryLevelRoles: ['Environmental Analyst'], growthPath: ['Environmental Scientist', 'Sustainability Manager', 'Policy Advisor'], workEnvironment: 'Mix of fieldwork and office/lab analysis.', challenges: 'Long timelines to see policy impact.', futureOutlook: 'Growing rapidly with climate and sustainability focus.' },
  { category: 'Science', title: 'Physicist', description: 'Studies fundamental principles governing matter and energy.', bigFive: { OPENNESS: 0.9, CONSCIENTIOUSNESS: 0.75, EXTRAVERSION: 0.3, AGREEABLENESS: 0.4, NEUROTICISM: 0.3 }, mbti: { INTP: 0.9, INTJ: 0.85 }, skillsRequired: ['Advanced mathematics', 'Analytical modeling', 'Research', 'Programming'], educationPathway: ['BSc Physics', 'MSc/PhD for research roles'], entryLevelRoles: ['Research Assistant', 'Lab Assistant'], growthPath: ['Physicist', 'Senior Researcher', 'Professor'], workEnvironment: 'University/research lab/industrial R&D.', challenges: 'Highly competitive academic/research positions.', futureOutlook: 'Niche but stable, growing in applied fields (semiconductors, energy).' },
  { category: 'Science', title: 'Chemist', description: 'Studies substances and their properties, reactions, and applications.', bigFive: { OPENNESS: 0.8, CONSCIENTIOUSNESS: 0.8, EXTRAVERSION: 0.3, AGREEABLENESS: 0.45, NEUROTICISM: 0.3 }, mbti: { ISTJ: 0.8, INTJ: 0.75, ISTP: 0.6 }, skillsRequired: ['Lab techniques', 'Analytical chemistry', 'Safety protocols', 'Data recording'], educationPathway: ['BSc Chemistry', 'MSc for specialization'], entryLevelRoles: ['Lab Chemist', 'Quality Control Analyst'], growthPath: ['Senior Chemist', 'R&D Lead', 'Plant/Lab Manager'], workEnvironment: 'Lab/industrial setting.', challenges: 'Strict safety and regulatory compliance.', futureOutlook: 'Stable demand in pharma, materials, and manufacturing.' },
  { category: 'Science', title: 'Astronomer', description: 'Studies celestial objects and the universe using observation and theory.', bigFive: { OPENNESS: 0.92, CONSCIENTIOUSNESS: 0.75, EXTRAVERSION: 0.3, AGREEABLENESS: 0.45, NEUROTICISM: 0.3 }, mbti: { INTP: 0.9, INTJ: 0.85 }, skillsRequired: ['Astrophysics theory', 'Data analysis', 'Programming', 'Scientific writing'], educationPathway: ['BSc Physics/Astronomy', 'MSc/PhD required for research roles'], entryLevelRoles: ['Research Assistant'], growthPath: ['Astronomer', 'Senior Researcher', 'Observatory Director'], workEnvironment: 'University/observatory/research institute.', challenges: 'Very limited research positions; long academic path.', futureOutlook: 'Small field, growing with space-sector investment.' },

  // Healthcare
  { category: 'Healthcare', title: 'Physician / Doctor', description: 'Diagnoses and treats patients across general or specialized medicine.', bigFive: { OPENNESS: 0.6, CONSCIENTIOUSNESS: 0.85, EXTRAVERSION: 0.55, AGREEABLENESS: 0.7, NEUROTICISM: 0.25 }, mbti: { ISTJ: 0.75, ENFJ: 0.7, ISFJ: 0.75 }, skillsRequired: ['Clinical knowledge', 'Diagnostic reasoning', 'Empathy', 'Communication'], educationPathway: ['Class 12 (PCB)', 'MBBS', 'Specialization (MD/MS)'], entryLevelRoles: ['Intern/Resident Doctor'], growthPath: ['General Physician', 'Specialist', 'Consultant'], workEnvironment: 'Hospital/clinic, long and irregular hours.', challenges: 'High-stress decisions; long training period.', futureOutlook: 'Consistently strong demand.' },
  { category: 'Healthcare', title: 'Registered Nurse', description: 'Provides direct patient care and supports treatment plans.', bigFive: { OPENNESS: 0.5, CONSCIENTIOUSNESS: 0.8, EXTRAVERSION: 0.55, AGREEABLENESS: 0.8, NEUROTICISM: 0.3 }, mbti: { ISFJ: 0.85, ESFJ: 0.85, ENFJ: 0.65 }, skillsRequired: ['Patient care', 'Clinical procedures', 'Communication', 'Composure under pressure'], educationPathway: ['Class 12 (PCB)', 'B.Sc Nursing/GNM'], entryLevelRoles: ['Staff Nurse'], growthPath: ['Senior Nurse', 'Nurse Manager', 'Nurse Practitioner'], workEnvironment: 'Hospital/clinic, shift-based work.', challenges: 'Physically and emotionally demanding shifts.', futureOutlook: 'High and growing demand globally.' },
  { category: 'Healthcare', title: 'Pharmacist', description: 'Dispenses medication and advises on safe drug use.', bigFive: { OPENNESS: 0.5, CONSCIENTIOUSNESS: 0.85, EXTRAVERSION: 0.5, AGREEABLENESS: 0.65, NEUROTICISM: 0.25 }, mbti: { ISTJ: 0.8, ISFJ: 0.75, ESTJ: 0.6 }, skillsRequired: ['Pharmacology', 'Attention to detail', 'Regulatory compliance', 'Patient communication'], educationPathway: ['Class 12 (PCB)', 'B.Pharm/D.Pharm'], entryLevelRoles: ['Pharmacy Assistant'], growthPath: ['Pharmacist', 'Pharmacy Manager', 'Clinical Pharmacist'], workEnvironment: 'Pharmacy/hospital, structured hours.', challenges: 'Zero margin for error in dispensing.', futureOutlook: 'Steady, essential-services demand.' },
  { category: 'Healthcare', title: 'Physiotherapist', description: 'Helps patients recover movement and manage physical pain.', bigFive: { OPENNESS: 0.55, CONSCIENTIOUSNESS: 0.75, EXTRAVERSION: 0.6, AGREEABLENESS: 0.75, NEUROTICISM: 0.3 }, mbti: { ISFJ: 0.8, ESFJ: 0.75, ISTJ: 0.55 }, skillsRequired: ['Anatomy knowledge', 'Rehabilitation techniques', 'Patient motivation', 'Manual therapy'], educationPathway: ['Class 12 (PCB)', 'BPT (Bachelor of Physiotherapy)'], entryLevelRoles: ['Junior Physiotherapist'], growthPath: ['Physiotherapist', 'Senior Therapist', 'Clinic Owner'], workEnvironment: 'Clinic/hospital/sports facility.', challenges: 'Physically demanding; patient adherence to therapy varies.', futureOutlook: 'Growing with aging population and sports medicine.' },
  { category: 'Healthcare', title: 'Psychologist', description: 'Assesses and supports mental health and behavior.', bigFive: { OPENNESS: 0.75, CONSCIENTIOUSNESS: 0.65, EXTRAVERSION: 0.4, AGREEABLENESS: 0.75, NEUROTICISM: 0.3 }, mbti: { INFJ: 0.85, INFP: 0.75, ISFJ: 0.65 }, skillsRequired: ['Active listening', 'Assessment tools', 'Empathy', 'Ethics'], educationPathway: ['BA/BSc Psychology', 'MA/MSc + license for clinical practice'], entryLevelRoles: ['Counseling Assistant'], growthPath: ['Psychologist', 'Clinical Psychologist', 'Private Practice'], workEnvironment: 'Clinic/hospital/school/private practice.', challenges: 'Emotionally demanding work; long licensure path.', futureOutlook: 'Growing demand as mental health awareness rises.' },
  { category: 'Healthcare', title: 'Healthcare Manager', description: 'Manages operations of hospitals, clinics, or healthcare programs.', bigFive: { OPENNESS: 0.6, CONSCIENTIOUSNESS: 0.8, EXTRAVERSION: 0.55, AGREEABLENESS: 0.6, NEUROTICISM: 0.3 }, mbti: { ESTJ: 0.8, ENTJ: 0.75, ISTJ: 0.6 }, skillsRequired: ['Operations management', 'Healthcare regulations', 'Leadership', 'Budgeting'], educationPathway: ['Bachelor\'s + Healthcare/Hospital Administration degree'], entryLevelRoles: ['Administrative Associate'], growthPath: ['Healthcare Manager', 'Hospital Administrator', 'CEO (healthcare)'], workEnvironment: 'Hospital/clinic administrative office.', challenges: 'Balancing patient care quality with operational costs.', futureOutlook: 'Steady growth as healthcare systems expand.' },
  { category: 'Healthcare', title: 'Nutritionist', description: 'Advises individuals and organizations on diet and nutrition.', bigFive: { OPENNESS: 0.6, CONSCIENTIOUSNESS: 0.75, EXTRAVERSION: 0.55, AGREEABLENESS: 0.7, NEUROTICISM: 0.3 }, mbti: { ISFJ: 0.75, ESFJ: 0.7, INFJ: 0.6 }, skillsRequired: ['Nutrition science', 'Client counseling', 'Meal planning', 'Communication'], educationPathway: ['BSc Nutrition/Dietetics'], entryLevelRoles: ['Junior Nutritionist'], growthPath: ['Nutritionist', 'Clinical Dietitian', 'Private Practice'], workEnvironment: 'Clinic/wellness center/remote consulting.', challenges: 'Client adherence and behavior change is hard to influence.', futureOutlook: 'Growing with wellness/preventive health trends.' },

  // Law
  { category: 'Law', title: 'Lawyer', description: 'Advises and represents clients on legal matters.', bigFive: { OPENNESS: 0.65, CONSCIENTIOUSNESS: 0.8, EXTRAVERSION: 0.6, AGREEABLENESS: 0.45, NEUROTICISM: 0.3 }, mbti: { ENTJ: 0.85, INTJ: 0.7, ESTJ: 0.7 }, skillsRequired: ['Legal research', 'Argumentation', 'Writing', 'Negotiation'], educationPathway: ['Class 12 (any stream)', 'LLB (5-year integrated or 3-year after graduation)'], entryLevelRoles: ['Associate/Junior Lawyer'], growthPath: ['Senior Associate', 'Partner', 'Independent Practice'], workEnvironment: 'Law firm/court/corporate legal team.', challenges: 'Long hours; high-stakes advocacy.', futureOutlook: 'Steady demand, growing in corporate/tech law.' },
  { category: 'Law', title: 'Legal Analyst', description: 'Researches and analyzes legal information to support legal teams.', bigFive: { OPENNESS: 0.6, CONSCIENTIOUSNESS: 0.8, EXTRAVERSION: 0.4, AGREEABLENESS: 0.5, NEUROTICISM: 0.3 }, mbti: { ISTJ: 0.8, INTJ: 0.75 }, skillsRequired: ['Legal research', 'Document review', 'Attention to detail', 'Writing'], educationPathway: ['LLB or paralegal certification'], entryLevelRoles: ['Legal Research Associate'], growthPath: ['Legal Analyst', 'Senior Legal Analyst', 'Compliance Manager'], workEnvironment: 'Law firm/corporate legal/compliance team.', challenges: 'Dense, detail-heavy documentation work.', futureOutlook: 'Growing with compliance/regulatory complexity.' },
  { category: 'Law', title: 'Corporate Lawyer', description: 'Advises businesses on transactions, compliance, and governance.', bigFive: { OPENNESS: 0.6, CONSCIENTIOUSNESS: 0.85, EXTRAVERSION: 0.55, AGREEABLENESS: 0.45, NEUROTICISM: 0.3 }, mbti: { ENTJ: 0.85, ISTJ: 0.75, INTJ: 0.7 }, skillsRequired: ['Contract law', 'Negotiation', 'Regulatory knowledge', 'Business acumen'], educationPathway: ['LLB', 'Specialization in corporate law'], entryLevelRoles: ['Corporate Law Associate'], growthPath: ['Corporate Counsel', 'Senior Counsel', 'General Counsel'], workEnvironment: 'Law firm/in-house corporate legal team.', challenges: 'High-stakes deal timelines and pressure.', futureOutlook: 'Strong demand as business complexity grows.' },

  // Education
  { category: 'Education', title: 'Teacher', description: 'Educates and mentors students in a subject area.', bigFive: { OPENNESS: 0.6, CONSCIENTIOUSNESS: 0.75, EXTRAVERSION: 0.6, AGREEABLENESS: 0.75, NEUROTICISM: 0.3 }, mbti: { ESFJ: 0.8, ENFJ: 0.85, ISFJ: 0.75 }, skillsRequired: ['Subject expertise', 'Classroom management', 'Communication', 'Patience'], educationPathway: ['Bachelor\'s degree', 'B.Ed'], entryLevelRoles: ['Teaching Assistant'], growthPath: ['Teacher', 'Head of Department', 'Principal'], workEnvironment: 'School classroom, structured schedule.', challenges: 'Managing diverse learning needs; workload beyond classroom hours.', futureOutlook: 'Stable, essential demand.' },
  { category: 'Education', title: 'Professor', description: 'Teaches and conducts research at the university level.', bigFive: { OPENNESS: 0.85, CONSCIENTIOUSNESS: 0.75, EXTRAVERSION: 0.5, AGREEABLENESS: 0.6, NEUROTICISM: 0.3 }, mbti: { INTJ: 0.75, INFJ: 0.7, ENTJ: 0.6 }, skillsRequired: ['Research', 'Teaching', 'Publishing', 'Mentorship'], educationPathway: ['Master\'s degree', 'PhD required for tenure track'], entryLevelRoles: ['Teaching/Research Assistant'], growthPath: ['Assistant Professor', 'Associate Professor', 'Professor/Dean'], workEnvironment: 'University, mix of teaching, research, and admin.', challenges: 'Highly competitive positions; "publish or perish" pressure.', futureOutlook: 'Stable but competitive.' },
  { category: 'Education', title: 'Corporate Trainer', description: 'Designs and delivers training programs for professionals.', bigFive: { OPENNESS: 0.7, CONSCIENTIOUSNESS: 0.7, EXTRAVERSION: 0.75, AGREEABLENESS: 0.65, NEUROTICISM: 0.3 }, mbti: { ENFJ: 0.85, ESFJ: 0.75, ENTJ: 0.6 }, skillsRequired: ['Instructional design', 'Public speaking', 'Facilitation', 'Subject expertise'], educationPathway: ['Bachelor\'s degree + domain expertise'], entryLevelRoles: ['Training Coordinator'], growthPath: ['Corporate Trainer', 'L&D Manager', 'Head of L&D'], workEnvironment: 'Office/remote, workshop/session-based.', challenges: 'Keeping content engaging and current.', futureOutlook: 'Growing with corporate upskilling focus.' },
  { category: 'Education', title: 'Education Consultant', description: 'Advises students or institutions on academic and career planning.', bigFive: { OPENNESS: 0.7, CONSCIENTIOUSNESS: 0.7, EXTRAVERSION: 0.6, AGREEABLENESS: 0.7, NEUROTICISM: 0.3 }, mbti: { ENFJ: 0.8, INFJ: 0.7, ESFJ: 0.65 }, skillsRequired: ['Counseling', 'Knowledge of education systems', 'Communication', 'Research'], educationPathway: ['Bachelor\'s degree', 'Counseling certification (helpful)'], entryLevelRoles: ['Junior Education Counselor'], growthPath: ['Education Consultant', 'Senior Consultant', 'Practice Owner'], workEnvironment: 'Office/remote, client-facing consultations.', challenges: 'Managing high-stakes decisions for students/families.', futureOutlook: 'Growing as education pathways diversify.' },

  // Government / Public Sector
  { category: 'Government & Public Sector', title: 'Civil Services Officer', description: 'Serves in administrative and policy-implementation roles for the government.', bigFive: { OPENNESS: 0.6, CONSCIENTIOUSNESS: 0.85, EXTRAVERSION: 0.55, AGREEABLENESS: 0.6, NEUROTICISM: 0.25 }, mbti: { ISTJ: 0.85, ENTJ: 0.75, ESTJ: 0.8 }, skillsRequired: ['Public administration', 'Policy analysis', 'Leadership', 'Ethics'], educationPathway: ['Any bachelor\'s degree', 'Civil services examination'], entryLevelRoles: ['Probationary Officer'], growthPath: ['District-level Officer', 'Senior Administrative Roles'], workEnvironment: 'Government office/field postings.', challenges: 'Highly competitive entry exam; frequent relocations.', futureOutlook: 'Stable, prestigious, limited seats.' },
  { category: 'Government & Public Sector', title: 'Bank Officer', description: 'Manages banking operations, customer service, and financial products.', bigFive: { OPENNESS: 0.5, CONSCIENTIOUSNESS: 0.8, EXTRAVERSION: 0.55, AGREEABLENESS: 0.6, NEUROTICISM: 0.3 }, mbti: { ISTJ: 0.8, ESTJ: 0.75 }, skillsRequired: ['Financial literacy', 'Customer service', 'Regulatory compliance', 'Accuracy'], educationPathway: ['Bachelor\'s degree', 'Banking sector exam (e.g. IBPS)'], entryLevelRoles: ['Probationary Officer / Clerk'], growthPath: ['Branch Manager', 'Regional Manager'], workEnvironment: 'Bank branch/corporate office.', challenges: 'High accountability for financial accuracy.', futureOutlook: 'Stable demand despite digital banking shift.' },
  { category: 'Government & Public Sector', title: 'Railway Services Officer', description: 'Manages operations, engineering, or administration within railway services.', bigFive: { OPENNESS: 0.5, CONSCIENTIOUSNESS: 0.85, EXTRAVERSION: 0.5, AGREEABLENESS: 0.55, NEUROTICISM: 0.25 }, mbti: { ISTJ: 0.85, ESTJ: 0.7 }, skillsRequired: ['Operations management', 'Technical/engineering knowledge (for tech roles)', 'Discipline'], educationPathway: ['Bachelor\'s degree/diploma', 'Railway recruitment exam'], entryLevelRoles: ['Assistant Officer'], growthPath: ['Divisional Officer', 'Senior Management'], workEnvironment: 'Field/office, often with postings across regions.', challenges: 'Frequent relocations; large-scale operational responsibility.', futureOutlook: 'Stable public-sector demand.' },
  { category: 'Government & Public Sector', title: 'Defence Services Officer', description: 'Serves in the armed forces in operational or administrative roles.', bigFive: { OPENNESS: 0.5, CONSCIENTIOUSNESS: 0.9, EXTRAVERSION: 0.6, AGREEABLENESS: 0.5, NEUROTICISM: 0.2 }, mbti: { ESTJ: 0.85, ISTJ: 0.8, ENTJ: 0.65 }, skillsRequired: ['Discipline', 'Leadership under pressure', 'Physical fitness', 'Teamwork'], educationPathway: ['Class 12/Bachelor\'s degree', 'NDA/CDS or equivalent entry exam'], entryLevelRoles: ['Cadet/Trainee Officer'], growthPath: ['Officer', 'Senior Command Roles'], workEnvironment: 'Variable — bases, field postings, sometimes hazardous.', challenges: 'High physical and mental demands; family separation during postings.', futureOutlook: 'Stable, prestigious, structured career path.' },
  { category: 'Government & Public Sector', title: 'Public Administrator', description: 'Manages public programs, policy execution, and government services.', bigFive: { OPENNESS: 0.6, CONSCIENTIOUSNESS: 0.8, EXTRAVERSION: 0.55, AGREEABLENESS: 0.65, NEUROTICISM: 0.3 }, mbti: { ISTJ: 0.75, ESFJ: 0.7, ENTJ: 0.6 }, skillsRequired: ['Policy implementation', 'Program management', 'Stakeholder coordination', 'Ethics'], educationPathway: ['Bachelor\'s in public administration/political science', 'Master\'s (MPA) preferred'], entryLevelRoles: ['Administrative Assistant'], growthPath: ['Program Manager', 'Department Head', 'Senior Public Official'], workEnvironment: 'Government office/field program sites.', challenges: 'Navigating bureaucracy; resource constraints.', futureOutlook: 'Stable demand as public programs expand.' },

  // A few more to broaden coverage across categories
  { category: 'Technology', title: 'Mobile App Developer', description: 'Builds applications for iOS/Android platforms.', bigFive: { OPENNESS: 0.75, CONSCIENTIOUSNESS: 0.7, EXTRAVERSION: 0.4, AGREEABLENESS: 0.5, NEUROTICISM: 0.3 }, mbti: { INTP: 0.8, ISTP: 0.75, INTJ: 0.75 }, skillsRequired: ['Swift/Kotlin', 'UI implementation', 'API integration', 'Testing'], educationPathway: ['B.Tech/BCA', 'Mobile dev bootcamp/self-study'], entryLevelRoles: ['Junior Mobile Developer'], growthPath: ['Senior Mobile Developer', 'Mobile Team Lead'], workEnvironment: 'Office/remote, agile sprints.', challenges: 'Fragmented device/OS ecosystem.', futureOutlook: 'Strong demand as mobile-first products grow.' },
  { category: 'Business', title: 'Investment Banker', description: 'Advises on capital raising, M&A, and financial strategy for corporations.', bigFive: { OPENNESS: 0.55, CONSCIENTIOUSNESS: 0.85, EXTRAVERSION: 0.65, AGREEABLENESS: 0.4, NEUROTICISM: 0.3 }, mbti: { ESTJ: 0.8, ENTJ: 0.85, ISTJ: 0.6 }, skillsRequired: ['Financial modeling', 'Valuation', 'Client management', 'Resilience under pressure'], educationPathway: ['B.Com/BBA/Engineering', 'MBA (highly preferred)'], entryLevelRoles: ['Analyst'], growthPath: ['Associate', 'VP', 'Managing Director'], workEnvironment: 'High-pressure office environment, long hours.', challenges: 'Very demanding hours; high-stakes deals.', futureOutlook: 'Stable in financial hubs, competitive entry.' },
  { category: 'Healthcare', title: 'Medical Lab Technician', description: 'Conducts diagnostic tests on patient samples.', bigFive: { OPENNESS: 0.5, CONSCIENTIOUSNESS: 0.85, EXTRAVERSION: 0.35, AGREEABLENESS: 0.55, NEUROTICISM: 0.25 }, mbti: { ISTJ: 0.85, ISFJ: 0.7 }, skillsRequired: ['Lab procedures', 'Equipment handling', 'Accuracy', 'Safety protocols'], educationPathway: ['Class 12 (PCB)', 'Diploma/BSc in Medical Lab Technology'], entryLevelRoles: ['Lab Technician'], growthPath: ['Senior Technician', 'Lab Supervisor'], workEnvironment: 'Hospital/diagnostic lab.', challenges: 'Repetitive precision work under time pressure.', futureOutlook: 'Steady demand tied to healthcare growth.' },
];

async function main() {
  console.log('Seeding CareerCompass AI...');

  // System settings
  await prisma.systemSettings.upsert({
    where: { key: 'branding' },
    create: { key: 'branding', value: { productName: 'PATH AI', primaryColor: '#F5C400', logoUrl: null } },
    update: {},
  });
  await prisma.systemSettings.upsert({
    where: { key: 'demoMode' },
    create: { key: 'demoMode', value: { enabled: process.env.DEMO_MODE_DEFAULT === 'true' } },
    update: {},
  });
  await prisma.systemSettings.upsert({
    where: { key: 'retakePolicy' },
    create: { key: 'retakePolicy', value: { minDaysBetweenRetakes: 90 } },
    update: {},
  });

  // Career categories
  const categoryNames = [
    { name: 'Technology', slug: 'technology', icon: 'cpu' },
    { name: 'Business', slug: 'business', icon: 'briefcase' },
    { name: 'Creative', slug: 'creative', icon: 'palette' },
    { name: 'Science', slug: 'science', icon: 'flask' },
    { name: 'Healthcare', slug: 'healthcare', icon: 'stethoscope' },
    { name: 'Law', slug: 'law', icon: 'scale' },
    { name: 'Education', slug: 'education', icon: 'graduation-cap' },
    { name: 'Government & Public Sector', slug: 'government-public-sector', icon: 'landmark' },
  ];
  const categoryBySlug = new Map<string, string>();
  for (const c of categoryNames) {
    const created = await prisma.careerCategory.upsert({
      where: { slug: c.slug },
      create: c,
      update: {},
    });
    categoryBySlug.set(c.name, created.id);
  }

  // Skills (deduped from careers list)
  const allSkillNames = Array.from(new Set(careers.flatMap((c) => c.skillsRequired)));
  const skillIdByName = new Map<string, string>();
  for (const name of allSkillNames) {
    const skill = await prisma.skill.upsert({ where: { name }, create: { name }, update: {} });
    skillIdByName.set(name, skill.id);
  }

  // Careers
  for (const c of careers) {
    const categoryId = categoryBySlug.get(c.category);
    if (!categoryId) continue;
    const slug = c.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const career = await prisma.career.upsert({
      where: { slug },
      create: {
        categoryId,
        title: c.title,
        slug,
        description: c.description,
        personalityAlignment: { bigFive: c.bigFive, mbti: c.mbti },
        skillsRequired: c.skillsRequired,
        educationPathway: c.educationPathway,
        entryLevelRoles: c.entryLevelRoles,
        growthPath: c.growthPath,
        workEnvironment: c.workEnvironment,
        challenges: c.challenges,
        futureOutlook: c.futureOutlook,
      },
      update: {},
    });

    for (const skillName of c.skillsRequired) {
      const skillId = skillIdByName.get(skillName)!;
      await prisma.careerSkill.upsert({
        where: { careerId_skillId: { careerId: career.id, skillId } },
        create: { careerId: career.id, skillId, importance: 4 },
        update: {},
      });
    }
  }
  console.log(`Seeded ${careers.length} careers across ${categoryNames.length} categories.`);

  // Big Five questions (Class 10 only)
  let qIndex = 1;
  for (const q of bigFiveQuestions) {
    await prisma.question.upsert({
      where: { code: `BF-${String(qIndex).padStart(3, '0')}` },
      create: {
        code: `BF-${String(qIndex).padStart(3, '0')}`,
        framework: 'BIG_FIVE',
        dimension: q.dimension,
        questionType: 'SCENARIO',
        scenarioText: q.text,
        isScenario: true,
        weight: 1,
        difficulty: 2,
        educationLevels: ['CLASS_10'],
      },
      update: {},
    });
    qIndex += 1;
  }
  console.log(`Seeded ${bigFiveQuestions.length} Big Five questions.`);

  // MBTI questions (Class 12 + College + Professional)
  qIndex = 1;
  for (const q of mbtiQuestions) {
    const educationLevels =
      q.audience === 'students' ? STUDENT_LEVELS : q.audience === 'professionals' ? (['WORKING_PROFESSIONAL'] as EducationLevel[]) : COLLEGE_PLUS;
    await prisma.question.upsert({
      where: { code: `MB-${String(qIndex).padStart(3, '0')}` },
      create: {
        code: `MB-${String(qIndex).padStart(3, '0')}`,
        framework: 'MBTI',
        dimension: q.dimension,
        questionType: 'SCENARIO',
        scenarioText: q.text,
        isScenario: true,
        weight: 1,
        difficulty: 2,
        educationLevels,
      },
      // Keep existing databases in step with who each question is for (e.g. professionals must
      // not get "costs the group marks"). Text and admin edits like isActive are left alone.
      update: { educationLevels },
    });
    qIndex += 1;
  }
  console.log(`Seeded ${mbtiQuestions.length} MBTI questions.`);

  await seedPathways(prisma);

  // Seed admin (SUPER_ADMIN). With SEED_ADMIN_PASSWORD set, the account uses that password, and an
  // existing account is reset to it on every start (how a lost admin password is recovered on
  // Render). Without it, a new account gets a random password printed once. Emails are stored
  // lowercased because the admin login lowercases what is typed.
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@careercompass.local').trim().toLowerCase();
  // Trimmed: a space pasted into the hosting dashboard by accident would otherwise become part of
  // the password, and logging in with what was "typed" would always fail.
  const adminPassword = process.env.SEED_ADMIN_PASSWORD?.trim();
  const existingAdmin = await prisma.adminUser.findUnique({ where: { email: adminEmail } });
  if (adminPassword && adminPassword.length < 8) {
    console.log('SEED_ADMIN_PASSWORD must be at least 8 characters — ignored.');
  }
  if (adminPassword && adminPassword.length >= 8) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.adminUser.upsert({
      where: { email: adminEmail },
      create: { email: adminEmail, passwordHash, name: 'Super Admin', role: 'SUPER_ADMIN' },
      update: { passwordHash, isActive: true },
    });
    console.log(`Seed admin ${existingAdmin ? 'password set from SEED_ADMIN_PASSWORD' : 'created'}: ${adminEmail}`);
  } else if (!existingAdmin) {
    const randomPassword = crypto.randomBytes(9).toString('base64url');
    const passwordHash = await bcrypt.hash(randomPassword, 12);
    await prisma.adminUser.create({
      data: { email: adminEmail, passwordHash, name: 'Super Admin', role: 'SUPER_ADMIN' },
    });
    console.log('─────────────────────────────────────────────');
    console.log(`Seed admin created: ${adminEmail}`);
    console.log(`Temporary password: ${randomPassword}`);
    console.log('Log in once and change this password immediately.');
    console.log('─────────────────────────────────────────────');
  } else {
    console.log('Seed admin already exists, skipping.');
  }

  // Optional TRAINER account for marking skill checks. Only created when both env vars are set
  // (e.g. on Render); an existing account is left untouched so its password is never reset here.
  const trainerEmail = process.env.SEED_TRAINER_EMAIL?.trim().toLowerCase();
  const trainerPassword = process.env.SEED_TRAINER_PASSWORD;
  if (trainerEmail && trainerPassword) {
    const existingTrainer = await prisma.adminUser.findUnique({ where: { email: trainerEmail } });
    if (!existingTrainer) {
      const passwordHash = await bcrypt.hash(trainerPassword, 12);
      await prisma.adminUser.create({ data: { email: trainerEmail, passwordHash, name: 'Trainer', role: 'TRAINER' } });
      console.log(`Seed trainer created: ${trainerEmail}`);
    } else {
      console.log('Seed trainer already exists, skipping.');
    }
  }

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
