/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const createSkillsAndSummary = /* GraphQL */ `
  mutation CreateSkillsAndSummary(
    $input: CreateSkillsAndSummaryInput!
    $condition: ModelSkillsAndSummaryConditionInput
  ) {
    createSkillsAndSummary(input: $input, condition: $condition) {
      id
      Skills
      ProfessionalSummary
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
    }
  }
`;
export const updateSkillsAndSummary = /* GraphQL */ `
  mutation UpdateSkillsAndSummary(
    $input: UpdateSkillsAndSummaryInput!
    $condition: ModelSkillsAndSummaryConditionInput
  ) {
    updateSkillsAndSummary(input: $input, condition: $condition) {
      id
      Skills
      ProfessionalSummary
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
    }
  }
`;
export const deleteSkillsAndSummary = /* GraphQL */ `
  mutation DeleteSkillsAndSummary(
    $input: DeleteSkillsAndSummaryInput!
    $condition: ModelSkillsAndSummaryConditionInput
  ) {
    deleteSkillsAndSummary(input: $input, condition: $condition) {
      id
      Skills
      ProfessionalSummary
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
    }
  }
`;
export const createEmployment = /* GraphQL */ `
  mutation CreateEmployment(
    $input: CreateEmploymentInput!
    $condition: ModelEmploymentConditionInput
  ) {
    createEmployment(input: $input, condition: $condition) {
      id
      EmployerName
      StartDate
      EndDate
      IsOngoing
      Location
      Position
      WorkDuty
      ownerdetailsID
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
    }
  }
`;
export const updateEmployment = /* GraphQL */ `
  mutation UpdateEmployment(
    $input: UpdateEmploymentInput!
    $condition: ModelEmploymentConditionInput
  ) {
    updateEmployment(input: $input, condition: $condition) {
      id
      EmployerName
      StartDate
      EndDate
      IsOngoing
      Location
      Position
      WorkDuty
      ownerdetailsID
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
    }
  }
`;
export const deleteEmployment = /* GraphQL */ `
  mutation DeleteEmployment(
    $input: DeleteEmploymentInput!
    $condition: ModelEmploymentConditionInput
  ) {
    deleteEmployment(input: $input, condition: $condition) {
      id
      EmployerName
      StartDate
      EndDate
      IsOngoing
      Location
      Position
      WorkDuty
      ownerdetailsID
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
    }
  }
`;
export const createEducation = /* GraphQL */ `
  mutation CreateEducation(
    $input: CreateEducationInput!
    $condition: ModelEducationConditionInput
  ) {
    createEducation(input: $input, condition: $condition) {
      id
      SchoolNam
      StartDate
      GraduationDate
      IsOnGoing
      SchoolLocation
      Degree
      GPA
      ownerdetailsID
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
    }
  }
`;
export const updateEducation = /* GraphQL */ `
  mutation UpdateEducation(
    $input: UpdateEducationInput!
    $condition: ModelEducationConditionInput
  ) {
    updateEducation(input: $input, condition: $condition) {
      id
      SchoolNam
      StartDate
      GraduationDate
      IsOnGoing
      SchoolLocation
      Degree
      GPA
      ownerdetailsID
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
    }
  }
`;
export const deleteEducation = /* GraphQL */ `
  mutation DeleteEducation(
    $input: DeleteEducationInput!
    $condition: ModelEducationConditionInput
  ) {
    deleteEducation(input: $input, condition: $condition) {
      id
      SchoolNam
      StartDate
      GraduationDate
      IsOnGoing
      SchoolLocation
      Degree
      GPA
      ownerdetailsID
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
    }
  }
`;
export const createOwnerDetails = /* GraphQL */ `
  mutation CreateOwnerDetails(
    $input: CreateOwnerDetailsInput!
    $condition: ModelOwnerDetailsConditionInput
  ) {
    createOwnerDetails(input: $input, condition: $condition) {
      id
      FirstName
      LastName
      DOB
      Location
      PhoneNumber
      Email
      Website
      OwnerEducations {
        nextToken
        startedAt
      }
      OwnerEmployments {
        nextToken
        startedAt
      }
      OwnerSkillsAndSummary {
        id
        Skills
        ProfessionalSummary
        createdAt
        updatedAt
        _version
        _deleted
        _lastChangedAt
      }
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
      ownerDetailsOwnerSkillsAndSummaryId
    }
  }
`;
export const updateOwnerDetails = /* GraphQL */ `
  mutation UpdateOwnerDetails(
    $input: UpdateOwnerDetailsInput!
    $condition: ModelOwnerDetailsConditionInput
  ) {
    updateOwnerDetails(input: $input, condition: $condition) {
      id
      FirstName
      LastName
      DOB
      Location
      PhoneNumber
      Email
      Website
      OwnerEducations {
        nextToken
        startedAt
      }
      OwnerEmployments {
        nextToken
        startedAt
      }
      OwnerSkillsAndSummary {
        id
        Skills
        ProfessionalSummary
        createdAt
        updatedAt
        _version
        _deleted
        _lastChangedAt
      }
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
      ownerDetailsOwnerSkillsAndSummaryId
    }
  }
`;
export const deleteOwnerDetails = /* GraphQL */ `
  mutation DeleteOwnerDetails(
    $input: DeleteOwnerDetailsInput!
    $condition: ModelOwnerDetailsConditionInput
  ) {
    deleteOwnerDetails(input: $input, condition: $condition) {
      id
      FirstName
      LastName
      DOB
      Location
      PhoneNumber
      Email
      Website
      OwnerEducations {
        nextToken
        startedAt
      }
      OwnerEmployments {
        nextToken
        startedAt
      }
      OwnerSkillsAndSummary {
        id
        Skills
        ProfessionalSummary
        createdAt
        updatedAt
        _version
        _deleted
        _lastChangedAt
      }
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
      ownerDetailsOwnerSkillsAndSummaryId
    }
  }
`;
