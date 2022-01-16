import { ModelInit, MutableModel, PersistentModelConstructor } from "@aws-amplify/datastore";





type SkillsAndSummaryMetaData = {
  readOnlyFields: 'createdAt' | 'updatedAt';
}

type EmploymentMetaData = {
  readOnlyFields: 'createdAt' | 'updatedAt';
}

type EducationMetaData = {
  readOnlyFields: 'createdAt' | 'updatedAt';
}

type OwnerDetailsMetaData = {
  readOnlyFields: 'createdAt' | 'updatedAt';
}

export declare class SkillsAndSummary {
  readonly id: string;
  readonly Skills?: (string | null)[];
  readonly ProfessionalSummary?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  constructor(init: ModelInit<SkillsAndSummary, SkillsAndSummaryMetaData>);
  static copyOf(source: SkillsAndSummary, mutator: (draft: MutableModel<SkillsAndSummary, SkillsAndSummaryMetaData>) => MutableModel<SkillsAndSummary, SkillsAndSummaryMetaData> | void): SkillsAndSummary;
}

export declare class Employment {
  readonly id: string;
  readonly EmployerName?: string;
  readonly StartDate?: string;
  readonly EndDate?: string;
  readonly IsOngoing?: string;
  readonly Location?: string;
  readonly Position?: string;
  readonly WorkDuty?: string;
  readonly ownerdetailsID?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  constructor(init: ModelInit<Employment, EmploymentMetaData>);
  static copyOf(source: Employment, mutator: (draft: MutableModel<Employment, EmploymentMetaData>) => MutableModel<Employment, EmploymentMetaData> | void): Employment;
}

export declare class Education {
  readonly id: string;
  readonly SchoolNam?: string;
  readonly StartDate?: string;
  readonly GraduationDate?: string;
  readonly IsOnGoing?: boolean;
  readonly SchoolLocation?: string;
  readonly Degree?: string;
  readonly GPA?: string;
  readonly ownerdetailsID?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  constructor(init: ModelInit<Education, EducationMetaData>);
  static copyOf(source: Education, mutator: (draft: MutableModel<Education, EducationMetaData>) => MutableModel<Education, EducationMetaData> | void): Education;
}

export declare class OwnerDetails {
  readonly id: string;
  readonly FirstName?: string;
  readonly LastName?: string;
  readonly DOB?: string;
  readonly Location?: string;
  readonly PhoneNumber?: string;
  readonly Email?: string;
  readonly Website?: string;
  readonly OwnerEducations?: (Education | null)[];
  readonly OwnerEmployments?: (Employment | null)[];
  readonly OwnerSkillsAndSummary?: SkillsAndSummary;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly ownerDetailsOwnerSkillsAndSummaryId?: string;
  constructor(init: ModelInit<OwnerDetails, OwnerDetailsMetaData>);
  static copyOf(source: OwnerDetails, mutator: (draft: MutableModel<OwnerDetails, OwnerDetailsMetaData>) => MutableModel<OwnerDetails, OwnerDetailsMetaData> | void): OwnerDetails;
}