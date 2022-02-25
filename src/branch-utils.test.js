import {
  closePullRequest,
  deleteBranch,
  getUser,
} from "./branch-utils-rest.js";
import {
  queryBranches,
  queryBranchPages,
  queryStaleBranches,
  testConnection,
} from "./branch-utils-graphql.js";
import { jest } from "@jest/globals";
jest.setTimeout(20000);

test("test rest connection", async () => {
  expect((await getUser("dherenj84")).data.login).toBe("dherenj84");
});

test.skip("closePullRequest to close the Pull request", async () => {
  const octakitResponse = await closePullRequest(2673);
  expect(octakitResponse.data.state).toBe("closed");
});

test("deleteBranch to delete a branch", async () => {
  try {
    const response = await deleteBranch("dherenj84-patch-1");
  } catch (error) {
    if (error.status) expect(error.response.status).not.toBe(200);
    else if (error.response) expect(error.response.status).not.toBe(200);
  }
});

test("test graphql connection", async () => {
  const userQuery = await testConnection();
  // console.log(userQuery);
  expect(userQuery.viewer.login).toBe("dherenj84");
});

test.skip("graphql query stale branches", async () => {
  const branchesData = await queryBranches("");
  expect(branchesData.repository.refs.edges.length).toBe(100);
});

test.skip("graphql query branches page count", async () => {
  const branchPages = await queryBranchPages("");
  expect(branchPages).toBe(3);
});

test.skip("graphql query stale branches count", async () => {
  const staleBranches = await queryStaleBranches("");
  expect(staleBranches.length).toBe(113);
});
