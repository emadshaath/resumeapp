// @ts-check
import { initSchema } from '@aws-amplify/datastore';
import { schema } from './schema';



const { SkillsAndSummary, Employment, Education, OwnerDetails } = initSchema(schema);

export {
  SkillsAndSummary,
  Employment,
  Education,
  OwnerDetails
};