#!/usr/bin/env node

import { exec } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

function $(strings) {
  const command = strings.join(" ");
  console.log(`\n🔄 Executing: ${command}`);

  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Error executing: ${command}`);
        console.error(`Error: ${error.message}`);
        return reject(error);
      }
      if (stdout) console.log(`✅ Output: ${stdout.trim()}`);
      if (stderr) console.warn(`⚠️  Stderr: ${stderr.trim()}`);
      return resolve({ stdout, stderr });
    });
  });
}

async function getCurrentVersion() {
  try {
    const packageJsonPath = join(process.cwd(), "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    return packageJson.version;
  } catch (error) {
    console.error("❌ Failed to read package.json:", error.message);
    throw error;
  }
}

async function checkIfDistExists() {
  const distPath = join(process.cwd(), "dist");
  if (!existsSync(distPath)) {
    throw new Error("❌ dist folder does not exist. Please run the build first.");
  }
  console.log("✅ dist folder found");
}

async function checkIfPackageLockExists() {
  const packageLockPath = join(process.cwd(), "package-lock.json");
  if (!existsSync(packageLockPath)) {
    console.warn("⚠️  package-lock.json not found. This might be expected if using yarn.");
  } else {
    console.log("✅ package-lock.json found");
  }
}

async function createReleaseBranch(version) {
  const branchName = `release/v${version}`;
  
  try {
    // Check current branch and stash any changes
    console.log("\n📋 Checking current git status...");
    await $`git status --porcelain`;
    
    // Create and switch to new release branch
    console.log(`\n🌿 Creating release branch: ${branchName}`);
    await $`git checkout -b ${branchName}`;
    
    // Add dist folder and package files
    console.log("\n📦 Adding dist folder and package files...");
    await $`git add dist/ package.json`;
    
    // Add package-lock.json if it exists
    const packageLockPath = join(process.cwd(), "package-lock.json");
    if (existsSync(packageLockPath)) {
      await $`git add package-lock.json`;
    }
    
    // Commit the changes
    console.log("\n💾 Committing changes...");
    await $`git commit -m "Release v${version} - Add dist folder and package files"`;
    
    // Push the branch to remote
    console.log("\n🚀 Pushing release branch to remote...");
    await $`git push origin ${branchName}`;
    
    console.log(`\n🎉 Successfully created and pushed release branch: ${branchName}`);
    console.log(`📦 Included files:`);
    console.log(`   - dist/ (built files)`);
    console.log(`   - package.json`);
    if (existsSync(join(process.cwd(), "package-lock.json"))) {
      console.log(`   - package-lock.json`);
    }
    
    return branchName;
  } catch (error) {
    console.error("❌ Failed to create release branch:", error.message);
    throw error;
  }
}

async function main() {
  try {
    console.log("🚀 Starting post-build release process...");
    
    // Check prerequisites
    await checkIfDistExists();
    await checkIfPackageLockExists();
    
    // Get current version
    const version = await getCurrentVersion();
    console.log(`📋 Current version: ${version}`);
    
    // Create and push release branch
    const branchName = await createReleaseBranch(version);
    
    console.log(`\n✅ Post-build release process completed successfully!`);
    console.log(`🔗 Release branch: ${branchName}`);
    console.log(`📋 Version: v${version}`);
    
  } catch (error) {
    console.error("❌ Post-build release process failed:", error.message);
    process.exit(1);
  }
}

// Run the script
main(); 