import OctokitCore from "@octokit/core";
import * as fs from "fs";
import axios from "axios";
import { GIT_ADMIN_PAC, GIT_BASE_URL, GIT_ORG, GIT_REPO } from "./constants.js";

const { Octokit } = OctokitCore;

const octokit = new Octokit({
  baseUrl: GIT_BASE_URL,
  auth: GIT_ADMIN_PAC,
});

export async function getUser(username) {
  return await octokit.request(`GET /users/${username}`);
}

async function getPageData(page) {
  return await octokit.request(
    `GET /repos/{org}/{repo}/branches?per_page=100&page=${page}`,
    {
      org: GIT_ORG,
      repo: GIT_REPO,
    }
  );
}

async function getBranchData(branchName) {
  return await octokit.request("GET /repos/{org}/{repo}/branches/{branch}", {
    org: GIT_ORG,
    repo: GIT_REPO,
    branch: branchName,
  });
}

export async function getPullRequest(branchName) {
  return await octokit.request(
    `GET /repos/{org}/{repo}/pulls?head=${GIT_ORG}:${branchName}`,
    {
      org: GIT_ORG,
      repo: GIT_REPO,
    }
  );
}

export async function closePullRequest(number) {
  return await octokit.request(
    "PATCH /repos/{org}/{repo}/pulls/{pull_number}",
    {
      org: GIT_ORG,
      repo: GIT_REPO,
      pull_number: number,
      state: "closed",
    }
  );
}

export async function deleteBranch(branchName) {
  return await axios.delete(
    `${GIT_BASE_URL}/repos/${GIT_ORG}/${GIT_REPO}/git/refs/heads/${branchName}`,
    {
      headers: {
        Authorization: `token ${ADMIN_PAC}`,
      },
    }
  );
}

export async function getStaleBraches() {
  let branches = [];
  const response = await getPageData(1);
  if (response && response.data && response.data.length > 0) {
    branches = response.data.map((branchData) => branchData.name);
    console.log("branches size before", branches.length);
    if (response.headers.link) {
      const linkPages = response.headers.link
        .split(",")
        .map((link) => link.split(";")[0].split("&page=")[1].split(">")[0]);
      if (linkPages) {
        for (let index = 0; index < linkPages.length; index++) {
          const linkPage = linkPages[index];
          const pageResponse = await getPageData(linkPage);
          if (
            pageResponse &&
            pageResponse.data &&
            pageResponse.data.length > 0
          ) {
            branches = branches.concat(
              pageResponse.data.map((branchData) => branchData.name)
            );
          }
        }
      }
    }
  }
  console.log("final branch size is ", branches.length);
  if (branches.length > 0) {
    const staleBranches = [];
    for (let index = 0; index < branches.length; index++) {
      const branchData = await getBranchData(branches[index]);
      if (branchData.data && branchData.data.commit) {
        const commitData = JSON.parse(
          JSON.stringify(branchData.data.commit.commit)
        );
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        const lastUpdatedOn = new Date(commitData.author.date);
        if (lastUpdatedOn.getTime() < threeMonthsAgo.getTime()) {
          let prLink = "";
          const branchPullRequest = await getPullRequest(branchData.data.name);
          if (
            branchPullRequest.data &&
            branchPullRequest.data.length > 0 &&
            branchPullRequest.data[0].url
          ) {
            closePullRequest(branchPullRequest.data[0].number);
            prLink = branchPullRequest.data[0].url;
          }
          deleteBranch(branchData.data.name);
          staleBranches.push({
            name: branchData.data.name,
            openPullRequest: prLink,
            lastUpdatedBy: commitData.author.email,
            lastUpdatedOn: commitData.author.date,
          });
        }
      }
    }
    console.log("stale branches length is ", staleBranches.length);
    fs.writeFileSync("stale-branches.json", JSON.stringify(staleBranches));
  }
}
