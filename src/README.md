# Developer Guide

Setup: `npm install`

Run unit tests: `npm run test`

Start extension: f5 in VSCode

### Updating the extension

1. Update the version number in `package.json`
2. Run `vsce package` to create a new `.vsix` file
3. Upload the `.vsix` file to the [VSCode Marketplace](https://marketplace.visualstudio.com/manage/publishers/bradymholt)
4. Update the version number in `README.md`
5. Commit and push changes to GitHub
6. Create a new release on GitHub
