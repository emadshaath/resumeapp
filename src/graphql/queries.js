/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const getSkillsAndSummary = /* GraphQL */ `
  query GetSkillsAndSummary($id: ID!) {
    getSkillsAndSummary(id: $id) {
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
export const listSkillsAndSummaries = /* GraphQL */ `
  query ListSkillsAndSummaries(
    $filter: ModelSkillsAndSummaryFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listSkillsAndSummaries(
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        Skills
        ProfessionalSummary
        createdAt
        updatedAt
        _version
        _deleted
        _lastChangedAt
      }
      nextToken
      startedAt
    }
  }
`;
export const syncSkillsAndSummaries = /* GraphQL */ `
  query SyncSkillsAndSummaries(
    $filter: ModelSkillsAndSummaryFilterInput
    $limit: Int
    $nextToken: String
    $lastSync: AWSTimestamp
  ) {
    syncSkillsAndSummaries(
      filter: $filter
      limit: $limit
      nextToken: $nextToken
      lastSync: $lastSync
    ) {
      items {
        id
        Skills
        ProfessionalSummary
        createdAt
        updatedAt
        _version
        _deleted
        _lastChangedAt
      }
      nextToken
      startedAt
    }
  }
`;
export const getEmployment = /* GraphQL */ `
  query GetEmployment($id: ID!) {
    getEmployment(id: $id) {
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
export const listEmployments = /* GraphQL */ `
  query ListEmployments(
    $filter: ModelEmploymentFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listEmployments(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
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
      nextToken
      startedAt
    }
  }
`;
export const syncEmployments = /* GraphQL */ `
  query SyncEmployments(
    $filter: ModelEmploymentFilterInput
    $limit: Int
    $nextToken: String
    $lastSync: AWSTimestamp
  ) {
    syncEmployments(
      filter: $filter
      limit: $limit
      nextToken: $nextToken
      lastSync: $lastSync
    ) {
      items {
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
      nextToken
      startedAt
    }
  }
`;
export const getEducation = /* GraphQL */ `
  query GetEducation($id: ID!) {
    getEducation(id: $id) {
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
export const listEducations = /* GraphQL */ `
  query ListEducations(
    $filter: ModelEducationFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listEducations(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
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
      nextToken
      startedAt
    }
  }
`;
export const syncEducations = /* GraphQL */ `
  query SyncEducations(
    $filter: ModelEducationFilterInput
    $limit: Int
    $nextToken: String
    $lastSync: AWSTimestamp
  ) {
    syncEducations(
      filter: $filter
      limit: $limit
      nextToken: $nextToken
      lastSync: $lastSync
    ) {
      items {
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
      nextToken
      startedAt
    }
  }
`;
export const getOwnerDetails = /* GraphQL */ `
  query GetOwnerDetails($id: ID!) {
    getOwnerDetails(id: $id) {
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
export const listOwnerDetails = /* GraphQL */ `
  query ListOwnerDetails(
    $filter: ModelOwnerDetailsFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listOwnerDetails(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        FirstName
        LastName
        DOB
        Location
        PhoneNumber
        Email
        Website
        createdAt
        updatedAt
        _version
        _deleted
        _lastChangedAt
        ownerDetailsOwnerSkillsAndSummaryId
      }
      nextToken
      startedAt
    }
  }
`;
export const syncOwnerDetails = /* GraphQL */ `
  query SyncOwnerDetails(
    $filter: ModelOwnerDetailsFilterInput
    $limit: Int
    $nextToken: String
    $lastSync: AWSTimestamp
  ) {
    syncOwnerDetails(
      filter: $filter
      limit: $limit
      nextToken: $nextToken
      lastSync: $lastSync
    ) {
      items {
        id
        FirstName
        LastName
        DOB
        Location
        PhoneNumber
        Email
        Website
        createdAt
        updatedAt
        _version
        _deleted
        _lastChangedAt
        ownerDetailsOwnerSkillsAndSummaryId
      }
      nextToken
      startedAt
    }
  }
`;
