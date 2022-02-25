# git-api-scripts

Utility Functions to Interact with Git Rest and GraphQL API. A very common need because of which I had to create this project was to list and delete stale branches.

### Available Scripts

Currently, the only available script is delete-stale-branches(run with extreme caution). You can refer branch-utils.test.js to play around with other available interfaces.

### How to Run

The project uses the dotenv package and thus expects a local .env file in the root of your project. After you create the file, add the following entries to it and run one of the node scripts,

```
GIT_BASE_URL=https://api.github.com or your enterprise API Address
GIT_ORG=Owner or the Org Name
GIT_REPO=Repository Name
GIT_ADMIN_PAC=Personal Access Token of a user who can perform read/write operations on the repository
```

After creating .env with the entries above, run the following scripts to first install the dependencies and then delete stale branches in your repository,

```
npm install
npm run delete-stale-branches
```
