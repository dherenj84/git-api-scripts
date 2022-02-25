import { deleteStaleBranches } from "./src/branch-utils-graphql.js";

async function deleteBranches() {
  const response = await deleteStaleBranches();
  console.log(response);
}
deleteBranches();
