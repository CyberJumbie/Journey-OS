import type { LCMEStandard, LCMEElement } from "@journey-os/types";

interface LCMEStandardSeed extends LCMEStandard {}

interface LCMEElementSeed extends LCMEElement {
  readonly standard_id: string;
  readonly text: string;
}

export const LCME_STANDARDS: readonly LCMEStandardSeed[] = [
  {
    id: "lcme-std-1",
    name: "Mission, Planning, Organization, and Integrity",
    number: "1",
    title: "Mission, Planning, Organization, and Integrity",
    description:
      "A medical school has a written statement of mission and goals for the medical education program, conducts ongoing planning, and has written bylaws that describe an effective organizational structure and governance processes. In the conduct of all internal and external activities, the medical school demonstrates integrity through its consistent and documented adherence to fair, impartial, and effective processes, policies, and practices.",
    framework: "lcme",
  },
  {
    id: "lcme-std-2",
    name: "Leadership and Administration",
    number: "2",
    title: "Leadership and Administration",
    description:
      "A medical school has a sufficient number of faculty in leadership roles and of senior administrative staff with the skills, time, and administrative support necessary to achieve the goals of the medical education program and to ensure the functional integration of all programmatic components.",
    framework: "lcme",
  },
  {
    id: "lcme-std-3",
    name: "Academic and Learning Environments",
    number: "3",
    title: "Academic and Learning Environments",
    description:
      "A medical school ensures that its medical education program occurs in professional, respectful, and intellectually stimulating academic and clinical environments, recognizes the benefits of diversity, and promotes students' attainment of competencies required of future physicians.",
    framework: "lcme",
  },
  {
    id: "lcme-std-4",
    name: "Faculty Preparation, Productivity, Participation, and Policies",
    number: "4",
    title: "Faculty Preparation, Productivity, Participation, and Policies",
    description:
      "The faculty members of a medical school are qualified through their education, training, experience, and continuing professional development and provide the leadership and support necessary to attain the institution's educational, research, and service goals.",
    framework: "lcme",
  },
  {
    id: "lcme-std-5",
    name: "Educational Resources and Infrastructure",
    number: "5",
    title: "Educational Resources and Infrastructure",
    description:
      "A medical school has sufficient personnel, financial resources, physical facilities, equipment, and clinical, instructional, informational, technological, and other resources readily available and accessible across all locations to meet its needs and to achieve its goals.",
    framework: "lcme",
  },
  {
    id: "lcme-std-6",
    name: "Competencies, Curricular Objectives, and Curricular Design",
    number: "6",
    title: "Competencies, Curricular Objectives, and Curricular Design",
    description:
      "The faculty of a medical school define the competencies to be achieved by its medical students through medical education program objectives and is responsible for the detailed design and implementation of the components of a medical curriculum that enable its medical students to achieve those competencies and objectives. Medical education program objectives are statements of the knowledge, skills, behaviors, and attitudes that medical students are expected to exhibit as evidence of their achievement by completion of the program.",
    framework: "lcme",
  },
  {
    id: "lcme-std-7",
    name: "Curricular Content",
    number: "7",
    title: "Curricular Content",
    description:
      "The faculty of a medical school ensure that the medical curriculum provides content of sufficient breadth and depth to prepare medical students for entry into any residency program and for the subsequent contemporary practice of medicine.",
    framework: "lcme",
  },
  {
    id: "lcme-std-8",
    name: "Curricular Management, Evaluation, and Enhancement",
    number: "8",
    title: "Curricular Management, Evaluation, and Enhancement",
    description:
      "The faculty of a medical school engage in curricular revision and program evaluation activities to ensure that medical education program quality is maintained and enhanced and that medical students achieve all medical education program objectives and participate in required clinical experiences and settings.",
    framework: "lcme",
  },
  {
    id: "lcme-std-9",
    name: "Teaching, Supervision, Assessment, and Student and Patient Safety",
    number: "9",
    title: "Teaching, Supervision, Assessment, and Student and Patient Safety",
    description:
      "A medical school ensures that its medical education program includes a comprehensive, fair, and uniform system of formative and summative medical student assessment and protects medical students' and patients' safety by ensuring that all persons who teach, supervise, and/or assess medical students are adequately prepared for those responsibilities.",
    framework: "lcme",
  },
  {
    id: "lcme-std-10",
    name: "Medical Student Selection, Assignment, and Progress",
    number: "10",
    title: "Medical Student Selection, Assignment, and Progress",
    description:
      "A medical school establishes and publishes admission requirements for potential applicants to the medical education program and uses effective policies and procedures for medical student selection, enrollment, and assignment.",
    framework: "lcme",
  },
  {
    id: "lcme-std-11",
    name: "Medical Student Academic Support, Career Advising, and Educational Records",
    number: "11",
    title:
      "Medical Student Academic Support, Career Advising, and Educational Records",
    description:
      "A medical school provides effective academic support and career advising to all medical students to assist them in achieving their career goals and the school's medical education program objectives. All medical students have the same rights and receive comparable services.",
    framework: "lcme",
  },
  {
    id: "lcme-std-12",
    name: "Medical Student Health Services, Personal Counseling, and Financial Aid Services",
    number: "12",
    title:
      "Medical Student Health Services, Personal Counseling, and Financial Aid Services",
    description:
      "A medical school provides effective student services to all medical students to assist them in achieving the program's goals for its students. All medical students have the same rights and receive comparable services.",
    framework: "lcme",
  },
] as const;

export const LCME_ELEMENTS: readonly LCMEElementSeed[] = [
  // ── Standard 1: Mission, Planning, Organization, and Integrity ──
  {
    id: "lcme-1.1",
    name: "Strategic Planning and Continuous Quality Improvement",
    number: "1.1",
    title: "Strategic Planning and Continuous Quality Improvement",
    text: "A medical school engages in ongoing strategic planning and continuous quality improvement processes that establish its short and long-term programmatic goals, result in the achievement of measurable outcomes that are used to improve educational program quality, and ensure effective monitoring of the medical education program's compliance with accreditation standards.",
    description:
      "A medical school engages in ongoing strategic planning and continuous quality improvement processes that establish its short and long-term programmatic goals, result in the achievement of measurable outcomes that are used to improve educational program quality, and ensure effective monitoring of the medical education program's compliance with accreditation standards.",
    framework: "lcme",
    standard_id: "lcme-std-1",
  },
  {
    id: "lcme-1.2",
    name: "Conflict of Interest Policies",
    number: "1.2",
    title: "Conflict of Interest Policies",
    text: "A medical school has in place and follows effective policies and procedures applicable to board members, faculty members, and any other individuals who participate in decision-making affecting the medical education program to avoid the impact of conflicts of interest in the operation of the medical education program, its associated clinical facilities, and any related enterprises.",
    description:
      "A medical school has in place and follows effective policies and procedures applicable to board members, faculty members, and any other individuals who participate in decision-making affecting the medical education program to avoid the impact of conflicts of interest in the operation of the medical education program, its associated clinical facilities, and any related enterprises.",
    framework: "lcme",
    standard_id: "lcme-std-1",
  },
  {
    id: "lcme-1.3",
    name: "Mechanisms for Faculty Participation",
    number: "1.3",
    title: "Mechanisms for Faculty Participation",
    text: "A medical school ensures that there are effective mechanisms in place for direct faculty participation in decision-making related to the medical education program, including opportunities for faculty participation in discussions about, and the establishment of, policies and procedures for the program, as appropriate.",
    description:
      "A medical school ensures that there are effective mechanisms in place for direct faculty participation in decision-making related to the medical education program, including opportunities for faculty participation in discussions about, and the establishment of, policies and procedures for the program, as appropriate.",
    framework: "lcme",
    standard_id: "lcme-std-1",
  },
  {
    id: "lcme-1.4",
    name: "Affiliation Agreements",
    number: "1.4",
    title: "Affiliation Agreements",
    text: "In the relationship between a medical school and its clinical affiliates, the educational program for all medical students remains under the control of the medical school's faculty, as specified in written affiliation agreements that define the responsibilities of each party related to the medical education program. Written agreements are necessary with clinical affiliates that are used regularly for required clinical experiences; such agreements may also be warranted with other clinical facilities that have a significant role in the clinical education program. Such agreements provide for, at a minimum the following: the assurance of medical student and faculty access to appropriate resources for medical student education; the primacy of the medical education program's authority over academic affairs and the education/assessment of medical students; the role of the medical school in the appointment and assignment of faculty members with responsibility for medical student teaching; specification of the responsibility for treatment and follow-up when a medical student is exposed to an infectious or environmental hazard or other occupational injury; the shared responsibility of the clinical affiliate and the medical school for creating and maintaining an appropriate learning environment.",
    description:
      "In the relationship between a medical school and its clinical affiliates, the educational program for all medical students remains under the control of the medical school's faculty, as specified in written affiliation agreements that define the responsibilities of each party related to the medical education program. Written agreements are necessary with clinical affiliates that are used regularly for required clinical experiences; such agreements may also be warranted with other clinical facilities that have a significant role in the clinical education program. Such agreements provide for, at a minimum the following: the assurance of medical student and faculty access to appropriate resources for medical student education; the primacy of the medical education program's authority over academic affairs and the education/assessment of medical students; the role of the medical school in the appointment and assignment of faculty members with responsibility for medical student teaching; specification of the responsibility for treatment and follow-up when a medical student is exposed to an infectious or environmental hazard or other occupational injury; the shared responsibility of the clinical affiliate and the medical school for creating and maintaining an appropriate learning environment.",
    framework: "lcme",
    standard_id: "lcme-std-1",
  },
  {
    id: "lcme-1.5",
    name: "Bylaws",
    number: "1.5",
    title: "Bylaws",
    text: "A medical school promulgates bylaws or similar policy documents that describe the responsibilities and privileges of its administrative officers, faculty, and committees.",
    description:
      "A medical school promulgates bylaws or similar policy documents that describe the responsibilities and privileges of its administrative officers, faculty, and committees.",
    framework: "lcme",
    standard_id: "lcme-std-1",
  },
  {
    id: "lcme-1.6",
    name: "Eligibility Requirements",
    number: "1.6",
    title: "Eligibility Requirements",
    text: "A medical school ensures that its medical education program meets all eligibility requirements of the LCME for initial and continuing accreditation, including receipt of degree-granting authority and accreditation by a regional accrediting body by either the medical school or its parent institution.",
    description:
      "A medical school ensures that its medical education program meets all eligibility requirements of the LCME for initial and continuing accreditation, including receipt of degree-granting authority and accreditation by a regional accrediting body by either the medical school or its parent institution.",
    framework: "lcme",
    standard_id: "lcme-std-1",
  },

  // ── Standard 2: Leadership and Administration ──
  {
    id: "lcme-2.1",
    name: "Administrative Officer and Faculty Appointments",
    number: "2.1",
    title: "Administrative Officer and Faculty Appointments",
    text: "The senior administrative staff and faculty of a medical school are appointed by, or on the authority of, the governing board of the institution.",
    description:
      "The senior administrative staff and faculty of a medical school are appointed by, or on the authority of, the governing board of the institution.",
    framework: "lcme",
    standard_id: "lcme-std-2",
  },
  {
    id: "lcme-2.2",
    name: "Dean's Qualifications",
    number: "2.2",
    title: "Dean's Qualifications",
    text: "The dean of a medical school is qualified by education, training, and experience to provide effective leadership in medical education, scholarly activity, patient care, and other missions of the medical school.",
    description:
      "The dean of a medical school is qualified by education, training, and experience to provide effective leadership in medical education, scholarly activity, patient care, and other missions of the medical school.",
    framework: "lcme",
    standard_id: "lcme-std-2",
  },
  {
    id: "lcme-2.3",
    name: "Access and Authority of the Dean",
    number: "2.3",
    title: "Access and Authority of the Dean",
    text: "The dean of a medical school has sufficient access to the university president or other institutional official charged with final responsibility for the medical education program and to other institutional officials in order to fulfill decanal responsibilities; there is a clear definition of the dean's authority and responsibility for the medical education program.",
    description:
      "The dean of a medical school has sufficient access to the university president or other institutional official charged with final responsibility for the medical education program and to other institutional officials in order to fulfill decanal responsibilities; there is a clear definition of the dean's authority and responsibility for the medical education program.",
    framework: "lcme",
    standard_id: "lcme-std-2",
  },
  {
    id: "lcme-2.4",
    name: "Sufficiency of Administrative Staff",
    number: "2.4",
    title: "Sufficiency of Administrative Staff",
    text: "A medical school has in place a sufficient number of associate or assistant deans, leaders of organizational units, and senior administrative staff who are able to commit the time necessary to accomplish the missions of the medical school.",
    description:
      "A medical school has in place a sufficient number of associate or assistant deans, leaders of organizational units, and senior administrative staff who are able to commit the time necessary to accomplish the missions of the medical school.",
    framework: "lcme",
    standard_id: "lcme-std-2",
  },
  {
    id: "lcme-2.5",
    name: "Responsibility of and to the Dean",
    number: "2.5",
    title: "Responsibility of and to the Dean",
    text: "The dean of a medical school with one or more regional campuses is administratively responsible for the conduct and quality of the medical education program and for ensuring the adequacy of faculty at each campus. The principal academic officer at each campus is administratively responsible to the dean.",
    description:
      "The dean of a medical school with one or more regional campuses is administratively responsible for the conduct and quality of the medical education program and for ensuring the adequacy of faculty at each campus. The principal academic officer at each campus is administratively responsible to the dean.",
    framework: "lcme",
    standard_id: "lcme-std-2",
  },
  {
    id: "lcme-2.6",
    name: "Functional Integration of the Faculty",
    number: "2.6",
    title: "Functional Integration of the Faculty",
    text: "At a medical school with one or more regional campuses, the faculty at the departmental and medical school levels at each campus are functionally integrated by appropriate administrative mechanisms (e.g., regular meetings and/or communication, periodic visits, participation in shared governance, and data sharing).",
    description:
      "At a medical school with one or more regional campuses, the faculty at the departmental and medical school levels at each campus are functionally integrated by appropriate administrative mechanisms (e.g., regular meetings and/or communication, periodic visits, participation in shared governance, and data sharing).",
    framework: "lcme",
    standard_id: "lcme-std-2",
  },

  // ── Standard 3: Academic and Learning Environments ──
  {
    id: "lcme-3.1",
    name: "Resident Participation in Medical Student Education",
    number: "3.1",
    title: "Resident Participation in Medical Student Education",
    text: "Each medical student in a medical education program participates in one or more required clinical experiences conducted in a health care setting in which he or she works with resident physicians currently enrolled in an accredited program of graduate medical education.",
    description:
      "Each medical student in a medical education program participates in one or more required clinical experiences conducted in a health care setting in which he or she works with resident physicians currently enrolled in an accredited program of graduate medical education.",
    framework: "lcme",
    standard_id: "lcme-std-3",
  },
  {
    id: "lcme-3.2",
    name: "Community of Scholars/Research Opportunities",
    number: "3.2",
    title: "Community of Scholars/Research Opportunities",
    text: "A medical education program is conducted in an environment that fosters the intellectual challenge and spirit of inquiry appropriate to a community of scholars and provides sufficient opportunities, encouragement, and support for medical student participation in the research and other scholarly activities of its faculty.",
    description:
      "A medical education program is conducted in an environment that fosters the intellectual challenge and spirit of inquiry appropriate to a community of scholars and provides sufficient opportunities, encouragement, and support for medical student participation in the research and other scholarly activities of its faculty.",
    framework: "lcme",
    standard_id: "lcme-std-3",
  },
  {
    id: "lcme-3.3",
    name: "Diversity/Pipeline Programs and Partnerships",
    number: "3.3",
    title: "Diversity/Pipeline Programs and Partnerships",
    text: "A medical school has effective policies and practices in place, and engages in ongoing, systematic, and focused recruitment and retention activities, to achieve mission-appropriate diversity outcomes among its students, faculty, senior administrative staff, and other relevant members of its academic community. These activities include the use of programs and/or partnerships aimed at achieving diversity among qualified applicants for medical school admission and the evaluation of program and partnership outcomes.",
    description:
      "A medical school has effective policies and practices in place, and engages in ongoing, systematic, and focused recruitment and retention activities, to achieve mission-appropriate diversity outcomes among its students, faculty, senior administrative staff, and other relevant members of its academic community. These activities include the use of programs and/or partnerships aimed at achieving diversity among qualified applicants for medical school admission and the evaluation of program and partnership outcomes.",
    framework: "lcme",
    standard_id: "lcme-std-3",
  },
  {
    id: "lcme-3.4",
    name: "Anti-Discrimination Policy",
    number: "3.4",
    title: "Anti-Discrimination Policy",
    text: "A medical school has a policy in place to ensure that it does not discriminate on the basis of age, disability, gender identity, national origin, race, religion, sex, sexual orientation or any basis protected by federal law.",
    description:
      "A medical school has a policy in place to ensure that it does not discriminate on the basis of age, disability, gender identity, national origin, race, religion, sex, sexual orientation or any basis protected by federal law.",
    framework: "lcme",
    standard_id: "lcme-std-3",
  },
  {
    id: "lcme-3.5",
    name: "Learning Environment/Professionalism",
    number: "3.5",
    title: "Learning Environment/Professionalism",
    text: "A medical school ensures that the learning environment of its medical education program is conducive to the ongoing development of explicit and appropriate professional behaviors in its medical students, faculty, and staff at all locations. The medical school and its clinical affiliates share the responsibility for periodic evaluation of the learning environment in order to identify positive and negative influences on the maintenance of professional standards, develop and conduct appropriate strategies to enhance positive and mitigate negative influences, and identify and promptly correct violations of professional standards.",
    description:
      "A medical school ensures that the learning environment of its medical education program is conducive to the ongoing development of explicit and appropriate professional behaviors in its medical students, faculty, and staff at all locations. The medical school and its clinical affiliates share the responsibility for periodic evaluation of the learning environment in order to identify positive and negative influences on the maintenance of professional standards, develop and conduct appropriate strategies to enhance positive and mitigate negative influences, and identify and promptly correct violations of professional standards.",
    framework: "lcme",
    standard_id: "lcme-std-3",
  },
  {
    id: "lcme-3.6",
    name: "Student Mistreatment",
    number: "3.6",
    title: "Student Mistreatment",
    text: "A medical school develops effective written policies that define mistreatment, has effective mechanisms in place for a prompt response to any complaints, and supports educational activities aimed at preventing mistreatment. Mechanisms for reporting mistreatment are understood by medical students, including visiting medical students, and ensure that any violations can be registered and investigated without fear of retaliation.",
    description:
      "A medical school develops effective written policies that define mistreatment, has effective mechanisms in place for a prompt response to any complaints, and supports educational activities aimed at preventing mistreatment. Mechanisms for reporting mistreatment are understood by medical students, including visiting medical students, and ensure that any violations can be registered and investigated without fear of retaliation.",
    framework: "lcme",
    standard_id: "lcme-std-3",
  },

  // ── Standard 4: Faculty Preparation, Productivity, Participation, and Policies ──
  {
    id: "lcme-4.1",
    name: "Sufficiency of Faculty",
    number: "4.1",
    title: "Sufficiency of Faculty",
    text: "A medical school has in place a sufficient cohort of faculty members with the qualifications and time required to deliver the medical curriculum and to meet the other needs and fulfill the other missions of the institution.",
    description:
      "A medical school has in place a sufficient cohort of faculty members with the qualifications and time required to deliver the medical curriculum and to meet the other needs and fulfill the other missions of the institution.",
    framework: "lcme",
    standard_id: "lcme-std-4",
  },
  {
    id: "lcme-4.2",
    name: "Scholarly Productivity",
    number: "4.2",
    title: "Scholarly Productivity",
    text: "The faculty of a medical school demonstrate a commitment to continuing scholarly productivity that is characteristic of an institution of higher learning.",
    description:
      "The faculty of a medical school demonstrate a commitment to continuing scholarly productivity that is characteristic of an institution of higher learning.",
    framework: "lcme",
    standard_id: "lcme-std-4",
  },
  {
    id: "lcme-4.3",
    name: "Faculty Appointment Policies",
    number: "4.3",
    title: "Faculty Appointment Policies",
    text: "A medical school has clear policies and procedures in place for faculty appointment, renewal of appointment, promotion, granting of tenure, remediation, and dismissal that involve the faculty, the appropriate department heads, and the dean and provides each faculty member with written information about term of appointment, responsibilities, lines of communication, privileges and benefits, performance evaluation and remediation, terms of dismissal, and, if relevant, the policy on practice earnings.",
    description:
      "A medical school has clear policies and procedures in place for faculty appointment, renewal of appointment, promotion, granting of tenure, remediation, and dismissal that involve the faculty, the appropriate department heads, and the dean and provides each faculty member with written information about term of appointment, responsibilities, lines of communication, privileges and benefits, performance evaluation and remediation, terms of dismissal, and, if relevant, the policy on practice earnings.",
    framework: "lcme",
    standard_id: "lcme-std-4",
  },
  {
    id: "lcme-4.4",
    name: "Feedback to Faculty",
    number: "4.4",
    title: "Feedback to Faculty",
    text: "A medical school faculty member receives regularly scheduled and timely feedback from departmental and/or other programmatic or institutional leaders on academic performance and progress toward promotion and, when applicable, tenure.",
    description:
      "A medical school faculty member receives regularly scheduled and timely feedback from departmental and/or other programmatic or institutional leaders on academic performance and progress toward promotion and, when applicable, tenure.",
    framework: "lcme",
    standard_id: "lcme-std-4",
  },
  {
    id: "lcme-4.5",
    name: "Faculty Professional Development",
    number: "4.5",
    title: "Faculty Professional Development",
    text: "A medical school and/or its sponsoring institution provides opportunities for professional development to each faculty member in the areas of discipline content, curricular design, program evaluation, student assessment methods, instructional methodology, and research to enhance his or her skills and leadership abilities in these areas.",
    description:
      "A medical school and/or its sponsoring institution provides opportunities for professional development to each faculty member in the areas of discipline content, curricular design, program evaluation, student assessment methods, instructional methodology, and research to enhance his or her skills and leadership abilities in these areas.",
    framework: "lcme",
    standard_id: "lcme-std-4",
  },
  {
    id: "lcme-4.6",
    name: "Responsibility for Medical School Policies",
    number: "4.6",
    title: "Responsibility for Medical School Policies",
    text: "At a medical school, the dean and a committee of the faculty determine the governance and policymaking processes within their purview.",
    description:
      "At a medical school, the dean and a committee of the faculty determine the governance and policymaking processes within their purview.",
    framework: "lcme",
    standard_id: "lcme-std-4",
  },

  // ── Standard 5: Educational Resources and Infrastructure ──
  {
    id: "lcme-5.1",
    name: "Adequacy of Financial Resources",
    number: "5.1",
    title: "Adequacy of Financial Resources",
    text: "The present and anticipated financial resources of a medical school are derived from diverse sources and are adequate to sustain a sound program of medical education and to accomplish other programmatic and institutional goals.",
    description:
      "The present and anticipated financial resources of a medical school are derived from diverse sources and are adequate to sustain a sound program of medical education and to accomplish other programmatic and institutional goals.",
    framework: "lcme",
    standard_id: "lcme-std-5",
  },
  {
    id: "lcme-5.2",
    name: "Dean's Authority/Resources",
    number: "5.2",
    title: "Dean's Authority/Resources",
    text: "The dean of a medical school has sufficient resources and budgetary authority to fulfill the dean's responsibility for the management and evaluation of the medical curriculum.",
    description:
      "The dean of a medical school has sufficient resources and budgetary authority to fulfill the dean's responsibility for the management and evaluation of the medical curriculum.",
    framework: "lcme",
    standard_id: "lcme-std-5",
  },
  {
    id: "lcme-5.3",
    name: "Pressures for Self-Financing",
    number: "5.3",
    title: "Pressures for Self-Financing",
    text: "A medical school admits only as many qualified applicants as its total resources can accommodate and does not permit financial or other influences to compromise the school's educational mission.",
    description:
      "A medical school admits only as many qualified applicants as its total resources can accommodate and does not permit financial or other influences to compromise the school's educational mission.",
    framework: "lcme",
    standard_id: "lcme-std-5",
  },
  {
    id: "lcme-5.4",
    name: "Sufficiency of Buildings and Equipment",
    number: "5.4",
    title: "Sufficiency of Buildings and Equipment",
    text: "A medical school has, or is assured the use of, buildings and equipment sufficient to achieve its educational, clinical, and research missions.",
    description:
      "A medical school has, or is assured the use of, buildings and equipment sufficient to achieve its educational, clinical, and research missions.",
    framework: "lcme",
    standard_id: "lcme-std-5",
  },
  {
    id: "lcme-5.5",
    name: "Resources for Clinical Instruction",
    number: "5.5",
    title: "Resources for Clinical Instruction",
    text: "A medical school has, or is assured the use of, appropriate resources for the clinical instruction of its medical students in ambulatory and inpatient settings and has adequate numbers and types of patients (e.g., acuity, case mix, age, gender).",
    description:
      "A medical school has, or is assured the use of, appropriate resources for the clinical instruction of its medical students in ambulatory and inpatient settings and has adequate numbers and types of patients (e.g., acuity, case mix, age, gender).",
    framework: "lcme",
    standard_id: "lcme-std-5",
  },
  {
    id: "lcme-5.6",
    name: "Clinical Instructional Facilities/Information Resources",
    number: "5.6",
    title: "Clinical Instructional Facilities/Information Resources",
    text: "Each hospital or other clinical facility affiliated with a medical school that serves as a major location for required clinical learning experiences has sufficient information resources and instructional facilities for medical student education.",
    description:
      "Each hospital or other clinical facility affiliated with a medical school that serves as a major location for required clinical learning experiences has sufficient information resources and instructional facilities for medical student education.",
    framework: "lcme",
    standard_id: "lcme-std-5",
  },
  {
    id: "lcme-5.7",
    name: "Security, Student Safety, and Disaster Preparedness",
    number: "5.7",
    title: "Security, Student Safety, and Disaster Preparedness",
    text: "A medical school ensures that adequate security systems are in place at all locations and publishes policies and procedures to ensure student safety and to address emergency and disaster preparedness.",
    description:
      "A medical school ensures that adequate security systems are in place at all locations and publishes policies and procedures to ensure student safety and to address emergency and disaster preparedness.",
    framework: "lcme",
    standard_id: "lcme-std-5",
  },
  {
    id: "lcme-5.8",
    name: "Library Resources/Staff",
    number: "5.8",
    title: "Library Resources/Staff",
    text: "A medical school provides ready access to well-maintained library resources sufficient in breadth of holdings and technology to support its educational and other missions. Library services are supervised by a professional staff that is familiar with regional and national information resources and data systems and is responsive to the needs of the medical students, faculty members, and others associated with the institution.",
    description:
      "A medical school provides ready access to well-maintained library resources sufficient in breadth of holdings and technology to support its educational and other missions. Library services are supervised by a professional staff that is familiar with regional and national information resources and data systems and is responsive to the needs of the medical students, faculty members, and others associated with the institution.",
    framework: "lcme",
    standard_id: "lcme-std-5",
  },
  {
    id: "lcme-5.9",
    name: "Information Technology Resources/Staff",
    number: "5.9",
    title: "Information Technology Resources/Staff",
    text: "A medical school provides access to well-maintained information technology resources sufficient in scope to support its educational and other missions. The information technology staff serving a medical education program has sufficient expertise to fulfill its responsibilities and is responsive to the needs of the medical students, faculty members, and others associated with the institution.",
    description:
      "A medical school provides access to well-maintained information technology resources sufficient in scope to support its educational and other missions. The information technology staff serving a medical education program has sufficient expertise to fulfill its responsibilities and is responsive to the needs of the medical students, faculty members, and others associated with the institution.",
    framework: "lcme",
    standard_id: "lcme-std-5",
  },
  {
    id: "lcme-5.10",
    name: "Resources Used by Transfer/Visiting Students",
    number: "5.10",
    title: "Resources Used by Transfer/Visiting Students",
    text: "The resources used by a medical school to accommodate any visiting and transfer medical students in its medical education program do not significantly diminish the resources available to already enrolled medical students.",
    description:
      "The resources used by a medical school to accommodate any visiting and transfer medical students in its medical education program do not significantly diminish the resources available to already enrolled medical students.",
    framework: "lcme",
    standard_id: "lcme-std-5",
  },
  {
    id: "lcme-5.11",
    name: "Study/Lounge/Storage Space/Call Rooms",
    number: "5.11",
    title: "Study/Lounge/Storage Space/Call Rooms",
    text: "A medical school ensures that its medical students have, at each campus and affiliated clinical site, adequate study space, lounge areas, personal lockers or other secure storage facilities, and secure call rooms if students are required to participate in late night or overnight clinical learning experiences.",
    description:
      "A medical school ensures that its medical students have, at each campus and affiliated clinical site, adequate study space, lounge areas, personal lockers or other secure storage facilities, and secure call rooms if students are required to participate in late night or overnight clinical learning experiences.",
    framework: "lcme",
    standard_id: "lcme-std-5",
  },
  {
    id: "lcme-5.12",
    name: "Required Notifications to the LCME",
    number: "5.12",
    title: "Required Notifications to the LCME",
    text: "A medical school notifies the LCME of any substantial change in the number of enrolled medical students; of any decrease in the resources available to the institution for its medical education program, including faculty, physical facilities, or finances; of its plans for any major modification of its medical curriculum; and/or of anticipated changes in the affiliation status of the program's clinical facilities. The program also provides prior notification to the LCME if one or more class size increases will result in a cumulative increase in the size of the entering class at the main campus and/or in one or more existing regional campuses of 10% or 15 students, whichever is smaller, starting at the entering class size/campus yearly enrollment in place at the time of the medical school's last full survey; and/or the school accepts a total of at least 10 transfer students into any year(s) of the curriculum.",
    description:
      "A medical school notifies the LCME of any substantial change in the number of enrolled medical students; of any decrease in the resources available to the institution for its medical education program, including faculty, physical facilities, or finances; of its plans for any major modification of its medical curriculum; and/or of anticipated changes in the affiliation status of the program's clinical facilities. The program also provides prior notification to the LCME if one or more class size increases will result in a cumulative increase in the size of the entering class at the main campus and/or in one or more existing regional campuses of 10% or 15 students, whichever is smaller, starting at the entering class size/campus yearly enrollment in place at the time of the medical school's last full survey; and/or the school accepts a total of at least 10 transfer students into any year(s) of the curriculum.",
    framework: "lcme",
    standard_id: "lcme-std-5",
  },

  // ── Standard 6: Competencies, Curricular Objectives, and Curricular Design ──
  {
    id: "lcme-6.1",
    name: "Program and Learning Objectives",
    number: "6.1",
    title: "Program and Learning Objectives",
    text: "The faculty of a medical school define its medical education program objectives in outcome-based terms that allow the assessment of medical students' progress in developing the competencies that the profession and the public expect of a physician. The medical school makes these medical education program objectives known to all medical students and faculty. In addition, the medical school ensures that the learning objectives for each required learning experience (e.g., course, clerkship) are made known to all medical students and those faculty, residents, and others with teaching and assessment responsibilities in those required experiences.",
    description:
      "The faculty of a medical school define its medical education program objectives in outcome-based terms that allow the assessment of medical students' progress in developing the competencies that the profession and the public expect of a physician. The medical school makes these medical education program objectives known to all medical students and faculty. In addition, the medical school ensures that the learning objectives for each required learning experience (e.g., course, clerkship) are made known to all medical students and those faculty, residents, and others with teaching and assessment responsibilities in those required experiences.",
    framework: "lcme",
    standard_id: "lcme-std-6",
  },
  {
    id: "lcme-6.2",
    name: "Required Clinical Experiences",
    number: "6.2",
    title: "Required Clinical Experiences",
    text: "The faculty of a medical school define the types of patients and clinical conditions that medical students are required to encounter, the skills to be performed by medical students, the appropriate clinical settings for these experiences, and the expected levels of medical student responsibility.",
    description:
      "The faculty of a medical school define the types of patients and clinical conditions that medical students are required to encounter, the skills to be performed by medical students, the appropriate clinical settings for these experiences, and the expected levels of medical student responsibility.",
    framework: "lcme",
    standard_id: "lcme-std-6",
  },
  {
    id: "lcme-6.3",
    name: "Self-Directed and Life-Long Learning",
    number: "6.3",
    title: "Self-Directed and Life-Long Learning",
    text: "The faculty of a medical school ensure that the medical curriculum includes self-directed learning experiences and unscheduled time to allow medical students to develop the skills of lifelong learning. Self-directed learning involves medical students' self-assessment of learning needs; independent identification, analysis, and synthesis of relevant information; appraisal of the credibility of information sources; and feedback on these skills.",
    description:
      "The faculty of a medical school ensure that the medical curriculum includes self-directed learning experiences and unscheduled time to allow medical students to develop the skills of lifelong learning. Self-directed learning involves medical students' self-assessment of learning needs; independent identification, analysis, and synthesis of relevant information; appraisal of the credibility of information sources; and feedback on these skills.",
    framework: "lcme",
    standard_id: "lcme-std-6",
  },
  {
    id: "lcme-6.4",
    name: "Inpatient/Outpatient Experiences",
    number: "6.4",
    title: "Inpatient/Outpatient Experiences",
    text: "The faculty of a medical school ensure that the medical curriculum includes clinical experiences in both outpatient and inpatient settings.",
    description:
      "The faculty of a medical school ensure that the medical curriculum includes clinical experiences in both outpatient and inpatient settings.",
    framework: "lcme",
    standard_id: "lcme-std-6",
  },
  {
    id: "lcme-6.5",
    name: "Elective Opportunities",
    number: "6.5",
    title: "Elective Opportunities",
    text: "The faculty of a medical school ensure that the medical curriculum includes elective opportunities that supplement required learning experiences and that permit medical students to gain exposure to and expand their understanding of medical specialties, and to pursue their individual academic interests.",
    description:
      "The faculty of a medical school ensure that the medical curriculum includes elective opportunities that supplement required learning experiences and that permit medical students to gain exposure to and expand their understanding of medical specialties, and to pursue their individual academic interests.",
    framework: "lcme",
    standard_id: "lcme-std-6",
  },
  {
    id: "lcme-6.6",
    name: "Service-Learning/Community Service",
    number: "6.6",
    title: "Service-Learning/Community Service",
    text: "The faculty of a medical school ensure that the medical education program provides sufficient opportunities for, encourages, and supports medical student participation in service-learning and/or community service activities.",
    description:
      "The faculty of a medical school ensure that the medical education program provides sufficient opportunities for, encourages, and supports medical student participation in service-learning and/or community service activities.",
    framework: "lcme",
    standard_id: "lcme-std-6",
  },
  {
    id: "lcme-6.7",
    name: "Academic Environments",
    number: "6.7",
    title: "Academic Environments",
    text: "The faculty of a medical school ensure that medical students have opportunities to learn in academic environments that permit interaction with students enrolled in other health professions, graduate and professional degree programs, and in clinical environments that provide opportunities for interaction with physicians in graduate medical education programs and in continuing medical education programs.",
    description:
      "The faculty of a medical school ensure that medical students have opportunities to learn in academic environments that permit interaction with students enrolled in other health professions, graduate and professional degree programs, and in clinical environments that provide opportunities for interaction with physicians in graduate medical education programs and in continuing medical education programs.",
    framework: "lcme",
    standard_id: "lcme-std-6",
  },
  {
    id: "lcme-6.8",
    name: "Education Program Duration",
    number: "6.8",
    title: "Education Program Duration",
    text: "A medical education program includes at least 130 weeks of instruction.",
    description:
      "A medical education program includes at least 130 weeks of instruction.",
    framework: "lcme",
    standard_id: "lcme-std-6",
  },

  // ── Standard 7: Curricular Content ──
  {
    id: "lcme-7.1",
    name: "Biomedical, Behavioral, Social Sciences",
    number: "7.1",
    title: "Biomedical, Behavioral, Social Sciences",
    text: "The faculty of a medical school ensure that the medical curriculum includes content from the biomedical, behavioral, and socioeconomic sciences to support medical students' mastery of contemporary medical science knowledge and concepts and the methods fundamental to applying them to the health of individuals and populations.",
    description:
      "The faculty of a medical school ensure that the medical curriculum includes content from the biomedical, behavioral, and socioeconomic sciences to support medical students' mastery of contemporary medical science knowledge and concepts and the methods fundamental to applying them to the health of individuals and populations.",
    framework: "lcme",
    standard_id: "lcme-std-7",
  },
  {
    id: "lcme-7.2",
    name: "Organ Systems/Life Cycle/Prevention/Symptoms/Signs/Differential Diagnosis, Treatment Planning",
    number: "7.2",
    title:
      "Organ Systems/Life Cycle/Prevention/Symptoms/Signs/Differential Diagnosis, Treatment Planning",
    text: "The faculty of a medical school ensure that the medical curriculum includes content and clinical experiences related to each organ system; each phase of the human life cycle; continuity of care; and preventive, acute, chronic, rehabilitative, and end-of-life care.",
    description:
      "The faculty of a medical school ensure that the medical curriculum includes content and clinical experiences related to each organ system; each phase of the human life cycle; continuity of care; and preventive, acute, chronic, rehabilitative, and end-of-life care.",
    framework: "lcme",
    standard_id: "lcme-std-7",
  },
  {
    id: "lcme-7.3",
    name: "Scientific Method/Clinical/Translational Research",
    number: "7.3",
    title: "Scientific Method/Clinical/Translational Research",
    text: "The faculty of a medical school ensure that the medical curriculum includes instruction in the scientific method and in the basic scientific and ethical principles of clinical and translational research, including the ways in which such research is conducted, evaluated, explained to patients, and applied to patient care.",
    description:
      "The faculty of a medical school ensure that the medical curriculum includes instruction in the scientific method and in the basic scientific and ethical principles of clinical and translational research, including the ways in which such research is conducted, evaluated, explained to patients, and applied to patient care.",
    framework: "lcme",
    standard_id: "lcme-std-7",
  },
  {
    id: "lcme-7.4",
    name: "Critical Judgment/Problem-Solving Skills",
    number: "7.4",
    title: "Critical Judgment/Problem-Solving Skills",
    text: "The faculty of a medical school ensure that the medical curriculum incorporates the fundamental principles of medicine, provides opportunities for medical students to acquire skills of critical judgment based on evidence and experience, and develops medical students' ability to use those principles and skills effectively in solving problems of health and disease.",
    description:
      "The faculty of a medical school ensure that the medical curriculum incorporates the fundamental principles of medicine, provides opportunities for medical students to acquire skills of critical judgment based on evidence and experience, and develops medical students' ability to use those principles and skills effectively in solving problems of health and disease.",
    framework: "lcme",
    standard_id: "lcme-std-7",
  },
  {
    id: "lcme-7.5",
    name: "Societal Problems",
    number: "7.5",
    title: "Societal Problems",
    text: "The faculty of a medical school ensure that the medical curriculum includes instruction in the diagnosis, prevention, appropriate reporting, and treatment of the medical consequences of common societal problems.",
    description:
      "The faculty of a medical school ensure that the medical curriculum includes instruction in the diagnosis, prevention, appropriate reporting, and treatment of the medical consequences of common societal problems.",
    framework: "lcme",
    standard_id: "lcme-std-7",
  },
  {
    id: "lcme-7.6",
    name: "Cultural Competence and Health Care Disparities",
    number: "7.6",
    title: "Cultural Competence and Health Care Disparities",
    text: "The faculty of a medical school ensure that the medical curriculum provides opportunities for medical students to learn to recognize and appropriately address biases in themselves, in others, and in the health care delivery process. The medical curriculum includes content regarding the following: the diverse manner in which people perceive health and illness and respond to various symptoms, diseases, and treatments; the basic principles of culturally competent health care; recognition of the impact of disparities in health care on all populations and potential methods to eliminate health care disparities; the knowledge, skills, and core professional attributes needed to provide effective care in a multidimensional and diverse society.",
    description:
      "The faculty of a medical school ensure that the medical curriculum provides opportunities for medical students to learn to recognize and appropriately address biases in themselves, in others, and in the health care delivery process. The medical curriculum includes content regarding the following: the diverse manner in which people perceive health and illness and respond to various symptoms, diseases, and treatments; the basic principles of culturally competent health care; recognition of the impact of disparities in health care on all populations and potential methods to eliminate health care disparities; the knowledge, skills, and core professional attributes needed to provide effective care in a multidimensional and diverse society.",
    framework: "lcme",
    standard_id: "lcme-std-7",
  },
  {
    id: "lcme-7.7",
    name: "Medical Ethics",
    number: "7.7",
    title: "Medical Ethics",
    text: "The faculty of a medical school ensure that the medical curriculum includes instruction for medical students in medical ethics and human values both prior to and during their participation in patient care activities and require medical students to behave ethically in caring for patients and in relating to patients' families and others involved in patient care.",
    description:
      "The faculty of a medical school ensure that the medical curriculum includes instruction for medical students in medical ethics and human values both prior to and during their participation in patient care activities and require medical students to behave ethically in caring for patients and in relating to patients' families and others involved in patient care.",
    framework: "lcme",
    standard_id: "lcme-std-7",
  },
  {
    id: "lcme-7.8",
    name: "Communication Skills",
    number: "7.8",
    title: "Communication Skills",
    text: "The faculty of a medical school ensure that the medical curriculum includes specific instruction in communication skills as they relate to communication with patients and their families, colleagues, and other health professionals.",
    description:
      "The faculty of a medical school ensure that the medical curriculum includes specific instruction in communication skills as they relate to communication with patients and their families, colleagues, and other health professionals.",
    framework: "lcme",
    standard_id: "lcme-std-7",
  },
  {
    id: "lcme-7.9",
    name: "Interprofessional Collaborative Skills",
    number: "7.9",
    title: "Interprofessional Collaborative Skills",
    text: "The faculty of a medical school ensure that the core curriculum of the medical education program prepares medical students to function collaboratively on health care teams that include health professionals from other disciplines as they provide coordinated services to patients. These curricular experiences include practitioners and/or students from the other health professions.",
    description:
      "The faculty of a medical school ensure that the core curriculum of the medical education program prepares medical students to function collaboratively on health care teams that include health professionals from other disciplines as they provide coordinated services to patients. These curricular experiences include practitioners and/or students from the other health professions.",
    framework: "lcme",
    standard_id: "lcme-std-7",
  },

  // ── Standard 8: Curricular Management, Evaluation, and Enhancement ──
  {
    id: "lcme-8.1",
    name: "Curricular Management",
    number: "8.1",
    title: "Curricular Management",
    text: "A medical school has in place an institutional body (i.e., a faculty committee) that oversees the medical education program as a whole and has responsibility for the overall design, management, integration, evaluation, and enhancement of a coherent and coordinated medical curriculum.",
    description:
      "A medical school has in place an institutional body (i.e., a faculty committee) that oversees the medical education program as a whole and has responsibility for the overall design, management, integration, evaluation, and enhancement of a coherent and coordinated medical curriculum.",
    framework: "lcme",
    standard_id: "lcme-std-8",
  },
  {
    id: "lcme-8.2",
    name: "Use of Medical Educational Program Objectives",
    number: "8.2",
    title: "Use of Medical Educational Program Objectives",
    text: "The faculty of a medical school, through the faculty committee responsible for the medical curriculum, ensure that the medical curriculum uses formally adopted medical education program objectives to guide the selection of curriculum content, and to review and revise the curriculum. The faculty leadership responsible for each required course and clerkship link the learning objectives of that course or clerkship to the medical education program objectives.",
    description:
      "The faculty of a medical school, through the faculty committee responsible for the medical curriculum, ensure that the medical curriculum uses formally adopted medical education program objectives to guide the selection of curriculum content, and to review and revise the curriculum. The faculty leadership responsible for each required course and clerkship link the learning objectives of that course or clerkship to the medical education program objectives.",
    framework: "lcme",
    standard_id: "lcme-std-8",
  },
  {
    id: "lcme-8.3",
    name: "Curricular Design, Review, Revision/Content Monitoring",
    number: "8.3",
    title: "Curricular Design, Review, Revision/Content Monitoring",
    text: "The faculty of a medical school, through the faculty committee responsible for the medical curriculum, are responsible for the detailed development, design, and implementation of all components of the medical education program, including the medical education program objectives, the learning objectives for each required curricular segment, instructional and assessment methods appropriate for the achievement of those objectives, content and content sequencing, ongoing review and updating of content, and evaluation of course, clerkship, and teacher quality. These medical education program objectives, learning objectives, content, and instructional and assessment methods are subject to ongoing monitoring, review, and revision by the responsible committee.",
    description:
      "The faculty of a medical school, through the faculty committee responsible for the medical curriculum, are responsible for the detailed development, design, and implementation of all components of the medical education program, including the medical education program objectives, the learning objectives for each required curricular segment, instructional and assessment methods appropriate for the achievement of those objectives, content and content sequencing, ongoing review and updating of content, and evaluation of course, clerkship, and teacher quality. These medical education program objectives, learning objectives, content, and instructional and assessment methods are subject to ongoing monitoring, review, and revision by the responsible committee.",
    framework: "lcme",
    standard_id: "lcme-std-8",
  },
  {
    id: "lcme-8.4",
    name: "Evaluation of Educational Program Outcomes",
    number: "8.4",
    title: "Evaluation of Educational Program Outcomes",
    text: "A medical school collects and uses a variety of outcome data, including national norms of accomplishment, to demonstrate the extent to which medical students are achieving medical education program objectives and to enhance the quality of the medical education program as a whole. These data are collected during program enrollment and after program completion.",
    description:
      "A medical school collects and uses a variety of outcome data, including national norms of accomplishment, to demonstrate the extent to which medical students are achieving medical education program objectives and to enhance the quality of the medical education program as a whole. These data are collected during program enrollment and after program completion.",
    framework: "lcme",
    standard_id: "lcme-std-8",
  },
  {
    id: "lcme-8.5",
    name: "Medical Student Feedback",
    number: "8.5",
    title: "Medical Student Feedback",
    text: "In evaluating medical education program quality, a medical school has formal processes in place to collect and consider medical student evaluations of their courses, clerkships, and teachers, and other relevant information.",
    description:
      "In evaluating medical education program quality, a medical school has formal processes in place to collect and consider medical student evaluations of their courses, clerkships, and teachers, and other relevant information.",
    framework: "lcme",
    standard_id: "lcme-std-8",
  },
  {
    id: "lcme-8.6",
    name: "Monitoring of Completion of Required Clinical Experiences",
    number: "8.6",
    title: "Monitoring of Completion of Required Clinical Experiences",
    text: "A medical school has in place a system with central oversight that monitors and ensures completion by all medical students of required clinical experiences in the medical education program and remedies any identified gaps.",
    description:
      "A medical school has in place a system with central oversight that monitors and ensures completion by all medical students of required clinical experiences in the medical education program and remedies any identified gaps.",
    framework: "lcme",
    standard_id: "lcme-std-8",
  },
  {
    id: "lcme-8.7",
    name: "Comparability of Education/Assessment",
    number: "8.7",
    title: "Comparability of Education/Assessment",
    text: "A medical school ensures that the medical curriculum includes comparable educational experiences and equivalent methods of assessment across all locations within a given course and clerkship to ensure that all medical students achieve the same medical education program objectives.",
    description:
      "A medical school ensures that the medical curriculum includes comparable educational experiences and equivalent methods of assessment across all locations within a given course and clerkship to ensure that all medical students achieve the same medical education program objectives.",
    framework: "lcme",
    standard_id: "lcme-std-8",
  },
  {
    id: "lcme-8.8",
    name: "Monitoring Student Time",
    number: "8.8",
    title: "Monitoring Student Time",
    text: "The medical school faculty committee responsible for the medical curriculum and the program's administration and leadership ensure the development and implementation of effective policies and procedures regarding the amount of time medical students spend in required activities, including the total number of hours medical students are required to spend in clinical and educational activities during clerkships.",
    description:
      "The medical school faculty committee responsible for the medical curriculum and the program's administration and leadership ensure the development and implementation of effective policies and procedures regarding the amount of time medical students spend in required activities, including the total number of hours medical students are required to spend in clinical and educational activities during clerkships.",
    framework: "lcme",
    standard_id: "lcme-std-8",
  },

  // ── Standard 9: Teaching, Supervision, Assessment, and Student and Patient Safety ──
  {
    id: "lcme-9.1",
    name: "Preparation of Resident and Non-Faculty Instructors",
    number: "9.1",
    title: "Preparation of Resident and Non-Faculty Instructors",
    text: "In a medical school, residents, graduate students, postdoctoral fellows, and other non-faculty instructors in the medical education program who supervise or teach medical students are familiar with the learning objectives of the course or clerkship and are prepared for their roles in teaching and assessment. The medical school provides resources to enhance residents' and non-faculty instructors' teaching and assessment skills and provides central monitoring of their participation in those opportunities.",
    description:
      "In a medical school, residents, graduate students, postdoctoral fellows, and other non-faculty instructors in the medical education program who supervise or teach medical students are familiar with the learning objectives of the course or clerkship and are prepared for their roles in teaching and assessment. The medical school provides resources to enhance residents' and non-faculty instructors' teaching and assessment skills and provides central monitoring of their participation in those opportunities.",
    framework: "lcme",
    standard_id: "lcme-std-9",
  },
  {
    id: "lcme-9.2",
    name: "Faculty Appointments",
    number: "9.2",
    title: "Faculty Appointments",
    text: "A medical school ensures that supervision of medical student learning experiences is provided throughout required clerkships by members of the school's faculty.",
    description:
      "A medical school ensures that supervision of medical student learning experiences is provided throughout required clerkships by members of the school's faculty.",
    framework: "lcme",
    standard_id: "lcme-std-9",
  },
  {
    id: "lcme-9.3",
    name: "Clinical Supervision of Medical Students",
    number: "9.3",
    title: "Clinical Supervision of Medical Students",
    text: "A medical school ensures that medical students in clinical learning situations involving patient care are appropriately supervised at all times in order to ensure patient and student safety, that the level of responsibility delegated to the student is appropriate to the student's level of training, and that the activities supervised are within the scope of practice of the supervising health professional.",
    description:
      "A medical school ensures that medical students in clinical learning situations involving patient care are appropriately supervised at all times in order to ensure patient and student safety, that the level of responsibility delegated to the student is appropriate to the student's level of training, and that the activities supervised are within the scope of practice of the supervising health professional.",
    framework: "lcme",
    standard_id: "lcme-std-9",
  },
  {
    id: "lcme-9.4",
    name: "Assessment System",
    number: "9.4",
    title: "Assessment System",
    text: "A medical school ensures that, throughout its medical education program, there is a centralized system in place that employs a variety of measures (including direct observation) for the assessment of student achievement, including students' acquisition of the knowledge, core clinical skills (e.g., medical history-taking, physical examination), behaviors, and attitudes specified in medical education program objectives, and that ensures that all medical students achieve the same medical education program objectives.",
    description:
      "A medical school ensures that, throughout its medical education program, there is a centralized system in place that employs a variety of measures (including direct observation) for the assessment of student achievement, including students' acquisition of the knowledge, core clinical skills (e.g., medical history-taking, physical examination), behaviors, and attitudes specified in medical education program objectives, and that ensures that all medical students achieve the same medical education program objectives.",
    framework: "lcme",
    standard_id: "lcme-std-9",
  },
  {
    id: "lcme-9.5",
    name: "Narrative Assessment",
    number: "9.5",
    title: "Narrative Assessment",
    text: "A medical school ensures that a narrative description of a medical student's performance, including non-cognitive achievement, is included as a component of the assessment in each required course and clerkship of the medical education program whenever teacher-student interaction permits this form of assessment.",
    description:
      "A medical school ensures that a narrative description of a medical student's performance, including non-cognitive achievement, is included as a component of the assessment in each required course and clerkship of the medical education program whenever teacher-student interaction permits this form of assessment.",
    framework: "lcme",
    standard_id: "lcme-std-9",
  },
  {
    id: "lcme-9.6",
    name: "Setting Standards of Achievement",
    number: "9.6",
    title: "Setting Standards of Achievement",
    text: "A medical school ensures that faculty members with appropriate knowledge and expertise set standards of achievement in each required learning experience in the medical education program.",
    description:
      "A medical school ensures that faculty members with appropriate knowledge and expertise set standards of achievement in each required learning experience in the medical education program.",
    framework: "lcme",
    standard_id: "lcme-std-9",
  },
  {
    id: "lcme-9.7",
    name: "Formative Assessment and Feedback",
    number: "9.7",
    title: "Formative Assessment and Feedback",
    text: "The medical school's curricular governance committee ensures that each medical student is assessed and provided with formal formative feedback early enough during each required course or clerkship to allow sufficient time for remediation. Formal feedback occurs at least at the midpoint of the course or clerkship. A course or clerkship less than four weeks in length provides alternate means by which medical students can measure their progress in learning.",
    description:
      "The medical school's curricular governance committee ensures that each medical student is assessed and provided with formal formative feedback early enough during each required course or clerkship to allow sufficient time for remediation. Formal feedback occurs at least at the midpoint of the course or clerkship. A course or clerkship less than four weeks in length provides alternate means by which medical students can measure their progress in learning.",
    framework: "lcme",
    standard_id: "lcme-std-9",
  },
  {
    id: "lcme-9.8",
    name: "Fair and Timely Summative Assessment",
    number: "9.8",
    title: "Fair and Timely Summative Assessment",
    text: "A medical school has in place a system of fair and timely summative assessment of medical student achievement in each course and clerkship of the medical education program. Final grades are available within six weeks of the end of a course or clerkship.",
    description:
      "A medical school has in place a system of fair and timely summative assessment of medical student achievement in each course and clerkship of the medical education program. Final grades are available within six weeks of the end of a course or clerkship.",
    framework: "lcme",
    standard_id: "lcme-std-9",
  },
  {
    id: "lcme-9.9",
    name: "Student Advancement and Appeal Process",
    number: "9.9",
    title: "Student Advancement and Appeal Process",
    text: "A medical school ensures that the medical education program has a single set of core standards for the advancement and graduation of all medical students across all locations. A subset of medical students may have academic requirements in addition to the core standards if they are enrolled in a parallel curriculum. A medical school ensures that there is a fair and formal process for taking any action that may affect the status of a medical student, including timely notice of the impending action, disclosure of the evidence on which the action would be based, an opportunity for the medical student to respond, and an opportunity to appeal any adverse decision related to advancement, graduation, or dismissal.",
    description:
      "A medical school ensures that the medical education program has a single set of core standards for the advancement and graduation of all medical students across all locations. A subset of medical students may have academic requirements in addition to the core standards if they are enrolled in a parallel curriculum. A medical school ensures that there is a fair and formal process for taking any action that may affect the status of a medical student, including timely notice of the impending action, disclosure of the evidence on which the action would be based, an opportunity for the medical student to respond, and an opportunity to appeal any adverse decision related to advancement, graduation, or dismissal.",
    framework: "lcme",
    standard_id: "lcme-std-9",
  },

  // ── Standard 10: Medical Student Selection, Assignment, and Progress ──
  {
    id: "lcme-10.1",
    name: "Premedical Education/Required Coursework",
    number: "10.1",
    title: "Premedical Education/Required Coursework",
    text: "Through its requirements for admission, a medical school encourages potential applicants to the medical education program to acquire a broad undergraduate education that includes the study of the humanities, natural sciences, and social sciences, and confines its specific premedical course requirements to those deemed essential preparation for successful completion of its medical curriculum.",
    description:
      "Through its requirements for admission, a medical school encourages potential applicants to the medical education program to acquire a broad undergraduate education that includes the study of the humanities, natural sciences, and social sciences, and confines its specific premedical course requirements to those deemed essential preparation for successful completion of its medical curriculum.",
    framework: "lcme",
    standard_id: "lcme-std-10",
  },
  {
    id: "lcme-10.2",
    name: "Final Authority of Admission Committee",
    number: "10.2",
    title: "Final Authority of Admission Committee",
    text: "The final responsibility for accepting students to a medical school rests with a formally constituted admission committee. The authority and composition of the committee and the rules for its operation, including voting privileges and the definition of a quorum, are specified in bylaws or other medical school policies. Faculty members constitute the majority of voting members at all meetings. The selection of individual medical students for admission is not influenced by any political or financial factors.",
    description:
      "The final responsibility for accepting students to a medical school rests with a formally constituted admission committee. The authority and composition of the committee and the rules for its operation, including voting privileges and the definition of a quorum, are specified in bylaws or other medical school policies. Faculty members constitute the majority of voting members at all meetings. The selection of individual medical students for admission is not influenced by any political or financial factors.",
    framework: "lcme",
    standard_id: "lcme-std-10",
  },
  {
    id: "lcme-10.3",
    name: "Policies Regarding Student Selection/Progress and Their Dissemination",
    number: "10.3",
    title:
      "Policies Regarding Student Selection/Progress and Their Dissemination",
    text: "The faculty of a medical school establish criteria for student selection and develop and implement effective policies and procedures regarding, and make decisions about, medical student application, selection, admission, assessment, promotion, graduation, and any disciplinary action. The medical school makes available to all interested parties its criteria, standards, policies, and procedures regarding these matters.",
    description:
      "The faculty of a medical school establish criteria for student selection and develop and implement effective policies and procedures regarding, and make decisions about, medical student application, selection, admission, assessment, promotion, graduation, and any disciplinary action. The medical school makes available to all interested parties its criteria, standards, policies, and procedures regarding these matters.",
    framework: "lcme",
    standard_id: "lcme-std-10",
  },
  {
    id: "lcme-10.4",
    name: "Characteristics of Accepted Applicants",
    number: "10.4",
    title: "Characteristics of Accepted Applicants",
    text: "A medical school selects applicants for admission who possess the intelligence, integrity, and personal and emotional characteristics necessary for them to become competent physicians.",
    description:
      "A medical school selects applicants for admission who possess the intelligence, integrity, and personal and emotional characteristics necessary for them to become competent physicians.",
    framework: "lcme",
    standard_id: "lcme-std-10",
  },
  {
    id: "lcme-10.5",
    name: "Technical Standards",
    number: "10.5",
    title: "Technical Standards",
    text: "A medical school develops and publishes technical standards for the admission, retention, and graduation of applicants or medical students in accordance with legal requirements.",
    description:
      "A medical school develops and publishes technical standards for the admission, retention, and graduation of applicants or medical students in accordance with legal requirements.",
    framework: "lcme",
    standard_id: "lcme-std-10",
  },
  {
    id: "lcme-10.6",
    name: "Content of Informational Materials",
    number: "10.6",
    title: "Content of Informational Materials",
    text: "A medical school's academic bulletin and other informational, advertising, and recruitment materials present a balanced and accurate representation of the mission and objectives of the medical education program, state the academic and other (e.g., immunization) requirements for the MD degree and all associated joint degree programs, provide the most recent academic calendar for each curricular option, and describe all required courses and clerkships offered by the medical education program.",
    description:
      "A medical school's academic bulletin and other informational, advertising, and recruitment materials present a balanced and accurate representation of the mission and objectives of the medical education program, state the academic and other (e.g., immunization) requirements for the MD degree and all associated joint degree programs, provide the most recent academic calendar for each curricular option, and describe all required courses and clerkships offered by the medical education program.",
    framework: "lcme",
    standard_id: "lcme-std-10",
  },
  {
    id: "lcme-10.7",
    name: "Transfer Students",
    number: "10.7",
    title: "Transfer Students",
    text: "A medical school ensures that any student accepted for transfer or admission with advanced standing demonstrates academic achievements, completion of relevant prior coursework, and other relevant characteristics comparable to those of the medical students in the class that he or she would join. A medical school accepts a transfer medical student into the final year of a medical education program only in rare and extraordinary personal or educational circumstances.",
    description:
      "A medical school ensures that any student accepted for transfer or admission with advanced standing demonstrates academic achievements, completion of relevant prior coursework, and other relevant characteristics comparable to those of the medical students in the class that he or she would join. A medical school accepts a transfer medical student into the final year of a medical education program only in rare and extraordinary personal or educational circumstances.",
    framework: "lcme",
    standard_id: "lcme-std-10",
  },
  {
    id: "lcme-10.8",
    name: "Visiting Students",
    number: "10.8",
    title: "Visiting Students",
    text: "A medical school does all of the following: verifies the credentials of each visiting medical student; ensures that each visiting medical student demonstrates qualifications comparable to those of the medical students the visiting student would join in educational experiences; maintains a complete roster of visiting medical students; approves each visiting medical student's assignments; provides a performance assessment for each visiting medical student; establishes health-related protocols for such visiting medical students; identifies the administrative office that fulfills each of these responsibilities.",
    description:
      "A medical school does all of the following: verifies the credentials of each visiting medical student; ensures that each visiting medical student demonstrates qualifications comparable to those of the medical students the visiting student would join in educational experiences; maintains a complete roster of visiting medical students; approves each visiting medical student's assignments; provides a performance assessment for each visiting medical student; establishes health-related protocols for such visiting medical students; identifies the administrative office that fulfills each of these responsibilities.",
    framework: "lcme",
    standard_id: "lcme-std-10",
  },
  {
    id: "lcme-10.9",
    name: "Student Assignment",
    number: "10.9",
    title: "Student Assignment",
    text: "A medical school assumes ultimate responsibility for the selection and assignment of medical students to each location and/or parallel curriculum (i.e., track) and identifies the administrative office that fulfills this responsibility. A process exists whereby a medical student with an appropriate rationale can request an alternative assignment when circumstances allow for it.",
    description:
      "A medical school assumes ultimate responsibility for the selection and assignment of medical students to each location and/or parallel curriculum (i.e., track) and identifies the administrative office that fulfills this responsibility. A process exists whereby a medical student with an appropriate rationale can request an alternative assignment when circumstances allow for it.",
    framework: "lcme",
    standard_id: "lcme-std-10",
  },

  // ── Standard 11: Medical Student Academic Support, Career Advising, and Educational Records ──
  {
    id: "lcme-11.1",
    name: "Academic Advising",
    number: "11.1",
    title: "Academic Advising",
    text: "A medical school has an effective system of academic advising in place for medical students that integrates the efforts of faculty members, course and clerkship directors, and student affairs staff with its counseling and tutorial services and ensures that medical students can obtain academic counseling from individuals who have no role in making assessment or promotion decisions about them.",
    description:
      "A medical school has an effective system of academic advising in place for medical students that integrates the efforts of faculty members, course and clerkship directors, and student affairs staff with its counseling and tutorial services and ensures that medical students can obtain academic counseling from individuals who have no role in making assessment or promotion decisions about them.",
    framework: "lcme",
    standard_id: "lcme-std-11",
  },
  {
    id: "lcme-11.2",
    name: "Career Advising",
    number: "11.2",
    title: "Career Advising",
    text: "A medical school has an effective career advising system in place that integrates the efforts of faculty members, clerkship directors, and student affairs staff to assist medical students in choosing elective courses, evaluating career options, and applying to residency programs.",
    description:
      "A medical school has an effective career advising system in place that integrates the efforts of faculty members, clerkship directors, and student affairs staff to assist medical students in choosing elective courses, evaluating career options, and applying to residency programs.",
    framework: "lcme",
    standard_id: "lcme-std-11",
  },
  {
    id: "lcme-11.3",
    name: "Oversight of Extramural Electives",
    number: "11.3",
    title: "Oversight of Extramural Electives",
    text: "If a medical student at a medical school is permitted to take an elective under the auspices of another medical school, institution, or organization, a centralized system exists in the dean's office at the home school to review the proposed extramural elective prior to approval and to ensure the return of a performance assessment of the student and an evaluation of the elective by the student. Information about such issues as the following are available, as appropriate, to the student and the medical school in order to inform the student's and the school's review of the experience prior to its approval: potential risks to the health and safety of patients, students, and the community; the availability of emergency care; the possibility of natural disasters, political instability, and exposure to disease; the need for additional preparation prior to, support during, and follow-up after the elective; the level and quality of supervision; any potential challenges to the code of medical ethics adopted by the home school.",
    description:
      "If a medical student at a medical school is permitted to take an elective under the auspices of another medical school, institution, or organization, a centralized system exists in the dean's office at the home school to review the proposed extramural elective prior to approval and to ensure the return of a performance assessment of the student and an evaluation of the elective by the student. Information about such issues as the following are available, as appropriate, to the student and the medical school in order to inform the student's and the school's review of the experience prior to its approval: potential risks to the health and safety of patients, students, and the community; the availability of emergency care; the possibility of natural disasters, political instability, and exposure to disease; the need for additional preparation prior to, support during, and follow-up after the elective; the level and quality of supervision; any potential challenges to the code of medical ethics adopted by the home school.",
    framework: "lcme",
    standard_id: "lcme-std-11",
  },
  {
    id: "lcme-11.4",
    name: "Provision of MSPE",
    number: "11.4",
    title: "Provision of MSPE",
    text: "A medical school provides a Medical Student Performance Evaluation required for the residency application of a medical student only on or after October 1 of the student's final year of the medical education program.",
    description:
      "A medical school provides a Medical Student Performance Evaluation required for the residency application of a medical student only on or after October 1 of the student's final year of the medical education program.",
    framework: "lcme",
    standard_id: "lcme-std-11",
  },
  {
    id: "lcme-11.5",
    name: "Confidentiality of Student Educational Records",
    number: "11.5",
    title: "Confidentiality of Student Educational Records",
    text: "At a medical school, medical student educational records are confidential and available only to those members of the faculty and administration with a need to know, unless released by the student or as otherwise governed by laws concerning confidentiality.",
    description:
      "At a medical school, medical student educational records are confidential and available only to those members of the faculty and administration with a need to know, unless released by the student or as otherwise governed by laws concerning confidentiality.",
    framework: "lcme",
    standard_id: "lcme-std-11",
  },
  {
    id: "lcme-11.6",
    name: "Student Access to Educational Records",
    number: "11.6",
    title: "Student Access to Educational Records",
    text: "A medical school has policies and procedures in place that permit a medical student to review and to challenge the student's educational records, including the Medical Student Performance Evaluation, if the student considers the information contained therein to be inaccurate, misleading, or inappropriate.",
    description:
      "A medical school has policies and procedures in place that permit a medical student to review and to challenge the student's educational records, including the Medical Student Performance Evaluation, if the student considers the information contained therein to be inaccurate, misleading, or inappropriate.",
    framework: "lcme",
    standard_id: "lcme-std-11",
  },

  // ── Standard 12: Medical Student Health Services, Personal Counseling, and Financial Aid Services ──
  {
    id: "lcme-12.1",
    name: "Financial Aid/Debt Management Counseling/Student Educational Debt",
    number: "12.1",
    title: "Financial Aid/Debt Management Counseling/Student Educational Debt",
    text: "A medical school provides its medical students with effective financial aid and debt management counseling and has mechanisms in place to minimize the impact of direct educational expenses (i.e., tuition, fees, books, supplies) on medical student indebtedness.",
    description:
      "A medical school provides its medical students with effective financial aid and debt management counseling and has mechanisms in place to minimize the impact of direct educational expenses (i.e., tuition, fees, books, supplies) on medical student indebtedness.",
    framework: "lcme",
    standard_id: "lcme-std-12",
  },
  {
    id: "lcme-12.2",
    name: "Tuition Refund Policy",
    number: "12.2",
    title: "Tuition Refund Policy",
    text: "A medical school has clear policies for the refund of a medical student's tuition, fees, and other allowable payments (e.g., payments made for health or disability insurance, parking, housing, and other similar services for which a student may no longer be eligible following withdrawal).",
    description:
      "A medical school has clear policies for the refund of a medical student's tuition, fees, and other allowable payments (e.g., payments made for health or disability insurance, parking, housing, and other similar services for which a student may no longer be eligible following withdrawal).",
    framework: "lcme",
    standard_id: "lcme-std-12",
  },
  {
    id: "lcme-12.3",
    name: "Personal Counseling/Well-Being Programs",
    number: "12.3",
    title: "Personal Counseling/Well-Being Programs",
    text: "A medical school has in place an effective system of personal counseling for its medical students that includes programs to promote their well-being and to facilitate their adjustment to the physical and emotional demands of medical education.",
    description:
      "A medical school has in place an effective system of personal counseling for its medical students that includes programs to promote their well-being and to facilitate their adjustment to the physical and emotional demands of medical education.",
    framework: "lcme",
    standard_id: "lcme-std-12",
  },
  {
    id: "lcme-12.4",
    name: "Student Access to Health Care Services",
    number: "12.4",
    title: "Student Access to Health Care Services",
    text: "A medical school provides its medical students with timely access to needed diagnostic, preventive, and therapeutic health services at sites in reasonable proximity to the locations of their required educational experiences and has policies and procedures in place that permit students to be excused from these experiences to seek needed care.",
    description:
      "A medical school provides its medical students with timely access to needed diagnostic, preventive, and therapeutic health services at sites in reasonable proximity to the locations of their required educational experiences and has policies and procedures in place that permit students to be excused from these experiences to seek needed care.",
    framework: "lcme",
    standard_id: "lcme-std-12",
  },
  {
    id: "lcme-12.5",
    name: "Non-Involvement of Providers of Student Health Services in Student Assessment/Location of Student Health Records",
    number: "12.5",
    title:
      "Non-Involvement of Providers of Student Health Services in Student Assessment/Location of Student Health Records",
    text: "The health professionals who provide health services, including psychiatric/psychological counseling, to a medical student have no involvement in the academic assessment or promotion of the medical student receiving those services, excluding exceptional circumstances. A medical school ensures that medical student health records are maintained in accordance with legal requirements for security, privacy, confidentiality, and accessibility.",
    description:
      "The health professionals who provide health services, including psychiatric/psychological counseling, to a medical student have no involvement in the academic assessment or promotion of the medical student receiving those services, excluding exceptional circumstances. A medical school ensures that medical student health records are maintained in accordance with legal requirements for security, privacy, confidentiality, and accessibility.",
    framework: "lcme",
    standard_id: "lcme-std-12",
  },
  {
    id: "lcme-12.6",
    name: "Student Health and Disability Insurance",
    number: "12.6",
    title: "Student Health and Disability Insurance",
    text: "A medical school ensures that health insurance and disability insurance are available to each medical student and that health insurance is also available to each medical student's dependents.",
    description:
      "A medical school ensures that health insurance and disability insurance are available to each medical student and that health insurance is also available to each medical student's dependents.",
    framework: "lcme",
    standard_id: "lcme-std-12",
  },
  {
    id: "lcme-12.7",
    name: "Immunization Requirements and Monitoring",
    number: "12.7",
    title: "Immunization Requirements and Monitoring",
    text: "A medical school follows accepted guidelines in determining immunization requirements for its medical students and monitors students' compliance with those requirements.",
    description:
      "A medical school follows accepted guidelines in determining immunization requirements for its medical students and monitors students' compliance with those requirements.",
    framework: "lcme",
    standard_id: "lcme-std-12",
  },
  {
    id: "lcme-12.8",
    name: "Student Exposure Policies/Procedures",
    number: "12.8",
    title: "Student Exposure Policies/Procedures",
    text: "A medical school has policies in place that effectively address medical student exposure to infectious and environmental hazards, including the following: the education of medical students about methods of prevention; the procedures for care and treatment after exposure, including a definition of financial responsibility; the effects of infectious and environmental disease or disability on medical student learning activities. All registered medical students (including visiting students) are informed of these policies before undertaking any educational activities that would place them at risk.",
    description:
      "A medical school has policies in place that effectively address medical student exposure to infectious and environmental hazards, including the following: the education of medical students about methods of prevention; the procedures for care and treatment after exposure, including a definition of financial responsibility; the effects of infectious and environmental disease or disability on medical student learning activities. All registered medical students (including visiting students) are informed of these policies before undertaking any educational activities that would place them at risk.",
    framework: "lcme",
    standard_id: "lcme-std-12",
  },
] as const;
