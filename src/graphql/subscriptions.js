/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const onCreateSkillsAndSummary = /* GraphQL */ `
  subscription OnCreateSkillsAndSummary {
    onCreateSkillsAndSummary {
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
export const onUpdateSkillsAndSummary = /* GraphQL */ `
  subscription OnUpdateSkillsAndSummary {
    onUpdateSkillsAndSummary {
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
export const onDeleteSkillsAndSummary = /* GraphQL */ `
  subscription OnDeleteSkillsAndSummary {
    onDeleteSkillsAndSummary {
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
export const onCreateEmployment = /* GraphQL */ `
  subscription OnCreateEmployment {
    onCreateEmployment {
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
export const onUpdateEmployment = /* GraphQL */ `
  subscription OnUpdateEmployment {
    onUpdateEmployment {
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
export const onDeleteEmployment = /* GraphQL */ `
  subscription OnDeleteEmployment {
    onDeleteEmployment {
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
export const onCreateEducation = /* GraphQL */ `
  subscription OnCreateEducation {
    onCreateEducation {
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
export const onUpdateEducation = /* GraphQL */ `
  subscription OnUpdateEducation {
    onUpdateEducation {
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
export const onDeleteEducation = /* GraphQL */ `
  subscription OnDeleteEducation {
    onDeleteEducation {
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
export const onCreateOwnerDetails = /* GraphQL */ `
  subscription OnCreateOwnerDetails {
    onCreateOwnerDetails {
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
export const onUpdateOwnerDetails = /* GraphQL */ `
  subscription OnUpdateOwnerDetails {
    onUpdateOwnerDetails {
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
export const onDeleteOwnerDetails = /* GraphQL */ `
  subscription OnDeleteOwnerDetails {
    onDeleteOwnerDetails {
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
