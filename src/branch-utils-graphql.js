import OctokitGraphql from "@octokit/graphql";
import { closePullRequest, deleteBranch } from "./branch-utils-rest.js";
import * as fs from "fs";
import { GIT_ADMIN_PAC, GIT_BASE_URL, GIT_ORG, GIT_REPO } from "./constants.js";

let { graphql } = OctokitGraphql;

graphql = graphql.defaults({
  baseUrl: GIT_BASE_URL,
  headers: {
    authorization: `token ${GIT_ADMIN_PAC}`,
  },
});

export async function testConnection() {
  return await graphql("query { viewer{login}}");
}

export async function queryBranches(endCursor) {
  return await graphql(`
    query {
      repository(owner: "${GIT_ORG}", name: "${GIT_REPO}") {
        refs(refPrefix: "refs/heads/", first: 100, after: "${endCursor}") {
          edges {
            node {
              associatedPullRequests(states: [OPEN], first: 2) {
                nodes {
                  number
                  url
                }
              }
              name
              target {
                ... on Commit {
                    author {
                      email
                      date
                    }
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            startCursor
            endCursor
          }
        }
      }
    }
  `);
}

export async function queryBranchPages(endCursor) {
  let pages = 1;
  const data = await graphql(`
    query {
      repository(owner: "${GIT_ORG}", name: "${GIT_REPO}") {
        refs(refPrefix: "refs/heads/", first: 100, after:"${endCursor}") {
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  `);
  if (data.repository.refs.pageInfo.hasNextPage) {
    const nextPage = await queryBranchPages(
      data.repository.refs.pageInfo.endCursor
    );
    pages = pages + nextPage;
  }
  return pages;
}

export async function queryStaleBranches(endCursor) {
  let branches = [];
  const branchQueryResponse = await queryBranches(endCursor);
  if (branchQueryResponse.repository.refs.edges.length > 0) {
    branches = branches.concat(branchQueryResponse.repository.refs.edges);
    if (branchQueryResponse.repository.refs.pageInfo.hasNextPage) {
      branches = branches.concat(
        await queryStaleBranches(
          branchQueryResponse.repository.refs.pageInfo.endCursor
        )
      );
    }
  }
  return branches.filter((branch) => {
    const lastUpdatedOn = new Date(branch.node.target.author.date);
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    return lastUpdatedOn.getTime() < threeMonthsAgo.getTime();
  });
}

export async function deleteStaleBranches() {
  let status = "failure";
  let staleBranches = await queryStaleBranches("");
  const today = new Date();
  if (staleBranches && staleBranches.length > 0) {
    staleBranches = staleBranches.map((staleBranch) => staleBranch.node);
    fs.writeFileSync(
      `stale-branches-graphql-${
        today.getMonth() + 1
      }-${today.getDate()}-${today.getFullYear()}~${today.getHours()}-${today.getMinutes()}.json`,
      JSON.stringify(staleBranches)
    );
    console.log("created a record of stale branches");

    for (let index = 0; index < staleBranches.length; index++) {
      const staleBranch = staleBranches[index];
      if (staleBranch.associatedPullRequests.nodes.length > 0) {
        try {
          closePullRequest(staleBranch.associatedPullRequests.nodes[0].number);
        } catch (error) {
          console.error(
            "error closing pull request ",
            staleBranch.associatedPullRequests.nodes[0].url
          );
        }
      }
      try {
        deleteBranch(staleBranch.name);
      } catch (error) {
        console.error("error deleting branch ", staleBranch.name);
      }
    }
    status = "success";
  } else {
    console.log("nothing to delete");
    status = "success";
  }
  return status;
}
